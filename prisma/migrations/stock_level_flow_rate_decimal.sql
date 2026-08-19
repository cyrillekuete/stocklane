-- Original template stock planner flow rates are decimals (e.g. 8.24).
ALTER TABLE inventory_stock_levels
  ALTER COLUMN flow_rate TYPE NUMERIC(12, 2)
  USING flow_rate::numeric;
