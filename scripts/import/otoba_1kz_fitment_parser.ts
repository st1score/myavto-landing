/**
 * Otoba.ru engine-fitment parser for Toyota 1KZ.
 *
 * Reads one or more Otoba engine pages (e.g.
 * https://otoba.ru/dvigatel/toyota/1kz-te.html) and extracts:
 *
 *   • Engine metadata (alias, volume_cc, fuel, layout, valves, bore,
 *     stroke, compression, timing drive, turbo)
 *   • The "На какие автомобили ставился двигатель …" fitment list —
 *     one staging row per car model line.
 *
 * Writes to:
 *   tmp/otoba_1kz_fitment_rows.json     ← engine + fitment rows
 *   tmp/otoba_1kz_fitment_rows.csv      ← fitment rows, flat
 *   tmp/otoba_pages/<slug>.html         ← raw HTML cache
 *
 * IT DOES NOT WRITE TO SUPABASE. JSON shape matches
 * public.catalog_import_rows so a follow-up reviewable SQL step can
 * INSERT the approved rows.
 *
 * Run:
 *   npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
 *     https://otoba.ru/dvigatel/toyota/1kz-te.html
 *
 *   # or
 *   npx tsx scripts/import/otoba_1kz_fitment_parser.ts \
 *     --config scripts/import/otoba_1kz_urls.json
 *
 * Optional dep: `cheerio` improves heading detection.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

// =====================================================================
// MODULE: Otoba.ru selectors + patterns
// All source-specific knowledge is concentrated here so the same file
// can be cloned for TEIKIN/NPR/KP parsers and only this block changes.
// =====================================================================
const OTOBA_SELECTORS = {
  // Heading that introduces the fitment list. We match by text content.
  fitmentHeadingText: /на какие автомобили ставил(?:ся|и) двигатель/i,
  // The applicability table after that heading. Otoba uses
  // <table class="tab-prim"> with <caption> = make and one row per
  // car: <tr><td>Model Gen (Chassis)</td><td>YYYY - YYYY</td></tr>
  fitmentTableRegex:  /<h2[^>]*>[^<]*на какие автомобили ставил(?:ся|и) двигатель[\s\S]*?<table[^>]*class=["'][^"']*tab-prim[^"']*["'][^>]*>([\s\S]*?)<\/table>/i,
  fitmentTableCaptionRegex: /<caption[^>]*>([\s\S]*?)<\/caption>/i,
  fitmentTableRowRegex: /<tr[^>]*>([\s\S]*?)<\/tr>/gi,
  fitmentTableCellRegex: /<td[^>]*>([\s\S]*?)<\/td>/gi,
};

const OTOBA_PATTERNS = {
  // Engine metadata in the page body. Lines look like
  //   "Точный объем, куб. см.  2982"
  //   "Топливо  дизель"
  //   "Расположение цилиндров  R4"
  //   "Количество клапанов  8"
  //   "Диаметр цилиндра, мм  96"
  //   "Ход поршня, мм  103"
  //   "Степень сжатия  21.2"
  //   "Привод ГРМ  ремень и шестерни"
  engineAlias:       /\b(1\s*KZ(?:[-\s]?TE)?)\b/i,
  exactVolumeCc:     /(?:точн(?:ый|ого)\s*объ[её]м[^0-9]*|объ[её]м[^0-9]*)(\d{3,5})\b/i,
  fuel:              /топливо\s*[:\-]?\s*([A-Za-zА-Яа-я]+)/i,
  cylinderLayout:    /расположени[еи]\s*цилиндров\s*[:\-]?\s*([A-Za-zА-Яа-я0-9]+)/i,
  valveCount:        /количеств[оа]\s*клапанов\s*[:\-]?\s*(\d{1,2})/i,
  boreMm:            /диаметр[^0-9]*цилиндр[^0-9]*(\d{2,3}(?:[.,]\d+)?)/i,
  strokeMm:          /ход\s*поршн[яе][^0-9]*(\d{2,3}(?:[.,]\d+)?)/i,
  compressionRatio:  /степен[ьи]\s*сжати[яе][^0-9]*(\d{1,2}(?:[.,]\d+)?)/i,
  timingDrive:       /привод\s*ГРМ\s*[:\-]?\s*([A-Za-zА-Яа-я ]+?)(?:\s{2,}|\n|$)/i,
  turbo:             /(турбонадув|турбо|turbo|с\s*турбиной)/i,

  // Per-row pattern applied to the FIRST <td> of each row:
  //   "LC Prado 90 (J90)"   "4Runner 2 (N120)"   "HiAce 4 (H100)"
  // Groups: 1=model_raw 2=generation 3=chassis
  fitmentModelCell:
    /^\s*([A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9 \-]*?)\s+(\d{1,3})\s*\(([A-Z]{1,3}\d{2,4}[A-Z]?)\)\s*$/i,

  // Per-row pattern for the SECOND <td>:
  //   "1996 - 2002"   "1993 - н.в."
  fitmentYearCell:
    /(\d{4})\s*[-–—]\s*(\d{4}|н\.?\s*в\.?|сейчас)/i,
};

// =====================================================================
// Model-name normalization (raw on-page label → canonical model_name).
// Order matters: more-specific labels go first.
// =====================================================================
const MODEL_NORMALIZATION: Array<{ match: RegExp; canonical: string }> = [
  { match: /^LC\s*Prado$/i,          canonical: 'Land Cruiser Prado' },
  { match: /^Land\s*Cruiser\s*Prado$/i, canonical: 'Land Cruiser Prado' },
  { match: /^Land\s*Cruiser$/i,      canonical: 'Land Cruiser' },
  { match: /^4Runner$/i,             canonical: '4Runner' },
  { match: /^Hilux\s*Surf$/i,        canonical: 'Hilux Surf' },
  { match: /^Hilux$/i,               canonical: 'Hilux' },
  { match: /^HiAce$/i,               canonical: 'HiAce' },
  { match: /^Hiace$/i,               canonical: 'HiAce' },
  { match: /^Granvia$/i,             canonical: 'Granvia' },
  { match: /^Regius$/i,              canonical: 'Regius' },
  { match: /^Dyna(?:\s*\/\s*Toyoace)?$/i, canonical: 'Dyna / Toyoace' },
];

function normalizeModelName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  for (const { match, canonical } of MODEL_NORMALIZATION) {
    if (match.test(trimmed)) return canonical;
  }
  // Fallback: keep as-is.
  return trimmed;
}

// =====================================================================
// Engine code normalization — matches Stage A engine_aliases policy.
// alias_norm = uppercase + [A-Z0-9].
// =====================================================================
function normalizeAlias(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

const ENGINE_ALIASES_TO_CANONICAL: Record<string, string> = {
  '1KZ':   '1KZ',
  '1KZTE': '1KZ',
};

function normalizeEngineCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const norm = normalizeAlias(raw);
  return ENGINE_ALIASES_TO_CANONICAL[norm] ?? null;
}

// =====================================================================
// Slug + entity_key — must match Stage A entity_key format
// =====================================================================
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

// =====================================================================
// Output shape — mirrors public.catalog_import_rows columns
// =====================================================================
type StagingRow = {
  row_number: number;
  source_url: string;
  source_page: string | null;
  raw_text: string;
  raw_json: Record<string, unknown>;
  normalized_json: {
    engine_code: string;
    engine_alias: string | null;
    vehicle_make: string;
    vehicle_model: string;
    generation: string | null;
    chassis_code: string | null;
    year_from: number | null;
    year_to: number | null;
    entity_key: string;
    needs_verification: boolean;
    source: 'otoba_ru';
  };
  detected_entity_type: 'engine_fitment';
  engine_code: string;
  vehicle_make: string;
  vehicle_model: string;
  confidence: number;
  status: 'parsed' | 'normalized' | 'needs_review';
  error_text: string | null;
};

type EngineMetadata = {
  engine_code: string;
  engine_alias: string | null;
  exact_volume_cc: number | null;
  fuel: string | null;
  cylinder_layout: string | null;
  valve_count: number | null;
  bore_mm: number | null;
  stroke_mm: number | null;
  compression_ratio: number | null;
  timing_drive: string | null;
  turbo: boolean | null;
};

// =====================================================================
// HTML utilities
// =====================================================================
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'MyAvtoFitmentBot/0.1 (+contact: trachuksemen@gmail.com; respect robots)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru,en;q=0.7',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h\d|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// =====================================================================
// Engine metadata extraction (best-effort, regex-only)
// =====================================================================
function extractEngineMetadata(text: string, fallbackEngineCode: string): EngineMetadata {
  const aliasMatch = text.match(OTOBA_PATTERNS.engineAlias);
  const alias = aliasMatch ? aliasMatch[1].replace(/\s+/g, '').toUpperCase() : null;

  const num = (m: RegExpMatchArray | null): number | null => {
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  return {
    engine_code:       fallbackEngineCode,
    engine_alias:      alias,
    exact_volume_cc:   num(text.match(OTOBA_PATTERNS.exactVolumeCc)) ?? null,
    fuel:              text.match(OTOBA_PATTERNS.fuel)?.[1]?.toLowerCase() ?? null,
    cylinder_layout:   text.match(OTOBA_PATTERNS.cylinderLayout)?.[1]?.toUpperCase() ?? null,
    valve_count:       num(text.match(OTOBA_PATTERNS.valveCount))
                         ? Math.trunc(num(text.match(OTOBA_PATTERNS.valveCount))!)
                         : null,
    bore_mm:           num(text.match(OTOBA_PATTERNS.boreMm)),
    stroke_mm:         num(text.match(OTOBA_PATTERNS.strokeMm)),
    compression_ratio: num(text.match(OTOBA_PATTERNS.compressionRatio)),
    timing_drive:      text.match(OTOBA_PATTERNS.timingDrive)?.[1]?.trim() ?? null,
    turbo:             OTOBA_PATTERNS.turbo.test(text) ? true : null,
  };
}

// =====================================================================
// Fitment block extraction (HTML-based — much more robust than text)
//
// Strategy:
// 1) Find the "На какие автомобили ставился двигатель …" heading
//    followed by a <table class="tab-prim">.
// 2) Use the <caption> for the make.
// 3) Walk each <tr> → first <td> = "Model Gen (Chassis)",
//    second <td> = "YYYY - YYYY".
// =====================================================================
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the raw inner HTML of the fitment table (everything between
 * <table…> and </table> following the "На какие автомобили…" heading).
 * Returned for debugging; the caller passes it to extractFitmentsFromTable.
 */
