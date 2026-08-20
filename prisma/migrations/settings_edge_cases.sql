-- Settings edge-case hardening: range CHECKs, currency lock, singleton upsert RPC.
--
-- Security note (same posture as POS): inventory_store_settings still has open
-- anon ALL via inventory_rls_anon.sql / store_settings.sql. When settings is
-- gated behind Supabase Auth:
--   REVOKE EXECUTE ON FUNCTION inventory_upsert_store_settings(JSONB) FROM anon;
-- Then tighten table policies away from USING (true).

-- ---------------------------------------------------------------------------
-- Backfill / normalize before CHECKs
-- ---------------------------------------------------------------------------

UPDATE inventory_store_settings
SET
  store_name = COALESCE(NULLIF(btrim(store_name), ''), 'Store'),
  store_code = COALESCE(NULLIF(btrim(store_code), ''), 'STORE-DEFAULT'),
  currency = 'XAF',
  tax_percent = LEAST(GREATEST(COALESCE(tax_percent, 0), 0), 100),
  tax_calculation = CASE
    WHEN lower(COALESCE(tax_calculation, '')) IN ('inclusive', 'exclusive')
      THEN lower(tax_calculation)
    ELSE 'inclusive'
  END,
  tax_rate_scope = CASE
    WHEN lower(COALESCE(tax_rate_scope, '')) IN ('country', 'state', 'city')
      THEN lower(tax_rate_scope)
    ELSE 'country'
  END,
  free_shipping_min = GREATEST(COALESCE(free_shipping_min, 0), 0),
  handling_days = GREATEST(COALESCE(handling_days, 0), 0),
  session_timeout_minutes = LEAST(GREATEST(COALESCE(session_timeout_minutes, 30), 5), 1440),
  password_min_length = LEAST(GREATEST(COALESCE(password_min_length, 8), 6), 128);

-- ---------------------------------------------------------------------------
-- CHECK constraints
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_store_name_not_blank;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_store_name_not_blank
  CHECK (length(btrim(store_name)) > 0);

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_store_code_not_blank;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_store_code_not_blank
  CHECK (length(btrim(store_code)) > 0);

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_currency_xaf;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_currency_xaf
  CHECK (currency = 'XAF');

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_tax_percent_range;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_tax_percent_range
  CHECK (tax_percent >= 0 AND tax_percent <= 100);

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_tax_calculation_enum;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_tax_calculation_enum
  CHECK (tax_calculation IN ('inclusive', 'exclusive'));

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_tax_rate_scope_enum;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_tax_rate_scope_enum
  CHECK (tax_rate_scope IN ('country', 'state', 'city'));

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_free_shipping_min_nonneg;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_free_shipping_min_nonneg
  CHECK (free_shipping_min >= 0);

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_handling_days_nonneg;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_handling_days_nonneg
  CHECK (handling_days >= 0);

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_session_timeout_range;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_session_timeout_range
  CHECK (session_timeout_minutes BETWEEN 5 AND 1440);

ALTER TABLE inventory_store_settings
  DROP CONSTRAINT IF EXISTS inventory_store_settings_password_min_length_range;
ALTER TABLE inventory_store_settings
  ADD CONSTRAINT inventory_store_settings_password_min_length_range
  CHECK (password_min_length BETWEEN 6 AND 128);

