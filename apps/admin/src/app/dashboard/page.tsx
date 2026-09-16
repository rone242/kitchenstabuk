"use client";
import { useI18n } from "@repo/i18n/client";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";

const cards = [
  {
    title: "مصادقة آمنة",
    text: "رموز وصول قصيرة العمر داخل ملفات HttpOnly.",
    icon: KeyRound,
  },
  {
    title: "تدوير الجلسات",
    text: "يُستبدل رمز التحديث عند كل استخدام ويُكشف تكراره.",
    icon: RefreshCw,
  },
  {
    title: "صلاحيات دقيقة",
    text: "يحمي الخادم كل عملية حسب الدور والصلاحية.",
    icon: ShieldCheck,
  },
];

export default function DashboardPage() {
  const { t } = useI18n();

  return (
    <AdminShell>
      <header>
        <p className="eyebrow">{t("المرحلة الثالثة")}</p>
        <h1 className="page-title">{t("مركز التحكم")}</h1>
        <p className="page-description">
          {t("إدارة آمنة للمستخدمين والأدوار ومراجعة نشاط الدخول.")}
        </p>
      </header>
      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {cards.map(({ title, text, icon: Icon }) => (
          <article className="panel" key={title}>
            <div className="feature-icon">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-5 font-black text-slate-900">{t(title)}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t(text)}</p>
          </article>
        ))}
      </section>
      <section className="panel mt-6">
        <h2 className="font-black text-slate-900">{t("حالة الحماية")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Status label={t("واجهة الإدارة")} value={t("محمية")} />
          <Status label={t("واجهة API")} value={t("التحقق إلزامي")} />
          <Status label={t("تسجيل المحاولات")} value={t("مفعّل")} />
          <Status label={t("حماية CSRF")} value={t("مفعّلة")} />
        </div>
      </section>
    </AdminShell>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{t(label)}</span>
      <span className="status-pill">{t(value)}</span>
    </div>
  );
}
