"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import styles from "./page.module.css";
import { useFinance } from "@/context/FinanceContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";

export default function CalendarPage() {
  const router = useRouter();
  const { getTransactionsByDate, getNetWorthAsOfDate, isReady } = useFinance();
  const { formatMoney } = useUserPreferences();

  const [selectedDay, setSelectedDay] = useState(1);
  const [currentMonthIdx, setCurrentMonthIdx] = useState(0);
  const [currentYear, setCurrentYear] = useState(2023);

  // States to keep track of the actual current date for the "Today" label
  const [todayDate, setTodayDate] = useState(1);
  const [todayMonth, setTodayMonth] = useState(0);
  const [todayYear, setTodayYear] = useState(2023);

  useEffect(() => {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    setSelectedDay(day);
    setCurrentMonthIdx(month);
    setCurrentYear(year);

    setTodayDate(day);
    setTodayMonth(month);
    setTodayYear(year);
  }, []);
  
  const months = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  const currentMonth = months[currentMonthIdx];

  const handlePrevMonth = () => {
    setCurrentMonthIdx(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthIdx(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  if (!isReady) {
    return null; // Or loading
  }

  const selectedDateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dailyTx = getTransactionsByDate(selectedDateStr);
  let dailyIncome = 0;
  let dailyExpense = 0;
  dailyTx.forEach(t => {
    if (t.type === "income") dailyIncome += t.amount;
    else dailyExpense += t.amount;
  });
  const netDaily = dailyIncome - dailyExpense;

  const currentMonthEnd = new Date(currentYear, currentMonthIdx + 1, 0);
  // Correct for local timezone formatting to YYYY-MM-DD safely
  const currentMonthEndStr = `${currentMonthEnd.getFullYear()}-${String(currentMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(currentMonthEnd.getDate()).padStart(2, '0')}`;
  const balanceValue = getNetWorthAsOfDate(currentMonthEndStr);

  return (
    <>
      <Header 
        leftIcon="arrow_back" 
        onLeftClick={() => router.push('/statistics')} 
      />
      <main className={styles.main}>
        {/* Fiscal Period Header */}
        <section className={styles.fiscalHeader}>
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <p className={styles.fiscalLabel}>Thời gian</p>
              <div className={styles.monthControls}>
                <button className={styles.monthArrow} onClick={handlePrevMonth}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h2 className={styles.monthTitle}>{currentMonth}</h2>
                <button className={styles.monthArrow} onClick={handleNextMonth}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <p className={styles.yearSub}>Tổng quan {currentYear}</p>
            </div>
            <div className={styles.headerRight}>
              <p className={styles.balanceLabel}>Số dư</p>
              <p className={styles.balanceValue}>{formatMoney(balanceValue)}</p>
            </div>
          </div>
        </section>

        {/* Bento Grid Layout */}
        <div className={styles.bentoLayout}>
          {/* Calendar Module */}
          <section className={styles.calendarModule}>
            <div className={styles.calendarGrid}>
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(day => (
                <div key={day} className={styles.dayOfWeek}>{day}</div>
              ))}
              
              
              {/* Dynamic Calendar rendering */}
              {(() => {
                const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
                const firstDay = new Date(currentYear, currentMonthIdx, 1).getDay();
                
                const days = [];
                // Placeholders for previous month
                for (let i = 0; i < firstDay; i++) {
                  days.push(<div key={`empty-${i}`} className={styles.placeholderDay}></div>);
                }
                
                // Actual days
                for (let i = 1; i <= daysInMonth; i++) {
                  const isToday = i === todayDate && currentMonthIdx === todayMonth && currentYear === todayYear;
                  
                  // Optional: check if day has transactions to show dots
                  const dayStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                  const hasTx = getTransactionsByDate(dayStr).length > 0;

                  days.push(
                    <div 
                      key={i} 
                      className={i === selectedDay ? styles.todayBtn : styles.dayBtn}
                      onClick={() => setSelectedDay(i)}
                    >
                      <span className={styles.dayNum}>{i}</span>
                      {isToday && <span className={styles.todayLabel}>Hôm nay</span>}
                      {hasTx && <div className={styles.activeDot} />}
                    </div>
                  );
                }
                
                // Placeholders for next month to fill grid
                const totalCells = days.length;
                const remainingCells = 42 - totalCells; // 6 rows * 7 days
                for (let i = 1; i <= remainingCells; i++) {
                  days.push(<div key={`next-${i}`} className={styles.placeholderDay}>{i}</div>);
                }
                
                return days;
              })()}
            </div>
          </section>

          {/* Sidecar Module */}
          <aside className={styles.sidecar}>
            <div className={styles.dayCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderText}>
                  <p className={styles.cardLabel}>Ngày đang chọn</p>
                  <h3 className={styles.cardTitle}>{selectedDay} {currentMonth}</h3>
                </div>
                <div className={styles.cardIcon}>
                  <span className="material-symbols-outlined">event_note</span>
                </div>
              </div>

              <div className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Thu nhập ngày</span>
                  <span className={styles.incomeValue}>+{formatMoney(dailyIncome)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Chi tiêu ngày</span>
                  <span className={styles.expenseValue}>-{formatMoney(dailyExpense)}</span>
                </div>
                <div className={styles.netRow}>
                  <span className={styles.netLabel}>Số dư ngày</span>
                  <span className={styles.netValue}>{netDaily >= 0 ? '+' : '-'}{formatMoney(Math.abs(netDaily))}</span>
                </div>
              </div>

              <button className={styles.reportBtn} onClick={() => router.push(`/statistics/daily?date=${selectedDateStr}`)}>
                Xem báo cáo ngày
                <span className="material-symbols-outlined">arrow_outward</span>
              </button>
            </div>

            {/* Spending Trend Card */}
            <div className={styles.trendCard}>
              <div className={styles.trendContent}>
                <p className={styles.trendLabel}>Nhận xét</p>
                <p className={styles.trendText}>
                  {dailyTx.length > 0 ? `Bạn có ${dailyTx.length} giao dịch trong ngày này.` : `Không có giao dịch nào trong ngày này.`}
                </p>
              </div>
              <div className={styles.trendIcon}>
                <span className="material-symbols-outlined">monitoring</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
