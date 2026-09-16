import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { cookies, headers } from "next/headers";
import { LanguageProvider } from "@repo/i18n/client";
import { getI18n } from "@/lib/locale";
import { SiteHeader } from "@/components/site-header";
import { ContactButtons } from "@/components/contact-buttons";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const settings = await getSiteSettings(locale);
  const title =
    (locale === "en" ? settings.titleEn : settings.titleAr) || t("خدماتك");
  const description =
    (locale === "en" ? settings.descriptionEn : settings.descriptionAr) ||
    t("منصة سعودية لطلب الخدمات المحلية بسهولة وثقة");
  const images = settings.thumbnail?.publicUrl
    ? [settings.thumbnail.publicUrl]
    : undefined;
  const path = (await headers()).get("x-site-path") ?? `/${locale}`;
  const suffix = path.replace(/^\/(ar|en)/, "");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title,
    description,
    openGraph: { title, description, images },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
    alternates: {
      canonical: path,
      languages: {
        "ar-SA": `/ar${suffix}`,
        en: `/en${suffix}`,
        "x-default": `/ar${suffix}`,
      },
    },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = await getI18n();
  const settings = await getSiteSettings(locale);
  const preference = (await cookies()).get("kst_theme")?.value;
  const theme =
    preference === "light" || preference === "dark"
      ? preference
      : settings.theme || "system";
  return (
    <html
      data-theme={theme}
      lang={locale === "ar" ? "ar-SA" : "en"}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <body>
        <LanguageProvider initialLocale={locale}>
          <SiteHeader />
          {children}
          <ContactButtons
            className="floating-contact-buttons"
            phone={settings.phone}
            whatsapp={settings.whatsapp}
            locale={locale}
          />
        </LanguageProvider>
      </body>
    </html>
  );
}
