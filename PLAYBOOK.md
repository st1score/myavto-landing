# MY AVTO — операционный playbook

> Полный handoff для Claude. Здесь всё что мы делали по сайту, SEO, индексации
> и рекламе. Прочитай это вместе с [CLAUDE.md](CLAUDE.md) — там тех. состояние,
> здесь — процессы и правила.

---

## 1. Бизнес (краткое напоминание)

- **Магазин:** MY AVTO, Алматы, ТЦ CarCity бутик 135В
- **Владелец:** Семён (sementrachuk@gmail.com)
- **Что продаём:** поршни, кольца, вкладыши, гильзы — для капремонта японских моторов
- **Каналы продаж:** WhatsApp `+7 701 550-93-77`, OLX, my-avto.kz
- **Конкуренты:** motorist.kz, autotrade.kz, nipponfz.com
- **Цены публично НЕТ** — все цены через WhatsApp. На сайте указано только "от 15 000 ₸"
  для поршней (для Google rich-результата)

---

## 2. Стек и инфраструктура

| Компонент | Где живёт |
|---|---|
| Код | https://github.com/st1score/myavto-landing |
| Хостинг | GitHub Pages → my-avto.kz |
| Деплой | GitHub Actions (`.github/workflows/deploy.yml`), ~3-5 мин |
| База | Supabase PostgreSQL (session pooler) |
| Аналитика | GA4 `G-YQ21411TM0`, Google Ads `AW-18062973221` |
| Поисковики | Google Search Console + Яндекс.Вебмастер |
| Реклама | Google Ads (доступы хранить вне репозитория) |

**Email верификации Google/Yandex:** `sementrachuk@gmail.com`

---

## 3. SEO правила (важно соблюдать)

### Schema.org JSON-LD

**ЗАПРЕЩЕНО:** `Offer` или `AggregateOffer` без поля `price` / `lowPrice`.
Это критическая ошибка в GSC, схема игнорируется целиком.

**Правильно для поршней (категория и SKU):**
```js
offers: {
  '@type': 'AggregateOffer',
  priceCurrency: 'KZT',
  lowPrice: '15000',
  availability: 'https://schema.org/InStock',
  seller: { '@type': 'AutoPartsStore', name: 'MY AVTO' },
  url: '...',
}
```

**Для колец и вкладышей** — `offers` пока не добавляли (цены непредсказуемы).
Если будем добавлять — нужна реальная `lowPrice`.

### Видимая цена должна совпадать со schema

Если в JSON-LD `lowPrice: 15000`, на странице **обязательно** должна быть надпись
"от 15 000 ₸" видимо для пользователя. Иначе Google подавит rich result.

Где сейчас плашка с ценой:
- [site/src/pages/[brand]/dvigateli/[engine]/[category].astro](site/src/pages/[brand]/dvigateli/[engine]/[category].astro) — `.hv2-price` в hero, только если `categoryCode === 'PISTON'`
- [site/src/pages/[brand]/dvigateli/[engine]/porshni/[product]/index.astro](site/src/pages/[brand]/dvigateli/[engine]/porshni/[product]/index.astro) — `.ph-price` над CTA

### Что НЕ обещать на сайте

- ❌ "Прямые поставки из Японии" — мы перекупаем у дистрибьюторов
- ❌ Цены конкретных позиций — только в WhatsApp
- ❌ Гарантии сроков доставки точнее "1-3 дня по РК"
- ❌ Несуществующий email типа `info@my-avto.kz`

### Что обязательно на каждой посадочной

1. `<h1>` с ключевым словом + "Алматы"
2. Длинный SEO-текст (минимум 2 абзаца, longIntroPara + longSecondPara)
3. FAQ блок (8 вопросов на категорийной странице) + FAQPage JSON-LD
4. Breadcrumbs + BreadcrumbList JSON-LD
5. LocalBusiness/AutoPartsStore в layout (уже в [Base.astro](site/src/layouts/Base.astro))
6. CTA в WhatsApp с контекстным префиллом (`whatsappWithText` из [contacts.ts](site/src/lib/contacts.ts))

---

## 4. Индексация — что делать в Google Search Console

### Первичная настройка (уже сделана)

