'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { productSlug } from '@/lib/slug';

// Legacy route: products used to live at /p?id=<uuid>. They now have stable
// SEO slugs at /p/<slug>/. This shim resolves the id and redirects so old
// links, bookmarks and QR codes keep working.
function Redirector() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const [dead, setDead] = useState(false);

  useEffect(() => {
    if (!id) { setDead(true); return; }
    const s = supabaseBrowser();
    (async () => {
      const { data } = await s.from('products')
        .select('master_sku, category_code')
        .eq('id', id).eq('status', 'active').maybeSingle();
      if (!data) { setDead(true); return; }
      router.replace(`/p/${productSlug(data as any)}/`);
    })();
  }, [id, router]);

  if (dead) {
    return (
      <div className="container" style={{ padding: '60px 24px', color: 'var(--c-muted)' }}>
        Товар не найден. <Link href="/search" style={{ color: 'var(--c-red)', fontWeight: 600 }}>К каталогу</Link>.
      </div>
    );
  }
  return <div className="container" style={{ padding: '60px 24px', color: 'var(--c-muted)' }}>Загрузка…</div>;
}

export default function LegacyProductPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '60px 24px', color: 'var(--c-muted)' }}>Загрузка…</div>}>
      <Redirector />
    </Suspense>
  );
}
