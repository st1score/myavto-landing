import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE_URL, SITE_NAME, siteJsonLd } from '@/lib/seo';
import './globals.css';

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
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
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
      </body>
    </html>
  );
}
