// ═══════════════════════════════════════════════════════════
// src/features/guests/config.ts
// Phase 34 "The Gateway" — Configuration & Thresholds
// Level 6+ Agency · Production Grade
//
// Every numeric threshold, weight, and config object lives here.
// Named, testable, tunable — zero magic numbers in logic.
// Environment-aware overrides supported.
//
// §0  Imports
// §1  Environment & Feature Flags
// §2  Dashboard Thresholds
// §3  Ambient Canvas Config
// §4  Advisor Thresholds
// §5  Pipeline Stage Definitions
// §6  MCP Tool Registry
// §7  Chemistry & Impression Weights
// §8  Memory Thresholds
// §9  Health Factor Weights
// §10 Data Dependencies (Streaming Evaluation)
// §11 Engine Contracts
// §12 Motion & Animation Config
// §13 Responsive Breakpoints
//
// Checklist: M1.13-14 (config vs constants), M5.2 (60fps)
// ═══════════════════════════════════════════════════════════

import type { EngineName, GuestDashboardMode } from "./types";

// ═══════════════════════════════════════════════════════════
// §1 — ENVIRONMENT & FEATURE FLAGS
// Allows config overrides per environment without code changes.
// ═══════════════════════════════════════════════════════════

/** Runtime environment detection. */
type AppEnvironment = "development" | "staging" | "production";

/** Current environment. Reads from Vite env or defaults to production. */
const ENV: AppEnvironment =
  (import.meta.env?.MODE as AppEnvironment) ?? "production";

/** Feature flags for Phase 34 guest intelligence. */
export const GUEST_FEATURE_FLAGS = {
  /** Enable engine enrichment layer (5 intelligence engines). */
  enableEngines: true,
  /** Enable ambient canvas particles (disable on low-end devices). */
  enableAmbientCanvas: ENV !== "production" ? true : true,
  /** Enable streaming evaluation (dirty-flag optimization). */
  enableStreamingEval: true,
  /** Enable Zod validation at MCP boundaries. */
  enableBoundaryValidation: ENV !== "production",
  /** Enable advisor signal emission. */
  enableSignals: true,
  /** Enable RAG context injection in advisor evaluation. */
  enableRAGContext: false,
  /** Enable debug logging for engine execution. */
  enableDebugLogging: ENV === "development",
} as const;

// ═══════════════════════════════════════════════════════════
// §2 — DASHBOARD THRESHOLDS
// Values that control dashboard mode derivation.
// ═══════════════════════════════════════════════════════════

export const GUEST_DASHBOARD_THRESHOLDS = {
  /** Health score below this → critical mode. */
  healthScoreCritical: 40,
  /** Health score below this → alert mode. */
  healthScoreAlert: 60,
  /** Health score above this + no critical insights → celebration mode. */
  healthScoreCelebration: 85,
  /** Number of active insights that triggers alert mode. */
  insightCountAlert: 5,
  /** Number of critical insights that forces critical mode. */
  criticalInsightCountForce: 2,
  /** Quick wins expiring within this many days get urgency boost. */
  quickWinUrgencyDays: 7,
  /** Briefing overlay auto-dismiss delay (ms). */
  briefingAutoDismissMs: 8000,
  /** Stage auto-suggest debounce delay (ms). */
  stageOverrideDebounceMs: 5000,
} as const;

// ═══════════════════════════════════════════════════════════
// §3 — AMBIENT CANVAS CONFIG
// Functional particle canvas — particles REPRESENT guests.
// Position = pipeline stage, size = conversion score,
// color = temperature, speed = activity level.
// ═══════════════════════════════════════════════════════════

export interface AmbientCanvasConfig {
  /** Max particles rendered (performance cap). */
  readonly maxParticles: number;
  /** Min particles rendered (performance cap). */
  readonly minParticles: number;
  /** Target frames per second. */
  readonly targetFps: number;
  /** Below this fps, reduce particle count. */
  readonly lowFpsThreshold: number;
  /** Particle size range [min, max] in pixels. */
  readonly particleSizeRange: readonly [number, number];
  /** Base particle speed (pixels per frame at 60fps). */
  readonly baseSpeed: number;
  /** Canvas opacity. */
  readonly opacity: number;
  /** Respect prefers-reduced-motion. */
  readonly respectReducedMotion: boolean;
  /** Static gradient fallback when reduced motion or low fps. */
  readonly staticFallback: boolean;
}

