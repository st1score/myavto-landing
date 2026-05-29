export const DEFAULT_USD_KZT_RATE = 500;
export const DEFAULT_MARGIN_PERCENT = 50;

export type PricingSettings = {
  usd_kzt_rate: number;
  default_margin_percent: number;
};

export function roundUpToThousand(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / 1000) * 1000;
}

export function calculateKztPrice(priceUsd: number, usdKztRate: number, marginPercent: number) {
  return roundUpToThousand(priceUsd * usdKztRate * (1 + marginPercent / 100));
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
