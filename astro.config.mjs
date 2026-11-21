import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://my-avto.kz',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
});
