"use client";

import { AdminShell } from "@/components/admin-shell";
import { RemoteTable } from "@/components/remote-table";

interface AuditRow { action: string; entityType: string; summary: string | null; ipAddress: string | null; createdAt: string; actor: { name: string } | null }

export default function AuditLogsPage() {
  return <AdminShell><header><p className="eyebrow">المراقبة</p><h1 className="page-title">سجل التدقيق</h1><p className="page-description">أحدث 100 حدث أمني وإداري.</p></header><div className="mt-8"><RemoteTable<AuditRow> endpoint="/admin/audit-logs" columns={[
    { key: "action", label: "الحدث", render: (row) => <code className="text-xs font-bold text-emerald-700">{row.action}</code> },
    { key: "actor", label: "المنفذ", render: (row) => row.actor?.name ?? "النظام" },
    { key: "summary", label: "التفاصيل", render: (row) => row.summary ?? row.entityType },
    { key: "ip", label: "عنوان IP", render: (row) => row.ipAddress ?? "—" },
    { key: "date", label: "الوقت", render: (row) => new Date(row.createdAt).toLocaleString("ar-SA") },
  ]} /></div></AdminShell>;
}
