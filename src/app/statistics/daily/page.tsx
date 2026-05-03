"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import styles from "./page.module.css";
import { useFinance } from "@/context/FinanceContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function DailyStatisticsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const { categories, getTransactionsByDate, isReady } = useFinance();
  const { formatMoney } = useUserPreferences();

  const { targetDateStr, formattedDate, weekAnchor } = useMemo(() => {
    let d = new Date();
    if (dateParam) {
      const parsed = new Date(`${dateParam}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) d = parsed;
    }
    d.setHours(12, 0, 0, 0);
    const ds = toYMD(d);
    const label = d.toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const dow = d.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    return { targetDateStr: ds, formattedDate: label, weekAnchor: monday };
  }, [dateParam]);

  const handleDayClick = (ds: string) => {
    router.replace(`/statistics/daily?date=${encodeURIComponent(ds)}`);
  };

  if (!isReady || !targetDateStr) {
    return null;
  }

  const dailyTx = getTransactionsByDate(targetDateStr);
  let totalIncome = 0;
  let totalExpense = 0;
  dailyTx.forEach((t) => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  });
  const netBalance = totalIncome - totalExpense;

  const txList = dailyTx.map((tx) => {
    const cat = categories.find((c) => c.id === tx.categoryId);
    return {
      name: cat?.name || "Khác",
      desc: tx.type === "income" ? "Thu nhập" : "Chi phí",
      icon: cat?.icon || "category",
      amount: `${tx.type === "income" ? "+" : "-"}${formatMoney(tx.amount)}`,
    };
  });

  const weeklyData = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((dayName, idx) => {
    const day = new Date(weekAnchor);
    day.setDate(weekAnchor.getDate() + idx);
    const ds = toYMD(day);
    const txs = getTransactionsByDate(ds);
    let amount = 0;
    txs.forEach((t) => {
      if (t.type === "expense") amount += t.amount;
    });
    return { day: dayName, amount, ds };
  });

  const maxWeeklyAmount = Math.max(...weeklyData.map((d) => d.amount), 1);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button type="button" className={styles.iconBtn} onClick={() => router.back()}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className={styles.headerTitle}>{formattedDate}</h1>
          </div>
          <button type="button" className={styles.iconBtn} onClick={() => router.push("/calendar")}>
            <span className="material-symbols-outlined">calendar_today</span>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.weeklyChartSection}>
          <div className={styles.weeklyChart}>
            {weeklyData.map((data, index) => {
              const heightPct = (data.amount / maxWeeklyAmount) * 100;
              const isActive = data.ds === targetDateStr;
              return (
                <div
                  key={index}
                  className={`${styles.weeklyColumn} ${isActive ? styles.active : ""}`}
                  onClick={() => handleDayClick(data.ds)}
                >
                  <div className={styles.weeklyBarWrapper}>
                    <div className={styles.weeklyBar} style={{ height: `${heightPct}%` }} />
                  </div>
                  <span className={styles.weeklyDayLabel}>{data.day}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.heroSectionSmall}>
          <span className={styles.heroLabelSmall}>Số dư trong ngày</span>
          <h2 className={styles.heroValueSmall}>
            {netBalance >= 0 ? "+" : "-"}
            {formatMoney(Math.abs(netBalance))}
          </h2>
        </section>

        <section className={styles.summaryTextSection}>
          <div className={styles.summaryTextItem}>
            <span className={styles.barAmount}>+{formatMoney(totalIncome)}</span>
            <span className={styles.barLabel}>Thu nhập</span>
          </div>
          <div className={styles.summaryTextItem}>
            <span className={styles.barAmount}>-{formatMoney(totalExpense)}</span>
            <span className={styles.barLabel}>Chi phí</span>
          </div>
        </section>

        <section className={styles.breakdownSection}>
          <div className={styles.breakdownHeader}>
            <h3 className={styles.breakdownTitle}>Chi tiết hoạt động</h3>
            <span className={styles.breakdownCount}>{txList.length} GIAO DỊCH</span>
          </div>

          <div className={styles.transactionList}>
            {txList.map((tx, i) => (
              <div key={i} className={styles.transactionItem}>
                <div className={styles.txLeft}>
                  <div className={styles.txIcon}>
                    <span className="material-symbols-outlined">{tx.icon}</span>
                  </div>
                  <div>
                    <p className={styles.txName}>{tx.name}</p>
                    <p className={styles.txDesc}>{tx.desc}</p>
                  </div>
                </div>
                <p className={styles.txAmount}>{tx.amount}</p>
              </div>
            ))}
            {txList.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--color-on-surface-variant)",
                  fontSize: "0.875rem",
                  marginTop: "1rem",
                }}
              >
                Chưa có giao dịch nào trong ngày.
              </p>
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}

export default function DailyStatisticsPage() {
  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7383/ingest/29705d7e-3fb2-4059-a91d-ceacf846c677", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9f523b" },
      body: JSON.stringify({
        sessionId: "9f523b",
        location: "statistics/daily/page.tsx:DailyStatisticsPage",
        message: "daily page client shell mounted",
        data: { pathname: typeof window !== "undefined" ? window.location.pathname : null },
        timestamp: Date.now(),
        hypothesisId: "H1",
        runId: "route-fix",
      }),
    }).catch(() => {});
  }, []);
  // #endregion
  return (
    <Suspense fallback={null}>
      <DailyStatisticsInner />
    </Suspense>
  );
}
