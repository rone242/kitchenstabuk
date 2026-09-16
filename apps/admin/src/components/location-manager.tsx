"use client";
import { useI18n } from "@repo/i18n/client";

import {
  ChevronLeft,
  ChevronRight,
  MapPinned,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Kind = "regions" | "cities" | "districts";
interface Row {
  shortDescriptionEn?: string | null;
  seoTitleEn?: string | null;
  seoDescriptionEn?: string | null;
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  shortDescription?: string | null;
  countryId?: string;
  regionId?: string;
  cityId?: string;
  country?: { nameAr: string; nameEn?: string | null };
  region?: { nameAr: string; nameEn?: string | null };
  city?: { nameAr: string; region: { nameAr: string; nameEn?: string | null } };
  _count: Record<string, number>;
}
interface CityOption {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  districts: unknown[];
}
interface RegionOption {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  cities: CityOption[];
}
interface CountryOption {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  regions: RegionOption[];
}
interface Result {
  data: Row[];
  meta: { total: number; totalPages: number };
}

const labels = {
  regions: { one: "المنطقة", many: "المناطق" },
  cities: { one: "المدينة", many: "المدن" },
  districts: { one: "الحي", many: "الأحياء" },
};

export function LocationManager({ kind }: { kind: Kind }) {
  const { t, name: displayName, numberLocale } = useI18n();

  const label = { one: t(labels[kind].one), many: t(labels[kind].many) };
  const [rows, setRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<CountryOption[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const regions = useMemo(
    () => options.flatMap((country) => country.regions),
    [options],
  );
  const cities = useMemo(
    () => regions.flatMap((region) => region.cities),
    [regions],
  );
  useEffect(() => {
    apiFetch<CountryOption[]>("/admin/locations/options")
      .then(setOptions)
      .catch(() => undefined);
  }, [refresh]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (search.trim()) params.set("search", search.trim());
      apiFetch<Result>(`/admin/locations/${kind}?${params}`)
        .then((result) => {
          setRows(result.data);
          setTotalPages(Math.max(result.meta.totalPages, 1));
          setTotal(result.meta.total);
          setError("");
        })
        .catch(() => setError("تعذر تحميل بيانات المواقع."));
    }, 250);
    return () => clearTimeout(timer);
  }, [kind, page, search, refresh]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      nameAr: value(form, "nameAr"),
      nameEn: value(form, "nameEn"),
      seoTitleEn: value(form, "seoTitleEn"),
      seoDescriptionEn: value(form, "seoDescriptionEn"),
      slug: value(form, "slug"),
      sortOrder: Number(form.get("sortOrder") || 0),
      isActive: form.get("isActive") === "on",
      seoTitle: optional(form, "seoTitle"),
      seoDescription: optional(form, "seoDescription"),
    };
    if (kind === "cities") {
      payload.regionId = value(form, "parentId");
      payload.shortDescription = optional(form, "shortDescription");
      payload.shortDescriptionEn = value(form, "shortDescriptionEn");
    }
    if (kind === "districts") payload.cityId = value(form, "parentId");
    try {
      await apiFetch(
        `/admin/locations/${kind}${editing ? `/${editing.id}` : ""}`,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      close();
      setRefresh((item) => item + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الموقع.");
    }
  }
  async function deactivate(row: Row) {
    if (!confirm(`${t("إيقاف")} ${label.one} «${displayName(row)}»?`)) return;
    try {
      await apiFetch(`/admin/locations/${kind}/${row.id}`, {
        method: "DELETE",
      });
      setRefresh((item) => item + 1);
    } catch {
      setError("تعذر إيقاف الموقع.");
    }
  }
  function close() {
    setEditing(null);
    setShowForm(false);
  }
  const parentValue =
    kind === "cities"
      ? editing?.regionId
      : kind === "districts"
        ? editing?.cityId
        : undefined;
  return (
    <>
      <div className="toolbar mt-7">
        <label className="search-box">
          <MapPinned className="size-4" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={`${t("ابحث عن خدمة")} / ${label.many}`}
          />
        </label>
        <button
          className="primary-button px-5"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="size-4" />
          {t("إضافة")} {label.one}
        </button>
      </div>
      {error ? <p className="error-banner mt-4">{t(error)}</p> : null}
      {showForm ? (
        <form
          key={editing?.id ?? "new"}
          onSubmit={submit}
          className="panel mt-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="form-section-title">
              {editing
                ? `${t("تعديل")} ${label.one}`
                : `${t("إضافة")} ${label.one}`}
            </h2>
            <button type="button" className="icon-button" onClick={close}>
              <X className="size-4" />
            </button>
          </div>
          <div className="form-grid mt-5">
            <label className="field">
              <span>{t("الاسم بالعربية")}</span>
              <input
                name="nameAr"
                required
                defaultValue={editing?.nameAr ?? ""}
              />
            </label>
            <label className="field">
              <span>{t("الاسم بالإنجليزية")}</span>
              <input
                name="nameEn"
                dir="ltr"
                defaultValue={editing?.nameEn ?? ""}
              />
            </label>
            <label className="field">
              <span>{t("الرابط المختصر")}</span>
              <input
                name="slug"
                dir="ltr"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                defaultValue={editing?.slug ?? ""}
              />
            </label>
            {kind !== "regions" ? (
              <label className="field">
                <span>{kind === "cities" ? t("المنطقة") : t("المدينة")}</span>
                <select
                  name="parentId"
                  required
                  defaultValue={parentValue ?? ""}
                >
                  <option value="" disabled>
                    {t("اختر")}
                  </option>
                  {(kind === "cities" ? regions : cities).map((item) => (
                    <option key={item.id} value={item.id}>
                      {displayName(item)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>{t("الترتيب")}</span>
              <input
                type="number"
                min="0"
                name="sortOrder"
                defaultValue={editing?.sortOrder ?? 0}
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
              />
              <span>{t("نشط")}</span>
            </label>
            {kind === "cities" ? (
              <label className="field sm:col-span-2">
                <span>{t("وصف مختصر")}</span>
                <textarea
                  name="shortDescription"
                  rows={2}
                  defaultValue={editing?.shortDescription ?? ""}
                />
              </label>
            ) : null}
            <label className="field">
              <span>{t("عنوان SEO")}</span>
              <input name="seoTitle" defaultValue={editing?.seoTitle ?? ""} />
            </label>
            <label className="field">
              <span>{t("وصف SEO")}</span>
              <textarea
                name="seoDescription"
                rows={2}
                defaultValue={editing?.seoDescription ?? ""}
              />
            </label>
            <label className="field">
              <span>{t("عنوان SEO")} (English)</span>
              <input
                name="seoTitleEn"
                dir="ltr"
                defaultValue={editing?.seoTitleEn ?? ""}
              />
            </label>
            <label className="field">
              <span>{t("وصف SEO")} (English)</span>
              <textarea
                name="seoDescriptionEn"
                dir="ltr"
                defaultValue={editing?.seoDescriptionEn ?? ""}
              />
            </label>
            {kind === "cities" && (
              <label className="field">
                <span>{t("الوصف المختصر")} (English)</span>
                <textarea
                  name="shortDescriptionEn"
                  dir="ltr"
                  defaultValue={editing?.shortDescriptionEn ?? ""}
                />
              </label>
            )}
          </div>
          <button className="primary-button mt-5 px-6" type="submit">
            {t("حفظ")} {label.one}
          </button>
        </form>
      ) : null}
      <div className="panel mt-4 overflow-x-auto p-0">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{label.one}</th>
              <th>{t("التسلسل")}</th>
              <th>{t("الرابط")}</th>
              <th>{t("الحالة")}</th>
              <th>{t("الارتباطات")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{displayName(row)}</strong>
                  <small>{row.nameEn ?? "—"}</small>
                </td>
                <td>
                  {row.city
                    ? `${displayName(row.city.region)} / ${displayName(row.city)}`
                    : row.region
                      ? displayName(row.region)
                      : row.country
                        ? displayName(row.country)
                        : t("السعودية")}
                </td>
                <td>
                  <code>{row.slug}</code>
                </td>
                <td>
                  <span
                    className={
                      row.isActive ? "status-pill" : "status-pill status-muted"
                    }
                  >
                    {row.isActive ? t("نشط") : t("متوقف")}
                  </span>
                </td>
                <td>
                  {Object.values(row._count)
                    .reduce((sum, count) => sum + count, 0)
                    .toLocaleString(numberLocale)}
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button
                      className="icon-button"
                      onClick={() => {
                        setEditing(row);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      className="secondary-button py-2 text-xs"
                      onClick={() => deactivate(row)}
                    >
                      {t("إيقاف")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="table-message">
                  {t("لا توجد بيانات.")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between text-sm text-slate-500">
        <span>
          {total.toLocaleString(numberLocale)}
          {t("سجل")}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="icon-button"
            disabled={page <= 1}
            onClick={() => setPage((item) => item - 1)}
          >
            <ChevronRight className="size-4" />
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="icon-button"
            disabled={page >= totalPages}
            onClick={() => setPage((item) => item + 1)}
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}
function optional(form: FormData, name: string) {
  return value(form, name) || undefined;
}
