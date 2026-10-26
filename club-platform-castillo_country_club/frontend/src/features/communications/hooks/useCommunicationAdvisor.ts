// ═══════════════════════════════════════════════════════════
// Communication Advisor — Thin wrapper (F47 B5.1)
//
// Delegates to Advisor Engine v2 via useAdvisorEngine().
// Maps AdvisorInsightBase → CommunicationInsight with
// domain-specific category + severity.
// Emits comm_delivery_critical signal post-evaluate.
//
// Replaced: ~220 lines inline rules (F28)
// Now: ~95 lines + 10 rules in rules/communication.ts
//
// Rules: #27, #28, #29, P42, P51, P54
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import { useAdvisorEngine } from "@/shared/lib/advisor-engine/engine";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import type { AdvisorLayer } from "@/shared/types/ai-intelligence";

import type {
  CommunicationAnalyticsData,
  CommunicationInsight,
  HistoryItem,
  InsightCategory,
  ScheduledItem,
} from "../types";
import {
  COMMUNICATION_RULES,
  COMMUNICATION_HEALTH_FACTORS,
  buildCommunicationCtx,
} from "@/shared/lib/advisor-engine/rules/communication";
import type { CommunicationContext } from "@/shared/lib/advisor-engine/rules/communication";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ── Category derivation from rule ID ──────────────────────

const CATEGORY_BY_RULE: Record<string, InsightCategory> = {
  R1_DELIVERY_CRITICAL: "channel",
  R2_HEALTH_CRITICAL: "health",
  R3_HEALTH_WARNING: "health",
  R4_CHANNEL_DIVERSITY: "channel",
  R5_FAILURE_RATE_HIGH: "risk",
  R6_FAILURE_RATE_WARNING: "risk",
  R7_COMMS_GAP: "frequency",
  R8_WHATSAPP_UNDERUSED: "opportunity",
  R9_PERSONALIZATION_LOW: "audience",
  R10_UPCOMING: "timing",
};

const CATEGORY_LOOKUP = new Map<string, InsightCategory>(
  COMMUNICATION_RULES.map((r) => [
    generateInsightId("communications", r.id),
    CATEGORY_BY_RULE[r.id] ?? "channel",
  ]),
);

const LAYER_LOOKUP = new Map<string, AdvisorLayer>(
  COMMUNICATION_RULES.map((r) => [
    generateInsightId("communications", r.id),
    r.layer,
  ]),
);

// ── Severity derivation (impact + confidence → visual severity) ──
// Matches original F28 semantics:
//   R1 <50%: critical (high + 95),  R1 <70%: high (high + 80)
//   R2 <40:  critical (high + 95),  R3 <60:  medium (medium + 80)
//   R4:      high (high + 85),      R5:      high (high + 85)
//   R6:      medium (medium + 80),  R7:      high (high + 85)
//   R8:      medium (medium + 85),  R9:      medium (medium + 80)
//   R10:     info (low + 95)

function deriveSeverity(
  impact: string,
  confidence: number,
): CommunicationInsight["severity"] {
  if (impact === "high" && confidence >= 90) return "critical";
  if (impact === "high") return "high";
  if (impact === "medium") return "medium";
  if (impact === "low") return "info";
  return "low";
}

// ── Hook ──────────────────────────────────────────────────

export function useCommunicationAdvisor(
  analytics: CommunicationAnalyticsData | undefined,
  history: HistoryItem[],
  scheduled: ScheduledItem[],
  ragContext?: RAGContext[],
): CommunicationInsight[] {
  // Pack 3 params into single object for buildCtx(rawData: unknown)
  const rawData = useMemo(
    () => ({ analytics, history, scheduled }),
    [analytics, history, scheduled],
  );

  const config = useMemo(
    () => ({
      domain: "communication" as const,
      buildCtx: buildCommunicationCtx,
      rules: COMMUNICATION_RULES,
      healthFactors: COMMUNICATION_HEALTH_FACTORS,
    }),
    [],
  );

  const result = useAdvisorEngine<CommunicationContext>(config, rawData, undefined, true, ragContext);

  // Emit cross-domain signals post-evaluate
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // Map AdvisorInsightBase → CommunicationInsight
  return useMemo(() => {
    if (!result) return [];
    return result.insights.map(
      (insight): CommunicationInsight => ({
        ...insight,
        layer: (LAYER_LOOKUP.get(insight.id) ??
          "macro") as CommunicationInsight["layer"],
        domain: "communication" as const,
        category: CATEGORY_LOOKUP.get(insight.id) ?? "channel",
        severity: deriveSeverity(insight.impact, insight.confidence),
      }),
    );
  }, [result]);
}

// Legacy re-export (deprecated — will be removed in F48)
export { CATEGORY_BY_RULE };