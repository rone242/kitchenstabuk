import Link from "next/link";
import { getI18n } from "@/lib/locale";

export default async function NotFound() {
  const { t, locale } = await getI18n();
  return (
    <main className="catalogue empty">
      <h1>{t("الصفحة غير موجودة")}</h1>
      <Link href={`/${locale}`}>{t("العودة إلى الخدمات")}</Link>
    </main>
  );
}
