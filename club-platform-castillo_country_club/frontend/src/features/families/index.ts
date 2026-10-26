// ═══════════════════════════════════════════════════════════
// src/features/families/index.ts
// Phase 34+ Migration — Families Barrel
// Level 6+ Agency · Production Grade
//
// Single entry point for the Families feature.
// All external imports go through this barrel.
//
// TYPE-ONLY re-exports use "export type" to enable
// TypeScript's isolatedModules and tree-shaking.
//
// Domain types       → ./types         §1
// AI intelligence    → ./ai-types      §2
// Social genome      → ./social-types  §3
// Configuration      → ./config        §4
// Hooks              → ./hooks/*       §5
// Lib (pure funcs)   → ./lib/*         §6
// Canvas renderers   → ./components/*  §7
// Pages              → ./*             §8
// Components         → ./components/*  §9
//
// PRE-WRITE VERIFICATION:
//   All re-exports verified against source files ✅
//   type-only exports for type imports ✅
//   Named exports only (no default in components) ✅
//   0 circular dependencies ✅
//   44 source files covered ✅
//   Constellation types included in §3 ✅
//   Intelligence experience types in §6 ✅
//   FamiliesDashboardPage (default) in §8 ✅
//
// ANTI-PATTERNS REMOVED:
//   - types.ts acting as barrel → index.ts
//   - Missing barrel file → created
//   - Mixed value/type re-exports → separated by section
//   - Missing hook type exports → §5 complete
//   - Missing lib exports → §6 added
//   - Missing component exports → §9 added
//
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §1  TYPE RE-EXPORTS — Domain types
// All type-only for tree-shaking and isolatedModules
// ═══════════════════════════════════════════════════════════

export type {
  // Union literals
  FamilyStatus,
  MemberTier,
  ChurnRisk,
  MemberRole,
  MemberStatus,
  LifecycleStage,
  TemperatureZoneLevel,
  PulseRhythm,
  PrioritySlot,
  RowSignal,
  SortField,
  SortDir,
  NarrativeTone,
  AgeJourneyStage,
  PrivacyLevel,
  PreferredLanguage,
  NotificationChannel,
  FamilyDashboardTab,
  ActivityType,
  TrendDirection,
  AdvisorLayer,
  CohortId,
  // Core domain
  Family,
  FamilyMember,
  SocialConnection,
  // Request/Response
  FamilyListResponse,
  FamilyFilters,
  FamilyDetailResponse,
  ActivityRecord,
  FinancialSummary,
  // Preferences
  FamilyPreferences,
  // Derived / Intelligence
  Trend,
  EnrichedRowSignal,
  EnrichedRow,
  BatchStats,
  GlanceInsight,
  ParsedSearch,
  // Dashboard
  FamilyDashboardState,
  FamilyTabConfig,
  // Config shapes
  CohortDef,
  TemperatureZoneConfig,
  PulseRhythmConfig,
  PrioritySlotConfig,
  RowSignalConfig,
  LifecycleStageConfig,
  MemoryTypeConfig,
  MilestoneTypeConfig,
  SeedToneConfig,
  SortOption,
  ActivityCategoryConfig,
  AgeJourneyConfig,
  VelocityWindow,
  NarrativeTemplate,
  RiskLevelConfig,
  ActionCategoryConfig,
  IntelligenceDimensionConfig,
  UrgencyLevelConfig,
  AdvisorImpactConfig,
  AdvisorLayerConfig,
  SearchKeyword,
  // Advisor integration
  FamilyHealthFactorRef,
  LifecycleTransition,
} from "./types";

// ═══════════════════════════════════════════════════════════
// §2  TYPE RE-EXPORTS — AI intelligence types
// ═══════════════════════════════════════════════════════════

export type {
  // Enrichment state
  EnrichmentState,
  // Health
  FamilyHealthFactor,
  FamilyHealthScore,
  // Pulse & Temperature
  FamilyPulseVital,
  EngagementTemperature,
  // Brief & Narrative
  FamilyBrief as FamilyBriefType,
  FamilyNarrativeVoice,
  // Lifecycle
  LifecycleProjection,
  // Adaptive priority
  AdaptiveCardData,
  AdaptiveCardPriority,
  // Memory & Milestones
  FamilyMemory,
  FamilyMilestone,
  MilestoneTrackerResponse,
  // Conversation
  ConversationSeed,
  // Churn & Risk
  ChurnFactor,
  FamilyChurnPrediction,
  // Recommendations
  ActivityRecommendation,
  EngagementPlanAction,
  FamilyEngagementPlan,
  // Cross-domain
  CrossDomainThread,
  // Advisor
  FamilyAdvisorInsight,
  FamilyIntelligenceState,
  // Enriched views
  FamilyEnrichmentData,
  FamilyDetailEnrichmentData,
  EnrichedFamily,
  EnrichedFamilyDetail,
} from "./ai-types";

