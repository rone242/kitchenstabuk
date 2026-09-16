"use client";
import Image from "next/image";
import { useId, useState, type ChangeEvent } from "react";
import { useI18n } from "@repo/i18n/client";
import { apiFetch } from "@/lib/api";

export interface PickerMedia {
  id: string;
  originalName: string;
  publicUrl?: string | null;
  altTextAr: string | null;
  altTextEn?: string | null;
}
export function ImagePicker({
  name,
  label,
  media,
  initialIds = [],
  multiple = false,
  onUploaded,
  onUploadChange,
}: {
  name: string;
  label: string;
  media: PickerMedia[];
  initialIds?: string[];
  multiple?: boolean;
  onUploaded: (image: PickerMedia) => void;
  onUploadChange: (delta: number) => void;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const [selected, setSelected] = useState(initialIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const displayName = (item: PickerMedia) =>
    (locale === "en" ? item.altTextEn : item.altTextAr) || item.originalName;
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    onUploadChange(1);
    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        const image = await apiFetch<PickerMedia>("/admin/media", {
          method: "POST",
          body,
        });
        onUploaded(image);
        setSelected((previous) =>
          multiple ? [...new Set([...previous, image.id])] : [image.id],
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "تعذر رفع الصورة. حاول مجدداً.",
      );
    } finally {
      setBusy(false);
      onUploadChange(-1);
    }
  }
  return (
    <div className="field image-picker">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        multiple={multiple}
        size={multiple ? 4 : undefined}
        value={multiple ? selected : (selected[0] ?? "")}
        disabled={busy}
        onChange={(event) =>
          setSelected(
            Array.from(event.target.selectedOptions)
              .map((option) => option.value)
              .filter(Boolean),
          )
        }
      >
        {!multiple && <option value="">{t("بدون صورة")}</option>}
        {selected
          .filter((value) => !media.some((item) => item.id === value))
          .map((value) => (
            <option key={value} value={value}>
              {t("الصورة الحالية")}
            </option>
          ))}
        {media.map((item) => (
          <option key={item.id} value={item.id}>
            {displayName(item)}
          </option>
        ))}
      </select>
      <label className="image-upload-label" htmlFor={`${id}-upload`}>
        {t(multiple ? "رفع صور جديدة" : "رفع صورة جديدة")}
      </label>
      <input
        id={`${id}-upload`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple={multiple}
        disabled={busy}
        onChange={upload}
      />
      <small>{t("اختر صورة من المكتبة أو ارفع صورة من جهازك.")}</small>
      {busy && <span role="status">{t("جارٍ رفع الصور...")}</span>}
      {error && (
        <span className="error-banner" role="alert">
          {t(error)}
        </span>
      )}
      <div className="image-picker-previews">
        {selected.map((value) => {
          const item = media.find((image) => image.id === value);
          return (
            <div key={value} className="image-picker-preview">
              {item?.publicUrl && (
                <Image
                  src={item.publicUrl}
                  alt={displayName(item)}
                  width={160}
                  height={110}
                  unoptimized
                />
              )}
              <span>{item ? displayName(item) : t("الصورة الحالية")}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setSelected((previous) =>
                    previous.filter((id) => id !== value),
                  )
                }
              >
                {t("إزالة الاختيار")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
