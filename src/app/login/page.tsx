"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

export default function LoginPage() {
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoadingProvider("google");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Đăng nhập Google thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleFacebook = async () => {
    setError(null);
    setLoadingProvider("facebook");
    try {
      await signInWithFacebook();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Đăng nhập Facebook thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const isLoading = loadingProvider !== null;

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <Link href="/welcome" className={styles.closeBtn}>
          <span className="material-symbols-outlined">close</span>
        </Link>
        <h1 className={styles.logo}>MONO LEDGER</h1>
        <div className={styles.spacer}></div>
      </nav>

      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.subtitle}>Cổng bảo mật</p>
          <h2 className={styles.title}>ĐĂNG NHẬP</h2>
          <p className={styles.headerDesc}>
            Chọn phương thức đăng nhập của bạn để tiếp tục
          </p>
        </header>

        <section className={styles.socialSection}>
          {/* Google */}
          <button
            onClick={handleGoogle}
            className={styles.socialLargeBtn}
            disabled={isLoading}
          >
            <div className={styles.socialLargeIcon}>
              {loadingProvider === "google" ? (
                <div className={styles.spinner} />
              ) : (
                <svg viewBox="0 0 48 48" fill="none">
                  <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                  <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                  <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.31 0-9.821-3.317-11.63-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                  <path d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.245 44 30 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                </svg>
              )}
            </div>
            <div className={styles.socialLargeText}>
              <span className={styles.socialLargeLabel}>Tiếp tục với</span>
              <span className={styles.socialLargeName}>Google</span>
            </div>
            <span className="material-symbols-outlined" style={{ marginLeft: "auto", opacity: 0.4, fontSize: "1rem" }}>
              arrow_forward_ios
            </span>
          </button>

          {/* Facebook */}
          <button
            onClick={handleFacebook}
            className={styles.socialLargeBtn}
            disabled={isLoading}
          >
            <div className={styles.socialLargeIcon}>
              {loadingProvider === "facebook" ? (
                <div className={styles.spinner} />
              ) : (
                <svg viewBox="0 0 48 48" fill="none">
                  <path d="M24 4C12.954 4 4 12.954 4 24c0 9.953 7.27 18.211 16.8 19.75V29.5h-5.05V24h5.05v-4.025c0-5.063 2.99-7.862 7.578-7.862 2.2 0 4.497.394 4.497.394V17.5h-2.533c-2.496 0-3.277 1.547-3.277 3.135V24h5.563l-.889 5.5H27.065v14.25C36.73 42.211 44 33.953 44 24c0-11.046-8.954-20-20-20z" fill="#1877F2"/>
                  <path d="M30.739 29.5L31.628 24h-5.563v-3.365c0-1.588.781-3.135 3.277-3.135h2.533V12.507s-2.298-.394-4.497-.394c-4.588 0-7.578 2.799-7.578 7.862V24h-5.05v5.5h5.05v14.25A20.132 20.132 0 0024 44c1.362 0 2.698-.138 3.99-.397V29.5h-1.512z" fill="white"/>
                </svg>
              )}
            </div>
            <div className={styles.socialLargeText}>
              <span className={styles.socialLargeLabel}>Tiếp tục với</span>
              <span className={styles.socialLargeName}>Facebook</span>
            </div>
            <span className="material-symbols-outlined" style={{ marginLeft: "auto", opacity: 0.4, fontSize: "1rem" }}>
              arrow_forward_ios
            </span>
          </button>
        </section>

        {/* Error message */}
        {error && (
          <div className={styles.errorBox}>
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>error</span>
            <p>{error}</p>
          </div>
        )}

        <p className={styles.termsText}>
          Bằng cách đăng nhập, bạn đồng ý với{" "}
          <a href="#" className={styles.termsLink}>Điều khoản dịch vụ</a> và{" "}
          <a href="#" className={styles.termsLink}>Chính sách bảo mật</a> của chúng tôi.
        </p>
      </main>

      <div className={styles.bgArtifactRight}></div>
      <div className={styles.bgArtifactLeft}></div>
    </div>
  );
}
