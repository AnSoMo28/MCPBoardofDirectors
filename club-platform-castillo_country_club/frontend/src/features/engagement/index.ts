// src/features/engagement/index.ts
// ═══════════════════════════════════════════════════════════
// Engagement Feature — Barrel Exports
// Castillo Country Club — Phase 31 "The Voice"
//
// Every export verified against source files.
// ═══════════════════════════════════════════════════════════

// ─── Hooks (Phase 31 Neural Hub) ──────────────────────────

export { useEngagementDashboard } from "./hooks/useEngagementDashboard";
export type { UseEngagementDashboardReturn } from "./hooks/useEngagementDashboard";

export { useEngagementData } from "./hooks/useEngagementData";
export type { UseEngagementDataOptions, UseEngagementDataReturn } from "./hooks/useEngagementData";

// ─── Hooks (pre-Phase 31) ─────────────────────────────────

export { useMemberEngagementAdvisor } from "./hooks/useMemberEngagementAdvisor";
export { useSatisfactionAdvisor } from "./hooks/useSatisfactionAdvisor";
export { useSatisfactionData } from "./hooks/useSatisfactionData";

// ─── Components (Phase 31 NEW) ────────────────────────────

export { EngagementDashboard } from "./EngagementDashboard";
export { EngagementAmbientCanvas } from "./components/EngagementAmbientCanvas";
export { EngagementPulse } from "./components/EngagementPulse";
export { EngagementDecisionStage } from "./components/EngagementDecisionStage";
export { EngagementIntelligenceStream } from "./components/EngagementIntelligenceStream";
export { EngagementEcosystem } from "./components/EngagementEcosystem";
export { EngagementGravityWell } from "./components/EngagementGravityWell";
export { EngagementDNAHelix } from "./components/EngagementDNAHelix";
export { EngagementMomentsWall } from "./components/EngagementMomentsWall";
export { EngagementResonanceField } from "./components/EngagementResonanceField";

// ─── Components (Phase 31 REWRITTEN) ──────────────────────

export { EngagementHealthScore } from "./components/EngagementHealthScore";
export { EngagementTrajectoryNavigator } from "./components/EngagementTrajectoryNavigator";

// ─── Components (pre-Phase 31 PRESERVED) ──────────────────

export { EngagementAdvisorBanner } from "./components/EngagementAdvisorBanner";
export { SatisfactionAdvisorBanner } from "./components/SatisfactionAdvisorBanner";
export { SatisfactionHealthScoreCard } from "./components/SatisfactionHealthScoreCard";
export { SatisfactionBenchmarkPanel } from "./components/SatisfactionBenchmarkPanel";
export { SatisfactionImpactMatrix } from "./components/SatisfactionImpactMatrix";
export { SatisfactionProposalsPanel } from "./components/SatisfactionProposalsPanel";
export { ReactivationCampaigns } from "./ReactivationCampaigns";
export { SatisfactionReport } from "./SatisfactionReport";
export { SatisfactionSurvey } from "./SatisfactionSurvey";

// ─── Intelligence engines ─────────────────────────────────

export {
  buildEngagementContext,
  buildEngagementEcosystem,
  computeDomainSymbioses,
  calculateGravitationalForce,
  computeAggregateGravitationalField,
  computeResonance,
  detectDNAMutations,
  identifyMomentsOfTruth,
  predictUpcomingMoments,
  decomposeDrivers,
  predictNPS,
  buildStreamSignals,
  buildDecisionStage,
  detectEmergentPatterns,
  detectAnomalyFamilies,
  generateCalibrationFeedback,
} from "./lib/engagementIntelligence";

// ─── Config functions ─────────────────────────────────────
// Verified against config.ts exports

export {
  // Re-exports from types (via config)
  ECOSYSTEM_THRESHOLDS,
  GRAVITATIONAL_CONSTANTS,
  RESONANCE_THRESHOLDS,
  DNA_MUTATION_THRESHOLDS,
  CALIBRATION_THRESHOLDS,
  ENGAGEMENT_STREAM_PRIORITIES,
  ENGAGEMENT_AMBIENT_CONFIG,
  ACTIVITY_DOMAINS,
  ACTIVITY_DOMAIN_DISPLAY,

  // §1 Dashboard Mode
  ENGAGEMENT_DASHBOARD_MODES,
  deriveEngDashboardMode,

  // §2 Ecosystem
  classifyDomainVitality,
  getVitalityColor,
  computeEcosystemDiversity,
  computeEcosystemHealth,
  detectExtinctDomains,
  detectEmergingDomains,
  identifyDominantDomain,
  hasDangerousDominance,

  // §3 Gravitational
  classifyGravitationalState,
  computeDaysToEscape,
  getGravityStateColor,

  // §4 Resonance
  classifyResonanceIntensity,
  computeTotalResonance,

  // §5 DNA Mutation
  classifyMutationSeverity,
  getMutationSeverityColor,

  // §6 Satisfaction
  computeCompositeSatisfaction,
  identifyPriorityDimension,
  classifyNPSSegment,
  computeNPS,
  getNPSColor,

  // §7 Calibration
  computeCalibrationDelta,
  generateCalibrationReport,
  shouldRecalibrate,

  // §8 Discovery
  classifyPatternSignificance,
  computeDiscoveryPriority,
  classifyAnomalyType,

  // §9 Stream Priority
  computeSignalPriority,
  sortStreamSignals,
  filterActionableSignals,
  deriveDecisionScenario,

  // §10 Ambient
  deriveAmbientState,

  // §11 Health Score
  computeEngagementHealthScore,
  getHealthGradeColor,
  getHealthScoreColor,

  // §12 Velocity
  computeEngagementVelocity,

  // §13 Moments of Truth
  classifyMomentImpact,
  getMomentIcon,

  // §14 Cross-Domain
  detectSatisfactionDivergence,
  detectNPSDisconnect,
  computeFinancialExposure,

  // §15 Utility
  mapEngagementLevel,
  formatPct,
  clamp,
  ratioToScore,
  lerp,
  getTrendIcon,
  getTrendColor,
  getSeverityColor,
} from "./config";

