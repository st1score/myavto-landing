'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const s = supabaseBrowser();
    s.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);
    const s = supabaseBrowser();
    const fn = mode === 'signin' ? s.auth.signInWithPassword({ email, password }) : s.auth.signUp({ email, password });
    const { data, error } = await fn;
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (mode === 'signup' && !data.session) {
      setInfo('Проверь почту — подтверди email и войди.');
      return;
    }
    router.replace('/dashboard');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">{mode === 'signin' ? 'Войти' : 'Создать аккаунт'}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email" className="w-full border border-neutral-300 rounded-lg px-3 py-2"
        />
        <input
          type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="пароль (мин. 8 символов)" className="w-full border border-neutral-300 rounded-lg px-3 py-2"
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        {info && <div className="text-sm text-green-700">{info}</div>}
        <button
          disabled={busy}
          className="w-full bg-[var(--c-red)] text-white font-bold rounded-lg py-2.5 disabled:opacity-50"
        >{busy ? '…' : (mode === 'signin' ? 'Войти' : 'Зарегистрироваться')}</button>
      </form>
      <button
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(null); }}
        className="mt-4 text-sm text-neutral-500 hover:text-black"
      >
        {mode === 'signin' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
      </button>
    </div>
  );
}
