'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Universal row shape — covers both our site fields and Kaspi-required fields.
// One CSV → fills our DB + ready for Kaspi export later.
type Row = {
  // identifiers
  title: string;
  category_code: string;
  brand_code: string;
  master_sku?: string;
  manufacturer_part_number?: string;
  // numbers
  oem_numbers?: string;        // ';' separated
  cross_numbers?: string;
  compatible_engines?: string; // ';' separated
  // variant
  size?: string;
  insert?: string;
  // commerce
  price?: string;
  qty?: string;
  weight_kg?: string;
  // content
  description?: string;
  short_desc?: string;
  status?: 'draft' | 'active' | 'archived';
  // kaspi-specific
  kaspi_type?: string;
  youtube_id?: string;
  kaspi_image_code?: string;
  additional_info?: string;
  car_brand?: string;          // ';' separated
  car_model?: string;          // ';' separated, same length as car_brand
  car_year_from?: string;      // ';' separated
  car_year_to?: string;        // ';' separated
  // kaspi listing seed
  kaspi_merchant_sku?: string;
  kaspi_price?: string;
};

const TEMPLATE = [
  'title,category_code,brand_code,master_sku,manufacturer_part_number,oem_numbers,cross_numbers,compatible_engines,size,insert,price,qty,weight_kg,description,short_desc,status,kaspi_type,youtube_id,kaspi_image_code,additional_info,car_brand,car_model,car_year_from,car_year_to,kaspi_merchant_sku,kaspi_price',
  'Поршень 1KZ TEIKIN +0.50,PISTON,TEIKIN,,46283,13101-67010;13101-67020,,1KZ;1KZ-TE,0.50,AG,18500,4,0.45,Кованый поршень TEIKIN для 1KZ-TE второй ремонт +0.50 мм. Включает поршневой палец и стопорные кольца.,Поршень TEIKIN 1KZ +0.50,active,Поршень,,,Японское качество TEIKIN,Toyota;Toyota;Toyota,Land Cruiser Prado;Hilux Surf;Hiace,1996;1996;1995,2002;2002;2006,MYA-TEIKIN-46283-050,18500',
  'Кольца 1KZ NPR STD,RING,NPR,,SDN-30041,13011-67050,,1KZ,STD,plain,14200,2,0.18,Поршневые кольца NPR для 1KZ STD. Комплект на 1 поршень.,Кольца NPR 1KZ STD,active,Кольцо поршневое,,,,Toyota;Toyota,Land Cruiser Prado;Hilux Surf,1996;1996,2002;2002,MYA-NPR-SDN30041-STD,14200',
].join('\n') + '\n';

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // naive split — values with commas must be wrapped... we use ';' for arrays inside cells
    // simple state-machine for "..." quoting
    const vals: string[] = [];
    let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { vals.push(cur); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur);
    const obj: any = {};
    headers.forEach((h, i) => obj[h] = (vals[i] ?? '').trim());
    return obj as Row;
  });
}

function arr(s?: string) {
  return (s ?? '').split(';').map((x) => x.trim()).filter(Boolean);
}

function zipVehicles(r: Row) {
  const brands = arr(r.car_brand);
  const models = arr(r.car_model);
  const yfs    = arr(r.car_year_from);
  const yts    = arr(r.car_year_to);
  const n = Math.max(brands.length, models.length);
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    const b = brands[i] ?? brands[0] ?? '';
    const m = models[i] ?? '';
    if (!b && !m) continue;
    out.push({
      brand: b, model: m,
      year_from: yfs[i] ? Number(yfs[i]) : null,
      year_to:   yts[i] ? Number(yts[i]) : null,
    });
  }
  return out;
}

