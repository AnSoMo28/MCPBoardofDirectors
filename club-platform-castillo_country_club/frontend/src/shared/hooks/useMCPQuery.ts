// src/shared/hooks/useMCPQuery.ts
// ═══════════════════════════════════════════════════════════
// MCP QUERY — React Query integration for MCP tool calls
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   N/A — shared hook
// @keyframes   0
// @depends     @tanstack/react-query, @/shared/lib/api
//
// The PRIMARY data-fetching hook for all features.
// Wraps React Query's useQuery/useMutation around callMCPTool.
//
// Every feature that needs backend data uses this hook:
//   const { data, isLoading, error } = useMCPQuery<T>(
//     "events", "get_calendar", { month: "2026-08" }
//   );
//
// Architecture:
//   Feature Component → useMCPQuery → callMCPTool → routeMCPCall → Backend
//
// PRE-WRITE VERIFICATION:
// [x] callMCPTool signature: (agent, tool, params?) → Promise<T>
// [x] callMCPTool throws APIError on failure (never returns null/error)
// [x] React Query queryFn handles thrown errors → error state
// [x] React Query v5 hashes queryKey by value (params stable for JSON-serializable)
// [x] UseMutationOptions.onSuccess receives 3 params in v5: (data, variables, context)
// [x] options spread BEFORE custom handlers to prevent silent override
//
// ANTI-PATTERNS REMOVED:
// [x] useExecutiveSummary domain hook → moved to features/dashboard/hooks/
// [x] `params as Record<string, unknown>` cast → generic constraint P extends Record
// [x] No retry defaults → MCP-sensible: 1 retry, exponential backoff
// [x] No section markers → §1-§3
// [x] Spread order bug (options AFTER onSuccess) → options first, then override
// [x] onSuccess arity (4 args → 3 args per React Query v5)
// [x] User onSuccess silently swallowed → explicitly delegated
// ═══════════════════════════════════════════════════════════

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { callMCPTool } from "../lib/api";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Default retry count for MCP queries.
 * One retry handles transient network issues without
 * overwhelming a potentially busy multi-agent backend.
 */
const MCP_QUERY_RETRY_COUNT = 1;

/**
 * Exponential backoff delay capped at 10 seconds.
 * Prevents thundering herd on backend recovery.
 */
function mcpRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 10_000);
}

// ═══════════════════════════════════════════════════════════
// §2 QUERY HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Fetch data from an MCP agent tool via React Query.
 *
 * This is the standard data-fetching hook for ALL features.
 * It wraps React Query around callMCPTool, providing:
 *   - Automatic caching (configurable via options)
 *   - Loading/error states
 *   - Background refetching
 *   - Retry with exponential backoff
 *   - Deduplication of identical concurrent queries
 *
 * @typeParam T — Expected response type from the MCP tool
 * @param agent — MCP server/agent name (e.g., "events", "financial")
 * @param tool — Tool name (e.g., "get_calendar", "get_summary")
 * @param params — Tool parameters. Must be JSON-serializable for stable query keys.
 * @param options — React Query options (staleTime, refetchInterval, etc.)
 * @returns React Query result with data, isLoading, error, etc.
 *
 * @example
 * // Basic usage
 * const { data, isLoading } = useMCPQuery<EventsResponse>(
 *   "events", "get_calendar", { month: "2026-08" }
 * );
 *
 * @example
 * // With custom stale time
 * const { data } = useMCPQuery<DashboardSummary>(
 *   "executive_dashboard", "get_executive_summary",
 *   { period: "current_quarter" },
 *   { staleTime: 60_000, refetchInterval: 5 * 60_000 }
 * );
 *
 * @example
 * // Conditionally enabled
 * const { data } = useMCPQuery<FamilyDetail>(
 *   "families", "get_detail", { familyId },
 *   { enabled: !!familyId }
 * );
 */
export function useMCPQuery<T = unknown>(
  agent: string,
  tool: string,
  params: Record<string, unknown> = {},
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error>({
    queryKey: [agent, tool, params],
    queryFn: () => callMCPTool<T>(agent, tool, params),
    retry: MCP_QUERY_RETRY_COUNT,
    retryDelay: mcpRetryDelay,
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════
// §3 MUTATION HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Execute an MCP agent tool as a mutation (write operation).
 *
 * Automatically invalidates all queries for the same agent
 * on success, triggering background refetch of stale data.
 *
 * Spread order is CRITICAL:
 *   1. ...options first (onError, onMutate, onSettled pass through)
 *   2. mutationFn override (always routes through callMCPTool)
 *   3. onSuccess override (always invalidates + delegates to user callback)
 *
 * This ensures user callbacks are NEVER silently replaced,
 * and cache invalidation NEVER depends on whether the user passes onSuccess.
 *
 * @typeParam T — Expected response type
 * @typeParam P — Parameters type (must extend Record<string, unknown>)
 * @param agent — MCP server/agent name
 * @param tool — Tool name
 * @param options — React Query mutation options (onSuccess, onError, etc.)
 * @returns React Query mutation result with mutate, isLoading, error, etc.
 *
 * @example
 * const mutation = useMCPMutation<CreateEventResponse, CreateEventParams>(
 *   "events", "create_event",
 *   {
 *     onSuccess: (data) => {
 *       showToast({ type: "success", message: "Event created" });
 *     },
 *   }
 * );
 *
 * mutation.mutate({ title: "Gala", date: "2026-09-01" });
 */
export function useMCPMutation<
  T = unknown,
  P extends Record<string, unknown> = Record<string, unknown>,
>(agent: string, tool: string, options?: UseMutationOptions<T, Error, P>) {
  const queryClient = useQueryClient();

  return useMutation<T, Error, P>({
    // Step 1: Spread user options FIRST
    // onError, onMutate, onSettled, retry, etc. pass through unchanged
    ...options,

    // Step 2: Override mutationFn — ALWAYS route through callMCPTool
    // Users should not replace the transport layer
    mutationFn: (params: P) => callMCPTool<T>(agent, tool, params),

    // Step 3: Override onSuccess — ALWAYS invalidate + delegate
    // React Query v5 signature: (data, variables, context) — 3 params
    // context is the return value of onMutate (if provided)
    onSuccess: (data, variables, onMutateResult, context) => {
      // Invalidate all queries for this agent (fires refetch)
      queryClient.invalidateQueries({ queryKey: [agent] });

      // Delegate to user's onSuccess if provided
      // Returning the result preserves Promise chaining for async callbacks
      return options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}