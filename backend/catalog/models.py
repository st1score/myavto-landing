"""
Catalog models mapped onto the EXISTING Supabase `public` schema.

⚠️ All models here are `managed = False`: Django reads/writes rows but NEVER
creates, alters, or drops these tables. They belong to the owner-managed DB.

This `Product` is a STARTING map of the key columns (per web/lib/types.ts). Once
DATABASE_URL points at the real DB, regenerate the full, exact mapping with:

    python manage.py inspectdb products product_variants listings stock \
        product_media media categories brands engines > catalog/_inspected.py

then fold the accurate field definitions back into this file.
"""

from django.db import models


class Product(models.Model):
    id = models.UUIDField(primary_key=True)
    master_sku = models.TextField()
    title = models.TextField()
    category_code = models.TextField(null=True, blank=True)
    brand_code = models.TextField(null=True, blank=True)

    # Postgres text[] arrays (denormalized fitment — fine for a single seller)
    oem_numbers = models.JSONField(null=True, blank=True)
    cross_numbers = models.JSONField(null=True, blank=True)
    compatible_engines = models.JSONField(null=True, blank=True)

    status = models.TextField(default='draft')  # draft | active | archived

    seo_title = models.TextField(null=True, blank=True)
    seo_desc = models.TextField(null=True, blank=True)
    seo_keywords = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False          # Django must NOT touch this table
        db_table = 'products'    # resolved via search_path -> public.products

    def __str__(self) -> str:
        return f'{self.master_sku} — {self.title}'
