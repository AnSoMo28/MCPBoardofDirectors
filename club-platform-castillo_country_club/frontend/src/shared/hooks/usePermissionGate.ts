// src/shared/hooks/usePermissionGate.ts
// ═══════════════════════════════════════════════════════════
// Shared Hooks — Permission Gate (canon del cluster auth)
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @role        Senior Expert UI/UX, AI/ML, Architecture
// @exports     usePermissionGate, evaluatePermissionGate (puro,
//              testeable sin React), permissionEvents, tipos
// @depends     shared/types/permissions (canon BC-05),
//              shared/hooks/usePermissionContext (puerto de auth)
//
// Arquitectura (2027):
//   · evaluatePermissionGate() — núcleo PURO, sin React: la regla
//     rol×permiso vive en una función exportada, testeable sin
//     render y reutilizable en guards de servidor / edge.
//   · usePermissionGate() — wrapper React de ~25 líneas: lee el
//     usuario del PUERTO compartido (context), no del store.
//   · permissionEvents — bus de telemetría: jamás rompe la UI,
//     pero un consumidor roto es VISIBLE en DEV (no fantasma).
//
// ANTI-PATTERNS REMOVED:
// [x] Import cross-layer @/stores/auth.store (BC-05): este hook
//     era la FUENTE de la infección — Gate, Route y Denied la
//     heredaron por importación transitiva. El usuario ahora
//     llega por usePermissionContext (inversión de dependencias:
//     shared define el puerto, la app cablea el store en el
//     provider — ver PATCHES-BC05-BC06-BC07.md §G11).
// [x] Doble eslint-disable react-hooks/exhaustive-deps alrededor
//     del useMemo (uno de los dos era supresión de cargo cult):
//     el truco rolesKey/permsKey con join(",") era frágil —
//     ambiguo para strings con coma (hoy seguro SOLO porque
//     UserRole/Permission son literales sin coma), los
//     checkDetails retenían referencias de arrays de renders
//     pasados en cache-hits, y el linter no podía proteger
//     ediciones futuras del callback. ELIMINADO el useMemo
//     completo: la computación es O(n) con n = puñado de
//     permisos — el React Compiler la memoiza gratis donde
//     importe; manualmente, era optimización prematura que
//     exigió deshabilitar el linter DOS veces. Puro y
//     cero supresiones de lint.
// [x] DeniedReason incluía null en la unión: mezclaba "motivo
//     de denegación" con "ausencia de denegación" y FORZÓ los
//     `?? null` + rama default muerta de PermissionDenied (la
//     deuda PD-03 de G10 nació AQUÍ). Ahora la unión es
//     estrecha; null vive EXPLÍCITO en los campos del result.
// [x] Result plano → UNIÓN DISCRIMINADA por status: estados
//     ilegales no representables (granted con razón de
//     denegación, denied sin razón, loading con veredicto).
// [x] `user: null` hardcodeado en la rama loading: reportaba
//     como anónimo a un usuario ya hidratado — telemetría y
//     DebugOverlay mentían durante el loading. Ahora pasa el
//     usuario real.
// [x] `user: ReturnType<typeof useAuthStore.getState>["user"]`:
//     el tipo del result estaba SOLDADO a la forma del store
//     (acoplamiento cross-layer en la capa de tipos). Ahora
//     PermissionUser: contrato estructural mínimo ({ role }) —
//     el result expone solo lo que el dominio de permisos
//     necesita (segregación de interfaces).
// [x] `roles!` non-null assertions ×2 — reestructurado con
//     narrowing en línea (ternarios que TS sí estrecha).
// [x] Bus: catch vacío absoluto → console.error en DEV; Sets
//     vacíos retirados del Map al desuscribir el último
//     listener.
// [x] Header "Pure computation — no side effects" sobre un
//     módulo que exporta un bus singleton con estado: precisión
//     — el HOOK es puro; el MÓDULO documenta su bus.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS — canon BC-05 + puerto de auth (cero stores)
// ═══════════════════════════════════════════════════════════

import { checkPermission } from "@/shared/types/permissions";
import type {
  DeniedReason,
  Permission,
  PermissionRequirement,
  PermissionUser,
  UserRole,
} from "@/shared/types/permissions";

// Puerto de autenticación (BC-05): la app cablea el store en el
// PermissionProvider; la capa shared jamás toca @/stores.
import { usePermissionContext } from "@/shared/hooks/usePermissionContext";

// ═══════════════════════════════════════════════════════════
// §1 TIPOS — re-exports del canon + contratos del hook
// ═══════════════════════════════════════════════════════════

/* One-stop DX + compat: los consumidores que importaban estos
   tipos desde el hook siguen compilando sin tocar una línea. */
export type {
  DeniedReason,
  Permission,
  PermissionRequirement,
  PermissionUser,
  UserRole,
} from "@/shared/types/permissions";

export type PermissionStatus = "loading" | "granted" | "denied";

