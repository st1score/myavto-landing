// Контент-карта брендов запчастей. Используется в /brendy/[brand]/
// и для логики "какие бренды доступны для категории запчасти".
export type PartCategory =
  | 'porshni'         // поршни
  | 'gilzy'           // гильзы цилиндров
  | 'koltsa'          // поршневые кольца
  | 'vkladyshi'       // вкладыши (коренные, шатунные, балансира, распредвала)
  | 'remkomplekty'    // ремкомплекты
  | 'prokladki-gbc'   // прокладки ГБЦ
  | 'vodyanye-pompy'  // водяные помпы
  | 'roliki'          // ролики
  | 'maslosjomki'     // маслосъёмные колпачки
  | 'salniki';        // сальники

export type PartsBrandInfo = {
  slug: string;
  dbName: string;
  display: string;
  country: string;
  tagline: string;
  description: string;
  categories: PartCategory[];
  highlights: string[];
  logo?: string;
};

export const partsBrands: Record<string, PartsBrandInfo> = {
  teikin: {
    slug: 'teikin',
    dbName: 'TEIKIN',
    display: 'TEIKIN',
    country: 'Япония',
    tagline: 'Японские поршни и гильзы',
    description:
      'TEIKIN — японский производитель поршней и гильз для двигателей внутреннего сгорания. Поставляет на капремонт японских автомобилей: Toyota, Nissan, Mitsubishi, Mazda. Все ремонтные размеры: STD, 0.25, 0.50, 0.75 (наличие уточняйте в WhatsApp).',
    categories: ['porshni', 'gilzy'],
    highlights: [
      'Производство в Японии',
      'Поршни и гильзы для японских ДВС',
      'Все ремонтные размеры (STD, 0.25, 0.50, 0.75)',
      'Наличие и цена — по WhatsApp',
    ],
    logo: '/assets/parts-brands/teikin.png',
  },
  nd: {
    slug: 'nd',
    dbName: 'ND',
    display: 'ND',
    country: 'Япония',
    tagline: 'Поршни и гильзы — фактически тот же бренд, что TEIKIN',
    description:
      'ND — японский бренд поршней и гильз. По сути это тот же производитель что TEIKIN, просто с другого завода: отличаются только цветом коробки и маркировкой. Артикулы и размеры одинаковые. Если TEIKIN нет в наличии — берут ND с теми же характеристиками.',
    categories: ['porshni', 'gilzy'],
    highlights: [
      'Тот же производитель что TEIKIN, другой завод',
      'Артикулы одинаковые с TEIKIN',
      'Отличие только в коробке и маркировке поршня',
      'Все ремонтные размеры',
    ],
    logo: '/assets/parts-brands/nd.png',
  },
  izumi: {
    slug: 'izumi',
    dbName: 'IZUMI',
    display: 'IZUMI',
    country: 'Япония',
    tagline: 'Японские поршни и гильзы',
    description:
      'IZUMI — японский производитель поршней и гильз цилиндров. Подходит на популярные двигатели японских автомобилей: Toyota, Nissan, Mitsubishi, Mazda. Все ремонтные размеры. Цена и наличие — в WhatsApp.',
    categories: ['porshni', 'gilzy'],
    highlights: [
      'Производство в Японии',
      'Поршни и гильзы',
      'Все ремонтные размеры',
      'Альтернатива TEIKIN/ND по цене',
    ],
    logo: '/assets/parts-brands/izumi.png',
  },
  nm: {
    slug: 'nm',
    dbName: 'NM',
    display: 'NM (Nippon Motors)',
    country: 'Япония',
    tagline: 'Поршни, гильзы, ремкомплекты и прокладки ГБЦ',
    description:
      'NM (Nippon Motors) — японский производитель с широким ассортиментом для капремонта. Поршни и гильзы, полные ремкомплекты с прокладками, отдельно прокладки ГБЦ. Один из самых востребованных брендов когда нужен ремкомплект «всё в одном».',
    categories: ['porshni', 'gilzy', 'remkomplekty', 'prokladki-gbc'],
    highlights: [
      'Полные ремкомплекты двигателя',
      'Прокладки ГБЦ отдельно',
      'Поршни и гильзы',
      'Универсальный бренд для капремонта',
    ],
    logo: '/assets/parts-brands/nm.png',
  },
  rik: {
    slug: 'rik',
    dbName: 'RIK',
    display: 'RIK',
    country: 'Япония',
    tagline: 'Японские поршневые кольца',
    description:
      'RIK — японский производитель поршневых колец. Один из самых популярных брендов на капремонт японских двигателей. Все ремонтные размеры (STD, 0.25, 0.50, 0.75) и любые толщины колец на самые ходовые ДВС.',
    categories: ['koltsa'],
    highlights: [
      'Производство в Японии',
      'Только поршневые кольца',
      'Все ремонтные размеры',
      'Под все ходовые японские двигатели',
    ],
    logo: '/assets/parts-brands/riken.png',
  },
  tp: {
    slug: 'tp',
    dbName: 'TP',
    display: 'TP',
    country: 'Япония',
    tagline: 'Японские поршневые кольца',
    description:
      'TP — японский производитель поршневых колец. Часто выбирают для рядового капремонта: хорошее качество за разумные деньги. Полная линейка ремонтных размеров для Toyota, Nissan, Mitsubishi, Mazda.',
    categories: ['koltsa'],
    highlights: [
      'Японское производство',
      'Только поршневые кольца',
      'Все ремонтные размеры',
      'Хорошее соотношение цена/качество',
    ],
    logo: '/assets/parts-brands/tp.png',
  },
  npr: {
    slug: 'npr',
    dbName: 'NPR',
    display: 'NPR',
    country: 'Япония',
    tagline: 'Nippon Piston Ring — поршневые кольца',
    description:
      'NPR (Nippon Piston Ring) — японский производитель поршневых колец. Делает только кольца, никаких поршней или вкладышей. Поставляет на конвейер крупных японских автоконцернов. Все ремонтные размеры под японские ДВС.',
    categories: ['koltsa'],
    highlights: [
      'Только поршневые кольца',
      'Производство в Японии',
      'Все ремонтные размеры',
      'Для большинства японских двигателей',
    ],
    logo: '/assets/parts-brands/npr.png',
  },
  taiho: {
    slug: 'taiho',
    dbName: 'TAIHO',
    display: 'Taiho',
    country: 'Япония',
    tagline: 'Вкладыши коренные, шатунные, балансира и распредвала',
    description:
      'Taiho — японский производитель подшипников скольжения (вкладышей) для двигателя. Делает только вкладыши: коренные, шатунные, балансирные валы, распредвал. На капремонт японских двигателей — один из основных брендов наряду с NDC.',
    categories: ['vkladyshi'],
    highlights: [
      'Коренные и шатунные вкладыши',
      'Вкладыши балансира и распредвала',
      'Только вкладыши, ничего больше',
      'Все ремонтные размеры',
    ],
    logo: '/assets/parts-brands/taiho.png',
  },
  ndc: {
    slug: 'ndc',
    dbName: 'NDC',
    display: 'NDC',
    country: 'Япония',
    tagline: 'Вкладыши коренные, шатунные, балансира и распредвала',
    description:
      'NDC — японский производитель вкладышей коленвала. Так же как Taiho делает только вкладыши: коренные, шатунные, балансира, распредвала. Полная линейка ремонтных размеров для японских двигателей.',
    categories: ['vkladyshi'],
    highlights: [
      'Коренные и шатунные вкладыши',
      'Вкладыши балансира и распредвала',
      'Только вкладыши',
      'Все ремонтные размеры',
    ],
    logo: '/assets/parts-brands/ndc.png',
  },
  gmb: {
    slug: 'gmb',
    dbName: 'GMB',
    display: 'GMB',
    country: 'Япония',
    tagline: 'Водяные помпы и ролики',
    description:
      'GMB — японский производитель водяных помп и роликов ГРМ. Один из самых популярных брендов на замену помпы при капремонте или при замене ремня ГРМ. Подходит на все ходовые японские двигатели.',
    categories: ['vodyanye-pompy', 'roliki'],
    highlights: [
      'Только водяные помпы и ролики',
      'Японское производство',
      'Подходят на все ходовые ДВС',
      'Альтернатива дорогому оригиналу',
    ],
    logo: '/assets/parts-brands/gmb.png',
  },
  npw: {
    slug: 'npw',
    dbName: 'NPW',
    display: 'NPW',
    country: 'Япония',
    tagline: 'Водяные помпы и ролики',
    description:
      'NPW — японский производитель водяных помп и роликов ГРМ. Аналог GMB по качеству и назначению. На некоторые двигатели NPW идёт чаще чем GMB — зависит от модели. Уточняйте в WhatsApp.',
    categories: ['vodyanye-pompy', 'roliki'],
    highlights: [
      'Только водяные помпы и ролики',
      'Японское производство',
      'Аналог GMB',
      'Цена и наличие — по WhatsApp',
    ],
    logo: '/assets/parts-brands/npw.png',
  },
  nok: {
    slug: 'nok',
    dbName: 'NOK',
    display: 'NOK',
    country: 'Япония',
    tagline: 'Маслосъёмные колпачки и сальники',
    description:
      'NOK — японский производитель сальников и маслосъёмных колпачков. Один из лучших по качеству на рынке: ставится на оригинальные двигатели на заводе. На капремонт берут практически всегда, потому что дешёвые аналоги текут.',
    categories: ['maslosjomki', 'salniki'],
    highlights: [
      'Маслосъёмные колпачки',
      'Сальники коленвала и распредвалов',
      'Заводское качество для японских ДВС',
      'Лучшие на рынке по герметичности',
    ],
  },
};

