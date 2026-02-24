import { NextResponse } from "next/server";

const AUTH_COOKIE = "dashboard_auth";

export function proxy(req) {
  const { pathname, search } = req.nextUrl;

  const isPublicPath =
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/favicon.ico" ||

    // --- مسیرهای لینک عمومی ---
    pathname.startsWith("/share/") ||

    // --- APIهای لازم برای داشبورد آزاد ---
    pathname.startsWith("/api/data") ||
    pathname.startsWith("/api/tgju") ||
    pathname.startsWith("/api/news") ||        // همین خط همه‌ی news و news-en را پوشش می‌دهد
    pathname.startsWith("/api/rates") ||
    pathname.startsWith("/api/technical") ||
    pathname.startsWith("/api/ceo-message") ||
    pathname.startsWith("/api/supply") ||
    pathname.startsWith("/_next");

  if (isPublicPath) {
    return NextResponse.next();
  }

  // --- مسیرهای محافظت‌شده ---
  const auth = req.cookies.get(AUTH_COOKIE)?.value;
  if (auth === "ok") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/.*|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico)).*)"
  ],
};
