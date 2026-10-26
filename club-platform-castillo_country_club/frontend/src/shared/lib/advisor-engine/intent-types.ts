// src/shared/lib/advisor-engine/intent-types.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Intent Type Definitions (F51)
//
// Types for the Autonomous Advisor Loop: goal derivation,
// plan building, step execution, and HITL approval gates.
//
// Architecture:
//   AdvisorGoal    → derived from insights + health + chains
//   ActionPlan     → ordered PlanSteps to achieve a goal
//   PlanStep       → single executable action with dependencies
//   PlanExecutionResult → outcome of executing a step
//
// Storage: localStorage (MVP) → backend (production)
// Depends on:
//   ./calibration-types (CalibrationResult)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — GOAL STATUS & PRIORITY
// ═══════════════════════════════════════════════════════════

/**
 * Lifecycle of an Advisor Goal.
 *
 * pending     → just derived, no plan yet
 * planning    → plan being built
 * executing   → plan steps in progress
 * achieved    → target metric reached
 * blocked     → can't proceed (failed step, missing data)
 * abandoned   → manually discarded or superseded
 */
export type GoalStatus =
  | "pending"
  | "planning"
  | "executing"
  | "achieved"
  | "blocked"
  | "abandoned";

/**
 * Goal priority — drives execution order.
 * Derived from: insight impact × calibrated confidence × urgency.
 */
export type GoalPriority = "critical" | "high" | "medium" | "low";

// ═══════════════════════════════════════════════════════════
// SECTION 2 — ADVISOR GOAL
// ═══════════════════════════════════════════════════════════

/**
 * A measurable objective the Advisor is working toward.
 * Derived from insights, health scores, and causal chains.
 *
 * Example:
 *   title: "Reducir churn del 8% al 5%"
 *   targetMetric: { name: "churn_rate", currentValue: 8, targetValue: 5, unit: "%" }
 *   gap: 37.5  (3% out of 8% = 37.5% gap)
 */
export interface AdvisorGoal {
  /** Unique goal ID */
  id: string;

  /** Human-readable title */
  title: string;

  /** Detailed description */
  description: string;

  /** Domain that owns this goal */
  domain: AIDomain;

  /** Priority level */
  priority: GoalPriority;

  /** Current lifecycle status */
  status: GoalStatus;

  /** Which insight generated this goal (optional) */
  sourceInsightId?: string;

  /** Which causal chain motivated this goal (optional) */
  sourceChainPatternId?: string;

  /** The metric we're trying to improve */
  targetMetric: {
    /** Metric name (e.g., "churn_rate", "revenue", "satisfaction_score") */
    name: string;
    /** Current value */
    currentValue: number;
    /** Desired value */
    targetValue: number;
    /** Unit of measurement */
    unit: string;
  };

  /**
   * Gap: how far are we from the target? (0-100)
   * 0 = achieved, 100 = maximally far
   */
  gap: number;

  /** Deadline timestamp (optional) */
  deadline?: number;

  /** Calibrated confidence in achieving this goal (F50) */
  calibratedConfidence: number;

  /** When the goal was created */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — PLAN STEPS
// ═══════════════════════════════════════════════════════════

/**
 * Status of a single plan step.
 */
export type PlanStepStatus =
  | "pending"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "done"
  | "failed"
  | "skipped";

/**
 * A single executable action within an ActionPlan.
 * Maps to an MCP tool call with dependencies on prior steps.
 */
export interface PlanStep {
  /** Unique step ID */
  id: string;

  /** Parent goal ID */
  goalId: string;

  /** Human-readable label */
  label: string;

  /** What this step does */
  description: string;

  /** MCP tool to call */
  tool: string;

  /** MCP server that owns the tool */
  server: string;

  /** Parameters for the tool call */
  params: Record<string, unknown>;

  /** Approval level: auto = immediate, semi = confirm, hitl = manual approval */
  approvalLevel: "auto" | "semi" | "hitl";

  /** Current status */
  status: PlanStepStatus;

