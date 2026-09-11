"use client";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ServiceFieldsEditor } from "./service-fields-editor";
import { ServiceLocationsEditor } from "./service-locations-editor";

interface Category { id: string; nameAr: string }
interface Media { id: string; originalName: string; altTextAr: string | null }
interface Service {
  id: string; categoryId: string; nameAr: string; nameEn: string | null; slug: string; summary: string; description: string;
  benefits: string[]; processSteps: string[]; priceType: string; startingPrice: string | null; maximumPrice: string | null;
  currency: string; durationText: string | null; coverImageId: string | null; gallery: Array<{ mediaId: string }>;
  isEmergency: boolean; isFeatured: boolean; isActive: boolean; sortOrder: number; seoTitle: string | null; seoDescription: string | null;
}

export function ServiceForm({ serviceId }: { serviceId?: string }) {
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(Boolean(serviceId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: Category[] }>("/admin/categories?pageSize=100&isActive=true"),
      apiFetch<{ data: Media[] }>("/admin/media?pageSize=100"),
    ]).then(([categoryResult, mediaResult]) => { setCategories(categoryResult.data); setMedia(mediaResult.data); }).catch(() => setError("تعذر تحميل خيارات النموذج."));
    if (serviceId) apiFetch<Service>(`/admin/services/${serviceId}`).then(setService).catch(() => setError("تعذر تحميل الخدمة.")).finally(() => setLoading(false));
  }, [serviceId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const priceType = text(form, "priceType");
    const payload = {
      categoryId: text(form, "categoryId"), nameAr: text(form, "nameAr"), nameEn: optional(form, "nameEn"), slug: text(form, "slug"),
      summary: text(form, "summary"), description: text(form, "description"), benefits: lines(form, "benefits"), processSteps: lines(form, "processSteps"),
      priceType, startingPrice: priceType === "QUOTE_REQUIRED" ? undefined : optionalNumber(form, "startingPrice"), maximumPrice: priceType === "RANGE" ? optionalNumber(form, "maximumPrice") : undefined,
      currency: "SAR", durationText: optional(form, "durationText"), coverImageId: optional(form, "coverImageId"),
      galleryIds: form.getAll("galleryIds").map(String), isEmergency: form.get("isEmergency") === "on", isFeatured: form.get("isFeatured") === "on",
      isActive: form.get("isActive") === "on", sortOrder: Number(form.get("sortOrder") || 0), seoTitle: optional(form, "seoTitle"), seoDescription: optional(form, "seoDescription"),
    };
    try {
      const saved = await apiFetch<{ id: string }>(serviceId ? `/admin/services/${serviceId}` : "/admin/services", { method: serviceId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      if (serviceId) { setSaving(false); setError(""); router.refresh(); } else { router.replace(`/services/${saved.id}`); router.refresh(); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ الخدمة."); setSaving(false); }
  }

  if (loading) return <div className="panel">جارٍ تحميل الخدمة...</div>;
  return (
    <div className="mt-7 space-y-6">
      <form onSubmit={submit} className="space-y-6">
        {error ? <p className="error-banner">{error}</p> : null}
        <section className="panel"><h2 className="form-section-title">المعلومات الأساسية</h2><div className="form-grid mt-5">
          <Field label="اسم الخدمة بالعربية" name="nameAr" defaultValue={service?.nameAr} required />
          <Field label="الاسم بالإنجليزية" name="nameEn" defaultValue={service?.nameEn} dir="ltr" />
          <label className="field"><span>التصنيف</span><select name="categoryId" defaultValue={service?.categoryId ?? ""} required><option value="" disabled>اختر التصنيف</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select></label>
          <Field label="الرابط المختصر" name="slug" defaultValue={service?.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" required />
          <label className="field sm:col-span-2"><span>الملخص</span><textarea name="summary" rows={3} minLength={10} maxLength={500} defaultValue={service?.summary ?? ""} required /></label>
          <label className="field sm:col-span-2"><span>الوصف الكامل</span><textarea name="description" rows={8} minLength={20} defaultValue={service?.description ?? ""} required /></label>
          <label className="field"><span>الفوائد (سطر لكل فائدة)</span><textarea name="benefits" rows={5} defaultValue={service?.benefits.join("\n") ?? ""} /></label>
          <label className="field"><span>خطوات التنفيذ (سطر لكل خطوة)</span><textarea name="processSteps" rows={5} defaultValue={service?.processSteps.join("\n") ?? ""} /></label>
        </div></section>
        <section className="panel"><h2 className="form-section-title">السعر والعرض</h2><div className="form-grid mt-5">
          <label className="field"><span>نوع السعر</span><select name="priceType" defaultValue={service?.priceType ?? "QUOTE_REQUIRED"}><option value="QUOTE_REQUIRED">حسب المعاينة / عرض سعر</option><option value="FIXED">سعر ثابت</option><option value="STARTING_FROM">يبدأ من</option><option value="RANGE">نطاق سعري</option></select></label>
          <Field label="السعر الابتدائي (ر.س)" name="startingPrice" type="number" min="0" step="0.01" defaultValue={service?.startingPrice} />
          <Field label="السعر الأقصى (ر.س)" name="maximumPrice" type="number" min="0" step="0.01" defaultValue={service?.maximumPrice} />
          <Field label="المدة التقديرية" name="durationText" defaultValue={service?.durationText} />
          <Field label="ترتيب العرض" name="sortOrder" type="number" min="0" defaultValue={service?.sortOrder ?? 0} />
          <label className="field"><span>صورة الغلاف</span><select name="coverImageId" defaultValue={service?.coverImageId ?? ""}><option value="">بدون صورة</option>{media.map((item) => <option key={item.id} value={item.id}>{item.altTextAr || item.originalName}</option>)}</select></label>
          <label className="field sm:col-span-2"><span>معرض الصور (يمكن اختيار أكثر من صورة)</span><select name="galleryIds" multiple size={Math.min(Math.max(media.length, 3), 7)} defaultValue={service?.gallery.map((item) => item.mediaId) ?? []}>{media.map((item) => <option key={item.id} value={item.id}>{item.altTextAr || item.originalName}</option>)}</select></label>
          <Check label="نشطة وقابلة للعرض" name="isActive" defaultChecked={service?.isActive ?? true} /><Check label="خدمة مميزة" name="isFeatured" defaultChecked={service?.isFeatured ?? false} /><Check label="متاحة للطوارئ" name="isEmergency" defaultChecked={service?.isEmergency ?? false} />
        </div></section>
        <section className="panel"><h2 className="form-section-title">تحسين محركات البحث</h2><div className="form-grid mt-5"><Field label="عنوان SEO" name="seoTitle" defaultValue={service?.seoTitle} /><label className="field sm:col-span-2"><span>وصف SEO</span><textarea name="seoDescription" rows={3} maxLength={320} defaultValue={service?.seoDescription ?? ""} /></label></div></section>
        <div className="flex justify-between"><Link href="/services" className="secondary-button"><ArrowRight className="size-4" /> رجوع</Link><button className="primary-button px-6" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "جارٍ الحفظ..." : "حفظ الخدمة"}</button></div>
      </form>
      {serviceId ? <><ServiceFieldsEditor serviceId={serviceId} /><ServiceLocationsEditor serviceId={serviceId} /></> : <p className="info-banner">احفظ الخدمة أولاً، ثم ستظهر أدوات الحقول الديناميكية والتغطية الجغرافية.</p>}
    </div>
  );
}

function Field(props: { label: string; name: string; defaultValue?: string | number | null; required?: boolean; type?: string; pattern?: string; dir?: "ltr"; min?: string; step?: string }) { const { label, defaultValue, ...input } = props; return <label className="field"><span>{label}</span><input {...input} defaultValue={defaultValue ?? ""} /></label>; }
function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) { return <label className="check-field"><input type="checkbox" name={name} defaultChecked={defaultChecked} /><span>{label}</span></label>; }
function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function optional(form: FormData, name: string) { return text(form, name) || undefined; }
function optionalNumber(form: FormData, name: string) { const value = optional(form, name); return value === undefined ? undefined : Number(value); }
function lines(form: FormData, name: string) { return text(form, name).split("\n").map((value) => value.trim()).filter(Boolean); }
