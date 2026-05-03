"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { checkAndNotifyBudgetAlerts } from "@/lib/budgetNotifications";
import {
  getTransactions,
  addTransaction as fsAddTransaction,
  deleteTransaction as fsDeleteTransaction,
  updateTransaction as fsUpdateTransaction,
  getCategories,
  addCategory as fsAddCategory,
  seedDefaultCategories,
  getAllBudgets,
  setBudget as fsSetBudget,
  deleteBudget as fsDeleteBudget,
} from "@/lib/firestoreService";
import type {
  Transaction,
  Category,
  Budget,
} from "@/lib/firestoreService";

// Re-export types so existing imports still work
export type { Transaction, Category };

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  addTransaction: (tx: Omit<Transaction, "id" | "userId" | "createdAt">) => Promise<void>;
  deleteTransaction: (txId: string) => Promise<void>;
  updateTransaction: (txId: string, data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>) => Promise<void>;
  addCategory: (cat: Omit<Category, "id" | "userId" | "createdAt">) => Promise<void>;
  setBudget: (budget: Omit<Budget, "id" | "userId" | "createdAt">) => Promise<void>;
  deleteBudget: (categoryName: string, year: number, month: number) => Promise<void>;
  getTransactionsByDate: (dateStr: string) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getNetWorthAsOfDate: (dateStr: string) => number;
  isReady: boolean;
  reload: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { budgetAlertsEnabled } = useUserPreferences();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isReady, setIsReady] = useState(false);

  // ── Load all data from Firestore ──────────────────────────────────────────
  const loadAll = useCallback(async (uid: string) => {
    setIsReady(false);
    try {
      const [txs, cats, buds] = await Promise.all([
        getTransactions(uid),
        getCategories(uid),
        getAllBudgets(uid),
      ]);

      // Seed default categories if this is a new user
      if (cats.length === 0) {
        await seedDefaultCategories(uid);
        const seeded = await getCategories(uid);
        setCategories(seeded);
      } else {
        setCategories(cats);
      }

      setTransactions(txs);
      setBudgets(buds);
    } catch (err) {
      console.error("Firestore load error:", err);
    } finally {
      setIsReady(true);
    }
  }, []);

  // Re-run whenever auth user changes
  useEffect(() => {
    if (user?.uid) {
      loadAll(user.uid);
    } else {
      // Clear state when logged out
      setTransactions([]);
      setCategories([]);
      setBudgets([]);
      setIsReady(false);
    }
  }, [user?.uid, loadAll]);

  useEffect(() => {
    if (!user?.uid || !isReady) return;
    const permission =
      typeof Notification !== "undefined" ? Notification.permission : "denied";
    const now = new Date();
    const catName = (categoryId: string) =>
      categories.find((c) => c.id === categoryId)?.name ?? "Khác";
    checkAndNotifyBudgetAlerts({
      enabled: budgetAlertsEnabled,
      permission,
      year: now.getFullYear(),
      monthIndex0: now.getMonth(),
      monthIndex1: now.getMonth() + 1,
      budgets,
      transactions,
      getCategoryName: catName,
    });
  }, [
    budgets,
    budgetAlertsEnabled,
    categories,
    isReady,
    transactions,
    user?.uid,
  ]);

  // ── Transactions ───────────────────────────────────────────────────────────
  const addTransaction = async (
    tx: Omit<Transaction, "id" | "userId" | "createdAt">
  ) => {
    if (!user?.uid) return;
    const newId = await fsAddTransaction(user.uid, tx);
    setTransactions((prev) => [{ ...tx, id: newId, userId: user.uid }, ...prev]);
  };

  const deleteTransaction = async (txId: string) => {
    await fsDeleteTransaction(txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  const updateTransaction = async (
    txId: string,
    data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>
  ) => {
    await fsUpdateTransaction(txId, data);
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, ...data } : t))
    );
  };

  // ── Categories ─────────────────────────────────────────────────────────────
  const addCategory = async (
    cat: Omit<Category, "id" | "userId" | "createdAt">
  ) => {
    if (!user?.uid) return;
    const newId = await fsAddCategory(user.uid, cat);
    setCategories((prev) => [...prev, { ...cat, id: newId, userId: user.uid }]);
  };

  // ── Budgets ────────────────────────────────────────────────────────────────
  const setBudget = async (
    budget: Omit<Budget, "id" | "userId" | "createdAt">
  ) => {
    if (!user?.uid) return;
    await fsSetBudget(user.uid, budget);
    // Refresh budgets from Firestore to get accurate state
    const updated = await getAllBudgets(user.uid);
    setBudgets(updated);
  };

  const deleteBudget = async (
    categoryName: string,
    year: number,
    month: number
  ) => {
    if (!user?.uid) return;
    await fsDeleteBudget(user.uid, categoryName, year, month);
    setBudgets((prev) =>
      prev.filter(
        (b) =>
          !(b.categoryName === categoryName && b.year === year && b.month === month)
      )
    );
  };

  // ── Query helpers ──────────────────────────────────────────────────────────
  const getTransactionsByDate = (dateStr: string) =>
    transactions.filter((tx) => tx.date === dateStr);

  const getTransactionsByMonth = (year: number, month: number) =>
    transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

  const getNetWorthAsOfDate = (dateStr: string) => {
    const target = new Date(dateStr);
    target.setHours(23, 59, 59, 999);
    let net = 0;
    for (const tx of transactions) {
      const txDate = new Date(tx.date);
      if (txDate <= target) {
        net += tx.type === "income" ? Math.abs(tx.amount) : -Math.abs(tx.amount);
      }
    }
    return net;
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        budgets,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        addCategory,
        setBudget,
        deleteBudget,
        getTransactionsByDate,
        getTransactionsByMonth,
        getNetWorthAsOfDate,
        isReady,
        reload: () => (user?.uid ? loadAll(user.uid) : Promise.resolve()),
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
