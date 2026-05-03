const MULTIPLIERS = [1_000, 10_000, 100_000, 1_000_000, 10_000_000] as const;
const MAX_AMOUNT = 999_999_999_999;
/** Chỉ gợi ý khi người dùng nhập tiền tố (tránh nhân kép khi đã nhập đủ số). */
const MAX_PREFIX_DIGITS = 3;

/**
 * Từ chuỗi đang gõ (vd: "3", "30") sinh các mức tiền thường dùng: ×1.000, ×10.000, …
 */
export function getVndAmountSuggestions(raw: string): number[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const match = trimmed.match(/^(\d+)/);
  if (!match) return [];

  const digitStr = match[1].replace(/^0+/, "") || "0";
  if (digitStr === "0") return [];
  if (digitStr.length > MAX_PREFIX_DIGITS) return [];

  const baseNum = parseInt(digitStr, 10);
  if (!Number.isFinite(baseNum) || baseNum <= 0) return [];

  const set = new Set<number>();
  for (const m of MULTIPLIERS) {
    const v = baseNum * m;
    if (Number.isFinite(v) && v > 0 && v <= MAX_AMOUNT) set.add(v);
  }
  return [...set].sort((a, b) => a - b);
}
