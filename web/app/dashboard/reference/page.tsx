'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Engine } from '@/lib/types';

export default function ReferencePage() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Engine>({ code: '', name: '', is_diesel: false, displacement: null, cylinders: null });
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabaseBrowser().from('engines').select('*').order('code');
    setEngines((data ?? []) as Engine[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addEngine(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!draft.code) { setErr('код обязателен'); return; }
    const { error } = await supabaseBrowser().from('engines').upsert({
      code: draft.code.toUpperCase().trim(),
      name: draft.name || null,
      is_diesel: draft.is_diesel,
      displacement: draft.displacement,
      cylinders: draft.cylinders,
    });
    if (error) { setErr(error.message); return; }
    setDraft({ code: '', name: '', is_diesel: false, displacement: null, cylinders: null });
    await load();
  }

  async function remove(code: string) {
    if (!confirm(`Удалить мотор ${code}?`)) return;
    await supabaseBrowser().from('engines').delete().eq('code', code);
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Справочник: двигатели</h1>
      <p className="text-sm text-neutral-500 mb-6">Используется в карточках товаров для совместимости.</p>

      <form onSubmit={addEngine} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_100px_100px_auto] gap-2 mb-8 items-end">
        <Field label="Код*"><input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="1KZ" className={input} /></Field>
        <Field label="Название"><input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Toyota 1KZ-TE" className={input} /></Field>
        <Field label="Объём, л"><input type="number" step="0.1" value={draft.displacement ?? ''} onChange={(e) => setDraft({ ...draft, displacement: e.target.value === '' ? null : Number(e.target.value) })} className={input} /></Field>
        <Field label="Цил."><input type="number" min="2" max="16" value={draft.cylinders ?? ''} onChange={(e) => setDraft({ ...draft, cylinders: e.target.value === '' ? null : Number(e.target.value) })} className={input} /></Field>
        <Field label="Дизель"><label className="flex items-center h-10"><input type="checkbox" checked={draft.is_diesel} onChange={(e) => setDraft({ ...draft, is_diesel: e.target.checked })} /></label></Field>
        <button className="bg-black text-white rounded-md px-4 h-10 font-semibold">Добавить</button>
      </form>
      {err && <div className="text-sm text-red-600 mb-3">{err}</div>}

      {loading && <p className="text-neutral-500">Загрузка…</p>}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 uppercase text-xs">
            <tr><th className="text-left p-3">Код</th><th className="text-left p-3">Название</th><th className="text-left p-3">Объём</th><th className="text-left p-3">Цил.</th><th className="text-left p-3">Тип</th><th></th></tr>
          </thead>
          <tbody>
            {engines.map((e) => (
              <tr key={e.code} className="border-t border-neutral-200">
                <td className="p-3 font-mono font-bold">{e.code}</td>
                <td className="p-3">{e.name}</td>
                <td className="p-3">{e.displacement ?? '—'}</td>
                <td className="p-3">{e.cylinders ?? '—'}</td>
                <td className="p-3">{e.is_diesel ? 'дизель' : 'бензин'}</td>
                <td className="p-3 text-right"><button onClick={() => remove(e.code)} className="text-red-600 text-sm">Удалить</button></td>
              </tr>
            ))}
            {!loading && engines.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-neutral-500">Пусто. Добавь первый мотор.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const input = 'w-full border border-neutral-300 rounded-lg px-3 h-10 focus:border-black outline-none';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium text-neutral-700 block mb-1">{label}</span>{children}</label>;
}
