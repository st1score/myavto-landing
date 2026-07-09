# MY AVTO — project state for Claude

> Точка входа для агента. Здесь зафиксирован РЕАЛЬНЫЙ фундамент проекта.
> Источник истины по коду — `web/` (Next.js). Если этот файл расходится с кодом —
> верь коду и **сразу чини этот файл**. Обновляй после каждого крупного изменения.
>
> ⚠️ **История:** проект мигрировал Astro → Next.js. Старые упоминания `site/`,
> Astro, GitHub Pages-через-Astro — устарели. Актуальное приложение в `web/`.

---

## Бизнес

**MY AVTO** — магазин запчастей для капремонта двигателей в Алматы (Казахстан).
Владелец — Семён. Один продавец (НЕ multi-vendor). Адрес: ТЦ CarCity, 3 ярус,
бутик 135В. Доставка по Казахстану. Заказы — WhatsApp `+7 701 550-93-77`.

Сайт **my-avto.kz** — SEO-витрина + лёгкий e-commerce под органику и Google Ads.
В будущем: раздел объявлений (колёса/разное), Kaspi-фид, Telegram-бот, микросервисы.

**Цель архитектуры:** сильный фундамент, который работает автоматически — товары
добавляются через админку, страницы под SEO создаются сами, без переделок и
пересозданий проекта.

---

## Стек (РЕАЛЬНЫЙ)

- **Next.js 16** (App Router) + **React 19** + **TypeScript** — каталог `web/`
- **`output: 'export'`** → статический экспорт в `web/out/` (SPA + пререндер страниц)
- **`trailingSlash: true`**, `images.unoptimized: true` (нужно для GH Pages)
- **Tailwind CSS 4** (`@tailwindcss/postcss`)
- **Supabase** — Postgres + Auth + Storage. Клиенты: `web/lib/supabase/{client,server}.ts`
- **GitHub Pages** через GitHub Actions (`.github/workflows/deploy.yml`), домен через `web/public/CNAME`
- **GA4** `G-YQ21411TM0` + **Google Ads** `AW-18062973221`
- `xlsx`, `jszip` — только экспорт Каспи-фида (импорт удалён)

Корневого `package.json` нет — всё в `web/`. Build: `cd web && npm run build` → `web/out/`.

⚠️ **Билд читает Supabase под anon-key** (`NEXT_PUBLIC_SUPABASE_*` secrets). Значит
RLS должен разрешать `anon` SELECT активных товаров. Если БД лежит — билд пустой.

---

## Деплой и авто-обновление (это и есть «работает само»)

`.github/workflows/deploy.yml`, job `build` (working-directory `web`) → `web/out` → Pages.

Триггеры rebuild:
- `push` в `main` по путям `web/**`
- `workflow_dispatch` — руками
- **`repository_dispatch: rebuild-catalog`** — мгновенный ребилд. Дёргается
  кнопкой «⟳ Опубликовать сайт» в админке через Edge Function
  `supabase/functions/rebuild-site` (секрет `GITHUB_PAT` в Supabase secrets).
  Fallback — cron ≤6 ч.
- `schedule: cron '0 */6 * * *'` — базовый ребилд каждые 6 ч

**Контракт:** добавил товар в админке → `status='active'` → дёрнулся `rebuild-catalog`
→ через ~2-3 мин страница `/p/<slug>/` в воздухе и в sitemap. Не ломать этот контракт.

---

## Модель данных (Supabase) — источник: `web/lib/types.ts`

Нормализованная коммерц-схема (НЕ плоская). Связи:

```
products ──< product_variants ──< listings   (мультиканал: OWN / Kaspi / ...)
   │                │
   │                ├──< stock        (warehouse_code, qty, reserved_qty)
   │                └─ (variant_attrs JSON: размер, insert и т.п.)
   └──< product_media >── media       (url, role primary/gallery, alt_text)
```

Справочники: `categories`, `brands`, `engines`, `catalog_tags`, `warehouses`, `channels`.
View `v_catalog` — денормализованная строка карточки (image_url, price_own, total_stock, …).

