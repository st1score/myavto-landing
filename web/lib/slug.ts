// SEO-friendly, deterministic, stable product slugs.
//
// Derived from master_sku (immutable per the B1 SKU contract) so a product's
// URL never changes once published — critical for not losing Google ranking.
// Format: <ru-keyword>-<sku-body>, e.g. "porshen-1kz-teikin-46283-ag-050".

// category_code → latin transliteration of the Russian part name (for the URL head)
const CAT_KEYWORD: Record<string, string> = {
  PISTON: 'porshen',
  RING: 'kolca',
  BEARING: 'vkladysh',
  LINER: 'gilza',
  KIT: 'remkomplekt',
};

// category_code → the short code used inside master_sku, so we can drop the
// redundant token from the slug body (PISTON sku uses "PSTN").
const CAT_SKU_CODE: Record<string, string> = {
  PISTON: 'pstn',
};

function slugifyPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---- Hub (category / engine landing) slugs ----

/** category_code → URL slug for the category hub (/zapchasti/<slug>/). */
export const CATEGORY_SLUG: Record<string, string> = {
  PISTON: 'porshni',
  RING: 'koltsa',
  BEARING: 'vkladyshi',
  LINER: 'gilzy',
  KIT: 'remkomplekty',
};
export const CATEGORY_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUG).map(([code, slug]) => [slug, code]),
);

/** Engine code → URL slug for the engine hub (/dvigateli/<slug>/). */
export function engineSlug(code: string): string {
  return code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Build the canonical SEO slug for a catalog/product row. */
export function productSlug(row: { master_sku: string; category_code: string }): string {
  const keyword = CAT_KEYWORD[row.category_code] ?? slugifyPart(row.category_code);
  // strip the "MYA-" vendor prefix and lower-case the rest
  const body = row.master_sku.replace(/^MYA-/i, '').toLowerCase();
  const catCode = CAT_SKU_CODE[row.category_code];
  const tokens = body.split('-').filter((t) => t && t !== catCode);
  return slugifyPart(`${keyword}-${tokens.join('-')}`);
}
