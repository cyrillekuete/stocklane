-- Products edge-case hardening: soft delete, transactional create/replace,
-- price/variant constraints, storage bucket for product images.

-- ---------------------------------------------------------------------------
-- Soft delete + partial unique SKU/barcode
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS inventory_products_deleted_at_idx
  ON inventory_products (deleted_at);

-- Drop global unique on sku (constraint name may vary)
DO $$
DECLARE
  v_con TEXT;
BEGIN
  SELECT c.conname INTO v_con
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'inventory_products'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) ILIKE '%(sku)%'
  LIMIT 1;

  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE inventory_products DROP CONSTRAINT %I', v_con);
  END IF;

  -- Also drop unique index on sku if present (created via UNIQUE column)
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'inventory_products'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(sku)%'
      AND indexname NOT ILIKE '%deleted%'
  ) THEN
    FOR v_con IN
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'inventory_products'
        AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%(sku)%'
        AND indexname NOT ILIKE '%deleted%'
    LOOP
      EXECUTE format('DROP INDEX IF EXISTS %I', v_con);
    END LOOP;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_products_sku_active_uidx
  ON inventory_products (sku)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_products_barcode_active_uidx
  ON inventory_products (barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Price / variant constraints
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_products
  DROP CONSTRAINT IF EXISTS inventory_products_price_nonneg;
ALTER TABLE inventory_products
  ADD CONSTRAINT inventory_products_price_nonneg CHECK (price >= 0);

ALTER TABLE inventory_product_variants
  DROP CONSTRAINT IF EXISTS inventory_product_variants_price_nonneg;
ALTER TABLE inventory_product_variants
  ADD CONSTRAINT inventory_product_variants_price_nonneg CHECK (price >= 0);

ALTER TABLE inventory_product_variants
  DROP CONSTRAINT IF EXISTS inventory_product_variants_on_hand_nonneg;
ALTER TABLE inventory_product_variants
  ADD CONSTRAINT inventory_product_variants_on_hand_nonneg CHECK (on_hand >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_product_variants_size_color_uidx
  ON inventory_product_variants (product_id, size, color);

-- ---------------------------------------------------------------------------
-- Soft / hard delete helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_soft_delete_product(p_product_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN
    RAISE EXCEPTION 'Product id is required'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE inventory_products
  SET deleted_at = now(),
      status = 'Archived',
      updated_at = now()
  WHERE id = p_product_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or already deleted'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('id', p_product_id, 'deleted_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION inventory_restore_product(p_product_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN
    RAISE EXCEPTION 'Product id is required'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE inventory_products
  SET deleted_at = NULL,
      status = 'Draft',
      updated_at = now()
  WHERE id = p_product_id
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or not deleted'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('id', p_product_id, 'status', 'Draft');
END;
$$;

CREATE OR REPLACE FUNCTION inventory_product_delete_impact(p_product_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sku TEXT;
  v_name TEXT;
  v_deleted_at TIMESTAMPTZ;
  v_warehouse INTEGER;
  v_inbound INTEGER;
  v_outbound INTEGER;
  v_orders INTEGER;
  v_pos INTEGER;
  v_movements INTEGER;
  v_can_hard_delete BOOLEAN;
BEGIN
  SELECT sku, name, deleted_at INTO v_sku, v_name, v_deleted_at
  FROM inventory_products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_warehouse
  FROM inventory_warehouse_stock
  WHERE product_id = p_product_id
    AND (qty <> 0 OR COALESCE(reserved, 0) <> 0);

  SELECT COUNT(*)::INTEGER INTO v_inbound
  FROM inventory_inbound_shipments WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_outbound
  FROM inventory_outbound_shipments WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_orders
  FROM inventory_order_items WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_pos
  FROM inventory_pos_sale_items WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_movements
  FROM inventory_stock_movements
  WHERE product_id = p_product_id
    AND (delta <> 0 OR COALESCE(reserved_delta, 0) <> 0);

  -- Variants/options and empty stock rows cascade. History / on-hand stock must block.
  v_can_hard_delete :=
    v_deleted_at IS NOT NULL
    AND v_warehouse = 0
    AND v_inbound = 0
    AND v_outbound = 0
    AND v_orders = 0
    AND v_pos = 0
    AND v_movements = 0;

  RETURN jsonb_build_object(
    'id', p_product_id,
    'sku', v_sku,
    'name', v_name,
    'deleted_at', v_deleted_at,
    'variants', (SELECT COUNT(*)::INTEGER FROM inventory_product_variants WHERE product_id = p_product_id),
    'options', (SELECT COUNT(*)::INTEGER FROM inventory_product_options WHERE product_id = p_product_id),
    'warehouse_stock', (SELECT COUNT(*)::INTEGER FROM inventory_warehouse_stock WHERE product_id = p_product_id),
    'inbound_shipments', v_inbound,
    'outbound_shipments', v_outbound,
    'order_items', v_orders,
    'pos_sale_items', v_pos,
    'stock_movements', (SELECT COUNT(*)::INTEGER FROM inventory_stock_movements WHERE product_id = p_product_id),
    'can_hard_delete', v_can_hard_delete
  );
END;
$$;

CREATE OR REPLACE FUNCTION inventory_hard_delete_product(p_product_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
  v_warehouse INTEGER;
  v_inbound INTEGER;
  v_outbound INTEGER;
  v_orders INTEGER;
  v_pos INTEGER;
  v_movements INTEGER;
BEGIN
  IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN
    RAISE EXCEPTION 'Product id is required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT deleted_at INTO v_deleted_at
  FROM inventory_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Soft-delete the product before permanently deleting it'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_warehouse
  FROM inventory_warehouse_stock
  WHERE product_id = p_product_id
    AND (qty <> 0 OR COALESCE(reserved, 0) <> 0);

  SELECT COUNT(*)::INTEGER INTO v_inbound
  FROM inventory_inbound_shipments WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_outbound
  FROM inventory_outbound_shipments WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_orders
  FROM inventory_order_items WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_pos
  FROM inventory_pos_sale_items WHERE product_id = p_product_id;

  SELECT COUNT(*)::INTEGER INTO v_movements
  FROM inventory_stock_movements
  WHERE product_id = p_product_id
    AND (delta <> 0 OR COALESCE(reserved_delta, 0) <> 0);

  IF v_warehouse > 0 OR v_inbound > 0 OR v_outbound > 0
     OR v_orders > 0 OR v_pos > 0 OR v_movements > 0 THEN
    RAISE EXCEPTION 'Product has stock, shipments, sales, or movement history and cannot be permanently deleted'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM inventory_products WHERE id = p_product_id;
  RETURN jsonb_build_object('id', p_product_id, 'hard_deleted', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Transactional create product
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_create_product(payload JSONB)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_sku TEXT;
  v_name TEXT;
  v_price NUMERIC(12, 2);
  v_warehouse_id TEXT;
  v_variant JSONB;
  v_on_hand INTEGER;
  v_variant_price NUMERIC(12, 2);
BEGIN
  v_id := COALESCE(NULLIF(payload->>'id', ''), gen_random_uuid()::TEXT);
  v_sku := NULLIF(btrim(COALESCE(payload->>'sku', '')), '');
  v_name := NULLIF(btrim(COALESCE(payload->>'name', '')), '');
  v_price := COALESCE((payload->>'price')::NUMERIC, 0);
  v_warehouse_id := NULLIF(payload->>'warehouse_id', '');

  IF v_name IS NULL OR v_sku IS NULL THEN
    RAISE EXCEPTION 'Product name and SKU are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_price < 0 THEN
    RAISE EXCEPTION 'Price cannot be negative'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_warehouse_id IS NULL THEN
    v_warehouse_id := inventory_default_warehouse_id();
  END IF;

  INSERT INTO inventory_products (
    id, sku, name, full_name, description, barcode, image, price, status,
    featured, tags, category_id, brand_id
  ) VALUES (
    v_id,
    v_sku,
    v_name,
    COALESCE(NULLIF(payload->>'full_name', ''), v_name),
    NULLIF(payload->>'description', ''),
    NULLIF(payload->>'barcode', ''),
    COALESCE(NULLIF(payload->>'image', ''), '11.png'),
    v_price,
    COALESCE(NULLIF(payload->>'status', ''), 'Live'),
    COALESCE((payload->>'featured')::BOOLEAN, false),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(payload->'tags', '[]'::JSONB))),
      ARRAY[]::TEXT[]
    ),
    NULLIF(payload->>'category_id', ''),
    NULLIF(payload->>'brand_id', '')
  );

  INSERT INTO inventory_stock_levels (id, product_id)
  VALUES (gen_random_uuid()::TEXT, v_id);

  IF v_warehouse_id IS NOT NULL THEN
    PERFORM inventory_set_warehouse_qty(v_warehouse_id, v_id, 0, NULL, 'product_create');
  END IF;

  IF payload ? 'variants' AND jsonb_typeof(payload->'variants') = 'array' THEN
    FOR v_variant IN SELECT * FROM jsonb_array_elements(payload->'variants')
    LOOP
      v_on_hand := GREATEST(COALESCE((v_variant->>'on_hand')::INTEGER, 0), 0);
      v_variant_price := COALESCE((v_variant->>'price')::NUMERIC, 0);
      IF v_variant_price < 0 THEN
        RAISE EXCEPTION 'Variant price cannot be negative'
          USING ERRCODE = 'P0001';
      END IF;

      INSERT INTO inventory_product_variants (
        id, product_id, size, color, on_hand, price, available
      ) VALUES (
        COALESCE(NULLIF(v_variant->>'id', ''), gen_random_uuid()::TEXT),
        v_id,
        COALESCE(v_variant->>'size', ''),
        COALESCE(v_variant->>'color', ''),
        v_on_hand,
        v_variant_price,
        COALESCE((v_variant->>'available')::BOOLEAN, true)
      );
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Transactional replace variants / options
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_replace_product_variants(
  p_product_id TEXT,
  p_variants JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_variant JSONB;
  v_on_hand INTEGER;
  v_price NUMERIC(12, 2);
BEGIN
  IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN
    RAISE EXCEPTION 'Product id is required'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM inventory_products WHERE id = p_product_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Product not found'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM inventory_product_variants WHERE product_id = p_product_id;

  IF p_variants IS NULL OR jsonb_typeof(p_variants) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    v_on_hand := GREATEST(COALESCE((v_variant->>'on_hand')::INTEGER, 0), 0);
    v_price := COALESCE((v_variant->>'price')::NUMERIC, 0);
    IF v_price < 0 THEN
      RAISE EXCEPTION 'Variant price cannot be negative'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_product_variants (
      id, product_id, size, color, on_hand, price, available
    ) VALUES (
      COALESCE(NULLIF(v_variant->>'id', ''), gen_random_uuid()::TEXT),
      p_product_id,
      COALESCE(v_variant->>'size', ''),
      COALESCE(v_variant->>'color', ''),
      v_on_hand,
      v_price,
      COALESCE((v_variant->>'available')::BOOLEAN, true)
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_replace_product_options(
  p_product_id TEXT,
  p_options JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_option JSONB;
  v_option_id TEXT;
  v_index INTEGER := 0;
  v_value JSONB;
  v_value_index INTEGER;
BEGIN
  IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN
    RAISE EXCEPTION 'Product id is required'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM inventory_products WHERE id = p_product_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Product not found'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM inventory_product_options WHERE product_id = p_product_id;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
  LOOP
    v_option_id := COALESCE(NULLIF(v_option->>'id', ''), gen_random_uuid()::TEXT);
    INSERT INTO inventory_product_options (id, product_id, name, sort_order)
    VALUES (
      v_option_id,
      p_product_id,
      COALESCE(v_option->>'name', ''),
      v_index
    );

    v_value_index := 0;
    IF v_option ? 'values' AND jsonb_typeof(v_option->'values') = 'array' THEN
      FOR v_value IN SELECT * FROM jsonb_array_elements(v_option->'values')
      LOOP
        INSERT INTO inventory_product_option_values (id, option_id, value, sort_order)
        VALUES (
          COALESCE(NULLIF(v_value->>'id', ''), gen_random_uuid()::TEXT),
          v_option_id,
          COALESCE(v_value->>'value', ''),
          v_value_index
        );
        v_value_index := v_value_index + 1;
      END LOOP;
    END IF;

    v_index := v_index + 1;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Product image storage bucket (public read; anon/authenticated write)
-- Skipped gracefully if storage schema is unavailable.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'storage.buckets not found; skip product-images bucket setup';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'product-images',
    'product-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS product_images_public_read ON storage.objects;
  CREATE POLICY product_images_public_read
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'product-images');

  DROP POLICY IF EXISTS product_images_anon_insert ON storage.objects;
  CREATE POLICY product_images_anon_insert
    ON storage.objects FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'product-images');

  DROP POLICY IF EXISTS product_images_anon_update ON storage.objects;
  CREATE POLICY product_images_anon_update
    ON storage.objects FOR UPDATE TO anon, authenticated
    USING (bucket_id = 'product-images')
    WITH CHECK (bucket_id = 'product-images');

  DROP POLICY IF EXISTS product_images_anon_delete ON storage.objects;
  CREATE POLICY product_images_anon_delete
    ON storage.objects FOR DELETE TO anon, authenticated
    USING (bucket_id = 'product-images');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'product-images storage setup skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION inventory_soft_delete_product(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_restore_product(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_product_delete_impact(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_hard_delete_product(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_create_product(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_replace_product_variants(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION inventory_replace_product_options(TEXT, JSONB) TO anon, authenticated;
