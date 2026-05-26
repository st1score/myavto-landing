# MY AVTO — Supabase migrations

This folder contains SQL migrations for the **MY AVTO master database**.
Everything is **additive-only** and designed to be applied manually via
the Supabase SQL editor (or `psql`) by the project owner.

> Nothing in this folder is auto-applied. CI does not run it. The Astro
> site does not depend on it. It's a staging area for hand-reviewed SQL.

---

## Data source policy

The MY AVTO master database has one rule: **every fact must have a source.**

| Type of data                                | Authoritative source                          |
|---------------------------------------------|-----------------------------------------------|
| Engines list (engine_code, displacement…)   | Already in `public.engines` — do not recreate |
| Part numbers (OEM, TEIKIN, NPR…)            | Brand catalogs (PDF / CSV / supplier sites)   |
| Part attributes (diameter, ring thickness…) | Brand catalogs                                |
| Cross-references between part numbers       | Brand catalogs + manual + AI proposals        |
| Vehicle makes / models / generations        | **otoba.ru** (primary), manual override       |
| Body codes, chassis codes, frame codes      | **otoba.ru**                                  |
| Production years, market regions            | **otoba.ru**                                  |
| Engine ↔ vehicle fitments                   | **otoba.ru** + manual verification            |
| Technical vehicle specs                     | **otoba.ru**                                  |
| Stock / prices                              | Manual + n8n syncs                            |

Anything entered without provenance gets `source_id` of either
`manual_myavto` or `existing_database` and `confidence < 1.0` until
verified.

---

## Stage A — Master DB foundation

**File:** `migrations/20260526_stage_a_master_db_foundation.sql`
**Status:** ✅ **APPLIED manually to production Supabase** (2026-05-26).
Seed `seeds/seed_1kz_master_example.sql` applied. Verification queries
in `checks/stage_a_verify.sql` all passed.

### Applied-state snapshot (2026-05-26)

| Table                   | Rows | Notes                                                         |
|-------------------------|------|---------------------------------------------------------------|
| `vehicle_makes`         | 1    | Toyota                                                        |
| `vehicle_models`        | 8    | Prado 90, Prado 120, Hiace, Hilux Surf, Granvia, Regius, LC, Dyna/Toyoace |
| `engine_fitments`       | 8    | All for `engine_code='1KZ'`, `confidence=0.70`, `notes='needs verification until otoba.ru parsed'` |
| `data_sources`          | 11   | existing_database, manual_myavto, otoba_ru, teikin/npr/kp/taiho/acl_catalog, supabase_sql_editor, n8n_import, ai_generated |
| `engine_aliases`        | 2    | Seed inserted 4 rows; deduped to 2 by `(engine_code, alias_norm)` unique index — expected behavior |
| `vehicle_model_aliases` | 4    | Prado 120 / Land Cruiser Prado 120 / J120 / KZJ120            |
| `data_source_links`     | 2    | 1 engine_fitment (manual_myavto) + 1 vehicle_model (otoba.ru placeholder) |
| `vehicle_specs`         | 0    | Empty until otoba.ru parser runs                              |
| `data_source_runs`      | 0    | No automated runs yet                                         |
| `audit_log`             | 0    | Table exists; triggers intentionally NOT attached             |
| `part_number_crosses`   | 0    | Empty until catalog cross-reference imports start             |

### Current state of 1KZ (reference engine)

1KZ is the project's reference engine — the only one with a complete
manual record (catalog text, OEM numbers, attributes; see
`site/src/data/teikin-catalog.ts`). In Stage A it now also has:

- 8 fitments to Toyota models in `engine_fitments`, all at
  `confidence = 0.70` with `notes = 'needs verification until otoba.ru
  parsed'`. **Treat them as provisional** — they prove the schema works,
  not that the data is final.
- 2 effective aliases in `engine_aliases` (`1KZ` and `1KZTE` after
  normalization).
