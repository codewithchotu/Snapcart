/**
 * Next.js middleware — applied before every page/API request.
 *
 * Strategy:
 * - Public routes (login, register, /api/auth, /unauthorized) always pass through.
 * - All other routes require an authenticated session.
 * - Role-specific route prefixes (/user, /delivery, /admin) are further guarded
 *   **only** when the session role is definitively known AND wrong.
 *   If role is missing/undefined we pass through and let the server component
 *   re-check, so a transient JWT hydration delay never causes an /unauthorized flash.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Public routes — always allow ────────────────────────────────────────
  const publicPrefixes = ["/login", "/register", "/api/auth", "/unauthorized"]
  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── 2. Require authentication ───────────────────────────────────────────────
  const session = await auth()
  if (!session) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = session.user?.role

  // ── 3. Role guards — only redirect when role is KNOWN and wrong ─────────────
  // If role is undefined/null the JWT may still be hydrating; we pass through
  // and let the server component perform the definitive check.
  if (role) {
    if (pathname.startsWith("/user") && role !== "user") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
    if (pathname.startsWith("/delivery") && role !== "deliveryBoy") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run on every route except Next.js internals, static assets, and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
