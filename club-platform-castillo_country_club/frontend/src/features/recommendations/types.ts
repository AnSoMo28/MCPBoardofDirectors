// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Types (2027 REWRITE)
// Fase 29 — Proactive Intelligence Engine
//
// Source: backend/src/club_mcp/models/proactive_recommendation.py
// + Synthesis types for cross-domain intelligence
// + Predicates derived from config (Golden Rule)
// + Dashboard orchestration types for Adaptive Morphism
// + Reasoning chain types for AI transparency
//
// v38 → v2027: 9 interfaces (3 alive, 6 dead) → 9 + 7 new (all alive)
//              0 predicates → 7 config-derived
//              8 configs → 14 configs
//              8 enums → 14 enums
// ═══════════════════════════════════════════════════════════════════════

import {
  type PriorityLevel,
  PRIORITY_DISPLAY,
  type ConfidenceLevel,
  CONFIDENCE_DISPLAY,
  type OperationStatus,
  OPERATION_STATUS_DISPLAY,
} from "@/shared/types/domain-enums";

// Re-export shared types
export type { PriorityLevel, ConfidenceLevel, OperationStatus };

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: ENUMS — Existing (8) + New (6)
// ═══════════════════════════════════════════════════════════════════════

// ── Existing domain enums ─────────────────────────────────────────────

export enum RecommendationType {
  Activity = "activity",
  Event = "event",
  Social = "social",
  Dining = "dining",
  Wellness = "wellness",
  Sport = "sport",
}

export enum RecommendationPriority {
  Low = "low",
  Medium = "medium",
  High = "high",
  Urgent = "urgent",
}

export enum PredictionConfidence {
  Low = "low",
  Medium = "medium",
  High = "high",
}

export enum ConflictSeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

export enum SuggestionStatus {
  Proposed = "proposed",
  UnderReview = "under_review",
  Approved = "approved",
  Rejected = "rejected",
  Implemented = "implemented",
}

export enum PricingStrategy {
  DemandBased = "demand_based",
  Seasonal = "seasonal",
  MemberTier = "member_tier",
  EventBased = "event_based",
  Bundle = "bundle",
}

export enum InsightPeriod {
  Q1 = "Q1",
  Q2 = "Q2",
  Q3 = "Q3",
  Q4 = "Q4",
}

export enum ClusterType {
  Social = "social",
  Activity = "activity",
  AgeBased = "age_based",
  Interest = "interest",
  Engagement = "engagement",
}

// ── New 2027 enums ────────────────────────────────────────────────────

/** Adaptive Morphism modes — driven by system state, not user choice */
export enum RecommendationMode {
  /** No urgency. Overview-first, spacious layout. Default state. */
  Observe = "observe",
  /** New insights or medium-priority items. Data-dense, analytical layout. */
  Analyze = "analyze",
  /** Critical conflicts, time-sensitive opportunities. Action queue dominant. */
  Act = "act",
}

/** Readiness state for autonomous action queue items */
export enum ActionReadiness {
  /** All dependencies met, ready for execution */
  Ready = "ready",
  /** Awaiting human approval before execution */
  AwaitingApproval = "awaiting_approval",
  /** Missing data from one or more sources */
  DataPending = "data_pending",
  /** Blocked by an unresolved scheduling conflict */
  ConflictBlocked = "conflict_blocked",
}

/** Opportunity strength for radar visualization */
export enum OpportunityLevel {
  /** Score ≥ 90. Exceptional cross-domain alignment. */
  Exceptional = "exceptional",
  /** Score 70-89. Strong signal, high confidence. */
  Strong = "strong",
  /** Score 40-69. Moderate signal, worth monitoring. */
  Moderate = "moderate",
  /** Score < 40. Low signal, background awareness only. */
  Low = "low",
}

/** Demand direction for temporal intelligence */
export enum DemandShift {
  Surging = "surging",
  Rising = "rising",
  Stable = "stable",
  Declining = "declining",
}

/** Reasoning chain step types — shows the AI's work */
export enum ReasoningStepType {
  /** Raw data observation */
  Data = "data",
  /** AI inference from data */
  Inference = "inference",
  /** Recommended action */
  Action = "action",
  /** Predicted outcome */
  Outcome = "outcome",
}

/** Cross-domain signal sources */
export enum SignalSource {
  Wellness = "wellness",
  Events = "events",
  Finance = "finance",
  Sports = "sports",
  Families = "families",
  /** Internal recommendation engine signals */
  Internal = "internal",
}

