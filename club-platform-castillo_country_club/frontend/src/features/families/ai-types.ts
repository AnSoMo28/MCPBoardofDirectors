// ═══════════════════════════════════════════════════════════
// src/features/families/ai-types.ts
// Phase 34+ Migration — Families AI Intelligence Types
// Level 6+ Agency · Production Grade
//
// Defines the intelligence layer for the Families domain:
// pulse, temperature, brief, lifecycle, health, enrichment,
// advisor integration, cross-domain threads, and enriched views.
//
// Core domain types   → ./types.ts
// Social genome types → ./social-types.ts
//
// PRE-WRITE VERIFICATION:
//   FamilyPulseVital        → PulseRhythm from ./types.ts ✅
//   EngagementTemperature   → TemperatureZoneLevel from ./types.ts ✅
//   PrioritySlot            → PrioritySlot from ./types.ts ✅
//   LifecycleStage          → LifecycleStage from ./types.ts ✅
//   AdvisorLayer            → AdvisorLayer from ./types.ts ✅
//   EnrichmentState<T>      → generic, no circular deps ✅
//   CrossDomainThread       → AdvisorLayer from ./types.ts ✅
//   IntraFamilyBond      → from ./social-types.ts ✅
//   All readonly            → verified ✅
//
// ANTI-PATTERNS REMOVED:
//   - FamilyLifecycleAnalysis     → MERGED into LifecycleProjection
//   - LifecycleRecommendation     → MERGED into interventionWindow
//   - DomainScore                 → REPLACED by FamilyHealthFactor
//   - Family360Insight            → REPLACED by FamilyIntelligenceState
//   - CrossDomainCorrelation      → REPLACED by CrossDomainThread
//   - EngagementTemperature.color → REMOVED (CSS responsibility)
//   - Record<string, unknown>     → discriminated union AdaptiveCardData
//   - Optional ? in Enriched*     → EnrichmentState<T> discriminated union
//   - Mutable interfaces          → readonly
//   - LifecycleRecommendation     → merged
//   - FamilyActivityRecommendations wrapper → eliminated
//
// ═══════════════════════════════════════════════════════════

// §0 ─── Imports ──────────────────────────────────────────

import type {
  Family,
  FamilyDetailResponse,
  LifecycleStage,
  PulseRhythm,
  TemperatureZoneLevel,
  PrioritySlot,
  AdvisorLayer,
  TrendDirection
} from "./types";

import type { IntraFamilyBond } from "./social-types";

// ═══════════════════════════════════════════════════════════
// §1  ENRICHMENT STATE — Generic discriminated union
// ═══════════════════════════════════════════════════════════

/**
 * Generic enrichment state for any AI-enriched data.
 * Components narrow by `status` to get type-safe access.
 *
 * @example
 * if (enrichment.status === "enriched") {
 *   // enrichment.data is guaranteed to exist
 *   renderPulse(enrichment.data.pulse);
 * }
 */
export type EnrichmentState<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "enriched";
      readonly data: T;
      readonly timestamp: string;
    }
  | {
      readonly status: "error";
      readonly error: string;
      readonly timestamp: string;
    };

// ═══════════════════════════════════════════════════════════
// §2  HEALTH SCORE & FACTORS
// ═══════════════════════════════════════════════════════════

/**
 * Individual health factor — one dimension of family health.
 * All weights in a FamilyHealthScore must sum to 1.0.
 */
export interface FamilyHealthFactor {
  readonly id: string;
  readonly label: string;
  /** 0-100 computed score for this factor */
  readonly score: number;
  /** 0-1 weight in composite score. All weights sum to 1.0 */
  readonly weight: number;
  readonly status: "exceptional" | "healthy" | "attention" | "critical";
  readonly finding: string;
  readonly trend: TrendDirection;
  readonly recommendation?: string;
}

/**
 * Composite health score — weighted sum of all factors.
 * Computed by the Advisor Engine. Not hardcoded.
 */
