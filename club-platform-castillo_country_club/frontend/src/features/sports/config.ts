/**
 * src/features/sports/config.ts
 * ═══════════════════════════════════════════════════════════
 * Sports & Recreation — Configuration
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * Zero magic numbers. Every threshold, weight, limit, and
 * constant is named, documented, and testable.
 *
 * Architecture:
 *   §1    MCP Connection (server, tools, freshness)
 *   §2    Dashboard Modes + Ambient State
 *   §3    Advisor Thresholds (22 rules)
 *   §4    Health Factor Config (5 factors)
 *   §5    Cross-Domain Signal Config (10 signals)
 *   §6    Arena Config (grid, pulse, capacity)
 *   §7    Athletic Config (axes, levels, fatigue)
 *   §8    Competition Config (brackets, Elo, drama)
 *   §9    Social Config (isolation, matching, clusters)
 *   §10   Coaching Config (compatibility, training)
 *   §11   Wellness Config (risk, recovery, overtraining)
 *   §12   Financial Config (optimization, revenue)
 *   §13   Season Config (CR-specific, narrative)
 *   §14   Class Config (enrollment, skill balancing)
 *   §15   Equipment Config (lifecycle, replacement)
 *   §16   Weather Config (CR-specific, outdoor impact)
 *   §17   Render Config (Canvas/SVG limits)
 *   §18   Utility Functions
 *
 * @version 2.0.0 — Sports Intelligence Layer
 * @phase   33 — "The Arena"
 */

import type { AIDomain } from "@/shared/types/ai-intelligence";
import type { SeverityLevel } from "@/shared/types/domain-enums";
import type {
  SportType,
  AthleticAxis,
  SportsDashboardMode,
  SportsDecisionStageMode,
} from "./types";
import {
  SPORT_CONFIG,
  ATHLETIC_LEVEL_CONFIG,
  CrowdLevel,
  VenueLiveStatus,
  AthleticLevel,
  SeasonAct,
} from "./types";

// ═══════════════════════════════════════════════════════════
// §1 — MCP CONNECTION
// ═══════════════════════════════════════════════════════════

export const SPORTS_MCP_SERVER = "sports_recreation" as const;

export const SPORTS_MCP_TOOLS = {
  get_sports_analytics: {
    args: {} as Record<string, unknown>,
    responseKey: "analytics" as const,
    freshness: 120_000,
    description: "Aggregated sports analytics: court utilization, tournaments, classes, equipment, coaching, engagement, popularity, peak hours",
  },
  get_sports_health_summary: {
    args: {} as Record<string, unknown>,
    responseKey: "health_summary" as const,
    freshness: 120_000,
    description: "Sports health factors, scores, and status",
  },
  get_sports_calendar: {
    args: {} as Record<string, unknown>,
    responseKey: "calendar" as const,
    freshness: 60_000,
    description: "Calendar items: reservations, tournaments, classes, coaching, leagues",
  },
  // ── TIER 2: Future MCP tools (when backend supports) ──
  // get_member_athletic_profiles: { responseKey: "athletic_profiles", freshness: 300_000 },
  // get_venue_live_status:        { responseKey: "venues",           freshness: 30_000 },
  // get_tournament_brackets:      { responseKey: "brackets",         freshness: 120_000 },
  // get_social_sport_data:        { responseKey: "sessions_log",     freshness: 120_000 },
  // get_coaching_profiles:        { responseKey: "coaching",         freshness: 300_000 },
  // get_equipment_detailed:       { responseKey: "equipment",        freshness: 300_000 },
  // get_season_data:              { responseKey: "seasons",          freshness: 600_000 },
  // get_wellness_sport_data:      { responseKey: "wellness",         freshness: 120_000 },
  // get_sport_financial_data:     { responseKey: "financial",        freshness: 300_000 },
} as const;

export const SPORTS_FRESHNESS_TIERS = {
  /** 30s — live venue status, active sessions */
  realtime: 30_000,
  /** 60s — calendar, in-progress tournaments */
  near_real: 60_000,
  /** 120s — analytics, health summary */
  session: 120_000,
  /** 300s — equipment, coaching profiles, athletic data */
  stable: 300_000,
  /** 600s — season data, historical match data */
  archive: 600_000,
} as const;

// ═══════════════════════════════════════════════════════════
// §2 — DASHBOARD MODES + AMBIENT STATE
// ═══════════════════════════════════════════════════════════

export const SPORTS_DASHBOARD_MODES: Array<{
  id: SportsDecisionStageMode;
  label: string;
  lucideIcon: string;
  description: string;
  defaultAccent: string;
}> = [
  {
    id: "arena",
    label: "La Arena",
    lucideIcon: "Target",
    description: "Vistas en vivo, estado de canchas, radar atlético",
    defaultAccent: "var(--color-teal-400)",
  },
  {
    id: "trajectory",
    label: "La Trayectoria",
    lucideIcon: "TrendingUp",
    description: "Progresión de habilidad, coaching, wellness",
    defaultAccent: "var(--color-emerald-400)",
  },
  {
    id: "competition",
    label: "La Competencia",
    lucideIcon: "Trophy",
    description: "Brackets, narrativa de temporada, standings",
    defaultAccent: "var(--color-gold-400)",
  },
  {
    id: "team",
    label: "El Equipo",
    lucideIcon: "Users",
    description: "Grafo social, parejas de dobles, formación de equipos",
    defaultAccent: "var(--color-violet-400)",
  },
  {
    id: "business",
    label: "El Negocio",
    lucideIcon: "BarChart3",
    description: "Revenue, inteligencia de clases, equipamiento",
    defaultAccent: "var(--color-amber-400)",
  },
];

