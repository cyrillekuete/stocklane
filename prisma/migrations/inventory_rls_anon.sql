-- Permissive demo policies so the Vite anon client can read/write inventory tables.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_categories',
    'inventory_suppliers',
    'inventory_warehouses',
    'inventory_carriers',
    'inventory_brands',
    'inventory_products',
    'inventory_product_variants',
    'inventory_product_options',
    'inventory_product_option_values',
    'inventory_stock_levels',
    'inventory_inbound_shipments',
    'inventory_outbound_shipments',
    'inventory_customers',
    'inventory_orders',
    'inventory_order_items',
    'inventory_order_tracking_events',
    'inventory_store_settings',
    'inventory_warehouse_stock',
    'inventory_pos_sales',
    'inventory_pos_sale_items',
    'inventory_customer_account_transactions'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)',
      t || '_anon_all',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all',
      t
    );
  END LOOP;
END;
$$;
