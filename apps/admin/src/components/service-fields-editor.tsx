"use client";
import { useI18n } from "@repo/i18n/client";

import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Field {
  id: string;
  key: string;
  type: string;
  labelAr: string;
  labelEn?: string | null;
  isRequired: boolean;
  isActive: boolean;
  options: Array<{
    value: string;
    labelAr: string;
    labelEn?: string | null;
    isActive: boolean;
    sortOrder: number;
  }>;
}
const types = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "SELECT",
  "MULTISELECT",
  "RADIO",
  "CHECKBOX",
  "DATE",
  "TIME",
  "FILE",
  "IMAGE",
  "BOOLEAN",
];

export function ServiceFieldsEditor({ serviceId }: { serviceId: string }) {
  const { t, locale } = useI18n();

  const [fields, setFields] = useState<Field[]>([]);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    apiFetch<Field[]>(`/admin/services/${serviceId}/fields`)
      .then(setFields)
      .catch(() => setError("تعذر تحميل الحقول."));
  }, [serviceId, refresh]);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("type"));
    const options = String(form.get("options") ?? "")
      .split("\n")
      .map((line, index) => {
        const [value, labelAr, labelEn] = line.split("|");
        return {
          value: value?.trim(),
          labelAr: labelAr?.trim(),
          labelEn: labelEn?.trim() || undefined,
          sortOrder: index,
        };
      })
      .filter((item) => item.value && item.labelAr);
    try {
      await apiFetch(`/admin/services/${serviceId}/fields`, {
        method: "POST",
        body: JSON.stringify({
          key: String(form.get("key")),
          labelAr: String(form.get("labelAr")),
          labelEn: String(form.get("labelEn") ?? ""),
          type,
          isRequired: form.get("isRequired") === "on",
          isActive: true,
          options,
        }),
      });
      formElement.reset();
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إضافة الحقل.");
    }
  }
  async function saveTranslation(
    event: FormEvent<HTMLFormElement>,
    field: Field,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(`/admin/services/${serviceId}/fields/${field.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          labelAr: String(form.get("labelAr")),
          labelEn: String(form.get("labelEn") ?? ""),
          options: field.options.map((option) => ({
            value: option.value,
            labelAr: String(form.get(`ar-${option.value}`)),
            labelEn: String(form.get(`en-${option.value}`) ?? ""),
            isActive: option.isActive,
            sortOrder: option.sortOrder,
          })),
        }),
      });
      setRefresh((value) => value + 1);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر الحفظ.");
    }
  }
  async function toggle(field: Field) {
    await apiFetch(`/admin/services/${serviceId}/fields/${field.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !field.isActive }),
    });
    setRefresh((value) => value + 1);
  }
  async function remove(field: Field) {
    if (
      !confirm(
        `${t("حذف")} «${locale === "en" && field.labelEn ? field.labelEn : field.labelAr}»?`,
      )
    )
      return;
    try {
      await apiFetch(`/admin/services/${serviceId}/fields/${field.id}`, {
        method: "DELETE",
      });
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حذف الحقل.");
    }
  }
  return (
    <section className="panel">
      <div>
        <p className="eyebrow">{t("نموذج الطلب")}</p>
        <h2 className="form-section-title mt-1">{t("الحقول الديناميكية")}</h2>
      </div>
      {error ? <p className="error-banner mt-4">{t(error)}</p> : null}
      <div className="mt-5 grid gap-3">
        {fields.map((field) => (
          <article
            className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            key={field.id}
          >
            <div>
              <strong>
                {locale === "en" && field.labelEn
                  ? field.labelEn
                  : field.labelAr}
              </strong>
              <p className="mt-1 text-xs text-slate-400" dir="ltr">
                {field.key} · {field.type}
                {field.options.length
                  ? ` · ${field.options.length} options`
                  : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={
                  field.isActive ? "status-pill" : "status-pill status-muted"
                }
                onClick={() => toggle(field)}
              >
                {field.isActive ? t("نشط") : t("متوقف")}
              </button>
              <button
                type="button"
                className="icon-button danger"
                onClick={() => remove(field)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <details className="w-full">
              <summary>{t("تعديل")}</summary>
              <form
                onSubmit={(event) => saveTranslation(event, field)}
                className="form-grid mt-4"
              >
                <label className="field">
                  <span>{t("العنوان بالعربية")}</span>
                  <input
                    name="labelAr"
                    defaultValue={field.labelAr}
                    required
                    dir="rtl"
                  />
                </label>
                <label className="field">
                  <span>{t("العنوان بالإنجليزية")}</span>
                  <input
                    name="labelEn"
                    defaultValue={field.labelEn ?? ""}
                    dir="ltr"
                  />
                </label>
                {field.options.map((option) => (
                  <div className="form-grid" key={option.value}>
                    <label className="field">
                      <span>
                        {option.value} · {t("العربية")}
                      </span>
                      <input
                        name={`ar-${option.value}`}
                        defaultValue={option.labelAr}
                        required
                        dir="rtl"
                      />
                    </label>
                    <label className="field">
                      <span>
                        {option.value} · {t("الإنجليزية")}
                      </span>
                      <input
                        name={`en-${option.value}`}
                        defaultValue={option.labelEn ?? ""}
                        dir="ltr"
                      />
                    </label>
                  </div>
                ))}
                <button type="submit" className="secondary-button">
                  {t("حفظ")}
                </button>
              </form>
            </details>
          </article>
        ))}
        {!fields.length ? (
          <p className="empty-inline">
            {t("لم تُضف أسئلة مخصصة لهذه الخدمة.")}
          </p>
        ) : null}
      </div>
      <form onSubmit={add} className="mt-6 rounded-xl bg-slate-50 p-4">
        <h3 className="font-bold text-slate-800">{t("إضافة حقل")}</h3>
        <div className="form-grid mt-4">
          <label className="field">
            <span>{t("المفتاح البرمجي")}</span>
            <input name="key" dir="ltr" pattern="[a-z][a-z0-9_]*" required />
          </label>
          <label className="field">
            <span>{t("العنوان بالعربية")}</span>
            <input name="labelAr" required />
          </label>
          <label className="field">
            <span>{t("العنوان بالإنجليزية")}</span>
            <input name="labelEn" dir="ltr" />
          </label>
          <label className="field">
            <span>{t("نوع الحقل")}</span>
            <select name="type">
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="check-field">
            <input type="checkbox" name="isRequired" />
            <span>{t("إجابة مطلوبة")}</span>
          </label>
          <label className="field sm:col-span-2">
            <span>
              {t("خيارات حقول الاختيار — value|العنوان، سطر لكل خيار")}
            </span>
            <textarea
              name="options"
              rows={4}
              dir="ltr"
              placeholder={t("small|صغير\nlarge|كبير")}
            />
          </label>
        </div>
        <button className="secondary-button mt-4" type="submit">
          <Plus className="size-4" />
          {t("إضافة الحقل")}
        </button>
      </form>
    </section>
  );
}
