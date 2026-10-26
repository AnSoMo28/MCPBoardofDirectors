// ═══════════════════════════════════════════════════════════
// src/features/guests/advisor/guestMetricDisplay.ts
// Phase 34 "The Gateway" — Guest Metric Display Adapter
// Level 6+ Agency · Production Grade
//
// Maps each advisor rule to its UI display metric.
// Extracted from useGuestAdvisor.ts for testability + reusability.
//
// Each rule has a function that extracts the relevant metric
// from GuestContext for display in the AdvisorBanner.
//
// 20 rules = 20 display adapters (14 existing + 6 Phase 34).
//
// Checklist: M1.1 (single responsibility), M8.1 (JSDoc)
// ═══════════════════════════════════════════════════════════

import type { GuestContext } from "@/shared/lib/advisor-engine/rules/guest";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

/** Display metric data extracted from GuestContext for a specific rule. */
export interface MetricDisplayData {
  /** Short label for the metric (Spanish). */
  readonly metric: string;
  /** Formatted value to display. */
  readonly metricValue: string | number;
}

// ═══════════════════════════════════════════════════════════
// §2 — DISPLAY ADAPTERS
// Each function maps a rule ID → metric display data.
// Pure functions — same context always produces same output.
// ═══════════════════════════════════════════════════════════

/**
 * Complete metric display map for all 20 guest rules.
 * Keys are rule IDs (without domain prefix).
 *
 * @example
 * const display = GUEST_METRIC_DISPLAY["R1_OVERALL_CONVERSION_LOW"](ctx);
 * // { metric: "Conversión global", metricValue: "3.2%" }
 */
export const GUEST_METRIC_DISPLAY: Record<
  string,
  (ctx: GuestContext) => MetricDisplayData
