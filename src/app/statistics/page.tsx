"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import styles from "./page.module.css";
import { useFinance } from "@/context/FinanceContext";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";

export default function StatisticsPage() {
  const { user } = useAuth();
  const { currency, formatMoney } = useUserPreferences();
  const {
    categories: globalCategories,
    budgets: allBudgets,
    getTransactionsByMonth,
    getNetWorthAsOfDate,
    setBudget,
    isReady,
  } = useFinance();

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("");

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const handlePrevMonth = () => {
    setCurrentDate(prev => prev ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1) : new Date());
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => prev ? new Date(prev.getFullYear(), prev.getMonth() + 1, 1) : new Date());
  };

  const monthTitle = currentDate.toLocaleString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const monthIndex0 = currentDate.getMonth();
  const lastDayOfMonth = new Date(currentYear, monthIndex0 + 1, 0);
  const endOfMonthStr = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, "0")}-${String(lastDayOfMonth.getDate()).padStart(2, "0")}`;

  const monthBudgets = allBudgets.filter(
    (b) => b.year === currentYear && b.month === currentMonth
  );

  const handleSaveBudget = async () => {
    if (budgetInput && !isNaN(Number(budgetInput)) && budgetCategory && user) {
      await setBudget({
        categoryName: budgetCategory,
        limit: Number(budgetInput),
        year: currentYear,
        month: currentMonth,
      });
    }
    setIsEditingBudget(false);
    setBudgetInput("");
  };

  const handleEditBudget = (catName: string, currentLimit: number) => {
    setBudgetCategory(catName);
    setBudgetInput(currentLimit.toString());
    setIsEditingBudget(true);
  };

  if (!isReady) {
    return null;
  }

  const netWorthEndOfMonth = getNetWorthAsOfDate(endOfMonthStr);

  const monthTx = getTransactionsByMonth(currentYear, monthIndex0);
  let totalExpense = 0;
  let totalIncome = 0;

  const catExpenseAmounts: Record<string, number> = {};
  const catIncomeAmounts: Record<string, number> = {};

  monthTx.forEach(tx => {
    if (tx.type === "expense") {
      catExpenseAmounts[tx.categoryId] = (catExpenseAmounts[tx.categoryId] || 0) + tx.amount;
      totalExpense += tx.amount;
    } else {
      catIncomeAmounts[tx.categoryId] = (catIncomeAmounts[tx.categoryId] || 0) + tx.amount;
      totalIncome += tx.amount;
    }
  });

  const expenseCategories = globalCategories
    .map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      amount: catExpenseAmounts[c.id] || 0,
      amountStr: formatMoney(catExpenseAmounts[c.id] || 0),
      pct: `${totalExpense > 0 ? Math.round(((catExpenseAmounts[c.id] || 0) / totalExpense) * 100) : 0}%`
    }))
    .filter(c => c.amount > 0);

  const incomeCategories = globalCategories
    .map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      amount: catIncomeAmounts[c.id] || 0,
      amountStr: formatMoney(catIncomeAmounts[c.id] || 0),
      pct: `${totalIncome > 0 ? Math.round(((catIncomeAmounts[c.id] || 0) / totalIncome) * 100) : 0}%`
    }))
    .filter(c => c.amount > 0);

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Monthly Selector */}
        <div className={styles.monthSelector}>
          <button className={styles.navArrow} onClick={handlePrevMonth}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <Link href="/calendar" className={styles.monthCenter}>
            <p className={styles.fiscalLabel}>Kỳ thống kê</p>
            <h2 className={styles.monthTitle}>{monthTitle}</h2>
          </Link>
          <button className={styles.navArrow} onClick={handleNextMonth}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <section className={styles.statNetHero} aria-label="Tài sản ròng cuối kỳ">
          <span className={styles.statNetDate}>
            {lastDayOfMonth.toLocaleString("vi-VN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className={styles.statNetLabel}>Tài sản ròng còn lại</span>
          <div className={styles.statNetValue}>
            <h2 className={styles.statNetAmount}>{formatMoney(netWorthEndOfMonth)}</h2>
          </div>
          <div className={styles.statNetTrend}>
            <span className="material-symbols-outlined">account_balance</span>
            <span className={styles.statNetTrendText}>Lũy kế đến cuối tháng</span>
          </div>
        </section>

        {/* Pie Chart Section */}
        <section className={styles.chartSection}>
          <PieChart categories={expenseCategories} totalExpense={totalExpense} />
          <div className={styles.chartSummary}>
            <p className={styles.chartLabel}>Tổng chi tiêu</p>
            <p className={styles.chartValue}>{formatMoney(totalExpense)}</p>
          </div>
        </section>

        {/* Budgets Section */}
        <section className={styles.budgetSection}>
          <div className={styles.budgetHeader}>
            <span className={styles.budgetLabel}>Giới hạn ngân sách</span>
            {!isEditingBudget && monthBudgets.length > 0 && (
              <button className={styles.createSmallBtn} onClick={() => {
                setBudgetInput("");
                setBudgetCategory(globalCategories.find(c => !monthBudgets.find(b => b.categoryName === c.name))?.name || globalCategories[0].name);
                setIsEditingBudget(true);
              }}>
                <span className="material-symbols-outlined">add</span>
              </button>
            )}
          </div>

          {isEditingBudget && (
            <div className={styles.budgetEdit}>
              <select
                value={budgetCategory}
                onChange={e => setBudgetCategory(e.target.value)}
                className={styles.budgetSelect}
              >
                {globalCategories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <div className={styles.budgetInputWrapper}>
                <span className={styles.currencySymbol}>{currency}</span>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className={styles.budgetInput}
                  placeholder="Số tiền"
                  autoFocus
                />
              </div>
              <button className={styles.saveBudgetBtn} onClick={handleSaveBudget}>Lưu</button>
              <button className={styles.cancelBudgetBtn} onClick={() => setIsEditingBudget(false)}>Hủy</button>
            </div>
          )}

          {!isEditingBudget && monthBudgets.length === 0 && (
            <button className={styles.createBudgetBtn} onClick={() => {
              setBudgetCategory(globalCategories[0]?.name || "");
              setIsEditingBudget(true);
            }}>
              <span className="material-symbols-outlined">add</span>
              Tạo ngân sách
            </button>
          )}

          {!isEditingBudget && monthBudgets.map((budget) => {
            const catData = expenseCategories.find(c => c.name === budget.categoryName);
            const spent = catData ? catData.amount : 0;
            const percentage = Math.min((spent / budget.limit) * 100, 100);
            const isWarning = spent >= budget.limit * 0.9 && spent <= budget.limit;
            const isDanger = spent > budget.limit;

            return (
              <div key={budget.id} className={styles.budgetDisplayItem}>
                <div className={styles.budgetDisplayHeader}>
                  <div className={styles.budgetTitleGroup}>
                    <span className="material-symbols-outlined">{catData?.icon || 'category'}</span>
                    <span className={styles.budgetName}>{budget.categoryName}</span>
                  </div>
                  <button className={styles.editBudgetBtn} onClick={() => handleEditBudget(budget.categoryName, budget.limit)}>
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                </div>
                <div className={styles.budgetProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: isDanger ? '#d32f2f' : (isWarning ? '#f57c00' : 'var(--color-on-surface)')
                      }}
                    />
                  </div>
                  <div className={styles.budgetStats}>
                    <span><strong style={{ color: 'var(--color-on-surface)' }}>{formatMoney(spent)}</strong> đã chi</span>
                    <span>trên {formatMoney(budget.limit)}</span>
                  </div>
                  {(isWarning || isDanger) && (
                    <div className={styles.budgetWarning} style={{ color: isDanger ? '#d32f2f' : '#f57c00' }}>
                      <span className="material-symbols-outlined">{isDanger ? 'error' : 'warning'}</span>
                      <span>
                        {isDanger
                          ? `Cảnh báo: Đã vượt ngân sách ${budget.categoryName}!`
                          : `Chú ý: Đã đạt 90% giới hạn ${budget.categoryName}!`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Category Insights: Expense */}
        {expenseCategories.length > 0 && (
          <>
            <p className={styles.categoryGroupLabel}>Chi tiêu tháng này</p>
            <div className={styles.categoryGrid}>
              {expenseCategories.map((cat) => (
                <div key={cat.id} className={styles.categoryCard}>
                  <div className={styles.categoryTop}>
                    <span className={styles.categoryName}>{cat.name}</span>
                    <span className={styles.categoryBadge}>{cat.pct}</span>
                  </div>
                  <div className={styles.categoryBottom}>
                    <p className={styles.categoryAmount}>{cat.amountStr}</p>
                    <span className="material-symbols-outlined">{cat.icon}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Category Insights: Income */}
        {incomeCategories.length > 0 && (
          <>
            <p className={styles.categoryGroupLabel}>Thu nhập tháng này</p>
            <div className={styles.categoryGrid}>
              {incomeCategories.map((cat) => (
                <div key={cat.id} className={`${styles.categoryCard} ${styles.categoryCardIncome}`}>
                  <div className={styles.categoryTop}>
                    <span className={styles.categoryName}>{cat.name}</span>
                    <span className={styles.categoryBadge}>{cat.pct}</span>
                  </div>
                  <div className={styles.categoryBottom}>
                    <p className={styles.categoryAmount}>+{cat.amountStr}</p>
                    <span className="material-symbols-outlined">{cat.icon}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {expenseCategories.length === 0 && incomeCategories.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', padding: '1rem 0' }}>
            Chưa có giao dịch nào trong tháng này.
          </p>
        )}

        {/* View Daily Link */}
        <Link
          href="/statistics/daily"
          className={styles.dailyLink}
          onClick={() => {
            // #region agent log
            fetch("http://127.0.0.1:7383/ingest/29705d7e-3fb2-4059-a91d-ceacf846c677", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9f523b" },
              body: JSON.stringify({
                sessionId: "9f523b",
                location: "statistics/page.tsx:dailyLink",
                message: "user navigates to daily statistics",
                data: { href: "/statistics/daily" },
                timestamp: Date.now(),
                hypothesisId: "H2",
                runId: "route-fix",
              }),
            }).catch(() => {});
            // #endregion
          }}
        >
          <span className="material-symbols-outlined">insights</span>
          <span>Xem chi tiết theo ngày</span>
          <span className="material-symbols-outlined" style={{ marginLeft: "auto", fontSize: "1.125rem" }}>arrow_forward</span>
        </Link>
      </main>
      <BottomNav />
    </>
  );
}

// --- SVG Pie Chart Component ---
type PieCat = { id: string; name: string; icon: string; amount: number; amountStr: string; pct: string };

function PieChart({ categories, totalExpense }: { categories: PieCat[]; totalExpense: number }) {
  const cx = 170;
  const cy = 170;
  const r = 120;
  const size = 340;

  const palette = [
    "#2563EB",
    "#F97316",
    "#16A34A",
    "#DC2626",
    "#7C3AED",
    "#0891B2",
    "#CA8A04",
    "#DB2777",
  ];

  const sorted = [...categories].sort((a, b) => b.amount - a.amount);

  if (totalExpense === 0 || sorted.length === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%', maxHeight: '300px' }}>
        <circle cx={cx} cy={cy} r={r} fill="#e2e2e4" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#888" fontFamily="inherit">
          Chưa có dữ liệu
        </text>
      </svg>
    );
  }

  const startOffset = -Math.PI / 2;
  const slices = sorted.map((cat, idx) => {
    const prevFraction = sorted
      .slice(0, idx)
      .reduce((s, c) => s + c.amount / totalExpense, 0);
    const fraction = cat.amount / totalExpense;
    const angle = fraction * 2 * Math.PI;
    const startAngle = startOffset + prevFraction * 2 * Math.PI;
    const endAngle = startAngle + angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');

    const midAngle = startAngle + angle / 2;
    const pctNum = Math.round(fraction * 100);
    const color = palette[idx % palette.length];

    const isLarge = fraction >= 0.12;

    const innerR = r * 0.62;
    const innerLx = cx + innerR * Math.cos(midAngle);
    const innerLy = cy + innerR * Math.sin(midAngle);

    const leaderStartR = r + 8;
    const leaderEndR = r + 30;
    const leaderMidR = r + 22;
    const lsx = cx + leaderStartR * Math.cos(midAngle);
    const lsy = cy + leaderStartR * Math.sin(midAngle);
    const lex = cx + leaderEndR * Math.cos(midAngle);
    const ley = cy + leaderEndR * Math.sin(midAngle);

    const isRight = Math.cos(midAngle) >= 0;
    const textX = cx + (leaderMidR + 12) * Math.cos(midAngle);
    const textY = cy + (leaderMidR + 4) * Math.sin(midAngle);
    const textAnchor: "start" | "end" = isRight ? "start" : "end";

    return {
      path, midAngle, pctNum, color, fraction,
      isLarge,
      innerLx, innerLy,
      lsx, lsy, lex, ley, textX, textY, textAnchor,
      cat
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ maxWidth: '100%', maxHeight: '300px', overflow: 'visible' }}
    >
      {slices.map(({ path, color, cat }) => (
        <path
          key={`slice-${cat.id}`}
          d={path}
          fill={color}
          stroke="#ffffff"
          strokeWidth={2.5}
        />
      ))}

      {slices.map(({ isLarge, innerLx, innerLy, lsx, lsy, lex, ley, textX, textY, textAnchor, pctNum, color, cat, fraction }) => {
        if (isLarge) {
          return (
            <g key={`label-${cat.id}`}>
              <text
                x={innerLx}
                y={innerLy - 7}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fraction > 0.25 ? "13" : "12"}
                fontWeight="700"
                fill="#ffffff"
                fontFamily="inherit"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
              >
                {cat.name}
              </text>
              <text
                x={innerLx}
                y={innerLy + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fraction > 0.25 ? "13" : "12"}
                fontWeight="400"
                fill="#ffffff"
                fontFamily="inherit"
              >
                {pctNum}%
              </text>
            </g>
          );
        } else {
          return (
            <g key={`label-${cat.id}`}>
              <line
                x1={lsx} y1={lsy}
                x2={lex} y2={ley}
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={textX}
                y={textY - 7}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="700"
                fill={color}
                fontFamily="inherit"
              >
                {cat.name}
              </text>
              <text
                x={textX}
                y={textY + 7}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="400"
                fill={color}
                fontFamily="inherit"
              >
                {pctNum}%
              </text>
            </g>
          );
        }
      })}
    </svg>
  );
}
