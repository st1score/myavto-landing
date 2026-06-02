// Single source of truth for site-wide SEO / structured data.
// Used by app/layout.tsx (JSON-LD), product pages, and the Merchant feed.
// Business facts mirror components/Footer.tsx — keep them in sync.

import { WA_PHONE, PHONE_HUMAN } from '@/lib/ui';

export const SITE_URL = 'https://my-avto.kz';
export const SITE_NAME = 'MY AVTO';

export const BUSINESS = {
  name: SITE_NAME,
  legalName: 'MY AVTO',
  url: SITE_URL,
  logo: `${SITE_URL}/assets/logo.png`,
  image: `${SITE_URL}/assets/og-image.jpg`,
  telephone: PHONE_HUMAN,
  whatsapp: `https://wa.me/${WA_PHONE}`,
  email: 'sementrachuk@gmail.com',
  priceRange: '₸₸',
  // Real, verifiable address. Geo coordinates intentionally omitted — add exact
  // lat/lng later (don't fabricate; wrong coords mislead Google Maps).
  address: {
    streetAddress: 'ТЦ CarCity, 3 ярус, бутик 135В',
    addressLocality: 'Алматы',
    addressCountry: 'KZ',
  },
  // Пн–Сб 9:00–17:00 · Вс 11:00–16:00
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '17:00' },
    { days: ['Sunday'], opens: '11:00', closes: '16:00' },
  ],
  sameAs: [
    'https://www.instagram.com/myavto.kz_',
    'https://www.tiktok.com/@myavto.kz',
    'https://t.me/+B9HzpYNs7QpiZDAy',
    'https://l.kaspi.kz/shop/U2E5tHvjbzmz9vD',
  ],
} as const;

/** Sitewide LocalBusiness + Organization + WebSite graph for the homepage <head>. */
export function siteJsonLd() {
  const orgId = `${SITE_URL}/#business`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Store', 'AutoPartsStore', 'LocalBusiness'],
        '@id': orgId,
        name: BUSINESS.name,
        legalName: BUSINESS.legalName,
        url: BUSINESS.url,
        logo: BUSINESS.logo,
        image: BUSINESS.image,
        telephone: BUSINESS.telephone,
        email: BUSINESS.email,
        priceRange: BUSINESS.priceRange,
        address: { '@type': 'PostalAddress', ...BUSINESS.address },
        openingHoursSpecification: BUSINESS.openingHours.map((o) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: o.days,
          opens: o.opens,
          closes: o.closes,
        })),
        sameAs: BUSINESS.sameAs,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': orgId },
        inLanguage: 'ru',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search/?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}