function extractFitmentTableHtml(html: string): { tableInner: string | null; captionText: string | null } {
  const m = html.match(OTOBA_SELECTORS.fitmentTableRegex);
  if (!m) return { tableInner: null, captionText: null };
  const tableInner = m[1];
  const capMatch = tableInner.match(OTOBA_SELECTORS.fitmentTableCaptionRegex);
  const captionText = capMatch ? stripTags(capMatch[1]) : null;
  return { tableInner, captionText };
}

type FitmentParsed = {
  raw_text: string;
  model_raw: string;
  generation: string;
  chassis_code: string;
  year_from: number;
  year_to: number | null;
};

function extractFitmentsFromTable(tableInner: string): FitmentParsed[] {
  const out: FitmentParsed[] = [];
  const rowRe = new RegExp(OTOBA_SELECTORS.fitmentTableRowRegex.source, 'gi');
  for (const rowMatch of tableInner.matchAll(rowRe)) {
    const rowHtml = rowMatch[1];
    const cellRe = new RegExp(OTOBA_SELECTORS.fitmentTableCellRegex.source, 'gi');
    const cells: string[] = [];
    for (const cm of rowHtml.matchAll(cellRe)) {
      cells.push(stripTags(cm[1]));
    }
    if (cells.length < 2) continue; // skip header / spacer rows
    const modelCell = cells[0];
    const yearCell  = cells[1];
    if (!modelCell || !yearCell || modelCell === '' || yearCell === '') continue;

    const modelMatch = modelCell.match(OTOBA_PATTERNS.fitmentModelCell);
    const yearMatch  = yearCell.match(OTOBA_PATTERNS.fitmentYearCell);
    if (!modelMatch || !yearMatch) continue;

    const [, modelRaw, generation, chassis] = modelMatch;
    const year_from = parseInt(yearMatch[1], 10);
    const ytStr = yearMatch[2];
    const year_to = /^\d{4}$/.test(ytStr) ? parseInt(ytStr, 10) : null;

    out.push({
      raw_text: `${modelCell} ${yearCell}`.replace(/\s+/g, ' ').trim(),
      model_raw: modelRaw.trim(),
      generation,
      chassis_code: chassis,
      year_from,
      year_to,
    });
  }
  return out;
}