- [x] Сайт верифицирован под `sementrachuk@gmail.com`
- [x] Sitemap отправлен: `https://my-avto.kz/sitemap-index.xml`
- [x] `robots.txt` ссылается на sitemap
- [x] Astro `@astrojs/sitemap` интеграция в [astro.config.mjs](site/astro.config.mjs)
- [x] Schema fix (PR #20) — `AggregateOffer` с `lowPrice: 15000`

### Ручное индексирование (когда нужно)

GSC → **Проверка URL** (верхняя строка) → вводишь URL → ждёшь проверки →
**"Запросить индексирование"**.

**Лимит:** ~10 запросов в сутки на один аккаунт. Используй для приоритетных
страниц после изменений.

**Приоритетные URL для индексирования** (топ-двигатели в Казахстане):

Toyota:
```
https://my-avto.kz/toyota/dvigateli/1kz/porshni/
https://my-avto.kz/toyota/dvigateli/2jz/porshni/
https://my-avto.kz/toyota/dvigateli/1mz/porshni/
https://my-avto.kz/toyota/dvigateli/2az/porshni/
https://my-avto.kz/toyota/dvigateli/1zz/porshni/
https://my-avto.kz/toyota/dvigateli/2uz/porshni/
https://my-avto.kz/toyota/dvigateli/1gr/porshni/
https://my-avto.kz/toyota/dvigateli/2gr/porshni/
```

Mitsubishi:
```
https://my-avto.kz/mitsubishi/dvigateli/4g63-i/porshni/
https://my-avto.kz/mitsubishi/dvigateli/4d56/porshni/
https://my-avto.kz/mitsubishi/dvigateli/4m40/porshni/
https://my-avto.kz/mitsubishi/dvigateli/4b11-10/porshni/
https://my-avto.kz/mitsubishi/dvigateli/6g72-12v/porshni/
https://my-avto.kz/mitsubishi/dvigateli/6g72k-24v/porshni/
```

Nissan:
```
https://my-avto.kz/nissan/dvigateli/vq35/porshni/
https://my-avto.kz/nissan/dvigateli/vq40/porshni/
https://my-avto.kz/nissan/dvigateli/qr25-i/porshni/
https://my-avto.kz/nissan/dvigateli/qr20/porshni/
```

Mazda:
```
https://my-avto.kz/mazda/dvigateli/l3/porshni/
https://my-avto.kz/mazda/dvigateli/wl/porshni/
```

Общие:
```
https://my-avto.kz/
https://my-avto.kz/zapchasti/porshni/
https://my-avto.kz/zapchasti/vkladyshi/
https://my-avto.kz/toyota/
https://my-avto.kz/nissan/
https://my-avto.kz/mitsubishi/
https://my-avto.kz/mazda/
```

### Чего ожидать по срокам

| Через | Что должно быть |
|---|---|
| 1-2 дня | sitemap-0.xml → "Успешно", 1549 URL |
| 2-4 дня | Проиндексировано вырастет с единиц до 10-50 |
| 1-2 недели | Появятся первые показы в **Эффективность** |
| 3-4 недели | Проиндексировано 500+ из 1549 |

Часть URL осядут в "Просканировано, но не проиндексировано" — это нормально,
особенно для SKU-страниц с похожей структурой.

---

## 5. Яндекс.Вебмастер

### Настройка (PR #21)

- [x] HTML-файл `site/public/yandex_daa2b9be5f7af7bb.html` — для верификации
- [ ] После merge PR #21 — в Вебмастере нажать "Подтвердить"
- [ ] Добавить sitemap: `https://my-avto.kz/sitemap-index.xml`

В Казахстане доля Яндекса ~30-40% — не игнорировать.

### Полезные инструменты Вебмастера

- **Индексирование → Переобход страниц** — аналог "Запросить индексирование" в Google
- **Поисковые запросы** — по чему находят (после накопления данных)
- **Эффективность** — позиции, клики, показы

---

## 6. Google Ads — правила работы

### Текущее состояние (на момент 21.05.2026)

- Кампания на **Поиск**, тип **Максимум кликов**
- Бюджет ~8 $/день
- За 30 дней: 170 показов, 2 клика, 0 конверсий
- **CTR 1.2% — низкий**, надо чистить минус-словами

### Что НЕЛЬЗЯ делать

1. ❌ **Не переключать на "Максимум конверсий"** пока в кабинете 0 конверсий.
   Минимум для алгоритма — 15-30 конверсий/мес. Иначе сольёт бюджет.
2. ❌ **Не искать свою рекламу руками в google.com** — портит CTR.
   Используй **Инструменты → Предпросмотр и диагностика объявлений**.
3. ❌ Не повышать ставки без анализа Search Terms Report.

### Что НУЖНО делать

#### Срочно — настроить отслеживание конверсий

В GA4 (`G-YQ21411TM0`) создать events:
- `whatsapp_click` — клики по WhatsApp-кнопкам (везде где есть `wa.me`)
- `phone_click` — клики по `tel:+77015509377`
- `search_used` — использование `/poisk/`

Импортировать в Google Ads как **Conversions**.

В коде уже подготовлено: GA gtag.js подключён в [Base.astro](site/src/layouts/Base.astro).
Нужно добавить `gtag('event', 'whatsapp_click', {...})` в обработчики кликов.

#### Параллельно — оптимизация текущей кампании

1. **Search Terms Report** — Google Ads → Кампания → Поисковые запросы →
   найти нерелевантные → **Добавить как минус-слово**.
   Примеры минус-слов для нас:
   - `бесплатно`, `своими руками`, `схема`, `видео`, `инструкция`
   - `авито`, `drom`, `drive2`
   - модели машин которых у нас нет (ВАЗ, Лада, Hyundai полно — у нас только Япония)
2. **Max CPC bid** — поставить лимит $0.20-0.30, чтобы не сливать на дорогие клики
3. **Geo-таргетинг** — только Казахстан (или только Алматы + крупные города)
4. **Расписание** — отключить ночные часы (00:00-08:00), там низкая конверсия

#### Когда наберётся 20+ конверсий/мес

Переключаться на **"Максимум конверсий"** или **"Целевая цена за конверсию"**.

---

## 7. OLX — как использовать

Объявления на OLX уже индексируются Google автоматически. Что улучшить:

1. **Заголовок под поисковый запрос:** "Поршни Toyota 1KZ TEIKIN STD/0.50 Алматы"
2. **Описание с ключевиками в первых строках** — перечислить коды двигателей и бренды
3. **Точная геопривязка** — Алматы
4. **Поднимать раз в неделю** (бесплатно)
5. **Ссылка на сайт** — если категория OLX разрешает
6. **Можно добавить блок "Мы на OLX"** на сайт — двойная польза:
   бэклинк с OLX усиливает SEO + доверие покупателя

Семён, кинь топ-3-5 ссылок OLX, добавим в footer/Контакты.

---

## 8. История ключевых работ (PR-ы)

| PR | Что сделано |
|----|---|
| #1-10 | Базовая структура: страницы двигателей, SKU, GA4 |
| #11 | Compact piston page, убрали лишнее из comple |
| #12 | Refine: facts блок, фото в hero |
| #13 | Миграция Render → Supabase, новая 1KZ картинка с teikin.com |
| #14 | Скрыли pin numbers, ограничили размеры для дизелей, добавили бренд-лого |
| #15 | Редизайн в стиле nipponfz: clean above-the-fold, accordions |
| #16 | Bulk: 176 TEIKIN изображений + auto-data |
| #17 | Листинг → линки на per-SKU страницы |
| #18 | Добавлен CLAUDE.md |
| #19 | **Customer-flow overhaul:** поиск по артикулу, контекстные WhatsApp, SEO-longread лендинги, sticky mobile CTA |
| #20 | **Fix Product schema:** `lowPrice 15000 ₸` для поршней + видимая цена в hero |
| #21 | Yandex Webmaster verification file |

---

## 9. Структура клиентского пути (что сделано в PR #19)

Закрыты 3 ключевые дыры:

### Дыра 1: клиент не знает код двигателя

→ В шапке появился **SearchBox** с автокомплитом по артикулу TEIKIN/OEM
   и коду двигателя. Источник — `site/public/search-index.json` (генерится
   `prebuild` хуком из `scripts/gen-search-index.mjs`).
→ Страница `/poisk/` с фильтрами и WhatsApp-fallback.

### Дыра 2: клиент пишет в WhatsApp "что у вас есть?"

→ Все CTA на сайте теперь генерят **контекстный текст**:
   "Здравствуйте! Интересует цена и наличие на поршни для Toyota 1KZ".
→ Helper `whatsappWithText()` в [contacts.ts](site/src/lib/contacts.ts).
→ Sticky mobile CTA тоже имеет `waText` prop.

### Дыра 3: страница не цепляет в выдаче

→ Каждая категорийная страница: SEO-longread (2 абзаца + FAQ 8 вопросов +
   trust block + visible price) + полный JSON-LD стек (Product, FAQPage,
   BreadcrumbList, AutoPartsStore).

---

## 10. Что нельзя ломать без согласования

1. ❌ `--c-red` (#E50914) — брендовый цвет, не менять глобально
2. ❌ Структуру URL — слаги уже в индексе, ломать = терять SEO
3. ❌ `whatsappWithText()` — все CTA на него завязаны
4. ❌ JSON-LD без price (если есть `offers`) — критическая ошибка GSC
5. ❌ Удалять страницы — будут 404 в индексе → ранкинг падает
6. ❌ Бренды "Daido" в категории вкладышей — у нас только Taiho и NDC
7. ❌ "Прямые поставки из Японии" — не пишем нигде

---

## 11. TODO / Открытые задачи

### Высокий приоритет

- [ ] **GA4 events на CTA** (`whatsapp_click`, `phone_click`, `search_used`)
      → импортировать в Google Ads как Conversions
- [ ] **Search Terms Report** в Google Ads → собрать минус-слова
- [ ] **Поднять PR #21** (Yandex verification) → подтвердить права в Вебмастере
- [ ] Подать sitemap в Яндекс.Вебмастер
- [ ] Через неделю проверить GSC: сколько проиндексировано

### Средний приоритет

- [ ] Добавить блок "Мы на OLX" со ссылками — для бэклинков
- [ ] Аналогичные SKU-страницы для **колец** и **вкладышей**
- [ ] Sticky-мобильная CTA — проверить что работает на SKU
- [ ] Sitemap → добавить `<lastmod>` для лучшей переиндексации

### Низкий

- [ ] Ротировать Supabase/TEIKIN доступы, если они попадали в чат, логи или git history
- [ ] Расширить PDF-парсер: CD, TL, MRC, MP, surface, ring sizes
- [ ] Подтянуть `models` (совместимые авто) — TEIKIN их не публикует
- [ ] Доработать unmatched 7 моторов в TEIKIN catalog

---

## 12. Команды для агента (когда я возвращаюсь)

```bash
# Билд
cd site && npm run build

# Прескан перед коммитом
cd site && npm run astro check  # если есть

# Сгенерить search-index вручную (обычно через prebuild)
node scripts/gen-search-index.mjs

# Скрейпить TEIKIN PDF (редко)
TEIKIN_EMAIL='<email>' TEIKIN_PASSWORD='<password>' \
  node scripts/scrape-teikin.mjs && \
  node scripts/gen-teikin-catalog.mjs

# Проверить sitemap
curl -s https://my-avto.kz/sitemap-0.xml | grep -c "<url>"
# Должно быть 1549

# Проверить статус страницы в GSC через curl (sanity)
curl -sI https://my-avto.kz/toyota/dvigateli/1kz/porshni/ | head -3
```

---

## 13. Контакты и доступы (НЕ В РЕПО)

| Что | Где |
|---|---|
| `.env` с DATABASE_URL | `/Users/semen/IdeaProjects/myavto-landing/.claude/worktrees/loving-keller-9db10a/.env` |
| GitHub secret `DATABASE_URL` | Settings → Secrets repo |
| Google Search Console | sementrachuk@gmail.com |
| Яндекс.Вебмастер | sementrachuk@gmail.com |
| Google Ads | Хранить в менеджере паролей, не в репозитории |
| TEIKIN dealer portal | Хранить в менеджере паролей, передавать через `TEIKIN_EMAIL` / `TEIKIN_PASSWORD` |

---

## Как использовать этот playbook

При новой сессии:
1. Прочитай **CLAUDE.md** (тех. состояние, ключевые файлы)
2. Прочитай **PLAYBOOK.md** (этот файл — процессы, правила, TODO)
3. Если делаешь что-то новое — обнови PLAYBOOK после задачи

Не заставляй Семёна повторно объяснять одно и то же. Если что-то непонятно —
сначала проверь оба файла, потом спрашивай.
