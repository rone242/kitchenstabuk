"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "@/components/service-form";

export default function NewServicePage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("دليل الخدمات")}
        title={t("خدمة جديدة")}
        description={t("أضف محتوى الخدمة وسعرها ثم خصص نموذج الطلب والتغطية.")}
      />
      <ServiceForm />
    </AdminShell>
  );
}