- 1 provenance link in `data_source_links` (entity_key
  `1KZ:toyota:land-cruiser-prado:120`, source `manual_myavto`).

The site continues to read only from the pre-existing tables; the new
Stage A tables are not yet consumed by Astro.

### Security posture (intentional gaps)

- **No `GRANT` statements** were applied. The new tables are reachable
  only via the database owner / `postgres` role. `anon` and
  `authenticated` have no access. A dedicated RLS / security stage will
  decide who can read what.
- **No RLS policies** enabled yet.
- **No audit triggers** attached to existing tables. `audit_log` exists
  but is empty. Triggers will be added per-table after benchmarking the
  overhead on hot tables (`stock_items`, `part_variant_sizes`).

### Why Stage A is needed

The existing database is a clean engine-parts catalog, but it has no
concept of:

- the cars that an engine is installed in,
- where any piece of data came from,
- how a part number from TEIKIN maps to one from NPR,
- how "Prado 120", "J120" and "KZJ120" are the same thing.

Stage A introduces those layers without touching anything that the site
currently reads.

### What it adds

Eleven new tables + one shared trigger function:

| Table                    | Purpose                                                 |
|--------------------------|---------------------------------------------------------|
| `vehicle_makes`          | Toyota / Nissan / Mitsubishi / …                        |
| `vehicle_models`         | Model + generation + chassis (filled from otoba.ru)     |
| `engine_fitments`        | engine_code ↔ vehicle_model bridge                      |
| `vehicle_specs`          | Per-model EAV: body_type, drive, fuel, power_hp, …      |
| `data_sources`           | Where data comes from (otoba.ru, TEIKIN, manual, AI, …) |
| `data_source_runs`       | Per-import run log (rows imported / failed / errors)    |
| `data_source_links`      | Universal "source → entity" provenance                  |
| `audit_log`              | INSERT/UPDATE/DELETE history (no triggers yet)          |
| `engine_aliases`         | "1KZ-TE", "1KZTE", "1 KZ" → engine_code='1KZ'           |
| `vehicle_model_aliases`  | "J120", "KZJ120", "Prado 120" → vehicle_models row      |
| `part_number_crosses`    | OEM ↔ TEIKIN ↔ NPR ↔ KP ↔ Taiho ↔ ACL                   |

Plus one shared function `tg_touch_updated_at()` and triggers on tables
that have an `updated_at` column.

### What it does NOT do

- **Does not touch existing tables.** `engines`, `brands`,
  `part_categories`, `attributes`, `category_attributes`,
  `engine_parts`, `engine_part_numbers`, `engine_part_attribute_values`,
  `part_variants`, `part_variant_sizes`, `stock_items`, `size_codes`,
  `warehouses`, `v_piston_card` — none of them are altered.
- **Does not recreate the engines list.** All references to engines use
  the existing `engine_code` values from `public.engines`.
- **Does not add a FK** `engine_fitments.engine_code → engines.engine_code`.
  `engines` has a composite PK `(brand_name, engine_code)`; introducing
  the FK requires a separate stage that decides between adding a
  `UNIQUE(engine_code)` constraint and introducing a synthetic
  `engines.id`. For now `engine_code` is plain text + indexed.
- **Does not attach audit triggers** on existing tables. `audit_log` is
  created empty; triggers will be added on a per-table basis in a later
  stage so we can measure overhead first.
- **Does not delete, rename, or change** any existing column, constraint,
  index, view, or grant.

### Why 1KZ is the reference example

1KZ is the only engine in the project that already has a complete manual
record (catalog text, OEM numbers, attributes — see
`site/src/data/teikin-catalog.ts`). Using it as the seed example proves
the new layer integrates with real data, not toy data.

---

## How to apply (manually)

Stage A is intentionally not automated. Apply it yourself when you're
ready.

### 1) Apply the migration

In Supabase Dashboard → SQL Editor:

