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

## Stage B1 — sales_channels + products + stable SKU

**Files:**
- `migrations/20260526_stage_b1_products.sql`
- `seeds/seed_b1_1kz_products.sql`
- `checks/stage_b1_verify.sql`
- `rollbacks/20260526_stage_b1_products_rollback.sql`

**Status:** Local files prepared. **Not applied** to Supabase yet.

### What B1 adds

- `sales_channels` — single source of truth for output channels
  (`website`, `kaspi`, `telegram`, `google_ads`, `n8n`, `retail`,
  `wholesale`, `promo`). Other Stage B tables will reference
  `channel_code`.
- `products` — synthetic SKU layer. One row per
  `(engine_code, category_code, part_name, brand_name, variant_name,
  size_code, insert_type)` — same natural key as `part_variant_sizes`.
- Four SKU helper functions:
  - `normalize_sku_part(text)` — uppercases, replaces non-alnum with
    `-`, collapses repeats, trims; `NULL`/empty → `'NA'`.
  - `size_code_to_sku(text)` — `STD`→`STD`, `0.25`→`025`, `0.50`→`050`,
    `0.75`→`075`, `1.00`→`100`, else `normalize_sku_part`.
  - `category_code_to_sku(text)` — `PISTON`→`PSTN`, `RING`→`RING`,
    `LINER`→`LIN`, `BEARING`→`BRG`, `TIMING_BELT`→`TBLT`,
    `WATER_PUMP`→`WPMP`, `GASKET_KIT`→`GSKT`, else
    `normalize_sku_part`.
  - `generate_product_sku(engine, cat, brand, variant, insert, size)` —
    format `MYA-{ENGINE}-{CAT}-{BRAND}-{VARIANT}[-{INSERT}]-{SIZE}`.
    `INSERT` segment is omitted when `insert_type = 'plain'`.
- Triggers on `products`:
  - `BEFORE INSERT` → auto-fill `sku` when `NULL` via
    `generate_product_sku()`.
  - `BEFORE UPDATE` → forbid `sku` change (immutable contract for
    external channels).
  - `BEFORE UPDATE` → touch `updated_at` (Stage A function reused).

### SKU format

```
MYA-{ENGINE}-{CAT}-{BRAND}-{VARIANT}[-{INSERT}]-{SIZE}

MYA-1KZ-PSTN-TEIKIN-46283-AG-050     -- TEIKIN piston, AG, 0.50
MYA-1KZ-PSTN-TEIKIN-46283-STD        -- TEIKIN piston, plain, STD
MYA-1KZ-PSTN-ND-ND-STD               -- ND piston, plain, STD
```

Once generated, the SKU is **immutable** (the trigger rejects updates).
External channels (Kaspi, Ads, Telegram) treat this SKU as the only
stable external identifier.

### What B1 does NOT do

- **Does not change `part_variant_sizes`.** The site keeps reading it
  directly; `products` is a *mirror with a SKU on top*, not a
  replacement.
- **Does not add FK** `products.engine_code → engines` (composite PK in
  `engines` — same blocker as Stage A). `engine_code` is plain text +
  indexed.
- **Does not add prices.** No `prices` table, no `purchase_price` move
  — that's B2.
- **Does not add media or content.** B3/B4.
- **Does not change the Astro site.** No queries to `products` from the
  build. The site behaves exactly as before.
- **No GRANT / RLS.** Same security posture as Stage A — access policy
  is decided in a dedicated security stage.

### Seed (`seed_b1_1kz_products.sql`)

1. Inserts 8 rows into `sales_channels`.
2. Backfills `products` from `part_variant_sizes` where
   `engine_code='1KZ'` AND `category_code='PISTON'` AND
   `is_active=true`. SKU is generated by the trigger. All rows are
   marked `source_id = data_sources.code='existing_database'`,
   `confidence = 1.00`, with a `notes` explaining the backfill origin.
3. Idempotent — `ON CONFLICT DO NOTHING` against the natural-key unique
   index.

### Verify (`stage_b1_verify.sql`)

Nine read-only queries:

1. List `sales_channels` (expect 8 rows).
2. `products` count grouped by `(engine_code, category_code)`.
3. All 1KZ piston products with their generated SKU.
4. Duplicate SKU check (must return 0 rows).
5. Duplicate natural-key check (must return 0 rows).
6. Confirm `part_variant_sizes` / `stock_items` still exist.
7. Confirm no NULL/empty `sku`.
8. Demonstrate `generate_product_sku()` with sample inputs.
9. Cross-check that `products_count == part_variant_sizes_count` for
   `1KZ PISTON`.

