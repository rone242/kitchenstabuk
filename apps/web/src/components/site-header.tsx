import Image from "next/image";
import Link from "next/link";
import { getI18n } from "@/lib/locale";
import { catalogueFetch } from "@/lib/catalogue";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

interface Branding {
  logo: {
    publicUrl: string | null;
    altTextAr: string | null;
    altTextEn: string | null;
    width: number | null;
    height: number | null;
  } | null;
}

export async function SiteHeader() {
  const { locale, t } = await getI18n();
  const branding = await catalogueFetch<Branding>("branding", locale).catch(
    () => null,
  );
  const logo = branding?.logo;
  return (
    <header className="site-header">
      <Link className="brand" href={`/${locale}`} aria-label={t("خدماتك")}>
        {logo?.publicUrl ? (
          <Image
            className="site-logo"
            src={logo.publicUrl}
            alt={
              (locale === "en" ? logo.altTextEn : logo.altTextAr) ||
              logo.altTextAr ||
              t("خدماتك")
            }
            width={logo.width || 180}
            height={logo.height || 60}
            unoptimized
            priority
          />
        ) : (
          t("خدماتك")
        )}
      </Link>
      <div className="site-header-controls">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
