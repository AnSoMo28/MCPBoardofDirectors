// src/shared/lib/advisor-engine/types.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Core Type Definitions
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.0
// @namespace   N/A — type definitions only
// @keyframes   0
// @depends     @/shared/types/ai-intelligence, @/shared/types/domain-enums
//
// Centralized types for the Advisor Engine that replaces
// 10 independent hooks with a single generic engine.
//
// Architecture:
//   RuleDefinition<T> → declarative, testable, swappable
//   AdvisorConfig<T>  → domain-specific engine configuration
//   AdvisorResult     → standardized engine output
//   DomainSignal      → cross-domain communication bus
//   HealthFactorDef   → unified health score composition
//   CausalChain       → cross-domain cascade detection
//
// PRE-WRITE VERIFICATION:
// [x] All imports verified against seen files
// [x] engine.ts uses: BaseContext, AdvisorConfig, AdvisorResult,
//     DomainSignal, CausalChain, HealthScoreResult, DirtyFlagSet,
//     createSignal, AdvisorEngineEventListener
// [x] useAutonomousAdvisor uses: HealthScoreResult, CausalChain
// [x] barrel index.ts re-exports all types
//
// ANTI-PATTERNS REMOVED (v1):
// [x] Patch comments ("Phase 34+ Migration", "ADDITION:") → clean
// [x] HealthFactorStatus Spanish values → English + i18n mapping
// [x] mbr_member_referral in Guest block → dedicated Members block
// [x] Date.now() signal IDs → atomic counter (no collision)
// [x] Missing Members signals section → added
// [x] Inconsistent section comment style → uniform
// [x] Missing readonly on CausalChain/CausalPattern fields
// [x] SIGNAL_NAMES with misplaced entries → sorted by domain
//
// FIXES APPLIED (v2):
// [x] B-07: EventHealthFactorStatic extracted from inline type
// ═══════════════════════════════════════════════════════════

import type {
  AdvisorInsightBase,
  AdvisorImpactLevel,
  AdvisorLayer,
  AIDomain,
} from "../../types/ai-intelligence";
import type { SeverityLevel } from "../../types/domain-enums";

// ═══════════════════════════════════════════════════════════
// §0 SIGNAL NAME REGISTRY
// ═══════════════════════════════════════════════════════════

/**
 * Canonical signal names — exhaustive, type-safe.
 * Every SignalDefinition.id MUST be one of these values.
 * Every RuleDefinition.consumeSignals[] entry MUST be one of these values.
 *
 * Adding a new signal:
 *   1. Add the name to the appropriate domain group below
 *   2. TypeScript enforces it everywhere via SignalName type
 */
export const SIGNAL_NAMES = [
  // ── Financial ──
  "fin_revenue_decline",
  "fin_margin_pressure",
  "fin_spending_detected",

  // ── Events ──
  "evt_capacity_alert",
  "evt_capacity_overflow",
  "evt_low_engagement",
  "evt_low_registration",
  "evt_rsvp_decline_surge",
  "evt_waitlist_growth",
  "evt_schedule_conflict",
  "evt_venue_overcapacity",
  "evt_program_delay",
  "evt_schedule_gap",
  "evt_budget_overrun",
  "evt_vendor_risk",
  "evt_vendor_cost_savings",
  "evt_revenue_opportunity",
  "evt_active_now",
  "evt_starting_soon",

  // ── Communication ──
  "comm_delivery_critical",

  // ── System ──
  "sys_risk_change",

  // ── Sports ──
  "spt_utilization_drop",
  "spt_capacity_warning",
  "spt_skill_breakthrough",
  "spt_injury_risk",
  "spt_tournament_victory",
  "spt_participation_decline",
  "spt_coaching_milestone",
  "spt_venue_overcapacity",
  "spt_season_climax",
  "spt_equipment_failure",

  // ── Age Group ──
  "age_group_imbalance",
  "age_group_teen_decline",
  "age_group_senior_opportunity",
  "age_group_kids_growth",
  "age_group_retention_risk",
  "age_group_seasonal_surge",
  "age_group_program_demand",
  "age_group_cross_sell_ready",

  // ── Guests ──
  "guest_pipeline_alert",
  "gst_vip_detected",
  "gst_conversion_ready",
  "gst_trial_expiring",
  "gst_dormant_detected",
  "gst_feedback_negative",
  "gst_first_impression_alert",

  // ── Members ──
  "mbr_member_referral",

  // ── Satisfaction ──
  "sat_critical_decline",

  // ── ML ──
  "ml_model_degradation",
  "ml_prediction_confidence_drop",

  // ── Recommendations ──
  "rec_pending_actions",

  // ── Facilities ──
  "fac_component_failure",
  "fac_comfort_cascade",
  "fac_revenue_decline",
  "fac_occupancy_critical",
  "fac_cross_domain_impact",
  "fac_venue_overcapacity",

  // ── Families ──
  "fm_family_risk",
  "fm_lifecycle_transition",
  "fm_children_age_milestone",
  "fm_engagement_gap",
  "fm_referral_ready",
  "fm_milestone_approaching",
] as const;