Ключевые поля `products`: `master_sku`, `title`, `category_code`, `brand_code`,
`oem_numbers[]`, `cross_numbers[]`, `compatible_engines[]` (text array — фитмент
денормализован, для одного продавца ок), `status` (draft/active/archived),
`seo_title/seo_desc/seo_keywords`, Kaspi-расширения (`kaspi_type`, `kaspi_vehicles[]`,
`weight_kg`, `youtube_id`, `manufacturer_part_number`).

`CATEGORY_LABEL` и `KASPI_TYPE_BY_CATEGORY` — справочные мапы в `types.ts`.

⚠️ **БД управляется владельцем вручную** (Supabase Studio). Источник истины по
схеме — `web/lib/types.ts`. Старые SQL-миграции удалены из репо (2026-07, есть в
git history); в `supabase/` остались только Edge Functions.

---

## Структура страниц (`web/app/`)

```
/                      app/page.tsx            — главная (контент из Supabase, редактируется)
/search/               app/search/page.tsx     — поиск
/p/                    app/p/page.tsx          — листинг каталога
/p/[slug]/             app/p/[slug]/page.tsx   — карточка товара (PDP), static-prerender
/sitemap.xml           app/sitemap.ts          — генерится из активных товаров
/login/                                        — Supabase auth
/dashboard/...         app/dashboard/*         — АДМИНКА (см. ниже)
```

PDP `dynamicParams = false` → существуют только пресобранные slug, прочее → 404.
Slug-логика: `web/lib/slug.ts` (`productSlug`). Данные PDP: `web/lib/productData.ts`
(`fetchFullProductBySlug`, мемоизация каталога на процесс билда).

### Админка (`web/app/dashboard/`)

`login` + `useIsOwner` (один владелец; **регистрация закрыта** — новые аккаунты
только руками в Supabase Studio). Страницы: `home` (редактор главной),
`listings` / `new` / `edit` (CRUD товаров), `export-kaspi` (фид), `reference`
(справочники). Кнопка «⟳ Опубликовать сайт» → Edge Function `rebuild-site` →
`repository_dispatch`. Всё пишет в Supabase.
xlsx-импорт удалён намеренно (2026-07) — товары добавляются только через кабинет.

---

## SEO-фундамент (уже заложен — не дублировать, расширять)

- **Отдельный URL на товар** `/p/<slug>/` со static-пререндером ✅
- `app/p/[slug]/page.tsx` `generateMetadata`: `title`, `description`, `keywords`,
  `alternates.canonical`, `openGraph` (+image) ✅
- **JSON-LD `Product` + `Offer`** на PDP: `sku`, `brand`, `image[]`, `availability`
  (`InStock`/`PreOrder` — намеренно НЕ `OutOfStock`), `priceCurrency: KZT`, `seller` ✅
- `app/sitemap.ts` — все активные товары + `lastModified` ✅
- `web/public/robots.txt` — `Allow: /` + Sitemap ✅
- `schema.org` понимают и Google, и Яндекс (важно для KZ) — одна разметка на оба.

### SEO-дыры — статус на 2026-07 (почти всё закрыто)

- [x] `metadataBase` в `app/layout.tsx` ✅
- [x] **`LocalBusiness` JSON-LD** сайтово — `web/lib/seo.ts` (`siteJsonLd`: Store/AutoPartsStore + WebSite + SearchAction) ✅
- [x] `BreadcrumbList` JSON-LD на PDP ✅
- [x] `Offer.priceValidUntil` (+1 год, катится вперёд при ребилдах) ✅
- [x] `itemCondition: NewCondition` ✅
- [x] Verify-мета Яндекс + Google (env-токены, layout.tsx) ✅
- [x] Merchant-фид `/feed.xml` (RSS 2.0 + g:) — `app/feed.xml/route.ts` ✅
- [ ] Гео-координаты в LocalBusiness (lat/lng CarCity — не выдумывать, взять точные)
- [ ] Merchant-фид: добавить `g:shipping` + return policy (сейчас Merchant даёт warnings)
- [ ] Сабмит feed.xml в Merchant Center + верификация (ручное, владелец)

