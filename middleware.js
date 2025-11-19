import { NextResponse } from "next/server";

const AUTH_COOKIE = "dashboard_auth";

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // مسیرهای آزاد
  const publicPaths = ["/login", "/api/login", "/favicon.ico"];

  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/tgju")
  ) {
    return NextResponse.next();
  }

  // چک کوکی
  const auth = req.cookies.get(AUTH_COOKIE)?.value;
  if (auth === "ok") {
    return NextResponse.next();
  }

  // ری‌دایرکت به لاگین
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/.*|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico)).*)"
  ],
};
