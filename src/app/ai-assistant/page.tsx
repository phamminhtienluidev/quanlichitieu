"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import styles from "./page.module.css";
import { useFinance } from "@/context/FinanceContext";

type Message = {
  id: string;
  role: "user" | "model";
  content: string;
};

export default function AIAssistantPage() {
  const { categories, budgets, getNetWorthAsOfDate, getTransactionsByMonth, isReady } = useFinance();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content: "Xin chào! Tôi là Trợ lý AI Tài chính của bạn. Tôi có thể phân tích xu hướng chi tiêu và đưa ra lời khuyên giúp bạn quản lý tài chính tốt hơn. Bạn muốn hỏi tôi điều gì hôm nay?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isReady) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Prepare context data (đồng bộ tháng hiện tại với màn Thống kê: month 1–12)
    const todayStr = new Date().toISOString().split("T")[0];
    const netWorth = getNetWorthAsOfDate(todayStr);

    const now = new Date();
    const y = now.getFullYear();
    const m0 = now.getMonth();
    const monthTx = getTransactionsByMonth(y, m0);
    const monthLabel = `${y}-${String(m0 + 1).padStart(2, "0")}`;

    const catName = (categoryId: string) =>
      categories.find((c) => c.id === categoryId)?.name || "Khác";

    let totalExpense = 0;
    let totalIncome = 0;
    const expenseByCategoryMap = new Map<string, { total: number; count: number }>();
    const incomeByCategoryMap = new Map<string, { total: number; count: number }>();

    for (const t of monthTx) {
      const name = catName(t.categoryId);
      if (t.type === "income") {
        totalIncome += t.amount;
        const cur = incomeByCategoryMap.get(name) || { total: 0, count: 0 };
        cur.total += t.amount;
        cur.count += 1;
        incomeByCategoryMap.set(name, cur);
      } else {
        totalExpense += t.amount;
        const cur = expenseByCategoryMap.get(name) || { total: 0, count: 0 };
        cur.total += t.amount;
        cur.count += 1;
        expenseByCategoryMap.set(name, cur);
      }
    }

    const expenseByCategory = [...expenseByCategoryMap.entries()]
      .map(([categoryName, { total, count }]) => ({
        categoryName,
        totalAmount: total,
        transactionCount: count,
        percentOfMonthExpense:
          totalExpense > 0 ? Math.round((total / totalExpense) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const incomeByCategory = [...incomeByCategoryMap.entries()]
      .map(([categoryName, { total, count }]) => ({
        categoryName,
        totalAmount: total,
        transactionCount: count,
        percentOfMonthIncome:
          totalIncome > 0 ? Math.round((total / totalIncome) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const monthIndex1 = m0 + 1;
    const monthBudgets = budgets.filter((b) => b.year === y && b.month === monthIndex1);
    const budgetsWithUsage = monthBudgets.map((b) => {
      const spent = monthTx
        .filter(
          (t) => t.type === "expense" && catName(t.categoryId) === b.categoryName
        )
        .reduce((s, t) => s + t.amount, 0);
      return {
        categoryName: b.categoryName,
        limitVnd: b.limit,
        spentVnd: spent,
        remainingVnd: b.limit - spent,
        percentOfLimitUsed:
          b.limit > 0 ? Math.round((spent / b.limit) * 1000) / 10 : null,
      };
    });

    const recentTx = monthTx.slice(0, 25).map((t) => ({
      amount: t.amount,
      type: t.type,
      category: catName(t.categoryId),
      date: t.date,
      ...(t.note ? { note: t.note } : {}),
    }));

    const contextData = {
      periodLabel: monthLabel,
      netWorth,
      totalExpense,
      totalIncome,
      expenseByCategory,
      incomeByCategory,
      budgetsWithUsage,
      recentTransactions: recentTx,
      categoriesSummary: categories.map((c) => ({ name: c.name, icon: c.icon })),
    };

    const conversation = [...messages, userMsg];
    const firstUserIdx = conversation.findIndex((msg) => msg.role === "user");
    const messagesForApi =
      firstUserIdx >= 0 ? conversation.slice(firstUserIdx) : conversation;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          contextData
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Lỗi kết nối");
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.message
      }]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi không xác định";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: `Xin lỗi, có lỗi xảy ra: ${msg}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* AI Insight Hero */}
        <section className={styles.heroSection}>
          <div className={styles.heroHeader}>
            <div className={styles.heroIcon}>
              <span className="material-symbols-outlined filled" style={{ fontVariationSettings: "'FILL' 1", color: "var(--color-on-primary)" }}>auto_awesome</span>
            </div>
            <div>
              <p className={styles.heroLabel}>Phân tích chi tiêu AI</p>
              <h2 className={styles.heroTitle}>Trợ lý thông minh</h2>
            </div>
          </div>
        </section>

        {/* Conversational Interface */}
        <section className={styles.chatSection}>
          <h3 className={styles.sectionTitle}>Lịch sử trò chuyện</h3>

          <div className={styles.chatList}>
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "model" ? styles.aiMsg : styles.userMsg}>
                <div className={msg.role === "model" ? styles.avatarAI : styles.avatarUser}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.875rem", color: msg.role === "model" ? "inherit" : "var(--color-on-primary)" }}>
                    {msg.role === "model" ? "auto_awesome" : "person"}
                  </span>
                </div>
                <div className={msg.role === "model" ? styles.msgBubbleAI : styles.msgBubbleUser}>
                  <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className={styles.aiMsg}>
                <div className={styles.avatarAI}>
                  <span className="material-symbols-outlined filled" style={{ fontSize: "0.875rem" }}>auto_awesome</span>
                </div>
                <div className={styles.msgBubbleAI}>
                  <p className={styles.loadingDots}>Đang phân tích<span>.</span><span>.</span><span>.</span></p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Suggested Actions */}
        <section className={styles.suggestSection}>
          <h3 className={styles.sectionTitleAlt}>Gợi ý câu hỏi</h3>
          <div className={styles.suggestList}>
            <div className={styles.suggestItem} onClick={() => setInput("Tháng này tôi tiêu nhiều nhất vào khoản nào?")}>
              <div className={styles.suggestLeft}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>pie_chart</span>
                <span>Phân tích chi tiêu tháng này</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: "0.875rem", color: "var(--color-outline-variant)" }}>arrow_upward</span>
            </div>
            <div className={styles.suggestItem} onClick={() => setInput("Tình hình ngân sách của tôi thế nào?")}>
              <div className={styles.suggestLeft}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>account_balance_wallet</span>
                <span>Đánh giá ngân sách</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: "0.875rem", color: "var(--color-outline-variant)" }}>arrow_upward</span>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Chat Input */}
      <div className={styles.floatingInput}>
        <div className={styles.inputBar}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>mic</span>
          <input 
            type="text" 
            placeholder="Hỏi về chi tiêu của bạn..." 
            className={styles.chatInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button className={styles.sendBtn} onClick={handleSend} disabled={isLoading || !input.trim()}>
            <span className="material-symbols-outlined" style={{ fontSize: "0.875rem", color: "var(--color-on-primary)" }}>arrow_upward</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </>
  );
}
