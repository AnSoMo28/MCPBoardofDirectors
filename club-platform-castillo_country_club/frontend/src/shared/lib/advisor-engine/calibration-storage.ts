// src/shared/lib/advisor-engine/calibration-storage.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Outcome Storage (F50)
//
// localStorage-backed storage for rule outcomes.
// MVP storage — designed to be swapped for backend API later.
//
// Storage key: "ccc_advisor_outcomes"
// Format: JSON array of RuleOutcome
// Max age: 30 days (auto-pruned on read)
//
// Depends on: ./calibration-types (RuleOutcome, CausalChainOutcome)
// ═══════════════════════════════════════════════════════════

import type {
  RuleOutcome,
  OutcomeStatus,
  CausalChainOutcome,
} from "./calibration-types";
import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "ccc_advisor_outcomes";
const CHAIN_STORAGE_KEY = "ccc_causal_chain_outcomes";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_OUTCOMES = 500; // Prevent unbounded growth

// ═══════════════════════════════════════════════════════════
// SECTION 2 — OUTCOME STORAGE
// ═══════════════════════════════════════════════════════════

/**
 * Record an outcome for an executed insight.
 * Appends to localStorage array, auto-prunes old entries.
 */
export function recordOutcome(params: {
  ruleId: string;
  domain: AIDomain;
  impact: AdvisorImpactLevel;
  originalConfidence: number;
  outcome: OutcomeStatus;
  feedback?: string;
  metricDelta?: number;
}): RuleOutcome {
  const outcome: RuleOutcome = {
    id: `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ruleId: params.ruleId,
    domain: params.domain,
    impact: params.impact,
    originalConfidence: params.originalConfidence,
    outcome: params.outcome,
    executedAt: Date.now(),
    recordedAt: Date.now(),
    feedback: params.feedback,
    metricDelta: params.metricDelta,
  };

  try {
    const existing = loadRawOutcomes();
    const updated = [...existing, outcome];

    // Prune old + limit count
    const pruned = pruneOutcomes(updated);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));

    if (import.meta.env.DEV) {
      console.log(
        `[Calibration] Recorded outcome: ${params.ruleId} → ${params.outcome}`,
      );
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[Calibration] Failed to record outcome:", e);
    }
  }

  return outcome;
}

/**
 * Get all outcomes for a specific rule.
 */
export function getOutcomesForRule(ruleId: string): RuleOutcome[] {
  const all = getAllOutcomes();
  return all.filter((o) => o.ruleId === ruleId);
}

/**
 * Get all outcomes (pruned of expired entries).
 */
export function getAllOutcomes(): RuleOutcome[] {
  try {
    const raw = loadRawOutcomes();
    const pruned = pruneOutcomes(raw);

    // Re-save if we pruned anything
    if (pruned.length !== raw.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    }

    return pruned;
  } catch {
    return [];
  }
}

/**
 * Get the total count of stored outcomes.
 */
export function getOutcomeCount(): number {
  return getAllOutcomes().length;
}

/**
 * Clear all stored outcomes.
 */
export function clearAllOutcomes(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CHAIN_STORAGE_KEY);
  if (import.meta.env.DEV) {
    console.log("[Calibration] Cleared all outcomes");
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — CAUSAL CHAIN OUTCOME STORAGE
// ═══════════════════════════════════════════════════════════

/**
 * Record a causal chain detection for later validation.
 */
export function recordChainOutcome(params: {
  patternId: string;
  signalSequence: string[];
  detectedConfidence: number;
}): CausalChainOutcome {
  const outcome: CausalChainOutcome = {
    id: `chain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    patternId: params.patternId,
    signalSequence: params.signalSequence,
    detectedConfidence: params.detectedConfidence,
    validated: false,
    detectedAt: Date.now(),
  };

  try {
    const existing = loadRawChainOutcomes();
    const updated = [...existing, outcome].slice(-100); // Max 100 chain outcomes
    localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[Calibration] Failed to record chain outcome:", e);
    }
  }

  return outcome;
}

/**
 * Get all chain outcomes.
 */
export function getChainOutcomes(): CausalChainOutcome[] {
  try {
    return loadRawChainOutcomes();
  } catch {
    return [];
  }
}

/**
 * Mark a chain outcome as validated.
 */
export function validateChainOutcome(
  outcomeId: string,
  validated: boolean,
  notes?: string,
): void {
  try {
    const outcomes = loadRawChainOutcomes();
    const updated = outcomes.map((o) =>
      o.id === outcomeId
        ? { ...o, validated, validatedAt: Date.now(), notes }
        : o,
    );
    localStorage.setItem(CHAIN_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[Calibration] Failed to validate chain outcome:", e);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

function loadRawOutcomes(): RuleOutcome[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RuleOutcome[];
  } catch {
    return [];
  }
}

function loadRawChainOutcomes(): CausalChainOutcome[] {
  try {
    const raw = localStorage.getItem(CHAIN_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CausalChainOutcome[];
  } catch {
    return [];
  }
}

/**
 * Remove expired outcomes + enforce max count.
 */
function pruneOutcomes(outcomes: RuleOutcome[]): RuleOutcome[] {
  const now = Date.now();
  const valid = outcomes.filter((o) => now - o.recordedAt < MAX_AGE_MS);
  return valid.slice(-MAX_OUTCOMES);
}