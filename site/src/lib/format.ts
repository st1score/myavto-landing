// Утилиты форматирования чисел для UI.

// Убирает trailing zero: "1.60" → "1.6", "2.00" → "2", "90.50" → "90.5".
// Если на входе null/undefined/пусто — возвращает пустую строку.
export function fmtNum(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return String(v);
  // Number.prototype.toString автоматически убирает trailing zero
  // 1.60 → "1.6", 2.00 → "2", 90.5 → "90.5"
  return String(n);
}
