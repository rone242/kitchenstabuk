export interface Service {
  id: string;
  slug: string;
  nameAr: string;
  summary: string;
  description: string;
  benefits: string[];
  processSteps: string[];
  priceType: string;
  startingPrice: string | null;
  maximumPrice: string | null;
  currency: string;
  durationText: string | null;
  category: { id: string; nameAr: string };
}
export interface Options {
  categories: { id: string; nameAr: string }[];
  cities: { id: string; nameAr: string }[];
}
export async function catalogueFetch<T>(path: string): Promise<T | null> {
  const base =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api";
  const response = await fetch(`${base}/catalogue/${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Catalogue unavailable");
  return response.json();
}
export function price(service: Service) {
  if (service.priceType === "QUOTE_REQUIRED" || service.startingPrice === null)
    return "السعر حسب تفاصيل الخدمة";
  return `ابتداءً من ${new Intl.NumberFormat("ar-SA", { style: "currency", currency: service.currency }).format(Number(service.startingPrice))}`;
}
