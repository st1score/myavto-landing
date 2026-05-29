import pg from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

// Загружаем .env из корня worktree (на уровень выше site/)
dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const { Pool } = pg;

export const HAS_DB = !!process.env.DATABASE_URL;
if (!HAS_DB) {
  console.warn('[db] DATABASE_URL not set — DB-backed routes will return empty');
}

export const pool = HAS_DB
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 4,
      keepAlive: true,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      statement_timeout: 30_000,
    })
  : ({ query: async () => ({ rows: [] }), on: () => {}, end: async () => {} } as unknown as pg.Pool);

// Глушим ошибки idle-соединений (Supabase pooler иногда рвёт их в простое).
pool.on('error', (err) => {
  console.warn('[db] idle client error (recoverable):', err.message);
});

// Retry: 3 попытки на типичные transient-ошибки Supabase/pg.
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const transient = /ETIMEDOUT|ECONNRESET|terminated unexpectedly|Connection terminated|57P03|administrator command|EAI_AGAIN/i;
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (!transient.test(String(e?.message ?? e))) throw e;
      const wait = 500 * (i + 1);
      console.warn(`[db] ${label} retry ${i + 1}/3 after ${wait}ms: ${e.message}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export type Engine = {
  brand_name: string;
  engine_code: string;
  engine_name: string | null;
  volume_l: number | null;
  valve_count: number | null;
  is_diesel: boolean;
  cylinder_count: number | null;
  notes: string | null;
  is_priority: boolean;
};

export type PartNumber = {
  number_value: string;
  number_type: string;
  is_primary: boolean;
};

export type VariantSize = {
  brand_name: string;
  variant_name: string;
  insert_type: string;
  size_code: string;
  purchase_price: number | null;
};

export type StockItem = {
  brand_name: string;
  variant_name: string;
  insert_type: string;
  size_code: string;
  warehouse_code: string;
  qty: number;
};

export type AttributeValue = {
  attribute_code: string;
  value_number: number | null;
  value_text: string | null;
  value_integer: number | null;
};

export async function getEngines(): Promise<Engine[]> {
  const { rows } = await pool.query<Engine>(`
    SELECT brand_name, engine_code, engine_name, volume_l, valve_count,
           is_diesel, cylinder_count, notes, is_priority
      FROM engines
     WHERE is_active = true
     ORDER BY brand_name, is_diesel, volume_l NULLS LAST, engine_code
  `);
  return rows;
}

export async function getCategories(): Promise<{ code: string; name: string }[]> {
  const { rows } = await pool.query<{ code: string; name: string }>(`
    SELECT code, name FROM part_categories WHERE is_active = true ORDER BY sort_order, code
  `);
  return rows;
}

// Все номера деталей конкретного двигателя+категории
export async function getPartNumbers(
  engineCode: string,
  categoryCode: string
): Promise<PartNumber[]> {
  return withRetry(async () => {
    const { rows } = await pool.query<PartNumber>(
      `
      SELECT number_value, number_type, is_primary
        FROM engine_part_numbers
       WHERE engine_code = $1 AND category_code = $2 AND is_active = true
       ORDER BY is_primary DESC, number_type, number_value
    `,
      [engineCode, categoryCode]
    );
    return rows;
  }, `getPartNumbers(${engineCode},${categoryCode})`);
}

// Атрибуты поршня/кольца (диаметр, толщина, палец)
export async function getAttributes(
  engineCode: string,
  categoryCode: string
): Promise<AttributeValue[]> {
  return withRetry(async () => {
    const { rows } = await pool.query<AttributeValue>(
      `
      SELECT attribute_code, value_number, value_text, value_integer
        FROM engine_part_attribute_values
       WHERE engine_code = $1 AND category_code = $2
    `,
      [engineCode, categoryCode]
    );
    return rows;
  }, `getAttributes(${engineCode},${categoryCode})`);
}

// Варианты + размеры + цены
export async function getVariantSizes(
  engineCode: string,
  categoryCode: string
): Promise<VariantSize[]> {
  return withRetry(async () => {
    const { rows } = await pool.query<VariantSize>(
      `
      SELECT brand_name, variant_name, insert_type, size_code, purchase_price
        FROM part_variant_sizes
       WHERE engine_code = $1 AND category_code = $2 AND is_active = true
       ORDER BY brand_name, insert_type, size_code
    `,
      [engineCode, categoryCode]
    );
    return rows;
  }, `getVariantSizes(${engineCode},${categoryCode})`);
}

// Остатки
export async function getStock(
  engineCode: string,
  categoryCode: string
): Promise<StockItem[]> {
  return withRetry(async () => {
    const { rows } = await pool.query<StockItem>(
      `
      SELECT brand_name, variant_name, insert_type, size_code, warehouse_code, qty
        FROM stock_items
       WHERE engine_code = $1 AND category_code = $2 AND qty > 0
    `,
      [engineCode, categoryCode]
    );
    return rows;
  }, `getStock(${engineCode},${categoryCode})`);
}

// Для какого (двигатель × категория) у нас есть хотя бы один вариант (то есть есть что показывать)
export async function getEnginePartsIndex(): Promise<{ engine_code: string; category_code: string; brand_name: string }[]> {
  const { rows } = await pool.query<{ engine_code: string; category_code: string; brand_name: string }>(`
    SELECT DISTINCT ep.engine_code, ep.category_code, e.brand_name
      FROM engine_parts ep
      JOIN engines e USING (engine_code)
     WHERE ep.is_active = true AND e.is_active = true
  `);
  return rows;
}

// Все продукты-варианты со stock>0 — для генерации product-страниц по артикулу
export type PistonProduct = {
  engine_code: string;
  auto_brand: string;
  parts_brand: string;
  size_code: string;
  insert_type: string;
  total_qty: number;
};
export async function getPistonProductsInStock(): Promise<PistonProduct[]> {
  const { rows } = await pool.query<PistonProduct>(`
    SELECT s.engine_code,
           e.brand_name AS auto_brand,
           s.brand_name AS parts_brand,
           s.size_code,
           s.insert_type,
           SUM(s.qty)::int AS total_qty
      FROM stock_items s
      JOIN engines e ON e.engine_code = s.engine_code
     WHERE s.category_code = 'PISTON' AND s.qty > 0 AND e.is_active = true
     GROUP BY s.engine_code, e.brand_name, s.brand_name, s.size_code, s.insert_type
     ORDER BY e.brand_name, s.engine_code, s.brand_name, s.size_code
  `);
  return rows;
}

// Двигатели с запчастями определённого бренда (например, TEIKIN)
export async function getEnginesByPartsBrand(
  partsBrand: string
): Promise<{ engine_code: string; brand_name: string; category_code: string }[]> {
  const { rows } = await pool.query<{ engine_code: string; brand_name: string; category_code: string }>(
    `
    SELECT DISTINCT pvs.engine_code, e.brand_name, pvs.category_code
      FROM part_variant_sizes pvs
      JOIN engines e USING (engine_code)
     WHERE pvs.brand_name = $1
       AND pvs.is_active = true
       AND e.is_active = true
     ORDER BY e.brand_name, pvs.engine_code
  `,
    [partsBrand]
  );
  return rows;
}

// Сколько двигателей под маркой
export async function getBrandStats(): Promise<{ brand_name: string; engine_count: number }[]> {
  const { rows } = await pool.query<{ brand_name: string; engine_count: number }>(`
    SELECT brand_name, count(*)::int AS engine_count
      FROM engines
     WHERE is_active = true
     GROUP BY brand_name
     ORDER BY engine_count DESC
  `);
  return rows;
}

// =====================================================================
// New architecture: 3-page site
// =====================================================================

export type SearchFilters = {
  q?: string | null;
  engine?: string | null;
  category?: string | null;
  brand?: string | null;
  size?: string | null;
  inStock?: boolean | null;
  limit?: number;
  offset?: number;
};

export type SearchHit = {
  product_id: number;
  sku: string;
  title: string;
  engine_code: string;
  category_code: string;
  brand_name: string;
  size_code: string;
  insert_type: string;
  image_url: string | null;
  price_kzt: string | null;
  in_stock: boolean;
  stock_qty: number;
  oem_numbers: string[];
  rank: number;
  total_count: number;
};

export async function searchProducts(f: SearchFilters): Promise<{ hits: SearchHit[]; total: number }> {
  return withRetry(async () => {
    const { rows } = await pool.query<SearchHit>(
      `SELECT * FROM search_products(
         q          := $1,
         p_engine   := $2,
         p_category := $3,
         p_brand    := $4,
         p_size     := $5,
         p_in_stock := $6,
         p_limit    := $7,
         p_offset   := $8
       )`,
      [
        f.q ?? null,
        f.engine ?? null,
        f.category ?? null,
        f.brand ?? null,
        f.size ?? null,
        f.inStock ?? null,
        f.limit ?? 24,
        f.offset ?? 0,
      ]
    );
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    return { hits: rows, total };
  }, `searchProducts`);
}

// ----------- 1 engine + 1 category = 1 page -----------

export type EngineCategoryPair = { engine_code: string; category_code: string };

export async function getEngineCategoryPairs(): Promise<EngineCategoryPair[]> {
  const { rows } = await pool.query<EngineCategoryPair>(`
    SELECT DISTINCT engine_code, category_code
      FROM products
     WHERE is_active = true
     ORDER BY engine_code, category_code
  `);
  return rows;
}

export type EngineCategoryVariant = {
  product_id: number;
  sku: string;
  brand_name: string;
  variant_name: string;
  insert_type: string;
  size_code: string;
  in_stock: boolean;
  stock_qty: number;
  price_kzt: string | null;
};

export type EngineCategoryDetail = {
  engine_code: string;
  category_code: string;
  image_url: string | null;
  oem_numbers: string[];
  cross_numbers: string[];
  engine_aliases: string[];
  vehicles: string[];
  in_stock_any: boolean;
  brand_count: number;
  size_count: number;
  total_qty: number;
  is_diesel: boolean;
  variants: EngineCategoryVariant[];
};

export async function getEngineCategoryDetail(
  engine: string,
  category: string
): Promise<EngineCategoryDetail | null> {
  return withRetry(async () => {
    const { rows } = await pool.query<EngineCategoryVariant>(
      `
      SELECT m.product_id, m.sku, m.brand_name, p.variant_name, m.insert_type,
             m.size_code, m.in_stock, m.stock_qty, m.price_kzt
        FROM mv_search_products m
        JOIN products p ON p.id = m.product_id
       WHERE m.engine_code = $1 AND m.category_code = $2
       ORDER BY m.in_stock DESC, m.brand_name, m.insert_type, m.size_code
    `,
      [engine, category]
    );

    if (rows.length === 0) return null;

    const { rows: agg } = await pool.query<{
      image_url: string | null;
      oem_numbers: string[];
      cross_numbers: string[];
      engine_aliases: string[];
      vehicles: string[];
    }>(
      `
      SELECT MAX(image_url) AS image_url,
             (ARRAY(SELECT DISTINCT unnest(oem_numbers)    FROM mv_search_products WHERE engine_code = $1 AND category_code = $2))::text[] AS oem_numbers,
             (ARRAY(SELECT DISTINCT unnest(cross_numbers)  FROM mv_search_products WHERE engine_code = $1 AND category_code = $2))::text[] AS cross_numbers,
             (ARRAY(SELECT DISTINCT unnest(engine_aliases) FROM mv_search_products WHERE engine_code = $1 AND category_code = $2))::text[] AS engine_aliases,
             (ARRAY(SELECT DISTINCT unnest(vehicles)       FROM mv_search_products WHERE engine_code = $1 AND category_code = $2))::text[] AS vehicles
        FROM mv_search_products
       WHERE engine_code = $1 AND category_code = $2
    `,
      [engine, category]
    );

    const { rows: dieselRows } = await pool.query<{ is_diesel: boolean }>(
      `SELECT bool_or(is_diesel) AS is_diesel FROM engines WHERE engine_code = $1`,
      [engine]
    );

    const a = agg[0] ?? { image_url: null, oem_numbers: [], cross_numbers: [], engine_aliases: [], vehicles: [] };
    const brand_count = new Set(rows.map((r) => r.brand_name)).size;
    const size_count  = new Set(rows.map((r) => r.size_code)).size;
    const total_qty   = rows.reduce((s, r) => s + (r.stock_qty || 0), 0);

    return {
      engine_code: engine,
      category_code: category,
      image_url: a.image_url,
      oem_numbers: a.oem_numbers ?? [],
      cross_numbers: a.cross_numbers ?? [],
      engine_aliases: a.engine_aliases ?? [],
      vehicles: a.vehicles ?? [],
      in_stock_any: rows.some((r) => r.in_stock),
      brand_count,
      size_count,
      total_qty,
      is_diesel: dieselRows[0]?.is_diesel ?? false,
      variants: rows,
    };
  }, `getEngineCategoryDetail(${engine},${category})`);
}

// Related — другие категории того же мотора (для блока "что ещё для капремонта 1KZ").
export type RelatedCategoryCard = {
  engine_code: string;
  category_code: string;
  in_stock: boolean;
  brand_count: number;
};
export async function getRelatedCategoriesForEngine(
  engine: string,
  excludeCategory: string
): Promise<RelatedCategoryCard[]> {
  const { rows } = await pool.query<RelatedCategoryCard>(
    `
    SELECT engine_code,
           category_code,
           bool_or(in_stock) AS in_stock,
           count(DISTINCT brand_name)::int AS brand_count
      FROM mv_search_products
     WHERE engine_code = $1 AND category_code <> $2
     GROUP BY engine_code, category_code
     ORDER BY in_stock DESC, category_code
  `,
    [engine, excludeCategory]
  );
  return rows;
}

// Популярные моторы (для chips на главной).
export async function getPopularEngines(limit = 12): Promise<{ engine_code: string; product_count: number }[]> {
  const { rows } = await pool.query<{ engine_code: string; product_count: number }>(
    `
    SELECT engine_code, count(*)::int AS product_count
      FROM mv_search_products
     WHERE in_stock = true
     GROUP BY engine_code
     ORDER BY product_count DESC, engine_code
     LIMIT $1
  `,
    [limit]
  );
  return rows;
}
