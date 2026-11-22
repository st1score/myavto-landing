import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const faq = z.array(z.object({ q: z.string(), a: z.string() })).default([]);

// Страницы марок: src/content/marki/<slug>.md → /<slug>/
const marki = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/marki' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    lead: z.string(),
    models: z.array(z.coerce.string()),
    engines: z.array(z.coerce.string()).default([]),
    cats: z.array(z.string()).default([]),
    faq,
  }),
});

// Страницы групп: src/content/zapchasti/<slug>.md → /zapchasti/<slug>/
const zapchasti = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/zapchasti' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    lead: z.string(),
    items: z.array(z.coerce.string()),
    waPart: z.string(),
    faq,
  }),
});

// Объявления «Продаю своё»: src/content/prodazha/<slug>.md → /prodazha/<slug>/
// Заполняются через админку /admin/ (Sveltia CMS) или вручную. Пустые поля из админки
// приходят как "" или null — превращаем их в undefined.
const empty = (v: unknown) => (v === '' || v === null ? undefined : v);
const optStr = z.preprocess(empty, z.union([z.string(), z.number()]).transform(String).optional());
const optNum = z.preprocess(empty, z.coerce.number().optional());

const prodazha = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/prodazha' }),
  schema: z.object({
    title: optStr, // если пусто — соберём из полей
    type: z.enum(['shiny', 'diski', 'kolesa', 'raznoe']),
    price: z.coerce.number(),
    torg: z.preprocess(empty, z.boolean().default(false)),
    condition: z.preprocess(empty, z.string().default('Б/у')),
    status: z.preprocess(empty, z.enum(['v-prodazhe', 'prodano']).default('v-prodazhe')),
    date: z.coerce.date(),
    photos: z.preprocess((v) => (Array.isArray(v) ? v.filter(Boolean) : v ?? []), z.array(z.string()).default([])),
    qty: optNum,
    // Шины
    season: optStr,
    studs: z.preprocess(empty, z.boolean().optional()),
    width: optStr,
    profile: optStr,
    diameter: optStr,
    brand: optStr,
    model: optStr,
    year: optStr,
    tread: optStr,
    // Диски
    diskType: optStr,
    rimWidth: optStr,
    pcd: optStr,
    et: optStr,
    dia: optStr,
    // Общее
    car: optStr,
    specs: z.preprocess(empty, z.record(z.string(), z.string()).default({})),
  }),
});

export const collections = { marki, zapchasti, prodazha };
