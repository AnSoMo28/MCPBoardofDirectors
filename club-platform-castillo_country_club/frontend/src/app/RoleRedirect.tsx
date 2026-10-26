// src/app/RoleRedirect.tsx
// ═══════════════════════════════════════════════════════════
// Role-based root redirect
//
// Mounted at "/" (index route). Reads user role and redirects
// to the appropriate default landing page.
// ═══════════════════════════════════════════════════════════

import { Navigate } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import { getDefaultRoute } from "@/shared/lib/routes";

export function RoleRedirect() {
  const role = useAuthStore((s) => s.user?.role);
  return <Navigate to={getDefaultRoute(role)} replace />;
}
