// src/shared/lib/api.ts
// ═══════════════════════════════════════════════════════════
// API CLIENT — Castillo Country Club Intelligence Platform
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.1
// @namespace   N/A — infrastructure layer
// @keyframes   0
// @depends     @/stores/auth.store, ./toolNameAdapter, @/shared/lib/mcp
//
// Routing priority (via mcp-router.ts):
//   1. Backend (if available + preferred)
//   2. Mock registry (typed factories)
//   3. Error (NO silent fallbacks)
//
// PRE-WRITE VERIFICATION:
// [x] All imports verified against seen files
// [x] routeMCPCall signature matches mcp-router.ts
// [x] No showToast import (moved to QueryClient global onError)
// [x] No "OK trick" (dev mode errors propagate as errors)
// [x] JWT decode handles base64url encoding (RFC 4648 §5)
// [x] Concurrent refresh deduplication via shared Promise
//
// ANTI-PATTERNS REMOVED (v1):
// [x] "OK (no mock)" silent success → errors propagate always
// [x] showToast in infrastructure layer → handled by QueryClient
// [x] atob() without base64url normalization → fixed
// [x] Race condition on concurrent token refresh → Promise dedup
// [x] APIError not exported → exported for instanceof checks
// [x] Magic string "dev-token-no-real" → extracted constant + env guard
// [x] api object with || (falsy trap) → removed entirely
// [x] Missing section markers → §1-§6 added
//
// FIXES APPLIED (v2):
// [x] B-03: pendingRefresh rejection normalized to APIError(401)
// [x] B-04: TODO comment block removed (tracked in MANIFEST.BREAKING_CHANGES.BC-02)
//
// FIXES APPLIED (v2.1) — hallazgos G8 (auditoría Lote 4 / BC-02 package):
// [x] G8-05 (CRITICAL): callMCPTool re-envolvía TODO error del router
//     con status 500 hardcodeado → un 401 del backend llegaba a la UI
//     como 500, rompiendo el retry-policy y la clasificación 401-aware
//     de BC-02 (providers.tsx). Ahora el APIError ORIGINAL del backend
//     se conserva con su status real (captura por-invocación,
//     concurrency-safe).
// [x] G8-06: decodeTokenPayload sin padding — atob() rechaza input
//     base64url sin pad en motores estrictos. padEnd restaurado.
// [x] G8-07: loginRequest/healthCheck sin timeout — un backend muerto
//     colgaba el login indefinidamente. AbortSignal.timeout añadido
//     (10s auth / 5s health). backendCaller SIN timeout deliberado:
//     los tools MCP con IA tardan legítimamente 10-30s.
// [x] G8-08: respuestas 2xx sin guard — json() malformado exponía un
//     SyntaxError crudo; login sin access_token crasheaba tarde en los
//     consumidores. Guards de forma + mapeo 502.
// [x] G8-09: getAuthToken re-normalizaba el rechazo del refresh
//     enmascarando el mensaje original (B-03 aplicado dos veces con
//     pérdida semántica). Ahora preserva APIError ya normalizados.
// ═══════════════════════════════════════════════════════════

// ═══ Auth — delegate (inversión de dependencia · P1 ciclo de chunks) ═══
// ANTES: este módulo importaba @/stores/auth.store — la capa de transporte
// (lib) dependía hacia ARRIBA de la capa de estado. Como auth.store importa
// signalBus del advisor-engine, y el engine importa utils/api de vuelta,
// el edge sostenía el ciclo "Circular chunk: shared-* -> advisor-engine".
// DESPUÉS: api expone un delegate; auth.store se registra al cargarse
// (stores → lib: descendente y legal). Sin registro: fail-closed 401.
export interface AuthDelegate {
  /** Access token vigente, o null si no hay sesión. */
  getAccessToken(): string | null;
  /** Refresca la sesión; rechaza si el refresh falla. */
  refreshAccessToken(): Promise<void>;
  /** Cierra la sesión (401 / token inválido o expirado). */
  logout(): void;
}

let authDelegate: AuthDelegate | null = null;

/** Registra el proveedor de auth — lo llama auth.store.ts en module scope. */
export function setAuthDelegate(delegate: AuthDelegate): void {
  authDelegate = delegate;
}

