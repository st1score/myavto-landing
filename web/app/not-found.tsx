import type { Metadata } from 'next';
import Link from 'next/link';

// noindex: most 404s here are dead URLs from the old Astro site. Telling crawlers
// not to index them speeds their removal from Google/Yandex and stops them
// diluting the new catalog. Emitted as 404.html for GitHub Pages.
export const metadata: Metadata = {
  title: 'Страница не найдена — MY AVTO',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, margin: '0 0 12px' }}>Страница не найдена</h1>
      <p style={{ color: 'var(--c-muted)', margin: '0 0 24px' }}>
        Возможно, ссылка устарела. Перейдите в каталог — запчасти для капремонта японских двигателей.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--c-red)', fontWeight: 600 }}>На главную</Link>
        <Link href="/zapchasti/porshni/" style={{ color: 'var(--ph-blue, #0066cc)', fontWeight: 600 }}>Поршни</Link>
        <Link href="/search/" style={{ color: 'var(--ph-blue, #0066cc)', fontWeight: 600 }}>Поиск по каталогу</Link>
      </div>
    </div>
  );
}
