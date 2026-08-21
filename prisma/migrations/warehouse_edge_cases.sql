-- Warehouse edge-case hardening: atomic default swap + stock move between warehouses.

CREATE OR REPLACE FUNCTION inventory_set_default_warehouse(p_warehouse_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF p_warehouse_id IS NULL OR btrim(p_warehouse_id) = '' THEN
    RAISE EXCEPTION 'Warehouse id is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT status INTO v_status
  FROM inventory_warehouses
  WHERE id = p_warehouse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warehouse not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF lower(v_status) <> 'active' THEN
    RAISE EXCEPTION 'Default warehouse must be Active'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE inventory_warehouses
  SET is_default = false
  WHERE is_default = true
    AND id <> p_warehouse_id;

  UPDATE inventory_warehouses
  SET is_default = true
  WHERE id = p_warehouse_id;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_move_warehouse_stock(
  p_from_warehouse_id TEXT,
  p_to_warehouse_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_status TEXT;
  v_to_status TEXT;
  v_row RECORD;
  v_moved INTEGER := 0;
BEGIN
  IF p_from_warehouse_id IS NULL OR p_to_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Source and destination warehouses are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_from_warehouse_id = p_to_warehouse_id THEN
    RAISE EXCEPTION 'Source and destination warehouses must differ'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT status INTO v_from_status
  FROM inventory_warehouses
  WHERE id = p_from_warehouse_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source warehouse not found'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT status INTO v_to_status
  FROM inventory_warehouses
  WHERE id = p_to_warehouse_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination warehouse not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF lower(v_to_status) <> 'active' THEN
    RAISE EXCEPTION 'Destination warehouse must be Active'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_row IN
    SELECT
      product_id,
      qty,
      GREATEST(qty - COALESCE(reserved, 0), 0) AS available
    FROM inventory_warehouse_stock
    WHERE warehouse_id = p_from_warehouse_id
      AND qty > 0
    FOR UPDATE
  LOOP
    -- Move unreserved units only; reserved stock stays with open orders at the source.
    IF v_row.available > 0 THEN
      PERFORM inventory_adjust_warehouse_qty(p_from_warehouse_id, v_row.product_id, -v_row.available);
      PERFORM inventory_adjust_warehouse_qty(p_to_warehouse_id, v_row.product_id, v_row.available);
      v_moved := v_moved + v_row.available;
    END IF;
  END LOOP;

  RETURN v_moved;
END;
$$;

GRANT EXECUTE ON FUNCTION inventory_set_default_warehouse(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_move_warehouse_stock(TEXT, TEXT) TO anon, authenticated;
