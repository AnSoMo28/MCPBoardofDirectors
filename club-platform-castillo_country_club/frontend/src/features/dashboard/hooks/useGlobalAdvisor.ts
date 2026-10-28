// src/features/dashboard/hooks/useGlobalAdvisor.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Global Cross-Agent Advisor
// Fase 20 → F47 Rewrite
//
// Thin wrapper around Advisor Engine v2.
// Rules declared in rules/global.ts (25 declarative rules, 5 layers).
// Health Score: 5 factors (membership, financial, utilization,
//               satisfaction, risk management).
// Signals: consumes evt_*, fin_* — emits sys_risk_change.
//
// 0 API calls. Consumes cached data from all agents.
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import { useAdvisorEngine, signalBus } from "@/shared/lib/advisor-engine";
import type { GlobalContext } from "@/shared/lib/advisor-engine/rules/global";
import {
  buildGlobalCtx,
  GLOBAL_RULES,
  GLOBAL_HEALTH_FACTORS,
} from "@/shared/lib/advisor-engine/rules/global";
import type {
  ExecutiveSummaryData,
  GlobalAdvisorInsight,
  GlobalAdvisorLayer,
} from "../types";
import type { AiFinancialReport } from "@/features/finance/types";
import type { CalendarDay } from "@/features/events/types";
import type { DomainSignal, RAGContext, CausalChain } from "@/shared/lib/advisor-engine/types";
// Build ruleId → layer map once (module-level, stable)
const RULE_LAYER_MAP = new Map(
  GLOBAL_RULES.map((r) => ["global_" + r.id, r.layer]),
);

// ── Input ──

interface GlobalAdvisorInput {
  summary: ExecutiveSummaryData | undefined;
  aiReport: AiFinancialReport | null | undefined;
  calendarDays: CalendarDay[] | null | undefined;
  pendingApprovals: number;
  todayEvents: number;
  enabled?: boolean;
  /** Cross-domain signals from signal-seeder + Signal Bus (F47-D) */
  crossDomainSignals?: DomainSignal[];
  /** RAG context for enriched evaluation (F47-F, active in F48) */
  ragContext?: RAGContext[];
}

// ── Hook ──

export interface GlobalAdvisorResult {
  insights: GlobalAdvisorInsight[] | null;
  causalChains: CausalChain[] | undefined;
}

export function useGlobalAdvisor(
  input: GlobalAdvisorInput,
): GlobalAdvisorResult {
  const config = useMemo(
    () => ({
      domain: "global" as const,
      buildCtx: buildGlobalCtx,
      rules: GLOBAL_RULES,
      healthFactors: GLOBAL_HEALTH_FACTORS,
    }),
    [],
  );

  // Engine always called (React hook rules)
  const result = useAdvisorEngine<GlobalContext>(config, {
    summary: input.summary,
    aiReport: input.aiReport,
    calendarDays: input.calendarDays ?? [],
    pendingApprovals: input.pendingApprovals,
    todayEvents: input.todayEvents,
  }, input.crossDomainSignals, true, input.ragContext);

  // Emit cross-domain signals post-evaluate
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // Build enriched insights
  return useMemo(() => {
    if (!input.enabled) return { insights: null, causalChains: undefined };
    if (!result) return { insights: [], causalChains: undefined };

    return {
      insights: result.insights.map((insight) => ({
        ...insight,
        layer: (RULE_LAYER_MAP.get(insight.id) ??
          insight.layer ??
          "diagnostic") as GlobalAdvisorLayer,
        domain: "global" as const,
      })),
      causalChains: result.causalChains ? [...result.causalChains] : undefined,
    };
  }, [result, input.enabled]);
}