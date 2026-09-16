import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LanguageProvider } from "@repo/i18n/client";
import { asLocale, translator } from "@repo/i18n";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const t = translator(asLocale((await cookies()).get("kst_locale")?.value));
  return {
    title: t("لوحة إدارة خدماتك"),
    description: t("إدارة منصة الخدمات المحلية"),
    robots: { index: false, follow: false },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = asLocale((await cookies()).get("kst_locale")?.value);
  return (
    <html
      lang={locale === "ar" ? "ar-SA" : "en"}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <body>
        <LanguageProvider initialLocale={locale}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
