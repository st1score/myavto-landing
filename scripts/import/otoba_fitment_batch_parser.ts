/**
 * Otoba.ru batch fitment parser.
 *
 * Reads scripts/import/otoba_engines.json (or --config <path>) listing
 * { brand, engine_code, engine_alias, url } entries, downloads each
 * Otoba engine page, and writes per-engine output:
 *
 *   tmp/otoba/<engine_code>/raw.html
 *   tmp/otoba/<engine_code>/fitment_rows.json   (catalog_import_rows shape)
 *   tmp/otoba/<engine_code>/fitment_rows.csv
 *   tmp/otoba/index.json                        (summary across engines)
 *
 * IT DOES NOT WRITE TO SUPABASE. The JSON files are inputs for the
 * SQL generators (generate_otoba_staging_sql.ts / _promotion_sql.ts).
 *
 * Run:
 *   npx tsx scripts/import/otoba_fitment_batch_parser.ts \
 *     --config scripts/import/otoba_engines.example.json
 *
 *   # flags:
 *   --debug       print fitment table debug per engine
 *   --use-cache   skip network if tmp/otoba/<engine>/raw.html exists
 *   --only <eng>  process only one engine_code (repeatable)
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

// =====================================================================
// Config types
// =====================================================================
type EngineCfg = {
  brand: string;
  engine_code: string;
  engine_alias: string;
  url: string;
};

// =====================================================================
// Otoba selectors / regex — same shape as single-engine parser, but
// generalized for arbitrary engine_code.
// =====================================================================
const OTOBA = {
  fitmentTableRegex:
    /<h2[^>]*>[^<]*на какие автомобили ставил(?:ся|и) двигатель[\s\S]*?<table[^>]*class=["'][^"']*tab-prim[^"']*["'][^>]*>([\s\S]*?)<\/table>/i,
  captionRegex: /<caption[^>]*>([\s\S]*?)<\/caption>/i,
  rowRegex: /<tr[^>]*>([\s\S]*?)<\/tr>/gi,
  cellRegex: /<td[^>]*>([\s\S]*?)<\/td>/gi,
  modelCell:
    /^\s*([A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9 \-]*?)\s+(\d{1,3})\s*\(([A-Z]{1,3}\d{2,4}[A-Z]?)\)\s*$/i,
  yearCell: /(\d{4})\s*[-–—]\s*(\d{4}|н\.?\s*в\.?|сейчас)/i,
  // Engine spec lines
  exactVolumeCc:    /(?:точн(?:ый|ого)\s*объ[её]м[^0-9]*|объ[её]м[^0-9]*)(\d{3,5})\b/i,
  fuel:             /топливо\s*[:\-]?\s*([A-Za-zА-Яа-я]+)/i,
  cylinderLayout:   /расположени[еи]\s*цилиндров\s*[:\-]?\s*([A-Za-zА-Яа-я0-9]+)/i,
  valveCount:       /количеств[оа]\s*клапанов\s*[:\-]?\s*(\d{1,2})/i,
  boreMm:           /диаметр[^0-9]*цилиндр[^0-9]*(\d{2,3}(?:[.,]\d+)?)/i,
  strokeMm:         /ход\s*поршн[яе][^0-9]*(\d{2,3}(?:[.,]\d+)?)/i,
  compressionRatio: /степен[ьи]\s*сжати[яе][^0-9]*(\d{1,2}(?:[.,]\d+)?)/i,
  timingDrive:      /привод\s*ГРМ\s*[:\-]?\s*([A-Za-zА-Яа-я ]+?)(?:\s{2,}|\n|$)/i,
  turbo:            /(турбонадув|турбо|turbo|с\s*турбиной)/i,
};

// =====================================================================
// Per-brand model normalization. Extend as new brands appear.
// =====================================================================
const MODEL_NORMALIZATION_TOYOTA: Array<{ match: RegExp; canonical: string }> = [
  { match: /^LC\s*Prado$/i,             canonical: 'Land Cruiser Prado' },
  { match: /^Land\s*Cruiser\s*Prado$/i, canonical: 'Land Cruiser Prado' },
  { match: /^Land\s*Cruiser$/i,         canonical: 'Land Cruiser' },
  { match: /^4Runner$/i,                canonical: '4Runner' },
  { match: /^Hilux\s*Surf$/i,           canonical: 'Hilux Surf' },
  { match: /^Hilux$/i,                  canonical: 'Hilux' },
  { match: /^HiAce$/i,                  canonical: 'HiAce' },
  { match: /^Hiace$/i,                  canonical: 'HiAce' },
  { match: /^Granvia$/i,                canonical: 'Granvia' },
  { match: /^Regius$/i,                 canonical: 'Regius' },
  { match: /^Dyna(?:\s*\/\s*Toyoace)?$/i, canonical: 'Dyna / Toyoace' },
];

function normalizeModelName(brand: string, raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const table = brand.toLowerCase() === 'toyota' ? MODEL_NORMALIZATION_TOYOTA : [];
  for (const { match, canonical } of table) {
    if (match.test(trimmed)) return canonical;
  }
  return trimmed;
}

// =====================================================================
// Slug + entity_key (Stage A canonical format)
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
// HTML helpers
// =====================================================================
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'MyAvtoFitmentBot/0.2 (+contact: trachuksemen@gmail.com; respect robots)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru,en;q=0.7',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h\d|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// =====================================================================
// Extraction
// =====================================================================
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

function extractEngineMetadata(text: string, engineCode: string, engineAlias: string): EngineMetadata {
  const num = (m: RegExpMatchArray | null): number | null => {
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  return {
    engine_code:       engineCode,
    engine_alias:      engineAlias,
    exact_volume_cc:   num(text.match(OTOBA.exactVolumeCc)),
    fuel:              text.match(OTOBA.fuel)?.[1]?.toLowerCase() ?? null,
    cylinder_layout:   text.match(OTOBA.cylinderLayout)?.[1]?.toUpperCase() ?? null,
    valve_count:       (() => {
      const m = text.match(OTOBA.valveCount);
      return m ? parseInt(m[1], 10) : null;
    })(),
    bore_mm:           num(text.match(OTOBA.boreMm)),
    stroke_mm:         num(text.match(OTOBA.strokeMm)),
    compression_ratio: num(text.match(OTOBA.compressionRatio)),
    timing_drive:      text.match(OTOBA.timingDrive)?.[1]?.trim() ?? null,
    turbo:             OTOBA.turbo.test(text) ? true : null,
  };
}

type FitmentParsed = {
  raw_text: string;
  model_raw: string;
  generation: string;
  chassis_code: string;
  year_from: number;
  year_to: number | null;
};

function extractFitmentTable(html: string): { tableInner: string | null; captionText: string | null } {
  const m = html.match(OTOBA.fitmentTableRegex);
  if (!m) return { tableInner: null, captionText: null };
  const tableInner = m[1];
  const capMatch = tableInner.match(OTOBA.captionRegex);
  return { tableInner, captionText: capMatch ? stripTags(capMatch[1]) : null };
}

function extractFitmentsFromTable(tableInner: string): FitmentParsed[] {
  const out: FitmentParsed[] = [];
  const rowRe = new RegExp(OTOBA.rowRegex.source, 'gi');
  for (const rowMatch of tableInner.matchAll(rowRe)) {
    const rowHtml = rowMatch[1];
    const cellRe = new RegExp(OTOBA.cellRegex.source, 'gi');
    const cells: string[] = [];
    for (const cm of rowHtml.matchAll(cellRe)) cells.push(stripTags(cm[1]));
    if (cells.length < 2) continue;
    const [modelCell, yearCell] = cells;
    if (!modelCell || !yearCell) continue;
    const mm = modelCell.match(OTOBA.modelCell);
    const ym = yearCell.match(OTOBA.yearCell);
    if (!mm || !ym) continue;
    const [, modelRaw, generation, chassis] = mm;
    const yfrom = parseInt(ym[1], 10);
    const yto = /^\d{4}$/.test(ym[2]) ? parseInt(ym[2], 10) : null;
    out.push({
      raw_text: `${modelCell} ${yearCell}`.replace(/\s+/g, ' ').trim(),
      model_raw: modelRaw.trim(),
      generation,
      chassis_code: chassis,
      year_from: yfrom,
      year_to: yto,
    });
  }
  return out;
}

// =====================================================================
// Output shape — mirrors public.catalog_import_rows
// =====================================================================
type StagingRow = {
  row_number: number;
  source_url: string;
  raw_text: string;
  raw_json: Record<string, unknown>;
  normalized_json: Record<string, unknown>;
  detected_entity_type: 'engine_fitment';
  engine_code: string;
  vehicle_make: string;
  vehicle_model: string;
  confidence: number;
  status: 'normalized';
};

function buildRow(
  rowNumber: number,
  engine: EngineCfg,
  parsed: FitmentParsed,
): StagingRow {
  const vehicleModel = normalizeModelName(engine.brand, parsed.model_raw);
  const entityKey = buildEntityKey(
    engine.engine_code,
    engine.brand,
    vehicleModel,
    parsed.generation,
  );
  let confidence = 0.9;
  if (parsed.year_to === null) confidence -= 0.05;
  confidence = +confidence.toFixed(2);

  return {
    row_number: rowNumber,
    source_url: engine.url,
    raw_text: parsed.raw_text,
    raw_json: {
      model_raw:    parsed.model_raw,
      generation:   parsed.generation,
      chassis_code: parsed.chassis_code,
      year_from:    parsed.year_from,
      year_to:      parsed.year_to,
      engine_alias: engine.engine_alias,
    },
    normalized_json: {
      engine_code:        engine.engine_code,
      engine_alias:       engine.engine_alias,
      vehicle_make:       engine.brand,
      vehicle_model:      vehicleModel,
      generation:         parsed.generation,
      chassis_code:       parsed.chassis_code,
      year_from:          parsed.year_from,
      year_to:            parsed.year_to,
      entity_key:         entityKey,
      needs_verification: confidence < 0.9,
      source:             'otoba_ru',
    },
    detected_entity_type: 'engine_fitment',
    engine_code: engine.engine_code,
    vehicle_make: engine.brand,
    vehicle_model: vehicleModel,
    confidence,
    status: 'normalized',
  };
}

function rowsToCsv(rows: StagingRow[]): string {
  const header = ['row_number','source_url','engine_code','engine_alias','vehicle_make','vehicle_model','generation','chassis_code','year_from','year_to','confidence','status','entity_key'];
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out = [header.join(',')];
  for (const r of rows) {
    const nj = r.normalized_json as Record<string, unknown>;
    out.push([
      r.row_number, r.source_url, r.engine_code, nj.engine_alias,
      r.vehicle_make, r.vehicle_model, nj.generation, nj.chassis_code,
      nj.year_from, nj.year_to, r.confidence, r.status, nj.entity_key,
    ].map(esc).join(','));
  }
  return out.join('\n') + '\n';
}

// =====================================================================
// CLI
// =====================================================================
type Args = { configPath: string; debug: boolean; useCache: boolean; only: Set<string> };

async function parseArgs(): Promise<Args> {
  const argv = process.argv.slice(2);
  const ci = argv.indexOf('--config');
  if (ci < 0) throw new Error('Usage: --config <engines.json> [--debug] [--use-cache] [--only ENGINE]');
  const cfg = argv[ci + 1];
  const debug = argv.includes('--debug');
  const useCache = argv.includes('--use-cache');
  const only = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only' && argv[i + 1]) only.add(argv[i + 1]);
  }
  return { configPath: cfg, debug, useCache, only };
}

async function ensureDir(path: string) { await mkdir(dirname(path), { recursive: true }); }

async function main() {
  const { configPath, debug, useCache, only } = await parseArgs();
  const projectRoot = resolve(__dirname, '..', '..');
  const cfgRaw = await readFile(resolve(configPath), 'utf8');
  const cfg = JSON.parse(cfgRaw) as { engines: EngineCfg[] };
  if (!Array.isArray(cfg?.engines)) throw new Error('config.engines must be an array');

  const otobaRoot = resolve(projectRoot, 'tmp', 'otoba');
  const summary: Array<Record<string, unknown>> = [];

  for (let i = 0; i < cfg.engines.length; i++) {
    const eng = cfg.engines[i];
    if (only.size > 0 && !only.has(eng.engine_code)) continue;
    process.stderr.write(`[${i + 1}/${cfg.engines.length}] ${eng.brand} ${eng.engine_alias} → ${eng.url}\n`);

    const dir = resolve(otobaRoot, eng.engine_code);
    const htmlPath  = resolve(dir, 'raw.html');
    const jsonPath  = resolve(dir, 'fitment_rows.json');
    const csvPath   = resolve(dir, 'fitment_rows.csv');

    try {
      let html: string;
      if (useCache) {
        try {
          html = await readFile(htmlPath, 'utf8');
          process.stderr.write(`  → using cached HTML\n`);
        } catch {
          html = await fetchHtml(eng.url);
          await ensureDir(htmlPath);
          await writeFile(htmlPath, html, 'utf8');
        }
      } else {
        html = await fetchHtml(eng.url);
        await ensureDir(htmlPath);
        await writeFile(htmlPath, html, 'utf8');
      }

      const text = htmlToText(html);
      const meta = extractEngineMetadata(text, eng.engine_code, eng.engine_alias);
      const { tableInner, captionText } = extractFitmentTable(html);
      const parsed = tableInner ? extractFitmentsFromTable(tableInner) : [];
      if (debug) {
        process.stderr.write(`  [debug] caption: ${captionText ?? '(none)'} | table_len=${tableInner?.length ?? 0} | matches=${parsed.length}\n`);
      }

      const rows = parsed.map((p, idx) => buildRow(idx + 1, eng, p));
      const out = {
        generated_at: new Date().toISOString(),
        engine: eng,
        engine_metadata: meta,
        rows,
      };
      await ensureDir(jsonPath);
      await writeFile(jsonPath, JSON.stringify(out, null, 2), 'utf8');
      await writeFile(csvPath, rowsToCsv(rows), 'utf8');

      summary.push({
        engine_code: eng.engine_code,
        engine_alias: eng.engine_alias,
        brand: eng.brand,
        url: eng.url,
        rows_count: rows.length,
        engine_metadata: meta,
        ok: true,
      });
      process.stderr.write(`  → ${rows.length} fitments\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.push({ engine_code: eng.engine_code, engine_alias: eng.engine_alias, brand: eng.brand, url: eng.url, error: msg, ok: false });
      process.stderr.write(`  → ERROR: ${msg}\n`);
    }

    if (i + 1 < cfg.engines.length) await new Promise((r) => setTimeout(r, 1200));
  }

  const indexPath = resolve(otobaRoot, 'index.json');
  await ensureDir(indexPath);
  await writeFile(indexPath, JSON.stringify({ generated_at: new Date().toISOString(), engines: summary }, null, 2), 'utf8');

  const totalRows = summary.reduce((a, s: any) => a + (s.rows_count ?? 0), 0);
  process.stderr.write(`\nDone. ${summary.length} engine(s), ${totalRows} fitment rows total.\n` +
    `Per-engine output: tmp/otoba/<engine_code>/\nIndex: ${indexPath}\n` +
    `\nNo data was written to Supabase.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
