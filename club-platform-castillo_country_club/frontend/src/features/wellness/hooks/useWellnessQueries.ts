/* ═══════════════════════════════════════════════════════════════
   features/wellness/hooks/useWellnessQueries.ts

   Castillo Country Club — Wellness Queries Aggregator
   Consolidates all MCP queries for the wellness domain.

   8 queries: profile, report, prevReport, recommendations,
   predictions, anomalies, correlate, insights.

   Gracefully handles missing intelligence endpoints (P20).
   ═══════════════════════════════════════════════════════════════ */

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type {
  WellnessReport,
  WellnessProfileGetResponse,
  WellnessRecommendationsResponse,
  WellnessPredictResponse,
  WellnessAnomaliesResponse,
  WellnessCorrelateResponse,
  WellnessInsightsResponse,
} from "../types";

// ── Response wrappers ────────────────────────────────────────

export interface WellnessReportResponse {
  status: string;
  message: string;
  data: WellnessReport;
  period: string;
}

// ── Input ────────────────────────────────────────────────────

interface UseWellnessQueriesInput {
  familyId: string;
  dateFrom: string;
  dateTo: string;
  prevDateFrom: string;
  prevDateTo: string;
}

// ── Hook ─────────────────────────────────────────────────────

export function useWellnessQueries({
  familyId,
  dateFrom,
  dateTo,
  prevDateFrom,
  prevDateTo,
}: UseWellnessQueriesInput) {
  const enabled = !!familyId;

  // ── Core queries ─────────────────────────────────────────

  const profile = useMCPQuery<WellnessProfileGetResponse>(
    "wellness",
    "wellness_profile_get",
    { family_id: familyId },
    { staleTime: 300_000, enabled },
  );

  const report = useMCPQuery<WellnessReportResponse>(
    "wellness",
    "wellness_report",
    { family_id: familyId, date_from: dateFrom, date_to: dateTo },
    { staleTime: 60_000, enabled },
  );

  const prevReport = useMCPQuery<WellnessReportResponse>(
    "wellness",
    "wellness_report",
    {
      family_id: familyId,
      date_from: prevDateFrom,
      date_to: prevDateTo,
    },
    { staleTime: 120_000, enabled },
  );

  const recommendations = useMCPQuery<WellnessRecommendationsResponse>(
    "wellness",
    "wellness_recommendations",
    { family_id: familyId },
    { staleTime: 300_000, enabled },
  );

  // ── Intelligence queries (P20) ───────────────────────────

  const predictions = useMCPQuery<WellnessPredictResponse>(
    "wellness",
    "wellness_predict",
    { family_id: familyId },
    { staleTime: 120_000, enabled },
  );

  const anomalies = useMCPQuery<WellnessAnomaliesResponse>(
    "wellness",
    "wellness_anomalies",
    { family_id: familyId },
    { staleTime: 60_000, enabled },
  );

  const correlate = useMCPQuery<WellnessCorrelateResponse>(
    "wellness",
    "wellness_correlate",
    { family_id: familyId },
    { staleTime: 300_000, enabled },
  );

  const insights = useMCPQuery<WellnessInsightsResponse>(
    "wellness",
    "wellness_insights",
    { family_id: familyId },
    { staleTime: 120_000, enabled },
  );

  // ── Loading ──────────────────────────────────────────────

  const isLoading = profile.isLoading || report.isLoading;
  const isLoadingIntelligence =
    predictions.isLoading ||
    anomalies.isLoading ||
    correlate.isLoading ||
    insights.isLoading;

  // ── Derived ──────────────────────────────────────────────

  const profileData =
    profile.data?.status === "success" ? profile.data.data : undefined;
  const reportData = report.data?.data;
  const prevReportData = prevReport.data?.data;
  const recommendationsData = recommendations.data?.data ?? [];
  const predictionsData = predictions.data?.data;
  const anomaliesData = anomalies.data?.data;
  const correlateData = correlate.data?.data;
  const insightsData = insights.data?.data;

  return {
    isLoading,
    isLoadingIntelligence,
    profile,
    report,
    prevReport,
    recommendations,
    predictions,
    anomalies,
    correlate,
    insights,
    profileData,
    reportData,
    prevReportData,
    recommendationsData,
    predictionsData,
    anomaliesData,
    correlateData,
    insightsData,
  };
}