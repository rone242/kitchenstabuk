"use client";
import { useI18n } from "@repo/i18n/client";
import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{t(eyebrow)}</p>
        <h1 className="page-title">{t(title)}</h1>
        <p className="page-description">{t(description)}</p>
      </div>
      {action}
    </header>
  );
}
