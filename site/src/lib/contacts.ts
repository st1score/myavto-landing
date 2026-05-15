// Единый источник контактов. Используется в Header, Footer, формах, sticky CTA.
export const CONTACTS = {
  manager: 'Матвей',
  phoneE164: '+77015509377',
  phoneDisplay: '+7 701 550-93-77',
  phoneDigits: '77015509377', // для wa.me
  whatsapp: 'https://wa.me/77015509377',
  whatsappWithText: (text: string) =>
    `https://wa.me/77015509377?text=${encodeURIComponent(text)}`,
  telegram: 'https://t.me/+B9HzpYNs7QpiZDAy',
  telegramHandle: 'MY AVTO · канал',
  instagram: 'https://www.instagram.com/myavto.kz_',
  instagramHandle: '@myavto.kz_',
  tiktok: 'https://www.tiktok.com/@myavto.kz',
  tiktokHandle: '@myavto.kz',
  kaspi: 'https://l.kaspi.kz/shop/U2E5tHvjbzmz9vD',
  kolesa: 'https://kolesa.kz/a/show/216448704?redirect=1',
  address: 'г. Алматы, ТЦ «CarCity», 3 ярус, бутик 135В',
  addressShort: 'CarCity · 3 ярус · 135В',
  hours: 'Пн–Сб 09:00–17:00 · Вс 11:00–16:00',
  hoursShort: 'Пн–Сб 9–17, Вс 11–16',
  legalName: 'MY AVTO',
};
