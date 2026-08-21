-- Per-user feature permissions under User Management.
-- Keep permission keys in sync with src/auth/lib/roles.ts.

CREATE OR REPLACE FUNCTION inventory_known_permissions()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'dashboard',
    'inventory',
    'warehouses',
    'pos',
    'products',
    'categories',
    'orders',
    'customers',
    'settings',
    'users'
  ]::TEXT[];
$$;

CREATE OR REPLACE FUNCTION inventory_permissions_for_role(p_role TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_role
    WHEN 'admin' THEN inventory_known_permissions()
    WHEN 'cashier' THEN ARRAY['dashboard', 'pos', 'orders', 'customers']::TEXT[]
    WHEN 'store_keeper' THEN ARRAY[
      'dashboard',
      'inventory',
      'warehouses',
      'products',
      'categories'
    ]::TEXT[]
    ELSE ARRAY['dashboard']::TEXT[]
  END;
$$;

CREATE OR REPLACE FUNCTION inventory_normalize_permissions(p_permissions TEXT[])
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT p
      FROM unnest(COALESCE(p_permissions, ARRAY[]::TEXT[])) AS p
      WHERE p = ANY (inventory_known_permissions())
      ORDER BY p
    ),
    ARRAY[]::TEXT[]
  );
$$;

ALTER TABLE inventory_profiles
  ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN inventory_profiles.permissions IS
  'Feature permissions for this user. Admins always resolve to the full set. Mirrored into auth.users.raw_app_meta_data.permissions.';

UPDATE inventory_profiles
SET permissions = inventory_permissions_for_role(role)
WHERE COALESCE(cardinality(permissions), 0) = 0;

UPDATE auth.users u
SET raw_app_meta_data =
      COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'permissions', to_jsonb(p.permissions)
      )
FROM inventory_profiles p
WHERE p.id = u.id;

DROP POLICY IF EXISTS inventory_profiles_update_own ON inventory_profiles;
CREATE POLICY inventory_profiles_update_own
  ON inventory_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM inventory_profiles p WHERE p.id = auth.uid())
    AND status = (SELECT p.status FROM inventory_profiles p WHERE p.id = auth.uid())
    AND permissions = (SELECT p.permissions FROM inventory_profiles p WHERE p.id = auth.uid())
  );

CREATE OR REPLACE FUNCTION inventory_has_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    inventory_current_role() = 'admin'
    OR p_permission = ANY (
      COALESCE(
        (
          SELECT permissions
          FROM inventory_profiles
          WHERE id = auth.uid()
        ),
        inventory_permissions_for_role(inventory_current_role())
      )
    );
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
  v_permissions TEXT[];
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_app_meta_data ->> 'role', ''), 'cashier');
  IF v_role NOT IN ('admin', 'cashier', 'store_keeper') THEN
    v_role := 'cashier';
  END IF;

  IF jsonb_typeof(NEW.raw_app_meta_data -> 'permissions') = 'array' THEN
    v_permissions := inventory_normalize_permissions(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_app_meta_data -> 'permissions'))
    );
  ELSE
    v_permissions := inventory_permissions_for_role(v_role);
  END IF;

  IF v_role = 'admin' THEN
    v_permissions := inventory_known_permissions();
  ELSIF 'users' = ANY (v_permissions) THEN
    v_permissions := array_remove(v_permissions, 'users');
  END IF;

  v_first := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');
  v_full := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'fullname', ''),
    NULLIF(trim(v_first || ' ' || v_last), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO inventory_profiles (id, email, first_name, last_name, full_name, role, status, permissions)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(v_first, ''),
    NULLIF(v_last, ''),
    v_full,
    v_role,
    'active',
    v_permissions
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, inventory_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, inventory_profiles.last_name),
        full_name = COALESCE(EXCLUDED.full_name, inventory_profiles.full_name),
        permissions = CASE
          WHEN COALESCE(cardinality(inventory_profiles.permissions), 0) = 0
            THEN EXCLUDED.permissions
          ELSE inventory_profiles.permissions
        END,
        updated_at = now();

  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
          'role', v_role,
          'permissions', to_jsonb(v_permissions)
        )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS inventory_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION inventory_admin_update_user(
  p_user_id UUID,
  p_role TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_permissions TEXT[] DEFAULT NULL
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
  v_permissions TEXT[];
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

  IF v_row.role = 'admin' AND (v_role <> 'admin' OR v_status <> 'active') THEN
    IF (
      SELECT count(*) FROM inventory_profiles
      WHERE role = 'admin' AND status = 'active' AND id <> p_user_id
    ) = 0 THEN
      RAISE EXCEPTION 'Cannot demote or deactivate the last active admin' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_permissions IS NOT NULL THEN
    v_permissions := inventory_normalize_permissions(p_permissions);
    IF cardinality(p_permissions) > 0 AND cardinality(v_permissions) = 0 THEN
      RAISE EXCEPTION 'Invalid permissions' USING ERRCODE = '22023';
    END IF;
  ELSIF p_role IS NOT NULL AND v_role <> v_row.role THEN
    v_permissions := inventory_permissions_for_role(v_role);
  ELSE
    v_permissions := COALESCE(v_row.permissions, inventory_permissions_for_role(v_role));
  END IF;

  IF v_role = 'admin' THEN
    v_permissions := inventory_known_permissions();
  ELSE
    v_permissions := array_remove(v_permissions, 'users');
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
    permissions = v_permissions,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
          'role', v_role,
          'permissions', to_jsonb(v_permissions)
        ),
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

GRANT EXECUTE ON FUNCTION inventory_known_permissions() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION inventory_permissions_for_role(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION inventory_normalize_permissions(TEXT[]) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION inventory_has_permission(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION inventory_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION inventory_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[]) FROM anon;

NOTIFY pgrst, 'reload schema';
