// Характеристики поршней из каталога TEIKIN 2019.
// Ключ = engine_code в БД. Используется на product-страницах.
//
// Заполнено вручную для пилота. После одобрения пилота —
// PDF будет распарсен скриптом и сгенерирован полный catalog.

export type TeikinEntry = {
  // Идентификация
  display_name: string;     // Как написано в каталоге, например "1KZ-TE, 1KZ"
  catalog_page: number;     // Страница PDF (для отсылки клиента и нашей справки)
  image?: string;           // Путь к вырезанной картинке в /public/teikin-catalog/

  // Спецификация двигателя
  fuel: 'GASOLINE' | 'DIESEL';
  cc: number;               // объём в куб.см (2982)
  cyl: number;              // цилиндры (4)
  years?: string;           // годы выпуска

  // Поршень
  bore_mm: number;          // диаметр поршня (96.00)
  bore_depth_mm?: number;   // глубина (-2.2)
  cd_mm?: number;           // CD (45.70)
  tl_mm?: number;           // TL (80.70)
  surface_treatment?: string;   // 'Tin Coated' / 'Anodized Crown' / 'None'
  mrc_mm?: number;          // зазор (0.030)
  mp_mm?: number;           // (14.00)

  // Кольца — толщина каждого кольца (мм)
  rings?: string[];         // ['1 - 2.0 HK', '1 - 2.0 TL', '1 - 3.0']
  ring_tl_mm?: number;      // диаметр кольца (73.00)

  // Палец
  pin_diameter_mm?: number; // 34.000

  // Артикулы TEIKIN
  teikin_pistons: string[]; // ['46283', '46283A', '46283G', '46283AG']
  teikin_rings?: string;    // 'R 46283'
  teikin_pin?: string;      // 'P 46283'
  teikin_bushing?: string;  // 'B 46283'
  teikin_liner_flanged?: string;     // 'LFF 46283'
  teikin_liner_no_flange?: string;   // 'LSF 46283'
  teikin_liner_kit?: string[];       // ['LKFF 46283', 'LKSF 46283', ...]

  // OEM номера
  oem_piston?: string[];    // ['13101-67030']
  oem_rings?: string[];     // ['13011-67030', '13013-67030', ...]
  oem_pin?: string[];       // ['90999-73136', '90999-73143']
  oem_liner?: string[];     // ['11461-78300', '11461-78301']

  // Совместимые модели авто
  models?: string[];        // ['Land Cruiser Prado 90/95', 'Hilux Surf KZN185', ...]
};

export const teikinCatalog: Record<string, TeikinEntry> = {
  '1KZ': {
    display_name: '1KZ-TE, 1KZ',
    catalog_page: 357,
    image: '/teikin-catalog/1kz.png',
    fuel: 'DIESEL',
    cc: 2982,
    cyl: 4,
    bore_mm: 96.00,
    bore_depth_mm: -2.2,
    cd_mm: 45.70,
    tl_mm: 80.70,
    surface_treatment: 'Tin Coated, Anodized Crown',
    mrc_mm: 0.030,
    mp_mm: 14.00,
    rings: ['1 - 2.0 HK', '1 - 2.0 TL', '1 - 3.0'],
    ring_tl_mm: 73.00,
    pin_diameter_mm: 34.000,
    teikin_pistons: ['46283', '46283A', '46283G', '46283AG'],
    teikin_rings: 'R 46283',
    teikin_pin: 'P 46283',
    teikin_bushing: 'B 46283',
    teikin_liner_flanged: 'LFF 46283',
    teikin_liner_no_flange: 'LSF 46283',
    teikin_liner_kit: ['LKFF 46283', 'LKSF 46283', 'LKFF 46283A', 'LKSF 46283A', 'LKFF 46283G', 'LKSF 46283G', 'LKFF 46283AG', 'LKSF 46283AG'],
    oem_piston: ['13101-67030'],
    oem_rings: ['13011-67030', '13013-67030', '13014-67030', '13015-67030'],
    oem_pin: ['90999-73136', '90999-73143'],
    oem_liner: ['11461-78300', '11461-78301'],
    models: ['Toyota Land Cruiser Prado 90/95 (1KZ-TE)', 'Toyota Hilux Surf KZN185', 'Toyota Land Cruiser 100 (1KZ-TE)', 'Toyota Hiace 1KZ', 'Toyota 4Runner 1KZ-TE'],
  },
};