/** Type-safe signal name derived from the SIGNAL_NAMES registry. */
export type SignalName = (typeof SIGNAL_NAMES)[number];

/**
 * Type guard: check if a string is a valid SignalName.
 */
export function isSignalName(value: string): value is SignalName {
  return (SIGNAL_NAMES as readonly string[]).includes(value);
}

// ═══════════════════════════════════════════════════════════
// §0.5 RAG CONTEXT
// ═══════════════════════════════════════════════════════════

/**
 * RAG context injected into domain contexts for enriched rule evaluation.
 * Optional in every buildCtx() — rules degrade gracefully without it.
 *
 * Source: Document Intelligence Agent (ChromaDB + BM25 hybrid search)
 * Usage: buildCtx() destructures ragContext from rawData
 * Consumption: Rules use ragContext to boost confidence or enrich reasoning
 * Engine support: CONFIDENCE_PRESETS.ragGrounded() + combineConfidences()
 */
export interface RAGContext {
  /** Source collection: "member_history" | "past_events" | "policy_docs" | "feedback" | "financial_reports" */
  readonly source: string;

  /** Retrieval relevance score (0-1) — how relevant is this chunk to the query */
  readonly relevance: number;

  /** Retrieved text chunk content */
  readonly content: string;

  /** Number of documents that contributed to this context */
  readonly citationCount: number;

  /** Source document IDs for traceability */
  readonly documentIds?: readonly string[];

  /** Additional RAG metadata (embedding model, chunk index, etc.) */
  readonly metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// §1 BASE CONTEXT
// ═══════════════════════════════════════════════════════════

/**
 * Base context required by all Advisor Engine rules.
 * Domain-specific contexts extend this with their own data.
 *
 * @example
 * interface FinancialContext extends BaseContext {
 *   domain: "financial";
 *   summary: FinancialSummary | undefined;
 *   healthScore: number;
 *   revenueGrowth: number;
 * }
 */
export interface BaseContext {
  /** Domain identifier — used for routing, signal ownership, logging */
  readonly domain: AIDomain;

  /** Cross-domain signals consumed by this context (injected by Signal Bus) */
  readonly signals?: readonly DomainSignal[];

  /** RAG context for enriched evaluation */
  readonly ragContext?: readonly RAGContext[];
}

// ═══════════════════════════════════════════════════════════
// §1.1 EVENTS CONTEXT
// ═══════════════════════════════════════════════════════════

/**
 * Events domain context — extends BaseContext with event-specific data.
 * Built by the Events buildCtx() from MCP raw data.
 *
 * Covers: capacity, RSVP flow, vendor budget, program timeline,
 * calendar density, and engagement metrics.
 */
export interface EventsContext extends BaseContext {
  readonly domain: "events";

  // ── Capacity ──
  readonly currentAttendance: number;
  readonly maxCapacity: number;
  readonly waitlistCount: number;
  readonly capacityPct: number;
  readonly urgencyState: "calm" | "active" | "elevated" | "critical" | "overflow";

  // ── RSVP Flow ──
  readonly rsvpConfirmed: number;
  readonly rsvpPending: number;
  readonly rsvpDeclined: number;
  readonly rsvpWaitlisted: number;
  readonly rsvpTotal: number;
  readonly rsvpDeclineRate: number;
  readonly rsvpResponseRate: number;

  // ── Vendor / Budget ──
  readonly vendorCount: number;
  readonly totalQuotedCost: number;
  readonly totalFinalCost: number;
  readonly budgetDelta: number;
  readonly vendorsPending: number;
  readonly vendorsConfirmed: number;

  // ── Program / Timeline ──
  readonly programItemCount: number;
  readonly activeItemIdx: number;
  readonly completedItemCount: number;
  readonly largestGapMinutes: number;
  readonly hasScheduleConflict: boolean;
  readonly isLiveNow: boolean;
  readonly minutesToNextEvent: number;