export interface PermissionResult {
  readonly permission: Permission;
  readonly granted: boolean;
}

export interface RoleCheckDetail {
  readonly required: readonly UserRole[];
  readonly passed: boolean;
}

export interface PermissionCheckDetail {
  readonly required: readonly Permission[];
  readonly mode: "all" | "any";
  readonly passed: boolean;
  readonly results: readonly PermissionResult[];
}

export interface CheckDetails {
  readonly roleCheck: RoleCheckDetail | null;
  readonly permissionCheck: PermissionCheckDetail | null;
}

/**
 * Resultado del gate — UNIÓN DISCRIMINADA por `status`.
 *
 * Estados ilegales no representables por construcción:
 *   · granted con deniedReason ≠ null        → no compila
 *   · denied  con deniedReason = null        → no compila
 *   · loading con allowed = true             → no compila
 *   · denied por rol/permiso con user = null → no compila
 *
 * Compat: todo consumo por LECTURA del result plano anterior
 * (result.status / result.allowed / result.deniedReason /
 * result.user / result.checkDetails) sigue compilando — el
 * narrowing solo SUMA garantías, no resta acceso.
 */
export type PermissionGateResult =
  /** Bootstrap: sin veredicto — user puede ya estar hidratado */
  | {
      readonly status: "loading";
      readonly allowed: false;
      readonly deniedReason: null;
      readonly user: PermissionUser | null;
      readonly checkDetails: CheckDetails;
    }
  /** Acceso concedido — user garantizado no-nulo */
  | {
      readonly status: "granted";
      readonly allowed: true;
      readonly deniedReason: null;
      readonly user: PermissionUser;
      readonly checkDetails: CheckDetails;
    }
  /** Denegado — user nulo SOLO en not_authenticated */
  | {
      readonly status: "denied";
      readonly allowed: false;
      readonly deniedReason: DeniedReason;
      readonly user: PermissionUser | null;
      readonly checkDetails: CheckDetails;
    };

