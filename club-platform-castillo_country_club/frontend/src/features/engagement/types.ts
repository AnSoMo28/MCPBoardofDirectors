// src/features/engagement/types.ts
// ═══════════════════════════════════════════════════════════
// Engagement Intelligence Platform — Type System
// Castillo Country Club — Phase 31 "The Voice"
//
// Sections A–G:  Original engagement types (Phase 6, F45)
// Sections H–V:  Phase 31 — Cognitive Engagement Layer
//
// Master imports from:
//   @/shared/types/domain-enums   — cross-domain enums
//   @/shared/types/ai-intelligence — generic AI types
//
// Rules: #42 (no Map), #62 (type verification), #63 (field access)
// ═══════════════════════════════════════════════════════════

import {
  type EngagementLevel,
  ENGAGEMENT_LEVEL_DISPLAY,
  LEGACY_ENGAGEMENT_MAP,
  type Sentiment,
  SENTIMENT_DISPLAY,
  type TrendDirection,
  type SeverityLevel,
  type DisplayConfig,
} from "@/shared/types/domain-enums";

import type {
  AdvisorCommand,
} from "@/shared/types/ai-intelligence";

// Re-export for backward compat
export type { EngagementLevel, Sentiment, TrendDirection, SeverityLevel };

// ═══════════════════════════════════════════════════════════
// SECTION A — ENGAGEMENT SCORE (Phase 6, preserved)
// ═══════════════════════════════════════════════════════════

export interface FamilyEngagement {
  family_id: string;
  family_name: string;
  engagement_score: number;
  engagement_level: "thriving" | "active" | "moderate" | "at_risk" | "dormant";
  trend: "improving" | "stable" | "declining";
  trend_pct: number;
  last_activity_date: string;
  last_activity_label: string;
  activities_attended_30d: number;
  activities_attended_90d: number;
  facility_usage_pct: number;
  events_rsvp_rate: number;
  communication_open_rate: number;
  referrals_count: number;
  feedback_given: number;
  risk_factors: string[];
}

