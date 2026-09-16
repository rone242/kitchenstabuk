"use client";
import { useI18n } from "@repo/i18n/client";

import { AdminShell } from "@/components/admin-shell";
import { RemoteTable } from "@/components/remote-table";

interface AuditRow {
  action: string;
  entityType: string;
  summary: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string } | null;
}

export default function AuditLogsPage() {
  const { t, numberLocale } = useI18n();

  return (
    <AdminShell>
      <header>
        <p className="eyebrow">{t("المراقبة")}</p>
        <h1 className="page-title">{t("سجل التدقيق")}</h1>
        <p className="page-description">{t("أحدث 100 حدث أمني وإداري.")}</p>
      </header>
      <div className="mt-8">
        <RemoteTable<AuditRow>
          endpoint="/admin/audit-logs"
          columns={[
            {
              key: "action",
              label: t("الحدث"),
              render: (row) => (
                <code className="text-xs font-bold text-emerald-700">
                  {row.action}
                </code>
              ),
            },
            {
              key: "actor",
              label: t("المنفذ"),
              render: (row) => row.actor?.name ?? t("النظام"),
            },
            {
              key: "summary",
              label: t("التفاصيل"),
              render: (row) => row.summary ?? row.entityType,
            },
            {
              key: "ip",
              label: t("عنوان IP"),
              render: (row) => row.ipAddress ?? "—",
            },
            {
              key: "date",
              label: t("الوقت"),
              render: (row) =>
                new Date(row.createdAt).toLocaleString(numberLocale),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
