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
const prodazha = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/prodazha' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['shiny', 'diski', 'raznoe']),
    price: z.number(),
    condition: z.string().default('Б/у'),
    status: z.enum(['v-prodazhe', 'prodano']).default('v-prodazhe'),
    date: z.coerce.date(),
    photos: z.array(z.string()).default([]),
    specs: z.record(z.string(), z.string()).default({}),
  }),
});

export const collections = { marki, zapchasti, prodazha };
