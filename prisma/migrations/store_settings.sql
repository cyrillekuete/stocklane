-- Singleton store settings for the inventory module

CREATE OR REPLACE FUNCTION inventory_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS inventory_store_settings (
  id TEXT PRIMARY KEY,
  store_name TEXT NOT NULL,
  store_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Live',
  established_at TIMESTAMPTZ NOT NULL,
  logo TEXT,
  store_url TEXT,
  phone TEXT,
  contact_email TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  automatic_time_zone BOOLEAN NOT NULL DEFAULT true,
  time_zone TEXT NOT NULL DEFAULT 'GMT +01:00',
  language TEXT NOT NULL DEFAULT 'en-us',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  ai_semantic_search BOOLEAN NOT NULL DEFAULT false,
  ai_insight BOOLEAN NOT NULL DEFAULT true,
  contact_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  currency TEXT NOT NULL DEFAULT 'EUR',
  card_methods TEXT[] NOT NULL DEFAULT '{}',
  apple_pay BOOLEAN NOT NULL DEFAULT true,
  google_pay BOOLEAN NOT NULL DEFAULT false,
  paypal BOOLEAN NOT NULL DEFAULT false,
  tax_rate_scope TEXT NOT NULL DEFAULT 'country',
  tax_calculation TEXT NOT NULL DEFAULT 'inclusive',
  automatic_invoice BOOLEAN NOT NULL DEFAULT false,
  no_reply_email TEXT,
  guest_checkout BOOLEAN NOT NULL DEFAULT true,
  collect_phone BOOLEAN NOT NULL DEFAULT true,
  order_notes BOOLEAN NOT NULL DEFAULT true,
  terms_required BOOLEAN NOT NULL DEFAULT true,
  abandoned_cart_email BOOLEAN NOT NULL DEFAULT true,
  default_checkout_country TEXT NOT NULL DEFAULT 'FR',
  free_shipping_enabled BOOLEAN NOT NULL DEFAULT true,
  free_shipping_min NUMERIC(12, 2) NOT NULL DEFAULT 0,
  local_pickup BOOLEAN NOT NULL DEFAULT true,
  express_shipping BOOLEAN NOT NULL DEFAULT false,
  shipping_origin TEXT,
  default_carrier TEXT,
  handling_days INTEGER NOT NULL DEFAULT 1,
  shipping_zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  two_factor_required BOOLEAN NOT NULL DEFAULT false,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  login_alerts BOOLEAN NOT NULL DEFAULT true,
  password_min_length INTEGER NOT NULL DEFAULT 8,
  require_strong_password BOOLEAN NOT NULL DEFAULT true,
  email_order_confirm BOOLEAN NOT NULL DEFAULT true,
  email_shipping_updates BOOLEAN NOT NULL DEFAULT true,
  email_low_stock BOOLEAN NOT NULL DEFAULT true,
  email_new_customer BOOLEAN NOT NULL DEFAULT false,
  sms_order_updates BOOLEAN NOT NULL DEFAULT false,
  notify_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS inventory_store_settings_updated_at ON inventory_store_settings;
CREATE TRIGGER inventory_store_settings_updated_at
  BEFORE UPDATE ON inventory_store_settings
  FOR EACH ROW
  EXECUTE FUNCTION inventory_set_updated_at();

ALTER TABLE inventory_store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_store_settings_anon_all ON inventory_store_settings;
CREATE POLICY inventory_store_settings_anon_all
  ON inventory_store_settings FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_store_settings_authenticated_all ON inventory_store_settings;
CREATE POLICY inventory_store_settings_authenticated_all
  ON inventory_store_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT ALL ON inventory_store_settings TO anon, authenticated;
