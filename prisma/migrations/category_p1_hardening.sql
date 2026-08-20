-- Category P1 hardening: status enum check + RLS security note.
-- Full tenant auth policies remain deferred until app-level auth is wired;
-- demo still uses permissive anon policies from inventory_rls_anon.sql.

UPDATE inventory_categories
SET status = 'Active'
WHERE status IS NULL
   OR btrim(status) = ''
   OR lower(btrim(status)) NOT IN ('active', 'inactive', 'draft', 'archived');

UPDATE inventory_categories
SET status = initcap(lower(btrim(status))),
    updated_at = now()
WHERE status <> initcap(lower(btrim(status)));

ALTER TABLE inventory_categories
  DROP CONSTRAINT IF EXISTS inventory_categories_status_check;

ALTER TABLE inventory_categories
  ADD CONSTRAINT inventory_categories_status_check
  CHECK (status IN ('Active', 'Inactive', 'Draft', 'Archived'));

COMMENT ON TABLE inventory_categories IS
  'Inventory categories. RLS is intentionally open for the Vite anon demo client. Replace anon ALL policies with authenticated + tenant-scoped policies when auth lands.';
