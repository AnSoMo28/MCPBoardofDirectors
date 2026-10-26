// src/shared/lib/advisor-engine/nl-rule-store.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — NL Rule Store (F52)
//
// localStorage-backed CRUD for custom NL rules.
// Manages the full lifecycle: create → active → paused → calibrated.
//
// Storage key: "ccc_custom_advisor_rules"
// Format: { rules: NLRuleTemplate[], version: 1 }
// Max rules: 50 (prevent abuse)
//
// Each rule tracks:
//   - evaluationCount: how many times the condition was checked
//   - triggerCount: how many times the condition was true
// These counters feed F50 calibration.
//
// Depends on:
//   ./nl-rule-types (NLRuleTemplate, ParseStrategy, NLRuleStatus)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type { NLRuleTemplate, ParseStrategy } from "./nl-rule-types";
import type { AIDomain } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "ccc_custom_advisor_rules";
const MAX_RULES = 50;
const STORAGE_VERSION = 1;

interface StoredRules {
  rules: NLRuleTemplate[];
  version: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Save a new custom rule.
 * Returns the created NLRuleTemplate with generated ID.
 */
export function saveCustomRule(params: {
  text: string;
  domain: AIDomain | "global";
  createdBy: string;
  parseStrategy: ParseStrategy;
}): NLRuleTemplate {
  const existing = getCustomRules();

  if (existing.length >= MAX_RULES) {
    throw new Error(
      `Máximo ${MAX_RULES} reglas custom. Eliminá alguna antes de crear otra.`,
    );
  }

  const rule: NLRuleTemplate = {
    id: `nl_rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: params.text,
    domain: params.domain,
    status: "active",
    createdBy: params.createdBy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    evaluationCount: 0,
    triggerCount: 0,
    parseStrategy: params.parseStrategy,
  };

  const updated = [...existing, rule];
  writeRules(updated);

  if (import.meta.env.DEV) {
    console.log(`[NLRuleStore] Saved rule: ${rule.id} — "${params.text.slice(0, 50)}..."`);
  }

  return rule;
}

/**
 * Get all custom rules.
 */
export function getCustomRules(): NLRuleTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoredRules;
    if (parsed.version !== STORAGE_VERSION) {
      // Future: migration logic
      return [];
    }

    return parsed.rules ?? [];
  } catch {
    return [];
  }
}

/**
 * Get only active rules (ready for evaluation).
 */
export function getActiveRules(): NLRuleTemplate[] {
  return getCustomRules().filter((r) => r.status === "active");
}

/**
 * Get rules for a specific domain.
 */
export function getRulesForDomain(domain: AIDomain | "global"): NLRuleTemplate[] {
  return getActiveRules().filter(
    (r) => r.domain === domain || r.domain === "global",
  );
}

/**
 * Get a single rule by ID.
 */
export function getRuleById(id: string): NLRuleTemplate | undefined {
  return getCustomRules().find((r) => r.id === id);
}

/**
 * Delete a custom rule.
 */
export function deleteCustomRule(id: string): void {
  const existing = getCustomRules();
  const filtered = existing.filter((r) => r.id !== id);
  writeRules(filtered);

  if (import.meta.env.DEV) {
    console.log(`[NLRuleStore] Deleted rule: ${id}`);
  }
}

/**
 * Toggle a rule between active and paused.
 */
export function toggleCustomRule(id: string): NLRuleTemplate | null {
  const existing = getCustomRules();
  const idx = existing.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const rule = existing[idx];
  const newStatus = rule.status === "active" ? "paused" : "active";

  const updated = [...existing];
  updated[idx] = { ...rule, status: newStatus, updatedAt: Date.now() };
  writeRules(updated);

  return updated[idx];
}

/**
 * Update a rule's status.
 */
export function updateRuleStatus(
  id: string,
  status: NLRuleTemplate["status"],
): void {
  const existing = getCustomRules();
  const updated = existing.map((r) =>
    r.id === id ? { ...r, status, updatedAt: Date.now() } : r,
  );
  writeRules(updated);
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — EVALUATION TRACKING (feeds F50 calibration)
// ═══════════════════════════════════════════════════════════

/**
 * Record that a rule was evaluated (condition was checked).
 * Increments evaluationCount.
 */
export function recordEvaluation(id: string): void {
  const existing = getCustomRules();
  const updated = existing.map((r) =>
    r.id === id
      ? { ...r, evaluationCount: r.evaluationCount + 1, updatedAt: Date.now() }
      : r,
  );
  writeRules(updated);
}

/**
 * Record that a rule was triggered (condition was true).
 * Increments triggerCount.
 */
export function recordTrigger(id: string): void {
  const existing = getCustomRules();
  const updated = existing.map((r) =>
    r.id === id
      ? { ...r, triggerCount: r.triggerCount + 1, updatedAt: Date.now() }
      : r,
  );
  writeRules(updated);
}

/**
 * Get trigger rate for a rule (triggerCount / evaluationCount).
 * Used for calibration: if a rule never triggers, it might be wrong.
 */
export function getTriggerRate(id: string): number {
  const rule = getRuleById(id);
  if (!rule || rule.evaluationCount === 0) return 0;
  return rule.triggerCount / rule.evaluationCount;
}

/**
 * Check if a rule has enough evaluations for calibration.
 * Threshold: 10+ evaluations (same as F50 "calibrated" readiness).
 */
export function isRuleCalibratable(id: string): boolean {
  const rule = getRuleById(id);
  return (rule?.evaluationCount ?? 0) >= 10;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════

/**
 * Export all rules as JSON string (for sharing/backup).
 */
export function exportCustomRules(): string {
  const rules = getCustomRules();
  return JSON.stringify({ rules, version: STORAGE_VERSION }, null, 2);
}

/**
 * Import rules from JSON string.
 * Merges with existing rules (no duplicates by ID).
 */
export function importCustomRules(json: string): {
  imported: number;
  skipped: number;
} {
  try {
    const parsed = JSON.parse(json) as StoredRules;
    if (!Array.isArray(parsed.rules)) {
      throw new Error("Formato inválido");
    }

    const existing = getCustomRules();
    const existingIds = new Set(existing.map((r) => r.id));

    let imported = 0;
    let skipped = 0;
    const merged = [...existing];

    for (const rule of parsed.rules) {
      if (existingIds.has(rule.id)) {
        skipped++;
        continue;
      }
      if (merged.length >= MAX_RULES) {
        skipped++;
        continue;
      }
      merged.push({ ...rule, status: "paused" }); // Import as paused for safety
      imported++;
    }

    writeRules(merged);
    return { imported, skipped };
  } catch (e) {
    throw new Error(`Error al importar reglas: ${e instanceof Error ? e.message : "formato inválido"}`);
  }
}

/**
 * Clear all custom rules.
 */
export function clearCustomRules(): void {
  localStorage.removeItem(STORAGE_KEY);
  if (import.meta.env.DEV) {
    console.log("[NLRuleStore] Cleared all custom rules");
  }
}

/**
 * Get a summary of stored rules.
 */
export function getRuleStoreSummary(): {
  total: number;
  active: number;
  paused: number;
  errored: number;
  totalEvaluations: number;
  totalTriggers: number;
} {
  const rules = getCustomRules();
  return {
    total: rules.length,
    active: rules.filter((r) => r.status === "active").length,
    paused: rules.filter((r) => r.status === "paused").length,
    errored: rules.filter((r) => r.status === "errored").length,
    totalEvaluations: rules.reduce((sum, r) => sum + r.evaluationCount, 0),
    totalTriggers: rules.reduce((sum, r) => sum + r.triggerCount, 0),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — INTERNAL
// ═══════════════════════════════════════════════════════════

function writeRules(rules: NLRuleTemplate[]): void {
  try {
    const data: StoredRules = { rules, version: STORAGE_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[NLRuleStore] Failed to write:", e);
    }
  }
}