  /** Step IDs that must complete before this one */
  dependencies: string[];

  /** Estimated impact of this step */
  estimatedImpact: "low" | "medium" | "high";

  /** Execution order (for display; actual order = dependency-resolved) */
  order: number;

  /** Result after execution (populated after done/failed) */
  result?: PlanExecutionResult;

  /** When the step was executed */
  executedAt?: number;

  /** When the step was approved (for semi/hitl) */
  approvedAt?: number;

  /** Optional: human override of params before approval */
  overriddenParams?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — ACTION PLAN
// ═══════════════════════════════════════════════════════════

/**
 * An ordered set of PlanSteps designed to achieve an AdvisorGoal.
 */
export interface ActionPlan {
  /** Unique plan ID */
  id: string;

  /** Goal this plan serves */
  goalId: string;

  /** Ordered steps */
  steps: PlanStep[];

  /** Overall plan status */
  status: "draft" | "active" | "paused" | "completed" | "abandoned";

  /** Progress: 0-100 (% of steps completed) */
  progress: number;

  /** Estimated total impact */
  estimatedImpact: "low" | "medium" | "high";

  /** When the plan was created */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — EXECUTION RESULTS
// ═══════════════════════════════════════════════════════════

/**
 * Result of executing a single PlanStep.
 */
export interface PlanExecutionResult {
  /** Step that was executed */
  stepId: string;

  /** Did it succeed? */
  success: boolean;

  /** Output from the tool (if success) */
  output?: unknown;

  /** Error message (if failed) */
  error?: string;

  /** Execution timestamp */
  executedAt: number;

  /** Duration in milliseconds */
  duration: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — AUTONOMOUS ADVISOR STATE
// ═══════════════════════════════════════════════════════════

/**
 * State shape for the autonomous advisor hook.
 * Tracks goals, plans, and active executions.
 */
export interface AutonomousAdvisorState {
  /** All derived goals */
  goals: AdvisorGoal[];

  /** Plans keyed by goalId */
  plans: Map<string, ActionPlan>;

  /** Step IDs currently executing */
  activeExecutions: Set<string>;

  /** Steps waiting for HITL/SEMI approval */
  pendingApprovals: PlanStep[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — GOAL DISPLAY CONFIG
// ═══════════════════════════════════════════════════════════

/**
 * Display configuration for goal priority badges.
 * Follows same pattern as IMPACT_CONFIG and SEVERITY_CONFIG.
 */
export const GOAL_PRIORITY_CONFIG: Record<
  GoalPriority,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: "CRÍTICO",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  high: {
    label: "ALTO",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
  },
  medium: {
    label: "MEDIO",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
  },
  low: {
    label: "BAJO",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 8%, transparent)",
  },
};

/**
 * Display configuration for goal status badges.
 */
export const GOAL_STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "Pendiente",
    color: "var(--color-silver-400)",
    bgColor: "rgba(255,255,255,0.04)",
  },
  planning: {
    label: "Planificando",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
  },
  executing: {
    label: "Ejecutando",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 8%, transparent)",
  },
  achieved: {
    label: "Logrado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  blocked: {
    label: "Bloqueado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
  },
  abandoned: {
    label: "Abandonado",
    color: "var(--color-silver-500)",
    bgColor: "rgba(255,255,255,0.03)",
  },
};

/**
 * Display configuration for plan step status badges.
 */
export const STEP_STATUS_CONFIG: Record<
  PlanStepStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "Pendiente",
    color: "var(--color-silver-400)",
    bgColor: "rgba(255,255,255,0.04)",
  },
  awaiting_approval: {
    label: "Esperando aprobación",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
  },
  approved: {
    label: "Aprobado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 8%, transparent)",
  },
  executing: {
    label: "Ejecutando",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  done: {
    label: "Completado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  failed: {
    label: "Fallido",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
  },
  skipped: {
    label: "Omitido",
    color: "var(--color-silver-500)",
    bgColor: "rgba(255,255,255,0.03)",
  },
};