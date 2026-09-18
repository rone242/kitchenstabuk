"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ImagePicker, type PickerMedia } from "@/components/image-picker";
import { apiFetch } from "@/lib/api";

type Settings = Record<string, string | string[]>;
const textFields = [
  ["titleAr", "عنوان الموقع بالعربية", 160],
  ["titleEn", "عنوان الموقع بالإنجليزية", 160],
  ["descriptionAr", "وصف الموقع بالعربية", 500],
  ["descriptionEn", "وصف الموقع بالإنجليزية", 500],
  ["locationTitleAr", "عنوان الموقع الجغرافي بالعربية", 160],
  ["locationTitleEn", "عنوان الموقع الجغرافي بالإنجليزية", 160],
] as const;

export default function SiteSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [media, setMedia] = useState<PickerMedia[]>([]);
  const [uploads, setUploads] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Settings>("/admin/site-settings"),
      apiFetch<{ data: PickerMedia[] }>("/admin/media?pageSize=100"),
    ])
      .then(([values, images]) => {
        if (active) {
          setSettings(values);
          setMedia(images.data);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("تعذر تحميل إعدادات الموقع.");
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploads) return;
    const form = new FormData(event.currentTarget);
    const sliders = form.getAll("sliderMediaIds").map(String);
    if (sliders.length > 8) {
      setError("اختر ثماني صور كحد أقصى.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await apiFetch("/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({
          ...Object.fromEntries(
            textFields.map(([key]) => [
              key,
              String(form.get(key) ?? "").trim(),
            ]),
          ),
          phone: String(form.get("phone") ?? "").trim(),
          whatsapp: String(form.get("whatsapp") ?? "").trim(),
          officeTitleAr: String(form.get("officeTitleAr") ?? "").trim(),
          officeTitleEn: String(form.get("officeTitleEn") ?? "").trim(),
          officeAddressAr: String(form.get("officeAddressAr") ?? "").trim(),
          officeAddressEn: String(form.get("officeAddressEn") ?? "").trim(),
          officeLatitude: String(form.get("officeLatitude") ?? "").trim(),
          officeLongitude: String(form.get("officeLongitude") ?? "").trim(),
          theme: form.get("theme"),
          defaultLocale: form.get("defaultLocale"),
          logoMediaId: form.get("logoMediaId") || null,
          thumbnailMediaId: form.get("thumbnailMediaId") || null,
          heroBackgroundMediaId: form.get("heroBackgroundMediaId") || null,
          heroArtMediaId: form.get("heroArtMediaId") || null,
          faviconMediaId: form.get("faviconMediaId") || null,
          sliderMediaIds: sliders,
        }),
      });
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر حفظ إعدادات الموقع.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("المحتوى")}
        title={t("إعدادات الموقع")}
        description={t("إدارة هوية الموقع والصور وبيانات المشاركة والمظهر.")}
      />
      {error && (
        <p className="error-banner" role="alert">
          {t(error)}{" "}
          {!settings && (
            <button onClick={() => setRetry((value) => value + 1)}>
              {t("إعادة المحاولة")}
            </button>
          )}
        </p>
      )}
      {!settings ? (
        !error && <p role="status">{t("جارٍ التحميل...")}</p>
      ) : (
        <form
          className="panel mt-6"
          onSubmit={save}
          onChange={() => setSaved(false)}
        >
          <fieldset disabled={busy} className="grid gap-6">
            <div className="form-grid">
              {[
                ["phone", "رقم الهاتف"],
                ["whatsapp", "رقم واتساب"],
              ].map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{t(label!)}</label>
                  <input
                    id={key}
                    name={key}
                    type="tel"
                    dir="ltr"
                    maxLength={25}
                    placeholder="+966…"
                    defaultValue={String(settings[key!] ?? "")}
                  />
                  <small>
                    {t("أدخل الرقم مع رمز الدولة. اتركه فارغاً لإخفاء الزر.")}
                  </small>
                </div>
              ))}
            </div>
            <div className="form-grid">
              {textFields.map(([key, label, max]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{t(label)}</label>
                  <input
                    id={key}
                    name={key}
                    dir={key.endsWith("Ar") ? "rtl" : "ltr"}
                    maxLength={max}
                    defaultValue={String(settings[key] ?? "")}
                  />
                </div>
              ))}
            </div>
            <section className="rounded-xl border border-slate-200 p-4">
              <h2 className="form-section-title">
                {t("موقع المكتب على الخريطة")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("أدخل إحداثيات مكتبك لعرض خريطة تفاعلية في أسفل الموقع.")}
              </p>
              <div className="form-grid mt-4">
                {[
                  ["officeTitleAr", "اسم المكتب بالعربية", "rtl"],
                  ["officeTitleEn", "اسم المكتب بالإنجليزية", "ltr"],
                  ["officeAddressAr", "عنوان المكتب بالعربية", "rtl"],
                  ["officeAddressEn", "عنوان المكتب بالإنجليزية", "ltr"],
                  ["officeLatitude", "خط العرض", "ltr"],
                  ["officeLongitude", "خط الطول", "ltr"],
                ].map(([key, label, dir]) => (
                  <div className="field" key={key}>
                    <label htmlFor={key}>{t(label)}</label>
                    <input
                      id={key}
                      name={key}
                      dir={dir}
                      maxLength={300}
                      defaultValue={String(settings[key] ?? "")}
                    />
                  </div>
                ))}
              </div>
            </section>
            <div className="field">
              <label htmlFor="theme">{t("المظهر الافتراضي")}</label>
              <select
                id="theme"
                name="theme"
                defaultValue={String(settings.theme || "system")}
              >
                <option value="system">{t("حسب الجهاز")}</option>
                <option value="light">{t("نهاري")}</option>
                <option value="dark">{t("ليلي")}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="defaultLocale">{t("اللغة الافتراضية للموقع")}</label>
              <select
                id="defaultLocale"
                name="defaultLocale"
                defaultValue={String(settings.defaultLocale || "ar")}
              >
                <option value="ar">{t("العربية")}</option>
                <option value="en">{t("English")}</option>
              </select>
              <small>{t("تُستخدم للزائر الجديد الذي لم يختر لغة بعد.")}</small>
            </div>
            {[
              ["logoMediaId", "شعار الموقع"],
              ["thumbnailMediaId", "صورة المشاركة"],
              ["heroBackgroundMediaId", "صورة خلفية الصفحة الرئيسية"],
              ["heroArtMediaId", "رسم الصفحة الرئيسية"],
              ["faviconMediaId", "أيقونة المتصفح (Favicon)"],
              ["sliderMediaIds", "صور شريط العرض"],
            ].map(([key, label]) => (
              <ImagePicker
                key={key}
                name={key!}
                label={t(label!)}
                media={media}
                multiple={key === "sliderMediaIds"}
                initialIds={
                  Array.isArray(settings[key!])
                    ? (settings[key!] as string[])
                    : settings[key!]
                      ? [String(settings[key!])]
                      : []
                }
                onUploaded={(image) => {
                  setMedia((items) => [
                    image,
                    ...items.filter((item) => item.id !== image.id),
                  ]);
                  setSaved(false);
                }}
                onUploadChange={(delta) => setUploads((count) => count + delta)}
              />
            ))}
            <p className="text-sm">
              {t(
                "اختر ثماني صور كحد أقصى. اترك الحقول فارغة لاستخدام المحتوى الافتراضي.",
              )}
            </p>
            <button
              className="primary-button"
              disabled={busy || uploads > 0}
              type="submit"
            >
              {t(busy ? "جارٍ الحفظ..." : "حفظ التغييرات")}
            </button>
            {saved && <p role="status">{t("تم حفظ إعدادات الموقع.")}</p>}
          </fieldset>
        </form>
      )}
    </AdminShell>
  );
}
