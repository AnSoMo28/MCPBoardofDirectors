/**
 * cultural/index.ts — Barrel Exports
 *
 * Single entry point for the Cultural Intelligence Module.
 * Every consumer imports from '@/features/cultural', never from internals.
 *
 * Architecture:
 * — config.ts → constants, thresholds, helpers
 * — types.ts → all interfaces, enums, helper functions
 * — lib/ → pure function engines (no hooks, no components)
 * — hooks/ → React hooks (data, dashboard, advisor)
 * — components/ → UI (named exports only)
 *
 * V2 replacements are the PRIMARY export.
 * V1 originals are re-exported as Legacy for backward compatibility.
 *
 * @module cultural
 */

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

export {
  CULTURAL_MCP_SERVER,
  CULTURAL_MCP_TOOLS,
  CULTURAL_FRESHNESS_TIERS,
  CULTURAL_DASHBOARD_MODE_THRESHOLDS,
  deriveCulturalDashboardMode,
  CULTURAL_ADVISOR_THRESHOLDS,
  ADVISOR_TRIGGER_CONFIG,
  CULTURAL_ENGAGEMENT_WEIGHTS,
  CULTURAL_GENRE_EXTENDED,
  SENSORY_DEFAULTS,
  JOURNEY_HORIZON_CONFIG,
  JOURNEY_PURPOSE_CONFIG,
  JOURNEY_EXPANSION_THRESHOLDS,
  CULTURAL_RESONANCE_THRESHOLDS,
  CULTURAL_MUTATION_THRESHOLDS,
  EVENT_DESIGNER_CONFIG,
  classifyMutationConfidence,
  classifyMutationStability,
  computeJourneyExpansionRate,
  computeVenueMatchScore,
  deriveSensoryAdjustments,
} from './config';

// ══════════════════════════════════════════════════════════
//  TYPES — Backend (§1-§10, 1:1 with MCP schema)
// ══════════════════════════════════════════════════════════

export type {
  CulturalSummary,
  CulturalAnalytics,
  CategoryPerformanceData as CategoryPerformance,
  VenueUtilizationData as VenueUtilization,
  EntertainmentROIData as EntertainmentROI,
  SeasonalPatternData as SeasonalPattern,
  CalendarResponse,
  CalendarItem,
  CalendarConflict,
  CulturalEvent,
  CulturalProposal,
  CulturalProgram,
  ArtExhibition,
  EntertainmentAct,
} from './types';

// ══════════════════════════════════════════════════════════
//  TYPES — Enums & Config Types
// ══════════════════════════════════════════════════════════

export type {
  CulturalCategory,
  CulturalEventType,
  EntertainmentType,
  ProgramStatus,
  ExhibitionStatus,
  PerformanceStatus,
  FormalityLevel,
  VenueType,
  CulturalDashboardMode,
} from './types';

// ══════════════════════════════════════════════════════════
//  TYPES — Client-side Intelligence Support (§11)
// ══════════════════════════════════════════════════════════

export type {
  CulturalGenreExtended as CulturalGenreExtendedType,
  GenreAffinity,
  CulturalTemporalPattern,
  SensoryPreferences,
  SensoryProfile,
  CulturalCompanion,
  GroupDynamic,
  JourneyPhase,
  RecommendedEvent,
  JourneyKeyMoment,
  PostEventBehavior,
  SocialSignal,
  DemandForecast,
} from './types';

// ══════════════════════════════════════════════════════════
//  TYPES — Client-side Intelligence Output (§12)
// ══════════════════════════════════════════════════════════

export type {
  TasteProfile,
  CulturalDNA,
  ResonanceScore,
  CulturalJourney,
  TasteMutation,
  VenuePersonality,
  CulturalAmbientState,
  CulturalStreamSignal,
} from './types';

// ══════════════════════════════════════════════════════════
//  TYPES — Config Constants
// ══════════════════════════════════════════════════════════

