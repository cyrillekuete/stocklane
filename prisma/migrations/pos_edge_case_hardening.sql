-- POS edge-case hardening: server-side totals, cash tendered checks, idempotent
-- complete, tax snapshot, nullable multi-warehouse header, void reason/window,
-- and revoke anon execute on write RPCs (authenticated retains access).

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_pos_sales
  ALTER COLUMN warehouse_id DROP NOT NULL;

ALTER TABLE inventory_pos_sales
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS tax_calculation TEXT,
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Complete sale (authoritative money + stock + ledger)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_complete_pos_sale(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id TEXT;
  v_sale_number TEXT;
  v_item JSONB;
  v_product_id TEXT;
  v_product_status TEXT;
  v_qty INTEGER;
  v_item_warehouse_id TEXT;
  v_warehouse_status TEXT;
  v_customer_id TEXT;
  v_payment_method TEXT;
  v_unit_price NUMERIC(12, 2);
  v_line_discount NUMERIC(12, 2);
  v_line_gross NUMERIC(12, 2);
  v_line_total NUMERIC(12, 2);
  v_subtotal NUMERIC(12, 2) := 0;
  v_discount_amount NUMERIC(12, 2);
  v_discount_percent NUMERIC(12, 2);
  v_after_discount NUMERIC(12, 2);
  v_tax_percent NUMERIC(5, 2);
  v_tax_calculation TEXT;
  v_tax_amount NUMERIC(12, 2);
  v_total NUMERIC(12, 2);
  v_amount_tendered NUMERIC(12, 2);
  v_change_due NUMERIC(12, 2);
  v_header_warehouse_id TEXT;
  v_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_client_total NUMERIC(12, 2);
  v_existing_status TEXT;
  v_item_count INTEGER := 0;
  v_distinct_warehouses INTEGER := 0;
BEGIN
  v_sale_id := COALESCE(NULLIF(payload->>'sale_id', ''), gen_random_uuid()::TEXT);
  v_sale_number := NULLIF(payload->>'sale_number', '');
  v_customer_id := NULLIF(payload->>'customer_id', '');
  v_payment_method := COALESCE(NULLIF(payload->>'payment_method', ''), 'cash');
  v_amount_tendered := COALESCE((payload->>'amount_tendered')::NUMERIC, 0);
  v_client_total := COALESCE((payload->>'total')::NUMERIC, 0);
  v_discount_percent := GREATEST(LEAST(COALESCE((payload->>'discount_percent')::NUMERIC, 0), 100), 0);
  v_discount_amount := GREATEST(COALESCE((payload->>'discount_amount')::NUMERIC, 0), 0);

  IF v_sale_number IS NULL THEN
    RAISE EXCEPTION 'Sale number is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT status INTO v_existing_status
  FROM inventory_pos_sales
  WHERE id = v_sale_id;

  IF FOUND THEN
    IF v_existing_status = 'completed' THEN
      RETURN jsonb_build_object('id', v_sale_id, 'sale_number', v_sale_number, 'idempotent', true);
    END IF;
    RAISE EXCEPTION 'Sale id already exists with status %', v_existing_status
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(jsonb_array_length(payload->'items'), 0) < 1 THEN
    RAISE EXCEPTION 'Sale must include at least one item'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment_method IN ('account', 'credit') AND v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Account and credit sales require a customer'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(tax_percent, 0), COALESCE(tax_calculation, 'inclusive')
  INTO v_tax_percent, v_tax_calculation
  FROM inventory_store_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    v_tax_percent := 0;
    v_tax_calculation := 'inclusive';
  END IF;

  IF payload ? 'tax_percent' AND payload->>'tax_percent' IS NOT NULL THEN
    v_tax_percent := GREATEST(COALESCE((payload->>'tax_percent')::NUMERIC, v_tax_percent), 0);
  END IF;
  IF NULLIF(payload->>'tax_calculation', '') IS NOT NULL THEN
    v_tax_calculation := payload->>'tax_calculation';
  END IF;

  -- First pass: validate lines and compute gross subtotal (before cart discount).
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '');
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_item_warehouse_id := COALESCE(
      NULLIF(v_item->>'warehouse_id', ''),
      NULLIF(payload->>'warehouse_id', '')
    );
    v_unit_price := ROUND(GREATEST(COALESCE((v_item->>'unit_price')::NUMERIC, 0), 0), 2);
    v_line_discount := ROUND(GREATEST(COALESCE((v_item->>'line_discount')::NUMERIC, 0), 0), 2);

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

    SELECT status INTO v_product_status
    FROM inventory_products
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_product_id
        USING ERRCODE = 'P0001';
    END IF;

    IF lower(COALESCE(v_product_status, '')) <> 'live' THEN
      RAISE EXCEPTION 'Product % is not sellable (status %)', v_product_id, v_product_status
        USING ERRCODE = 'P0001';
    END IF;

    SELECT status INTO v_warehouse_status
    FROM inventory_warehouses
    WHERE id = v_item_warehouse_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Warehouse % not found', v_item_warehouse_id
        USING ERRCODE = 'P0001';
    END IF;

    IF lower(COALESCE(v_warehouse_status, '')) <> 'active' THEN
      RAISE EXCEPTION 'Warehouse % is not active', v_item_warehouse_id
        USING ERRCODE = 'P0001';
    END IF;

    -- Subtotal is gross (unit × qty). Cart discount is applied once below.
    -- line_discount is display allocation only and must not reduce subtotal again.
    v_line_gross := ROUND(v_unit_price * v_qty, 2);
    IF v_line_discount > v_line_gross THEN
      v_line_discount := v_line_gross;
    END IF;
    v_subtotal := v_subtotal + v_line_gross;
    v_item_count := v_item_count + 1;
  END LOOP;

  v_subtotal := ROUND(v_subtotal, 2);
  -- Prefer percent when provided; otherwise use fixed discount_amount. Never stack both.
  IF v_discount_percent > 0 THEN
    v_discount_amount := ROUND(LEAST(v_subtotal, (v_subtotal * v_discount_percent) / 100.0), 2);
  ELSE
    v_discount_amount := ROUND(LEAST(v_subtotal, GREATEST(v_discount_amount, 0)), 2);
  END IF;
  v_after_discount := GREATEST(v_subtotal - v_discount_amount, 0);

  IF lower(v_tax_calculation) = 'inclusive' THEN
    IF v_tax_percent > 0 THEN
      v_tax_amount := ROUND(v_after_discount - (v_after_discount / (1 + (v_tax_percent / 100.0))), 2);
    ELSE
      v_tax_amount := 0;
    END IF;
    v_total := ROUND(v_after_discount, 2);
  ELSE
    v_tax_amount := ROUND((v_after_discount * v_tax_percent) / 100.0, 2);
    v_total := ROUND(v_after_discount + v_tax_amount, 2);
  END IF;

  -- Reject tampered client totals (allow 1 unit rounding tolerance, e.g. XAF).
  IF ABS(v_client_total - v_total) > 1 THEN
    RAISE EXCEPTION 'Sale total mismatch: client % server %', v_client_total, v_total
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment_method = 'cash' THEN
    IF v_amount_tendered < v_total THEN
      RAISE EXCEPTION 'Amount tendered is less than the total'
        USING ERRCODE = 'P0001';
    END IF;
    v_change_due := ROUND(v_amount_tendered - v_total, 2);
  ELSE
    v_amount_tendered := v_total;
    v_change_due := 0;
  END IF;

  SELECT COUNT(DISTINCT COALESCE(NULLIF(item->>'warehouse_id', ''), NULLIF(payload->>'warehouse_id', '')))
  INTO v_distinct_warehouses
  FROM jsonb_array_elements(payload->'items') AS item;

  IF v_distinct_warehouses = 1 THEN
    v_header_warehouse_id := COALESCE(
      NULLIF((payload->'items'->0)->>'warehouse_id', ''),
      NULLIF(payload->>'warehouse_id', '')
    );
  ELSE
    v_header_warehouse_id := NULL;
  END IF;

  INSERT INTO inventory_pos_sales (
    id, sale_number, warehouse_id, customer_id, customer_name,
    subtotal, discount_amount, tax_amount, total,
    payment_method, amount_tendered, change_due, notes, status,
    tax_percent, tax_calculation
  ) VALUES (
    v_sale_id,
    v_sale_number,
    v_header_warehouse_id,
    v_customer_id,
    COALESCE(NULLIF(payload->>'customer_name', ''), 'Walk-in'),
    v_subtotal,
    v_discount_amount,
    v_tax_amount,
    v_total,
    v_payment_method,
    v_amount_tendered,
    v_change_due,
    NULLIF(payload->>'notes', ''),
    'completed',
    v_tax_percent,
    v_tax_calculation
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '');
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_item_warehouse_id := COALESCE(
      NULLIF(v_item->>'warehouse_id', ''),
      NULLIF(payload->>'warehouse_id', '')
    );
    v_unit_price := ROUND(GREATEST(COALESCE((v_item->>'unit_price')::NUMERIC, 0), 0), 2);
    v_line_discount := ROUND(GREATEST(COALESCE((v_item->>'line_discount')::NUMERIC, 0), 0), 2);
    v_line_gross := ROUND(v_unit_price * v_qty, 2);
    IF v_line_discount > v_line_gross THEN
      v_line_discount := v_line_gross;
    END IF;
    v_line_total := ROUND(v_line_gross - v_line_discount, 2);

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
      v_unit_price,
      v_qty,
      v_line_discount,
      v_line_total,
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
      v_sale_number,
      v_sale_id
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_sale_id,
    'sale_number', v_sale_number,
    'total', v_total,
    'tax_amount', v_tax_amount,
    'discount_amount', v_discount_amount
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Void sale (reason + optional age window; restock + ledger reverse)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS inventory_void_pos_sale(TEXT);