export const SPORTS_AMBIENT_CONFIG = {
  calm: {
    mode: "calm" as SportsDashboardMode,
    accentColor: "var(--color-teal-400)",
    glowOpacity: 0.05,
    pulseSpeed: "6s",
    pulseRate: "dormant" as const,
  },
  alert: {
    mode: "alert" as SportsDashboardMode,
    accentColor: "var(--color-amber-400)",
    glowOpacity: 0.12,
    pulseSpeed: "3s",
    pulseRate: "elevated" as const,
  },
  critical: {
    mode: "critical" as SportsDashboardMode,
    accentColor: "var(--color-rose-400)",
    glowOpacity: 0.20,
    pulseSpeed: "1.5s",
    pulseRate: "rapid" as const,
  },
} as const;

export const SPORTS_DASHBOARD_THRESHOLDS = {
  /** Minimum critical insights to switch to "critical" mode */
  CRITICAL_MODE_THRESHOLD: 2,
  /** Minimum high insights to switch to "alert" mode */
  ALERT_MODE_THRESHOLD: 3,
  /** Briefing overlay duration (ms) */
  BRIEFING_DURATION_MS: 3_500,
  /** Maximum insights visible in Intelligence Stream */
  STREAM_MAX_VISIBLE: 8,
  /** Intelligence score weight for narrative tab ordering */
  NARRATIVE_WEIGHT: 0.3,
} as const;

// ═══════════════════════════════════════════════════════════
// §3 — ADVISOR THRESHOLDS (22 rules)
// ═══════════════════════════════════════════════════════════

export const SPORTS_ADVISOR_THRESHOLDS = {
  // ── Layer 1: Context (R1-R3) — always fire, informational ──
  // No thresholds — these are summary rules

  // ── Layer 2: Reactive (R4-R7) ──
  COURT_UTIL_LOW_PCT: 30,
  COURT_UTIL_SIGNAL_MIN: 2,
  PARTICIPATION_LOW_PCT: 50,
  CLASS_UNDERPERFORM_PCT: 40,
  EQUIPMENT_CRITICAL_URGENCY: 70,

  // ── Layer 3: Preventive (R8-R10) ──
  UPCOMING_TOURNAMENT_MIN: 1,
  COACHING_GAP_SESSIONS: 5,
  OUTDOOR_SHARE_MIN_PCT: 50,

  // ── Layer 4: Optimization (R11-R13) ──
  PEAK_HOUR_SATURATION_COUNT: 20,
  SPORT_CONCENTRATION_MAX_PCT: 60,
  EQUIPMENT_STALE_DAYS: 365,

  // ── Layer 5: Proactive (R14-R15) ──
  ENGAGEMENT_LOW_SCORE: 40,
  TOURNAMENT_OPPORTUNITY_COURTS_MIN: 2,
  TOURNAMENT_OPPORTUNITY_UTIL_MAX: 70,

  // ── New rules (SR16-SR22) ──
  SOCIAL_ISOLATION_SESSIONS: 10,
  CROSS_SPORT_TRANSFER_MIN: 0.3,
  ATHLETIC_PLATEAU_WEEKS: 4,
  INJURY_RISK_HIGH_PCT: 70,
  OVERTRAINING_THRESHOLD: 75,
  WELLNESS_CORRELATION_MIN: -0.3,
  EQUIPMENT_FAILURE_URGENCY: 85,
} as const;

/** Advisor rule evaluation order (priority-based) */
export const SPORTS_ADVISOR_RULE_ORDER = [
  // Layer 1: Context (priority 100)
  "R1_COURTS_STATUS",
  "R2_ACTIVE_TOURNAMENTS",
  "R3_CLASSES_SUMMARY",
  // Layer 2: Reactive (priority 200)
  "R4_LOW_COURT_UTIL",
  "R5_TOURNAMENT_REG_LOW",
  "R6_CLASS_LOW_ENROLLMENT",
  "R7_EQUIPMENT_REPAIR",
  // Layer 3: Preventive (priority 300)
  "R8_NO_TOURNAMENTS",
  "R9_COACHING_GAP",
  "R10_SEASONAL_MISMATCH",
  // Layer 4: Optimization (priority 400)
  "R11_PEAK_HOUR_SATURATION",
  "R12_SPORT_IMBALANCE",
  "R13_EQUIPMENT_STALE",
  // Layer 5: Proactive (priority 500)
  "R14_TOURNAMENT_OPPORTUNITY",
  "R15_ENGAGEMENT_LOW",
  // New rules (priority 200-500)
  "SR16_SOCIAL_ISOLATION",
  "SR17_CROSS_SPORT_OPPORTUNITY",
  "SR18_FINANCIAL_SIGNAL_RESPONSE",
  "SR19_ATTENDANCE_FORECAST",
  "SR20_WELLNESS_SPORT_CORRELATION",
  "SR21_OPTIMAL_CHALLENGE_MATCHING",
  "SR22_FACILITY_VENUE_COORDINATION",
] as const;

export const SPORTS_ADVISOR_LAYER_META: Record<
  string,
  { label: string; color: string; lucideIcon: string; priority: number }
