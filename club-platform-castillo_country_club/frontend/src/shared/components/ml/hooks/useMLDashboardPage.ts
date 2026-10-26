// src/shared/components/ml/hooks/useMLDashboardPage.ts
// Fase 23 — ML Dashboard Page data hook
// ═══════════════════════════════════════════════════════════════════

import { useMemo, useCallback } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useMLAdvisor } from "@/shared/hooks/useMLAdvisor";
import type {
  DataQualityReport, AnomalyReport, RevenueForecast,
  ChurnMLReport, MemberSegmentation, ModelHealthReport,
  DemandForecast,
} from "@/shared/mocks/contracts";

export function useMLDashboardPage() {
  /* ── 7 queries ── */
  const dqQuery = useMCPQuery<{ report: DataQualityReport }>(
    "ml_intelligence", "get_data_quality_report", {}, { staleTime: 120_000 },
  );
  const anomalyQuery = useMCPQuery<{ report: AnomalyReport }>(
    "ml_intelligence", "get_anomaly_report", {}, { staleTime: 120_000 },
  );
  const revenueQuery = useMCPQuery<{ forecast: RevenueForecast }>(
    "ml_intelligence", "get_revenue_forecast", {}, { staleTime: 300_000 },
  );
  const churnQuery = useMCPQuery<{ report: ChurnMLReport }>(
    "ml_intelligence", "get_churn_ml_scores", {}, { staleTime: 120_000 },
  );
  const segmentQuery = useMCPQuery<{ segmentation: MemberSegmentation }>(
    "ml_intelligence", "get_member_segments", {}, { staleTime: 120_000 },
  );
  const modelHealthQuery = useMCPQuery<{ report: ModelHealthReport }>(
    "ml_intelligence", "get_model_health", {}, { staleTime: 120_000 },
  );
  const demandQuery = useMCPQuery<{ forecast: DemandForecast }>(
    "ml_intelligence", "get_demand_forecast", {}, { staleTime: 300_000 },
  );

  /* ── Extract data ── */
  const dqData = dqQuery.data?.report ?? null;
  const anomalyData = anomalyQuery.data?.report ?? null;
  const revenueData = revenueQuery.data?.forecast ?? null;
  const churnData = churnQuery.data?.report ?? null;
  const segmentData = segmentQuery.data?.segmentation ?? null;
  const modelHealthData = modelHealthQuery.data?.report ?? null;
  const demandData = demandQuery.data?.forecast ?? null;

  /* ── Advisor ── */
  const advisor = useMLAdvisor(
    dqData, anomalyData, demandData ? [demandData] : [],
    revenueData, churnData, segmentData, modelHealthData,
  );

  /* ── Loading / Error ── */
  const isLoading = dqQuery.isLoading || anomalyQuery.isLoading;
  const isError = dqQuery.isError || anomalyQuery.isError;

  /* ── Refetch all ── */
  const refetchAll = useCallback(() => {
    dqQuery.refetch();
    anomalyQuery.refetch();
    revenueQuery.refetch();
    churnQuery.refetch();
    segmentQuery.refetch();
    modelHealthQuery.refetch();
    demandQuery.refetch();
  }, [dqQuery, anomalyQuery, revenueQuery, churnQuery, segmentQuery, modelHealthQuery, demandQuery]);

  /* ── KPIs ── */
  const kpis = useMemo(() => [
    {
      label: "Data Quality",
      value: dqData ? `${dqData.overall_score}/100` : "—",
      subtitle: dqData ? `${dqData.domains_ready_for_ml}/${dqData.total_domains} dominios listos` : "",
      color: dqData
        ? dqData.overall_score >= 70 ? "var(--color-emerald-400)" : "var(--color-amber-400)"
        : "var(--color-silver-400)",
    },
    {
      label: "Revenue Forecast",
      value: revenueData ? `₡${(revenueData.current_monthly_revenue / 1_000_000).toFixed(1)}M` : "—",
      subtitle: revenueData ? `/mes (budget: ₡${(revenueData.budget_monthly / 1_000_000).toFixed(1)}M)` : "",
      color: "var(--color-gold-400)",
    },
    {
      label: "At-Risk (ML)",
      value: churnData ? churnData.total_at_risk.toString() : "—",
      subtitle: churnData ? `de ${churnData.total_analyzed} analizados` : "",
      color: "var(--color-rose-400)",
    },
    {
      label: "Anomalías",
      value: anomalyData ? anomalyData.total_anomalies.toString() : "—",
      subtitle: anomalyData
        ? `${anomalyData.critical_count} críticas · sistémico: ${anomalyData.systemic_risk_score}/100`
        : "",
      color: anomalyData && anomalyData.critical_count > 0
        ? "var(--color-rose-400)" : "var(--color-teal-400)",
    },
  ], [dqData, revenueData, churnData, anomalyData]);

  /* ── Ambient color (for glow) ── */
  const ambientHue = useMemo(() => {
    if (anomalyData && anomalyData.critical_count > 0) return 350; /* rose */
    if (dqData && dqData.overall_score < 50) return 42; /* amber */
    return 175; /* teal — healthy */
  }, [anomalyData, dqData]);

  return {
    dqData, anomalyData, revenueData, churnData,
    segmentData, modelHealthData, demandData,
    advisor, isLoading, isError, refetchAll,
    kpis, ambientHue,
  };
}