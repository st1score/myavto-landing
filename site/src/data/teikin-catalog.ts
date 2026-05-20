// Характеристики поршней из каталога TEIKIN 2019.
// Ключ = engine_code в БД. Используется на product-страницах.
//
// Заполнено вручную для пилота (1KZ). После одобрения пилота —
// PDF будет распарсен скриптом и сгенерирован полный catalog
// для остальных 184 двигателей с stock.

export type TeikinRing = {
  thickness_mm: number;        // 2.0
  position: 'top' | 'middle' | 'oil';   // верхнее компр. / 2-е компр. / маслосъёмное
  surface?: 'hard_chrome' | 'plain' | 'oil_scraper';  // твёрдое хромирование / без покрытия / маслосъёмное
  marking_raw?: string;        // 'HK', 'TL' — оригинальная маркировка из каталога (на всякий)
};

export type TeikinEntry = {
  // Идентификация
  display_name: string;         // 'Toyota 1KZ-TE, 1KZ'
  catalog_page: number;         // 357 (PDF page для нашей справки)
  image?: string;               // /teikin-catalog/1kz.png — пока опционально

  // Спецификация двигателя
  fuel: 'GASOLINE' | 'DIESEL';
  cc: number;                   // 2982
  cyl: number;                  // 4
  years?: string;

  // Поршень
  bore_mm: number;              // 96.00 — номинальный диаметр поршня
  bore_undersize_mm?: number;   // -2.2 — глубина (зачем-то TEIKIN указывает)
  cd_mm?: number;               // 45.70 — Compression Distance = высота сжатия
  tl_mm?: number;               // 80.70 — Total Length = полная высота поршня
  skirt_coating?: 'tin' | 'moly' | 'graphite' | 'none';   // оловянное / молибденовое / графитовое
  crown_coating?: 'anodized' | 'ceramic' | 'none';        // анодированное / керамическое
  mrc_mm?: number;              // 0.030 — Maximum Recommended Clearance — макс. зазор поршень-гильза
  mp_mm?: number;               // 14.00 — Measurement Point — точка измерения диаметра

  // Поршневые кольца
  rings?: TeikinRing[];

  // Палец поршневой
  pin_diameter_mm?: number;     // 34.000
  pin_total_length_mm?: number; // 73.00 — TL пальца (длина)

  // Гильза (если в каталоге есть)
  liner_total_length_mm?: number;   // TL = 170.0
  liner_od_mm?: number;             // OD = 99.0 — outer diameter
  liner_flange_thickness_mm?: number; // FT = 5.0
  liner_flange_diameter_mm?: number;  // FD = 105.0

  // Артикулы TEIKIN
  teikin_pistons: string[];        // ['46283', '46283A', '46283G', '46283AG']
  teikin_rings_set?: string;       // 'R 46283' — комплект колец
  teikin_pin?: string;             // 'P 46283' — палец
  teikin_bushing?: string;         // 'B 46283' — втулка пальца
  teikin_liner_flanged?: string;   // 'LFF 46283' — гильза с фланцем
  teikin_liner_no_flange?: string; // 'LSF 46283' — гильза без фланца
  teikin_liner_kit?: string[];     // комплект (поршень+кольца+гильза)

  // OEM номера
  oem_piston?: string[];   // ['13101-67030']
  oem_rings?: string[];
  oem_pin?: string[];
  oem_liner?: string[];

  // Совместимые модели
  models?: string[];
};

// Ручные записи (приоритетные) — здесь храним «эталонные» моторы с полным набором полей.
// Остальные подтягиваются из auto-каталога ниже.
const handwritten: Record<string, TeikinEntry> = {
  '1KZ': {
    display_name: 'Toyota 1KZ-TE / 1KZ',
    catalog_page: 389,
    image: '/teikin-catalog/1kz.png',
    fuel: 'DIESEL',
    cc: 2982,
    cyl: 4,
    bore_mm: 96.00,
    bore_undersize_mm: -2.2,
    cd_mm: 45.70,
    tl_mm: 80.70,
    skirt_coating: 'tin',
    crown_coating: 'anodized',
    mrc_mm: 0.030,
    mp_mm: 14.00,
    rings: [
      { thickness_mm: 2.0, position: 'top',    surface: 'hard_chrome', marking_raw: 'HK' },
      { thickness_mm: 2.0, position: 'middle', surface: 'plain' },
      { thickness_mm: 3.0, position: 'oil',    surface: 'oil_scraper' },
    ],
    pin_diameter_mm: 34.000,
    pin_total_length_mm: 73.00,
    liner_total_length_mm: 170.0,
    liner_od_mm: 99.0,
    liner_flange_thickness_mm: 5.0,
    liner_flange_diameter_mm: 105.0,
    teikin_pistons: ['46283', '46283A', '46283G', '46283AG'],
    teikin_rings_set: 'R 46283',
    teikin_pin: 'P 46283',
    teikin_bushing: 'B 46283',
    teikin_liner_flanged: 'LFF 46283',
    teikin_liner_no_flange: 'LSF 46283',
    teikin_liner_kit: ['LKFF 46283', 'LKSF 46283', 'LKFF 46283A', 'LKSF 46283A', 'LKFF 46283G', 'LKSF 46283G', 'LKFF 46283AG', 'LKSF 46283AG'],
    oem_piston: ['13101-67030'],
    oem_rings: ['13011-67030', '13013-67030', '13014-67030', '13015-67030'],
    oem_pin: ['90999-73136', '90999-73143'],
    oem_liner: ['11461-78300', '11461-78301'],
    models: [
      'Toyota Land Cruiser Prado 90/95 (1KZ-TE)',
      'Toyota Hilux Surf KZN185 (1KZ-TE)',
      'Toyota Land Cruiser 100 (1KZ-TE)',
      'Toyota Hiace KZH/LXH (1KZ)',
      'Toyota 4Runner KZN185 (1KZ-TE)',
    ],
  },
};

// Авто-сгенерированный каталог (вытянут со scrape-teikin.mjs + pdftotext).
// Если файла нет (например в свежем чекауте) — fallback на пустой объект.
import { teikinAutoCatalog } from './teikin-catalog-auto';

// Финальный каталог: handwritten перезаписывает auto.
export const teikinCatalog: Record<string, Partial<TeikinEntry>> = {
  ...teikinAutoCatalog,
  ...handwritten,
};

// Человекочитаемые подписи
export const RING_POSITION_LABEL: Record<TeikinRing['position'], string> = {
  top: '1-е компрессионное',
  middle: '2-е компрессионное',
  oil: 'Маслосъёмное',
};

export const RING_SURFACE_LABEL: Record<NonNullable<TeikinRing['surface']>, string> = {
  hard_chrome: 'твёрдое хромирование',
  plain: 'чугун без покрытия',
  oil_scraper: 'трёхсоставное маслосъёмное',
};

export const SKIRT_COATING_LABEL: Record<NonNullable<TeikinEntry['skirt_coating']>, string> = {
  tin: 'оловянное (Tin Coated)',
  moly: 'молибденовое (Moly Skirt)',
  graphite: 'графитовое',
  none: 'без покрытия',
};

export const CROWN_COATING_LABEL: Record<NonNullable<TeikinEntry['crown_coating']>, string> = {
  anodized: 'анодированное (Anodized Crown)',
  ceramic: 'керамическое',
  none: 'без покрытия',
};

export const FUEL_LABEL: Record<TeikinEntry['fuel'], string> = {
  GASOLINE: 'бензин',
  DIESEL: 'дизель',
};
