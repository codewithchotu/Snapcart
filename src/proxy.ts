import { NextResponse } from "next/server"
import { auth } from "./auth"
import { isSuperAdmin } from "./lib/roles"

/**
 * Next.js 16 Proxy / Middleware function.
 *
 * Requirements & Logic:
 * - Public routes (/login, /register, /kirana-login, /api/auth, /unauthorized) always pass through.
 * - Authenticated sessions are extracted from incoming request cookies via Auth.js wrapper (req.auth).
 * - API requests that lack authentication receive 401 JSON instead of HTML redirect loops.
 * - Role checks redirect to /unauthorized ONLY when session role is KNOWN and wrong.
 * - Undefined/hydrating roles pass through to prevent false /unauthorized redirects.
 */
const publicPrefixes = [
  "/login",
  "/register",
  "/kirana-login",
  "/api/auth",
  "/unauthorized",
  "/favicon.ico"
]

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // ── 1. Public routes — always allow ────────────────────────────────────────
  if (publicPrefixes.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // ── 2. Require authentication ───────────────────────────────────────────────
  const session = (req as any).auth
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = session.user?.role
  const isSuper = isSuperAdmin(session.user)

  // ── 3. Role guards — only redirect when role is KNOWN and wrong ─────────────
  if (role) {
    if (pathname.startsWith("/user") && role !== "user" && !isSuper) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
    if (pathname.startsWith("/delivery") && role !== "deliveryBoy" && !isSuper) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
    if (pathname.startsWith("/admin") && role !== "admin" && role !== "superAdmin" && !isSuper) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
  }

  return NextResponse.next()
})

export default proxy

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
