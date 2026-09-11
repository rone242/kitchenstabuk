"use client";

import { AdminShell } from "@/components/admin-shell";
import { RemoteTable } from "@/components/remote-table";

interface RoleRow { name: string; nameAr: string; description: string | null; permissions: Array<{ permission: { key: string } }>; _count: { users: number } }

export default function RolesPage() {
  return <AdminShell><header><p className="eyebrow">RBAC</p><h1 className="page-title">الأدوار والصلاحيات</h1><p className="page-description">عرض مصفوفة الوصول الفعلية المطبقة داخل API.</p></header><div className="mt-8"><RemoteTable<RoleRow> endpoint="/admin/roles" columns={[
    { key: "role", label: "الدور", render: (row) => <div><strong>{row.nameAr}</strong><small className="mt-1 block text-slate-400">{row.name}</small></div> },
    { key: "description", label: "الوصف", render: (row) => row.description ?? "—" },
    { key: "permissions", label: "الصلاحيات", render: (row) => <span className="font-bold text-emerald-700">{row.permissions.length}</span> },
    { key: "users", label: "المستخدمون", render: (row) => row._count.users },
  ]} /></div></AdminShell>;
}
