-- Customer edge-case hardening: soft delete, partial unique code/email,
-- delete impact, deposit/POS status gates, and live spend stats.

-- ---------------------------------------------------------------------------
-- Soft delete column
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_customers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS inventory_customers_deleted_at_idx
  ON inventory_customers (deleted_at);

-- ---------------------------------------------------------------------------
-- Normalize emails + remediate duplicates before unique index
-- ---------------------------------------------------------------------------

UPDATE inventory_customers
SET email = lower(btrim(email))
WHERE email IS NOT NULL AND email <> lower(btrim(email));

UPDATE inventory_customers
SET email = NULL
WHERE email IS NOT NULL AND btrim(email) = '';

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(email)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM inventory_customers
  WHERE email IS NOT NULL
)
UPDATE inventory_customers c
SET email = split_part(c.email, '@', 1) || '+dup' || ranked.rn::TEXT || '@' || split_part(c.email, '@', 2)
FROM ranked
WHERE c.id = ranked.id
  AND ranked.rn > 1
  AND position('@' IN c.email) > 0;

-- ---------------------------------------------------------------------------
-- Remap code uniqueness to active-only partial index
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_con TEXT;
BEGIN
  SELECT c.conname INTO v_con
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'inventory_customers'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) ILIKE '%(code)%'
  LIMIT 1;

  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE inventory_customers DROP CONSTRAINT %I', v_con);
  END IF;

  FOR v_con IN
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'inventory_customers'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(code)%'
      AND indexname NOT ILIKE '%active%'
      AND indexname NOT ILIKE '%deleted%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', v_con);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_customers_code_active_uidx
  ON inventory_customers (code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_customers_email_active_uidx
  ON inventory_customers (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Helpers: sellable customer + spend counters
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_assert_customer_active(p_customer_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  IF p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN
    RAISE EXCEPTION 'Customer is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT status, deleted_at INTO v_status, v_deleted_at
  FROM inventory_customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Customer is archived and cannot be used'
      USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_status, '')) <> 'active' THEN
    RAISE EXCEPTION 'Customer must be Active (current status: %)', v_status
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_apply_customer_spend(
  p_customer_id TEXT,
  p_amount NUMERIC,
  p_count_delta INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_total NUMERIC(12, 2);
  v_new_count INTEGER;
  v_new_total NUMERIC(12, 2);
BEGIN
  IF p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN
    RETURN;
  END IF;

  SELECT
    GREATEST(COALESCE(NULLIF(btrim(order_count), '')::INTEGER, 0), 0),
    COALESCE(total_spent, 0)
  INTO v_count, v_total
  FROM inventory_customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_new_count := GREATEST(v_count + COALESCE(p_count_delta, 0), 0);
  v_new_total := ROUND(GREATEST(v_total + COALESCE(p_amount, 0), 0), 2);

  UPDATE inventory_customers
  SET
    order_count = v_new_count::TEXT,
    total_spent = v_new_total,
    avg_price = CASE
      WHEN v_new_count > 0 THEN ROUND(v_new_total / v_new_count, 2)
      ELSE 0
    END,
    last_visit = CASE
      WHEN COALESCE(p_count_delta, 0) > 0 THEN now()
      ELSE last_visit
    END,
    updated_at = now()
  WHERE id = p_customer_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Soft / restore / impact / hard delete
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_soft_delete_customer(p_customer_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance NUMERIC(12, 2);
BEGIN
  IF p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN
    RAISE EXCEPTION 'Customer id is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT account_balance INTO v_balance
  FROM inventory_customers
  WHERE id = p_customer_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found or already deleted'
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_balance, 0) <> 0 THEN
    RAISE EXCEPTION 'Settle the account balance before archiving this customer'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE inventory_customers
  SET deleted_at = now(),
      status = 'Archived',
      updated_at = now()
  WHERE id = p_customer_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('id', p_customer_id, 'deleted_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION inventory_restore_customer(p_customer_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN
    RAISE EXCEPTION 'Customer id is required'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE inventory_customers
  SET deleted_at = NULL,
      status = 'Active',
      updated_at = now()
  WHERE id = p_customer_id
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found or not deleted'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('id', p_customer_id, 'status', 'Active');
END;
$$;

CREATE OR REPLACE FUNCTION inventory_customer_delete_impact(p_customer_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_code TEXT;
  v_name TEXT;
  v_balance NUMERIC(12, 2);
  v_deleted_at TIMESTAMPTZ;
  v_ledger INTEGER;
  v_pos INTEGER;
  v_orders INTEGER;
  v_can_hard_delete BOOLEAN;
BEGIN
  SELECT code, name, account_balance, deleted_at
  INTO v_code, v_name, v_balance, v_deleted_at
  FROM inventory_customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_ledger
  FROM inventory_customer_account_transactions
  WHERE customer_id = p_customer_id;

  SELECT COUNT(*)::INTEGER INTO v_pos
  FROM inventory_pos_sales
  WHERE customer_id = p_customer_id;

  SELECT COUNT(*)::INTEGER INTO v_orders
  FROM inventory_orders
  WHERE customer_id = p_customer_id;

  v_can_hard_delete :=
    v_deleted_at IS NOT NULL
    AND COALESCE(v_balance, 0) = 0
    AND v_ledger = 0
    AND v_pos = 0
    AND v_orders = 0;

  RETURN jsonb_build_object(
    'id', p_customer_id,
    'code', v_code,
    'name', v_name,
    'account_balance', COALESCE(v_balance, 0),
    'deleted_at', v_deleted_at,
    'ledger_count', v_ledger,
    'pos_sales_count', v_pos,
    'orders_count', v_orders,
    'can_hard_delete', v_can_hard_delete
  );
END;
$$;

CREATE OR REPLACE FUNCTION inventory_hard_delete_customer(p_customer_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
  v_balance NUMERIC(12, 2);
  v_ledger INTEGER;
  v_pos INTEGER;
  v_orders INTEGER;
BEGIN
  IF p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN
    RAISE EXCEPTION 'Customer id is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT deleted_at, account_balance INTO v_deleted_at, v_balance
  FROM inventory_customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Soft-delete the customer before permanently deleting it'
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_balance, 0) <> 0 THEN
    RAISE EXCEPTION 'Settle the account balance before permanently deleting this customer'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_ledger
  FROM inventory_customer_account_transactions
  WHERE customer_id = p_customer_id;

  SELECT COUNT(*)::INTEGER INTO v_pos
  FROM inventory_pos_sales
  WHERE customer_id = p_customer_id;

  SELECT COUNT(*)::INTEGER INTO v_orders
  FROM inventory_orders
  WHERE customer_id = p_customer_id;

  IF v_ledger > 0 OR v_pos > 0 OR v_orders > 0 THEN
    RAISE EXCEPTION 'Customer has sales, orders, or ledger history and cannot be permanently deleted'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM inventory_customers WHERE id = p_customer_id;
  RETURN jsonb_build_object('id', p_customer_id, 'hard_deleted', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Deposit: lock row, reject archived/inactive
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_deposit_customer_account(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id TEXT;
  v_amount NUMERIC(12, 2);
  v_payment_method TEXT;
  v_notes TEXT;
  v_balance NUMERIC(12, 2);
  v_new_balance NUMERIC(12, 2);
  v_tx_id TEXT;
  v_status TEXT;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  v_customer_id := NULLIF(payload->>'customer_id', '');
  v_amount := COALESCE((payload->>'amount')::NUMERIC, 0);
  v_payment_method := COALESCE(NULLIF(payload->>'payment_method', ''), 'cash');
  v_notes := NULLIF(payload->>'notes', '');
  v_tx_id := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer is required'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than 0'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_payment_method NOT IN ('cash', 'mtn_mobile_money', 'orange_money', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid deposit payment method'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT account_balance, status, deleted_at
  INTO v_balance, v_status, v_deleted_at
  FROM inventory_customers
  WHERE id = v_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Customer is archived and cannot receive deposits'
      USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_status, '')) <> 'active' THEN
    RAISE EXCEPTION 'Customer must be Active to receive deposits'
      USING ERRCODE = 'P0001';
  END IF;

  v_new_balance := v_balance + v_amount;

  UPDATE inventory_customers
  SET account_balance = v_new_balance,
      updated_at = now()
  WHERE id = v_customer_id;

  INSERT INTO inventory_customer_account_transactions (
    id, customer_id, type, amount, balance_after, payment_method, notes
  ) VALUES (
    v_tx_id,
    v_customer_id,
    'deposit',
    v_amount,
    v_new_balance,
    v_payment_method,
    v_notes
  );

  RETURN jsonb_build_object(
    'id', v_tx_id,
    'customer_id', v_customer_id,
    'account_balance', v_new_balance
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- POS complete: status gates + spend stats (extends pos_edge_case_hardening)
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

  IF v_payment_method IN ('account', 'credit') THEN
    PERFORM inventory_assert_customer_active(v_customer_id);
  ELSIF v_customer_id IS NOT NULL THEN
    -- Named customer on cash/mobile must still exist and not be archived.
    PERFORM inventory_assert_customer_active(v_customer_id);
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

    v_line_gross := ROUND(v_unit_price * v_qty, 2);
    IF v_line_discount > v_line_gross THEN
      v_line_discount := v_line_gross;
    END IF;
    v_subtotal := v_subtotal + v_line_gross;
    v_item_count := v_item_count + 1;
  END LOOP;

  v_subtotal := ROUND(v_subtotal, 2);
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
        updated_at = now()
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

  IF v_customer_id IS NOT NULL THEN
    PERFORM inventory_apply_customer_spend(v_customer_id, v_total, 1);
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
-- POS void: reverse spend stats
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
      SET account_balance = v_new_balance,
          updated_at = now()
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

  IF v_sale.customer_id IS NOT NULL THEN
    PERFORM inventory_apply_customer_spend(v_sale.customer_id, -v_sale.total, -1);
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
-- Backfill spend stats from completed POS sales + orders
-- ---------------------------------------------------------------------------

WITH pos_agg AS (
  SELECT
    customer_id,
    COUNT(*)::INTEGER AS cnt,
    COALESCE(SUM(total), 0)::NUMERIC(12, 2) AS spent,
    MAX(created_at) AS last_at
  FROM inventory_pos_sales
  WHERE customer_id IS NOT NULL
    AND status = 'completed'
  GROUP BY customer_id
),
order_agg AS (
  SELECT
    customer_id,
    COUNT(*)::INTEGER AS cnt,
    COALESCE(SUM(total), 0)::NUMERIC(12, 2) AS spent,
    MAX(created_at) AS last_at
  FROM inventory_orders
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
),
combined AS (
  SELECT
    COALESCE(p.customer_id, o.customer_id) AS customer_id,
    COALESCE(p.cnt, 0) + COALESCE(o.cnt, 0) AS cnt,
    COALESCE(p.spent, 0) + COALESCE(o.spent, 0) AS spent,
    GREATEST(p.last_at, o.last_at) AS last_at
  FROM pos_agg p
  FULL OUTER JOIN order_agg o ON o.customer_id = p.customer_id
)
UPDATE inventory_customers c
SET
  order_count = combined.cnt::TEXT,
  total_spent = ROUND(combined.spent, 2),
  avg_price = CASE
    WHEN combined.cnt > 0 THEN ROUND(combined.spent / combined.cnt, 2)
    ELSE 0
  END,
  last_visit = COALESCE(combined.last_at, c.last_visit)
FROM combined
WHERE c.id = combined.customer_id;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION inventory_assert_customer_active(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_apply_customer_spend(TEXT, NUMERIC, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_soft_delete_customer(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_restore_customer(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_customer_delete_impact(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_hard_delete_customer(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_deposit_customer_account(JSONB) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION inventory_complete_pos_sale(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO anon;

REVOKE ALL ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) TO anon;
