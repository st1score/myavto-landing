-- Rollback Stage B2: prices
BEGIN;
DROP VIEW IF EXISTS public.v_current_prices;
DROP TABLE IF EXISTS public.prices;
-- btree_gist extension left in place (may be used elsewhere).
COMMIT;
