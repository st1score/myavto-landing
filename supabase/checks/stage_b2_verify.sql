-- Stage B2 verification
\echo '== prices table exists =='
SELECT to_regclass('public.prices') AS prices_relation;

\echo '== exclusion constraint =='
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.prices'::regclass AND contype = 'x';

\echo '== indexes =='
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'prices';

\echo '== v_current_prices view =='
SELECT to_regclass('public.v_current_prices') AS view_relation;
