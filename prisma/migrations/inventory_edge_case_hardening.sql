-- Inventory edge-case hardening: upsert sync, available-qty guards, reservations,
-- outbound stock-out, transfers, and an append-only movement ledger.

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_outbound_shipments
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE inventory_inbound_shipments
  ADD COLUMN IF NOT EXISTS stock_applied BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE inventory_order_items
  ADD COLUMN IF NOT EXISTS warehouse_id TEXT REFERENCES inventory_warehouses(id) ON DELETE SET NULL;

ALTER TABLE inventory_orders
  ADD COLUMN IF NOT EXISTS inventory_state TEXT NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  warehouse_id TEXT REFERENCES inventory_warehouses(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL DEFAULT 0,
  qty_after INTEGER,
  reserved_delta INTEGER NOT NULL DEFAULT 0,
  reserved_after INTEGER,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_stock_movements_product_id_idx
  ON inventory_stock_movements (product_id);
CREATE INDEX IF NOT EXISTS inventory_stock_movements_created_at_idx
  ON inventory_stock_movements (created_at DESC);

GRANT ALL ON TABLE inventory_stock_movements TO anon, authenticated;
ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_stock_movements_anon_all ON inventory_stock_movements;
CREATE POLICY inventory_stock_movements_anon_all
  ON inventory_stock_movements FOR ALL TO anon
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS inventory_stock_movements_authenticated_all ON inventory_stock_movements;
CREATE POLICY inventory_stock_movements_authenticated_all
  ON inventory_stock_movements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Backfill: inbound rows that already increased stock
UPDATE inventory_inbound_shipments
SET stock_applied = true
WHERE stock_applied = false
  AND lower(status) = 'received'
  AND warehouse_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Movement ledger helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_log_stock_movement(
  p_product_id TEXT,
  p_warehouse_id TEXT,
  p_delta INTEGER,
  p_qty_after INTEGER,
  p_reserved_delta INTEGER,
  p_reserved_after INTEGER,
  p_reason TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO inventory_stock_movements (
    id, product_id, warehouse_id, delta, qty_after,
    reserved_delta, reserved_after, reason, reference_type, reference_id
  ) VALUES (
    gen_random_uuid()::TEXT,
    p_product_id,
    p_warehouse_id,
    COALESCE(p_delta, 0),
    p_qty_after,
    COALESCE(p_reserved_delta, 0),
    p_reserved_after,
    COALESCE(NULLIF(p_reason, ''), 'adjustment'),
    p_reference_type,
    p_reference_id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Upsert-safe aggregate sync (qty + reserved)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_sync_product_qty(p_product_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_qty INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(ws.qty), 0)::INTEGER,
    COALESCE(SUM(ws.reserved), 0)::INTEGER
  INTO v_qty, v_reserved
  FROM inventory_warehouse_stock ws
  WHERE ws.product_id = p_product_id;

  INSERT INTO inventory_stock_levels (
    id, product_id, qty, reserved, last_moved
  ) VALUES (
    gen_random_uuid()::TEXT,
    p_product_id,
    v_qty,
    v_reserved,
    to_char(now(), 'FMDD Mon, YYYY')
  )
  ON CONFLICT (product_id) DO UPDATE
  SET
    qty = EXCLUDED.qty,
    reserved = EXCLUDED.reserved,
    last_moved = EXCLUDED.last_moved;
END;
$$;

-- ---------------------------------------------------------------------------
-- Adjust / set with available-qty and expected-qty guards
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS inventory_adjust_warehouse_qty(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION inventory_adjust_warehouse_qty(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_delta INTEGER,
  p_reason TEXT DEFAULT 'adjustment',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_qty INTEGER;
  v_reserved INTEGER;
BEGIN
  IF p_warehouse_id IS NULL OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'Warehouse and product are required'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO inventory_warehouse_stock (id, warehouse_id, product_id, qty, reserved)
  VALUES (gen_random_uuid()::TEXT, p_warehouse_id, p_product_id, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  -- Negative deltas must not consume reserved stock (available = qty - reserved).
  UPDATE inventory_warehouse_stock
  SET qty = qty + p_delta
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id
    AND qty + p_delta >= 0
    AND (
      p_delta >= 0
      OR (qty - reserved) + p_delta >= 0
    )
  RETURNING qty, reserved INTO v_qty, v_reserved;

  IF v_qty IS NULL THEN
    RAISE EXCEPTION 'Insufficient available stock for product % in warehouse %', p_product_id, p_warehouse_id
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM inventory_sync_product_qty(p_product_id);
  PERFORM inventory_log_stock_movement(
    p_product_id, p_warehouse_id, p_delta, v_qty, 0, v_reserved,
    p_reason, p_reference_type, p_reference_id
  );
  RETURN v_qty;
END;
$$;

DROP FUNCTION IF EXISTS inventory_set_warehouse_qty(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION inventory_set_warehouse_qty(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_qty INTEGER,
  p_expected_qty INTEGER DEFAULT NULL,
  p_reason TEXT DEFAULT 'set'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current INTEGER;
  v_reserved INTEGER;
  v_delta INTEGER;
BEGIN
  IF p_qty < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO inventory_warehouse_stock (id, warehouse_id, product_id, qty, reserved)
  VALUES (gen_random_uuid()::TEXT, p_warehouse_id, p_product_id, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  SELECT qty, reserved INTO v_current, v_reserved
  FROM inventory_warehouse_stock
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id
  FOR UPDATE;

  IF p_expected_qty IS NOT NULL AND v_current IS DISTINCT FROM p_expected_qty THEN
    RAISE EXCEPTION 'Stock changed since load (expected %, found %)', p_expected_qty, v_current
      USING ERRCODE = 'P0001';
  END IF;

  IF p_qty < v_reserved THEN
    RAISE EXCEPTION 'Quantity cannot be below reserved amount (%)', v_reserved
      USING ERRCODE = 'P0001';
  END IF;

  v_delta := p_qty - v_current;

  UPDATE inventory_warehouse_stock
  SET qty = p_qty
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;

  PERFORM inventory_sync_product_qty(p_product_id);
  PERFORM inventory_log_stock_movement(
    p_product_id, p_warehouse_id, v_delta, p_qty, 0, v_reserved,
    p_reason, 'set', NULL
  );
  RETURN p_qty;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_reserve_warehouse_qty(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_qty INTEGER,
  p_reference_type TEXT DEFAULT 'order',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_qty INTEGER;
  v_reserved INTEGER;
BEGIN
  IF p_qty < 1 THEN
    RAISE EXCEPTION 'Reserve quantity must be at least 1'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO inventory_warehouse_stock (id, warehouse_id, product_id, qty, reserved)
  VALUES (gen_random_uuid()::TEXT, p_warehouse_id, p_product_id, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  UPDATE inventory_warehouse_stock
  SET reserved = reserved + p_qty
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id
    AND (qty - reserved) >= p_qty
  RETURNING qty, reserved INTO v_qty, v_reserved;

  IF v_qty IS NULL THEN
    RAISE EXCEPTION 'Insufficient available stock to reserve for product % in warehouse %', p_product_id, p_warehouse_id
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM inventory_sync_product_qty(p_product_id);
  PERFORM inventory_log_stock_movement(
    p_product_id, p_warehouse_id, 0, v_qty, p_qty, v_reserved,
    'reserve', p_reference_type, p_reference_id
  );
  RETURN v_reserved;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_release_warehouse_qty(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_qty INTEGER,
  p_reference_type TEXT DEFAULT 'order',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_qty INTEGER;
  v_reserved INTEGER;
  v_release INTEGER;
BEGIN
  IF p_qty < 1 THEN
    RAISE EXCEPTION 'Release quantity must be at least 1'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT qty, reserved INTO v_qty, v_reserved
  FROM inventory_warehouse_stock
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_release := LEAST(p_qty, v_reserved);

  UPDATE inventory_warehouse_stock
  SET reserved = reserved - v_release
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id
  RETURNING qty, reserved INTO v_qty, v_reserved;

  PERFORM inventory_sync_product_qty(p_product_id);
  PERFORM inventory_log_stock_movement(
    p_product_id, p_warehouse_id, 0, v_qty, -v_release, v_reserved,
    'release', p_reference_type, p_reference_id
  );
  RETURN v_reserved;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_fulfill_reserved_qty(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_qty INTEGER,
  p_reference_type TEXT DEFAULT 'order',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_qty INTEGER;
  v_reserved INTEGER;
BEGIN
  IF p_qty < 1 THEN
    RAISE EXCEPTION 'Fulfill quantity must be at least 1'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE inventory_warehouse_stock
  SET
    reserved = reserved - p_qty,
    qty = qty - p_qty
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id
    AND reserved >= p_qty
    AND qty >= p_qty
  RETURNING qty, reserved INTO v_qty, v_reserved;

  IF v_qty IS NULL THEN
    RAISE EXCEPTION 'Insufficient reserved stock to fulfill for product % in warehouse %', p_product_id, p_warehouse_id
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE inventory_stock_levels
  SET outbound_qty = outbound_qty + p_qty
  WHERE product_id = p_product_id;

  PERFORM inventory_sync_product_qty(p_product_id);
  PERFORM inventory_log_stock_movement(
    p_product_id, p_warehouse_id, -p_qty, v_qty, -p_qty, v_reserved,
    'fulfill', p_reference_type, p_reference_id
  );
  RETURN v_qty;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_default_warehouse_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id
  FROM inventory_warehouses
  WHERE is_default = true
  ORDER BY created_at
  LIMIT 1;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM inventory_warehouses
    WHERE status = 'Active'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_reserve_order(p_order_id TEXT, p_warehouse_id TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order inventory_orders%ROWTYPE;
  v_item inventory_order_items%ROWTYPE;
  v_warehouse_id TEXT;
BEGIN
  SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.inventory_state = 'reserved' THEN
    RETURN jsonb_build_object('id', p_order_id, 'state', 'reserved');
  END IF;
  IF v_order.inventory_state = 'fulfilled' THEN
    RAISE EXCEPTION 'Order stock already fulfilled'
      USING ERRCODE = 'P0001';
  END IF;

  v_warehouse_id := COALESCE(NULLIF(p_warehouse_id, ''), inventory_default_warehouse_id());
  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'No warehouse available to reserve stock'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN SELECT * FROM inventory_order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'Order items require a product to reserve stock'
        USING ERRCODE = 'P0001';
    END IF;
    PERFORM inventory_reserve_warehouse_qty(
      v_warehouse_id, v_item.product_id, GREATEST(v_item.quantity, 1), 'order', p_order_id
    );
    UPDATE inventory_order_items
    SET warehouse_id = v_warehouse_id, reserved = GREATEST(v_item.quantity, 1)
    WHERE id = v_item.id;
  END LOOP;

  UPDATE inventory_orders SET inventory_state = 'reserved' WHERE id = p_order_id;
  RETURN jsonb_build_object('id', p_order_id, 'state', 'reserved', 'warehouse_id', v_warehouse_id);
END;
$$;

CREATE OR REPLACE FUNCTION inventory_release_order(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order inventory_orders%ROWTYPE;
  v_item inventory_order_items%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.inventory_state <> 'reserved' THEN
    RETURN jsonb_build_object('id', p_order_id, 'state', v_order.inventory_state);
  END IF;

  FOR v_item IN SELECT * FROM inventory_order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL AND v_item.warehouse_id IS NOT NULL AND v_item.reserved > 0 THEN
      PERFORM inventory_release_warehouse_qty(
        v_item.warehouse_id, v_item.product_id, v_item.reserved, 'order', p_order_id
      );
    END IF;
    UPDATE inventory_order_items SET reserved = 0 WHERE id = v_item.id;
  END LOOP;

  UPDATE inventory_orders SET inventory_state = 'released' WHERE id = p_order_id;
  RETURN jsonb_build_object('id', p_order_id, 'state', 'released');
END;
$$;

CREATE OR REPLACE FUNCTION inventory_fulfill_order(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order inventory_orders%ROWTYPE;
  v_item inventory_order_items%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.inventory_state = 'fulfilled' THEN
    RETURN jsonb_build_object('id', p_order_id, 'state', 'fulfilled');
  END IF;
  IF v_order.inventory_state <> 'reserved' THEN
    RAISE EXCEPTION 'Order must be reserved before fulfillment'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN SELECT * FROM inventory_order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL AND v_item.warehouse_id IS NOT NULL AND v_item.reserved > 0 THEN
      PERFORM inventory_fulfill_reserved_qty(
        v_item.warehouse_id, v_item.product_id, v_item.reserved, 'order', p_order_id
      );
    END IF;
    UPDATE inventory_order_items SET reserved = 0 WHERE id = v_item.id;
  END LOOP;

  UPDATE inventory_orders SET inventory_state = 'fulfilled' WHERE id = p_order_id;
  RETURN jsonb_build_object('id', p_order_id, 'state', 'fulfilled');
END;
$$;

-- ---------------------------------------------------------------------------
-- POS complete / void (null product rejected; available-qty via adjust)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_complete_pos_sale(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id TEXT;
  v_item JSONB;
  v_product_id TEXT;
  v_qty INTEGER;
  v_item_warehouse_id TEXT;
  v_customer_id TEXT;
  v_payment_method TEXT;
  v_total NUMERIC(12, 2);
  v_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
BEGIN
  v_sale_id := COALESCE(payload->>'sale_id', gen_random_uuid()::TEXT);
  v_customer_id := NULLIF(payload->>'customer_id', '');
  v_payment_method := COALESCE(payload->>'payment_method', 'cash');
  v_total := COALESCE((payload->>'total')::NUMERIC, 0);

  IF COALESCE(jsonb_array_length(payload->'items'), 0) < 1 THEN
    RAISE EXCEPTION 'Sale must include at least one item'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment_method IN ('account', 'credit') AND v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Account and credit sales require a customer'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO inventory_pos_sales (
    id, sale_number, warehouse_id, customer_id, customer_name,
    subtotal, discount_amount, tax_amount, total,
    payment_method, amount_tendered, change_due, notes, status
  ) VALUES (
    v_sale_id,
    payload->>'sale_number',
    payload->>'warehouse_id',
    v_customer_id,
    COALESCE(NULLIF(payload->>'customer_name', ''), 'Walk-in'),
    COALESCE((payload->>'subtotal')::NUMERIC, 0),
    COALESCE((payload->>'discount_amount')::NUMERIC, 0),
    COALESCE((payload->>'tax_amount')::NUMERIC, 0),
    v_total,
    v_payment_method,
    COALESCE((payload->>'amount_tendered')::NUMERIC, 0),
    COALESCE((payload->>'change_due')::NUMERIC, 0),
    NULLIF(payload->>'notes', ''),
    'completed'
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '');
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_item_warehouse_id := COALESCE(
      NULLIF(v_item->>'warehouse_id', ''),
      payload->>'warehouse_id'
    );

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Each sale item must include a product'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each sale item must have a quantity of at least 1'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_item_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Each sale item must include a warehouse'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_pos_sale_items (
      id, sale_id, product_id, warehouse_id, sku, name, unit_price, quantity,
      line_discount, line_total, color, size
    ) VALUES (
      gen_random_uuid()::TEXT,
      v_sale_id,
      v_product_id,
      v_item_warehouse_id,
      COALESCE(v_item->>'sku', ''),
      COALESCE(v_item->>'name', ''),
      COALESCE((v_item->>'unit_price')::NUMERIC, 0),
      v_qty,
      COALESCE((v_item->>'line_discount')::NUMERIC, 0),
      COALESCE((v_item->>'line_total')::NUMERIC, 0),
      NULLIF(v_item->>'color', ''),
      NULLIF(v_item->>'size', '')
    );

    PERFORM inventory_adjust_warehouse_qty(
      v_item_warehouse_id, v_product_id, -v_qty, 'pos_sale', 'pos_sale', v_sale_id
    );

    UPDATE inventory_stock_levels
    SET outbound_qty = outbound_qty + v_qty
    WHERE product_id = v_product_id;
  END LOOP;

  IF v_payment_method IN ('account', 'credit') THEN
    SELECT account_balance INTO v_balance
    FROM inventory_customers
    WHERE id = v_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer not found'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_payment_method = 'account' AND v_balance < v_total THEN
      RAISE EXCEPTION 'Insufficient account balance'
        USING ERRCODE = 'P0001';
    END IF;

    v_new_balance := v_balance - v_total;

    UPDATE inventory_customers
    SET account_balance = v_new_balance,
        last_visit = now()
    WHERE id = v_customer_id;

    INSERT INTO inventory_customer_account_transactions (
      id, customer_id, type, amount, balance_after, payment_method, notes, pos_sale_id
    ) VALUES (
      gen_random_uuid()::TEXT,
      v_customer_id,
      'sale',
      -v_total,
      v_new_balance,
      v_payment_method,
      payload->>'sale_number',
      v_sale_id
    );
  END IF;

  RETURN jsonb_build_object('id', v_sale_id, 'sale_number', payload->>'sale_number');
END;
$$;

CREATE OR REPLACE FUNCTION inventory_void_pos_sale(p_sale_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale inventory_pos_sales%ROWTYPE;
  v_item inventory_pos_sale_items%ROWTYPE;
  v_item_warehouse_id TEXT;
  v_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
BEGIN
  SELECT * INTO v_sale FROM inventory_pos_sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_sale.status = 'voided' THEN
    RAISE EXCEPTION 'Sale is already voided'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN SELECT * FROM inventory_pos_sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'Cannot void sale with missing product on line item'
        USING ERRCODE = 'P0001';
    END IF;
    v_item_warehouse_id := COALESCE(v_item.warehouse_id, v_sale.warehouse_id);
    PERFORM inventory_adjust_warehouse_qty(
      v_item_warehouse_id, v_item.product_id, v_item.quantity, 'pos_void', 'pos_sale', p_sale_id
    );

    UPDATE inventory_stock_levels
    SET outbound_qty = GREATEST(outbound_qty - v_item.quantity, 0)
    WHERE product_id = v_item.product_id;
  END LOOP;

  IF v_sale.payment_method IN ('account', 'credit') AND v_sale.customer_id IS NOT NULL THEN
    SELECT account_balance INTO v_balance
    FROM inventory_customers
    WHERE id = v_sale.customer_id
    FOR UPDATE;

    IF FOUND THEN
      v_new_balance := v_balance + v_sale.total;

      UPDATE inventory_customers
      SET account_balance = v_new_balance
      WHERE id = v_sale.customer_id;

      INSERT INTO inventory_customer_account_transactions (
        id, customer_id, type, amount, balance_after, payment_method, notes, pos_sale_id
      ) VALUES (
        gen_random_uuid()::TEXT,
        v_sale.customer_id,
        'void',
        v_sale.total,
        v_new_balance,
        v_sale.payment_method,
        v_sale.sale_number,
        p_sale_id
      );
    END IF;
  END IF;

  UPDATE inventory_pos_sales SET status = 'voided' WHERE id = p_sale_id;

  RETURN jsonb_build_object('id', p_sale_id, 'status', 'voided');
END;
$$;

-- ---------------------------------------------------------------------------
-- Inbound: status-gated receive; safer delete
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_receive_inbound_shipment(payload JSONB)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_product_id TEXT;
  v_warehouse_id TEXT;
  v_qty INTEGER;
  v_status TEXT;
  v_apply BOOLEAN;
BEGIN
  v_id := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);
  v_product_id := NULLIF(payload->>'product_id', '');
  v_warehouse_id := NULLIF(payload->>'warehouse_id', '');
  v_qty := COALESCE((payload->>'qty')::INTEGER, 0);
  v_status := COALESCE(NULLIF(payload->>'status', ''), 'Received');
  v_apply := lower(v_status) = 'received';

  IF v_product_id IS NULL OR v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Product and warehouse are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_qty < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO inventory_inbound_shipments (
    id, product_id, warehouse_id, supplier_id, carrier_id,
    order_date, qty, stock_value, status, status_variant, arrival_date, stock_applied
  ) VALUES (
    v_id,
    v_product_id,
    v_warehouse_id,
    NULLIF(payload->>'supplier_id', ''),
    NULLIF(payload->>'carrier_id', ''),
    COALESCE(NULLIF(payload->>'order_date', ''), to_char(now(), 'FMDD Mon, YYYY')),
    v_qty,
    COALESCE((payload->>'stock_value')::NUMERIC, 0),
    v_status,
    COALESCE(NULLIF(payload->>'status_variant', ''), 'success'),
    COALESCE(
      NULLIF(payload->>'arrival_date', ''),
      NULLIF(payload->>'order_date', ''),
      to_char(now(), 'FMDD Mon, YYYY')
    ),
    v_apply
  );

  IF v_apply THEN
    PERFORM inventory_adjust_warehouse_qty(
      v_warehouse_id, v_product_id, v_qty, 'inbound_receive', 'inbound', v_id
    );

    UPDATE inventory_stock_levels
    SET inbound_qty = inbound_qty + v_qty
    WHERE product_id = v_product_id;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_delete_inbound_shipment(p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_row inventory_inbound_shipments%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM inventory_inbound_shipments WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inbound shipment not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_row.stock_applied, false) OR lower(v_row.status) = 'received' THEN
    IF v_row.warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Cannot reverse inbound % without a warehouse', p_id
        USING ERRCODE = 'P0001';
    END IF;
    PERFORM inventory_adjust_warehouse_qty(
      v_row.warehouse_id, v_row.product_id, -v_row.qty, 'inbound_delete', 'inbound', p_id
    );

    UPDATE inventory_stock_levels
    SET inbound_qty = GREATEST(inbound_qty - v_row.qty, 0)
    WHERE product_id = v_row.product_id;
  END IF;

  DELETE FROM inventory_inbound_shipments WHERE id = p_id;

  RETURN jsonb_build_object('id', p_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Outbound create / delete with stock movement
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_create_outbound_shipment(payload JSONB)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_product_id TEXT;
  v_warehouse_id TEXT;
  v_qty INTEGER;
  v_status TEXT;
  v_deduct BOOLEAN;
BEGIN
  v_id := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);
  v_product_id := NULLIF(payload->>'product_id', '');
  v_warehouse_id := NULLIF(payload->>'warehouse_id', '');
  v_qty := COALESCE((payload->>'qty')::INTEGER, 0);
  v_status := COALESCE(NULLIF(payload->>'status', ''), 'Allocated');
  v_deduct := lower(v_status) NOT IN ('pending', 'canceled', 'cancelled');

  IF v_product_id IS NULL OR v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Product and warehouse are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_qty < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO inventory_outbound_shipments (
    id, product_id, warehouse_id, carrier_id, order_ref, qty,
    status, status_variant, expected_delivery, notify, stock_deducted
  ) VALUES (
    v_id,
    v_product_id,
    v_warehouse_id,
    NULLIF(payload->>'carrier_id', ''),
    COALESCE(NULLIF(payload->>'order_ref', ''), 'SO-' || substr(v_id, 1, 8)),
    v_qty,
    v_status,
    COALESCE(NULLIF(payload->>'status_variant', ''), 'success'),
    COALESCE(NULLIF(payload->>'expected_delivery', ''), to_char(now(), 'FMDD Mon, YYYY')),
    COALESCE((payload->>'notify')::BOOLEAN, false),
    v_deduct
  );

  IF v_deduct THEN
    PERFORM inventory_adjust_warehouse_qty(
      v_warehouse_id, v_product_id, -v_qty, 'outbound_ship', 'outbound', v_id
    );
    UPDATE inventory_stock_levels
    SET outbound_qty = outbound_qty + v_qty
    WHERE product_id = v_product_id;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_delete_outbound_shipment(p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_row inventory_outbound_shipments%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM inventory_outbound_shipments WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outbound shipment not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_row.stock_deducted, false) THEN
    IF v_row.warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Cannot reverse outbound % without a warehouse', p_id
        USING ERRCODE = 'P0001';
    END IF;
    PERFORM inventory_adjust_warehouse_qty(
      v_row.warehouse_id, v_row.product_id, v_row.qty, 'outbound_delete', 'outbound', p_id
    );
    UPDATE inventory_stock_levels
    SET outbound_qty = GREATEST(outbound_qty - v_row.qty, 0)
    WHERE product_id = v_row.product_id;
  END IF;

  DELETE FROM inventory_outbound_shipments WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Warehouse transfer
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_transfer_warehouse_qty(
  p_from_warehouse_id TEXT,
  p_to_warehouse_id TEXT,
  p_product_id TEXT,
  p_qty INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_qty INTEGER;
  v_to_qty INTEGER;
BEGIN
  IF p_from_warehouse_id IS NULL OR p_to_warehouse_id IS NULL OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'From warehouse, to warehouse, and product are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_from_warehouse_id = p_to_warehouse_id THEN
    RAISE EXCEPTION 'Cannot transfer to the same warehouse'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_qty < 1 THEN
    RAISE EXCEPTION 'Transfer quantity must be at least 1'
      USING ERRCODE = 'P0001';
  END IF;

  v_from_qty := inventory_adjust_warehouse_qty(
    p_from_warehouse_id, p_product_id, -p_qty, 'transfer_out', 'transfer', p_to_warehouse_id
  );
  v_to_qty := inventory_adjust_warehouse_qty(
    p_to_warehouse_id, p_product_id, p_qty, 'transfer_in', 'transfer', p_from_warehouse_id
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'from_warehouse_id', p_from_warehouse_id,
    'to_warehouse_id', p_to_warehouse_id,
    'qty', p_qty,
    'from_qty', v_from_qty,
    'to_qty', v_to_qty
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants (drop old 3-arg set if present already handled above)
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION inventory_log_stock_movement(TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_sync_product_qty(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_adjust_warehouse_qty(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_set_warehouse_qty(TEXT, TEXT, INTEGER, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_reserve_warehouse_qty(TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_release_warehouse_qty(TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_fulfill_reserved_qty(TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_default_warehouse_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_reserve_order(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_release_order(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_fulfill_order(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_receive_inbound_shipment(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_delete_inbound_shipment(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_create_outbound_shipment(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_delete_outbound_shipment(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_transfer_warehouse_qty(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;

-- Also grant 3-arg adjust overload used by older clients via DEFAULT args.
-- Postgres resolves calls with fewer args when DEFAULTs exist on the same function.
