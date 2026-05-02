# MY AVTO — Landing

Лендинг для магазина запчастей по двигателю на японские авто.

- **Менеджер:** Матвей
- **Телефон / WhatsApp:** +7 701 550 9377
- **Адрес:** Алматы, ТЦ Car City, 3 ярус, бутик 135В

## Запуск локально

Это статический сайт — один `index.html` с inline JSX (Babel standalone) и Tailwind CDN. Внешних зависимостей и сборки нет.

```bash
python3 -m http.server 8000
# открыть http://localhost:8000
```

## Структура

```
index.html          # вся разметка + JSX-компоненты
assets/
  brands/           # логотипы Toyota, Honda, Nissan, ...
  photos/           # Prado, Car City, визитка, блок, коленвал
```

## Деплой

GitHub Pages / Netlify / любой статический хостинг — просто залить как есть.
