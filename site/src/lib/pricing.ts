// Курс USD → KZT и формула розничной цены.
// Источник курса: Нацбанк РК (XML). Кэшируется на время билда.

const FALLBACK_RATE = 535; // если API недоступно
let cachedRate: number | null = null;

export async function getUsdRate(): Promise<number> {
  if (cachedRate !== null) return cachedRate;

  const envRate = process.env.USD_KZT_RATE;
  if (envRate) {
    cachedRate = Number(envRate);
    return cachedRate;
  }

  try {
    const res = await fetch('https://nationalbank.kz/rss/rates_all.xml', {
      signal: AbortSignal.timeout(5000),
    });
    const xml = await res.text();
    const m = xml.match(/<item>\s*<title>USD<\/title>[\s\S]*?<description>([\d.,]+)<\/description>/);
    if (m) {
      cachedRate = Number(m[1].replace(',', '.'));
      return cachedRate;
    }
  } catch (e) {
    console.warn('[pricing] National Bank API недоступен, использую fallback:', FALLBACK_RATE);
  }
  cachedRate = FALLBACK_RATE;
  return cachedRate;
}

// Наценка по диапазону закупочной цены USD
export function getMarkup(purchaseUsd: number): number {
  if (purchaseUsd <= 20) return 1.6;
  if (purchaseUsd <= 50) return 1.5;
  if (purchaseUsd <= 100) return 1.4;
  return 1.3;
}

export function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function calcRetailKzt(purchaseUsd: number, usdRate: number): number {
  const markup = getMarkup(purchaseUsd);
  const raw = purchaseUsd * usdRate * markup;
  return roundUpTo(raw, 100);
}

export function formatKzt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';
}