/** Communication draft lifecycle */
export enum DraftStatus {
  Draft = "draft",
  Reviewed = "reviewed",
  Sent = "sent",
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: INTERFACES — Data Contracts (9 existing, enhanced)
// ═══════════════════════════════════════════════════════════════════════

export interface TopActivity {
  name: string;
  participation: number;
  /** NEW: demand direction (enriched by synthesis engine) */
  trend?: DemandShift;
  /** NEW: estimated revenue impact in USD */
  revenue_impact?: number;
}

export interface Recommendation {
  id: string;
  family_id: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  score: number;
  reasoning: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  /** NEW: cross-domain signals that informed this recommendation */
  cross_domain_signals?: CrossDomainSignal[];
  /** NEW: reasoning chain showing AI's inference path */
  reasoning_chain?: ReasoningChain;
}

export interface AttendancePrediction {
  id: string;
  event_id: string;
  event_name: string;
  predicted_attendance: number;
  confidence: PredictionConfidence;
  factors: string[];
  similar_events_avg: number;
  created_at: string;
  /** NEW: historical accuracy of past predictions for this event type */
  historical_accuracy?: number;
  /** NEW: confidence interval [low, high] */
  confidence_interval?: [number, number];
}

export interface SchedulingConflict {
  id: string;
  event_a_id: string;
  event_a_name: string;
  event_b_id: string;
  event_b_name: string;
  conflict_type: string;
  severity: ConflictSeverity;
  overlap_start: string;
  overlap_end: string;
  shared_resources: string[];
  suggestion: string;
  created_at: string;
  /** NEW: AI-generated resolution options with feasibility scores */
  resolution_options?: ConflictResolution[];
}

export interface ActivitySuggestion {
  id: string;
  name: string;
  description: string;
  target_demographic: string;
  estimated_interest: number;
  estimated_cost: number;
  similar_clubs_offer: boolean;
  member_requests_count: number;
  status: SuggestionStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  /** NEW: market demand signal strength (0-100) */
  demand_signal?: number;
  /** NEW: estimated annual revenue if implemented */
  projected_revenue?: number;
}

export interface CommunicationDraft {
  id: string;
  family_id: string;
  channel: string;
  subject: string;
  body: string;
  tone: string;
  personalization_data: Record<string, unknown>;
  created_at: string;
  /** NEW: draft lifecycle status */
  status?: DraftStatus;
  /** NEW: AI confidence in personalization quality (0-100) */
  personalization_confidence?: number;
  /** NEW: last modification timestamp */
  updated_at?: string;
}

export interface PricingOptimization {
  id: string;
  service_name: string;
  current_price: number;
  suggested_price: number;
  strategy: PricingStrategy;
  expected_revenue_change: number;
  expected_demand_change: number;
  reasoning: string;
  /** FIXED: was bare `string`, now typed enum */
  risk_level: RiskLevel;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
  /** NEW: price elasticity coefficient */
  demand_elasticity?: number;
  /** NEW: competitor average price for benchmarking */
  competitor_avg_price?: number;
}

export interface SocialCluster {
  id: string;
  name: string;
  cluster_type: ClusterType;
  description: string;
  family_ids: string[];
  size: number;
  avg_engagement: number;
  shared_interests: string[];
  created_at: string;
  /** NEW: cross-cluster connections (cluster IDs with overlap strength) */
  connections?: Array<{ cluster_id: string; overlap_strength: number }>;
  /** NEW: identified opportunities within this cluster */
  embedded_opportunities?: OpportunitySynthesis[];
}

export interface QuarterlyInsight {
  id: string;
  year: number;
  period: InsightPeriod;
  summary: string;
  total_members_active: number;
  events_held: number;
  avg_event_attendance: number;
  revenue_total: number;
  top_activities: TopActivity[];
  member_satisfaction_avg: number;
  key_achievements: string[];
  areas_for_improvement: string[];
  recommendations: string[];
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
  /** NEW: synthesized opportunities derived from this quarter's data */
  synthesized_opportunities?: OpportunitySynthesis[];
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: INTERFACES — Synthesis & Intelligence (NEW)
// ═══════════════════════════════════════════════════════════════════════

/** Typed risk level — replaces bare `string` in PricingOptimization */
export enum RiskLevel {
  Low = "low",
  Medium = "medium",
  High = "high",
}

/** Single step in an AI reasoning chain */
export interface ReasoningStep {
  /** Step type: what kind of reasoning this represents */
  type: ReasoningStepType;
  /** Human-readable label (e.g., "Member engagement declining 12%") */
  label: string;
  /** Detailed description of this reasoning step */
  description: string;
  /** Confidence in this step (0-100) */
  confidence: number;
  /** Domain this data came from (optional, for cross-domain steps) */
  source_domain?: SignalSource;
}

/** Complete AI reasoning chain — shows the AI's work */
export interface ReasoningChain {
  /** Unique identifier */
  id: string;
  /** Ordered steps: data → inference → action → outcome */
  steps: ReasoningStep[];
  /** Overall chain confidence (weighted average of steps) */
  overall_confidence: number;
  /** Human-readable summary of the reasoning */
  summary: string;
}

/** Cross-domain signal — bridge between recommendation and another domain */
export interface CrossDomainSignal {
  /** Which domain generated this signal */
  source: SignalSource;
  /** Signal type identifier */
  signal_type: string;
  /** Human-readable description */
  description: string;
  /** Signal urgency (0-100) */
  urgency: number;
  /** Confidence in this signal (0-100) */
  confidence: number;
  /** Related entity ID in the source domain */
  entity_id?: string;
  /** Related entity name for display */
  entity_name?: string;
}

/** Synthesized opportunity — output of cross-domain correlation */
export interface OpportunitySynthesis {
  /** Unique identifier */
  id: string;
  /** Opportunity title (human-readable) */
  title: string;
  /** Detailed description */
  description: string;
  /** Opportunity strength classification */
  level: OpportunityLevel;
  /** Composite score (0-100) combining confidence × impact × feasibility */
  score: number;
  /** Which domains contributed signals to this opportunity */
  source_domains: SignalSource[];
  /** The AI's reasoning chain for this opportunity */
  reasoning_chain: ReasoningChain;
  /** Suggested actions to capitalize on this opportunity */
  suggested_actions: AutonomousAction[];
  /** Time sensitivity: when does this opportunity expire? */
  window_expires_at?: string;
  /** Estimated revenue impact in USD */
  estimated_revenue_impact?: number;
  /** Estimated member impact (families affected) */
  estimated_member_impact?: number;
  /** Timestamp when this synthesis was generated */
  synthesized_at: string;
}

/** Conflict resolution option — one branch of the decision tree */
export interface ConflictResolution {
  /** Unique identifier */
  id: string;
  /** Parent conflict ID */
  conflict_id: string;
  /** Short label (e.g., "Move Event B to 5pm") */
  option_label: string;
  /** Detailed description of this resolution */
  description: string;
  /** Feasibility score (0-100) */
  feasibility_score: number;
  /** Whether the AI recommends this option */
  ai_recommended: boolean;
  /** Trade-offs of choosing this option */
  tradeoffs: string[];
  /** Estimated member satisfaction impact (-100 to +100) */
  satisfaction_impact?: number;
}

/** Autonomous action — ready-to-execute item from the AI brain */
export interface AutonomousAction {
  /** Unique identifier */
  id: string;
  /** Action title (human-readable) */
  title: string;
  /** Detailed description */
  description: string;
  /** Priority classification */
  priority: RecommendationPriority;
  /** Current readiness state */
  readiness: ActionReadiness;
  /** IDs of actions that must complete before this one */
  dependencies: string[];
  /** MCP tool to call for execution */
  tool?: string;
  /** MCP server name */
  server?: string;
  /** Tool parameters */
  params?: Record<string, unknown>;
  /** Approval level required */
  approval_level?: "none" | "standard" | "elevated" | "critical";
  /** Estimated impact description */
  estimated_impact: string;
  /** Impact score (0-100) */
  impact_score: number;
  /** What domain(s) this action affects */
  affected_domains: SignalSource[];
  /** Which opportunity or insight generated this action */
  source_opportunity_id?: string;
  /** Timestamp when this action was generated */
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: INTERFACES — Dashboard Orchestration (NEW)
// ═══════════════════════════════════════════════════════════════════════

/** Dashboard orchestrator state — drives Adaptive Morphism */
export interface RecommendationDashboardState {
  /** Current adaptive mode (computed from data state) */
  mode: RecommendationMode;
  /** Number of actions ready for execution */
  pendingActionCount: number;
  /** Number of high/critical severity conflicts */
  criticalConflictCount: number;
  /** Number of strong/exceptional opportunities */
  highOpportunityCount: number;
  /** Total cross-domain signals received */
  crossDomainSignalCount: number;
  /** Whether the synthesis engine is currently computing */
  isSynthesizing: boolean;
  /** Timestamp of last completed synthesis */
  lastSynthesisAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: INTERFACES — Response Types (10 existing, unchanged)
// ═══════════════════════════════════════════════════════════════════════

export interface PricingListResponse {
  status: string;
  message: string;
  pricings: PricingOptimization[];
}

export interface PricingGetResponse {
  status: string;
  pricing: PricingOptimization;
}

export interface PricingCreateResponse {
  status: string;
  request_id: string;
  message: string;
  details: {
    service_name: string;
    current_price: number;
    suggested_price: number;
    change_pct: string;
    strategy: string;
    risk_level: string;
  };
}

export interface SuggestionsListResponse {
  status: string;
  message: string;
  suggestions: ActivitySuggestion[];
}

export interface SuggestionsGetResponse {
  status: string;
  suggestion: ActivitySuggestion;
}

export interface SuggestionsCreateResponse {
  status: string;
  request_id: string;
  message: string;
  details: {
    name: string;
    target_demographic: string;
    estimated_interest: number;
    estimated_cost: number;
    member_requests_count: number;
  };
}

export interface FamilyRecommendationsResponse {
  status: string;
  message: string;
  recommendations: Recommendation[];
}

export interface PredictAttendanceResponse {
  status: string;
  message: string;
  prediction: AttendancePrediction;
}

export interface SchedulingConflictsResponse {
  status: string;
  message: string;
  conflicts: SchedulingConflict[];
  total_conflicts: number;
}

export interface PersonalizeCommResponse {
  status: string;
  message: string;
  draft: CommunicationDraft;
}

export interface SocialClustersResponse {
  status: string;
  message: string;
  clusters: SocialCluster[];
  total_clusters: number;
}

export interface QuarterlyInsightsListResponse {
  status: string;
  message: string;
  insights: QuarterlyInsight[];
}

export interface QuarterlyInsightGetResponse {
  status: string;
  insight: QuarterlyInsight;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6: CONFIG MAPS — Existing (8 enhanced) + New (6)
// ═══════════════════════════════════════════════════════════════════════

// ── Existing configs (enhanced with predicate fields) ─────────────────

export const RECOMMENDATION_TYPE_CONFIG: Record<
  RecommendationType,
  {
    label: string;
    icon: string;
    color: string;
    /** Which domain this recommendation type connects to */
    signalSource: SignalSource;
  }
> = {
  [RecommendationType.Activity]: {
    label: "Actividad",
    icon: "Dumbbell",
    color: "var(--color-gold-400)",
    signalSource: SignalSource.Sports,
  },
  [RecommendationType.Event]: {
    label: "Evento",
    icon: "CalendarDays",
    color: "var(--color-teal-400)",
    signalSource: SignalSource.Events,
  },
  [RecommendationType.Social]: {
    label: "Social",
    icon: "Users",
    color: "var(--color-sage-400)",
    signalSource: SignalSource.Families,
  },
  [RecommendationType.Dining]: {
    label: "Gastronomía",
    icon: "UtensilsCrossed",
    color: "var(--color-amber-400)",
    signalSource: SignalSource.Internal,
  },
  [RecommendationType.Wellness]: {
    label: "Bienestar",
    icon: "Heart",
    color: "var(--color-emerald-400)",
    signalSource: SignalSource.Wellness,
  },
  [RecommendationType.Sport]: {
    label: "Deporte",
    icon: "Trophy",
    color: "var(--color-terracotta-400)",
    signalSource: SignalSource.Sports,
  },
};

export const PRIORITY_CONFIG: Record<
  RecommendationPriority,
  {
    label: string;
    variant: "default" | "warning" | "danger";
    color: string;
    /** NEW: classifies as high priority for predicates */
    isHigh: boolean;
    /** NEW: classifies as actionable (not background) */
    isActionable: boolean;
    /** NEW: sort weight for display ordering (higher = more urgent) */
    sortOrder: number;
  }
> = {
  [RecommendationPriority.Low]: {
    label: PRIORITY_DISPLAY.low.label,
    variant: "default",
    color: PRIORITY_DISPLAY.low.color,
    isHigh: false,
    isActionable: false,
    sortOrder: 0,
  },
  [RecommendationPriority.Medium]: {
    label: PRIORITY_DISPLAY.medium.label,
    variant: "warning",
    color: PRIORITY_DISPLAY.medium.color,
    isHigh: false,
    isActionable: true,
    sortOrder: 1,
  },
  [RecommendationPriority.High]: {
    label: PRIORITY_DISPLAY.high.label,
    variant: "danger",
    color: PRIORITY_DISPLAY.high.color,
    isHigh: true,
    isActionable: true,
    sortOrder: 2,
  },
  [RecommendationPriority.Urgent]: {
    label: PRIORITY_DISPLAY.urgent.label,
    variant: "danger",
    color: PRIORITY_DISPLAY.urgent.color,
    isHigh: true,
    isActionable: true,
    sortOrder: 3,
  },
};

export const PRICING_STRATEGY_CONFIG: Record<
  PricingStrategy,
  { label: string; description: string; icon: string }
> = {
  [PricingStrategy.DemandBased]: {
    label: "Demanda",
    description: "Ajuste según demanda actual del servicio",
    icon: "TrendingUp",
  },
  [PricingStrategy.Seasonal]: {
    label: "Estacional",
    description: "Variación por temporada del año",
    icon: "Sun",
  },
  [PricingStrategy.MemberTier]: {
    label: "Nivel de Socio",
    description: "Diferenciación por categoría de membresía",
    icon: "Award",
  },
  [PricingStrategy.EventBased]: {
    label: "Evento",
    description: "Precio según tipo y escala del evento",
    icon: "CalendarDays",
  },
  [PricingStrategy.Bundle]: {
    label: "Paquete",
    description: "Descuento por agrupación de servicios",
    icon: "Package",
  },
};

export const CLUSTER_TYPE_CONFIG: Record<
  ClusterType,
  {
    label: string;
    glowColor: string;
    icon: string;
    /** NEW: which signal source this cluster type belongs to */
    signalSource: SignalSource;
  }
> = {
  [ClusterType.Social]: {
    label: "Social",
    glowColor: "var(--color-gold-400)",
    icon: "Users",
    signalSource: SignalSource.Families,
  },
  [ClusterType.Activity]: {
    label: "Actividad",
    glowColor: "var(--color-teal-400)",
    icon: "Dumbbell",
    signalSource: SignalSource.Sports,
  },
  [ClusterType.AgeBased]: {
    label: "Por Edad",
    glowColor: "var(--color-sage-400)",
    icon: "UserCircle",
    signalSource: SignalSource.Families,
  },
  [ClusterType.Interest]: {
    label: "Interés",
    glowColor: "var(--color-terracotta-400)",
    icon: "Sparkles",
    signalSource: SignalSource.Internal,
  },
  [ClusterType.Engagement]: {
    label: "Engagement",
    glowColor: "var(--color-emerald-400)",
    icon: "TrendingUp",
    signalSource: SignalSource.Events,
  },
};

export const CONFLICT_SEVERITY_CONFIG: Record<
  ConflictSeverity,
  {
    label: string;
    variant: "default" | "warning" | "danger";
    color: string;
    /** NEW: classifies as blocking (prevents dependent actions) */
    isBlocking: boolean;
    /** NEW: classifies as urgent (needs immediate resolution) */
    isUrgent: boolean;
    /** NEW: sort weight (higher = more severe) */
    sortOrder: number;
  }
> = {
  [ConflictSeverity.Low]: {
    label: "Baja",
    variant: "default",
    color: "var(--color-silver-400)",
    isBlocking: false,
    isUrgent: false,
    sortOrder: 0,
  },
  [ConflictSeverity.Medium]: {
    label: "Media",
    variant: "warning",
    color: "var(--color-amber-400)",
    isBlocking: false,
    isUrgent: false,
    sortOrder: 1,
  },
  [ConflictSeverity.High]: {
    label: "Alta",
    variant: "danger",
    color: "var(--color-rose-400)",
    isBlocking: true,
    isUrgent: true,
    sortOrder: 2,
  },
  [ConflictSeverity.Critical]: {
    label: "Crítica",
    variant: "danger",
    color: "var(--color-rose-400)",
    isBlocking: true,
    isUrgent: true,
    sortOrder: 3,
  },
};

export const SUGGESTION_STATUS_CONFIG: Record<
  SuggestionStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "danger";
    /** NEW: whether suggestions in this status can be acted upon */
    isActionable: boolean;
    /** NEW: whether this is a terminal state */
    isTerminal: boolean;
  }
> = {
  [SuggestionStatus.Proposed]: {
    label: OPERATION_STATUS_DISPLAY.proposed.label,
    variant: "default",
    isActionable: false,
    isTerminal: false,
  },
  [SuggestionStatus.UnderReview]: {
    label: OPERATION_STATUS_DISPLAY.under_review.label,
    variant: "warning",
    isActionable: false,
    isTerminal: false,
  },
  [SuggestionStatus.Approved]: {
    label: OPERATION_STATUS_DISPLAY.approved.label,
    variant: "success",
    isActionable: true,
    isTerminal: false,
  },
  [SuggestionStatus.Rejected]: {
    label: OPERATION_STATUS_DISPLAY.rejected.label,
    variant: "danger",
    isActionable: false,
    isTerminal: true,
  },
  [SuggestionStatus.Implemented]: {
    label: OPERATION_STATUS_DISPLAY.completed.label,
    variant: "success",
    isActionable: false,
    isTerminal: true,
  },
};

export const CONFIDENCE_CONFIG: Record<
  PredictionConfidence,
  {
    label: string;
    color: string;
    pct: number;
    /** NEW: classifies as high-confidence for predicates */
    isHigh: boolean;
    /** NEW: reliability tier for display */
    reliability: "unreliable" | "moderate" | "reliable";
  }
> = {
  [PredictionConfidence.Low]: {
    label: CONFIDENCE_DISPLAY.low.label,
    color: CONFIDENCE_DISPLAY.low.color,
    pct: CONFIDENCE_DISPLAY.low.pct,
    isHigh: false,
    reliability: "unreliable",
  },
  [PredictionConfidence.Medium]: {
    label: CONFIDENCE_DISPLAY.medium.label,
    color: CONFIDENCE_DISPLAY.medium.color,
    pct: CONFIDENCE_DISPLAY.medium.pct,
    isHigh: false,
    reliability: "moderate",
  },
  [PredictionConfidence.High]: {
    label: CONFIDENCE_DISPLAY.high.label,
    color: CONFIDENCE_DISPLAY.high.color,
    pct: CONFIDENCE_DISPLAY.high.pct,
    isHigh: true,
    reliability: "reliable",
  },
};

export const INSIGHT_PERIOD_CONFIG: Record<
  InsightPeriod,
  { label: string; months: string }
> = {
  [InsightPeriod.Q1]: { label: "Q1", months: "Ene – Mar" },
  [InsightPeriod.Q2]: { label: "Q2", months: "Abr – Jun" },
  [InsightPeriod.Q3]: { label: "Q3", months: "Jul – Sep" },
  [InsightPeriod.Q4]: { label: "Q4", months: "Oct – Dic" },
};

export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    color: string;
    variant: "success" | "warning" | "danger";
    /** NEW: whether this risk level blocks pricing approval */
    isBlocking: boolean;
  }
> = {
  [RiskLevel.Low]: {
    label: "Bajo",
    color: "var(--color-emerald-400)",
    variant: "success",
    isBlocking: false,
  },
  [RiskLevel.Medium]: {
    label: "Medio",
    color: "var(--color-amber-400)",
    variant: "warning",
    isBlocking: false,
  },
  [RiskLevel.High]: {
    label: "Alto",
    color: "var(--color-rose-400)",
    variant: "danger",
    isBlocking: true,
  },
};

// ── New 2027 configs ──────────────────────────────────────────────────

export const RECOMMENDATION_MODE_CONFIG: Record<
  RecommendationMode,
  {
    label: string;
    description: string;
    icon: string;
    /** Layout density factor: 1 = spacious, 1.5 = compact, 2 = dense */
    densityFactor: number;
  }
> = {
  [RecommendationMode.Observe]: {
    label: "Observar",
    description: "Vista panorámica. Sin urgencia detectada.",
    icon: "Eye",
    densityFactor: 1,
  },
  [RecommendationMode.Analyze]: {
    label: "Analizar",
    description: "Datos densos. Insights requieren atención.",
    icon: "Microscope",
    densityFactor: 1.5,
  },
  [RecommendationMode.Act]: {
    label: "Actuar",
    description: "Acciones pendientes. Ventanas de oportunidad cerrándose.",
    icon: "Zap",
    densityFactor: 2,
  },
};

export const ACTION_READINESS_CONFIG: Record<
  ActionReadiness,
  {
    label: string;
    color: string;
    icon: string;
    /** Whether this action can be executed right now */
    isExecutable: boolean;
    /** Sort priority (lower = earlier in queue) */
    sortOrder: number;
  }
> = {
  [ActionReadiness.Ready]: {
    label: "Listo",
    color: "var(--color-emerald-400)",
    icon: "CheckCircle2",
    isExecutable: true,
    sortOrder: 0,
  },
  [ActionReadiness.AwaitingApproval]: {
    label: "Aprobación pendiente",
    color: "var(--color-amber-400)",
    icon: "Clock",
    isExecutable: false,
    sortOrder: 1,
  },
  [ActionReadiness.DataPending]: {
    label: "Datos pendientes",
    color: "var(--color-silver-400)",
    icon: "Database",
    isExecutable: false,
    sortOrder: 2,
  },
  [ActionReadiness.ConflictBlocked]: {
    label: "Bloqueado por conflicto",
    color: "var(--color-rose-400)",
    icon: "ShieldAlert",
    isExecutable: false,
    sortOrder: 3,
  },
};

export const OPPORTUNITY_LEVEL_CONFIG: Record<
  OpportunityLevel,
  {
    label: string;
    color: string;
    glowColor: string;
    /** Whether this level warrants immediate attention */
    isCritical: boolean;
    /** Sort weight (higher = more important) */
    sortOrder: number;
  }
> = {
  [OpportunityLevel.Exceptional]: {
    label: "Excepcional",
    color: "var(--color-gold-400)",
    glowColor: "var(--color-gold-400)",
    isCritical: true,
    sortOrder: 3,
  },
  [OpportunityLevel.Strong]: {
    label: "Fuerte",
    color: "var(--color-emerald-400)",
    glowColor: "var(--color-emerald-400)",
    isCritical: false,
    sortOrder: 2,
  },
  [OpportunityLevel.Moderate]: {
    label: "Moderado",
    color: "var(--color-teal-400)",
    glowColor: "var(--color-teal-400)",
    isCritical: false,
    sortOrder: 1,
  },
  [OpportunityLevel.Low]: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    glowColor: "var(--color-silver-400)",
    isCritical: false,
    sortOrder: 0,
  },
};

export const REASONING_STEP_CONFIG: Record<
  ReasoningStepType,
  {
    label: string;
    icon: string;
    color: string;
    /** Step position in the reasoning flow */
    position: number;
  }
> = {
  [ReasoningStepType.Data]: {
    label: "Dato",
    icon: "Database",
    color: "var(--color-teal-400)",
    position: 0,
  },
  [ReasoningStepType.Inference]: {
    label: "Inferencia",
    icon: "Brain",
    color: "var(--color-violet-400)",
    position: 1,
  },
  [ReasoningStepType.Action]: {
    label: "Acción",
    icon: "Target",
    color: "var(--color-gold-400)",
    position: 2,
  },
  [ReasoningStepType.Outcome]: {
    label: "Resultado",
    icon: "TrendingUp",
    color: "var(--color-emerald-400)",
    position: 3,
  },
};

export const SIGNAL_SOURCE_CONFIG: Record<
  SignalSource,
  {
    label: string;
    icon: string;
    color: string;
    /** Route path for navigation from cross-domain links */
    route: string;
  }
> = {
  [SignalSource.Wellness]: {
    label: "Bienestar",
    icon: "Heart",
    color: "var(--color-emerald-400)",
    route: "/admin/wellness",
  },
  [SignalSource.Events]: {
    label: "Eventos",
    icon: "CalendarDays",
    color: "var(--color-teal-400)",
    route: "/admin/events",
  },
  [SignalSource.Finance]: {
    label: "Finanzas",
    icon: "DollarSign",
    color: "var(--color-gold-400)",
    route: "/admin/finance",
  },
  [SignalSource.Sports]: {
    label: "Deportes",
    icon: "Trophy",
    color: "var(--color-terracotta-400)",
    route: "/admin/sports",
  },
  [SignalSource.Families]: {
    label: "Familias",
    icon: "Users",
    color: "var(--color-sage-400)",
    route: "/admin/families",
  },
  [SignalSource.Internal]: {
    label: "Interno",
    icon: "Cpu",
    color: "var(--color-silver-400)",
    route: "/admin/recommendations",
  },
};

export const DRAFT_STATUS_CONFIG: Record<
  DraftStatus,
  {
    label: string;
    variant: "default" | "warning" | "success";
    icon: string;
  }
> = {
  [DraftStatus.Draft]: {
    label: "Borrador",
    variant: "default",
    icon: "FileEdit",
  },
  [DraftStatus.Reviewed]: {
    label: "Revisado",
    variant: "warning",
    icon: "Eye",
  },
  [DraftStatus.Sent]: {
    label: "Enviado",
    variant: "success",
    icon: "Send",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7: PREDICATES — Config-Derived (Golden Rule)
// ═══════════════════════════════════════════════════════════════════════

/** Classifies priority as high or urgent */
export const isHighPriority = (p: RecommendationPriority): boolean =>
  PRIORITY_CONFIG[p].isHigh;

/** Classifies priority as actionable (not background) */
export const isActionablePriority = (p: RecommendationPriority): boolean =>
  PRIORITY_CONFIG[p].isActionable;

/** Classifies conflict severity as blocking dependent actions */
export const isBlockingConflict = (s: ConflictSeverity): boolean =>
  CONFLICT_SEVERITY_CONFIG[s].isBlocking;

/** Classifies conflict severity as requiring immediate resolution */
export const isUrgentConflict = (s: ConflictSeverity): boolean =>
  CONFLICT_SEVERITY_CONFIG[s].isUrgent;

/** Classifies prediction confidence as reliable */
export const isHighConfidence = (c: PredictionConfidence): boolean =>
  CONFIDENCE_CONFIG[c].isHigh;

/** Classifies action readiness as executable now */
export const isReadyToExecute = (r: ActionReadiness): boolean =>
  ACTION_READINESS_CONFIG[r].isExecutable;

/** Classifies opportunity level as warranting immediate attention */
export const isStrongOpportunity = (l: OpportunityLevel): boolean =>
  OPPORTUNITY_LEVEL_CONFIG[l].isCritical;

/** Classifies suggestion status as actionable */
export const isActionableStatus = (s: SuggestionStatus): boolean =>
  SUGGESTION_STATUS_CONFIG[s].isActionable;

/** Classifies suggestion status as terminal (no further transitions) */
export const isTerminalStatus = (s: SuggestionStatus): boolean =>
  SUGGESTION_STATUS_CONFIG[s].isTerminal;

/** Classifies pricing risk as blocking approval */
export const isBlockingRisk = (r: RiskLevel): boolean =>
  RISK_LEVEL_CONFIG[r].isBlocking;

/** Sorts by priority (highest first) */
export const sortByPriority = <T extends { priority: RecommendationPriority }>(
  items: T[],
): T[] =>
  [...items].sort(
    (a, b) =>
      PRIORITY_CONFIG[b.priority].sortOrder -
      PRIORITY_CONFIG[a.priority].sortOrder,
  );

/** Sorts by conflict severity (most severe first) */
export const sortBySeverity = <T extends { severity: ConflictSeverity }>(
  items: T[],
): T[] =>
  [...items].sort(
    (a, b) =>
      CONFLICT_SEVERITY_CONFIG[b.severity].sortOrder -
      CONFLICT_SEVERITY_CONFIG[a.severity].sortOrder,
  );

// ═══════════════════════════════════════════════════════════════════════
// SECTION 8: HELPERS — Existing (3) + New (4)
// ═══════════════════════════════════════════════════════════════════════

// ── Existing helpers ──────────────────────────────────────────────────

export function calculatePriceChangePct(
  current: number,
  suggested: number,
): number {
  if (current <= 0) return 0;
  return ((suggested - current) / current) * 100;
}

export function formatPriceChangePct(
  current: number,
  suggested: number,
): string {
  const pct = calculatePriceChangePct(current, suggested);
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** @deprecated Use RISK_LEVEL_CONFIG[risk_level] instead */
export function getRiskLevelConfig(level: string): {
  label: string;
  color: string;
  variant: "success" | "warning" | "danger";
} {
  const entry = RISK_LEVEL_CONFIG[level as RiskLevel];
  if (entry) return entry;
  return RISK_LEVEL_CONFIG[RiskLevel.Medium];
}

// ── New 2027 helpers ─────────────────────────────────────────────────

/** Calculate composite opportunity score (confidence × impact × feasibility) */
export function calculateOpportunityScore(
  confidence: number,
  impactScore: number,
  feasibilityScore: number = 100,
): number {
  return Math.round(
    (confidence * 0.3 + impactScore * 0.5 + feasibilityScore * 0.2),
  );
}

/** Classify opportunity score into level */
export function classifyOpportunityLevel(score: number): OpportunityLevel {
  if (score >= 90) return OpportunityLevel.Exceptional;
  if (score >= 70) return OpportunityLevel.Strong;
  if (score >= 40) return OpportunityLevel.Moderate;
  return OpportunityLevel.Low;
}

/** Derive dashboard mode from system state */
export function deriveRecommendationMode(state: {
  criticalConflictCount: number;
  highOpportunityCount: number;
  pendingActionCount: number;
}): RecommendationMode {
  if (state.criticalConflictCount > 0 || state.pendingActionCount >= 3) {
    return RecommendationMode.Act;
  }
  if (state.highOpportunityCount > 0 || state.pendingActionCount > 0) {
    return RecommendationMode.Analyze;
  }
  return RecommendationMode.Observe;
}

/** Build a cross-domain signal (factory) */
export function buildCrossDomainSignal(
  source: SignalSource,
  signalType: string,
  description: string,
  urgency: number,
  confidence: number,
  entityId?: string,
  entityName?: string,
): CrossDomainSignal {
  return {
    source,
    signal_type: signalType,
    description,
    urgency: Math.max(0, Math.min(100, urgency)),
    confidence: Math.max(0, Math.min(100, confidence)),
    entity_id: entityId,
    entity_name: entityName,
  };
}