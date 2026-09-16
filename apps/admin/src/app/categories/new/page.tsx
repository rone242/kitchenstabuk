"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { CategoryForm } from "@/components/category-form";
import { PageHeader } from "@/components/page-header";

export default function NewCategoryPage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("دليل الخدمات")}
        title={t("تصنيف جديد")}
        description={t("أضف تصنيفاً واضحاً يساعد العميل في الوصول إلى الخدمة.")}
      />
      <CategoryForm />
    </AdminShell>
  );
}