-- ---------------------------------------------------------------------------
-- Singleton upsert RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION inventory_upsert_store_settings(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT := 'settings_default';
  v_store_name TEXT;
  v_store_code TEXT;
  v_status TEXT;
  v_established_at TIMESTAMPTZ;
  v_logo TEXT;
  v_store_url TEXT;
  v_phone TEXT;
  v_contact_email TEXT;
  v_tags TEXT[];
  v_automatic_time_zone BOOLEAN;
  v_time_zone TEXT;
  v_language TEXT;
  v_date_format TEXT;
  v_ai_semantic_search BOOLEAN;
  v_ai_insight BOOLEAN;
  v_contact_channels JSONB;
  v_card_methods TEXT[];
  v_apple_pay BOOLEAN;
  v_google_pay BOOLEAN;
  v_paypal BOOLEAN;
  v_tax_rate_scope TEXT;
  v_tax_calculation TEXT;
  v_tax_percent NUMERIC(5, 2);
  v_automatic_invoice BOOLEAN;
  v_no_reply_email TEXT;
  v_guest_checkout BOOLEAN;
  v_collect_phone BOOLEAN;
  v_order_notes BOOLEAN;
  v_terms_required BOOLEAN;
  v_abandoned_cart_email BOOLEAN;
  v_default_checkout_country TEXT;
  v_free_shipping_enabled BOOLEAN;
  v_free_shipping_min NUMERIC(12, 2);
  v_local_pickup BOOLEAN;
  v_express_shipping BOOLEAN;
  v_shipping_origin TEXT;
  v_default_carrier TEXT;
  v_handling_days INTEGER;
  v_shipping_zones JSONB;
  v_locations JSONB;
  v_two_factor_required BOOLEAN;
  v_session_timeout_minutes INTEGER;
  v_login_alerts BOOLEAN;
  v_password_min_length INTEGER;
  v_require_strong_password BOOLEAN;
  v_email_order_confirm BOOLEAN;
  v_email_shipping_updates BOOLEAN;
  v_email_low_stock BOOLEAN;
  v_email_new_customer BOOLEAN;
  v_sms_order_updates BOOLEAN;
  v_notify_email TEXT;
  v_existing RECORD;
  v_result JSONB;
  v_loc JSONB;
  v_zone JSONB;
  v_locs JSONB := '[]'::jsonb;
  v_zones JSONB := '[]'::jsonb;
  v_channels JSONB := '[]'::jsonb;
  v_ch JSONB;
  v_seen_providers TEXT[] := '{}';
  v_default_count INTEGER := 0;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Settings payload is required'
      USING ERRCODE = 'P0001';
  END IF;

  -- Preserve existing row values when keys are omitted (seed / partial).
  SELECT * INTO v_existing
  FROM inventory_store_settings
  WHERE id = v_id
  FOR UPDATE;

  v_store_name := CASE
    WHEN payload ? 'store_name' THEN NULLIF(btrim(payload->>'store_name'), '')
    ELSE NULLIF(btrim(COALESCE(v_existing.store_name, '')), '')
  END;
  IF v_store_name IS NULL OR v_store_name = '' THEN
    RAISE EXCEPTION 'Store name is required'
      USING ERRCODE = 'P0001';
  END IF;

  v_store_code := CASE
    WHEN payload ? 'store_code' THEN NULLIF(btrim(payload->>'store_code'), '')
    ELSE NULLIF(btrim(COALESCE(v_existing.store_code, '')), '')
  END;
  v_store_code := COALESCE(v_store_code, 'STORE-DEFAULT');
  IF length(btrim(v_store_code)) = 0 THEN
    RAISE EXCEPTION 'Store code is required'
      USING ERRCODE = 'P0001';
  END IF;

  v_status := COALESCE(NULLIF(btrim(payload->>'status'), ''), v_existing.status, 'Live');
  v_established_at := COALESCE(
    NULLIF(payload->>'established_at', '')::TIMESTAMPTZ,
    v_existing.established_at,
    now()
  );

  v_logo := CASE
    WHEN payload ? 'logo' THEN NULLIF(payload->>'logo', '')
    ELSE v_existing.logo
  END;
  IF v_logo IS NOT NULL AND length(v_logo) > 700000 THEN
    RAISE EXCEPTION 'Logo is too large (max ~500KB)'
      USING ERRCODE = 'P0001';
  END IF;

  v_store_url := CASE WHEN payload ? 'store_url' THEN NULLIF(btrim(payload->>'store_url'), '') ELSE v_existing.store_url END;
  v_phone := CASE WHEN payload ? 'phone' THEN NULLIF(btrim(payload->>'phone'), '') ELSE v_existing.phone END;
  v_contact_email := CASE WHEN payload ? 'contact_email' THEN NULLIF(btrim(payload->>'contact_email'), '') ELSE v_existing.contact_email END;

  IF payload ? 'tags' THEN
    SELECT COALESCE(array_agg(x), '{}')
    INTO v_tags
    FROM jsonb_array_elements_text(COALESCE(payload->'tags', '[]'::jsonb)) AS t(x);
  ELSE
    v_tags := COALESCE(v_existing.tags, '{}');
  END IF;

  v_automatic_time_zone := COALESCE((payload->>'automatic_time_zone')::BOOLEAN, v_existing.automatic_time_zone, true);
  v_time_zone := COALESCE(NULLIF(btrim(payload->>'time_zone'), ''), v_existing.time_zone, 'GMT +01:00');
  v_language := COALESCE(NULLIF(btrim(payload->>'language'), ''), v_existing.language, 'en-us');
  v_date_format := COALESCE(NULLIF(btrim(payload->>'date_format'), ''), v_existing.date_format, 'DD/MM/YYYY');
  v_ai_semantic_search := COALESCE((payload->>'ai_semantic_search')::BOOLEAN, v_existing.ai_semantic_search, false);
  v_ai_insight := COALESCE((payload->>'ai_insight')::BOOLEAN, v_existing.ai_insight, true);

  -- Contact channels: drop empties, dedupe by provider (keep first).
  IF payload ? 'contact_channels' AND jsonb_typeof(payload->'contact_channels') = 'array' THEN
    FOR v_ch IN SELECT value FROM jsonb_array_elements(payload->'contact_channels')
    LOOP
      IF COALESCE(btrim(v_ch->>'provider'), '') = '' THEN
        CONTINUE;
      END IF;
      IF EXISTS (
        SELECT 1 FROM unnest(v_seen_providers) AS p(provider)
        WHERE lower(p.provider) = lower(v_ch->>'provider')
      ) THEN
        CONTINUE;
      END IF;
      v_seen_providers := array_append(v_seen_providers, v_ch->>'provider');
      v_channels := v_channels || jsonb_build_array(jsonb_build_object(
        'provider', btrim(v_ch->>'provider'),
        'handle', COALESCE(btrim(v_ch->>'handle'), '')
      ));
    END LOOP;
  ELSE
    v_channels := COALESCE(v_existing.contact_channels, '[]'::jsonb);
  END IF;

  IF payload ? 'card_methods' THEN
    SELECT COALESCE(array_agg(x), '{}')
    INTO v_card_methods
    FROM jsonb_array_elements_text(COALESCE(payload->'card_methods', '[]'::jsonb)) AS t(x);
  ELSE
    v_card_methods := COALESCE(v_existing.card_methods, '{}');
  END IF;

  v_apple_pay := COALESCE((payload->>'apple_pay')::BOOLEAN, v_existing.apple_pay, true);
  v_google_pay := COALESCE((payload->>'google_pay')::BOOLEAN, v_existing.google_pay, false);
  v_paypal := COALESCE((payload->>'paypal')::BOOLEAN, v_existing.paypal, false);

  v_tax_rate_scope := lower(COALESCE(NULLIF(btrim(payload->>'tax_rate_scope'), ''), v_existing.tax_rate_scope, 'country'));
  IF v_tax_rate_scope NOT IN ('country', 'state', 'city') THEN
    RAISE EXCEPTION 'Tax rate scope must be country, state, or city'
      USING ERRCODE = 'P0001';
  END IF;

  v_tax_calculation := lower(COALESCE(NULLIF(btrim(payload->>'tax_calculation'), ''), v_existing.tax_calculation, 'inclusive'));
  IF v_tax_calculation NOT IN ('inclusive', 'exclusive') THEN
    RAISE EXCEPTION 'Tax calculation must be inclusive or exclusive'
      USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    v_tax_percent := COALESCE((payload->>'tax_percent')::NUMERIC, v_existing.tax_percent, 20);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Tax percent must be a number between 0 and 100'
      USING ERRCODE = 'P0001';
  END;
  IF v_tax_percent < 0 OR v_tax_percent > 100 THEN
    RAISE EXCEPTION 'Tax percent must be between 0 and 100'
      USING ERRCODE = 'P0001';
  END IF;

  v_automatic_invoice := COALESCE((payload->>'automatic_invoice')::BOOLEAN, v_existing.automatic_invoice, false);
  v_no_reply_email := CASE WHEN payload ? 'no_reply_email' THEN NULLIF(btrim(payload->>'no_reply_email'), '') ELSE v_existing.no_reply_email END;
  v_guest_checkout := COALESCE((payload->>'guest_checkout')::BOOLEAN, v_existing.guest_checkout, true);
  v_collect_phone := COALESCE((payload->>'collect_phone')::BOOLEAN, v_existing.collect_phone, true);
  v_order_notes := COALESCE((payload->>'order_notes')::BOOLEAN, v_existing.order_notes, true);
  v_terms_required := COALESCE((payload->>'terms_required')::BOOLEAN, v_existing.terms_required, true);
  v_abandoned_cart_email := COALESCE((payload->>'abandoned_cart_email')::BOOLEAN, v_existing.abandoned_cart_email, true);
  v_default_checkout_country := COALESCE(NULLIF(btrim(payload->>'default_checkout_country'), ''), v_existing.default_checkout_country, 'FR');
  v_free_shipping_enabled := COALESCE((payload->>'free_shipping_enabled')::BOOLEAN, v_existing.free_shipping_enabled, true);

  BEGIN
    v_free_shipping_min := GREATEST(COALESCE((payload->>'free_shipping_min')::NUMERIC, v_existing.free_shipping_min, 0), 0);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Free shipping minimum must be a non-negative number'
      USING ERRCODE = 'P0001';
  END;

  v_local_pickup := COALESCE((payload->>'local_pickup')::BOOLEAN, v_existing.local_pickup, true);
  v_express_shipping := COALESCE((payload->>'express_shipping')::BOOLEAN, v_existing.express_shipping, false);
  v_shipping_origin := CASE WHEN payload ? 'shipping_origin' THEN NULLIF(btrim(payload->>'shipping_origin'), '') ELSE v_existing.shipping_origin END;
  v_default_carrier := CASE WHEN payload ? 'default_carrier' THEN NULLIF(btrim(payload->>'default_carrier'), '') ELSE v_existing.default_carrier END;

  BEGIN
    v_handling_days := GREATEST(COALESCE((payload->>'handling_days')::INTEGER, v_existing.handling_days, 1), 0);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Handling days must be a non-negative integer'
      USING ERRCODE = 'P0001';
  END;

  -- Shipping zones: drop blank names; clamp rate >= 0.
  IF payload ? 'shipping_zones' AND jsonb_typeof(payload->'shipping_zones') = 'array' THEN
    FOR v_zone IN SELECT value FROM jsonb_array_elements(payload->'shipping_zones')
    LOOP
      IF COALESCE(btrim(v_zone->>'name'), '') = '' THEN
        CONTINUE;
      END IF;
      v_zones := v_zones || jsonb_build_array(jsonb_build_object(
        'id', COALESCE(NULLIF(v_zone->>'id', ''), gen_random_uuid()::text),
        'name', btrim(v_zone->>'name'),
        'countries', COALESCE(v_zone->'countries', '[]'::jsonb),
        'rate', GREATEST(COALESCE((v_zone->>'rate')::NUMERIC, 0), 0),
        'estimatedDays', COALESCE(NULLIF(btrim(v_zone->>'estimatedDays'), ''), NULLIF(btrim(v_zone->>'estimated_days'), ''), '5-7')
      ));
    END LOOP;
  ELSE
    v_zones := COALESCE(v_existing.shipping_zones, '[]'::jsonb);
  END IF;

  -- Locations: drop blank names; enforce exactly one default when any remain.
  IF payload ? 'locations' AND jsonb_typeof(payload->'locations') = 'array' THEN
    FOR v_loc IN SELECT value FROM jsonb_array_elements(payload->'locations')
    LOOP
      IF COALESCE(btrim(v_loc->>'name'), '') = '' THEN
        CONTINUE;
      END IF;
      v_locs := v_locs || jsonb_build_array(jsonb_build_object(
        'id', COALESCE(NULLIF(v_loc->>'id', ''), gen_random_uuid()::text),
        'name', btrim(v_loc->>'name'),
        'address', COALESCE(v_loc->>'address', ''),
        'city', COALESCE(v_loc->>'city', ''),
        'country', COALESCE(v_loc->>'country', ''),
        'phone', COALESCE(v_loc->>'phone', ''),
        'isDefault', COALESCE((v_loc->>'isDefault')::BOOLEAN, (v_loc->>'is_default')::BOOLEAN, false)
      ));
    END LOOP;

    SELECT COUNT(*) INTO v_default_count
    FROM jsonb_array_elements(v_locs) AS e(value)
    WHERE COALESCE((e.value->>'isDefault')::BOOLEAN, false);

    IF jsonb_array_length(v_locs) > 0 AND v_default_count = 0 THEN
      v_locs := jsonb_set(v_locs, '{0,isDefault}', 'true'::jsonb);
    ELSIF v_default_count > 1 THEN
      -- First default wins; clear the rest.
      v_locs := (
        WITH elems AS (
          SELECT value, ordinality
          FROM jsonb_array_elements(v_locs) WITH ORDINALITY AS t(value, ordinality)
        ),
        first_default AS (
          SELECT MIN(ordinality) AS ordinality
          FROM elems
          WHERE COALESCE((value->>'isDefault')::BOOLEAN, false)
        ),
        marked AS (
          SELECT
            CASE
              WHEN elems.ordinality = first_default.ordinality
              THEN jsonb_set(elems.value, '{isDefault}', 'true'::jsonb)
              ELSE jsonb_set(elems.value, '{isDefault}', 'false'::jsonb)
            END AS value
          FROM elems
          CROSS JOIN first_default
        )
        SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) FROM marked
      );
    END IF;
  ELSE
    v_locs := COALESCE(v_existing.locations, '[]'::jsonb);
  END IF;

  v_two_factor_required := COALESCE((payload->>'two_factor_required')::BOOLEAN, v_existing.two_factor_required, false);

  BEGIN
    v_session_timeout_minutes := COALESCE((payload->>'session_timeout_minutes')::INTEGER, v_existing.session_timeout_minutes, 30);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Session timeout must be between 5 and 1440 minutes'
      USING ERRCODE = 'P0001';
  END;
  IF v_session_timeout_minutes < 5 OR v_session_timeout_minutes > 1440 THEN
    RAISE EXCEPTION 'Session timeout must be between 5 and 1440 minutes'
      USING ERRCODE = 'P0001';
  END IF;

  v_login_alerts := COALESCE((payload->>'login_alerts')::BOOLEAN, v_existing.login_alerts, true);

  BEGIN
    v_password_min_length := COALESCE((payload->>'password_min_length')::INTEGER, v_existing.password_min_length, 8);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Password minimum length must be between 6 and 128'
      USING ERRCODE = 'P0001';
  END;
  IF v_password_min_length < 6 OR v_password_min_length > 128 THEN
    RAISE EXCEPTION 'Password minimum length must be between 6 and 128'
      USING ERRCODE = 'P0001';
  END IF;

  v_require_strong_password := COALESCE((payload->>'require_strong_password')::BOOLEAN, v_existing.require_strong_password, true);
  v_email_order_confirm := COALESCE((payload->>'email_order_confirm')::BOOLEAN, v_existing.email_order_confirm, true);
  v_email_shipping_updates := COALESCE((payload->>'email_shipping_updates')::BOOLEAN, v_existing.email_shipping_updates, true);
  v_email_low_stock := COALESCE((payload->>'email_low_stock')::BOOLEAN, v_existing.email_low_stock, true);
  v_email_new_customer := COALESCE((payload->>'email_new_customer')::BOOLEAN, v_existing.email_new_customer, false);
  v_sms_order_updates := COALESCE((payload->>'sms_order_updates')::BOOLEAN, v_existing.sms_order_updates, false);
  v_notify_email := CASE WHEN payload ? 'notify_email' THEN NULLIF(btrim(payload->>'notify_email'), '') ELSE v_existing.notify_email END;

  INSERT INTO inventory_store_settings (
    id,
    store_name,
    store_code,
    status,
    established_at,
    logo,
    store_url,
    phone,
    contact_email,
    tags,
    automatic_time_zone,
    time_zone,
    language,
    date_format,
    ai_semantic_search,
    ai_insight,
    contact_channels,
    currency,
    card_methods,
    apple_pay,
    google_pay,
    paypal,
    tax_rate_scope,
    tax_calculation,
    tax_percent,
    automatic_invoice,
    no_reply_email,
    guest_checkout,
    collect_phone,
    order_notes,
    terms_required,
    abandoned_cart_email,
    default_checkout_country,
    free_shipping_enabled,
    free_shipping_min,
    local_pickup,
    express_shipping,
    shipping_origin,
    default_carrier,
    handling_days,
    shipping_zones,
    locations,
    two_factor_required,
    session_timeout_minutes,
    login_alerts,
    password_min_length,
    require_strong_password,
    email_order_confirm,
    email_shipping_updates,
    email_low_stock,
    email_new_customer,
    sms_order_updates,
    notify_email
  ) VALUES (
    v_id,
    v_store_name,
    v_store_code,
    v_status,
    v_established_at,
    v_logo,
    v_store_url,
    v_phone,
    v_contact_email,
    v_tags,
    v_automatic_time_zone,
    v_time_zone,
    v_language,
    v_date_format,
    v_ai_semantic_search,
    v_ai_insight,
    v_channels,
    'XAF',
    v_card_methods,
    v_apple_pay,
    v_google_pay,
    v_paypal,
    v_tax_rate_scope,
    v_tax_calculation,
    v_tax_percent,
    v_automatic_invoice,
    v_no_reply_email,
    v_guest_checkout,
    v_collect_phone,
    v_order_notes,
    v_terms_required,
    v_abandoned_cart_email,
    v_default_checkout_country,
    v_free_shipping_enabled,
    v_free_shipping_min,
    v_local_pickup,
    v_express_shipping,
    v_shipping_origin,
    v_default_carrier,
    v_handling_days,
    v_zones,
    v_locs,
    v_two_factor_required,
    v_session_timeout_minutes,
    v_login_alerts,
    v_password_min_length,
    v_require_strong_password,
    v_email_order_confirm,
    v_email_shipping_updates,
    v_email_low_stock,
    v_email_new_customer,
    v_sms_order_updates,
    v_notify_email
  )
  ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    store_code = EXCLUDED.store_code,
    status = EXCLUDED.status,
    established_at = EXCLUDED.established_at,
    logo = EXCLUDED.logo,
    store_url = EXCLUDED.store_url,
    phone = EXCLUDED.phone,
    contact_email = EXCLUDED.contact_email,
    tags = EXCLUDED.tags,
    automatic_time_zone = EXCLUDED.automatic_time_zone,
    time_zone = EXCLUDED.time_zone,
    language = EXCLUDED.language,
    date_format = EXCLUDED.date_format,
    ai_semantic_search = EXCLUDED.ai_semantic_search,
    ai_insight = EXCLUDED.ai_insight,
    contact_channels = EXCLUDED.contact_channels,
    currency = 'XAF',
    card_methods = EXCLUDED.card_methods,
    apple_pay = EXCLUDED.apple_pay,
    google_pay = EXCLUDED.google_pay,
    paypal = EXCLUDED.paypal,
    tax_rate_scope = EXCLUDED.tax_rate_scope,
    tax_calculation = EXCLUDED.tax_calculation,
    tax_percent = EXCLUDED.tax_percent,
    automatic_invoice = EXCLUDED.automatic_invoice,
    no_reply_email = EXCLUDED.no_reply_email,
    guest_checkout = EXCLUDED.guest_checkout,
    collect_phone = EXCLUDED.collect_phone,
    order_notes = EXCLUDED.order_notes,
    terms_required = EXCLUDED.terms_required,
    abandoned_cart_email = EXCLUDED.abandoned_cart_email,
    default_checkout_country = EXCLUDED.default_checkout_country,
    free_shipping_enabled = EXCLUDED.free_shipping_enabled,
    free_shipping_min = EXCLUDED.free_shipping_min,
    local_pickup = EXCLUDED.local_pickup,
    express_shipping = EXCLUDED.express_shipping,
    shipping_origin = EXCLUDED.shipping_origin,
    default_carrier = EXCLUDED.default_carrier,
    handling_days = EXCLUDED.handling_days,
    shipping_zones = EXCLUDED.shipping_zones,
    locations = EXCLUDED.locations,
    two_factor_required = EXCLUDED.two_factor_required,
    session_timeout_minutes = EXCLUDED.session_timeout_minutes,
    login_alerts = EXCLUDED.login_alerts,
    password_min_length = EXCLUDED.password_min_length,
    require_strong_password = EXCLUDED.require_strong_password,
    email_order_confirm = EXCLUDED.email_order_confirm,
    email_shipping_updates = EXCLUDED.email_shipping_updates,
    email_low_stock = EXCLUDED.email_low_stock,
    email_new_customer = EXCLUDED.email_new_customer,
    sms_order_updates = EXCLUDED.sms_order_updates,
    notify_email = EXCLUDED.notify_email;

  SELECT to_jsonb(s.*) INTO v_result
  FROM inventory_store_settings s
  WHERE s.id = v_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION inventory_upsert_store_settings(JSONB) TO anon, authenticated, service_role;
