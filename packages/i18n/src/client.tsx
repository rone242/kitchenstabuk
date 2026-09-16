"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Locale, localizedName, translator } from "./index";
const Context = createContext<{
  locale: Locale;
  setLocale: (value: Locale) => void;
} | null>(null);
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale === "ar" ? "ar-SA" : "en";
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.cookie = `kst_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }, [locale]);
  useEffect(() => {
    const t = translator(locale);
    function control(target: EventTarget | null) {
      return target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
        ? target
        : null;
    }
    function clear(event: Event) {
      const input = control(event.target);
      if (input?.dataset.localizedValidation) {
        input.setCustomValidity("");
        delete input.dataset.localizedValidation;
      }
    }
    function invalid(event: Event) {
      const input = control(event.target);
      if (!input) return;
      if (input.dataset.localizedValidation) input.setCustomValidity("");
      const validity = input.validity;
      const message = validity.valueMissing
        ? "يرجى تعبئة هذا الحقل."
        : validity.typeMismatch || validity.patternMismatch
          ? "أدخل قيمة بالتنسيق المطلوب."
          : validity.rangeUnderflow ||
              validity.rangeOverflow ||
              validity.stepMismatch
            ? "أدخل قيمة ضمن الحدود المحددة."
            : validity.tooShort || validity.tooLong
              ? "يرجى التحقق من طول النص."
              : validity.badInput
                ? "اختر قيمة صالحة."
                : "";
      if (message) {
        input.setCustomValidity(t(message));
        input.dataset.localizedValidation = "true";
      }
    }
    document
      .querySelectorAll("[data-localized-validation]")
      .forEach((element) => {
        const input = control(element);
        if (input) {
          input.setCustomValidity("");
          delete input.dataset.localizedValidation;
        }
      });
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", clear, true);
    document.addEventListener("change", clear, true);
    return () => {
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", clear, true);
      document.removeEventListener("change", clear, true);
    };
  }, [locale]);
  return (
    <Context.Provider value={useMemo(() => ({ locale, setLocale }), [locale])}>
      {children}
    </Context.Provider>
  );
}
export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error("LanguageProvider is required");
  return useMemo(
    () => ({
      ...context,
      t: translator(context.locale),
      name: (item: { nameAr: string; nameEn?: string | null }) =>
        localizedName(context.locale, item),
      numberLocale: context.locale === "ar" ? "ar-SA" : "en-SA",
    }),
    [context],
  );
}
export function LanguageToggle({
  onChange,
}: {
  onChange?: (locale: Locale) => void;
}) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className="language-toggle"
      role="group"
      aria-label={locale === "ar" ? "لغة العرض" : "Display language"}
    >
      {(["ar", "en"] as const).map((value) => (
        <button
          type="button"
          key={value}
          lang={value}
          aria-pressed={locale === value}
          onClick={() => {
            if (value !== locale) {
              if (onChange) onChange(value);
              else setLocale(value);
            }
          }}
        >
          {value === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}
