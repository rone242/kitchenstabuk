"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { LocationManager } from "@/components/location-manager";
import { PageHeader } from "@/components/page-header";
export default function RegionsPage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("نطاق الخدمة")}
        title={t("المناطق")}
        description={t("إدارة المناطق الإدارية داخل المملكة.")}
      />
      <LocationManager kind="regions" />
    </AdminShell>
  );
}
