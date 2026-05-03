"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import styles from "./page.module.css";
import { useAuth } from "@/context/AuthContext";
import { useFinance } from "@/context/FinanceContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { getVndAmountSuggestions } from "@/lib/vndAmountSuggestions";

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { formatMoney } = useUserPreferences();
  const { categories, addCategory, addTransaction, getNetWorthAsOfDate, getTransactionsByDate, isReady } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");

  const amountSuggestions = useMemo(
    () => getVndAmountSuggestions(transactionAmount),
    [transactionAmount]
  );

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory({ name: newCatName, icon: "category" });
      setShowAddModal(false);
      setNewCatName("");
    }
  };

  const handleQuickAdd = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const cat = categories.find(c => c.id === categoryId);
    setTransactionType(cat?.name === "Lương" ? "income" : "expense");
    setTransactionAmount("");
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = () => {
    if (selectedCategoryId !== null && transactionAmount) {
      const amount = parseFloat(transactionAmount);
      if (!isNaN(amount) && amount > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        addTransaction({
          categoryId: selectedCategoryId,
          amount: amount,
          type: transactionType,
          date: todayStr
        });
      }
      setShowTransactionModal(false);
    }
  };

  if (isLoading || !isAuthenticated || !isReady) {
    return <LoadingScreen />;
  }

  // Calculate Today's Stats
  const todayStr = new Date().toISOString().split("T")[0];
  const todaysTx = getTransactionsByDate(todayStr);
  let totalIncome = 0;
  let totalExpense = 0;
  todaysTx.forEach(t => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  });

  const netWorth = getNetWorthAsOfDate(todayStr);

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Hero Balance Section */}
        <section className={styles.heroBalance}>
          <span className={styles.dateLabel}>
            {new Date().toLocaleString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className={styles.balanceLabel}>Tổng tài sản</span>
          <div className={styles.balanceValue}>
            <h2 className={styles.amount}>{formatMoney(netWorth)}</h2>
          </div>
          <div className={styles.trend}>
            <span className="material-symbols-outlined">trending_up</span>
            <span className={styles.trendText}>Cập nhật hôm nay</span>
          </div>
        </section>

        {/* Bento Grid Insights */}
        <section className={styles.bentoGrid}>
          <div className={styles.bentoCard}>
            <span className="material-symbols-outlined filled">shopping_cart</span>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>Chi tiêu hôm nay</span>
              <p className={styles.cardValue}>{formatMoney(totalExpense)}</p>
            </div>
          </div>
          <div className={styles.bentoCard}>
            <span className="material-symbols-outlined filled">account_balance_wallet</span>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>Thu nhập hôm nay</span>
              <p className={styles.cardValue}>{formatMoney(totalIncome)}</p>
            </div>
          </div>
        </section>

        {/* Expenditure Categories Section */}
        <section className={styles.categorySection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Danh mục thu chi</h3>
            <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
              <span className="material-symbols-outlined">add_circle</span>
              Thêm danh mục
            </button>
          </div>

          <div className={styles.categoryList}>
            {categories.map((cat) => {
              const catTx = todaysTx.filter(t => t.categoryId === cat.id);
              return (
                <CategoryItem 
                  key={cat.id}
                  name={cat.name} 
                  icon={cat.icon} 
                  transactions={catTx}
                  formatMoney={formatMoney}
                  onAdd={() => handleQuickAdd(cat.id)}
                />
              );
            })}
          </div>
        </section>
      </main>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Thêm danh mục mới</h3>
            <input 
              type="text" 
              className={styles.modalInput} 
              placeholder="Tên danh mục (vd: Giải trí)" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)} 
              autoFocus 
            />
            <div className={styles.modalActions}>
              <button className={styles.modalBtnCancel} onClick={() => setShowAddModal(false)}>Hủy</button>
              <button className={styles.modalBtnAdd} onClick={handleAddCategory}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Thêm giao dịch mới</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="radio" checked={transactionType === 'expense'} onChange={() => setTransactionType('expense')} /> Chi phí
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input type="radio" checked={transactionType === 'income'} onChange={() => setTransactionType('income')} /> Thu nhập
              </label>
            </div>
            <input
              type="number"
              className={styles.modalInput}
              placeholder="Số tiền (VND)"
              min={0}
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              autoFocus
            />
            {amountSuggestions.length > 0 && (
              <div>
                <p className={styles.modalSuggestLabel}>Gợi ý nhanh</p>
                <div className={styles.modalSuggestRow}>
                  {amountSuggestions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={styles.modalSuggestChip}
                      onClick={() => setTransactionAmount(String(n))}
                    >
                      {formatMoney(n)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.modalActions}>
              <button className={styles.modalBtnCancel} onClick={() => setShowTransactionModal(false)}>Hủy</button>
              <button className={styles.modalBtnAdd} onClick={handleSaveTransaction}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
    </div>
  );
}

function CategoryItem({ name, icon, transactions, formatMoney, onAdd }: {
  name: string;
  icon: string;
  transactions: Array<{ id: string; amount: number; type: string }>;
  formatMoney: (vnd: number) => string;
  onAdd: () => void;
}) {
  let total = 0;
  transactions.forEach(t => {
    if (t.type === "income") total += t.amount;
    else total -= t.amount;
  });

  const displayAmount =
    total === 0
      ? ""
      : `${total > 0 ? "+" : ""}${formatMoney(Math.abs(total))}`;

  return (
    <div className={styles.categoryItem}>
      <div className={styles.itemTop}>
        <div className={styles.itemLeft}>
          <div className={styles.iconCircle}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <div className={styles.itemInfo}>
            <span className={styles.itemName}>{name}</span>
            {displayAmount && <p className={styles.itemAmount}>{displayAmount}</p>}
          </div>
        </div>
        <button className={styles.quickAdd} onClick={onAdd}>
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
      {transactions.length > 0 && (
        <div className={styles.transactionScroll}>
          {transactions.map((tx) => (
            <span key={tx.id} className={styles.txTag}>
              {tx.type === "income" ? '+' : '-'}{formatMoney(tx.amount)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