> = {
  micro:       { label: "Contexto",      color: "var(--color-silver-400)",  lucideIcon: "Eye",        priority: 100 },
  health:      { label: "Contexto",      color: "var(--color-silver-400)",  lucideIcon: "Eye",        priority: 100 },
  macro:       { label: "Reactiva",      color: "var(--color-amber-400)",   lucideIcon: "AlertTriangle", priority: 200 },
  engagement:  { label: "Reactiva",      color: "var(--color-amber-400)",   lucideIcon: "AlertTriangle", priority: 200 },
  prediction:  { label: "Preventiva",    color: "var(--color-teal-400)",    lucideIcon: "Shield",     priority: 300 },
  strategy:    { label: "Estratégica",   color: "var(--color-violet-400)",  lucideIcon: "Target",     priority: 400 },
  utilization: { label: "Optimización",  color: "var(--color-emerald-400)", lucideIcon: "TrendingUp", priority: 400 },
  innovation:  { label: "Proactiva",     color: "var(--color-gold-400)",    lucideIcon: "Lightbulb",  priority: 500 },
};

// ═══════════════════════════════════════════════════════════
// §4 — HEALTH FACTOR CONFIG (5 factors, weights sum 1.0)
// ═══════════════════════════════════════════════════════════

export const SPORTS_HEALTH_FACTORS_CONFIG = {
  court_utilization: {
    id: "court_utilization",
    label: "Utilización de canchas",
    weight: 0.30,
    /** Optimal range: 40-75% utilization */
    OPTIMAL_MIN: 40,
    OPTIMAL_MAX: 75,
  },
  class_health: {
    id: "class_health",
    label: "Salud de clases",
    weight: 0.25,
    /** Classes with fill rate above this are "healthy" */
    HEALTHY_FILL_RATE: 60,
  },
  equipment_health: {
    id: "equipment_health",
    label: "Salud de equipamiento",
    weight: 0.20,
    /** Equipment below this condition score is "damaged" */
    DAMAGED_THRESHOLD: 40,
  },
  engagement: {
    id: "engagement",
    label: "Engagement deportivo",
    weight: 0.15,
    /** Engagement below this triggers concern */
    LOW_THRESHOLD: 40,
  },
  tournament_activity: {
    id: "tournament_activity",
    label: "Actividad de torneos",
    weight: 0.10,
    /** Points per upcoming tournament */
    UPCOMING_WEIGHT: 30,
    /** Points per in-progress tournament */
    IN_PROGRESS_WEIGHT: 20,
  },
} as const;

/** Verify weights sum to 1.0 */
const _healthWeightSum =
  SPORTS_HEALTH_FACTORS_CONFIG.court_utilization.weight +
  SPORTS_HEALTH_FACTORS_CONFIG.class_health.weight +
  SPORTS_HEALTH_FACTORS_CONFIG.equipment_health.weight +
  SPORTS_HEALTH_FACTORS_CONFIG.engagement.weight +
  SPORTS_HEALTH_FACTORS_CONFIG.tournament_activity.weight;

