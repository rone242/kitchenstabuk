"use client";
import { LanguageToggle } from "@repo/i18n/client";
import { languagePath } from "@repo/i18n";
export function LanguageSwitcher() {
  return (
    <LanguageToggle
      onChange={(locale) => {
        const url = new URL(window.location.href);
        // Keep unfinished search/filter input when switching the public catalogue.
        const form = document.querySelector<HTMLFormElement>("form.filters");
        if (form) {
          const data = new FormData(form);
          for (const key of ["search", "cityId", "categoryId"]) {
            const value = String(data.get(key) ?? "");
            if (value) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
          }
        }
        url.pathname = languagePath(url.pathname, locale);
        // A section anchor can put the translated page at the map or another
        // section; language changes should always begin at the top of the page.
        url.hash = "";
        window.location.assign(url.toString());
      }}
    />
  );
}
