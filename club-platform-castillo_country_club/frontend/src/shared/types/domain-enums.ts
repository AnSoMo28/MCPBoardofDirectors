// src/shared/types/domain-enums.ts
// ═══════════════════════════════════════════════════════════
// DOMAIN ENUMS — Castillo Country Club AI Platform
//
// MASTER SOURCE OF TRUTH for all cross-domain enums.
//
// RULES:
//   1. All cross-domain enums defined HERE and ONLY here.
//   2. Domain types.ts files IMPORT from here, NEVER re-define.
//   3. Backend string values are the canonical values.
//   4. When backend adds values → update HERE → propagates everywhere.
//   5. NEVER hardcode enum values — use const arrays or type.
//   6. Domain-specific enums (SportType, CulturalCategory, etc.)
//      stay in their respective features/*/types.ts.
//
// Created: June 2026 — Cross-Domain Audit (F30)
// ═══════════════════════════════════════════════════════════

// ── Generic display config interface ─────────────────────

export interface DisplayConfig {
  label: string;
  color: string;
  bgColor: string;
}

// ═══════════════════════════════════════════════════════════
// SECTION 1 — MEMBER & FAMILY
// Backend source: family_profile models, age_group models
// Consumed by: families, dashboard, members, engagement,
//              recommendations, age_group
// ═══════════════════════════════════════════════════════════

/** Member tier — unified across families, dashboard, members. */
export const MEMBER_TIERS = [
  "platino", "oro", "plata", "bronce",
  "basic", "premium", "vip",
] as const;
export type MemberTier = typeof MEMBER_TIERS[number];

export const TIER_DISPLAY: Record<
  MemberTier,
  DisplayConfig & { sortOrder: number }
> = {
  platino: {
    label: "Platino",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    sortOrder: 7,
  },
  oro: {
    label: "Oro",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    sortOrder: 6,
  },
  plata: {
    label: "Plata",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
    sortOrder: 5,
  },
  bronce: {
    label: "Bronce",
    color: "#B87333",
    bgColor: "color-mix(in srgb, #B87333 10%, transparent)",
    sortOrder: 4,
  },
  premium: {
    label: "Premium",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    sortOrder: 3,
  },
  basic: {
    label: "Básico",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    sortOrder: 2,
  },
  vip: {
    label: "VIP",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 10%, transparent)",
    sortOrder: 1,
  },
};

/**
 * Age group categories — aligned with backend AgeGroupCategory.
 * Backend source: models/age_group_activity.py
 */
export const AGE_GROUP_CATEGORIES = [
  "toddler", "kids", "teens", "young_adults", "adults", "seniors",
] as const;
export type AgeGroupCategory = typeof AGE_GROUP_CATEGORIES[number];

export const AGE_GROUP_DISPLAY: Record<
  AgeGroupCategory,
  DisplayConfig & { ageRange: string }
