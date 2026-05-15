"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import styles from "./page.module.css";
import { useFinance } from "@/context/FinanceContext";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { Transaction } from "@/lib/firestoreService";

export default function StatisticsPage() {
  const { user } = useAuth();
  const { currency, formatMoney } = useUserPreferences();
  const {
    categories: globalCategories,
    budgets: allBudgets,
    getTransactionsByDate,
    getTransactionsByMonth,
    getTransactionsByYear,
    getNetWorthAsOfDate,
    setBudget,
    deleteBudget,
    isReady,
  } = useFinance();

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("");

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [statPeriod, setStatPeriod] = useState<"day" | "month" | "year">("month");
  const [monthChartType, setMonthChartType] = useState<"pie" | "bar">("pie");

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statPeriod === "day" && chartRef.current) {
      const activeElement = chartRef.current.querySelector(`.${styles.trendBarActive}`)?.parentElement;
      if (activeElement) {
        const containerWidth = chartRef.current.clientWidth;
        const elementLeft = activeElement.offsetLeft;
        const elementWidth = activeElement.clientWidth;
        const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
        
        chartRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentDate, statPeriod]);

  const handlePrev = () => {
    setCurrentDate(prev => {
      if (!prev) return new Date();
      if (statPeriod === "day") {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1);
      } else if (statPeriod === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      } else {
        return new Date(prev.getFullYear() - 1, 0, 1);
      }
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      if (!prev) return new Date();
      if (statPeriod === "day") {
        return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      } else if (statPeriod === "month") {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      } else {
        return new Date(prev.getFullYear() + 1, 0, 1);
      }
    });
  };

  let periodTitle = "";
  if (statPeriod === "day") {
    periodTitle = currentDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  } else if (statPeriod === "month") {
    periodTitle = `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`;
  } else {
    periodTitle = `Năm ${currentDate.getFullYear()}`;
  }

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const monthIndex0 = currentDate.getMonth();
  const lastDayOfMonth = new Date(currentYear, monthIndex0 + 1, 0);

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

  let targetDateStr = "";
  if (statPeriod === "day") {
    targetDateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
  } else if (statPeriod === "month") {
    targetDateStr = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, "0")}-${String(lastDayOfMonth.getDate()).padStart(2, "0")}`;
  } else {
    targetDateStr = `${currentYear}-12-31`;
  }
  const netWorthEndPeriod = getNetWorthAsOfDate(targetDateStr);

  let periodTx: Transaction[] = [];
  if (statPeriod === "day") {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
    periodTx = getTransactionsByDate(dateStr);
  } else if (statPeriod === "month") {
    periodTx = getTransactionsByMonth(currentYear, monthIndex0);
  } else {
    periodTx = getTransactionsByYear(currentYear);
  }

  let totalExpense = 0;
  let totalIncome = 0;

  const catExpenseAmounts: Record<string, number> = {};
  const catIncomeAmounts: Record<string, number> = {};

  periodTx.forEach(tx => {
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
      pct: `${totalExpense > 0 ? Math.round(((catExpenseAmounts[c.id] || 0) / totalExpense) * 100) : 0}%`,
      transactions: periodTx.filter(t => t.categoryId === c.id && t.type === "expense")
    }))
    .filter(c => c.amount > 0);

  const incomeCategories = globalCategories
    .map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      amount: catIncomeAmounts[c.id] || 0,
      amountStr: formatMoney(catIncomeAmounts[c.id] || 0),
      pct: `${totalIncome > 0 ? Math.round(((catIncomeAmounts[c.id] || 0) / totalIncome) * 100) : 0}%`,
      transactions: periodTx.filter(t => t.categoryId === c.id && t.type === "income")
    }))
    .filter(c => c.amount > 0);

  // Tính toán dữ liệu biểu đồ cột (chỉ hiển thị ở tab "Theo ngày")
  let trendData: { label: string, value: number, active?: boolean, fullDate?: Date }[] = [];
  let periodLabelForChart = "";

  if (statPeriod === "day") {
    // Hiển thị tất cả các ngày trong tháng của currentDate
    const daysInMonth = lastDayOfMonth.getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayTx = getTransactionsByDate(dateStr);
      const expense = dayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      trendData.push({
        label: `${i}/${currentMonth}`,
        value: expense,
        active: i === currentDate.getDate(),
        fullDate: new Date(currentYear, currentMonth - 1, i)
      });
    }
    periodLabelForChart = `tháng ${currentMonth}`;
  }

  const maxTrendVal = Math.max(...trendData.map(d => d.value), 1);

  // Tính toán dữ liệu cho biểu đồ năm (chỉ hiển thị ở tab "Theo năm")
  let yearlyChartData: { month: number; income: number; expense: number; label: string }[] = [];
  let yearlyTotalIncome = 0;
  let yearlyTotalExpense = 0;

  if (statPeriod === "year") {
    let accIncome = 0;
    let accExpense = 0;
    for (let m = 1; m <= 12; m++) {
      const monthPrefix = `${currentYear}-${String(m).padStart(2, "0")}`;
      const mTx = periodTx.filter(t => t.date.startsWith(monthPrefix));
      
      const mIncome = mTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const mExpense = mTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      
      accIncome += mIncome;
      accExpense += mExpense;

      yearlyTotalIncome += mIncome;
      yearlyTotalExpense += mExpense;
      
      yearlyChartData.push({
        month: m,
        income: accIncome,
        expense: accExpense,
        label: `Th ${m}`
      });
    }
  }

  const yearlyAccumulated = yearlyTotalIncome - yearlyTotalExpense;
  const currentMonthNum = new Date().getFullYear() === currentYear ? new Date().getMonth() + 1 : 12;
  const avgMonthlyExpense = yearlyTotalExpense / Math.max(currentMonthNum, 1);
  const maxYearlyVal = Math.max(...yearlyChartData.flatMap(d => [d.income, d.expense]), 1);

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Period Tabs */}
        <div className={styles.periodTabs}>
          <button className={`${styles.periodTab} ${statPeriod === 'day' ? styles.periodTabActive : ''}`} onClick={() => setStatPeriod('day')}>Theo ngày</button>
          <button className={`${styles.periodTab} ${statPeriod === 'month' ? styles.periodTabActive : ''}`} onClick={() => setStatPeriod('month')}>Theo tháng</button>
          <button className={`${styles.periodTab} ${statPeriod === 'year' ? styles.periodTabActive : ''}`} onClick={() => setStatPeriod('year')}>Theo năm</button>
        </div>

        {/* Date Selector */}
        <div className={styles.monthSelector}>
          <button className={styles.navArrow} onClick={handlePrev}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className={styles.monthCenter}>
            <h2 className={styles.monthTitle}>{periodTitle}</h2>
          </div>
          <button className={styles.navArrow} onClick={handleNext}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Trend Chart (Chỉ hiện ở tab Theo ngày) */}
        {statPeriod === "day" && (
          <div className={styles.trendChartWrapper}>
            <div className={styles.trendChart} ref={chartRef}>
              {trendData.map((item, i) => {
                const heightPct = Math.max((item.value / maxTrendVal) * 100, 2);
                return (
                  <div key={i} className={styles.trendBarContainer} onClick={() => {
                    if (item.fullDate) setCurrentDate(item.fullDate);
                  }} style={{ cursor: 'pointer' }}>
                    <div className={styles.trendTooltip}>{formatMoney(item.value)}</div>
                    <div className={`${styles.trendBar} ${item.active ? styles.trendBarActive : ''}`} style={{ height: `${heightPct}%` }}></div>
                    <span className={styles.trendLabel}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/* Category Chart Section (Month & Year) */}
        {(statPeriod === 'month' || statPeriod === 'year') && expenseCategories.length > 0 && (
          <div className={styles.monthChartWrapper}>
            <div className={styles.chartToggle}>
              <button 
                className={`${styles.toggleBtn} ${monthChartType === 'pie' ? styles.toggleBtnActive : ''}`}
                onClick={() => setMonthChartType('pie')}
                aria-label="Biểu đồ tròn"
              >
                <span className="material-symbols-outlined">pie_chart</span>
              </button>
              <button 
                className={`${styles.toggleBtn} ${monthChartType === 'bar' ? styles.toggleBtnActive : ''}`}
                onClick={() => setMonthChartType('bar')}
                aria-label="Biểu đồ ngang"
              >
                <span className="material-symbols-outlined">bar_chart</span>
              </button>
            </div>
            
            {monthChartType === 'pie' ? (
              <div className={styles.chartSection}>
                <PieChart categories={expenseCategories} totalExpense={totalExpense} />
              </div>
            ) : (
              <div className={styles.categoryBarChart}>
                {expenseCategories.map(cat => {
                  const pctNum = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={`bar-${cat.id}`} className={styles.catBarItem}>
                      <div className={styles.catBarHeader}>
                        <span className={styles.catBarName}>{cat.name}</span>
                        <span className={styles.catBarPct}>{Math.round(pctNum)}%</span>
                      </div>
                      <div className={styles.catBarTrack}>
                        <div className={styles.catBarFill} style={{ width: `${pctNum}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={styles.chartSummary}>
              <p className={styles.chartLabel}>Tổng chi tiêu trong {statPeriod === 'month' ? 'tháng' : 'năm'}</p>
              <p className={styles.chartValue}>{formatMoney(totalExpense)}</p>
            </div>
          </div>
        )}

        {/* Budgets Section */}
        {statPeriod === 'month' && (
        <section className={styles.budgetSection}>
          <div className={styles.budgetHeader}>
            <span className={styles.budgetLabel}>Giới hạn ngân sách</span>
            {!isEditingBudget && monthBudgets.length > 0 && (
              <button className={styles.createSmallBtn} onClick={() => {
                setBudgetInput("");
                const availableCats = globalCategories.filter(c => c.name.toLowerCase() !== "lương");
                setBudgetCategory(availableCats.find(c => !monthBudgets.find(b => b.categoryName === c.name))?.name || availableCats[0]?.name || "");
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
                {globalCategories.filter(c => c.name.toLowerCase() !== "lương").map(cat => (
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
              const availableCats = globalCategories.filter(c => c.name.toLowerCase() !== "lương");
              setBudgetCategory(availableCats[0]?.name || "");
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
                  <div className={styles.budgetActionButtons}>
                    <button className={styles.editBudgetBtn} onClick={() => handleEditBudget(budget.categoryName, budget.limit)}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className={styles.deleteBudgetBtn} onClick={() => deleteBudget(budget.id)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
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
        )}

        {/* Yearly Statistics Section */}
        {statPeriod === "year" && (
          <div className={styles.yearlyStatsWrapper}>
            <div className={styles.yearlyChartContainer}>
              <h3 className={styles.chartTitle}>Cộng dồn Thu nhập & Chi tiêu</h3>
              <div className={styles.yearlyChartLegend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColorInc} style={{borderRadius: '50%', height: '10px', width: '10px'}}></div> Thu nhập (Đường)
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColorExp}></div> Chi tiêu (Cột)
                </div>
              </div>

              <div className={styles.yearlyChart}>
                <div className={styles.yearlyBarsOverlay}>
                  <svg className={styles.yearlyLineSvg} width="100%" height="100%">
                    {yearlyChartData.map((item, i) => {
                      if (i === 0) return null;
                      const prev = yearlyChartData[i - 1];
                      const x1 = `${(i - 0.5) * (100 / 12)}%`;
                      const y1 = `${100 - (prev.income / maxYearlyVal) * 100}%`;
                      const x2 = `${(i + 0.5) * (100 / 12)}%`;
                      const y2 = `${100 - (item.income / maxYearlyVal) * 100}%`;
                      
                      return (
                        <line 
                          key={`line-${i}`}
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="#3b82f6" strokeWidth="2.5" 
                          strokeLinecap="round"
                        />
                      );
                    })}
                    {yearlyChartData.map((item, i) => {
                      const cx = `${(i + 0.5) * (100 / 12)}%`;
                      const cy = `${100 - (item.income / maxYearlyVal) * 100}%`;
                      return (
                        <circle key={`circle-${i}`} cx={cx} cy={cy} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                      );
                    })}
                  </svg>
                  
                  <div className={styles.yearlyBarsFlex}>
                    {yearlyChartData.map((item) => {
                      const expHeight = Math.max((item.expense / maxYearlyVal) * 100, 0);
                      return (
                        <div key={item.month} className={styles.yearlyMonthGroup}>
                          <div className={styles.yearlyBarExpWrapper}>
                            <div className={styles.trendTooltip} style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                              Thu: {formatMoney(item.income)}
                              {"\n"}
                              Chi: {formatMoney(item.expense)}
                            </div>
                            <div className={styles.yearlyBarExp} style={{ height: `${expHeight}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.yearlyLabelsFlex}>
                  {yearlyChartData.map((item) => (
                    <div key={item.month} className={styles.yearlyLabelGroup}>
                      <span className={styles.yearlyLabel}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.yearlyAvgFooter}>
                <span className={styles.yearlyAvgLabel}>Trung bình chi tiêu / tháng:</span>
                <span className={styles.yearlyAvgValue}>{formatMoney(avgMonthlyExpense)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Category Insights: Expense */}
        {expenseCategories.length > 0 && (
          <>
            <p className={styles.categoryGroupLabel}>Chi tiêu kỳ này</p>
            <div className={styles.categoryGrid}>
              {expenseCategories.map((cat) => (
                <StatCategoryItem key={cat.id} cat={cat} isIncome={false} formatMoney={formatMoney} statPeriod={statPeriod} />
              ))}
            </div>
          </>
        )}

        {/* Category Insights: Income */}
        {incomeCategories.length > 0 && (
          <>
            <p className={styles.categoryGroupLabel}>Thu nhập kỳ này</p>
            <div className={styles.categoryGrid}>
              {incomeCategories.map((cat) => (
                <StatCategoryItem key={cat.id} cat={cat} isIncome={true} formatMoney={formatMoney} statPeriod={statPeriod} />
              ))}
            </div>
          </>
        )}

        {expenseCategories.length === 0 && incomeCategories.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', padding: '1rem 0' }}>
            Chưa có giao dịch nào trong kỳ này.
          </p>
        )}
      </main>
      <BottomNav />
    </>
  );
}

// --- Stat Category Item Component ---
function StatCategoryItem({ cat, isIncome, formatMoney, statPeriod }: {
  cat: { name: string; icon: string; amountStr: string; pct: string; transactions: any[] };
  isIncome: boolean;
  formatMoney: (v: number) => string;
  statPeriod: "day" | "month" | "year";
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isExpandable = statPeriod === "day";

  return (
    <div 
      className={`${styles.categoryCard} ${isIncome ? styles.categoryCardIncome : ''}`} 
      onClick={() => isExpandable && setIsExpanded(!isExpanded)} 
      style={{ cursor: isExpandable ? 'pointer' : 'default' }}
    >
      <div className={styles.categoryTop}>
        <span className={styles.categoryName}>{cat.name}</span>
        <span className={styles.categoryBadge}>{cat.pct}</span>
      </div>
      <div className={styles.categoryBottom}>
        <p className={styles.categoryAmount}>{isIncome ? '+' : ''}{cat.amountStr}</p>
        <span className="material-symbols-outlined">{cat.icon}</span>
      </div>

      {isExpandable && isExpanded && cat.transactions.length > 0 && (
        <div className={styles.expandedTxList}>
          {cat.transactions.map(tx => {
            let timeStr = "";
            if (tx.createdAt && typeof tx.createdAt.toDate === 'function') {
              timeStr = tx.createdAt.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            }
            return (
              <div key={`exp-${tx.id}`} className={styles.expandedTxItem}>
                <div className={styles.expandedTxLeft}>
                  {timeStr && <span className={styles.expandedTxTime}>{timeStr}</span>}
                  <span className={styles.expandedTxNote}>{tx.note || "Không có ghi chú"}</span>
                </div>
                <span className={styles.expandedTxAmount}>
                  {tx.type === "income" ? '+' : '-'}{formatMoney(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
    const textAnchor = isRight ? "start" : "end";

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
                textAnchor={textAnchor as "start" | "end" | "middle" | "inherit" | undefined}
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
                textAnchor={textAnchor as "start" | "end" | "middle" | "inherit" | undefined}
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
