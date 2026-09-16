"use client";
import { ImagePicker, type PickerMedia } from "./image-picker";
import { ContentTabs, ContentPanel } from "./content-tabs";
import { useI18n } from "@repo/i18n/client";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ServiceFieldsEditor } from "./service-fields-editor";
import { ServiceLocationsEditor } from "./service-locations-editor";

interface Category {
  id: string;
  nameAr: string;
  nameEn?: string | null;
}
type Media = PickerMedia;
interface Service {
  summaryEn: string | null;
  descriptionEn: string | null;
  benefitsEn: string[];
  processStepsEn: string[];
  durationTextEn: string | null;
  seoTitleEn: string | null;
  seoDescriptionEn: string | null;

  id: string;
  categoryId: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  summary: string;
  description: string;
  benefits: string[];
  processSteps: string[];
  priceType: string;
  startingPrice: string | null;
  maximumPrice: string | null;
  currency: string;
  durationText: string | null;
  coverImageId: string | null;
  gallery: Array<{ mediaId: string }>;
  isEmergency: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

export function ServiceForm({ serviceId }: { serviceId?: string }) {
  const { t, name: displayName } = useI18n();

  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(Boolean(serviceId));
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0);
  const onUploadChange = (delta: number) =>
    setUploads((count) => count + delta);
  const onUploaded = (image: PickerMedia) =>
    setMedia((items) => [
      image,
      ...items.filter((item) => item.id !== image.id),
    ]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: Category[] }>(
        "/admin/categories?pageSize=100&isActive=true",
      ),
      apiFetch<{ data: Media[] }>("/admin/media?pageSize=100"),
    ])
      .then(([categoryResult, mediaResult]) => {
        setCategories(categoryResult.data);
        setMedia(mediaResult.data);
      })
      .catch(() => setError("تعذر تحميل خيارات النموذج."));
    if (serviceId)
      apiFetch<Service>(`/admin/services/${serviceId}`)
        .then(setService)
        .catch(() => setError("تعذر تحميل الخدمة."))
        .finally(() => setLoading(false));
  }, [serviceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploads > 0) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const priceType = text(form, "priceType");
    const payload = {
      summaryEn: text(form, "summaryEn"),
      descriptionEn: text(form, "descriptionEn"),
      benefitsEn: lines(form, "benefitsEn"),
      processStepsEn: lines(form, "processStepsEn"),
      durationTextEn: text(form, "durationTextEn"),
      seoTitleEn: text(form, "seoTitleEn"),
      seoDescriptionEn: text(form, "seoDescriptionEn"),

      categoryId: text(form, "categoryId"),
      nameAr: text(form, "nameAr"),
      nameEn: text(form, "nameEn"),
      slug: text(form, "slug"),
      summary: text(form, "summary"),
      description: text(form, "description"),
      benefits: lines(form, "benefits"),
      processSteps: lines(form, "processSteps"),
      priceType,
      startingPrice:
        priceType === "QUOTE_REQUIRED"
          ? undefined
          : optionalNumber(form, "startingPrice"),
      maximumPrice:
        priceType === "RANGE"
          ? optionalNumber(form, "maximumPrice")
          : undefined,
      currency: "SAR",
      durationText: optional(form, "durationText"),
      coverImageId: text(form, "coverImageId") || null,
      galleryIds: form.getAll("galleryIds").map(String),
      isEmergency: form.get("isEmergency") === "on",
      isFeatured: form.get("isFeatured") === "on",
      isActive: form.get("isActive") === "on",
      sortOrder: Number(form.get("sortOrder") || 0),
      seoTitle: optional(form, "seoTitle"),
      seoDescription: optional(form, "seoDescription"),
    };
    try {
      const saved = await apiFetch<{ id: string }>(
        serviceId ? `/admin/services/${serviceId}` : "/admin/services",
        { method: serviceId ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      if (serviceId) {
        setSaving(false);
        setError("");
        router.refresh();
      } else {
        router.replace(`/services/${saved.id}`);
        router.refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الخدمة.");
      setSaving(false);
    }
  }

  if (loading) return <div className="panel">{t("جارٍ تحميل الخدمة...")}</div>;
  return (
    <div className="mt-7 space-y-6">
      <form onSubmit={submit} className="space-y-6">
        {error ? <p className="error-banner">{t(error)}</p> : null}
        <ContentTabs
          incomplete={Boolean(
            service &&
            (!service.nameEn?.trim() ||
              !service.summaryEn?.trim() ||
              !service.descriptionEn?.trim() ||
              (service.benefits.length > 0 && !service.benefitsEn.length) ||
              (service.processSteps.length > 0 &&
                !service.processStepsEn.length)),
          )}
        >
          <ContentPanel locale="ar">
            <section className="panel">
              <h2 className="form-section-title">{t("المعلومات الأساسية")}</h2>
              <div className="form-grid mt-5">
                <Field
                  label={t("اسم الخدمة بالعربية")}
                  name="nameAr"
                  defaultValue={service?.nameAr}
                  required
                />
                <label className="field">
                  <span>{t("التصنيف")}</span>
                  <select
                    name="categoryId"
                    defaultValue={service?.categoryId ?? ""}
                    required
                  >
                    <option value="" disabled>
                      {t("اختر التصنيف")}
                    </option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {displayName(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label={t("الرابط المختصر")}
                  name="slug"
                  defaultValue={service?.slug}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  dir="ltr"
                  required
                />
                <label className="field sm:col-span-2">
                  <span>{t("الملخص")}</span>
                  <textarea
                    name="summary"
                    rows={3}
                    minLength={10}
                    maxLength={500}
                    defaultValue={service?.summary ?? ""}
                    required
                  />
                </label>
                <label className="field sm:col-span-2">
                  <span>{t("الوصف الكامل")}</span>
                  <textarea
                    name="description"
                    rows={8}
                    minLength={20}
                    defaultValue={service?.description ?? ""}
                    required
                  />
                </label>
                <label className="field">
                  <span>{t("الفوائد (سطر لكل فائدة)")}</span>
                  <textarea
                    name="benefits"
                    rows={5}
                    defaultValue={service?.benefits.join("\n") ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("خطوات التنفيذ (سطر لكل خطوة)")}</span>
                  <textarea
                    name="processSteps"
                    rows={5}
                    defaultValue={service?.processSteps.join("\n") ?? ""}
                  />
                </label>
              </div>
            </section>
          </ContentPanel>
          <ContentPanel locale="en">
            <section className="panel">
              <h2 className="form-section-title">{t("محتوى إنجليزي")}</h2>
              <div className="form-grid mt-5">
                <Field
                  label={t("الاسم بالإنجليزية")}
                  name="nameEn"
                  defaultValue={service?.nameEn}
                  dir="ltr"
                />
                <label className="field">
                  <span>{t("الملخص")}</span>
                  <textarea
                    name="summaryEn"
                    rows={3}
                    maxLength={500}
                    defaultValue={service?.summaryEn ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("الوصف الكامل")}</span>
                  <textarea
                    name="descriptionEn"
                    rows={6}
                    maxLength={30000}
                    defaultValue={service?.descriptionEn ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("الفوائد (سطر لكل فائدة)")}</span>
                  <textarea
                    name="benefitsEn"
                    rows={3}
                    defaultValue={service?.benefitsEn.join("\n") ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("خطوات التنفيذ (سطر لكل خطوة)")}</span>
                  <textarea
                    name="processStepsEn"
                    rows={3}
                    defaultValue={service?.processStepsEn.join("\n") ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("المدة التقديرية")}</span>
                  <textarea
                    name="durationTextEn"
                    rows={3}
                    maxLength={320}
                    defaultValue={service?.durationTextEn ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("عنوان SEO")}</span>
                  <textarea
                    name="seoTitleEn"
                    rows={3}
                    maxLength={320}
                    defaultValue={service?.seoTitleEn ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("وصف SEO")}</span>
                  <textarea
                    name="seoDescriptionEn"
                    rows={3}
                    maxLength={320}
                    defaultValue={service?.seoDescriptionEn ?? ""}
                  />
                </label>
              </div>
            </section>
          </ContentPanel>
        </ContentTabs>
        <section className="panel">
          <h2 className="form-section-title">{t("السعر والعرض")}</h2>
          <div className="form-grid mt-5">
            <label className="field">
              <span>{t("نوع السعر")}</span>
              <select
                name="priceType"
                defaultValue={service?.priceType ?? "QUOTE_REQUIRED"}
              >
                <option value="QUOTE_REQUIRED">
                  {t("حسب المعاينة / عرض سعر")}
                </option>
                <option value="FIXED">{t("سعر ثابت")}</option>
                <option value="STARTING_FROM">{t("يبدأ من")}</option>
                <option value="RANGE">{t("نطاق سعري")}</option>
              </select>
            </label>
            <Field
              label={t("السعر الابتدائي (ر.س)")}
              name="startingPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={service?.startingPrice}
            />
            <Field
              label={t("السعر الأقصى (ر.س)")}
              name="maximumPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={service?.maximumPrice}
            />
            <Field
              label={t("المدة التقديرية")}
              name="durationText"
              defaultValue={service?.durationText}
            />
            <Field
              label={t("ترتيب العرض")}
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={service?.sortOrder ?? 0}
            />
            <ImagePicker
              name="coverImageId"
              label={t("صورة الغلاف")}
              media={media}
              initialIds={service?.coverImageId ? [service.coverImageId] : []}
              onUploaded={onUploaded}
              onUploadChange={onUploadChange}
            />
            <ImagePicker
              name="galleryIds"
              label={t("معرض الصور (يمكن اختيار أكثر من صورة)")}
              media={media}
              initialIds={service?.gallery.map((item) => item.mediaId) ?? []}
              multiple
              onUploaded={onUploaded}
              onUploadChange={onUploadChange}
            />
            <Check
              label={t("نشطة وقابلة للعرض")}
              name="isActive"
              defaultChecked={service?.isActive ?? true}
            />
            <Check
              label={t("خدمة مميزة")}
              name="isFeatured"
              defaultChecked={service?.isFeatured ?? false}
            />
            <Check
              label={t("متاحة للطوارئ")}
              name="isEmergency"
              defaultChecked={service?.isEmergency ?? false}
            />
          </div>
        </section>
        <section className="panel">
          <h2 className="form-section-title">{t("تحسين محركات البحث")}</h2>
          <div className="form-grid mt-5">
            <Field
              label={t("عنوان SEO")}
              name="seoTitle"
              defaultValue={service?.seoTitle}
            />
            <label className="field sm:col-span-2">
              <span>{t("وصف SEO")}</span>
              <textarea
                name="seoDescription"
                rows={3}
                maxLength={320}
                defaultValue={service?.seoDescription ?? ""}
              />
            </label>
          </div>
        </section>
        <div className="flex justify-between">
          <Link href="/services" className="secondary-button">
            <ArrowRight className="size-4" />
            {t("رجوع")}
          </Link>
          <button
            className="primary-button px-6"
            disabled={saving || uploads > 0}
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? t("جارٍ الحفظ...") : t("حفظ الخدمة")}
          </button>
        </div>
      </form>
      {serviceId ? (
        <>
          <ServiceFieldsEditor serviceId={serviceId} />
          <ServiceLocationsEditor serviceId={serviceId} />
        </>
      ) : (
        <p className="info-banner">
          {t(
            "احفظ الخدمة أولاً، ثم ستظهر أدوات الحقول الديناميكية والتغطية الجغرافية.",
          )}
        </p>
      )}
    </div>
  );
}

function Field(props: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  pattern?: string;
  dir?: "ltr";
  min?: string;
  step?: string;
}) {
  const { t } = useI18n();
  const { label, defaultValue, ...input } = props;
  return (
    <label className="field">
      <span>{t(label)}</span>
      <input {...input} defaultValue={defaultValue ?? ""} />
    </label>
  );
}
function Check({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className="check-field">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span>{t(label)}</span>
    </label>
  );
}
function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}
function optional(form: FormData, name: string) {
  return text(form, name) || undefined;
}
function optionalNumber(form: FormData, name: string) {
  const value = optional(form, name);
  return value === undefined ? undefined : Number(value);
}
function lines(form: FormData, name: string) {
  return text(form, name)
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}
