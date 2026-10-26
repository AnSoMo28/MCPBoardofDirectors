// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Guest Domain Rules
// Phase 34 "The Gateway" — Extended Edition
// Level 6+ Agency · Production Grade
//
// 20 declarative rules across 5 layers.
// Extended GuestContext with engine enrichment fields.
// 6 signal definitions (1 existing + 5 new).
// 7 health factors (5 existing + 2 engine-based).
// Named thresholds — never magic numbers.
// Data dependencies for streaming evaluation.
//
// Original: 14 rules (F47 B5.4 migration)
// Extended: +6 rules (Phase 34 engine-based)
//
// Architecture:
//   RuleDefinition<GuestContext> — pure functions, testable
//   buildGuestCtx() — derives metrics from raw MCP data + enrichment
//   GUEST_HEALTH_FACTORS — unified health score
//   GUEST_ENGINE_ENRICHMENT — optional engine output injection
//
// Checklist: M1-15, M2-12, M8-10, E1-15
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import type { SeverityLevel } from "@/shared/types/domain-enums";
import type {
  BaseContext,
  RuleDefinition,
  SignalDefinition,
  HealthFactorDef,
  DomainSignal,
} from "../types";
import { buildInsight } from "../evaluate";

import type {
  GuestHealthScore,
  ConversionFunnel,
  GuestAnalyticsEnhanced,
  GuestDemandForecast,
  GuestEngagementProposalList,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// SECTION 0 — ENGINE ENRICHMENT CONTRACT
// Optional injection of engine-computed values.
// useGuestDashboard computes these from engine outputs
// and passes them to buildGuestCtx().
//
// All fields are primitives — no import from features/ needed.
// ═══════════════════════════════════════════════════════════

/**
 * Engine-computed enrichment values injected into GuestContext.
 * All primitives — no dependency on features/guests/types.
 *
 * Computed by useGuestDashboard from engine outputs:
 *   guestIntelligence → vipCount, dormantCount
 *   conversionChemistry → avgChemistryScore, firstImpressionAlertCount, topSponsorMismatchCount
 *   guestMemory → avgMemoryStrength
 *   pipelineEcosystem → pipelineHealth, pipelineVelocity, pipelineBottleneck, quickWinCount
 */
export interface GuestEngineEnrichment {
  readonly vipCount: number;
  readonly dormantCount: number;
  readonly quickWinCount: number;
  readonly avgChemistryScore: number;
  readonly avgMemoryStrength: number;
  readonly pipelineHealth: number;
  readonly pipelineVelocity: number;
  readonly pipelineBottleneck: string | null;
  readonly firstImpressionAlertCount: number;
  readonly topSponsorMismatchCount: number;
}

/** Default enrichment — all zeros (no engine data available). */
const EMPTY_ENRICHMENT: GuestEngineEnrichment = {
  vipCount: 0,
  dormantCount: 0,
  quickWinCount: 0,
  avgChemistryScore: 0,
  avgMemoryStrength: 0,
  pipelineHealth: 0,
  pipelineVelocity: 0,
  pipelineBottleneck: null,
  firstImpressionAlertCount: 0,
  topSponsorMismatchCount: 0,
};

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT
// Extended with engine enrichment fields.
// ═══════════════════════════════════════════════════════════

/**
 * Complete guest advisor context.
 * Combines raw MCP data + derived metrics + engine enrichment.
 *
 * Without engine data, rules R1-R14 work exactly as before.
 * With engine data, rules R15-R20 activate.
 */
export interface GuestContext extends BaseContext {
  domain: "engagement";

  // ── Raw MCP inputs ──
  health: GuestHealthScore | null;
  funnel: ConversionFunnel | null;
  analytics: GuestAnalyticsEnhanced | null;
  forecast: GuestDemandForecast | null;
  proposals: GuestEngagementProposalList | null;

  // ── Derived: Funnel metrics ──
  /** Overall conversion rate (0-100). */
  overallConversion: number;
  /** CR benchmark conversion rate. */
  overallBenchmark: number;
  /** Trial → member conversion rate (0-100). */
  trialConversion: number;
  /** Total guests in the system. */
  totalGuests: number;
  /** Total guests converted to members. */
  totalConverted: number;
  /** Estimated pipeline value in ₡ colones. */
  pipelineValue: number;
  /** Worst-performing stage conversion rate. */
  worstStageRate: number;
  /** Label of worst-performing stage. */
  worstStageName: string;

  // ── Derived: Pipeline ──
  activeGuests: number;
  activeTrials: number;
  /** Guests with 5+ visits but no trial. */
  hotLeads: number;

  // ── Derived: Analytics ──
  /** Percentage of visits on weekends (0-100). */
  weekendPct: number;
  /** Day with highest visit count. */
  peakDay: string;
  totalEvents: number;
  upcomingEvents: number;

  // ── Derived: Proposals ──
  highPriorityProposals: number;
  crossDomainProposals: number;

  // ── Derived: Seasonal ──
  seasonalMultiplier: number;
  peakMonths: readonly string[];

  // ── Derived: Trial ──
  trialToMemberRate: number;

  // ── Derived: Event correlation ──
  bestEventType: string | null;
  bestEventGuests: number;
  zeroGuestEventTypes: readonly string[];

  // ── Phase 34: Engine enrichment ──
  /** Guests identified as VIP candidates (from guestIntelligence). */
  vipCount: number;
  /** Guests identified as dormant (from guestMemory). */
  dormantCount: number;
  /** Guests one step from conversion (from pipelineEcosystem). */
  quickWinCount: number;
  /** Average chemistry score across guests (from conversionChemistry). */
  avgChemistryScore: number;
  /** Average memory strength across guests (from guestMemory). */
  avgMemoryStrength: number;
  /** Pipeline ecosystem health score 0-100 (from pipelineEcosystem). */
  pipelineHealth: number;
  /** Average days from first visit to conversion (from pipelineEcosystem). */
  pipelineVelocity: number;
  /** Label of the primary bottleneck stage, null if none. */
  pipelineBottleneck: string | null;
  /** Visits with first impression score < 40 (from conversionChemistry). */
  firstImpressionAlertCount: number;
  /** Guests with sponsor compatibility < 30 (from conversionChemistry). */
  topSponsorMismatchCount: number;
}

/**
 * Build GuestContext from raw MCP data + optional engine enrichment.
 *
 * Backward compatible: existing callers pass (rawData) or (rawData, signals).
 * New callers pass (rawData, signals, enrichment) for Phase 34 rules.
 *
 * @param rawData - Raw MCP data (healthScore, funnel, analytics, forecast, proposals)
 * @param signals - Cross-domain signals consumed by this evaluation
 * @param enrichment - Optional engine-computed values for R15-R20
 * @returns Complete GuestContext for rule evaluation
 */
export function buildGuestCtx(
  rawData: unknown,
  signals?: DomainSignal[],
  enrichment?: GuestEngineEnrichment,
): GuestContext {
  const {
    healthScore: health,
    funnel,
    analytics,
    forecast,
    proposals,
  } = rawData as {
    healthScore: GuestHealthScore | null;
    funnel: ConversionFunnel | null;
    analytics: GuestAnalyticsEnhanced | null;
    forecast: GuestDemandForecast | null;
    proposals: GuestEngagementProposalList | null;
  };

  const eng = enrichment ?? EMPTY_ENRICHMENT;

  // ── Funnel ──
  const stages = funnel?.stages ?? [];
  const overallConversion = funnel?.overall_conversion_pct ?? 0;
  const overallBenchmark = funnel?.overall_benchmark_pct ?? 0;
  const trialStage = stages.find((s) => s.stage === "trial_applicant");
  const convertedStage = stages.find((s) => s.stage === "converted_member");
  const trialConversion =
    trialStage && convertedStage
      ? (convertedStage.count / Math.max(trialStage.count, 1)) * 100
      : 0;
  const worstStage = stages.reduce(
    (w, s) => (s.vs_benchmark < (w?.vs_benchmark ?? 0) ? s : w),
    stages[0],
  );

  // ── Analytics: weekend concentration ──
  const peakDays = analytics?.peak_visit_days ?? [];
  const weekendDays = ["Viernes", "Sábado", "Domingo"];
  const weekendVisits = peakDays
    .filter((d) => weekendDays.includes(d.day))
    .reduce((sum, d) => sum + d.visit_count, 0);
  const totalVisits = peakDays.reduce((sum, d) => sum + d.visit_count, 0);
  const weekendPct = totalVisits > 0 ? (weekendVisits / totalVisits) * 100 : 0;

  // ── Analytics: event correlation ──
  const correlation = analytics?.event_guest_correlation ?? [];
  const bestEvent = correlation.reduce(
    (b, c) =>
      c.avg_guests_generated > (b?.avg_guests_generated ?? 0) ? c : b,
    correlation[0],
  );
  const zeroGuestEventTypes = correlation
    .filter((e) => e.avg_guests_generated === 0)
    .map((e) => e.event_type);

  // ── Proposals: hot leads ──
  const hotLeadsProposal =
    proposals?.proposals.filter(
      (p) => p.proposal_type === "trial_invitation",
    ) ?? [];

  return {
    domain: "engagement",
    signals: signals ?? [],

    // Raw
    health,
    funnel,
    analytics,
    forecast,
    proposals,

    // Funnel
    overallConversion,
    overallBenchmark,
    trialConversion,
    totalGuests: funnel?.total_guests ?? analytics?.total_guests ?? 0,
    totalConverted: funnel?.total_converted ?? 0,
    pipelineValue: funnel?.pipeline_value ?? 0,
    worstStageRate: worstStage?.rate_pct ?? 0,
    worstStageName: worstStage?.label ?? "N/A",

    // Pipeline
    activeGuests: (analytics as unknown as Record<string, unknown>)?.active_guests as number ?? 0,
    activeTrials: (analytics as unknown as Record<string, unknown>)?.active_trials as number ?? 0,
    hotLeads: hotLeadsProposal.length,

    // Analytics
    weekendPct,
    peakDay: peakDays[0]?.day ?? "N/A",
    totalEvents: analytics?.total_private_events ?? 0,
    upcomingEvents: analytics?.upcoming_events ?? 0,

    // Proposals
    highPriorityProposals: proposals?.high_priority_count ?? 0,
    crossDomainProposals: proposals?.cross_domain_count ?? 0,

    // Seasonal
    seasonalMultiplier: forecast?.seasonal_multiplier ?? 1.0,
    peakMonths: forecast?.peak_months ?? [],

    // Trial
    trialToMemberRate: (analytics as unknown as Record<string, unknown>)?.trial_to_member_rate as number ?? 0,

    // Event correlation
    bestEventType: bestEvent?.event_type ?? null,
    bestEventGuests: bestEvent?.avg_guests_generated ?? 0,
    zeroGuestEventTypes,

    // Phase 34: Engine enrichment
    vipCount: eng.vipCount,
    dormantCount: eng.dormantCount,
    quickWinCount: eng.quickWinCount,
    avgChemistryScore: eng.avgChemistryScore,
    avgMemoryStrength: eng.avgMemoryStrength,
    pipelineHealth: eng.pipelineHealth,
    pipelineVelocity: eng.pipelineVelocity,
    pipelineBottleneck: eng.pipelineBottleneck,
    firstImpressionAlertCount: eng.firstImpressionAlertCount,
    topSponsorMismatchCount: eng.topSponsorMismatchCount,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SIGNAL DEFINITIONS
// 1 existing + 5 new guest signals.
// Will be added to SIGNAL_NAMES registry.
// ═══════════════════════════════════════════════════════════

/** Existing: Pipeline at risk. */
const GUEST_PIPELINE_ALERT: SignalDefinition = {
  id: "guest_pipeline_alert",
  targetDomains: ["global", "engagement"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Guest conversion pipeline at risk",
  ttl: 300_000,
};

/** NEW: VIP guest detected — high influence + spending + fit. */
const GUEST_VIP_DETECTED: SignalDefinition = {
  id: "gst_vip_detected",
  targetDomains: ["engagement", "global"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "VIP guest candidate detected",
  ttl: 600_000,
};

/** NEW: Guest ready for conversion proposal. */
const GUEST_CONVERSION_READY: SignalDefinition = {
  id: "gst_conversion_ready",
  targetDomains: ["engagement"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Guest ready for conversion proposal",
  ttl: 300_000,
};

/** NEW: Trial about to expire without follow-up. */
const GUEST_TRIAL_EXPIRING: SignalDefinition = {
  id: "gst_trial_expiring",
  targetDomains: ["engagement"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Trial expiring without follow-up",
  ttl: 300_000,
};

/** NEW: Dormant guest detected — reactivation opportunity. */
const GUEST_DORMANT_DETECTED: SignalDefinition = {
  id: "gst_dormant_detected",
  targetDomains: ["engagement", "global"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Dormant guest reactivation opportunity",
  ttl: 600_000,
};

/** NEW: First impression below threshold — service recovery needed. */
const GUEST_FIRST_IMPRESSION_ALERT: SignalDefinition = {
  id: "gst_first_impression_alert",
  targetDomains: ["engagement"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "First impression below threshold",
  ttl: 180_000,
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 — THRESHOLDS (named, testable, tunable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  // ── Existing (R1-R14) ──
  CONVERSION_LOW_PCT: 5,
  TRIAL_CONVERSION_TARGET_PCT: 25,
  WEEKEND_CONCENTRATION_PCT: 60,
  PRIVILEGE_CONCENTRATION_PCT: 45,
  BEST_EVENT_MIN_GUESTS: 50,
  HOT_LEAD_MIN_VISITS: 5,

  // ── Phase 34 new (R15-R20) ──
  VIP_SCORE_THRESHOLD: 80,
  FIRST_IMPRESSION_ALERT: 40,
  CHEMISTRY_EXCEPTIONAL: 85,
  DORMANT_DAYS: 60,
  MEMORY_STRENGTH_GOOD: 50,
  SPONSOR_MISMATCH: 30,
} as const;

// ═══════════════════════════════════════════════════════════
// SECTION 4 — DATA DEPENDENCIES (streaming evaluation)
// Maps rule IDs to the data fields they need.
// Advisor engine skips rules whose deps haven't changed.
// ═══════════════════════════════════════════════════════════

const DATA_DEPS: Record<string, string[]> = {
  // Existing rules
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

  // Phase 34 new rules — depend on engine enrichment
  R15_VIP_DETECTED: ["vipCount"],
  R16_FIRST_IMPRESSION_LOW: ["firstImpressionAlertCount"],
  R17_CHEMISTRY_EXCEPTIONAL: ["avgChemistryScore"],
  R18_SPONSOR_MISMATCH: ["topSponsorMismatchCount"],
  R19_DORMANT_REACTIVATION: ["dormantCount"],
  R20_MEMORY_STRONG: ["avgMemoryStrength"],
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — RULES (20 rules × 5 layers)
//
// Layer mapping:
//   funnel       → "macro"         (R1-R4)   priority 100
//   pipeline     → "lifecycle"     (R5-R8, R15-R16, R20) priority 200
//   optimization → "utilization"   (R9-R12, R17-R18) priority 300
//   cross_domain → "cross_domain"  (R13-R14, R19) priority 400
// ═══════════════════════════════════════════════════════════

// ── Layer 1: Funnel Health (macro) ────────────────────────

const R1_OVERALL_CONVERSION_LOW: RuleDefinition<GuestContext> = {
  id: "R1_OVERALL_CONVERSION_LOW",
  name: "Conversión global baja",
  layer: "macro",
  domain: "engagement",
  priority: 100,
  dataDependencies: DATA_DEPS.R1_OVERALL_CONVERSION_LOW,
  emitSignals: [GUEST_PIPELINE_ALERT],
  evaluate: (ctx) => {
    if (
      ctx.totalGuests === 0 ||
      ctx.overallConversion >= THRESHOLDS.CONVERSION_LOW_PCT
    )
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R1_OVERALL_CONVERSION_LOW"),
      impact: "high",
      title: `Conversión global: ${ctx.overallConversion.toFixed(1)}% (benchmark: ${ctx.overallBenchmark}%)`,
      reasoning:
        `De ${ctx.totalGuests} invitados, solo ${ctx.totalConverted} se convirtieron en miembros. ` +
        `La tasa de ${ctx.overallConversion.toFixed(1)}% está por debajo del benchmark CR (${ctx.overallBenchmark}%). ` +
        `El funnel tiene fugas en cada etapa — intervenir con follow-up personalizado.`,
      confidence: 90,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "get_conversion_funnel",
        params: {},
        approval_level: "auto",
        label: "Ver funnel completo",
      },
    });
  },
};

const R2_TRIAL_CONVERSION_LOW: RuleDefinition<GuestContext> = {
  id: "R2_TRIAL_CONVERSION_LOW",
  name: "Conversión trials baja",
  layer: "macro",
  domain: "engagement",
  priority: 100,
  dataDependencies: DATA_DEPS.R2_TRIAL_CONVERSION_LOW,
  evaluate: (ctx) => {
    if (
      ctx.activeTrials === 0 ||
      ctx.trialConversion >= THRESHOLDS.TRIAL_CONVERSION_TARGET_PCT
    )
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R2_TRIAL_CONVERSION_LOW"),
      impact: "high",
      title: `Conversión trials: ${ctx.trialConversion.toFixed(0)}% (target: ${THRESHOLDS.TRIAL_CONVERSION_TARGET_PCT}%)`,
      reasoning:
        `Solo ${ctx.trialConversion.toFixed(0)}% de trials se convierten en membresía. ` +
        `Los trials con acceso completo (3+ privilegios) tienen 2.5x más conversión. ` +
        `Extender el período mínimo y ofrecer full access como default.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "manage_trial_memberships",
        params: { action: "update" },
        approval_level: "auto",
        label: "Mejorar trials",
      },
    });
  },
};

const R3_GUEST_VOLUME_DECLINING: RuleDefinition<GuestContext> = {
  id: "R3_GUEST_VOLUME_DECLINING",
  name: "Volumen de invitados en declive",
  layer: "macro",
  domain: "engagement",
  priority: 100,
  dataDependencies: DATA_DEPS.R3_GUEST_VOLUME_DECLINING,
  evaluate: (ctx) => {
    const forecast = ctx.forecast;
    if (!forecast) return null;
    const guestF = forecast.forecasts.find(
      (f) => f.metric === "guest_volume",
    );
    if (!guestF || guestF.change_pct >= 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R3_GUEST_VOLUME_DECLINING"),
      impact: "medium",
      title: `Volumen de invitados en declive: ${guestF.change_pct.toFixed(1)}%`,
      reasoning:
        `El forecast muestra una caída de ${Math.abs(guestF.change_pct).toFixed(1)}% en invitados. ` +
        `Factores: ${guestF.factors.join(", ")}. ` +
        `Sin acción, el pipeline de nuevos miembros se reducirá proporcionalmente.`,
      confidence: 70,
      target_view: "intelligence",
    });
  },
};

const R4_FUNNEL_HEALTHY: RuleDefinition<GuestContext> = {
  id: "R4_FUNNEL_HEALTHY",
  name: "Funnel saludable",
  layer: "macro",
  domain: "engagement",
  priority: 100,
  dataDependencies: DATA_DEPS.R4_FUNNEL_HEALTHY,
  evaluate: (ctx) => {
    if (
      ctx.totalGuests === 0 ||
      ctx.overallConversion < ctx.overallBenchmark
    )
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R4_FUNNEL_HEALTHY"),
      impact: "low",
      title: "Funnel de conversión saludable",
      reasoning:
        `Conversión ${ctx.overallConversion.toFixed(1)}% supera el benchmark CR (${ctx.overallBenchmark}%). ` +
        `Pipeline value: ₡${(ctx.pipelineValue / 1_000_000).toFixed(1)}M. Mantener el momentum.`,
      confidence: 90,
      target_view: "intelligence",
    });
  },
};

// ── Layer 2: Pipeline (lifecycle) ─────────────────────────

const R5_HOT_LEADS_PENDING: RuleDefinition<GuestContext> = {
  id: "R5_HOT_LEADS_PENDING",
  name: "Hot leads pendientes",
  layer: "lifecycle",
  domain: "engagement",
  priority: 200,
  dataDependencies: DATA_DEPS.R5_HOT_LEADS_PENDING,
  evaluate: (ctx) => {
    if (ctx.hotLeads === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R5_HOT_LEADS_PENDING"),
      impact: "high",
      title: `${ctx.hotLeads} hot leads con ${THRESHOLDS.HOT_LEAD_MIN_VISITS}+ visitas sin trial`,
      reasoning:
        `Hay invitados que han visitado el club más de ${THRESHOLDS.HOT_LEAD_MIN_VISITS} veces sin solicitar trial. ` +
        `Estos leads tienen 3x más probabilidad de conversión que un guest nuevo. ` +
        `Contactar con invitación personalizada de trial.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: { proposal_type: "trial_invitation" },
        approval_level: "auto",
        label: "Enviar invitación trial",
      },
    });
  },
};

const R6_TRIALS_EXPIRING: RuleDefinition<GuestContext> = {
  id: "R6_TRIALS_EXPIRING",
  name: "Trials por expirar sin seguimiento",
  layer: "lifecycle",
  domain: "engagement",
  priority: 200,
  dataDependencies: DATA_DEPS.R6_TRIALS_EXPIRING,
  emitSignals: [GUEST_TRIAL_EXPIRING],
  evaluate: (ctx) => {
    const followUps =
      ctx.proposals?.proposals.filter(
        (p) => p.proposal_type === "follow_up_campaign",
      ) ?? [];
    if (followUps.length === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R6_TRIALS_EXPIRING"),
      impact: "high",
      title: `${followUps.length} trial(s) por expirar sin seguimiento`,
      reasoning:
        `Hay trials que expiran pronto sin contacto programado. ` +
        `Sin seguimiento, 80% de probabilidad de expiración sin conversión. ` +
        `Contactar hoy con oferta de extensión o descuento de membresía.`,
      confidence: 82,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: { proposal_type: "follow_up_campaign" },
        approval_level: "auto",
        label: "Programar seguimiento",
      },
    });
  },
};

const R7_EVENTS_ZERO_GUESTS: RuleDefinition<GuestContext> = {
  id: "R7_EVENTS_ZERO_GUESTS",
  name: "Eventos sin nuevos invitados",
  layer: "lifecycle",
  domain: "engagement",
  priority: 200,
  dataDependencies: DATA_DEPS.R7_EVENTS_ZERO_GUESTS,
  evaluate: (ctx) => {
    if (
      ctx.zeroGuestEventTypes.length === 0 ||
      ctx.totalEvents === 0
    )
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R7_EVENTS_ZERO_GUESTS"),
      impact: "medium",
      title: `${ctx.zeroGuestEventTypes.length} tipo(s) de evento sin nuevos invitados`,
      reasoning:
        `${ctx.zeroGuestEventTypes.join(", ")} no generan nuevos guests. ` +
        `Los eventos privados son el #1 driver de nuevos invitados. ` +
        `Revisar si se están aprovechando para captar nuevos leads.`,
      confidence: 75,
      target_view: "intelligence",
    });
  },
};

const R8_TOP_REFERRERS_INACTIVE: RuleDefinition<GuestContext> = {
  id: "R8_TOP_REFERRERS_INACTIVE",
  name: "Top referidores inactivos",
  layer: "lifecycle",
  domain: "engagement",
  priority: 200,
  dataDependencies: DATA_DEPS.R8_TOP_REFERRERS_INACTIVE,
  evaluate: (ctx) => {
    const referralProposals =
      ctx.proposals?.proposals.filter(
        (p) => p.proposal_type === "referral_activation",
      ) ?? [];
    if (referralProposals.length === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R8_TOP_REFERRERS_INACTIVE"),
      impact: "medium",
      title: "Top referidores inactivos",
      reasoning:
        `Familias que históricamente traen invitados están inactivas. ` +
        `Reactivar con incentivo de referidos (cena, descuento, upgrade). ` +
        `Cada referidor activo genera 2-3 guests/mes promedio.`,
      confidence: 68,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: { proposal_type: "referral_activation" },
        approval_level: "auto",
        label: "Reactivar referidores",
      },
    });
  },
};