  // ── Calendar Density ──
  readonly sameDayEventCount: number;
  readonly weekEventCount: number;
  readonly venueUtilizationPct: number;

  // ── Engagement ──
  readonly engagementScore: number;
  readonly projectedEngagement: number;
  readonly pricingModel: string;
  readonly isMembersOnly: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2 RULE DEFINITION
// ═══════════════════════════════════════════════════════════

/**
 * Declarative rule definition. Each rule is a pure function
 * that takes context and returns an insight or null.
 * Rules are evaluated in priority order (lower = first).
 *
 * @template T — The domain-specific context type extending BaseContext
 */
export interface RuleDefinition<T extends BaseContext> {
  /** Unique rule identifier (e.g., "FIN_HEALTH_SCORE", "EVT_CAPACITY_ALERT") */
  readonly id: string;

  /** Human-readable rule name for debugging and logging */
  readonly name: string;

  /** Which advisor layer this rule belongs to */
  readonly layer: AdvisorLayer;

  /** Domain that owns this rule */
  readonly domain: AIDomain;

  /**
   * Pure evaluation function.
   * Returns an insight if the condition is met, null otherwise.
   * MUST NOT throw — the engine wraps this in try/catch.
   */
  readonly evaluate: (ctx: T) => AdvisorInsightBase | null;

  /** Evaluation priority — lower numbers evaluate first. Default: 100 */
  readonly priority?: number;

  /** Signals this rule EMITS when it fires. */
  readonly emitSignals?: readonly SignalDefinition[];

  /** Signal names this rule CONSUMES from other domains. */
  readonly consumeSignals?: readonly SignalName[];

  /**
   * Data fields this rule depends on for streaming evaluation.
   * Used by the engine to skip rules whose dependencies haven't changed.
   * If omitted, the rule evaluates on EVERY cycle (safe default).
   */
  readonly dataDependencies?: readonly string[];
}

/**
 * Definition of a signal that a rule can emit.
 * The engine creates DomainSignal instances from these definitions.
 */
export interface SignalDefinition {
  /** Signal identifier — type-safe from SIGNAL_NAMES registry */
  readonly id: SignalName;

  /** Target domains that should receive this signal */
  readonly targetDomains: readonly AIDomain[];

  /** Default severity — can be overridden by the rule's insight */
  readonly defaultSeverity: SeverityLevel;

  /** Signal label template */
  readonly label: string;

  /** Time-to-live in milliseconds. Default: 300_000 (5 min) */
  readonly ttl?: number;
}

// ═══════════════════════════════════════════════════════════
// §3 ADVISOR ENGINE CONFIGURATION
// ═══════════════════════════════════════════════════════════

/**
 * Configuration for creating an AdvisorEngine instance.
 * One config per domain. Passed to `new AdvisorEngine(config)`.
 *
 * @template T — Domain-specific context type
 */
export interface AdvisorConfig<T extends BaseContext> {
  /** Domain identifier */
  readonly domain: AIDomain;

  /**
   * Transform raw MCP data into the typed context.
   * This is where domain-specific computation happens:
   * growth rates, ratios, thresholds, etc.
   */
  readonly buildCtx: (rawData: unknown, signals?: readonly DomainSignal[]) => T;

  /** Ordered list of rules to evaluate */
  readonly rules: readonly RuleDefinition<T>[];

  /** Optional: Health factor definitions for unified health scoring */
  readonly healthFactors?: readonly HealthFactorDef<T>[];

  /** Optional: RAG context injection for enriched evaluation */
  readonly ragContext?: readonly RAGContext[];
}

// ═══════════════════════════════════════════════════════════
// §4 ENGINE OUTPUT
// ═══════════════════════════════════════════════════════════

/**
 * Standardized output from AdvisorEngine.evaluate().
 * Every domain produces this same shape.
 */
export interface AdvisorResult {
  /** Evaluated, sorted, deduplicated insights */
  readonly insights: readonly AdvisorInsightBase[];

  /** Health score (only if healthFactors were configured) */
  readonly healthScore?: HealthScoreResult;

  /** Signals to emit to other domains via Signal Bus */
  readonly signals: readonly DomainSignal[];

  /** Causal chains detected from signal patterns */
  readonly causalChains?: readonly CausalChain[];

