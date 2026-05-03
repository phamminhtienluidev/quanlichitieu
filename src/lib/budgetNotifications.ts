import type { Budget, Transaction } from "@/lib/firestoreService";

const NEAR_RATIO = 0.9;

type Args = {
  enabled: boolean;
  permission: NotificationPermission;
  year: number;
  monthIndex0: number;
  /** Tháng 1–12, khớp trường `Budget.month`. */
  monthIndex1: number;
  budgets: Budget[];
  transactions: Transaction[];
  getCategoryName: (categoryId: string) => string;
};

/** Thông báo trình duyệt (hoặc PWA): gần hạn (~90%) hoặc vượt ngân sách. Mỗi loại × danh mục × tháng chỉ gửi một lần mỗi phiên tab (sessionStorage). */
export function checkAndNotifyBudgetAlerts({
  enabled,
  permission,
  year,
  monthIndex0,
  monthIndex1,
  budgets,
  transactions,
  getCategoryName,
}: Args): void {
  if (typeof window === "undefined") return;
  if (!enabled || permission !== "granted") return;
  if (!("Notification" in window)) return;

  const monthBudgets = budgets.filter(
    (b) => b.year === year && b.month === monthIndex1
  );
  if (monthBudgets.length === 0) return;

  const monthTx = transactions.filter((tx) => {
    const d = new Date(tx.date + "T12:00:00");
    return (
      Number.isFinite(d.getTime()) &&
      d.getFullYear() === year &&
      d.getMonth() === monthIndex0
    );
  });

  for (const b of monthBudgets) {
    const limit = b.limit;
    if (limit <= 0) continue;

    const spent = monthTx
      .filter(
        (t) =>
          t.type === "expense" && getCategoryName(t.categoryId) === b.categoryName
      )
      .reduce((s, t) => s + t.amount, 0);

    const baseKey = `${year}-${monthIndex1}-${b.categoryName}`;
    const pct = Math.round((spent / limit) * 100);

    if (spent >= limit) {
      const k = `budget_notify_over_${baseKey}`;
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, "1");
        new Notification("Vượt hạn mức chi", {
          body: `${b.categoryName}: đã chi ${spent.toLocaleString(
            "vi-VN"
          )} đ / hạn ${limit.toLocaleString("vi-VN")} đ.`,
          tag: k,
        });
      }
      continue;
    }

    if (spent >= limit * NEAR_RATIO) {
      const k = `budget_notify_near_${baseKey}`;
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, "1");
        new Notification("Gần hết ngân sách", {
          body: `${b.categoryName}: ${pct}% hạn mức (${spent.toLocaleString(
            "vi-VN"
          )} / ${limit.toLocaleString("vi-VN")} đ).`,
          tag: k,
        });
      }
    }
  }
}
