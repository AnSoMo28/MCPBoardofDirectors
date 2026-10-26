// src/shared/lib/advisor-engine/causal-chain.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Causal Chain Detection Engine (F49)
//
// Detects cause-and-effect patterns between cross-domain signals.
// When multiple signals fire in a known sequence, the engine
// recognizes the cascade and produces a CausalChain with
// compound confidence.
//
// Architecture:
//   CAUSAL_PATTERNS → known signal sequences (templates)
//   DomainSignal[]  → active signals from Signal Bus
//   CausalChain[]   → detected cascades (output)
//
// Signal Decay:
//   effectiveSeverity = baseSeverity × (1 - age/ttl)
//   A signal with 80% TTL consumed weighs 20% of its base severity.
//   Decay is applied BEFORE chain detection to weight recent signals higher.
//
// Compound Confidence:
//   baseConfidence × avgDecayFactor × lengthPenalty
//   2-signal: penalty = 1.0
//   3-signal: penalty = 0.85
//   4-signal: penalty = 0.70
//   5+ signal: penalty = 0.55
//
// Depends on:
//   ./types (DomainSignal, CausalChain, CausalPattern, ChainDetectionResult,
//            SignalName, AIDomain, isSignalExpired, computeSignalDecayValue)
//
// Created: F49 — "The Synapses"
// ═══════════════════════════════════════════════════════════

import type {
  DomainSignal,
  CausalChain,
  CausalPattern,
  ChainDetectionResult,
  SignalName,
} from "./types";
import { isSignalExpired } from "./types";
import type { AIDomain } from "@/shared/types/ai-intelligence";
// ═══════════════════════════════════════════════════════════
// SECTION 1 — SIGNAL DECAY
//
// Signals weaken over time. A fresh signal carries full
// severity; a stale signal is nearly inert. This models
// biological synaptic decay — signals that aren't reinforced
// fade away.
// ═══════════════════════════════════════════════════════════

/**
 * Compute the decay factor for a signal based on its age.
 *
 * Returns a value between 0 and 1:
 *   - 1.0 = signal is fresh (age = 0)
 *   - 0.0 = signal has fully expired (age >= ttl)
 *
 * Decay is linear: factor = 1 - (age / ttl)
 *
 * @param signal — The signal to compute decay for
 * @returns Decay factor (0-1)
 */
export function computeSignalDecay(signal: DomainSignal): number {
  const age = Date.now() - signal.timestamp;
  if (age <= 0) return 1;
  if (age >= signal.ttl) return 0;
  return 1 - age / signal.ttl;
}

/**
 * Compute the effective severity of a signal after applying decay.
 *
 * effectiveSeverity = severity × decayFactor
 *
 * Severity mapping to numeric:
 *   low = 0.25, medium = 0.50, high = 0.75, critical = 1.0
 *
 * @param signal — The signal
 * @returns Effective severity as a 0-1 number
 */
export function computeEffectiveSeverity(signal: DomainSignal): number {
  const decay = computeSignalDecay(signal);
  const baseValue = severityToNumeric(signal.severity);
  return baseValue * decay;
}

/**
 * Apply decay to a signal, setting effectiveSeverity.
 * Returns a NEW signal object (immutable — doesn't mutate the original).
 *
 * @param signal — Original signal
 * @returns New signal with effectiveSeverity set
 */
export function applyDecayToSignal(signal: DomainSignal): DomainSignal {
  return {
    ...signal,
    effectiveSeverity: computeEffectiveSeverity(signal),
  };
}

/**
 * Apply decay to an array of signals.
 * Returns new array with decayed signals.
 */
