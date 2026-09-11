import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/categories",
  "/services",
  "/locations",
  "/media",
  "/users",
  "/roles",
  "/audit-logs",
];

export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("kst_access") || request.cookies.has("kst_refresh");
  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/categories/:path*",
    "/services/:path*",
    "/locations/:path*",
    "/media/:path*",
    "/users/:path*",
    "/roles/:path*",
    "/audit-logs/:path*",
  ],
};
