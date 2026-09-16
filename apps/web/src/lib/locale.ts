import { headers } from "next/headers";
import { asLocale, translator } from "@repo/i18n";
export async function getI18n() {
  const locale = asLocale((await headers()).get("x-site-locale"));
  return { locale, t: translator(locale) };
}
