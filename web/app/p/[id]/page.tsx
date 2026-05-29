'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORY_LABEL, type Product, type ProductVariant, type Listing, type Stock } from '@/lib/types';

const WA_PHONE = '77015509377';
const waLink = (text: string) => `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;

type FullProduct = Product & {
  variants: ProductVariant[];
  listings: Listing[];
  stock: Stock[];
  primary_image: string | null;
  images: string[];
  related: { id: string; title: string; brand_code: string; category_code: string; image_url: string | null; price_own: number | null }[];
};

function Gallery({ images, fallback, alt }: { images: string[]; fallback: string; alt: string }) {
  const [active, setActive] = useState(0);
  const img = images[active];
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl aspect-[4/3] flex items-center justify-center p-6">
        {img
          ? <img src={img} alt={alt} className="max-w-full max-h-full object-contain" />
          : <div className="text-neutral-300 text-6xl font-bold">{fallback}</div>}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((u, i) => (
            <button
              key={u}
              onClick={() => setActive(i)}
              className={'flex-shrink-0 w-20 h-20 border-2 rounded-md flex items-center justify-center bg-neutral-50 ' + (i === active ? 'border-[var(--c-red)]' : 'border-neutral-200 hover:border-black')}
            >
              <img src={u} alt="" className="max-w-full max-h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<FullProduct | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pickedVariant, setPickedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const s = supabaseBrowser();
    (async () => {
      const { data: prod } = await s.from('products').select('*').eq('id', id).eq('status', 'active').maybeSingle();
      if (!prod) { setNotFound(true); return; }

      const [{ data: variants }, { data: media }] = await Promise.all([
        s.from('product_variants').select('*').eq('product_id', id).eq('is_active', true).order('sort_order'),
        s.from('product_media').select('media_id, role, sort_order, media!inner(url)').eq('product_id', id),
      ]);

      const variantIds = (variants ?? []).map((v: any) => v.id);
      const [{ data: listings }, { data: stock }] = await Promise.all([
        variantIds.length > 0 ? s.from('listings').select('*').in('variant_id', variantIds).eq('is_active', true) : Promise.resolve({ data: [] as any[] }),
        variantIds.length > 0 ? s.from('stock').select('*').in('variant_id', variantIds) : Promise.resolve({ data: [] as any[] }),
      ]);

      const sortedMedia = [...(media ?? [])].sort((a: any, b: any) => {
        if (a.role === 'primary' && b.role !== 'primary') return -1;
        if (b.role === 'primary' && a.role !== 'primary') return 1;
        return a.sort_order - b.sort_order;
      });
      const allImages = sortedMedia.map((m: any) => m.media?.url).filter(Boolean) as string[];
      const primary = allImages[0] ?? null;

      let related: FullProduct['related'] = [];
      if ((prod as Product).compatible_engines.length > 0) {
        const { data: rel } = await s.from('v_catalog')
          .select('id,title,brand_code,category_code,image_url,price_own')
          .eq('status', 'active')
          .neq('id', (prod as Product).id)
          .overlaps('compatible_engines', (prod as Product).compatible_engines)
          .limit(8);
        related = (rel ?? []) as any;
      }

      setP({
        ...(prod as Product),
        variants: (variants ?? []) as ProductVariant[],
        listings: (listings ?? []) as Listing[],
        stock: (stock ?? []) as Stock[],
        primary_image: primary,
        images: allImages,
        related,
      });
      if ((variants ?? []).length > 0) setPickedVariant((variants as any[])[0].id);
    })();
  }, [id]);

  if (notFound) return <div className="max-w-6xl mx-auto px-4 py-16 text-neutral-500">Товар не найден. <Link href="/search" className="text-[var(--c-red)] font-semibold">К каталогу</Link>.</div>;
  if (!p) return <div className="max-w-6xl mx-auto px-4 py-16 text-neutral-500">Загрузка…</div>;

  const pv = p.variants.find((v) => v.id === pickedVariant) ?? p.variants[0];
  const own = p.listings.find((l) => l.variant_id === pv?.id && l.channel_code === 'OWN');
  const totalQty = p.stock.filter((s) => s.variant_id === pv?.id).reduce((a, b) => a + b.qty, 0);

  const waText = `Здравствуйте! Интересует «${p.title}»${pv ? ` (SKU ${pv.sku})` : ''}. Есть в наличии?`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <nav className="text-xs text-neutral-500 mb-4 flex flex-wrap gap-1.5">
        <Link href="/" className="hover:text-[var(--c-red)]">Главная</Link>
        <span>·</span>
        <Link href={`/search?category=${p.category_code}`} className="hover:text-[var(--c-red)]">{CATEGORY_LABEL[p.category_code] ?? p.category_code}</Link>
        <span>·</span>
        <span>{p.brand_code}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Gallery images={p.images} fallback={p.brand_code[0]} alt={p.title} />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-black text-white px-3 py-1 rounded-full font-bold text-sm">{p.brand_code}</span>
            <span className={'flex items-center gap-1.5 text-sm font-semibold ' + (totalQty > 0 ? 'text-green-700' : 'text-neutral-500')}>
              <span className={'w-2 h-2 rounded-full ' + (totalQty > 0 ? 'bg-green-600' : 'bg-neutral-400')}></span>
              {totalQty > 0 ? `В наличии · ${totalQty} шт` : 'Под заказ'}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{p.title}</h1>
          {p.short_desc && <p className="text-neutral-600">{p.short_desc}</p>}

          {p.variants.length > 1 && (
            <div className="mt-2">
              <div className="text-xs uppercase tracking-wide text-neutral-500 font-semibold mb-2">Вариант</div>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((v) => {
                  const inStock = p.stock.filter((s) => s.variant_id === v.id).reduce((a, b) => a + b.qty, 0) > 0;
                  const isActive = v.id === pv?.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setPickedVariant(v.id)}
                      className={
                        'px-3 py-2 rounded-lg border-2 font-mono text-sm flex items-center gap-1.5 ' +
                        (isActive ? 'border-[var(--c-red)] bg-red-50 text-[var(--c-red)]' : 'border-neutral-300 hover:border-black')
                      }
                    >
                      {v.variant_attrs.size ?? v.sku}
                      {v.variant_attrs.insert && <span className="text-xs text-neutral-500">{v.variant_attrs.insert}</span>}
                      {inStock && <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {own?.price != null && <div className="text-3xl font-extrabold mt-2">{Number(own.price).toLocaleString('ru-RU')} ₸</div>}

          <div className="flex gap-3 mt-4">
            <a href={waLink(waText)} target="_blank" rel="noopener" className="bg-[var(--c-red)] hover:bg-[var(--c-red-dark)] text-white px-6 py-3 rounded-lg font-bold">
              Заказать в WhatsApp
            </a>
            <a href="tel:+77015509377" className="border-2 border-neutral-300 hover:border-black px-6 py-3 rounded-lg font-bold">
              +7 701 550-93-77
            </a>
          </div>

          {pv && <div className="text-xs text-neutral-500 mt-2">SKU: <code className="font-mono">{pv.sku}</code> · Master: <code className="font-mono">{p.master_sku}</code></div>}
        </div>
      </div>

      {p.description && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Описание</h2>
          <p className="whitespace-pre-wrap text-neutral-700">{p.description}</p>
        </section>
      )}

      {p.compatible_engines.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Совместимые двигатели</h2>
          <div className="flex flex-wrap gap-2">
            {p.compatible_engines.map((e) => (
              <Link key={e} href={`/search?engine=${e}`} className="bg-neutral-100 hover:bg-black hover:text-white transition px-3 py-1.5 rounded-full font-mono font-bold text-sm">
                {e}
              </Link>
            ))}
          </div>
        </section>
      )}

      {p.oem_numbers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">OEM-номера</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.oem_numbers.map((n) => <span key={n} className="bg-neutral-50 border border-neutral-200 px-3 py-1 rounded-md font-mono text-sm">{n}</span>)}
          </div>
        </section>
      )}

      {p.cross_numbers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Аналоги по номеру</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.cross_numbers.map((n) => <span key={n} className="bg-neutral-50 border border-neutral-200 px-3 py-1 rounded-md font-mono text-sm">{n}</span>)}
          </div>
        </section>
      )}

      {p.related.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Другие запчасти для этих моторов</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {p.related.map((r) => (
              <Link key={r.id} href={`/p/${r.id}`} className="bg-white border border-neutral-200 rounded-lg overflow-hidden hover:border-black transition">
                <div className="aspect-square bg-neutral-50 flex items-center justify-center overflow-hidden">
                  {r.image_url
                    ? <img src={r.image_url} alt="" className="max-w-full max-h-full object-contain p-2" />
                    : <div className="text-neutral-300 text-2xl font-bold">{r.brand_code[0]}</div>}
                </div>
                <div className="p-2.5">
                  <div className="text-xs text-neutral-500 font-semibold">{r.brand_code} · {CATEGORY_LABEL[r.category_code] ?? r.category_code}</div>
                  <div className="font-semibold text-sm line-clamp-2">{r.title}</div>
                  {r.price_own != null && <div className="font-bold text-sm mt-1">от {Number(r.price_own).toLocaleString('ru-RU')} ₸</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
