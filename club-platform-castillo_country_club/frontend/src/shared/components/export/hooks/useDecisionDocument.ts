/**
 * @hook useDecisionDocument (Fase 24)
 * @module shared/components/export/hooks
 * @exports useDecisionDocument, type ScenarioDelta, type StressMetric
 * @note 4 staggered MCP queries, data transforms, print handler, scroll lock.
 *       Queries fire 150ms apart for progressive loading UX.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { formatCurrency } from "@/shared/lib/utils";
import type {
  FinanceNarrativeGenerateResponse,
  FinanceDecisionSimulateResponse,
} from "@/features/finance/types";
import type {
  FinanceScenarioSimulateResponse,
  FinanceStressTestResponse,
} from "@/shared/mocks/contracts";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface ScenarioDelta {
  label: string;
  baseline: number;
  scenario: number;
  delta: number;
  format: (v: number) => string;
  invert?: boolean;
}

export interface StressMetric {
  label: string;
  value: number;
  format: "percent" | "currency";
}

export interface UseDecisionDocumentReturn {
  /* Raw data */
  narrative: FinanceNarrativeGenerateResponse["data"] | undefined;
  scenario: FinanceScenarioSimulateResponse["data"] | undefined;
  stress: FinanceStressTestResponse["data"] | undefined;
  decision: FinanceDecisionSimulateResponse["data"] | undefined;
  /* Loading states (per query) */
  isNarrativeLoading: boolean;
  isScenarioLoading: boolean;
  isStressLoading: boolean;
  isDecisionLoading: boolean;
  isLoading: boolean;
  /* Progress */
  loadedCount: number;
  progressPercent: number;
  loadedModules: string[];
  /* Transforms */
  scenarioDeltas: ScenarioDelta[];
  stressMetrics: StressMetric[];
  /* Print */
  printMode: boolean;
  handlePrint: () => void;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useDecisionDocument(isOpen: boolean): UseDecisionDocumentReturn {
  /* ── Staged query enable (Prop 8) ── */
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStage(0);
      return;
    }
    const timers = [
      setTimeout(() => setStage(1), 150),
      setTimeout(() => setStage(2), 300),
      setTimeout(() => setStage(3), 450),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  /* ── Queries (staggered) ── */
  const narrativeQ = useMCPQuery<FinanceNarrativeGenerateResponse>(
    "finance",
    "narrative_generate",
    { period: "mayo_2026", audience: "junta", detail_level: "ejecutivo" },
    { enabled: isOpen, staleTime: 600_000 },
  );

  const scenarioQ = useMCPQuery<FinanceScenarioSimulateResponse>(
    "finance",
    "scenario_simulate",
    { variables: {} },
    { enabled: isOpen && stage >= 1, staleTime: 300_000 },
  );

  const stressQ = useMCPQuery<FinanceStressTestResponse>(
    "finance",
    "stress_test",
    { scenario: "recession" },
    { enabled: isOpen && stage >= 2, staleTime: 300_000 },
  );

  const decisionQ = useMCPQuery<FinanceDecisionSimulateResponse>(
    "finance",
    "decision_simulate",
    { decision_text: "Última decisión estratégica evaluada" },
    { enabled: isOpen && stage >= 3, staleTime: 300_000 },
  );

  /* ── Extract data ── */
  const narrative = narrativeQ.data?.data;
  const scenario = scenarioQ.data?.data;
  const stress = stressQ.data?.data;
  const decision = decisionQ.data?.data;

  /* ── Progress ── */
  const dataPoints = [narrative, scenario, stress, decision];
  const loadedCount = dataPoints.filter(Boolean).length;
  const progressPercent = Math.round((loadedCount / 4) * 100);
  const loadedModules = [
    narrative && "narrativa",
    scenario && "escenarios",
    stress && "resiliencia",
    decision && "decisiones",
  ].filter(Boolean) as string[];

  const isLoading = isOpen && loadedCount < 4;

  /* ── Transforms ── */
  const scenarioDeltas: ScenarioDelta[] = useMemo(
    () =>
      scenario
        ? [
            {
              label: "Revenue",
              baseline: scenario.baseline.revenue,
              scenario: scenario.scenario.revenue,
              delta: scenario.delta.revenue_change,
              format: formatCurrency,
            },
            {
              label: "Gastos",
              baseline: scenario.baseline.expenses,
              scenario: scenario.scenario.expenses,
              delta: scenario.delta.expenses_change,
              format: formatCurrency,
              invert: true,
            },
            {
              label: "Neto",
              baseline: scenario.baseline.net,
              scenario: scenario.scenario.net,
              delta: scenario.delta.net_change,
              format: formatCurrency,
            },
            {
              label: "Margen",
              baseline: scenario.baseline.margin,
              scenario: scenario.scenario.margin,
              delta: scenario.delta.margin_change,
              format: (v: number) => `${v.toFixed(1)}%`,
            },
          ]
        : [],
    [scenario],
  );

  const stressMetrics: StressMetric[] = useMemo(
    () =>
      stress?.metrics
        ? [
            {
              label: "P(Flujo positivo)",
              value: stress.metrics.p_positive_cashflow_12m,
              format: "percent",
            },
            {
              label: "P(Salud >60)",
              value: stress.metrics.p_health_above_60,
              format: "percent",
            },
            {
              label: "Pérdida P95",
              value: stress.metrics.max_probable_loss_p95,
              format: "currency",
            },
          ]
        : [],
    [stress],
  );

  /* ── Print ── */
  const [printMode, setPrintMode] = useState(false);

  const handlePrint = useCallback(() => {
    setPrintMode(true);
  }, []);

  useEffect(() => {
    if (!printMode) return;

    document.body.classList.add("is-printing");

    const raf = requestAnimationFrame(() => {
      window.print();
    });

    const onAfterPrint = () => {
      document.body.classList.remove("is-printing");
      setPrintMode(false);
    };

    window.addEventListener("afterprint", onAfterPrint, { once: true });

    /* Fallback: some browsers don't fire afterprint */
    const fallback = setTimeout(onAfterPrint, 5000);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", onAfterPrint);
      clearTimeout(fallback);
      document.body.classList.remove("is-printing");
    };
  }, [printMode]);

  /* ── Scroll lock ── */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /* ── Return ── */
  return {
    narrative,
    scenario,
    stress,
    decision,
    isNarrativeLoading: narrativeQ.isLoading,
    isScenarioLoading: scenarioQ.isLoading,
    isStressLoading: stressQ.isLoading,
    isDecisionLoading: decisionQ.isLoading,
    isLoading,
    loadedCount,
    progressPercent,
    loadedModules,
    scenarioDeltas,
    stressMetrics,
    printMode,
    handlePrint,
  };
}