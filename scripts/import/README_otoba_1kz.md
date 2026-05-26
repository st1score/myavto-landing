# Otoba.ru → catalog_import_rows parser (Toyota 1KZ)

Local parser that reads an Otoba **engine page** (not a car page) and
extracts:

- engine metadata (alias, displacement, fuel, layout, bore, stroke,
  compression, timing drive, turbo);
- the fitment list under heading "На какие автомобили ставился
  двигатель …" — one staging row per car model line.

The output JSON shape matches `public.catalog_import_rows` (Stage C1).
This script **does not connect to Supabase** and does not write to
`engine_fitments` or any master table. All output is in `tmp/`.

---

## Files

| File                              | Purpose |
|-----------------------------------|---------|
| `otoba_1kz_fitment_parser.ts`     | Parser script (TypeScript, run with `tsx`) |
| `otoba_1kz_urls.example.json`     | Example config — copy to `otoba_1kz_urls.json` |
| `README_otoba_1kz.md`             | This file |

Outputs (created on first run, under repo root):

```
tmp/otoba_1kz_fitment_rows.json    ← engine_metadata + flat row list (catalog_import_rows shape)
tmp/otoba_1kz_fitment_rows.csv     ← fitment rows, flat
tmp/otoba_pages/<slug>.html        ← raw HTML cache per URL
```

---

## How to run

Node ≥ 18 (built-in `fetch`) + `tsx`.

### Quick start with the real 1KZ-TE page

```bash
npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
  https://otoba.ru/dvigatel/toyota/1kz-te.html
```

### Flags

- `--debug` — prints the fitment table caption, inner length, the first
  1000 characters of the table HTML, and the number of parsed rows.
- `--use-cache` — re-parse `tmp/otoba_pages/<slug>.html` instead of
  re-fetching. Useful after the first successful run when you're
  iterating on selectors.

```bash
# Run against cached HTML with debug output
cd site
npx tsx ../scripts/import/otoba_1kz_fitment_parser.ts \
  --use-cache --debug \
  --config ../scripts/import/otoba_1kz_urls.example.json
cd ..
```

### Or via JSON config

```bash
cp scripts/import/otoba_1kz_urls.example.json scripts/import/otoba_1kz_urls.json
# (the example already points at the 1KZ-TE engine page)

npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
  --config scripts/import/otoba_1kz_urls.json
```

### Expected result for the 1KZ-TE page

**7 fitment rows** total, one per car:

| # | model_name           | gen | chassis | year_from | year_to |
|---|----------------------|-----|---------|-----------|---------|
| 1 | Land Cruiser Prado   | 90  | J90     | 1996      | 2002    |
| 2 | Land Cruiser Prado   | 120 | J120    | 2002      | 2006    |
| 3 | 4Runner              | 2   | N120    | 1993      | 1995    |
| 4 | 4Runner              | 3   | N180    | 1995      | 2002    |
| 5 | 4Runner              | 4   | N210    | 2002      | 2006    |
| 6 | Hilux                | 6   | N140    | 1997      | 2002    |
| 7 | HiAce                | 4   | H100    | 1993      | 2004    |

Each row:

- `engine_code = "1KZ"`, `engine_alias = "1KZ-TE"`
- `vehicle_make = "Toyota"`
- `detected_entity_type = "engine_fitment"`
- `confidence = 0.90` (`0.85` when `year_to` is open-ended)
- `status = "normalized"`
- `source_url = "https://otoba.ru/dvigatel/toyota/1kz-te.html"`
- `raw_text` = the original page line (e.g. `Toyota LC Prado 90 (J90), 1996 - 2002`)
- `normalized_json.source = "otoba_ru"`
- `normalized_json.entity_key = "1KZ:toyota:<model-slug>:<generation>"`

The top-level JSON also contains `pages[].engine_metadata` with the
extracted engine specs (displacement, fuel, layout, valves, bore,
stroke, compression, timing drive, turbo).

---