export function applyDecayToSignals(signals: DomainSignal[]): DomainSignal[] {
  return signals.map(applyDecayToSignal);
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — CAUSAL PATTERNS REGISTRY
//
// Known cause-and-effect sequences in club operations.
// Each pattern defines a signal sequence, base confidence,
// and severity.
//
// Patterns are checked in priority order during detection.
// To add a new pattern: define it here, TypeScript enforces
// that signalSequence entries are valid SignalNames.
// ═══════════════════════════════════════════════════════════

/**
 * Known causal patterns in private club operations.
 * Ordered by baseConfidence DESC for priority matching.
 */
export const CAUSAL_PATTERNS: CausalPattern[] = [
  {
    id: "ml_degradation_confidence_drop",
    signalSequence: ["ml_model_degradation", "ml_prediction_confidence_drop"],
    baseConfidence: 0.80,
    descriptionTemplate:
      "Deterioro del modelo ML causó pérdida de confianza en predicciones. El sistema de predicción necesita recalibración.",
    severity: "high",
    requireAllActive: true,
  },
  {
    id: "revenue_events_engagement",
    signalSequence: ["fin_revenue_decline", "evt_low_engagement"],
    baseConfidence: 0.75,
    descriptionTemplate:
      "Caída de ingresos redujo presupuesto de eventos, provocando baja participación. El club está en riesgo de espiral descendente.",
    severity: "high",
    requireAllActive: true,
  },
  {
    id: "events_satisfaction_cascade",
    signalSequence: ["evt_low_engagement", "sat_critical_decline"],
    baseConfidence: 0.70,
    descriptionTemplate:
      "Baja participación en eventos deterioró la satisfacción general. Los socios sienten que el club no ofrece valor.",
    severity: "high",
    requireAllActive: true,
  },
  {
    id: "margin_sports_utilization",
    signalSequence: ["fin_margin_pressure", "spt_utilization_drop"],
    baseConfidence: 0.65,
    descriptionTemplate:
      "Presión de márgenes impactó la calidad de instalaciones deportivas, reduciendo su utilización.",
    severity: "medium",
    requireAllActive: true,
  },
  {
    id: "communication_satisfaction",
    signalSequence: ["comm_delivery_critical", "sat_critical_decline"],
    baseConfidence: 0.65,
    descriptionTemplate:
      "Fallo en comunicaciones causó desinformación entre socios, deteriorando la satisfacción.",
    severity: "medium",
    requireAllActive: true,
  },
  {
    id: "guest_revenue_pipeline",
    signalSequence: ["guest_pipeline_alert", "fin_revenue_decline"],
    baseConfidence: 0.60,
    descriptionTemplate:
      "Colapso del pipeline de invitados redujo ingresos futuros. Las conversiones están por debajo del umbral.",
    severity: "high",
    requireAllActive: true,
  },
  {
    id: "full_cascade_revenue_events_satisfaction",
    signalSequence: [
      "fin_revenue_decline",
      "evt_low_engagement",
      "sat_critical_decline",
    ],
    baseConfidence: 0.60,
    descriptionTemplate:
      "Cascada completa detectada: ingresos → eventos → satisfacción. Crisis sistémica en progreso — requiere intervención inmediata.",
    severity: "critical",
    requireAllActive: true,
  },
  {
    id: "demographics_satisfaction",
    signalSequence: ["age_group_imbalance", "sat_critical_decline"],
    baseConfidence: 0.55,
    descriptionTemplate:
      "Desequilibrio demográfico deterioró la satisfacción. Programas no están atendiendo a todos los segmentos.",
    severity: "medium",
    requireAllActive: false,
  },
];

// ═══════════════════════════════════════════════════════════
// SECTION 3 — DETECTION ENGINE
// ═══════════════════════════════════════════════════════════

/**
 * Detect causal chains from active signals.
 *
 * Algorithm:
 *   1. Apply decay to all signals
 *   2. For each known pattern:
 *      a. Find signals matching each step in the sequence
 *      b. Verify ordering (earlier signals have earlier timestamps)
 *      c. Verify active state (all signals within TTL if requireAllActive)
 *      d. Compute compound confidence
 *   3. Sort results by compoundConfidence DESC
 *
 * @param activeSignals — Current active signals from Signal Bus
 * @param domainLabels — Map of AIDomain → human-readable label
 * @returns Detection result with found chains
 */
export function detectCausalChains(
  activeSignals: DomainSignal[],
  domainLabels?: Partial<Record<AIDomain, string>>,
): ChainDetectionResult {
  const start = performance.now();

  if (!activeSignals.length) {
    return {
      chains: [],
      patternsChecked: 0,
      patternsMatched: 0,
      detectionTime: performance.now() - start,
    };
  }

  // Step 1: Apply decay
  const decayedSignals = applyDecayToSignals(activeSignals);

  // Step 2: Build signal lookup by signalDefId for fast matching
  const signalByDefId = new Map<SignalName, DomainSignal[]>();
  for (const signal of decayedSignals) {
    const existing = signalByDefId.get(signal.signalDefId) ?? [];
    existing.push(signal);
    signalByDefId.set(signal.signalDefId, existing);
  }

  const chains: CausalChain[] = [];
  let patternsMatched = 0;

  // Step 3: Check each pattern
  for (const pattern of CAUSAL_PATTERNS) {
    const matchedChain = tryMatchPattern(
      pattern,
      signalByDefId,
      decayedSignals,
      domainLabels,
    );

    if (matchedChain) {
      chains.push(matchedChain);
      patternsMatched++;
    }
  }

  // Step 4: Sort by compoundConfidence DESC
  chains.sort((a, b) => b.compoundConfidence - a.compoundConfidence);

  return {
    chains,
    patternsChecked: CAUSAL_PATTERNS.length,
    patternsMatched,
    detectionTime: performance.now() - start,
  };
}

/**
 * Try to match a single causal pattern against the signal pool.
 * Returns a CausalChain if matched, null otherwise.
 */
function tryMatchPattern(
  pattern: CausalPattern,
  signalByDefId: Map<SignalName, DomainSignal[]>,
  _allSignals: DomainSignal[],
  domainLabels?: Partial<Record<AIDomain, string>>,
): CausalChain | null {
  // Find a matching signal for each step in the sequence
  const matchedSignals: DomainSignal[] = [];

  for (const signalName of pattern.signalSequence) {
    const candidates = signalByDefId.get(signalName);
    if (!candidates?.length) return null; // Missing step — pattern doesn't match

    // Pick the most recent candidate (highest effectiveSeverity)
    const best = candidates.reduce((a, b) =>
      (a.effectiveSeverity ?? 0) >= (b.effectiveSeverity ?? 0) ? a : b,
    );
    matchedSignals.push(best);
  }

  // Verify ordering: each signal should be timestamped >= the previous
  for (let i = 1; i < matchedSignals.length; i++) {
    if (matchedSignals[i].timestamp < matchedSignals[i - 1].timestamp) {
      // Signals are out of causal order — check if lenient mode allows it
      if (pattern.requireAllActive) {
        return null;
      }
    }
  }

  // Verify active state
  if (pattern.requireAllActive) {
    const allActive = matchedSignals.every(
      (s) => !isSignalExpired(s),
    );
    if (!allActive) return null;
  } else {
    // At least one must be active
    const anyActive = matchedSignals.some((s) => !isSignalExpired(s));
    if (!anyActive) return null;
  }

  // Compute compound confidence
  const compoundConfidence = computeCompoundConfidence(
    pattern.baseConfidence,
    matchedSignals,
  );

  // Build description
  const labels = matchedSignals.map((s) => {
    const label = domainLabels?.[s.sourceDomain];
    return label ?? s.sourceDomain;
  });
  const description = buildChainDescription(pattern.descriptionTemplate, labels);

  // Chain ID: pattern + timestamp for uniqueness
  const id = `chain_${pattern.id}_${Date.now()}`;

  return {
    id,
    signals: matchedSignals,
    patternId: pattern.id,
    chainLength: matchedSignals.length,
    compoundConfidence: Math.round(compoundConfidence * 100) / 100,
    description,
    domainLabels: labels,
    isActive: matchedSignals.every((s) => !isSignalExpired(s)),
    detectedAt: Date.now(),
    rootCauseDomain: matchedSignals[0].sourceDomain,
    affectedDomain: matchedSignals[matchedSignals.length - 1].sourceDomain,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — CONFIDENCE COMPUTATION
// ═══════════════════════════════════════════════════════════

/**
 * Length penalty factor — longer chains have lower confidence
 * because they involve more assumptions about causality.
 */
const LENGTH_PENALTY: Record<number, number> = {
  1: 1.0,
  2: 1.0,
  3: 0.85,
  4: 0.70,
};

/** Default penalty for chains of length 5+ */
const LENGTH_PENALTY_DEFAULT = 0.55;

/**
 * Compute compound confidence for a causal chain.
 *
 * Formula:
 *   compound = baseConfidence × avgDecayFactor × lengthPenalty
 *
 * Where:
 *   - baseConfidence: from the CausalPattern definition
 *   - avgDecayFactor: average of signal decay factors (0-1)
 *   - lengthPenalty: penalty based on chain length
 *
 * @param baseConfidence — Pattern's base confidence (0-1)
 * @param signals — Matched and decayed signals
 * @returns Compound confidence (0-1)
 */
export function computeCompoundConfidence(
  baseConfidence: number,
  signals: DomainSignal[],
): number {
  // Average effective severity (already includes decay)
  const avgDecayFactor =
    signals.reduce((sum, s) => sum + (s.effectiveSeverity ?? 0), 0) /
    signals.length;

  // Normalize: effectiveSeverity is baseSeverity × decay
  // We want just the decay factor, so divide by avg base severity
  const avgBaseSeverity =
    signals.reduce((sum, s) => sum + severityToNumeric(s.severity), 0) /
    signals.length;

  // Guard: if avgBaseSeverity is 0, decay factor is 0 (all signals expired)
  const normalizedDecay =
    avgBaseSeverity > 0 ? avgDecayFactor / avgBaseSeverity : 0;

  // Length penalty
  const lengthPenalty =
    LENGTH_PENALTY[signals.length] ?? LENGTH_PENALTY_DEFAULT;

  // Final compound confidence
  return baseConfidence * normalizedDecay * lengthPenalty;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Convert a severity level to a numeric value (0-1).
 * Used for decay and confidence calculations.
 */
function severityToNumeric(severity: string): number {
  switch (severity) {
    case "low":
      return 0.25;
    case "medium":
    case "warning":
      return 0.50;
    case "high":
      return 0.75;
    case "critical":
    case "error":
      return 1.0;
    default:
      return 0.50;
  }
}

/**
 * Build a human-readable chain description from a template.
 * Replaces ${domains[N]} placeholders with actual domain labels.
 * Falls back to the template as-is if no placeholders found.
 */
function buildChainDescription(
  template: string,
  domainLabels: string[],
): string {
  let result = template;
  for (let i = 0; i < domainLabels.length; i++) {
    result = result.replace(`\${domains[${i}]}`, domainLabels[i]);
  }
  return result;
}

/**
 * Get a short human-readable description of a causal chain.
 * Used for compact displays (The Pulse, badges).
 *
 * Example: "Financial → Events → Satisfaction"
 *
 * @param chain — The causal chain
 * @returns Arrow-separated domain labels
 */
export function getChainShortDescription(chain: CausalChain): string {
  return chain.domainLabels.join(" → ");
}

/**
 * Check if a specific domain is the root cause of any active chain.
 * Used by The Pulse to show causal explanations for critical vital signs.
 *
 * @param chains — Detected causal chains
 * @param domain — Domain to check
 * @returns The chain where this domain is the root cause, or undefined
 */
export function findChainWithRootCause(
  chains: CausalChain[],
  domain: AIDomain,
): CausalChain | undefined {
  return chains.find(
    (chain) => chain.rootCauseDomain === domain && chain.isActive,
  );
}

/**
 * Check if a specific domain is the final affected domain in any chain.
 * Used to highlight "victims" of cascades.
 *
 * @param chains — Detected causal chains
 * @param domain — Domain to check
 * @returns The chain where this domain is the final affected, or undefined
 */
export function findChainWithFinalEffect(
  chains: CausalChain[],
  domain: AIDomain,
): CausalChain | undefined {
  return chains.find(
    (chain) => chain.affectedDomain === domain && chain.isActive,
  );
}

/**
 * Get the highest-confidence chain from a list.
 * Returns undefined if no chains.
 */
export function getStrongestChain(
  chains: CausalChain[],
): CausalChain | undefined {
  if (!chains.length) return undefined;
  return chains.reduce((a, b) =>
    a.compoundConfidence >= b.compoundConfidence ? a : b,
  );
}