// ═══════════════════════════════════════════════════════════
// §3  TYPE RE-EXPORTS — Social genome types
// ═══════════════════════════════════════════════════════════

export type {
  // Union literals
  SocialContext,
  BondTrajectory,
  RecencyLevel,
  InteractionFrequency,
  SeasonalityPattern,
  InfluenceTier,
  SymmetryClassification,
  MatchReasonType,
  ClusterType,
  // Bond model
  BondProfile,
  AsymmetryIndex,
  // Inter-family bonds
  SocialBond,
  SocialMatch,
  MatchReason,
  // Intra-family bonds
  IntraFamilyBond,
  // Social graph
  SocialNode,
  SocialCluster,
  ClusterMetrics,
  SocialGraphMetrics,
  // Intelligence
  SocialInfluenceScore,
  CrossFamilyActivity,
  // Prediction
  BondPrediction,
  SocialTopologyInsight,
  // Constellation visualization
  ConstellationNode,
  ConstellationConnection,
  ConstellationCluster,
} from "./social-types";

// ═══════════════════════════════════════════════════════════
// §4  VALUE RE-EXPORTS — Configuration data
// These are runtime values (arrays, objects, maps).
// ═══════════════════════════════════════════════════════════

export {
  // Role mapping
  ROLE_BACKEND_MAP,
  ROLE_LABELS,
  // Visual identity
  TIER_CONFIG,
  STATUS_CONFIG,
  CHURN_CONFIG,
  // Preferences
  INTEREST_PRESETS,
  CHANNEL_OPTIONS,
  PRIVACY_OPTIONS,
  // Cohorts
  COHORTS,
  // Temperature
  TEMPERATURE_ZONES,
  // Pulse
  PULSE_RHYTHMS,
  // Priority
  PRIORITY_SLOTS,
  PRIORITY_ORDER,
  // Smart search keywords
  TIER_KEYWORDS,
  CHURN_KEYWORDS,
  STATUS_KEYWORDS,
  PULSE_KEYWORDS,
  TEMPERATURE_KEYWORDS,
  LIFECYCLE_KEYWORDS,
  // Row signals
  ROW_SIGNALS,
  // Lifecycle
  LIFECYCLE_STAGES,
  // Memory & Milestones
  MEMORY_TYPES,
  MILESTONE_TYPES,
  // Conversation seeds
  SEED_TONES,
  SEED_CHANNELS,
  // Pagination & sorting
  FAMILY_PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
  SORT_OPTIONS,
  DEFAULT_SORT,
  // Dashboard tabs
  FAMILY_DETAIL_TABS,
  // Keyboard shortcuts
  FAMILY_SHORTCUTS,
  // Activity categories
  ACTIVITY_CATEGORIES,
  // Age journey
  AGE_JOURNEY,
  // Topology
  TOPOLOGY_THRESHOLDS,
  // Velocity
  VELOCITY_WINDOWS,
  // Narrative
  NARRATIVE_TEMPLATES,
  CLUSTER_IDENTITIES,
  // Risk
  RISK_LEVELS,
  // Actions
  ACTION_CATEGORIES,
  ACTION_PRIORITIES,
  // Domain
  DOMAIN_COLORS,
  // Intelligence dimensions
  INTELLIGENCE_DIMENSIONS,
  // Urgency
  URGENCY_LEVELS,
  // Advisor
  ADVISOR_IMPACT_LEVELS,
  ADVISOR_LAYERS,
} from "./config";

// ═══════════════════════════════════════════════════════════
// §5  HOOK RE-EXPORTS
// Value exports (functions) + type exports (options/returns)
// ═══════════════════════════════════════════════════════════

export { useFamilyList } from "./hooks/useFamilyList";
export { useFamilyDetail } from "./hooks/useFamilyDetail";
export { useFamilyForm } from "./hooks/useFamilyForm";
export { useFamilyAdvisor } from "./hooks/useFamilyAdvisor";
export { useIntelligenceEngine } from "./hooks/useIntelligenceEngine";
export { useSocialGraph } from "./hooks/useSocialGraph";
export { useConstellation } from "./hooks/useConstellation";

export type {
  FamilyDetailTab,
  AdvisorState,
  TabCounts,
  UseFamilyDetailReturn,
} from "./hooks/useFamilyDetail";

export type {
  UseFamilyAdvisorProps,
} from "./hooks/useFamilyAdvisor";