export {
  CATEGORY_CONFIG,
  EVENT_TYPE_CONFIG,
  ENTERTAINMENT_TYPE_CONFIG,
  PERFORMANCE_STATUS_CONFIG,
  PROGRAM_STATUS_CONFIG,
  EXHIBITION_STATUS_CONFIG,
  FORMALITY_CONFIG,
  VENUE_CONFIG,
  formatEnrollment,
  getStatusConfig,
  groupCalendarByDate,
  calculateEngagementScore,
} from './types';

// ══════════════════════════════════════════════════════════
//  ADVISOR — Rule Engine
// ══════════════════════════════════════════════════════════

// Types
export type {
  AdvisorSeverity,
  AdvisorLayer,
  InsightAction,
  InsightTrigger,
  CulturalAdvisorInsight,
  AdvisorRuleFn,
  IntelligenceRuleFn,
  IntelligenceContext,
  RuleMetadata,
  AdvisorRuleDefinition,
  InsightFilter,
  InsightAggregate,
} from './lib/advisor/types';

export { SEVERITY_ORDER, LAYER_ORDER, computeInsightAggregate } from './lib/advisor/types';

// Helpers
export {
  shannonEntropy,
  normalizedDiversityScore,
  sortBySeverityImpact,
  filterByMinSeverity,
  makeTrigger,
  impactFromThreshold,
  impactFromTrend,
  impactFromRange,
  severityFromThresholds,
  buildDiversityDescription,
  buildUtilizationDescription,
  buildTrendDescription,
} from './lib/advisor/helpers';

// Rule collections
export { HEALTH_RULES, HEALTH_INTELLIGENCE_RULES } from './lib/advisor/healthRules';
export { ENGAGEMENT_RULES, ENGAGEMENT_INTELLIGENCE_RULES } from './lib/advisor/engagementRules';
export { STRATEGY_RULES, STRATEGY_INTELLIGENCE_RULES } from './lib/advisor/strategyRules';
export { PREDICTION_RULES } from './lib/advisor/predictionRules';
export { INNOVATION_RULES, INNOVATION_INTELLIGENCE_RULES } from './lib/advisor/innovationRules';

// ══════════════════════════════════════════════════════════
//  ENGINES — Pure Functions (§C1-§C10)
// ══════════════════════════════════════════════════════════

// §C1 + §C2: Taste Profile & Cultural DNA
export {
  buildTasteProfile,
  deriveCulturalDNA,
} from './lib/tasteProfile';

export type {
  MemberEventFeedback,
  MemberCulturalPreferences as MemberCulturalPreferencesInput,
} from './lib/tasteProfile';

// §C3: Experiential Resonance
export {
  computeExperientialResonance,
  computeBatchResonance,
  computeAverageResonance,
  computeResonanceDrop,
  classifyResonanceLevel,
} from './lib/culturalResonance';

export type { ResonanceInput, PostEventData } from './lib/culturalResonance';

// §C4 + §C5: Venue Intelligence & Sensory Profile
export {
  buildVenuePersonality,
  deriveSensoryProfile,
  buildAllVenuePersonalities,
} from './lib/venueIntelligence';

export type { VenueUsageRecord, VenueFeedbackRecord } from './lib/venueIntelligence';

// §C6: Event-to-Venue Matching
export {
  matchEventToVenue,
  scoreVenueMatch,
  batchMatchEventsToVenues,
  findBestVenue,
} from './lib/eventMatcher';

export type {
  EventVenueRequirements,
  VenueMatch,
  VenueMatchDimensions,
  EventMatchResult,
} from './lib/eventMatcher';

// §C7-§C10: Proposal Enrichment
export {
  enrichProposal,
  computeRealTimeImpact,
  generateVariants,
  assessProposal,
} from './lib/proposalEnricher';

export type {
  EnrichedProposal,
  ProposalAssessment,
  ProposalRisk,
  ProposalVariant,
  ImpactDelta,
  ProposalChange,
} from './lib/proposalEnricher';

// ══════════════════════════════════════════════════════════
//  HOOKS
// ══════════════════════════════════════════════════════════

