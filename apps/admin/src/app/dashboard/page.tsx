import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";

const cards = [
  { title: "مصادقة آمنة", text: "رموز وصول قصيرة العمر داخل ملفات HttpOnly.", icon: KeyRound },
  { title: "تدوير الجلسات", text: "يُستبدل رمز التحديث عند كل استخدام ويُكشف تكراره.", icon: RefreshCw },
  { title: "صلاحيات دقيقة", text: "يحمي الخادم كل عملية حسب الدور والصلاحية.", icon: ShieldCheck },
];

export default function DashboardPage() {
  return (
    <AdminShell>
      <header><p className="eyebrow">المرحلة الثالثة</p><h1 className="page-title">مركز التحكم</h1><p className="page-description">إدارة آمنة للمستخدمين والأدوار ومراجعة نشاط الدخول.</p></header>
      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {cards.map(({ title, text, icon: Icon }) => <article className="panel" key={title}><div className="feature-icon"><Icon className="size-5" /></div><h2 className="mt-5 font-black text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}
      </section>
      <section className="panel mt-6"><h2 className="font-black text-slate-900">حالة الحماية</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Status label="واجهة الإدارة" value="محمية" /><Status label="واجهة API" value="التحقق إلزامي" /><Status label="تسجيل المحاولات" value="مفعّل" /><Status label="حماية CSRF" value="مفعّلة" /></div></section>
    </AdminShell>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">{label}</span><span className="status-pill">{value}</span></div>;
}
