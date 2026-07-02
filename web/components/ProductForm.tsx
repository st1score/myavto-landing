'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Brand, Category, Engine, ProductStatus, ProductVariant, KaspiVehicle, CatalogTag } from '@/lib/types';
import { KASPI_TYPE_BY_CATEGORY } from '@/lib/types';
import GalleryEditor from '@/components/GalleryEditor';
import { buildMasterSku, calculateKztPrice, marginFromKzt, roundUpToStep, DEFAULT_MARGIN_PERCENT, DEFAULT_USD_KZT_RATE } from '@/lib/pricing';

type FormState = {
  title: string;
  short_desc: string;
  description: string;
  category_code: string;
  brand_code: string;
  master_sku: string;
  manufacturer_part_number: string;
  oem_numbers_raw: string;
  cross_numbers_raw: string;
  compatible_engines_raw: string;
  group_tag: string;
  status: ProductStatus;
  size: string;
  insert_type: string;
  price_usd: string;
  exchange_rate: string;
  margin_percent: string;
  price_kzt: string;
  qty: string;
  image_url: string;
  image_media_id: string | null;
  // Kaspi-specific
  kaspi_type: string;
  youtube_id: string;
  kaspi_image_code: string;
  weight_kg: string;
  additional_info: string;
  kaspi_vehicles: KaspiVehicle[];
};

