import pg from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

// Загружаем .env из корня worktree (на уровень выше site/)
dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан в .env');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 4,
});

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
}

// Атрибуты поршня/кольца (диаметр, толщина, палец)
export async function getAttributes(
  engineCode: string,
  categoryCode: string
): Promise<AttributeValue[]> {
  const { rows } = await pool.query<AttributeValue>(
    `
    SELECT attribute_code, value_number, value_text, value_integer
      FROM engine_part_attribute_values
     WHERE engine_code = $1 AND category_code = $2
  `,
    [engineCode, categoryCode]
  );
  return rows;
}

// Варианты + размеры + цены
export async function getVariantSizes(
  engineCode: string,
  categoryCode: string
): Promise<VariantSize[]> {
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
}

// Остатки
export async function getStock(
  engineCode: string,
  categoryCode: string
): Promise<StockItem[]> {
  const { rows } = await pool.query<StockItem>(
    `
    SELECT brand_name, variant_name, insert_type, size_code, warehouse_code, qty
      FROM stock_items
     WHERE engine_code = $1 AND category_code = $2 AND qty > 0
  `,
    [engineCode, categoryCode]
  );
  return rows;
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