// ── Layer 3: Optimization (utilization) ───────────────────

const R9_PRIVILEGE_CONCENTRATION: RuleDefinition<GuestContext> = {
  id: "R9_PRIVILEGE_CONCENTRATION",
  name: "Concentración de privilegios",
  layer: "utilization",
  domain: "engagement",
  priority: 300,
  dataDependencies: DATA_DEPS.R9_PRIVILEGE_CONCENTRATION,
  evaluate: (ctx) => {
    const privs = ctx.analytics?.privilege_usage ?? [];
    if (privs.length === 0) return null;
    const totalUsage = privs.reduce((s, p) => s + p.usage_count, 0);
    if (totalUsage === 0) return null;
    const topPriv = privs[0];
    const topPct = (topPriv.usage_count / totalUsage) * 100;
    if (topPct <= THRESHOLDS.PRIVILEGE_CONCENTRATION_PCT) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R9_PRIVILEGE_CONCENTRATION"),
      impact: "medium",
      title: `${topPriv.privilege_type} concentra ${topPct.toFixed(0)}% del uso`,
      reasoning:
        `El privilegio '${topPriv.privilege_type}' domina el uso de invitados. ` +
        `Los guests con 3+ privilegios tienen 2.5x más probabilidad de trial. ` +
        `Expandir el default a pool+dining+gym.`,
      confidence: 78,
      target_view: "intelligence",
    });
  },
};

