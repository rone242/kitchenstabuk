"use client";
import { useI18n } from "@repo/i18n/client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="catalogue empty" role="alert">
      <h1>{t("حدث خطأ غير متوقع")}</h1>
      <button onClick={reset}>{t("إعادة المحاولة")}</button>
    </main>
  );
}
