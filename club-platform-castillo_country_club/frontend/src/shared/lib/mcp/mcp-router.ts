// src/shared/lib/mcp/mcp-router.ts
// ═══════════════════════════════════════════════════════════
// MCP ROUTER — Unified Routing Layer
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.0
// @namespace   N/A — infrastructure layer
// @keyframes   0
// @depends     @/shared/mocks/mock-registry, ./migration-tracker
//
// Replaces the 3-step fallback chain with a clean, observable
// routing layer. Every call returns source metadata.
//
// Routing priority:
//   1. Backend (if available + preferred)
//   2. Mock registry (typed factories + normalizeEnums)
//   3. Error (NO silent fallbacks)
//
// Source tracking: every response includes where data came from.
// Migration tracking: auto-promotes tools via MigrationTracker.
//
// PRE-WRITE VERIFICATION:
// [x] All imports verified against seen files
// [x] api.ts uses: routeMCPCall, checks result.source
// [x] getMockResponse signature: (server, tool, params) => unknown | null
// [x] migrationTracker methods: getStatus, recordBackendSuccess, etc.
//
// ANTI-PATTERNS REMOVED (v1):
// [x] `null as T` (3x) → discriminated union (data only on success)
// [x] Singleton tracker → injected via config (default provided)
// [x] Cumulative latency across fallback attempts → per-attempt timing
// [x] Missing readonly on interface fields → added
// [x] Missing § section markers → §1-§3
//
// FIXES APPLIED (v2):
// [x] B-05: MigrationTrackerLike exported for testability
// [x] B-06: R-16 exemption documented for console hex colors
// ═══════════════════════════════════════════════════════════

// ═══ Shared — lib ═══
import { getMockResponse } from "../../mocks/mock-registry";
import { migrationTracker as defaultMigrationTracker } from "./migration-tracker";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/** Where the routed response came from. */
export type MCPSource = "backend" | "mock" | "error";

/**
 * Result of a successful MCP tool call (backend or mock).
 * `data` is guaranteed to be present when source is not "error".
 */
export interface MCPSuccessResult<T> {
  readonly source: "backend" | "mock";
  readonly data: T;
  readonly server: string;
  readonly tool: string;
  readonly latency: number;
  readonly migrationStatus: string;
}

/**
 * Result of a failed MCP tool call.
 * `error` describes what went wrong.
 */
export interface MCPErrorResult {
  readonly source: "error";
  readonly error: string;
  readonly server: string;
  readonly tool: string;
  readonly latency: number;
  readonly migrationStatus: string;
}

/**
 * Discriminated union: success carries data, error carries message.
 * Consumers MUST check `source` before accessing `data`.
 *
 * @example
 * const result = await routeMCPCall<MyData>(...);
 * if (result.source === "error") {
 *   console.error(result.error);    // ✅ error is accessible
 *   return;
 * }
 * use(result.data);                  // ✅ data is guaranteed T
 */
export type MCPRouteResult<T = unknown> =
  | MCPSuccessResult<T>
  | MCPErrorResult;

/**
 * Configuration for the MCP Router.
 * All dependencies are injectable for testability.
 */
export interface MCPRouterConfig {
  /** Try backend first? Default: true */
  readonly preferBackend: boolean;

  /** Fallback to mock if backend fails? Default: true */
  readonly fallbackToMock: boolean;

  /** Log routing decisions in DEV console? Default: true */
  readonly devLogging: boolean;

  /**
   * Backend HTTP caller — injected for testability.
   * api.ts provides the real fetch-based implementation.
   */
  readonly backendCaller: (
    server: string,
    tool: string,
    params: Record<string, unknown>,
  ) => Promise<unknown>;

  /**
   * Migration tracker — injected for testability.
   * Defaults to the module-level singleton if not provided.
   */
  readonly migrationTracker?: MigrationTrackerLike;
}

/**
 * Minimal interface for the migration tracker.
 * Exported so test consumers can provide typed mock trackers.
 *
 * @example
 * const mockTracker: MigrationTrackerLike = {
 *   getStatus: () => ({ status: "mock-only" }),
 *   recordBackendSuccess: vi.fn(),
 *   recordBackendFail: vi.fn(),
 *   recordMockUse: vi.fn(),
 * };
 */
export interface MigrationTrackerLike {
  getStatus(server: string, tool: string): { readonly status: string };
  recordBackendSuccess(server: string, tool: string): void;
  recordBackendFail(server: string, tool: string): void;
  recordMockUse(server: string, tool: string): void;
}