const R10_WEEKEND_CONCENTRATION: RuleDefinition<GuestContext> = {
  id: "R10_WEEKEND_CONCENTRATION",
  name: "Concentración fin de semana",
  layer: "utilization",
  domain: "engagement",
  priority: 300,
  dataDependencies: DATA_DEPS.R10_WEEKEND_CONCENTRATION,
  evaluate: (ctx) => {
    if (ctx.weekendPct <= THRESHOLDS.WEEKEND_CONCENTRATION_PCT)
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R10_WEEKEND_CONCENTRATION"),
      impact: "low",
      title: `${ctx.weekendPct.toFixed(0)}% de visitas en fin de semana`,
      reasoning:
        `Las visitas se concentran viernes-domingo (${ctx.peakDay} es el pico). ` +
        `Considerar promociones mid-week para distribuir la carga operativa.`,
      confidence: 72,
      target_view: "intelligence",
    });
  },
};

const R11_BEST_TRIAL_TYPE: RuleDefinition<GuestContext> = {
  id: "R11_BEST_TRIAL_TYPE",
  name: "Insight de tipo de trial",
  layer: "utilization",
  domain: "engagement",
  priority: 300,
  dataDependencies: DATA_DEPS.R11_BEST_TRIAL_TYPE,
  evaluate: (ctx) => {
    if (ctx.trialToMemberRate <= 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R11_BEST_TRIAL_TYPE"),
      impact: "low",
      title: `Tasa trial→member: ${ctx.trialToMemberRate.toFixed(0)}%`,
      reasoning:
        `Los trials de 1 mes tienen mejor conversión que los de 1 semana. ` +
        `Recomendación: ofrecer month_trial como default, week_trial como intro.`,
      confidence: 70,
      target_view: "intelligence",
    });
  },
};

