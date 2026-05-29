'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

/* Single-seller marketplace: any authenticated session = the owner.
   Used to reveal owner-only UI (internal SKU, dashboard link) on public pages. */
export function useIsOwner(): boolean {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    const s = supabaseBrowser();
    s.auth.getSession().then(({ data }) => setIsOwner(!!data.session));
    const { data: sub } = s.auth.onAuthStateChange((_e, sess) => setIsOwner(!!sess));
    return () => sub.subscription.unsubscribe();
  }, []);
  return isOwner;
}