> = {

  // ═══════════════════════════════════════════
  // Layer 1: Macro — Funnel Health (R1-R4)
  // ═══════════════════════════════════════════

  R1_OVERALL_CONVERSION_LOW: (ctx) => ({
    metric: "Conversión global",
    metricValue: `${ctx.overallConversion.toFixed(1)}%`,
  }),

  R2_TRIAL_CONVERSION_LOW: (ctx) => ({
    metric: "Trial → Member",
    metricValue: `${ctx.trialConversion.toFixed(0)}%`,
  }),

  R3_GUEST_VOLUME_DECLINING: (ctx) => {
    const guestF = ctx.forecast?.forecasts.find(
      (f) => f.metric === "guest_volume",
    );
    return {
      metric: "Forecast cambio",
      metricValue: guestF ? `${guestF.change_pct.toFixed(1)}%` : "N/A",
    };
  },

  R4_FUNNEL_HEALTHY: (ctx) => ({
    metric: "Conversión",
    metricValue: `${ctx.overallConversion.toFixed(1)}%`,
  }),

  // ═══════════════════════════════════════════
  // Layer 2: Lifecycle — Pipeline (R5-R8)
  // ═══════════════════════════════════════════

  R5_HOT_LEADS_PENDING: (ctx) => ({
    metric: "Hot leads",
    metricValue: ctx.hotLeads,
  }),

  R6_TRIALS_EXPIRING: (ctx) => {
    const count =
      ctx.proposals?.proposals.filter(
        (p) => p.proposal_type === "follow_up_campaign",
      ).length ?? 0;
    return { metric: "Trials sin follow-up", metricValue: count };
  },

  R7_EVENTS_ZERO_GUESTS: (ctx) => ({
    metric: "Tipos sin guests",
    metricValue: ctx.zeroGuestEventTypes.length,
  }),

  R8_TOP_REFERRERS_INACTIVE: (ctx) => {
    const count =
      ctx.proposals?.proposals.filter(
        (p) => p.proposal_type === "referral_activation",
      ).length ?? 0;
    return {
      metric: "Propuestas de referidos",
      metricValue: count,
    };
  },

  // ═══════════════════════════════════════════
  // Layer 3: Utilization — Optimization (R9-R12)
  // ═══════════════════════════════════════════

  R9_PRIVILEGE_CONCENTRATION: (ctx) => {
    const privs = ctx.analytics?.privilege_usage ?? [];
    const totalUsage = privs.reduce((s, p) => s + p.usage_count, 0);
    const topPct =
      totalUsage > 0
        ? ((privs[0]?.usage_count ?? 0) / totalUsage) * 100
        : 0;
    return {
      metric: "Top privilegio",
      metricValue: `${topPct.toFixed(0)}%`,
    };
  },

  R10_WEEKEND_CONCENTRATION: (ctx) => ({
    metric: "Fin de semana",
    metricValue: `${ctx.weekendPct.toFixed(0)}%`,
  }),

  R11_BEST_TRIAL_TYPE: (ctx) => ({
    metric: "Trial conversion",
    metricValue: `${ctx.trialToMemberRate.toFixed(0)}%`,
  }),

  R12_EVENT_GUEST_CORRELATION: (ctx) => ({
    metric: "Mejor tipo de evento",
    metricValue: ctx.bestEventType
      ? `${ctx.bestEventType}: ${ctx.bestEventGuests}`
      : "N/A",
  }),

  // ═══════════════════════════════════════════
  // Layer 4: Cross-domain (R13-R14)
  // ═══════════════════════════════════════════

  R13_COMMS_CAMPAIGN: (ctx) => {
    const count =
      ctx.proposals?.proposals.filter(
        (p) =>
          p.proposal_type === "follow_up_campaign" ||
          p.proposal_type === "conversion_nudge",
      ).length ?? 0;
    return {
      metric: "Campañas pendientes",
      metricValue: count,
    };
  },

  R14_PIPELINE_VALUE_ALERT: (ctx) => {
    const valueM = ctx.pipelineValue / 1_000_000;
    return {
      metric: "Pipeline en riesgo",
      metricValue: `₡${valueM.toFixed(1)}M`,
    };
  },

  // ═══════════════════════════════════════════
  // Layer 2+: Lifecycle — Engine-based (R15-R16, R20)
  // ═══════════════════════════════════════════

  R15_VIP_DETECTED: (ctx) => ({
    metric: "VIP candidates",
    metricValue: ctx.vipCount,
  }),

  R16_FIRST_IMPRESSION_LOW: (ctx) => ({
    metric: "Impresiones negativas",
    metricValue: ctx.firstImpressionAlertCount,
  }),

  R20_MEMORY_STRONG: (ctx) => ({
    metric: "Fuerza de memoria",
    metricValue: `${ctx.avgMemoryStrength}/100`,
  }),

  // ═══════════════════════════════════════════
  // Layer 3+: Utilization — Engine-based (R17-R18)
  // ═══════════════════════════════════════════

  R17_CHEMISTRY_EXCEPTIONAL: (ctx) => ({
    metric: "Química promedio",
    metricValue: `${ctx.avgChemistryScore}/100`,
  }),

  R18_SPONSOR_MISMATCH: (ctx) => ({
    metric: "Sponsors incompatibles",
    metricValue: ctx.topSponsorMismatchCount,
  }),

  // ═══════════════════════════════════════════
  // Layer 4+: Cross-domain — Engine-based (R19)
  // ═══════════════════════════════════════════

  R19_DORMANT_REACTIVATION: (ctx) => ({
    metric: "Dormientes",
    metricValue: ctx.dormantCount,
  }),
};

// ═══════════════════════════════════════════════════════════
// §3 — RESOLUTION FUNCTION
// ═══════════════════════════════════════════════════════════

/**
 * Resolve metric display data for a given insight ID.
 *
 * Insight IDs from the advisor engine are formatted as:
 *   "engagement_R1_OVERALL_CONVERSION_LOW"
 *
 * This function strips the domain prefix and looks up
 * the display adapter.
 *
 * @param insightId - Full insight ID from advisor engine
 * @param ctx - GuestContext for data extraction
 * @returns MetricDisplayData, or empty display if rule not found
 *
 * @example
 * const display = resolveMetricDisplay(
 *   "engagement_R15_VIP_DETECTED",
 *   guestContext,
 * );
 * // { metric: "VIP candidates", metricValue: 3 }
 */
