'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORY_LABEL, type CatalogRow } from '@/lib/types';

export default function Home() {
  const [recent, setRecent] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseBrowser()
      .from('v_catalog')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => { setRecent((data ?? []) as CatalogRow[]); setLoading(false); });
  }, []);

  const cats = [
    { code: 'PISTON', emoji: '⚙️' },
    { code: 'RING',   emoji: '⭕' },
    { code: 'BEARING', emoji: '🛡' },
    { code: 'LINER',  emoji: '🧱' },
    { code: 'KIT',    emoji: '📦' },
  ];

  return (
    <div>
      <section className="bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-xs tracking-widest uppercase text-[var(--c-red)] font-semibold mb-3">
            Капремонт двигателя · Алматы
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-3xl">
            Запчасти для капитального ремонта
            <br />
            <span className="text-[var(--c-red)]">японских двигателей</span>
          </h1>
          <p className="mt-4 text-neutral-600 max-w-2xl">
            Поршни · Кольца · Вкладыши · Гильзы · Ремкомплекты. TEIKIN, NPR, IZUMI, RIK, Taiho.
          </p>
          <div className="mt-6 max-w-2xl">
            <form action="/search" method="get" className="flex gap-2 border-2 border-black rounded-xl bg-white p-1.5">
              <input
                name="q"
                placeholder="OEM, артикул, двигатель, авто…"
                className="flex-1 outline-none px-3 py-2 text-base"
              />
              <button className="bg-[var(--c-red)] text-white px-5 py-2 rounded-lg font-bold hover:bg-[var(--c-red-dark)]">
                Найти
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Категории</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {cats.map((c) => (
            <Link
              key={c.code}
              href={`/search?category=${c.code}`}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-black hover:-translate-y-0.5 transition flex flex-col gap-2"
            >
              <div className="text-2xl">{c.emoji}</div>
              <div className="font-semibold">{CATEGORY_LABEL[c.code]}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold">Новые поступления</h2>
          <Link href="/search" className="text-sm text-[var(--c-red)] hover:underline">Весь каталог →</Link>
        </div>
        {loading && <p className="text-neutral-500">Загрузка…</p>}
        {!loading && recent.length === 0 && (
          <p className="text-neutral-500">Пока пусто. Добавь товар в <Link href="/dashboard" className="text-[var(--c-red)]">кабинете</Link>.</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recent.map((p) => <Card key={p.id} p={p} />)}
        </div>
      </section>
    </div>
  );
}

function Card({ p }: { p: CatalogRow }) {
  const inStock = p.total_stock > 0;
  return (
    <Link href={`/p/${p.id}`} className="group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-black transition">
      <div className="aspect-[4/3] bg-neutral-50 flex items-center justify-center overflow-hidden">
        {p.image_url
          ? <img src={p.image_url} alt="" className="max-w-full max-h-full object-contain p-3 group-hover:scale-105 transition" />
          : <div className="text-neutral-300 text-4xl font-bold">{p.brand_code[0]}</div>}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <div className="text-xs uppercase tracking-wide text-neutral-500 font-semibold flex items-center gap-1.5">
          {p.brand_code} {inStock && <span className="text-green-600">●</span>}
        </div>
        <div className="font-semibold line-clamp-2 text-sm">{p.title}</div>
        {p.variant_count > 1 && <div className="text-xs text-neutral-500">{p.variant_count} вариантов</div>}
        {p.price_own != null && <div className="font-bold text-base mt-1">от {Number(p.price_own).toLocaleString('ru-RU')} ₸</div>}
      </div>
    </Link>
  );
}
