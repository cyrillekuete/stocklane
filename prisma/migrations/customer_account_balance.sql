-- Customer prepaid/credit account balances and ledger

ALTER TABLE inventory_customers
  ADD COLUMN IF NOT EXISTS account_balance NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS inventory_customer_account_transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES inventory_customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'sale', 'void')),
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  payment_method TEXT,
  notes TEXT,
  pos_sale_id TEXT REFERENCES inventory_pos_sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_customer_account_transactions_customer_created_idx
  ON inventory_customer_account_transactions (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_customer_account_transactions_pos_sale_id_idx
  ON inventory_customer_account_transactions (pos_sale_id);

DROP TRIGGER IF EXISTS inventory_customer_account_transactions_updated_at
  ON inventory_customer_account_transactions;
CREATE TRIGGER inventory_customer_account_transactions_updated_at
  BEFORE UPDATE ON inventory_customer_account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION inventory_set_updated_at();

GRANT ALL ON TABLE inventory_customer_account_transactions TO anon, authenticated;

ALTER TABLE inventory_customer_account_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_customer_account_transactions_anon_all
  ON inventory_customer_account_transactions;
CREATE POLICY inventory_customer_account_transactions_anon_all
  ON inventory_customer_account_transactions FOR ALL TO anon
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS inventory_customer_account_transactions_authenticated_all
  ON inventory_customer_account_transactions;
CREATE POLICY inventory_customer_account_transactions_authenticated_all
  ON inventory_customer_account_transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

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

  SELECT account_balance INTO v_balance
  FROM inventory_customers
  WHERE id = v_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found'
      USING ERRCODE = 'P0001';
  END IF;

  v_new_balance := v_balance + v_amount;

  UPDATE inventory_customers
  SET account_balance = v_new_balance
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

CREATE OR REPLACE FUNCTION inventory_complete_pos_sale(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id TEXT;
  v_item JSONB;
  v_product_id TEXT;
  v_qty INTEGER;
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

  IF v_payment_method = 'credit' AND v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Credit sales require a customer'
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

  IF v_payment_method = 'credit' THEN
    SELECT account_balance INTO v_balance
    FROM inventory_customers
    WHERE id = v_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer not found'
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
      'credit',
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
    IF v_item.product_id IS NOT NULL THEN
      PERFORM inventory_adjust_warehouse_qty(v_sale.warehouse_id, v_item.product_id, v_item.quantity);

      UPDATE inventory_stock_levels
      SET outbound_qty = GREATEST(outbound_qty - v_item.quantity, 0)
      WHERE product_id = v_item.product_id;
    END IF;
  END LOOP;

  IF v_sale.payment_method = 'credit' AND v_sale.customer_id IS NOT NULL THEN
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
        'credit',
        v_sale.sale_number,
        p_sale_id
      );
    END IF;
  END IF;

  UPDATE inventory_pos_sales SET status = 'voided' WHERE id = p_sale_id;

  RETURN jsonb_build_object('id', p_sale_id, 'status', 'voided');
END;
$$;

GRANT EXECUTE ON FUNCTION inventory_deposit_customer_account(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT) TO anon, authenticated;
