// ═══════════════════════════════════════════════════════════════════════
// Member360 Intelligence — Behavioral DNA
// Phase 30 — Block 0.2: The Config
// ═══════════════════════════════════════════════════════════════════════
//
// This is NOT a constants file. This is the genetic code of Member360.
// Every threshold, weight, template, and behavioral rule lives here.
// The dashboard reads this config and BECOMES what it needs to be.
//
// Architecture:
// §1  MCP Tool Registry
// §2  Temperature Composition Engine
// §3  Vital Sign Orchestration
// §4  Decision Templates (per MemberState)
// §5  Predictive Window Config
// §6  Signal Bus Architecture
// §7  Dashboard Mode Engine
// §8  Advisor Layer Config
// §9  Journey Stage Intelligence
// §10 Portrait Orbital Config
// §11 Narrative Config
// §12 Engagement Decay Curves
// §13 Domain Influence Matrix
// §14 Ambient Animation Config
// ═══════════════════════════════════════════════════════════════════════

import type {
  ActivityDomain,
  MemberState,
  VitalSignName,
  DashboardMode,
  DecisionTemplate,
  NarrativeAct
} from "./types";

// ═══════════════════════════════════════════════════════════════════════
// §1  MCP TOOL REGISTRY
//
// Each tool has a freshness tier that determines how aggressively
// the UI caches it. Critical tools (churn, risk) are never stale.
// Exploration tools (search, proposals) can be fresh on demand.
// ═══════════════════════════════════════════════════════════════════════

export type FreshnessTier =
  | "realtime"   // 0ms    — never cached, always fresh
  | "hot"        // 30s    — near-realtime for volatile data
  | "warm"       // 2min   — standard for profile data
  | "stable"     // 5min   — slow-changing data
  | "archive";   // 15min  — historical, rarely changes

export const FRESHNESS_TIER_STALE: Record<FreshnessTier, number> = {
  realtime: 0,
  hot: 30_000,
  warm: 120_000,
  stable: 300_000,
  archive: 900_000,
};

export interface MCPToolConfig {
  tool: string;
  server: string;
  staleTier: FreshnessTier;
  /** Which domain this tool primarily serves */
  domain?: ActivityDomain;
  /** Default enabled state — false = on-demand only */
  defaultEnabled: boolean;
  /** Does this tool require HITL approval? */
  requiresApproval: boolean;
  /** Temperature weight — how much this tool's data influences composite */
  temperatureRelevance: number;
}

export const MCP_TOOLS = {
  profile: {
    tool: "get_member_360_profile",
    server: "member_360",
    staleTier: "warm" as FreshnessTier,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0.30,
  },
  healthScore: {
    tool: "get_member_health_score",
    server: "member_360",
    staleTier: "warm" as FreshnessTier,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0.25,
  },
  journey: {
    tool: "get_member_journey",
    server: "member_360",
    staleTier: "stable" as FreshnessTier,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0.10,
  },
  churnPrediction: {
    tool: "get_member_churn_prediction",
    server: "member_360",
    staleTier: "hot" as FreshnessTier,
    domain: "recommendations" as ActivityDomain,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0.15,
  },
  ltvAnalysis: {
    tool: "get_member_ltv_analysis",
    server: "member_360",
    staleTier: "stable" as FreshnessTier,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0.05,
  },
  activitySummary: {
    tool: "get_member_activity_summary",
    server: "member_360",
    staleTier: "warm" as FreshnessTier,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0.08,
  },
  socialProfile: {
    tool: "get_member_social_profile",
    server: "member_360",
    staleTier: "stable" as FreshnessTier,
    domain: "social" as ActivityDomain,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0.05,
  },
  engagementProposals: {
    tool: "generate_member_engagement_proposals",
    server: "member_360",
    staleTier: "realtime" as FreshnessTier,
    domain: "engagement_social" as ActivityDomain,
    defaultEnabled: false,
    requiresApproval: false,
    temperatureRelevance: 0,
  },
  riskAssessment: {
    tool: "get_member_risk_assessment",
    server: "member_360",
    staleTier: "hot" as FreshnessTier,
    defaultEnabled: false,
    requiresApproval: false,
    temperatureRelevance: 0.02,
  },
  search: {
    tool: "search_members_360",
    server: "member_360",
    staleTier: "warm" as FreshnessTier,
    defaultEnabled: true,
    requiresApproval: false,
    temperatureRelevance: 0,
  },
} as const satisfies Record<string, MCPToolConfig>;

/** Priority order for fetching — critical tools first */
export const MCP_FETCH_PRIORITY: Array<keyof typeof MCP_TOOLS> = [
  "profile",
  "healthScore",
  "churnPrediction",
  "journey",
  "activitySummary",
  "socialProfile",
  "ltvAnalysis",
  "riskAssessment",
  "engagementProposals",
  "search",
];

