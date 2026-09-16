"use client";
import { useI18n } from "@repo/i18n/client";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";
import { AdminLanguageBar } from "@/components/admin-language-bar";

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="mb-5 flex justify-end">
          <AdminLanguageBar />
        </div>
        <div className="brand-mark">
          <ShieldCheck className="size-7" />
        </div>
        <p className="mt-6 text-sm font-bold text-emerald-700">
          {t("خدماتك · الإدارة")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {t("مرحباً بعودتك")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {t("سجّل الدخول إلى لوحة العمليات وإدارة المحتوى.")}
        </p>
        <Suspense
          fallback={
            <div className="mt-8 h-64 animate-pulse rounded-2xl bg-slate-100" />
          }
        >
          <LoginForm />
        </Suspense>
        <p className="mt-8 text-center text-xs text-slate-400">
          {t("جلسة مشفرة ومحمية بسياسة صلاحيات دقيقة")}
        </p>
      </section>
    </main>
  );
}