const R12_EVENT_GUEST_CORRELATION: RuleDefinition<GuestContext> = {
  id: "R12_EVENT_GUEST_CORRELATION",
  name: "Correlación eventos-invitados",
  layer: "utilization",
  domain: "engagement",
  priority: 300,
  dataDependencies: DATA_DEPS.R12_EVENT_GUEST_CORRELATION,
  evaluate: (ctx) => {
    if (
      !ctx.bestEventType ||
      ctx.bestEventGuests < THRESHOLDS.BEST_EVENT_MIN_GUESTS
    )
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R12_EVENT_GUEST_CORRELATION"),
      impact: "medium",
      title: `${ctx.bestEventType} genera ${ctx.bestEventGuests} guests en promedio`,
      reasoning:
        `Los eventos de tipo '${ctx.bestEventType}' son los que más nuevos invitados generan. ` +
        `Priorizar este tipo de eventos como motor de captación de nuevos miembros.`,
      confidence: 80,
      target_view: "intelligence",
    });
  },
};

// ── Layer 4: Cross-domain ─────────────────────────────────

const R13_COMMS_CAMPAIGN: RuleDefinition<GuestContext> = {
  id: "R13_COMMS_CAMPAIGN",
  name: "Campañas de comunicación necesarias",
  layer: "cross_domain",
  domain: "engagement",
  priority: 400,
  dataDependencies: DATA_DEPS.R13_COMMS_CAMPAIGN,
  evaluate: (ctx) => {
    const followUps =
      ctx.proposals?.proposals.filter(
        (p) =>
          p.proposal_type === "follow_up_campaign" ||
          p.proposal_type === "conversion_nudge",
      ) ?? [];
    if (followUps.length === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R13_COMMS_CAMPAIGN"),
      impact: "medium",
      title: `${followUps.length} campaña(s) de comunicación necesaria(s)`,
      reasoning:
        `Hay ${followUps.length} situaciones que requieren comunicación proactiva: ` +
        `trials por expirar, leads fríos, nudges de conversión. ` +
        `Dominio communications puede ejecutar automáticamente.`,
      confidence: 75,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: {},
        approval_level: "auto",
        label: "Enviar campañas",
      },
    });
  },
};

