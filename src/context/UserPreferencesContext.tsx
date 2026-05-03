"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile, setUserProfile } from "@/lib/firestoreService";
import {
  formatStoredVnd,
  type DisplayCurrency,
} from "@/lib/currencyFormat";

export type { DisplayCurrency };

interface UserPreferencesContextType {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => Promise<void>;
  budgetAlertsEnabled: boolean;
  setBudgetAlertsEnabled: (on: boolean) => Promise<void>;
  /** Chuỗi hiển thị (đơn giá trị trong DB là VND). */
  formatMoney: (amountVnd: number) => string;
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

function normalizeCurrency(v: unknown): DisplayCurrency {
  return v === "USD" ? "USD" : "VND";
}

export function UserPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<DisplayCurrency>("VND");
  const [budgetAlertsEnabled, setBudgetAlertsState] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      let stale = false;
      queueMicrotask(() => {
        if (stale) return;
        setCurrencyState("VND");
        setBudgetAlertsState(false);
      });
      return () => {
        stale = true;
      };
    }
    let cancelled = false;
    getUserProfile(user.uid).then((p) => {
      if (cancelled || !p) return;
      setCurrencyState(normalizeCurrency(p.currency));
      setBudgetAlertsState(Boolean(p.budgetAlertsEnabled));
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const setCurrency = useCallback(
    async (c: DisplayCurrency) => {
      setCurrencyState(c);
      if (user?.uid) {
        await setUserProfile(user.uid, { currency: c });
      }
    },
    [user]
  );

  const setBudgetAlertsEnabled = useCallback(
    async (on: boolean) => {
      if (typeof window !== "undefined" && on && "Notification" in window) {
        const p = Notification.permission;
        if (p === "default") {
          await Notification.requestPermission();
        }
      }
      setBudgetAlertsState(on);
      if (user?.uid) {
        await setUserProfile(user.uid, { budgetAlertsEnabled: on });
      }
    },
    [user]
  );

  const formatMoney = useCallback(
    (amountVnd: number) => formatStoredVnd(amountVnd, currency),
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      budgetAlertsEnabled,
      setBudgetAlertsEnabled,
      formatMoney,
    }),
    [
      budgetAlertsEnabled,
      currency,
      formatMoney,
      setBudgetAlertsEnabled,
      setCurrency,
    ]
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (ctx === undefined) {
    throw new Error(
      "useUserPreferences must be used within UserPreferencesProvider"
    );
  }
  return ctx;
}