1. Open `migrations/20260526_stage_a_master_db_foundation.sql`
2. Copy the full file into the SQL editor
3. Run it. Expected output: `COMMIT` with no errors.

Or with `psql`:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260526_stage_a_master_db_foundation.sql
```

### 2) Apply the seed (optional but recommended)

```bash
psql "$DATABASE_URL" -f supabase/seeds/seed_1kz_master_example.sql
```

The seed is idempotent — safe to re-run.

### 3) Verify

```bash
psql "$DATABASE_URL" -f supabase/checks/stage_a_verify.sql
```

Expected:

- Query 1: 11 rows (one per new table)
- Query 2: 11 rows (one per data_source)
- Query 3: 8 rows (1KZ fitted to 8 Toyota models, all confidence 0.70)
- Query 5: 0 rows (no duplicate models)
- Query 6: 0 rows (no duplicate fitments)
- Query 7: 4 rows (1KZ aliases)
- Query 8: 4 rows (Prado 120 aliases)
- Query 9: ≥ 2 rows (the two example links)
- Query 10: 3 rows (engines/engine_part_numbers/stock_items still exist)
- Query 11: rows for any `engine_code ILIKE '%1KZ%'` in the real engines table

### Rollback

If something goes wrong:

```bash
psql "$DATABASE_URL" -f supabase/rollbacks/20260526_stage_a_master_db_foundation_rollback.sql
```

This drops only Stage A tables and removes the migration record. It does
**not** touch any pre-existing table.

---

## Next: Stage B — Products / Prices / Media / Content / Exports

**Status:** Design only. No SQL files yet.

Stage A is now in production. Stage B will add the commerce / publication
layer so that one master database can feed many output channels (site,
Kaspi, Google Ads, Telegram bot, n8n).

### Why Stage B is needed

Today every channel would have to re-derive a SKU from
`(engine_code, category_code, part_name, brand_name, variant_name, size_code, insert_type)`
on its own, and there's no place to store retail prices, marketplace
copy, or canonical images. Stage B fixes that without changing what the
site reads.

### What it adds (planned tables)

1. **`products`** — synthetic stable SKU layer.
   - `id bigserial PK`, `sku text UNIQUE` (canonical, stable, immutable)
   - Natural key columns mirror `part_variant_sizes` (engine_code,
     category_code, part_name, brand_name, variant_name, size_code,
     insert_type) with a UNIQUE index on them, so the row points 1-to-1
     at an existing variant.
   - `is_active`, `kind` (single / kit / bundle), `created_at`,
     `updated_at`, `source_id`.
   - The Astro site keeps reading `part_variant_sizes` directly. All
     external channels (Kaspi, Ads, Telegram) read `products`.

2. **`prices`** — multi-channel with validity windows.
   - `id`, `product_id → products(id)`, `channel` (`retail | kaspi |
     wholesale | promo | telegram`), `currency` (default `KZT`),
     `amount numeric(12,2)`, `valid_from`, `valid_to`, `source_id`,
     `confidence`, `is_active`.
   - Unique on `(product_id, channel, COALESCE(valid_from, …))` so a
     given channel has at most one active price at any moment.
   - `purchase_price` stays in `part_variant_sizes` (existing). `prices`
     is for **sale** prices.

3. **`media_assets`** — canonical media table.
   - `id`, `kind` (`image | pdf | doc | video`), `url`, `storage_path`,
     `width`, `height`, `bytes`, `mime`, `alt_text`, `source_id`,
     `created_at`.
   - Lets every product/engine reference one URL canonically instead of
     today's path convention.

4. **`product_media` / `engine_media`** — many-to-many with role.
   - `product_id` (or `engine_code`), `media_id`, `role` (`primary |
     gallery | spec_sheet | install_diagram`), `sort_order`.
   - The Astro site keeps a fallback to `/teikin-catalog/{engine_code}.png`
     for engines that have no row here, so nothing breaks during rollout.

5. **`product_content` / `engine_content`** — multi-locale, per-channel.
   - `id`, `product_id | engine_code`, `locale` (`ru | kk | en`),
     `channel` (`site | kaspi | telegram | ads`), `title`, `h1`,
     `meta_description`, `description_md`, `bullets_json`, `source_id`,
     `is_active`.
   - Lets Kaspi override site copy (e.g. shorter title, different
     keywords) without forking Astro templates.

6. **Marketplace mapping**
   - `marketplace_categories` (`channel`, `code`, `name`, `parent_code`).
   - `marketplace_mappings` (`channel`, `our_category_code →
     part_categories(code)`, `external_category_code`,
     `required_attrs_json`).
   - Defines which Kaspi category each `part_categories.code` lands in
     and which attributes are mandatory there.

7. **Export views (read-only, the actual outputs)**
   - `v_kaspi_feed` — JOIN of products + prices(channel='kaspi') +
     product_content(channel='kaspi', locale='ru') + media + stock +
     engine_fitments (so Kaspi sees the cars). Filters by
     `confidence ≥ threshold` and active prices.
   - `v_google_merchant_feed` — same shape, Google taxonomy via
     `marketplace_mappings`.
   - `v_sitemap` — every publishable URL the site should expose.
   - `v_telegram_search` — denormalized search index (engine + aliases +
     fitments + product summary + stock) for the bot's RPC lookups.

8. **`export_jobs`** — log of generated feeds.
   - `id`, `channel`, `format` (`xml | csv | json`), `status`,
     `file_url`, `rows`, `started_at`, `finished_at`, `error_text`.
   - Same shape as `data_source_runs` but for *outgoing* data — gives
     n8n a place to record every feed generation.

### Hard constraints carried over from Stage A

- **Additive-only.** No drops, no renames, no PK/FK changes to existing
  tables. `part_variant_sizes` remains the source of truth for the site.
- **`products.sku` is the only stable external identifier.** Once
  assigned, it never changes — that's the contract for Kaspi/Ads.
- **Every row has provenance.** `prices`, `media_assets`,
  `product_content` all carry `source_id` and `confidence`. AI-suggested
  rows land with `confidence < 1.0` until reviewed.
- **No `GRANT` / RLS** in the Stage B migration itself — same security
  posture as Stage A. A separate stage handles access control.
- **No site changes** in Stage B. The Astro build keeps reading
  pre-existing tables. Channels that consume Stage B are the new
  beneficiaries.

### Rollout order inside Stage B

Stage B will be split into sub-migrations to keep each diff reviewable:

1. `B1` — `products` + UNIQUE on natural key + backfill from
   `part_variant_sizes` (idempotent INSERT … SELECT … ON CONFLICT DO NOTHING).
2. `B2` — `prices` (empty; populated later by n8n or manual).
3. `B3` — `media_assets`, `product_media`, `engine_media` + optional
   backfill of `engine_media` from existing `/teikin-catalog/*.png`.
4. `B4` — `product_content`, `engine_content` (empty).
5. `B5` — `marketplace_categories`, `marketplace_mappings` + seed for
   Kaspi categories we actually use.
6. `B6` — export views + `export_jobs`.

Each sub-stage gets its own migration / seed / checks / rollback,
following the Stage A pattern.

### Open questions to resolve before writing Stage B SQL

- Stable SKU format. Candidate: `<engine>-<cat>-<part>-<brand>-<variant>-<size>-<insert>`
  slugified (matches the URL convention already in
  `site/src/lib/slugs.ts`). Need to confirm it's unique across the full
  dataset before locking it in.
- Whether `prices.amount` should be `numeric(12,2)` (KZT, no decimals
  used in practice) or `integer` (tenge). Owner decision.
- Currency assumption: KZT-only or multi-currency from day one.
- Whether `product_content.description_md` needs versioning (history of
  text edits) or simple overwrite is enough.

These are tracked here so we don't start Stage B SQL before they're
answered.
