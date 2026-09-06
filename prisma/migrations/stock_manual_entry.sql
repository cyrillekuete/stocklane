-- Manual stock entry: initial opening balance and signed adjustments.
-- Purchased stock continues to go through inventory_receive_inbound_shipment.

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
    RAISE EXCEPTION 'Stock can only be added with Stock Entry'
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

-- Returns the applied entry quantity (signed), not the resulting on-hand.
CREATE OR REPLACE FUNCTION inventory_apply_stock_entry(payload JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_product_id TEXT;
  v_warehouse_id TEXT;
  v_qty INTEGER;
  v_entry_type TEXT;
  v_current INTEGER;
  v_has_history BOOLEAN;
BEGIN
  v_id := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);
  v_product_id := NULLIF(payload->>'product_id', '');
  v_warehouse_id := NULLIF(payload->>'warehouse_id', '');
  v_qty := COALESCE((payload->>'qty')::INTEGER, 0);
  v_entry_type := COALESCE(NULLIF(payload->>'entry_type', ''), '');

  IF v_product_id IS NULL OR v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Product and warehouse are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM inventory_warehouses
    WHERE id = v_warehouse_id
      AND lower(status) = 'active'
  ) THEN
    RAISE EXCEPTION 'Select an Active warehouse'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_entry_type = 'initial' THEN
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Quantity must be at least 1'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_warehouse_stock (id, warehouse_id, product_id, qty, reserved)
    VALUES (gen_random_uuid()::TEXT, v_warehouse_id, v_product_id, 0, 0)
    ON CONFLICT (warehouse_id, product_id) DO NOTHING;

    SELECT qty INTO v_current
    FROM inventory_warehouse_stock
    WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id
    FOR UPDATE;

    IF COALESCE(v_current, 0) <> 0 THEN
      RAISE EXCEPTION 'Initial stock is only allowed when on-hand quantity is 0. Use Purchased or Adjustment instead.'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM inventory_stock_movements
      WHERE product_id = v_product_id
        AND warehouse_id = v_warehouse_id
        AND delta <> 0
        AND reason IS DISTINCT FROM 'product_create'
    ) INTO v_has_history;

    IF v_has_history THEN
      RAISE EXCEPTION 'Initial stock is only allowed when this product has no stock history in this warehouse. Use Purchased or Adjustment instead.'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM inventory_adjust_warehouse_qty(
      v_warehouse_id, v_product_id, v_qty, 'initial_stock', 'stock_entry', v_id
    );
    RETURN v_qty;
  END IF;

  IF v_entry_type = 'adjustment' THEN
    IF v_qty = 0 THEN
      RAISE EXCEPTION 'Adjustment quantity cannot be 0'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM inventory_adjust_warehouse_qty(
      v_warehouse_id, v_product_id, v_qty, 'adjustment', 'stock_entry', v_id
    );
    RETURN v_qty;
  END IF;

  RAISE EXCEPTION 'Entry type must be initial or adjustment'
    USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION inventory_set_warehouse_qty(TEXT, TEXT, INTEGER, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_apply_stock_entry(JSONB) TO anon, authenticated;
