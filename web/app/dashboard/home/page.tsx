'use client';
import { useEffect, useRef, useState } from 'react';
import {
  BLOCK_LABEL, DEFAULT_HOME, blockDefaultProps, loadHomeDoc, saveHomeDoc, uploadHomeImage,
  type Block, type BlockType, type HomeDoc, type HeroProps, type HeadProps, type BannerProps,
  type CarouselProps, type CategoriesProps, type LogoItem, type CategoryItem,
} from '@/lib/homeContent';

const ADDABLE: BlockType[] = ['banner', 'arrivals', 'categories', 'makes', 'parts', 'hero'];

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function HomeEditor() {
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_HOME.blocks);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);

  useEffect(() => {
    loadHomeDoc().then((d) => { setBlocks(d.blocks); setLoading(false); });
  }, []);

  function patch(id: string, props: Partial<Block['props']>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } as Block : b)));
  }
  function toggle(id: string) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
  }
  function add(type: BlockType) {
    const b = { id: uid(), type, visible: true, props: blockDefaultProps(type) } as Block;
    setBlocks((bs) => [...bs, b]);
  }
  function move(from: number, to: number) {
    setBlocks((bs) => {
      if (to < 0 || to >= bs.length) return bs;
      const next = [...bs];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  async function save() {
    setSaving(true); setMsg(null);
    const doc: HomeDoc = { blocks };
    const { error } = await saveHomeDoc(doc);
    setSaving(false);
    setMsg(error ? `Ошибка: ${error}` : 'Сохранено ✓');
    setTimeout(() => setMsg(null), 3000);
  }

  if (loading) return <div className="text-neutral-500">Загрузка…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Главная страница</h1>
          <p className="text-sm text-neutral-500">Перетаскивай блоки, редактируй тексты и картинки. Не забудь сохранить.</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={'text-sm ' + (msg.startsWith('Ошибка') ? 'text-red-600' : 'text-green-600')}>{msg}</span>}
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-black text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div
            key={b.id}
            draggable
            onDragStart={() => { dragIdx.current = i; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx.current !== null) move(dragIdx.current, i); dragIdx.current = null; }}
            className={'border rounded-lg p-4 bg-white ' + (b.visible ? '' : 'opacity-50')}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="cursor-grab text-neutral-400 select-none" title="Перетащить">⠿</span>
                <span className="font-semibold truncate">{BLOCK_LABEL[b.type]}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <button onClick={() => move(i, i - 1)} className="px-2 py-1 rounded hover:bg-neutral-100" title="Вверх">↑</button>
                <button onClick={() => move(i, i + 1)} className="px-2 py-1 rounded hover:bg-neutral-100" title="Вниз">↓</button>
                <button onClick={() => toggle(b.id)} className="px-2 py-1 rounded hover:bg-neutral-100">{b.visible ? 'Скрыть' : 'Показать'}</button>
                <button onClick={() => remove(b.id)} className="px-2 py-1 rounded text-red-600 hover:bg-red-50">Удалить</button>
              </div>
            </div>
            <BlockFields block={b} patch={patch} />
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="text-sm text-neutral-500 mb-2">Добавить блок:</div>
        <div className="flex flex-wrap gap-2">
          {ADDABLE.map((t) => (
            <button key={t} onClick={() => add(t)} className="px-3 py-1.5 rounded-md border text-sm hover:bg-neutral-100">+ {BLOCK_LABEL[t]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full border rounded-md px-3 py-2 text-sm';
const lbl = 'block text-xs font-medium text-neutral-500 mb-1';

function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="block">
      <span className={lbl}>{label}</span>
      {area
        ? <textarea className={inp} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
        : <input className={inp} value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field
      label={`${label} (через запятую)`}
      value={value.join(', ')}
      onChange={(v) => onChange(v.split(',').map((s) => s.trim()).filter(Boolean))}
    />
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function pick(file: File) {
    setBusy(true);
    const { url, error } = await uploadHomeImage(file);
    setBusy(false);
    if (url) onChange(url); else alert(error ?? 'Ошибка загрузки');
  }
  return (
    <div>
      <span className={lbl}>{label}</span>
      <div className="flex items-center gap-3">
        {value
          ? <img src={value} alt="" className="w-20 h-20 object-cover rounded-md border" />
          : <div className="w-20 h-20 rounded-md border grid place-items-center text-neutral-300 text-xs">нет</div>}
        <div className="flex flex-col gap-1">
          <input type="file" accept="image/*" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} className="text-sm" />
          {value && <button onClick={() => onChange('')} className="text-xs text-red-600 text-left">Убрать</button>}
          {busy && <span className="text-xs text-neutral-500">Загрузка…</span>}
        </div>
      </div>
    </div>
  );
}

function BlockFields({ block, patch }: { block: Block; patch: (id: string, props: Partial<Block['props']>) => void }) {
  const set = (p: Partial<Block['props']>) => patch(block.id, p);

  if (block.type === 'hero') {
    const p = block.props as HeroProps;
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Надзаголовок" value={p.eyebrow} onChange={(v) => set({ eyebrow: v })} />
        <Field label="Заголовок (начало)" value={p.titlePre} onChange={(v) => set({ titlePre: v })} />
        <Field label="Заголовок (акцент)" value={p.titleEm} onChange={(v) => set({ titleEm: v })} />
        <Field label="Заголовок (конец)" value={p.titlePost} onChange={(v) => set({ titlePost: v })} />
        <Field label="Плейсхолдер поиска" value={p.searchPlaceholder} onChange={(v) => set({ searchPlaceholder: v })} />
        <div className="sm:col-span-2"><ListField label="Марки" value={p.brands} onChange={(v) => set({ brands: v })} /></div>
        <div className="sm:col-span-2"><ListField label="Подсказки поиска" value={p.hints} onChange={(v) => set({ hints: v })} /></div>
        <div className="sm:col-span-2"><ListField label="Преимущества (trust)" value={p.trust} onChange={(v) => set({ trust: v })} /></div>
      </div>
    );
  }

  if (block.type === 'banner') {
    const p = block.props as BannerProps;
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><ImageField label="Картинка" value={p.imageUrl} onChange={(v) => set({ imageUrl: v })} /></div>
        <Field label="Надзаголовок" value={p.eyebrow} onChange={(v) => set({ eyebrow: v })} />
        <Field label="Заголовок" value={p.title} onChange={(v) => set({ title: v })} />
        <div className="sm:col-span-2"><Field label="Текст" value={p.text} onChange={(v) => set({ text: v })} area /></div>
        <Field label="Текст кнопки" value={p.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
        <Field label="Ссылка кнопки" value={p.ctaHref} onChange={(v) => set({ ctaHref: v })} />
      </div>
    );
  }

  if (block.type === 'makes' || block.type === 'parts') {
    const p = block.props as CarouselProps;
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Надзаголовок" value={p.eyebrow} onChange={(v) => set({ eyebrow: v })} />
          <Field label="Заголовок" value={p.title} onChange={(v) => set({ title: v })} />
        </div>
        <LogoItemsEditor items={p.items ?? []} onChange={(items) => set({ items })} />
      </div>
    );
  }

  if (block.type === 'categories') {
    const p = block.props as CategoriesProps;
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Надзаголовок" value={p.eyebrow} onChange={(v) => set({ eyebrow: v })} />
          <Field label="Заголовок" value={p.title} onChange={(v) => set({ title: v })} />
        </div>
        <CategoryItemsEditor items={p.items ?? []} onChange={(items) => set({ items })} />
      </div>
    );
  }

  const p = block.props as HeadProps;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Надзаголовок" value={p.eyebrow} onChange={(v) => set({ eyebrow: v })} />
      <Field label="Заголовок" value={p.title} onChange={(v) => set({ title: v })} />
    </div>
  );
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function LogoItemsEditor({ items, onChange }: { items: LogoItem[]; onChange: (v: LogoItem[]) => void }) {
  const upd = (i: number, p: Partial<LogoItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  return (
    <div className="border-t pt-3">
      <div className="text-xs font-medium text-neutral-500 mb-2">Логотипы ({items.length})</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 border rounded-md p-2 bg-neutral-50">
            <ImageThumb value={it.src} onChange={(src) => upd(i, { src })} />
            <div className="flex-1 grid sm:grid-cols-2 gap-2">
              <input className={inp} placeholder="Название" value={it.label} onChange={(e) => upd(i, { label: e.target.value })} />
              <input className={inp} placeholder="Ссылка (/search?q=…)" value={it.href} onChange={(e) => upd(i, { href: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <button onClick={() => onChange(moveItem(items, i, i - 1))} className="px-2 rounded hover:bg-neutral-200">↑</button>
              <button onClick={() => onChange(moveItem(items, i, i + 1))} className="px-2 rounded hover:bg-neutral-200">↓</button>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="px-2 rounded text-red-600 hover:bg-red-50">✕</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onChange([...items, { src: '', label: '', href: '/search' }])} className="mt-2 px-3 py-1.5 rounded-md border text-sm hover:bg-neutral-100">+ Добавить логотип</button>
    </div>
  );
}

function CategoryItemsEditor({ items, onChange }: { items: CategoryItem[]; onChange: (v: CategoryItem[]) => void }) {
  const upd = (i: number, p: Partial<CategoryItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  return (
    <div className="border-t pt-3">
      <div className="text-xs font-medium text-neutral-500 mb-2">Категории ({items.length})</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 border rounded-md p-2 bg-neutral-50">
            <ImageThumb value={it.imageUrl} onChange={(imageUrl) => upd(i, { imageUrl })} />
            <div className="flex-1 grid sm:grid-cols-2 gap-2">
              <input className={inp} placeholder="Название" value={it.label} onChange={(e) => upd(i, { label: e.target.value })} />
              <input className={inp} placeholder="Ссылка (/search?category=…)" value={it.href} onChange={(e) => upd(i, { href: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <button onClick={() => onChange(moveItem(items, i, i - 1))} className="px-2 rounded hover:bg-neutral-200">↑</button>
              <button onClick={() => onChange(moveItem(items, i, i + 1))} className="px-2 rounded hover:bg-neutral-200">↓</button>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="px-2 rounded text-red-600 hover:bg-red-50">✕</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onChange([...items, { label: '', imageUrl: '', href: '/search?category=' }])} className="mt-2 px-3 py-1.5 rounded-md border text-sm hover:bg-neutral-100">+ Добавить категорию</button>
    </div>
  );
}

function ImageThumb({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const id = useRef('f' + Math.random().toString(36).slice(2, 8)).current;
  async function pick(file: File) {
    setBusy(true);
    const { url, error } = await uploadHomeImage(file);
    setBusy(false);
    if (url) onChange(url); else alert(error ?? 'Ошибка загрузки');
  }
  return (
    <label htmlFor={id} className="relative w-16 h-16 flex-none rounded-md border bg-white grid place-items-center overflow-hidden cursor-pointer">
      {value ? <img src={value} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-[10px] text-neutral-400">фото</span>}
      {busy && <span className="absolute inset-0 bg-white/70 grid place-items-center text-[10px]">…</span>}
      <input id={id} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
    </label>
  );
}
