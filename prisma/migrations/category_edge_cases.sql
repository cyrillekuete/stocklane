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

-- Fill missing codes with deterministic id-based values (always unique).
UPDATE inventory_categories
SET code = 'CAT-' || substr(replace(id, '-', ''), 1, 12),
    updated_at = now()
WHERE code IS NULL OR btrim(code) = '';

-- Resolve duplicate codes (keep oldest; remap later copies with an id suffix).
WITH ranked_codes AS (
  SELECT
    id,
    code,
    ROW_NUMBER() OVER (
      PARTITION BY upper(btrim(code))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM inventory_categories
  WHERE code IS NOT NULL AND btrim(code) <> ''
)
UPDATE inventory_categories c
SET code = left(upper(btrim(c.code)), 8) || '-' || substr(replace(c.id, '-', ''), 1, 8),
    updated_at = now()
FROM ranked_codes
WHERE c.id = ranked_codes.id
  AND ranked_codes.rn > 1;

-- Second pass: any remapped value that still collides gets a fully id-based code.
WITH still_duped AS (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY upper(btrim(code))
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM inventory_categories
    WHERE code IS NOT NULL AND btrim(code) <> ''
  ) ranked
  WHERE rn > 1
)
UPDATE inventory_categories c
SET code = 'CAT-' || substr(replace(c.id, '-', ''), 1, 12),
    updated_at = now()
FROM still_duped
WHERE c.id = still_duped.id;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_categories_name_lower_uidx
  ON inventory_categories (lower(btrim(name)));

-- Enforce code uniqueness. Fail closed if duplicates remain after remediation
-- so Prisma's @unique on code matches the live database.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_categories_code_key'
  ) OR EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'inventory_categories_code_key'
  ) THEN
    RETURN;
  END IF;

  BEGIN
    ALTER TABLE inventory_categories ADD CONSTRAINT inventory_categories_code_key UNIQUE (code);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN unique_violation THEN
      RAISE EXCEPTION
        'inventory_categories.code still has duplicates after remediation; unique constraint not applied'
        USING ERRCODE = '23505';
  END;
END $$;
