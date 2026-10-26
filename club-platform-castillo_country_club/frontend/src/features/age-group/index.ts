// ═══════════════════════════════════════════════════════════
// src/features/age-group/index.ts
// Phase 34+ Migration — Age Group Barrel
// Level 6+ Agency · Production Grade
//
// Public API for the Age Group feature.
// Type-only exports for tree-shaking.
// Dashboard default→named for router lazy-load.
//
// PRE-WRITE VERIFICATION:
//   AgeGroupDashboard → ./AgeGroupDashboard default export ✅
//   All types → ./types ✅
//   All config → ./config ✅
// ═══════════════════════════════════════════════════════════

/* ── Dashboard (router lazy-load) ──────── */

export { AgeGroupDashboard } from "./AgeGroupDashboard";

/* ── Domain constants ──────────────────── */

export { AG_NS, AG_DOMAIN_COLOR } from "./types";

/* ── Type-only exports ─────────────────── */

export type {
  AgeGroupLayer,
  AgeBracketId,
  AgeBracket,
  RetentionRisk,
  AgeCohort,
  AgeDistribution,
  GenerationalGap,
  AgeGroupInsight,
  GenerationalRipple,
  CohortPrediction,
  AgingOutRisk,
  ThreadTargetDomain,
  CrossDomainThread,
  CrossDomainCorrelation,
  BgPattern,
  EnergyAnimation,
  CohortIdentity,
  AgeGroupSnapshot,
  HealthThreshold,
  ActivityAffinity,
  EngagementTier,
  SeasonalityEntry,
  AgeRiskLevel,
  GrowthIndicator,
  BalanceTarget,
} from "./types";

/* ── Contract type re-exports ──────────── */

export type {
  ProgramPopularityEntry,
  AgeGroupTemporalTrend,
  AgeRecommendationEnhanced,
  AgeGroupEngagementProposal,
  AgeGroupEngagementProposalList,
} from "./types";

/* ── Config data (cross-domain) ────────── */

export {
  AGE_BRACKETS,
  AGE_HEALTH_THRESHOLDS,
  AGE_ACTIVITY_MATRIX,
  AGE_ENGAGEMENT_TIERS,
  COHORT_SEASONALITY,
  AGE_RISK_CONFIG,
  AGE_GROWTH_CONFIG,
  COHORT_IDENTITIES,
  AGE_BALANCE_TARGETS,
  AGE_GROUP_LAYER_LABELS,
  AGE_GROUP_LAYER_META,
} from "./config";

/* ── Utilities (cross-domain) ──────────── */

export {
  getAgeBracket,
  getHealthThreshold,
  getGrowthIndicator,
  getEngagementTier,
  getRiskConfig,
  getCohortIdentity,
  resolveBracketId,
  matchBracket,
} from "./config";