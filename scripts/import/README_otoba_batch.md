# Otoba.ru → master DB — batch pipeline

End-to-end pipeline that scales the proven 1KZ flow (parse → stage →
review → promote) to **every engine** listed in
`scripts/import/otoba_engines.json`.

All four steps **are local + manual**:

1. The parser writes JSON/CSV/HTML to `tmp/otoba/`.
2. The SQL generators produce reviewable SQL files in `supabase/`.
3. You paste those SQL files into the Supabase SQL Editor when ready.

Nothing in this folder connects to Supabase or executes SQL.

---

## Files

| File | Role |
|---|---|
| `otoba_engines.example.json`         | Copy to `otoba_engines.json` and list the engines you want to pull. |
| `otoba_fitment_batch_parser.ts`      | Parse step — fetches each Otoba engine page, extracts fitment table + engine metadata. |
| `generate_otoba_staging_sql.ts`      | Stage SQL generator — turns parser output into a single C1 staging import file. |
| `generate_otoba_promotion_sql.ts`    | Promotion SQL generator — turns parser output into a single C2 promotion file. |
| `README_otoba_batch.md`              | This file. |

Outputs:

```
tmp/otoba/<engine_code>/raw.html
tmp/otoba/<engine_code>/fitment_rows.json
tmp/otoba/<engine_code>/fitment_rows.csv
tmp/otoba/index.json

supabase/imports/generated/otoba_staging_import.sql
supabase/promotions/generated/otoba_promote_fitments.sql
```

`tmp/` is gitignored. The two generated SQL files in `supabase/` can be
committed once you've reviewed them.

---

## End-to-end workflow

```
otoba_engines.json
       │
       ▼
[1] otoba_fitment_batch_parser.ts
       │
       ▼
tmp/otoba/<engine>/fitment_rows.json    (one folder per engine)
       │
       ├──► [2] generate_otoba_staging_sql.ts
       │             │
       │             ▼
       │     supabase/imports/generated/otoba_staging_import.sql
       │             │  (paste in Supabase SQL Editor)
       │             ▼
       │     public.catalog_import_batches + catalog_import_rows
       │             │
       │             ▼
       │   [REVIEW] manual: read C1 staging, decide approve/reject
       │
       └──► [3] generate_otoba_promotion_sql.ts
                     │
                     ▼
             supabase/promotions/generated/otoba_promote_fitments.sql
                     │  (paste in Supabase SQL Editor)
                     ▼
             public.vehicle_models  (insert if missing)
             public.engine_fitments (update matched / insert new)
             public.data_source_links (upsert one per row)
```

---

## Step 1 — parse

```bash
cp scripts/import/otoba_engines.example.json scripts/import/otoba_engines.json
# edit otoba_engines.json — add/remove engines you want to pull

cd site
npx tsx ../scripts/import/otoba_fitment_batch_parser.ts \
  --config ../scripts/import/otoba_engines.json
cd ..
```

Flags:

- `--debug` — print the fitment table caption + length + match count per engine.
- `--use-cache` — re-parse `tmp/otoba/<engine>/raw.html` without hitting the network.
- `--only 1KZ` — restrict to one engine (repeatable: `--only 1KZ --only 2JZ`).

Output per engine:

```
tmp/otoba/<engine_code>/
├── raw.html              ← cached Otoba page
├── fitment_rows.json     ← shaped exactly like public.catalog_import_rows
└── fitment_rows.csv      ← flat table for eyeballing
```

Plus `tmp/otoba/index.json` summarizing all engines (counts, errors,
extracted engine_metadata).

Verify before going further:

```bash
jq '.engines[] | {engine_code, ok, rows_count, error}' tmp/otoba/index.json
```

Drop engines with `rows_count = 0` or `error` set from your config and
re-run the parser before generating SQL.

---

## Step 2 — generate staging SQL

```bash
cd site
npx tsx ../scripts/import/generate_otoba_staging_sql.ts
cd ..
```

Writes `supabase/imports/generated/otoba_staging_import.sql`.

What the generated SQL does (read it first!):

- Wrapped in `BEGIN; … COMMIT;`.
- Defensive `INSERT … ON CONFLICT DO NOTHING` on `data_sources` for
  `otoba_ru` (no-op if Stage A seed already exists).
- One `catalog_import_batches` UPSERT per engine, with
  `batch_code = '<engine_lower>_otoba_fitment_<YYYYMMDD>'`,
  `import_type='otoba_fitment'`, `status='normalized'`, source
  `otoba_ru`, `meta_json` containing engine code / alias / brand.
- One `catalog_import_rows` UPSERT block per engine — all rows for
  that engine inserted as `(VALUES …)`, with `ON CONFLICT
  (batch_id, row_number) DO UPDATE` so it's idempotent.
- Final `SELECT` listing each batch with row counts.

Writes only:

- `public.data_sources`
- `public.catalog_import_batches`
- `public.catalog_import_rows`

No master tables touched.

Apply manually:

1. Open `supabase/imports/generated/otoba_staging_import.sql`.
2. Paste into Supabase SQL Editor and run.
3. Check the final summary `SELECT`.

---

## Step 3 — review (manual, recommended)

Re-use the 1KZ pattern. For each engine_code, run a diff query against
the new batch (extending `supabase/reviews/review_otoba_1kz_fitment_diff.sql`
to take a parameterized batch). At minimum:

- Confirm `engine_fitments(<engine>)` count before promotion.
- Confirm staging row counts match what the parser produced.
- Spot-check OTOBA_ONLY rows — are the new chassis codes / years
  reasonable?

Promotion will not be undone automatically. **If a row looks wrong,
update it in `catalog_import_rows` or rerun the parser and stager
before promoting.**

---

## Step 4 — generate promotion SQL

```bash
cd site
npx tsx ../scripts/import/generate_otoba_promotion_sql.ts
cd ..
```

Writes `supabase/promotions/generated/otoba_promote_fitments.sql`.

What the generated SQL does:

- Sanity check: `data_sources.otoba_ru` must exist
  (`RAISE EXCEPTION` otherwise).
- Builds one TEMP table `tmp_promo_rows ON COMMIT DROP` holding every
  parsed row across every engine, with extra columns
  `vehicle_model_id` and `existing_fitment_id` filled in by later
  steps.
- Ensures `vehicle_makes` row exists for each brand
  (idempotent).
- INSERTs missing `vehicle_models` (DISTINCT, ON CONFLICT DO NOTHING).
- Resolves `vehicle_model_id` per row using lower/trim model + COALESCE
  generation/chassis — same matcher as the C2 review.
- Resolves `existing_fitment_id` per `(engine_code, vehicle_model_id)`,
  independent of year window.
- MATCHED → `UPDATE engine_fitments SET confidence=0.90,
  notes='verified from otoba.ru', source_id=otoba_ru, year_from,
  year_to`.
- OTOBA_ONLY → `INSERT engine_fitments` with `ON CONFLICT DO NOTHING`.
- UPSERT one `data_source_links` row per parsed row
  (`entity_type='engine_fitment'`, `entity_key` from
  `normalized_json`, source = `otoba_ru`, `raw_text`, `raw_json`,
  `confidence=0.90`). Conflict target mirrors
  `uq_data_source_links_dedup` from Stage A.
- All wrapped in `BEGIN; … COMMIT;`.
- Final summary `SELECT`s, one row per `engine_code`:
  `fitments_total`, `verified_otoba`, `needs_verification`. Plus a
  full listing of all current `engine_fitments` per engine + all
  `data_source_links` from `otoba_ru` for these engines.

Writes only:

- `public.vehicle_models` (INSERT)
- `public.engine_fitments` (UPDATE matched, INSERT new)
- `public.data_source_links` (UPSERT)

**Master-only fitments are NOT deleted.** Anything in the DB that
Otoba didn't produce a row for stays exactly as it was, at the same
`confidence` and `notes`.

No DELETE / DROP / TRUNCATE / ALTER / GRANT / RLS anywhere in the
generated file. No changes to engines, products, part_*, stock_items,
brands, part_categories, sales_channels, media_*, or any
`catalog_import_*` table.

Apply manually:

1. Open `supabase/promotions/generated/otoba_promote_fitments.sql`.
2. Paste into Supabase SQL Editor and run.
3. Read the per-engine summary at the bottom.

---

## What's not in this batch yet

- **Per-batch review SQL generator.** Today the review file is
  hand-written for 1KZ. Extending it to loop over all engines via a
  parameter table is the next step.
- **Engine-metadata promotion.** The parser extracts displacement /
  fuel / layout / bore / stroke / compression / timing / turbo into
  `engine_metadata`, but the SQL generators do not yet write that to
  `engines` (because `engines` is composite-PK and we still consider
  it owner-curated). Decision pending.
- **Aliases.** `engine_aliases` and `vehicle_model_aliases` are not
  populated by these scripts. The 1KZ aliases were added in Stage A
  seed; for other engines we'd add a parallel `generate_otoba_aliases_sql.ts`.

---

## Safety guarantees

- None of the four scripts imports `pg` / `@supabase/*` /
  `DATABASE_URL`. They only read/write local files.
- Polite User-Agent + 1.2s delay between requests in the parser.
- All generated SQL files are wrapped in `BEGIN; … COMMIT;` and do
  not contain DELETE / DROP / TRUNCATE / ALTER / GRANT / POLICY.
- Both generated files are idempotent — re-running them upserts
  instead of duplicating.
- The promotion file is keyed by `source_id=otoba_ru` for safe future
  rollback (mirror the 1KZ rollback in
  `supabase/promotions/promote_otoba_1kz_fitments_rollback.sql`).
