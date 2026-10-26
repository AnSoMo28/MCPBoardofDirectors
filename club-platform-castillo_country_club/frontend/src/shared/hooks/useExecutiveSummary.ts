// src/features/dashboard/hooks/useExecutiveSummary.ts
// ═══════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY — Dashboard domain hook
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   .db- (dashboard)
// @depends     @/shared/hooks/useMCPQuery
//
// Fetches the executive dashboard summary from the
// executive_dashboard MCP agent.
//
// Moved from shared/hooks/useMCPQuery.ts — domain hooks
// belong in their feature directory, not in shared/.
// ═══════════════════════════════════════════════════════════

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface ExecutiveSummaryResponse {
  readonly status: string;
  readonly summary: Record<string, unknown>;
  readonly message: string;
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Data is considered fresh for 1 minute */
const STALE_TIME_MS = 60_000;

/** Refetch in background every 5 minutes */
const REFETCH_INTERVAL_MS = 5 * 60_000;

// ═══════════════════════════════════════════════════════════
// §3 HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Fetch the executive dashboard summary.
 * Stale time: 60s. Background refetch: every 5 min.
 *
 * @param period — Reporting period (default: "current_quarter")
 */
export function useExecutiveSummary(period: string = "current_quarter") {
  return useMCPQuery<ExecutiveSummaryResponse>(
    "executive_dashboard",
    "get_executive_summary",
    { period },
    {
      staleTime: STALE_TIME_MS,
      refetchInterval: REFETCH_INTERVAL_MS,
    },
  );
}