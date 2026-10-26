// ═══════════════════════════════════════════════════════════════════════
// Member360 Intelligence — Unified Type System
// Phase 30 — Block 0.1: The Foundation
// ═══════════════════════════════════════════════════════════════════════
//
// Source of truth for ALL Member 360 data structures.
// Unifies: types.ts (Fase 14c) + member360-types.ts
//
// Architecture:
// §1  Imports & Re-exports
// §2  Domain Enums
// §3  Member State Machine
// §4  Temperature System
// §5  Vital Signs
// §6  Cross-Domain Signals
// §7  Predictive Windows
// §8  Decision Engine
// §9  Narrative System
// §10 Engagement DNA
// §11 Display Configs
// §12 Entity Interfaces
// §13 Tool Response Interfaces (10)
// §14 Advisor Types
// §15 Transform Helpers
// §16 Type Guards
// ═══════════════════════════════════════════════════════════════════════

import {
  type ChurnRiskLevel,
  type TrendDirection,
  type SeverityLevel,
  CHURN_RISK_LEVEL_DISPLAY,
  TIER_DISPLAY,
} from "@/shared/types/domain-enums";
import { getScoreColorHex, SCORE_PRESETS } from "@/shared/lib/score-utils";

// ═══════════════════════════════════════════════════════════════════════
// §1  RE-EXPORTS FROM CONTRACTS
// ═══════════════════════════════════════════════════════════════════════

export type {
  HealthDimension,
  FamilyHealthScore,
  HealthScoreDistribution,
  HealthScoreTrendPoint,
  HealthFactorImportance,
  MembersHealthScoreData,
  members_health_score_Contract as MembersHealthScoreResponse,
  MemberSegment,
  SegmentPersona,
  SegmentMigration,
  SegmentRevenueBreakdown,
  CampaignReadiness,
  MembersSegmentationData,
  members_segmentation_Contract as MembersSegmentationResponse,
  FamilyLTV,
  LTVDistribution,
  LTVSensitivityFactor,
  MonteCarloDataPoint,
  LTVByTier,
  LTVPaybackPoint,
  MembersLifetimeValueData,
  members_lifetime_value_Contract as MembersLifetimeValueResponse,
  members_churn_prevention_Contract as MembersChurnPreventionResponse,
  MembersChurnPreventionData,
  ChurnRiskFamily,
  ChurnIntervention,
  ChurnRiskFactor,
  HistoricalSave,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════════════════
// §2  DOMAIN ENUMS
// ═══════════════════════════════════════════════════════════════════════

/** Journey lifecycle stages — 8 states from signup to win-back */
export const JOURNEY_STAGES = [
  "new_member", "onboarding", "active", "engaged",
  "at_risk", "dormant", "churned", "win_back",
] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

/** Activity domains — 12 cross-domain coverage */
export const ACTIVITY_DOMAINS = [
  "events", "sports", "wellness", "cultural", "dining",
  "social", "guest_management", "communications",
  "families", "age_group", "facilities", "recommendations",
] as const;
export type ActivityDomain = (typeof ACTIVITY_DOMAINS)[number];

/** Sources that contribute to risk assessment */
export const RISK_FACTOR_SOURCES = [
  "financial", "engagement", "social", "wellness",
  "satisfaction", "lifecycle", "communication", "events",
] as const;
export type RiskFactorSource = (typeof RISK_FACTOR_SOURCES)[number];

/** Engagement proposal categories */
export const ENGAGEMENT_PROPOSAL_TYPES = [
  "activity_recommendation", "social_connection", "retention_campaign",
  "tier_upgrade", "cross_domain", "milestone_celebration",
  "wellness_program", "cultural_invitation",
] as const;
export type EngagementProposalType = (typeof ENGAGEMENT_PROPOSAL_TYPES)[number];

/** Vital sign dimensions — 6 Portrait rings */
export const VITAL_SIGN_NAMES = [
  "engagement", "financial", "social", "satisfaction", "activity", "wellness",
] as const;
export type VitalSignName = (typeof VITAL_SIGN_NAMES)[number];

/** Backward compat alias — 5 original health factors */
export const HEALTH_FACTOR_NAMES = [
  "engagement", "financial", "social", "satisfaction", "activity",
] as const;
export type HealthFactorName = (typeof HEALTH_FACTOR_NAMES)[number];

/** LTV classification tiers */
export const LTV_TIERS = [
  "high_value", "standard", "low_value", "negative_trend",
] as const;
export type LTVTier = (typeof LTV_TIERS)[number];

/** Social cluster archetypes */
export const SOCIAL_CLUSTER_TYPES = [
  "sports_enthusiasts", "cultural_aficionados", "social_butterflies",
  "wellness_focused", "family_oriented", "executive_network",
] as const;
export type SocialClusterType = (typeof SOCIAL_CLUSTER_TYPES)[number];

/** Member search sort options */
export const MEMBER_SEARCH_SORTS = [
  "health_score_desc", "health_score_asc", "churn_risk_desc",
  "ltv_desc", "name_asc", "tier_desc", "engagement_desc",
] as const;
export type MemberSearchSort = (typeof MEMBER_SEARCH_SORTS)[number];

// ═══════════════════════════════════════════════════════════════════════
// §3  MEMBER STATE MACHINE
//
// The emotional state of a member. Not a metric — a feeling.
// Each state has a temperature range, visual identity, and valid
// transitions. The system CANNOT jump from thriving to disengaging
// in one step — there are intermediate states that demand attention.
// ═══════════════════════════════════════════════════════════════════════

export const MEMBER_STATES = [
  "thriving", "stable", "drifting", "at_risk", "disengaging",
] as const;
export type MemberState = (typeof MEMBER_STATES)[number];

export const MEMBER_STATE_DISPLAY: Record<
  MemberState,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
    temperatureRange: [number, number];
    description: string;
  }