export interface UsePermissionGateOptions extends PermissionRequirement {
  /**
   * Override externo de carga (bootstrap de ruta/página). Se
   * combina por OR con la hidratación de auth del contexto.
   */
  readonly loading?: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2 NÚCLEO PURO — evaluación sin React
// ═══════════════════════════════════════════════════════════

/** Evaluación discriminada — sin estados intermedios ilegales. */
export type PermissionEvaluation =
  | {
      readonly allowed: true;
      readonly deniedReason: null;
      readonly checkDetails: CheckDetails;
    }
  | {
      readonly allowed: false;
      readonly deniedReason: DeniedReason;
      readonly checkDetails: CheckDetails;
    };

const EMPTY_PERMISSIONS: readonly Permission[] = Object.freeze([]);

const EMPTY_CHECK_DETAILS: CheckDetails = Object.freeze({
  roleCheck: null,
  permissionCheck: null,
});

/**
 * checkPermissions — detalle de la verificación de permisos.
 * `required` es una colección inmutable: nunca se muta al
 * exponerla en el result (aliasing seguro para el consumidor).
 */
function checkPermissions(
  user: PermissionUser,
  required: readonly Permission[],
  requireAll: boolean,
): PermissionCheckDetail {
  const results = required.map((permission) => ({
    permission,
    granted: checkPermission(user.role, permission),
  }));

  const passed = requireAll
    ? results.every((r) => r.granted)
    : results.some((r) => r.granted);

  return {
    required,
    mode: requireAll ? "all" : "any",
    passed,
    results,
  };
}

/**
 * evaluatePermissionGate — la regla de acceso del club, pura.
 *
 * Testeable sin un solo render (`evaluatePermissionGate({ role:
 * "socio" }, { permissions: ["events:write"] })`) y reutilizable
 * en guards de servidor / edge — la misma regla en cliente y
 * servidor, un solo lugar de verdad.
 *
 * Semántica documentada (antes implícita):
 *   · roles vacío/ausente      → sin restricción de rol
 *   · permission + permissions  → permissions TIENE PRECEDENCIA
 *   · roles: ANY pasa           · permissions: ANY|ALL por requireAll
 *   · rol Y permisos            → AMBOS deben pasar (AND)
 *   · `user === null` no entra aquí: el hook resuelve
 *     not_authenticated antes de evaluar.
 */
export function evaluatePermissionGate(
  user: PermissionUser,
  requirement: PermissionRequirement,
): PermissionEvaluation {
  const { roles, permission, permissions, requireAll = false } = requirement;

  /* Narrowing en línea: cero non-null assertions */
  const roleCheck: RoleCheckDetail | null =
    roles !== undefined && roles.length > 0
      ? { required: roles, passed: roles.includes(user.role) }
      : null;

  const requiredPermissions: readonly Permission[] =
    permissions !== undefined && permissions.length > 0
      ? permissions
      : permission !== undefined
        ? [permission]
        : EMPTY_PERMISSIONS;

  const permissionCheck: PermissionCheckDetail | null =
    requiredPermissions.length > 0
      ? checkPermissions(user, requiredPermissions, requireAll)
      : null;

  const rolePassed = roleCheck?.passed ?? true;
  const permPassed = permissionCheck?.passed ?? true;
  const allowed = rolePassed && permPassed;

  if (allowed) {
    return {
      allowed: true,
      deniedReason: null,
      checkDetails: { roleCheck, permissionCheck },
    };
  }

  const deniedReason: DeniedReason =
    !rolePassed && !permPassed
      ? "role_and_permission"
      : !rolePassed
        ? "role"
        : "permission";

  return {
    allowed: false,
    deniedReason,
    checkDetails: { roleCheck, permissionCheck },
  };
}

// ═══════════════════════════════════════════════════════════
// §3 BUS DE TELEMETRÍA — jamás rompe la UI, visible en DEV
// ═══════════════════════════════════════════════════════════

export interface PermissionEventPayload {
  readonly requiredRoles?: readonly UserRole[];
  readonly requiredPermissions?: readonly Permission[];
  readonly userRole?: UserRole;
  readonly deniedReason: DeniedReason | null;
  readonly timestamp: number;
}

type PermissionEventType = "denied" | "granted";
type PermissionListener = (payload: PermissionEventPayload) => void;

/* Estado de módulo documentado (no hidden): el bus es un
   singleton por diseño — telemetría de dominio, un solo lugar. */
const listeners = new Map<PermissionEventType, Set<PermissionListener>>();

const isDev = import.meta.env.DEV;

export const permissionEvents = {
  /** Suscribe; devuelve el cleanup (usar en useEffect). */
  on(event: PermissionEventType, callback: PermissionListener): () => void {
    let set = listeners.get(event);
    if (set === undefined) {
      set = new Set<PermissionListener>();
      listeners.set(event, set);
    }
    set.add(callback);

    return () => {
      const current = listeners.get(event);
      if (current === undefined) return;
      current.delete(callback);
      /* Sin retención: el Map no acumula Sets vacíos */
      if (current.size === 0) {
        listeners.delete(event);
      }
    };
  },

  /**
   * Emite a los suscriptores. Un listener que lanza NO rompe la
   * UI ni corta a los demás — pero en DEV es VISIBLE: la
   * telemetría rota deja de ser un fantasma silencioso.
   */
  emit(event: PermissionEventType, payload: PermissionEventPayload): void {
    const set = listeners.get(event);
    if (set === undefined || set.size === 0) return;

    for (const callback of set) {
      try {
        callback(payload);
      } catch (error) {
        if (isDev) {
          console.error(
            `[permissionEvents] listener de "${event}" falló (ignorado en prod):`,
            error,
          );
        }
      }
    }
  },
};

// ═══════════════════════════════════════════════════════════
// §4 HOOK — wrapper React sobre el núcleo puro
// ═══════════════════════════════════════════════════════════

/**
 * usePermissionGate — veredicto de acceso para la UI.
 *
 * Puro por diseño: sin useState, sin useEffect, sin useMemo
 * manual, sin supresiones de lint. La identidad del result
 * cambia por render — depende de los PRIMITIVOS (`status`,
 * `deniedReason`), como ya lo hacen PermissionGate (telemetría
 * con dedupe por firma) y ProtectedRoute. El React Compiler
 * memoiza donde de verdad importe; manualmente era costo
 * negativo (doble lint deshabilitado).
 */
export function usePermissionGate(
  options: UsePermissionGateOptions = {},
): PermissionGateResult {
  const { user, loading: authLoading } = usePermissionContext();
  const { loading: localLoading = false, ...requirement } = options;

  /* §4.1 Loading: override local OR hidratación de auth.
     El usuario hidratado viaja — no se reporta como anónimo. */
  if (localLoading || authLoading) {
    return {
      status: "loading",
      allowed: false,
      deniedReason: null,
      user,
      checkDetails: EMPTY_CHECK_DETAILS,
    };
  }

  /* §4.2 Sin sesión (o contexto sin cablear → undefined):
     veredicto de dominio, no crash. */
  if (user === null || user === undefined) {
    return {
      status: "denied",
      allowed: false,
      deniedReason: "not_authenticated",
      user: null,
      checkDetails: EMPTY_CHECK_DETAILS,
    };
  }

  /* §4.3 Evaluación pura + composición del result discriminado */
  const evaluation = evaluatePermissionGate(user, requirement);

  return evaluation.allowed
    ? {
        status: "granted",
        allowed: true,
        deniedReason: null,
        user,
        checkDetails: evaluation.checkDetails,
      }
    : {
        status: "denied",
        allowed: false,
        deniedReason: evaluation.deniedReason,
        user,
        checkDetails: evaluation.checkDetails,
      };
}