const R14_PIPELINE_VALUE_ALERT: RuleDefinition<GuestContext> = {
  id: "R14_PIPELINE_VALUE_ALERT",
  name: "Pipeline value en riesgo",
  layer: "cross_domain",
  domain: "engagement",
  priority: 400,
  dataDependencies: DATA_DEPS.R14_PIPELINE_VALUE_ALERT,
  emitSignals: [GUEST_PIPELINE_ALERT],
  evaluate: (ctx) => {
    if (ctx.pipelineValue <= 0) return null;
    if (ctx.overallConversion >= ctx.overallBenchmark) return null;
    const valueM = ctx.pipelineValue / 1_000_000;
    return buildInsight({
      id: generateInsightId("engagement", "R14_PIPELINE_VALUE_ALERT"),
      impact: "high",
      title: `Pipeline value: ₡${valueM.toFixed(1)}M en riesgo por baja conversión`,
      reasoning:
        `El pipeline activo de invitados vale ₡${valueM.toFixed(1)}M estimado en revenue de membresías. ` +
        `Con la conversión actual (${ctx.overallConversion.toFixed(1)}%), ` +
        `₡${(valueM * (1 - ctx.overallConversion / 100)).toFixed(1)}M se pierden. ` +
        `Cada punto porcentual de mejora en conversión = ₡${(valueM * 0.01).toFixed(1)}M.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

// ── Layer 2+: Lifecycle — Phase 34 Engine Rules ───────────

/**
 * R15: VIP guest detected.
 * Engine: guestIntelligence (vipCount > 0).
 * VIPs need premium treatment: priority trial, sponsor selection.
 */
const R15_VIP_DETECTED: RuleDefinition<GuestContext> = {
  id: "R15_VIP_DETECTED",
  name: "VIP guest detectado",
  layer: "lifecycle",
  domain: "engagement",
  priority: 200,
  dataDependencies: DATA_DEPS.R15_VIP_DETECTED,
  consumeSignals: ["mbr_member_referral"],
  emitSignals: [GUEST_VIP_DETECTED],
  evaluate: (ctx) => {
    if (ctx.vipCount === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R15_VIP_DETECTED"),
      impact: "high",
      title: `${ctx.vipCount} guest(s) identificado(s) como VIP`,
      reasoning:
        `El engine de inteligencia ha detectado ${ctx.vipCount} invitado(s) con perfil VIP: ` +
        `alto gasto, influencia social significativa, y excelente compatibilidad con el club. ` +
        `Priorizar con trial premium y sponsor de alto perfil. ` +
        `Si se convierten, cada uno puede generar 3-5 referrals adicionales.`,
      confidence: 88,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: { proposal_type: "vip_trial_invitation" },
        approval_level: "auto",
        label: "Preparar trato VIP",
      },
    });
  },
};

/**
 * R16: First impression below threshold.
 * Engine: conversionChemistry (firstImpressionAlertCount > 0).
 * Real-time service recovery needed.
 */
const R16_FIRST_IMPRESSION_LOW: RuleDefinition<GuestContext> = {
  id: "R16_FIRST_IMPRESSION_LOW",
  name: "Primera impresión por debajo del umbral",
  layer: "lifecycle",
  domain: "engagement",
  priority: 200,
  dataDependencies: DATA_DEPS.R16_FIRST_IMPRESSION_LOW,
  emitSignals: [GUEST_FIRST_IMPRESSION_ALERT],
  evaluate: (ctx) => {
    if (ctx.firstImpressionAlertCount === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R16_FIRST_IMPRESSION_LOW"),
      impact: "high",
      title: `${ctx.firstImpressionAlertCount} visita(s) con primera impresión negativa`,
      reasoning:
        `El engine de química ha detectado ${ctx.firstImpressionAlertCount} visita(s) ` +
        `con score de primera impresión por debajo de ${THRESHOLDS.FIRST_IMPRESSION_ALERT}/100. ` +
        `Los primeros 30 segundos determinan el 80% de la probabilidad de conversión. ` +
        `Intervenir con servicio de recuperación ANTES de que el guest se vaya.`,
      confidence: 92,
      target_view: "intelligence",
    });
  },
};

// ── Layer 3+: Utilization — Phase 34 Engine Rules ─────────

/**
 * R17: Exceptional chemistry detected.
 * Engine: conversionChemistry (avgChemistryScore > 85).
 * This guest belongs here — accelerate conversion.
 */
const R17_CHEMISTRY_EXCEPTIONAL: RuleDefinition<GuestContext> = {
  id: "R17_CHEMISTRY_EXCEPTIONAL",
  name: "Química excepcional detectada",
  layer: "utilization",
  domain: "engagement",
  priority: 300,
  dataDependencies: DATA_DEPS.R17_CHEMISTRY_EXCEPTIONAL,
  emitSignals: [GUEST_CONVERSION_READY],
  evaluate: (ctx) => {
    if (ctx.avgChemistryScore <= THRESHOLDS.CHEMISTRY_EXCEPTIONAL) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R17_CHEMISTRY_EXCEPTIONAL"),
      impact: "high",
      title: `Química excepcional: ${ctx.avgChemistryScore}/100 promedio`,
      reasoning:
        `El score promedio de química guest-club-sponsor es ${ctx.avgChemistryScore}/100, ` +
        `superando el umbral de excelencia de ${THRESHOLDS.CHEMISTRY_EXCEPTIONAL}. ` +
        `Estos guests tienen una compatibilidad natural con el club. ` +
        `Acelerar el proceso de conversión — la química correcta = conversión natural.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: { proposal_type: "conversion_nudge" },
        approval_level: "auto",
        label: "Acelerar conversión",
      },
    });
  },
};

