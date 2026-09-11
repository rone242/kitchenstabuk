"use client";

import {
  Activity,
  FolderTree,
  Images,
  LayoutDashboard,
  LogOut,
  MapPin,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { AdminUser, apiFetch, readCookie } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/categories", label: "التصنيفات", icon: FolderTree, permission: "category.read" },
  { href: "/services", label: "الخدمات", icon: Wrench, permission: "service.read" },
  { href: "/locations/regions", label: "المناطق", icon: MapPin, permission: "location.manage" },
  { href: "/locations/cities", label: "المدن", icon: MapPin, permission: "location.manage" },
  { href: "/locations/districts", label: "الأحياء", icon: MapPin, permission: "location.manage" },
  { href: "/media", label: "الوسائط", icon: Images, permission: "media.manage" },
  { href: "/users", label: "المستخدمون", icon: Users, permission: "users.manage" },
  { href: "/roles", label: "الأدوار والصلاحيات", icon: UserCog, permission: "users.manage" },
  { href: "/audit-logs", label: "سجل التدقيق", icon: Activity, permission: "audit.read" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiFetch<{ user: AdminUser }>("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (failed) router.replace("/login");
  }, [failed, router]);

  async function logout() {
    const csrf = readCookie("kst_csrf");
    await apiFetch("/auth/logout", {
      method: "POST",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
    }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center text-sm font-semibold text-slate-500">
          <div className="mx-auto mb-4 size-9 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          جارٍ التحقق من الجلسة...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-l border-slate-200 bg-slate-950 px-5 py-6 text-white">
        <div className="flex items-center gap-3 px-2">
          <div className="brand-mark size-10"><ShieldCheck className="size-5" /></div>
          <div><strong className="block">خدماتك</strong><span className="text-xs text-slate-400">لوحة الإدارة</span></div>
        </div>
        <nav className="mt-9 flex gap-2 overflow-x-auto lg:flex-col">
          {links.filter((link) => !link.permission || user.permissions.includes(link.permission)).map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                <Icon className="size-4" />{link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 border-t border-slate-800 pt-5 lg:mt-[calc(100vh-390px)]">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{user.roles.join(" · ")}</p>
          <button onClick={logout} className="mt-4 flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</main>
    </div>
  );
}
