// src/shared/hooks/useTwinSimulation.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — useTwinSimulation Hook (F53)
//
// React hook for the Digital Twin simulation.
// Manages scenario state, runs simulations via delta-simulator,
// and exposes results for ScenarioBuilder + TwinResults.
//
// Features:
//   - Create scenarios from templates or manual sliders
//   - Run simulations against real advisor context
//   - Track simulation history (last 10)
//   - Pre-execution simulation: "simulate this plan step"
//   - Goal derivation from simulation results
//   - Error handling with graceful fallback
//
// Integration:
//   - F49: causal chains via detectCausalChains (inside simulator)
//   - F50: calibrationMap for calibrated confidence
//   - F51: goal derivation from simulated context
//   - F52: NL metric dictionary for sliders
//
// Depends on:
//   ../lib/advisor-engine/delta-simulator (simulateScenario, simulateFromTemplate)
//   ../lib/advisor-engine/twin-types (DeltaScenario, TwinSimulationResult, etc.)
//   ../lib/advisor-engine/calibration-types (CalibrationResult)
//   ../lib/advisor-engine/causal-chain (CausalChain)
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import {
  simulateScenario,
  simulateFromTemplate,
} from "@/shared/lib/advisor-engine/delta-simulator";
import type {
  DeltaScenario,
  ScenarioTemplate,
  TwinSimulationState,
} from "@/shared/lib/advisor-engine/twin-types";
import { SCENARIO_TEMPLATES } from "@/shared/lib/advisor-engine/twin-types";
import type { CalibrationResult } from "@/shared/lib/advisor-engine/calibration-types";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — OPTIONS
// ═══════════════════════════════════════════════════════════

