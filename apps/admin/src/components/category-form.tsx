"use client";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Category {
  nameAr: string; nameEn: string | null; slug: string; shortDescription: string | null;
  description: string | null; icon: string | null; imageId: string | null; sortOrder: number;
  isFeatured: boolean; isActive: boolean; seoTitle: string | null; seoDescription: string | null;
}
interface Media { id: string; originalName: string; publicUrl: string | null; altTextAr: string | null }

export function CategoryForm({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(Boolean(categoryId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: Media[] }>("/admin/media?pageSize=100").then((result) => setMedia(result.data)).catch(() => undefined);
    if (categoryId) apiFetch<Category>(`/admin/categories/${categoryId}`).then(setCategory).catch(() => setError("تعذر تحميل التصنيف.")).finally(() => setLoading(false));
  }, [categoryId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      nameAr: text(form, "nameAr"), nameEn: optional(form, "nameEn"), slug: text(form, "slug"),
      shortDescription: optional(form, "shortDescription"), description: optional(form, "description"), icon: optional(form, "icon"),
      imageId: optional(form, "imageId"), sortOrder: Number(form.get("sortOrder") || 0),
      isFeatured: form.get("isFeatured") === "on", isActive: form.get("isActive") === "on",
      seoTitle: optional(form, "seoTitle"), seoDescription: optional(form, "seoDescription"),
    };
    try {
      await apiFetch(categoryId ? `/admin/categories/${categoryId}` : "/admin/categories", { method: categoryId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      router.push("/categories"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ التصنيف."); setSaving(false); }
  }

  if (loading) return <div className="panel">جارٍ تحميل التصنيف...</div>;
  return (
    <form onSubmit={submit} className="mt-7 space-y-6">
      {error ? <p className="error-banner">{error}</p> : null}
      <section className="panel"><h2 className="form-section-title">المعلومات الأساسية</h2><div className="form-grid mt-5">
        <Field label="الاسم بالعربية" name="nameAr" defaultValue={category?.nameAr} required />
        <Field label="الاسم بالإنجليزية" name="nameEn" defaultValue={category?.nameEn} dir="ltr" />
        <Field label="الرابط المختصر" name="slug" defaultValue={category?.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" required />
        <Field label="رمز الأيقونة" name="icon" defaultValue={category?.icon} dir="ltr" />
        <label className="field sm:col-span-2"><span>الوصف المختصر</span><textarea name="shortDescription" rows={2} defaultValue={category?.shortDescription ?? ""} maxLength={240} /></label>
        <label className="field sm:col-span-2"><span>الوصف الكامل</span><textarea name="description" rows={6} defaultValue={category?.description ?? ""} /></label>
      </div></section>
      <section className="panel"><h2 className="form-section-title">العرض والصورة</h2><div className="form-grid mt-5">
        <Field label="ترتيب العرض" name="sortOrder" type="number" min="0" defaultValue={category?.sortOrder ?? 0} />
        <label className="field"><span>صورة التصنيف</span><select name="imageId" defaultValue={category?.imageId ?? ""}><option value="">بدون صورة</option>{media.map((item) => <option key={item.id} value={item.id}>{item.altTextAr || item.originalName}</option>)}</select></label>
        <Check label="نشط وقابل للعرض" name="isActive" defaultChecked={category?.isActive ?? true} />
        <Check label="تصنيف مميز" name="isFeatured" defaultChecked={category?.isFeatured ?? false} />
      </div></section>
      <section className="panel"><h2 className="form-section-title">تحسين محركات البحث</h2><div className="form-grid mt-5"><Field label="عنوان SEO" name="seoTitle" defaultValue={category?.seoTitle} /><label className="field sm:col-span-2"><span>وصف SEO</span><textarea name="seoDescription" rows={3} maxLength={320} defaultValue={category?.seoDescription ?? ""} /></label></div></section>
      <div className="flex justify-between"><Link href="/categories" className="secondary-button"><ArrowRight className="size-4" /> رجوع</Link><button className="primary-button px-6" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "جارٍ الحفظ..." : "حفظ التصنيف"}</button></div>
    </form>
  );
}

function Field(props: { label: string; name: string; defaultValue?: string | number | null; required?: boolean; type?: string; pattern?: string; dir?: "ltr"; min?: string }) {
  const { label, ...input } = props; return <label className="field"><span>{label}</span><input {...input} defaultValue={props.defaultValue ?? ""} /></label>;
}
function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) { return <label className="check-field"><input type="checkbox" name={name} defaultChecked={defaultChecked} /><span>{label}</span></label>; }
function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function optional(form: FormData, name: string) { return text(form, name) || undefined; }
