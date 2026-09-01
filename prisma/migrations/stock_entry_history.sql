-- Stock entry history: persist who received stock, and forbid qty increases
-- except through inventory_receive_inbound_shipment.

ALTER TABLE inventory_inbound_shipments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES inventory_profiles(id) ON DELETE SET NULL;

ALTER TABLE inventory_inbound_shipments
  ADD COLUMN IF NOT EXISTS received_by_name TEXT;

ALTER TABLE inventory_stock_movements
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES inventory_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inventory_inbound_shipments_created_at_idx
  ON inventory_inbound_shipments (created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_inbound_shipments_created_by_idx
  ON inventory_inbound_shipments (created_by);

CREATE INDEX IF NOT EXISTS inventory_stock_movements_created_by_idx
  ON inventory_stock_movements (created_by);

CREATE OR REPLACE FUNCTION inventory_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT p.id
  FROM inventory_profiles p
  WHERE p.id = auth.uid()
$$;

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
    reserved_delta, reserved_after, reason, reference_type, reference_id, created_by
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
    p_reference_id,
    inventory_current_profile_id()
  );
END;
$$;

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

  IF p_qty > COALESCE(v_current, 0) THEN
    RAISE EXCEPTION 'Stock can only be added with Receive Stock'
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
  v_created_by UUID;
  v_received_by_name TEXT;
BEGIN
  v_id := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);
  v_product_id := NULLIF(payload->>'product_id', '');
  v_warehouse_id := NULLIF(payload->>'warehouse_id', '');
  v_qty := COALESCE((payload->>'qty')::INTEGER, 0);
  v_status := COALESCE(NULLIF(payload->>'status', ''), 'Received');
  v_apply := lower(v_status) = 'received';
  v_created_by := inventory_current_profile_id();

  IF v_created_by IS NOT NULL THEN
    SELECT COALESCE(
      NULLIF(trim(p.full_name), ''),
      NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      p.email
    )
    INTO v_received_by_name
    FROM inventory_profiles p
    WHERE p.id = v_created_by;
  END IF;

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
    order_date, qty, stock_value, status, status_variant, arrival_date, stock_applied, created_by, received_by_name
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
    v_apply,
    v_created_by,
    v_received_by_name
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

GRANT EXECUTE ON FUNCTION inventory_current_profile_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_log_stock_movement(TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_set_warehouse_qty(TEXT, TEXT, INTEGER, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_receive_inbound_shipment(JSONB) TO anon, authenticated;
