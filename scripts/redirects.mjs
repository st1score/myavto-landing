// После сборки: для старых адресов сайта (scripts/old-urls.txt), которых больше нет,
// создаём HTML-заглушки с canonical + мгновенным переходом на ближайшую новую страницу.
// GitHub Pages не умеет настоящие 301, а Google и Яндекс считают такой мгновенный
// meta refresh переадресацией. Через 2–3 месяца после запуска заглушки можно убрать.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const SITE = 'https://my-avto.kz';

const exists = (p) => existsSync(join(dist, p, 'index.html'));

function target(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  // /toyota/dvigateli/... , /p/<поршень>/ → двигатель и капремонт
  if (parts.includes('dvigateli') || parts[0] === 'p') return '/zapchasti/dvigatel/';
  // /toyota/ и т.п. → страница марки, если есть
  if (parts.length === 1 && exists(`/${parts[0]}/`)) return null;
  if (exists(`/${parts[0]}/`)) return `/${parts[0]}/`;
  if (parts[0] === 'brendy') return '/brendy/';
  return '/';
}

const paths = new Set(
  readFileSync(join(root, 'scripts/old-urls.txt'), 'utf8')
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split('?')[0])
    .map((l) => (l.endsWith('/') ? l : l + '/')),
);

let n = 0;
for (const p of paths) {
  if (exists(p)) continue;
  const to = target(p);
  if (!to) continue;
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Страница переехала — MY AVTO</title>` +
    `<link rel="canonical" href="${SITE}${to}"><meta http-equiv="refresh" content="0; url=${to}">` +
    `<script>location.replace(${JSON.stringify(to)})</script></head>` +
    `<body><a href="${to}">Страница переехала — перейти</a></body></html>`;
  const dir = join(dist, p);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  n++;
}
console.log(`redirects: ${n} заглушек для старых адресов`);
