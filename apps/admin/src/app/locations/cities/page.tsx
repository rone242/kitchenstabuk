"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { LocationManager } from "@/components/location-manager";
import { PageHeader } from "@/components/page-header";
export default function CitiesPage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("نطاق الخدمة")}
        title={t("المدن")}
        description={t("أضف المدن النشطة لإظهارها في قسم المواقع بالموقع.")}
      />
      <LocationManager kind="cities" />
    </AdminShell>
  );
}