  /** Evaluation metadata */
  readonly meta: {
    readonly domain: AIDomain;
    readonly rulesEvaluated: number;
    readonly rulesFired: number;
    readonly rulesErrored: number;
    readonly evaluationTime: number;
    readonly timestamp: number;
  };
}

// ═══════════════════════════════════════════════════════════
// §5 DOMAIN SIGNALS
// ═══════════════════════════════════════════════════════════

/**
 * Atomic counter for signal ID generation.
 * Replaces Date.now() to prevent collision when multiple
 * signals are created in the same millisecond.
 */
let signalCounter = 0;

/**
 * A cross-domain signal emitted by an advisor rule.
 * Other domains consume these signals to enrich their context.
 */
export interface DomainSignal {
  /** Unique signal instance ID */
  readonly id: string;

  /** Signal definition ID — type-safe from SIGNAL_NAMES registry */
  readonly signalDefId: SignalName;

  /** Domain that emitted this signal */
  readonly sourceDomain: AIDomain;

  /** Domains that should receive this signal */
  readonly targetDomains: readonly AIDomain[];

  /** Severity of the signal */
  readonly severity: SeverityLevel;

  /**
   * Effective severity after temporal decay.
   * Computed as: baseSeverity × (1 - age/ttl).
   * If omitted, defaults to the base severity (no decay applied).
   */
  readonly effectiveSeverity?: number;

  /** Numeric value (e.g., -15 for 15% decline) */
  readonly value: number;

  /** Human-readable label */
  readonly label: string;

  /** When the signal was created */
  readonly timestamp: number;

  /** Signal expires after this many milliseconds */
  readonly ttl: number;

  /** Optional: source insight ID for tracing */
  readonly sourceInsightId?: string;

  /** Optional: additional signal-specific data */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Check if a signal has expired.
 */
export function isSignalExpired(signal: DomainSignal): boolean {
  return Date.now() - signal.timestamp > signal.ttl;
}

/**
 * Create a DomainSignal from a SignalDefinition + runtime values.
 * Uses atomic counter for collision-free ID generation.
 */
export function createSignal(
  def: SignalDefinition,
  sourceDomain: AIDomain,
  value: number,
  severity?: SeverityLevel,
  sourceInsightId?: string,
  metadata?: Record<string, unknown>,
): DomainSignal {
  return {
    id: `signal_${def.id}_${++signalCounter}`,
    signalDefId: def.id,
    sourceDomain,
    targetDomains: def.targetDomains,
    severity: severity ?? def.defaultSeverity,
    value,
    label: def.label,
    timestamp: Date.now(),
    ttl: def.ttl ?? 300_000,
    sourceInsightId,
    metadata,
  };
}

// ═══════════════════════════════════════════════════════════
// §6 HEALTH SCORE
// ═══════════════════════════════════════════════════════════

/**
 * Health factor status based on normalized value.
 * Values are in English for type safety. Use HEALTH_STATUS_LABELS
 * for localized display strings.
 */
export type HealthFactorStatus = "exceptional" | "healthy" | "attention" | "critical";

/**
 * Localized labels for health factor statuses.
 * Use this mapping when rendering in the UI.
 */
export const HEALTH_STATUS_LABELS: Record<HealthFactorStatus, string> = {
  exceptional: "Excepcional",
  healthy: "Saludable",
  attention: "Atención",
  critical: "Crítico",
} as const;

/**
 * Definition of a health factor.
 * Each domain defines its own factors, but the computation
 * is done by the unified Health Score Composer.
 *
 * @template T — Domain context type
 */
export interface HealthFactorDef<T extends BaseContext> {
  /** Factor identifier (e.g., "revenue_health", "member_retention") */
  readonly id: string;

  /** Human-readable label for display */
  readonly label: string;

  /**
   * Compute the raw factor value from context.
   * Should return a value in the [min, max] range (default 0-100).
   */
  readonly compute: (ctx: T) => number;

  /** Weight in the composite score (0-1). All weights should sum to 1. */
  readonly weight: number;

  /** If true, lower values are better (e.g., churn rate, complaint count) */
  readonly inverse?: boolean;

  /** Minimum expected value for normalization. Default: 0 */
  readonly min?: number;

  /** Maximum expected value for normalization. Default: 100 */
  readonly max?: number;