export interface EngagementListResponse {
  families: FamilyEngagement[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EngagementOverview {
  total_families: number;
  avg_score: number;
  distribution: EngagementDistribution[];
  at_risk_count: number;
  dormant_count: number;
  improving_count: number;
  declining_count: number;
  top_risk_factors: RiskFactorCount[];
  engagement_trend: EngagementTrendPoint[];
}

export interface EngagementDistribution {
  level: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RiskFactorCount {
  factor: string;
  factor_label: string;
  count: number;
  percentage: number;
}

export interface EngagementTrendPoint {
  month: string;
  month_label: string;
  avg_score: number;
  active_pct: number;
  at_risk_pct: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION B — REACTIVATION CAMPAIGN (Phase 6, preserved)
// ═══════════════════════════════════════════════════════════

export interface ReactivationCampaign {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  target_level: string;
  target_level_label: string;
  target_count: number;
  reached_count: number;
  responded_count: number;
  reactivated_count: number;
  response_rate: number;
  reactivation_rate: number;
  channel: string;
  channel_label: string;
  message_template: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface CampaignListResponse {
  campaigns: ReactivationCampaign[];
  total: number;
}

export type CampaignForm = {
  name: string;
  description: string;
  target_level: "at_risk" | "dormant" | "all_inactive";
  channel: "email" | "sms" | "push" | "phone";
  message_template: string;
  start_date: string;
  end_date: string;
  include_activity_suggestions: boolean;
  offer_type?: "none" | "discount" | "free_event" | "guest_pass";
}

// ═══════════════════════════════════════════════════════════
// SECTION C — SATISFACTION SURVEY (Phase 6, preserved)
// ═══════════════════════════════════════════════════════════

export interface SurveyQuestion {
  id: string;
  order: number;
  type: "rating" | "nps" | "text" | "choice" | "multi_choice";
  question: string;
  description?: string;
  options?: string[];
  required: boolean;
  ai_suggested?: boolean;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  event_type: string;
  questions: SurveyQuestion[];
  is_active: boolean;
  usage_count: number;
  avg_completion_rate: number;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  survey_name: string;
  family_id: string;
  family_name: string;
  event_id?: string;
  event_name?: string;
  answers: SurveyAnswer[];
  overall_score: number;
  nps_score: number | null;
  comment?: string;
  sentiment?: "positive" | "neutral" | "negative";
  submitted_at: string;
}

export interface SurveyAnswer {
  question_id: string;
  question: string;
  type: string;
  value: string | number | string[];
  score?: number;
}

export interface SurveyResultsResponse {
  survey_id: string;
  survey_name: string;
  total_responses: number;
  completion_rate: number;
  avg_overall_score: number;
  avg_nps: number;
  nps_distribution: { promoters: number; passives: number; detractors: number };
  question_summaries: QuestionSummary[];
  sentiment_breakdown: SentimentBreakdown;
  ai_insights: SurveyInsight[];
  recent_comments: SurveyComment[];
}

export interface QuestionSummary {
  question_id: string;
  question: string;
  type: string;
  avg_score?: number;
  distribution?: { label: string; count: number; percentage: number }[];
  top_keywords?: string[];
}

export interface SentimentBreakdown {
  positive: number;
  positive_pct: number;
  neutral: number;
  neutral_pct: number;
  negative: number;
  negative_pct: number;
}

export interface SurveyInsight {
  id: string;
  type: "strength" | "improvement" | "trend" | "anomaly";
  title: string;
  description: string;
  confidence: number;
  related_questions: string[];
}

export interface SurveyComment {
  id: string;
  family_name: string;
  comment: string;
  sentiment: "positive" | "neutral" | "negative";
  event_name?: string;
  date: string;
}

// ═══════════════════════════════════════════════════════════
// SECTION D — CONFIG MAPS (Phase 6, preserved)
// ═══════════════════════════════════════════════════════════

export const ENGAGEMENT_LEVEL_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; description: string }
> = {
  champion: {
    ...ENGAGEMENT_LEVEL_DISPLAY.champion,
    description: "Embajador del club — participación excepcional",
  },
  loyal: {
    ...ENGAGEMENT_LEVEL_DISPLAY.loyal,
    description: "Lealtad demostrada — participación constante",
  },
  active: {
    ...ENGAGEMENT_LEVEL_DISPLAY.active,
    description: "Buena participación regular",
  },
  warm: {
    ...ENGAGEMENT_LEVEL_DISPLAY.warm,
    description: "Participación irregular — necesita atención",
  },
  cooling: {
    ...ENGAGEMENT_LEVEL_DISPLAY.cooling,
    description: "Actividad en descenso",
  },
  at_risk: {
    ...ENGAGEMENT_LEVEL_DISPLAY.at_risk,
    description: "Riesgo de abandono — intervenir",
  },
  inactive: {
    ...ENGAGEMENT_LEVEL_DISPLAY.inactive,
    description: "Sin actividad reciente",
  },
  thriving: {
    ...ENGAGEMENT_LEVEL_DISPLAY.champion,
    description: "Participación activa y constante",
  },
  moderate: {
    ...ENGAGEMENT_LEVEL_DISPLAY.warm,
    description: "Participación irregular",
  },
  dormant: {
    ...ENGAGEMENT_LEVEL_DISPLAY.inactive,
    description: "Sin actividad reciente",
  },
};

export const CAMPAIGN_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Borrador",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  active: {
    label: "Activa",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  paused: {
    label: "Pausada",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  completed: {
    label: "Completada",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelada",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export const CAMPAIGN_CHANNEL_OPTIONS = [
  { value: "email", label: "Correo Electrónico" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Notificación Push" },
  { value: "phone", label: "Llamada Telefónica" },
];

export const CAMPAIGN_TARGET_OPTIONS = [
  { value: "at_risk", label: "Familias en Riesgo" },
  { value: "dormant", label: "Familias Inactivas" },
  { value: "all_inactive", label: "Todos los Inactivos" },
];

export const OFFER_OPTIONS = [
  { value: "none", label: "Sin oferta" },
  { value: "discount", label: "Descuento en cuota" },
  { value: "free_event", label: "Evento gratuito" },
  { value: "guest_pass", label: "Pase de invitado" },
];

export const SENTIMENT_CONFIG = SENTIMENT_DISPLAY;

export const RISK_FACTOR_LABELS: Record<string, string> = {
  low_attendance: "Baja asistencia a eventos",
  no_recent_activity: "Sin actividad reciente",
  declining_usage: "Uso decreciente de instalaciones",
  no_engagement: "Sin interacción con comunicaciones",
  no_feedback: "Sin retroalimentación",
  payment_delays: "Retrasos en pagos",
  no_referrals: "Sin referidos nuevos",
  missed_events: "Eventos reservados sin asistir",
};

// ═══════════════════════════════════════════════════════════
// SECTION E — DASHBOARD RESPONSE (Phase 6/Fase 6, preserved)
// ═══════════════════════════════════════════════════════════

export interface EngagementDashboardSummary {
  total_families: number;
  total_members: number;
  active_30d: number;
  active_90d: number;
  avg_score: number;
  at_risk_count: number;
  dormant_count: number;
  improving_count: number;
  declining_count: number;
  nps_score: number;
  wellness_participation_pct: number;
  referral_rate_pct: number;
  facility_usage_pct: number;
}

export interface EngagementDashboardLevelDist {
  level: string;
  count: number;
  percentage: number;
}

export interface EngagementDashboardTrendPoint {
  month: string;
  label: string;
  avg_score: number;
  active_pct: number;
  at_risk_pct: number;
  dormant_pct: number;
}

export interface EngagementDashboardRiskFactor {
  factor: string;
  label: string;
  count: number;
  percentage: number;
}

export interface EngagementDashboardTrendSummary {
  improving: number;
  stable: number;
  declining: number;
}

export interface EngagementDashboardFamily {
  family_id: string;
  family_name: string;
  engagement_score: number;
  engagement_level: string;
  trend: string;
  trend_pct: number;
  last_activity_label: string;
  visits_30d: number;
  wellness_active: boolean;
  nps_contribution: number | null;
}

export interface EngagementDashboardResponse {
  summary: EngagementDashboardSummary;
  level_distribution: EngagementDashboardLevelDist[];
  monthly_trend: EngagementDashboardTrendPoint[];
  risk_factors: EngagementDashboardRiskFactor[];
  trend_summary: EngagementDashboardTrendSummary;
  families: EngagementDashboardFamily[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION F — HEALTH SCORE & VELOCITY (F45, preserved)
// ═══════════════════════════════════════════════════════════

export interface HealthScoreFactor {
  label: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface EngagementHealthScore {
  score: number;
  grade: string;
  factors: HealthScoreFactor[];
}

export const ENGAGEMENT_LEVEL_MAP: Record<string, string> = LEGACY_ENGAGEMENT_MAP;

export const SATISFACTION_CATEGORY_LABELS: Record<string, string> = {
  venue: "Sede",
  food: "Comida",
  service: "Servicio",
  entertainment: "Entretenimiento",
  value: "Valor",
  organization: "Organización",
  ambiance: "Ambiente",
  cleanliness: "Limpieza",
  timing: "Horarios",
  overall: "General",
};

export const ACTIVITY_CHART_COLORS: Record<string, string> = {
  gym: "#C9A96E",
  yoga: "#3DAA70",
  pilates: "#5B8A6A",
  swimming: "#2A9AB5",
  tennis: "#D47A5A",
  spa: "#B8C0CC",
  personal_training: "#D4A840",
  group_class: "#C46470",
  meditation: "#5B8A6A",
  other: "#8A95A5",
};

export const CLUSTER_TYPE_CONFIG: Record<
  string,
  { label: string; glowColor: string; icon: string }
> = {
  social: { label: "Social", glowColor: "var(--color-gold-400)", icon: "users" },
  activity: { label: "Actividad", glowColor: "var(--color-emerald-400)", icon: "activity" },
  age_based: { label: "Edad", glowColor: "var(--color-teal-400)", icon: "calendar" },
  interest: { label: "Interés", glowColor: "var(--color-terracotta-400)", icon: "star" },
  engagement: { label: "Engagement", glowColor: "var(--color-sage-400)", icon: "heart" },
};

// ═══════════════════════════════════════════════════════════
// SECTION G — VELOCITY & TRAJECTORY (F45, preserved)
// ═══════════════════════════════════════════════════════════

export interface EngagementVelocity {
  current_score: number;
  score_30d: number;
  score_60d: number;
  velocity_per_week: number;
  acceleration: number;
  trajectory: "improving" | "stable" | "declining";
  projection_90d: number;
  projection_range: [number, number];
}

export interface FactorTrend {
  label: string;
  direction: "up" | "down" | "flat";
  magnitude: number;
}

export interface TrajectoryPoint {
  family_id: string;
  family_name: string;
  score: number;
  velocity_per_week: number;
  quadrant: "champion" | "recovering" | "at_risk" | "dormant";
  engagement_level: string;
  trend: string;
  trend_pct: number;
}

export interface EngagementAdvisorContext {
  dashboard: EngagementDashboardResponse | null;
  healthScore: number;
  velocity: EngagementVelocity | null;
  families: EngagementDashboardFamily[];
  monthlyTrend: EngagementDashboardTrendPoint[];
  riskFactors: EngagementDashboardRiskFactor[];
  trendSummary: EngagementDashboardTrendSummary;
  satisfactionNps?: number;
  satisfactionTrend?: "improving" | "stable" | "declining";
}

export const ENGAGEMENT_ADVISOR_LAYERS = [
  "diagnostic", "predictive", "prescriptive", "cross_domain",
] as const;
export type EngagementAdvisorLayer = (typeof ENGAGEMENT_ADVISOR_LAYERS)[number];

export const TRAJECTORY_QUADRANT_CONFIG: Record<
  TrajectoryPoint["quadrant"],
  { label: string; color: string; bgColor: string; description: string }
> = {
  champion: {
    label: "Champions",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 8%, transparent)",
    description: "Alto engagement y mejorando — retener y recompensar",
  },
  recovering: {
    label: "Recuperando",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 8%, transparent)",
    description: "Bajo engagement pero mejorando — nutrir la tendencia",
  },
  at_risk: {
    label: "En Riesgo",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    description: "Alto engagement pero cayendo — intervenir URGENTE",
  },
  dormant: {
    label: "Dormidos",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 8%, transparent)",
    description: "Bajo engagement y cayendo — campaña de reactivación",
  },
};


// ═══════════════════════════════════════════════════════════════════
//                                                                  ║
//   P H A S E   3 1 — C O G N I T I V E   E N G A G E M E N T    ║
//                                                                  ║
//   "The Voice" — From flat dashboard to cognitive organism        ║
//   Intelligence Levels 1–10: data → patterns → predictions →      ║
//   narrative → agency → calibration → discovery → precision →     ║
//   emotional → co-evolution                                        ║
//                                                                  ║
// ═══════════════════════════════════════════════════════════════════


// ─── H. Activity Domain Model ────────────────────────────────────
// The 10 domains that constitute engagement. Each domain is an
// independent "organism" competing for family attention, with
// symbiotic relationships to other domains.

export const ACTIVITY_DOMAINS = [
  "events", "dining", "sports", "wellness",
  "cultural", "facilities", "social",
  "communication", "financial", "recommendations",
] as const;
export type ActivityDomain = (typeof ACTIVITY_DOMAINS)[number];

export const ACTIVITY_DOMAIN_DISPLAY: Record<
  ActivityDomain,
  DisplayConfig & { icon: string }
> = {
  events: {
    label: "Eventos",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
    icon: "CalendarDays",
  },
  dining: {
    label: "Gastronomía",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    icon: "UtensilsCrossed",
  },
  sports: {
    label: "Deportes",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    icon: "Trophy",
  },
  wellness: {
    label: "Bienestar",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
    icon: "Heart",
  },
  cultural: {
    label: "Cultural",
    color: "var(--color-terracotta-300)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-300) 12%, transparent)",
    icon: "Palette",
  },
  facilities: {
    label: "Instalaciones",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    icon: "Building2",
  },
  social: {
    label: "Social",
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 12%, transparent)",
    icon: "Users",
  },
  communication: {
    label: "Comunicación",
    color: "var(--color-teal-500)",
    bgColor: "color-mix(in srgb, var(--color-teal-500) 12%, transparent)",
    icon: "MessageSquare",
  },
  financial: {
    label: "Financiero",
    color: "var(--color-gold-300)",
    bgColor: "color-mix(in srgb, var(--color-gold-300) 12%, transparent)",
    icon: "DollarSign",
  },
  recommendations: {
    label: "Recomendaciones",
    color: "var(--color-sage-300)",
    bgColor: "color-mix(in srgb, var(--color-sage-300) 12%, transparent)",
    icon: "Lightbulb",
  },
};

/** Type guard for ActivityDomain. */
export function isActivityDomain(value: string): value is ActivityDomain {
  return (ACTIVITY_DOMAINS as readonly string[]).includes(value);
}

// ─── I. Engagement Ecosystem ─────────────────────────────────────
// Models engagement as a living ecosystem where 10 domains
// compete for attention, form symbioses, go extinct, and emerge.

export interface EngagementDomainStatus {
  domain: ActivityDomain;
  vitality: number;           // 0-100 — how alive this domain is
  trend: TrendDirection;
  lastActivity: string;       // ISO date
  resonance: number;          // 0-100 — how much this domain echoes
  competition: number;        // 0-100 — how much it competes for attention
  membersActive: number;
  membersTotal: number;
}

export interface DomainSymbiosis {
  domain1: ActivityDomain;
  domain2: ActivityDomain;
  strength: number;           // 0-1 — how much they reinforce each other
  direction: "bidirectional" | "d1_to_d2" | "d2_to_d1";
  examples: string[];
}

export interface EngagementEcosystem {
  domains: EngagementDomainStatus[];
  totalResonance: number;     // 0-100 — aggregate ecosystem resonance
  dominantDomain: ActivityDomain;
  extinctDomains: ActivityDomain[];
  emergingDomains: ActivityDomain[];
  symbioses: DomainSymbiosis[];
  mutations: EngagementDNAMutation[];
  healthScore: number;        // 0-100 — ecosystem-level health
  diversity: number;          // 0-100 — how evenly distributed engagement is
}

// ─── J. Gravitational Retention Model ────────────────────────────
// Retention as physics. The club creates gravitational fields
// that hold families. When gravity weakens, families drift away.
// Escape velocity = the speed at which departure becomes inevitable.

export interface GravitationalModel {
  clubGravity: number;        // 0-100 — force from club experience
  socialGravity: number;      // 0-100 — force from social connections
  experienceGravity: number;  // 0-100 — force from accumulated experiences
  identityGravity: number;    // 0-100 — force from identity integration
  exitVelocity: number;       // 0-100 — speed of departure
  escapeThreshold: number;    // 0-100 — point of no return
  totalGravity: number;       // 0-100 — weighted sum of all forces
  trend: "attracting" | "stable" | "repelling";
}

// ─── K. Resonance Detection ──────────────────────────────────────
// When an event creates an emotional echo that lasts days or weeks.
// Different from "satisfaction" — resonance is TEMPORAL and DEEP.

export interface ResonancePattern {
  currentIntensity(currentIntensity: any): unknown;
  eventDomain: ActivityDomain;
  eventTitle: string;
  impactDuration: number;     // days the effect lasted
  echoCount: number;          // how many times referenced
  identityIntegration: number; // 0-100 — became part of identity?
  repeatSeeking: boolean;     // seeking to repeat?
  expansionBehavior: boolean; // exploring variants?
  socialAmplification: number; // 0-100 — told others about it
  timestamp: string;          // ISO date of the event
}

// ─── L. Moments of Truth ─────────────────────────────────────────
// Critical instances where a family decided if the club is
// part of their identity or just a service they pay for.

export type MomentOfTruthType =
  | "first_impression"
  | "social_bonding"
  | "identity_integration"
  | "milestone"
  | "recovery"
  | "crisis"
  | "celebration";

export const MOMENT_OF_TRUTH_DISPLAY: Record<
  MomentOfTruthType,
  DisplayConfig & { icon: string }
> = {
  first_impression: {
    label: "Primera Impresión",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    icon: "Sparkles",
  },
  social_bonding: {
    label: "Vínculo Social",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
    icon: "Users",
  },
  identity_integration: {
    label: "Integración Identitaria",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    icon: "Crown",
  },
  milestone: {
    label: "Hito",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    icon: "Award",
  },
  recovery: {
    label: "Recuperación",
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 12%, transparent)",
    icon: "ShieldCheck",
  },
  crisis: {
    label: "Crisis",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    icon: "AlertTriangle",
  },
  celebration: {
    label: "Celebración",
    color: "var(--color-gold-300)",
    bgColor: "color-mix(in srgb, var(--color-gold-300) 12%, transparent)",
    icon: "PartyPopper",
  },
};

export interface MomentOfTruth {
  sentimentBefore: any;
  sentimentAfter: any;
  id: string;
  date: string;
  type: MomentOfTruthType;
  description: string;
  outcome: "positive" | "negative" | "neutral";
  impactOnRetention: number;  // -100 to +100
  domain: ActivityDomain;
  familyId: string;
  familyName: string;
  predicted: boolean;         // was this predicted by the system?
}

// ─── M. DNA Mutation Detection ───────────────────────────────────
// Engagement profiles MUTATE. A family stops tennis, starts yoga.
// A family shifts from social events to private dining.
// Detecting these mutations EARLY is critical for retention.

export interface EngagementDNAMutation {
  id: string | null;
  familyId: string;
  familyName: string;
  from: string;               // previous pattern description
  to: string;                 // new pattern description
  trigger: string;            // what caused the mutation
  date: string;
  confidence: number;         // 0-1
  domains: ActivityDomain[];  // which domains were affected
}

// ─── N. Satisfaction Intelligence ────────────────────────────────
// NPS decomposition into 5 broad dimensions with drivers, gaps,
// and predictive NPS with/without intervention.

export type SatisfactionDimensionName =
  | "facility"
  | "service"
  | "social"
  | "value"
  | "experience";

export const SATISFACTION_DIMENSION_DISPLAY: Record<
  SatisfactionDimensionName,
  DisplayConfig & { icon: string }
> = {
  facility: {
    label: "Instalaciones",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    icon: "Building2",
  },
  service: {
    label: "Servicio",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    icon: "ConciergeBell",
  },
  social: {
    label: "Social",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
    icon: "Users",
  },
  value: {
    label: "Valor",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    icon: "BadgeDollarSign",
  },
  experience: {
    label: "Experiencia",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    icon: "Sparkles",
  },
};

export interface SatisfactionDriver {
  name: string;
  impact: number;             // correlation with satisfaction
  currentScore: number;
  benchmark: number;
  trend: TrendDirection;
}

export interface SatisfactionGap {
  dimension: SatisfactionDimensionName;
  expectation: number;
  reality: number;
  gap: number;
  priority: number;           // 1-5
}

export interface SatisfactionDimension {
  dimension: SatisfactionDimensionName;
  score: number;              // 0-100
  trend: TrendDirection;
  drivers: SatisfactionDriver[];
  gaps: SatisfactionGap[];
  improvementROI: number;
}

export interface NPSDriver {
  dimension: SatisfactionDimensionName;
  impact: number;             // contribution to NPS
  trend: TrendDirection;
  priority: number;           // 1-5
}

export interface PredictiveNPS {
  current: number;
  predicted3m: number;
  predictedWithIntervention: number;
  drivers: NPSDriver[];
  confidence: number;         // 0-100
  interventionWindow: number; // days until window closes
}

// ─── O. Dashboard Adaptive Morphism ──────────────────────────────
// The dashboard physically reorganizes based on system state.
// calm: 4-col panoramic. alert: 3-col dense. critical: 1-col focused.

export type EngagementDashboardMode = "calm" | "alert" | "critical";

export interface EngagementAmbientState {
  mode: EngagementDashboardMode;
  pulseSpeed: number;         // seconds per cycle
  intensity: number;          // 0-1
  color: string;              // CSS color
  gradient: string;           // CSS gradient
}

// ─── P. Intelligence Stream ──────────────────────────────────────
// Priority-sorted signals that surface in the dashboard.
// The stream replaces tabs — most important signal wins.

export type StreamSignalCategory =
  | "risk"
  | "opportunity"
  | "insight"
  | "positive"
  | "prediction"
  | "anomaly";

export interface EngagementStreamSignal {
  id: string;
  priority: number;           // 0-100, higher = more important
  category: StreamSignalCategory;
  title: string;
  description: string;
  source: string;             // which engine produced this
  domain?: ActivityDomain;
  familyId?: string;
  familyName?: string;
  confidence: number;
  actionable: boolean;
  timestamp: string;
}

// ─── Q. Decision Stage ───────────────────────────────────────────
// Contextual action panel that adapts to the dominant threat.

export type DecisionScenarioType =
  | "churn_prevention"
  | "engagement_boost"
  | "lifecycle_transition"
  | "financial_exposure";

export const DECISION_SCENARIO_DISPLAY: Record<
  DecisionScenarioType,
  DisplayConfig & { icon: string }
> = {
  churn_prevention: {
    label: "Prevención de Churn",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    icon: "ShieldAlert",
  },
  engagement_boost: {
    label: "Impulso de Engagement",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    icon: "Rocket",
  },
  lifecycle_transition: {
    label: "Transición de Ciclo",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    icon: "ArrowRightLeft",
  },
  financial_exposure: {
    label: "Exposición Financiera",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    icon: "TrendingDown",
  },
};

export interface DecisionScenario {
  type: DecisionScenarioType;
  urgency: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  suggestedActions: AdvisorCommand[];
  estimatedImpact: string;
  confidence: number;
  deadline?: string;          // ISO date — when intervention window closes
}

// ─── R. Calibration (Dimension 6: Auto-correction) ──────────────
// When predictions fail, the system recalibrates.
// Track prediction accuracy → identify miscalibrated rules → propose fixes.

export interface CalibrationDelta {
  ruleId: string;
  metric: string;
  predicted: number;
  actual: number;
  error: number;              // actual - predicted
  errorPct: number;
  direction: "overestimate" | "underestimate" | "accurate";
  suggestedAdjustment: string;
}

export interface CalibrationReport {
  timestamp: string;
  totalPredictions: number;
  accuratePredictions: number;
  accuracyRate: number;       // 0-1
  deltas: CalibrationDelta[];
  overallReliability: number; // 0-100
  recommendedChanges: string[];
}

// ─── S. Discovery (Dimension 7: Emergent Patterns) ──────────────
// The system finds patterns NOBODY asked for.
// Cross-domain correlations, anomalies, emergent clusters.

export type EmergentPatternType =
  | "correlation"
  | "anomaly"
  | "cluster"
  | "cascade"
  | "mutation";

export interface EmergentPattern {
  id: string;
  type: EmergentPatternType;
  title: string;
  description: string;
  domains: ActivityDomain[];
  affectedFamilies: number;
  confidence: number;
  novelty: number;            // 0-100 — how unexpected
  actionable: boolean;
  discoveredAt: string;
  evidence: string[];
}

export interface AnomalyFamily {
  familyId: string;
  familyName: string;
  anomalyType: "positive_surprise" | "negative_surprise" | "contagion" | "isolation";
  deviation: number;          // standard deviations from expected
  description: string;
  relatedFamilies: string[];
  confidence: number;
}

// ─── T. Evolution (Dimension 10: Co-evolution) ───────────────────
// The system proposes improvements to its OWN rules.
// Human approves → system evolves. Versioned. Rollbackable.

export interface RuleEvolutionProposal {
  id: string;
  ruleId: string;
  currentThreshold: number;
  proposedThreshold: number;
  reason: string;
  basedOn: "calibration" | "discovery" | "outcome_tracking";
  evidence: string[];
  estimatedImprovement: number; // accuracy improvement %
  requiresApproval: boolean;
  status: "proposed" | "approved" | "rejected" | "applied";
  proposedAt: string;
  appliedAt?: string;
}

export interface EvolutionVersion {
  version: number;
  timestamp: string;
  changes: RuleEvolutionProposal[];
  accuracyBefore: number;
  accuracyAfter?: number;
  rollbackAvailable: boolean;
}

// ─── U. MCP Response Types (moved from EngagementDashboard.tsx) ──
// These define the shape of MCP tool responses.
// Previously inline in the dashboard — now centralized.

export interface AiEngagementReport {
  health_summary: {
    avg_engagement_score: number;
    retention_rate_pct: number;
    trend: string;
    active_member_pct: number;
    wellness_participation_pct: number;
  };
  churn_analysis: {
    at_risk_count: number;
    predicted_churn_90d: number;
    churn_probability_distribution: Array<{ range: string; count: number }>;
    primary_churn_drivers: string[];
  };
  critical_families: Array<{
    family_name: string;
    risk_score: number;
    reason: string;
    recommendation: string;
    estimated_value_at_risk: number;
  }>;
  engagement_insights: {
    best_day_to_engage: string;
    best_time_to_engage: string;
    most_responsive_channel: string;
    top_3_drivers: string[];
  };
  retention_strategies: Array<{
    strategy: string;
    target_segment: string;
    impact_estimate: string;
    timeline: string;
  }>;
  activity_recommendations: Array<{
    activity: string;
    reason: string;
    estimated_demand: string;
    investment_estimate: number;
    roi_timeline: string;
  }>;
  financial_impact: {
    at_risk_annual_revenue: number;
    projected_churn_cost: number;
    recommended_retention_budget: number;
    expected_roi: number;
  };
}

export interface WellnessTabData {
  period_start: string;
  period_end: string;
  total_activities: number;
  total_minutes: number;
  total_calories: number;
  most_frequent_activity: string;
  activity_breakdown: Array<{
    activity: string;
    count: number;
    percentage: number;
  }>;
  goals_summary: {
    active: number;
    completed: number;
    paused: number;
    abandoned: number;
  };
  streak_days: number;
  summary: string;
}

export interface SatisfactionTabData {
  current_nps: number;
  nps_trend: Array<{
    period: string;
    nps: number;
    promoters_pct: number;
    detractors_pct: number;
  }>;
  category_averages: Record<string, number>;
  sentiment_flow: Array<{
    period: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  top_improvements: Array<{
    area: string;
    mentions: number;
    impact: string;
  }>;
  key_quotes: Array<{
    text: string;
    sentiment: string;
    family: string;
    date: string;
  }>;
}

export interface SocialClusterItem {
  id: string;
  name: string;
  cluster_type: string;
  description: string;
  family_ids: string[];
  size: number;
  avg_engagement: number;
  shared_interests: string[];
}

export interface QuarterlyInsightsData {
  id: string;
  year: number;
  period: string;
  summary: string;
  total_members_active: number;
  events_held: number;
  avg_event_attendance: number;
  revenue_total: number;
  top_activities: Array<{
    name: string;
    attendance: number;
    growth_pct: number;
  }>;
  member_satisfaction_avg: number;
  key_achievements: string[];
  areas_for_improvement: string[];
  recommendations: string[];
}

export interface SchedulingConflictItem {
  id: string;
  event_a_name: string;
  event_b_name: string;
  conflict_type: string;
  severity: string;
  overlap_start: string;
  overlap_end: string;
  shared_resources: string[];
  suggestion: string;
}

// ─── V. MCP Tools & Configuration Constants ──────────────────────

export const ENGAGEMENT_MCP_TOOLS = {
  // Core engagement
  get_engagement_dashboard: "get_engagement_dashboard",
  get_engagement_insights: "get_engagement_insights",

  // Satisfaction
  get_satisfaction_trends: "get_satisfaction_trends",
  get_satisfaction_health_score: "get_satisfaction_health_score",
  get_satisfaction_intelligence: "get_satisfaction_intelligence",
  get_satisfaction_benchmark: "get_satisfaction_benchmark",
  generate_satisfaction_engagement_proposals: "generate_satisfaction_engagement_proposals",

  // AI / Cross-domain
  generate_ai_analysis: "generate_ai_analysis",
  generate_quarterly_insights: "generate_quarterly_insights",
  detect_scheduling_conflicts: "detect_scheduling_conflicts",
  identify_social_clusters: "identify_social_clusters",

  // Wellness
  wellness_report: "wellness_report",

  // Campaigns & referrals
  design_reactivation_campaign: "design_reactivation_campaign",
  manage_referrals: "manage_referrals",
} as const;

export const ENGAGEMENT_FRESHNESS_TIERS = {
  realtime: 60_000,     // 1 min  — critical signals
  standard: 120_000,    // 2 min  — normal dashboard data
  reference: 300_000,   // 5 min  — benchmarks, proposals
  historical: 600_000,  // 10 min — trends, clusters
} as const;

// ─── Ecosystem Thresholds ────────────────────────────────────────

export const ECOSYSTEM_THRESHOLDS = {
  vitality_critical: 20,
  vitality_warning: 40,
  vitality_healthy: 60,
  vitality_thriving: 80,
  extinction_threshold: 5,
  emerging_threshold: 30,
  symbiosis_strong: 0.6,
  symbiosis_weak: 0.3,
  dominance_danger: 60,   // single domain > 60% is risky
  diversity_minimum: 40,
} as const;

// ─── Gravitational Constants ─────────────────────────────────────

export const GRAVITATIONAL_CONSTANTS = {
  escape_velocity_warning: 70,
  escape_velocity_critical: 85,
  escape_threshold_default: 90,
  gravity_weights: {
    club: 0.25,
    social: 0.25,
    experience: 0.30,
    identity: 0.20,
  },
  decay_rate_per_week: 2, // gravity points lost per week of inactivity
} as const;

// ─── Resonance Thresholds ────────────────────────────────────────

export const RESONANCE_THRESHOLDS = {
  impact_duration_short: 3,   // days
  impact_duration_medium: 14,
  impact_duration_long: 30,
  echo_count_amplified: 3,
  identity_integration_high: 70,
  social_amplification_high: 60,
} as const;

// ─── DNA Mutation Thresholds ─────────────────────────────────────

export const DNA_MUTATION_THRESHOLDS = {
  domain_shift_pct: 30,       // >30% shift in domain activity = mutation
  confidence_minimum: 0.6,
  lookback_months: 3,
} as const;

// ─── Calibration Thresholds ──────────────────────────────────────

export const CALIBRATION_THRESHOLDS = {
  accurate_tolerance_pct: 15, // within 15% = accurate
  overestimate_threshold: 1.15,
  underestimate_threshold: 0.85,
  minimum_predictions: 10,    // need ≥10 predictions to calibrate
} as const;

// ─── Stream Priority Weights ─────────────────────────────────────

export const ENGAGEMENT_STREAM_PRIORITIES: Record<
  string,
  { weight: number; category: StreamSignalCategory }
> = {
  escape_velocity_critical: { weight: 100, category: "risk" },
  domain_extinction: { weight: 95, category: "risk" },
  health_critical: { weight: 90, category: "risk" },
  dna_mutation: { weight: 85, category: "anomaly" },
  churn_wave: { weight: 80, category: "prediction" },
  gravitational_collapse: { weight: 78, category: "risk" },
  resonance_amplified: { weight: 75, category: "positive" },
  hidden_decline: { weight: 70, category: "risk" },
  moment_of_truth: { weight: 65, category: "insight" },
  cross_domain_divergence: { weight: 60, category: "insight" },
  nps_trajectory_warning: { weight: 55, category: "prediction" },
  ecosystem_imbalance: { weight: 50, category: "insight" },
  wellness_gap: { weight: 45, category: "opportunity" },
  referral_opportunity: { weight: 40, category: "opportunity" },
  reactivation_window: { weight: 35, category: "opportunity" },
  positive_momentum: { weight: 30, category: "positive" },
  emergent_pattern: { weight: 25, category: "anomaly" },
  calibration_update: { weight: 20, category: "insight" },
} as const;

// ─── Ambient Config ──────────────────────────────────────────────

export const ENGAGEMENT_AMBIENT_CONFIG: Record<
  EngagementDashboardMode,
  { pulseSpeed: number; intensity: number; color: string; gradient: string }
> = {
  calm: {
    pulseSpeed: 8,
    intensity: 0.15,
    color: "var(--color-teal-400)",
    gradient: "radial-gradient(ellipse at 30% 40%, color-mix(in srgb, var(--color-teal-400) 8%, transparent), transparent 60%)",
  },
  alert: {
    pulseSpeed: 5,
    intensity: 0.25,
    color: "var(--color-amber-400)",
    gradient: "radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--color-amber-400) 12%, transparent), transparent 55%)",
  },
  critical: {
    pulseSpeed: 2.5,
    intensity: 0.4,
    color: "var(--color-rose-400)",
    gradient: "radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--color-rose-400) 18%, transparent), transparent 50%)",
  },
} as const;