export interface FamilyHealthScore {
  /** 0-100 composite score */
  readonly overall: number;
  readonly status: "exceptional" | "healthy" | "attention" | "critical";
  readonly factors: readonly FamilyHealthFactor[];
  readonly trend: TrendDirection;
  readonly delta7d: number;
  readonly delta30d: number;
  readonly computedAt: string;
}

// ═══════════════════════════════════════════════════════════
// §3  PULSE — The heartbeat of a family
// ═══════════════════════════════════════════════════════════

/**
 * FamilyPulseVital — biométrico metaphor.
 * All fields are activity metrics dressed as cardiac signals.
 *
 * bpm       = activities per week
 * rhythm    = pattern classification
 * amplitude = depth of engagement (0-100)
 * lastBeat  = last significant activity
 * zones     = distribution of engagement over time
 */
export interface FamilyPulseVital {
  /** Activities per week (frequency) */
  readonly bpm: number;
  readonly rhythm: PulseRhythm;
  /** 0-100, depth of engagement */
  readonly amplitude: number;
  /** Last significant activity timestamp */
  readonly lastBeat: string;
  /** Delta vs 7 days ago */
  readonly trend7d: number;
  /** Delta vs 30 days ago */
  readonly trend30d: number;
  readonly zones: Readonly<{
    /** % time active in last 30d */
    active: number;
    /** % time passive in last 30d */
    passive: number;
    /** % time dormant in last 30d */
    dormant: number;
  }>;
}

// ═══════════════════════════════════════════════════════════
// §4  TEMPERATURE — Engagement feels, not numbers
// ═══════════════════════════════════════════════════════════

/**
 * EngagementTemperature — thermal metaphor.
 * Color is NOT included — CSS derives color from zone via config.
 */
export interface EngagementTemperature {
  /** 0-100 */
  readonly current: number;
  readonly zone: TemperatureZoneLevel;
  /** Last 7 days, one value per day */
  readonly history7d: readonly number[];
  /** Last 30 days, one value per day */
  readonly history30d: readonly number[];
  /** Club average for benchmark */
  readonly avgClubTemp: number;
  /** +/- vs club average */
  readonly deltaVsClub: number;
  /** AI prediction for next 30d */
  readonly predicted30d: number;
}

// ═══════════════════════════════════════════════════════════
// §5  BRIEF & NARRATIVE — AI tells the family's story
// ═══════════════════════════════════════════════════════════

/**
 * AI-generated narrative about a family.
 * Confidence is always 0-1 range.
 */
export interface FamilyBrief {
  readonly headline: string;
  readonly narrative: string;
  readonly highlightMoment: Readonly<{
    text: string;
    date: string;
    sentiment: "celebratory" | "neutral" | "concerning";
  }>;
  readonly upcomingMilestone?: FamilyMilestone;
  readonly aiTone:
    | "celebratory"
    | "confident"
    | "neutral"
    | "caring"
    | "urgent";
  /** 0-1 confidence level */
  readonly confidence: number;
  readonly generatedAt: string;
}

/**
 * How to talk to this family — AI-recommended communication voice.
 */
export interface FamilyNarrativeVoice {
  readonly recommendedTone:
    | "warm"
    | "professional"
    | "celebratory"
    | "empathetic"
    | "exciting";
  readonly keyTopics: readonly string[];
  readonly avoidTopics: readonly string[];
  readonly preferredChannel: string;
  /** e.g. "Tardes, después de las 4pm" */
  readonly bestContactTime: string;
  readonly lastInteractionSummary: string;
  readonly suggestedOpeners: readonly ConversationSeed[];
}

// ═══════════════════════════════════════════════════════════
// §6  LIFECYCLE & PROJECTION — Where is this family going
// ═══════════════════════════════════════════════════════════