CREATE OR REPLACE FUNCTION inventory_void_pos_sale(
  p_sale_id TEXT,
  p_void_reason TEXT DEFAULT NULL,
  p_max_age_days INTEGER DEFAULT 30
)
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

  IF p_max_age_days IS NOT NULL AND p_max_age_days >= 0 THEN
    IF v_sale.created_at < (now() - make_interval(days => p_max_age_days)) THEN
      RAISE EXCEPTION 'Sale is older than % days and cannot be voided', p_max_age_days
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM inventory_pos_sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'Cannot void sale with missing product on line item'
        USING ERRCODE = 'P0001';
    END IF;
    v_item_warehouse_id := COALESCE(v_item.warehouse_id, v_sale.warehouse_id);
    IF v_item_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Cannot void sale line without a warehouse'
        USING ERRCODE = 'P0001';
    END IF;
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

  UPDATE inventory_pos_sales
  SET status = 'voided',
      void_reason = NULLIF(p_void_reason, ''),
      voided_at = now(),
      notes = CASE
        WHEN NULLIF(p_void_reason, '') IS NULL THEN notes
        WHEN notes IS NULL OR notes = '' THEN 'Void: ' || p_void_reason
        ELSE notes || E'\nVoid: ' || p_void_reason
      END
  WHERE id = p_sale_id;

  RETURN jsonb_build_object('id', p_sale_id, 'status', 'voided');
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants: revoke PUBLIC; allow authenticated + service_role.
-- Anon remains granted only because the Vite app has no cashier auth yet.
-- When auth gates /pos, run:
--   REVOKE EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) FROM anon;
--   REVOKE EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) FROM anon;
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION inventory_complete_pos_sale(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO anon;

REVOKE ALL ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) TO anon;
