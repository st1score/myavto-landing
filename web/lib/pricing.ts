export const DEFAULT_USD_KZT_RATE = 500;
export const DEFAULT_MARGIN_PERCENT = 50;

export type PricingSettings = {
  usd_kzt_rate: number;
  default_margin_percent: number;
};

// Prices snap to a 500 ₸ grid.
export const PRICE_STEP = 500;

export function roundUpToStep(value: number, step = PRICE_STEP) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

export function calculateKztPrice(priceUsd: number, usdKztRate: number, marginPercent: number) {
  return roundUpToStep(priceUsd * usdKztRate * (1 + marginPercent / 100));
}

// Inverse: given a final sale price (₸) and the cost (USD × rate), what margin %
// does it imply? Used so the owner can type the sale price directly and let the
// margin field follow. Returns a value rounded to 0.1%.
export function marginFromKzt(priceKzt: number, priceUsd: number, usdKztRate: number) {
  const cost = priceUsd * usdKztRate;
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(priceKzt)) return 0;
  return Math.round((priceKzt / cost - 1) * 1000) / 10;
}

export function normalizeSkuPart(value: string, fallback = 'NA') {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(',', '.')
    .replace(/[^A-Z0-9.]+/g, '-')
    .replace(/^\-+|\-+$/g, '')
    .replace(/\./g, '');
  return normalized || fallback;
}

export function buildMasterSku({
  brandCode,
  manufacturerPartNumber,
  size,
}: {
  brandCode: string;
  manufacturerPartNumber: string;
  size: string;
}) {
  return [
    'MYA',
    normalizeSkuPart(brandCode, 'BRAND'),
    normalizeSkuPart(manufacturerPartNumber, 'NOART'),
    normalizeSkuPart(size, 'STD'),
  ].join('-');
}
