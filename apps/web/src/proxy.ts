import { NextResponse, type NextRequest } from "next/server";
type DefaultLocaleResponse = { defaultLocale?: "ar" | "en" };

async function defaultLocale(): Promise<"ar" | "en"> {
  const base =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api";
  try {
    const response = await fetch(`${base}/catalogue/site-settings?locale=ar`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return "ar";
    const settings = (await response.json()) as DefaultLocaleResponse;
    return settings.defaultLocale === "en" ? "en" : "ar";
  } catch {
    // Keep the site available if the catalogue API is temporarily unavailable.
    return "ar";
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const match = url.pathname.match(/^\/(ar|en)(?=\/|$)/);
  if (!match) {
    const savedLocale = request.cookies.get("kst_locale")?.value;
    const locale =
      savedLocale === "en" || savedLocale === "ar"
        ? savedLocale
        : await defaultLocale();
    url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.redirect(url);
  }
  const locale = match[1]!;
  const headers = new Headers(request.headers);
  headers.set("x-site-locale", locale);
  headers.set("x-site-path", url.pathname);
  url.pathname = url.pathname.slice(3) || "/";
  const response = NextResponse.rewrite(url, { request: { headers } });
  response.cookies.set("kst_locale", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 31536000,
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
