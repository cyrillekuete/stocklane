-- Lock store settings to XAF (CFA Franc)

ALTER TABLE inventory_store_settings
  ALTER COLUMN currency SET DEFAULT 'XAF';

UPDATE inventory_store_settings
SET currency = 'XAF'
WHERE currency IS DISTINCT FROM 'XAF';
