'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { supabaseBrowser } from '@/lib/supabase/client';

const KASPI_HEADERS = [
  'merchant_sku', 'name', 'brand', 'image_code', 'youtube_id',
  'description', 'weight',
  'Pistons and components*Osnovnye harakteristiki.pistons and components*oem part number',
  'Pistons and components*Osnovnye harakteristiki.pistons and components*manufacturer part number',
  'Pistons and components*Osnovnye harakteristiki.pistons and components*type',
  'Replacement parts*Obsie harakteristiki.replacement parts*car brand',
  'Replacement parts*Obsie harakteristiki.replacement parts*car model',
  'Replacement parts*Obsie harakteristiki.replacement parts*car year',
  'Replacement parts*Obsie harakteristiki.replacement parts*car year to',
  'Replacement parts*Obsie harakteristiki.replacement parts*additional information',
];

type ExportRow = {
  merchant_sku: string;
  name: string;
  brand: string;
  image_code: string | null;
  youtube_id: string | null;
  image_urls: string | null; // ';'-joined
  description: string | null;
  weight_kg: number | null;
  oem_part_number: string | null;
  manufacturer_part_number: string | null;
  type: string | null;
  car_brand: string | null;
  car_model: string | null;
  car_year_from: string | null;
  car_year_to: string | null;
  additional_information: string | null;
  internal_product_id: string;
};

async function fetchAsBlob(url: string): Promise<Blob | null> {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.blob(); }
  catch { return null; }
}

export default function ExportKaspiPage() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setErr(null); setStatus('Запрос данных…');
    const s = supabaseBrowser();
    const { data, error } = await s.from('v_kaspi_export').select('*');
    if (error) { setErr(error.message); setBusy(false); return; }
    const rows = (data ?? []) as ExportRow[];
    if (rows.length === 0) { setErr('Нет товаров с активным KASPI-листингом. Создай listing в товаре → Площадки → KASPI.'); setBusy(false); return; }
    setStatus(`Получено ${rows.length} товаров. Скачиваю картинки…`);

    const zip = new JSZip();
    const imagesFolder = zip.folder('images')!;

    // xlsx
    const sheetRows = [
      KASPI_HEADERS,
      ...rows.map((r) => [
        r.merchant_sku ?? '',
        r.name ?? '',
        r.brand ?? '',
        r.image_code ?? r.merchant_sku ?? '',
        r.youtube_id ?? '',
        r.description ?? '',
        r.weight_kg ?? '',
        r.oem_part_number ?? '',
        r.manufacturer_part_number ?? '',
        r.type ?? '',
        r.car_brand ?? '',
        r.car_model ?? '',
        r.car_year_from ?? '',
        r.car_year_to ?? '',
        r.additional_information ?? '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'attributes');
    const xlsxBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    zip.file('kaspi.xlsx', xlsxBuf);

    // images per product
    let done = 0;
    for (const r of rows) {
      const folder = (r.image_code || r.merchant_sku || r.internal_product_id).replace(/[^a-zA-Z0-9._-]/g, '_');
      const urls = (r.image_urls ?? '').split(';').filter(Boolean).slice(0, 5);
      let idx = 1;
      for (const url of urls) {
        const blob = await fetchAsBlob(url);
        if (!blob) continue;
        const ext = (url.split('.').pop() ?? 'jpg').split('?')[0].toLowerCase();
        imagesFolder.file(`${folder}/${idx}.${ext}`, blob);
        idx++;
      }
      done++;
      if (done % 5 === 0) setStatus(`Картинки: ${done}/${rows.length}`);
    }

    setStatus('Упаковка ZIP…');
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaspi-export-${new Date().toISOString().slice(0,10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Готово: ${rows.length} товаров`);
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Выгрузка в Каспи</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Берёт все товары с активным листингом на канале <code className="bg-neutral-100 px-1 rounded">KASPI</code> и собирает ZIP-архив
        ровно так, как требует кабинет Каспи: <code className="bg-neutral-100 px-1 rounded">kaspi.xlsx</code> +
        папка <code className="bg-neutral-100 px-1 rounded">images/&lt;image_code&gt;/1.jpg ... 5.jpg</code>.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="bg-[var(--c-red)] text-white px-5 py-2.5 rounded-md font-bold disabled:opacity-50"
      >{busy ? 'Готовлю ZIP…' : 'Сгенерировать ZIP для Каспи'}</button>
      {status && <div className="mt-3 text-sm text-neutral-600">{status}</div>}
      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

      <div className="mt-8 text-sm text-neutral-600 space-y-2">
        <h2 className="font-semibold text-black">Как Каспи это потом разбирает</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>В кабинете Каспи Магазина: «Загрузить ZIP» → выбираешь скачанный архив.</li>
          <li>Каспи распаковывает, читает <code>kaspi.xlsx</code>, по каждой строке смотрит поле <b>image_code</b>.</li>
          <li>Идёт в папку <code>images/{'{image_code}'}/</code> и берёт оттуда все картинки, отсортированные по имени (мы кладём <code>1.jpg, 2.jpg, ...</code>).</li>
          <li>Создаёт товар, привязывает фото, отправляет на модерацию.</li>
        </ol>
        <p className="mt-3 text-neutral-500">URL картинок в Каспи не поддерживаются — поэтому мы качаем их из нашего Supabase Storage и кладём в zip.</p>
      </div>
    </div>
  );
}