/** Acceso fail-closed: nunca se procede sin auth registrada. */
function auth(): AuthDelegate {
  if (!authDelegate) {
    throw new APIError("Auth delegate no registrado — auth.store debe inicializarse antes de usar api", 401);
  }
  return authDelegate;
}

// ═══ Shared — lib ═══
import { resolveToolName } from "./toolNameAdapter";
// Use relative import to avoid alias resolution issues in some environments
import { routeMCPCall, migrationTracker } from "./mcp";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Default MCP response shape. Consumers should define their own
 * typed responses and pass them as generic T to callMCPTool.
 *
 * @example
 * const result = await callMCPTool<EventsResponse>("events", "list", params);
 */
export interface MCPResponse {
  readonly status: "success" | "error" | "pending_approval";
  readonly message: string;
  readonly [key: string]: unknown;
}

/**
 * Structured API error with HTTP status code and optional response body.
 * Exported so consumers can use instanceof checks in error handlers.
 *
 * @example
 * catch (error) {
 *   if (error instanceof APIError && error.status === 401) {
 *     // redirect to login
 *   }
 * }
 */
export class APIError extends Error {
  public readonly status: number;
  public readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Base URL for all API calls. Same-origin in production. */
const API_BASE = "/api" as const;

/**
 * Token used in development to signal mock mode.
 * Combined with import.meta.env.DEV guard to ensure
 * this NEVER activates in production builds.
 */
const DEV_MOCK_TOKEN = "dev-token-no-real" as const;

/** Refresh token when less than this many ms remain until expiry. */
const AUTH_TOKEN_EXPIRY_MARGIN_MS = 60_000;

/**
 * Auth/health endpoints must fail FAST — a dead backend cannot be
 * allowed to hang the login screen (G8-07).
 */
const AUTH_TIMEOUT_MS = 10_000;
const HEALTH_TIMEOUT_MS = 5_000;

// ═══════════════════════════════════════════════════════════
// §3 AUTH UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Shared Promise for deduplicating concurrent token refreshes.
 * When multiple API calls detect an expiring token simultaneously,
 * only ONE refresh request is made. Others await the same Promise.
 */
let pendingRefresh: Promise<string> | null = null;

/**
 * Decode JWT payload without signature verification.
 * Handles base64url encoding per RFC 4648 §5, restoring the padding
 * omitted by JWT encoders — atob() rejects unpadded input on some
 * engines when length % 4 === 2|3 (G8-06).
 *
 * NOTE: This does NOT verify the token signature.
 * Signature verification is the backend's responsibility.
 *
 * @returns Decoded payload object, or null if token is malformed
 */
function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;

    // base64url → base64 (RFC 4648 §5) + padding restaurado
    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), "=");
    const json = atob(base64);
    const parsed: unknown = JSON.parse(json);

    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Execute a token refresh. On failure, logs out and throws.
 * This function is called by getAuthToken — never directly.
 */
async function refreshSession(): Promise<string> {
  try {
    await auth().refreshAccessToken();
    const newToken = auth().getAccessToken();
    if (!newToken) throw new Error("No token returned after refresh");
    return newToken;
  } catch {
    auth().logout();
    throw new APIError("Error al refrescar sesión", 401);
  }
}

/**
 * Get a valid authentication token, refreshing if near expiry.
 * Deduplicates concurrent refresh attempts via the shared pendingRefresh Promise.
 *
 * @returns Valid access token string
 * @throws APIError(401) if not authenticated, token malformed, or refresh fails
 */
async function getAuthToken(): Promise<string> {
  const accessToken = auth().getAccessToken();

  if (!accessToken) {
    auth().logout();
    throw new APIError("No autenticado", 401);
  }

  const payload = decodeTokenPayload(accessToken);

  if (!payload || typeof payload.exp !== "number") {
    auth().logout();
    throw new APIError("Token inválido", 401);
  }

  const msUntilExpiry = payload.exp * 1000 - Date.now();

  if (msUntilExpiry < AUTH_TOKEN_EXPIRY_MARGIN_MS) {
    // Deduplicate: if a refresh is already in flight, await it
    if (!pendingRefresh) {
      pendingRefresh = refreshSession().finally(() => {
        pendingRefresh = null;
      });
    }
    // B-03: all concurrent callers receive the same normalized shape.
    // G8-09: preserve already-normalized APIErrors (their original
    // message survives); wrap only unknown failures.
    try {
      return await pendingRefresh;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Sesión expirada", 401);
    }
  }

  return accessToken;
}

