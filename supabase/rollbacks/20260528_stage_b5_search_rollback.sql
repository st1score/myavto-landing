-- Rollback Stage B5: search
BEGIN;
DROP FUNCTION IF EXISTS public.search_products(text,text,text,text,text,boolean,int,int);
DROP FUNCTION IF EXISTS public.refresh_search_products();
DROP MATERIALIZED VIEW IF EXISTS public.mv_search_products;
DROP FUNCTION IF EXISTS public.f_unaccent(text);
-- pg_trgm / unaccent extensions left in place.
COMMIT;