> = {
  thriving: {
    label: "Floreciente",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 15%, transparent)",
    icon: "✦",
    temperatureRange: [85, 100],
    description: "Compromiso diverso y consistente — embajador del club",
  },
  stable: {
    label: "Estable",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 15%, transparent)",
    icon: "◆",
    temperatureRange: [65, 84],
    description: "Participación regular sin señales de riesgo",
  },
  drifting: {
    label: "A la Deriva",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 15%, transparent)",
    icon: "◇",
    temperatureRange: [45, 64],
    description: "Descenso de participación — necesita re-engagement proactivo",
  },
  at_risk: {
    label: "En Riesgo",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 15%, transparent)",
    icon: "◈",
    temperatureRange: [25, 44],
    description: "Múltiples señales de alerta — ventana de intervención activa",
  },
  disengaging: {
    label: "Desvinculándose",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
    icon: "●",
    temperatureRange: [0, 24],
    description: "Churn inminente — intervención inmediata o estrategia win-back",
  },
};

/** Valid state transitions — the system enforces natural drift paths */
export const MEMBER_STATE_TRANSITIONS: Record<MemberState, MemberState[]> = {
  thriving:    ["stable"],
  stable:      ["thriving", "drifting"],
  drifting:    ["stable", "at_risk", "thriving"],
  at_risk:     ["drifting", "disengaging", "stable"],
  disengaging: ["at_risk", "drifting"],
};

// ═══════════════════════════════════════════════════════════════════════
// §4  TEMPERATURE SYSTEM
//
// Member Temperature is THE number the director sees.
// It's not static — it has physics:
//   - Core: long-term, slow-moving (vital signs composite)
//   - Surface: short-term, reactive (last 7 days)
//   - Ambient: club average (baseline for comparison)
//   - Momentum: velocity + acceleration + thermal mass
//
// The Portrait orb shows core as steady glow.
// Surface is the reactive halo around it.
// A ghost ring shows ambient for comparison.
// Momentum drives animation speed and direction.
// ═══════════════════════════════════════════════════════════════════════

export type TemperatureZone = "hot" | "warm" | "neutral" | "cool" | "cold";

export const TEMPERATURE_ZONE_DISPLAY: Record<
  TemperatureZone,
  { label: string; color: string; gradient: string }
> = {
  hot: {
    label: "Caliente",
    color: "var(--color-emerald-400)",
    gradient: "linear-gradient(135deg, var(--color-emerald-400), var(--color-teal-300))",
  },
  warm: {
    label: "Tibio",
    color: "var(--color-teal-400)",
    gradient: "linear-gradient(135deg, var(--color-teal-400), var(--color-teal-200))",
  },
  neutral: {
    label: "Neutro",
    color: "var(--color-silver-300)",
    gradient: "linear-gradient(135deg, var(--color-silver-300), var(--color-silver-200))",
  },
  cool: {
    label: "Frío",
    color: "var(--color-amber-400)",
    gradient: "linear-gradient(135deg, var(--color-amber-400), var(--color-terracotta-300))",
  },
  cold: {
    label: "Gélido",
    color: "var(--color-rose-400)",
    gradient: "linear-gradient(135deg, var(--color-rose-400), var(--color-rose-300))",
  },
};

/** Multi-layer temperature reading */
export interface TemperatureReading {
  /** Core — long-term, derived from vital signs (0-100) */
  core: number;
  /** Surface — short-term, last 7 days activity (0-100) */
  surface: number;
  /** Ambient — club average baseline */
  ambient: number;
  /** Relative: surface - ambient (positive = above average) */
  relative: number;
}

/** Physics of engagement change */
export interface MemberMomentum {
  /** Rate of change: -1 (declining fast) to +1 (improving fast) */
  velocity: number;
  /** Is change accelerating or decelerating? -1 to +1 */
  acceleration: number;
  /** Resistance to change: higher = more stable (tenure, connections, tier) */
  thermalMass: number;
  /** Predicted state in 30 days based on current trajectory */
  trajectory30d: MemberState;
  /** Predicted state in 90 days */
  trajectory90d: MemberState;
}

