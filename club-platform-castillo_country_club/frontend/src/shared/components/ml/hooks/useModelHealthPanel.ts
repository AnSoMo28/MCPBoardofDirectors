// src/shared/components/ml/hooks/useModelHealthPanel.ts
// Fase 23 — Model Health Panel data hook
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type { ModelHealthReport } from "@/shared/mocks/contracts";

export function useModelHealthPanel() {
  const [shouldFetch, setShouldFetch] = useState(false);

  const query = useMCPQuery<ModelHealthReport>(
    "ml_intelligence",
    "get_model_health",
    {},
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const handleLoad = useCallback(() => {
    setShouldFetch(true);
  }, []);

  const report = query.data ?? null;

  /* ── Drift report lookup map ── */
  const driftMap = useMemo(() => {
    if (!report) return new Map();
    const map = new Map<string, (typeof report.drift_reports)[number]>();
    for (const d of report.drift_reports) {
      map.set(d.model_name, d);
    }
    return map;
  }, [report]);

  /* ── Fleet health: avg accuracy ── */
  const fleetHealth = useMemo(() => {
    if (!report || report.total_models === 0) return 0;
    return Math.round(report.avg_accuracy);
  }, [report]);

  /* ── Ambient hue: healthy=teal, degraded=amber, drift=rose ── */
  const ambientHue = useMemo(() => {
    if (!report) return 175;
    if (report.retrain_needed_count > 0) return 350;
    if (report.degraded_count > 0) return 42;
    return 175;
  }, [report]);

  return {
    shouldFetch,
    handleLoad,
    query,
    report,
    driftMap,
    fleetHealth,
    ambientHue,
  };
}