/**
 * Unified lifecycle projection. Replaces both the old
 * LifecycleProjection AND FamilyLifecycleAnalysis.
 *
 * Contains current state, projected state, intervention window,
 * and full historical stages. One type, complete picture.
 */
export interface LifecycleProjection {
  readonly currentStage: LifecycleStage;
  readonly projectedStage: LifecycleStage;
  readonly estimatedDaysToTransition: number;
  readonly triggerEvents: readonly string[];
  /** 0-1 confidence */
  readonly confidence: number;
  readonly interventionWindow: Readonly<{
    opens: string;
    closes: string;
    suggestedActions: readonly string[];
  }>;
  readonly historicalStages: readonly Readonly<{
    stage: LifecycleStage;
    enteredAt: string;
    exitedAt?: string;
    durationDays: number;
    triggerEvent?: string;
  }>[];
  /** Computed: days at current stage */
  readonly daysAtCurrentStage: number;
  /** Computed: stage progress 0-1 */
  readonly stageProgress: number;
}

// ═══════════════════════════════════════════════════════════
// §7  ADAPTIVE PRIORITY — What to show per family
// ═══════════════════════════════════════════════════════════

/**
 * Discriminated union — data shape is type-safe per slot.
 * Components narrow by `slot` to get the right data fields.
 *
 * @example
 * if (priority.slot === "churn_warning") {
 *   // priority.data.churnScore is number ✅
 * }
 */
export type AdaptiveCardData =
  | {
      readonly slot: "churn_warning";
      readonly churnScore: number;
      readonly topFactor: string;
      readonly daysAtRisk: number;
    }
  | {
      readonly slot: "milestone_approaching";
      readonly milestoneType: string;
      readonly milestoneDate: string;
      readonly daysUntil: number;
      readonly memberName?: string;
    }
  | {
      readonly slot: "new_member_celebration";
      readonly memberName: string;
      readonly joinedAt: string;
      readonly daysSince: number;
    }
  | {
      readonly slot: "engagement_surge";
      readonly surgePercent: number;
      readonly topActivity: string;
      readonly period: string;
    }
  | {
      readonly slot: "financial_alert";
      readonly balance: number;
      readonly daysOverdue: number;
      readonly lastPayment: string;
    }
  | {
      readonly slot: "social_opportunity";
      readonly suggestedFamily: string;
      readonly matchScore: number;
      readonly commonInterests: readonly string[];
    }
  | {
      readonly slot: "lifecycle_transition";
      readonly fromStage: LifecycleStage;
      readonly toStage: LifecycleStage;
      readonly triggerEvent: string;
    }
  | {
      readonly slot: "anniversary";
      readonly years: number;
      readonly date: string;
      readonly memberName?: string;
    };

export interface AdaptiveCardPriority {
  readonly hero: PrioritySlot;
  readonly reason: string;
  readonly urgency: "immediate" | "today" | "this_week" | "upcoming";
  readonly suggestedAction?: string;
  readonly data: AdaptiveCardData;
}

// ═══════════════════════════════════════════════════════════
// §8  MEMORY, MILESTONES & TIMELINE
// ═══════════════════════════════════════════════════════════

/**
 * Moments that define a family — the emotional timeline.
 */
export interface FamilyMemory {
  readonly id: string;
  readonly type:
    | "milestone"
    | "achievement"
    | "celebration"
    | "first"
    | "record"
    | "reunion";
  readonly title: string;
  readonly narrative: string;
  readonly date: string;
  /** Member IDs involved */
  readonly members: readonly string[];
  /** 1-10 significance */
  readonly significance: number;
  readonly mediaUrl?: string;
  readonly aiTags: readonly string[];
}

export interface FamilyMilestone {
  readonly id: string;
  readonly type:
    | "anniversary"
    | "birthday"
    | "age_transition"
    | "achievement";
  readonly title: string;
  readonly date: string;
  readonly daysUntil: number;
  readonly memberName?: string;
  readonly suggestedAction: string;
  readonly priority: "high" | "medium" | "low";
}