## Model-name normalization

The page uses short labels like `LC Prado`. The parser maps them to
canonical names that already exist in `public.vehicle_models`:

| On-page label   | Canonical `vehicle_model` |
|-----------------|---------------------------|
| `LC Prado`      | `Land Cruiser Prado`      |
| `Land Cruiser`  | `Land Cruiser`            |
| `4Runner`       | `4Runner`                 |
| `Hilux`         | `Hilux`                   |
| `Hilux Surf`    | `Hilux Surf`              |
| `HiAce` / `Hiace` | `HiAce`                 |
| `Granvia`       | `Granvia`                 |
| `Regius`        | `Regius`                  |
| `Dyna`          | `Dyna / Toyoace`          |

The normalization map lives in `MODEL_NORMALIZATION` near the top of the
script — extend it when new labels appear.

---

## How to inspect the output

```bash
# All rows
jq '.rows' tmp/otoba_1kz_fitment_rows.json

# Engine metadata
jq '.pages[0].engine_metadata' tmp/otoba_1kz_fitment_rows.json

# Just normalized fields
jq '.rows[] | {model: .vehicle_model, gen: .normalized_json.generation, chassis: .normalized_json.chassis_code, yf: .normalized_json.year_from, yt: .normalized_json.year_to, conf: .confidence}' tmp/otoba_1kz_fitment_rows.json

# CSV view
column -s, -t < tmp/otoba_1kz_fitment_rows.csv | less -S
```

---

## What happens next (manual / future steps)

The parser does NOT write anything to Supabase. After you've reviewed
`tmp/otoba_1kz_fitment_rows.json`:

1. **Discard rows that look wrong** (e.g. model not yet in our list, or
   chassis code doesn't match what you expect).
2. **Insert the survivors into `public.catalog_import_rows`** under the
   existing Stage C1 batch
   (`batch_code = '1kz_otoba_fitment_manual_test'`) or create a new
   `otoba_fitment` batch. The JSON keys already match the columns —
   only `batch_id` and `row_number` need to be supplied.
3. **Set verdicts in `catalog_import_decisions`.** Most rows here will
   be `approve` because Otoba is the chosen primary source for
   fitments.
4. **Promote `approve`d rows to master** (separate, future step):
   - upsert `vehicle_models` on the natural key,
   - upsert `engine_fitments` (`confidence` rises from Stage A's `0.70`
     to `≥ 0.90`),
   - insert `data_source_links` with `source_id = otoba_ru` and the
     row's `entity_key`,
   - optionally upsert `engine_aliases` for `1KZ-TE` and
     `vehicle_model_aliases` for chassis codes (`J90`, `J120`,
     `N120`, …) seen on the page.
5. Keep `tmp/otoba_pages/*.html` until promotion is complete — that's
   the raw evidence behind every confidence number.

---

## Safety guarantees

- No Supabase / database connection in this script. It imports nothing
  from `pg` / `@supabase/*`.
- No writes to `engine_fitments` or any master table.
- The script only writes to `tmp/` (gitignored).
- No use of `process.env.DATABASE_URL`.
- Polite `User-Agent` with a contact email; 1.2 s delay between
  requests.
- Raw HTML is cached so re-parsing does not require re-fetching.

---

## Adapting this script for TEIKIN / NPR / KP / Taiho

All source-specific knowledge is concentrated at the top of the file:

- `OTOBA_SELECTORS` — heading detector for the fitment block.
- `OTOBA_PATTERNS` — regex for engine alias, engine metadata, fitment
  line.
- `MODEL_NORMALIZATION` — on-page label → canonical model name.
- `ENGINE_ALIASES_TO_CANONICAL` — `1KZ-TE` → `1KZ`.

Clone the file (e.g. `teikin_pistons_parser.ts`), replace those four
blocks and the output filenames, keep the rest. The pipeline shape
(fetch → cache HTML → extract → emit `catalog_import_rows`-compatible
JSON) is reusable.