### Apply (manually)

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260526_stage_b1_products.sql
psql "$DATABASE_URL" -f supabase/seeds/seed_b1_1kz_products.sql
psql "$DATABASE_URL" -f supabase/checks/stage_b1_verify.sql
```

### Rollback

```bash
psql "$DATABASE_URL" -f supabase/rollbacks/20260526_stage_b1_products_rollback.sql
```

Drops only `products`, `sales_channels`, and the four B1 functions. Does
not touch Stage A or pre-existing tables.

**Applied state (after manual apply):** `products_count = 50`,
`pvs_count = 50` for `1KZ PISTON` — backfill complete and consistent
with `part_variant_sizes`.

---

## Stage B3 — media layer (media_assets + engine_media + product_media)

**Files:**
- `migrations/20260526_stage_b3_media.sql`
- `seeds/seed_b3_1kz_media.sql`
- `checks/stage_b3_verify.sql`
- `rollbacks/20260526_stage_b3_media_rollback.sql`

**Status:** Local files prepared. **Not applied** to Supabase yet.

### What B3 adds

- `media_assets` — canonical media table. Columns: `url` (UNIQUE for
  dedup), `storage_path`, `media_type` ∈
  (`image`,`pdf`,`video`,`doc`,`3d`), `mime_type`, `alt_text`, `width`,
  `height`, `bytes`, `sha256`, `source_id`, `confidence`, `is_active`,
  `created_at`, `updated_at`. CHECKs ensure non-negative dimensions.
- `engine_media` — link engine ↔ media. PK
  `(engine_code, media_id, role)`. `role` ∈
  (`catalog`,`schema`,`cross_section`,`photo`). Partial UNIQUE
  guarantees **at most one `role='catalog'`** per engine.
  `engine_code` is plain text (no FK to `engines`, composite-PK
  blocker — same convention as everywhere else).
- `product_media` — link product ↔ media. PK
  `(product_id, media_id, role)` with `ON DELETE CASCADE` on both
  sides. `role` ∈
  (`primary`,`gallery`,`spec_sheet`,`install_diagram`,`box`). Partial
  UNIQUE guarantees **at most one `role='primary'`** per product.
- `updated_at` trigger on `media_assets` via Stage A's
  `tg_touch_updated_at()`.

### What B3 does NOT do

- **Does not change the Astro site.** The site keeps the existing
  hardcoded `/teikin-catalog/{engine_code}.png` fallback in
  `[engine]/index.astro` and product pages. B3 just makes the media
  layer available in the DB; consuming it from Astro is a separate code
  change.
- **Does not add prices, content, or feed views.** Those are B2 / B4 /
  B6.
- **Does not add FK** `engine_media.engine_code → engines` (composite
  PK).
- **Does not seed media for other engines.** Only `1KZ` TEIKIN catalog
  image is seeded as a working reference example.
- **No GRANT / RLS / triggers on existing tables.**

### Seed (`seed_b3_1kz_media.sql`)

1. Inserts a single `media_assets` row for
   `https://my-avto.kz/teikin-catalog/1KZ.png` with
   `source_id = data_sources.code='teikin_catalog'`, `media_type='image'`,
   `mime_type='image/png'`, `confidence=1.00`.
2. Links it to `engine_code='1KZ'` as `role='catalog'`, `sort_order=0`.
3. Links it to every active `1KZ PISTON TEIKIN` product as
   `role='primary'`, `sort_order=0`.
4. All three INSERTs use `ON CONFLICT DO NOTHING` against the unique
   indexes (`uq_media_assets_url`, `uq_engine_media_one_catalog`,
   `uq_product_media_one_primary`, plus the PKs).

### Verify (`stage_b3_verify.sql`)

Seven read-only queries:

1. `media_assets` count broken down by `media_type` (+ total).
2. `engine_media` rows for `1KZ` (expect 1 catalog row).
3. `product_media` count for `1KZ` × `PISTON` × `TEIKIN` (should equal
   the number of active TEIKIN piston products for 1KZ).
4. 1KZ TEIKIN products with their resolved primary image URL.
5. Duplicate primary image per product — must return 0 rows.
6. Duplicate catalog image per engine — must return 0 rows.
7. Confirm `products` / `part_variant_sizes` / `stock_items` /
   `engines` still exist (untouched).

