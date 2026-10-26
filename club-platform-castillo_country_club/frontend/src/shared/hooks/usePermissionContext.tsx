// src/shared/hooks/usePermissionContext.tsx
// ═══════════════════════════════════════════════════════════
// Shared Hooks — Permission Context (PUERTO de autenticación)
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @role        Senior Expert UI/UX, AI/ML, Architecture
// @exports     PermissionProvider, usePermissionContext,
//              type PermissionContextValue
// @depends     shared/types/permissions (canon BC-05) · react
//
// Diseño (hexagonal / ports & adapters):
//   Este módulo es el PUERTO de auth de la capa shared: propaga
//   ESTADO ({ user, loading }), nunca veredictos. La app (adapter)
//   cablea el store en el provider; los gates evalúan SU requisito
//   contra ese estado, donde se consume. Un solo flujo de verdad:
//
//     app/providers.tsx ──user/loading──▶ PermissionProvider
//                                            │ (context)
//                     usePermissionGate ◀────┘ (único consumidor)
//                            │ evaluatePermissionGate (puro)
//                     PermissionGate / ProtectedRoute
//
//   Dependencia unidireccional: gate → puerto. El puerto NO
//   importa nada del dominio de evaluación (sin ciclos).
//
// ANTI-PATTERNS REMOVED:
// [x] UPC-01 (BLOCKING) El context distribuía el VEREDICTO de una
//     única evaluación (el PermissionGateResult del provider): una
//     sola pareja rol×permiso congelada para todo el subárbol, y
//     DOS fuentes de verdad por árbol (el veredicto ambiental del
//     context vs el store que leían los gates) que podían DISCREPAR
//     en silencio. Ahora: estado, no veredictos — cada gate evalúa
//     lo suyo donde se consume.
// [x] UPC-02 (BLOCKING · seguridad) Fallback silencioso open
//     access: sin provider → "granted" + user null — default GRANT
//     en una primitiva de auth (olvidá el provider una vez y todo
//     el árbol pasa a estar "concedido"). Violaba la filosofía de
//     la plataforma (nunca fallback silencioso). Ahora: FAIL-CLOSED
//     — sin provider → no_authenticated (default-deny) +
//     advertencia ÚNICA en DEV con el fix exacto.
// [x] UPC-03 (BLOCKING) Import de ./usePermissionGate en el módulo
//     que el propio hook consume: ciclo usePermissionGate ↔
//     usePermissionContext (apareció al invertir la dependencia en
//     G11 — detectado y cerrado en ESTA ronda, jamás enviado a
//     producción). Dirección única: gate → puerto; este archivo ya
//     no importa nada del dominio de evaluación.
// [x] UPC-04 OPEN_ACCESS mentía: status "granted" con user null —
//     estado contradictorio que la unión discriminada de G11
//     rechaza por construcción (el archivo original ni compilaba
//     contra los tipos corregidos: evidencia de podredumbre
//     estructural). El comentario del original ("they just can't
//     read restriction details") también mentía: sin provider se
//     lee allowed: true.
// [x] UPC-05 Sin noción de loading: hidratación async no
//     representable → flash de contenido denegado (o concedido,
//     según el fallback). El contrato ahora es { user, loading } y
//     el provider documenta el wiring anti-flash.
// [x] UPC-06 Provider acoplado a UsePermissionGateOptions: exigía
//     conocer TODAS las restricciones del subárbol al montar
//     (acoplamiento temporal). Ahora recibe user/loading, nada más.
// [x] Artefacto de sintaxis `}}` (doble cierre de llave, tal como
//     llegó el archivo).
//
// NOTA React 19: `<PermissionContext value={…}>` (contexto como
// provider, sin `.Provider`) está disponible desde React 19; se
// mantiene `.Provider` por portabilidad de versión del proyecto.
// Migrar cuando el floor sea 19.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS — react + canon BC-05. CERO imports del dominio
//     de evaluación (dirección única gate → puerto).
// ═══════════════════════════════════════════════════════════

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PermissionUser } from "@/shared/types/permissions";

// ═══════════════════════════════════════════════════════════
// §1 CONTRATO — el estado que el puerto propaga
// ═══════════════════════════════════════════════════════════

