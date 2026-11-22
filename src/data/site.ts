// Все контакты, тексты-константы и ID счётчиков — в одном месте.
// Поменяли номер или график — правите только этот файл.

export const SITE = {
  url: 'https://my-avto.kz',
  name: 'MY AVTO',
  phoneDisplay: '+7 777 780 77 87',
  phoneTel: '+77777807787',
  waNumber: '77777807787',
  address: {
    full: 'ТЦ CarCity, мкр. Баянаул, 57а, 3 ярус, бутик 135В',
    city: 'Алматы',
    country: 'KZ',
  },
  // Часы работы — по времени Алматы (UTC+5)
  hours: { open: 9, close: 17, text: 'ежедневно 9:00–17:00' },
  // Координаты точки MY AVTO в 2ГИС (ТЦ CarCity, мкр. Баянаул, 57а)
  geo: { lat: 43.238812, lng: 76.822849 } as null | { lat: number; lng: number },
  links: {
    twogis: 'https://go.2gis.com/mR5DQ',
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=CarCity+%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B',
    tiktok: 'https://www.tiktok.com/@myavto.kz',
    instagram: 'https://www.instagram.com/myavto.kz_',
    kolesa: 'https://kolesa.kz/a/show/216448704',
    kaspi: '', // TODO: ссылка на магазин в Kaspi
  },
  analytics: {
    ga4: 'G-YQ21411TM0',
    ym: 109115502,
    ads: 'AW-18062973221',
    // Метка конверсии «WhatsApp Click» в Google Ads (аккаунт myavto 240-295-0803)
    adsWaLabel: 'hTneCMP33q0cEKWyjKVD',
  },
};

export const waLink = (text: string) =>
  `https://wa.me/${SITE.waNumber}?text=${encodeURIComponent(text)}`;

// Текст по умолчанию + строка «с какой страницы пришёл клиент»
export const waText = (path: string, first = 'Здравствуйте! Нужна запчасть.') =>
  `${first}\n— с сайта my-avto.kz${path === '/' ? '' : path}`;

// Марки на главной. page: true — у марки есть своя страница.
export const MARKS: { slug: string; name: string; logo?: string; page?: boolean }[] = [
  { slug: 'toyota', name: 'Toyota', logo: '/img/marki/toyota.webp', page: true },
  { slug: 'lexus', name: 'Lexus', page: true },
  { slug: 'nissan', name: 'Nissan', logo: '/img/marki/nissan.webp', page: true },
  { slug: 'infiniti', name: 'Infiniti' },
  { slug: 'honda', name: 'Honda', logo: '/img/marki/honda.webp', page: true },
  { slug: 'acura', name: 'Acura' },
  { slug: 'mazda', name: 'Mazda', logo: '/img/marki/mazda.webp', page: true },
  { slug: 'mitsubishi', name: 'Mitsubishi', logo: '/img/marki/mitsubishi.webp', page: true },
  { slug: 'subaru', name: 'Subaru', logo: '/img/marki/subaru.webp' },
  { slug: 'suzuki', name: 'Suzuki', logo: '/img/marki/suzuki.webp' },
  { slug: 'daihatsu', name: 'Daihatsu' },
  { slug: 'isuzu', name: 'Isuzu' },
];

export const POPULAR_MODELS = [
  'Camry', 'RAV4', 'Land Cruiser Prado', 'Lexus RX', 'Alphard', 'Estima',
  'CR-V', 'X-Trail', 'Outlander', 'Pajero', 'Mazda 6', 'Forester',
];

// Группы запчастей на главной. page: true — у группы есть своя страница.
export const CATS: { slug: string; name: string; short: string; page?: boolean }[] = [
  { slug: 'dvigatel', name: 'Двигатель и капремонт', short: 'Поршни, кольца, вкладыши, прокладки, комплекты', page: true },
  { slug: 'tormoza', name: 'Тормоза', short: 'Колодки, диски, суппорты', page: true },
  { slug: 'filtry', name: 'Фильтры и ТО', short: 'Масляные, воздушные, свечи', page: true },
  { slug: 'podveska', name: 'Подвеска', short: 'Амортизаторы, сайлентблоки, шаровые', page: true },
  { slug: 'grm', name: 'ГРМ и ремни', short: 'Ремни, цепи, ролики, помпы', page: true },
  { slug: 'ohlazhdenie', name: 'Охлаждение', short: 'Радиаторы, помпы, патрубки' },
  { slug: 'transmissiya', name: 'Трансмиссия', short: 'Сцепление, ШРУС, пыльники' },
  { slug: 'elektrika', name: 'Зажигание и пуск', short: 'Свечи, катушки, стартеры, генераторы' },
  { slug: 'rulevoe', name: 'Рулевое', short: 'Тяги, наконечники, рейки' },
];

// Бренды запчастей, логотипы которых уже есть. Остальные добавляем вместе.
export const PART_BRANDS = [
  'teikin', 'npr', 'riken', 'tp', 'nm', 'npw', 'taiho', 'ndc', 'nd', 'izumi', 'gmb', 'rocky',
].map((s) => ({ slug: s, name: s.toUpperCase(), logo: `/img/brendy/${s}.webp` }));
