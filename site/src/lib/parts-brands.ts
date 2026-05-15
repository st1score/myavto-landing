// Контент-карта брендов запчастей. Используется в /brendy/[brand]/
export type PartsBrandInfo = {
  slug: string;
  dbName: string; // как хранится в DB (uppercase)
  display: string;
  country: string;
  founded?: string;
  tagline: string;
  description: string;
  categories: string[]; // что производит: "поршни", "кольца", "вкладыши"
  highlights: string[];
  logo?: string; // путь в /assets/parts-brands/
};

export const partsBrands: Record<string, PartsBrandInfo> = {
  teikin: {
    slug: 'teikin',
    dbName: 'TEIKIN',
    display: 'TEIKIN',
    country: 'Япония',
    founded: '1953',
    tagline: 'Японские поршни и кольца премиум-класса',
    description:
      'TEIKIN — японский производитель поршневых колец и поршней с 1953 года. Один из крупнейших OEM-поставщиков для Toyota, Honda, Nissan, Mitsubishi. Кольца TEIKIN отличаются точностью геометрии и высокой износостойкостью покрытий (хром, хром-молибден, нитрид).',
    categories: ['Поршневые кольца', 'Поршни', 'Полнокомплектные ремкомплекты'],
    highlights: [
      'OEM-поставщик для японских автоконцернов',
      'Все размеры: STD, 0.25, 0.50, 0.75',
      'Технология PVD-покрытия для гоночных применений',
      'Производство в Японии, без подделок из Китая',
    ],
    logo: '/assets/parts-brands/teikin.png',
  },
  npr: {
    slug: 'npr',
    dbName: 'NPR',
    display: 'NPR',
    country: 'Япония',
    founded: '1939',
    tagline: 'Nippon Piston Ring — старейший японский производитель колец',
    description:
      'NPR (Nippon Piston Ring) — основан в 1939 году, один из мировых лидеров в производстве поршневых колец. Поставляет на конвейер Toyota, Subaru, Honda, Yamaha. Известны технологией Steel Top Ring (стальные верхние кольца) для современных турбо-двигателей.',
    categories: ['Поршневые кольца', 'Гильзы цилиндров', 'Стопорные кольца'],
    highlights: [
      'Производство с 1939 года',
      'Стальные верхние кольца для турбо-двигателей',
      'Полная линейка по японским ДВС',
      'Все ремонтные размеры в наличии',
    ],
    logo: '/assets/parts-brands/npr.png',
  },
  izumi: {
    slug: 'izumi',
    dbName: 'IZUMI',
    display: 'IZUMI',
    country: 'Япония',
    founded: '1937',
    tagline: 'Поршни и кольца Izumi Industries',
    description:
      'IZUMI Industries — японский производитель поршней и колец премиум-класса. Поставщик OEM для Mazda, Mitsubishi, Subaru. Поршни IZUMI отличаются качеством литья из эвтектического алюминиевого сплава с керамическим покрытием юбки.',
    categories: ['Поршни', 'Поршневые кольца', 'Поршневые пальцы'],
    highlights: [
      'OEM-поставщик Mazda и Mitsubishi',
      'Эвтектический алюминиевый сплав',
      'Керамическое покрытие юбки',
      'Производство в Японии',
    ],
    logo: '/assets/parts-brands/izumi.png',
  },
  rik: {
    slug: 'rik',
    dbName: 'RIK',
    display: 'RIK / Riken',
    country: 'Япония',
    founded: '1927',
    tagline: 'Riken — старейший производитель поршневых колец в Японии',
    description:
      'Riken Corporation основана в 1927 году. Один из крупнейших поставщиков поршневых колец для японских автопроизводителей. Технологии нитрид-кремниевого покрытия и DLC (алмазоподобное покрытие) для уменьшения трения.',
    categories: ['Поршневые кольца', 'Маслосъёмные кольца'],
    highlights: [
      'Производство с 1927 года',
      'DLC-покрытие для снижения трения',
      'Все ремонтные размеры',
      'OEM для Toyota, Honda, Suzuki',
    ],
    logo: '/assets/parts-brands/riken.png',
  },
  tp: {
    slug: 'tp',
    dbName: 'TP',
    display: 'TP',
    country: 'Япония',
    tagline: 'Поршневые кольца TP — рабочая лошадка для капремонта',
    description:
      'TP — японский производитель поршневых колец. Хорошее соотношение цены и качества для массового сегмента: подходит для большинства повседневных капремонтов. Полная линейка ремонтных размеров для Toyota, Nissan, Mitsubishi.',
    categories: ['Поршневые кольца'],
    highlights: [
      'Японское производство',
      'Доступная цена при сохранении качества',
      'Линейка по самым популярным двигателям',
      'Все ремонтные размеры',
    ],
    logo: '/assets/parts-brands/tp.png',
  },
  nd: {
    slug: 'nd',
    dbName: 'ND',
    display: 'ND / Daido',
    country: 'Япония',
    founded: '1939',
    tagline: 'Daido Metal — мировой лидер в подшипниках скольжения',
    description:
      'Daido Metal (бренд ND) — японский производитель вкладышей коленвала с 1939 года. Поставщик OEM для Toyota, Honda, Nissan, а также Mercedes, BMW и других. Вкладыши Daido — индустриальный стандарт качества.',
    categories: ['Вкладыши коренные', 'Вкладыши шатунные', 'Упорные полукольца'],
    highlights: [
      'OEM-поставщик Toyota, Honda, Nissan',
      'Триметаллические и биметаллические вкладыши',
      'Все ремонтные размеры (STD, 0.25, 0.50, 0.75)',
      'Гарантия производителя',
    ],
    logo: '/assets/parts-brands/nd.png',
  },
  taiho: {
    slug: 'taiho',
    dbName: 'TAIHO',
    display: 'Taiho',
    country: 'Япония',
    founded: '1939',
    tagline: 'Taiho Kogyo — премиальные вкладыши коленвала',
    description:
      'Taiho Kogyo — японский производитель подшипников скольжения. OEM-поставщик Toyota Motor Corporation. Вкладыши Taiho используются на конвейере Toyota, Lexus, Daihatsu. Высокая нагрузочная способность и долговечность.',
    categories: ['Вкладыши коренные', 'Вкладыши шатунные'],
    highlights: [
      'OEM Toyota / Lexus',
      'Производство в Японии',
      'Триметаллические вкладыши',
      'Долговечность под высокой нагрузкой',
    ],
    logo: '/assets/parts-brands/taiho.png',
  },
  ndc: {
    slug: 'ndc',
    dbName: 'NDC',
    display: 'NDC',
    country: 'Япония',
    tagline: 'Вкладыши NDC для японских двигателей',
    description:
      'NDC — японский производитель вкладышей коленвала. Качественная альтернатива оригинальным вкладышам по более доступной цене. Полная линейка размеров для популярных двигателей Mitsubishi, Nissan, Toyota.',
    categories: ['Вкладыши коренные', 'Вкладыши шатунные'],
    highlights: [
      'Японское производство',
      'Подходит к Mitsubishi, Nissan',
      'Все ремонтные размеры',
      'Доступная цена',
    ],
    logo: '/assets/parts-brands/ndc.png',
  },
};

export const partsBrandSlugs = Object.keys(partsBrands);