export interface MilestoneTrackerResponse {
  readonly upcoming: readonly FamilyMilestone[];
  readonly recent: readonly FamilyMilestone[];
  readonly suggestions: readonly string[];
}

// ═══════════════════════════════════════════════════════════
// §9  CONVERSATION & COMMUNICATION
// ═══════════════════════════════════════════════════════════

/**
 * AI-generated conversation seed — what to say to the family.
 * Separates intelligence output (confidence, basedOn) from
 * presentation (tone, channel) but keeps them together since
 * they're always used as a unit.
 */
export interface ConversationSeed {
  readonly id: string;
  readonly context:
    | "greeting"
    | "follow_up"
    | "milestone"
    | "recovery"
    | "upsell"
    | "feedback";
  readonly seed: string;
  readonly tone: "warm" | "professional" | "celebratory" | "empathetic";
  /** Which member to address */
  readonly targetMemberId?: string;
  readonly channel: "in_person" | "phone" | "email" | "whatsapp";
  /** 0-1 confidence */
  readonly confidence: number;
  /** Why this seed was generated — transparency for staff */
  readonly basedOn: string;
}

// ═══════════════════════════════════════════════════════════
// §10  CHURN & RISK INTELLIGENCE
// ═══════════════════════════════════════════════════════════

export interface ChurnFactor {
  readonly name: string;
  readonly impact: number;
  readonly direction: "positive" | "negative";
  readonly detail: string;
  readonly severity: "info" | "low" | "medium" | "high" | "critical";
}

export interface FamilyChurnPrediction {
  readonly riskScore: number;
  readonly riskLevel: "low" | "medium" | "high" | "critical";
  readonly factors: readonly ChurnFactor[];
  readonly recommendation: string;
  /** 0-1 confidence */
  readonly confidence: number;
}

// ═══════════════════════════════════════════════════════════
// §11  RECOMMENDATIONS & ENGAGEMENT PLANS
// ═══════════════════════════════════════════════════════════

export interface ActivityRecommendation {
  readonly id: string;
  readonly activityName: string;
  readonly category: string;
  readonly matchScore: number;
  readonly reason: string;
  readonly targetMembers: readonly string[];
  readonly estimatedEngagement: number;
  readonly schedulingSuggestion: string;
  readonly linkedEventId?: string;
}

export interface EngagementPlanAction {
  readonly id: string;
  readonly action: string;
  readonly category:
    | "communication"
    | "activity"
    | "recognition"
    | "social"
    | "financial";
  readonly priority: "high" | "medium" | "low";
  readonly timing: string;
  readonly expectedImpact: string;
  readonly assignedTo: string;
}

export interface FamilyEngagementPlan {
  readonly currentScore: number;
  readonly targetScore: number;
  readonly timeframe: string;
  readonly actions: readonly EngagementPlanAction[];
  readonly aiSummary: string;
  /** Numeric ROI percentage, e.g. 15 for "+15%" */
  readonly estimatedROIPercent: number;
}

// ═══════════════════════════════════════════════════════════
// §12  CROSS-DOMAIN INTELLIGENCE
// ═══════════════════════════════════════════════════════════

/**
 * A thread connecting two domains through a signal.
 * Replaces the old CrossDomainCorrelation with a richer model
 * that aligns with the Advisor Engine signal-bus architecture.
 */
export interface CrossDomainThread {
  readonly sourceDomain: AdvisorLayer;
  readonly targetDomain: AdvisorLayer;
  readonly signalId: string;
  /** 0-1 tension — how strong the correlation */
  readonly tension: number;
  readonly description: string;
  readonly suggestedAction: string;
  readonly detectedAt: string;
}

// ═══════════════════════════════════════════════════════════
// §13  ADVISOR INTEGRATION
// ═══════════════════════════════════════════════════════════

