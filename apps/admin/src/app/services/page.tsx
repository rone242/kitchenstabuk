"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { CatalogueList } from "@/components/catalogue-list";
import { PageHeader } from "@/components/page-header";

export default function ServicesPage() {
  const { t } = useI18n();

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("دليل الخدمات")}
        title={t("الخدمات")}
        description={t(
          "أدر تفاصيل الخدمات والأسعار والنماذج والتغطية الجغرافية.",
        )}
      />
      <CatalogueList type="services" />
    </AdminShell>
  );
}
