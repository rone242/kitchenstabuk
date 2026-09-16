"use client";
import Link from "next/link";
import { useI18n } from "@repo/i18n/client";
export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="panel">
      <h1>{t("الصفحة غير موجودة")}</h1>
      <Link href="/dashboard">{t("مركز التحكم")}</Link>
    </main>
  );
}
