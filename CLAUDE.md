# MY AVTO — project state for Claude

> Этот файл — точка входа для агента. Здесь зафиксировано всё, что нужно знать,
> чтобы не переоткрывать заново. Обновляй после крупных изменений.

---

## Бизнес

**MY AVTO** — магазин запчастей для капремонта двигателей в Алматы (Казахстан).
Владелец — Семён (Semen). Адрес: ТЦ CarCity, 3 ярус, бутик 135В. Доставка по
Казахстану. Цены и заказы — через WhatsApp `+7 701 550-93-77`.

Сайт **my-avto.kz** — SEO-витрина для органического трафика. Конкурент: motorist.kz
(они ранжируются за счёт per-article товарных страниц — мы делаем аналогично).

---

## Стек

- **Astro 6.3.1** (static site generation, TypeScript)
- **PostgreSQL** на Supabase (раньше был Render, мигрировали)
- **GitHub Pages** через GitHub Actions (`.github/workflows/deploy.yml`)
- **GA4** (`G-YQ21411TM0`) + Google Ads (`AW-18062973221`) в [Base.astro](site/src/layouts/Base.astro)
- **pdftoppm + pdftotext** (poppler-utils) для парсинга TEIKIN PDF
- `pg` (node-postgres) для запросов к БД

Корневой `package.json` нет — всё внутри `site/`. Build: `cd site && npm run build`.

---

## База данных

**Supabase** (session pooler, port 5432):
```
DATABASE_URL=postgresql://<user>:<password>@<supabase-pooler-host>:5432/postgres
```

Пароль хранится только локально в `.env` (в `.gitignore`) и в GitHub Actions secret `DATABASE_URL`.

⚠️ Если пароль или строка подключения попали в чат, логи или git history, нужно сразу ротировать
пароль в Supabase (Settings → Database → Reset password), обновить `.env` и `DATABASE_URL`
в GitHub Actions secrets. Не хранить реальные пароли в репозитории.

### Таблицы

- `engines` — каталог моторов (312 active). Ключ `engine_code`.
- `part_categories` — `PISTON`, `RING` и т.п.
- `engine_part_numbers` — OEM/TEIKIN номера на (engine, category).
- `engine_part_attribute_values` — атрибуты (диаметр, толщина).
- `part_variants` + `part_variant_sizes` — варианты (brand × insert × size).
- `stock_items` — реальные остатки (qty, warehouse_code). 185 моторов имеют поршни в наличии.

---

## Master Database Stage A Applied

**Дата:** 2026-05-26. **Статус:** ✅ применено вручную в production Supabase. Seed `seed_1kz_master_example.sql` залит, все checks прошли. См. [supabase/README.md](supabase/README.md) и [supabase/migrations/20260526_stage_a_master_db_foundation.sql](supabase/migrations/20260526_stage_a_master_db_foundation.sql).

### Что добавлено (11 новых таблиц + общий триггер `tg_touch_updated_at()`)

Слой **vehicles** (применяемость двигателей к авто):
- `vehicle_makes` — марки (Toyota, Nissan…)
- `vehicle_models` — модель + generation + chassis_code (источник: otoba.ru)
- `engine_fitments` — `engine_code` ↔ `vehicle_models.id`, с `confidence` и `source_id`
- `vehicle_specs` — EAV-характеристики автомобиля (body_type, drive_type, power_hp, frame_code…)

Слой **provenance** (откуда что пришло):
- `data_sources` — каталоги/сайты/manual/AI/n8n (11 seed-источников)
- `data_source_runs` — лог запусков парсеров/импортов
- `data_source_links` — универсальная связь «источник → сущность» по `(entity_type, entity_key)`
- `audit_log` — таблица создана, **триггеры НЕ подключены**

Слой **aliases + crosses**:
- `engine_aliases` — `1KZ-TE`/`1KZTE`/`1 KZ` → `engine_code='1KZ'`
- `vehicle_model_aliases` — `J120`/`KZJ120`/`Prado 120` → model row
- `part_number_crosses` — OEM ↔ TEIKIN ↔ NPR ↔ KP ↔ Taiho ↔ ACL

### Зачем