/**
 * Advisor insight aligned with the Advisor Engine's BaseInsight contract.
 * Fields map 1:1 to the shared AdvisorBanner component expectations.
 *
 * @compatibility BaseInsight from @/shared/components/AdvisorBanner
 */
export interface FamilyAdvisorInsight {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly impact: "high" | "medium" | "low" | "info";
  /** 0-1 confidence */
  readonly confidence: number;
  readonly layer: AdvisorLayer;
  readonly action?: Readonly<{
    label: string;
    targetTab: string;
    toast: string;
  }>;
}

/**
 * Complete intelligence state for a family.
 * Replaces the old Family360Insight with Advisor Engine alignment.
 */
export interface FamilyIntelligenceState {
  readonly healthScore: FamilyHealthScore;
  readonly lifecycleProjection: LifecycleProjection;
  readonly temperature: EngagementTemperature;
  readonly pulse: FamilyPulseVital;
  readonly crossDomainThreads: readonly CrossDomainThread[];
  readonly insights: readonly FamilyAdvisorInsight[];
  readonly lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════
// §14  ENRICHED VIEWS
// ═══════════════════════════════════════════════════════════

/**
 * Bag of all AI enrichment data for a family.
 * Used as the generic parameter for EnrichmentState<FamilyEnrichmentData>.
 */
export interface FamilyEnrichmentData {
  readonly pulse: FamilyPulseVital;
  readonly brief: FamilyBrief;
  readonly temperature: EngagementTemperature;
  readonly adaptivePriority: AdaptiveCardPriority;
  readonly lifecycleProjection: LifecycleProjection;
  readonly memories: readonly FamilyMemory[];
  readonly conversationSeeds: readonly ConversationSeed[];
  readonly narrativeVoice: FamilyNarrativeVoice;
  readonly churnPrediction: FamilyChurnPrediction;
  readonly healthScore: FamilyHealthScore;
  readonly crossDomainThreads: readonly CrossDomainThread[];
}

/**
 * Bag of AI enrichment data for the detail view.
 * Extends the base enrichment with detail-specific intelligence.
 */
export interface FamilyDetailEnrichmentData extends FamilyEnrichmentData {
  readonly IntraFamilyBonds: readonly IntraFamilyBond[];
  readonly engagementPlan: FamilyEngagementPlan;
  readonly activityRecommendations: readonly ActivityRecommendation[];
  readonly intelligenceState: FamilyIntelligenceState;
}

/**
 * Family list item with AI enrichment.
 * Use enrichment.status to determine data availability.
 *
 * @example
 * if (family.enrichment.status === "enriched") {
 *   const { pulse, temperature } = family.enrichment.data;
 * }
 */
export interface EnrichedFamily extends Family {
  readonly enrichment: EnrichmentState<FamilyEnrichmentData>;
}

/**
 * Family detail with AI enrichment.
 * Extends FamilyDetailResponse with intelligence layer.
 */
export interface EnrichedFamilyDetail extends FamilyDetailResponse {
  readonly enrichment: EnrichmentState<FamilyDetailEnrichmentData>;
}

// ═══════════════════════════════════════════════════════════
// §N+2  FamilyBrief — AI-generated narrative briefing
// ═══════════════════════════════════════════════════════════

export interface FamilyMilestone {
  readonly title: string;
  readonly memberName?: string;
  readonly date: string;
  readonly daysUntil: number;
  readonly suggestedAction: string;
}

export interface FamilyBrief {
  readonly headline: string;
  readonly narrative: string;
  readonly aiTone: "celebratory" | "confident" | "neutral" | "caring" | "urgent";
  readonly confidence: number;
  readonly generatedAt: string;
  readonly highlightMoment: {
    readonly text: string;
    readonly date: string;
    readonly sentiment: "celebratory" | "neutral" | "concerning";
  };
  readonly upcomingMilestone?: FamilyMilestone;
}