// =====================================================================
// Build a staging row from a parsed fitment
// =====================================================================
function buildFitmentRow(
  row_number: number,
  url: string,
  parsed: FitmentParsed,
  engineCanonical: string,
  engineAlias: string | null,
): StagingRow {
  const vehicleModel = normalizeModelName(parsed.model_raw);
  const make = 'Toyota';
  const entityKey = buildEntityKey(
    engineCanonical,
    make,
    vehicleModel,
    parsed.generation,
  );

  // Confidence: fixed 0.90 per spec when we have a structured fitment
  // line. Drop slightly if year_to is open-ended.
  let confidence = 0.9;
  if (parsed.year_to === null) confidence -= 0.05;
  confidence = +confidence.toFixed(2);

  return {
    row_number,
    source_url: url,
    source_page: null,
    raw_text: parsed.raw_text,
    raw_json: {
      model_raw:    parsed.model_raw,
      generation:   parsed.generation,
      chassis_code: parsed.chassis_code,
      year_from:    parsed.year_from,
      year_to:      parsed.year_to,
      engine_alias: engineAlias,
    },
    normalized_json: {
      engine_code:   engineCanonical,
      engine_alias:  engineAlias,
      vehicle_make:  make,
      vehicle_model: vehicleModel,
      generation:    parsed.generation,
      chassis_code:  parsed.chassis_code,
      year_from:     parsed.year_from,
      year_to:       parsed.year_to,
      entity_key:    entityKey,
      needs_verification: confidence < 0.9,
      source:        'otoba_ru',
    },
    detected_entity_type: 'engine_fitment',
    engine_code:   engineCanonical,
    vehicle_make:  make,
    vehicle_model: vehicleModel,
    confidence,
    status: 'normalized',
    error_text: null,
  };
}