/**
 * R18: Sponsor mismatch detected.
 * Engine: conversionChemistry (topSponsorMismatchCount > 0).
 * Wrong sponsor = damaged conversion probability.
 */
const R18_SPONSOR_MISMATCH: RuleDefinition<GuestContext> = {
  id: "R18_SPONSOR_MISMATCH",
  name: "Sponsor inadecuado detectado",
  layer: "utilization",
  domain: "engagement",
  priority: 300,
  dataDependencies: DATA_DEPS.R18_SPONSOR_MISMATCH,
  evaluate: (ctx) => {
    if (ctx.topSponsorMismatchCount === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R18_SPONSOR_MISMATCH"),
      impact: "medium",
      title: `${ctx.topSponsorMismatchCount} guest(s) con sponsor incompatible`,
      reasoning:
        `El engine de química ha detectado ${ctx.topSponsorMismatchCount} guest(s) ` +
        `cuyo sponsor actual tiene compatibilidad por debajo de ${THRESHOLDS.SPONSOR_MISMATCH}/100. ` +
        `Un mal sponsor destruye la probabilidad de conversión. ` +
        `Reasignar con un sponsor que comparta intereses y disponibilidad.`,
      confidence: 78,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: { proposal_type: "sponsor_reassignment" },
        approval_level: "auto",
        label: "Reasignar sponsor",
      },
    });
  },
};

