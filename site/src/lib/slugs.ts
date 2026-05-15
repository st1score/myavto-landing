export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\/\\]/g, '-')
    .replace(/[^a-z0-9а-я\-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const brandSlug: Record<string, string> = {
  Toyota: 'toyota',
  Nissan: 'nissan',
  Mitsubishi: 'mitsubishi',
  Mazda: 'mazda',
  Honda: 'honda',
  Subaru: 'subaru',
  Suzuki: 'suzuki',
  Lexus: 'lexus',
  Infiniti: 'infiniti',
};

export const brandFromSlug: Record<string, string> = Object.fromEntries(
  Object.entries(brandSlug).map(([k, v]) => [v, k])
);

export const categorySlug: Record<string, string> = {
  PISTON: 'porshni',
  RING: 'koltsa-porshnevye',
};

export const categoryFromSlug: Record<string, string> = Object.fromEntries(
  Object.entries(categorySlug).map(([k, v]) => [v, k])
);

export function engineSlug(code: string): string {
  return toSlug(code);
}
