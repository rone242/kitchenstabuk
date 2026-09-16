import { cache } from "react";
import { catalogueFetch, type ServiceImage } from "./catalogue";
import type { Locale } from "@repo/i18n";
export interface SiteSettings {
  phone?: string;
  whatsapp?: string;
  officeTitleAr?: string;
  officeTitleEn?: string;
  officeAddressAr?: string;
  officeAddressEn?: string;
  officeLatitude?: string;
  officeLongitude?: string;
  titleAr?: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  locationTitleAr?: string;
  locationTitleEn?: string;
  theme?: "light" | "dark" | "system";
  logo?: ServiceImage | null;
  thumbnail?: ServiceImage | null;
  heroBackground?: ServiceImage | null;
  slides?: (ServiceImage & { id: string })[];
}
export const getSiteSettings = cache(
  async (locale: Locale): Promise<SiteSettings> =>
    (await catalogueFetch<SiteSettings>("site-settings", locale).catch(
      () => null,
    )) ?? {},
);