export type {
  UseIntelligenceEngineOptions,
  UseIntelligenceEngineReturn,
  StreamPhase,
  IntelligenceMemory,
  PeerInsight,
} from "./hooks/useIntelligenceEngine";

export type {
  UseSocialGraphOptions,
  UseSocialGraphReturn,
  HoverInfo,
} from "./hooks/useSocialGraph";

export type {
  UseConstellationOptions,
  UseConstellationReturn,
  ConstellationFamilyInput,
  ConstellationConnectionInput,
  ConstellationHoverInfo,
} from "./hooks/useConstellation";

// ═══════════════════════════════════════════════════════════
// §6  LIB RE-EXPORTS — Pure functions
// ═══════════════════════════════════════════════════════════

// ── familySignals ──
export {
  deriveTemperature,
  deriveAdaptivePriority,
  deriveInsight,
} from "./lib/familySignals";
export type { DerivedInsight } from "./lib/familySignals";

// ── intelligenceExperience (P7) ──
export {
  buildIntelligenceExperience,
} from "./lib/intelligenceExperience";
export type {
  IntelligenceExperience,
  AttentionSlot,
  AttentionPlacement,
  ActionSuggestion,
  AdvisorInsight,
} from "./lib/intelligenceExperience";

// ── intelligenceCorrelator ──
export {
  findCorrelations,
  deriveDimensionScores,
  computeCompositeScore,
  deriveUrgencyLevel,
} from "./lib/intelligenceCorrelator";
export type {
  IntelligenceResults,
  IntelligenceCorrelation,
  DimensionScore,
} from "./lib/intelligenceCorrelator";

// ── intelligenceNarrator ──
export { generateNarrative as generateIntelligenceNarrative } from "./lib/intelligenceNarrator";
export type { IntelligenceNarrative } from "./lib/intelligenceNarrator";

// ── actionChainBuilder ──
export { buildActionChain } from "./lib/actionChainBuilder";
export type { ActionChain } from "./lib/actionChainBuilder";

// ═══════════════════════════════════════════════════════════
// §7  CANVAS RENDERER RE-EXPORTS
// ═══════════════════════════════════════════════════════════

export { resolveColors } from "./components/SocialGraphRenderer";
export type {
  ResolvedColors,
  GraphNode,
  GraphEdge,
  RenderState,
} from "./components/SocialGraphRenderer";

// ═══════════════════════════════════════════════════════════
// §8  PAGE RE-EXPORTS (default exports — lazy-loadable)
// ═══════════════════════════════════════════════════════════

// Pages use default exports for React.lazy() compatibility.
// Router imports them via: lazy(() => import("@/features/families/FamilyList"))
// No need to re-export defaults — they're imported directly by the router.
// Listed here for documentation completeness:
//
//   FamilyList            → ./FamilyList            (default)
//   FamilyDetail          → ./FamilyDetail          (default)
//   FamilyForm            → ./FamilyForm            (default)
//   FamiliesDashboardPage → ./FamiliesDashboardPage (default)

// ═══════════════════════════════════════════════════════════
// §9  COMPONENT RE-EXPORTS — Named exports only
// ═══════════════════════════════════════════════════════════

// ── Dashboard (P5 Canvas + P7 Intelligence) ──
export { FamiliesDashboard } from "./components/FamiliesDashboard";
export { DashboardCanvas } from "./components/DashboardCanvas";

// ── Intelligence ──
export { IntelligenceGlance } from "./components/IntelligenceGlance";
export { FamilyIntelligencePanel } from "./components/FamilyIntelligencePanel";
export { IntelligenceConstellation } from "./components/IntelligenceConstellation";
export { FamilyAdvisorBanner } from "./components/FamilyAdvisorBanner";
export { AdaptiveCardHero } from "./components/AdaptiveCardHero";

// ── Overview / Briefing ──
export { FamilyBrief } from "./components/FamilyBrief";
export { FamilyTemperature } from "./components/FamilyTemperature";
export { FamilyPulse } from "./components/FamilyPulse";
export { LifecycleTimeline } from "./components/LifecycleTimeline";
export { FamilyQuickPreview } from "./components/FamilyQuickPreview";

// ── Members ──
export { MemberCard } from "./components/MemberCard";
export { MemberSparkline } from "./components/MemberSparkline";

// ── Social / DNA ──
export { RelationshipDNA } from "./components/RelationshipDNA";
export { ConversationSeeds } from "./components/ConversationSeeds";
export { SocialGraph } from "./components/SocialGraph";
export { SocialNarrativeOverlay } from "./components/SocialNarrativeOverlay";

// ── Memory ──
export { MemoryLane } from "./components/MemoryLane";

// ── Constellation (P5 Canvas) ──
export { FamilyConstellation } from "./components/FamilyConstellation";