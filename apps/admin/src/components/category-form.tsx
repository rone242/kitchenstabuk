"use client";
import { ImagePicker, type PickerMedia } from "./image-picker";
import { ContentTabs, ContentPanel } from "./content-tabs";
import { useI18n } from "@repo/i18n/client";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Category {
  shortDescriptionEn: string | null;
  descriptionEn: string | null;
  seoTitleEn: string | null;
  seoDescriptionEn: string | null;

  nameAr: string;
  nameEn: string | null;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  icon: string | null;
  imageId: string | null;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}
type Media = PickerMedia;

export function CategoryForm({ categoryId }: { categoryId?: string }) {
  const { t } = useI18n();

  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(Boolean(categoryId));
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
    apiFetch<{ data: Media[] }>("/admin/media?pageSize=100")
      .then((result) => setMedia(result.data))
      .catch(() => undefined);
    if (categoryId)
      apiFetch<Category>(`/admin/categories/${categoryId}`)
        .then(setCategory)
        .catch(() => setError("تعذر تحميل التصنيف."))
        .finally(() => setLoading(false));
  }, [categoryId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploads > 0) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      shortDescriptionEn: text(form, "shortDescriptionEn"),
      descriptionEn: text(form, "descriptionEn"),
      seoTitleEn: text(form, "seoTitleEn"),
      seoDescriptionEn: text(form, "seoDescriptionEn"),

      nameAr: text(form, "nameAr"),
      nameEn: text(form, "nameEn"),
      slug: text(form, "slug"),
      shortDescription: optional(form, "shortDescription"),
      description: optional(form, "description"),
      icon: optional(form, "icon"),
      imageId: text(form, "imageId") || null,
      sortOrder: Number(form.get("sortOrder") || 0),
      isFeatured: form.get("isFeatured") === "on",
      isActive: form.get("isActive") === "on",
      seoTitle: optional(form, "seoTitle"),
      seoDescription: optional(form, "seoDescription"),
    };
    try {
      await apiFetch(
        categoryId ? `/admin/categories/${categoryId}` : "/admin/categories",
        {
          method: categoryId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      router.push("/categories");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ التصنيف.");
      setSaving(false);
    }
  }

  if (loading) return <div className="panel">{t("جارٍ تحميل التصنيف...")}</div>;
  return (
    <form onSubmit={submit} className="mt-7 space-y-6">
      {error ? <p className="error-banner">{t(error)}</p> : null}
      <ContentTabs
        incomplete={Boolean(
          category &&
          (!category.nameEn?.trim() ||
            (category.description && !category.descriptionEn?.trim()) ||
            (category.shortDescription &&
              !category.shortDescriptionEn?.trim())),
        )}
      >
        <ContentPanel locale="ar">
          <section className="panel">
            <h2 className="form-section-title">{t("المعلومات الأساسية")}</h2>
            <div className="form-grid mt-5">
              <Field
                label={t("الاسم بالعربية")}
                name="nameAr"
                defaultValue={category?.nameAr}
                required
              />
              <Field
                label={t("الرابط المختصر")}
                name="slug"
                defaultValue={category?.slug}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                dir="ltr"
                required
              />
              <Field
                label={t("رمز الأيقونة")}
                name="icon"
                defaultValue={category?.icon}
                dir="ltr"
              />
              <label className="field sm:col-span-2">
                <span>{t("الوصف المختصر")}</span>
                <textarea
                  name="shortDescription"
                  rows={2}
                  defaultValue={category?.shortDescription ?? ""}
                  maxLength={240}
                />
              </label>
              <label className="field sm:col-span-2">
                <span>{t("الوصف الكامل")}</span>
                <textarea
                  name="description"
                  rows={6}
                  defaultValue={category?.description ?? ""}
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
                defaultValue={category?.nameEn}
                dir="ltr"
              />
              <label className="field">
                <span>{t("الوصف المختصر")}</span>
                <textarea
                  name="shortDescriptionEn"
                  rows={3}
                  maxLength={320}
                  defaultValue={category?.shortDescriptionEn ?? ""}
                />
              </label>
              <label className="field">
                <span>{t("الوصف الكامل")}</span>
                <textarea
                  name="descriptionEn"
                  rows={6}
                  maxLength={30000}
                  defaultValue={category?.descriptionEn ?? ""}
                />
              </label>
              <label className="field">
                <span>{t("عنوان SEO")}</span>
                <textarea
                  name="seoTitleEn"
                  rows={3}
                  maxLength={320}
                  defaultValue={category?.seoTitleEn ?? ""}
                />
              </label>
              <label className="field">
                <span>{t("وصف SEO")}</span>
                <textarea
                  name="seoDescriptionEn"
                  rows={3}
                  maxLength={320}
                  defaultValue={category?.seoDescriptionEn ?? ""}
                />
              </label>
            </div>
          </section>
        </ContentPanel>
      </ContentTabs>
      <section className="panel">
        <h2 className="form-section-title">{t("العرض والصورة")}</h2>
        <div className="form-grid mt-5">
          <Field
            label={t("ترتيب العرض")}
            name="sortOrder"
            type="number"
            min="0"
            defaultValue={category?.sortOrder ?? 0}
          />
          <ImagePicker
            name="imageId"
            label={t("صورة التصنيف")}
            media={media}
            initialIds={category?.imageId ? [category.imageId] : []}
            onUploaded={onUploaded}
            onUploadChange={onUploadChange}
          />
          <Check
            label={t("نشط وقابل للعرض")}
            name="isActive"
            defaultChecked={category?.isActive ?? true}
          />
          <Check
            label={t("تصنيف مميز")}
            name="isFeatured"
            defaultChecked={category?.isFeatured ?? false}
          />
        </div>
      </section>
      <section className="panel">
        <h2 className="form-section-title">{t("تحسين محركات البحث")}</h2>
        <div className="form-grid mt-5">
          <Field
            label={t("عنوان SEO")}
            name="seoTitle"
            defaultValue={category?.seoTitle}
          />
          <label className="field sm:col-span-2">
            <span>{t("وصف SEO")}</span>
            <textarea
              name="seoDescription"
              rows={3}
              maxLength={320}
              defaultValue={category?.seoDescription ?? ""}
            />
          </label>
        </div>
      </section>
      <div className="flex justify-between">
        <Link href="/categories" className="secondary-button">
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
          {saving ? t("جارٍ الحفظ...") : t("حفظ التصنيف")}
        </button>
      </div>
    </form>
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
}) {
  const { t } = useI18n();

  const { label, ...input } = props;
  return (
    <label className="field">
      <span>{t(label)}</span>
      <input {...input} defaultValue={props.defaultValue ?? ""} />
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
