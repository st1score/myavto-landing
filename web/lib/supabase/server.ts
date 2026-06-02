import { createClient } from '@supabase/supabase-js';

// Plain client for build-time (generateStaticParams / generateMetadata / SSG).
// Uses the public anon key — only reads RLS-public data (active products).
//
// NOTE: do NOT force `cache: 'no-store'` here — it makes fetches dynamic, which
// is incompatible with `output: 'export'` (build fails). Freshness is instead
// guaranteed by clean CI builds: GitHub Actions does not persist .next/cache,
// so every deploy reads live data. Locally, run a clean build (`rm -rf .next`)
// if you suspect a stale catalog snapshot from incremental rebuilds.
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
