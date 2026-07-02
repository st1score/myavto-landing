import type { Metadata } from 'next';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE_URL, SITE_NAME, siteJsonLd } from '@/lib/seo';
import './globals.css';

// Analytics + Ads. Restored after the Astro→Next migration dropped them.
// GA4 measures organic/traffic; Ads tag enables Google Ads conversion tracking.
const GA4_ID = 'G-YQ21411TM0';
const ADS_ID = 'AW-18062973221';
const YM_ID = 109590508; // Yandex.Metrika counter

const DESCRIPTION =
  'Поршни, кольца, вкладыши, гильзы и ремкомплекты для японских двигателей. Оригинал и проверенные бренды. Алматы, доставка по Казахстану.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MY AVTO — запчасти для капремонта двигателя',
    template: '%s | MY AVTO',
  },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'MY AVTO — запчасти для капремонта двигателя',
    description: DESCRIPTION,
    images: ['/assets/og-image.jpg'],
  },
  // Tokens come from CI env so no placeholder strings are committed.
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION / NEXT_PUBLIC_YANDEX_VERIFICATION
  // in GitHub Actions secrets; Next omits the tag when the value is undefined.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // Known token recovered from the legacy site; also covered by the static
    // /yandex_daa2b9be5f7af7bb.html file. Env can override.
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION ?? 'daa2b9be5f7af7bb',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <Header />

        <main className="flex-1">{children}</main>

        <Footer />

        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');
gtag('config', '${ADS_ID}');`}
        </Script>

        {/* Yandex.Metrika — visits, Webvisor, click map */}
        <Script id="ym-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}','ym');
ym(${YM_ID},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});`}
        </Script>
        <noscript><div><img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" /></div></noscript>
      </body>
    </html>
  );
}
