import NextAuth from "next-auth";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { rejectCrossSiteRequest } from "@/lib/request-security";

const authMiddleware = NextAuth(authConfig).auth as unknown as NextMiddleware;
const publicPageRoutes = ["/", "/generate", "/prompts", "/login", "/register", "/forgot-password", "/terms", "/privacy"];
const protectedPageRoutes = ["/credits", "/redeem", "/history", "/account"];

function hasSessionCookie(request: NextRequest) {
  return (
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token")
  );
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const crossSiteError = rejectCrossSiteRequest(request);
    if (crossSiteError) return crossSiteError;

    return NextResponse.next();
  }

  const isPublicPageRoute = publicPageRoutes.includes(request.nextUrl.pathname);
  const isProtectedPageRoute = protectedPageRoutes.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`)
  );

  if (!isPublicPageRoute && isProtectedPageRoute && !hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return authMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|uploads/|assets/).*)"],
};
