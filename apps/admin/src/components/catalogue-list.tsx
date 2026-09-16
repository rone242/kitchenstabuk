"use client";
import { useI18n } from "@repo/i18n/client";

import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Row {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  slug: string;
  isActive: boolean;
  isFeatured?: boolean;
  category?: { nameAr: string; nameEn?: string | null };
  _count?: Record<string, number>;
}

interface Result {
  data: Row[];
  meta: { page: number; totalPages: number; total: number };
}

export function CatalogueList({ type }: { type: "categories" | "services" }) {
  const { t, name: displayName, numberLocale } = useI18n();

  const singular = type === "categories" ? t("التصنيف") : t("الخدمة");
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        sortBy: "sortOrder",
        sortDirection: "asc",
      });
      if (search.trim()) params.set("search", search.trim());
      if (active !== "all") params.set("isActive", active);
      apiFetch<Result>(`/admin/${type}?${params}`)
        .then((result) => {
          setRows(result.data);
          setTotalPages(Math.max(result.meta.totalPages, 1));
          setTotal(result.meta.total);
          setError("");
        })
        .catch(() => setError("تعذر تحميل البيانات."))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [type, search, active, page, refresh]);

  async function remove(row: Row) {
    if (!window.confirm(`${t("حذف")} ${singular} «${displayName(row)}»?`))
      return;
    try {
      await apiFetch(`/admin/${type}/${row.id}`, { method: "DELETE" });
      setRefresh((value) => value + 1);
    } catch {
      setError(
        type === "categories"
          ? "لا يمكن حذف تصنيف مرتبط بخدمات."
          : t("تعذر حذف الخدمة."),
      );
    }
  }

  return (
    <>
      <div className="toolbar mt-7">
        <label className="search-box">
          <Search className="size-4" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={`${t("ابحث عن خدمة")} / ${type === "categories" ? t("التصنيفات") : t("الخدمات")}`}
          />
        </label>
        <select
          className="control"
          value={active}
          onChange={(event) => {
            setActive(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">{t("كل الحالات")}</option>
          <option value="true">{t("نشط")}</option>
          <option value="false">{t("غير نشط")}</option>
        </select>
        <Link className="primary-button px-5" href={`/${type}/new`}>
          <Plus className="size-4" />
          {t("إضافة")} {singular}
        </Link>
      </div>
      {error ? <p className="error-banner mt-4">{t(error)}</p> : null}
      <div className="panel mt-4 overflow-x-auto p-0">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{singular}</th>
              <th>{t("الرابط")}</th>
              {type === "services" ? <th>{t("التصنيف")}</th> : null}
              <th>{t("الحالة")}</th>
              <th>{t("الترتيب")}</th>
              <th>
                <span className="sr-only">{t("إجراءات")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="table-message">
                  {t("جارٍ التحميل...")}
                </td>
              </tr>
            ) : null}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={6} className="table-message">
                  {t("لا توجد نتائج مطابقة.")}
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{displayName(row)}</strong>
                    <small>{row.nameEn || t("بدون اسم إنجليزي")}</small>
                  </td>
                  <td>
                    <code>{row.slug}</code>
                  </td>
                  {type === "services" ? (
                    <td>{row.category ? displayName(row.category) : ""}</td>
                  ) : null}
                  <td>
                    <span
                      className={
                        row.isActive
                          ? "status-pill"
                          : "status-pill status-muted"
                      }
                    >
                      {row.isActive ? t("نشط") : t("متوقف")}
                    </span>
                    {row.isFeatured ? (
                      <span className="ms-2 text-xs font-bold text-amber-600">
                        {t("مميز")}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {row._count ? (Object.values(row._count)[0] ?? 0) : "—"}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link
                        className="icon-button"
                        aria-label={t("تعديل")}
                        href={`/${type}/${row.id}`}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        className="icon-button danger"
                        aria-label={t("حذف")}
                        onClick={() => remove(row)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {total.toLocaleString(numberLocale)}
          {t("سجل")}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="icon-button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronRight className="size-4" />
          </button>
          <span>
            {page.toLocaleString(numberLocale)} /{" "}
            {totalPages.toLocaleString(numberLocale)}
          </span>
          <button
            className="icon-button"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}