interface UseTwinSimulationOptions {
  /** Current real advisor context */
  context: Record<string, unknown>;
  /** F50 calibration map for calibrated confidence */
  calibrationMap?: Map<string, CalibrationResult>;
  /** F49 active causal chains */
  activeCausalChains?: CausalChain[];
  /** Which domains to evaluate NL rules for */
  customRuleDomains?: Array<
    "financial" | "events" | "engagement" | "communication" |
    "family" | "wellness" | "satisfaction" | "facilities" |
    "cultural_social" | "sports" | "executive" | "global" | "ml_intelligence"
  >;
  /** Baseline health scores per domain */
  baselineHealthScores?: Map<string, number>;
  /** Max history entries to keep */
  maxHistory?: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — HOOK RETURN TYPE
// ═══════════════════════════════════════════════════════════

interface UseTwinSimulationReturn {
  /** Current simulation state */
  state: TwinSimulationState;
  /** Run simulation from a manually-built scenario */
  runSimulation: (scenario: DeltaScenario) => void;
  /** Run simulation from a pre-defined template */
  runFromTemplate: (templateId: string) => void;
  /** Quick simulation from a ScenarioTemplate object */
  runFromTemplateObject: (template: ScenarioTemplate) => void;
  /** Simulate a specific metric change (for pre-execution) */
  runQuickSim: (metricPath: string, deltaPct: number) => void;
  /** Clear the latest result */
  clearResult: () => void;
  /** Clear all history */
  clearHistory: () => void;
  /** Get available templates */
  getTemplates: () => ScenarioTemplate[];
  /** Get a template by ID */
  getTemplate: (id: string) => ScenarioTemplate | undefined;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — HOOK
// ═══════════════════════════════════════════════════════════

export function useTwinSimulation(
  options: UseTwinSimulationOptions,
): UseTwinSimulationReturn {
  const {
    context,
    calibrationMap,
    activeCausalChains,
    customRuleDomains,
    baselineHealthScores,
    maxHistory = 10,
  } = options;

  const [state, setState] = useState<TwinSimulationState>({
    currentScenario: null,
    latestResult: null,
    isSimulating: false,
    history: [],
    error: null,
  });

  // Use ref for context to avoid stale closures in rapid simulations
  const contextRef = useRef(context);
  contextRef.current = context;

  const simOptions = useRef({
    calibrationMap,
    activeCausalChains,
    customRuleDomains: customRuleDomains as Array<
      "financial" | "events" | "engagement" | "communication" |
      "family" | "wellness" | "satisfaction" | "facilities" |
      "cultural_social" | "sports" | "executive" | "global" | "ml_intelligence"
    > | undefined,
    baselineHealthScores,
  });
  simOptions.current = {
    calibrationMap,
    activeCausalChains,
    customRuleDomains: customRuleDomains as Array<
      "financial" | "events" | "engagement" | "communication" |
      "family" | "wellness" | "satisfaction" | "facilities" |
      "cultural_social" | "sports" | "executive" | "global" | "ml_intelligence"
    > | undefined,
    baselineHealthScores,
  };

  // ── Core simulation runner ──
  const executeSimulation = useCallback(
    (scenario: DeltaScenario) => {
      setState((prev) => ({
        ...prev,
        isSimulating: true,
        error: null,
        currentScenario: scenario,
      }));

      try {
        const result = simulateScenario(
          contextRef.current,
          scenario,
          simOptions.current,
        );

        setState((prev) => ({
          ...prev,
          isSimulating: false,
          latestResult: result,
          history: [result, ...prev.history].slice(0, maxHistory),
        }));

        if (import.meta.env.DEV) {
          console.log(
            `[TwinSimulation] Completed in ${result.executionMs}ms:`,
            result.verdict.assessment,
            `(${result.verdict.recommendation})`,
          );
        }
      } catch (e) {
        const errorMsg =
          e instanceof Error ? e.message : "Error desconocido en la simulación";

        setState((prev) => ({
          ...prev,
          isSimulating: false,
          error: errorMsg,
        }));

        if (import.meta.env.DEV) {
          console.error("[TwinSimulation] Error:", e);
        }
      }
    },
    [maxHistory],
  );

  // ── Public methods ──

  const runSimulation = useCallback(
    (scenario: DeltaScenario) => {
      executeSimulation(scenario);
    },
    [executeSimulation],
  );

  const runFromTemplate = useCallback(
    (templateId: string) => {
      setState((prev) => ({ ...prev, isSimulating: true, error: null }));

      try {
        const result = simulateFromTemplate(
          contextRef.current,
          templateId,
          simOptions.current,
        );

        if (!result) {
          setState((prev) => ({
            ...prev,
            isSimulating: false,
            error: `Template "${templateId}" no encontrado`,
          }));
          return;
        }

        const template = SCENARIO_TEMPLATES.find((t) => t.id === templateId);

        setState((prev) => ({
          ...prev,
          isSimulating: false,
          latestResult: result,
          currentScenario: result.scenario,
          history: [result, ...prev.history].slice(0, maxHistory),
        }));

        if (import.meta.env.DEV) {
          console.log(
            `[TwinSimulation] Template "${template?.name}" completed in ${result.executionMs}ms`,
          );
        }
      } catch (e) {
        const errorMsg =
          e instanceof Error ? e.message : "Error en simulación desde template";

        setState((prev) => ({
          ...prev,
          isSimulating: false,
          error: errorMsg,
        }));
      }
    },
    [maxHistory],
  );

  const runFromTemplateObject = useCallback(
    async (template: ScenarioTemplate) => {
      // Build deltas from template + current context
      const { getAllMetrics, resolveMetric } = await import("@/shared/lib/advisor-engine/nl-rule-parser");
      const metrics = getAllMetrics();

      const deltas = template.deltas
        .map((td) => {
          const metric = metrics.find((m: { path: string }) => m.path === td.metricPath);
          if (!metric) return null;

          const currentValue = resolveMetric(contextRef.current, td.metricPath);
          if (currentValue === null) return null;

          const simulatedValue = currentValue * (1 + td.relativeChange);

          return {
            metricPath: td.metricPath,
            metricName: metric.names[0],
            currentValue,
            simulatedValue: Math.round(simulatedValue * 100) / 100,
            delta: Math.round((simulatedValue - currentValue) * 100) / 100,
            deltaPct: Math.round(td.relativeChange * 10000) / 100,
            unit: metric.unit,
            domain: metric.domain,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      const scenario: DeltaScenario = {
        id: `scenario_${template.id}_${Date.now()}`,
        name: template.name,
        description: template.description,
        deltas,
        createdAt: Date.now(),
        createdBy: "template",
      };

      executeSimulation(scenario);
    },
    [executeSimulation],
  );

  const runQuickSim = useCallback(
    async (metricPath: string, deltaPct: number) => {
      const { getAllMetrics, resolveMetric } = await import("@/shared/lib/advisor-engine/nl-rule-parser");
      const metric = getAllMetrics().find((m: { path: string }) => m.path === metricPath);
      if (!metric) return;

      const currentValue = resolveMetric(contextRef.current, metricPath);
      if (currentValue === null) return;

      const simulatedValue = currentValue * (1 + deltaPct / 100);

      const scenario: DeltaScenario = {
        id: `scenario_quick_${Date.now()}`,
        name: `Quick: ${metric.names[0]} ${deltaPct > 0 ? "+" : ""}${deltaPct}%`,
        description: `Simulación rápida de ${metric.names[0]}`,
        deltas: [
          {
            metricPath,
            metricName: metric.names[0],
            currentValue: Math.round(currentValue * 100) / 100,
            simulatedValue: Math.round(simulatedValue * 100) / 100,
            delta: Math.round((simulatedValue - currentValue) * 100) / 100,
            deltaPct,
            unit: metric.unit,
            domain: metric.domain,
          },
        ],
        createdAt: Date.now(),
        createdBy: "quick_sim",
      };

      executeSimulation(scenario);
    },
    [executeSimulation],
  );

  const clearResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      latestResult: null,
      currentScenario: null,
      error: null,
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, history: [] }));
  }, []);

  const getTemplates = useCallback(() => SCENARIO_TEMPLATES, []);

  const getTemplate = useCallback(
    (id: string) => SCENARIO_TEMPLATES.find((t) => t.id === id),
    [],
  );

  return {
    state,
    runSimulation,
    runFromTemplate,
    runFromTemplateObject,
    runQuickSim,
    clearResult,
    clearHistory,
    getTemplates,
    getTemplate,
  };
}