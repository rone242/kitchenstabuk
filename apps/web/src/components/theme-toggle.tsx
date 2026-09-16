"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@repo/i18n/client";

function isDark() {
  const theme = document.documentElement.dataset.theme;
  return (
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}
function subscribe(onChange: () => void) {
  const preference = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  preference.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    preference.removeEventListener("change", onChange);
  };
}

export function ThemeToggle() {
  const { t } = useI18n();
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  function toggle() {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `kst_theme=${next};path=/;max-age=31536000;SameSite=Lax`;
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      className="theme-toggle"
      onClick={toggle}
      aria-label={t("ليلي")}
      title={t("تبديل الوضع النهاري والليلي")}
    >
      <Sun className="theme-toggle-sun" size={17} aria-hidden="true" />
      <Moon className="theme-toggle-moon" size={17} aria-hidden="true" />
      <span className="theme-toggle-thumb" aria-hidden="true" />
    </button>
  );
}