export const GUEST_AMBIENT_CONFIG: AmbientCanvasConfig = {
  maxParticles: 60,
  minParticles: 10,
  targetFps: 60,
  lowFpsThreshold: 30,
  particleSizeRange: [2, 8],
  baseSpeed: 0.5,
  opacity: 0.6,
  respectReducedMotion: true,
  staticFallback: true,
} as const;

// ═══════════════════════════════════════════════════════════
// §4 — ADVISOR THRESHOLDS
// Named thresholds for guest advisor rules.
// rules/guest.ts imports from here (B2 rewrite).
// ═══════════════════════════════════════════════════════════

export const GUEST_ADVISOR_THRESHOLDS = {
  // ── Macro Layer (R1-R4) ──
  conversionLowPct: 5,
  trialConversionTargetPct: 25,

  // ── Lifecycle Layer (R5-R8) ──
  hotLeadMinVisits: 5,

  // ── Utilization Layer (R9-R12) ──
  weekendConcentrationPct: 60,
  privilegeConcentrationPct: 45,
  bestEventMinGuests: 50,

  // ── Phase 34 New Rules (R15-R20) ──
  vipScoreThreshold: 80,
  firstImpressionAlertThreshold: 40,
  chemistryExceptionalThreshold: 85,
  dormantDays: 60,
  memoryStrengthGood: 50,
  sponsorMismatchThreshold: 30,
} as const;

// ═══════════════════════════════════════════════════════════
// §5 — PIPELINE STAGE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface PipelineStageDef {
  readonly id: string;
  readonly label: string;
  /** i18n message key for label. */
  readonly labelKey: string;
  readonly step: number;
  readonly color: string;
  readonly description: string;
  /** Screen reader announcement for this stage. */
  readonly ariaLabel: string;
}

export const GUEST_PIPELINE_STAGE_DEFS: readonly PipelineStageDef[] = [
  {
    id: "registered",
    label: "Registrado",
    labelKey: "guest.pipeline.registered",
    step: 0,
    color: "var(--color-silver-400)",
    description: "Guest registrado, pendiente primera visita",
    ariaLabel: "Etapa: registrado, pendiente de primera visita",
  },
  {
    id: "first_visit",
    label: "Primera visita",
    labelKey: "guest.pipeline.first_visit",
    step: 1,
    color: "var(--color-teal-400)",
    description: "Completó primera visita al club",
    ariaLabel: "Etapa: primera visita completada",
  },
  {
    id: "trial_active",
    label: "Trial activo",
    labelKey: "guest.pipeline.trial_active",
    step: 2,
    color: "var(--color-amber-400)",
    description: "En período de prueba activo",
    ariaLabel: "Etapa: período de prueba activo",
  },
  {
    id: "ready",
    label: "Listo para propuesta",
    labelKey: "guest.pipeline.ready",
    step: 3,
    color: "var(--color-emerald-400)",
    description: "Criterios de conversión cumplidos",
    ariaLabel: "Etapa: listo para propuesta de membresía",
  },
  {
    id: "converted",
    label: "Convertido",
    labelKey: "guest.pipeline.converted",
    step: 4,
    color: "var(--color-gold-400)",
    description: "Se convirtió en miembro",
    ariaLabel: "Etapa: convertido en miembro",
  },
  {
    id: "dormant",
    label: "Dormiente",
    labelKey: "guest.pipeline.dormant",
    step: -1,
    color: "var(--color-rose-400)",
    description: "Sin actividad reciente, candidato a reactivación",
    ariaLabel: "Etapa: dormiente, sin actividad reciente",
  },
] as const;

// ═══════════════════════════════════════════════════════════
// §6 — MCP TOOL REGISTRY
// ═══════════════════════════════════════════════════════════

export interface MCPToolDef {
  readonly server: string;
  readonly tool: string;
  /** React Query staleTime in ms. */
  readonly staleTime: number;
  /** Whether this tool requires RAG context injection. */
  readonly ragEnabled: boolean;
}