/**
 * Estado de autenticación visible para el dominio de permisos:
 *
 * | user       | loading | significado                              |
 * |------------|---------|------------------------------------------|
 * | null       | true    | hidratando — gates resuelven "loading"   |
 * | null       | false   | sin sesión / SIN PROVIDER (fail-closed)  |
 * | Permission | —       | sesión activa                            |
 */
export interface PermissionContextValue {
  readonly user: PermissionUser | null;
  readonly loading: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2 CONTEXT + VALOR POR AUSENCIA (fail-closed)
// ═══════════════════════════════════════════════════════════

/* Default null (detectable): distingue "sin provider" de "provider
   con user null" — la advertencia DEV depende de esa distinción. */
const PermissionContext = createContext<PermissionContextValue | null>(null);
PermissionContext.displayName = "PermissionContext";

/**
 * FAIL_CLOSED — el valor por ausencia de provider. user null +
 * loading false → usePermissionGate resuelve no_authenticated:
 * NADA se concede por defecto (default-deny, estándar de industria
 * en primitivas de auth). Identidad a nivel módulo + Object.freeze:
 * estable e inmutable por construcción.
 */
const FAIL_CLOSED: PermissionContextValue = Object.freeze({
  user: null,
  loading: false,
});

const isDev = import.meta.env.DEV;

/** Advertencia única por sesión de DEV — no spam por render. */
let warnedNoProvider = false;

// ═══════════════════════════════════════════════════════════
// §3 PROVIDER — el adapter cablea el store AQUÍ (una sola vez)
// ═══════════════════════════════════════════════════════════

export interface PermissionProviderProps {
  /**
   * Usuario de sesión. El objeto completo del store satisface
   * PermissionUser estructuralmente (solo exige `role`) — se pasa
   * tal cual. null = sin sesión.
   */
  readonly user: PermissionUser | null;
  /**
   * true durante la hidratación de auth. ⚠️ Las apps con sesión
   * async DEBEN cablearlo: sin él, el arranque evalúa user null +
   * loading false → flash de "denegado" antes de hidratar.
   */
  readonly loading?: boolean;
  readonly children: ReactNode;
}

/**
 * PermissionProvider — publica el ESTADO de auth para el subárbol.
 *
 * La identidad del valor es estable por construcción (useMemo sobre
 * primitivos/referencias estables): los consumers no re-renderizan
 * salvo cambio real de user/loading — aunque el adapter re-cree su
 * propio árbol en cada render. Providers anidados sombrean al
 * exterior (gana el más cercano).
 *
 * ⚠️ NO evalúa permisos: los gates lo hacen donde se consume. Si
 * venías leyendo el "veredicto ambiental" del provider viejo
 * (ctx.allowed / ctx.status), migrá a `usePermissionGate(options)`
 * con ese mismo requisito.
 */
export function PermissionProvider({
  user,
  loading = false,
  children,
}: PermissionProviderProps) {
  const value = useMemo<PermissionContextValue>(
    () => ({ user, loading }),
    [user, loading],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 CONSUMER — el puerto que consume usePermissionGate
// ═══════════════════════════════════════════════════════════

/**
 * usePermissionContext — lee el estado de auth del provider más
 * cercano.
 *
 * Sin provider: FAIL-CLOSED (se evalúa como no autenticado) +
 * advertencia única en DEV con el fix exacto. Sin crash y sin
 * silent-grant: el olvido del provider se VE (todo bloqueado) en
 * vez de conceder acceso invisible.
 */
export function usePermissionContext(): PermissionContextValue {
  const ctx = useContext(PermissionContext);

  if (ctx === null) {
    if (isDev && !warnedNoProvider) {
      warnedNoProvider = true;
      console.warn(
        "[usePermissionContext] Sin PermissionProvider en el árbol — " +
          "fail-closed: se evalúa como no autenticado. Cablealo en la raíz:\n" +
          "  <PermissionProvider user={user} loading={isHydrating}>…</PermissionProvider>",
      );
    }
    return FAIL_CLOSED;
  }

  return ctx;
}
