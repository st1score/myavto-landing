import type { Metadata } from 'next';
import Link from 'next/link';

// GitHub Pages serves this as 404.html for ANY unknown path — including the
// thousands of dead legacy-Astro URLs still in Yandex/Google that aren't in the
// explicit redirect list. So we auto-bounce every dead URL to the pistons hub
// (a real selling page) instead of leaving the visitor at a dead end.
// noindex,follow: don't index the 404 itself; let crawlers follow the link out.
const FALLBACK = '/zapchasti/porshni/';

export const metadata: Metadata = {
  title: 'Страница не найдена — MY AVTO',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '64px 24px', textAlign: 'center' }}>
      {/* Instant client redirect for visitors. Crawlers still see HTTP 404 +
          noindex (GitHub Pages returns 404 status), so dead URLs drop from the
          index while humans land on products. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{if(location.pathname!==${JSON.stringify(FALLBACK)})location.replace(${JSON.stringify(FALLBACK)});}catch(e){}})();`,
        }}
      />
      <noscript>
        <meta httpEquiv="refresh" content={`0; url=${FALLBACK}`} />
      </noscript>
      <h1 style={{ fontSize: 32, margin: '0 0 12px' }}>Страница не найдена</h1>
      <p style={{ color: 'var(--c-muted)', margin: '0 0 24px' }}>
        Возможно, ссылка устарела. Открываем каталог поршней…
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href={FALLBACK} style={{ color: 'var(--c-red)', fontWeight: 600 }}>Поршни</Link>
        <Link href="/" style={{ color: 'var(--ph-blue, #0066cc)', fontWeight: 600 }}>На главную</Link>
        <Link href="/search/" style={{ color: 'var(--ph-blue, #0066cc)', fontWeight: 600 }}>Поиск по каталогу</Link>
      </div>
    </div>
  );
}