export function resolveMetricDisplay(
  insightId: string,
  ctx: GuestContext,
): MetricDisplayData {
  // Strip domain prefix: "engagement_R1_OVERALL_CONVERSION_LOW" → "R1_OVERALL_CONVERSION_LOW"
  const ruleId = insightId.split("_").slice(1).join("_");

  const adapter = GUEST_METRIC_DISPLAY[ruleId];
  if (adapter) {
    return adapter(ctx);
  }

  // Fallback: no display data for this rule
  return { metric: "", metricValue: "" };
}

// ═══════════════════════════════════════════════════════════
// §4 — LAYER MAP
// Maps insight IDs to advisor layers for routing.
// ═══════════════════════════════════════════════════════════

import type { AdvisorLayer } from "@/shared/types/ai-intelligence";

/** Layer assignments for all 20 guest rules. */
export const GUEST_LAYER_MAP: Record<string, AdvisorLayer> = {
  R1_OVERALL_CONVERSION_LOW: "macro",
  R2_TRIAL_CONVERSION_LOW: "macro",
  R3_GUEST_VOLUME_DECLINING: "macro",
  R4_FUNNEL_HEALTHY: "macro",
  R5_HOT_LEADS_PENDING: "lifecycle",
  R6_TRIALS_EXPIRING: "lifecycle",
  R7_EVENTS_ZERO_GUESTS: "lifecycle",
  R8_TOP_REFERRERS_INACTIVE: "lifecycle",
  R9_PRIVILEGE_CONCENTRATION: "utilization",
  R10_WEEKEND_CONCENTRATION: "utilization",
  R11_BEST_TRIAL_TYPE: "utilization",
  R12_EVENT_GUEST_CORRELATION: "utilization",
  R13_COMMS_CAMPAIGN: "cross_domain",
  R14_PIPELINE_VALUE_ALERT: "cross_domain",
  R15_VIP_DETECTED: "lifecycle",
  R16_FIRST_IMPRESSION_LOW: "lifecycle",
  R17_CHEMISTRY_EXCEPTIONAL: "utilization",
  R18_SPONSOR_MISMATCH: "utilization",
  R19_DORMANT_REACTIVATION: "cross_domain",
  R20_MEMORY_STRONG: "lifecycle",
};

/**
 * Resolve the advisor layer for a given insight ID.
 *
 * @param insightId - Full insight ID (e.g., "engagement_R15_VIP_DETECTED")
 * @returns The advisor layer, or "macro" as fallback
 */
export function resolveLayer(insightId: string): AdvisorLayer {
  const ruleId = insightId.split("_").slice(1).join("_");
  return GUEST_LAYER_MAP[ruleId] ?? "macro";
}

// ═══════════════════════════════════════════════════════════
// §5 — SEVERITY DERIVATION
// Maps impact + confidence to severity level.
// Used by useGuestAdvisor for BaseInsight adaptation.
// ═══════════════════════════════════════════════════════════

export type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";

/**
 * Derive severity from impact level and confidence score.
 *
 * Logic:
 *   impact=high + confidence≥90 → critical
 *   impact=high                 → high
 *   impact=medium               → medium
 *   impact=low                  → info
 *   default                     → low
 *
 * @param impact - Impact level from advisor insight
 * @param confidence - Confidence score (0-100)
 * @returns Severity level for UI rendering
 */
export function deriveSeverity(
  impact: string,
  confidence: number,
): AdvisorSeverity {
  if (impact === "high" && confidence >= 90) return "critical";
  if (impact === "high") return "high";
  if (impact === "medium") return "medium";
  if (impact === "low") return "info";
  return "low";
}