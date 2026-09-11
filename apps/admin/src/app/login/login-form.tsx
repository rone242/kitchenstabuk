"use client";

import { LockKeyhole, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: data.get("identifier"),
          password: data.get("password"),
        }),
      });
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("بيانات الدخول غير صحيحة. تحقق من البريد أو الجوال وكلمة المرور.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-slate-700">
          البريد الإلكتروني أو رقم الجوال
        </label>
        <input id="identifier" name="identifier" autoComplete="username" required className="auth-input" placeholder="admin@example.sa أو +9665..." />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">كلمة المرور</label>
        <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required className="auth-input" placeholder="••••••••••••" />
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={pending} className="primary-button w-full">
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <LockKeyhole className="size-5" />}
        {pending ? "جارٍ التحقق..." : "دخول آمن"}
      </button>
    </form>
  );
}
