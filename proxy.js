import { NextResponse } from "next/server";

import { AUTH_COOKIE, verifySession } from "./lib/auth";
import { canShareRead, shareScope } from "./lib/access";

export function proxy(req) {
  const { pathname, search } = req.nextUrl;

  const isPublicPath =
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/favicon.ico" ||
    // --- مسیرهای لینک عمومی ---
    pathname.startsWith("/share/") ||
    // --- APIهای لازم برای داشبورد آزاد ---
    pathname.startsWith("/_next/");

  if (isPublicPath) {
    return NextResponse.next();
  }

  const slug = req.nextUrl.searchParams.get("share");
  if (pathname.startsWith("/api/") && slug !== null) {
    if (req.method === "GET" && canShareRead(shareScope(slug), pathname)) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // --- مسیرهای محافظت‌شده ---
  const auth = req.cookies.get(AUTH_COOKIE)?.value;
  if (verifySession(auth)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/.*|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico)).*)"],
};