/** THE number — composite temperature with full context */
export interface MemberTemperature {
  /** Composite score 0-100 — the single number the director sees */
  composite: number;
  /** Individual dimension contributions */
  dimensions: Record<VitalSignName, number>;
  /** Full reading with core/surface/ambient */
  reading: TemperatureReading;
  /** Emotional state derived from composite */
  state: MemberState;
  /** Temperature zone for visual rendering */
  zone: TemperatureZone;
  /** Movement physics */
  momentum: MemberMomentum;
  /** Trend direction */
  trend: TrendDirection;
  /** When was this computed */
  computedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// §5  VITAL SIGNS
//
// Each dimension of the Portrait ring is a vital sign.
// Like a patient monitor: value, normal range, status, trend.
// Sub-factors enable drill-down without leaving the visualization.
// ═══════════════════════════════════════════════════════════════════════

export interface VitalSign {
  /** Dimension name */
  name: VitalSignName;
  /** Current value 0-100 */
  value: number;
  /** Weight in temperature composite calculation */
  weight: number;
  /** Normal range [min, max] — outside triggers alerts */
  normalRange: [number, number];
  /** Current status */
  status: "thriving" | "normal" | "elevated" | "critical";
  /** Trend direction */
  trend: TrendDirection;
  /** Last measurement timestamp */
  lastReading: string;
  /** Human-readable detail */
  detail?: string;
  /** Sub-factors for drill-down */
  subFactors?: Array<{ name: string; value: number; weight: number }>;
}

// ═══════════════════════════════════════════════════════════════════════
// §6  CROSS-DOMAIN SIGNALS
//
// How the 12 domains communicate with Member360.
// Each domain emits signals. When multiple domains agree,
// SignalResonance amplifies confidence — like instruments
// playing the same note.
// ═══════════════════════════════════════════════════════════════════════

export type SignalStatus = "positive" | "neutral" | "warning" | "critical";

/** A signal emitted by a domain about a specific member */
export interface DomainSignal {
  /** Source domain */
  domain: ActivityDomain;
  /** Human-readable signal description */
  signal: string;
  /** Numeric value (domain-specific scale) */
  value: number;
  /** Signal direction */
  direction: "positive" | "neutral" | "negative";
  /** Severity level */
  severity: SeverityLevel;
  /** When the signal was emitted */
  timestamp: string;
  /** Confidence in signal accuracy (0-1) */
  confidence: number;
  /** Whether this signal has an associated action */
  actionable: boolean;
  /** Associated MCP tool (if actionable) */
  tool?: string;
}

/** Multi-domain agreement amplification */
export interface SignalResonance {
  /** How many domains agree on direction */
  agreementCount: number;
  /** Total domains reporting */
  totalDomains: number;
  /** Agreement classification */
  agreement: "unanimous" | "majority" | "split" | "conflicting";
  /** Amplified confidence (0-1) — higher when domains agree */
  amplifiedConfidence: number;
  /** Contributing domains */
  contributingDomains: ActivityDomain[];
  /** The shared signal direction */
  sharedDirection: "positive" | "neutral" | "negative";
}

// ═══════════════════════════════════════════════════════════════════════
// §7  PREDICTIVE WINDOWS
//
// Predictions have a shelf life. A churn prediction from 30 days ago
// is less reliable than one from today. The decay rate models this.
// Windows have 4 states: open → closing → imminent → closed.
// Each state drives urgency in the UI.
// ═══════════════════════════════════════════════════════════════════════

export type WindowStatus = "open" | "closing" | "imminent" | "closed";

export const WINDOW_STATUS_DISPLAY: Record<
  WindowStatus,
  { label: string; color: string; urgency: "none" | "low" | "medium" | "high" | "critical" }
> = {
  open:     { label: "Ventana Abierta",    color: "var(--color-emerald-400)",      urgency: "none" },
  closing:  { label: "Cerrándose",         color: "var(--color-amber-400)",        urgency: "medium" },
  imminent: { label: "Casi Cerrada",       color: "var(--color-terracotta-400)",   urgency: "high" },
  closed:   { label: "Cerrada",            color: "var(--color-rose-400)",         urgency: "critical" },
};

/** Temporal intervention framework */
export interface PredictiveWindow {
  /** What metric is being predicted */
  metric: string;
  /** Current value */
  current: number;
  /** Predicted value at horizon */
  predicted: number;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Days until prediction materializes */
  horizonDays: number;
  /** Optimal intervention deadline (ISO date) */
  interventionDeadline?: string;
  /** Current window status */
  status: WindowStatus;
  /** Confidence decay rate per day (0-1) */
  decayRate: number;
  /** Days remaining in optimal intervention window */
  daysRemaining?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// §8  DECISION ENGINE
//
// Interventions aren't single actions — they're arcs with checkpoints.
// An arc has: strategy → checkpoints (day X, expect Y) → escalation.
// If checkpoint fails, escalate to fallback arc.
// The system knows WHAT to do, WHEN, and WHAT IF it doesn't work.
// ═══════════════════════════════════════════════════════════════════════

export type DecisionPriority = "immediate" | "this_week" | "this_month" | "scheduled";

/** A milestone within an intervention to validate progress */
export interface InterventionCheckpoint {
  /** Day offset from intervention start */
  dayOffset: number;
  /** What metric to check */
  metric: string;
  /** Expected value at this checkpoint */
  expectedValue: number;
  /** Acceptable tolerance */
  tolerance: number;
  /** Action if checkpoint fails */
  escalationAction?: string;
}

/** Full intervention strategy with validation checkpoints */
export interface InterventionArc {
  /** Strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Ordered checkpoints to validate progress */
  checkpoints: InterventionCheckpoint[];
  /** Success criteria description */
  successCriteria: string;
  /** MCP tool to execute */
  tool?: string;
  /** Tool parameters */
  params?: Record<string, unknown>;
  /** Expected duration in days */
  durationDays: number;
}

/** Decision template — what to do for each member state */
export interface DecisionTemplate {
  /** Which member state triggers this template */
  state: MemberState;
  /** Temperature range this applies to */
  tempRange: [number, number];
  /** Primary intervention strategy */
  primaryArc: InterventionArc;
  /** Fallback if primary fails */
  fallbackArc?: InterventionArc;
  /** Days before escalating to fallback */
  escalationDays: number;
  /** Approval level required */
  approvalLevel: "auto" | "semi" | "hitl" | "always_human";
}

// ═══════════════════════════════════════════════════════════════════════
// §9  NARRATIVE SYSTEM
//
// The AI briefing follows dramatic structure:
//   Act I  — Context: What's happening with this member
//   Act II — Tension: What's at risk, what's declining
//   Act III — Resolution: What to do, with urgency and window
//
// Each section is typed and sourced to a domain.
// The typing engine renders each act at different speeds.
// ═══════════════════════════════════════════════════════════════════════

export type NarrativeAct = "context" | "tension" | "resolution";

/** A section of the AI-generated member briefing */
export interface NarrativeSection {
  /** Act in the narrative structure */
  act: NarrativeAct;
  /** Section text content */
  text: string;
  /** Confidence in this narrative (0-1) */
  confidence: number;
  /** Source domain that generated this section */
  source: ActivityDomain;
  /** Supporting signal descriptions */
  signals: string[];
  /** Typing speed override (chars per second, default 55) */
  typingSpeed?: number;
}

/** Complete AI briefing for a member */
export interface MemberNarrative {
  /** Ordered narrative sections */
  sections: NarrativeSection[];
  /** Member temperature at time of generation */
  temperature: number;
  /** Member state at time of generation */
  state: MemberState;
  /** When generated */
  generatedAt: string;
  /** When this narrative expires */
  expiresAt: string;
  /** Overall confidence (0-1) */
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════
// §10 ENGAGEMENT DNA
//
// Each member has a behavioral "genetic code":
// - Which channels they engage through (and how strongly)
// - Patterns that repeat (sequences)
// - Changes in pattern (mutations)
// - Which behaviors are active vs dormant (expression)
// ═══════════════════════════════════════════════════════════════════════

/** A channel in the member's engagement DNA helix */
export interface EngagementDNAChannel {
  /** Activity domain */
  domain: ActivityDomain;
  /** Interactions per month */
  frequency: number;
  /** Depth of engagement (0-1) */
  strength: number;
  /** Last time this channel was active */
  lastActive: string;
  /** Whether this is a preferred channel */
  preferred: boolean;
  /** Trend in this channel */
  trend: TrendDirection;
  /** Predicted next interaction date */
  nextPredicted?: string;
  /** Recency-weighted score (decays over time) */
  recencyScore: number;
}

// ═══════════════════════════════════════════════════════════════════════
// §11 DISPLAY CONFIGS
// ═══════════════════════════════════════════════════════════════════════

/** Journey stage display config */
export const JOURNEY_STAGE_DISPLAY: Record<
  JourneyStage,
  { label: string; color: string; bgColor: string }
> = {
  new_member:  { label: "Nuevo Socio",     color: "var(--color-teal-400)",        bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)" },
  onboarding:  { label: "Onboarding",       color: "var(--color-gold-400)",        bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)" },
  active:      { label: "Activo",           color: "var(--color-emerald-400)",     bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)" },
  engaged:     { label: "Comprometido",     color: "var(--color-emerald-300)",     bgColor: "color-mix(in srgb, var(--color-emerald-300) 12%, transparent)" },
  at_risk:     { label: "En Riesgo",        color: "var(--color-amber-400)",       bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)" },
  dormant:     { label: "Inactivo",         color: "var(--color-silver-400)",      bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)" },
  churned:     { label: "Perdido",          color: "var(--color-rose-400)",        bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)" },
  win_back:    { label: "Reconectando",     color: "var(--color-terracotta-400)",  bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)" },
};

/** Activity domain display config — 12 domains */
export const ACTIVITY_DOMAIN_DISPLAY: Record<
  ActivityDomain,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  events:           { label: "Eventos",          icon: "📅", color: "var(--color-gold-400)",        bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)" },
  sports:           { label: "Deportes",         icon: "🎾", color: "var(--color-teal-400)",        bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)" },
  wellness:         { label: "Bienestar",        icon: "🧘", color: "var(--color-emerald-400)",     bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)" },
  cultural:         { label: "Cultural",         icon: "🎭", color: "var(--color-gold-300)",        bgColor: "color-mix(in srgb, var(--color-gold-300) 12%, transparent)" },
  dining:           { label: "Gastronomía",      icon: "🍽️", color: "var(--color-terracotta-400)", bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)" },
  social:           { label: "Social",           icon: "🤝", color: "var(--color-silver-200)",      bgColor: "color-mix(in srgb, var(--color-silver-200) 12%, transparent)" },
  guest_management: { label: "Invitados",        icon: "🎫", color: "var(--color-amber-400)",       bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)" },
  communications:   { label: "Comunicaciones",   icon: "📨", color: "var(--color-sage-400)",        bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)" },
  families:         { label: "Familias",         icon: "👨‍👩‍👧‍👦", color: "var(--color-gold-200)",  bgColor: "color-mix(in srgb, var(--color-gold-200) 12%, transparent)" },
  age_group:        { label: "Grupo Etario",     icon: "👥", color: "var(--color-teal-300)",        bgColor: "color-mix(in srgb, var(--color-teal-300) 12%, transparent)" },
  facilities:       { label: "Instalaciones",    icon: "🏛️", color: "var(--color-silver-300)",   bgColor: "color-mix(in srgb, var(--color-silver-300) 12%, transparent)" },
  recommendations:  { label: "Recomendaciones",  icon: "💡", color: "var(--color-teal-200)",        bgColor: "color-mix(in srgb, var(--color-teal-200) 12%, transparent)" },
};

/** Engagement proposal display config */
export const ENGAGEMENT_PROPOSAL_TYPE_DISPLAY: Record<
  EngagementProposalType,
  { label: string; icon: string; color: string }
> = {
  activity_recommendation: { label: "Recomendación",       icon: "💡", color: "var(--color-teal-400)" },
  social_connection:       { label: "Conexión Social",     icon: "🤝", color: "var(--color-emerald-400)" },
  retention_campaign:      { label: "Retención",           icon: "🛡️", color: "var(--color-rose-400)" },
  tier_upgrade:            { label: "Upgrade de Tier",     icon: "⬆️", color: "var(--color-gold-400)" },
  cross_domain:            { label: "Cross-Domain",        icon: "🔗", color: "var(--color-teal-300)" },
  milestone_celebration:   { label: "Celebración",         icon: "🎉", color: "var(--color-gold-300)" },
  wellness_program:        { label: "Bienestar",           icon: "🧘", color: "var(--color-emerald-300)" },
  cultural_invitation:     { label: "Invitación Cultural", icon: "🎭", color: "var(--color-gold-200)" },
};

/** Vital sign display config — 6 dimensions with Portrait ring colors */
export const VITAL_SIGN_DISPLAY: Record<
  VitalSignName,
  { label: string; icon: string; color: string; weight: number; normalRange: [number, number] }
> = {
  engagement:   { label: "Engagement",    icon: "📊", color: "var(--color-gold-400)",       weight: 0.25, normalRange: [50, 100] },
  financial:    { label: "Financiero",     icon: "💰", color: "var(--color-emerald-400)",    weight: 0.20, normalRange: [40, 100] },
  social:       { label: "Social",         icon: "🤝", color: "var(--color-teal-400)",       weight: 0.18, normalRange: [35, 100] },
  satisfaction: { label: "Satisfacción",   icon: "⭐", color: "var(--color-amber-400)",      weight: 0.17, normalRange: [45, 100] },
  activity:     { label: "Actividad",      icon: "🏃", color: "var(--color-terracotta-400)", weight: 0.12, normalRange: [30, 100] },
  wellness:     { label: "Bienestar",      icon: "🧘", color: "var(--color-sage-400)",       weight: 0.08, normalRange: [25, 100] },
};

/** Backward compat alias */
export const HEALTH_FACTOR_DISPLAY: Record<
  HealthFactorName,
  { label: string; icon: string; color: string; weight: number }
> = {
  engagement:   VITAL_SIGN_DISPLAY.engagement,
  financial:    VITAL_SIGN_DISPLAY.financial,
  social:       VITAL_SIGN_DISPLAY.social,
  satisfaction: VITAL_SIGN_DISPLAY.satisfaction,
  activity:     VITAL_SIGN_DISPLAY.activity,
};

/** Segment chart colors */
export const SEGMENT_COLORS: Record<string, string> = {
  deportivos: "#2A9AB5",
  sociales: "#C9A96E",
  ejecutivos: "#B8C0CC",
  familiares: "#3DAA70",
  invisibles: "#C46470",
};

/** Dimension chart colors — 6 for Portrait */
export const DIMENSION_COLORS: Record<string, string> = {
  engagement: "#C9A96E",
  financial: "#3DAA70",
  social: "#2A9AB5",
  satisfaction: "#D4A840",
  activity: "#B87A5E",
  wellness: "#6BA580",
};

/** Risk level config — maps to MemberState for visual consistency */
export const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; color: string; hex: string }
> = {
  critical: { label: "Crítico",     color: "var(--color-rose-400)",     hex: "#C46470" },
  high:     { label: "Alto",        color: "var(--color-terracotta-400)", hex: "#B87A5E" },
  medium:   { label: "Medio",       color: "var(--color-amber-400)",    hex: "#D4A840" },
  low:      { label: "Bajo",        color: "var(--color-silver-400)",   hex: "#8A95A5" },
  healthy:  { label: "Saludable",   color: "var(--color-emerald-400)",  hex: "#3DAA70" },
};

/** Tier display config with hex for Recharts */
export const TIER_CONFIG: Record<
  string,
  { label: string; color: string; hex: string }
> = {
  Platinum: { label: TIER_DISPLAY.platino.label, color: TIER_DISPLAY.platino.color, hex: "#C9A96E" },
  Gold:     { label: TIER_DISPLAY.oro.label,     color: TIER_DISPLAY.oro.color,     hex: "#D4A840" },
  Silver:   { label: TIER_DISPLAY.plata.label,   color: TIER_DISPLAY.plata.color,   hex: "#B8C0CC" },
  basic:    { label: TIER_DISPLAY.basic.label,    color: TIER_DISPLAY.basic.color,    hex: "#8A95A5" },
  premium:  { label: TIER_DISPLAY.premium.label,  color: TIER_DISPLAY.premium.color,  hex: "#2A9AB5" },
};

/** LTV tier display */
export const LTV_TIER_DISPLAY: Record<
  LTVTier,
  { label: string; color: string; bgColor: string }
> = {
  high_value:     { label: "Alto Valor",        color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)" },
  standard:       { label: "Estándar",           color: "var(--color-teal-400)",    bgColor: "var(--color-teal-bg)" },
  low_value:      { label: "Bajo Valor",         color: "var(--color-amber-400)",   bgColor: "var(--color-amber-bg)" },
  negative_trend: { label: "Tendencia Negativa", color: "var(--color-rose-400)",    bgColor: "var(--color-rose-bg)" },
};

/** Social cluster display */
export const SOCIAL_CLUSTER_DISPLAY: Record<
  SocialClusterType,
  { label: string; icon: string }
> = {
  sports_enthusiasts:   { label: "Entusiastas Deportivos",   icon: "🎾" },
  cultural_aficionados: { label: "Aficionados Culturales",   icon: "🎭" },
  social_butterflies:   { label: "Mariposas Sociales",       icon: "🦋" },
  wellness_focused:     { label: "Enfocados en Bienestar",   icon: "🧘" },
  family_oriented:      { label: "Orientados a Familia",     icon: "👨‍👩‍👧‍👦" },
  executive_network:    { label: "Red Ejecutiva",            icon: "💼" },
};

/** Member search sort display */
export const MEMBER_SEARCH_SORT_DISPLAY: Record<
  MemberSearchSort,
  { label: string }
> = {
  health_score_desc: { label: "Salud (mayor primero)" },
  health_score_asc:  { label: "Salud (menor primero)" },
  churn_risk_desc:   { label: "Riesgo de Abandono" },
  ltv_desc:          { label: "Lifetime Value" },
  name_asc:          { label: "Nombre A-Z" },
  tier_desc:         { label: "Tier" },
  engagement_desc:   { label: "Engagement" },
};

/** Tier ordering for sort comparisons */
export const TIER_ORDER: Record<string, number> = {
  vip: 0, platino: 1, oro: 2, premium: 3, plata: 4, bronce: 5, basic: 6,
};

// ═══════════════════════════════════════════════════════
// Dashboard Mode — Adaptive Morphism
// ═══════════════════════════════════════════════════════

export type DashboardMode = "calm" | "alert" | "critical";

// ═══════════════════════════════════════════════════════════════════════
// §12 ENTITY INTERFACES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberIdentity {
  member_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  tier: string;
  role: string;
  family_id: string;
  family_name: string;
  join_date: string;
  age?: number | null;
  age_group?: string | null;
}

export interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  trend: string;
  details?: string | null;
}

export interface ActivityRecord {
  date: string;
  domain: string;
  activity_type: string;
  description: string;
  venue?: string | null;
  amount?: number | null;
  duration_minutes?: number | null;
  satisfaction_rating?: number | null;
}

export interface SocialConnection {
  connected_member_id: string;
  connected_name: string;
  connection_type: string;
  strength: number;
  shared_activities: number;
  last_interaction?: string | null;
}

export interface JourneyMilestone {
  milestone_id: string;
  date: string;
  milestone_type: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  celebrated: boolean;
}

export interface EngagementProposal {
  proposal_id: string;
  proposal_type: string;
  title: string;
  description: string;
  domain: string;
  priority: string;
  estimated_impact: string;
  confidence: number;
  suggested_action?: string | null;
  related_members: string[];
  expires_at?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// §13 TOOL RESPONSE INTERFACES (1:1 with backend Pydantic models)
// ═══════════════════════════════════════════════════════════════════════

export interface Member360ProfileResponse {
  member: MemberIdentity;
  health_score: number;
  health_level: string;
  journey_stage: string;
  days_in_stage: number;
  churn_risk: string;
  churn_score: number;
  engagement_score: number;
  ltv_estimate: number;
  ltv_trend: string;
  active_domains: string[];
  total_activities_90d: number;
  last_activity_date?: string | null;
  connections_count: number;
  satisfaction_nps?: number | null;
  upcoming_milestones: JourneyMilestone[];
  top_risks: string[];
  generated_at: string;
}

export interface MemberHealthScoreResponse {
  member_id: string;
  composite_score: number;
  health_level: string;
  factors: HealthFactor[];
  trend: string;
  trend_detail?: string | null;
  previous_score?: number | null;
  benchmark_percentile?: number | null;
  generated_at: string;
}

export interface MemberJourneyResponse {
  member_id: string;
  current_stage: string;
  days_in_stage: number;
  stage_history: Array<{
    stage: string;
    entered_at: string;
    exited_at?: string | null;
    duration_days: number;
  }>;
  milestones: JourneyMilestone[];
  next_expected_transition?: string | null;
  next_transition_date?: string | null;
  journey_health: string;
  generated_at: string;
}

export interface MemberChurnPredictionResponse {
  member_id: string;
  churn_risk: string;
  churn_score: number;
  confidence: number;
  risk_factors: Array<{
    source: string;
    factor: string;
    weight: number;
    detail: string;
    severity?: string;
  }>;
  protective_factors: Array<{
    source: string;
    factor: string;
    detail: string;
  }>;
  time_horizon_days: number;
  recommended_actions: string[];
  similar_churned_count?: number | null;
  generated_at: string;
}

export interface MemberLTVAnalysisResponse {
  member_id: string;
  current_ltv: number;
  monthly_avg_spend: number;
  ltv_trend: string;
  ltv_tier: string;
  spend_breakdown: Array<{
    domain: string;
    amount: number;
    percentage: number;
  }>;
  projection_12m?: number | null;
  projection_confidence?: number | null;
  benchmark_vs_tier?: number | null;
  peak_month?: string | null;
  low_month?: string | null;
  generated_at: string;
}

export interface MemberActivitySummaryResponse {
  member_id: string;
  total_activities: number;
  period_days: number;
  by_domain: Array<{
    domain: string;
    count: number;
    percentage: number;
    trend: string;
    last_activity?: string | null;
  }>;
  activity_heatmap: Array<{
    weekday: string;
    hour: number;
    count: number;
  }>;
  favorite_venues: Array<{
    venue: string;
    visits: number;
  }>;
  activity_streak_current: number;
  activity_streak_longest: number;
  generated_at: string;
}

export interface MemberSocialProfileResponse {
  member_id: string;
  connections_count: number;
  connections: SocialConnection[];
  cluster_membership: string[];
  cluster_details: Array<{
    cluster: string;
    members_count: number;
    cohesion: number;
    match_score: number;
  }>;
  referrals_made: number;
  referrals_converted: number;
  social_influence_score: number;
  recommended_connections: Array<{
    member_id: string;
    name: string;
    reason: string;
    shared_interests: string[];
  }>;
  generated_at: string;
}

export interface MemberEngagementProposalsResponse {
  member_id: string;
  proposals: EngagementProposal[];
  total_proposals: number;
  cross_domain_signals: Array<{
    signal: string;
    value: number;
    status: string;
  }>;
  generated_at: string;
}

export interface MemberRiskAssessmentResponse {
  member_id: string;
  overall_risk: string;
  risk_score: number;
  risk_factors: Array<{
    source: string;
    factor: string;
    severity: string;
    weight: number;
    detail: string;
    mitigation?: string;
  }>;
  protective_factors: Array<{
    source: string;
    factor: string;
    detail: string;
  }>;
  risk_trend: string;
  similar_at_risk_count?: number | null;
  generated_at: string;
}

export interface Member360Preview {
  member_id: string;
  first_name: string;
  last_name: string;
  tier: string;
  role: string;
  family_name: string;
  health_score: number;
  health_level: string;
  churn_risk: string;
  engagement_score: number;
  journey_stage: string;
  last_activity_date?: string | null;
}

export interface SearchMembers360Response {
  members: Member360Preview[];
  total: number;
  page: number;
  page_size: number;
  filters_applied: Record<string, unknown>;
  generated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════
// §14 ADVISOR TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MemberAdvisorLayer =
  | "health_identity"
  | "lifecycle"
  | "financial"
  | "engagement_social"
  | "churn_risk"
  | "cross_domain";

export interface Member360AdvisorInsight {
  id: string;
  layer: MemberAdvisorLayer;
  impact: "critical" | "high" | "medium" | "low";
  confidence: number;
  title: string;
  reasoning: string;
  data?: Record<string, unknown>;
  /** Resonance — how many domains agree with this insight */
  resonance?: SignalResonance;
  /** Predictive window — when to act */
  window?: PredictiveWindow;
  action?: {
    label: string;
    tool: string;
    params: Record<string, unknown>;
    approval: "auto" | "semi" | "hitl" | "always_human";
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §15 TRANSFORM HELPERS — Pure functions, no side effects
// ═══════════════════════════════════════════════════════════════════════

/** Compact currency: ₡1.5M, ₡250K, ₡500 */
export function compactCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `₡${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `₡${(n / 1_000).toFixed(0)}K`;
  return `₡${n.toLocaleString("es-CR")}`;
}

/** Map a temperature composite (0-100) to a MemberState */
export function temperatureToState(temp: number): MemberState {
  if (temp >= 85) return "thriving";
  if (temp >= 65) return "stable";
  if (temp >= 45) return "drifting";
  if (temp >= 25) return "at_risk";
  return "disengaging";
}

/** Map a temperature composite to a zone */
export function temperatureToZone(temp: number): TemperatureZone {
  if (temp >= 80) return "hot";
  if (temp >= 60) return "warm";
  if (temp >= 40) return "neutral";
  if (temp >= 20) return "cool";
  return "cold";
}

/** Derive the window status from days remaining */
export function deriveWindowStatus(daysRemaining?: number): WindowStatus {
  if (daysRemaining === undefined) return "open";
  if (daysRemaining <= 0) return "closed";
  if (daysRemaining <= 3) return "imminent";
  if (daysRemaining <= 14) return "closing";
  return "open";
}

/** Compute signal resonance from an array of domain signals */
export function computeSignalResonance(signals: DomainSignal[]): SignalResonance {
  if (signals.length === 0) {
    return {
      agreementCount: 0,
      totalDomains: 0,
      agreement: "split",
      amplifiedConfidence: 0,
      contributingDomains: [],
      sharedDirection: "neutral",
    };
  }

  const positive = signals.filter((s) => s.direction === "positive").length;
  const negative = signals.filter((s) => s.direction === "negative").length;
  const total = signals.length;
  const max = Math.max(positive, negative);
  const dominant = positive > negative ? "positive" : negative > positive ? "negative" : "neutral";

  let agreement: SignalResonance["agreement"];
  if (max === total) agreement = "unanimous";
  else if (max > total * 0.6) agreement = "majority";
  else if (max > total * 0.4) agreement = "split";
  else agreement = "conflicting";

  const baseConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / total;
  const resonanceMultiplier =
    agreement === "unanimous" ? 1.3 :
    agreement === "majority"  ? 1.1 :
    agreement === "split"     ? 0.8 :
    0.5;

  return {
    agreementCount: max,
    totalDomains: total,
    agreement,
    amplifiedConfidence: Math.min(1, baseConfidence * resonanceMultiplier),
    contributingDomains: [...new Set(signals.map((s) => s.domain))] as ActivityDomain[],
    sharedDirection: dominant,
  };
}

// ── Color helpers (backward compat, delegating to new system) ──

export function getScoreColor(score: number): string {
  return getScoreColorHex(score, SCORE_PRESETS.standard);
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Saludable";
  if (score >= 60) return "Bueno";
  if (score >= 40) return "En riesgo";
  return "Crítico";
}

export function getHealthLevelColor(level: string): string {
  const stateMap: Record<string, MemberState> = {
    excellent: "thriving",
    healthy: "stable",
    attention: "drifting",
    critical: "disengaging",
  };
  return MEMBER_STATE_DISPLAY[stateMap[level] ?? "stable"].color;
}

export function getHealthLevelBg(level: string): string {
  const stateMap: Record<string, MemberState> = {
    excellent: "thriving",
    healthy: "stable",
    attention: "drifting",
    critical: "disengaging",
  };
  return MEMBER_STATE_DISPLAY[stateMap[level] ?? "stable"].bgColor;
}

export function getChurnColor(risk: string): string {
  return CHURN_RISK_LEVEL_DISPLAY[risk as ChurnRiskLevel]?.color ?? "var(--color-silver-400)";
}

export function getJourneyStageColor(stage: string): string {
  return JOURNEY_STAGE_DISPLAY[stage as JourneyStage]?.color ?? "var(--color-silver-400)";
}

export function getDomainColor(domain: ActivityDomain): string {
  return ACTIVITY_DOMAIN_DISPLAY[domain]?.color ?? "var(--color-silver-400)";
}

export function getDomainLabel(domain: ActivityDomain): string {
  return ACTIVITY_DOMAIN_DISPLAY[domain]?.label ?? domain;
}

export function getDomainIcon(domain: ActivityDomain): string {
  return ACTIVITY_DOMAIN_DISPLAY[domain]?.icon ?? "📋";
}

export function getMemberStateColor(state: MemberState): string {
  return MEMBER_STATE_DISPLAY[state].color;
}

export function getMemberStateLabel(state: MemberState): string {
  return MEMBER_STATE_DISPLAY[state].label;
}

export function buildFactorRows(
  factors: HealthFactor[]
): Array<{
  name: string;
  label: string;
  icon: string;
  score: number;
  weight: number;
  color: string;
  details?: string;
}> {
  return factors.map((f) => ({
    name: f.name,
    label: VITAL_SIGN_DISPLAY[f.name as VitalSignName]?.label ?? f.name,
    icon: VITAL_SIGN_DISPLAY[f.name as VitalSignName]?.icon ?? "📊",
    score: f.score,
    weight: f.weight,
    color: VITAL_SIGN_DISPLAY[f.name as VitalSignName]?.color ?? "var(--color-silver-400)",
    details: f.details ?? undefined,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// §16 TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════

export function isActivityDomain(value: string): value is ActivityDomain {
  return ACTIVITY_DOMAINS.includes(value as ActivityDomain);
}

export function isEngagementProposalType(value: string): value is EngagementProposalType {
  return ENGAGEMENT_PROPOSAL_TYPES.includes(value as EngagementProposalType);
}

export function isHealthFactorName(value: string): value is HealthFactorName {
  return HEALTH_FACTOR_NAMES.includes(value as HealthFactorName);
}

export function isVitalSignName(value: string): value is VitalSignName {
  return VITAL_SIGN_NAMES.includes(value as VitalSignName);
}

export function isSocialClusterType(value: string): value is SocialClusterType {
  return SOCIAL_CLUSTER_TYPES.includes(value as SocialClusterType);
}

export function isMemberState(value: string): value is MemberState {
  return MEMBER_STATES.includes(value as MemberState);
}

export function isWindowStatus(value: string): value is WindowStatus {
  return ["open", "closing", "imminent", "closed"].includes(value);
}