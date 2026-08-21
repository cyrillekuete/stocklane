-- Orders edge-case hardening: atomic create/update/cancel, status guards,
-- product snapshots, pricing from store settings, fulfilled void/restock,
-- tracking step sync, store_id scoping, and RPC-only write path.

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_order_items
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS product_sku TEXT,
  ADD COLUMN IF NOT EXISTS product_image TEXT;

ALTER TABLE inventory_orders
  ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES inventory_store_settings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_orders_idempotency_key_uidx
  ON inventory_orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_orders_store_id_idx
  ON inventory_orders (store_id);

CREATE INDEX IF NOT EXISTS inventory_orders_inventory_state_idx
  ON inventory_orders (inventory_state);

UPDATE inventory_orders
SET delivery_status = 'Canceled'
WHERE lower(delivery_status) = 'cancelled';

UPDATE inventory_orders
SET payment_status = 'Cancelled'
WHERE lower(payment_status) = 'canceled';

UPDATE inventory_order_items oi
SET
  product_name = COALESCE(NULLIF(oi.product_name, ''), p.name),
  product_sku = COALESCE(NULLIF(oi.product_sku, ''), p.sku),
  product_image = COALESCE(NULLIF(oi.product_image, ''), p.image)
FROM inventory_products p
WHERE oi.product_id = p.id
  AND (
    oi.product_name IS NULL OR oi.product_name = ''
    OR oi.product_sku IS NULL OR oi.product_sku = ''
  );

UPDATE inventory_orders o
SET store_id = s.id
FROM inventory_store_settings s
WHERE o.store_id IS NULL;

