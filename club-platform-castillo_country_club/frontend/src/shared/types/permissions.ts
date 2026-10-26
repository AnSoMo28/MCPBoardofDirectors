
// ── Types ──

export type Permission =
  | "view_own_profile"
  | "edit_own_profile"
  | "view_own_finances"
  | "make_reservations"
  | "register_guests"
  | "submit_feedback"
  | "view_all_families"
  | "edit_families"
  | "manage_guests"
  | "check_in_guests"
  | "view_operations"
  | "manage_events"
  | "manage_facilities"
  | "view_maintenance"
  | "report_maintenance"
  | "view_dashboard"
  | "view_financials"
  | "approve_hitl"
  | "manage_communications"
  | "manage_documents"
  | "manage_campaigns"
  | "generate_reports"
  | "view_anomalies"
  | "manage_engagement"
  | "view_board_reports"
  | "view_strategic"
  | "view_risk_assessment"
  | "manage_users"
  | "manage_roles"
  | "system_config";

export const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  SOCIO: new Set([
    "view_own_profile",
    "edit_own_profile",
    "view_own_finances",
    "make_reservations",
    "register_guests",
    "submit_feedback",
  ]),
  STAFF: new Set([
    "view_all_families",
    "manage_guests",
    "check_in_guests",
    "view_operations",
    "manage_events",
    "manage_facilities",
    "view_maintenance",
    "report_maintenance",
  ]),
  ADMIN: new Set([
    "view_all_families",
    "edit_families",
    "manage_guests",
    "view_operations",
    "manage_events",
    "manage_facilities",
    "view_dashboard",
    "view_financials",
    "approve_hitl",
    "manage_communications",
    "manage_documents",
    "manage_campaigns",
    "generate_reports",
    "view_anomalies",
    "manage_engagement",
  ]),
  JUNTA: new Set([
    "view_dashboard",
    "view_board_reports",
    "view_strategic",
    "view_risk_assessment",
    "view_financials",
  ]),
};

export function checkPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
/**
 * Rol de usuario — canon compartido (migrado desde stores/auth.store).
 * ⚠️ Reemplazar el placeholder por la unión LITERAL vigente del store.
 */
export type UserRole = "SOCIO" | "STAFF" | "ADMIN" | "JUNTA";

/**
 * Contrato estructural mínimo del usuario para el dominio de
 * permisos (segregación de interfaces): el result del gate expone
 * SOLO lo que este dominio necesita. El usuario completo del store
 * LO SATISFACE ESTRUCTURALMENTE — la app puede pasar tal cual el
 * objeto del store al provider.
 */
export interface PermissionUser {
  readonly role: UserRole;
}

/**
 * Motivo canónico de denegación (migrado desde hooks/usePermissionGate).
 * Fuente de verdad única para Gate, Route y Denied.
 */
export type DeniedReason =
  | "not_authenticated"
  | "role"
  | "permission"
  | "role_and_permission";

/**
 * Contrato compartido de requisitos de acceso.
 * DRY: PermissionGate, ProtectedRoute y usePermissionGate consumen esta
 * única definición — divergencia de props imposible por construcción.
 */
export interface PermissionRequirement {
  readonly roles?: readonly UserRole[];
  readonly permission?: Permission;
  readonly permissions?: readonly Permission[];
  readonly requireAll?: boolean;
}