export default function ImportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<{ ok: number; failed: { row: number; error: string }[] } | null>(null);

  function onFile(f: File) {
    const r = new FileReader();
    r.onload = () => {
      try { setRows(parseCSV(String(r.result ?? ''))); setErr(null); }
      catch (e: any) { setErr(e?.message ?? 'parse error'); }
    };
    r.readAsText(f);
  }

  async function runImport() {
    setBusy(true); setErr(null); setResults(null);
    const s = supabaseBrowser();
    const { data: u } = await s.auth.getUser();
    if (!u.user) { setErr('Не авторизован'); setBusy(false); return; }

    const { data: batch, error: bErr } = await s.from('import_batches').insert({
      owner_id: u.user.id, source: 'csv', status: 'importing', total_rows: rows.length,
    }).select('id').single();
    if (bErr) { setErr(bErr.message); setBusy(false); return; }
    const batchId = (batch as any).id;

    let ok = 0;
    const failed: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const masterSku = (r.master_sku ?? '').trim() || `MYA-${r.brand_code}-${Date.now().toString(36).toUpperCase()}-${i}`;
        const { data: prod, error: pErr } = await s.from('products').insert({
          owner_id: u.user.id,
          master_sku: masterSku,
          title: r.title,
          short_desc: r.short_desc || null,
          description: r.description || null,
          category_code: r.category_code,
          brand_code: r.brand_code,
          manufacturer_part_number: r.manufacturer_part_number || null,
          oem_numbers:   arr(r.oem_numbers),
          cross_numbers: arr(r.cross_numbers),
          compatible_engines: arr(r.compatible_engines).map((x) => x.toUpperCase()),
          status: (r.status as any) || 'active',
          kaspi_type: r.kaspi_type || null,
          youtube_id: r.youtube_id || null,
          kaspi_image_code: r.kaspi_image_code || null,
          additional_info: r.additional_info || null,
          weight_kg: r.weight_kg ? Number(r.weight_kg) : null,
          kaspi_vehicles: zipVehicles(r),
        }).select('id').single();
        if (pErr) throw pErr;
        const productId = (prod as any).id;

        const variantAttrs: any = {};
        if (r.size)   variantAttrs.size = r.size;
        if (r.insert) variantAttrs.insert = r.insert;
        const { data: v, error: vErr } = await s.from('product_variants').insert({
          product_id: productId, sku: null, variant_attrs: variantAttrs, is_active: true,
          weight_g: r.weight_kg ? Math.round(Number(r.weight_kg) * 1000) : null,
        }).select('id').single();
        if (vErr) throw vErr;
        const variantId = (v as any).id;

        if (r.price && r.price.trim() !== '') {
          await s.from('listings').upsert({
            variant_id: variantId, channel_code: 'OWN',
            price: Number(r.price), currency: 'KZT', is_active: true,
          }, { onConflict: 'variant_id,channel_code' });
        }
        if (r.kaspi_price && r.kaspi_price.trim() !== '') {
          await s.from('listings').upsert({
            variant_id: variantId, channel_code: 'KASPI',
            external_id: r.kaspi_merchant_sku || null,
            price: Number(r.kaspi_price), currency: 'KZT', is_active: true,
          }, { onConflict: 'variant_id,channel_code' });
        }
        if (r.qty && r.qty.trim() !== '') {
          await s.from('stock').upsert({
            variant_id: variantId, warehouse_code: 'MAIN', qty: Number(r.qty),
          }, { onConflict: 'variant_id,warehouse_code' });
        }
        await s.from('import_rows').insert({
          batch_id: batchId, row_number: i + 1, raw_json: r as any,
          target_product_id: productId, target_variant_id: variantId,
          status: 'imported',
        });
        ok++;
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        failed.push({ row: i + 1, error: msg });
        await s.from('import_rows').insert({
          batch_id: batchId, row_number: i + 1, raw_json: r as any,
          status: 'error', error: msg,
        });
      }
    }

    await s.from('import_batches').update({
      status: failed.length === 0 ? 'done' : 'failed',
      imported_rows: ok, failed_rows: failed.length,
      error_summary: failed.length > 0 ? `${failed.length} строк с ошибками` : null,
    }).eq('id', batchId);

    setResults({ ok, failed });
    setBusy(false);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Импорт CSV (универсальный — наш сайт + Каспи)</h1>
      <p className="text-sm text-neutral-500 mb-2">
        Один файл заполняет и нашу БД, и поля для Каспи. Массивы внутри ячейки — через <code className="bg-neutral-100 px-1 rounded">;</code>.
        Чтобы один товар привязать к трём авто — три значения в car_brand/car_model/car_year_from/car_year_to (соответственно по индексу).
      </p>
      <p className="text-sm text-neutral-500 mb-6">
        Категории/бренды должны быть в справочнике до импорта.
      </p>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <button
          onClick={() => {
            const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'myavto-import-template.csv'; a.click();
            URL.revokeObjectURL(url);
          }}
          className="border border-neutral-300 hover:border-black rounded-md px-3 py-2 text-sm"
        >Скачать шаблон CSV</button>
        <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <a href="/dashboard/export-kaspi" className="text-sm text-[var(--c-red)] hover:underline ml-auto">→ Выгрузить в формате Каспи</a>
      </div>

      {err && <div className="text-sm text-red-600 mb-4">{err}</div>}

      {rows.length > 0 && (
        <>
          <div className="text-sm text-neutral-500 mb-2">Найдено {rows.length} строк. Превью первых 5:</div>
          <div className="border border-neutral-200 rounded-lg overflow-x-auto mb-4 max-h-72">
            <table className="text-xs w-full">
              <thead className="bg-neutral-50 text-neutral-500 sticky top-0">
                <tr>{Object.keys(rows[0]).map((h) => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-neutral-200">
                    {Object.keys(rows[0]).map((h) => <td key={h} className="p-2 align-top whitespace-nowrap">{String((r as any)[h] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            disabled={busy}
            onClick={runImport}
            className="bg-[var(--c-red)] text-white px-5 py-2.5 rounded-md font-bold disabled:opacity-50"
          >{busy ? `Импорт… ${rows.length}` : `Импортировать ${rows.length} строк`}</button>
        </>
      )}

      {results && (
        <div className="mt-6 space-y-2">
          <div className="text-green-700 font-semibold">Готово · загружено: {results.ok}</div>
          {results.failed.length > 0 && (
            <div className="border border-red-200 bg-red-50 rounded p-3 text-sm">
              <div className="font-semibold text-red-700 mb-2">Ошибки: {results.failed.length}</div>
              <ul className="space-y-1">
                {results.failed.slice(0, 20).map((f) => <li key={f.row}>Строка {f.row}: {f.error}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
