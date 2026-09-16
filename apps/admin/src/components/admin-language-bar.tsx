"use client";
import { useEffect } from "react";
import { LanguageToggle, useI18n } from "@repo/i18n/client";
export function AdminLanguageBar() {
  const { t } = useI18n();
  useEffect(() => {
    document.title = t("لوحة إدارة خدماتك");
  }, [t]);
  return (
    <div className="language-bar">
      <LanguageToggle />
    </div>
  );
}
