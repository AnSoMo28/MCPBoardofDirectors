// ═══════════════════════════════════════════════════════════
// F47-B — Sports Data Hook
// Keys: .analytics (verified), .health_summary/.calendar (inferred)
// Server: sports_recreation (not club_sports)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useSportsAdvisor } from "./useSportsAdvisor";
import type {
  SportsAnalytics_Contract,
  SportsHealthSummary_Contract,
  SportsCalendarItem_Contract,
} from "@/shared/mocks/contracts";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

interface SportsAnalyticsMCPResponse {
  status: string;
  message: string;
  analytics: SportsAnalytics_Contract;
}

// Key inferred: .health_summary — verify against factory
interface SportsHealthMCPResponse {
  status: string;
  message: string;
  health_summary: SportsHealthSummary_Contract;
}

// Key inferred: .calendar — verify against factory
interface SportsCalendarMCPResponse {
  status: string;
  message: string;
  calendar: SportsCalendarItem_Contract[];
}

export interface UseSportsDataOptions {
  enabled?: boolean;
  staleTime?: number;
  ragContext?: RAGContext[];
}

export function useSportsData(options: UseSportsDataOptions = {}) {
  const { enabled = true, staleTime = 120_000, ragContext } = options;

  const analyticsQuery = useMCPQuery<SportsAnalyticsMCPResponse>(
    "sports_recreation", "get_sports_analytics", {},
    { staleTime, enabled },
  );

  const healthQuery = useMCPQuery<SportsHealthMCPResponse>(
    "sports_recreation", "get_sports_health_summary", {},
    { staleTime, enabled },
  );

  const calendarQuery = useMCPQuery<SportsCalendarMCPResponse>(
    "sports_recreation", "get_sports_calendar", {},
    { staleTime: 60_000, enabled },
  );

  const analytics: SportsAnalytics_Contract | null = useMemo(() => {
    if (!analyticsQuery.data?.analytics) return null;
    return normalizeEnums(
      analyticsQuery.data.analytics, "sports_recreation.get_sports_analytics",
    ) as SportsAnalytics_Contract;
  }, [analyticsQuery.data]);

  const health: SportsHealthSummary_Contract | null = useMemo(() => {
    if (!healthQuery.data?.health_summary) return null;
    return normalizeEnums(
      healthQuery.data.health_summary, "sports_recreation.get_sports_health_summary",
    ) as SportsHealthSummary_Contract;
  }, [healthQuery.data]);

  const calendar: SportsCalendarItem_Contract[] | null = useMemo(() => {
    if (!calendarQuery.data?.calendar) return null;
    return normalizeEnums(
      calendarQuery.data.calendar, "sports_recreation.get_sports_calendar",
    ) as SportsCalendarItem_Contract[];
  }, [calendarQuery.data]);

  const insights = useSportsAdvisor(analytics, health, calendar ?? [], ragContext);

  const queries = [analyticsQuery, healthQuery, calendarQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  return {
    insights, analytics, health, calendar,
    isLoading, isError, error,
    analyticsQuery, healthQuery, calendarQuery,
  };
}