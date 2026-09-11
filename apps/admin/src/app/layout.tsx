import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "لوحة إدارة خدماتك",
  description: "إدارة منصة الخدمات المحلية",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar-SA" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
