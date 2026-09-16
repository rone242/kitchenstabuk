"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { LocationManager } from "@/components/location-manager";
import { PageHeader } from "@/components/page-header";
export default function DistrictsPage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("نطاق الخدمة")}
        title={t("الأحياء")}
        description={t("إدارة الأحياء وربطها بمدنها الصحيحة.")}
      />
      <LocationManager kind="districts" />
    </AdminShell>
  );
}
