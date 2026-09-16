"use client";
import { useI18n } from "@repo/i18n/client";

import { Check, ImagePlus, Pencil, Search, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Media {
  id: string;
  originalName: string;
  publicUrl: string | null;
  altTextAr: string | null;
  altTextEn: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  createdAt: string;
}
interface Result {
  data: Media[];
  meta: { total: number };
}

export function MediaLibrary() {
  const { t, locale, numberLocale } = useI18n();

  const [items, setItems] = useState<Media[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Media | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [logoMediaId, setLogoMediaId] = useState<string | null>(null);
  useEffect(() => {
    apiFetch<{ mediaId: string | null }>("/admin/media/site-logo")
      .then((result) => setLogoMediaId(result.mediaId))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      apiFetch<Result>(`/admin/media?${params}`)
        .then((result) => {
          setItems(result.data);
          setError("");
        })
        .catch(() => setError("تعذر تحميل مكتبة الوسائط."));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, refresh]);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError("");
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    try {
      await apiFetch("/admin/media", { method: "POST", body: data });
      formElement.reset();
      setMessage("تم رفع الصورة بنجاح.");
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(false);
    }
  }
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    try {
      await apiFetch(`/admin/media/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          altTextAr: String(data.get("altTextAr") ?? ""),
          altTextEn: String(data.get("altTextEn") ?? ""),
        }),
      });
      setEditing(null);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحديث الصورة.");
    }
  }
  async function remove(item: Media) {
    if (!confirm(`${t("حذف")} «${item.originalName}»?`)) return;
    try {
      await apiFetch(`/admin/media/${item.id}`, { method: "DELETE" });
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "الصورة مستخدمة ولا يمكن حذفها.",
      );
    }
  }
  async function setAsLogo(item: Media) {
    try {
      await apiFetch(`/admin/media/${item.id}/site-logo`, { method: "PUT" });
      setLogoMediaId(item.id);
      setMessage("تم تعيين شعار الموقع بنجاح.");
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر تعيين شعار الموقع.",
      );
    }
  }
  return (
    <>
      <form onSubmit={upload} className="panel mt-7">
        <h2 className="form-section-title">{t("رفع صورة جديدة")}</h2>
        <div className="form-grid mt-5">
          <label className="field">
            <span>{t("ملف الصورة")}</span>
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              required
            />
          </label>
          <label className="field">
            <span>{t("النص البديل بالعربية")}</span>
            <input name="altTextAr" maxLength={300} required />
          </label>
          <label className="field">
            <span>{t("النص البديل بالإنجليزية")}</span>
            <input name="altTextEn" maxLength={300} dir="ltr" />
          </label>
          <div className="flex items-end">
            <button disabled={uploading} className="primary-button w-full px-5">
              <ImagePlus className="size-4" />
              {uploading ? t("جارٍ الرفع...") : t("رفع الصورة")}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {t(
            "JPEG أو PNG أو WebP أو AVIF أو GIF، ضمن الحد المحدد في إعدادات الخادم. يتم فحص محتوى الملف فعلياً.",
          )}
        </p>
      </form>
      {message ? <p className="info-banner mt-4">{t(message)}</p> : null}
      {error ? <p className="error-banner mt-4">{t(error)}</p> : null}
      <label className="search-box mt-5 max-w-md">
        <Search className="size-4" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("ابحث باسم الملف أو النص البديل")}
        />
      </label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article className="media-card" key={item.id}>
            <div
              className="media-preview"
              role="img"
              aria-label={
                (locale === "en" ? item.altTextEn : item.altTextAr) ||
                item.altTextAr ||
                item.originalName
              }
              style={{
                backgroundImage: item.publicUrl
                  ? `url(${JSON.stringify(item.publicUrl).slice(1, -1)})`
                  : undefined,
              }}
            />
            <div className="p-4">
              <strong className="line-clamp-1 text-sm">
                {(locale === "en" ? item.altTextEn : item.altTextAr) ||
                  item.altTextAr ||
                  item.originalName}
              </strong>
              <p className="mt-1 text-xs text-slate-400">
                {item.width}×{item.height} ·{" "}
                {(item.sizeBytes / 1024).toLocaleString(numberLocale, {
                  maximumFractionDigits: 0,
                })}{" "}
                KB
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className={
                    logoMediaId === item.id
                      ? "primary-button flex-1 px-3 py-2"
                      : "icon-button flex-1"
                  }
                  onClick={() => setAsLogo(item)}
                  disabled={logoMediaId === item.id}
                >
                  {logoMediaId === item.id ? (
                    <Check className="size-4" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {t(
                    logoMediaId === item.id
                      ? "شعار الموقع الحالي"
                      : "تعيين كشعار الموقع",
                  )}
                </button>
                <button
                  className="icon-button"
                  onClick={() => setEditing(item)}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  className="icon-button danger"
                  onClick={() => remove(item)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
        {!items.length ? (
          <p className="empty-inline sm:col-span-2 xl:col-span-4">
            {t("لا توجد صور في المكتبة.")}
          </p>
        ) : null}
      </div>
      {editing ? (
        <div className="dialog-backdrop">
          <form onSubmit={update} className="dialog-panel">
            <div className="flex items-center justify-between">
              <h2 className="form-section-title">{t("تعديل النص البديل")}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditing(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <label className="field mt-5">
              <span>{t("العربية")}</span>
              <input
                name="altTextAr"
                defaultValue={editing.altTextAr ?? ""}
                required
              />
            </label>
            <label className="field mt-4">
              <span>{t("الإنجليزية")}</span>
              <input
                name="altTextEn"
                dir="ltr"
                defaultValue={editing.altTextEn ?? ""}
              />
            </label>
            <button className="primary-button mt-5 w-full">{t("حفظ")}</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
