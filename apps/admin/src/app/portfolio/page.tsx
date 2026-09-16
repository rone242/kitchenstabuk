"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { PortfolioManager } from "@/components/portfolio-manager";

export default function PortfolioPage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("المحتوى")}
        title={t("الأعمال السابقة")}
        description={t("أضف تفاصيل وصور قبل وبعد للمشاريع المنجزة.")}
      />
      <PortfolioManager />
    </AdminShell>
  );
}
