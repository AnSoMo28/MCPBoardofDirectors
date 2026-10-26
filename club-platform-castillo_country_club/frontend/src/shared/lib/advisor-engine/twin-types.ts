// src/shared/lib/advisor-engine/twin-types.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Digital Twin Types (F53)
//
// Types for the Context Delta Simulator — a lightweight
// "what-if" engine that clones the real club context,
// applies metric deltas, and re-evaluates the advisor engine
// to predict cascading impacts.
//
// Unlike a Monte Carlo simulator, the Digital Twin:
//   - Uses the REAL 185-rule engine (no fabricated entities)
//   - Propagates impact through 8 causal chains (F49)
//   - Attaches calibrated confidence to every prediction (F50)
//   - Derives goals from simulated context (F51)
//   - Simulates NL rule activation (F52)
//   - Runs in <10ms (selective re-evaluation, not 1000 runs)
//
// Depends on:
//   ./causal-chain (CausalChain, CausalPattern)
//   ./calibration-types (CalibrationResult)
//   ./types (BaseInsight, HealthScore)
//   ./nl-rule-types (NLRuleTemplate)
//   ./intent-types (AdvisorGoal)
//   @/shared/types/ai-intelligence (AIDomain, AdvisorImpactLevel)
// ═══════════════════════════════════════════════════════════

import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";
import type { AdvisorInsightBase as BaseInsight } from "@/shared/types/ai-intelligence";
// ═══════════════════════════════════════════════════════════
// SECTION 1 — METRIC DELTA (what the manager changes)
// ═══════════════════════════════════════════════════════════

/**
 * A single metric change in a scenario.
 * The manager adjusts a metric via slider or text input.
 */
