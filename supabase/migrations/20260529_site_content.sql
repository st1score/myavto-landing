-- Home page CMS content. One JSONB doc per page key (key='home').
-- Read by web/lib/homeContent.ts (loadHomeDoc). Falls back to DEFAULT_HOME if absent.
-- Apply in the MARKETPLACE Supabase project (ref kqzvozgvhcefthbgvtrf), not the legacy one.

create table if not exists public.site_content (
  key         text primary key,
  doc         jsonb not null default '{}'::jsonb,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Public read (home page is rendered for anonymous visitors).
drop policy if exists site_content_read on public.site_content;
create policy site_content_read on public.site_content
  for select using (true);

-- Any authenticated user (single-seller model = owner) can write.
drop policy if exists site_content_write on public.site_content;
create policy site_content_write on public.site_content
  for all to authenticated using (true) with check (true);
