# MY AVTO — my-avto.kz

Сайт-визитка магазина запчастей на японские авто (Алматы, ТЦ CarCity).
Главное действие — переход в WhatsApp. Без базы данных, корзины и оплаты.

## Где что менять

| Что | Файл |
| --- | --- |
| Телефон, WhatsApp, адрес, график, ссылки, ID счётчиков | `src/data/site.ts` |
| Марки, группы запчастей, бренды на главной | `src/data/site.ts` |
| Тексты страниц марок (`/toyota/` …) | `src/content/marki/*.md` |
| Тексты страниц групп (`/zapchasti/tormoza/` …) | `src/content/zapchasti/*.md` |
| Объявления «Продаю своё» | `src/content/prodazha/*.md` — см. `docs/OBYAVLENIYA.md` |
| Главная | `src/pages/index.astro` |
| Цвета и стили | `src/styles/global.css` |

Новая страница марки или группы = новый `.md` файл в нужной папке + `page: true` у неё в `src/data/site.ts`.

## Запуск

```sh
npm ci
npm run dev      # http://localhost:4321
npm run build    # → dist/ (+ заглушки старых адресов)
```

Деплой: push в `main` → GitHub Actions → GitHub Pages (домен из `public/CNAME`).
Старая версия (Next.js + Supabase) — тег `legacy-nextjs`.
