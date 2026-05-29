'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

export default function AuthGuard({ children }: { children: (session: Session) => React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = supabaseBrowser();
    s.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
      else setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = s.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      if (!sess) router.replace('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!checked) return <div className="max-w-6xl mx-auto px-4 py-16 text-neutral-500">Проверяем сессию…</div>;
  if (!session) return null;
  return <>{children(session)}</>;
}
