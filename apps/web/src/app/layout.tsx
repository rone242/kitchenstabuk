import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "خدماتك",
  description: "منصة سعودية لطلب الخدمات المحلية بسهولة وثقة",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar-SA" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
