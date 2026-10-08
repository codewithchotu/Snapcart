import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"

/**
 * Next.js 16 Proxy function — replaces deprecated middleware convention.
 *
 * Requirements & Logic:
 * - Public routes (/login, /register, /api/auth, /unauthorized) always pass through.
 * - Authenticated sessions are required for protected routes.
 * - Role checks redirect to /unauthorized ONLY when session role is KNOWN and wrong.
 * - Undefined/hydrating roles pass through to prevent false /unauthorized redirects.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Public routes — always allow ────────────────────────────────────────
  const publicPrefixes = ["/login", "/register", "/api/auth", "/unauthorized"]
  if (publicPrefixes.some((path) => pathname.startsWith(path))) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