### Apply (manually)

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260526_stage_b3_media.sql
psql "$DATABASE_URL" -f supabase/seeds/seed_b3_1kz_media.sql
psql "$DATABASE_URL" -f supabase/checks/stage_b3_verify.sql
```

### Rollback

```bash
psql "$DATABASE_URL" -f supabase/rollbacks/20260526_stage_b3_media_rollback.sql
```

Drops `product_media`, `engine_media`, `media_assets` (FK-safe order).
Does not touch Stage A, B1, or pre-existing tables. The shared
`tg_touch_updated_at` (Stage A) is preserved.

### Site integration plan (deferred)

Once B3 is in production, the Astro site can start preferring
`engine_media.role='catalog'` and `product_media.role='primary'` URLs
over the hardcoded `/teikin-catalog/*.png` convention. The integration
will keep the file-path fallback so engines without a DB-side media row
continue to render correctly. **This change lives in `site/`, not in
SQL** — out of scope for B3.

---

## Stage C1 — catalog import staging layer

**Files:**
- `migrations/20260526_stage_c1_catalog_import_staging.sql`
- `seeds/seed_c1_import_sources.sql`
- `checks/stage_c1_verify.sql`
- `rollbacks/20260526_stage_c1_catalog_import_staging_rollback.sql`

**Status:** Local files prepared. **Not applied** to Supabase yet.

### Why C1 (staging) before any catalog parser runs

External data is messy. TEIKIN PDFs have OCR noise. Otoba.ru pages
change layout. AI extractions confidently mis-classify. Writing such
data straight into `engine_fitments`, `engine_part_numbers`,
`part_number_crosses` etc. would either:
- silently overwrite real curated rows, or
- fill the master DB with low-confidence noise that later contaminates
  every export (Kaspi, Ads, Telegram).

C1 introduces an **inbound staging layer**. Every external row lands
here first, gets normalized, gets reviewed, and only then is promoted
to a master table. The promotion step is **manual or workflow-driven** —
not part of C1 itself.

### Workflow

```
external source (Otoba.ru / PDF / CSV / AI)
    │
    ▼
catalog_import_batches      ← one row per file/run
    │
    ▼
catalog_import_rows         ← raw + normalized JSON per source row
    │      status: parsed → normalized → needs_review
    ▼
catalog_import_decisions    ← human/AI verdict per row
    │      decision: approve / reject / merge / skip / needs_manual_review
    ▼
import-to-master (out of scope for C1)
    │      writes to engine_fitments / engine_part_numbers /
    │      part_number_crosses / etc. using row.normalized_json
    ▼
catalog_import_rows.status = 'imported'
catalog_import_batches.status = 'imported' | 'partial_import'
```

`catalog_import_mappings` is the side table of rules — for each
`(source, import_type, source_field)` it declares which target
`(entity_type, field)` and what transform applies. The parser/importer
reads it instead of having hardcoded mappings.

### What C1 adds

- `catalog_import_batches` — one row per parser run / file. CHECKs on
  `import_type` (`otoba_fitment`, `teikin_pistons`, `npr_rings`,
  `kp_rings`, `taiho_bearings`, `supplier_csv`, `manual_excel`,
  `ai_extraction`, `other`) and `status` (12 values from `draft` to
  `archived`). Counters for parsed / normalized / approved / imported /
  failed. `meta_json jsonb` for arbitrary parser context (file hash,
  CLI args, etc.). FK to `data_sources` (required) and optional FK to
  `data_source_runs` (so the same staging batch can be tied to a
  provenance run).
- `catalog_import_rows` — staging rows. Carries `raw_text`, `raw_json`,
  `normalized_json`. Detected fields (`engine_code`, `category_code`,
  `part_number`, `brand_name`, `vehicle_make`, `vehicle_model`) are
  plain text — **no FK** because staging may hold values that don't
  yet resolve to a master row (whole point of normalization). UNIQUE
  on `(batch_id, row_number)` so re-running the same parser is
  idempotent. `category_code` is the only one with a FK because
  categories are a small fixed list.
- `catalog_import_decisions` — verdict per row (`approve`, `reject`,
  `merge`, `skip`, `needs_manual_review`). Records the target table /
  entity key / id once a decision is made. Multiple decisions per row
  are allowed (e.g. AI proposes `needs_manual_review`, human later
  `approve`s).
- `catalog_import_mappings` — declarative source-field → target-field
  rules with optional `transform_rule` (free-text DSL hint for the
  importer). UNIQUE on the full natural key
  `(source_id, import_type, source_field, target_entity_type,
  target_field)`.

All four tables have `tg_touch_updated_at` triggers where they have an
`updated_at` column. GIN indexes on `raw_json` / `normalized_json` for
JSONB filtering.

### What C1 does NOT do

- **Does NOT write to master tables.** Promotion from staging to
  `engine_fitments` / `engine_part_numbers` / `part_number_crosses` /
  `vehicle_models` / `vehicle_specs` is intentionally out of scope.
  It will be a separate stage (or a stored procedure / RPC) that reads
  approved staging rows and performs the upsert with full provenance.
- **Does not change existing master tables.** No `ADD COLUMN`, no new
  FK, nothing.
- **Does not auto-link to Stage A `data_source_links`.** The promotion
  step is responsible for writing the `data_source_links` row once a
  staging row is imported.
- **No parser code, no n8n flows, no AI prompts** — those live outside
  the DB. C1 is just the storage shape they target.
- **No GRANT / RLS.** Same posture as every other stage.

### Seed (`seed_c1_import_sources.sql`)

1. Asserts `otoba_ru` exists in `data_sources` (already seeded in
   Stage A; this is a defensive `ON CONFLICT DO NOTHING`).
2. Creates **one** test batch:
   `batch_code = '1kz_otoba_fitment_manual_test'`, `import_type =
   otoba_fitment`, `status = draft`, source = `otoba_ru`,
   `parser_name = manual`, `parser_version = v0`, with descriptive
   `meta_json`.
3. Inserts **3 sample staging rows** (`needs_review`, `confidence =
   0.70`) for Toyota 1KZ:
   - Land Cruiser Prado 120 / J120
   - Hilux Surf
   - Hiace

   Each row has `raw_text`, `raw_json` (what the future parser would
   capture) and `normalized_json` (with canonical `entity_key`
   matching the Stage A format `<engine>:<make>:<model-slug>[:<gen>]`).

These rows are **demonstration data**. They do not affect
`engine_fitments` — that's verified by check #6.

### Verify (`stage_c1_verify.sql`)

Nine read-only queries:

1. Four new C1 tables present in `public`.
2. `otoba_ru` data_source row.
3. The test batch with all counter columns.
4. The 3 staging rows with their `entity_key` extracted from
   `normalized_json`.
5. Status breakdown for rows in this batch (expect `needs_review = 3`).
6. **`engine_fitments` for 1KZ untouched** — count must still equal the
   8 fitments seeded by Stage A.
7. All prior-stage tables still exist.
8. No orphan decisions (sanity check on FK).
9. No orphan rows (sanity check on FK).

### Apply (manually)

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260526_stage_c1_catalog_import_staging.sql
psql "$DATABASE_URL" -f supabase/seeds/seed_c1_import_sources.sql
psql "$DATABASE_URL" -f supabase/checks/stage_c1_verify.sql
```

### Rollback

```bash
psql "$DATABASE_URL" -f supabase/rollbacks/20260526_stage_c1_catalog_import_staging_rollback.sql
```

Drops only the four C1 tables (decisions → rows → batches; mappings
independent). **Does not delete the `otoba_ru` data_source row** —
it's owned by Stage A and referenced elsewhere. Stage A / B1 / B3 /
pre-existing tables are untouched.

### Manual import: Otoba.ru parser rows → staging

**File:** `imports/insert_otoba_1kz_fitment_rows.sql`

Hand-curated SQL that takes the 7 rows produced by
`scripts/import/otoba_1kz_fitment_parser.ts` and UPSERTs them into
`public.catalog_import_rows` under the existing batch
`1kz_otoba_fitment_manual_test` (row_number 1..7).

What it does:

- Single `INSERT ... ON CONFLICT (batch_id, row_number) DO UPDATE`
  against the unique index `uq_catalog_import_rows_batch_row`, so it
  is **idempotent** — re-running overwrites the same 7 rows in place.
- Refuses to run if the batch is missing (raises an exception in a
  `DO $$ … $$` block before touching anything).
- Wrapped in a single `BEGIN / COMMIT` for atomicity.

**This is staging-only — it is not promotion.** No master table is
touched. The script ends with three verification queries:

1. row count in this batch (expect 7);
2. all 7 rows with model / generation / chassis / years / `entity_key`;
3. `engine_fitments` count for 1KZ stays at the Stage A baseline of 8.

If query #3 returns anything other than 8 after running this file,
**do not proceed to promotion** — something else mutated master.

How to apply (manually):

1. Open `supabase/imports/insert_otoba_1kz_fitment_rows.sql`.
2. Paste into Supabase SQL Editor.
3. Run. Read the three verification result sets.
4. Promotion to master (`engine_fitments`, `vehicle_models`,
   `data_source_links`) remains a separate, future step gated by
   `catalog_import_decisions`.

### C2 review / diff (read-only)

**File:** `reviews/review_otoba_1kz_fitment_diff.sql`

After Otoba parser rows land in staging, this read-only review SQL
compares them with the current `public.engine_fitments` +
`public.vehicle_models` for `engine_code='1KZ'` and emits three
buckets plus a summary:

| Bucket | Meaning | Recommendation per row |
|---|---|---|
| **MATCHED_BY_MODEL_CHASSIS** | Already in master (matched on lower-trim model + coalesce-equal generation + chassis). | Update `confidence → 0.90`, `notes → 'verified from otoba.ru'`, insert `data_source_links(otoba_ru, entity_key)`. |
| **OTOBA_ONLY** | In Otoba staging, missing from master. Likely new 4Runner generations and Hilux 6. | Create `vehicle_model` if missing; then create `engine_fitment` at `confidence=0.90, source=otoba_ru`. |
| **MASTER_ONLY** | In master, no corresponding Otoba row. Likely Granvia, Regius, Land Cruiser, Dyna/Toyoace. | Keep as `needs verification`; do not delete; search another source; `confidence` stays `0.70`. |

**SAFETY:** the file is strictly read-only.

- No `INSERT` / `UPDATE` / `DELETE` / `DROP` / `TRUNCATE` / `ALTER` /
  `GRANT` anywhere — only `WITH … SELECT …`.
- Safe to re-run as many times as you want.
- This is **not** promotion. After reviewing the three result sets, a
  separate promotion SQL (yet to be written) will perform the actual
  upserts into master, gated by `catalog_import_decisions`.

How to use:

1. Paste `supabase/reviews/review_otoba_1kz_fitment_diff.sql` into
   Supabase SQL Editor.
2. Run. Read all four result sets.
3. For each row in MATCHED / OTOBA_ONLY, decide approve / merge /
   skip.
4. Record decisions in `catalog_import_decisions` (manual UPSERT —
   not part of this review file).
5. Only after that, prepare a promotion SQL that writes to
   `engine_fitments` / `vehicle_models` / `data_source_links`.

### C2 promotion (Otoba → master, 1KZ)

**Files:**
- `promotions/promote_otoba_1kz_fitments.sql`
- `promotions/promote_otoba_1kz_fitments_rollback.sql`

After the review file confirms the diff
(`matched_count=2`, `otoba_only_count=5`, `master_only_count=6`,
`engine_fitments(1KZ)=8`), promotion takes the 7 staging rows and
writes them to master:

| Step | Action |
|------|--------|
| 1 | Sanity checks (batch exists, staging_count=7, fitments_before=8) — `RAISE EXCEPTION` on mismatch. |
| 2 | Insert 5 missing `vehicle_models` for OTOBA_ONLY (4Runner ×3, Hilux 6, HiAce 4). `year_from`/`year_to` from Otoba. ON CONFLICT DO NOTHING. |
| 3 | Resolve `vehicle_model_id` per staging row. |
| 4 | Resolve `existing_fitment_id` (per `(engine_code, vehicle_model_id)`) — independent of year window so Stage A NULL-year fitments are recognized. |
| 5 | MATCHED: `UPDATE engine_fitments` for the 2 Prado fitments — set years from Otoba, `confidence=0.90`, `notes='verified from otoba.ru'`, `source_id=otoba_ru`. |
| 6 | OTOBA_ONLY: `INSERT engine_fitments` for the 5 new ones. ON CONFLICT DO NOTHING. |
| 7 | `INSERT data_source_links` (source=`otoba_ru`, `entity_key` from `normalized_json`) for all 7 rows. ON CONFLICT DO UPDATE on `raw_text`/`raw_json`/`confidence`/`source_url`. |

**Expected outcome:** `engine_fitments(1KZ)` goes from **8 → 13**.

**MASTER_ONLY rows are NOT deleted.** Granvia, Regius, Land Cruiser,
Dyna/Toyoace, plus the Stage A "Hiace"/"Hilux Surf" rows with NULL
generation/chassis stay at `confidence=0.70` with the original
`needs verification` note. The final SELECT in the promotion file
lists them under "master_only rows that still need verification" for
follow-up via a different source (TEIKIN catalog, dealer EPC, …).

**Safety inside the promotion file:**

- BEGIN/COMMIT transaction wrapping the whole operation.
- Hard sanity checks via `DO $$ … $$` before any write.
- Uses only the existing unique indexes; no schema changes, no GRANT,
  no RLS, no DROP/DELETE/TRUNCATE.
- Reads only staging rows with `status IN ('normalized','approved')`.
- TEMP table (`tmp_promo_rows`, `ON COMMIT DROP`) so nothing leaks
  out of the transaction.

**Rollback** (`promote_otoba_1kz_fitments_rollback.sql`):

- Deletes `data_source_links` from `otoba_ru` for `entity_key LIKE '1KZ:%'`.
- Deletes the 5 new `engine_fitments` — filtered by
  `source_id=otoba_ru AND notes='verified from otoba.ru' AND
  vehicle_model_id IN <set of created models>`. Manually-edited rows
  are left alone.
- Deletes the 5 created `vehicle_models` only when no other fitment
  references them.
- Reverts the 2 Prado fitments to Stage A baseline (`confidence=0.70`,
  `notes='needs verification until otoba.ru parsed'`, `source_id=manual_myavto`,
  `year_from=NULL`, `year_to=NULL`) — only if they still carry the
  Otoba promotion marker.

**Rollback does NOT** delete Stage A seed data, drop any table, or
touch master_only rows / staging / decisions / batch.

How to apply:

1. Re-run `reviews/review_otoba_1kz_fitment_diff.sql`. Confirm the
   counts.
2. Open `promotions/promote_otoba_1kz_fitments.sql` in Supabase SQL
   Editor.
3. Execute. Read the four verification result sets at the bottom.
4. If `engine_fitments_1kz_after = 13` and the listing looks correct,
   you're done.
5. If anything is wrong, run
   `promotions/promote_otoba_1kz_fitments_rollback.sql` to restore the
   pre-promotion state.

### First real use after apply

The first end-to-end pipeline through C1 will be the **Otoba.ru
fitment verification** for 1KZ:

1. Write a small parser (n8n or Node script) that fetches Otoba.ru
   pages for engine `1KZ`.
2. Insert one `catalog_import_batches` row + N `catalog_import_rows`
   (one per detected vehicle model).
3. Manually review rows; set decisions in `catalog_import_decisions`.
4. Run a promotion script that, for each `approve`d row, upserts into
   `engine_fitments` / `vehicle_models` and writes a
   `data_source_links` provenance row.
5. Update the 8 Stage-A `engine_fitments` rows from `confidence = 0.70
   needs verification` → `confidence ≥ 0.95` (verified by otoba.ru).

The same shape is then reused for TEIKIN/NPR/KP/Taiho catalogs with
`import_type = teikin_pistons` / `npr_rings` / `kp_rings` /
`taiho_bearings` and target tables `engine_part_numbers`,
`engine_part_attribute_values`, `part_number_crosses`.

---

## Future Stage B sub-stages (design from earlier — not yet built)

Stage A and B1 are in production. B3 prepared. Remaining sub-stages
are still design-only:

### Remaining sub-stages

(`products` is in B1, media is in B3; the items below are the rest.)

1. **`prices`** — multi-channel with validity windows.
   - `id`, `product_id → products(id)`, `channel_code →
     sales_channels(code)`, `currency` (default `KZT`),
     `price numeric(12,2)`, `valid_from`, `valid_to`, `source_id`,
     `confidence`, `is_active`.
   - Unique on `(product_id, channel_code, COALESCE(valid_from, …))`
     so a given channel has at most one active price at any moment.
   - `purchase_price` stays in `part_variant_sizes` (existing).
     `prices` is for **sale** prices.

2. **`product_content` / `engine_content`** — multi-locale, per-channel.
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

1. `B1` — `sales_channels` + `products` (stable SKU) + backfill from
   `part_variant_sizes`. ✅ **Applied** (`products_count = 50`).
2. `B2` — `prices` (empty; populated later by n8n or manual).
3. `B3` — `media_assets`, `product_media`, `engine_media` + seed for
   1KZ TEIKIN catalog image. ✅ **Applied.**
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
