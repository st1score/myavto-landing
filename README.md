# MY AVTO — my-avto.kz

Магазин запчастей для капремонта двигателей (Алматы). SEO-витрина + кабинет
продавца. Один проект, один владелец.

## Структура

```
web/                 — сайт (Next.js 16, static export) + кабинет /dashboard
supabase/functions/  — Edge Functions (rebuild-site: кнопка «Опубликовать сайт»)
docs/                — playbook, SEO-индексация, onboarding
.github/workflows/   — деплой на GitHub Pages (домен my-avto.kz)
CLAUDE.md            — техническое состояние проекта (источник истины для агента)
```

## Запуск локально

```sh
cd web
npm ci
npm run dev        # http://localhost:3000
```

Нужен `web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Как обновляется прод

Товар добавляется в кабинете (`/dashboard`) → статус «Опубликован» → кнопка
«⟳ Опубликовать сайт» (или cron каждые 6 ч) → GitHub Actions пересобирает
`web/` → GitHub Pages. Страница товара и sitemap появляются автоматически.
