/**
 * Otoba.ru engine-fitment parser for Toyota 1KZ.
 *
 * Reads a list of Otoba.ru URLs (CLI args or --config <path>.json),
 * downloads each page, extracts engine/vehicle fitment fields, and
 * writes the result to:
 *
 *   tmp/otoba_1kz_fitment_rows.json
 *   tmp/otoba_1kz_fitment_rows.csv
 *   tmp/otoba_pages/<slug>.html   (raw HTML for offline re-parsing)
 *
 * IT DOES NOT WRITE TO SUPABASE. The JSON output is shaped so it can
 * later be INSERT-ed into public.catalog_import_rows by a separate,
 * reviewable SQL step.
 *
 * Run:
 *   npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
 *     https://otoba.ru/cars/toyota/land-cruiser-prado/120/ \
 *     https://otoba.ru/cars/toyota/hilux-surf/
 *
 *   # or
 *   npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
 *     --config scripts/import/otoba_1kz_urls.json
 *
 * Optional deps: `cheerio` for HTML parsing. If not installed, the
 * script falls back to regex-based extraction (lower confidence).
 *
 * TODO before first real run:
 *   - Open one real Otoba.ru page in the browser.
 *   - Inspect the markup that holds engine / model / generation /
 *     chassis_code / years.
 *   - Update the OTOBA_SELECTORS / OTOBA_PATTERNS block below.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

// ---------------------------------------------------------------------
// Output shape — mirrors public.catalog_import_rows columns
// ---------------------------------------------------------------------
type StagingRow = {
  row_number: number;
  source_url: string;
  source_page: string | null;
  raw_text: string;
  raw_json: Record<string, unknown>;
  normalized_json: {
    engine_code: string;
    vehicle_make: string;
    vehicle_model: string;
    generation: string | null;
    chassis_code: string | null;
    year_from: number | null;
    year_to: number | null;
    entity_key: string;
    needs_verification: boolean;
  };
  detected_entity_type: 'engine_fitment';
  engine_code: string;
  vehicle_make: string;
  vehicle_model: string;
  confidence: number;
  status: 'parsed' | 'normalized' | 'needs_review';
  error_text: string | null;
};

// ---------------------------------------------------------------------
// MODULE: Otoba.ru selectors + patterns
// TODO: update after inspecting a real Otoba.ru page.
// Keep all source-specific knowledge here so other sources (TEIKIN,
// NPR, …) can copy this file and only swap this block.
// ---------------------------------------------------------------------
const OTOBA_SELECTORS = {
  // Cheerio-style selectors. Used only if cheerio is installed.
  // PLACEHOLDERS — verify against real markup before running.
  pageTitle:    'h1',
  modelName:    'h1, .car-model-name',
  generation:   '.generation, .car-generation',
  chassisCode:  '.chassis-code, .car-chassis',
  yearRange:    '.years, .production-years',
  engineBlock:  '.engines li, .car-engine',
  // Often Otoba lists multiple engines per model. We filter for 1KZ.
};

const OTOBA_PATTERNS = {
  engineCode:   /\b(1\s*KZ(?:[-\s]?TE)?)\b/i,
  // Year range like "1996 - 2002" or "1996–2002" or "1996-н.в."
  yearRange:    /(\d{4})\s*[-–—]\s*(\d{4}|н\.?\s*в\.?|сейчас)/i,
  // Chassis code: J90, J120, KZJ120, KZN185, …
  chassisCode:  /\b([A-Z]{1,4}\d{2,3}[A-Z]?)\b/,
  // Generation like "120", "J90"
  generation:   /\b(?:Gen|поколение|gen)\s*:?\s*([\dA-Z]+)/i,
};

// ---------------------------------------------------------------------
// Engine code normalization — matches Stage A engine_aliases policy.
// alias_norm = uppercase + [A-Z0-9] only.
// ---------------------------------------------------------------------
function normalizeAlias(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

const ENGINE_ALIASES_TO_CANONICAL: Record<string, string> = {
  '1KZ':   '1KZ',
  '1KZTE': '1KZ', // 1KZ-TE → canonical 1KZ
};

function normalizeEngineCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const norm = normalizeAlias(raw);
  return ENGINE_ALIASES_TO_CANONICAL[norm] ?? null;
}

// ---------------------------------------------------------------------
// Slug helper — must match Stage A entity_key format
//   <engine>:<make>:<model-slug>[:<generation>]
// ---------------------------------------------------------------------
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildEntityKey(
  engineCode: string,
  make: string,
  model: string,
  generation: string | null,
): string {
  const parts = [engineCode, slugify(make), slugify(model)];
  if (generation) parts.push(slugify(generation));
  return parts.join(':');
}

// ---------------------------------------------------------------------
// HTML fetching — honor a polite User-Agent + small delay
// ---------------------------------------------------------------------
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'MyAvtoFitmentBot/0.1 (+contact: trachuksemen@gmail.com; respect robots)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru,en;q=0.7',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

// ---------------------------------------------------------------------
// Cheerio loader — optional dependency
// ---------------------------------------------------------------------
type CheerioAPI = unknown;
async function tryLoadCheerio(): Promise<((html: string) => any) | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = await import('cheerio');
    return (html: string) => (mod as any).load(html);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Extraction — two paths: cheerio (preferred) and regex fallback
// ---------------------------------------------------------------------
type Extracted = {
  engine_code: string | null;
  vehicle_model: string | null;
  generation: string | null;
  chassis_code: string | null;
  year_from: number | null;
  year_to: number | null;
  raw_text: string;
  confidence: number;
};

function extractWithCheerio(html: string, $: any): Extracted {
  const text = ($('body').text() || '').replace(/\s+/g, ' ').trim();

  const titleText = $(OTOBA_SELECTORS.pageTitle).first().text().trim();
  const modelText = $(OTOBA_SELECTORS.modelName).first().text().trim() || titleText;
  const genText   = $(OTOBA_SELECTORS.generation).first().text().trim();
  const chassisTx = $(OTOBA_SELECTORS.chassisCode).first().text().trim();
  const yearsTx   = $(OTOBA_SELECTORS.yearRange).first().text().trim();
  const engineTx  = $(OTOBA_SELECTORS.engineBlock).text();

  const engineMatch  = (engineTx + ' ' + text).match(OTOBA_PATTERNS.engineCode);
  const chassisMatch = (chassisTx || text).match(OTOBA_PATTERNS.chassisCode);
  const yearsMatch   = (yearsTx   || text).match(OTOBA_PATTERNS.yearRange);

  const yearFrom = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
  const yearToRaw = yearsMatch ? yearsMatch[2] : null;
  const yearTo = yearToRaw && /^\d{4}$/.test(yearToRaw) ? parseInt(yearToRaw, 10) : null;

  return {
    engine_code:   engineMatch ? engineMatch[1] : null,
    vehicle_model: modelText || null,
    generation:    genText || null,
    chassis_code:  chassisMatch ? chassisMatch[1] : null,
    year_from:     yearFrom,
    year_to:       yearTo,
    raw_text:      text.slice(0, 2000), // truncate for staging readability
    confidence:    0.80, // cheerio + selectors gave structured fields
  };
}

function extractWithRegex(html: string): Extracted {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const engineMatch  = stripped.match(OTOBA_PATTERNS.engineCode);
  const chassisMatch = stripped.match(OTOBA_PATTERNS.chassisCode);
  const yearsMatch   = stripped.match(OTOBA_PATTERNS.yearRange);

  // Best-effort model: take title-like fragment around "Toyota"
  const modelMatch = stripped.match(/Toyota\s+([A-Za-zА-Яа-я0-9 \-]+)/i);
  const vehicleModel = modelMatch ? modelMatch[1].trim().split(/\s+/).slice(0, 4).join(' ') : null;

  const yearFrom = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
  const yearToRaw = yearsMatch ? yearsMatch[2] : null;
  const yearTo = yearToRaw && /^\d{4}$/.test(yearToRaw) ? parseInt(yearToRaw, 10) : null;

  return {
    engine_code:   engineMatch ? engineMatch[1] : null,
    vehicle_model: vehicleModel,
    generation:    null,
    chassis_code:  chassisMatch ? chassisMatch[1] : null,
    year_from:     yearFrom,
    year_to:       yearTo,
    raw_text:      stripped.slice(0, 2000),
    confidence:    0.55, // regex-only — lower confidence than cheerio path
  };
}

// ---------------------------------------------------------------------
// Build a staging row from extraction
// ---------------------------------------------------------------------
function buildStagingRow(
  row_number: number,
  url: string,
  ex: Extracted,
): StagingRow | { error: string; row_number: number; source_url: string } {
  const canonicalEngine = normalizeEngineCode(ex.engine_code);
  if (!canonicalEngine) {
    return {
      row_number,
      source_url: url,
      error: `Could not normalize engine_code (raw=${ex.engine_code ?? 'null'})`,
    };
  }
  if (canonicalEngine !== '1KZ') {
    return {
      row_number,
      source_url: url,
      error: `Engine ${canonicalEngine} is not 1KZ — skipping`,
    };
  }
  const vehicleModel = ex.vehicle_model ?? 'UNKNOWN';
  const make = 'Toyota'; // single-source parser
  const entityKey = buildEntityKey(
    canonicalEngine,
    make,
    vehicleModel,
    ex.generation,
  );

  // Confidence adjustment: drop a bit if structural fields are missing.
  let confidence = ex.confidence;
  if (!ex.chassis_code) confidence -= 0.05;
  if (!ex.year_from)    confidence -= 0.05;
  confidence = Math.max(0, Math.min(1, +confidence.toFixed(2)));

  return {
    row_number,
    source_url: url,
    source_page: null,
    raw_text: ex.raw_text,
    raw_json: {
      engine_text:    ex.engine_code,
      model_text:     ex.vehicle_model,
      generation:     ex.generation,
      chassis_code:   ex.chassis_code,
      year_from_raw:  ex.year_from,
      year_to_raw:    ex.year_to,
    },
    normalized_json: {
      engine_code:   canonicalEngine,
      vehicle_make:  make,
      vehicle_model: vehicleModel,
      generation:    ex.generation,
      chassis_code:  ex.chassis_code,
      year_from:     ex.year_from,
      year_to:       ex.year_to,
      entity_key:    entityKey,
      needs_verification: confidence < 0.9,
    },
    detected_entity_type: 'engine_fitment',
    engine_code:   canonicalEngine,
    vehicle_make:  make,
    vehicle_model: vehicleModel,
    confidence,
    status: confidence >= 0.7 ? 'normalized' : 'needs_review',
    error_text: null,
  };
}

// ---------------------------------------------------------------------
// CSV serialization (no external dep)
// ---------------------------------------------------------------------
function toCsv(rows: StagingRow[]): string {
  const header = [
    'row_number',
    'source_url',
    'engine_code',
    'vehicle_make',
    'vehicle_model',
    'generation',
    'chassis_code',
    'year_from',
    'year_to',
    'confidence',
    'status',
    'entity_key',
  ];
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.row_number,
        r.source_url,
        r.engine_code,
        r.vehicle_make,
        r.vehicle_model,
        r.normalized_json.generation,
        r.normalized_json.chassis_code,
        r.normalized_json.year_from,
        r.normalized_json.year_to,
        r.confidence,
        r.status,
        r.normalized_json.entity_key,
      ]
        .map(esc)
        .join(','),
    );
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------
async function parseArgs(): Promise<{ urls: string[] }> {
  const argv = process.argv.slice(2);
  const configIdx = argv.indexOf('--config');
  if (configIdx >= 0) {
    const cfgPath = argv[configIdx + 1];
    if (!cfgPath) throw new Error('--config requires a path');
    const raw = await readFile(resolve(cfgPath), 'utf8');
    const json = JSON.parse(raw);
    if (!Array.isArray(json?.urls)) throw new Error('config must have { urls: [...] }');
    return { urls: json.urls };
  }
  const urls = argv.filter((a) => /^https?:\/\//.test(a));
  if (urls.length === 0) {
    throw new Error(
      'Usage: tsx otoba_1kz_fitment_parser.ts <url> [<url> ...]  OR  --config urls.json',
    );
  }
  return { urls };
}

function urlToSlug(url: string): string {
  return slugify(url.replace(/^https?:\/\//, '').replace(/\/+$/, '')) || 'page';
}

async function ensureDir(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

async function main() {
  const { urls } = await parseArgs();
  const cheerioLoader = await tryLoadCheerio();
  const projectRoot = resolve(__dirname, '..', '..');
  const outJson = resolve(projectRoot, 'tmp', 'otoba_1kz_fitment_rows.json');
  const outCsv  = resolve(projectRoot, 'tmp', 'otoba_1kz_fitment_rows.csv');
  const pagesDir = resolve(projectRoot, 'tmp', 'otoba_pages');

  const rows: StagingRow[] = [];
  const errors: Array<{ row_number: number; source_url: string; error: string }> = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const rowNumber = i + 1;
    process.stderr.write(`[${rowNumber}/${urls.length}] ${url}\n`);
    try {
      const html = await fetchHtml(url);

      // Save raw HTML for offline re-parsing / debugging.
      const slug = urlToSlug(url);
      const htmlPath = resolve(pagesDir, `${slug}.html`);
      await ensureDir(htmlPath);
      await writeFile(htmlPath, html, 'utf8');

      const ex = cheerioLoader
        ? extractWithCheerio(html, cheerioLoader(html))
        : extractWithRegex(html);

      const row = buildStagingRow(rowNumber, url, ex);
      if ('error' in row) {
        errors.push(row);
        process.stderr.write(`  → skipped: ${row.error}\n`);
      } else {
        rows.push(row);
        process.stderr.write(
          `  → ${row.engine_code} / ${row.vehicle_model} (conf=${row.confidence})\n`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ row_number: rowNumber, source_url: url, error: msg });
      process.stderr.write(`  → ERROR: ${msg}\n`);
    }

    // Polite delay between pages.
    if (i + 1 < urls.length) await new Promise((r) => setTimeout(r, 1200));
  }

  await ensureDir(outJson);
  await writeFile(
    outJson,
    JSON.stringify(
      { generated_at: new Date().toISOString(), urls, rows, errors },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(outCsv, toCsv(rows), 'utf8');

  process.stderr.write(
    `\nDone. ${rows.length} ok, ${errors.length} errors.\n` +
      `JSON: ${outJson}\nCSV:  ${outCsv}\n` +
      `Raw HTML cached in ${pagesDir}\n` +
      `\nNo data was written to Supabase. Review the JSON/CSV, then\n` +
      `prepare an INSERT statement into public.catalog_import_rows.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
