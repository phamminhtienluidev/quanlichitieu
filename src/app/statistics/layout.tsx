import type { ReactNode } from "react";

/**
 * Layout riêng cho /statistics giúp Next App Router/Turbopack
 * luôn gắn đúng segment lồng (ví dụ /statistics/daily) thay vì lẫn về not-found.
 */
export default function StatisticsLayout({ children }: { children: ReactNode }) {
  return children;
}
