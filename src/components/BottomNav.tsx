"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const navItems = [
  { href: "/", icon: "home_app_logo", label: "Tổng quan" },
  { href: "/statistics", icon: "equalizer", label: "Thống kê" },
  { href: "/ai-assistant", icon: "bubble_chart", label: "Trợ lý AI" },
  { href: "/profile", icon: "person", label: "Tài khoản" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive ? styles.active : ""}`}
          >
            <span
              className={`material-symbols-outlined ${styles.navIcon} ${isActive ? "filled" : ""}`}
              style={
                isActive
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {item.icon}
            </span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
