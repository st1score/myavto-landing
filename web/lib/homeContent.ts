import { supabaseBrowser } from '@/lib/supabase/client';

/* ---- Home page content model (drag-drop constructor) ----
   The home page renders an ordered list of blocks. Each block has a type, a
   visible flag and a typed props bag. Stored as one JSONB row in site_content
   (key='home'). Falls back to DEFAULT_HOME when the table/row is absent. */

export type HeroProps = {
  eyebrow: string;
  titlePre: string; titleEm: string; titlePost: string;
  brands: string[];
  searchPlaceholder: string;
  hints: string[];
  trust: string[];
};
export type HeadProps = { eyebrow: string; title: string };
export type BannerProps = {
  imageUrl: string; eyebrow: string; title: string; text: string;
  ctaLabel: string; ctaHref: string;
};

export type BlockType = 'hero' | 'arrivals' | 'categories' | 'makes' | 'parts' | 'banner';

export type Block =
  | { id: string; type: 'hero'; visible: boolean; props: HeroProps }
  | { id: string; type: 'arrivals' | 'categories' | 'makes' | 'parts'; visible: boolean; props: HeadProps }
  | { id: string; type: 'banner'; visible: boolean; props: BannerProps };

export type HomeDoc = { blocks: Block[] };

export const BLOCK_LABEL: Record<BlockType, string> = {
  hero: 'Главный экран (Hero)',
  arrivals: 'Новые поступления',
  categories: 'Категории',
  makes: 'Карусель марок',
  parts: 'Карусель брендов',
  banner: 'Баннер',
};

export const DEFAULT_HERO: HeroProps = {
  eyebrow: 'Капитальный ремонт двигателя · Алматы',
  titlePre: 'Запчасти для капремонта ',
  titleEm: 'японских двигателей',
  titlePost: '',
  brands: ['Toyota', 'Nissan', 'Honda', 'Mazda', 'Mitsubishi', 'Subaru', 'Suzuki'],
  searchPlaceholder: 'Артикул, двигатель или запчасть — напр. 1KZ-TE',
  hints: ['1KZ-TE', '2JZ-GE', '4D56', 'TD27', 'поршневая группа'],
  trust: ['В наличии на складе в Алматы', 'Отправка по всему Казахстану', 'Подбор по двигателю и авто'],
};

export const DEFAULT_HOME: HomeDoc = {
  blocks: [
    { id: 'hero', type: 'hero', visible: true, props: DEFAULT_HERO },
    { id: 'arrivals', type: 'arrivals', visible: true, props: { eyebrow: 'Свежий завоз', title: 'Новые поступления' } },
    { id: 'categories', type: 'categories', visible: true, props: { eyebrow: 'Категории', title: 'Что мы поставляем' } },
    { id: 'makes', type: 'makes', visible: true, props: { eyebrow: 'Подбор по марке', title: 'Запчасти для японских и корейских марок' } },
    { id: 'parts', type: 'parts', visible: true, props: { eyebrow: 'Только оригинал', title: 'Бренды запчастей, с которыми работаем' } },
  ],
};

export function blockDefaultProps(type: BlockType): Block['props'] {
  if (type === 'hero') return { ...DEFAULT_HERO };
  if (type === 'banner') return { imageUrl: '', eyebrow: '', title: 'Новый баннер', text: '', ctaLabel: 'Подробнее', ctaHref: '/search' };
  return { eyebrow: '', title: BLOCK_LABEL[type] };
}

export async function loadHomeDoc(): Promise<HomeDoc> {
  try {
    const { data } = await supabaseBrowser()
      .from('site_content').select('doc').eq('key', 'home').maybeSingle();
    const doc = (data as { doc?: HomeDoc } | null)?.doc;
    if (doc && Array.isArray(doc.blocks) && doc.blocks.length > 0) return doc;
  } catch { /* table missing → fall through to default */ }
  return DEFAULT_HOME;
}

export async function saveHomeDoc(doc: HomeDoc): Promise<{ error: string | null }> {
  const s = supabaseBrowser();
  const { data: u } = await s.auth.getUser();
  if (!u.user) return { error: 'Не авторизован' };
  const { error } = await s.from('site_content')
    .upsert({ key: 'home', doc, updated_by: u.user.id }, { onConflict: 'key' });
  return { error: error?.message ?? null };
}

export async function uploadHomeImage(file: File): Promise<{ url: string | null; error: string | null }> {
  const s = supabaseBrowser();
  const { data: u } = await s.auth.getUser();
  if (!u.user) return { url: null, error: 'Не авторизован' };
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `home/${u.user.id}/${Date.now()}.${ext}`;
  const up = await s.storage.from('product-images').upload(path, file, { contentType: file.type });
  if (up.error) return { url: null, error: up.error.message };
  const { data: pub } = s.storage.from('product-images').getPublicUrl(path);
  return { url: pub.publicUrl, error: null };
}
