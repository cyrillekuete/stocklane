-- Split prepaid account charges from credit (pay-later) sales.
-- Account: deduct prepaid balance and reject if funds are insufficient.
-- Credit: record an IOU on the customer ledger and allow the balance to go negative.

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

    IF v_product_id IS NOT NULL THEN
      PERFORM inventory_adjust_warehouse_qty(v_item_warehouse_id, v_product_id, -v_qty);

      UPDATE inventory_stock_levels
      SET outbound_qty = outbound_qty + v_qty
      WHERE product_id = v_product_id;
    END IF;
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
    IF v_item.product_id IS NOT NULL THEN
      v_item_warehouse_id := COALESCE(v_item.warehouse_id, v_sale.warehouse_id);
      PERFORM inventory_adjust_warehouse_qty(v_item_warehouse_id, v_item.product_id, v_item.quantity);

      UPDATE inventory_stock_levels
      SET outbound_qty = GREATEST(outbound_qty - v_item.quantity, 0)
      WHERE product_id = v_item.product_id;
    END IF;
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

GRANT EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT) TO anon, authenticated;
