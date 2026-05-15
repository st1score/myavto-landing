# Деплой на GitHub Pages

Сайт собирается из `site/` (Astro) и деплоится на `my-avto.kz` через GitHub Actions.

## Первичная настройка (один раз)

### 1. Добавить секрет DATABASE_URL

GitHub → Settings → Secrets and variables → Actions → **New repository secret**:

- **Name:** `DATABASE_URL`
- **Secret:** `postgresql://partsbot:VPA1NfO0PMVjvuIoQVPALikt75kMqMcw@dpg-d7htn39kh4rs73alppk0-a.frankfurt-postgres.render.com/partsbot`

⚠️ Этот пароль засветился в чате — **обязательно ротировать в Render** после того как всё заработает (Render Dashboard → Database → Settings → Rotate Password), и обновить секрет в GitHub.

### 2. Переключить источник GitHub Pages

GitHub → Settings → Pages → Source: выбрать **GitHub Actions** (вместо "Deploy from a branch").

### 3. Запушить изменения

```bash
git add .
git commit -m "Add Astro SEO site + Pages deploy workflow"
git push origin main
```

Workflow запустится автоматически. Первый билд ~3 минуты (npm ci + 958 страниц).

### 4. Проверить деплой

GitHub → Actions → должен быть зелёный workflow "Deploy SEO site to GitHub Pages".

После успешного деплоя `https://my-avto.kz/` покажет новый Astro-сайт вместо старого лэндинга.

### 5. Submit sitemap в Google Search Console

[search.google.com/search-console](https://search.google.com/search-console) → Sitemaps → добавить:
```
https://my-avto.kz/sitemap-index.xml
```

## Старые файлы в корне репо

После того как деплой заработает, можно удалить:
- `index.html` (старый лэндинг — теперь в Astro)
- `sitemap.xml` (теперь генерится Astro в `sitemap-index.xml`)
- `apple-touch-icon.png`, `favicon-*` в корне (есть в `site/public/`)
- `assets/` в корне (если все нужные файлы перенесены в `site/public/assets/`)

`CNAME` уже скопирован в `site/public/CNAME` — будет в `dist/` после билда.

**Не удаляй пока не проверишь что новый сайт работает!** Можно сначала временно переименовать в `index.html.bak`.

## Когда сайт пересобирается

Workflow триггерится:
- На push в `main`, если изменились файлы в `site/**` или сам workflow
- По расписанию каждый день в 04:00 UTC (10:00 Алматы) — чтобы освежать USD-курс из Нацбанка
- Вручную: Actions → Deploy SEO site → Run workflow

## Если БД упала во время билда

Билд провалится (нет двигателей → нет страниц). Workflow покажет error.

Что делать:
1. Проверить Render dashboard — DB online?
2. Перезапустить workflow вручную: Actions → Run workflow
3. Старая версия сайта останется висеть (Pages не разворачивает сломанный билд).

## Локальная разработка

```bash
cd site
npm install
echo "DATABASE_URL=..." > .env  # тот же URL что в секрете
npm run dev      # http://localhost:4321
npm run build    # собрать в dist/
npm run preview  # отдать dist/ локально
```

## Заметки

- Astro использует `trailingSlash: 'always'` и `format: 'directory'` — все URL заканчиваются на `/`.
- `site` в `astro.config.mjs` = `https://my-avto.kz` — менять только если меняешь домен.
- Pages cache: после успешного деплоя Cloudflare/CDN могут отдавать старую версию ещё несколько минут. Принудительно обнови вкладку (Cmd+Shift+R).
