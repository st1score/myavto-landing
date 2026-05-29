-- Rollback Stage B4: content
BEGIN;
DROP TABLE IF EXISTS public.product_content;
DROP TABLE IF EXISTS public.engine_content;
COMMIT;
