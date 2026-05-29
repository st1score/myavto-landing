'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Channel, Listing, Product, ProductVariant } from '@/lib/types';

type Row = {
  variant: ProductVariant;
  byChannel: Record<string, Listing | undefined>;
};

export default function ListingsPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true); setErr(null);
    const s = supabaseBrowser();
    const [{ data: p }, { data: ch }, { data: vs }] = await Promise.all([
      s.from('products').select('*').eq('id', id).single(),
      s.from('channels').select('*').eq('is_active', true).order('kind').order('code'),
      s.from('product_variants').select('*').eq('product_id', id).order('sort_order'),
    ]);
    if (!p) { setErr('Товар не найден'); setLoading(false); return; }
    setProduct(p as Product);
    setChannels((ch ?? []) as Channel[]);

    const variants = (vs ?? []) as ProductVariant[];
    const variantIds = variants.map((v) => v.id);
    let listingsByVariant: Record<string, Listing[]> = {};
    if (variantIds.length > 0) {
      const { data: ls } = await s.from('listings').select('*').in('variant_id', variantIds);
      for (const l of (ls ?? []) as Listing[]) {
        (listingsByVariant[l.variant_id] ||= []).push(l);
      }
    }
    setRows(variants.map((v) => ({
      variant: v,
      byChannel: Object.fromEntries((listingsByVariant[v.id] ?? []).map((l) => [l.channel_code, l])),
    })));
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function upsert(variantId: string, channelCode: string, patch: Partial<Listing>) {
    const s = supabaseBrowser();
    const { error } = await s.from('listings').upsert({
      variant_id: variantId,
      channel_code: channelCode,
      ...patch,
    }, { onConflict: 'variant_id,channel_code' });
    if (error) { setErr(error.message); return; }
    await load();
  }

  async function remove(listingId: string) {
    if (!confirm('Удалить листинг?')) return;
    await supabaseBrowser().from('listings').delete().eq('id', listingId);
    await load();
  }

  if (loading) return <div className="text-neutral-500">Загрузка…</div>;
  if (err)     return <div className="text-red-600">{err}</div>;
  if (!product) return null;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-black">← Назад</Link>
      <h1 className="text-2xl font-bold mt-2 mb-2">Площадки: {product.title}</h1>
      <p className="text-sm text-neutral-500 mb-6">Один товар — много каналов продаж. У каждой пары (вариант × площадка) свой external_id, цена и статус.</p>

      {rows.length === 0 && <p className="text-neutral-500">У товара нет вариантов. Зайди в редактирование и заполни размер.</p>}

      {rows.map((row) => (
        <section key={row.variant.id} className="mb-8 border border-neutral-200 rounded-lg overflow-hidden">
          <div className="bg-neutral-50 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-mono font-bold">{row.variant.sku}</div>
              <div className="text-xs text-neutral-500">
                {Object.entries(row.variant.variant_attrs || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
              </div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="text-left p-3">Канал</th>
                <th className="text-left p-3">External ID</th>
                <th className="text-left p-3">URL</th>
                <th className="text-left p-3">Цена ₸</th>
                <th className="text-left p-3">Активен</th>
                <th className="text-left p-3">Sync</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => {
                const l = row.byChannel[ch.code];
                return (
                  <ChannelEditor
                    key={ch.code}
                    channel={ch}
                    listing={l}
                    variantId={row.variant.id}
                    onSave={(patch) => upsert(row.variant.id, ch.code, patch)}
                    onDelete={l ? () => remove(l.id) : undefined}
                  />
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function ChannelEditor({ channel, listing, onSave, onDelete }: {
  channel: Channel;
  listing: Listing | undefined;
  variantId: string;
  onSave: (patch: Partial<Listing>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [external_id, setExternalId] = useState(listing?.external_id ?? '');
  const [external_url, setExternalUrl] = useState(listing?.external_url ?? '');
  const [price, setPrice]             = useState<string>(listing?.price != null ? String(listing.price) : '');
  const [is_active, setActive]        = useState<boolean>(listing?.is_active ?? true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExternalId(listing?.external_id ?? '');
    setExternalUrl(listing?.external_url ?? '');
    setPrice(listing?.price != null ? String(listing.price) : '');
    setActive(listing?.is_active ?? true);
  }, [listing?.id]);

  async function save() {
    setBusy(true);
    await onSave({
      external_id: external_id || null,
      external_url: external_url || null,
      price: price === '' ? null : Number(price),
      is_active,
      currency: 'KZT',
    });
    setBusy(false);
  }

  return (
    <tr className="border-t border-neutral-200">
      <td className="p-3 font-semibold w-24">{channel.code}<div className="text-xs text-neutral-400 font-normal">{channel.kind}</div></td>
      <td className="p-3"><input value={external_id} onChange={(e) => setExternalId(e.target.value)} placeholder={channel.code === 'KASPI' ? 'merchant SKU' : ''} className="w-32 border border-neutral-300 rounded px-2 py-1 text-sm" /></td>
      <td className="p-3"><input value={external_url} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" className="w-48 border border-neutral-300 rounded px-2 py-1 text-sm" /></td>
      <td className="p-3"><input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 border border-neutral-300 rounded px-2 py-1 text-sm" /></td>
      <td className="p-3"><label><input type="checkbox" checked={is_active} onChange={(e) => setActive(e.target.checked)} /></label></td>
      <td className="p-3 text-xs">{listing?.last_synced_at ? new Date(listing.last_synced_at).toLocaleDateString('ru-RU') : '—'}{listing?.last_sync_status && <div className={listing.last_sync_status === 'ok' ? 'text-green-600' : 'text-red-600'}>{listing.last_sync_status}</div>}</td>
      <td className="p-3 text-right whitespace-nowrap">
        <button onClick={save} disabled={busy} className="bg-black text-white px-3 py-1 rounded text-xs">{busy ? '…' : 'Сохранить'}</button>
        {onDelete && <button onClick={onDelete} className="ml-2 text-red-600 text-xs">✕</button>}
      </td>
    </tr>
  );
}
