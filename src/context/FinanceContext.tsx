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
  deleteCategory as fsDeleteCategory,
  seedDefaultCategories,
  getAllBudgets,
  setBudget as fsSetBudget,
  deleteBudget as fsDeleteBudget,
  deleteTransactions as fsDeleteTransactions,
  getTransactionsFromCache,
  getCategoriesFromCache,
  getAllBudgetsFromCache,
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
  deleteCategory: (catId: string) => Promise<void>;
  setBudget: (budget: Omit<Budget, "id" | "userId" | "createdAt">) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  getTransactionsByDate: (dateStr: string) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getTransactionsByYear: (year: number) => Transaction[];
  getNetWorthAsOfDate: (dateStr: string) => number;
  deleteTransactionsData: (condition: { type: "date"; dateStr: string } | { type: "month"; year: number; month: number } | { type: "year"; year: number } | { type: "all" }) => Promise<void>;
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
    // Attempt cache first for instant loading
    try {
      const [txsCache, catsCache, budsCache] = await Promise.all([
        getTransactionsFromCache(uid),
        getCategoriesFromCache(uid),
        getAllBudgetsFromCache(uid),
      ]);
      // If we have categories in cache, it's not a fresh install
      if (catsCache.length > 0) {
        setTransactions(txsCache);
        setCategories(catsCache);
        setBudgets(budsCache);
        setIsReady(true);
      } else {
        setIsReady(false);
      }
    } catch (e) {
      setIsReady(false);
    }

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
    const catName = categories.find((c) => c.id === tx.categoryId)?.name || "Khác";
    const newId = await fsAddTransaction(user.uid, tx, catName);
    setTransactions((prev) => [{ ...tx, id: newId, userId: user.uid }, ...prev]);
  };

  const deleteTransaction = async (txId: string) => {
    const oldData = transactions.find(t => t.id === txId);
    const catName = oldData ? categories.find(c => c.id === oldData.categoryId)?.name || "Khác" : "Khác";
    await fsDeleteTransaction(txId, oldData, catName);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  const deleteTransactionsData = async (
    condition: { type: "date"; dateStr: string } | { type: "month"; year: number; month: number } | { type: "year"; year: number } | { type: "all" }
  ) => {
    if (!user?.uid) return;
    await fsDeleteTransactions(user.uid, condition);
    // Sau khi xóa dữ liệu trên db, gọi reload để fetch lại state hoặc filter local state
    // Cách dễ nhất là tải lại từ db
    await loadAll(user.uid);
  };

  const updateTransaction = async (
    txId: string,
    data: Partial<Omit<Transaction, "id" | "userId" | "createdAt">>
  ) => {
    const oldData = transactions.find(t => t.id === txId);
    await fsUpdateTransaction(txId, data, oldData);
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
  
  const deleteCategory = async (catId: string) => {
    await fsDeleteCategory(catId);
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    // Also remove associated transactions locally to keep state clean
    setTransactions((prev) => prev.filter((t) => t.categoryId !== catId));
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

  const deleteBudget = async (budgetId: string) => {
    if (!user?.uid) return;
    await fsDeleteBudget(budgetId);
    setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
  };

  // ── Query helpers ──────────────────────────────────────────────────────────
  const getTransactionsByDate = (dateStr: string) =>
    transactions.filter((tx) => tx.date === dateStr);

  const getTransactionsByMonth = (year: number, month: number) =>
    transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

  const getTransactionsByYear = (year: number) =>
    transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === year;
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
        deleteCategory,
        setBudget,
        deleteBudget,
        getTransactionsByDate,
        getTransactionsByMonth,
        getTransactionsByYear,
        getNetWorthAsOfDate,
        deleteTransactionsData,
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