// ═══════════════════════════════════════════════════════════════════════
// §2  TEMPERATURE COMPOSITION ENGINE
//
// Temperature is not a flat average. It's a weighted composition where
// weights SHIFT based on lifecycle stage. A new member's temperature
// is driven by engagement and activity (are they showing up?).
// A veteran's temperature is driven by satisfaction and social
// (are they still happy? still connected?).
//
// thermalMass = tenure × tier multiplier × connections coefficient
// Higher mass = slower temperature change = more stable member.
// ═══════════════════════════════════════════════════════════════════════

/** Base weights for temperature composite — default distribution */
export const TEMPERATURE_BASE_WEIGHTS: Record<VitalSignName, number> = {
  engagement:   0.25,
  financial:    0.18,
  social:       0.17,
  satisfaction: 0.18,
  activity:     0.12,
  wellness:     0.10,
};

/** Weight modifiers by lifecycle stage — weights shift to what matters NOW */
export const TEMPERATURE_STAGE_WEIGHTS: Record<
  string,
  Partial<Record<VitalSignName, number>>
> = {
  new_member:  { engagement: 0.35, activity: 0.25, social: 0.15 },
  onboarding:  { engagement: 0.30, activity: 0.20, satisfaction: 0.20 },
  active:      { engagement: 0.25, financial: 0.20, social: 0.18 },
  engaged:     { satisfaction: 0.25, social: 0.22, wellness: 0.15 },
  at_risk:     { engagement: 0.30, satisfaction: 0.25, financial: 0.20 },
  dormant:     { engagement: 0.35, activity: 0.25, social: 0.15 },
  churned:     { financial: 0.30, engagement: 0.25, satisfaction: 0.20 },
  win_back:    { engagement: 0.35, satisfaction: 0.25, activity: 0.20 },
};

/** Tier multipliers for thermal mass — VIPs resist temperature swings */
export const THERMAL_MASS_TIER_MULTIPLIER: Record<string, number> = {
  vip: 1.5,
  platino: 1.3,
  oro: 1.1,
  premium: 1.0,
  plata: 0.9,
  bronce: 0.8,
  basic: 0.7,
};

/** Tenure contribution to thermal mass (days → coefficient) */
export const THERMAL_MASS_CURVE = [
  { maxDays: 30,   coefficient: 0.3 },
  { maxDays: 90,   coefficient: 0.5 },
  { maxDays: 180,  coefficient: 0.7 },
  { maxDays: 365,  coefficient: 0.9 },
  { maxDays: 730,  coefficient: 1.0 },
  { maxDays: 1825, coefficient: 1.2 },
  { maxDays: Infinity, coefficient: 1.3 },
];

/** Temperature zone thresholds */
export const TEMPERATURE_ZONES = {
  hot:    { min: 80, max: 100 },
  warm:   { min: 60, max: 79 },
  neutral: { min: 40, max: 59 },
  cool:   { min: 20, max: 39 },
  cold:   { min: 0,  max: 19 },
} as const;

// ═══════════════════════════════════════════════════════════════════════
// §3  VITAL SIGN ORCHESTRATION
//
// Each vital sign has alert thresholds that trigger differently
// based on the member's overall state. A "financial" score of 40
// is alarming for a VIP but expected for a basic member.
// The dynamic threshold adapts contextually.
// ═══════════════════════════════════════════════════════════════════════

export interface VitalSignThresholds {
  thriving: [number, number];   // min to consider "thriving"
  normal: [number, number];     // normal operating range
  elevated: [number, number];   // needs attention
  critical: [number, number];   // immediate action
}

/** Default thresholds per vital sign */
export const VITAL_SIGN_THRESHOLDS: Record<VitalSignName, VitalSignThresholds> = {
  engagement:   { thriving: [75, 100], normal: [50, 74], elevated: [30, 49], critical: [0, 29] },
  financial:    { thriving: [70, 100], normal: [45, 69], elevated: [25, 44], critical: [0, 24] },
  social:       { thriving: [70, 100], normal: [40, 69], elevated: [20, 39], critical: [0, 19] },
  satisfaction: { thriving: [80, 100], normal: [55, 79], elevated: [35, 54], critical: [0, 34] },
  activity:     { thriving: [65, 100], normal: [40, 64], elevated: [20, 39], critical: [0, 19] },
  wellness:     { thriving: [70, 100], normal: [45, 69], elevated: [25, 44], critical: [0, 24] },
};