const tags = (s: string) => s.split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);
const pricingMetaPrefix = 'pricing:';
const cyrillicToLatin: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function referenceCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => cyrillicToLatin[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function pricingMeta(exchangeRate: number, marginPercent: number) {
  return `${pricingMetaPrefix}${JSON.stringify({ exchange_rate: exchangeRate, margin_percent: marginPercent })}`;
}

function readPricingMeta(value: string | null | undefined) {
  if (!value?.startsWith(pricingMetaPrefix)) return {};
  try {
    return JSON.parse(value.slice(pricingMetaPrefix.length)) as { exchange_rate?: number; margin_percent?: number };
  } catch {
    return {};
  }
}

const blankForm = (): FormState => ({
  title: '', short_desc: '', description: '',
  category_code: 'PISTON', brand_code: 'TEIKIN',
  master_sku: '',
  manufacturer_part_number: '',
  oem_numbers_raw: '', cross_numbers_raw: '', compatible_engines_raw: '', group_tag: '',
  status: 'draft',
  size: '', insert_type: '', price_usd: '', exchange_rate: String(DEFAULT_USD_KZT_RATE), margin_percent: String(DEFAULT_MARGIN_PERCENT), price_kzt: '', qty: '',
  image_url: '', image_media_id: null,
  kaspi_type: '', youtube_id: '', kaspi_image_code: '', weight_kg: '', additional_info: '',
  kaspi_vehicles: [],
});

export default function ProductForm({ mode, productId }: { mode: 'create' | 'edit'; productId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blankForm());
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [tagList, setTagList] = useState<CatalogTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [referenceBusy, setReferenceBusy] = useState<'category' | 'brand' | null>(null);
  const [referenceErr, setReferenceErr] = useState<string | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newBrandOpen, setNewBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandCode, setNewBrandCode] = useState('');
  const [loaded, setLoaded] = useState(mode === 'create');
  const generatedMasterSku = buildMasterSku({
    brandCode: form.brand_code,
    manufacturerPartNumber: form.manufacturer_part_number,
    size: form.size,
  });

  useEffect(() => {
    const s = supabaseBrowser();
    Promise.all([
      s.from('categories').select('*').order('sort_order'),
      s.from('brands').select('*').order('name'),
      s.from('engines').select('*').order('code'),
      s.from('pricing_settings').select('usd_kzt_rate, default_margin_percent').eq('id', true).maybeSingle(),
      s.from('catalog_tags').select('*').order('sort_order'),
    ]).then(([c, b, e, ps, tg]) => {
      setCats((c.data ?? []) as Category[]);
      setTagList((tg.data ?? []) as CatalogTag[]);
      const dbBrands = (b.data ?? []) as Brand[];
      const merged = dbBrands.some((x) => x.code === 'ND')
        ? dbBrands
        : [...dbBrands, { code: 'ND', name: 'ND' } as Brand].sort((a, b) => a.name.localeCompare(b.name));
      setBrands(merged);
      setEngines((e.data ?? []) as Engine[]);
      if (mode === 'create' && ps.data) {
        setForm((f) => ({
          ...f,
          exchange_rate: String((ps.data as any).usd_kzt_rate ?? DEFAULT_USD_KZT_RATE),
          margin_percent: String((ps.data as any).default_margin_percent ?? DEFAULT_MARGIN_PERCENT),
        }));
      }
    });
  }, [mode]);

  useEffect(() => {
    if (mode !== 'edit' || !productId) return;
    (async () => {
      const s = supabaseBrowser();
      const { data: p } = await s.from('products').select('*').eq('id', productId).single();
      if (!p) { setErr('Товар не найден'); setLoaded(true); return; }

      const { data: vs } = await s.from('product_variants').select('*').eq('product_id', productId).order('sort_order').limit(1);
      const variant = (vs ?? [])[0] as ProductVariant | undefined;

      let priceUsd = '', exchangeRate = '', marginPercent = '', qty = '';
      if (variant) {
        const { data: ls } = await s.from('listings').select('*').eq('variant_id', variant.id).eq('channel_code', 'OWN').maybeSingle();
        const meta = readPricingMeta((ls as any)?.description_override);
        if ((ls as any)?.price_usd != null) priceUsd = String((ls as any).price_usd);
        else if (ls?.compare_at_price != null) priceUsd = String(ls.compare_at_price);
        if ((ls as any)?.exchange_rate != null) exchangeRate = String((ls as any).exchange_rate);
        else if (meta.exchange_rate != null) exchangeRate = String(meta.exchange_rate);
        if ((ls as any)?.margin_percent != null) marginPercent = String((ls as any).margin_percent);
        else if (meta.margin_percent != null) marginPercent = String(meta.margin_percent);
        const { data: st } = await s.from('stock').select('*').eq('variant_id', variant.id).eq('warehouse_code', 'MAIN').maybeSingle();
        if (st?.qty != null) qty = String(st.qty);
      }
      if (!exchangeRate || !marginPercent) {
        const { data: ps } = await s.from('pricing_settings').select('usd_kzt_rate, default_margin_percent').eq('id', true).maybeSingle();
        exchangeRate = exchangeRate || String((ps as any)?.usd_kzt_rate ?? DEFAULT_USD_KZT_RATE);
        marginPercent = marginPercent || String((ps as any)?.default_margin_percent ?? DEFAULT_MARGIN_PERCENT);
      }
      const { data: pm } = await s.from('product_media').select('media_id, media!inner(url)').eq('product_id', productId).eq('role', 'primary').maybeSingle();

      setForm({
        title: p.title ?? '',
        short_desc: p.short_desc ?? '',
        description: p.description ?? '',
        category_code: p.category_code,
        brand_code: p.brand_code,
        master_sku: p.master_sku ?? '',
        manufacturer_part_number: p.manufacturer_part_number ?? '',
        oem_numbers_raw: (p.oem_numbers ?? []).join(', '),
        cross_numbers_raw: (p.cross_numbers ?? []).join(', '),
        compatible_engines_raw: (p.compatible_engines ?? []).join(', '),
        group_tag: p.group_tag ?? '',
        status: p.status,
        size: variant?.variant_attrs?.size ?? '',
        insert_type: variant?.variant_attrs?.insert ?? '',
        price_usd: priceUsd,
        exchange_rate: exchangeRate,
        margin_percent: marginPercent,
        price_kzt: priceUsd.trim() === '' ? '' : String(calculateKztPrice(Number(priceUsd), Number(exchangeRate || DEFAULT_USD_KZT_RATE), Number(marginPercent || 0))),
        qty,
        image_url: (pm as any)?.media?.url ?? '',
        image_media_id: (pm as any)?.media_id ?? null,
        kaspi_type: p.kaspi_type ?? '',
        youtube_id: p.youtube_id ?? '',
        kaspi_image_code: p.kaspi_image_code ?? '',
        weight_kg: p.weight_kg != null ? String(p.weight_kg) : '',
        additional_info: p.additional_info ?? '',
        kaspi_vehicles: Array.isArray(p.kaspi_vehicles) ? p.kaspi_vehicles : [],
      });
      setLoaded(true);
    })();
  }, [mode, productId]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function addCategory() {
    const name = newCategoryName.trim();
    const code = referenceCode(newCategoryCode || name);
    setReferenceErr(null);
    if (!name) { setReferenceErr('Введите название новой категории.'); return; }
    if (!code) { setReferenceErr('Введите код категории латиницей, например GASKET.'); return; }

    const existing = cats.find((c) => c.code === code || c.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'));
    if (existing) {
      set('category_code', existing.code);
      setNewCategoryOpen(false);
      setNewCategoryName('');
      setNewCategoryCode('');
      return;
    }

    setReferenceBusy('category');
    const nextSortOrder = Math.max(0, ...cats.map((c) => c.sort_order ?? 0)) + 10;
    const { data, error } = await supabaseBrowser()
      .from('categories')
      .insert({ code, name, sort_order: nextSortOrder })
      .select('*')
      .single();
    setReferenceBusy(null);
    if (error) { setReferenceErr(`Не удалось добавить категорию: ${error.message}`); return; }

    const category = data as Category;
    setCats((items) => [...items, category].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
    set('category_code', category.code);
    setNewCategoryOpen(false);
    setNewCategoryName('');
    setNewCategoryCode('');
  }

  async function addBrand() {
    const name = newBrandName.trim();
    const code = referenceCode(newBrandCode || name);
    setReferenceErr(null);
    if (!name) { setReferenceErr('Введите название нового бренда.'); return; }
    if (!code) { setReferenceErr('Введите код бренда латиницей, например KOLBENSCHMIDT.'); return; }

    const existing = brands.find((b) => b.code === code || b.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'));
    if (existing) {
      set('brand_code', existing.code);
      setNewBrandOpen(false);
      setNewBrandName('');
      setNewBrandCode('');
      return;
    }

    setReferenceBusy('brand');
    const { data, error } = await supabaseBrowser()
      .from('brands')
      .insert({ code, name, is_oem: false })
      .select('*')
      .single();
    setReferenceBusy(null);
    if (error) { setReferenceErr(`Не удалось добавить бренд: ${error.message}`); return; }

    const brand = data as Brand;
    setBrands((items) => [...items, brand].sort((a, b) => a.name.localeCompare(b.name)));
    set('brand_code', brand.code);
    setNewBrandOpen(false);
    setNewBrandName('');
    setNewBrandCode('');
  }

  // --- Dynamic price fields -------------------------------------------------
  // The four price inputs (закуп $, курс, наценка %, цена ₸) are linked:
  // editing cost / rate / margin recomputes the final ₸ price; editing the
  // final ₸ price back-computes the margin %. So the owner can drive pricing
  // from whichever direction is convenient.
  const rateOf = (f: FormState) => Number(f.exchange_rate || DEFAULT_USD_KZT_RATE);
  const recalcKzt = (f: FormState) =>
    f.price_usd.trim() === '' ? '' : String(calculateKztPrice(Number(f.price_usd), rateOf(f), Number(f.margin_percent || 0)));

  function setUsd(v: string)    { setForm((f) => { const nf = { ...f, price_usd: v };    return { ...nf, price_kzt: recalcKzt(nf) }; }); }
  function setRate(v: string)   { setForm((f) => { const nf = { ...f, exchange_rate: v }; return { ...nf, price_kzt: recalcKzt(nf) }; }); }
  function setMargin(v: string) { setForm((f) => { const nf = { ...f, margin_percent: v };return { ...nf, price_kzt: recalcKzt(nf) }; }); }
  function setKzt(v: string) {
    setForm((f) => {
      const usd = Number(f.price_usd), rate = rateOf(f);
      const margin = v.trim() === '' || !usd || !rate ? f.margin_percent : String(marginFromKzt(Number(v), usd, rate));
      return { ...f, price_kzt: v, margin_percent: margin };
    });
  }

  async function uploadImage(file: File) {
    setUploading(true); setErr(null);
    const s = supabaseBrowser();
    const { data: u } = await s.auth.getUser();
    if (!u.user) { setErr('Не авторизован'); setUploading(false); return; }
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const path = `${u.user.id}/${Date.now()}.${ext}`;
    const up = await s.storage.from('product-images').upload(path, file, { contentType: file.type });
    if (up.error) { setErr(up.error.message); setUploading(false); return; }
    const { data: pub } = s.storage.from('product-images').getPublicUrl(path);
    const { data: m, error: mErr } = await s.from('media').insert({
      owner_id: u.user.id, url: pub.publicUrl, storage_path: path,
      media_type: 'image', mime_type: file.type, bytes: file.size,
    }).select('id, url').single();
    if (mErr) { setErr(mErr.message); setUploading(false); return; }
    set('image_url', (m as any).url);
    set('image_media_id', (m as any).id);
    setUploading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const s = supabaseBrowser();
    const { data: u } = await s.auth.getUser();
    if (!u.user) { setErr('Не авторизован'); setBusy(false); return; }

    const masterSku = form.master_sku.trim() || generatedMasterSku;

    // New group tag typed in the field → add it to the catalog so it shows up
    // in the dropdown next time. Idempotent (slug is PK), ignore conflicts.
    const groupTag = form.group_tag.trim();
    if (groupTag && !tagList.some((t) => t.slug === groupTag)) {
      await s.from('catalog_tags').upsert(
        { slug: groupTag, label: groupTag, owner_id: u.user.id },
        { onConflict: 'slug', ignoreDuplicates: true },
      );
    }

    const productPayload = {
      owner_id: u.user.id,
      master_sku: masterSku,
      title: form.title,
      short_desc: form.short_desc || null,
      description: form.description || null,
      category_code: form.category_code,
      brand_code: form.brand_code,
      manufacturer_part_number: form.manufacturer_part_number || null,
      oem_numbers: tags(form.oem_numbers_raw),
      cross_numbers: tags(form.cross_numbers_raw),
      compatible_engines: tags(form.compatible_engines_raw).map((x) => x.toUpperCase()),
      group_tag: form.group_tag.trim() || null,
      status: form.status,
      kaspi_type: form.kaspi_type || null,
      youtube_id: form.youtube_id || null,
      kaspi_image_code: form.kaspi_image_code || null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      additional_info: form.additional_info || null,
      kaspi_vehicles: form.kaspi_vehicles,
    };

    let productId_ = productId;
    if (mode === 'create') {
      const { data, error } = await s.from('products').insert(productPayload).select('id').single();
      if (error) { setErr(error.message); setBusy(false); return; }
      productId_ = (data as any).id as string;
    } else {
      const { error } = await s.from('products').update(productPayload).eq('id', productId_!);
      if (error) { setErr(error.message); setBusy(false); return; }
    }

    let variantId: string;
    const { data: existing } = await s.from('product_variants').select('id').eq('product_id', productId_!).order('sort_order').limit(1);
    const variantAttrs = {
      ...(form.size ? { size: form.size } : {}),
      ...(form.insert_type ? { insert: form.insert_type } : {}),
    };
    if (existing && existing.length > 0) {
      variantId = (existing[0] as any).id;
      await s.from('product_variants').update({ variant_attrs: variantAttrs }).eq('id', variantId);
    } else {
      const { data: nv, error } = await s.from('product_variants').insert({
        product_id: productId_!, sku: null, variant_attrs: variantAttrs, is_active: true,
      }).select('id').single();
      if (error) { setErr(error.message); setBusy(false); return; }
      variantId = (nv as any).id;
    }

    if (form.price_usd.trim() !== '') {
      const priceUsd = Number(form.price_usd);
      const exchangeRate = Number(form.exchange_rate || DEFAULT_USD_KZT_RATE);
      const marginPercent = Number(form.margin_percent || DEFAULT_MARGIN_PERCENT);
      // If the owner typed a final ₸ price directly, honour it (snapped to the
      // 500 grid); otherwise derive it from cost × rate × margin.
      const price = form.price_kzt.trim() !== ''
        ? roundUpToStep(Number(form.price_kzt))
        : calculateKztPrice(priceUsd, exchangeRate, marginPercent);
      const fullListing = {
        variant_id: variantId, channel_code: 'OWN',
        price,
        price_usd: priceUsd,
        exchange_rate: exchangeRate,
        margin_percent: marginPercent,
        compare_at_price: priceUsd,
        description_override: pricingMeta(exchangeRate, marginPercent),
        currency: 'KZT',
        is_active: true,
      };
      const listingSave = await s.from('listings').upsert(fullListing, { onConflict: 'variant_id,channel_code' });
      if (listingSave.error) {
        const { error } = await s.from('listings').upsert({
          variant_id: variantId, channel_code: 'OWN',
          price,
          compare_at_price: priceUsd,
          description_override: pricingMeta(exchangeRate, marginPercent),
          currency: 'KZT',
          is_active: true,
        }, { onConflict: 'variant_id,channel_code' });
        if (error) { setErr(error.message); setBusy(false); return; }
      }

      await s.from('pricing_settings').upsert({
        id: true,
        usd_kzt_rate: exchangeRate,
        default_margin_percent: marginPercent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      const { data: pricedListings } = await s.from('listings').select('*');
      for (const listing of (pricedListings ?? []) as any[]) {
        const meta = readPricingMeta(listing.description_override);
        const usd = listing.price_usd ?? listing.compare_at_price;
        if (usd == null) continue;
        const nextMargin = Number(listing.margin_percent ?? meta.margin_percent ?? marginPercent);
        const nextPrice = calculateKztPrice(Number(usd), exchangeRate, nextMargin);
        const update = await s.from('listings').update({
          price: nextPrice,
          exchange_rate: exchangeRate,
          margin_percent: nextMargin,
          description_override: pricingMeta(exchangeRate, nextMargin),
        }).eq('id', listing.id);
        if (update.error) {
          await s.from('listings').update({
            price: nextPrice,
            description_override: pricingMeta(exchangeRate, nextMargin),
          }).eq('id', listing.id);
        }
      }
    }
    if (form.qty.trim() !== '') {
      await s.from('stock').upsert({
        variant_id: variantId, warehouse_code: 'MAIN', qty: Number(form.qty),
      }, { onConflict: 'variant_id,warehouse_code' });
    }

    // In CREATE mode the legacy single-image picker provides image_media_id;
    // attach it as primary. In EDIT mode the GalleryEditor component owns
    // product_media directly — touching it from here would clobber its state.
    if (mode === 'create' && form.image_media_id) {
      await s.from('product_media').delete().eq('product_id', productId_!).eq('role', 'primary');
      await s.from('product_media').insert({
        product_id: productId_!, media_id: form.image_media_id, role: 'primary', sort_order: 0,
      });
    }

    setBusy(false);
    // After create — go to edit so user can add multiple images.
    router.replace(mode === 'create' ? `/dashboard/edit?id=${productId_}` : '/dashboard');
  }

  const typeOptions = KASPI_TYPE_BY_CATEGORY[form.category_code] ?? [];

  if (!loaded) return <div className="text-neutral-500">Загрузка…</div>;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{mode === 'create' ? 'Новый товар' : 'Изменить товар'}</h1>

      <Section title="Основное">
        <Field label="Название*"><input required value={form.title} onChange={(e) => set('title', e.target.value)} className={input} placeholder="Поршень 1KZ TEIKIN +0.50" /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Field label="Категория*">
              <div className="flex gap-2">
                <select required value={form.category_code} onChange={(e) => set('category_code', e.target.value)} className={input}>
                  {cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => { setNewCategoryOpen((open) => !open); setNewBrandOpen(false); setReferenceErr(null); }}
                  className="shrink-0 border border-neutral-300 hover:border-black rounded-lg px-3 text-sm"
                  aria-expanded={newCategoryOpen}
                >
                  + Новая
                </button>
              </div>
            </Field>
            {newCategoryOpen && (
              <ReferenceCreator
                kind="category"
                name={newCategoryName}
                code={newCategoryCode}
                busy={referenceBusy === 'category'}
                onNameChange={(value) => { setNewCategoryName(value); setNewCategoryCode(referenceCode(value)); }}
                onCodeChange={setNewCategoryCode}
                onSave={addCategory}
                onCancel={() => { setNewCategoryOpen(false); setReferenceErr(null); }}
              />
            )}
          </div>
          <div>
            <Field label="Бренд*">
              <div className="flex gap-2">
                <select required value={form.brand_code} onChange={(e) => set('brand_code', e.target.value)} className={input}>
                  {brands.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => { setNewBrandOpen((open) => !open); setNewCategoryOpen(false); setReferenceErr(null); }}
                  className="shrink-0 border border-neutral-300 hover:border-black rounded-lg px-3 text-sm"
                  aria-expanded={newBrandOpen}
                >
                  + Новый
                </button>
              </div>
            </Field>
            {newBrandOpen && (
              <ReferenceCreator
                kind="brand"
                name={newBrandName}
                code={newBrandCode}
                busy={referenceBusy === 'brand'}
                onNameChange={(value) => { setNewBrandName(value); setNewBrandCode(referenceCode(value)); }}
                onCodeChange={setNewBrandCode}
                onSave={addBrand}
                onCancel={() => { setNewBrandOpen(false); setReferenceErr(null); }}
              />
            )}
          </div>
        </div>
        {referenceErr && <div className="text-sm text-red-600">{referenceErr}</div>}
        <Field label="Master SKU (внутренний артикул)">
          <div className="flex gap-2">
            <input value={form.master_sku} onChange={(e) => set('master_sku', e.target.value)} className={input} placeholder={generatedMasterSku} />
            <button type="button" onClick={() => set('master_sku', generatedMasterSku)} className="shrink-0 border border-neutral-300 hover:border-black rounded-lg px-3 text-sm">Сгенерировать</button>
          </div>
          <p className="text-xs text-neutral-500 mt-1">Авто-формат: MYA + бренд + артикул производителя + размер. Например: <code className="bg-neutral-100 px-1 rounded">{generatedMasterSku}</code>.</p>
        </Field>
        <Field label="Артикул производителя (manufacturer part number) — у каждого бренда свой">
          <input value={form.manufacturer_part_number} onChange={(e) => set('manufacturer_part_number', e.target.value)} className={input} placeholder="напр. для TEIKIN: 46283; для NPR: SDT-30041; и т.д." />
          <p className="text-xs text-neutral-500 mt-1">Каспи требует обязательно. Для одного и того же поршня у TEIKIN/NPR/IZUMI — разные номера, и для каждого создаётся отдельный товар.</p>
        </Field>
      </Section>

      <Section title="Совместимость и идентификаторы">
        <Field label="Совместимые двигатели (через запятую)">
          <input value={form.compatible_engines_raw} onChange={(e) => set('compatible_engines_raw', e.target.value)} className={input} placeholder="1KZ, 1KZ-TE, 2L" />
          <p className="text-xs text-neutral-500 mt-1">В справочнике сейчас {engines.length} мотор(а/ов).</p>
        </Field>
        <Field label="Группа / тег (для сборки всех запчастей по мотору)">
          <input
            value={form.group_tag}
            onChange={(e) => set('group_tag', e.target.value)}
            className={input}
            list="group-tags"
            placeholder="напр. Капремонт 4D56 — выбери из списка или впиши новый"
          />
          <datalist id="group-tags">
            {tagList.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </datalist>
          <p className="text-xs text-neutral-500 mt-1">
            Один тег на товар. Все карточки с этим тегом соберутся на одной странице
            (<code className="bg-neutral-100 px-1 rounded">/search?tag=…</code>). Новый тег добавится в список автоматически. Тегов: {tagList.length}.
          </p>
        </Field>
        <Field label="OEM-номера (через запятую) — Каспи требует"><input value={form.oem_numbers_raw} onChange={(e) => set('oem_numbers_raw', e.target.value)} className={input} placeholder="13101-67010, 13101-67020" /></Field>
        <Field label="Аналоги-номера (через запятую)"><input value={form.cross_numbers_raw} onChange={(e) => set('cross_numbers_raw', e.target.value)} className={input} /></Field>
      </Section>

      <Section title="Варианты и склад">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Размер"><input value={form.size} onChange={(e) => set('size', e.target.value)} className={input} placeholder="STD / 0.50 / 1.00" /></Field>
          <Field label="Insert"><input value={form.insert_type} onChange={(e) => set('insert_type', e.target.value)} className={input} placeholder="plain / A / AG" /></Field>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Цена закупа, $"><input type="number" min="0" step="0.01" value={form.price_usd} onChange={(e) => setUsd(e.target.value)} className={input} /></Field>
          <Field label="Курс $ → ₸"><input type="number" min="1" step="0.01" value={form.exchange_rate} onChange={(e) => setRate(e.target.value)} className={input} /></Field>
          <Field label="Наценка, %"><input type="number" step="0.1" value={form.margin_percent} onChange={(e) => setMargin(e.target.value)} className={input} /></Field>
          <Field label="Цена продажи, ₸"><input type="number" min="0" step="500" value={form.price_kzt} onChange={(e) => setKzt(e.target.value)} className={input} placeholder="13 000" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Остаток (MAIN), шт"><input type="number" min="0" value={form.qty} onChange={(e) => set('qty', e.target.value)} className={input} /></Field>
          <Field label="Вес, кг (для Каспи)"><input type="number" step="0.01" min="0" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} className={input} placeholder="0.45" /></Field>
        </div>
        <p className="text-xs text-neutral-500">Поля связаны: меняешь закуп / курс / наценку — пересчитывается цена продажи; впишешь цену продажи — пересчитается наценка. Цена округляется до 500 ₸. Курс сохраняется глобально и пересчитывает все товары с USD-ценой.</p>
      </Section>

      <Section title="Каспи-поля">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип (Kaspi enum)">
            <select value={form.kaspi_type} onChange={(e) => set('kaspi_type', e.target.value)} className={input}>
              <option value="">— не выбрано —</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="YouTube ID / ссылка"><input value={form.youtube_id} onChange={(e) => set('youtube_id', e.target.value)} className={input} placeholder="dQw4w9WgXcQ" /></Field>
        </div>
        <Field label="Код изображений Каспи (image_code)"><input value={form.kaspi_image_code} onChange={(e) => set('kaspi_image_code', e.target.value)} className={input} /></Field>
        <Field label="Дополнительная информация"><textarea value={form.additional_info} onChange={(e) => set('additional_info', e.target.value)} className={input + ' h-20'} /></Field>

        <VehiclesEditor value={form.kaspi_vehicles} onChange={(v) => set('kaspi_vehicles', v)} />
      </Section>

      <Section title="Контент">
        <Field label="Короткое описание"><input value={form.short_desc} onChange={(e) => set('short_desc', e.target.value)} className={input} placeholder="Одной строкой, для карточки" /></Field>
        <Field label="Описание (Каспи: мин 100, макс 7000 символов)"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} className={input + ' h-32'} /></Field>
        {mode === 'edit' && productId ? (
          <Field label="Фотографии товара (галерея)">
            <GalleryEditor productId={productId} />
            <p className="text-xs text-neutral-500 mt-2">Картинки лежат в Supabase Storage и доступны на витрине. Первое фото = главное. Для Каспи: будут упакованы в zip папкой <code className="bg-neutral-100 px-1 rounded">images/{form.master_sku || 'MYA-...'}/</code>.</p>
          </Field>
        ) : (
          <Field label="Фото товара">
            <div className="flex items-center gap-3">
              {form.image_url && <img src={form.image_url} alt="" className="w-20 h-20 object-contain bg-neutral-50 rounded border border-neutral-200" />}
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} disabled={uploading} />
              {uploading && <span className="text-sm text-neutral-500">Загрузка…</span>}
              {form.image_url && <button type="button" onClick={() => { set('image_url',''); set('image_media_id', null); }} className="text-sm text-red-600">Открепить</button>}
            </div>
            <p className="text-xs text-neutral-500 mt-2">После сохранения откроется галерея для загрузки нескольких фото.</p>
          </Field>
        )}
      </Section>

      <Section title="Публикация">
        <Field label="Статус">
          <select value={form.status} onChange={(e) => set('status', e.target.value as ProductStatus)} className={input}>
            <option value="draft">Черновик (не виден покупателям)</option>
            <option value="active">Опубликован</option>
            <option value="archived">Архив</option>
          </select>
        </Field>
      </Section>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex gap-3 pt-2 border-t border-neutral-200">
        <button disabled={busy} className="bg-[var(--c-red)] text-white px-5 py-2.5 rounded-md font-bold disabled:opacity-50">
          {busy ? '…' : (mode === 'create' ? 'Создать' : 'Сохранить')}
        </button>
        <button type="button" onClick={() => router.replace('/dashboard')} className="px-5 py-2.5 rounded-md border border-neutral-300">Отмена</button>
      </div>
    </form>
  );
}

function VehiclesEditor({ value, onChange }: { value: KaspiVehicle[]; onChange: (v: KaspiVehicle[]) => void }) {
  const update = (i: number, patch: Partial<KaspiVehicle>) => onChange(value.map((v, j) => j === i ? { ...v, ...patch } : v));
  const add = () => onChange([...value, { brand: '', model: '', year_from: null, year_to: null }]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div>
      <div className="text-sm font-medium text-neutral-700 mb-1">Совместимые авто (для Каспи: brand / model / годы)</div>
      <p className="text-xs text-neutral-500 mb-2">Каждая строка превращается в Replacement parts × car brand / model / year при экспорте.</p>
      <div className="space-y-2">
        {value.map((v, i) => (
          <div key={i} className="grid grid-cols-[2fr_2fr_100px_100px_auto] gap-2 items-center">
            <input value={v.brand} onChange={(e) => update(i, { brand: e.target.value })} placeholder="Toyota" className={input} />
            <input value={v.model} onChange={(e) => update(i, { model: e.target.value })} placeholder="Land Cruiser Prado" className={input} />
            <input type="number" value={v.year_from ?? ''} onChange={(e) => update(i, { year_from: e.target.value === '' ? null : Number(e.target.value) })} placeholder="1996" className={input} />
            <input type="number" value={v.year_to ?? ''} onChange={(e) => update(i, { year_to: e.target.value === '' ? null : Number(e.target.value) })} placeholder="2002" className={input} />
            <button type="button" onClick={() => remove(i)} className="text-red-600 text-sm">✕</button>
          </div>
        ))}
        <button type="button" onClick={add} className="border border-neutral-300 hover:border-black rounded-md px-3 py-1.5 text-sm">+ Добавить авто</button>
      </div>
    </div>
  );
}

function ReferenceCreator({
  kind,
  name,
  code,
  busy,
  onNameChange,
  onCodeChange,
  onSave,
  onCancel,
}: {
  kind: 'category' | 'brand';
  name: string;
  code: string;
  busy: boolean;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isCategory = kind === 'category';
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-sm font-semibold">{isCategory ? 'Новая категория' : 'Новый бренд'}</div>
      <input
        autoFocus
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className={input}
        placeholder={isCategory ? 'Например: Прокладки' : 'Например: Kolbenschmidt'}
      />
      <input
        value={code}
        onChange={(e) => onCodeChange(referenceCode(e.target.value))}
        className={input}
        placeholder={isCategory ? 'Код: GASKET' : 'Код: KOLBENSCHMIDT'}
      />
      <p className="text-xs text-neutral-500">Код заполняется автоматически. Его можно поправить до сохранения.</p>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={onSave} className="rounded-md bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Сохраняю…' : 'Добавить и выбрать'}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          Отмена
        </button>
      </div>
    </div>
  );
}

const input = 'w-full border border-neutral-300 rounded-lg px-3 py-2 focus:border-black outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium text-neutral-700 block mb-1">{label}</span>{children}</label>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border border-neutral-200 rounded-xl p-4">
      <legend className="px-2 text-sm font-bold uppercase tracking-wider text-neutral-700">{title}</legend>
      {children}
    </fieldset>
  );
}
