# MY AVTO — Design System

Шаблон для Figma + код. Используется как source of truth для будущего Next.js сайта.

## Что в папке

```
design/
├── tokens.css           — CSS variables (для preview + Tailwind config)
├── figma-tokens.json    — Tokens Studio JSON (импорт в Figma)
├── README.md            — этот файл
└── mockups/
    ├── index.html       — Главная
    ├── brand.html       — Бренд (Toyota)
    ├── engine.html      — Двигатель (1KZ-TE)
    ├── listing.html     — Листинг поршней
    └── sku.html         — SKU страница ★ приоритет
```

## Quick start

```bash
# Открыть mockups в браузере
open design/mockups/index.html
```

Между mockup'ами навигация в правом нижнем углу (исчезнет при переносе в код).

---

## Figma workflow

### 1. Установи плагины Figma

- **Tokens Studio for Figma** (бесплатный) — для импорта дизайн-токенов
- **html.to.design** (бесплатный, 5 импортов/мес) — конвертирует HTML mockups в editable frames
- **Iconify** — иконки 200k+ библиотек
- **Unsplash** — фото

### 2. Импортируй токены

1. Открой Figma → Plugins → Tokens Studio for Figma
2. Settings → Import → JSON
3. Загрузи `figma-tokens.json`
4. Apply → "Create Styles" → конвертит в Figma Color Styles + Text Styles
5. Optional: "Create Variables" → Figma Variables (тогда можно менять тему)

### 3. Импортируй HTML mockups

1. Hosted preview: запусти локальный сервер
   ```bash
   cd design/mockups && python3 -m http.server 8080
   ```
2. Figma → Plugins → html.to.design → URL: `http://localhost:8080/sku.html`
3. Импорт → получишь редактируемый frame
4. Повтори для каждого экрана

### 4. Структура файла Figma (рекомендуемая)

```
📁 MY AVTO Design (Figma)
├── 📄 01 — Foundations
│   ├── Colors
│   ├── Typography
│   ├── Spacing & Radius
│   └── Shadows
├── 📄 02 — Components
│   ├── Header / Footer / Breadcrumbs
│   ├── Buttons (primary / secondary / WhatsApp)
│   ├── Pills & Badges (stock, promo, brand)
│   ├── Chips (sizes, modifications)
│   ├── Cards (product / engine / category / alt)
│   ├── Forms (search, filters, inputs)
│   └── Sticky Mobile CTA
├── 📄 03 — Pages — Desktop
│   ├── Home
│   ├── Brand
│   ├── Engine
│   ├── Listing
│   └── SKU ★
└── 📄 04 — Pages — Mobile (375px / 414px)
    ├── ... (тоже самое)
```

### 5. Когда дизайн готов

Сообщи мне:
- Ссылка на Figma file (с editor-доступом или экспортом frames в PNG)
- Что изменилось vs HTML mockups (если что-то)
- Любые новые компоненты которых не было в шаблоне

Я переношу 1:1 в Next.js (3-7 дней работы в зависимости от сложности изменений).

---

## Frame размеры в Figma

| Screen | Desktop | Mobile |
|--------|---------|--------|
| Все страницы | **1440 × auto** (контент 1280, отступы 80px) | **375 × auto** или **414 × auto** |
| Header sticky | 1440 × 100 (top 36 + main 64) | 375 × 56 |
| Footer | 1440 × ~320 | 375 × ~480 |
| SKU hero | 1440 × ~640 | 375 × ~720 |
| Product card | 296 × 380 (в grid 4×) | 165 × 320 (в grid 2×) |

---

## Что менять в Figma vs что в коде

**В Figma (твоя зона):**
- Цвета, шрифты, размеры, spacing
- Расположение блоков на страницах
- Hero визуал, иллюстрации
- Иконки, кнопки, бейджи
- Mobile/desktop адаптация

**В коде (моя зона):**
- Динамика из Supabase (цены, фото, наличие)
- URL роутинг, SEO мета
- Админка `/admin` (формы, авторизация)
- Server actions (CRUD)
- Vercel deploy

**Контент после запуска (твоя зона через `/admin`):**
- Цены, фото товаров
- Описания, характеристики
- Stock-наличие
- Новые товары/моторы

---

## Дизайн-решения шаблона

**Стиль:** Kaspi-like marketplace (плотная сетка карточек, бейджи, привычно покупателю KZ).

**Цвета:**
- Основа: navy (#0F1B3D) + светло-серый фон (#F4F5F7)
- CTA: красный (#E50914) — только главные действия
- Акценты: синий (#0066CC) — ссылки, бренд-pills, info
- Marketplace добавки: Kaspi-yellow (#FFD400) для промо, фиолетовый — для рассрочки, зелёный (#00A859) — наличие

**Типографика:**
- Inter — UI и body
- JetBrains Mono — артикулы, цены, тех. характеристики (визуально отличает "данные" от описаний)

**SKU страница приоритет:**
- Sticky right column на desktop с фото + ценой + CTA
- 2 уровня вариантов (модификация A/G/AG → размер STD/+0.50)
- Аналоги других брендов с ценами рядом (легко сравнить TEIKIN vs IZUMI vs ND)
- OEM таблица отдельно (не смешивается с TEIKIN артикулом)
- Sticky mobile CTA с ценой + WhatsApp

**Marketplace элементы:**
- Бейджи "Хит", "В наличии", "Под заказ"
- Цена со старой зачёркнутой
- Рассрочка Kaspi badge
- Звёзды + количество заказов
- ♡ favorite

---

## Tailwind config (для переноса в код)

После Figma финала, токены пойдут в `tailwind.config.ts` как:

```ts
// фрагмент
theme: {
  extend: {
    colors: {
      brand: { red: '#E50914', blue: '#0066CC', navy: '#0F1B3D' },
      surface: { DEFAULT: '#F4F5F7', card: '#FFFFFF' },
      // ...
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    borderRadius: { md: '8px', lg: '12px', pill: '999px' },
    // ...
  }
}
```

---

## Что дальше

1. **Ты:** работаешь в Figma по шаблону, делаешь финальный дизайн.
2. **Я (параллельно):** поднимаю Next.js + Vercel + админку скелет (без финального дизайна, на placeholder стилях).
3. **Ты:** Figma готов → присылаешь.
4. **Я:** одеваю код в финальный дизайн, заменяю placeholder на pixel-perfect Tailwind компоненты.
5. **Деплой:** DNS my-avto.kz → Vercel, sitemap в Google Search Console.
