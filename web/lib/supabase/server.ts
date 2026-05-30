import { createClient } from '@supabase/supabase-js';

// Plain client for build-time (generateStaticParams / generateMetadata / SSG).
// Uses the public anon key — only reads RLS-public data (active products).
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
