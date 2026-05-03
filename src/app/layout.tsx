import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FinanceProvider } from "@/context/FinanceContext";
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";

const inter = Inter({
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Quản lí tài chính — AI Chi tiêu thông minh",
  description: "Ứng dụng quản lý chi tiêu thông minh với trợ lý AI, thống kê tài chính và giao diện tối giản cao cấp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <UserPreferencesProvider>
            <FinanceProvider>{children}</FinanceProvider>
          </UserPreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
