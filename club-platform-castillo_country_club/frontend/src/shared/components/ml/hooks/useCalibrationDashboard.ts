// src/shared/components/ml/hooks/useCalibrationDashboard.ts
// Fase 23 — Calibration Dashboard data hook
// Derives health score, readiness distribution, confidence deltas
// ═══════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useCalibratedConfidence } from "@/shared/hooks/useCalibratedConfidence";
import { computeCausalChainAccuracy } from "@/shared/lib/advisor-engine/calibration";

export function useCalibrationDashboard() {
  const { report, totalOutcomes, resetCalibration } = useCalibratedConfidence();
  const chainAccuracy = computeCausalChainAccuracy();

  /* ── Health score: 0-100 weighted composite ── */
  const healthScore = useMemo(() => {
    if (totalOutcomes === 0) return 0;

    const accuracy = report.overallAccuracy * 40;
    const coverage = (report.calibratedRules / Math.max(report.rulesTracked, 1)) * 30;

    const results = report.results;
    if (results.length === 0) return Math.round(accuracy + coverage);

    const improving = results.filter((r) => r.trend === "improving").length;
    const declining = results.filter((r) => r.trend === "declining").length;
    const trendNorm = ((improving - declining) / results.length + 1) / 2;
    const trend = trendNorm * 30;

    return Math.min(100, Math.round(accuracy + coverage + trend));
  }, [report, totalOutcomes]);

  /* ── Readiness distribution ── */
  const readinessDist = useMemo(() => {
    const dist = { calibrated: 0, warming: 0, cold: 0 };
    for (const r of report.results) {
      if (r.readiness === "calibrated") dist.calibrated++;
      else if (r.readiness === "warming") dist.warming++;
      else dist.cold++;
    }
    return dist;
  }, [report.results]);

  /* ── Sorted results (calibrated first, then by accuracy desc) ── */
  const sortedResults = useMemo(() => {
    const order: Record<string, number> = { calibrated: 0, warming: 1, cold: 2 };
    return [...report.results].sort((a, b) => {
      const ao = order[a.readiness] ?? 2;
      const bo = order[b.readiness] ?? 2;
      if (ao !== bo) return ao - bo;
      return b.accuracyRate - a.accuracyRate;
    });
  }, [report.results]);

  /* ── Confidence deltas for waterfall ── */
  const confidenceDeltas = useMemo(() => {
    return report.results
      .filter((r) => r.readiness !== "cold" && r.totalOutcomes >= 3)
      .map((r) => ({
        ruleId: r.ruleId.replace("global_", "").replace(/_/g, " "),
        original: r.avgOriginalConfidence,
        accuracy: Math.round(r.accuracyRate * 100),
        delta: Math.round(r.accuracyRate * 100 - r.avgOriginalConfidence),
        outcomes: r.totalOutcomes,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);
  }, [report.results]);

  return {
    report,
    totalOutcomes,
    resetCalibration,
    chainAccuracy,
    healthScore,
    readinessDist,
    sortedResults,
    confidenceDeltas,
  };
}