"use client";
import { ImagePicker, type PickerMedia } from "./image-picker";
import { useI18n } from "@repo/i18n/client";
import { Pencil, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Named {
  id: string;
  nameAr: string;
  nameEn?: string | null;
}
type Media = PickerMedia;
type City = Named;
interface Project {
  id: string;
  serviceId: string;
  cityId: string | null;
  beforeImageId: string | null;
  imageId: string | null;
  titleAr: string;
  description: string | null;
  completedAt: string | null;
  isPublished: boolean;
  sortOrder: number;
  service: Named;
  city: City | null;
}

export function PortfolioManager() {
  const { t, name } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Named[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploads, setUploads] = useState(0);
  const onUploadChange = (delta: number) =>
    setUploads((count) => count + delta);
  const onUploaded = (image: PickerMedia) =>
    setMedia((items) => [
      image,
      ...items.filter((item) => item.id !== image.id),
    ]);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    Promise.all([
      apiFetch<Project[]>("/admin/portfolio"),
      apiFetch<{ data: Named[] }>("/admin/services?pageSize=100"),
      apiFetch<{ data: Media[] }>("/admin/media?pageSize=100"),
      apiFetch<Array<{ regions: Array<{ cities: City[] }> }>>(
        "/admin/locations/options",
      ),
    ])
      .then(([projectRows, serviceRows, mediaRows, countries]) => {
        setProjects(projectRows);
        setServices(serviceRows.data);
        setMedia(mediaRows.data);
        setCities(
          countries.flatMap((country) =>
            country.regions.flatMap((region) => region.cities),
          ),
        );
        setError("");
      })
      .catch(() => setError("تعذر تحميل المشاريع."));
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploads > 0) return;
    const form = new FormData(event.currentTarget);
    const optional = (key: string) =>
      String(form.get(key) ?? "").trim() || undefined;
    const payload = {
      serviceId: String(form.get("serviceId")),
      cityId: optional("cityId"),
      beforeImageId: String(form.get("beforeImageId") ?? "") || null,
      imageId: String(form.get("imageId") ?? "") || null,
      titleAr: String(form.get("titleAr")),
      description: optional("description"),
      completedAt: optional("completedAt"),
      sortOrder: Number(form.get("sortOrder") || 0),
      isPublished: form.get("isPublished") === "on",
    };
    try {
      await apiFetch(`/admin/portfolio${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setEditing(null);
      setShowForm(false);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المشروع.");
    }
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button
          className="primary-button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="size-4" /> {t("مشروع جديد")}
        </button>
      </div>
      {error ? <p className="error-banner mt-4">{t(error)}</p> : null}
      {showForm || editing ? (
        <form
          key={editing?.id ?? "new"}
          className="panel mt-5"
          onSubmit={submit}
        >
          <h2 className="form-section-title">
            {t(editing ? "تعديل المشروع" : "مشروع جديد")}
          </h2>
          <div className="form-grid mt-5">
            <label className="field">
              <span>{t("عنوان المشروع")}</span>
              <input
                name="titleAr"
                required
                maxLength={180}
                defaultValue={editing?.titleAr}
              />
            </label>
            <label className="field">
              <span>{t("الخدمة")}</span>
              <select
                name="serviceId"
                required
                defaultValue={editing?.serviceId}
              >
                <option value="">{t("اختر")}</option>
                {services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {name(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("المدينة")}</span>
              <select name="cityId" defaultValue={editing?.cityId ?? ""}>
                <option value="">{t("اختر")}</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {name(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("تاريخ الإنجاز")}</span>
              <input
                name="completedAt"
                type="date"
                defaultValue={editing?.completedAt?.slice(0, 10)}
              />
            </label>
            <ImagePicker
              name="beforeImageId"
              label={t("صورة قبل العمل")}
              media={media}
              initialIds={editing?.beforeImageId ? [editing.beforeImageId] : []}
              onUploaded={onUploaded}
              onUploadChange={onUploadChange}
            />
            <ImagePicker
              name="imageId"
              label={t("صورة بعد العمل")}
              media={media}
              initialIds={editing?.imageId ? [editing.imageId] : []}
              onUploaded={onUploaded}
              onUploadChange={onUploadChange}
            />
            <label className="field sm:col-span-2">
              <span>{t("تفاصيل المشروع")}</span>
              <textarea
                name="description"
                rows={5}
                defaultValue={editing?.description ?? ""}
              />
            </label>
            <label className="field">
              <span>{t("الترتيب")}</span>
              <input
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={editing?.sortOrder ?? 0}
              />
            </label>
            <label className="field flex-row items-center">
              <input
                className="w-auto"
                name="isPublished"
                type="checkbox"
                defaultChecked={editing?.isPublished ?? true}
              />
              <span>{t("منشور على الموقع")}</span>
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button className="primary-button" disabled={uploads > 0}>
              {t("حفظ")}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setEditing(null);
                setShowForm(false);
              }}
            >
              {t("رجوع")}
            </button>
          </div>
        </form>
      ) : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <article className="panel" key={project.id}>
            <span
              className={
                project.isPublished ? "status-pill" : "status-pill status-muted"
              }
            >
              {t(project.isPublished ? "منشور" : "مسودة")}
            </span>
            <h2 className="mt-4 text-lg font-bold">{project.titleAr}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {name(project.service)}
              {project.city ? ` · ${name(project.city)}` : ""}
            </p>
            <button
              className="icon-button mt-5"
              onClick={() => {
                setEditing(project);
                setShowForm(false);
              }}
            >
              <Pencil className="size-4" /> {t("تعديل")}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