/** Tier-adjusted thresholds — VIPs are held to higher standards */
export const TIER_THRESHOLD_ADJUSTMENT: Record<string, number> = {
  vip: 10,      // +10 to all minimums — VIPs must maintain higher scores
  platino: 5,
  oro: 0,
  premium: 0,
  plata: -5,    // -5 more lenient for lower tiers
  bronce: -10,
  basic: -10,
};

// ═══════════════════════════════════════════════════════════════════════
// §4  DECISION TEMPLATES
//
// For each MemberState, the system knows:
// - WHAT to do (primary arc)
// - WHEN to escalate (days + checkpoints)
// - WHAT IF it fails (fallback arc)
// - WHO approves (auto/semi/hitl/always_human)
//
// These are the strategies that turn data into action.
// A director doesn't need to figure out what to do — the system
// already knows and presents the plan with confidence.
// ═══════════════════════════════════════════════════════════════════════

export const DECISION_TEMPLATES: Record<MemberState, DecisionTemplate> = {
  thriving: {
    state: "thriving",
    tempRange: [85, 100],
    primaryArc: {
      name: "Embassador Path",
      description: "Reconocer, empoderar, convertir en referente del club",
      checkpoints: [
        { dayOffset: 7,  metric: "engagement_score", expectedValue: 85, tolerance: 5 },
        { dayOffset: 30, metric: "social_influence_score", expectedValue: 70, tolerance: 10 },
        { dayOffset: 60, metric: "referrals_made", expectedValue: 1, tolerance: 0 },
      ],
      successCriteria: "Socio mantiene score > 80 y genera al menos 1 referido",
      durationDays: 90,
    },
    fallbackArc: {
      name: "Sustained Excellence",
      description: "Mantener engagement sin sobrecarga — balance es clave",
      checkpoints: [
        { dayOffset: 14, metric: "satisfaction_nps", expectedValue: 8, tolerance: 1 },
        { dayOffset: 45, metric: "engagement_score", expectedValue: 80, tolerance: 5 },
      ],
      successCriteria: "Score se mantiene estable sin intervención activa",
      durationDays: 60,
    },
    escalationDays: 30,
    approvalLevel: "auto",
  },

  stable: {
    state: "stable",
    tempRange: [65, 84],
    primaryArc: {
      name: "Growth Catalyst",
      description: "Expandir dominios de participación — de regular a comprometido",
      checkpoints: [
        { dayOffset: 14, metric: "active_domains", expectedValue: 3, tolerance: 0 },
        { dayOffset: 30, metric: "engagement_score", expectedValue: 70, tolerance: 5 },
        { dayOffset: 60, metric: "satisfaction_nps", expectedValue: 7, tolerance: 1 },
      ],
      successCriteria: "Socio expande a 3+ dominios y engagement sube a 70+",
      tool: "generate_member_engagement_proposals",
      durationDays: 90,
    },
    fallbackArc: {
      name: "Comfort Zone Break",
      description: "Evento exclusivo o experiencia nueva que despierte curiosidad",
      checkpoints: [
        { dayOffset: 7,  metric: "event_attendance", expectedValue: 1, tolerance: 0 },
        { dayOffset: 21, metric: "engagement_score", expectedValue: 65, tolerance: 5 },
      ],
      successCriteria: "Socio prueba al menos una actividad nueva",
      durationDays: 30,
    },
    escalationDays: 21,
    approvalLevel: "auto",
  },

  drifting: {
    state: "drifting",
    tempRange: [45, 64],
    primaryArc: {
      name: "Re-engagement Sprint",
      description: "Intervención proactiva — contacto personalizado + oferta relevante",
      checkpoints: [
        { dayOffset: 3,  metric: "last_activity_date", expectedValue: 3, tolerance: 2 },
        { dayOffset: 14, metric: "engagement_score", expectedValue: 55, tolerance: 5 },
        { dayOffset: 30, metric: "active_domains", expectedValue: 2, tolerance: 0 },
      ],
      successCriteria: "Socio reanuda actividad en 14 días y sube engagement a 55+",
      tool: "generate_member_engagement_proposals",
      durationDays: 45,
    },
    fallbackArc: {
      name: "Personal Outreach",
      description: "Llamada directa del director — toque humano cuando digital no funciona",
      checkpoints: [
        { dayOffset: 3,  metric: "contact_made", expectedValue: 1, tolerance: 0 },
        { dayOffset: 14, metric: "engagement_score", expectedValue: 50, tolerance: 5 },
      ],
      successCriteria: "Director contacta y socio responde positivamente",
      durationDays: 21,
    },
    escalationDays: 14,
    approvalLevel: "semi",
  },

  at_risk: {
    state: "at_risk",
    tempRange: [25, 44],
    primaryArc: {
      name: "Rescue Protocol",
      description: "Intervención inmediata — diagnóstico + plan personalizado + seguimiento semanal",
      checkpoints: [
        { dayOffset: 1,  metric: "contact_made", expectedValue: 1, tolerance: 0 },
        { dayOffset: 7,  metric: "engagement_score", expectedValue: 35, tolerance: 5 },
        { dayOffset: 14, metric: "active_domains", expectedValue: 1, tolerance: 0 },
        { dayOffset: 30, metric: "churn_score", expectedValue: 50, tolerance: 10 },
      ],
      successCriteria: "Churn score baja a <50 y socio reanuda al menos 1 actividad",
      tool: "generate_member_engagement_proposals",
      durationDays: 45,
    },
    fallbackArc: {
      name: "Executive Retention Offer",
      description: "Oferta exclusiva aprobada por directorio — upgrade, beneficio, experiencia VIP",
      checkpoints: [
        { dayOffset: 3,  metric: "offer_presented", expectedValue: 1, tolerance: 0 },
        { dayOffset: 14, metric: "engagement_score", expectedValue: 40, tolerance: 10 },
      ],
      successCriteria: "Socio acepta oferta y engagement se estabiliza",
      durationDays: 30,
    },
    escalationDays: 7,
    approvalLevel: "hitl",
  },

  disengaging: {
    state: "disengaging",
    tempRange: [0, 24],
    primaryArc: {
      name: "Last Stand",
      description: "Última ventana — contacto directo del presidente + experiencia transformadora",
      checkpoints: [
        { dayOffset: 1,  metric: "executive_contact", expectedValue: 1, tolerance: 0 },
        { dayOffset: 3,  metric: "experience_scheduled", expectedValue: 1, tolerance: 0 },
        { dayOffset: 14, metric: "engagement_score", expectedValue: 30, tolerance: 10 },
        { dayOffset: 30, metric: "journey_stage", expectedValue: 1, tolerance: 0 },
      ],
      successCriteria: "Socio transiciona de disengaging a at_risk o mejor",
      durationDays: 45,
    },
    fallbackArc: {
      name: "Graceful Exit + Win-Back Queue",
      description: "Aceptar la salida con dignidad — encuesta + plan de reconexión a 90 días",
      checkpoints: [
        { dayOffset: 7,  metric: "exit_survey_completed", expectedValue: 1, tolerance: 0 },
        { dayOffset: 90, metric: "win_back_attempted", expectedValue: 1, tolerance: 0 },
      ],
      successCriteria: "Proceso de salida completado con datos para win-back futuro",
      durationDays: 120,
    },
    escalationDays: 3,
    approvalLevel: "always_human",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// §5  PREDICTIVE WINDOW CONFIG
//
// Each prediction type has its own:
// - horizon: how far ahead we predict
// - decayRate: how fast confidence drops per day
// - interventionWindows: when to act
//
// Churn: short horizon, fast decay — act NOW or lose the member.
// LTV: long horizon, slow decay — plan quarters, not days.
// Engagement: medium horizon — re-engagement windows.
// ═══════════════════════════════════════════════════════════════════════

export interface PredictiveWindowConfig {
  metric: string;
  defaultHorizonDays: number;
  decayRatePerDay: number;
  interventionWindows: {
    open: [number, number];      // days remaining range
    closing: [number, number];
    imminent: [number, number];
  };
}

export const PREDICTIVE_WINDOW_CONFIGS: Record<string, PredictiveWindowConfig> = {
  churn: {
    metric: "churn_probability",
    defaultHorizonDays: 90,
    decayRatePerDay: 0.015,
    interventionWindows: {
      open: [30, 90],
      closing: [14, 29],
      imminent: [0, 13],
    },
  },
  ltv_decline: {
    metric: "ltv_projection",
    defaultHorizonDays: 365,
    decayRatePerDay: 0.003,
    interventionWindows: {
      open: [90, 365],
      closing: [30, 89],
      imminent: [0, 29],
    },
  },
  engagement_drop: {
    metric: "engagement_trajectory",
    defaultHorizonDays: 60,
    decayRatePerDay: 0.02,
    interventionWindows: {
      open: [21, 60],
      closing: [7, 20],
      imminent: [0, 6],
    },
  },
  satisfaction_decline: {
    metric: "satisfaction_nps_trajectory",
    defaultHorizonDays: 120,
    decayRatePerDay: 0.008,
    interventionWindows: {
      open: [45, 120],
      closing: [14, 44],
      imminent: [0, 13],
    },
  },
  social_isolation: {
    metric: "social_connectivity",
    defaultHorizonDays: 90,
    decayRatePerDay: 0.012,
    interventionWindows: {
      open: [30, 90],
      closing: [14, 29],
      imminent: [0, 13],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════
// §6  SIGNAL BUS ARCHITECTURE
//
// Member360 is the CONVERGENCE POINT of all domains.
// Each domain emits signals. Member360 subscribes to all.
// The signal bus defines:
// - What signals each domain emits
// - How Member360 prioritizes incoming signals
// - Which signals trigger temperature recalculation
// ═══════════════════════════════════════════════════════════════════════

/** Topics that Member360 subscribes to on the signal bus */
export const MEMBER360_SUBSCRIBED_TOPICS = [
  "member:engagement_changed",
  "member:health_score_updated",
  "member:churn_risk_changed",
  "member:activity_recorded",
  "member:social_connection_changed",
  "member:financial_status_changed",
  "member:milestone_reached",
  "member:tier_changed",
  "member:satisfaction_updated",
  "family:health_changed",
  "wellness:member_score_updated",
  "events:member_rsvp",
  "sports:member_activity",
  "cultural:member_attendance",
  "recommendation:member_generated",
] as const;

/** Topics that Member360 emits to other domains */
export const MEMBER360_EMITTER_TOPICS = [
  "member:temperature_changed",
  "member:state_transition",
  "member:intervention_triggered",
  "member:narrative_generated",
  "member:predictive_alert",
] as const;

/** Signal priority — which incoming signals trigger immediate recalc */
export const SIGNAL_IMMEDIATE_RECALC: string[] = [
  "member:churn_risk_changed",
  "member:health_score_updated",
  "member:tier_changed",
];

/** Signal batch — accumulate and recalc every N seconds */
export const SIGNAL_BATCH_INTERVAL_MS = 5_000;

// ═══════════════════════════════════════════════════════════════════════
// §7  DASHBOARD MODE ENGINE
//
// Adaptive Morphism — the dashboard changes form based on urgency.
//
// calm:     Portrait centered, all sections visible, exploration mode
// alert:    Intelligence Stream top, priority actions elevated, timeline compressed
// critical: Single focus — THE action to take, minimal context, clear CTA
//
// The transition is automatic based on temperature + member state.
// Directors can also force a mode for exploration.
// ═══════════════════════════════════════════════════════════════════════

export interface DashboardModeConfig {
  mode: DashboardMode;
  /** Grid template areas for Adaptive Morphism */
  gridTemplate: string;
  /** Which sections are visible in this mode */
  visibleSections: string[];
  /** Which sections are elevated (pinned to top) */
  elevatedSections: string[];
  /** Animation speed multiplier — critical = faster pulses */
  animationSpeed: number;
  /** Background intensity — critical = more intense ambient */
  ambientIntensity: number;
  /** Whether to show the full portrait or a compact version */
  portraitMode: "full" | "compact" | "icon";
}

export const DASHBOARD_MODES: Record<DashboardMode, DashboardModeConfig> = {
  calm: {
    mode: "calm",
    gridTemplate: `
      "portrait  portrait  journey   journey"
      "vitals    vitals    signals   signals"
      "financial social    dna       dna"
      "timeline  timeline  risks     risks"
      "brief     brief     actions   actions"
    `,
    visibleSections: [
      "portrait", "vitals", "journey", "signals", "financial",
      "social", "dna", "timeline", "risks", "brief", "actions",
    ],
    elevatedSections: ["portrait"],
    animationSpeed: 1,
    ambientIntensity: 0.3,
    portraitMode: "full",
  },
  alert: {
    mode: "alert",
    gridTemplate: `
      "brief      brief      brief      brief"
      "actions    actions    actions    actions"
      "portrait   vitals     signals    signals"
      "risks      risks      timeline   timeline"
      "financial  social     dna        dna"
    `,
    visibleSections: [
      "brief", "actions", "portrait", "vitals", "signals",
      "risks", "timeline", "financial", "social", "dna",
    ],
    elevatedSections: ["brief", "actions"],
    animationSpeed: 1.3,
    ambientIntensity: 0.6,
    portraitMode: "compact",
  },
  critical: {
    mode: "critical",
    gridTemplate: `
      "brief      brief      brief      brief"
      "actions    actions    actions    actions"
      "risks      risks      risks      risks"
      "portrait   portrait   vitals     vitals"
    `,
    visibleSections: ["brief", "actions", "risks", "portrait", "vitals"],
    elevatedSections: ["brief", "actions", "risks"],
    animationSpeed: 1.8,
    ambientIntensity: 1.0,
    portraitMode: "icon",
  },
};

/** Auto-derive dashboard mode from member state + temperature */
export function deriveDashboardMode(
  state: MemberState,
  temperature: number,
): DashboardMode {
  if (state === "disengaging" || temperature < 25) return "critical";
  if (state === "at_risk" || state === "drifting" || temperature < 65) return "alert";
  return "calm";
}

// ═══════════════════════════════════════════════════════════════════════
// §8  ADVISOR LAYER CONFIG
//
// The advisor thinks in layers — each layer has a color, priority,
// and maximum number of insights it can produce.
// Layers are ordered by severity: churn_risk > health > financial > etc.
// ═══════════════════════════════════════════════════════════════════════

export type MemberAdvisorLayerName =
  | "churn_risk"
  | "health_identity"
  | "cross_domain"
  | "financial"
  | "lifecycle"
  | "engagement_social";

export interface AdvisorLayerConfig {
  name: MemberAdvisorLayerName;
  label: string;
  color: string;
  icon: string;
  priority: number;
  maxInsights: number;
}

export const ADVISOR_LAYER_CONFIG: AdvisorLayerConfig[] = [
  { name: "churn_risk",        label: "Riesgo de Abandono",  color: "var(--color-rose-400)",      icon: "🚨", priority: 0, maxInsights: 3 },
  { name: "health_identity",   label: "Salud & Identidad",   color: "var(--color-amber-400)",     icon: "💊", priority: 1, maxInsights: 3 },
  { name: "cross_domain",      label: "Cross-Domain",        color: "var(--color-teal-300)",      icon: "🔗", priority: 2, maxInsights: 2 },
  { name: "financial",         label: "Financiero",          color: "var(--color-emerald-400)",   icon: "💰", priority: 3, maxInsights: 2 },
  { name: "lifecycle",         label: "Lifecycle",           color: "var(--color-gold-400)",      icon: "🔄", priority: 4, maxInsights: 3 },
  { name: "engagement_social", label: "Engagement & Social", color: "var(--color-teal-400)",      icon: "🤝", priority: 5, maxInsights: 3 },
];

/** Maximum total insights displayed at once */
export const MAX_INSIGHTS_DISPLAY = 8;

// ═══════════════════════════════════════════════════════════════════════
// §9  JOURNEY STAGE INTELLIGENCE
//
// Each journey stage has:
// - Expected duration (average days in stage)
// - Alert multiplier (how worried to be if stuck)
// - Key metrics that matter most
// - Valid next stages
//
// This fixes the bug where the advisor used wrong stage names.
// ═══════════════════════════════════════════════════════════════════════

export interface JourneyStageConfig {
  stage: string;
  avgDurationDays: number;
  alertMultiplier: number;    // how much to worry if duration exceeds avg
  keyMetrics: string[];
  validNextStages: string[];
}

export const JOURNEY_STAGE_CONFIG: JourneyStageConfig[] = [
  {
    stage: "new_member",
    avgDurationDays: 30,
    alertMultiplier: 2.0,
    keyMetrics: ["engagement_score", "active_domains", "event_attendance"],
    validNextStages: ["onboarding"],
  },
  {
    stage: "onboarding",
    avgDurationDays: 90,
    alertMultiplier: 1.5,
    keyMetrics: ["engagement_score", "active_domains", "satisfaction_nps"],
    validNextStages: ["active", "at_risk"],
  },
  {
    stage: "active",
    avgDurationDays: 365,
    alertMultiplier: 1.0,
    keyMetrics: ["engagement_score", "health_score", "connections_count"],
    validNextStages: ["engaged", "drifting", "at_risk"],
  },
  {
    stage: "engaged",
    avgDurationDays: 730,
    alertMultiplier: 0.8,
    keyMetrics: ["social_influence_score", "satisfaction_nps", "referrals_made"],
    validNextStages: ["active", "drifting"],
  },
  {
    stage: "at_risk",
    avgDurationDays: 30,
    alertMultiplier: 3.0,
    keyMetrics: ["churn_score", "engagement_score", "last_activity_date"],
    validNextStages: ["drifting", "dormant", "active"],
  },
  {
    stage: "dormant",
    avgDurationDays: 60,
    alertMultiplier: 2.5,
    keyMetrics: ["last_activity_date", "churn_score", "engagement_score"],
    validNextStages: ["churned", "win_back", "at_risk"],
  },
  {
    stage: "churned",
    avgDurationDays: 180,
    alertMultiplier: 0.5,
    keyMetrics: ["win_back_eligible", "exit_survey_score"],
    validNextStages: ["win_back"],
  },
  {
    stage: "win_back",
    avgDurationDays: 90,
    alertMultiplier: 1.5,
    keyMetrics: ["engagement_score", "satisfaction_nps", "active_domains"],
    validNextStages: ["active", "dormant"],
  },
];

/** Lookup helper — get config for a specific stage */
export function getJourneyStageConfig(stage: string): JourneyStageConfig | undefined {
  return JOURNEY_STAGE_CONFIG.find((c) => c.stage === stage);
}

// ═══════════════════════════════════════════════════════════════════════
// §10 PORTRAIT ORBITAL CONFIG
//
// The Member Portrait is 6 concentric SVG rings around a central orb.
// Each ring = one vital sign dimension.
// Ring properties are tuned for visual rhythm:
// - Inner rings (engagement, financial) spin faster — core concerns
// - Outer rings (activity, wellness) spin slower — peripheral
// - Ring thickness = weight of dimension
// - Ring opacity = current score
// ═══════════════════════════════════════════════════════════════════════

export interface OrbitalRingConfig {
  dimension: VitalSignName;
  /** Radius as percentage of container (innermost = smallest) */
  radiusPct: number;
  /** Ring stroke width in px */
  strokeWidth: number;
  /** Animation duration in seconds — lower = faster orbit */
  orbitDurationSec: number;
  /** Dash pattern: "solid" | "dashed" | "dotted" */
  dashPattern: "solid" | "dashed" | "dotted";
  /** Opacity range based on score [minOpacity, maxOpacity] */
  opacityRange: [number, number];
}

export const PORTRAIT_ORBITAL_RINGS: OrbitalRingConfig[] = [
  { dimension: "engagement",   radiusPct: 22, strokeWidth: 3,   orbitDurationSec: 20, dashPattern: "solid",  opacityRange: [0.3, 1.0] },
  { dimension: "financial",    radiusPct: 30, strokeWidth: 2.5, orbitDurationSec: 25, dashPattern: "solid",  opacityRange: [0.25, 0.95] },
  { dimension: "social",       radiusPct: 38, strokeWidth: 2,   orbitDurationSec: 30, dashPattern: "dashed", opacityRange: [0.2, 0.9] },
  { dimension: "satisfaction", radiusPct: 45, strokeWidth: 2.5, orbitDurationSec: 35, dashPattern: "solid",  opacityRange: [0.25, 0.95] },
  { dimension: "activity",     radiusPct: 52, strokeWidth: 1.5, orbitDurationSec: 40, dashPattern: "dotted", opacityRange: [0.15, 0.85] },
  { dimension: "wellness",     radiusPct: 58, strokeWidth: 1.5, orbitDurationSec: 45, dashPattern: "dotted", opacityRange: [0.15, 0.8] },
];

/** Central orb config */
export const PORTRAIT_ORB = {
  /** Base radius as percentage of container */
  radiusPct: 15,
  /** Pulse animation duration (seconds) — synced to temperature */
  pulseDurationSec: 3,
  /** Glow intensity range by temperature zone */
  glowIntensity: {
    hot:     { min: 0.6, max: 1.0, blur: 20 },
    warm:    { min: 0.4, max: 0.8, blur: 16 },
    neutral: { min: 0.2, max: 0.5, blur: 12 },
    cool:    { min: 0.3, max: 0.6, blur: 14 },
    cold:    { min: 0.4, max: 0.8, blur: 18 },
  },
};

// ═══════════════════════════════════════════════════════════════════════
// §11 NARRATIVE CONFIG
//
// The AI briefing has 3 acts with different typing behaviors:
// - Context (Act I):    Measured, informative. 40 chars/sec.
// - Tension (Act II):   Faster, urgent. 55 chars/sec.
// - Resolution (Act III): Decisive, clear. 45 chars/sec.
//
// Sentence gaps and section transitions are tuned for readability.
// ═══════════════════════════════════════════════════════════════════════

export interface NarrativeActConfig {
  act: NarrativeAct;
  typingSpeedCPS: number;       // characters per second
  sentenceGapMs: number;        // pause after sentence
  sectionGapMs: number;         // pause before next act
  maxCharacters: number;        // character limit per act
  cursorStyle: "block" | "line" | "underscore";
}

export const NARRATIVE_ACT_CONFIG: Record<NarrativeAct, NarrativeActConfig> = {
  context: {
    act: "context",
    typingSpeedCPS: 40,
    sentenceGapMs: 500,
    sectionGapMs: 800,
    maxCharacters: 280,
    cursorStyle: "line",
  },
  tension: {
    act: "tension",
    typingSpeedCPS: 55,
    sentenceGapMs: 400,
    sectionGapMs: 600,
    maxCharacters: 200,
    cursorStyle: "block",
  },
  resolution: {
    act: "resolution",
    typingSpeedCPS: 45,
    sentenceGapMs: 600,
    sectionGapMs: 0,
    maxCharacters: 250,
    cursorStyle: "underscore",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// §12 ENGAGEMENT DECAY CURVES
//
// Engagement is not binary — it decays over time.
// Each domain has a different decay rate:
// - Events decay fast (you forget the last event quickly)
// - Social connections decay slowly (relationships persist)
// - Wellness decays medium (habits form but can break)
//
// The recency score = base_score × decay_factor^days_since_last
// ═══════════════════════════════════════════════════════════════════════

/** Decay factor per day (0.99 = 1% decay per day, 0.95 = 5% per day) */
export const ENGAGEMENT_DECAY_RATES: Record<ActivityDomain, number> = {
  events:           0.97,  // fast decay — events are ephemeral
  sports:           0.985, // medium — habits form
  wellness:         0.98,  // medium — consistency matters
  cultural:         0.975, // medium-fast — seasonal
  dining:           0.99,  // slow — regular habit
  social:           0.995, // very slow — relationships persist
  guest_management: 0.96,  // fast — infrequent by nature
  communications:   0.98,  // medium — engagement with comms
  families:         0.99,  // slow — family bonds persist
  age_group:        0.985, // medium — cohort identity
  facilities:       0.99,  // slow — regular usage
  recommendations:  0.97,  // fast — recommendations expire
};

/** Half-life in days — when recency score drops to 50% */
export function getEngagementHalfLife(domain: ActivityDomain): number {
  const rate = ENGAGEMENT_DECAY_RATES[domain];
  return Math.log(0.5) / Math.log(rate);
}

// ═══════════════════════════════════════════════════════════════════════
// §13 DOMAIN INFLUENCE MATRIX
//
// Not all domains contribute equally to every member's temperature.
// A sports enthusiast's temperature is driven more by sports activity.
// A social butterfly's temperature depends more on social connections.
//
// The matrix defines cross-domain influence: how much domain A's
// signals affect domain B's temperature contribution.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Cross-domain amplification factors.
 * Key: [source_domain][target_dimension] = amplification (0-1)
 * A factor of 0.5 means a signal from that domain has 50% influence
 * on the target dimension's temperature contribution.
 */
export const DOMAIN_INFLUENCE_MATRIX: Record<ActivityDomain, Partial<Record<VitalSignName, number>>> = {
  events:           { engagement: 0.8, social: 0.6, satisfaction: 0.5 },
  sports:           { engagement: 0.7, activity: 0.9, wellness: 0.6 },
  wellness:         { wellness: 0.9, satisfaction: 0.5, activity: 0.4 },
  cultural:         { engagement: 0.6, satisfaction: 0.7, social: 0.4 },
  dining:           { engagement: 0.4, satisfaction: 0.6, social: 0.5 },
  social:           { social: 0.9, engagement: 0.5, satisfaction: 0.4 },
  guest_management: { social: 0.3, engagement: 0.2 },
  communications:   { engagement: 0.3 },
  families:         { social: 0.7, satisfaction: 0.6, engagement: 0.4 },
  age_group:        { social: 0.4, engagement: 0.3 },
  facilities:       { activity: 0.5, satisfaction: 0.3 },
  recommendations:  { engagement: 0.4, satisfaction: 0.3 },
};

// ═══════════════════════════════════════════════════════════════════════
// §14 AMBIENT ANIMATION CONFIG
//
// The dashboard breathes. Every mode has ambient behavior:
// - calm: slow, gentle, meditative
// - alert: medium, purposeful, scanning
// - critical: fast, pulsing, urgent
//
// These values drive CSS custom properties via data attributes.
// The component sets data-mode, CSS reads and animates accordingly.
// ═══════════════════════════════════════════════════════════════════════

export interface AmbientConfig {
  /** Background orb rotation speed (seconds per full rotation) */
  orbRotationSec: number;
  /** Glow pulse period (seconds) */
  glowPulseSec: number;
  /** Stagger delay between elements (ms) */
  staggerMs: number;
  /** Scan line rotation (seconds) — 0 = disabled */
  scanLineRotationSec: number;
  /** Breathing opacity range for ambient elements */
  breathRange: [number, number];
  /** Temperature glow hue shift per second */
  hueShiftPerSec: number;
}

export const AMBIENT_CONFIG: Record<DashboardMode, AmbientConfig> = {
  calm: {
    orbRotationSec: 30,
    glowPulseSec: 6,
    staggerMs: 120,
    scanLineRotationSec: 0,
    breathRange: [0.6, 0.9],
    hueShiftPerSec: 0.5,
  },
  alert: {
    orbRotationSec: 20,
    glowPulseSec: 4,
    staggerMs: 80,
    scanLineRotationSec: 8,
    breathRange: [0.5, 1.0],
    hueShiftPerSec: 1.0,
  },
  critical: {
    orbRotationSec: 12,
    glowPulseSec: 2,
    staggerMs: 40,
    scanLineRotationSec: 4,
    breathRange: [0.3, 1.0],
    hueShiftPerSec: 2.0,
  },
};