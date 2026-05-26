# Otoba.ru → catalog_import_rows parser (Toyota 1KZ)

Local parser that fetches Otoba.ru pages, extracts engine/vehicle
fitment fields, and writes a JSON/CSV that **matches the shape of
`public.catalog_import_rows`**.

It is intentionally **read-only against the master DB**:

- it does NOT connect to Supabase
- it does NOT write to `engine_fitments`, `vehicle_models`,
  `data_source_links` or any other table
- it only produces local files for human review

The output is the input for a follow-up SQL step that inserts the
reviewed rows into `public.catalog_import_rows` (Stage C1 staging),
where they then go through `approve/reject` decisions before any
master-table change.

---

## Files

| File | Purpose |
|---|---|
| `otoba_1kz_fitment_parser.ts`  | The parser script (TypeScript) |
| `otoba_1kz_urls.example.json`  | Example URL config — copy to `otoba_1kz_urls.json` and edit |
| `README_otoba_1kz.md`          | This file |

Outputs (created on first run, under repo root):

```
tmp/otoba_1kz_fitment_rows.json   ← shaped like catalog_import_rows
tmp/otoba_1kz_fitment_rows.csv    ← same data, human-friendly
tmp/otoba_pages/<slug>.html       ← cached raw HTML per URL
```

`tmp/` is already covered by the project `.gitignore` pattern; if not,
add it before the first run.

---

## How to run

The script uses Node ≥ 18 (built-in `fetch`) and is written for `tsx`.

### One-off URLs from CLI

```bash
npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
  https://otoba.ru/cars/toyota/land-cruiser-prado/120/ \
  https://otoba.ru/cars/toyota/hilux-surf/
```

### Batch from JSON config

```bash
cp scripts/import/otoba_1kz_urls.example.json scripts/import/otoba_1kz_urls.json
# edit the urls list in otoba_1kz_urls.json

npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
  --config scripts/import/otoba_1kz_urls.json
```

### Optional: install `cheerio` for better parsing

The script tries to `import('cheerio')`. If it's available, parsing uses
the CSS selectors in `OTOBA_SELECTORS` and emits rows at `confidence ≈
0.80`. Without `cheerio` the script falls back to regex over the
stripped HTML and emits at `confidence ≈ 0.55`.

```bash
# inside whichever package.json you'd like (root or site/)
npm i -D cheerio
```

---

## How to inspect the output

```bash
# Pretty-print the staging rows
jq . tmp/otoba_1kz_fitment_rows.json

# Quick eyeball in CSV
column -s, -t < tmp/otoba_1kz_fitment_rows.csv | less -S

# Re-parse a cached page without hitting the network again
ls tmp/otoba_pages/
```

Each entry in the JSON matches the columns of
`public.catalog_import_rows`:

```jsonc
{
  "row_number": 1,
  "source_url": "https://otoba.ru/cars/toyota/land-cruiser-prado/120/",
  "raw_text": "...trimmed body text...",
  "raw_json": {
    "engine_text":   "1KZ-TE",
    "model_text":    "Land Cruiser Prado",
    "generation":    "120",
    "chassis_code":  "J120",
    "year_from_raw": 2002,
    "year_to_raw":   2009
  },
  "normalized_json": {
    "engine_code":   "1KZ",
    "vehicle_make":  "Toyota",
    "vehicle_model": "Land Cruiser Prado",
    "generation":    "120",
    "chassis_code":  "J120",
    "year_from":     2002,
    "year_to":       2009,
    "entity_key":    "1KZ:toyota:land-cruiser-prado:120",
    "needs_verification": false
  },
  "detected_entity_type": "engine_fitment",
  "engine_code":   "1KZ",
  "vehicle_make":  "Toyota",
  "vehicle_model": "Land Cruiser Prado",
  "confidence":    0.80,
  "status":        "normalized"
}
```

`entity_key` follows the canonical Stage A format
`<engine>:<make>:<model-slug>[:<generation>]` so it lines up with
`data_source_links.entity_key` later.

---

## What happens next (manual / future steps)

The parser does NOT write anything to Supabase. After you've inspected
`tmp/otoba_1kz_fitment_rows.json` and the CSV:

1. **Decide which rows are good enough to stage.** Drop or fix any
   row where `engine_code` mismatched, `vehicle_model` looks wrong,
   or `confidence` is below your threshold.
2. **Prepare a SQL insert into `public.catalog_import_rows`.** Use
   the batch already seeded by Stage C1
   (`batch_code = '1kz_otoba_fitment_manual_test'`) — or create a new
   batch with `import_type = 'otoba_fitment'` first, then insert the
   rows referencing that `batch_id`. All staging rows should land
   with `status = 'normalized'` or `'needs_review'`.
3. **Human review** in Supabase: set each row's verdict via
   `catalog_import_decisions` (`approve` / `reject` / `merge`).
4. **Promote approved rows to master.** This is a separate, future
   step — not part of C1. It will:
   - upsert into `vehicle_models` (with `ON CONFLICT DO NOTHING` on
     the natural key),
   - upsert into `engine_fitments` (raising `confidence` from the
     Stage A seed value of `0.70` to whatever Otoba.ru verified),
   - write a row into `data_source_links` with `source_id = otoba_ru`
     and `entity_key = normalized_json.entity_key`.
5. Keep `tmp/otoba_pages/*.html` until the promotion is complete —
   that's the raw evidence behind every confidence number.

---

## TODO before first real run

Open one real Otoba.ru page in the browser, inspect the markup, then
update the `OTOBA_SELECTORS` and `OTOBA_PATTERNS` blocks at the top of
`otoba_1kz_fitment_parser.ts`. The current values are placeholders —
they may extract nothing on the live site.

The script is structured so that all source-specific knowledge sits in
those two blocks; the same file can be copied as
`teikin_pistons_parser.ts`, `npr_rings_parser.ts`, etc. and only the
two blocks (plus output filenames) need to change.

---

## Safety guarantees

- No Supabase / database connection in this script. It imports nothing
  from `pg` / `@supabase/*`.
- No writes to `engine_fitments` or any master table — even indirectly.
  The script only writes to `tmp/`.
- No use of `process.env.DATABASE_URL`.
- A polite `User-Agent` and a 1.2s delay between requests to avoid
  hammering otoba.ru.
- Raw HTML is cached so re-parsing does not require re-fetching.
