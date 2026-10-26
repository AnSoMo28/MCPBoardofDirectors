// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Financial Advisor Hook
// F47 — Migrated to Advisor Engine v2
//
// Thin wrapper: imports rules + buildCtx → useAdvisorEngine.
// ~35 lines vs ~450 lines (F18 original).
//
// Signal flow:
//   EMIT: fin_revenue_decline (R14), fin_margin_pressure (R2)
//   → signalBus → Global Advisor (consumes)
//
// 0 API calls. Consume datos ya en React Query cache.
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import { useAdvisorEngine, signalBus} from "@/shared/lib/advisor-engine";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import {
  type FinancialContext,
  buildFinancialCtx,
  FINANCIAL_RULES,
  FINANCIAL_HEALTH_FACTORS,
} from "@/shared/lib/advisor-engine/rules/financial";
import type {
  FinancialAdvisorInsight,
  AiFinancialReport,
  FinancialSummary,
} from "../types";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// Build ruleId → layer map once (module-level, stable)
const RULE_LAYER_MAP = new Map(
  FINANCIAL_RULES.map((r) => [
    generateInsightId("financial", r.id),
    r.layer,
  ]),
);

export function useFinancialAdvisor(
  aiReport: AiFinancialReport | null | undefined,
  summary: FinancialSummary | null | undefined,
  ragContext?: RAGContext[],
): FinancialAdvisorInsight[] | null {
  const config = useMemo(
    () => ({
      domain: "financial" as const,
      buildCtx: buildFinancialCtx,
      rules: FINANCIAL_RULES,
      healthFactors: FINANCIAL_HEALTH_FACTORS,
    }),
    [],
  );

  const result = useAdvisorEngine<FinancialContext>(config, { aiReport, summary }, undefined, true, ragContext);

  // Emit cross-domain signals post-evaluate
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // Enrich base insights with domain-specific layer for banner grouping
  return useMemo(() => {
    if (!result) {
      // No data — return "generate analysis" prompt (matches F18 behavior)
      return [{
        id: "no_analysis",
        layer: "macro" as const,
        impact: "medium" as const,
        title: "Sin análisis financiero",
        reasoning:
          "Generá un análisis financiero para obtener insights de IA sobre la salud del club.",
        target_view: "intelligence",
        confidence: 100,
      }];
    }

    return result.insights.map((insight) => ({
      ...insight,
      layer: (RULE_LAYER_MAP.get(insight.id) ?? "macro") as FinancialAdvisorInsight["layer"],
      domain: "financial" as const,
    }));
  }, [result]);
}