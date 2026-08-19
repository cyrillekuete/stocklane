-- Inventory module tables (prefixed to coexist with existing public schema)

CREATE OR REPLACE FUNCTION inventory_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  featured BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_categories_status_idx ON inventory_categories (status);

CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_carriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT,
  description TEXT,
  barcode TEXT,
  image TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Live',
  featured BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  category_id TEXT REFERENCES inventory_categories(id) ON DELETE SET NULL,
  brand_id TEXT REFERENCES inventory_brands(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_products_status_idx ON inventory_products (status);
CREATE INDEX IF NOT EXISTS inventory_products_category_id_idx ON inventory_products (category_id);
CREATE INDEX IF NOT EXISTS inventory_products_supplier_id_idx ON inventory_products (supplier_id);

CREATE TABLE IF NOT EXISTS inventory_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  on_hand INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_product_variants_product_id_idx ON inventory_product_variants (product_id);

CREATE TABLE IF NOT EXISTS inventory_product_options (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_product_options_product_id_idx ON inventory_product_options (product_id);

CREATE TABLE IF NOT EXISTS inventory_product_option_values (
  id TEXT PRIMARY KEY,
  option_id TEXT NOT NULL REFERENCES inventory_product_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_product_option_values_option_id_idx ON inventory_product_option_values (option_id);

CREATE TABLE IF NOT EXISTS inventory_stock_levels (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE REFERENCES inventory_products(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 0,
  inbound_qty INTEGER NOT NULL DEFAULT 0,
  outbound_qty INTEGER NOT NULL DEFAULT 0,
  delta_label TEXT NOT NULL DEFAULT '0',
  delta_variant TEXT NOT NULL DEFAULT 'secondary',
  total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_moved TEXT,
  handler TEXT,
  trend_label TEXT NOT NULL DEFAULT 'Steady',
  trend_variant TEXT NOT NULL DEFAULT 'secondary',
  flow_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reorder_qty INTEGER NOT NULL DEFAULT 0,
  reorder_in_days INTEGER NOT NULL DEFAULT 0,
  reorder_date TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 0,
  lead_time_date TEXT,
  auto_reorder BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_inbound_shipments (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  carrier_id TEXT REFERENCES inventory_carriers(id) ON DELETE SET NULL,
  order_date TEXT NOT NULL,
  qty INTEGER NOT NULL,
  stock_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  status_variant TEXT NOT NULL DEFAULT 'secondary',
  arrival_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_inbound_shipments_product_id_idx ON inventory_inbound_shipments (product_id);
CREATE INDEX IF NOT EXISTS inventory_inbound_shipments_status_idx ON inventory_inbound_shipments (status);

CREATE TABLE IF NOT EXISTS inventory_outbound_shipments (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  warehouse_id TEXT REFERENCES inventory_warehouses(id) ON DELETE SET NULL,
  carrier_id TEXT REFERENCES inventory_carriers(id) ON DELETE SET NULL,
  order_ref TEXT NOT NULL,
  qty INTEGER NOT NULL,
  status TEXT NOT NULL,
  status_variant TEXT NOT NULL DEFAULT 'secondary',
  expected_delivery TEXT NOT NULL,
  notify BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_outbound_shipments_product_id_idx ON inventory_outbound_shipments (product_id);
CREATE INDEX IF NOT EXISTS inventory_outbound_shipments_status_idx ON inventory_outbound_shipments (status);

CREATE TABLE IF NOT EXISTS inventory_customers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  image TEXT,
  location_name TEXT,
  location_flag TEXT,
  status_color TEXT NOT NULL DEFAULT 'offline',
  verified BOOLEAN NOT NULL DEFAULT false,
  order_count TEXT NOT NULL DEFAULT '0',
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  avg_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_customers_status_idx ON inventory_customers (status);

CREATE TABLE IF NOT EXISTS inventory_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  customer_id TEXT REFERENCES inventory_customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'Pending',
  delivery_status_variant TEXT NOT NULL DEFAULT 'secondary',
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  payment_status_variant TEXT NOT NULL DEFAULT 'secondary',
  carrier_id TEXT REFERENCES inventory_carriers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  shipment_number TEXT,
  tracking_number TEXT,
  shipping_priority TEXT,
  delivery_method TEXT,
  current_step INTEGER NOT NULL DEFAULT 1,
  origin_address TEXT,
  destination_address TEXT,
  shipping_label TEXT,
  shipping_line1 TEXT,
  shipping_line2 TEXT,
  total_time TEXT,
  departure_time TEXT,
  expected_arrival TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_orders_customer_id_idx ON inventory_orders (customer_id);

CREATE TABLE IF NOT EXISTS inventory_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES inventory_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES inventory_products(id) ON DELETE SET NULL,
  category TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  color TEXT,
  weight TEXT,
  trend_label TEXT,
  trend_variant TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  threshold_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_order_items_order_id_idx ON inventory_order_items (order_id);
CREATE INDEX IF NOT EXISTS inventory_order_items_product_id_idx ON inventory_order_items (product_id);

CREATE TABLE IF NOT EXISTS inventory_order_tracking_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES inventory_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_order_tracking_events_order_id_idx ON inventory_order_tracking_events (order_id);
