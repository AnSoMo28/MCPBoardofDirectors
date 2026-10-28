// src/features/facilities/lib/advisor/facilitiesAdvisorConfig.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES ADVISOR — Engine Configuration
//
// AdvisorConfig<FacilitiesContext> that plugs into the generic
// Advisor Engine. Pattern: identical to Financial.
//
// Contains:
//   - FACILITIES_ADVISOR_CONFIG: full engine config
//   - FACILITIES_HEALTH_FACTORS: 5 health score factors
//   - Signal definitions for cross-domain communication
//
// Created: Phase 32 — Facilities Advisor Integration
// ═══════════════════════════════════════════════════════════════

import type {
  AIDomain,
} from "@/shared/types/ai-intelligence";
import type { SeverityLevel } from "@/shared/types/domain-enums";

import type {
  AdvisorConfig,
  HealthFactorDef,
  SignalDefinition,
} from "@/shared/lib/advisor-engine";

import type { FacilitiesContext } from "./facilitiesContext";
import { buildFacilitiesCtx } from "./facilitiesContext";
import { FACILITIES_RULES } from "./facilitiesRules";

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — SIGNAL DEFINITIONS
//
// Signals that Facilities EMITS to other domains.
// Other domains consume these via their consumeSignals arrays.
//
// Consumed by:
//   - Global Advisor: systemic risk assessment
//   - Communication Advisor: member notification drafting
//   - Engagement Advisor: health score impact
//   - Recommendation Advisor: alternative suggestions
// ═══════════════════════════════════════════════════════════════

export const FAC_COMPONENT_FAILURE: SignalDefinition = {
  id: "fac_component_failure",
  targetDomains: ["global", "engagement", "communication"] as AIDomain[],
  defaultSeverity: "critical" as SeverityLevel,
  label: "Component failure predicted in facility",
  ttl: 600_000, // 10 min — failure predictions are urgent
};

export const FAC_COMFORT_CASCADE: SignalDefinition = {
  id: "fac_comfort_cascade",
  targetDomains: ["global", "engagement", "satisfaction"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Systemic comfort degradation across multiple facilities",
  ttl: 300_000,
};

export const FAC_REVENUE_DECLINE: SignalDefinition = {
  id: "fac_revenue_decline",
  targetDomains: ["global", "financial"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Facility revenue declining beyond threshold",
  ttl: 300_000,
};

export const FAC_OCCUPANCY_CRITICAL: SignalDefinition = {
  id: "fac_occupancy_critical",
  targetDomains: ["global", "engagement"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Facility at critical occupancy levels",
  ttl: 120_000, // 2 min — occupancy changes fast
};

export const FAC_CROSS_DOMAIN_IMPACT: SignalDefinition = {
  id: "fac_cross_domain_impact",
  targetDomains: ["global"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Facility state impacting other domains",
  ttl: 300_000,
};

/** All Facility signal definitions — for registration and reference. */
export const FACILITIES_SIGNALS = [
  FAC_COMPONENT_FAILURE,
  FAC_COMFORT_CASCADE,
  FAC_REVENUE_DECLINE,
  FAC_OCCUPANCY_CRITICAL,
  FAC_CROSS_DOMAIN_IMPACT,
] as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — HEALTH SCORE FACTORS
//
// 5 factors that compose the Facilities health score.
// Weights sum to 1.0.
//
// Pattern: identical to FINANCIAL_HEALTH_FACTORS.
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_HEALTH_FACTORS: HealthFactorDef<FacilitiesContext>[] = [
  {
    id: "utilization_health",
    label: "Utilización de espacios",
    compute: (ctx) => {
      if (ctx.utilization === null) return 50;
      const pct = ctx.utilization.overall_utilization_pct;
      // Optimal range: 50-80%. Below 30% or above 90% is unhealthy.
      if (pct >= 50 && pct <= 80) return 80 + ((80 - Math.abs(pct - 65)) / 15) * 20;
      if (pct < 50) return Math.max(20, pct * 1.6);
      return Math.max(30, 100 - (pct - 80) * 2);
    },
    weight: 0.25,
  },
  {
    id: "comfort_health",
    label: "Confort general",
    compute: (ctx) => ctx.avgComfortScore,
    weight: 0.25,
  },
  {
    id: "maintenance_health",
    label: "Estado de mantenimiento",
    compute: (ctx) => {
      // Start at 100, deduct for overdue and critical components
      let score = 100;
      score -= ctx.overdueMaintenanceCount * 12;
      score -= ctx.criticalComponentCount * 15;
      if (ctx.nearestFailureDays >= 0 && ctx.nearestFailureDays <= 14) {
        score -= 20;
      }
      return Math.max(0, Math.min(100, score));
    },
    weight: 0.25,
  },
  {
    id: "revenue_health",
    label: "Salud de revenue por espacio",
    compute: (ctx) => {
      if (ctx.totalRevenuePerMonth <= 0) return 50;
      // Penalize declining revenue facilities
      const declineRatio =
        Object.keys(ctx.revenueModels).length > 0
          ? ctx.decliningRevenueCount / Object.keys(ctx.revenueModels).length
          : 0;
      return Math.max(0, Math.min(100, 100 - declineRatio * 100));
    },
    weight: 0.15,
  },
  {
    id: "inspection_health",
    label: "Cumplimiento de inspecciones",
    compute: (ctx) => {
      if (ctx.inspections.length === 0) return 60; // No data → neutral
      const recent = ctx.inspections.filter((i) => {
        const daysSince = Math.floor(
          (Date.now() - new Date(i.inspection_date).getTime()) / 86_400_000,
        );
        return daysSince <= 90;
      });
      const passRate =
        recent.length > 0
          ? recent.filter((i) => i.result === "pass").length / recent.length
          : 0;
      return Math.round(passRate * 100);
    },
    weight: 0.10,
  },
];

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — ENGINE CONFIGURATION
//
// The AdvisorConfig that plugs into useAdvisorEngine().
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_ADVISOR_CONFIG: AdvisorConfig<FacilitiesContext> = {
  domain: "facilities",
  buildCtx: (rawData, signals) => buildFacilitiesCtx(rawData, signals ? [...signals] : undefined),
  rules: FACILITIES_RULES,
  healthFactors: FACILITIES_HEALTH_FACTORS,
};