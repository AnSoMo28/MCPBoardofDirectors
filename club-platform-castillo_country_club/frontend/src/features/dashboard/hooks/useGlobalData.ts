// ═══════════════════════════════════════════════════════════
// F47-B — Global Data Hook (Cross-domain aggregator)
// 4 queries across 3 servers + 1 derived (todayEvents)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useGlobalAdvisor } from "./useGlobalAdvisor";
import {
  seedCrossDomainSignals,
  mergeWithBusSignals,
} from "@/shared/lib/advisor-engine/signal-seeder";
import type { ExecutiveSummaryData } from "../types";
import type { AiFinancialReport } from "@/features/finance/types";
import type { CalendarDay } from "@/features/events/types";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

interface ExecutiveSummaryMCPResponse {
  status: string;
  summary: ExecutiveSummaryData;
  message: string;
}

interface AiAnalysisMCPResponse {
  status: string;
  message: string;
  data: AiFinancialReport;
}

interface EventCalendarMCPResponse {
  status: string;
  message: string;
  data: CalendarDay[];
}

interface PendingApprovalsMCPResponse {
  status: string;
  message: string;
  approvals: unknown[];
}

export interface UseGlobalDataOptions {
  enabled?: boolean;
  staleTime?: number;
  period?: string;
  ragContext?: RAGContext[];
}

export function useGlobalData(options: UseGlobalDataOptions = {}) {
  const { enabled = true, staleTime = 120_000, period, ragContext } = options;

  // ── 1. Cross-domain queries (3 servers) ─────────────────

  const summaryQuery = useMCPQuery<ExecutiveSummaryMCPResponse>(
    "executive_dashboard", "get_executive_summary",
    { period },
    { staleTime, enabled },
  );

  const aiReportQuery = useMCPQuery<AiAnalysisMCPResponse>(
    "finance", "generate_ai_analysis",
    { scope: "financial" },
    { staleTime: 300_000, enabled },
  );

  const calendarQuery = useMCPQuery<EventCalendarMCPResponse>(
    "events", "event_get_calendar", {},
    { staleTime: 60_000, enabled },
  );

  const approvalsQuery = useMCPQuery<PendingApprovalsMCPResponse>(
    "hitl", "get_pending_approvals", {},
    { staleTime: 30_000, enabled },
  );

  // ── 2. Extract ──────────────────────────────────────────

  const summary: ExecutiveSummaryData | undefined = useMemo(() => {
    if (!summaryQuery.data?.summary) return undefined;
    return normalizeEnums(
      summaryQuery.data.summary, "executive_dashboard.get_executive_summary",
    ) as ExecutiveSummaryData;
  }, [summaryQuery.data]);

  const aiReport: AiFinancialReport | undefined = useMemo(() => {
    if (!aiReportQuery.data?.data) return undefined;
    return normalizeEnums(
      aiReportQuery.data.data, "finance.generate_ai_analysis",
    ) as AiFinancialReport;
  }, [aiReportQuery.data]);

  const calendarDays: CalendarDay[] | undefined = useMemo(() => {
    if (!calendarQuery.data?.data) return undefined;
    return normalizeEnums(
      calendarQuery.data.data, "events.event_get_calendar",
    ) as CalendarDay[];
  }, [calendarQuery.data]);

  const pendingApprovalsList = approvalsQuery.data?.approvals ?? null;

  // ── 3. Derived: today's events from calendar ────────────

  const todayEventsList = useMemo(() => {
    if (!calendarDays) return [];
    const today = new Date().toISOString().split("T")[0];
    const todayData = calendarDays.find((d) => d.date === today);
    return todayData?.events ?? [];
  }, [calendarDays]);

  // ── 4. Cross-Domain Signal Seeding (F47-D) ─────────────
  // Seeds 4 signals from already-loaded data (financial + events).
  // Merges with bus signals from other pages user already visited.
  // Enables fusion rules R26-R29 without requiring page visits.

  const crossDomainSignals = useMemo(() => {
    const seeded = seedCrossDomainSignals(aiReport, calendarDays);
    return mergeWithBusSignals(seeded);
  }, [aiReport, calendarDays]);

  // ── 5. Global Advisor (29 rules, fusion R26-R29) ────────

  const advisorResult = useGlobalAdvisor({
    summary,
    aiReport,
    calendarDays,
    pendingApprovals: pendingApprovalsList?.length ?? 0,
    todayEvents: todayEventsList.length,
    enabled,
    crossDomainSignals,
    ragContext: ragContext,
  });

  const insights = advisorResult.insights;
  const causalChains = advisorResult.causalChains;

  // ── 5. States ───────────────────────────────────────────

  const queries = [summaryQuery, aiReportQuery, calendarQuery, approvalsQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  return {
    insights, summary, aiReport, calendarDays,
    pendingApprovals: pendingApprovalsList,
    pendingApprovalsCount: pendingApprovalsList?.length ?? 0,
    todayEvents: todayEventsList,
    todayEventsCount: todayEventsList.length,
    causalChains,
    isLoading, isError, error,
    summaryQuery, aiReportQuery, calendarQuery, approvalsQuery,
  };
}