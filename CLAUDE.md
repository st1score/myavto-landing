# MY AVTO — состояние проекта для Claude

Если этот файл расходится с кодом — верь коду и почини файл.

## Что это
Мобильный сайт-визитка (≈95% посетителей с телефона) для MY AVTO: подбор запчастей
на японские авто по VIN. Главное действие — WhatsApp `+7 777 780 77 87`.
Нет БД, корзины, оплат, форм с отправкой на сервер. ТЗ — Claude Docs «ТЗ: сайт MY AVTO».

## Стек
- Astro 7, статический сайт, `trailingSlash: 'always'`, `build.format: 'directory'`.
- Контент — content collections (`src/content.config.ts`): `marki`, `zapchasti`, `prodazha`.
- Стили — один `src/styles/global.css`, колонка max 520px (десктоп = та же колонка).
- Шрифт Manrope (fontsource, self-hosted).
- Деплой: `.github/workflows/pages.yml` → GitHub Pages, ежедневная пересборка.
- `scripts/redirects.mjs` после сборки делает HTML-заглушки (canonical + meta refresh)
  для старых URL из `scripts/old-urls.txt`.

## Правила
- Все контакты и ID — только в `src/data/site.ts`.
- Ссылки WhatsApp строятся через `waLink(waText(path))` — в тексте всегда «— с сайта my-avto.kz<путь>».
- События аналитики: `whatsapp_click`, `form_whatsapp`, `phone_click`, `map_click`, `listing_whatsapp`
  (GA4 + цели Метрики; конверсия Ads — когда заполнен `adsWaLabel`).
- Product JSON-LD только на объявлениях. Никаких выдуманных отзывов/рейтингов.
- Проданные объявления: noindex, вне sitemap, удаляются из сборки через 30 дней.
- Не добавлять на сайт картинки из чужих каталогов.

## TODO
- Прямая ссылка Kaspi.
- Страницы остальных марок/групп — по данным Search Console.
- Казахская версия — позже.