export const GUEST_MCP_TOOLS: Record<string, MCPToolDef> = {
  healthScore: {
    server: "guest_management",
    tool: "get_guest_health_score",
    staleTime: 120_000,
    ragEnabled: false,
  },
  conversionFunnel: {
    server: "guest_management",
    tool: "get_conversion_funnel",
    staleTime: 120_000,
    ragEnabled: false,
  },
  analyticsEnhanced: {
    server: "guest_management",
    tool: "get_guest_analytics_enhanced",
    staleTime: 120_000,
    ragEnabled: false,
  },
  forecast: {
    server: "guest_management",
    tool: "get_guest_forecast",
    staleTime: 300_000,
    ragEnabled: true,
  },
  proposals: {
    server: "guest_management",
    tool: "generate_guest_engagement_proposals",
    staleTime: 300_000,
    ragEnabled: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════
// §7 — CHEMISTRY & FIRST IMPRESSION WEIGHTS
// Sum of weights = 1.0 for each group. Verified in tests.
// ═══════════════════════════════════════════════════════════

/** Weights for ChemistryScore dimensions. Total = 1.0 */
export const CHEMISTRY_WEIGHTS = {
  guestClubFit: 0.25,
  guestSponsorFit: 0.20,
  activityAlignment: 0.25,
  socialResonance: 0.15,
  temporalFit: 0.15,
} as const;

/** Weights for FirstImpression axes. Total = 1.0 */
export const FIRST_IMPRESSION_WEIGHTS = {
  welcomeLatency: 0.30,
  activityMatch: 0.25,
  socialTemperature: 0.20,
  environmentalComfort: 0.15,
  departureSentiment: 0.10,
} as const;

// ═══════════════════════════════════════════════════════════
// §8 — MEMORY THRESHOLDS
// ═══════════════════════════════════════════════════════════

export const MEMORY_THRESHOLDS = {
  strongMemory: 70,
  moderateMemory: 40,
  weakMemory: 20,
  staleDays: 90,
  recallPriorityHigh: 80,
  maxActiveRecallNodes: 20,
} as const;

// ═══════════════════════════════════════════════════════════
// §9 — HEALTH FACTOR WEIGHTS
// Post-engine health score composition.
// Original 5 factors (rules/guest.ts) + 2 engine factors.
// Total = 1.0. Verified in tests.
// ═══════════════════════════════════════════════════════════

export const GUEST_HEALTH_WEIGHTS = {
  conversionHealth: 0.20,
  funnelIntegrity: 0.15,
  pipelineHealth: 0.15,
  trialPerformance: 0.15,
  eventLeverage: 0.10,
  chemistryHealth: 0.15,
  memoryHealth: 0.10,
} as const;

// ═══════════════════════════════════════════════════════════
// §10 — DATA DEPENDENCIES (Streaming Evaluation)
// Maps rule IDs → data fields they depend on.
// Advisor engine uses this for dirty-flag re-evaluation.
// ═══════════════════════════════════════════════════════════

export const GUEST_DATA_DEPENDENCIES: Record<string, readonly string[]> = {
  // Existing rules (R1-R14)
  R1_OVERALL_CONVERSION_LOW: ["funnel"],
  R2_TRIAL_CONVERSION_LOW: ["funnel"],
  R3_GUEST_VOLUME_DECLINING: ["forecast"],
  R4_FUNNEL_HEALTHY: ["funnel"],
  R5_HOT_LEADS_PENDING: ["analytics", "proposals"],
  R6_TRIALS_EXPIRING: ["proposals"],
  R7_EVENTS_ZERO_GUESTS: ["analytics"],
  R8_TOP_REFERRERS_INACTIVE: ["proposals"],
  R9_PRIVILEGE_CONCENTRATION: ["analytics"],
  R10_WEEKEND_CONCENTRATION: ["analytics"],
  R11_BEST_TRIAL_TYPE: ["analytics"],
  R12_EVENT_GUEST_CORRELATION: ["analytics"],
  R13_COMMS_CAMPAIGN: ["proposals"],
  R14_PIPELINE_VALUE_ALERT: ["funnel"],

  // Phase 34 new rules (R15-R20)
  R15_VIP_DETECTED: ["analytics", "health"],
  R16_FIRST_IMPRESSION_LOW: ["analytics"],
  R17_CHEMISTRY_EXCEPTIONAL: ["analytics"],
  R18_SPONSOR_MISMATCH: ["analytics"],
  R19_DORMANT_REACTIVATION: ["analytics"],
  R20_MEMORY_STRONG: ["analytics"],
} as const;

// ═══════════════════════════════════════════════════════════
// §11 — ENGINE CONTRACTS
// Declares what each engine reads, writes, and depends on.
// useGuestDashboard uses this for execution ordering and
// dev-mode dependency validation.
// ═══════════════════════════════════════════════════════════

export interface EngineContract {
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly dependencies: readonly EngineName[];
  /** Max allowed execution time (ms). Exceeding triggers warning. */
  readonly budgetMs: number;
}

export const GUEST_ENGINE_CONTRACTS: Record<EngineName, EngineContract> = {
  guestIntelligence: {
    inputs: ["healthScore", "analytics", "funnel"],
    outputs: ["profiles", "topVipGuests"],
    dependencies: [],
    budgetMs: 50,
  },
  conversionChemistry: {
    inputs: ["analytics"],
    outputs: ["chemistryScores", "firstImpressions"],
    dependencies: ["guestIntelligence"],
    budgetMs: 40,
  },
  guestMemory: {
    inputs: ["analytics"],
    outputs: ["memoryGraphs", "dormantGuests"],
    dependencies: ["guestIntelligence"],
    budgetMs: 40,
  },
  pipelineEcosystem: {
    inputs: ["funnel", "forecast", "healthScore"],
    outputs: ["pipeline", "quickWins"],
    dependencies: ["guestIntelligence"],
    budgetMs: 50,
  },
  trialNarrative: {
    inputs: ["proposals"],
    outputs: ["enrichedProposals", "trialPlans"],
    dependencies: [
      "guestIntelligence",
      "conversionChemistry",
      "guestMemory",
      "pipelineEcosystem",
    ],
    budgetMs: 30,
  },
};

/** Validate engine execution order. Dev-mode only. */
export function validateEngineOrder(order: readonly EngineName[]): string[] {
  const errors: string[] = [];
  const completed = new Set<EngineName>();

  for (const engine of order) {
    const contract = GUEST_ENGINE_CONTRACTS[engine];
    for (const dep of contract.dependencies) {
      if (!completed.has(dep)) {
        errors.push(
          `Engine "${engine}" depends on "${dep}" which hasn't executed yet.`,
        );
      }
    }
    completed.add(engine);
  }
  return errors;
}

// ═══════════════════════════════════════════════════════════
// §12 — MOTION & ANIMATION CONFIG
// All animation timing centralized.
// Respects prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════

export interface MotionConfig {
  /** Stagger delay between entrance animations (ms). */
  readonly staggerMs: number;
  /** Base animation duration (ms). */
  readonly durationMs: number;
  /** CSS easing function. */
  readonly easing: string;
  /** Pulse animation duration by dashboard mode (ms). */
  readonly pulseByMode: Record<GuestDashboardMode, number>;
  /** Whether reduced motion is active (detected at runtime). */
  readonly reducedMotion: boolean;
}

export const GUEST_MOTION_CONFIG: MotionConfig = {
  staggerMs: 100,
  durationMs: 400,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  pulseByMode: {
    calm: 6000,
    alert: 3000,
    critical: 1500,
    celebration: 8000,
  },
  reducedMotion: false,
};

/** Entrance choreography timing map. */
export const GUEST_ENTRANCE_CHOREOGRAPHY = {
  /** GuestAmbientCanvas particles start. */
  T0_CANVAS: 0,
  /** GuestPulse fade-in. */
  T1_PULSE: 200,
  /** Pipeline health gauge fade-in + score count-up. */
  T2_HEALTH: 400,
  /** KPI Card 1 (Active Guests). */
  T3_KPI_1: 500,
  /** KPI Card 2 (Conversion Rate). */
  T4_KPI_2: 600,
  /** KPI Card 3 + Hero Insight dramatic reveal. */
  T5_KPI_3_HERO: 700,
  /** KPI Card 4 (Dormant). */
  T6_KPI_4: 800,
  /** Main grid (stage + stream). */
  T7_GRID: 900,
  /** Intelligence Stream items stagger. */
  T8_STREAM: 1100,
  /** Footer narrative. */
  T9_FOOTER: 1200,
} as const;

// ═══════════════════════════════════════════════════════════
// §13 — RESPONSIVE BREAKPOINTS
// ═══════════════════════════════════════════════════════════

export const GUEST_BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  ultrawide: 1920,
} as const;

/** Grid template areas by breakpoint. */
export const GUEST_GRID_TEMPLATES = {
  mobile: `
    "pulse"
    "hero"
    "kpi-stack"
    "stage"
    "stream"
    "footer"
  `,
  tablet: `
    "pulse   pulse"
    "hero    hero"
    "kpi-1   kpi-2"
    "kpi-3   kpi-4"
    "stage   stream"
    "footer  footer"
  `,
  desktop: `
    "pulse   pulse    pulse"
    "hero    kpi-1    kpi-2"
    "hero    kpi-3    kpi-4"
    "stage   stage    stream"
    "footer  footer   footer"
  `,
} as const;