### Правила SEO (не нарушать)

- **Один канонический URL на товар.** Фасеты/фильтры — в client state, НЕ плодить
  индексируемые thin-страницы под каждую комбинацию.
- **JSON-LD `Product` только на карточке товара**, не на категориях/листингах.
- Никаких фейковых `aggregateRating`/`review` — только реальные.
- Объявления (колёса/разное) с истечением: `unavailable_after` мета или `410`/`noindex`
  для протухших — не оставлять thin/битые страницы (жрут crawl budget).

---

## Google Ads (цель — конверсии, не просто трафик)

- Конверсия = реальное действие: клик «Купить на Kaspi», WhatsApp, форма. Отдельные
  URL товаров делают атрибуцию возможной (на одностраничнике её нет).
- Conversion tracking в Google Ads + связка с GA4 (`G-YQ21411TM0`).
- Performance Max / Shopping на Target ROAS: стартовый таргет в пределах 10-20% от
  текущего факта, не агрессивно — иначе алгоритм режет показы. Бенчмарк eCom ROAS ~2.87:1.
- Фид для Shopping/Merchant строить из той же payload, что PDP JSON-LD (SKU = `master_sku`).

---

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| `web/next.config.ts` | static export, trailingSlash, unoptimized images |
| `web/app/layout.tsx` | root layout + sitewide `<head>`/metadata |
| `web/app/p/[slug]/page.tsx` | PDP: static params + metadata + JSON-LD |
| `web/app/sitemap.ts` | генерация sitemap из активных товаров |
| `web/lib/types.ts` | **модель данных** (источник истины по схеме) |
| `web/lib/productData.ts` | загрузка товара из Supabase + мемоизация |
| `web/lib/slug.ts` | slug товара |
| `web/lib/pricing.ts` | расчёт цен/маржи |
| `web/lib/supabase/{client,server}.ts` | Supabase клиенты |
| `web/app/dashboard/*` | админка (CRUD, export-kaspi, reference) |
| `supabase/functions/rebuild-site` | Edge Function: кнопка «Опубликовать сайт» |
| `.github/workflows/deploy.yml` | CI: build `web/` → Pages, авто-rebuild |
| `web/public/{robots.txt,CNAME}` | robots + домен |

---

## База данных (Supabase)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # build + клиент
# service_role — только серверные операции, НИКОГДА не в клиент/в репо
```

Секреты — локально в `web/.env*` (в `.gitignore`) и в GitHub Actions secrets.

⚠️ Если ключ/строка подключения/service_role попали в чат, логи или git history —
немедленно ротировать в Supabase (Settings → API / Database), обновить `.env` и
GitHub secrets. Реальные ключи в репозитории не хранить.

---

## Что НЕ делать без спроса

- **Не пересоздавать проект и не менять стек.** Фундамент зафиксирован — расширять, не переписывать.
- Не коммитить, пока владелец не подтвердит. Не `git reset --hard` / force-push к `main`.
- Не ломать контракт авто-rebuild (`repository_dispatch: rebuild-catalog`).
- Не плодить индексируемые фасет-страницы (SEO-правила выше).
- Не вешать `OutOfStock` (используем `PreOrder`).
- Не править данные/схему в проде через миграции вслепую — БД у владельца; сверять с `web/lib/types.ts`.
- Не считать старые Astro-упоминания актуальными. Не возвращать xlsx-импорт.

---

## Состояние веток (на момент правки)

`main` — прод. Активная работа шла в `claude/fix-rollup-lock` (мерджи #33-38).
Висящие фичевые ветки на доработку/мердж: `claude/schema-price`, `claude/yandex-verify`,
`claude/tinacms`, `claude/stackbit-config`, `claude/animations-mobile`, `claude/mobile-flicker-fix`.
Проверять `git branch -a` перед работой — не плодить дубли.
