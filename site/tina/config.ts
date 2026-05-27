import { defineConfig } from 'tinacms';

// TinaCMS config: схема контента, который редактируется в админке.
// Контент в site/content/pages/*.json — каждое сохранение = git commit.
// Локально: `npm run dev` (TinaCMS + Astro вместе) → http://localhost:4321/admin/index.html
// В прод: нужны NEXT_PUBLIC_TINA_CLIENT_ID и TINA_TOKEN из app.tina.io

const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main';

export default defineConfig({
  branch,

  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'uploads',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'home',
        label: 'Главная страница',
        path: 'content/pages',
        match: { include: 'home' },
        format: 'json',
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          {
            type: 'string',
            name: 'heroKicker',
            label: 'Hero — kicker (мелким сверху)',
          },
          {
            type: 'string',
            name: 'heroTitle',
            label: 'Hero — заголовок (H1)',
            required: true,
          },
          {
            type: 'string',
            name: 'heroSubtitle',
            label: 'Hero — подзаголовок',
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'heroCtaPrimary',
            label: 'Hero — кнопка 1 (текст)',
          },
          {
            type: 'string',
            name: 'heroCtaPrimaryUrl',
            label: 'Hero — кнопка 1 (ссылка)',
          },
          {
            type: 'string',
            name: 'heroCtaWa',
            label: 'Hero — кнопка WhatsApp (текст)',
          },
          {
            type: 'string',
            name: 'heroCtaWaText',
            label: 'Hero — текст для WhatsApp',
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'helpKicker',
            label: 'Help-карточка — kicker',
          },
          {
            type: 'string',
            name: 'helpTitle',
            label: 'Help-карточка — заголовок',
          },
          {
            type: 'string',
            name: 'helpText',
            label: 'Help-карточка — текст',
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'helpCta',
            label: 'Help-карточка — кнопка',
          },
          {
            type: 'string',
            name: 'helpCtaWaText',
            label: 'Help-карточка — WhatsApp текст',
            ui: { component: 'textarea' },
          },
        ],
      },
    ],
  },
});