export interface MetricDelta {
  /** Metric path (e.g., "summary.financial.total_revenue") */
  metricPath: string;
  /** Display name (e.g., "Ingresos") */
  metricName: string;
  /** Current real value */
  currentValue: number;
  /** Simulated value (after delta) */
  simulatedValue: number;
  /** Absolute delta */
  delta: number;
  /** Percentage delta */
  deltaPct: number;
  /** Unit (₡, %, pts, count) */
  unit: string;
  /** Which domain this metric belongs to */
  domain: AIDomain | "global";
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SCENARIO (what the manager wants to simulate)
// ═══════════════════════════════════════════════════════════

/**
 * A scenario created by the manager.
 * Contains one or more metric deltas to apply simultaneously.
 */
export interface DeltaScenario {
  /** Unique scenario ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description: string;
  /** Metric changes to apply */
  deltas: MetricDelta[];
  /** When this scenario was created */
  createdAt: number;
  /** Who created it */
  createdBy: string;
}

/**
 * Pre-defined scenario templates for common club situations.
 */
export interface ScenarioTemplate {
  /** Template ID */
  id: string;
  /** Display name */
  name: string;
  /** Description of the scenario */
  description: string;
  /** Icon hint for UI */
  icon: string;
  /** Category grouping */
  category: "financial" | "membership" | "events" | "operations" | "crisis";
  /** The deltas to apply (relative: +10%, -5%, etc.) */
  deltas: Array<{
    metricPath: string;
    /** Relative change: +0.1 = +10%, -0.05 = -5% */
    relativeChange: number;
  }>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — TWIN SNAPSHOT (simulated state)
// ═══════════════════════════════════════════════════════════

/**
 * A snapshot of the simulated club state.
 * Contains the baseline (real) and simulated contexts,
 * plus computed deltas and differences.
 */
export interface TwinSnapshot {
  /** Unique snapshot ID */
  id: string;
  /** The scenario that produced this snapshot */
  scenarioId: string;
  /** Timestamp of simulation */
  simulatedAt: number;
  /** Baseline context (real, before deltas) */
  baselineContext: Record<string, unknown>;
  /** Simulated context (after deltas applied) */
  simulatedContext: Record<string, unknown>;
  /** The deltas that were applied */
  appliedDeltas: MetricDelta[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — RULE ACTIVATION DELTA
// ═══════════════════════════════════════════════════════════

/**
 * Describes how a rule's activation changes between
 * the baseline (real) and simulated contexts.
 *
 * "This rule doesn't fire today, but would fire in the scenario"
 * or "This rule fires today, but would stop in the scenario"
 */
export interface RuleActivationDelta {
  /** Rule ID */
  ruleId: string;
  /** Rule title/description */
  ruleTitle: string;
  /** Which domain */
  domain: AIDomain | "global";
  /** Does this rule fire in the REAL context? */
  firesInBaseline: boolean;
  /** Does this rule fire in the SIMULATED context? */
  firesInSimulation: boolean;
  /** Classification */
  changeType:
    | "newly_activated"   // false → true (most important)
    | "newly_deactivated" // true → false
    | "intensified"       // true → true, but higher severity
    | "unchanged";        // true → true, same severity
  /** The insight that would be generated if this rule fires */
  simulatedInsight?: BaseInsight;
  /** Metric value that triggered the change */
  triggerMetric: string;
  /** Baseline metric value */
  baselineValue: number;
  /** Simulated metric value */
  simulatedValue: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — CASCADE PREDICTION
// ═══════════════════════════════════════════════════════════

/**
 * A predicted cascade — impact propagating through
 * causal chains from the initial delta.
 *
 * Example: Manager increases fees → churn rises →
 *   event attendance drops → satisfaction drops
 */
export interface CascadePrediction {
  /** The causal pattern ID that predicts this cascade */
  patternId: string;
  /** Sequence of domain impacts in order */
  cascadeSteps: CascadeStep[];
  /** Overall cascade confidence (compound) */
  cascadeConfidence: number;
  /** Is this cascade new (wouldn't happen without the delta)? */
  isNewCascade: boolean;
  /** Final impact domain (the "victim" of the cascade) */
  finalImpactDomain: AIDomain | "global";
  /** Severity of the final impact */
  finalImpactSeverity: AdvisorImpactLevel;
}

/**
 * A single step in a cascade chain.
 */
export interface CascadeStep {
  /** Step order (0 = first impact) */
  order: number;
  /** Which domain is affected */
  domain: AIDomain | "global";
  /** Which signal would be emitted */
  signalType: string;
  /** Metric that changes at this step */
  affectedMetric: string;
  /** Baseline value */
  baselineValue: number;
  /** Predicted value after cascade */
  predictedValue: number;
  /** Confidence in this step */
  stepConfidence: number;
  /** Time delay estimate (conceptual, not real time) */
  severity: AdvisorImpactLevel;
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — TWIN PREDICTION (single prediction with confidence)
// ═══════════════════════════════════════════════════════════

/**
 * A single prediction from the Digital Twin.
 * Every prediction has calibrated confidence from F50.
 */
export interface TwinPrediction {
  /** Prediction ID */
  id: string;
  /** What is being predicted */
  metricPath: string;
  /** Display name */
  metricName: string;
  /** Current (real) value */
  currentValue: number;
  /** Predicted value */
  predictedValue: number;
  /** Absolute change */
  delta: number;
  /** Percentage change */
  deltaPct: number;
  /** Unit */
  unit: string;
  /** Domain */
  domain: AIDomain | "global";
  /** Calibrated confidence (0-100) */
  confidence: number;
  /** Calibration readiness of this prediction */
  calibrationStatus: "cold" | "warming" | "calibrated";
  /** Reasoning for this prediction */
  reasoning: string;
  /** Source: direct delta, causal chain, or rule cascade */
  source: "direct_delta" | "causal_chain" | "rule_cascade";
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — HEALTH SCORE DELTA
// ═══════════════════════════════════════════════════════════

/**
 * How health scores change between baseline and simulation.
 * One per domain.
 */
export interface HealthScoreDelta {
  /** Domain */
  domain: AIDomain | "global";
  /** Baseline health score (0-100) */
  baselineScore: number;
  /** Simulated health score (0-100) */
  simulatedScore: number;
  /** Point change */
  delta: number;
  /** Classification */
  trend: "improved" | "stable" | "degraded";
  /** Which health factors changed */
  factorChanges: Array<{
    factorName: string;
    baseline: number;
    simulated: number;
    delta: number;
  }>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — GOAL CANDIDATE FROM SIMULATION
// ═══════════════════════════════════════════════════════════

/**
 * A goal that would be derived if the simulated scenario
 * were real. Allows the manager to "pre-approve" goals
 * before the scenario happens.
 */
export interface SimulatedGoalCandidate {
  /** Suggested goal title */
  title: string;
  /** Description */
  description: string;
  /** Domain */
  domain: AIDomain | "global";
  /** Impact level */
  impact: AdvisorImpactLevel;
  /** Metric to target */
  metricPath: string;
  /** Current (real) value */
  currentValue: number;
  /** Target value to achieve */
  targetValue: number;
  /** Unit */
  unit: string;
  /** Confidence that this goal is needed */
  confidence: number;
  /** Would this goal already exist in real context? */
  alreadyExists: boolean;
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — FULL SIMULATION RESULT
// ═══════════════════════════════════════════════════════════

/**
 * The complete result of a Digital Twin simulation.
 * This is what the UI renders.
 */
export interface TwinSimulationResult {
  /** Result ID */
  id: string;
  /** The scenario that was simulated */
  scenario: DeltaScenario;
  /** Timestamp */
  simulatedAt: number;
  /** Execution time in ms */
  executionMs: number;
  /** The snapshot (baseline + simulated contexts) */
  snapshot: TwinSnapshot;
  /** Rules that changed activation status */
  ruleDeltas: RuleActivationDelta[];
  /** Cascade predictions from causal chains */
  cascades: CascadePrediction[];
  /** Direct metric predictions with confidence */
  predictions: TwinPrediction[];
  /** Health score changes per domain */
  healthDeltas: HealthScoreDelta[];
  /** Goals that would be derived */
  goalCandidates: SimulatedGoalCandidate[];
  /** Overall simulation verdict */
  verdict: TwinVerdict;
}

// ═══════════════════════════════════════════════════════════
// SECTION 10 — VERDICT
// ═══════════════════════════════════════════════════════════

/**
 * Overall verdict of the simulation.
 */
export interface TwinVerdict {
  /** Overall assessment */
  assessment: "positive" | "neutral" | "negative" | "mixed";
  /** One-line summary */
  summary: string;
  /** Key benefits detected */
  benefits: string[];
  /** Key risks detected */
  risks: string[];
  /** Recommendation */
  recommendation: "execute" | "execute_with_monitoring" | "reconsider" | "reject";
  /** Average confidence across all predictions */
  averageConfidence: number;
  /** Number of new cascades detected */
  cascadeRiskCount: number;
  /** Number of rules that would newly activate */
  newRuleCount: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 11 — SIMULATION STATE (for hook)
// ═══════════════════════════════════════════════════════════

/**
 * State of the simulation hook.
 */
export interface TwinSimulationState {
  /** Current scenario being built */
  currentScenario: DeltaScenario | null;
  /** Latest simulation result */
  latestResult: TwinSimulationResult | null;
  /** Is a simulation running? */
  isSimulating: boolean;
  /** Simulation history (last 10) */
  history: TwinSimulationResult[];
  /** Error message if simulation failed */
  error: string | null;
}

// ═══════════════════════════════════════════════════════════
// SECTION 12 — SCENARIO TEMPLATES
// ═══════════════════════════════════════════════════════════

/**
 * Pre-defined scenario templates for common situations.
 * Managers can use these as starting points.
 */
export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "fee_increase_10",
    name: "Aumento de cuotas 10%",
    description: "¿Qué pasa si aumentamos las cuotas de membresía un 10%?",
    icon: "💰",
    category: "financial",
    deltas: [
      { metricPath: "summary.financial.total_revenue", relativeChange: 0.10 },
      { metricPath: "summary.membership.churn_rate", relativeChange: 0.03 },
    ],
  },
  {
    id: "fee_increase_20",
    name: "Aumento de cuotas 20%",
    description: "Aumento agresivo de cuotas — mayor riesgo de churn",
    icon: "📈",
    category: "financial",
    deltas: [
      { metricPath: "summary.financial.total_revenue", relativeChange: 0.20 },
      { metricPath: "summary.membership.churn_rate", relativeChange: 0.07 },
    ],
  },
  {
    id: "churn_spike",
    name: "Pico de abandono",
    description: "¿Qué pasa si el churn sube 5 puntos porcentuales?",
    icon: "🚨",
    category: "crisis",
    deltas: [
      { metricPath: "summary.membership.churn_rate", relativeChange: 0.05 },
      { metricPath: "summary.membership.retention_rate", relativeChange: -0.05 },
    ],
  },
  {
    id: "satisfaction_drop",
    name: "Caída de satisfacción",
    description: "¿Qué pasa si la satisfacción baja 15 puntos?",
    icon: "📉",
    category: "operations",
    deltas: [
      { metricPath: "summary.operational.satisfaction_score", relativeChange: -0.15 },
    ],
  },
  {
    id: "event_boom",
    name: "Boom de eventos",
    description: "¿Qué pasa si duplicamos la cantidad de eventos?",
    icon: "🎉",
    category: "events",
    deltas: [
      { metricPath: "summary.operational.total_events", relativeChange: 1.00 },
      { metricPath: "summary.operational.occupancy_rate", relativeChange: 0.20 },
    ],
  },
  {
    id: "cost_reduction",
    name: "Reducción de costos",
    description: "¿Qué pasa si reducimos gastos un 15%?",
    icon: "✂️",
    category: "financial",
    deltas: [
      { metricPath: "summary.financial.total_expenses", relativeChange: -0.15 },
      { metricPath: "summary.financial.margin_pct", relativeChange: 0.08 },
    ],
  },
  {
    id: "guest_growth",
    name: "Crecimiento de invitados",
    description: "¿Qué pasa si las visitas de invitados suben 40%?",
    icon: "👥",
    category: "membership",
    deltas: [
      { metricPath: "summary.membership.guest_visits", relativeChange: 0.40 },
      { metricPath: "summary.membership.total_members", relativeChange: 0.03 },
    ],
  },
  {
    id: "worst_case",
    name: "Peor escenario",
    description: "Todo va mal simultáneamente — stress test del club",
    icon: "🔥",
    category: "crisis",
    deltas: [
      { metricPath: "summary.membership.churn_rate", relativeChange: 0.10 },
      { metricPath: "summary.financial.total_revenue", relativeChange: -0.20 },
      { metricPath: "summary.operational.satisfaction_score", relativeChange: -0.25 },
      { metricPath: "summary.operational.attendance_rate", relativeChange: -0.30 },
    ],
  },
];

/**
 * Template category display config.
 */
export const TEMPLATE_CATEGORY_CONFIG: Record<
  ScenarioTemplate["category"],
  { label: string; color: string }
> = {
  financial: { label: "Financiero", color: "var(--color-gold-400)" },
  membership: { label: "Membresía", color: "var(--color-teal-400)" },
  events: { label: "Eventos", color: "var(--color-amber-400)" },
  operations: { label: "Operaciones", color: "var(--color-silver-300)" },
  crisis: { label: "Crisis", color: "var(--color-rose-400)" },
};

/**
 * Verdict display config.
 */
export const VERDICT_CONFIG: Record<
  TwinVerdict["assessment"],
  { label: string; color: string; bgColor: string }
> = {
  positive: {
    label: "Positivo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  neutral: {
    label: "Neutro",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
  },
  negative: {
    label: "Negativo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  mixed: {
    label: "Mixto",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
};

export const RECOMMENDATION_CONFIG: Record<
  TwinVerdict["recommendation"],
  { label: string; color: string; description: string }
> = {
  execute: {
    label: "Ejecutar",
    color: "var(--color-emerald-400)",
    description: "Impacto positivo con alta confianza. Proceder.",
  },
  execute_with_monitoring: {
    label: "Ejecutar con monitoreo",
    color: "var(--color-amber-400)",
    description: "Impacto probablemente positivo pero con riesgos. Monitorear métricas clave.",
  },
  reconsider: {
    label: "Reconsiderar",
    color: "var(--color-amber-400)",
    description: "Riesgos significativos detectados. Revisar la estrategia.",
  },
  reject: {
    label: "Rechazar",
    color: "var(--color-rose-400)",
    description: "Impacto negativo probable. No recomendado.",
  },
};