Master database с одним правилом: **у каждого факта есть источник**. От этой базы будут работать сайт, Kaspi, Telegram-бот, Google Ads, n8n, AI-агенты — все читают одну БД через свои views/RPC.

- `engines` остаётся источником истины по моторам (не пересоздавать).
- **otoba.ru** — авторитетный источник по машинам, годам, кузовам, фитментам.
- Каталоги (TEIKIN/NPR/KP/Taiho/ACL) — источники по номерам и атрибутам запчастей.

### Текущий статус 1KZ (reference engine)

- 8 fitments в `engine_fitments` (Prado 90, Prado 120, Hiace, Hilux Surf, Granvia, Regius, Land Cruiser, Dyna/Toyoace) — все с `confidence = 0.70` и `notes = 'needs verification until otoba.ru parsed'`.
- 2 эффективных alias в `engine_aliases` (`1KZ` и `1KZTE` после нормализации; в seed было 4, два схлопнулись по `(engine_code, alias_norm)` — **штатно**).
- 4 alias для Prado 120 в `vehicle_model_aliases`.
- 1 provenance link в `data_source_links` (`entity_key = '1KZ:toyota:land-cruiser-prado:120'`).

Годы/кузова пока NULL — заполнятся после парсера otoba.ru.

### Что нельзя ломать

- **Не трогать существующие таблицы** (engines, brands, part_*, stock_items, warehouses, size_codes, attributes, category_attributes, engine_parts, engine_part_numbers, engine_part_attribute_values, part_variants, part_variant_sizes, v_piston_card). Сайт читает только их.
- **Не удалять и не переименовывать Stage A таблицы.** Все будущие миграции — additive-only.
- **Не добавлять GRANT/RLS на Stage A таблицы** до отдельного security-этапа — сейчас доступ только у owner/`postgres`. `anon` и `authenticated` намеренно без прав.
- **Не подключать audit triggers** на горячие таблицы (`stock_items`, `part_variant_sizes`) без замеров — могут просадить bulk-импорты.
- **Не выдумывать годы/совместимости** — все спорные данные с `confidence < 1.0` и `notes = 'needs verification'`. Источник истины по машинам — otoba.ru.
- **Канонические `entity_key`-форматы** для `data_source_links` зафиксированы в [supabase/README.md](supabase/README.md) (формат `<engine>:<make>:<model-slug>:<generation>` и т.п.) — не менять формат произвольно, иначе ломаются индексы и аналитика.

### Stage B1 prepared (not yet applied)

