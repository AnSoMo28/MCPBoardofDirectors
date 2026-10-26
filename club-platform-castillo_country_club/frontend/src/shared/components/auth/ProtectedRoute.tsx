// src/shared/components/auth/ProtectedRoute.tsx
// ═══════════════════════════════════════════════════════════
// Shared Auth — Route-Level Guard
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @role        Senior Expert UI/UX, AI/ML, Architecture
// @namespace   — (fragmento: sin DOM propio; RouteSkeleton y los
//                children aportan el suyo)
// @keyframes   — (ninguno: este archivo no emite clases)
// @depends     shared/hooks/usePermissionGate,
//              shared/components/layout/RouteSkeleton,
//              react-router (Navigate, useLocation)
//
// Guard a NIVEL DE RUTA. Complementario al PermissionGate:
// este REEMPLAZA la página; aquel controla secciones dentro de ella.
//   loading  → RouteSkeleton (dueño de SU propio CSS — BC-06)
//   allowed  → children (fragmento: cero layout shift)
//   denied   → Navigate con MEMORIA (BC-07):
//     · not_authenticated → loginPath + ?returnTo=<deep-link>
//       (+ state.returnTo: el login elige fuente)
//     · role/permission    → redirectTo + state.denied
//       (el destino puede topear "acceso restringido")
//
// ANTI-PATTERNS REMOVED:
// [x] import "./PermissionGate.css" por efecto colateral — el CSS
//     del gate NO contiene clase alguna de skeleton (verificable en
//     v2.1/v2.2: §0–§8 = perm-hide/dim/ro/debug + keyframes) y este
//     componente no emite NINGÚN perm-*: import 100% muerto + header
//     documental falso ("reuses PermissionGate.css for skeleton").
//     RouteSkeleton debe importar su propio CSS (BC-06).
// [x] Import cross-layer @/stores/auth.store → shared/types (BC-05)
// [x] useEffect importado y jamás usado (noUnusedLocals = error)
// [x] Redirect amnésico: Navigate a "/" sin location.state, sin
//     returnTo y sin distinguir autenticación de autorización →
//     deep-links destruidos y cero feedback en el destino
// [x] Props re-declaradas en paralelo → extends
//     UsePermissionGateOptions (DRY con PermissionGate)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

// Shared — Hooks
import {
  usePermissionGate,
  type UsePermissionGateOptions,
} from "@/shared/hooks/usePermissionGate";

// Shared — Layout ( importa SU propio CSS — BC-06 )
import { RouteSkeleton } from "@/shared/components/layout/RouteSkeleton";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

export interface ProtectedRouteProps extends UsePermissionGateOptions {
  /** Destino ante denegación de AUTORIZACIÓN (rol/permiso). Default "/". */
  readonly redirectTo?: string;
  /** Ruta de login ante denegación de AUTENTICACIÓN. Default "/login". */
  readonly loginPath?: string;
  readonly children: ReactNode;
}

// ═══════════════════════════════════════════════════════════
// §2 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * ProtectedRoute — guard de ruta con redirect consciente del motivo.
 *
 * El spread `...gateOptions` canaliza roles/permission/permissions/
 * requireAll/loading al MISMO contrato que consume PermissionGate:
 * divergencia de props imposible por construcción.
 */
export function ProtectedRoute({
  redirectTo = "/",
  loginPath = "/login",
  children,
  ...gateOptions
}: ProtectedRouteProps) {
  const location = useLocation();
  const result = usePermissionGate(gateOptions);

  /* §2.1 Bootstrap de sesión */
  if (result.status === "loading") {
    return <RouteSkeleton />;
  }

  /* §2.2 Acceso concedido — fragmento: cero layout shift */
  if (result.allowed) {
    return <>{children}</>;
  }

  /* §2.3 Denegación de AUTENTICACIÓN (BC-07): deep-link preservado.
     El login restaura el contexto post-auth en vez de aterrizar
     en "/" y perder al usuario para siempre. */
  if (result.deniedReason === "not_authenticated") {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        to={`${loginPath}?returnTo=${encodeURIComponent(returnTo)}`}
        replace
        state={{ returnTo }}
      />
    );
  }

  /* §2.4 Denegación de AUTORIZACIÓN: destino + contexto para
     feedback (el destino decide si toapea "acceso restringido"
     con la razón y la ruta de origen — sin estado global). */
  return (
    <Navigate
      to={redirectTo}
      replace
      state={{
        denied: {
          reason: result.deniedReason ?? "unknown",
          from: location.pathname,
        },
      }}
    />
  );
}
