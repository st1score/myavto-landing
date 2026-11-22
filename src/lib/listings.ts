import { getCollection, type CollectionEntry } from 'astro:content';

export type Listing = CollectionEntry<'prodazha'>;
type D = Listing['data'];
export const TYPE_LABEL = { shiny: 'Шины', diski: 'Диски', kolesa: 'Колёса в сборе', raznoe: 'Разное' } as const;
const SEASON: Record<string, { adj: string; name: string }> = {
  zima: { adj: 'Зимние', name: 'Зима' },
  leto: { adj: 'Летние', name: 'Лето' },
  vsesezon: { adj: 'Всесезонные', name: 'Всесезонные' },
};
const DISK: Record<string, string> = { litye: 'Литые', shtamp: 'Штампованные', kovanye: 'Кованые' };
const DAY = 86400000;

const size = (d: D) => (d.width && d.profile ? `${d.width}/${d.profile}` : '') + (d.diameter ? ` R${d.diameter.replace(/^R/i, '')}` : '');
const pcd = (d: D) => (d.pcd ? d.pcd.replace(/[xх*]/gi, '×') : '');

// Заголовок: если не заполнен в админке — собираем как на Kolesa.kz
export function titleOf(d: D): string {
  if (d.title) return d.title;
  const qty = d.qty ? `, ${d.qty} шт` : '';
  const bm = [d.brand, d.model].filter(Boolean).join(' ');
  const s = d.season ? SEASON[d.season] : undefined;
  if (d.type === 'shiny') return [s ? `${s.adj} шины` : 'Шины', bm, size(d).trim()].filter(Boolean).join(' ') + qty;
  if (d.type === 'diski')
    return [d.diskType ? `${DISK[d.diskType] ?? d.diskType} диски` : 'Диски', bm, d.diameter ? `R${d.diameter.replace(/^R/i, '')}` : '', pcd(d)].filter(Boolean).join(' ') + qty;
  if (d.type === 'kolesa')
    return ['Колёса в сборе', bm, size(d).trim(), s ? s.adj.toLowerCase() : ''].filter(Boolean).join(' ') + qty;
  return 'Объявление';
}

// Характеристики для таблицы на странице объявления
export function specsOf(d: D): [string, string][] {
  const s = d.season ? SEASON[d.season] : undefined;
  const rows: [string, string | undefined][] = [
    ['Размер', size(d).trim() || undefined],
    ['Сезон', s ? s.name + (d.season === 'zima' && d.studs !== undefined ? (d.studs ? ', шипы' : ', липучка') : '') : undefined],
    ['Производитель', d.brand],
    ['Модель', d.model],
    ['Год выпуска', d.year],
    ['Остаток протектора', d.tread],
    ['Тип дисков', d.diskType ? DISK[d.diskType] ?? d.diskType : undefined],
    ['Ширина диска', d.rimWidth ? `${d.rimWidth.replace(/j$/i, '')}J` : undefined],
    ['Сверловка (PCD)', pcd(d) || undefined],
    ['Вылет (ET)', d.et],
    ['Ступица (DIA)', d.dia],
    ['Количество', d.qty ? `${d.qty} шт` : undefined],
    ['Подходит / с машины', d.car],
    ['Состояние', d.condition],
  ];
  return [...rows.filter((r): r is [string, string] => !!r[1]), ...Object.entries(d.specs)];
}

// Проданные показываем ещё 30 дней (с плашкой и noindex), потом страница исчезает.
export async function getListings() {
  const all = await getCollection('prodazha');
  const now = Date.now();
  return all
    .filter((l) => l.data.status === 'v-prodazhe' || now - l.data.date.getTime() < 30 * DAY)
    .sort((a, b) => {
      if (a.data.status !== b.data.status) return a.data.status === 'v-prodazhe' ? -1 : 1;
      return b.data.date.getTime() - a.data.date.getTime();
    });
}
export const formatPrice = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ').replace(/ /g, ' ') + ' ₸';
