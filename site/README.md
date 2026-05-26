# MY AVTO site

Astro-сайт для `my-avto.kz`: SEO-каталог запчастей для капитального ремонта двигателей, статическая генерация страниц и деплой в GitHub Pages.

## Запуск

```sh
npm ci
npm run dev
```

Для билда нужен `DATABASE_URL` в `site/.env` или `.env` на уровень выше:

```sh
DATABASE_URL=postgresql://...
npm run build
```

## Что важно

- `src/pages/` — главная, бренды, моторы, категории и SKU-страницы.
- `src/lib/db.ts` — чтение Supabase/PostgreSQL во время static build.
- `scripts/gen-search-index.mjs` — генерирует `public/search-index.json` перед билдом.
- `public/teikin-catalog/` — каталоговые изображения TEIKIN. Не удалять.
- `.github/workflows/deploy.yml` — деплой в GitHub Pages.

Реальные пароли, токены и доступы нельзя хранить в репозитории. Используй `.env`, GitHub Actions secrets или менеджер паролей.