  /** Optional: benchmark value for comparison */
  readonly benchmark?: number;
}

/**
 * Result of a single health factor after computation.
 */
export interface HealthFactorResult {
  readonly id: string;
  readonly label: string;
  readonly rawValue: number;
  readonly normalizedValue: number;
  readonly weight: number;
  readonly contribution: number;
  readonly status: HealthFactorStatus;
  readonly benchmark?: number;
  readonly benchmarkDelta?: number;
}

/**
 * Complete health score result.
 * Uniform shape across ALL domains.
 */
export interface HealthScoreResult {
  readonly score: number;
  readonly grade: "A" | "B" | "C" | "D";
  readonly level: HealthFactorStatus;
  readonly color: string;
  readonly bgColor: string;
  readonly factors: readonly HealthFactorResult[];
  readonly hasCritical: boolean;
  readonly computedAt: number;
}

// ═══════════════════════════════════════════════════════════
// §6.1 EVENTS HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

/**
 * Static health factor definition — the declarative config portion
 * of HealthFactorDef<T> that lives in the types registry.
 *
 * The `compute`, `min`, and `max` fields are bound at compose-time
 * by engine.ts via the Health Score Composer. This separation keeps
 * the type registry free of runtime evaluation functions.
 *
 * @remarks
 * To compose a full HealthFactorDef<EventsContext>, combine this
 * with the corresponding compute function in engine.ts:
 *
 * ```ts
 * const fullFactor: HealthFactorDef<EventsContext> = {
 *   ...EVENTS_HEALTH_FACTORS[0],
 *   compute: (ctx) => ctx.capacityPct,
 *   min: 0,
 *   max: 100,
 * };
 * ```
 */
export interface EventHealthFactorStatic {
  /** Factor identifier — must match HealthFactorDef.id */
  readonly id: string;

  /** Human-readable label for display */
  readonly label: string;

  /** Weight in the composite score (0-1) */
  readonly weight: number;

  /** If true, lower values are better */
  readonly inverse?: boolean;