// ─── Types ────────────────────────────────────────────────

export type {
  // Section A
  FamilyEngagement,
  EngagementListResponse,
  EngagementOverview,
  EngagementDistribution,
  RiskFactorCount,
  EngagementTrendPoint,

  // Section B
  ReactivationCampaign,
  CampaignListResponse,
  CampaignForm,

  // Section C
  SurveyQuestion,
  SurveyTemplate,
  SurveyResponse,
  SurveyAnswer,
  SurveyResultsResponse,
  QuestionSummary,
  SentimentBreakdown,
  SurveyInsight,
  SurveyComment,

  // Section E
  EngagementDashboardSummary,
  EngagementDashboardLevelDist,
  EngagementDashboardTrendPoint,
  EngagementDashboardRiskFactor,
  EngagementDashboardTrendSummary,
  EngagementDashboardFamily,
  EngagementDashboardResponse,

  // Section F
  HealthScoreFactor,
  EngagementHealthScore as EngagementHealthScoreData,

  // Section G
  EngagementVelocity,
  FactorTrend,
  TrajectoryPoint,
  EngagementAdvisorContext,

  // Section H
  ActivityDomain,

  // Section I
  EngagementDomainStatus,
  DomainSymbiosis,
//   EngagementEcosystem,

  // Section J
  GravitationalModel,

  // Section K
  ResonancePattern,

  // Section L
  MomentOfTruth,
  MomentOfTruthType,

  // Section M
  EngagementDNAMutation,

  // Section N
  SatisfactionDimension,
  SatisfactionDimensionName,
  SatisfactionDriver,
  SatisfactionGap,
  NPSDriver,
  PredictiveNPS,

  // Section O
  EngagementDashboardMode,
  EngagementAmbientState,

  // Section P
  StreamSignalCategory,
  EngagementStreamSignal,

  // Section Q
  DecisionScenarioType,
  DecisionScenario,

  // Section R
  CalibrationDelta,
  CalibrationReport,

  // Section S
  EmergentPatternType,
  EmergentPattern,
  AnomalyFamily,

  // Section T
  RuleEvolutionProposal,
  EvolutionVersion,

  // Section U
  AiEngagementReport,
  WellnessTabData,
  SatisfactionTabData,
  SocialClusterItem,
  QuarterlyInsightsData,
  SchedulingConflictItem,
} from "./types";

// ─── Constants ────────────────────────────────────────────

export {
  ACTIVITY_DOMAINS as ACTIVITY_DOMAINS_LIST,
  MOMENT_OF_TRUTH_DISPLAY,
  SATISFACTION_DIMENSION_DISPLAY,
  DECISION_SCENARIO_DISPLAY,
  ENGAGEMENT_MCP_TOOLS,
  ENGAGEMENT_FRESHNESS_TIERS,
  ENGAGEMENT_LEVEL_CONFIG,
  CAMPAIGN_STATUS_CONFIG,
  CAMPAIGN_CHANNEL_OPTIONS,
  CAMPAIGN_TARGET_OPTIONS,
  OFFER_OPTIONS,
  SENTIMENT_CONFIG,
  RISK_FACTOR_LABELS,
  ENGAGEMENT_LEVEL_MAP,
  SATISFACTION_CATEGORY_LABELS,
  ACTIVITY_CHART_COLORS,
  CLUSTER_TYPE_CONFIG,
  TRAJECTORY_QUADRANT_CONFIG,
  ENGAGEMENT_ADVISOR_LAYERS,
} from "./types";

// ─── Type Guards ──────────────────────────────────────────

export { isActivityDomain } from "./types";

// ─── Type Aliases ─────────────────────────────────────────

export type { EngagementAdvisorLayer } from "./types";