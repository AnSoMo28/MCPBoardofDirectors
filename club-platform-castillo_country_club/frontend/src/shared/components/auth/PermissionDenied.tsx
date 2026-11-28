// src/shared/components/auth/PermissionDenied.tsx
// ═══════════════════════════════════════════════════════════
// Shared Auth — Permission Denied Surface
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @role        Senior Expert UI/UX, AI/ML, Architecture
// @namespace   .perm-denied-* (auth permission family)
// @keyframes   2 (perm-denied-icon-in, perm-denied-breathe)
//              — in PermissionDenied.css
// @depends     globals.css §1 tokens, shared/types/permissions (BC-05),
//              shared/lib/utils (cn), lucide-react (Lock, ShieldAlert)
//
// Superficie glass de denegación. Dos variantes SEMÁNTICAS:
//   full    (default) — página/sección completa, role="alert"
//   compact           — overlay del dim-mode, role="status"
// La escala (tipografía + icono) la resuelve CSS vía container
// queries + cqi: el prop `compact` cambia semántica y densidad,
// NO duplica el árbol de render.
//
// ANTI-PATTERNS REMOVED:
// [x] Namespace legacy .glass-perm-denied → perm-denied-*: era la
//     deuda §9 declarada en PermissionGate.css v2.1 ("migrar en su
//     ronda") — ESTA es esa ronda. El bloque legacy se elimina (v2.2).
// [x] Sin import de CSS propio: los estilos dependían de que el
//     CONSUMIDOR (PermissionGate) importara PermissionGate.css —
//     side-effect dependency → CSS co-ubicado (BC-06)
// [x] Import cross-layer @/stores/auth.store → shared/types (BC-05)
// [x] getTitle(deniedReason ?? null): coerción null sobre un tipo
//     que no la declara → Record<DeniedReason, resolver> exhaustivo,
//     sin switch y sin rama default muerta
// [x] JSX duplicado full/compact (~30 líneas) → árbol único con
//     Heading polimórfico (h3 | p según semántica del contexto)
// [x] role="alert" + aria-live="polite" simultáneos (señal
//     contradictoria para AT) → roles coherentes por variante
// [x] Iconos decorativos sin aria-hidden → añadido
// [x] Icono con size imperativo (18|24) → tamaño fluido por CSS (cqi)
// [x] Copy inline disperso → COPY centralizado (i18n-ready)
// [x] Sin data-testid → añadidos (house standard)
// [x] Concatenación de clases → cn() de shared/lib/utils
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { memo } from "react";
import { Lock, ShieldAlert } from "lucide-react";

// Shared — Types (BC-05: canon de acceso en shared/types/permissions)
import type {
  DeniedReason,
  Permission,
  UserRole,
} from "@/shared/types/permissions";

// Shared — Utils
import { cn } from "@/shared/lib/utils";

// Styles (BC-06: co-ubicado — este componente posee su propio CSS)
import "./PermissionDenied.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

export interface PermissionDeniedProps {
  /** Roles requeridos — para el copy de diagnóstico */
  readonly roles?: readonly UserRole[];
  /** Permiso individual requerido */
  readonly permission?: Permission;
  /** Permisos múltiples requeridos */
  readonly permissions?: readonly Permission[];
  /** Motivo de denegación (del result de usePermissionGate) */
  readonly deniedReason?: DeniedReason;
  /** Variante compacta para overlay de dim-mode (role="status") */
  readonly compact?: boolean;
  /** CTA opcional — habilita la superficie reactiva (:has) del CSS */
  readonly onRequestAccess?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 COPY + RESOLVERS (i18n-ready: un solo lugar de texto)
// ═══════════════════════════════════════════════════════════

const COPY = {
  titleAuth: "Sesión requerida",
  titleDenied: "Acceso restringido",
  requestAccess: "Solicitar acceso",
  loginPrompt: "Iniciá sesión para continuar.",
  fallback: "No tenés acceso a esta sección.",
  roleAndPermissionFallback: "Se requieren rol y permisos adicionales.",
} as const;

const EMPTY_ROLES: readonly UserRole[] = [];
const EMPTY_PERMISSIONS: readonly Permission[] = [];

interface DetailContext {
  readonly roles: readonly UserRole[];
  readonly permissions: readonly Permission[];
  readonly permission?: Permission;
}

/**
 * Resolución declarativa por motivo — exhaustiva por construcción:
 * si DeniedReason suma un miembro, TS falla AQUÍ y obliga a cubrirlo.
 * (Un switch con `default` se traga el caso nuevo en silencio.)
 */
const DETAIL_RESOLVERS: Readonly<
  Record<DeniedReason, (ctx: DetailContext) => string>
> = {
  not_authenticated: () => COPY.loginPrompt,
  role: ({ roles }) =>
    `Se requiere rol: ${roles.length > 0 ? roles.join(", ") : "—"}`,
  permission: ({ permissions, permission }) =>
    `Se requiere permiso: ${
      permissions.length > 0 ? permissions.join(", ") : (permission ?? "—")
    }`,
  role_and_permission: ({ roles }) =>
    roles.length > 0
      ? `Se requiere rol (${roles.join(", ")}) y permisos adicionales.`
      : COPY.roleAndPermissionFallback,
};

// ═══════════════════════════════════════════════════════════
// §3 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * PermissionDenied — superficie de denegación con acento lateral
 * dorado y glass REACTIVO: el card responde al hover/foco del CTA
 * vía :has() (ver PermissionDenied.css §1) — estado de máxima
 * fricción del producto tratado con ingeniería de primer nivel.
 *
 * memo: superficie presentacional pura renderizada dentro del
 * dim-overlay (re-renders del gate no la re-pintan).
 */
export const PermissionDenied = memo(function PermissionDenied({
  roles = EMPTY_ROLES,
  permission,
  permissions = EMPTY_PERMISSIONS,
  deniedReason,
  compact = false,
  onRequestAccess,
}: PermissionDeniedProps) {
  const isAuth = deniedReason === "not_authenticated";
  const title = isAuth ? COPY.titleAuth : COPY.titleDenied;
  const detail =
    deniedReason === undefined
      ? COPY.fallback
      : DETAIL_RESOLVERS[deniedReason]({ roles, permissions, permission });

  /* Semántica del encabezado según contexto: h3 en página, p en overlay */
  const Heading = compact ? "p" : "h3";
  const Icon = isAuth ? Lock : ShieldAlert;

  return (
    <div
      className={cn("perm-denied", compact && "perm-denied--compact")}
      role={compact ? "status" : "alert"}
      data-testid="perm-denied"
      data-variant={compact ? "compact" : "full"}
      data-reason={deniedReason ?? "unknown"}
    >
      <span className="perm-denied__icon-wrap" aria-hidden="true">
        <Icon className="perm-denied__icon" strokeWidth={1.75} />
      </span>

      <Heading className="perm-denied__title">{title}</Heading>
      <p className="perm-denied__detail">{detail}</p>

      {onRequestAccess ? (
        <Button
          variant="unstyled"
          type="button"
          className="perm-denied__request"
          onClick={onRequestAccess}
          data-testid="perm-denied-request"
        >
          {COPY.requestAccess}
        </Button>
      ) : null}
    </div>
  );
});
