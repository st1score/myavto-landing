// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://my-avto.kz',
  trailingSlash: 'always',

  build: {
    format: 'directory',
  },

  integrations: [sitemap(), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});