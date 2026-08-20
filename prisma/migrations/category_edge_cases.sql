-- Category edge-case hardening: case-insensitive unique names + ensure unique codes.

-- Resolve duplicate names (keep oldest; rename later copies).
WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY lower(btrim(name))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM inventory_categories
)
UPDATE inventory_categories c
SET name = btrim(c.name) || ' (' || ranked.rn::text || ')',
    updated_at = now()
FROM ranked
WHERE c.id = ranked.id
  AND ranked.rn > 1;

-- Resolve duplicate / null codes.
WITH ranked_codes AS (
  SELECT
    id,
    code,
    ROW_NUMBER() OVER (
      PARTITION BY upper(coalesce(nullif(btrim(code), ''), id))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM inventory_categories
  WHERE code IS NOT NULL AND btrim(code) <> ''
)
UPDATE inventory_categories c
SET code = left(upper(btrim(c.code)), 12) || '-' || substr(replace(c.id, '-', ''), 1, 4),
    updated_at = now()
FROM ranked_codes
WHERE c.id = ranked_codes.id
  AND ranked_codes.rn > 1;

UPDATE inventory_categories
SET code = left(upper(regexp_replace(coalesce(nullif(btrim(name), ''), 'CAT'), '[^a-zA-Z0-9]+', '', 'g')), 8)
           || '-' || substr(replace(id, '-', ''), 1, 4),
    updated_at = now()
WHERE code IS NULL OR btrim(code) = '';

CREATE UNIQUE INDEX IF NOT EXISTS inventory_categories_name_lower_uidx
  ON inventory_categories (lower(btrim(name)));

-- Reinforced in case older installs missed the column unique constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_categories_code_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'inventory_categories_code_key'
  ) THEN
    BEGIN
      ALTER TABLE inventory_categories ADD CONSTRAINT inventory_categories_code_key UNIQUE (code);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN unique_violation THEN NULL;
    END;
  END IF;
END $$;
