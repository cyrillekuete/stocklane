-- Warehouse stock, POS sales, and tax percent

CREATE OR REPLACE FUNCTION inventory_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE inventory_warehouses
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS inventory_warehouses_status_idx ON inventory_warehouses (status);

DROP INDEX IF EXISTS inventory_warehouses_one_default_idx;
CREATE UNIQUE INDEX inventory_warehouses_one_default_idx
  ON inventory_warehouses ((is_default))
  WHERE is_default = true;

INSERT INTO inventory_warehouses (id, code, name, status, is_default)
SELECT 'wh_main', 'MAIN', 'Main Warehouse', 'Active', true
WHERE NOT EXISTS (SELECT 1 FROM inventory_warehouses);

UPDATE inventory_warehouses
SET is_default = true
WHERE id = (
  SELECT id FROM inventory_warehouses
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM inventory_warehouses WHERE is_default = true
);

CREATE TABLE IF NOT EXISTS inventory_warehouse_stock (
  id TEXT PRIMARY KEY,
  warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_id)
);
CREATE INDEX IF NOT EXISTS inventory_warehouse_stock_product_id_idx ON inventory_warehouse_stock (product_id);
CREATE INDEX IF NOT EXISTS inventory_warehouse_stock_warehouse_id_idx ON inventory_warehouse_stock (warehouse_id);

DROP TRIGGER IF EXISTS inventory_warehouse_stock_updated_at ON inventory_warehouse_stock;
CREATE TRIGGER inventory_warehouse_stock_updated_at
  BEFORE UPDATE ON inventory_warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION inventory_set_updated_at();

INSERT INTO inventory_warehouse_stock (id, warehouse_id, product_id, qty, reserved)
SELECT
  'whs_' || sl.product_id,
  (SELECT id FROM inventory_warehouses WHERE is_default = true LIMIT 1),
  sl.product_id,
  sl.qty,
  sl.reserved
FROM inventory_stock_levels sl
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_warehouse_stock ws
  WHERE ws.product_id = sl.product_id
    AND ws.warehouse_id = (SELECT id FROM inventory_warehouses WHERE is_default = true LIMIT 1)
);

ALTER TABLE inventory_inbound_shipments
  ADD COLUMN IF NOT EXISTS warehouse_id TEXT REFERENCES inventory_warehouses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS inventory_inbound_shipments_warehouse_id_idx ON inventory_inbound_shipments (warehouse_id);

UPDATE inventory_inbound_shipments
SET warehouse_id = (SELECT id FROM inventory_warehouses WHERE is_default = true LIMIT 1)
WHERE warehouse_id IS NULL;

ALTER TABLE inventory_store_settings
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 20;

