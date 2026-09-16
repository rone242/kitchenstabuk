"use client";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { MediaLibrary } from "@/components/media-library";
import { PageHeader } from "@/components/page-header";

export default function MediaPage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("الأصول الرقمية")}
        title={t("مكتبة الوسائط")}
        description={t(
          "ارفع صوراً موثوقة وأعد استخدامها في التصنيفات والخدمات.",
        )}
      />
      <MediaLibrary />
    </AdminShell>
  );
}
