"use client";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@repo/i18n/client";
const ContentContext = createContext<"ar" | "en">("ar");
export function ContentTabs({
  children,
  incomplete,
}: {
  children: ReactNode;
  incomplete?: boolean;
}) {
  const { t } = useI18n();
  const [contentLocale, setContentLocale] = useState<"ar" | "en">("ar");
  const id = useId();
  return (
    <ContentContext.Provider value={contentLocale}>
      <div
        className="content-tabs"
        role="tablist"
        aria-label={t("المعلومات الأساسية")}
      >
        {(["ar", "en"] as const).map((locale) => (
          <button
            key={locale}
            id={`${id}-${locale}`}
            aria-controls={`${id}-panel`}
            type="button"
            role="tab"
            aria-selected={contentLocale === locale}
            tabIndex={contentLocale === locale ? 0 : -1}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "ar"
                  : event.key === "End"
                    ? "en"
                    : contentLocale === "ar"
                      ? "en"
                      : "ar";
              setContentLocale(next);
              document.getElementById(`${id}-${next}`)?.focus();
            }}
            onClick={() => setContentLocale(locale)}
          >
            {t(locale === "ar" ? "محتوى عربي" : "محتوى إنجليزي")}
          </button>
        ))}
      </div>
      {incomplete && (
        <p className="info-banner mb-4">
          {t("أكمل الترجمة الإنجليزية لعرض المحتوى كاملاً بالإنجليزية.")}
        </p>
      )}
      <div
        onInvalidCapture={(event) => {
          const input = event.target as HTMLInputElement;
          if (input.closest("[hidden]")) {
            event.preventDefault();
            setContentLocale(
              input.closest("[dir]")?.getAttribute("dir") === "ltr"
                ? "en"
                : "ar",
            );
            requestAnimationFrame(() => input.reportValidity());
          }
        }}
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${contentLocale}`}
      >
        {children}
      </div>
    </ContentContext.Provider>
  );
}
// Both sets stay mounted: toggling UI/content language never discards an unfinished form.
export function ContentPanel({
  locale,
  children,
}: {
  locale: "ar" | "en";
  children: ReactNode;
}) {
  const selected = useContext(ContentContext);
  return (
    <div hidden={selected !== locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      {children}
    </div>
  );
}