-- ---------------------------------------------------------------------------
-- Status helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_normalize_payment_status(p_status TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT := lower(trim(COALESCE(p_status, '')));
BEGIN
  IF v IN ('paid') THEN RETURN 'Paid'; END IF;
  IF v IN ('pending') THEN RETURN 'Pending'; END IF;
  IF v IN ('unpaid') THEN RETURN 'Unpaid'; END IF;
  IF v IN ('failed') THEN RETURN 'Failed'; END IF;
  IF v IN ('cancelled', 'canceled') THEN RETURN 'Cancelled'; END IF;
  RETURN 'Unpaid';
END;
$$;

CREATE OR REPLACE FUNCTION inventory_normalize_delivery_status(p_status TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT := lower(trim(COALESCE(p_status, '')));
BEGIN
  IF v IN ('pending') THEN RETURN 'Pending'; END IF;
  IF v IN ('packed') THEN RETURN 'Packed'; END IF;
  IF v IN ('shipped', 'shipping', 'in transit') THEN RETURN 'Shipped'; END IF;
  IF v IN ('delivered') THEN RETURN 'Delivered'; END IF;
  IF v IN ('on hold') THEN RETURN 'On Hold'; END IF;
  IF v IN ('canceled', 'cancelled') THEN RETURN 'Canceled'; END IF;
  IF v IN ('returned') THEN RETURN 'Returned'; END IF;
  RETURN 'Pending';
END;
$$;

CREATE OR REPLACE FUNCTION inventory_delivery_step(p_status TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT := inventory_normalize_delivery_status(p_status);
BEGIN
  IF v = 'Delivered' THEN RETURN 4; END IF;
  IF v = 'Shipped' THEN RETURN 3; END IF;
  IF v = 'Packed' THEN RETURN 2; END IF;
  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_status_variant(p_status TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT := lower(trim(COALESCE(p_status, '')));
BEGIN
  IF v IN ('paid', 'delivered', 'active', 'live') THEN RETURN 'success'; END IF;
  IF v IN ('failed', 'canceled', 'cancelled', 'returned') THEN RETURN 'destructive'; END IF;
  IF v IN ('pending', 'on hold', 'unpaid') THEN RETURN 'warning'; END IF;
  RETURN 'secondary';
END;
$$;

CREATE OR REPLACE FUNCTION inventory_assert_payment_transition(p_from TEXT, p_to TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_from TEXT := inventory_normalize_payment_status(p_from);
  v_to TEXT := inventory_normalize_payment_status(p_to);
BEGIN
  IF v_from = v_to THEN RETURN; END IF;
  IF v_from = 'Unpaid' AND v_to IN ('Pending', 'Paid', 'Failed', 'Cancelled') THEN RETURN; END IF;
  IF v_from = 'Pending' AND v_to IN ('Unpaid', 'Paid', 'Failed', 'Cancelled') THEN RETURN; END IF;
  IF v_from = 'Paid' AND v_to = 'Cancelled' THEN RETURN; END IF;
  IF v_from = 'Failed' AND v_to IN ('Unpaid', 'Pending', 'Paid', 'Cancelled') THEN RETURN; END IF;
  RAISE EXCEPTION 'Invalid payment status transition: % → %', v_from, v_to
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION inventory_assert_delivery_transition(p_from TEXT, p_to TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_from TEXT := inventory_normalize_delivery_status(p_from);
  v_to TEXT := inventory_normalize_delivery_status(p_to);
BEGIN
  IF v_from = v_to THEN RETURN; END IF;
  IF v_from = 'Pending' AND v_to IN ('Packed', 'Shipped', 'Delivered', 'On Hold', 'Canceled') THEN RETURN; END IF;
  IF v_from = 'Packed' AND v_to IN ('Pending', 'Shipped', 'Delivered', 'On Hold', 'Canceled') THEN RETURN; END IF;
  IF v_from = 'Shipped' AND v_to IN ('Delivered', 'Returned', 'Canceled') THEN RETURN; END IF;
  IF v_from = 'Delivered' AND v_to IN ('Returned') THEN RETURN; END IF;
  IF v_from = 'On Hold' AND v_to IN ('Pending', 'Packed', 'Shipped', 'Canceled') THEN RETURN; END IF;
  RAISE EXCEPTION 'Invalid delivery status transition: % → %', v_from, v_to
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION inventory_default_store_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id
  FROM inventory_store_settings
  ORDER BY created_at
  LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_compute_order_pricing(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_subtotal NUMERIC(12, 2) := 0;
  v_shipping NUMERIC(12, 2) := 0;
  v_tax NUMERIC(12, 2) := 0;
  v_total NUMERIC(12, 2) := 0;
  v_tax_percent NUMERIC(5, 2) := 0;
  v_tax_calculation TEXT := 'exclusive';
  v_free_shipping BOOLEAN := true;
  v_free_shipping_min NUMERIC(12, 2) := 0;
  v_qty INTEGER;
  v_price NUMERIC(12, 2);
  v_shipping_flat NUMERIC(12, 2) := 10;
BEGIN
  IF COALESCE(jsonb_array_length(p_items), 0) < 1 THEN
    RETURN jsonb_build_object(
      'subtotal', 0, 'shipping_cost', 0, 'tax', 0, 'total', 0
    );
  END IF;

  SELECT
    COALESCE(tax_percent, 0),
    COALESCE(tax_calculation, 'exclusive'),
    COALESCE(free_shipping_enabled, true),
    COALESCE(free_shipping_min, 0)
  INTO v_tax_percent, v_tax_calculation, v_free_shipping, v_free_shipping_min
  FROM inventory_store_settings
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND THEN
    v_tax_percent := 0;
    v_tax_calculation := 'exclusive';
    v_free_shipping := true;
    v_free_shipping_min := 0;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(COALESCE((v_item->>'quantity')::INTEGER, 1), 0);
    v_price := ROUND(COALESCE((v_item->>'price')::NUMERIC, 0));
    v_subtotal := v_subtotal + (v_price * v_qty);
  END LOOP;
  v_subtotal := ROUND(v_subtotal);

  IF v_free_shipping AND v_subtotal >= ROUND(v_free_shipping_min) THEN
    v_shipping := 0;
  ELSE
    v_shipping := v_shipping_flat;
  END IF;

  IF v_tax_percent > 0 THEN
    IF v_tax_calculation = 'inclusive' THEN
      v_tax := ROUND(v_subtotal - (v_subtotal / (1 + (v_tax_percent / 100.0))));
    ELSE
      v_tax := ROUND((v_subtotal * v_tax_percent) / 100.0);
    END IF;
  END IF;

  IF v_tax_calculation = 'inclusive' THEN
    v_total := ROUND(v_subtotal + v_shipping);
  ELSE
    v_total := ROUND(v_subtotal + v_shipping + v_tax);
  END IF;

  RETURN jsonb_build_object(
    'subtotal', v_subtotal,
    'shipping_cost', v_shipping,
    'tax', v_tax,
    'total', v_total
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Tracking sync
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_sync_order_tracking(p_order_id TEXT, p_delivery_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_step INTEGER := inventory_delivery_step(p_delivery_status);
  v_date TEXT;
  v_max_sort INTEGER;
BEGIN
  SELECT date INTO v_date FROM inventory_orders WHERE id = p_order_id;
  UPDATE inventory_orders
  SET current_step = v_step
  WHERE id = p_order_id;

  SELECT COALESCE(MAX(sort_order), -1) INTO v_max_sort
  FROM inventory_order_tracking_events
  WHERE order_id = p_order_id;

  IF v_step >= 1 AND NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking_events
    WHERE order_id = p_order_id AND title = 'Order Placed'
  ) THEN
    INSERT INTO inventory_order_tracking_events (id, order_id, title, date, description, location, sort_order)
    VALUES (
      gen_random_uuid()::TEXT, p_order_id, 'Order Placed',
      COALESCE(v_date, to_char(now(), 'FMDD Mon, YYYY')) || ' 10:02',
      'Shipment information received', NULL, GREATEST(v_max_sort + 1, 0)
    );
    v_max_sort := GREATEST(v_max_sort + 1, 0);
  END IF;

  IF v_step >= 2 AND NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking_events
    WHERE order_id = p_order_id AND title = 'Packed'
  ) THEN
    INSERT INTO inventory_order_tracking_events (id, order_id, title, date, description, location, sort_order)
    VALUES (
      gen_random_uuid()::TEXT, p_order_id, 'Packed',
      COALESCE(v_date, to_char(now(), 'FMDD Mon, YYYY')) || ' 12:27',
      'Package prepared for carrier pickup', NULL, v_max_sort + 1
    );
    v_max_sort := v_max_sort + 1;
  END IF;

  IF v_step >= 3 AND NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking_events
    WHERE order_id = p_order_id AND title = 'Shipped'
  ) THEN
    INSERT INTO inventory_order_tracking_events (id, order_id, title, date, description, location, sort_order)
    VALUES (
      gen_random_uuid()::TEXT, p_order_id, 'Shipped',
      COALESCE(v_date, to_char(now(), 'FMDD Mon, YYYY')) || ' 14:10',
      'Package handed to carrier', NULL, v_max_sort + 1
    );
    v_max_sort := v_max_sort + 1;
  END IF;

  IF inventory_normalize_delivery_status(p_delivery_status) = 'Delivered' AND NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking_events
    WHERE order_id = p_order_id AND title = 'Delivered'
  ) THEN
    INSERT INTO inventory_order_tracking_events (id, order_id, title, date, description, location, sort_order)
    VALUES (
      gen_random_uuid()::TEXT, p_order_id, 'Delivered',
      COALESCE(v_date, to_char(now(), 'FMDD Mon, YYYY')) || ' 16:40',
      'Package delivered to recipient', NULL, v_max_sort + 1
    );
    v_max_sort := v_max_sort + 1;
  END IF;

  IF inventory_normalize_delivery_status(p_delivery_status) = 'Returned' AND NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking_events
    WHERE order_id = p_order_id AND title = 'Returned'
  ) THEN
    INSERT INTO inventory_order_tracking_events (id, order_id, title, date, description, location, sort_order)
    VALUES (
      gen_random_uuid()::TEXT, p_order_id, 'Returned',
      to_char(now(), 'FMDD Mon, YYYY HH24:MI'),
      'Return received', NULL, v_max_sort + 1
    );
  END IF;

  IF inventory_normalize_delivery_status(p_delivery_status) = 'Canceled' AND NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking_events
    WHERE order_id = p_order_id AND title = 'Canceled'
  ) THEN
    INSERT INTO inventory_order_tracking_events (id, order_id, title, date, description, location, sort_order)
    VALUES (
      gen_random_uuid()::TEXT, p_order_id, 'Canceled',
      to_char(now(), 'FMDD Mon, YYYY HH24:MI'),
      'Order canceled', NULL, v_max_sort + 1
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Restock fulfilled order (void / return)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_restock_fulfilled_order(p_order_id TEXT)
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

  IF v_order.inventory_state <> 'fulfilled' THEN
    RETURN jsonb_build_object('id', p_order_id, 'state', v_order.inventory_state);
  END IF;

  FOR v_item IN SELECT * FROM inventory_order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL AND v_item.warehouse_id IS NOT NULL AND v_item.quantity > 0 THEN
      PERFORM inventory_adjust_warehouse_qty(
        v_item.warehouse_id,
        v_item.product_id,
        GREATEST(v_item.quantity, 1),
        'order_void_restock',
        'order',
        p_order_id
      );
      UPDATE inventory_stock_levels
      SET outbound_qty = GREATEST(outbound_qty - GREATEST(v_item.quantity, 1), 0)
      WHERE product_id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE inventory_orders SET inventory_state = 'released' WHERE id = p_order_id;
  RETURN jsonb_build_object('id', p_order_id, 'state', 'released');
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply inventory side-effects from delivery status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_apply_order_inventory(
  p_order_id TEXT,
  p_delivery_status TEXT,
  p_warehouse_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_delivery TEXT := inventory_normalize_delivery_status(p_delivery_status);
  v_order inventory_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_delivery = 'Canceled' OR v_delivery = 'Returned' THEN
    IF v_order.inventory_state = 'reserved' THEN
      PERFORM inventory_release_order(p_order_id);
    ELSIF v_order.inventory_state = 'fulfilled' THEN
      PERFORM inventory_restock_fulfilled_order(p_order_id);
    END IF;
    RETURN;
  END IF;

  IF v_delivery IN ('Pending', 'Packed', 'On Hold', 'Shipped', 'Delivered') THEN
    IF v_order.inventory_state IN ('none', 'released') THEN
      PERFORM inventory_reserve_order(p_order_id, p_warehouse_id);
      SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id;
    END IF;
  END IF;

  IF v_delivery IN ('Shipped', 'Delivered') AND v_order.inventory_state = 'reserved' THEN
    PERFORM inventory_fulfill_order(p_order_id);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Insert validated line items (snapshots + live product checks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_insert_order_items(p_order_id TEXT, p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_product inventory_products%ROWTYPE;
  v_product_id TEXT;
  v_qty INTEGER;
  v_price NUMERIC(12, 2);
  v_count INTEGER := 0;
BEGIN
  IF COALESCE(jsonb_array_length(p_items), 0) < 1 THEN
    RAISE EXCEPTION 'Order requires at least one line item'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '');
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Product is required on each order line'
        USING ERRCODE = 'P0001';
    END IF;

    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Quantity must be at least 1'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_product
    FROM inventory_products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_product.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Deleted product cannot be ordered'
        USING ERRCODE = 'P0001';
    END IF;
    IF lower(COALESCE(v_product.status, '')) NOT IN ('live', 'active', '')
       AND lower(COALESCE(v_product.status, '')) NOT LIKE 'live%' THEN
      -- Allow Live; reject explicit Archived/Draft
      IF lower(v_product.status) IN ('archived', 'draft', 'inactive') THEN
        RAISE EXCEPTION 'Archived product cannot be ordered'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    v_price := ROUND(COALESCE(
      NULLIF(v_item->>'price', '')::NUMERIC,
      v_product.price,
      0
    ));
    IF v_price < 0 THEN
      RAISE EXCEPTION 'Price cannot be negative'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_order_items (
      id, order_id, product_id, warehouse_id, category, price, quantity,
      color, weight, trend_label, trend_variant, stock, reserved, threshold_level,
      product_name, product_sku, product_image
    ) VALUES (
      COALESCE(NULLIF(v_item->>'id', ''), gen_random_uuid()::TEXT),
      p_order_id,
      v_product_id,
      NULLIF(v_item->>'warehouse_id', ''),
      COALESCE(NULLIF(v_item->>'category', ''), (SELECT name FROM inventory_categories WHERE id = v_product.category_id), NULL),
      v_price,
      v_qty,
      NULLIF(v_item->>'color', ''),
      NULLIF(v_item->>'weight', ''),
      'Steady',
      'secondary',
      0,
      0,
      0,
      COALESCE(NULLIF(v_item->>'product_name', ''), v_product.name),
      COALESCE(NULLIF(v_item->>'product_sku', ''), v_product.sku),
      COALESCE(NULLIF(v_item->>'product_image', ''), v_product.image)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic create
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_create_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id TEXT := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);
  v_idempotency TEXT := NULLIF(payload->>'idempotency_key', '');
  v_existing inventory_orders%ROWTYPE;
  v_items JSONB := COALESCE(payload->'items', '[]'::jsonb);
  v_pricing JSONB;
  v_delivery TEXT := inventory_normalize_delivery_status(COALESCE(payload->>'delivery_status', 'Pending'));
  v_payment TEXT := inventory_normalize_payment_status(COALESCE(payload->>'payment_status', 'Unpaid'));
  v_order_number TEXT := COALESCE(NULLIF(trim(payload->>'order_number'), ''), 'SO-' || substr(v_order_id, 1, 8));
  v_store_id TEXT := COALESCE(NULLIF(payload->>'store_id', ''), inventory_default_store_id());
  v_customer_id TEXT := NULLIF(payload->>'customer_id', '');
  v_customer_name TEXT := COALESCE(NULLIF(trim(payload->>'customer_name'), ''), 'Customer');
  v_item_count INTEGER;
  v_carrier_id TEXT := NULLIF(payload->>'carrier_id', '');
  v_warehouse_id TEXT := NULLIF(payload->>'warehouse_id', '');
BEGIN
  IF v_idempotency IS NOT NULL THEN
    SELECT * INTO v_existing FROM inventory_orders WHERE idempotency_key = v_idempotency;
    IF FOUND THEN
      RETURN jsonb_build_object('id', v_existing.id, 'order_number', v_existing.order_number, 'idempotent', true);
    END IF;
  END IF;

  IF v_delivery = 'Canceled' THEN
    RAISE EXCEPTION 'Cannot create an already canceled order'
      USING ERRCODE = 'P0001';
  END IF;

  v_pricing := inventory_compute_order_pricing(v_items);

  INSERT INTO inventory_orders (
    id, order_number, date, customer_id, customer_name, total, item_count, category,
    delivery_status, delivery_status_variant, payment_status, payment_status_variant,
    carrier_id, subtotal, shipping_cost, tax,
    shipment_number, tracking_number, shipping_priority, delivery_method, current_step,
    origin_address, destination_address, shipping_label, shipping_line1, shipping_line2,
    total_time, departure_time, expected_arrival, inventory_state, store_id, idempotency_key
  ) VALUES (
    v_order_id,
    v_order_number,
    COALESCE(NULLIF(payload->>'date', ''), to_char(now(), 'FMDD Mon, YYYY')),
    v_customer_id,
    v_customer_name,
    (v_pricing->>'total')::NUMERIC,
    0,
    NULLIF(payload->>'category', ''),
    v_delivery,
    inventory_status_variant(v_delivery),
    v_payment,
    inventory_status_variant(v_payment),
    v_carrier_id,
    (v_pricing->>'subtotal')::NUMERIC,
    (v_pricing->>'shipping_cost')::NUMERIC,
    (v_pricing->>'tax')::NUMERIC,
    NULLIF(payload->>'shipment_number', ''),
    NULLIF(payload->>'tracking_number', ''),
    COALESCE(NULLIF(payload->>'shipping_priority', ''), 'Standard'),
    COALESCE(NULLIF(payload->>'delivery_method', ''), 'Ground Shipping'),
    inventory_delivery_step(v_delivery),
    NULLIF(payload->>'origin_address', ''),
    NULLIF(payload->>'destination_address', ''),
    COALESCE(NULLIF(payload->>'shipping_label', ''), 'Shipping label'),
    NULLIF(payload->>'shipping_line1', ''),
    NULLIF(payload->>'shipping_line2', ''),
    NULLIF(payload->>'total_time', ''),
    NULLIF(payload->>'departure_time', ''),
    NULLIF(payload->>'expected_arrival', ''),
    'none',
    v_store_id,
    v_idempotency
  );

  v_item_count := inventory_insert_order_items(v_order_id, v_items);
  UPDATE inventory_orders SET item_count = v_item_count WHERE id = v_order_id;

  PERFORM inventory_sync_order_tracking(v_order_id, v_delivery);
  PERFORM inventory_apply_order_inventory(v_order_id, v_delivery, v_warehouse_id);

  IF v_customer_id IS NOT NULL THEN
    PERFORM inventory_apply_customer_spend(
      v_customer_id,
      (v_pricing->>'total')::NUMERIC,
      1
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total', (v_pricing->>'total')::NUMERIC,
    'item_count', v_item_count
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic update
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_update_order(p_order_id TEXT, payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order inventory_orders%ROWTYPE;
  v_items JSONB := payload->'items';
  v_pricing JSONB;
  v_delivery TEXT;
  v_payment TEXT;
  v_item_count INTEGER;
  v_warehouse_id TEXT := NULLIF(payload->>'warehouse_id', '');
  v_old_total NUMERIC(12, 2);
  v_new_total NUMERIC(12, 2);
  v_old_delivery TEXT;
  v_old_customer_id TEXT;
  v_new_customer_id TEXT;
BEGIN
  SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF inventory_normalize_delivery_status(v_order.delivery_status) = 'Canceled'
     AND inventory_normalize_delivery_status(COALESCE(payload->>'delivery_status', v_order.delivery_status)) <> 'Canceled' THEN
    RAISE EXCEPTION 'Invalid delivery status transition: Canceled → %', payload->>'delivery_status'
      USING ERRCODE = 'P0001';
  END IF;

  IF payload ? 'payment_status' THEN
    v_payment := inventory_normalize_payment_status(payload->>'payment_status');
    PERFORM inventory_assert_payment_transition(v_order.payment_status, v_payment);
  ELSE
    v_payment := inventory_normalize_payment_status(v_order.payment_status);
  END IF;

  IF payload ? 'delivery_status' THEN
    v_delivery := inventory_normalize_delivery_status(payload->>'delivery_status');
    PERFORM inventory_assert_delivery_transition(v_order.delivery_status, v_delivery);
  ELSE
    v_delivery := inventory_normalize_delivery_status(v_order.delivery_status);
  END IF;

  v_old_total := v_order.total;
  v_old_delivery := inventory_normalize_delivery_status(v_order.delivery_status);
  v_old_customer_id := v_order.customer_id;
  IF payload ? 'customer_id' THEN
    v_new_customer_id := NULLIF(payload->>'customer_id', '');
  ELSE
    v_new_customer_id := v_order.customer_id;
  END IF;

  IF v_items IS NOT NULL THEN
    IF v_order.inventory_state = 'reserved' THEN
      PERFORM inventory_release_order(p_order_id);
    ELSIF v_order.inventory_state = 'fulfilled' THEN
      RAISE EXCEPTION 'Cannot replace items on a fulfilled order — void or return first'
        USING ERRCODE = 'P0001';
    END IF;

    DELETE FROM inventory_order_items WHERE order_id = p_order_id;
    v_item_count := inventory_insert_order_items(p_order_id, v_items);
    v_pricing := inventory_compute_order_pricing(v_items);
  ELSE
    v_item_count := v_order.item_count;
    v_pricing := jsonb_build_object(
      'subtotal', v_order.subtotal,
      'shipping_cost', v_order.shipping_cost,
      'tax', v_order.tax,
      'total', v_order.total
    );
  END IF;

  UPDATE inventory_orders SET
    order_number = COALESCE(NULLIF(trim(payload->>'order_number'), ''), order_number),
    date = COALESCE(NULLIF(payload->>'date', ''), date),
    customer_id = CASE WHEN payload ? 'customer_id' THEN NULLIF(payload->>'customer_id', '') ELSE customer_id END,
    customer_name = COALESCE(NULLIF(trim(payload->>'customer_name'), ''), customer_name),
    category = CASE WHEN payload ? 'category' THEN NULLIF(payload->>'category', '') ELSE category END,
    payment_status = v_payment,
    payment_status_variant = inventory_status_variant(v_payment),
    delivery_status = v_delivery,
    delivery_status_variant = inventory_status_variant(v_delivery),
    carrier_id = CASE WHEN payload ? 'carrier_id' THEN NULLIF(payload->>'carrier_id', '') ELSE carrier_id END,
    subtotal = (v_pricing->>'subtotal')::NUMERIC,
    shipping_cost = (v_pricing->>'shipping_cost')::NUMERIC,
    tax = (v_pricing->>'tax')::NUMERIC,
    total = (v_pricing->>'total')::NUMERIC,
    item_count = v_item_count,
    shipping_priority = COALESCE(NULLIF(payload->>'shipping_priority', ''), shipping_priority),
    delivery_method = COALESCE(NULLIF(payload->>'delivery_method', ''), delivery_method),
    origin_address = CASE WHEN payload ? 'origin_address' THEN NULLIF(payload->>'origin_address', '') ELSE origin_address END,
    destination_address = CASE WHEN payload ? 'destination_address' THEN NULLIF(payload->>'destination_address', '') ELSE destination_address END,
    shipping_label = COALESCE(NULLIF(payload->>'shipping_label', ''), shipping_label),
    shipping_line1 = CASE WHEN payload ? 'shipping_line1' THEN NULLIF(payload->>'shipping_line1', '') ELSE shipping_line1 END,
    shipping_line2 = CASE WHEN payload ? 'shipping_line2' THEN NULLIF(payload->>'shipping_line2', '') ELSE shipping_line2 END,
    current_step = inventory_delivery_step(v_delivery),
    store_id = COALESCE(NULLIF(payload->>'store_id', ''), store_id, inventory_default_store_id())
  WHERE id = p_order_id;

  PERFORM inventory_sync_order_tracking(p_order_id, v_delivery);
  PERFORM inventory_apply_order_inventory(p_order_id, v_delivery, v_warehouse_id);

  v_new_total := (v_pricing->>'total')::NUMERIC;
  IF v_old_delivery <> 'Canceled' AND v_delivery = 'Canceled' THEN
    -- Match inventory_cancel_order: reverse spend for the customer who currently holds it.
    IF v_old_customer_id IS NOT NULL THEN
      PERFORM inventory_apply_customer_spend(v_old_customer_id, -v_old_total, -1);
    END IF;
  ELSIF v_old_delivery <> 'Canceled' AND v_delivery <> 'Canceled' THEN
    IF v_old_customer_id IS DISTINCT FROM v_new_customer_id THEN
      IF v_old_customer_id IS NOT NULL THEN
        PERFORM inventory_apply_customer_spend(v_old_customer_id, -v_old_total, -1);
      END IF;
      IF v_new_customer_id IS NOT NULL THEN
        PERFORM inventory_apply_customer_spend(v_new_customer_id, v_new_total, 1);
      END IF;
    ELSIF v_new_total <> v_old_total AND v_new_customer_id IS NOT NULL THEN
      PERFORM inventory_apply_customer_spend(v_new_customer_id, v_new_total - v_old_total, 0);
    END IF;
  END IF;

  RETURN jsonb_build_object('id', p_order_id, 'delivery_status', v_delivery, 'payment_status', v_payment);
END;
$$;

-- ---------------------------------------------------------------------------
-- Soft cancel (preferred over hard delete)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_cancel_order(
  p_order_id TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order inventory_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF inventory_normalize_delivery_status(v_order.delivery_status) = 'Canceled' THEN
    RETURN jsonb_build_object('id', p_order_id, 'state', 'Canceled', 'already', true);
  END IF;

  -- Cancel is allowed from any non-terminal cancel state (bypasses normal forward-only map).
  IF v_order.inventory_state = 'reserved' THEN
    PERFORM inventory_release_order(p_order_id);
  ELSIF v_order.inventory_state = 'fulfilled' THEN
    PERFORM inventory_restock_fulfilled_order(p_order_id);
  END IF;

  UPDATE inventory_orders SET
    delivery_status = 'Canceled',
    delivery_status_variant = inventory_status_variant('Canceled'),
    payment_status = CASE
      WHEN inventory_normalize_payment_status(v_order.payment_status) IN ('Paid', 'Pending', 'Unpaid', 'Failed')
        THEN 'Cancelled'
      ELSE 'Cancelled'
    END,
    payment_status_variant = inventory_status_variant('Cancelled'),
    canceled_at = now(),
    cancel_reason = NULLIF(p_reason, ''),
    current_step = 1
  WHERE id = p_order_id;

  PERFORM inventory_sync_order_tracking(p_order_id, 'Canceled');

  IF v_order.customer_id IS NOT NULL THEN
    PERFORM inventory_apply_customer_spend(v_order.customer_id, -v_order.total, -1);
  END IF;

  RETURN jsonb_build_object('id', p_order_id, 'state', 'Canceled');
END;
$$;

-- ---------------------------------------------------------------------------
-- Hard delete only when safe (none/released + not paid)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_delete_order(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order inventory_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM inventory_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF inventory_normalize_payment_status(v_order.payment_status) = 'Paid' THEN
    RAISE EXCEPTION 'Cannot hard-delete a paid order — cancel it instead'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.inventory_state = 'fulfilled' THEN
    RAISE EXCEPTION 'Cannot hard-delete a fulfilled order — cancel it instead'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.inventory_state = 'reserved' THEN
    PERFORM inventory_release_order(p_order_id);
  END IF;

  IF v_order.customer_id IS NOT NULL
     AND inventory_normalize_delivery_status(v_order.delivery_status) <> 'Canceled' THEN
    PERFORM inventory_apply_customer_spend(v_order.customer_id, -v_order.total, -1);
  END IF;

  DELETE FROM inventory_orders WHERE id = p_order_id;
  RETURN jsonb_build_object('id', p_order_id, 'deleted', true);
END;
$$;

CREATE OR REPLACE FUNCTION inventory_update_order_status(
  p_order_id TEXT,
  p_payment_status TEXT,
  p_delivery_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB := jsonb_build_object('payment_status', p_payment_status);
BEGIN
  IF p_delivery_status IS NOT NULL AND length(trim(p_delivery_status)) > 0 THEN
    v_payload := v_payload || jsonb_build_object('delivery_status', p_delivery_status);
  END IF;
  RETURN inventory_update_order(p_order_id, v_payload);
END;
$$;

-- Tighten reserve: always require product_id (already does) and qty >= 1
CREATE OR REPLACE FUNCTION inventory_reserve_order(p_order_id TEXT, p_warehouse_id TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order inventory_orders%ROWTYPE;
  v_item inventory_order_items%ROWTYPE;
  v_warehouse_id TEXT;
  v_count INTEGER := 0;
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

  SELECT COUNT(*) INTO v_count FROM inventory_order_items WHERE order_id = p_order_id;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Order requires at least one line item'
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
    IF COALESCE(v_item.quantity, 0) < 1 THEN
      RAISE EXCEPTION 'Quantity must be at least 1'
        USING ERRCODE = 'P0001';
    END IF;
    PERFORM inventory_reserve_warehouse_qty(
      v_warehouse_id, v_item.product_id, v_item.quantity, 'order', p_order_id
    );
    UPDATE inventory_order_items
    SET warehouse_id = v_warehouse_id, reserved = v_item.quantity
    WHERE id = v_item.id;
  END LOOP;

  UPDATE inventory_orders SET inventory_state = 'reserved' WHERE id = p_order_id;
  RETURN jsonb_build_object('id', p_order_id, 'state', 'reserved', 'warehouse_id', v_warehouse_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants + revoke direct table writes (mutations go through SECURITY DEFINER RPCs)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION inventory_create_order(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION inventory_update_order(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION inventory_cancel_order(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION inventory_delete_order(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION inventory_update_order_status(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION inventory_restock_fulfilled_order(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION inventory_create_order(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_update_order(TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_cancel_order(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_delete_order(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_update_order_status(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_restock_fulfilled_order(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_normalize_payment_status(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_normalize_delivery_status(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_compute_order_pricing(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_reserve_order(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_release_order(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION inventory_fulfill_order(TEXT) TO anon, authenticated, service_role;

-- Force order mutations through RPCs while keeping SELECT for list/detail UI.
REVOKE INSERT, UPDATE, DELETE ON inventory_orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON inventory_order_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON inventory_order_tracking_events FROM anon, authenticated;
GRANT SELECT ON inventory_orders TO anon, authenticated;
GRANT SELECT ON inventory_order_items TO anon, authenticated;
GRANT SELECT ON inventory_order_tracking_events TO anon, authenticated;

-- Security note (when cashier/staff auth lands):
--   REVOKE EXECUTE ON FUNCTION inventory_create_order(JSONB) FROM anon;
--   REVOKE EXECUTE ON FUNCTION inventory_update_order(TEXT, JSONB) FROM anon;
--   REVOKE EXECUTE ON FUNCTION inventory_cancel_order(TEXT, TEXT) FROM anon;
--   REVOKE EXECUTE ON FUNCTION inventory_delete_order(TEXT) FROM anon;
-- Role checks (read vs create vs cancel vs void) belong in those authenticated policies.
