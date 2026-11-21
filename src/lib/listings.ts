import { getCollection, type CollectionEntry } from 'astro:content';

export type Listing = CollectionEntry<'prodazha'>;
export const TYPE_LABEL = { shiny: 'Шины', diski: 'Диски', raznoe: 'Разное' } as const;
const DAY = 86400000;

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
export const formatPrice = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';
