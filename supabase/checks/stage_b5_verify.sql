\echo '== MV exists =='
SELECT to_regclass('public.mv_search_products') AS mv;

\echo '== indexes =='
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='mv_search_products'
ORDER BY indexname;

\echo '== RPC exists =='
SELECT proname FROM pg_proc WHERE proname IN ('search_products','refresh_search_products');

\echo '== first refresh =='
SELECT public.refresh_search_products();

\echo '== row count =='
SELECT count(*) AS products_indexed FROM public.mv_search_products;

\echo '== smoke search: 1KZ =='
SELECT sku, title, in_stock, rank
FROM public.search_products(q := '1KZ', p_limit := 5);

\echo '== smoke search: TEIKIN 46283 =='
SELECT sku, title, in_stock, rank
FROM public.search_products(q := 'TEIKIN 46283', p_limit := 5);
