"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { CatalogueList } from "@/components/catalogue-list";
import { PageHeader } from "@/components/page-header";

export default function CategoriesPage() {
  const { t } = useI18n();

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("دليل الخدمات")}
        title={t("التصنيفات")}
        description={t("نظّم الخدمات داخل تصنيفات واضحة وقابلة للبحث.")}
      />
      <CatalogueList type="categories" />
    </AdminShell>
  );
}
