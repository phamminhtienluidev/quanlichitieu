"use client";

import { useMemo, useState, useEffect } from "react";
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
  const { categories, addCategory, deleteCategory, addTransaction, deleteTransaction, getTransactionsByMonth, getTransactionsByDate, isReady } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionNote, setTransactionNote] = useState("");
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const handlePrevDay = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  };
  
  const handleNextDay = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  };

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
    setTransactionNote("");
    setShowTransactionModal(true);
  };
  
  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa danh mục "${categoryName}"? Tất cả giao dịch trong danh mục này cũng sẽ bị xóa.`)) {
      deleteCategory(categoryId);
    }
  };

  const handleSaveTransaction = () => {
    if (selectedCategoryId !== null && transactionAmount) {
      const amount = parseFloat(transactionAmount);
      if (!isNaN(amount) && amount > 0) {
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(selectedDate.getDate()).padStart(2, '0');
        const selectedDateStr = `${yyyy}-${mm}-${dd}`;
        
        const txData: any = {
          categoryId: selectedCategoryId,
          amount: amount,
          type: transactionType,
          date: selectedDateStr,
        };
        const trimmedNote = transactionNote.trim();
        if (trimmedNote) {
          txData.note = trimmedNote;
        }
        addTransaction(txData);
      }
      setShowTransactionModal(false);
    }
  };

  if (isLoading || !isAuthenticated || !isReady) {
    return <LoadingScreen />;
  }

  // Calculate Today's Stats
  const yyyy = selectedDate.getFullYear();
  const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const dd = String(selectedDate.getDate()).padStart(2, '0');
  const selectedDateStr = `${yyyy}-${mm}-${dd}`;
  const todaysTx = getTransactionsByDate(selectedDateStr);
  let totalIncome = 0;
  let totalExpense = 0;
  todaysTx.forEach(t => {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  });

  // Calculate Month's Stats
  const currentMonthTx = getTransactionsByMonth(selectedDate.getFullYear(), selectedDate.getMonth());
  let monthIncome = 0;
  let monthExpense = 0;
  currentMonthTx.forEach(t => {
    if (t.type === "income") monthIncome += t.amount;
    else monthExpense += t.amount;
  });
  let monthNetWorth = monthIncome - monthExpense;

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Hero Balance Section */}
        <section className={styles.heroBalance}>
          <div className={styles.dateSelector}>
            <button className={styles.dateNavBtn} onClick={handlePrevDay}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className={styles.dateCenter}>
              <span className={styles.dateLabel}>
                {selectedDate.toLocaleString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <input 
                type="date"
                className={styles.hiddenDateInput}
                value={selectedDateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  }
                }}
              />
            </div>
            <button className={styles.dateNavBtn} onClick={handleNextDay}>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <div className={styles.monthIncomeContainer}>
            <div className={styles.monthIncomeLeft}>
              <span className={styles.monthIncomeLabel}>Thu nhập của tháng</span>
              <span className={styles.monthIncomeAmount}>{formatMoney(monthIncome)}</span>
            </div>
            <button 
              className={styles.addIncomeBtn}
              onClick={() => {
                const salaryCat = categories.find(c => c.name.toLowerCase() === "lương");
                if (salaryCat) {
                  setSelectedCategoryId(salaryCat.id);
                  setTransactionType("income");
                  setTransactionAmount("");
                  setTransactionNote("");
                  setShowTransactionModal(true);
                } else {
                  alert("Không tìm thấy danh mục 'Lương'. Vui lòng thêm danh mục 'Lương' để nhập thu nhập.");
                }
              }}
            >
              <span className="material-symbols-outlined">add</span>
              Nhập thu nhập
            </button>
          </div>

          <span className={styles.balanceLabel}>Tài sản còn lại của tháng này</span>
          <div className={styles.balanceValue}>
            <h2 className={styles.amount}>{formatMoney(monthNetWorth)}</h2>
          </div>
        </section>

        {/* Bento Grid Insights */}
        <section className={styles.bentoGrid}>
          <div className={styles.bentoCard}>
            <span className="material-symbols-outlined filled">shopping_cart</span>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>Chi tiêu trong ngày</span>
              <p className={styles.cardValue}>{formatMoney(totalExpense)}</p>
            </div>
          </div>
        </section>

        {/* Expenditure Categories Section */}
        <section className={styles.categorySection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Danh mục thu chi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
              <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
                <span className="material-symbols-outlined">add_circle</span>
                Thêm danh mục
              </button>
              <button 
                className={styles.addBtn} 
                style={{ color: isDeleteMode ? 'var(--color-error, #cf6679)' : 'var(--color-secondary)' }}
                onClick={() => setIsDeleteMode(!isDeleteMode)}
              >
                <span className="material-symbols-outlined">{isDeleteMode ? 'cancel' : 'remove_circle'}</span>
                {isDeleteMode ? 'Hủy xóa' : 'Xóa danh mục'}
              </button>
            </div>
          </div>

          <div className={styles.categoryList}>
            {categories.filter(c => c.name.toLowerCase() !== "lương").map((cat) => {
              const catTx = todaysTx.filter(t => t.categoryId === cat.id);
              return (
                <CategoryItem 
                  key={cat.id}
                  name={cat.name} 
                  icon={cat.icon} 
                  transactions={catTx}
                  formatMoney={formatMoney}
                  onAdd={() => handleQuickAdd(cat.id)}
                  onDelete={() => handleDeleteCategory(cat.id, cat.name)}
                  isDeleteMode={isDeleteMode}
                  onDeleteTx={deleteTransaction}
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
            <input
              type="number"
              className={styles.modalInput}
              placeholder="Số tiền (VND)"
              min={0}
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className={styles.modalInput}
              placeholder="Ghi chú (tùy chọn)"
              value={transactionNote}
              onChange={(e) => setTransactionNote(e.target.value)}
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

function CategoryItem({ name, icon, transactions, formatMoney, onAdd, onDelete, isDeleteMode, onDeleteTx }: {
  name: string;
  icon: string;
  transactions: Array<{ id: string; amount: number; type: string; note?: string; createdAt?: any }>;
  formatMoney: (vnd: number) => string;
  onAdd: () => void;
  onDelete: () => void;
  isDeleteMode: boolean;
  onDeleteTx: (txId: string) => void;
}) {
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!deletingTxId) return;

    const handleClickOutside = () => {
      setDeletingTxId(null);
    };

    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => document.removeEventListener("click", handleClickOutside);
  }, [deletingTxId]);

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
    <div className={styles.categoryItem} onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
      <div className={styles.itemTop}>
        <div className={styles.itemLeft}>
          <div className={styles.itemInfo}>
            <span className={styles.itemName}>{name}</span>
            {displayAmount && <p className={styles.itemAmount}>{displayAmount}</p>}
          </div>
        </div>
        <div className={styles.itemRight} style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className={styles.quickAdd} 
            style={{ backgroundColor: isDeleteMode ? 'var(--color-error, #cf6679)' : 'var(--color-primary)' }}
            onClick={(e) => {
              e.stopPropagation();
              if (isDeleteMode) {
                onDelete();
              } else {
                onAdd();
              }
            }}
          >
            <span className="material-symbols-outlined">{isDeleteMode ? 'remove' : 'add'}</span>
          </button>
        </div>
      </div>
      {transactions.length > 0 && (
        <div className={styles.transactionScroll}>
          {transactions.map((tx) => (
            <button 
              key={tx.id} 
              className={`${styles.txTag} ${deletingTxId === tx.id ? styles.txTagDeleting : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (deletingTxId === tx.id) {
                  onDeleteTx(tx.id);
                  setDeletingTxId(null);
                } else {
                  setDeletingTxId(tx.id);
                }
              }}
            >
              {deletingTxId === tx.id ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>remove</span>
                  Xóa
                </>
              ) : (
                <>{tx.type === "income" ? '+' : '-'}{formatMoney(tx.amount)}</>
              )}
            </button>
          ))}
        </div>
      )}

      {isExpanded && transactions.length > 0 && (
        <div className={styles.expandedTxList}>
          {transactions.map(tx => {
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