> = {
  toddler: {
    label: "Bebés",
    ageRange: "0–3",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  kids: {
    label: "Niños",
    ageRange: "4–12",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 10%, transparent)",
  },
  teens: {
    label: "Adolescentes",
    ageRange: "13–17",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  young_adults: {
    label: "Jóvenes Adultos",
    ageRange: "18–25",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  adults: {
    label: "Adultos",
    ageRange: "26–59",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 10%, transparent)",
  },
  seniors: {
    label: "Seniors",
    ageRange: "60+",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
};

/** Family lifecycle stages — backend source: family_profile models. */
export const LIFECYCLE_STAGES = [
  "prospect", "onboarding", "growing", "peak",
  "plateau", "at_risk", "dormant", "reactivated",
] as const;
export type LifecycleStage = typeof LIFECYCLE_STAGES[number];

export const LIFECYCLE_DISPLAY: Record<LifecycleStage, DisplayConfig> = {
  prospect: {
    label: "Prospecto",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  onboarding: {
    label: "Integración",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  growing: {
    label: "Crecimiento",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  peak: {
    label: "Pico",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  plateau: {
    label: "Meseta",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  at_risk: {
    label: "En Riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  dormant: {
    label: "Inactivo",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
  reactivated: {
    label: "Reactivado",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 10%, transparent)",
  },
};

/** Family status values. */
export const FAMILY_STATUSES = [
  "active", "inactive", "suspended", "pending_approval",
] as const;
export type FamilyStatus = typeof FAMILY_STATUSES[number];

export const FAMILY_STATUS_DISPLAY: Record<FamilyStatus, DisplayConfig> = {
  active: {
    label: "Activo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  inactive: {
    label: "Inactivo",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
  suspended: {
    label: "Suspendido",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  pending_approval: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
};

/**
 * Member roles within a family — backend canonical values.
 * Spanish legacy values mapped via LEGACY_MEMBER_ROLE_MAP.
 */
export const MEMBER_ROLES = [
  "primary", "spouse", "child", "dependent",
] as const;
export type MemberRole = typeof MEMBER_ROLES[number];

// ═══════════════════════════════════════════════════════════
// SECTION 2 — ENGAGEMENT & SATISFACTION
// Backend source: member_engagement models, satisfaction models
// Consumed by: engagement, satisfaction, communication,
//              family advisor, global advisor
// ═══════════════════════════════════════════════════════════

/**
 * Engagement levels — aligned with backend EngagementLevel (7 values).
 * Replaces legacy frontend 5-level system via LEGACY_ENGAGEMENT_MAP.
 */
export const ENGAGEMENT_LEVELS = [
  "champion", "loyal", "active", "warm",
  "cooling", "at_risk", "inactive",
] as const;
export type EngagementLevel = typeof ENGAGEMENT_LEVELS[number];

export const ENGAGEMENT_LEVEL_DISPLAY: Record<
  EngagementLevel,
  DisplayConfig & { sortOrder: number }
> = {
  champion: {
    label: "Embajador",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    sortOrder: 7,
  },
  loyal: {
    label: "Leal",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 10%, transparent)",
    sortOrder: 6,
  },
  active: {
    label: "Activo",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    sortOrder: 5,
  },
  warm: {
    label: "Cálido",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    sortOrder: 4,
  },
  cooling: {
    label: "Enfriando",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    sortOrder: 3,
  },
  at_risk: {
    label: "En Riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    sortOrder: 2,
  },
  inactive: {
    label: "Inactivo",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
    sortOrder: 1,
  },
};

/**
 * Sentiment — shared across satisfaction, communication, engagement.
 * Backend source: satisfaction_agent._compute_sentiment()
 */
export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = typeof SENTIMENTS[number];

export const SENTIMENT_DISPLAY: Record<Sentiment, DisplayConfig> = {
  positive: {
    label: "Positivo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  neutral: {
    label: "Neutro",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  negative: {
    label: "Negativo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 — EVENTS & ACTIVITIES
// Backend source: event models, cultural_social models
// Consumed by: events, cultural_social, sports_recreation,
//              facilities, recommendations
// ═══════════════════════════════════════════════════════════

/**
 * Event categories — unified from event_orchestrator + cultural_social + sports.
 * Replaces: EventType (legacy 8), BkEventCategory (8), CulturalSocial EventType (7).
 * Cultural Social's EventType (gala, dinner, mixer, etc.) stays domain-specific.
 */
export const EVENT_CATEGORIES = [
  "sports", "cultural", "social", "private",
  "festive", "children", "family", "corporate",
] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];

export const EVENT_CATEGORY_DISPLAY: Record<
  EventCategory,
  DisplayConfig & { icon: string }
> = {
  sports: {
    label: "Deportes",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    icon: "Trophy",
  },
  cultural: {
    label: "Cultural",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
    icon: "Palette",
  },
  social: {
    label: "Social",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    icon: "Users",
  },
  private: {
    label: "Privado",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)",
    icon: "Lock",
  },
  festive: {
    label: "Festivo",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    icon: "PartyPopper",
  },
  children: {
    label: "Infantil",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
    icon: "Baby",
  },
  family: {
    label: "Familiar",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    icon: "UsersRound",
  },
  corporate: {
    label: "Corporativo",
    color: "var(--color-silver-200)",
    bgColor: "color-mix(in srgb, var(--color-silver-200) 12%, transparent)",
    icon: "Briefcase",
  },
};

/**
 * Event status — full lifecycle from backend.
 * Replaces: EventStatus legacy (4) + BkEventStatus (7).
 */
export const EVENT_STATUSES = [
  "draft", "pending_approval", "approved",
  "published", "in_progress", "completed", "cancelled",
] as const;
export type EventStatus = typeof EVENT_STATUSES[number];

export const EVENT_STATUS_DISPLAY: Record<EventStatus, DisplayConfig> = {
  draft: {
    label: "Borrador",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  pending_approval: {
    label: "Pendiente aprobación",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  approved: {
    label: "Aprobado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  published: {
    label: "Publicado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  in_progress: {
    label: "En curso",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  completed: {
    label: "Finalizado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

/**
 * RSVP status — aligned with backend BkRsvpStatus.
 * Replaces: RsvpStatus legacy (4) + BkRsvpStatus (5).
 */
export const RSVP_STATUSES = [
  "pending", "confirmed", "declined", "waitlisted", "no_show",
] as const;
export type RsvpStatus = typeof RSVP_STATUSES[number];

export const RSVP_STATUS_DISPLAY: Record<RsvpStatus, DisplayConfig> = {
  pending: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  confirmed: {
    label: "Confirmado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  declined: {
    label: "Declinado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  waitlisted: {
    label: "Lista espera",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  no_show: {
    label: "No asistió",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 4 — GUESTS & TRIALS
// Backend source: guest_management models
// Consumed by: guests, families (referrals), engagement
// ═══════════════════════════════════════════════════════════

/**
 * Trial membership types — aligned with backend Phase 12.
 * Replaces: legacy week/two_weeks/month.
 */
export const TRIAL_TYPES = ["day_pass", "week_trial", "month_trial"] as const;
export type TrialType = typeof TRIAL_TYPES[number];

export const TRIAL_TYPE_DISPLAY: Record<
  TrialType,
  DisplayConfig & { days: number }
> = {
  day_pass: {
    label: "Pase diario",
    days: 1,
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
  week_trial: {
    label: "1 semana",
    days: 7,
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  month_trial: {
    label: "1 mes",
    days: 30,
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
};

/**
 * Trial status — full lifecycle from backend Phase 12.
 * Replaces: legacy 4-status system.
 */
export const TRIAL_STATUSES = [
  "pending_approval", "approved", "active",
  "expired", "converted", "cancelled",
] as const;
export type TrialStatus = typeof TRIAL_STATUSES[number];

export const TRIAL_STATUS_DISPLAY: Record<TrialStatus, DisplayConfig> = {
  pending_approval: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  approved: {
    label: "Aprobado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  active: {
    label: "Activo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  expired: {
    label: "Expirado",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
  converted: {
    label: "Convertido",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

/** Guest check-in status. */
export const GUEST_CHECKIN_STATUSES = [
  "active", "departed", "no_show",
] as const;
export type GuestCheckInStatus = typeof GUEST_CHECKIN_STATUSES[number];

export const GUEST_CHECKIN_STATUS_DISPLAY: Record<
  GuestCheckInStatus,
  DisplayConfig
> = {
  active: {
    label: "En el club",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  departed: {
    label: "Salió",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  no_show: {
    label: "No se presentó",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

/** Guest registry status — aligned with backend Phase 12. */
export const GUEST_REGISTRY_STATUSES = [
  "registered", "checked_in", "completed", "cancelled",
] as const;
export type GuestRegistryStatus = typeof GUEST_REGISTRY_STATUSES[number];

// ═══════════════════════════════════════════════════════════
// SECTION 5 — SHARED PATTERNS
// Used across 2+ domains for consistent classification.
// ═══════════════════════════════════════════════════════════

/**
 * Trend direction — dashboard, engagement, events, finance.
 */
export const TREND_DIRECTIONS = ["improving", "stable", "declining"] as const;
export type TrendDirection = typeof TREND_DIRECTIONS[number];

export const TREND_DISPLAY: Record<
  TrendDirection,
  DisplayConfig & { icon: string }
> = {
  improving: {
    label: "Mejorando",
    icon: "TrendingUp",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  stable: {
    label: "Estable",
    icon: "Minus",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  declining: {
    label: "Descendiendo",
    icon: "TrendingDown",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

/**
 * Severity levels — anomaly, conflict, maintenance, risk, churn.
 */
export const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type SeverityLevel = typeof SEVERITY_LEVELS[number];

export const SEVERITY_DISPLAY: Record<SeverityLevel, DisplayConfig> = {
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  medium: {
    label: "Medio",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  high: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
  },
};

/**
 * Sentiment values — already defined in Section 2 (ENGAGEMENT).
 * Re-export alias for semantic clarity in non-engagement contexts.
 */
export type DomainSentiment = Sentiment;

/**
 * Confidence levels — predictions, AI analysis, recommendations.
 */
export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type ConfidenceLevel = typeof CONFIDENCE_LEVELS[number];

export const CONFIDENCE_DISPLAY: Record<
  ConfidenceLevel,
  DisplayConfig & { pct: number }
> = {
  low: {
    label: "Baja",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    pct: 33,
  },
  medium: {
    label: "Media",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    pct: 66,
  },
  high: {
    label: "Alta",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    pct: 100,
  },
};

/**
 * Priority levels — recommendations, anomalies, maintenance.
 */
export const PRIORITY_LEVELS = ["low", "medium", "high", "urgent"] as const;
export type PriorityLevel = typeof PRIORITY_LEVELS[number];

export const PRIORITY_DISPLAY: Record<PriorityLevel, DisplayConfig> = {
  low: {
    label: "Baja",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  medium: {
    label: "Media",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  high: {
    label: "Alta",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  urgent: {
    label: "Urgente",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
  },
};

/**
 * Universal operation status — generic entity lifecycle.
 * Covers: pricing, suggestions, campaigns, rewards, programs.
 */
export const OPERATION_STATUSES = [
  "draft", "proposed", "under_review", "approved",
  "rejected", "active", "completed", "cancelled",
] as const;
export type OperationStatus = typeof OPERATION_STATUSES[number];

export const OPERATION_STATUS_DISPLAY: Record<OperationStatus, DisplayConfig> = {
  draft: {
    label: "Borrador",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  proposed: {
    label: "Propuesta",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
  under_review: {
    label: "En Revisión",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  approved: {
    label: "Aprobado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  rejected: {
    label: "Rechazado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  active: {
    label: "Activo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  completed: {
    label: "Completado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

/** HITL approval levels — global system. */
export const APPROVAL_LEVELS = [
  "auto", "semi", "hitl", "always_human",
] as const;
export type ApprovalLevel = typeof APPROVAL_LEVELS[number];

// ═══════════════════════════════════════════════════════════
// SECTION 6 — LEGACY MAPPING HELPERS
// Use during incremental migration from legacy types to master.
// Once migration is complete, these can be removed.
// ═══════════════════════════════════════════════════════════

/**
 * Maps legacy frontend EventType (8) → master EventCategory.
 * Legacy: social, sports, cultural, gastronomic, kids, corporate, seasonal, private
 * Source: features/events/types.ts (legacy EventType)
 */
export const LEGACY_EVENT_TYPE_MAP: Record<string, EventCategory> = {
  social: "social",
  sports: "sports",
  cultural: "cultural",
  gastronomic: "social",
  kids: "children",
  corporate: "corporate",
  seasonal: "festive",
  private: "private",
};

/**
 * Maps legacy frontend EventStatus (4) → master EventStatus.
 * Legacy: draft, published, cancelled, completed
 * Source: features/events/types.ts (legacy EventStatus)
 */
export const LEGACY_EVENT_STATUS_MAP: Record<string, EventStatus> = {
  draft: "draft",
  published: "published",
  cancelled: "cancelled",
  completed: "completed",
};

/**
 * Maps legacy frontend EngagementLevel (5) → master EngagementLevel (7).
 * Legacy: thriving, active, moderate, at_risk, dormant
 * Source: features/engagement/types.ts
 */
export const LEGACY_ENGAGEMENT_MAP: Record<string, EngagementLevel> = {
  thriving: "champion",
  active: "active",
  moderate: "warm",
  at_risk: "at_risk",
  dormant: "inactive",
};

/**
 * Maps backend engagement level names → frontend display names.
 * Backend: highly_engaged, engaged, moderate, disengaged, inactive, at_risk
 * Source: features/engagement/types.ts ENGAGEMENT_LEVEL_MAP
 */
export const BACKEND_ENGAGEMENT_MAP: Record<string, EngagementLevel> = {
  highly_engaged: "champion",
  engaged: "active",
  moderate: "warm",
  disengaged: "cooling",
  inactive: "inactive",
  at_risk: "at_risk",
  champion: "champion",
  loyal: "loyal",
  active: "active",
  warm: "warm",
  cooling: "cooling",
};

/**
 * Maps legacy dashboard age group keys → master AgeGroupCategory.
 * Legacy: children_0_5, children_6_12, teens_13_17, young_adults_18_30, adults_31_50, seniors_51_plus
 * Source: features/dashboard/types.ts AGE_GROUP_MAP
 */
export const LEGACY_DASHBOARD_AGE_GROUP_MAP: Record<
  string,
  AgeGroupCategory
> = {
  children_0_5: "toddler",
  children_6_12: "kids",
  teens_13_17: "teens",
  young_adults_18_30: "young_adults",
  adults_31_50: "adults",
  seniors_51_plus: "seniors",
};

/**
 * Maps legacy member roles (Spanish) → backend canonical (English).
 * Source: features/families/types.ts ROLE_BACKEND_MAP
 */
export const LEGACY_MEMBER_ROLE_MAP: Record<string, MemberRole> = {
  titular: "primary",
  conyuge: "spouse",
  hijo: "child",
  dependiente: "dependent",
  invitado_permanente: "dependent",
};

/**
 * Maps legacy trial type values → master TrialType.
 * Legacy: week, two_weeks, month
 * Source: features/guests/types.ts (original TrialMembership)
 */
export const LEGACY_TRIAL_TYPE_MAP: Record<string, TrialType> = {
  week: "week_trial",
  two_weeks: "week_trial",
  month: "month_trial",
};

/**
 * Maps legacy trial status values → master TrialStatus.
 * Legacy: active, expired, converted, cancelled (4 values)
 * Source: features/guests/types.ts (original TrialMembership)
 */
export const LEGACY_TRIAL_STATUS_MAP: Record<string, TrialStatus> = {
  active: "active",
  expired: "expired",
  converted: "converted",
  cancelled: "cancelled",
};

/**
 * Maps legacy engagement level frontend values → legacy dashboard tier values.
 * Use when displaying tiers in engagement context.
 */
export const DASHBOARD_TIER_TO_MEMBER_TIER: Record<string, MemberTier> = {
  basic: "basic",
  premium: "premium",
  vip: "vip",
  Platinum: "platino",
  Gold: "oro",
  Silver: "plata",
};

// ═══════════════════════════════════════════════════════════
// SECTION 7 — VALIDATION HELPERS
// Runtime validation for enum values coming from backend.
// ═══════════════════════════════════════════════════════════

/** Type guard: check if a string is a valid MemberTier. */
export function isMemberTier(value: string): value is MemberTier {
  return (MEMBER_TIERS as readonly string[]).includes(value);
}

/** Type guard: check if a string is a valid AgeGroupCategory. */
export function isAgeGroupCategory(
  value: string,
): value is AgeGroupCategory {
  return (AGE_GROUP_CATEGORIES as readonly string[]).includes(value);
}

/** Type guard: check if a string is a valid EngagementLevel. */
export function isEngagementLevel(
  value: string,
): value is EngagementLevel {
  return (ENGAGEMENT_LEVELS as readonly string[]).includes(value);
}

/** Type guard: check if a string is a valid EventCategory. */
export function isEventCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}

/** Type guard: check if a string is a valid EventStatus. */
export function isEventStatus(value: string): value is EventStatus {
  return (EVENT_STATUSES as readonly string[]).includes(value);
}

/** Type guard: check if a string is a valid SeverityLevel. */
export function isSeverityLevel(value: string): value is SeverityLevel {
  return (SEVERITY_LEVELS as readonly string[]).includes(value);
}

/** Type guard: check if a string is a valid TrialType. */
export function isTrialType(value: string): value is TrialType {
  return (TRIAL_TYPES as readonly string[]).includes(value);
}

/** Type guard: check if a string is a valid TrialStatus. */
export function isTrialStatus(value: string): value is TrialStatus {
  return (TRIAL_STATUSES as readonly string[]).includes(value);
}

// ═══════════════════════════════════════════════════════════
// QUICK REFERENCE
//
// ┌──────────────────────────────────────────────────────┐
// │ Import pattern (domain types.ts):                    │
// │                                                      │
// │ import {                                           │
// │   type EventCategory,                              │
// │   EVENT_CATEGORY_DISPLAY,                          │
// │   LEGACY_EVENT_TYPE_MAP,                           │
// │   isEventCategory,                                 │
// │ } from "@/shared/types/domain-enums";              │
// │                                                      │
// │ // Re-export for backward compat during migration:   │
// │ export type { EventCategory } from                  │
// │   "@/shared/types/domain-enums";                     │
// └──────────────────────────────────────────────────────┘
//
// Total enums: 19 (+2 F39, +1 F40 ScenarioType)
// Total display configs: 16 (+2 F39, +1 F40)
// Total legacy mappings: 8
// Total type guards: 9 (+1 F40 isScenarioType)
// ═══════════════════════════════════════════════════════════
// ─── Member 360 (added in F39) ──────────────────────────────────────────────

export const MEMBER_HEALTH_LEVELS = ["excellent", "healthy", "attention", "critical"] as const;
export type MemberHealthLevel = (typeof MEMBER_HEALTH_LEVELS)[number];

export const MEMBER_HEALTH_LEVEL_DISPLAY: Record<MemberHealthLevel, { label: string; color: string; bgColor: string }> = {
  excellent: { label: "Excepcional",  color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)" },
  healthy:   { label: "Saludable",    color: "var(--color-teal-400)",    bgColor: "var(--color-teal-bg)" },
  attention: { label: "Atención",     color: "var(--color-amber-400)",   bgColor: "var(--color-amber-bg)" },
  critical:  { label: "Crítico",      color: "var(--color-rose-400)",    bgColor: "var(--color-rose-bg)" },
};

export const CHURN_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type ChurnRiskLevel = (typeof CHURN_RISK_LEVELS)[number];

export const CHURN_RISK_LEVEL_DISPLAY: Record<ChurnRiskLevel, { label: string; color: string; bgColor: string }> = {
  low:      { label: "Bajo",       color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)" },
  medium:   { label: "Medio",      color: "var(--color-amber-400)",   bgColor: "var(--color-amber-bg)" },
  high:     { label: "Alto",       color: "var(--color-rose-400)",    bgColor: "var(--color-rose-bg)" },
  critical: { label: "Crítico",    color: "var(--color-rose-500)",    bgColor: "var(--color-critical-bg)" },
};

// ── Scenario Type (F40 — cross-domain: revenue forecast + simulation) ──

export const SCENARIO_TYPES = ["optimistic", "base", "pessimistic"] as const;
export type ScenarioType = (typeof SCENARIO_TYPES)[number];

export const SCENARIO_TYPE_DISPLAY: Record<
  ScenarioType,
  DisplayConfig
> = {
  optimistic: {
    label: "Optimista",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  base: {
    label: "Base",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  pessimistic: {
    label: "Pesimista",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export function isScenarioType(value: string): value is ScenarioType {
  return (SCENARIO_TYPES as readonly string[]).includes(value);
}
// ── Drift Status (F44 — ML Intelligence: PSI drift detection) ─────────────

export const DRIFT_STATUSES = ["stable", "mild", "significant", "severe"] as const;
export type DriftStatus = (typeof DRIFT_STATUSES)[number];

export const DRIFT_STATUS_DISPLAY: Record<DriftStatus, DisplayConfig> = {
  stable: {
    label: "Estable",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  mild: {
    label: "Leve",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  significant: {
    label: "Significativo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  severe: {
    label: "Severo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
  },
};

export function isDriftStatus(value: string): value is DriftStatus {
  return (DRIFT_STATUSES as readonly string[]).includes(value);
}

// ═══════════════════════════════════════════════════════════
// ENUM REUSE MAPPING (F40)
//
// Los siguientes enums propuestos en F40 son DUPLICADOS
// de enums ya existentes. Se reusan directamente:
//
// ┌──────────────────────────┬─────────────────────────┐
// │ Enum propuesto (F40)     │ Se reemplaza por        │
// ├──────────────────────────┼─────────────────────────┤
// │ AgeGroupHealthLevel      │ MemberHealthLevel       │
// │ GuestHealthLevel         │ MemberHealthLevel       │
// │ SatisfactionHealthLevel  │ MemberHealthLevel       │
// │ MLHealthLevel            │ MemberHealthLevel       │
// │ AnomalySeverity          │ SeverityLevel           │
// └──────────────────────────┴─────────────────────────┘
//
// Enums domain-specific permanecen como inline unions
// en contracts.ts (regla #27):
//
// AgeGroupProposalType, AgeGroupType, ConversionStage,
// GuestProposalType, SatisfactionProposalType, NPSSegment,
// AnomalyType, ForecastTarget, SegmentLabel, DomainCoverageStatus
// ═══════════════════════════════════════════════════════════
