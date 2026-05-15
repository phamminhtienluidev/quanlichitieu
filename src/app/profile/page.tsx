"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { useFinance } from "@/context/FinanceContext";
import { useUserPreferences, type DisplayCurrency } from "@/context/UserPreferencesContext";
import { SUPPORT_EMAIL } from "@/lib/constants";
import styles from "./page.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    currency,
    setCurrency,
    budgetAlertsEnabled,
    setBudgetAlertsEnabled,
    formatMoney,
  } = useUserPreferences();
  const { deleteTransactionsData } = useFinance();

  const [profileName, setProfileName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);


  const [budgetToggle, setBudgetToggle] = useState(budgetAlertsEnabled);

  // States for delete data
  const [deleteMode, setDeleteMode] = useState<"date" | "month" | "year" | "all">("month");
  const [deleteDate, setDeleteDate] = useState("");
  const [deleteMonth, setDeleteMonth] = useState("");
  const [deleteYear, setDeleteYear] = useState(new Date().getFullYear().toString());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setBudgetToggle(budgetAlertsEnabled);
  }, [budgetAlertsEnabled]);

  useEffect(() => {
    const saved = localStorage.getItem("profile_name");
    if (saved) setProfileName(saved);
  }, []);



  const handleStartEdit = () => {
    setNameInput(profileName);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    setProfileName(trimmed);
    localStorage.setItem("profile_name", trimmed);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") setIsEditingName(false);
  };

  const handleBudgetToggle = async () => {
    const next = !budgetToggle;
    setBudgetToggle(next);
    try {
      await setBudgetAlertsEnabled(next);
    } catch {
      setBudgetToggle(!next);
    }
  };

  const handleCurrencyPick = async (next: DisplayCurrency) => {
    if (next === currency) return;
    await setCurrency(next);
  };

  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Hỗ trợ & cải tiến ứng dụng Quản lý chi tiêu")}`;



  const handleDeleteData = async () => {
    let condition: any = null;
    let confirmMsg = "";

    if (deleteMode === "date") {
      if (!deleteDate) return alert("Vui lòng chọn ngày");
      condition = { type: "date", dateStr: deleteDate };
      confirmMsg = `Bạn có chắc muốn xóa toàn bộ giao dịch trong ngày ${deleteDate.split("-").reverse().join("/")}?`;
    } else if (deleteMode === "month") {
      if (!deleteMonth) return alert("Vui lòng chọn tháng");
      const [y, m] = deleteMonth.split("-");
      condition = { type: "month", year: Number(y), month: Number(m) };
      confirmMsg = `Bạn có chắc muốn xóa toàn bộ giao dịch trong tháng ${m}/${y}?`;
    } else if (deleteMode === "year") {
      if (!deleteYear) return alert("Vui lòng nhập năm");
      condition = { type: "year", year: Number(deleteYear) };
      confirmMsg = `Bạn có chắc muốn xóa toàn bộ giao dịch trong năm ${deleteYear}?`;
    } else if (deleteMode === "all") {
      condition = { type: "all" };
      confirmMsg = "CẢNH BÁO: Bạn sắp xóa TẤT CẢ giao dịch thu chi. Dữ liệu không thể khôi phục. Bạn có chắc chắn?";
    }

    if (!condition) return;

    if (confirm(confirmMsg)) {
      setIsDeleting(true);
      try {
        await deleteTransactionsData(condition);
        alert("Xóa dữ liệu thành công!");
      } catch (e) {
        alert("Lỗi khi xóa dữ liệu");
        console.error(e);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button type="button" className={styles.iconBtn} onClick={() => router.back()}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className={styles.headerTitle}>Hồ sơ</h1>
          </div>
          <button type="button" className={styles.iconBtn} aria-hidden>
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatarTouchable}>
              <span className={styles.avatarSvgWrap}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className={styles.avatarPhoto} />
                ) : (
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={styles.avatarSvg}>
                    <rect width="100" height="100" fill="#dde1e5" />
                    <ellipse cx="50" cy="35" rx="18" ry="21" fill="#9aa3ae" />
                    <ellipse cx="50" cy="90" rx="32" ry="24" fill="#9aa3ae" />
                  </svg>
                )}
              </span>
            </div>
            <div className={styles.verifiedBadge}>
              <span className="material-symbols-outlined filled" style={{ fontVariationSettings: "'FILL' 1", fontSize: "16px" }}>verified</span>
            </div>
          </div>

          {isEditingName ? (
            <div className={styles.nameEditRow}>
              <input
                ref={nameInputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={styles.nameInput}
                placeholder="Nhập tên của bạn..."
                maxLength={40}
              />
              <button type="button" className={styles.nameSaveBtn} onClick={handleSaveName}>Lưu</button>
              <button type="button" className={styles.nameCancelBtn} onClick={() => setIsEditingName(false)}>Hủy</button>
            </div>
          ) : (
            <div className={styles.nameRow}>
              {profileName ? (
                <h2 className={styles.profileName}>{profileName}</h2>
              ) : (
                <p className={styles.namePlaceholder}>Chưa có tên — nhấn để thêm</p>
              )}
              <button type="button" className={styles.nameEditBtn} onClick={handleStartEdit} title="Chỉnh sửa tên">
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>
          )}

          <p className={styles.profileEmail}>Tài khoản cá nhân</p>
          <p className={styles.previewMoney} aria-live="polite">
            Ví dụ định dạng: {formatMoney(1_234_567)}
          </p>
        </section>

        <SettingsGroup title="Cài đặt ứng dụng">
          <div className={styles.settingsItemStatic}>
            <div className={styles.settingsLeft}>
              <div className={styles.settingsIcon}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>notifications_active</span>
              </div>
              <div className={styles.settingsTextCol}>
                <span className={styles.settingsLabel}>Cảnh báo ngân sách</span>
                <span className={styles.settingsHint}>
                  Thông báo trên thiết bị khi chi tiêu gần (~90%) hoặc vượt hạn mức tháng hiện tại (cần cho phép thông báo trình duyệt / PWA).
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={budgetToggle}
              className={`${styles.toggle} ${budgetToggle ? styles.toggleActive : ""}`}
              onClick={handleBudgetToggle}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          <div className={styles.settingsItemStatic}>
            <div className={styles.settingsLeft}>
              <div className={styles.settingsIcon}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>payments</span>
              </div>
              <div className={styles.settingsTextCol}>
                <span className={styles.settingsLabel}>Đơn vị tiền tệ</span>
                <span className={styles.settingsHint}>
                  Chỉ đổi cách hiển thị; giao dịch vẫn lưu bằng VND quy đổi khi xem USD.
                </span>
              </div>
            </div>
            <div className={styles.currencySeg} role="group" aria-label="Chọn đơn vị tiền tệ">
              <button
                type="button"
                className={`${styles.currencySegBtn} ${currency === "VND" ? styles.currencySegBtnActive : ""}`}
                onClick={() => handleCurrencyPick("VND")}
              >
                VND
              </button>
              <button
                type="button"
                className={`${styles.currencySegBtn} ${currency === "USD" ? styles.currencySegBtnActive : ""}`}
                onClick={() => handleCurrencyPick("USD")}
              >
                USD
              </button>
            </div>
          </div>


          <a href={supportHref} className={`${styles.settingsItemStatic} ${styles.settingsMailLink}`}>
            <div className={styles.settingsLeft}>
              <div className={styles.settingsIcon}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>mail</span>
              </div>
              <div className={styles.settingsTextCol}>
                <span className={styles.settingsLabel}>Liên hệ hỗ trợ và cải tiến</span>
                <span className={styles.settingsHint}>{SUPPORT_EMAIL}</span>
              </div>
            </div>
            <span className={`material-symbols-outlined ${styles.settingsAction}`}>open_in_new</span>
          </a>
        </SettingsGroup>

        <SettingsGroup title="Quản lý dữ liệu">
          <div className={styles.settingsItemStatic} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className={styles.settingsLeft} style={{ marginBottom: '1rem' }}>
              <div className={styles.settingsIcon}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-error, #cf6679)" }}>delete_sweep</span>
              </div>
              <div className={styles.settingsTextCol}>
                <span className={styles.settingsLabel}>Xóa dữ liệu giao dịch</span>
                <span className={styles.settingsHint}>Xóa các giao dịch theo khoảng thời gian tùy chọn. Không thể hoàn tác.</span>
              </div>
            </div>

            <div className={styles.deleteDataForm}>
              <div className={styles.deleteModeTabs}>
                <button 
                  type="button" 
                  className={`${styles.deleteModeTab} ${deleteMode === "date" ? styles.deleteModeTabActive : ""}`} 
                  onClick={() => setDeleteMode("date")}
                >
                  Ngày
                </button>
                <button 
                  type="button" 
                  className={`${styles.deleteModeTab} ${deleteMode === "month" ? styles.deleteModeTabActive : ""}`} 
                  onClick={() => setDeleteMode("month")}
                >
                  Tháng
                </button>
                <button 
                  type="button" 
                  className={`${styles.deleteModeTab} ${deleteMode === "year" ? styles.deleteModeTabActive : ""}`} 
                  onClick={() => setDeleteMode("year")}
                >
                  Năm
                </button>
                <button 
                  type="button" 
                  className={`${styles.deleteModeTab} ${deleteMode === "all" ? styles.deleteModeTabActive : ""}`} 
                  onClick={() => setDeleteMode("all")}
                >
                  Tất cả
                </button>
              </div>

              <div className={styles.deleteInputWrapper}>
                {deleteMode === "date" && (
                  <input type="date" value={deleteDate} onChange={e => setDeleteDate(e.target.value)} className={styles.deleteInput} />
                )}
                {deleteMode === "month" && (
                  <input type="month" value={deleteMonth} onChange={e => setDeleteMonth(e.target.value)} className={styles.deleteInput} />
                )}
                {deleteMode === "year" && (
                  <input type="number" placeholder="Nhập năm (VD: 2026)" value={deleteYear} onChange={e => setDeleteYear(e.target.value)} className={styles.deleteInput} />
                )}
                {deleteMode === "all" && (
                  <p className={styles.deleteWarningText}>Tất cả giao dịch thu chi của bạn sẽ bị xóa vĩnh viễn.</p>
                )}
              </div>

              <button 
                type="button" 
                className={styles.deleteActionBtn} 
                onClick={handleDeleteData}
                disabled={isDeleting}
              >
                {isDeleting ? "Đang xóa..." : "Tiến hành xóa"}
              </button>
            </div>
          </div>
        </SettingsGroup>

        <footer className={styles.footer}>
          <button type="button" className={styles.signOutBtn} onClick={() => logout()}>Đăng xuất</button>
          <p className={styles.versionText}>Quản lí tài chính — v4.12.0</p>
        </footer>
      </main>
      <BottomNav />
    </>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.settingsGroup}>
      <h4 className={styles.groupTitle}>{title}</h4>
      <div className={styles.groupCard}>{children}</div>
    </div>
  );
}

function SettingsButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button type="button" className={`${styles.settingsItem} ${styles.settingsItemMuted}`}>
      <div className={styles.settingsLeft}>
        <div className={styles.settingsIcon}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>{icon}</span>
        </div>
        <span className={styles.settingsLabel}>{label}</span>
      </div>
      <span className={`material-symbols-outlined ${styles.settingsAction}`}>chevron_right</span>
    </button>
  );
}
