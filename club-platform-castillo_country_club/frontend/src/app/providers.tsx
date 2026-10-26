// src/app/providers.tsx
// ═══════════════════════════════════════════════════════════
// APP PROVIDERS — QueryClient + Global Error UX + Auth Port
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.0.1 — G21: §0 → interface Register (punto de extensión
//               oficial de v5; el augmento de QueryMeta era inviable)
//               (v2.0: G13 ciclo de sesión 401 + wiring BC-05
//               · v1.1: BC-02 feedback · v1.0: sin manejo de errores)
// @namespace   N/A — application shell
// @keyframes   0
// @depends     @tanstack/react-query (v5), @/shared/lib/api (APIError),
//              @/shared/components/ui/Toast (ToastContainer, showToast),
//              @/shared/hooks/usePermissionContext (PermissionProvider),
//              @/stores/auth.store (useAuthStore — LEGAL en app layer)
//
// BC-02 — EL CICLO COMPLETO (v2.0):
//   v1.0 abrió el lazo en api.ts y jamás implementó el receptor.
//   v1.1 cerró el FEEDBACK (toast global con dedupe). Pero un 401 no
//   es un problema de UX: es un HECHO — la sesión está muerta. Con
//   solo toast, el usuario seguía "logueado" en el store mientras la
//   API lo rechazaba en cada acción. v2.0 cierra el CICLO:
//
//     api.ts (refresh ya falló → APIError 401, v2.1)
//       → QueryCache / MutationCache onError (meta.silent opt-out)
//         ├─ toast (dedupe por firma; 401 → "sesión expirada")
//         └─ onSessionExpired() → authStore.logout()
//               → user = null → PermissionProvider (BC-05, cableado AQUÍ)
//                 → ProtectedRoute → /login?returnTo=<deep-link> (BC-07)
//
//   El toast era el síntoma; la sesión muerta era la enfermedad.
//   BC-02 + BC-05 + BC-07 convergen en ESTE archivo — un solo lugar
//   donde la app se entera de que el mundo cambió.
//
// RETRY POLICY (inalterada desde v1.1 — era correcta):
//   - 4xx son fallas DETERMINÍSTICAS — reintentar un 401/403/404
//     re-dispara ciclos de auth/logout y demora el feedback. Nunca.
//   - 5xx / errores de red son TRANSITORIOS — 2 reintentos con backoff
//     exponencial (1s → 2s → 4s, tope 30s).
//   - Mutaciones NUNCA se reintentan solas: los tool calls MCP son POST
//     potencialmente no-idempotentes (create_event ×2 = evento duplicado).
//     El usuario reintenta explícitamente vía UI.
//
// IMPORT DIRECTO de hojas (no barrels):
//   Providers monta en la raíz; el barrel ui arrastraría 23 componentes
//   (+ CSS) al chunk inicial, y el re-export de PermissionGate (para
//   PermissionProvider) arrastraría gate+denied+CSS. R-02: la
//   infraestructura de app importa módulos hoja — react-query, Toast,
//   usePermissionContext, auth.store.
//
// POR QUÉ useState(factory) y no un cliente a nivel de módulo:
//   SSR-safe y aislado entre tests — cada mount obtiene su propio cache
//   (sin contaminación entre suites), patrón documentado por TanStack.
//   StrictMode: el inicializador doble-invocado descarta una instancia —
//   el constructor de QueryClient es side-effect-free (harmless).
// ═══════════════════════════════════════════════════════════

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { APIError } from "@/shared/lib/api";
import { ToastContainer, showToast } from "@/shared/components/ui/Toast";
// Hoja del puerto (BC-05) — NO el re-export de PermissionGate (chunk).
import { PermissionProvider } from "@/shared/hooks/usePermissionContext";
// App layer → stores: legal (shared jamás podría; este es el adapter).
import { useAuthStore } from "@/stores/auth.store";

/* ═══════════════════════════════════════════════════════════
   §0 CONVENCIÓN OPT-OUT TIPADA (Register · punto de extensión v5)
   ═══════════════════════════════════════════════════════════ */

/**
 * `meta: { silent: true }` exime una query/mutación del manejo global
 * de errores. Casos de uso canónicos:
 *   - LOGIN: su 401 ("credenciales inválidas") es del FORMULARIO, no de
 *     la sesión — sin silent, dispararía "sesión expirada" + callback.
 *   - Formularios con error inline propio (validación 422).
 *
 * MECANISMO (v5.100): QueryMeta/MutationMeta NO son interfaces planas
 * re-declarables — son type aliases condicionales derivados de
 * `Register`, la interfaz VACÍA que el paquete publica como punto
 * oficial de extensión:
 *
 *   type QueryMeta = Register extends { queryMeta: infer T }
 *     ? T extends Record<string, unknown> ? T : Record<string, unknown>
 *     : Record<string, unknown>
 *
 * Declarar `queryMeta`/`mutationMeta` AQUÍ (en Register, sobre el módulo
 * que instalamos — recomendación textual de los docs del paquete)
 * re-tipa meta en react-query y en cada consumer del árbol.
 *
 * ⚠️ ARQUEOLOGÍA — no "corregir" el target de vuelta:
 *   - query-core + `interface QueryMeta` → TS2664 (pnpm no expone la
 *     transitiva) y, aún resuelta, TS2300: QueryMeta es type alias, no
 *     admite merge (y exigiría devDep alineada a la versión EXACTA de
 *     react-query para caer en la misma copia física de .pnpm).
 *   - react-query + `interface QueryMeta` → TS2300 ×2 + TS2613 ×2
 *     (v2.0 de este archivo — el augmento colisiona con el re-export).
 *   - react-query + `interface Register` (ESTE) → fusión limpia en el
 *     único símbolo que existe como interfaz augmentable. Sin devDeps
 *     nuevas, sin invariantes de versión.
 *
 * El `& Record<string, unknown>` conserva la apertura original de
 * meta: otros módulos pueden seguir pasando sus propias claves, y
 * `silent` queda tipado boolean — merge aditivo de facto.
 */
declare module "@tanstack/react-query" {
  interface Register {
    /** meta de queries: `{ silent?: boolean }` + claves libres. */
    queryMeta: { silent?: boolean } & Record<string, unknown>;
    /** meta de mutaciones: `{ silent?: boolean }` + claves libres. */
    mutationMeta: { silent?: boolean } & Record<string, unknown>;
  }
}

/* ═══════════════════════════════════════════════════════════
   §1 CONSTANTES
   ═══════════════════════════════════════════════════════════ */

/**
 * Errores idénticos dentro de esta ventana colapsan en UN toast.
 * Rationale: tras un logout, TODAS las queries activas fallan con el
 * mismo 401 — sin dedupe, un dashboard con 15 queries renderiza 15
 * toasts idénticos. (Dedupe last-only deliberado: A-B-A dentro de la
 * ventana muestra los dos — errores que ALTERNAN son información.)
 */
const ERROR_TOAST_DEDUPE_MS = 2_500;

/** Mensaje de red caída / errores no-APIError (bugs, TypeError). */
const GENERIC_ERROR_MESSAGE = "Error de conexión. Reintentá en unos momentos.";

/** 401 confirmado (refresh ya falló en api.ts) — UX consistente. */
const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Volvé a iniciar sesión.";

const RETRY_DELAY_MS_CAP = 30_000;

const isDev = import.meta.env.DEV;

/** Advertencia única por sesión de DEV (no por cliente/test). */
let warnedNoSessionHandler = false;

/* ═══════════════════════════════════════════════════════════
   §2 QUERYCLIENT FACTORY (puente de errores POR INSTANCIA)
   ═══════════════════════════════════════════════════════════ */

/** 4xx = determinístico → un solo intento, feedback inmediato. */
function isDeterministicError(error: unknown): boolean {
  return error instanceof APIError && error.status >= 400 && error.status < 500;
}

/** 401 = sesión muerta (api.ts ya agotó el refresh antes de lanzar). */
function isSessionExpired(error: unknown): boolean {
  return error instanceof APIError && error.status === 401;
}

/** Backoff exponencial: 1s → 2s → 4s (tope 30s). */
function retryDelay(attemptIndex: number): number {
  return Math.min(1_000 * 2 ** attemptIndex, RETRY_DELAY_MS_CAP);
}

/**
 * Firma de dedupe. Para unknown usa Error.message cuando existe —
 * `String(error)` colapsa a "[object Object]" y neutraliza el dedupe
 * de errores distintos con la misma forma (v1.1).
 */
function errorSignature(error: unknown, context: "query" | "mutation"): string {
  if (error instanceof APIError) {
    return `${context}:${error.status}:${error.message}`;
  }
  const message = error instanceof Error ? error.message : String(error);
  return `${context}:unknown:${message}`;
}

export interface CreateQueryClientOptions {
  /**
   * Getter del handler de sesión expirada — patrón latest-ref: el
   * closure capturado por el cliente es ESTABLE para siempre, pero
   * siempre devuelve el handler vigente (los updates de prop
   * posteriores al mount se ven). En tests: omitir → sin handler
   * (DEV advierte una vez con el fix exacto).
   */
  readonly getSessionExpiredHandler?: () => (() => void) | undefined;
}

/**
 * Construye el QueryClient de la app. Exportado para tests y para un
 * futuro entry SSR (un cliente por request).
 *
 * El puente de errores (dedupe + sesión) vive DENTRO de la factory:
 * cada instancia arranca con estado fresco — v1.1 lo mantenía a nivel
 * de módulo y contaminaba suites entre sí (dos errores idénticos en
 * tests distintos dentro de 2.5s → el segundo toast se comía).
 */
export function createQueryClient(
  options: CreateQueryClientOptions = {},
): QueryClient {
  const { getSessionExpiredHandler } = options;

  /* Estado del puente — POR INSTANCIA. */
  let lastErrorToast: {
    readonly signature: string;
    readonly at: number;
  } | null = null;

  /** Invalida la sesión local. Contrato: handler idempotente (queries
   *  escalonadas pueden dispararlo más de una vez tras un expiry). */
  const notifySessionExpired = (): void => {
    const handler = getSessionExpiredHandler?.();
    if (handler !== undefined) {
      handler();
      return;
    }
    if (isDev && !warnedNoSessionHandler) {
      warnedNoSessionHandler = true;
      console.warn(
        "[Providers] APIError 401 sin onSessionExpired cableado — la " +
          "sesión local sigue viva mientras la API la rechaza. Cableá en " +
          "main.tsx:\n  <Providers onSessionExpired={() => " +
          "useAuthStore.getState().logout()}>",
      );
    }
  };

  /** Único funnel de toasts — dedupe por firma, APIError-aware. */
  const showErrorToast = (error: unknown, context: "query" | "mutation"): void => {
    const signature = errorSignature(error, context);
    const now = Date.now();

    if (
      lastErrorToast !== null &&
      lastErrorToast.signature === signature &&
      now - lastErrorToast.at < ERROR_TOAST_DEDUPE_MS
    ) {
      return;
    }
    lastErrorToast = { signature, at: now };

    if (isSessionExpired(error)) {
      showToast("error", SESSION_EXPIRED_MESSAGE);
      return;
    }
    if (error instanceof APIError) {
      showToast("error", error.message);
      return;
    }
    showToast("error", GENERIC_ERROR_MESSAGE);
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Convención opt-out (login, inline forms) — ver §0.
        if (query.meta?.silent === true) return;

        // 401 = la sesión está muerta: HECHO, independiente de los datos
        // en pantalla (v1.1 lo ponía tras el guard de background y las
        // refetch silenciosas con data nunca invalidaban la sesión).
        if (isSessionExpired(error)) notifySessionExpired();

        // Falla de refetch en background: los datos obsoletos siguen en
        // pantalla y FreshnessBadge / StaleDataBanner comunican la
        // antigüedad in-situ — toquetear aquí spamearía en cada focus.
        if (query.state.data !== undefined) return;
        showErrorToast(error, "query");
      },
    }),
    mutationCache: new MutationCache({
      // Las mutaciones las inicia el usuario: SIEMPRE feedback explícito
      // (salvo meta.silent — el formulario dueño muestra su error inline).
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.silent === true) return;
        if (isSessionExpired(error)) notifySessionExpired();
        showErrorToast(error, "mutation");
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // 4xx nunca; 5xx/red hasta 2 reintentos (failureCount < 2).
        retry: (failureCount, error) =>
          !isDeterministicError(error) && failureCount < 2,
        retryDelay,
      },
      mutations: {
        // Tool calls MCP pueden ser no-idempotentes — jamás auto-reintentar.
        retry: false,
      },
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   §3 PROVIDERS — el adapter que cablea TODO
   ═══════════════════════════════════════════════════════════ */

