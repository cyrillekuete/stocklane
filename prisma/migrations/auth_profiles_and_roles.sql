-- Auth profiles + role helpers for Admin / Cashier / Store Keeper.
-- Role for authorization must live in app_metadata (synced here), not user_metadata.

CREATE TABLE IF NOT EXISTS inventory_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'cashier'
    CHECK (role IN ('admin', 'cashier', 'store_keeper')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'invited')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_profiles_role_idx ON inventory_profiles (role);
CREATE INDEX IF NOT EXISTS inventory_profiles_status_idx ON inventory_profiles (status);
CREATE INDEX IF NOT EXISTS inventory_profiles_email_idx ON inventory_profiles (email);

COMMENT ON TABLE inventory_profiles IS
  'App user profiles. role is the source of truth mirrored into auth.users.raw_app_meta_data.role.';

ALTER TABLE inventory_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_profiles_select_own_or_admin ON inventory_profiles;
CREATE POLICY inventory_profiles_select_own_or_admin
  ON inventory_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

DROP POLICY IF EXISTS inventory_profiles_update_own ON inventory_profiles;
CREATE POLICY inventory_profiles_update_own
  ON inventory_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM inventory_profiles p WHERE p.id = auth.uid())
    AND status = (SELECT p.status FROM inventory_profiles p WHERE p.id = auth.uid())
  );

-- Admins may update any profile (role/status changes go through RPC that also syncs app_metadata).
DROP POLICY IF EXISTS inventory_profiles_admin_update ON inventory_profiles;
CREATE POLICY inventory_profiles_admin_update
  ON inventory_profiles FOR UPDATE TO authenticated
  USING (COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  WITH CHECK (COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

GRANT SELECT, UPDATE ON inventory_profiles TO authenticated;
GRANT ALL ON inventory_profiles TO service_role;

CREATE OR REPLACE FUNCTION inventory_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    (SELECT role FROM inventory_profiles WHERE id = auth.uid()),
    'cashier'
  );
$$;

CREATE OR REPLACE FUNCTION inventory_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT inventory_current_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION inventory_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_first TEXT;
  v_last TEXT;
  v_full TEXT;
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_app_meta_data ->> 'role', ''), 'cashier');
  IF v_role NOT IN ('admin', 'cashier', 'store_keeper') THEN
    v_role := 'cashier';
  END IF;

  v_first := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');
  v_full := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'fullname', ''),
    NULLIF(trim(v_first || ' ' || v_last), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO inventory_profiles (id, email, first_name, last_name, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(v_first, ''),
    NULLIF(v_last, ''),
    v_full,
    v_role,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, inventory_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, inventory_profiles.last_name),
        full_name = COALESCE(EXCLUDED.full_name, inventory_profiles.full_name),
        updated_at = now();

  -- Ensure app_metadata.role is set for JWT-based authorization.
  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_inventory_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_inventory_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION inventory_handle_new_user();

-- Admin-only: update role/status and mirror role into app_metadata.
CREATE OR REPLACE FUNCTION inventory_admin_update_user(
  p_user_id UUID,
  p_role TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS inventory_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row inventory_profiles;
  v_role TEXT;
  v_status TEXT;
  v_full TEXT;
BEGIN
  IF NOT inventory_is_admin() THEN
    RAISE EXCEPTION 'Only admins can manage users' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM inventory_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = 'P0002';
  END IF;

  v_role := COALESCE(NULLIF(p_role, ''), v_row.role);
  IF v_role NOT IN ('admin', 'cashier', 'store_keeper') THEN
    RAISE EXCEPTION 'Invalid role' USING ERRCODE = '22023';
  END IF;

  v_status := COALESCE(NULLIF(p_status, ''), v_row.status);
  IF v_status NOT IN ('active', 'inactive', 'invited') THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023';
  END IF;

  -- Prevent removing the last active admin.
  IF v_row.role = 'admin' AND (v_role <> 'admin' OR v_status <> 'active') THEN
    IF (
      SELECT count(*) FROM inventory_profiles
      WHERE role = 'admin' AND status = 'active' AND id <> p_user_id
    ) = 0 THEN
      RAISE EXCEPTION 'Cannot demote or deactivate the last active admin' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_full := NULLIF(
    trim(
      COALESCE(p_first_name, v_row.first_name, '') || ' ' ||
      COALESCE(p_last_name, v_row.last_name, '')
    ),
    ''
  );

  UPDATE inventory_profiles
  SET
    role = v_role,
    status = v_status,
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    full_name = COALESCE(v_full, full_name),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role),
      raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb) ||
        jsonb_build_object(
          'first_name', COALESCE(v_row.first_name, ''),
          'last_name', COALESCE(v_row.last_name, ''),
          'fullname', COALESCE(v_row.full_name, '')
        )
  WHERE id = p_user_id;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION inventory_current_role() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION inventory_is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION inventory_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION inventory_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