CREATE TABLE IF NOT EXISTS inventory_pos_sales (
  id TEXT PRIMARY KEY,
  sale_number TEXT NOT NULL UNIQUE,
  warehouse_id TEXT NOT NULL REFERENCES inventory_warehouses(id) ON DELETE RESTRICT,
  customer_id TEXT REFERENCES inventory_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Walk-in',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  amount_tendered NUMERIC(12, 2) NOT NULL DEFAULT 0,
  change_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_pos_sales_warehouse_id_idx ON inventory_pos_sales (warehouse_id);
CREATE INDEX IF NOT EXISTS inventory_pos_sales_customer_id_idx ON inventory_pos_sales (customer_id);
CREATE INDEX IF NOT EXISTS inventory_pos_sales_status_idx ON inventory_pos_sales (status);
CREATE INDEX IF NOT EXISTS inventory_pos_sales_created_at_idx ON inventory_pos_sales (created_at);

DROP TRIGGER IF EXISTS inventory_pos_sales_updated_at ON inventory_pos_sales;
CREATE TRIGGER inventory_pos_sales_updated_at
  BEFORE UPDATE ON inventory_pos_sales
  FOR EACH ROW
  EXECUTE FUNCTION inventory_set_updated_at();

CREATE TABLE IF NOT EXISTS inventory_pos_sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES inventory_pos_sales(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES inventory_products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  color TEXT,
  size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_pos_sale_items_sale_id_idx ON inventory_pos_sale_items (sale_id);
CREATE INDEX IF NOT EXISTS inventory_pos_sale_items_product_id_idx ON inventory_pos_sale_items (product_id);

DROP TRIGGER IF EXISTS inventory_pos_sale_items_updated_at ON inventory_pos_sale_items;
CREATE TRIGGER inventory_pos_sale_items_updated_at
  BEFORE UPDATE ON inventory_pos_sale_items
  FOR EACH ROW
  EXECUTE FUNCTION inventory_set_updated_at();

CREATE OR REPLACE FUNCTION inventory_sync_product_qty(p_product_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_stock_levels
  SET
    qty = COALESCE((
      SELECT SUM(ws.qty)::INTEGER FROM inventory_warehouse_stock ws WHERE ws.product_id = p_product_id
    ), 0),
    last_moved = to_char(now(), 'FMDD Mon, YYYY')
  WHERE product_id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_adjust_warehouse_qty(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_delta INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_qty INTEGER;
BEGIN
  INSERT INTO inventory_warehouse_stock (id, warehouse_id, product_id, qty, reserved)
  VALUES (gen_random_uuid()::TEXT, p_warehouse_id, p_product_id, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  UPDATE inventory_warehouse_stock
  SET qty = qty + p_delta
  WHERE warehouse_id = p_warehouse_id
    AND product_id = p_product_id
    AND qty + p_delta >= 0
  RETURNING qty INTO v_qty;

  IF v_qty IS NULL THEN
    RAISE EXCEPTION 'Insufficient stock for product % in warehouse %', p_product_id, p_warehouse_id
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM inventory_sync_product_qty(p_product_id);
  RETURN v_qty;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_set_warehouse_qty(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_qty INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_qty < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO inventory_warehouse_stock (id, warehouse_id, product_id, qty, reserved)
  VALUES (gen_random_uuid()::TEXT, p_warehouse_id, p_product_id, p_qty, 0)
  ON CONFLICT (warehouse_id, product_id)
  DO UPDATE SET qty = EXCLUDED.qty;

  PERFORM inventory_sync_product_qty(p_product_id);
  RETURN p_qty;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_complete_pos_sale(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id TEXT;
  v_item JSONB;
  v_product_id TEXT;
  v_qty INTEGER;
BEGIN
  v_sale_id := COALESCE(payload->>'sale_id', gen_random_uuid()::TEXT);

  IF COALESCE(jsonb_array_length(payload->'items'), 0) < 1 THEN
    RAISE EXCEPTION 'Sale must include at least one item'
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
    NULLIF(payload->>'customer_id', ''),
    COALESCE(NULLIF(payload->>'customer_name', ''), 'Walk-in'),
    COALESCE((payload->>'subtotal')::NUMERIC, 0),
    COALESCE((payload->>'discount_amount')::NUMERIC, 0),
    COALESCE((payload->>'tax_amount')::NUMERIC, 0),
    COALESCE((payload->>'total')::NUMERIC, 0),
    payload->>'payment_method',
    COALESCE((payload->>'amount_tendered')::NUMERIC, 0),
    COALESCE((payload->>'change_due')::NUMERIC, 0),
    NULLIF(payload->>'notes', ''),
    'completed'
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '');
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each sale item must have a quantity of at least 1'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_pos_sale_items (
      id, sale_id, product_id, sku, name, unit_price, quantity,
      line_discount, line_total, color, size
    ) VALUES (
      gen_random_uuid()::TEXT,
      v_sale_id,
      v_product_id,
      COALESCE(v_item->>'sku', ''),
      COALESCE(v_item->>'name', ''),
      COALESCE((v_item->>'unit_price')::NUMERIC, 0),
      v_qty,
      COALESCE((v_item->>'line_discount')::NUMERIC, 0),
      COALESCE((v_item->>'line_total')::NUMERIC, 0),
      NULLIF(v_item->>'color', ''),
      NULLIF(v_item->>'size', '')
    );

    IF v_product_id IS NOT NULL THEN
      PERFORM inventory_adjust_warehouse_qty(payload->>'warehouse_id', v_product_id, -v_qty);

      UPDATE inventory_stock_levels
      SET outbound_qty = outbound_qty + v_qty
      WHERE product_id = v_product_id;
    END IF;
  END LOOP;

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
    IF v_item.product_id IS NOT NULL THEN
      PERFORM inventory_adjust_warehouse_qty(v_sale.warehouse_id, v_item.product_id, v_item.quantity);

      UPDATE inventory_stock_levels
      SET outbound_qty = GREATEST(outbound_qty - v_item.quantity, 0)
      WHERE product_id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE inventory_pos_sales SET status = 'voided' WHERE id = p_sale_id;

  RETURN jsonb_build_object('id', p_sale_id, 'status', 'voided');
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
BEGIN
  v_id := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);
  v_product_id := NULLIF(payload->>'product_id', '');
  v_warehouse_id := NULLIF(payload->>'warehouse_id', '');
  v_qty := COALESCE((payload->>'qty')::INTEGER, 0);
  v_status := COALESCE(NULLIF(payload->>'status', ''), 'Received');

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
    order_date, qty, stock_value, status, status_variant, arrival_date
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
    )
  );

  PERFORM inventory_adjust_warehouse_qty(v_warehouse_id, v_product_id, v_qty);

  UPDATE inventory_stock_levels
  SET inbound_qty = inbound_qty + v_qty
  WHERE product_id = v_product_id;

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

  IF v_row.warehouse_id IS NOT NULL THEN
    PERFORM inventory_adjust_warehouse_qty(v_row.warehouse_id, v_row.product_id, -v_row.qty);
  END IF;

  UPDATE inventory_stock_levels
  SET inbound_qty = GREATEST(inbound_qty - v_row.qty, 0)
  WHERE product_id = v_row.product_id;

  DELETE FROM inventory_inbound_shipments WHERE id = p_id;

  RETURN jsonb_build_object('id', p_id);
END;
$$;

GRANT ALL ON TABLE inventory_warehouse_stock TO anon, authenticated;
GRANT ALL ON TABLE inventory_pos_sales TO anon, authenticated;
GRANT ALL ON TABLE inventory_pos_sale_items TO anon, authenticated;
GRANT ALL ON TABLE inventory_warehouses TO anon, authenticated;

ALTER TABLE inventory_warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_pos_sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_warehouse_stock_anon_all ON inventory_warehouse_stock;
CREATE POLICY inventory_warehouse_stock_anon_all
  ON inventory_warehouse_stock FOR ALL TO anon
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS inventory_warehouse_stock_authenticated_all ON inventory_warehouse_stock;
CREATE POLICY inventory_warehouse_stock_authenticated_all
  ON inventory_warehouse_stock FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_pos_sales_anon_all ON inventory_pos_sales;
CREATE POLICY inventory_pos_sales_anon_all
  ON inventory_pos_sales FOR ALL TO anon
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS inventory_pos_sales_authenticated_all ON inventory_pos_sales;
CREATE POLICY inventory_pos_sales_authenticated_all
  ON inventory_pos_sales FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_pos_sale_items_anon_all ON inventory_pos_sale_items;
CREATE POLICY inventory_pos_sale_items_anon_all
  ON inventory_pos_sale_items FOR ALL TO anon
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS inventory_pos_sale_items_authenticated_all ON inventory_pos_sale_items;
CREATE POLICY inventory_pos_sale_items_authenticated_all
  ON inventory_pos_sale_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT EXECUTE ON FUNCTION inventory_sync_product_qty(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_adjust_warehouse_qty(TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_set_warehouse_qty(TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_receive_inbound_shipment(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_delete_inbound_shipment(TEXT) TO anon, authenticated;
