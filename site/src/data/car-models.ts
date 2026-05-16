// Каталог моделей для поиска "по машине" (марка → модель → год → двигатель).
// Данные собраны с otoba.ru + общеизвестная информация по JDM моделям популярным в Казахстане.
//
// engines: массив паттернов engine_code, по которым ищем в БД.
// Один паттерн — это начальная подстрока кода двигателя (case-insensitive).
// Пример: паттерн "2AZ" найдёт "2AZ", "2AZ-FE", "2AZ II" в БД.

export type Generation = {
  code: string;       // обозначение поколения (XV40, E120, N16)
  yearStart: number;
  yearEnd: number | null; // null = по настоящее время
  engines: string[];  // паттерны engine_code в БД (case-insensitive prefix match)
};

export type CarModel = {
  slug: string;       // URL slug: "camry", "land-cruiser-prado"
  display: string;    // отображаемое имя: "Camry"
  generations: Generation[];
};

export type CarBrand = {
  slug: 'toyota' | 'nissan' | 'mitsubishi' | 'mazda';
  display: string;
  models: CarModel[];
};

export const CAR_BRANDS: CarBrand[] = [
  // ============================================================
  // TOYOTA
  // ============================================================
  {
    slug: 'toyota',
    display: 'Toyota',
    models: [
      {
        slug: 'camry',
        display: 'Camry',
        generations: [
          { code: 'XV20', yearStart: 1996, yearEnd: 2001, engines: ['5S', '1MZ'] },
          { code: 'XV30', yearStart: 2001, yearEnd: 2006, engines: ['2AZ', '1MZ', '3MZ'] },
          { code: 'XV40', yearStart: 2006, yearEnd: 2011, engines: ['2AZ', '2GR', '2AR', '1AZ'] },
          { code: 'XV50', yearStart: 2011, yearEnd: 2017, engines: ['2AR', '2GR', '1AR'] },
          { code: 'XV70', yearStart: 2017, yearEnd: 2024, engines: ['2AR', '6AR', 'A25A', '2GR'] },
          { code: 'XV80', yearStart: 2024, yearEnd: null, engines: ['A25A', 'A25B'] },
        ],
      },
      {
        slug: 'corolla',
        display: 'Corolla',
        generations: [
          { code: 'E100', yearStart: 1991, yearEnd: 1998, engines: ['4A', '5A', '7A', '4E', '5E', '2C'] },
          { code: 'E110', yearStart: 1995, yearEnd: 2002, engines: ['4A', '7A', '5A', '4E', '4ZZ', '5ZZ'] },
          { code: 'E120', yearStart: 2001, yearEnd: 2007, engines: ['1ZZ', '2ZZ', '3ZZ', '4ZZ', '1NZ', '2NZ', '1ND'] },
          { code: 'E140/E150', yearStart: 2006, yearEnd: 2013, engines: ['1ZR', '2ZR', '1NZ', '4ZZ'] },
          { code: 'E170', yearStart: 2013, yearEnd: 2019, engines: ['1ZR', '2ZR', '1NR', '2NR'] },
          { code: 'E210', yearStart: 2018, yearEnd: null, engines: ['M20A', '2ZR'] },
        ],
      },
      {
        slug: 'land-cruiser',
        display: 'Land Cruiser',
        generations: [
          { code: '80', yearStart: 1989, yearEnd: 1997, engines: ['1FZ', '1HZ', '1HD', '3F'] },
          { code: '100', yearStart: 1998, yearEnd: 2007, engines: ['2UZ', '1HD', '1HZ'] },
          { code: '200', yearStart: 2007, yearEnd: 2021, engines: ['1UR', '3UR', '2UZ', '1VD'] },
          { code: '300', yearStart: 2021, yearEnd: null, engines: ['V35A', 'F33A'] },
        ],
      },
      {
        slug: 'land-cruiser-prado',
        display: 'Land Cruiser Prado',
        generations: [
          { code: '90', yearStart: 1996, yearEnd: 2002, engines: ['5VZ', '3RZ', '1KZ'] },
          { code: '120', yearStart: 2002, yearEnd: 2009, engines: ['1GR', '2TR', '1KD', '1KZ'] },
          { code: '150', yearStart: 2009, yearEnd: 2024, engines: ['1GR', '2TR', '1KD', '1GD'] },
          { code: '250', yearStart: 2024, yearEnd: null, engines: ['T24A', '1GD'] },
        ],
      },
      {
        slug: 'rav4',
        display: 'RAV4',
        generations: [
          { code: 'XA10', yearStart: 1994, yearEnd: 2000, engines: ['3S', '4Z'] },
          { code: 'XA20', yearStart: 2000, yearEnd: 2005, engines: ['1AZ', '2AZ', '1CD'] },
          { code: 'XA30', yearStart: 2005, yearEnd: 2012, engines: ['1AZ', '2AZ', '2AD', '2GR'] },
          { code: 'XA40', yearStart: 2012, yearEnd: 2018, engines: ['1AR', '2AR', '3ZR', '2AD'] },
          { code: 'XA50', yearStart: 2018, yearEnd: null, engines: ['M20A', 'A25A'] },
        ],
      },
      {
        slug: 'highlander',
        display: 'Highlander',
        generations: [
          { code: 'XU20', yearStart: 2000, yearEnd: 2007, engines: ['2AZ', '1MZ', '3MZ'] },
          { code: 'XU40', yearStart: 2007, yearEnd: 2013, engines: ['2AR', '2GR', '3MZ'] },
          { code: 'XU50', yearStart: 2013, yearEnd: 2019, engines: ['2AR', '2GR'] },
          { code: 'XU70', yearStart: 2019, yearEnd: null, engines: ['A25A', '2GR'] },
        ],
      },
      {
        slug: 'avensis',
        display: 'Avensis',
        generations: [
          { code: 'T220', yearStart: 1997, yearEnd: 2003, engines: ['1AZ', '3S', '7A', '1CD'] },
          { code: 'T250', yearStart: 2003, yearEnd: 2009, engines: ['1AZ', '1ZZ', '2AD', '1CD'] },
          { code: 'T270', yearStart: 2009, yearEnd: 2018, engines: ['1AZ', '1ZR', '2ZR', '2AD'] },
        ],
      },
      {
        slug: 'mark-ii',
        display: 'Mark II',
        generations: [
          { code: 'X90', yearStart: 1992, yearEnd: 1996, engines: ['1G', '2L', '1JZ', '2JZ'] },
          { code: 'X100', yearStart: 1996, yearEnd: 2000, engines: ['1G', '1JZ', '2JZ', '2L'] },
          { code: 'X110', yearStart: 2000, yearEnd: 2007, engines: ['1G', '1JZ', '1MZ'] },
        ],
      },
      {
        slug: 'vitz-yaris',
        display: 'Vitz / Yaris',
        generations: [
          { code: 'XP10', yearStart: 1999, yearEnd: 2005, engines: ['1SZ', '2SZ', '1NZ', '2NZ'] },
          { code: 'XP90', yearStart: 2005, yearEnd: 2010, engines: ['1KR', '1NZ', '2SZ', '2NZ'] },
          { code: 'XP130', yearStart: 2010, yearEnd: 2020, engines: ['1KR', '1NR', '1NZ'] },
        ],
      },
      {
        slug: 'crown',
        display: 'Crown',
        generations: [
          { code: 'S150', yearStart: 1995, yearEnd: 2001, engines: ['1G', '1JZ', '2JZ', '2L'] },
          { code: 'S170', yearStart: 1999, yearEnd: 2007, engines: ['1JZ', '2JZ', '3GR', '4GR'] },
          { code: 'S180', yearStart: 2003, yearEnd: 2008, engines: ['3GR', '4GR', '2GR'] },
          { code: 'S200', yearStart: 2008, yearEnd: 2012, engines: ['4GR', '2GR'] },
          { code: 'S210', yearStart: 2012, yearEnd: 2018, engines: ['4GR', '2GR', '5GR'] },
        ],
      },
      {
        slug: 'hilux-surf',
        display: 'Hilux Surf / 4Runner',
        generations: [
          { code: 'N130', yearStart: 1989, yearEnd: 1995, engines: ['3VZ', '22R', '2L', '3L'] },
          { code: 'N180', yearStart: 1995, yearEnd: 2002, engines: ['5VZ', '3RZ', '1KZ'] },
          { code: 'N210', yearStart: 2002, yearEnd: 2009, engines: ['1GR', '2TR', '1KD'] },
        ],
      },
      {
        slug: 'hiace',
        display: 'Hiace',
        generations: [
          { code: 'H100', yearStart: 1989, yearEnd: 2004, engines: ['2L', '3L', '5L', '1KZ', '3RZ'] },
          { code: 'H200', yearStart: 2004, yearEnd: null, engines: ['2TR', '1KD', '2KD', '1TR'] },
        ],
      },
      {
        slug: 'premio-allion',
        display: 'Premio / Allion',
        generations: [
          { code: 'T240', yearStart: 2001, yearEnd: 2007, engines: ['1ZZ', '1AZ', '1NZ', '3ZZ'] },
          { code: 'T260', yearStart: 2007, yearEnd: 2021, engines: ['1ZR', '2ZR', '3ZR'] },
        ],
      },
      {
        slug: 'caldina',
        display: 'Caldina',
        generations: [
          { code: 'T210', yearStart: 1997, yearEnd: 2002, engines: ['3S', '7A', '5A', '3C'] },
          { code: 'T240', yearStart: 2002, yearEnd: 2007, engines: ['1ZZ', '1AZ', '3S'] },
        ],
      },
      {
        slug: 'ipsum-picnic',
        display: 'Ipsum / Picnic',
        generations: [
          { code: 'M10', yearStart: 1995, yearEnd: 2001, engines: ['3S'] },
          { code: 'M20', yearStart: 2001, yearEnd: 2009, engines: ['2AZ', '1AZ'] },
        ],
      },
    ],
  },

  // ============================================================
  // NISSAN
  // ============================================================
  {
    slug: 'nissan',
    display: 'Nissan',
    models: [
      {
        slug: 'almera',
        display: 'Almera',
        generations: [
          { code: 'N15', yearStart: 1995, yearEnd: 2000, engines: ['GA14', 'GA16', 'SR20', 'CD20'] },
          { code: 'N16', yearStart: 2000, yearEnd: 2006, engines: ['QG15', 'QG16', 'QG18', 'YD22'] },
          { code: 'G15 (Classic)', yearStart: 2012, yearEnd: 2018, engines: ['K7M'] },
        ],
      },
      {
        slug: 'sunny',
        display: 'Sunny',
        generations: [
          { code: 'B14', yearStart: 1993, yearEnd: 1998, engines: ['GA13', 'GA15', 'GA16', 'CD20'] },
          { code: 'B15', yearStart: 1998, yearEnd: 2004, engines: ['QG13', 'QG15', 'QG18', 'CG10', 'CG13'] },
        ],
      },
      {
        slug: 'ad-wingroad',
        display: 'AD / Wingroad',
        generations: [
          { code: 'Y11', yearStart: 1999, yearEnd: 2008, engines: ['QG13', 'QG15', 'QG18', 'CG10', 'CG13'] },
          { code: 'Y12', yearStart: 2005, yearEnd: 2018, engines: ['HR15', 'MR18', 'CR12', 'CR14'] },
        ],
      },
      {
        slug: 'note',
        display: 'Note',
        generations: [
          { code: 'E11', yearStart: 2005, yearEnd: 2013, engines: ['HR15', 'HR16', 'CR12', 'CR14'] },
          { code: 'E12', yearStart: 2012, yearEnd: 2020, engines: ['HR12', 'HR16'] },
        ],
      },
      {
        slug: 'tiida',
        display: 'Tiida',
        generations: [
          { code: 'C11', yearStart: 2004, yearEnd: 2014, engines: ['HR15', 'HR16', 'MR18'] },
          { code: 'C13', yearStart: 2015, yearEnd: 2018, engines: ['HR16', 'MRA8'] },
        ],
      },
      {
        slug: 'qashqai',
        display: 'Qashqai',
        generations: [
          { code: 'J10', yearStart: 2007, yearEnd: 2014, engines: ['MR20', 'HR16', 'QR25'] },
          { code: 'J11', yearStart: 2013, yearEnd: 2021, engines: ['MR20', 'MR16', 'HR16'] },
          { code: 'J12', yearStart: 2021, yearEnd: null, engines: ['HR13'] },
        ],
      },
      {
        slug: 'x-trail',
        display: 'X-Trail',
        generations: [
          { code: 'T30', yearStart: 2000, yearEnd: 2007, engines: ['QR20', 'QR25', 'YD22', 'SR20'] },
          { code: 'T31', yearStart: 2007, yearEnd: 2014, engines: ['MR20', 'QR25', 'M9R'] },
          { code: 'T32', yearStart: 2013, yearEnd: 2022, engines: ['MR20', 'QR25'] },
          { code: 'T33', yearStart: 2022, yearEnd: null, engines: ['KR15'] },
        ],
      },
      {
        slug: 'patrol',
        display: 'Patrol',
        generations: [
          { code: 'Y60', yearStart: 1987, yearEnd: 1997, engines: ['TB42', 'RB30', 'TD42', 'RD28'] },
          { code: 'Y61', yearStart: 1997, yearEnd: 2010, engines: ['TB48', 'TB45', 'ZD30', 'RD28', 'TD42'] },
          { code: 'Y62', yearStart: 2010, yearEnd: null, engines: ['VK56'] },
        ],
      },
      {
        slug: 'primera',
        display: 'Primera',
        generations: [
          { code: 'P11', yearStart: 1995, yearEnd: 2001, engines: ['SR18', 'SR20', 'CD20', 'QG18'] },
          { code: 'P12', yearStart: 2001, yearEnd: 2008, engines: ['QG18', 'QR20', 'QR25', 'YD22'] },
        ],
      },
      {
        slug: 'cefiro',
        display: 'Cefiro / Maxima',
        generations: [
          { code: 'A32', yearStart: 1994, yearEnd: 1998, engines: ['VQ20', 'VQ25', 'VQ30'] },
          { code: 'A33', yearStart: 1998, yearEnd: 2003, engines: ['VQ20', 'VQ25', 'VQ30'] },
          { code: 'A34', yearStart: 2003, yearEnd: 2008, engines: ['VQ23', 'VQ35'] },
        ],
      },
      {
        slug: 'teana',
        display: 'Teana',
        generations: [
          { code: 'J31', yearStart: 2003, yearEnd: 2008, engines: ['QR20', 'QR25', 'VQ23', 'VQ35'] },
          { code: 'J32', yearStart: 2008, yearEnd: 2014, engines: ['QR25', 'VQ25', 'VQ35'] },
          { code: 'L33', yearStart: 2013, yearEnd: 2020, engines: ['QR25'] },
        ],
      },
      {
        slug: 'murano',
        display: 'Murano',
        generations: [
          { code: 'Z50', yearStart: 2002, yearEnd: 2007, engines: ['VQ35'] },
          { code: 'Z51', yearStart: 2008, yearEnd: 2016, engines: ['VQ35'] },
          { code: 'Z52', yearStart: 2014, yearEnd: null, engines: ['QR25', 'VQ35'] },
        ],
      },
      {
        slug: 'pathfinder',
        display: 'Pathfinder',
        generations: [
          { code: 'R50', yearStart: 1996, yearEnd: 2004, engines: ['VG33', 'QD32', 'TD27'] },
          { code: 'R51', yearStart: 2004, yearEnd: 2014, engines: ['VQ40', 'YD25'] },
          { code: 'R52', yearStart: 2012, yearEnd: 2021, engines: ['VQ35'] },
        ],
      },
      {
        slug: 'navara',
        display: 'Navara / Frontier',
        generations: [
          { code: 'D22', yearStart: 1997, yearEnd: 2008, engines: ['KA24', 'QD32', 'YD25', 'TD27'] },
          { code: 'D40', yearStart: 2004, yearEnd: 2015, engines: ['VQ40', 'YD25'] },
          { code: 'D23', yearStart: 2014, yearEnd: null, engines: ['YD25', 'QR25'] },
        ],
      },
    ],
  },

  // ============================================================
  // MITSUBISHI
  // ============================================================
  {
    slug: 'mitsubishi',
    display: 'Mitsubishi',
    models: [
      {
        slug: 'lancer',
        display: 'Lancer',
        generations: [
          { code: 'IX (CS)', yearStart: 2000, yearEnd: 2010, engines: ['4G13', '4G15', '4G18', '4G93', '4G94'] },
          { code: 'X (CY)', yearStart: 2007, yearEnd: 2017, engines: ['4A91', '4A92', '4B10', '4B11', '4B12'] },
        ],
      },
      {
        slug: 'galant',
        display: 'Galant',
        generations: [
          { code: 'VIII (EA)', yearStart: 1996, yearEnd: 2003, engines: ['4G63', '4G64', '6A13', '6G72'] },
          { code: 'IX (DJ)', yearStart: 2003, yearEnd: 2012, engines: ['4G69', '6G75'] },
        ],
      },
      {
        slug: 'outlander',
        display: 'Outlander',
        generations: [
          { code: 'I (CU)', yearStart: 2001, yearEnd: 2008, engines: ['4G63', '4G64', '4G69'] },
          { code: 'II (CW)', yearStart: 2005, yearEnd: 2012, engines: ['4B11', '4B12', '6B31', '4N14'] },
          { code: 'III (GF)', yearStart: 2012, yearEnd: 2021, engines: ['4B11', '4B12', '4J11', '4J12', '6B31'] },
        ],
      },
      {
        slug: 'asx',
        display: 'ASX / RVR',
        generations: [
          { code: 'GA', yearStart: 2010, yearEnd: 2023, engines: ['4B10', '4B11', '4A92', '4N13'] },
        ],
      },
      {
        slug: 'pajero',
        display: 'Pajero',
        generations: [
          { code: 'II (V20)', yearStart: 1991, yearEnd: 1999, engines: ['6G72', '6G74', '4D56', '4M40'] },
          { code: 'III (V60)', yearStart: 1999, yearEnd: 2006, engines: ['6G72', '6G74', '6G75', '4M41'] },
          { code: 'IV (V80)', yearStart: 2006, yearEnd: 2021, engines: ['6G74', '6G75', '4M41'] },
        ],
      },
      {
        slug: 'pajero-sport',
        display: 'Pajero Sport',
        generations: [
          { code: 'I (K90)', yearStart: 1996, yearEnd: 2008, engines: ['6G72', '6G74', '4D56', '4M40'] },
          { code: 'II (KH)', yearStart: 2008, yearEnd: 2015, engines: ['6B31', '4D56', '4M41'] },
          { code: 'III (QE/QF)', yearStart: 2015, yearEnd: null, engines: ['4N15', '6B31'] },
        ],
      },
      {
        slug: 'l200',
        display: 'L200',
        generations: [
          { code: 'III (K60)', yearStart: 1996, yearEnd: 2006, engines: ['4G64', '4D56', '4M40'] },
          { code: 'IV (KB)', yearStart: 2005, yearEnd: 2015, engines: ['4D56', '4M41', '4G64'] },
          { code: 'V (KK/KL)', yearStart: 2015, yearEnd: null, engines: ['4N15'] },
        ],
      },
      {
        slug: 'colt',
        display: 'Colt',
        generations: [
          { code: 'VI (Z30)', yearStart: 2002, yearEnd: 2012, engines: ['4A90', '4A91', '4G15', '4G19'] },
        ],
      },
      {
        slug: 'delica',
        display: 'Delica',
        generations: [
          { code: 'III (P00)', yearStart: 1986, yearEnd: 1999, engines: ['4G63', '4G64', '4D56', '4M40'] },
          { code: 'IV (PD)', yearStart: 1994, yearEnd: 2006, engines: ['6G72', '4G64', '4D56', '4M40'] },
          { code: 'V (CV)', yearStart: 2007, yearEnd: null, engines: ['4B11', '4B12', '4N14'] },
        ],
      },
    ],
  },

  // ============================================================
  // MAZDA
  // ============================================================
  {
    slug: 'mazda',
    display: 'Mazda',
    models: [
      {
        slug: 'demio',
        display: 'Demio / 2',
        generations: [
          { code: 'DW (I)', yearStart: 1996, yearEnd: 2002, engines: ['B3', 'B5'] },
          { code: 'DY (II)', yearStart: 2002, yearEnd: 2007, engines: ['ZJ', 'ZY'] },
          { code: 'DE (III)', yearStart: 2007, yearEnd: 2014, engines: ['ZJ', 'ZY'] },
        ],
      },
      {
        slug: 'familia-323',
        display: 'Familia / 323',
        generations: [
          { code: 'BG', yearStart: 1989, yearEnd: 1994, engines: ['B3', 'B6', 'B8', 'BP'] },
          { code: 'BH/BA', yearStart: 1994, yearEnd: 1998, engines: ['B3', 'B5', 'B6', 'BP', 'Z5'] },
          { code: 'BJ', yearStart: 1998, yearEnd: 2003, engines: ['ZL', 'ZM', 'B6', 'FP', 'FS'] },
        ],
      },
      {
        slug: 'axela-3',
        display: 'Axela / 3',
        generations: [
          { code: 'BK (I)', yearStart: 2003, yearEnd: 2009, engines: ['LF', 'L3', 'ZY'] },
          { code: 'BL (II)', yearStart: 2009, yearEnd: 2013, engines: ['Z6', 'ZY', 'LF', 'L3'] },
          { code: 'BM (III)', yearStart: 2013, yearEnd: 2019, engines: ['PE', 'PY', 'SH'] },
          { code: 'BP (IV)', yearStart: 2019, yearEnd: null, engines: ['PE', 'HF'] },
        ],
      },
      {
        slug: 'capella-626-atenza-6',
        display: 'Capella / 626 / Atenza / 6',
        generations: [
          { code: 'GE/GF', yearStart: 1991, yearEnd: 1997, engines: ['FS', 'FP', 'KF', 'KL', 'RF'] },
          { code: 'GW', yearStart: 1997, yearEnd: 2002, engines: ['FS', 'FP', 'KL', 'RF'] },
          { code: 'GG/GY', yearStart: 2002, yearEnd: 2008, engines: ['L3', 'LF', 'L8', 'RF'] },
          { code: 'GH', yearStart: 2007, yearEnd: 2012, engines: ['L5', 'LF', 'L3'] },
        ],
      },
      {
        slug: 'tribute-cx-7',
        display: 'Tribute / CX-7',
        generations: [
          { code: 'Tribute', yearStart: 2000, yearEnd: 2007, engines: ['YF', 'AJ'] },
          { code: 'CX-7', yearStart: 2006, yearEnd: 2012, engines: ['L3', 'R2'] },
        ],
      },
      {
        slug: 'cx-5',
        display: 'CX-5',
        generations: [
          { code: 'KE (I)', yearStart: 2012, yearEnd: 2017, engines: ['PE', 'PY', 'SH'] },
          { code: 'KF (II)', yearStart: 2017, yearEnd: null, engines: ['PE', 'PY', 'SH'] },
        ],
      },
      {
        slug: 'mpv',
        display: 'MPV',
        generations: [
          { code: 'LV/LW', yearStart: 1996, yearEnd: 2006, engines: ['FS', 'GY', 'AJ', 'WL'] },
          { code: 'LY', yearStart: 2006, yearEnd: 2016, engines: ['L3', 'LF'] },
        ],
      },
      {
        slug: 'bongo',
        display: 'Bongo / Bongo Friendee',
        generations: [
          { code: 'SD', yearStart: 1983, yearEnd: 1999, engines: ['F8', 'FE', 'R2', 'RF'] },
          { code: 'SK', yearStart: 1999, yearEnd: 2020, engines: ['F8', 'FE', 'R2'] },
          { code: 'Bongo Friendee', yearStart: 1995, yearEnd: 2005, engines: ['WL', 'WLT', 'FE', 'J5'] },
        ],
      },
    ],
  },
];

// Поиск моделей по slug
export function findModel(brandSlug: string, modelSlug: string): { brand: CarBrand; model: CarModel } | null {
  const brand = CAR_BRANDS.find((b) => b.slug === brandSlug);
  if (!brand) return null;
  const model = brand.models.find((m) => m.slug === modelSlug);
  if (!model) return null;
  return { brand, model };
}

// Сопоставление engine pattern из CAR_BRANDS с реальными engine_code из БД.
// Делается case-insensitive prefix match: "1JZ" → находит "1JZ", "1JZ-GE", "1JZ-GTE"
export function matchEnginePattern(pattern: string, dbEngineCodes: string[]): string[] {
  const p = pattern.toLowerCase().trim();
  return dbEngineCodes.filter((code) => {
    const c = code.toLowerCase().trim();
    return c === p || c.startsWith(p + ' ') || c.startsWith(p + '-') || c === p;
  });
}
