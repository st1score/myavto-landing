'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { prepareImageUpload } from '@/lib/compressImage';

export type GalleryItem = {
  product_media_pk?: string; // not used (composite PK in DB)
  media_id: string;
  url: string;
  storage_path: string | null;
  role: 'primary' | 'gallery';
  sort_order: number;
};

export default function GalleryEditor({ productId, onPrimaryChange }: { productId: string; onPrimaryChange?: (mediaId: string | null) => void }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!productId) return;
    const s = supabaseBrowser();
    const { data, error } = await s
      .from('product_media')
      .select('media_id, role, sort_order, media!inner(url, storage_path)')
      .eq('product_id', productId)
      .order('role', { ascending: true })   // primary first
      .order('sort_order', { ascending: true });
    if (error) { setErr(error.message); return; }
    setItems((data ?? []).map((r: any) => ({
      media_id: r.media_id, url: r.media.url, storage_path: r.media.storage_path ?? null, role: r.role, sort_order: r.sort_order,
    })));
  }
  useEffect(() => { load(); }, [productId]);

  async function upload(files: FileList | File[]) {
    setUploading(true); setErr(null);
    const s = supabaseBrowser();
    const { data: u, error: uErr } = await s.auth.getUser();
    if (!u.user) { setErr('Не авторизован: ' + (uErr?.message ?? 'no user')); setUploading(false); return; }

    const arr = Array.from(files);
    const { data: existing, error: exErr } = await s
      .from('product_media').select('media_id, role, sort_order, media!inner(storage_path)').eq('product_id', productId);
    if (exErr) { setErr('read product_media: ' + exErr.message); setUploading(false); return; }
    const existingRows = (existing ?? []) as any[];
    let nextSort = existingRows.filter((i) => i.role === 'gallery').reduce((m: number, r: any) => Math.max(m, r.sort_order ?? 0), -1) + 1;
    const existingPrimary = existingRows.find((i) => i.role === 'primary');
    let havePrimary = !!existingPrimary?.media?.storage_path;
    let replacedSeedPrimary = false;

    const errors: string[] = [];
    for (const file of arr) {
      try {
        const { payload, ext, contentType } = await prepareImageUpload(file);
        const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const up = await s.storage.from('product-images').upload(path, payload, { contentType });
        if (up.error) { errors.push(`storage(${file.name}): ${up.error.message}`); continue; }
        const { data: pub } = s.storage.from('product-images').getPublicUrl(path);
        const { data: m, error: mErr } = await s.from('media').insert({
          owner_id: u.user.id, url: pub.publicUrl, storage_path: path,
          media_type: 'image', mime_type: contentType, bytes: payload.size,
        }).select('id').single();
        if (mErr) { errors.push(`media(${file.name}): ${mErr.message}`); continue; }

        const role = havePrimary ? 'gallery' : 'primary';
        const sort_order = role === 'primary' ? 0 : nextSort++;
        if (role === 'primary' && existingPrimary && !replacedSeedPrimary) {
          await s.from('product_media').delete().eq('product_id', productId).eq('role', 'primary');
          replacedSeedPrimary = true;
        }
        const { error: pmErr } = await s.from('product_media').insert({
          product_id: productId,
          media_id: (m as any).id,
          role,
          sort_order,
        });
        if (pmErr) { errors.push(`product_media(${file.name}): ${pmErr.message}`); continue; }
        if (role === 'primary') havePrimary = true;
      } catch (e: any) {
        errors.push(e?.message ?? String(e));
      }
    }
    if (errors.length > 0) setErr(errors.join('\n'));
    await load();
    setUploading(false);
  }

  async function remove(it: GalleryItem) {
    if (!confirm('Удалить картинку?')) return;
    const s = supabaseBrowser();
    await s.from('product_media').delete().eq('product_id', productId).eq('media_id', it.media_id).eq('role', it.role);
    // also delete media row + storage object — best effort
    const { data: m } = await s.from('media').select('storage_path').eq('id', it.media_id).single();
    if ((m as any)?.storage_path) {
      await s.storage.from('product-images').remove([(m as any).storage_path]);
      await s.from('media').delete().eq('id', it.media_id);
    }
    let nextPrimaryId: string | null = null;
    if (it.role === 'primary') {
      const next = items
        .filter((i) => i.role === 'gallery' && i.media_id !== it.media_id)
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      if (next) {
        await s.from('product_media').delete().eq('product_id', productId).eq('media_id', next.media_id).eq('role', 'gallery');
        await s.from('product_media').insert({ product_id: productId, media_id: next.media_id, role: 'primary', sort_order: 0 });
        nextPrimaryId = next.media_id;
      }
    }
    await load();
    if (it.role === 'primary') onPrimaryChange?.(nextPrimaryId);
  }

  async function setAsPrimary(it: GalleryItem) {
    const s = supabaseBrowser();
    // Demote current primary to gallery (at end)
    const cur = items.find((i) => i.role === 'primary');
    if (cur && cur.media_id !== it.media_id) {
      const maxSort = Math.max(0, ...items.filter((i) => i.role === 'gallery').map((i) => i.sort_order));
      await s.from('product_media').delete().eq('product_id', productId).eq('media_id', cur.media_id).eq('role', 'primary');
      if (cur.storage_path) {
        await s.from('product_media').insert({ product_id: productId, media_id: cur.media_id, role: 'gallery', sort_order: maxSort + 1 });
      }
    }
    // Promote selected to primary
    await s.from('product_media').delete().eq('product_id', productId).eq('media_id', it.media_id).eq('role', it.role);
    await s.from('product_media').insert({ product_id: productId, media_id: it.media_id, role: 'primary', sort_order: 0 });
    await load();
    onPrimaryChange?.(it.media_id);
  }

  async function move(it: GalleryItem, delta: -1 | 1) {
    if (it.role !== 'gallery') return;
    const sorted = items.filter((i) => i.role === 'gallery').sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.media_id === it.media_id);
    const next = sorted[idx + delta];
    if (!next) return;
    const s = supabaseBrowser();
    await s.from('product_media').update({ sort_order: next.sort_order }).eq('product_id', productId).eq('media_id', it.media_id).eq('role', 'gallery');
    await s.from('product_media').update({ sort_order: it.sort_order }).eq('product_id', productId).eq('media_id', next.media_id).eq('role', 'gallery');
    await load();
  }

  const primary = items.find((i) => i.role === 'primary');
  const gallery = items.filter((i) => i.role === 'gallery').sort((a, b) => a.sort_order - b.sort_order);
  const totalCount = items.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="file" accept="image/*" multiple
          onChange={(e) => {
            const fs = e.target.files;
            if (!fs || fs.length === 0) return;
            // Snapshot to a real array BEFORE resetting the input — FileList
            // is live and becomes empty as soon as we touch `value`.
            const arr = Array.from(fs);
            e.target.value = '';
            upload(arr);
          }}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <span className="text-sm text-neutral-500">Загрузка…</span>}
        <span className="text-xs text-neutral-500">Каспи: max 5 файлов на товар. Сейчас: {totalCount}/5.</span>
      </div>
      {err && <div className="text-sm text-red-600 whitespace-pre-wrap break-all">{err}</div>}

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {primary && (
          <Tile it={primary} primary onRemove={() => remove(primary)} onSetPrimary={() => {}} onMove={() => {}} />
        )}
        {gallery.map((it, i) => (
          <Tile
            key={it.media_id}
            it={it}
            primary={false}
            onRemove={() => remove(it)}
            onSetPrimary={() => setAsPrimary(it)}
            onMove={(d) => move(it, d)}
            canUp={i > 0}
            canDown={i < gallery.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function Tile({ it, primary, onRemove, onSetPrimary, onMove, canUp, canDown }: {
  it: GalleryItem; primary: boolean;
  onRemove: () => void; onSetPrimary: () => void;
  onMove: (d: -1 | 1) => void; canUp?: boolean; canDown?: boolean;
}) {
  return (
    <div className={'relative group border rounded-lg overflow-hidden ' + (primary ? 'border-[var(--c-red)] ring-2 ring-red-100' : 'border-neutral-200')}>
      <div className="aspect-square bg-neutral-50 flex items-center justify-center">
        <img src={it.url} alt="" className="max-w-full max-h-full object-contain p-1" />
      </div>
      <div className="absolute top-1 left-1">
        {primary ? <span className="bg-[var(--c-red)] text-white text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold">Главное</span>
                 : <button type="button" onClick={onSetPrimary} className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">Сделать главным</button>}
      </div>
      <button type="button" onClick={onRemove} className="absolute top-1 right-1 bg-white/90 hover:bg-red-600 hover:text-white text-red-600 w-6 h-6 rounded-full text-sm">×</button>
      {!primary && (
        <div className="absolute bottom-1 left-1 flex gap-1">
          {canUp   && <button type="button" onClick={() => onMove(-1)} className="bg-white/90 hover:bg-black hover:text-white w-6 h-6 rounded text-xs">←</button>}
          {canDown && <button type="button" onClick={() => onMove( 1)} className="bg-white/90 hover:bg-black hover:text-white w-6 h-6 rounded text-xs">→</button>}
        </div>
      )}
    </div>
  );
}
