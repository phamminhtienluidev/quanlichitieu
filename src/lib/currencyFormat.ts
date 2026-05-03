export type DisplayCurrency = "VND" | "USD";

function usdVndRate(): number {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_USD_VND_RATE) {
    const n = Number.parseFloat(process.env.NEXT_PUBLIC_USD_VND_RATE);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 25_300;
}

/** Số tiền trong DB luôn là VND — hàm này chỉ đổi cách hiển thị. */
export function formatStoredVnd(
  amountVnd: number,
  currency: DisplayCurrency
): string {
  const v = Number.isFinite(amountVnd) ? amountVnd : 0;
  if (currency === "VND") {
    return `${v.toLocaleString("vi-VN")} VND`;
  }
  const usd = v / usdVndRate();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(usd);
}