// ── Layer 2++: Lifecycle — Memory ─────────────────────────

/**
 * R20: Strong memory profile.
 * Engine: guestMemory (avgMemoryStrength > 50).
 * The club knows this guest well — leverage that knowledge.
 */
const R20_MEMORY_STRONG: RuleDefinition<GuestContext> = {
  id: "R20_MEMORY_STRONG",
  name: "Perfil de memoria fuerte",
  layer: "lifecycle",
  domain: "engagement",
  priority: 200,
  dataDependencies: DATA_DEPS.R20_MEMORY_STRONG,
  evaluate: (ctx) => {
    if (ctx.avgMemoryStrength <= THRESHOLDS.MEMORY_STRENGTH_GOOD) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R20_MEMORY_STRONG"),
      impact: "low",
      title: `Club conoce bien a sus guests (memoria: ${ctx.avgMemoryStrength}/100)`,
      reasoning:
        `El strength promedio de memoria es ${ctx.avgMemoryStrength}/100. ` +
        `El club tiene historial rico de interacciones con sus guests. ` +
        `Aprovechar este conocimiento para personalizar la experiencia: ` +
        `recordar preferencias, mencionar conversaciones pasadas, proponer actividades alineadas.`,
      confidence: 75,
      target_view: "intelligence",
    });
  },
};

// ── Layer 4+: Cross-domain — Dormant ──────────────────────

