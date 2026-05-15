// Русские подписи для UI и SEO

export const brandLabel: Record<string, string> = {
  Toyota: 'Toyota',
  Nissan: 'Nissan',
  Mitsubishi: 'Mitsubishi',
  Mazda: 'Mazda',
  Honda: 'Honda',
  Subaru: 'Subaru',
  Suzuki: 'Suzuki',
  Lexus: 'Lexus',
  Infiniti: 'Infiniti',
};

export const categoryLabel: Record<string, string> = {
  PISTON: 'Поршни',
  RING: 'Поршневые кольца',
};

// Род. падеж для заголовков ("Поршни для Toyota 2JZ-GE")
export const categoryLabelFor: Record<string, string> = {
  PISTON: 'Поршни',
  RING: 'Поршневые кольца',
};

export const partsBrandLabel: Record<string, string> = {
  TEIKIN: 'Teikin',
  IZUMI: 'Izumi',
  ND: 'ND',
  NPR: 'NPR',
  RIK: 'RIK',
  RIKEN: 'Riken',
  TP: 'TP',
  ART: 'ART',
  KA: 'KA',
  MOTREX: 'Motrex',
  NM: 'NM',
  FGM: 'FGM',
  GRM: 'GRM',
  RW: 'RW',
  TOTO: 'TOTO',
  TIK: 'TIK',
  YPR: 'YPR',
  ORIG: 'Оригинал',
  OEM: 'Оригинал (OEM)',
  KOREA: 'Korea',
  KITAI: 'Китай',
  MIXED: 'Сборный',
  NIPPON_SAITAMA: 'Nippon Saitama',
};

export function brandDisplay(name: string): string {
  return partsBrandLabel[name] ?? name;
}

export const insertTypeLabel: Record<string, string> = {
  plain: 'Стандарт',
  A: 'Вставка A',
  AG: 'Антизадирный обод (AG)',
};

export const warehouseLabel: Record<string, string> = {
  WORK: 'Витрина',
  STOCK: 'Склад',
};
