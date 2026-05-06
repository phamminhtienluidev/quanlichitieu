"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences, type DisplayCurrency } from "@/context/UserPreferencesContext";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { auth } from "@/lib/firebase";
import { getUserProfile, setUserProfile } from "@/lib/firestoreService";
import { resizeImageFileToJpeg, uploadProfileAvatarBlob } from "@/lib/profileAvatar";
import styles from "./page.module.css";

const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/gif";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được ảnh đã nén."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Định dạng ảnh không hợp lệ."));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(blob);
  });
}

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

  const [profileName, setProfileName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarHint, setAvatarHint] = useState<string | null>(null);

  const [budgetToggle, setBudgetToggle] = useState(budgetAlertsEnabled);

  useEffect(() => {
    setBudgetToggle(budgetAlertsEnabled);
  }, [budgetAlertsEnabled]);

  useEffect(() => {
    const saved = localStorage.getItem("profile_name");
    if (saved) setProfileName(saved);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setAvatarUrl(user?.photoURL ?? null);
      return;
    }
    let cancelled = false;
    getUserProfile(user.uid).then((p) => {
      if (cancelled) return;
      const fromDb = p?.photoURL?.trim();
      const fromAuth = user.photoURL?.trim();
      setAvatarUrl(fromDb || fromAuth || null);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.photoURL]);

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

  const triggerAvatarPick = () => {
    setAvatarHint(null);
    avatarFileRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.uid) return;
    if (!file.type.startsWith("image/")) {
      setAvatarHint("Chỉ được chọn file ảnh.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarHint("Ảnh tối đa 10MB.");
      return;
    }
    setAvatarHint(null);
    setAvatarBusy(true);
    try {
      const jpeg = await resizeImageFileToJpeg(file);
      let nextPhotoUrl: string;
      try {
        nextPhotoUrl = await uploadProfileAvatarBlob(user.uid, jpeg);
      } catch (storageErr) {
        // Storage thường lỗi do Rules/bucket; fallback sang data URL để user dùng được ngay.
        nextPhotoUrl = await blobToDataUrl(jpeg);
        if (storageErr instanceof FirebaseError) {
          setAvatarHint(`Storage lỗi (${storageErr.code}), đã lưu ảnh dự phòng.`);
        } else {
          setAvatarHint("Storage lỗi, đã lưu ảnh dự phòng.");
        }
      }

      await setUserProfile(user.uid, { photoURL: nextPhotoUrl });
      if (auth.currentUser && !nextPhotoUrl.startsWith("data:")) {
        await updateProfile(auth.currentUser, { photoURL: nextPhotoUrl });
      }
      setAvatarUrl(nextPhotoUrl);
    } catch (err) {
      console.error(err);
      if (err instanceof FirebaseError) {
        setAvatarHint(`Không tải ảnh lên được: ${err.code}`);
      } else if (err instanceof Error) {
        setAvatarHint(`Không tải ảnh lên được: ${err.message}`);
      } else {
        setAvatarHint("Không tải ảnh lên được.");
      }
    } finally {
      setAvatarBusy(false);
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
            <input
              ref={avatarFileRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className={styles.avatarFileInput}
              onChange={handleAvatarFileChange}
              aria-hidden
            />
            <button
              type="button"
              className={styles.avatarTouchable}
              onClick={triggerAvatarPick}
              disabled={avatarBusy}
              aria-label="Đổi ảnh đại diện"
            >
              <span className={styles.avatarSvgWrap}>
                {avatarBusy ? (
                  <span className={styles.avatarSpinner} />
                ) : avatarUrl ? (
                  // Firebase / OAuth URL động — không phù hợp next/image cố định
                  <img src={avatarUrl} alt="" className={styles.avatarPhoto} />
                ) : (
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={styles.avatarSvg}>
                    <rect width="100" height="100" fill="#dde1e5" />
                    <ellipse cx="50" cy="35" rx="18" ry="21" fill="#9aa3ae" />
                    <ellipse cx="50" cy="90" rx="32" ry="24" fill="#9aa3ae" />
                  </svg>
                )}
              </span>
              <span className={styles.avatarCamBadge} aria-hidden>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>photo_camera</span>
              </span>
            </button>
            <div className={styles.verifiedBadge}>
              <span className="material-symbols-outlined filled" style={{ fontVariationSettings: "'FILL' 1", fontSize: "16px" }}>verified</span>
            </div>
          </div>
          {avatarHint && (
            <p className={styles.avatarHint} role="status">
              {avatarHint}
            </p>
          )}

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