export { useCulturalData } from './hooks/useCulturalData';
export { useCulturalDashboard } from './hooks/useCulturalDashboard';
export { useCulturalAdvisor } from './hooks/useCulturalAdvisor';
export { useEventDesigner } from './hooks/useEventDesigner';

// ══════════════════════════════════════════════════════════
//  COMPONENTS — V2 (Primary)
// ══════════════════════════════════════════════════════════

// Dashboard
export { CulturalDashboard } from './CulturalDashboard';

// V2 Tab Components
export { CulturalLivingCalendar } from './components/CulturalLivingCalendar';
export { EntertainmentRadar } from './components/EntertainmentRadar';
export { CulturalProgramsViz } from './components/CulturalProgramsViz';
export { ExhibitionTimeline } from './components/ExhibitionTimeline';
export { GalasCommand } from './components/GalasCommand';

// V2 Intelligence
export { CulturalHealthGauge } from './components/CulturalHealthGauge';
export { CulturalIntelligencePanel } from './components/CulturalIntelligencePanel';
export { CulturalIntelligenceStream } from './components/CulturalIntelligenceStream';

// V2 Infrastructure
export { CulturalAmbientCanvas } from './components/CulturalAmbientCanvas';
export { CulturalDecisionStage } from './components/CulturalDecisionStage';
export { CulturalPulse } from './components/CulturalPulse';

// V2 Signature Innovations
export { CulturalTasteGenome } from './components/CulturalTasteGenome';
export { CulturalJourneyComposer } from './components/CulturalJourneyComposer';
export { CulturalResonanceMap } from './components/CulturalResonanceMap';
export { CulturalMutationTracker } from './components/CulturalMutationTracker';
export { CulturalSocialGraph } from './components/CulturalSocialGraph';
export { VenueBrain } from './components/VenueBrain';

// V2 AI Creation Modals
export { AIEntertainmentDesigner } from './components/AIEntertainmentDesigner';
export { AIExhibitionCurator } from './components/AIExhibitionCurator';
export { AIGalaArchitect } from './components/AIGalaArchitect';
export { AIProgramDesigner } from './components/AIProgramDesigner';
export { AISocialArchitect } from './components/AISocialArchitect';

// ══════════════════════════════════════════════════════════
//  COMPONENTS — V1 (Legacy — kept for backward compat)
//
//  These are the ORIGINAL V1 components. They still work but
//  should be migrated to their V2 replacements:
//
//  CulturalCalendar.tsx      → CulturalLivingCalendar
//  CulturalHealthScore.tsx   → CulturalHealthGauge
//  EntertainmentPanel.tsx    → EntertainmentRadar
//  ExhibitionsPanel.tsx      → ExhibitionTimeline
//  ProgramsPanel.tsx         → CulturalProgramsViz
//  GalasPanel.tsx            → GalasCommand
//  CulturalAdvisorBanner.tsx → CulturalPulse
// ══════════════════════════════════════════════════════════

export { default as CulturalCalendarLegacy } from './components/CulturalCalendar';
export { default as CulturalHealthScoreLegacy } from './components/CulturalHealthScore';
export { default as EntertainmentPanelLegacy } from './components/EntertainmentPanel';
export { default as ExhibitionsPanelLegacy } from './components/ExhibitionsPanel';
export { default as ProgramsPanelLegacy } from './components/ProgramsPanel';
export { default as GalasPanelLegacy } from './components/GalasPanel';
export { default as CulturalAdvisorBannerLegacy } from './components/CulturalAdvisorBanner';

// ══════════════════════════════════════════════════════════
//  COMPONENTS — Shared (unchanged, no V2 needed)
// ══════════════════════════════════════════════════════════

export { default as EntertainmentFormModal } from './components/EntertainmentFormModal';
export { default as ExhibitionFormModal } from './components/ExhibitionFormModal';
export { default as ProgramFormModal } from './components/ProgramFormModal';
export { default as GalaFormModal } from './components/GalaFormModal';
export { default as SocialEventFormModal } from './components/SocialEventFormModal';
export { default as VenueIntelligence } from './components/VenueIntelligence';