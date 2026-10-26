// src/shared/lib/routes.ts
// ═══════════════════════════════════════════════════════════
// Route Configuration — Default routes per role
//
// Used by:
//   - Root redirect (router.tsx)
//   - Post-login redirect (LoginPage)
//   - PermissionGate redirect (optional)
// ═══════════════════════════════════════════════════════════

import type { UserRole } from "@/stores/auth.store";

export const DEFAULT_ROUTE: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  STAFF: "/operaciones/checkin",
  SOCIO: "/mi-club",
  JUNTA: "/junta/dashboard",
};

/**
 * Get the default landing route for a role.
 * Falls back to /admin/dashboard if role is unknown.
 */
export function getDefaultRoute(role: UserRole | undefined | null): string {
  if (!role) return "/login";
  return DEFAULT_ROUTE[role] ?? "/admin/dashboard";
}
