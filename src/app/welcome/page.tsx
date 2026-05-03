"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

export default function WelcomePage() {
  const { completeOnboarding } = useAuth();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className="material-symbols-outlined">account_balance</span>
          <h1>MONO LEDGER</h1>
        </div>
        <Link href="/login" className={styles.loginBtn}>
          ĐĂNG NHẬP
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.heroSection}>
          <Image
            src="/welcome_hero_vogue_1776148688737.png"
            alt="Minimalist Architecture"
            fill
            className={styles.heroImage}
            priority
          />
          <div className={styles.heroOverlay}></div>
          <div className={styles.heroReference}>
            <div className={styles.refLine}></div>
            <span>Mẫu 001-A / Xưởng Tài Chính</span>
          </div>
        </div>

        <div className={styles.contentSection}>
          <div className={styles.contentInner}>
            <div className={styles.badge}>TRẢI NGHIỆM CAO CẤP</div>
            <h2 className={styles.title}>
              Xây dựng Tương lai<br />
              Tài chính của bạn
            </h2>
            <p className={styles.description}>
              Một môi trường được thiết kế tinh xảo cho kiến trúc tài chính của bạn. 
              Biến dữ liệu thô thành sự rõ ràng thông qua các thông tin chi tiết đột phá.
            </p>

            <div className={styles.actions}>
              <button onClick={completeOnboarding} className={styles.primaryBtn}>
                <span>Bắt đầu ngay</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              
              <div className={styles.footerNote}>
                <span>Đã có tài khoản?</span>
                <Link href="/login" className={styles.textBtn}>ĐĂNG NHẬP</Link>
              </div>
            </div>

            <div className={styles.metadata}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Độ chính xác</span>
                <span className={styles.metaValue}>100% Trung thực dữ liệu</span>
              </div>
              <div className={styles.metaDivider}></div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Bảo mật</span>
                <span className={styles.metaValue}>Hệ thống Quản lí tài chính</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className={styles.floatingArtifact}>
        <div className={styles.artifactGlass}>
          <div className={styles.artifactTop}>
            <div className={styles.artifactIcon}>
              <span className="material-symbols-outlined filled">trending_up</span>
            </div>
            <div className={styles.artifactStats}>
              <span className={styles.artifactLabel}>Tăng trưởng</span>
              <span className={styles.artifactValue}>+12.4%</span>
            </div>
          </div>
          <div className={styles.artifactDivider}></div>
          <p className={styles.artifactQuote}>&quot;Sự phức tạp được tinh gọn thành hình thức thanh lịch nhất.&quot;</p>
        </div>
      </div>
    </div>
  );
}
