// ═══════════════════════════════════════════════════════════
// src/features/age-group/types.ts
// Phase 34+ Migration — Age Group Domain Types
// Level 6+ Agency · Production Grade
//
// Pure type definitions for the Age Group intelligence domain.
// Config maps → config.ts · Barrel → index.ts
//
// PRE-WRITE VERIFICATION:
//   AIFactor → @/shared/types/ai-intelligence ✅
//   AdvisorInsightBase → @/shared/types/ai-intelligence ✅
//   ProgramPopularityEntry → @/shared/mocks/contracts ✅
//   AgeGroupTemporalTrend → @/shared/mocks/contracts ✅
//   AgeRecommendationEnhanced → @/shared/mocks/contracts ✅
//   AgeGroupEngagementProposal → @/shared/mocks/contracts ✅
//   AgeGroupEngagementProposalList → @/shared/mocks/contracts ✅
//
// ANTI-PATTERNS REMOVED:
//   - Config data arrays mixed with types → moved to config.ts
//   - Utility functions mixed with types → moved to config.ts
//   - Missing contract type re-exports → added
//
// MIGRATION NOTE:
//   §10 backward-compat re-exports for zero-break migration.
//   Remove after all component imports updated to ../config.
// ═══════════════════════════════════════════════════════════

import type {
  AIFactor,
  AdvisorInsightBase,
} from "@/shared/types/ai-intelligence";

import type {
  ProgramPopularityEntry,
  AgeGroupTemporalTrend,
  AgeRecommendationEnhanced,
  AgeGroupEngagementProposal,
  AgeGroupEngagementProposalList,
} from "@/shared/mocks/contracts";

/* ── §0  Re-export contract types ──────── */

export type {
  ProgramPopularityEntry,
  AgeGroupTemporalTrend,
  AgeRecommendationEnhanced,
  AgeGroupEngagementProposal,
  AgeGroupEngagementProposalList,
};

/* ── §1  Domain Constants ──────────────── */

/** BEM namespace prefix for Age Group CSS */
export const AG_NS = "ag" as const;

/** Domain color — gold accent for cross-domain signals */
export const AG_DOMAIN_COLOR = "#d4a853" as const;

/* ── §2  Layer Types ───────────────────── */

/**
 * Age Group domain layer names.
 * Mapped to AdvisorLayer in the hook adapter:
 *   balance → "social",  participation → "engagement",
 *   growth  → "lifecycle", cross_domain → "cross_domain"
 *
 * Verify against shared/lib/advisor-engine/rules/age-group.ts.
 */
export type AgeGroupLayer =
  | "balance"
  | "participation"
  | "growth"
  | "cross_domain"
  | "engagement"
  | "social"
  | "financial";

/* ── §3  Bracket Types ─────────────────── */

export type AgeBracketId =
  | "infant"
  | "child"
  | "youth"
  | "young_pro"
  | "active"
  | "mature"
  | "senior";

export interface AgeBracket {
  id: AgeBracketId;
  label: string;
  range: [number, number];
  icon: string;
  color: string;
  gradient: [string, string];
  resonance: number;
  personality: string;
}

export type RetentionRisk = "low" | "medium" | "high" | "critical";

/* ── §4  Cohort Types ──────────────────── */

export interface AgeCohort {
  bracketId: AgeBracketId;
  memberCount: number;
  familyCount: number;
  growthRate: number;
  healthScore: number;
  engagementIndex: number;
  spendIndex: number;
  retentionRisk: RetentionRisk;
  topActivities: string[];
  influenceOn: AgeBracketId[];
  influencedBy: AgeBracketId[];
}

export interface AgeDistribution {
  cohorts: AgeCohort[];
  totalMembers: number;
  balanceScore: number;
  dominantBracket: AgeBracketId;
  riskConcentration: number;
  generationalGaps: GenerationalGap[];
}

export interface GenerationalGap {
  between: [AgeBracketId, AgeBracketId];
  gapSeverity: number;
  bridgingActivities: string[];
  aiRecommendation: string;
}

/* ── §5  AI Intelligence Types ─────────── */

export interface AgeGroupInsight extends AdvisorInsightBase {
  affectedBrackets: AgeBracketId[];
  ripple?: GenerationalRipple;
  confidence: number;
}