// ═══════════════════════════════════════════════════════════
// §2 ROUTER
// ═══════════════════════════════════════════════════════════

/**
 * Format a routing decision for DEV console logging.
 *
 * R-16 EXEMPTION: Console hex colors (#3DAA70, etc.) are intentionally
 * hardcoded because CSS custom properties cannot be interpolated in
 * console.log format strings. These colors are DEV-only (guarded by
 * import.meta.env.DEV) and never reach the UI rendering pipeline.
 *
 * Backend = green, Mock = gray, Error = red, Warning = amber.
 */
function logRoute(
  enabled: boolean,
  color: string,
  server: string,
  tool: string,
  destination: string,
  latency: number,
): void {
  if (!enabled || !import.meta.env.DEV) return;
  console.log(
    `%c[MCP] ${server}.${tool} → ${destination} (${latency.toFixed(0)}ms)`,
    `color: ${color}; font-weight: bold`,
  );
}

/**
 * Route an MCP tool call through the unified routing layer.
 *
 * Routing decision:
 *   1. If preferBackend AND tool is not mock-only → try backend
 *   2. If backend fails AND fallbackToMock → try mock registry
 *   3. If all attempts fail → return error result
 *
 * Each attempt gets its own latency measurement (no cumulative timing).
 * The migration tracker records success/failure for each attempt.
 *
 * @typeParam T — Expected response type
 * @param server — MCP server/agent name
 * @param tool — Tool name
 * @param params — Tool parameters
 * @param config — Router configuration with injected dependencies
 * @returns Discriminated union: success (with data) or error (with message)
 */
export async function routeMCPCall<T = unknown>(
  server: string,
  tool: string,
  params: Record<string, unknown>,
  config: MCPRouterConfig,
): Promise<MCPRouteResult<T>> {
  const tracker: MigrationTrackerLike =
    config.migrationTracker ?? defaultMigrationTracker;
  const migration = tracker.getStatus(server, tool);
  const shouldLog = config.devLogging;

  // ── Step 1: Try backend ──
  if (config.preferBackend && migration.status !== "mock-only") {
    const backendStart = performance.now();

    try {
      const data = await config.backendCaller(server, tool, params);
      const latency = performance.now() - backendStart;

      tracker.recordBackendSuccess(server, tool);
      logRoute(shouldLog, "#3DAA70", server, tool, "BACKEND", latency);

      return {
        source: "backend",
        data: data as T,
        server,
        tool,
        latency,
        migrationStatus: migration.status,
      };
    } catch (backendError) {
      const latency = performance.now() - backendStart;

      tracker.recordBackendFail(server, tool);

      // If no fallback, return error immediately
      if (!config.fallbackToMock) {
        logRoute(
          shouldLog,
          "#C46470",
          server,
          tool,
          "BACKEND FAILED (no fallback)",
          latency,
        );

        return {
          source: "error",
          error:
            backendError instanceof Error
              ? backendError.message
              : String(backendError),
          server,
          tool,
          latency,
          migrationStatus: migration.status,
        };
      }

      // Fallback enabled — log warning and fall through to mock
      logRoute(
        shouldLog,
        "#D4A840",
        server,
        tool,
        "BACKEND FAILED → trying mock",
        latency,
      );
    }
  }

  // ── Step 2: Try mock registry ──
  const mockStart = performance.now();

  try {
    const data = getMockResponse(server, tool, params);
    const latency = performance.now() - mockStart;

    // No mock registered for this tool
    if (data === null) {
      tracker.recordMockUse(server, tool);
      logRoute(
        shouldLog,
        "#C46470",
        server,
        tool,
        "NO MOCK REGISTERED",
        latency,
      );

      return {
        source: "error",
        error: `No mock registered for ${server}.${tool}`,
        server,
        tool,
        latency,
        migrationStatus: migration.status,
      };
    }

    // Mock returned data
    tracker.recordMockUse(server, tool);
    logRoute(shouldLog, "#8A95A5", server, tool, "MOCK", latency);

    return {
      source: "mock",
      data: data as T,
      server,
      tool,
      latency,
      migrationStatus: migration.status,
    };
  } catch (mockError) {
    const latency = performance.now() - mockStart;

    logRoute(shouldLog, "#C46470", server, tool, "MOCK FAILED", latency);

    return {
      source: "error",
      error:
        mockError instanceof Error ? mockError.message : String(mockError),
      server,
      tool,
      latency,
      migrationStatus: migration.status,
    };
  }
}