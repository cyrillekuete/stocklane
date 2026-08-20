-- POS RPC security posture (documented for when cashier auth lands).
--
-- Current Vite store-inventory client uses the publishable/anon key with no
-- auth session, so inventory_complete_pos_sale / inventory_void_pos_sale still
-- GRANT EXECUTE TO anon (see pos_edge_case_hardening.sql).
--
-- When /pos is gated behind Supabase Auth:
--   REVOKE EXECUTE ON FUNCTION inventory_complete_pos_sale(JSONB) FROM anon;
--   REVOKE EXECUTE ON FUNCTION inventory_void_pos_sale(TEXT, TEXT, INTEGER) FROM anon;
-- Then tighten table policies on inventory_pos_sales / inventory_pos_sale_items
-- away from open USING (true) in inventory_rls_anon.sql.
--
-- PUBLIC execute is already revoked on the hardened POS write RPCs.

SELECT 1;