// =====================================================================
// CSV serialization (no external dep)
// =====================================================================
function toCsv(rows: StagingRow[]): string {
  const header = [
    'row_number',
    'source_url',
    'engine_code',
    'engine_alias',
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
        r.normalized_json.engine_alias,
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

// =====================================================================
// CLI
// =====================================================================
async function parseArgs(): Promise<{ urls: string[]; debug: boolean; useCache: boolean }> {
  const argv = process.argv.slice(2);
  const debug = argv.includes('--debug');
  const useCache = argv.includes('--use-cache');
  const configIdx = argv.indexOf('--config');
  if (configIdx >= 0) {
    const cfgPath = argv[configIdx + 1];
    if (!cfgPath) throw new Error('--config requires a path');
    const raw = await readFile(resolve(cfgPath), 'utf8');
    const json = JSON.parse(raw);
    if (!Array.isArray(json?.urls)) throw new Error('config must have { urls: [...] }');
    return { urls: json.urls, debug, useCache };
  }
  const urls = argv.filter((a) => /^https?:\/\//.test(a));
  if (urls.length === 0) {
    throw new Error(
      'Usage: tsx otoba_1kz_fitment_parser.ts [--debug] [--use-cache] <engine-page-url> [<url> ...]  OR  --config urls.json',
    );
  }
  return { urls, debug, useCache };
}

function urlToSlug(url: string): string {
  return slugify(url.replace(/^https?:\/\//, '').replace(/\/+$/, '')) || 'page';
}

async function ensureDir(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

async function main() {
  const { urls, debug, useCache } = await parseArgs();
  const projectRoot = resolve(__dirname, '..', '..');
  const outJson = resolve(projectRoot, 'tmp', 'otoba_1kz_fitment_rows.json');
  const outCsv  = resolve(projectRoot, 'tmp', 'otoba_1kz_fitment_rows.csv');
  const pagesDir = resolve(projectRoot, 'tmp', 'otoba_pages');

  type PageResult = {
    url: string;
    engine_metadata: EngineMetadata | null;
    fitment_rows: StagingRow[];
    error?: string;
  };
  const pages: PageResult[] = [];
  const allRows: StagingRow[] = [];
  let nextRowNumber = 1;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stderr.write(`[${i + 1}/${urls.length}] ${url}\n`);

    try {
      const slug = urlToSlug(url);
      const htmlPath = resolve(pagesDir, `${slug}.html`);
      let html: string;
      if (useCache) {
        try {
          html = await readFile(htmlPath, 'utf8');
          process.stderr.write(`  → using cached HTML at ${htmlPath}\n`);
        } catch {
          html = await fetchHtml(url);
          await ensureDir(htmlPath);
          await writeFile(htmlPath, html, 'utf8');
        }
      } else {
        html = await fetchHtml(url);
        await ensureDir(htmlPath);
        await writeFile(htmlPath, html, 'utf8');
      }

      const text = htmlToText(html);

      // Engine code: try header pattern, fall back to "1KZ" (we only
      // support 1KZ in this parser).
      const aliasMatch = text.match(OTOBA_PATTERNS.engineAlias);
      const engineAlias = aliasMatch ? aliasMatch[1].replace(/\s+/g, '').toUpperCase() : null;
      const engineCanonical = normalizeEngineCode(engineAlias) ?? '1KZ';

      const engineMetadata = extractEngineMetadata(text, engineCanonical);

      // Fitment table — HTML-based extraction (robust to caption-once)
      const { tableInner, captionText } = extractFitmentTableHtml(html);
      const fitments = tableInner ? extractFitmentsFromTable(tableInner) : [];

      if (debug) {
        const tableLen = tableInner?.length ?? 0;
        const preview = (tableInner ?? '').slice(0, 1000);
        process.stderr.write(
          `  [debug] fitment table found: ${tableInner !== null}\n` +
            `  [debug] caption: ${captionText ?? '(none)'}\n` +
            `  [debug] table inner length: ${tableLen} chars\n` +
            `  [debug] first 1000 chars of table inner:\n` +
            preview.split('\n').map((l) => `    | ${l}`).join('\n') +
            `\n  [debug] regex matches (fitments parsed): ${fitments.length}\n`,
        );
      }

      const rows: StagingRow[] = [];
      for (const f of fitments) {
        const row = buildFitmentRow(
          nextRowNumber++,
          url,
          f,
          engineCanonical,
          engineMetadata.engine_alias,
        );
        rows.push(row);
        allRows.push(row);
      }
      pages.push({ url, engine_metadata: engineMetadata, fitment_rows: rows });
      process.stderr.write(
        `  → ${rows.length} fitments, engine ${engineCanonical}` +
          (engineMetadata.engine_alias ? ` (${engineMetadata.engine_alias})` : '') +
          `\n`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pages.push({ url, engine_metadata: null, fitment_rows: [], error: msg });
      process.stderr.write(`  → ERROR: ${msg}\n`);
    }

    if (i + 1 < urls.length) await new Promise((r) => setTimeout(r, 1200));
  }

  await ensureDir(outJson);
  await writeFile(
    outJson,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        urls,
        pages,
        // Flat row list — direct candidate for INSERT INTO
        // public.catalog_import_rows after human review.
        rows: allRows,
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(outCsv, toCsv(allRows), 'utf8');

  process.stderr.write(
    `\nDone. ${allRows.length} fitment rows across ${urls.length} page(s).\n` +
      `JSON: ${outJson}\nCSV:  ${outCsv}\n` +
      `Raw HTML cached in ${pagesDir}\n` +
      `\nNo data was written to Supabase. Review the JSON/CSV, then\n` +
      `prepare an INSERT into public.catalog_import_rows.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
