// Shared presentation helpers for the redesigned storefront.

export const WA_PHONE = '77015509377';
export const PHONE_HUMAN = '+7 701 550-93-77';
export const waLink = (text: string) =>
  `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;

// parts-brand logo slugs that actually exist in /public/assets/parts-brands
const PARTS_LOGO_SLUGS = new Set([
  'teikin', 'izumi', 'nd', 'nm', 'npr', 'riken', 'taiho', 'tp', 'gmb', 'ndc', 'npw', 'rocky',
]);

/** Resolve a parts-brand logo path from a (possibly upper-case) brand_code. */
export function partsBrandLogo(brandCode: string | null | undefined): string | null {
  if (!brandCode) return null;
  const slug = brandCode.trim().toLowerCase();
  return PARTS_LOGO_SLUGS.has(slug) ? `/assets/parts-brands/${slug}.png` : null;
}

// car-make logo slugs in /public/assets/brands
const MAKE_LOGOS: [slug: string, label: string][] = [
  ['toyota', 'Toyota'], ['nissan', 'Nissan'], ['honda', 'Honda'],
  ['mazda', 'Mazda'], ['mitsubishi', 'Mitsubishi'], ['subaru', 'Subaru'],
  ['suzuki', 'Suzuki'], ['hyundai', 'Hyundai'], ['kia', 'Kia'],
];
export const MAKE_ITEMS = MAKE_LOGOS.map(([slug, label]) => ({
  src: `/assets/brands/${slug}.png`, label, href: `/search?q=${encodeURIComponent(label)}`,
}));

// parts-brand logos for the home marquee
const PARTS_BRANDS: [slug: string, label: string][] = [
  ['teikin', 'TEIKIN'], ['izumi', 'IZUMI'], ['nd', 'ND'], ['nm', 'NM'],
  ['npr', 'NPR'], ['riken', 'RIKEN'], ['taiho', 'TAIHO'], ['tp', 'TP'],
  ['gmb', 'GMB'], ['ndc', 'NDC'],
];
export const PARTS_BRAND_ITEMS = PARTS_BRANDS.map(([slug, label]) => ({
  src: `/assets/parts-brands/${slug}.png`, label, href: `/search?brand=${label}`,
}));

// category_code → custom line icon name
export const CATEGORY_ICON: Record<string, string> = {
  PISTON: 'piston', RING: 'ring', BEARING: 'bearing', LINER: 'sleeve', KIT: 'gasket',
};

export const fmtKzt = (n: number) =>
  n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';
