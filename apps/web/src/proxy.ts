import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const match = url.pathname.match(/^\/(ar|en)(?=\/|$)/);
  if (!match) {
    const locale =
      request.cookies.get("kst_locale")?.value === "en" ? "en" : "ar";
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
