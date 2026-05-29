\echo '== content tables exist =='
SELECT to_regclass('public.product_content') AS product_content,
       to_regclass('public.engine_content')  AS engine_content;

\echo '== partial unique indexes =='
SELECT indexname FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('product_content','engine_content')
ORDER BY indexname;
