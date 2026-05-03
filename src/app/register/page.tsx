"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

export default function RegisterPage() {
  const { login } = useAuth(); // Using login mock for register too

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Quản lí tài chính</span>
        </div>
        <div className={styles.step}>
          <span>Bước 01 / 01</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Tham gia hệ thống</h1>
          <p className={styles.subtitle}>Bắt đầu hành trình quản lý tài chính chính xác của bạn.</p>
        </div>

        <form className={styles.form} onSubmit={(e) => { e.preventDefault(); login(); }}>
          <div className={styles.inputGroup}>
            <label>Họ và tên</label>
            <input type="text" placeholder="ALEXANDER VOGUE" required />
          </div>

          <div className={styles.inputGroup}>
            <label>Địa chỉ Email</label>
            <input type="email" placeholder="ARCHITECT@MONO.CO" required />
          </div>

          <div className={styles.inputGroup}>
            <label>Mật khẩu</label>
            <div className={styles.passwordWrapper}>
              <input type="password" placeholder="••••••••" required />
              <button type="button" className={styles.toggleVisibility}>
                <span className="material-symbols-outlined">visibility</span>
              </button>
            </div>
          </div>

          <button type="submit" className={styles.primaryBtn}>
            TẠO TÀI KHOẢN
          </button>
        </form>

        <div className={styles.divider}>
          <div className={styles.line}></div>
          <span>hoặc kết nối qua</span>
          <div className={styles.line}></div>
        </div>

        <div className={styles.socialGrid}>
          <button className={styles.socialBtn}>
            <div className={styles.socialContent}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.91 3.22-1.91 4.22c-1.23 1.23-3.15 2.57-7.85 2.57c-7.31 0-13.07-5.93-13.07-13.24s5.76-13.24 13.07-13.24c4.01 0 7.07 1.58 9.3 3.66l2.32-2.32C19.21 3.01 16.24 1 12.48 1c-6.62 0-12 5.38-12 12s5.38 12 12 12c3.58 0 6.28-1.18 8.4-3.4c2.18-2.18 2.87-5.26 2.87-7.7c0-.52-.04-1.01-.12-1.46z" />
              </svg>
              <span>Google</span>
            </div>
          </button>
          <button className={styles.socialBtn}>
            <div className={styles.socialContent}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.96.95-2.22 1.72-3.71 1.72c-1.47 0-2.25-.86-3.74-.86c-1.5 0-2.39.84-3.71.84c-1.5 0-2.98-1.03-4.14-2.82c-2.33-3.64-1.78-8.99.71-11.02c1.24-1.01 2.61-1.57 3.94-1.57c1.47 0 2.37.86 3.73.86c1.36 0 2.05-.86 3.71-.86c1.11 0 2.38.4 3.4 1.23c-2.45 1.4-2.03 5.09.43 6.13c-.56 1.39-1.28 2.76-1.92 3.49M13.2 2.34c0 1.63-1.34 3.42-3.13 3.42c-.14 0-.28-.01-.39-.03c-.02-1.76 1.41-3.52 3.01-3.52c.18 0 .34.01.51.03c.01.03.01.07.01.1z" />
              </svg>
              <span>Apple</span>
            </div>
          </button>
        </div>

        <div className={styles.footerLink}>
          Đã có tài khoản? 
          <Link href="/login" className={styles.link}>Đăng nhập</Link>
        </div>
      </main>

      <footer className={styles.legal}>
        <p>
          Bằng việc tạo tài khoản, bạn đồng ý với <br />
          <span className={styles.underlined}>Điều khoản dịch vụ</span> và <span className={styles.underlined}>Chính sách bảo mật</span>
        </p>
      </footer>

      <div className={styles.noiseOverlay}></div>
      <div className={styles.decorativeCorner}></div>
    </div>
  );
}