export interface GenerationalRipple {
  source: AgeBracketId;
  direction: "younger" | "older" | "both";
  velocity: "slow" | "moderate" | "fast";
  description: string;
  evidence: string[];
}

export interface CohortPrediction {
  bracketId: AgeBracketId;
  metric: "size" | "engagement" | "retention" | "spend";
  current: number;
  predicted3m: number;
  predicted6m: number;
  confidence: number;
  drivingFactors: AIFactor[];
}

export interface AgingOutRisk {
  bracketId: AgeBracketId;
  membersAtRisk: number;
  avgYearsRemaining: number;
  replacementRate: number;
  netChange: number;
  urgency: "monitor" | "plan" | "act";
}

/* ── §6  Cross-Domain Types ────────────── */

/**
 * All feature domains that Age Group can connect to via
 * advisor-engine cross-domain signals.
 */
export type ThreadTargetDomain =
  | "events"
  | "wellness"
  | "families"
  | "communications"
  | "recommendations"
  | "sports"
  | "cultural"
  | "finance"
  | "facilities"
  | "members"
  | "guests";

export interface CrossDomainThread {
  sourceDomain: "age_group";
  targetDomain: ThreadTargetDomain;
  tension: number;
  insight: string;
  dataPoints: number;
  direction: "positive" | "negative" | "complex";
}

export interface CrossDomainCorrelation {
  bracketId: AgeBracketId;
  threads: CrossDomainThread[];
  strongestThread: CrossDomainThread;
  aiSummary: string;
}

/* ── §7  Identity Types ────────────────── */

export type BgPattern = "dots" | "lines" | "waves" | "rings" | "pulse";
export type EnergyAnimation = "expand" | "breathe" | "contract" | "static";

export interface CohortIdentity {
  bracketId: AgeBracketId;
  icon: string;
  color: string;
  gradient: [string, string];
  bgPattern: BgPattern;
  energyAnimation: EnergyAnimation;
  energySpeed: number;
}

/* ── §8  Snapshot Types ────────────────── */

export interface AgeGroupSnapshot {
  timestamp: string;
  distribution: AgeDistribution;
  insights: AgeGroupInsight[];
  threads: CrossDomainThread[];
  healthScore: number;
}

/* ── §9  Config Map Types ──────────────── */

export interface HealthThreshold {
  range: [number, number];
  level: "critical" | "warning" | "healthy" | "optimal";
  label: string;
  color: string;
}

export interface ActivityAffinity {
  activity: string;
  icon: string;
  scores: Record<AgeBracketId, number>;
}

export interface EngagementTier {
  range: [number, number];
  tier: "dormant" | "passive" | "active" | "engaged" | "champion";
  label: string;
  color: string;
}

export interface SeasonalityEntry {
  peakMonths: number[];
  label: string;
}

export interface AgeRiskLevel {
  level: RetentionRisk;
  label: string;
  color: string;
  icon: string;
}

export interface GrowthIndicator {
  direction: "declining" | "stable" | "growing" | "surging";
  label: string;
  color: string;
  icon: string;
  threshold: number;
}

export interface BalanceTarget {
  bracketId: AgeBracketId;
  min: number;
  max: number;
}

/* ── §10  Backward-Compat Re-exports ───── */

// TODO[Migration]: Remove after all batch rewrites complete.
// Each batch updates component imports from ../types → ../config.
// Once all 25 files migrated, delete this section.

// export {
//   AGE_GROUP_LAYER_LABELS,
//   AGE_GROUP_LAYER_META,
//   AGE_BRACKETS,
//   AGE_HEALTH_THRESHOLDS,
//   AGE_ACTIVITY_MATRIX,
//   AGE_ENGAGEMENT_TIERS,
//   COHORT_SEASONALITY,
//   AGE_RISK_CONFIG,
//   AGE_GROWTH_CONFIG,
//   COHORT_IDENTITIES,
//   AGE_BALANCE_TARGETS,
// } from "./config";

// export {
//   getAgeBracket,
//   getHealthThreshold,
//   getGrowthIndicator,
//   getEngagementTier,
//   getRiskConfig,
//   getCohortIdentity,
//   resolveBracketId,
//   matchBracket,
// } from "./config";