export interface ProvidersProps {
  readonly children: ReactNode;
  /**
   * 401 confirmado (api.ts ya agotó el refresh) → invalidá la sesión
   * local. IDEMPOTENTE por contrato. El redirect NO ocurre aquí (Providers
   * está por encima del router): ocurre en la cadena que este archivo
   * alimenta — logout ⇒ user null ⇒ ProtectedRoute ⇒ /login?returnTo.
   * Wiring en main.tsx:
   *   onSessionExpired={() => useAuthStore.getState().logout()}
   */
  readonly onSessionExpired?: () => void;
}

/**
 * Providers — raíz de la app:
 *   QueryClientProvider (datos) ⊃ PermissionProvider (estado de auth)
 *   ⊃ children (router) · ToastContainer hermano del router.
 *
 * ToastContainer FUERA de PermissionProvider a propósito: un usuario
 * denegado sigue mereciendo ver los errores de red.
 */
export function Providers({ children, onSessionExpired }: ProvidersProps) {
  /* §3.1 BC-05 wiring — el puerto de permisos toma la sesión del store.
     El objeto completo del store satisface PermissionUser estructuralmente
     (solo exige `role`). */
  const user = useAuthStore((s) => s.user);

  /* §3.2 Latest-ref: el cliente captura un closure estable que SIEMPRE
     lee el valor vigente — la prop puede rotar sin recrear el cliente. */
  const sessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    sessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  /* §3.3 Cliente por mount: lazy, aislado entre tests, SSR-safe,
     HMR-friendly (ver header). */
  const [queryClient] = useState(() =>
    createQueryClient({
      getSessionExpiredHandler: () => sessionExpiredRef.current,
    }),
  );

  /* §3.4 Dispose: al desmontar (fin de test / SSR request), cancela
     queries in-flight y vacía ambas caches — sin esto, suites viejas
     dejan promises vivas que pueblan act() warnings en la siguiente.
     StrictMode-safe: el cleanup intermedio actúa sobre caché vacía.
     El stop/unmount del cliente lo maneja QueryClientProvider (v5). */
  useEffect(() => {
    return () => {
      queryClient.clear();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* BC-05: ESTADO de auth para el dominio de permisos.
          ⚠️ loading: el store aún no expone flag de hidratación — si la
          sesión pasa a ser async (refresh on boot), cablearla aquí; sin
          ella, el arranque evalúa user null + loading false → flash de
          "denegado" antes de hidratar (fail-closed, no fail-wrong). */}
      <PermissionProvider user={user} loading={false}>
        {children}
      </PermissionProvider>

      {/* BC-02: hermano del router — los toasts sobreviven redirects de
          auth (logout → /login). */}
      <ToastContainer />
    </QueryClientProvider>
  );
}