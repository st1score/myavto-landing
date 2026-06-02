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
      </body>
    </html>
  );
}
