/**
 * Pure role definitions and authorization checks.
 * Completely decoupled from Mongoose / Node DB libraries so it is safe to import
 * in Next.js Middleware / Proxy (Edge runtime), Client Components, and API routes.
 */

export type AppRole = "user" | "deliveryBoy" | "admin" | "superAdmin";

/**
 * Normalized Super Admin check.
 * An account is authorized as Super Admin if:
 * 1. Their assigned role is "superAdmin", OR
 * 2. Their email matches the configured Super Admin email (process.env.SUPER_ADMIN_EMAIL, process.env.EMAIL, or fallback).
 */
export function isSuperAdmin(user?: { role?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;

  if (user.role === "superAdmin") {
    return true;
  }

  const superAdminEmail = (
    process.env.SUPER_ADMIN_EMAIL ||
    process.env.EMAIL ||
    "mo0322975@gmail.com"
  ).toLowerCase().trim();

  const userEmail = (user.email || "").toLowerCase().trim();

  return Boolean(userEmail && userEmail === superAdminEmail);
}
