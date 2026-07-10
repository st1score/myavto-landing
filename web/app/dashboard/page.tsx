'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORY_LABEL, type CatalogRow, type ProductStatus } from '@/lib/types';
import PublishSiteButton from '@/components/PublishSiteButton';

export default function DashboardList() {
  const [products, setProducts] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    // RLS shows owner all their products via the underlying products table; view inherits.
    const { data } = await supabaseBrowser().from('v_catalog').select('*').order('created_at', { ascending: false });
    setProducts((data ?? []) as CatalogRow[]);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function setStatus(p: CatalogRow, status: ProductStatus) {
    await supabaseBrowser().from('products').update({ status }).eq('id', p.id);
    await refresh();
  }
  async function remove(p: CatalogRow) {
    if (!confirm(`Удалить «${p.title}»? Это удалит варианты, цены и остатки.`)) return;
    await supabaseBrowser().from('products').delete().eq('id', p.id);
    await refresh();
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Мои товары</h1>
        <div className="flex gap-2 flex-wrap">
          <PublishSiteButton />
          <Link href="/dashboard/new" className="bg-[var(--c-red)] text-white px-4 py-2 rounded-md font-semibold">+ Добавить товар</Link>
        </div>
      </div>

      {loading && <p className="text-neutral-500">Загрузка…</p>}
      {!loading && products.length === 0 && (
        <div className="border border-dashed border-neutral-300 rounded-xl p-10 text-center text-neutral-500">
          Пока нет товаров. <Link href="/dashboard/new" className="text-[var(--c-red)] font-semibold">Создать первый</Link>.
        </div>
      )}

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="border border-neutral-200 rounded-lg p-3 flex items-center gap-4 flex-wrap sm:flex-nowrap">
            <div className="w-16 h-16 bg-neutral-50 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
              {p.image_url
                ? <img src={p.image_url} alt="" className="max-w-full max-h-full object-contain" />
                : <span className="text-neutral-300 font-bold">{p.brand_code[0]}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-neutral-500 uppercase tracking-wide font-semibold flex items-center gap-2">
                {p.brand_code} · {CATEGORY_LABEL[p.category_code] ?? p.category_code}
                <StatusPill status={p.status} />
              </div>
              <div className="font-semibold truncate">{p.title}</div>
              <div className="text-xs text-neutral-500 mt-0.5 flex gap-3 flex-wrap">
                {p.compatible_engines.length > 0 && <span>Моторы: {p.compatible_engines.slice(0, 3).join(', ')}{p.compatible_engines.length > 3 ? '…' : ''}</span>}
                <span>{p.variant_count} вариантов</span>
                <span>Остаток: {p.total_stock} шт</span>
                {p.price_own != null && <span className="font-semibold text-black">от {Number(p.price_own).toLocaleString('ru-RU')} ₸</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <select
                value={p.status}
                onChange={(e) => setStatus(p, e.target.value as ProductStatus)}
                className="border border-neutral-300 rounded-md px-2 py-1.5 text-xs"
              >
                <option value="draft">Черновик</option>
                <option value="active">Опубликован</option>
                <option value="archived">Архив</option>
              </select>
              <Link href={`/dashboard/edit?id=${p.id}`} className="px-3 py-1.5 rounded-md border border-neutral-300 hover:border-black">Изменить</Link>
              <Link href={`/dashboard/listings?id=${p.id}`} className="px-3 py-1.5 rounded-md border border-neutral-300 hover:border-black">Площадки</Link>
              <button onClick={() => remove(p)} className="px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ProductStatus }) {
  const map: Record<ProductStatus, string> = {
    draft:     'bg-neutral-100 text-neutral-600',
    active:    'bg-green-100 text-green-800',
    archived:  'bg-amber-100 text-amber-800',
  };
  const label: Record<ProductStatus, string> = { draft: 'Черновик', active: 'Опубликован', archived: 'Архив' };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${map[status]}`}>{label[status]}</span>;
}