/**
 * Build authorization headers for API requests.
 * Handles token refresh transparently.
 *
 * NOTE: no CSRF token — auth is Bearer-header based (not cookie based),
 * so CSRF is structurally N/A.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ═══════════════════════════════════════════════════════════
// §4 BACKEND CALLER
// ═══════════════════════════════════════════════════════════

/**
 * HTTP transport for MCP tool calls to the FastAPI backend.
 * Injected into routeMCPCall for testability and separation of concerns.
 *
 * Handles:
 *   - Auth header injection (with automatic refresh)
 *   - Tool name resolution (frontend → backend naming)
 *   - HTTP error mapping to APIError
 *   - 401 → logout (but NO UI notification — that's QueryClient's job)
 *
 * Deliberately NO timeout: MCP tools backed by AI agents legitimately
 * take 10-30s. Fail-fast timeouts belong to auth/health only (G8-07).
 *
 * @throws APIError on HTTP errors (401, 403, 4xx, 5xx) and on
 *         malformed 2xx bodies (502 — G8-08)
 */
async function backendCaller(
  server: string,
  tool: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const headers = await getAuthHeaders();
  const resolvedTool = resolveToolName(server, tool);

  const response = await fetch(
    `${API_BASE}/agents/${server}/${resolvedTool}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    },
  );

  // 401: session expired — logout, let global error handler show toast
  if (response.status === 401) {
    auth().logout();
    throw new APIError("Sesión expirada", 401);
  }

  // 403: forbidden — permission denied
  if (response.status === 403) {
    throw new APIError("Sin permisos para esta acción", 403);
  }

  // Any other non-2xx: extract detail if available
  if (!response.ok) {
    const body: Record<string, unknown> | null = await response
      .json()
      .catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : null;

    throw new APIError(
      detail ?? `Error del servidor: ${response.status}`,
      response.status,
      body,
    );
  }

  // G8-08: a 2xx with a malformed/non-object body is a contract
  // violation — surface it as a 502 instead of leaking SyntaxError.
  const data: unknown = await response.json().catch(() => null);
  if (data === null || typeof data !== "object") {
    throw new APIError("Respuesta no válida del servidor", 502);
  }
  return data;
}

// ═══════════════════════════════════════════════════════════
// §5 DEV MODE DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Whether the app is running in dev mock mode.
 * Guarded by import.meta.env.DEV — NEVER returns true in production.
 *
 * When true, the MCP Router skips backend and uses mock registry.
 * When false (or in prod), the MCP Router tries backend first.
 */
function isDevMockMode(): boolean {
  if (!import.meta.env.DEV) return false;
  return authDelegate?.getAccessToken() === DEV_MOCK_TOKEN;
}

// ═══════════════════════════════════════════════════════════
// §5b SHARED RESPONSE HELPERS (G8-07 / G8-08)
// ═══════════════════════════════════════════════════════════

/** Abort-like failures: AbortSignal.timeout / manual aborts. */
function isAbortLikeError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

/** Parse a JSON object body; null on malformed JSON (never throws). */
async function parseJsonBody(
  response: unknown,
): Promise<Record<string, unknown> | null> {
  const maybe = response as { json?: () => Promise<unknown> };
  if (typeof maybe.json !== "function") return null;
  try {
    const parsed: unknown = await maybe.json();
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// §6 PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Execute an MCP tool call through the unified routing layer.
 *
 * This is the PRIMARY interface for all backend communication.
 * Both useMCPQuery (data fetching) and useAutonomousAdvisor
 * (plan execution) converge here.
 *
 * Routing (via routeMCPCall):
 *   1. Backend — if available and not in dev mock mode
 *   2. Mock registry — if backend failed and fallback is enabled
 *   3. Error — always thrown, never swallowed
 *
 * G8-05: the backend's ORIGINAL APIError (with its true 401/403/5xx
 * status) is captured per-invocation and re-thrown when the router
 * reports an error — the router's error channel is stringly-typed and
 * would otherwise flatten every failure into a 500. providers.tsx
 * (BC-02) depends on the REAL status for retry + toast classification.
 *
 * @typeParam T — Expected response type (default: MCPResponse)
 * @param agent — MCP server/agent name (e.g., "events", "financial")
 * @param tool — Tool name (e.g., "get_calendar", "get_summary")
 * @param params — Tool parameters
 * @returns Parsed response typed as T
 * @throws APIError — on routing failure, auth failure, or backend error
 */
export async function callMCPTool<T = MCPResponse>(
  agent: string,
  tool: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  // G8-05: per-invocation capture — concurrency-safe (each callMCPTool
  // has its own closure; no shared mutable state).
  let backendError: unknown = null;

  const result = await routeMCPCall<T>(agent, tool, params, {
    preferBackend: !isDevMockMode(),
    fallbackToMock: isDevMockMode(),
    devLogging: true,
    backendCaller: async (
      ...args: Parameters<typeof backendCaller>
    ): Promise<unknown> => {
      try {
        return await backendCaller(...args);
      } catch (error) {
        backendError = error;
        throw error;
      }
    },
  });

  // Router returned an error — propagate as APIError
  if (result.source === "error") {
    if (backendError instanceof APIError) {
      // Original status preserved (G8-05) — 401 stays 401.
      throw backendError;
    }
    throw new APIError(
      result.error ?? `Tool ${agent}.${tool} failed`,
      500,
    );
  }

  // source is "backend" or "mock" — data is valid
  return result.data;
}

/**
 * Get the migration report for the Settings page.
 * Shows which MCP tools are served by backend vs mock registry.
 */
export function getMigrationReport(): ReturnType<
  typeof migrationTracker.getReport
> {
  return migrationTracker.getReport();
}

/**
 * Health check — direct REST call (not MCP routed).
 * Used to verify backend availability on app startup.
 * Fails fast: 5s timeout (G8-07); malformed body → 502 (G8-08).
 */
export async function healthCheck(): Promise<{
  readonly status: string;
  readonly agents: number;
  readonly tools: number;
}> {
  let response: unknown;
  try {
    response = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new APIError("El servidor no respondió a tiempo", 408);
    }
    throw error;
  }

  const maybeResp = response as { ok?: boolean; status?: number };
  if (!maybeResp.ok || typeof maybeResp.status !== "number") {
    throw new APIError(
      `Health check failed: ${String(maybeResp.status)}`,
      typeof maybeResp.status === "number" ? maybeResp.status : 502,
    );
  }

  const body: Record<string, unknown> | null = await parseJsonBody(response);
  if (
    body === null ||
    typeof body.status !== "string" ||
    typeof body.agents !== "number" ||
    typeof body.tools !== "number"
  ) {
    throw new APIError("Respuesta de health no válida", 502);
  }

  return { status: body.status, agents: body.agents, tools: body.tools };
}

/**
 * Login request — direct REST call (not MCP routed).
 * This is the only endpoint that doesn't require authentication.
 *
 * Fails fast: 10s timeout (G8-07); shape-validated response (G8-08).
 *
 * @throws APIError on invalid credentials, timeout (408),
 *         malformed body (502) or server error
 */
export async function loginRequest(
  email: string,
  password: string,
): Promise<{
  readonly access_token: string;
  readonly refresh_token: string;
  readonly token_type: string;
}> {
  let response: unknown;
  try {
    response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new APIError("El servidor no respondió a tiempo", 408);
    }
    throw error;
  }

  const maybeResp = response as { ok?: boolean; status?: number };
  if (!maybeResp.ok || typeof maybeResp.status !== "number") {
    const body: Record<string, unknown> | null = await parseJsonBody(
      response,
    );
    const detail = typeof body?.detail === "string" ? body.detail : null;

    throw new APIError(
      detail ?? "Credenciales inválidas",
      maybeResp.status ?? 502,
    );
  }

  const body: Record<string, unknown> | null = await parseJsonBody(response);
  if (
    body === null ||
    typeof body.access_token !== "string" ||
    typeof body.refresh_token !== "string"
  ) {
    throw new APIError("Respuesta de login no válida", 502);
  }

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    token_type: typeof body.token_type === "string" ? body.token_type : "bearer",
  };
}
