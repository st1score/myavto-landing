'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

// Owner-only login. Public signup is intentionally disabled: the site treats
// any authenticated session as the owner (see lib/useIsOwner.ts), so an open
// registration form would let strangers publish products to the storefront.
// New accounts are created manually in Supabase Studio → Authentication.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const s = supabaseBrowser();
    s.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const s = supabaseBrowser();
    const { error } = await s.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.replace('/dashboard');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Войти</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email" className="w-full border border-neutral-300 rounded-lg px-3 py-2"
        />
        <input
          type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="пароль" className="w-full border border-neutral-300 rounded-lg px-3 py-2"
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button
          disabled={busy}
          className="w-full bg-[var(--c-red)] text-white font-bold rounded-lg py-2.5 disabled:opacity-50"
        >{busy ? '…' : 'Войти'}</button>
      </form>
    </div>
  );
}
