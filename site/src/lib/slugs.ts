export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\/\\]/g, '-')
    .replace(/[^a-z0-9а-я\-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const CATEGORY_LABEL: Record<string, string> = {
  PISTON: 'Поршни',
  RING: 'Кольца',
  BEARING: 'Вкладыши',
  LINER: 'Гильзы',
  KIT: 'Ремкомплекты',
};

export const CATEGORY_SLUG: Record<string, string> = {
  PISTON: 'porshni',
  RING: 'koltsa',
  BEARING: 'vkladyshi',
  LINER: 'gilzy',
  KIT: 'remkomplekty',
};
