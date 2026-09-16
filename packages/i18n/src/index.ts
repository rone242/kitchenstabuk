import { messages } from "./messages";
const reverseMessages = Object.fromEntries(
  Object.entries(messages).map(([ar, en]) => [en, ar]),
);
export type Locale = "ar" | "en";
export function asLocale(value: unknown): Locale {
  return value === "en" ? "en" : "ar";
}
export function translate(locale: Locale, source: string): string {
  if (source.includes(" · "))
    return source
      .split(" · ")
      .map((part) => translate(locale, part))
      .join(" · ");
  const normalized = source.replace(/\s+/g, " ").trim();
  if (locale === "en") return messages[normalized] ?? source;
  if (reverseMessages[normalized]) return reverseMessages[normalized];
  if (/ (must |should |is not allowed)/.test(source))
    return `تحقق من قيمة الحقل: ${source.split(" ")[0]}`;
  return source;
}
export function translator(locale: Locale) {
  return (source: string) => translate(locale, source);
}
export function localizedName(
  locale: Locale,
  item: { nameAr: string; nameEn?: string | null },
): string {
  return locale === "en" && item.nameEn?.trim() ? item.nameEn : item.nameAr;
}
export function languagePath(path: string, locale: Locale) {
  return `/${locale}${path.replace(/^\/(ar|en)(?=\/|\?|#|$)/, "").replace(/^\/$/, "")}`;
}
