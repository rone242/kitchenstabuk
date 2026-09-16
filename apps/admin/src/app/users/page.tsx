"use client";
import { useI18n } from "@repo/i18n/client";

import { AdminShell } from "@/components/admin-shell";
import { RemoteTable } from "@/components/remote-table";

interface UserRow {
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  roles: Array<{ role: { nameAr: string; nameEn?: string | null } }>;
}

export default function UsersPage() {
  const { t, numberLocale } = useI18n();

  return (
    <AdminShell>
      <Header />
      <div className="mt-8">
        <RemoteTable<UserRow>
          endpoint="/admin/users"
          columns={[
            {
              key: "name",
              label: t("المستخدم"),
              render: (row) => (
                <div>
                  <strong>{row.name}</strong>
                  <small className="mt-1 block text-slate-400">
                    {row.email ?? row.phone}
                  </small>
                </div>
              ),
            },
            {
              key: "roles",
              label: t("الأدوار"),
              render: (row) =>
                row.roles.map(({ role }) => t(role.nameAr)).join(t("، ")),
            },
            {
              key: "status",
              label: t("الحالة"),
              render: (row) => (
                <span className="status-pill">
                  {row.status === "ACTIVE" ? t("نشط") : t("معطّل")}
                </span>
              ),
            },
            {
              key: "login",
              label: t("آخر دخول"),
              render: (row) =>
                row.lastLoginAt
                  ? new Date(row.lastLoginAt).toLocaleString(numberLocale)
                  : "—",
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}

function Header() {
  const { t } = useI18n();
  return (
    <header>
      <p className="eyebrow">{t("إدارة الوصول")}</p>
      <h1 className="page-title">{t("المستخدمون")}</h1>
      <p className="page-description">
        {t("الحسابات الإدارية والأدوار المعيّنة لها.")}
      </p>
    </header>
  );
}