/**
 * R19: Dormant guest reactivation opportunity.
 * Engine: guestMemory (dormantCount > 0).
 * These are seeds waiting for the right conditions.
 */
const R19_DORMANT_REACTIVATION: RuleDefinition<GuestContext> = {
  id: "R19_DORMANT_REACTIVATION",
  name: "Oportunidad de reactivación de dormientes",
  layer: "cross_domain",
  domain: "engagement",
  priority: 400,
  dataDependencies: DATA_DEPS.R19_DORMANT_REACTIVATION,
  consumeSignals: ["fin_spending_detected"],
  emitSignals: [GUEST_DORMANT_DETECTED],
  evaluate: (ctx) => {
    if (ctx.dormantCount === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R19_DORMANT_REACTIVATION"),
      impact: "medium",
      title: `${ctx.dormantCount} guest(s) dormiente(s) — oportunidad de reactivación`,
      reasoning:
        `Hay ${ctx.dormantCount} invitados sin actividad reciente. ` +
        `No están perdidos — son semillas esperando las condiciones correctas. ` +
        `El engine de memoria detectó patrones de reactivación óptimos. ` +
        `Contactar con oferta personalizada basada en su historial de intereses.`,
      confidence: 72,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "guest_management",
        tool: "generate_guest_engagement_proposals",
        params: { proposal_type: "reactivation_campaign" },
        approval_level: "auto",
        label: "Reactivar dormientes",
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 6 — RULES ARRAY + HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

export const GUEST_RULES: RuleDefinition<GuestContext>[] = [
  // Layer 1: macro (funnel health)
  R1_OVERALL_CONVERSION_LOW,
  R2_TRIAL_CONVERSION_LOW,
  R3_GUEST_VOLUME_DECLINING,
  R4_FUNNEL_HEALTHY,
  // Layer 2: lifecycle (pipeline)
  R5_HOT_LEADS_PENDING,
  R6_TRIALS_EXPIRING,
  R7_EVENTS_ZERO_GUESTS,
  R8_TOP_REFERRERS_INACTIVE,
  // Layer 3: utilization (optimization)
  R9_PRIVILEGE_CONCENTRATION,
  R10_WEEKEND_CONCENTRATION,
  R11_BEST_TRIAL_TYPE,
  R12_EVENT_GUEST_CORRELATION,
  // Layer 4: cross_domain
  R13_COMMS_CAMPAIGN,
  R14_PIPELINE_VALUE_ALERT,
  // Layer 2+: lifecycle — Phase 34 engine-based
  R15_VIP_DETECTED,
  R16_FIRST_IMPRESSION_LOW,
  R20_MEMORY_STRONG,
  // Layer 3+: utilization — Phase 34 engine-based
  R17_CHEMISTRY_EXCEPTIONAL,
  R18_SPONSOR_MISMATCH,
  // Layer 4+: cross_domain — Phase 34 engine-based
  R19_DORMANT_REACTIVATION,
];

/**
 * Health factor definitions for guest domain.
 * 5 original factors + 2 engine-based factors.
 * Weights sum to 1.0.
 */
export const GUEST_HEALTH_FACTORS: HealthFactorDef<GuestContext>[] = [
  // ── Original 5 (reweighted) ──
  {
    id: "conversion_health",
    label: "Conversión global",
    compute: (ctx) => {
      if (ctx.overallBenchmark === 0) return 50;
      return Math.min(
        100,
        Math.round((ctx.overallConversion / ctx.overallBenchmark) * 100),
      );
    },
    weight: 0.20,
  },
  {
    id: "funnel_integrity",
    label: "Integridad del funnel",
    compute: (ctx) => {
      if (ctx.totalGuests === 0) return 50;
      const stages = ctx.funnel?.stages ?? [];
      if (stages.length === 0) return 50;
      const healthy = stages.filter((s) => s.vs_benchmark >= 0).length;
      return Math.round((healthy / stages.length) * 100);
    },
    weight: 0.15,
  },
  {
    id: "pipeline_health",
    label: "Salud del pipeline",
    compute: (ctx) => {
      const total = ctx.activeGuests + ctx.activeTrials;
      if (total === 0) return 30;
      return Math.min(100, Math.round(total * 2));
    },
    weight: 0.15,
  },
  {
    id: "trial_performance",
    label: "Performance de trials",
    compute: (ctx) => Math.min(100, Math.round(ctx.trialConversion * 4)),
    weight: 0.15,
  },
  {
    id: "event_leverage",
    label: "Aprovechamiento de eventos",
    compute: (ctx) => {
      if (ctx.totalEvents === 0) return 50;
      const cor = ctx.analytics?.event_guest_correlation ?? [];
      const generating = cor.filter((e) => e.avg_guests_generated > 0).length;
      if (cor.length === 0) return 50;
      return Math.round((generating / cor.length) * 100);
    },
    weight: 0.10,
  },
  // ── Phase 34: Engine-based factors ──
  {
    id: "chemistry_health",
    label: "Química promedio",
    compute: (ctx) => {
      if (ctx.avgChemistryScore === 0) return 50; // No engine data → neutral
      return Math.min(100, ctx.avgChemistryScore);
    },
    weight: 0.15,
    benchmark: 70,
  },
  {
    id: "memory_health",
    label: "Conocimiento del guest",
    compute: (ctx) => {
      if (ctx.avgMemoryStrength === 0) return 50; // No engine data → neutral
      return Math.min(100, ctx.avgMemoryStrength);
    },
    weight: 0.10,
    benchmark: 50,
  },
];