export const partsBrandSlugs = Object.keys(partsBrands);

export const CATEGORY_LABELS: Record<PartCategory, string> = {
  porshni: 'Поршни',
  gilzy: 'Гильзы цилиндров',
  koltsa: 'Поршневые кольца',
  vkladyshi: 'Вкладыши коренные / шатунные',
  remkomplekty: 'Ремкомплекты двигателя',
  'prokladki-gbc': 'Прокладки ГБЦ',
  'vodyanye-pompy': 'Водяные помпы',
  roliki: 'Ролики ГРМ',
  maslosjomki: 'Маслосъёмные колпачки',
  salniki: 'Сальники',
};

// Возвращает бренды которые поставляют запчасти данной категории.
// Используется на странице категории чтобы показать только релевантные бренды.
export function brandsForCategory(category: PartCategory): PartsBrandInfo[] {
  return Object.values(partsBrands).filter((b) => b.categories.includes(category));
}

// Маппинг slug категории из URL → PartCategory
// (URL содержит slug категории в БД, но на каждой странице мы знаем что показать)
export const CATEGORY_SLUG_MAP: Record<string, PartCategory> = {
  'porshni': 'porshni',
  'gilzy': 'gilzy',
  'koltsa': 'koltsa',
  'koltsa-porshnevye': 'koltsa',
  'vkladyshi': 'vkladyshi',
  'vkladyshi-korennye': 'vkladyshi',
  'vkladyshi-shatunnye': 'vkladyshi',
  'remkomplekty': 'remkomplekty',
  'prokladki': 'prokladki-gbc',
  'prokladki-gbc': 'prokladki-gbc',
  'pompy': 'vodyanye-pompy',
  'vodyanye-pompy': 'vodyanye-pompy',
  'roliki': 'roliki',
  'maslosjomki': 'maslosjomki',
  'salniki': 'salniki',
};