**Status:** локальные SQL-файлы готовы, в Supabase **ещё не залиты**. См. [supabase/README.md#stage-b1](supabase/README.md).

Файлы:
- [supabase/migrations/20260526_stage_b1_products.sql](supabase/migrations/20260526_stage_b1_products.sql)
- [supabase/seeds/seed_b1_1kz_products.sql](supabase/seeds/seed_b1_1kz_products.sql)
- [supabase/checks/stage_b1_verify.sql](supabase/checks/stage_b1_verify.sql)
- [supabase/rollbacks/20260526_stage_b1_products_rollback.sql](supabase/rollbacks/20260526_stage_b1_products_rollback.sql)

**Что добавит B1:**
- `sales_channels` — справочник каналов (website/kaspi/telegram/google_ads/n8n/retail/wholesale/promo).
- `products` — стабильный SKU-слой поверх `part_variant_sizes` с тем же natural key.
- 4 SQL-функции: `normalize_sku_part`, `size_code_to_sku`, `category_code_to_sku`, `generate_product_sku`.
- Триггеры: `BEFORE INSERT` авто-заполняет sku, `BEFORE UPDATE` запрещает менять sku (immutable contract), `BEFORE UPDATE` обновляет `updated_at`.
- Backfill seed для 1KZ PISTON из `part_variant_sizes`.

**Формат SKU:** `MYA-{ENGINE}-{CAT}-{BRAND}-{VARIANT}[-{INSERT}]-{SIZE}` — например `MYA-1KZ-PSTN-TEIKIN-46283-AG-050`. `INSERT` опускается при `insert_type='plain'`. После генерации sku **immutable** — триггер отклоняет UPDATE.

**Что B1 НЕ делает:**
- Не меняет `part_variant_sizes`. **Сайт продолжает читать старые таблицы**, не products.
- Не добавляет FK `products.engine_code → engines` (composite PK блокер).
- Не вставляет цены, медиа, контент — это B2/B3/B4.
- Не выдаёт GRANT/RLS, не меняет Astro-сборку.

### Следующие этапы — Stage B2…B6

**Status:** дизайн готов, SQL не написан. См. раздел "Future Stage B sub-stages" в [supabase/README.md](supabase/README.md).

Stage B добавит SKU/commerce-слой поверх существующего каталога:
- `products` — стабильный синтетический SKU (сайт продолжит читать `part_variant_sizes`; маркетплейсы — `products`).
- `prices` — multi-channel (retail/kaspi/wholesale/promo) с окнами действия.
- `media_assets` + `product_media` + `engine_media` — единый медиа-слой (вместо хардкода `/teikin-catalog/*.png`, с fallback в коде).
- `product_content` + `engine_content` — multi-locale, per-channel (Kaspi сможет переопределять копирайт без форка шаблонов).
- `marketplace_categories` + `marketplace_mappings` — куда выгружать SKU на Kaspi/Google Merchant.
- Export views: `v_kaspi_feed`, `v_google_merchant_feed`, `v_sitemap`, `v_telegram_search`.
- `export_jobs` — лог исходящих выгрузок (для n8n).

Stage B будет разбит на под-миграции B1…B6, каждая с отдельным seed/checks/rollback.

---

### Helpers в [site/src/lib/db.ts](site/src/lib/db.ts)

- `getEngines()`, `getCategories()`, `getEnginePartsIndex()`
- `getPartNumbers(engine, category)`, `getAttributes(...)`, `getVariantSizes(...)`, `getStock(...)`
- `getPistonProductsInStock()` — для генерации SKU-страниц
- Pool: max=4, keepAlive, retry на ETIMEDOUT/57P03/Connection terminated

---

## Структура страниц

```
/                                 — главная
/{brand}/                         — Toyota, Nissan и т.п.
/{brand}/dvigateli/{engine}/      — двигатель (1KZ, 2JZ, ...)
/{brand}/dvigateli/{engine}/porshni/             — листинг поршней этого мотора
/{brand}/dvigateli/{engine}/porshni/{product}/   — SKU (каждый бренд × размер × insert)
/{brand}/dvigateli/{engine}/koltsa-porshnevye/   — аналогично для колец
/zapchasti/porshni/                              — общий лендинг поршней
```

### Slug-правила (в [site/src/lib/slugs.ts](site/src/lib/slugs.ts))

- `engineSlug('1KZ')` → `'1kz'`, `'B6 16V'` → `'b6-16v'`, `'FE 8V / F8'` → `'fe-8v-f8'`
- `brandSlug['Toyota']` → `'toyota'`
- Product slug:
  - TEIKIN: `teikin-<article>-<size>` (где article — `teikin_pistons[0]`, например `46283`)
  - Прочие: `<parts-brand>-<size>` (`nd-050`, `izumi-std`)
  - С insert: вставляется суффикс: `nd-ag-050`, `teikin-46283-ag-050`
  - Size slug: `STD`→`std`, `0.25`→`025`, `0.50`→`050`, `0.75`→`075`, `1.00`→`100`

---

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| [site/src/pages/[brand]/dvigateli/[engine]/porshni/[product]/index.astro](site/src/pages/[brand]/dvigateli/[engine]/porshni/[product]/index.astro) | SKU product-page (редизайн в стиле nipponfz.com — синий акцент + красная CTA) |
| [site/src/pages/[brand]/dvigateli/[engine]/[category].astro](site/src/pages/[brand]/dvigateli/[engine]/[category].astro) | Листинг поршней/колец мотора. Чипы размеров с зелёным `●` → линк на SKU |
| [site/src/pages/[brand]/dvigateli/[engine]/index.astro](site/src/pages/[brand]/dvigateli/[engine]/index.astro) | Engine landing |
| [site/src/data/teikin-catalog.ts](site/src/data/teikin-catalog.ts) | Ручные TeikinEntry (только 1KZ заполнен полностью) + merge с auto-каталогом |
| [site/src/data/teikin-catalog-auto.ts](site/src/data/teikin-catalog-auto.ts) | **АВТО-СГЕНЕРИРОВАННЫЙ** скриптом — 176 моторов с image+specs+OEM |
| [site/src/lib/db.ts](site/src/lib/db.ts) | DB pool + helpers |
| [site/src/lib/slugs.ts](site/src/lib/slugs.ts) | URL слаги |
| [site/src/lib/labels.ts](site/src/lib/labels.ts) | Русские подписи (`Toyota`, `Стандарт`, и т.п.) |
| [site/src/layouts/Base.astro](site/src/layouts/Base.astro) | Layout + GA/Ads + tokens (--c-red #E50914 и т.п.) |
| [site/scripts/scrape-teikin.mjs](site/scripts/scrape-teikin.mjs) | Скрейпер teikin.com → PDF → PNG-кроп |
| [site/scripts/gen-teikin-catalog.mjs](site/scripts/gen-teikin-catalog.mjs) | Парсер PDF через pdftotext → `teikin-catalog-auto.ts` |
| [site/scripts/scrape-teikin-report.json](site/scripts/scrape-teikin-report.json) | Отчёт matched/unmatched/errors |
| [site/public/teikin-catalog/](site/public/teikin-catalog/) | 177 PNG-картинок (по одной на engine_code) |
| [site/public/assets/parts-brands/](site/public/assets/parts-brands/) | Лого брендов (Teikin/Izumi/ND/NM/Riken/...) |

---

## Скрейпер TEIKIN

Запускается раз в N недель/после изменения списка моторов:

```bash
cd site
TEIKIN_EMAIL='<email>' TEIKIN_PASSWORD='<password>' node scripts/scrape-teikin.mjs
node scripts/gen-teikin-catalog.mjs
```

Сейчас: **176 / 185** моторов с поршневым стоком получили картинку (95%).

### Логика матчинга (engine_code → TEIKIN engine_model)

1. **Token match**: токенизируем TEIKIN-кластер `"1KZ-TE, 1KZ"` → `["1KZ-TE", "1KZ"]`,
   нормализуем (strip `8V/16V/Dohs/NEW/OLD/II/III/...`), сравниваем с кандидатами
   из engine_code (тоже после strip + split по `/`).
2. **Prefix match** (fallback): база engine_code (до первого пробела/дефиса) +
   суффикс ≤5 символов → e.g. `1ZZ`→`1ZZFE`, `2JZ`→`2JZGE`/`2JZGTE`, `1MZ`→`1MZFE`.

### Что НЕ матчится (нужен ручной mapping)

7 моторов с дилерскими кодами:
- `Mazda RFT III`, `Mitsubishi 4D56TNew III`, `4G64K`, `64K II Аутл`,
  `6G72K 24V`, `6G72K 24V #3`, `D4BA`
- 2 ошибки: `Nissan YD22 II`, `Toyota 1ND` (TEIKIN отдал 404)

---

## PDF parser

Из каждого TEIKIN PDF через `pdftotext -layout` выдёргивается:
- `bore_mm` — паттерн `cc Ø XX.XX`
- `cc`, `cyl` — `(\d{3,5}) cc`, `(\d{1,2}) cyl`
- `fuel` — DIESEL/GASOLINE в первых строках
- `pin_diameter_mm` — `Ø NN.NNN` (3 знака)
- `oem_piston` — строки под первой `REFERENCE NO.` колонкой

CD/TL/MRC/MP/surface_treatment/ring sizes пока **только в ручной записи 1KZ**.
Можно расширить парсер на эти поля, если потребуется.

---

## Деплой

Push в main → GitHub Actions запускает `astro build` → деплоит в Pages → `my-avto.kz`.

Билд ~180-220с. Все 1549 страниц рендерятся при каждом релизе.

⚠️ Билд **зависит от Supabase** — если DB лежит, билд падает. Есть retry на
transient ошибки в [db.ts](site/src/lib/db.ts).

---

## Дизайн product-page

Редизайн вдохновлён [nipponfz.com](https://www.nipponfz.com/):
- Синий акцент `#0066cc` (`--ph-blue`), navy `#194681` (`--ph-navy`)
- Брендовый красный `#E50914` (`--c-red`) — только на главной CTA
- Белые карточки + лёгкие тени `0 6px 24px rgba(15,23,42,0.06)`
- Inter (body) + JetBrains Mono (артикулы/коды)

### Структура (5 блоков)

1. **Hero** (2 колонки на десктопе, sticky правый блок):
   - Слева: каталожная картинка TEIKIN
   - Справа: бренд-пилл + статус ● в наличии + `Поршень №46283` + facts 2×2 (диаметр / размер / двигатель / топливо) + CTA
2. **Варианты** — 3 колонки: модификации (A/G/AG) + другие размеры + аналоги других брендов
3. **Бренды поршней** — 4-card горизонтальная полоса с лого Teikin/Izumi/ND/NM
4. **Details** (накопительные `<details>`): реальные фото, OEM, совместимые авто, FAQ
5. **Final CTA** — навигационный градиент-блок

### Терминология (по официальному каталогу TEIKIN VOL_26)

- `A` = **ALFIN reinforcement** (никель-чугунная вставка вокруг канавки 1-го кольца)
- `G` = **Oil cooling gallery** (масляная галерея в днище)
- `AG` = ALFIN + Gallery
- `HK` = Half keystone (на кольце), `FK` = Full keystone
- Surface: Tin Coated / Moly Skirt / Anodized Crown / 1st Ring Anodized / Chromated

---

## Бренды поршней

Из БД встречаются: TEIKIN, IZUMI, ND, NM, RIKEN, KA, OEM, NPR, TP, ART, MOTREX,
FGM, GRM, RW, KOREA, KITAI, MIXED, NIPPON_SAITAMA.

В alt-chips на product-page **показываем только**: ND, IZUMI, NM, OEM, TEIKIN, KA
(`ALT_BRAND_WHITELIST` в `[product]/index.astro`). RIKEN намеренно скрыт — мало позиций.

В компактной полосе с лого: **Teikin, Izumi, ND, NM** (компактное узнавание).

---

## Размеры для дизелей

В чипах на product-page фильтруем: `engine.is_diesel === true` → показываем только
`STD` и `0.50` (другие на дизелях в продаже не встречаются). Бензин — все 5 размеров.

---

## Последние PR (хронологически)

| PR | Описание |
|----|----------|
| #6-10 | Старые: per-SKU страницы, GA4, sendBeacon |
| #11 | Compact piston page + remove rings/liner from kit |
| #12 | Refine с фактами по размерам и фото |
| #13 | Migration to Supabase + новая 1KZ-картинка с teikin.com |
| #14 | Hide pin numbers + limit diesel sizes + brand logos |
| #15 | Redesign nipponfz vibe (clean above-the-fold + accordions) |
| #16 | **Bulk**: 176 TEIKIN catalog images + auto-data |
| #17 | Make piston listing link to per-SKU pages (✅ навигация работает) |

Все merged в `main`, задеплоено.

---

## TODO / Известное

- [ ] Ротировать Supabase/TEIKIN доступы, если они попадали в чат, логи или git history
- [ ] Расширить PDF-парсер: CD, TL, MRC, MP, surface, ring sizes — сейчас только 1KZ ручной
- [ ] Подтянуть совместимые модели авто (`models`) — TEIKIN их не публикует, надо отдельный источник или вручную
- [ ] Доработать unmatched 7 моторов — добавить ручные mapping/handwritten entries
- [ ] Аналогичная витрина для **колец** и **вкладышей** (сейчас только поршни)
- [ ] Submit sitemap в Google Search Console для индексации новых SKU-страниц
- [ ] Sticky-мобильная CTA (есть `StickyMobileCTA.astro` — проверить что работает на SKU)

---

## Что НЕ делать без спроса

- Не коммитить пока пользователь не подтвердит
- Не делать `git reset --hard` / force-push к main
- Не править данные в БД через миграции — БД управляется владельцем отдельно
- Не менять `--c-red` глобально (брендовый цвет MY AVTO)
- Не пересоздавать `teikin-catalog-auto.ts` руками — он AUTO-GEN
