# MY AVTO landing

Рабочий сайт находится в `site/`.

```sh
cd site
npm ci
npm run dev
```

Билд:

```sh
cd site
npm run build
```

Нужен `DATABASE_URL` в локальном `.env` или GitHub Actions secret. Каталоговые изображения TEIKIN лежат в `site/public/teikin-catalog/` и используются на страницах моторов и товаров.
