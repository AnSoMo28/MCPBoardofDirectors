// ═══════════════════════════════════════════════════════════
// F47-B — ML Intelligence Data Hook (7 data sources)
// Keys: .quality_report (verified), others inferred
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useMLAdvisor } from "./useMLAdvisor";
import type {
  DataQualityReport,
  AnomalyReport,
  DemandForecast,
  RevenueForecast,
  ChurnMLReport,
  MemberSegmentation,
  ModelHealthReport,
} from "@/shared/mocks/contracts";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

interface DataQualityMCPResponse {
  status: string;
  message: string;
  quality_report: DataQualityReport;
}

interface AnomaliesMCPResponse {
  status: string;
  message: string;
  anomalies: AnomalyReport;
}

interface DemandForecastMCPResponse {
  status: string;
  message: string;
  forecasts: DemandForecast;
}

interface RevenueForecastMCPResponse {
  status: string;
  message: string;
  forecast: RevenueForecast;
}

interface ChurnMCPResponse {
  status: string;
  message: string;
  report: ChurnMLReport;
}

interface SegmentationMCPResponse {
  status: string;
  message: string;
  segments: MemberSegmentation;
}

interface ModelHealthMCPResponse {
  status: string;
  message: string;
  health: ModelHealthReport;
}

export interface UseMLDataOptions {
  enabled?: boolean;
  staleTime?: number;
  ragContext?: RAGContext[];
}

export function useMLData(options: UseMLDataOptions = {}) {
  const { enabled = true, staleTime = 180_000, ragContext } = options;

  const dataQualityQuery = useMCPQuery<DataQualityMCPResponse>(
    "ml_intelligence", "get_data_quality_report", {},
    { staleTime, enabled },
  );

  const anomaliesQuery = useMCPQuery<AnomaliesMCPResponse>(
    "ml_intelligence", "get_anomaly_report", {},
    { staleTime, enabled },
  );

  const demandQuery = useMCPQuery<DemandForecastMCPResponse>(
    "ml_intelligence", "get_demand_forecast", {},
    { staleTime, enabled },
  );

  const revenueQuery = useMCPQuery<RevenueForecastMCPResponse>(
    "ml_intelligence", "get_revenue_forecast", {},
    { staleTime, enabled },
  );

  const churnQuery = useMCPQuery<ChurnMCPResponse>(
    "ml_intelligence", "get_churn_ml_scores", {},
    { staleTime, enabled },
  );

  const segmentationQuery = useMCPQuery<SegmentationMCPResponse>(
    "ml_intelligence", "get_member_segments", {},
    { staleTime: 300_000, enabled },
  );

  const modelHealthQuery = useMCPQuery<ModelHealthMCPResponse>(
    "ml_intelligence", "get_model_health", {},
    { staleTime: 300_000, enabled },
  );

  const dataQuality: DataQualityReport | null = useMemo(() => {
    if (!dataQualityQuery.data?.quality_report) return null;
    return normalizeEnums(
      dataQualityQuery.data.quality_report, "ml_intelligence.get_data_quality_report",
    ) as DataQualityReport;
  }, [dataQualityQuery.data]);

  const anomalies: AnomalyReport | null = useMemo(() => {
    if (!anomaliesQuery.data?.anomalies) return null;
    return normalizeEnums(
      anomaliesQuery.data.anomalies, "ml_intelligence.get_anomaly_report",
    ) as AnomalyReport;
  }, [anomaliesQuery.data]);

  const demandForecasts: DemandForecast | null = useMemo(() => {
    if (!demandQuery.data?.forecasts) return null;
    return normalizeEnums(
      demandQuery.data.forecasts, "ml_intelligence.get_demand_forecast",
    ) as DemandForecast;
  }, [demandQuery.data]);

  const revenueForecast: RevenueForecast | null = useMemo(() => {
    if (!revenueQuery.data?.forecast) return null;
    return normalizeEnums(
      revenueQuery.data.forecast, "ml_intelligence.get_revenue_forecast",
    ) as RevenueForecast;
  }, [revenueQuery.data]);

  const churnReport: ChurnMLReport | null = useMemo(() => {
    if (!churnQuery.data?.report) return null;
    return normalizeEnums(
      churnQuery.data.report, "ml_intelligence.get_churn_ml_scores",
    ) as ChurnMLReport;
  }, [churnQuery.data]);

  const segmentation: MemberSegmentation | null = useMemo(() => {
    if (!segmentationQuery.data?.segments) return null;
    return normalizeEnums(
      segmentationQuery.data.segments, "ml_intelligence.get_member_segments",
    ) as MemberSegmentation;
  }, [segmentationQuery.data]);

  const modelHealth: ModelHealthReport | null = useMemo(() => {
    if (!modelHealthQuery.data?.health) return null;
    return normalizeEnums(
      modelHealthQuery.data.health, "ml_intelligence.get_model_health",
    ) as ModelHealthReport;
  }, [modelHealthQuery.data]);

  const insights = useMLAdvisor(
    dataQuality, anomalies, demandForecasts ? [demandForecasts] : [], revenueForecast,
    churnReport, segmentation, modelHealth, ragContext);

  const queries = [
    dataQualityQuery, anomaliesQuery, demandQuery, revenueQuery,
    churnQuery, segmentationQuery, modelHealthQuery,
  ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  return {
    insights, dataQuality, anomalies, demandForecasts, revenueForecast,
    churnReport, segmentation, modelHealth,
    isLoading, isError, error,
    dataQualityQuery, anomaliesQuery, demandQuery, revenueQuery,
    churnQuery, segmentationQuery, modelHealthQuery,
  };
}