"use client";

import { AdminShell } from "@/components/admin-shell";
import { RemoteTable } from "@/components/remote-table";

interface UserRow { name: string; email: string | null; phone: string | null; status: string; lastLoginAt: string | null; roles: Array<{ role: { nameAr: string } }> }

export default function UsersPage() {
  return <AdminShell><Header /><div className="mt-8"><RemoteTable<UserRow> endpoint="/admin/users" columns={[
    { key: "name", label: "المستخدم", render: (row) => <div><strong>{row.name}</strong><small className="mt-1 block text-slate-400">{row.email ?? row.phone}</small></div> },
    { key: "roles", label: "الأدوار", render: (row) => row.roles.map(({ role }) => role.nameAr).join("، ") },
    { key: "status", label: "الحالة", render: (row) => <span className="status-pill">{row.status === "ACTIVE" ? "نشط" : "معطّل"}</span> },
    { key: "login", label: "آخر دخول", render: (row) => row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString("ar-SA") : "—" },
  ]} /></div></AdminShell>;
}

function Header() { return <header><p className="eyebrow">إدارة الوصول</p><h1 className="page-title">المستخدمون</h1><p className="page-description">الحسابات الإدارية والأدوار المعيّنة لها.</p></header>; }
