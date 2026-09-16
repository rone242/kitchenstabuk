import { type Locale, translate } from "@repo/i18n";
export interface Service {
  id: string;
  slug: string;
  nameAr: string;
  name: string;
  nameEn: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  summary: string;
  description: string;
  benefits: string[];
  processSteps: string[];
  priceType: string;
  startingPrice: string | null;
  maximumPrice: string | null;
  currency: string;
  durationText: string | null;
  coverImage: ServiceImage | null;
  gallery: Array<{ media: ServiceImage }>;
  category: { id: string; nameAr: string; name: string };
}
export interface ServiceImage {
  publicUrl: string | null;
  altTextAr: string | null;
  altTextEn: string | null;
  width: number | null;
  height: number | null;
}
export interface Options {
  categories: { id: string; nameAr: string; name: string }[];
  cities: { id: string; nameAr: string; name: string }[];
}
export interface HomeContent {
  portfolio: Array<{
    id: string;
    titleAr: string;
    description: string | null;
    completedAt: string | null;
    serviceName: string;
    cityName: string | null;
    image: {
      publicUrl: string | null;
      altTextAr: string | null;
      altTextEn: string | null;
      width: number | null;
      height: number | null;
    } | null;
    beforeImage: {
      publicUrl: string | null;
      altTextAr: string | null;
      altTextEn: string | null;
      width: number | null;
      height: number | null;
    } | null;
  }>;
  reviews: Array<{
    id: string;
    customerName: string;
    cityName: string | null;
    rating: number;
    body: string;
  }>;
  settings: Record<string, string>;
}
export async function catalogueFetch<T>(
  path: string,
  locale: Locale = "ar",
): Promise<T | null> {
  const base =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api";
  const response = await fetch(
    `${base}/catalogue/${path}${path.includes("?") ? "&" : "?"}locale=${locale}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Catalogue unavailable");
  return response.json();
}
export function price(service: Service, locale: Locale) {
  if (service.priceType === "QUOTE_REQUIRED" || service.startingPrice === null)
    return translate(locale, "السعر حسب تفاصيل الخدمة");
  const format = (value: string) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
      style: "currency",
      currency: service.currency,
    }).format(Number(value));
  if (service.priceType === "FIXED") return format(service.startingPrice);
  if (service.priceType === "RANGE" && service.maximumPrice !== null)
    return `${format(service.startingPrice)} – ${format(service.maximumPrice)}`;
  return `${translate(locale, "يبدأ من")} ${format(service.startingPrice)}`;
}
export function whatsappLink(
  phone: string,
  serviceName: string,
  locale: Locale,
) {
  const number = phone.replace(/\D/g, "");
  const message =
    locale === "ar"
      ? `مرحباً، أود حجز خدمة ${serviceName}`
      : `Hello, I would like to book ${serviceName}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