  /** Benchmark value for comparison */
  readonly benchmark?: number;
}

/**
 * Health factor definitions for the Events domain.
 * Used by the Health Score Composer to compute the events health grade.
 *
 * Weights sum to 1.0. Each factor maps a domain metric to 0-100.
 *
 * Factor weights reflect club priorities:
 *   Attendance (30%) → Core metric: did people show up?
 *   RSVP Response (20%) → Engagement: are members responding?
 *   Budget (20%) → Financial discipline: are we on budget?
 *   Program (15%) → Operational quality: is the program smooth?
 *   Vendor (10%) → Supply chain: are vendors confirmed?
 *   Engagement (5%) → Intangible: is there buzz?
 */
export const EVENTS_HEALTH_FACTORS: readonly EventHealthFactorStatic[] = [
  {
    id: "evt_attendance_health",
    label: "Asistencia",
    weight: 0.30,
    benchmark: 85,
  },
  {
    id: "evt_rsvp_response",
    label: "Respuesta RSVP",
    weight: 0.20,
    benchmark: 70,
  },
  {
    id: "evt_budget_health",
    label: "Presupuesto",
    weight: 0.20,
    benchmark: 95,
  },
  {
    id: "evt_program_quality",
    label: "Programa",
    weight: 0.15,
    benchmark: 90,
  },
  {
    id: "evt_vendor_readiness",
    label: "Proveedores",
    weight: 0.10,
    benchmark: 100,
  },
  {
    id: "evt_engagement",
    label: "Engagement",
    weight: 0.05,
    benchmark: 75,
  },
] as const;

// ═══════════════════════════════════════════════════════════
// §7 ENGINE EVENTS
// ═══════════════════════════════════════════════════════════

/**
 * Events emitted by the Advisor Engine for observability.
 * Discriminated union on `type` field.
 */
export type AdvisorEngineEvent =
  | { readonly type: "evaluation_start"; readonly domain: AIDomain; readonly ruleCount: number }
  | { readonly type: "rule_fired"; readonly domain: AIDomain; readonly ruleId: string; readonly impact: AdvisorImpactLevel }
  | { readonly type: "rule_error"; readonly domain: AIDomain; readonly ruleId: string; readonly error: string }
  | { readonly type: "rule_skipped"; readonly domain: AIDomain; readonly ruleId: string; readonly reason: string }
  | { readonly type: "signal_emitted"; readonly signalId: string; readonly sourceDomain: AIDomain }
  | { readonly type: "signal_consumed"; readonly signalId: string; readonly targetDomain: AIDomain }
  | { readonly type: "evaluation_complete"; readonly domain: AIDomain; readonly insightsCount: number; readonly time: number }
  | { readonly type: "health_computed"; readonly domain: AIDomain; readonly score: number; readonly grade: string };

/** Event listener type for engine observability. */
export type AdvisorEngineEventListener = (event: AdvisorEngineEvent) => void;

// ═══════════════════════════════════════════════════════════
// §8 CAUSAL CHAIN DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * A detected causal chain: an ordered sequence of signals
 * that match a known cause-and-effect pattern.
 *
 * Compound confidence decreases with chain length:
 *   2-signal chain: base × 1.0
 *   3-signal chain: base × 0.85
 *   4-signal chain: base × 0.70
 */
export interface CausalChain {
  readonly id: string;
  readonly signals: readonly DomainSignal[];
  readonly patternId: string;
  readonly chainLength: number;
  readonly compoundConfidence: number;
  readonly description: string;
  readonly domainLabels: readonly string[];
  readonly isActive: boolean;
  readonly detectedAt: number;
  readonly rootCauseDomain: AIDomain;
  readonly affectedDomain: AIDomain;
}

/**
 * A known causal pattern template.
 * The engine matches active signals against these patterns
 * to detect cause-and-effect cascades.
 */
export interface CausalPattern {
  readonly id: string;
  readonly signalSequence: readonly SignalName[];
  readonly baseConfidence: number;
  readonly descriptionTemplate: string;
  readonly severity: SeverityLevel;
  readonly requireAllActive: boolean;
}

/**
 * Result of causal chain detection run.
 */
export interface ChainDetectionResult {
  readonly chains: readonly CausalChain[];
  readonly patternsChecked: number;
  readonly patternsMatched: number;
  readonly detectionTime: number;
}

// ═══════════════════════════════════════════════════════════
// §8.1 EVENTS CAUSAL PATTERNS
// ═══════════════════════════════════════════════════════════

/**
 * Known causal patterns specific to the Events domain.
 * Used by the Causal Chain Detector to identify cascades.
 *
 * Pattern 1: Capacity → Engagement → Revenue
 *   "When capacity fills, engagement drops if venue is cramped,
 *    which suppresses future event revenue."
 *
 * Pattern 2: Vendor Risk → Budget Overrun → Low Registration
 *   "When vendor contracts are uncertain, costs may overrun,
 *    which forces price increases that suppress registration."
 *
 * Pattern 3: Schedule Conflict → Low Registration → Capacity Miss
 *   "When events overlap, members must choose, diluting attendance
 *    across both events and causing capacity misses."
 */
export const EVENTS_CAUSAL_PATTERNS: readonly CausalPattern[] = [
  {
    id: "evt_cascade_capacity_engagement",
    signalSequence: ["evt_capacity_alert", "evt_low_engagement", "evt_revenue_opportunity"],
    baseConfidence: 0.82,
    descriptionTemplate: "Capacity pressure ({0}) suppressing engagement ({1}), creating revenue risk ({2})",
    severity: "high",
    requireAllActive: false,
  },
  {
    id: "evt_cascade_vendor_budget_registration",
    signalSequence: ["evt_vendor_risk", "evt_budget_overrun", "evt_low_registration"],
    baseConfidence: 0.75,
    descriptionTemplate: "Vendor uncertainty ({0}) driving budget overrun ({1}), suppressing registration ({2})",
    severity: "high",
    requireAllActive: false,
  },
  {
    id: "evt_cascade_conflict_attendance",
    signalSequence: ["evt_schedule_conflict", "evt_low_registration", "evt_capacity_alert"],
    baseConfidence: 0.70,
    descriptionTemplate: "Schedule conflict ({0}) diluting attendance ({1}), causing capacity miss ({2})",
    severity: "medium",
    requireAllActive: false,
  },
] as const;

// ═══════════════════════════════════════════════════════════
// §9 STREAMING EVALUATION
// ═══════════════════════════════════════════════════════════

/**
 * Set of field names that changed since the last evaluation.
 * Computed by shallow comparison of rawData vs previousData.
 */
export type DirtyFlagSet = Set<string>;

/**
 * Evaluation mode for the Advisor Engine.
 * "full" = cold start, all rules evaluate.
 * "streaming" = only dirty rules re-evaluate, cache reused.
 */
export type EvaluationMode = "full" | "streaming";

/**
 * Cached evaluation result for a single rule.
 * Used by streaming evaluation to skip non-dirty rules.
 */
export interface CachedRuleResult {
  readonly insight: AdvisorInsightBase | null;
  readonly cachedAt: number;
  readonly mode: EvaluationMode;
}

/**
 * Complete cache state for an AdvisorEngine instance.
 */
export interface EvaluationCache {
  readonly ruleResults: Map<string, CachedRuleResult>;
  readonly previousData: unknown;
  readonly lastFullEvaluation: number;
  readonly streamingCount: number;
}