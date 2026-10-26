// ═══════════════════════════════════════════════════════════
// F47-B — Communication Data Hook
// Keys: .analytics, .history (verified), .scheduled (TBD)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useCommunicationAdvisor } from "./useCommunicationAdvisor";
import type { CommunicationAnalyticsData, HistoryItem, ScheduledItem } from "../types";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

interface CommAnalyticsMCPResponse {
  status: string;
  message: string;
  analytics: CommunicationAnalyticsData;
}

interface HistoryMCPResponse {
  status: string;
  message: string;
  history: unknown[];
  total: number;
}

// TODO F47-B: Verify key name against schedule_notification factory.
// Inferred: .scheduled — may be .notifications or .data.
interface ScheduledMCPResponse {
  status: string;
  message: string;
  scheduled: unknown[];
}

export interface UseCommunicationDataOptions {
  enabled?: boolean;
  staleTime?: number;
  ragContext?: RAGContext[];
}

export function useCommunicationData(options: UseCommunicationDataOptions = {}) {
  const { enabled = true, staleTime = 120_000, ragContext } = options;

  const analyticsQuery = useMCPQuery<CommAnalyticsMCPResponse>(
    "communication", "get_communication_analytics", {},
    { staleTime, enabled },
  );

  const historyQuery = useMCPQuery<HistoryMCPResponse>(
    "communication", "get_notification_history", {},
    { staleTime, enabled },
  );

  const scheduledQuery = useMCPQuery<ScheduledMCPResponse>(
    "communication", "schedule_notification", { action: "list" },
    { staleTime: 60_000, enabled },
  );

  const analytics: CommunicationAnalyticsData | null = useMemo(() => {
    if (!analyticsQuery.data?.analytics) return null;
    return normalizeEnums(
      analyticsQuery.data.analytics, "communication.get_communication_analytics",
    ) as CommunicationAnalyticsData;
  }, [analyticsQuery.data]);

  const history = historyQuery.data?.history ?? null;
  const scheduled = scheduledQuery.data?.scheduled ?? null;

  const insights = useCommunicationAdvisor( analytics ?? undefined, (history ?? []) as HistoryItem[], (scheduled ?? []) as ScheduledItem[], ragContext);

  const queries = [analyticsQuery, historyQuery, scheduledQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  return {
    insights, analytics, history, scheduled,
    isLoading, isError, error,
    analyticsQuery, historyQuery, scheduledQuery,
  };
}