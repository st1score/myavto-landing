import { createClient } from '@supabase/supabase-js';

// Plain client for build-time (generateStaticParams / generateMetadata / SSG).
// Uses the public anon key — only reads RLS-public data (active products).
//
// `cache: 'no-store'` is REQUIRED: Next wraps global fetch and caches GET
// requests (PostgREST queries are GET) in .next/cache. Across incremental
// builds that serves a STALE DB snapshot — e.g. sitemap/pages reflecting old
// products (phantom slugs, missing items). Forcing no-store makes every build
// read live data, so a freshly published product always lands in this build.
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    },
  );
}
