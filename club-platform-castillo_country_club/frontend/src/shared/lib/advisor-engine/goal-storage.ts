// src/shared/lib/advisor-engine/goal-storage.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Goal & Plan Persistence (C2 Fix)
//
// localStorage-backed persistence for goals, plans, and
// manual status overrides. Goals are re-derived each render
// from live data, but their STATUS (abandoned, blocked,
// achieved) and PLAN PROGRESS survive page refreshes.
//
// Storage keys:
//   ccc_autonomous_plans      → ActionPlan[] (serialized)
//   ccc_autonomous_overrides  → { goalId → { status, updatedAt } }
//
// Max age: 90 days (goals become stale after a quarter)
//
// Depends on: ./intent-types (ActionPlan, GoalStatus)
// ═══════════════════════════════════════════════════════════

import type { ActionPlan, GoalStatus } from "./intent-types";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const PLANS_KEY = "ccc_autonomous_plans";
const OVERRIDES_KEY = "ccc_autonomous_overrides";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// ═══════════════════════════════════════════════════════════
// SECTION 2 — PLAN PERSISTENCE
// ═══════════════════════════════════════════════════════════

/** Load persisted plans from localStorage. */
export function loadPlans(): Map<string, ActionPlan> {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as [string, ActionPlan][];
    const now = Date.now();

    // Filter stale plans (> 90 days old)
    const valid = parsed.filter(
      ([, plan]) => now - plan.createdAt < MAX_AGE_MS,
    );

    return new Map(valid);
  } catch {
    return new Map();
  }
}

/** Save plans to localStorage. Debounce at call site. */
export function savePlans(plans: Map<string, ActionPlan>): void {
  try {
    // Serialize Map to array of tuples
    const serializable: [string, ActionPlan][] = Array.from(plans.entries());
    localStorage.setItem(PLANS_KEY, JSON.stringify(serializable));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[GoalStorage] Failed to save plans:", e);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — OVERRIDE PERSISTENCE
// ═══════════════════════════════════════════════════════════

interface GoalOverride {
  status: GoalStatus;
  updatedAt: number;
}

/** Load persisted goal status overrides. */
export function loadOverrides(): Map<string, GoalOverride> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as [string, GoalOverride][];
    const now = Date.now();

    // Filter stale overrides
    const valid = parsed.filter(([, o]) => now - o.updatedAt < MAX_AGE_MS);

    return new Map(valid);
  } catch {
    return new Map();
  }
}

/** Save goal status overrides. */
export function saveOverrides(overrides: Map<string, GoalOverride>): void {
  try {
    const serializable: [string, GoalOverride][] = Array.from(overrides.entries());
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(serializable));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[GoalStorage] Failed to save overrides:", e);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — CLEANUP
// ═══════════════════════════════════════════════════════════

/** Clear all persisted goal data. */
export function clearGoalStorage(): void {
  localStorage.removeItem(PLANS_KEY);
  localStorage.removeItem(OVERRIDES_KEY);
  if (import.meta.env.DEV) {
    console.log("[GoalStorage] Cleared all goal data");
  }
}

/** Get a summary of what's stored. */
export function getGoalStorageSummary(): {
  planCount: number;
  overrideCount: number;
  oldestPlan: number | null;
} {
  const plans = loadPlans();
  const overrides = loadOverrides();

  let oldestPlan: number | null = null;
  for (const [, plan] of plans) {
    if (oldestPlan === null || plan.createdAt < oldestPlan) {
      oldestPlan = plan.createdAt;
    }
  }

  return {
    planCount: plans.size,
    overrideCount: overrides.size,
    oldestPlan,
  };
}