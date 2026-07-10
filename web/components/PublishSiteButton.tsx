'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// "Опубликовать сайт" — invokes the rebuild-site Edge Function, which fires
// GitHub repository_dispatch: rebuild-catalog. The static site (pages, sitemap,
// feed) regenerates in ~2-3 min. Without this the cron rebuild runs every 6h.
export default function PublishSiteButton() {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  async function publish() {
    setState('busy'); setMsg(null);
    const { data, error } = await supabaseBrowser().functions.invoke('rebuild-site');
    if (error || (data as any)?.error) {
      setState('err');
      setMsg((data as any)?.error ?? error?.message ?? 'Ошибка');
      return;
    }
    setState('ok');
    setMsg('Сборка запущена — сайт обновится через ~2-3 минуты.');
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={publish}
        disabled={state === 'busy'}
        className="border border-neutral-300 hover:border-black px-3 py-2 rounded-md text-sm disabled:opacity-50"
        title="Пересобрать сайт: новые товары получат страницы и попадут в sitemap"
      >
        {state === 'busy' ? 'Публикуем…' : '⟳ Опубликовать сайт'}
      </button>
      {msg && (
        <span className={`text-xs ${state === 'err' ? 'text-red-600' : 'text-green-700'}`}>{msg}</span>
      )}
    </span>
  );
}