if (Math.abs(_healthWeightSum - 1.0) > 0.01) {
  console.warn(
    `[SportsConfig] Health factor weights sum to ${_healthWeightSum}, expected 1.0`,
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — CROSS-DOMAIN SIGNAL CONFIG (10 signals)
// ═══════════════════════════════════════════════════════════

export interface SportsSignalConfig {
  id: string;
  targetDomains: AIDomain[];
  defaultSeverity: SeverityLevel;
  label: string;
  ttl: number;
}

export const SPORTS_SIGNAL_CONFIG: Record<string, SportsSignalConfig> = {
  // ── Existing (2) — updated targets ──
  spt_utilization_drop: {
    id: "spt_utilization_drop",
    targetDomains: ["global", "engagement"],
    defaultSeverity: "critical",
    label: "Sports court utilization critically low",
    ttl: 300_000,
  },
  spt_capacity_warning: {
    id: "spt_capacity_warning",
    targetDomains: ["global", "facilities"],
    defaultSeverity: "critical",
    label: "Peak hour saturation in sports facilities",
    ttl: 300_000,
  },

  // ── New (8) ──
  spt_skill_breakthrough: {
    id: "spt_skill_breakthrough",
    targetDomains: ["sports", "engagement", "communication"],
    defaultSeverity: "medium",
    label: "Member achieved skill breakthrough",
    ttl: 600_000,
  },
  spt_injury_risk: {
    id: "spt_injury_risk",
    targetDomains: ["communication"],
    defaultSeverity: "critical",
    label: "Member at high injury risk",
    ttl: 300_000,
  },
  spt_tournament_victory: {
    id: "spt_tournament_victory",
    targetDomains: ["sports", "engagement", "communication"],
    defaultSeverity: "medium",
    label: "Member won tournament match",
    ttl: 600_000,
  },
  spt_participation_decline: {
    id: "spt_participation_decline",
    targetDomains: ["engagement", "communication"],
    defaultSeverity: "critical",
    label: "Sports participation declining",
    ttl: 300_000,
  },
  spt_coaching_milestone: {
    id: "spt_coaching_milestone",
    targetDomains: ["sports", "engagement"],
    defaultSeverity: "medium",
    label: "Coaching milestone achieved",
    ttl: 600_000,
  },
  spt_venue_overcapacity: {
    id: "spt_venue_overcapacity",
    targetDomains: ["facilities", "events"],
    defaultSeverity: "critical",
    label: "Venue exceeding safe capacity",
    ttl: 120_000,
  },
  spt_season_climax: {
    id: "spt_season_climax",
    targetDomains: ["engagement", "communication", "events"],
    defaultSeverity: "medium",
    label: "Season entering climax phase",
    ttl: 86_400_000,
  },
  spt_equipment_failure: {
    id: "spt_equipment_failure",
    targetDomains: ["facilities"],
    defaultSeverity: "critical",
    label: "Equipment failure predicted",
    ttl: 300_000,
  },
};

/** Cross-domain signals that Sports CONSUMES from other domains */
export const SPORTS_CONSUMED_SIGNALS: Record<
  string,
  { sourceDomain: AIDomain; handlingRule: string; description: string }
> = {
  fac_venue_overcapacity: {
    sourceDomain: "facilities",
    handlingRule: "SR22",
    description: "Reassign sports venues when facilities report overcapacity",
  },
  sat_critical_decline: {
    sourceDomain: "satisfaction",
    handlingRule: "SR20",
    description: "Adjust training intensity when satisfaction drops critically",
  },
  fin_revenue_decline: {
    sourceDomain: "financial",
    handlingRule: "SR18",
    description: "Optimize sports pricing when revenue declines",
  },
  evt_major_event: {
    sourceDomain: "events",
    handlingRule: "SR22",
    description: "Block venues when major event scheduled",
  },
};

// ═══════════════════════════════════════════════════════════
// §6 — ARENA CONFIG (grid, pulse, capacity)
// ═══════════════════════════════════════════════════════════

export const ARENA_CONFIG = {
  /** Grid layout: columns per breakpoint */
  GRID_COLUMNS_DESKTOP: 4,
  GRID_COLUMNS_TABLET: 2,
  GRID_COLUMNS_MOBILE: 1,
  /** Pulse animation speeds by status */
  PULSE_SPEEDS: {
    idle: "6s",
    active: "3s",
    maintenance: "4s",
    reserved: "5s",
    peak: "1.5s",
  } as Record<VenueLiveStatus, string>,
  /** Occupancy thresholds for crowd level classification */
  CROWD_THRESHOLDS: {
    low: 30,
    medium: 60,
    high: 85,
    very_high: 100,
  } as Record<CrowdLevel, number>,
  /** Demand forecast: hours ahead to predict */
  FORECAST_HOURS: 24,
  /** Demand forecast: minimum data points required */
  FORECAST_MIN_DATA_POINTS: 14,
  /** Optimal booking window: minimum quality score */
  BOOKING_WINDOW_MIN_QUALITY: 60,
  /** Capacity ring: SVG radius for venue capacity visualization */
  CAPACITY_RING_RADIUS: 40,
  CAPACITY_RING_STROKE: 6,
} as const;

// ═══════════════════════════════════════════════════════════
// §7 — ATHLETIC CONFIG (axes, levels, fatigue)
// ═══════════════════════════════════════════════════════════

export const ATHLETIC_CONFIG = {
  /** Axis weights for overall score calculation */
  AXIS_WEIGHTS: {
    power: 0.18,
    speed: 0.16,
    endurance: 0.18,
    technique: 0.20,
    tactical: 0.14,
    mental: 0.14,
  } as Record<AthleticAxis, number>,
  /** Minimum sessions required for reliable profile */
  MIN_SESSIONS_FOR_PROFILE: 5,
  /** Minimum sessions for trajectory prediction */
  MIN_SESSIONS_FOR_TRAJECTORY: 10,
  /** Plateau detection: minimum weeks with <2% improvement */
  PLATEAU_MIN_WEEKS: 4,
  PLATEAU_IMPROVEMENT_THRESHOLD: 2,
  /** Breakthrough probability: base rate (before adjustments) */
  BREAKTHROUGH_BASE_RATE: 15,
  /** Fatigue: sessions per week thresholds */
  FATIGUE_OPTIMAL_SESSIONS_MIN: 3,
  FATIGUE_OPTIMAL_SESSIONS_MAX: 6,
  FATIGUE_OVERTRAINING_SESSIONS: 8,
  /** Fatigue: recovery hours per intensity level */
  RECOVERY_HOURS_LOW: 12,
  RECOVERY_HOURS_MODERATE: 24,
  RECOVERY_HOURS_INTENSE: 48,
  RECOVERY_HOURS_PEAK: 72,
  /** Peak window: minimum sessions to detect pattern */
  PEAK_WINDOW_MIN_SESSIONS: 8,
  /** Cross-sport transfer: minimum shared sessions to detect */
  CROSS_SPORT_MIN_SHARED_SESSIONS: 3,
  /** Cross-sport transfer: minimum transfer rate to report */
  CROSS_SPORT_MIN_TRANSFER_RATE: 0.3,
  /** Skill trajectory: prediction horizon in weeks */
  TRAJECTORY_PREDICTION_WEEKS: 12,
  /** Skill trajectory: confidence band expansion rate per week */
  TRAJECTORY_CONFIDENCE_DECAY: 0.03,
} as const;

/** Level thresholds — maps overall score to AthleticLevel */
export const ATHLETIC_LEVEL_THRESHOLDS: Array<{
  level: AthleticLevel;
  min: number;
  max: number;
}> = Object.entries(ATHLETIC_LEVEL_CONFIG)
  .map(([, cfg]) => ({ level: cfg.label as unknown as AthleticLevel, min: cfg.min, max: cfg.max }))
  .sort((a, b) => a.min - b.min);

// ═══════════════════════════════════════════════════════════
// §8 — COMPETITION CONFIG (brackets, Elo, drama)
// ═══════════════════════════════════════════════════════════

export const COMPETITION_CONFIG = {
  /** Default Elo rating for new members */
  DEFAULT_ELO: 1200,
  /** K-factor for Elo updates (higher = more volatile) */
  ELO_K_FACTOR: 32,
  /** Elo advantage for home/known venue */
  HOME_ADVANTAGE_ELO: 50,
  /** Elo advantage per AthleticLevel difference */
  LEVEL_ADVANTAGE_ELO: 100,
  /** Minimum matches for reliable prediction */
  MIN_MATCHES_FOR_PREDICTION: 3,
  /** Upset probability: maximum Elo difference to consider */
  UPSET_MAX_ELO_DIFF: 400,
  /** Upset probability: base upset rate (when Elo is equal) */
  UPSET_BASE_RATE: 0.15,
  /** Drama score: closeness weight (how close was the match) */
  DRAMA_CLOSENESS_WEIGHT: 0.4,
  /** Drama score: stakes weight (tournament stage) */
  DRAMA_STAKES_WEIGHT: 0.3,
  /** Drama score: upset weight (unexpected result) */
  DRAMA_UPSET_WEIGHT: 0.3,
  /** Rivalry: minimum matches to qualify */
  RIVALRY_MIN_MATCHES: 5,
  /** Rivalry: minimum intensity score */
  RIVALRY_MIN_INTENSITY: 60,
  /** Season narrative: minimum matches per act */
  SEASON_MIN_MATCHES_PER_ACT: 5,
  /** Bracket: maximum participants before simplification */
  BRACKET_MAX_PARTICIPANTS: 64,
  /** Bracket: SVG round width */
  BRACKET_ROUND_WIDTH: 180,
  /** Bracket: SVG match height */
  BRACKET_MATCH_HEIGHT: 60,
  /** Playoff: maximum scenarios to generate */
  MAX_PLAYOFF_SCENARIOS: 1000,
} as const;

// ═══════════════════════════════════════════════════════════
// §9 — SOCIAL CONFIG (isolation, matching, clusters)
// ═══════════════════════════════════════════════════════════

export const SOCIAL_SPORT_CONFIG = {
  /** Member is "isolated" if they've played alone this many sessions */
  ISOLATION_SESSION_THRESHOLD: 10,
  /** Minimum sessions together to form an edge in the graph */
  MIN_SESSIONS_FOR_EDGE: 2,
  /** Doubles partner: minimum compatibility to suggest */
  DOUBLES_MIN_COMPATIBILITY: 50,
  /** Doubles partner: schedule overlap weight in compatibility */
  DOUBLES_SCHEDULE_WEIGHT: 0.3,
  /** Doubles partner: skill complementarity weight */
  DOUBLES_COMPLEMENT_WEIGHT: 0.4,
  /** Doubles partner: sport preference weight */
  DOUBLES_SPORT_WEIGHT: 0.3,
  /** Cluster detection: minimum members per cluster */
  CLUSTER_MIN_MEMBERS: 3,
  /** Cluster detection: minimum cohesion score */
  CLUSTER_MIN_COHESION: 40,
  /** Team formation: maximum team size */
  TEAM_MAX_SIZE: 11,
  /** Team formation: balance score weight */
  TEAM_BALANCE_WEIGHT: 0.5,
  /** Team formation: complementary strengths weight */
  TEAM_COMPLEMENT_WEIGHT: 0.5,
  /** Social retention impact: sessions with others vs solo ratio */
  RETENTION_SOCIAL_RATIO_THRESHOLD: 0.3,
  /** Graph visualization: force-directed config */
  GRAPH_FORCE_STRENGTH: -100,
  GRAPH_LINK_DISTANCE: 80,
  GRAPH_CHARGE: -200,
} as const;

// ═══════════════════════════════════════════════════════════
// §10 — COACHING CONFIG (compatibility, training)
// ═══════════════════════════════════════════════════════════

export const COACHING_CONFIG = {
  /** Coach-athlete compatibility: style matching weights */
  STYLE_COMPATIBILITY: {
    drill_sergeant: { best_with: ["expert", "master"], weight: 0.7 },
    nurturer:       { best_with: ["novice", "apprentice"], weight: 0.8 },
    technical:      { best_with: ["practitioner", "expert"], weight: 0.75 },
    motivational:   { best_with: ["apprentice", "practitioner"], weight: 0.65 },
    analytical:     { best_with: ["expert", "master", "legend"], weight: 0.7 },
  } as Record<string, { best_with: string[]; weight: number }>,
  /** Training plan: default duration in weeks */
  DEFAULT_PLAN_WEEKS: 8,
  /** Training plan: maximum intensity weeks before recovery */
  MAX_INTENSE_WEEKS: 3,
  /** Training plan: recovery week frequency */
  RECOVERY_WEEK_FREQUENCY: 4,
  /** Plateau intervention: minimum weeks before suggesting change */
  PLATEAU_INTERVENTION_WEEKS: 4,
  /** Plateau intervention: recommended new activity intensity */
  PLATEAU_CROSS_TRAIN_RATIO: 0.3,
  /** Success rate: minimum coaching sessions to measure */
  MIN_SESSIONS_FOR_SUCCESS_RATE: 5,
  /** Abandonment risk: factors and weights */
  ABANDONMENT_HIGH_INTENSITY_WEIGHT: 0.3,
  ABANDONMENT_LOW_COMPATIBILITY_WEIGHT: 0.4,
  ABANDONMENT_PLATEAU_WEIGHT: 0.3,
} as const;

// ═══════════════════════════════════════════════════════════
// §11 — WELLNESS CONFIG (risk, recovery, overtraining)
// ═══════════════════════════════════════════════════════════

export const WELLNESS_CONFIG = {
  /** Injury risk: high threshold (0-100) */
  INJURY_RISK_HIGH: 70,
  /** Injury risk: critical threshold */
  INJURY_RISK_CRITICAL: 85,
  /** Overtraining: threshold (0-100) */
  OVERTRAINING_THRESHOLD: 75,
  /** Overtraining: sessions per week that trigger concern */
  OVERTRAINING_SESSIONS_WEEK: 8,
  /** Recovery: hours per intensity level */
  RECOVERY_HOURS: {
    recovery: 12,
    moderate: 24,
    intense: 48,
    peak: 72,
  } as Record<string, number>,
  /** Age-appropriate: minimum age for high-intensity sports */
  HIGH_INTENSITY_MIN_AGE: 16,
  /** Age-appropriate: recommended maximum sessions per week by age bracket */
  AGE_SESSION_LIMITS: {
    "under_18": 5,
    "18_30": 8,
    "31_50": 6,
    "51_65": 4,
    "over_65": 3,
  } as Record<string, number>,
  /** Wellness-sport correlation: minimum data points */
  CORRELATION_MIN_DATA_POINTS: 10,
  /** Wellness-sport correlation: significant threshold */
  CORRELATION_SIGNIFICANT: 0.3,
  /** Sport-specific risk multipliers */
  SPORT_RISK_MULTIPLIERS: {
    basketball: 1.2,
    football: 1.3,
    swimming: 0.7,
    yoga: 0.3,
    pilates: 0.3,
    fitness: 0.9,
    tennis: 0.8,
    golf: 0.5,
    squash: 1.1,
    padel: 0.8,
    volleyball: 1.0,
  } as Partial<Record<SportType, number>>,
} as const;

// ═══════════════════════════════════════════════════════════
// §12 — FINANCIAL CONFIG (optimization, revenue)
// ═══════════════════════════════════════════════════════════

export const SPORT_FINANCIAL_CONFIG = {
  /** Revenue optimization: minimum improvement % to suggest */
  MIN_IMPROVEMENT_PCT: 5,
  /** Revenue optimization: confidence threshold */
  MIN_OPTIMIZATION_CONFIDENCE: 60,
  /** Forecast: months ahead for revenue prediction */
  FORECAST_MONTHS: 12,
  /** Forecast: minimum historical data points */
  FORECAST_MIN_DATA_POINTS: 6,
  /** Growth potential: factors and weights */
  GROWTH_WEIGHTS: {
    enrollment_trend: 0.25,
    satisfaction: 0.20,
    utilization: 0.20,
    revenue_trend: 0.20,
    new_member_rate: 0.15,
  } as Record<string, number>,
  /** Tournament revenue: entry fee as % of total */
  TOURNAMENT_REVENUE_ENTRY_FEE_PCT: 0.6,
  /** Coaching revenue: session price estimation */
  COACHING_AVG_PRICE_PER_SESSION: 25_000,
  /** Class revenue: minimum sessions per month for viability */
  CLASS_VIABILITY_MIN_SESSIONS: 8,
  /** Monte Carlo: simulation iterations for revenue forecast */
  MONTE_CARLO_ITERATIONS: 1_000,
} as const;

// ═══════════════════════════════════════════════════════════
// §13 — SEASON CONFIG (CR-specific, narrative)
// ═══════════════════════════════════════════════════════════

export const SPORTS_SEASON_CONFIG = {
  /** Costa Rica peak season: December–April (dry months) */
  PEAK_MONTHS_START: 12,
  PEAK_MONTHS_END: 4,
  /** Minimum outdoor activity share during peak season (%) */
  OUTDOOR_SHARE_TARGET: 50,
  /** Season narrative: act boundaries as % of season completed */
  ACT_BOUNDARIES: {
    opening: 0,
    rivalries_emerge: 25,
    climax: 55,
    championship: 80,
    epilogue: 95,
  } as Record<SeasonAct, number>,
  /** Narrative: minimum drama score for turning point detection */
  TURNING_POINT_MIN_DRAMA: 70,
  /** Playoff scenarios: maximum scenarios to generate */
  MAX_PLAYOFF_SCENARIOS: 10,
  /** Championship prediction: minimum matches for reliable prediction */
  CHAMPIONSHIP_MIN_MATCHES: 10,
} as const;

// ═══════════════════════════════════════════════════════════
// §14 — CLASS CONFIG (enrollment, skill balancing)
// ═══════════════════════════════════════════════════════════

export const CLASS_CONFIG = {
  /** Enrollment: "full" threshold (% of capacity) */
  FULL_THRESHOLD_PCT: 90,
  /** Enrollment: "healthy" minimum (% of capacity) */
  HEALTHY_MIN_PCT: 40,
  /** Enrollment: "low" threshold */
  LOW_THRESHOLD_PCT: 40,
  /** Enrollment: "critical" threshold */
  CRITICAL_THRESHOLD_PCT: 20,
  /** Enrollment prediction: minimum history points */
  ENROLLMENT_PREDICTION_MIN_WEEKS: 4,
  /** Skill balancing: maximum level difference within a group */
  SKILL_GROUP_MAX_DIFF: 2,
  /** Skill balancing: optimal group size */
  SKILL_GROUP_OPTIMAL_SIZE: 6,
  /** Waitlist: priority scoring weights */
  WAITLIST_WEIGHTS: {
    skill_fit: 0.4,
    seniority: 0.3,
    registration_order: 0.3,
  } as Record<string, number>,
  /** Class intelligence: retention rate measurement window (weeks) */
  RETENTION_WINDOW_WEEKS: 4,
} as const;

// ═══════════════════════════════════════════════════════════
// §15 — EQUIPMENT CONFIG (lifecycle, replacement)
// ═══════════════════════════════════════════════════════════

export const EQUIPMENT_CONFIG = {
  /** Lifecycle: condition score thresholds */
  CONDITION_EXCELLENT: 80,
  CONDITION_GOOD: 60,
  CONDITION_FAIR: 40,
  CONDITION_POOR: 20,
  /** Failure prediction: minimum usage hours for prediction */
  FAILURE_PREDICTION_MIN_HOURS: 100,
  /** Replacement: urgency scoring */
  URGENCY_WEIGHTS: {
    condition: 0.35,
    usage_intensity: 0.25,
    age: 0.20,
    maintenance_gap: 0.20,
  } as Record<string, number>,
  /** Stale maintenance: days threshold */
  STALE_MAINTENANCE_DAYS: 365,
  /** Cost per use: amortization period (months) */
  AMORTIZATION_MONTHS: 36,
  /** Replacement budget default (₡) */
  REPLACEMENT_BUDGET_DEFAULT: 10_000_000,
} as const;

// ═══════════════════════════════════════════════════════════
// §16 — WEATHER CONFIG (CR-specific, outdoor impact)
// ═══════════════════════════════════════════════════════════

export const WEATHER_CONFIG = {
  /** Temperature: ideal range for outdoor sports (°C) */
  TEMP_IDEAL_MIN: 20,
  TEMP_IDEAL_MAX: 28,
  /** Temperature: too hot threshold */
  TEMP_HOT_THRESHOLD: 32,
  /** Temperature: too cold threshold */
  TEMP_COLD_THRESHOLD: 15,
  /** Wind: maximum acceptable for outdoor sports (km/h) */
  WIND_MAX_ACCEPTABLE: 25,
  /** Rain: probability threshold for "likely rain" */
  RAIN_PROBABILITY_THRESHOLD: 60,
  /** Weather impact: multipliers by condition */
  IMPACT_MULTIPLIERS: {
    sunny: 1.0,
    partly_cloudy: 0.95,
    cloudy: 0.85,
    light_rain: 0.5,
    rain: 0.2,
    heavy_rain: 0.0,
    thunderstorm: 0.0,
    hot: 0.7,
    cold: 0.8,
    windy: 0.6,
  } as Record<string, number>,
  /** Forecast: hours ahead for booking optimization */
  BOOKING_FORECAST_HOURS: 48,
  /** Minimum quality score for optimal booking window */
  BOOKING_OPTIMAL_MIN_QUALITY: 70,
} as const;

// ═══════════════════════════════════════════════════════════
// §17 — RENDER CONFIG (Canvas/SVG limits)
// ═══════════════════════════════════════════════════════════

export const SPORTS_RENDER_LIMITS = {
  /** ArenaGrid: maximum venues before pagination */
  ARENA_GRID_MAX_VENUES: 50,
  /** SocialSportMap: maximum nodes in force-directed graph */
  SOCIAL_MAP_MAX_NODES: 100,
  /** SocialSportMap: maximum edges */
  SOCIAL_MAP_MAX_EDGES: 200,
  /** TournamentBracket: maximum participants */
  BRACKET_MAX_PARTICIPANTS: 64,
  /** SeasonNarrative: maximum events in timeline */
  TIMELINE_MAX_EVENTS: 200,
  /** CourtHeatmap: 7 days × 24 hours */
  HEATMAP_MAX_CELLS: 168,
  /** EquipmentPanel: maximum items displayed */
  EQUIPMENT_MAX_ITEMS: 100,
  /** CoachingCanvas: maximum training plans */
  COACHING_MAX_PLANS: 50,
  /** SeasonNarrative: maximum chapters */
  SEASON_MAX_CHAPTERS: 20,
  /** SkillTrajectory: maximum data points */
  TRAJECTORY_MAX_POINTS: 100,
  /** SocialSportMap: show top N when over limit */
  SOCIAL_MAP_SHOW_TOP: 50,
  /** AthleticRadar: animation duration (ms) */
  RADAR_ANIMATION_DURATION: 800,
  /** ArenaGrid: canvas frame rate target */
  CANVAS_TARGET_FPS: 30,
  /** ArenaGrid: canvas batch render interval (ms) */
  CANVAS_BATCH_INTERVAL: 33,
} as const;

// ═══════════════════════════════════════════════════════════
// §18 — UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Derive dashboard mode from insight counts.
 * Called by useSportsDashboard after advisor evaluation.
 */
export function deriveSportsDashboardMode(
  criticalCount: number,
  highCount: number,
): SportsDashboardMode {
  if (criticalCount >= SPORTS_DASHBOARD_THRESHOLDS.CRITICAL_MODE_THRESHOLD) {
    return "critical";
  }
  if (highCount >= SPORTS_DASHBOARD_THRESHOLDS.ALERT_MODE_THRESHOLD) {
    return "alert";
  }
  return "calm";
}

/**
 * Derive ambient state from dashboard mode.
 * Used by SportsAmbientCanvas.
 */
export function deriveSportsAmbientState(
  mode: SportsDashboardMode,
): {
  mode: SportsDashboardMode;
  intensity: number;
  accentColor: string;
  pulseRate: "dormant" | "slow" | "elevated" | "rapid";
} {
  const config = SPORTS_AMBIENT_CONFIG[mode];
  return {
    mode,
    intensity: config.glowOpacity,
    accentColor: config.accentColor,
    pulseRate: config.pulseRate,
  };
}

/**
 * Classify crowd level from occupancy percentage.
 */
export function classifyCrowdLevel(occupancyPct: number): CrowdLevel {
  if (occupancyPct >= ARENA_CONFIG.CROWD_THRESHOLDS.high) return CrowdLevel.VERY_HIGH;
  if (occupancyPct >= ARENA_CONFIG.CROWD_THRESHOLDS.medium) return CrowdLevel.HIGH;
  if (occupancyPct >= ARENA_CONFIG.CROWD_THRESHOLDS.low) return CrowdLevel.MEDIUM;
  return CrowdLevel.LOW;
}

/**
 * Classify venue live status from real-time data.
 */
export function classifyVenueStatus(
  currentOccupancy: number,
  isUnderMaintenance: boolean,
  hasActiveReservations: boolean,
): VenueLiveStatus {
  if (isUnderMaintenance) return VenueLiveStatus.MAINTENANCE;
  if (currentOccupancy >= ARENA_CONFIG.CROWD_THRESHOLDS.high) return VenueLiveStatus.PEAK;
  if (currentOccupancy > 0) return VenueLiveStatus.ACTIVE;
  if (hasActiveReservations) return VenueLiveStatus.RESERVED;
  return VenueLiveStatus.IDLE;
}

/**
 * Classify athletic level from overall score.
 */
export function classifyAthleticLevel(score: number): AthleticLevel {
  if (score >= ATHLETIC_LEVEL_CONFIG[AthleticLevel.LEGEND].min) return AthleticLevel.LEGEND;
  if (score >= ATHLETIC_LEVEL_CONFIG[AthleticLevel.MASTER].min) return AthleticLevel.MASTER;
  if (score >= ATHLETIC_LEVEL_CONFIG[AthleticLevel.EXPERT].min) return AthleticLevel.EXPERT;
  if (score >= ATHLETIC_LEVEL_CONFIG[AthleticLevel.PRACTITIONER].min) return AthleticLevel.PRACTITIONER;
  if (score >= ATHLETIC_LEVEL_CONFIG[AthleticLevel.APPRENTICE].min) return AthleticLevel.APPRENTICE;
  return AthleticLevel.NOVICE;
}

/**
 * Check if current month is peak season (CR-specific).
 */
export function isPeakSeason(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1;
  return month >= SPORTS_SEASON_CONFIG.PEAK_MONTHS_START ||
    month <= SPORTS_SEASON_CONFIG.PEAK_MONTHS_END;
}

/**
 * Get season act from % of season completed.
 */
export function deriveSeasonAct(pctComplete: number): SeasonAct {
  const b = SPORTS_SEASON_CONFIG.ACT_BOUNDARIES;
  if (pctComplete >= b.epilogue) return SeasonAct.EPILOGUE;
  if (pctComplete >= b.championship) return SeasonAct.CHAMPIONSHIP;
  if (pctComplete >= b.climax) return SeasonAct.CLIMAX;
  if (pctComplete >= b.rivalries_emerge) return SeasonAct.RIVALRIES_EMERGE;
  return SeasonAct.OPENING;
}

/**
 * Compute weather impact multiplier for outdoor booking.
 */
export function computeWeatherMultiplier(
  condition: string,
  temperature?: number,
  windSpeed?: number,
): number {
  let multiplier = WEATHER_CONFIG.IMPACT_MULTIPLIERS[condition] ?? 0.8;

  if (temperature != null) {
    if (temperature > WEATHER_CONFIG.TEMP_HOT_THRESHOLD) {
      multiplier *= 0.7;
    } else if (temperature < WEATHER_CONFIG.TEMP_COLD_THRESHOLD) {
      multiplier *= 0.85;
    }
  }

  if (windSpeed != null && windSpeed > WEATHER_CONFIG.WIND_MAX_ACCEPTABLE) {
    multiplier *= 0.6;
  }

  return Math.max(0, Math.min(1, multiplier));
}

/**
 * Derive decision stage mode with the highest insight count.
 * Used for contextual tab auto-selection.
 */
export function deriveContextualStage(
  insightCountsByMode: Record<SportsDecisionStageMode, number>,
): SportsDecisionStageMode {
  let maxMode: SportsDecisionStageMode = "arena";
  let maxCount = 0;

  for (const [mode, count] of Object.entries(insightCountsByMode)) {
    if (count > maxCount) {
      maxCount = count;
      maxMode = mode as SportsDecisionStageMode;
    }
  }

  return maxMode;
}

// ═══════════════════════════════════════════════════════════
// INTEGRITY CHECK (DEV only)
// ═══════════════════════════════════════════════════════════

if (import.meta.env.DEV) {
  // Verify all SportTypes have a config entry
  // (Runtime check — catches missing entries at dev time)
  const sportTypes = Object.values(SPORT_CONFIG);
  if (sportTypes.length !== 11) {
    console.warn(
      `[SportsConfig] Expected 11 sport configs, found ${sportTypes.length}`,
    );
  }

  // Verify health weights sum to ~1.0
  if (Math.abs(_healthWeightSum - 1.0) > 0.01) {
    console.error(
      `[SportsConfig] Health factor weights sum to ${_healthWeightSum}, expected 1.0`,
    );
  }
}