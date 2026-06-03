# MY AVTO — backend (Django + DRF)

API layer for **my-avto.kz**. Sits in front of the **existing Supabase Postgres**.
Next.js (`../web`) calls this API. The DB and its data are unchanged.

## 🔴 Safety rules (do not break)

1. **Owner tables are read-through-only for Django.** Models for `products`,
   `product_variants`, `listings`, etc. use `managed = False`. Django migrations
   **never** create/alter/drop them. Verify before any `migrate`:
   `python manage.py makemigrations --check --dry-run` should show no changes for `catalog`.
2. **Django system tables go in a separate schema** (`DJANGO_SYSTEM_SCHEMA`, default
   `django`) so they never collide with the owner-managed `public` schema.
   Create it once: `CREATE SCHEMA IF NOT EXISTS django;` (see below).
3. **Secrets live in `.env` only** (gitignored). The DB password is in `DATABASE_URL`.
   Never commit it, never paste it in chat. If leaked → rotate in Supabase.

## Stack

- Python 3.12, Django 5.1, Django REST Framework
- `psycopg` (Postgres), `dj-database-url`, `django-cors-headers`, `python-dotenv`

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # then fill DATABASE_URL + DJANGO_SECRET_KEY
```

Get `DATABASE_URL`: Supabase Dashboard → Settings → Database → Connection string → URI.
Use the **direct** connection (5432) for migrations.

Generate a secret key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### One-time DB bootstrap

In Supabase SQL editor (or psql), create the isolated schema for Django's tables:
```sql
CREATE SCHEMA IF NOT EXISTS django;
```

Then create ONLY Django's system tables (auth, sessions, admin) — these land in
the `django` schema, never in `public`:
```bash
python manage.py migrate            # safe: catalog has no migrations (managed=False)
python manage.py createsuperuser    # admin login for the Django admin
```

### Regenerate exact models from the real schema

```bash
python manage.py inspectdb products product_variants listings stock \
    product_media media categories brands engines > catalog/_inspected.py
```
Fold the accurate columns into `catalog/models.py` (keep `managed = False`).

## Run

```bash
python manage.py runserver        # http://localhost:8000
```

- Health:  `GET /api/health/`
- Catalog: `GET /api/products/`  ·  `GET /api/products/<master_sku>/`
- Admin:   `/admin/`

## Without a DB

If `DATABASE_URL` is unset, the project boots on local sqlite (offline checks
only — no real catalog data).
