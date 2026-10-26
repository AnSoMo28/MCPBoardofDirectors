// src/shared/lib/advisor-engine/plan-builder.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Plan Builder (F51)
//
// Decomposes an AdvisorGoal into an ActionPlan with
// ordered PlanSteps. Resolves dependencies via topological
// sort and determines which steps can execute immediately
// (auto) vs need HITL approval.
//
// Plan building logic:
//   Goal → identify required actions → create PlanSteps
//   → resolve dependencies (DAG) → assign approval levels
//   → compute progress tracking
//
// Step templates are domain-specific but follow a common
// pattern: query → analyze → act → verify.
//
// Depends on:
//   ./intent-types (AdvisorGoal, ActionPlan, PlanStep, etc.)
//   @/shared/lib/api (callMCPTool — for step-to-action mapping)
// ═══════════════════════════════════════════════════════════

import type {
  AdvisorGoal,
  ActionPlan,
  PlanStep,
  PlanStepStatus,
} from "./intent-types";
import { resolvePlanTools } from "./mcp-tool-registry";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — PLAN BUILDING
// ═══════════════════════════════════════════════════════════

/**
 * Build an ActionPlan for an AdvisorGoal.
 *
 * Strategy: create a query-analyze-act-verify pipeline
 * tailored to the goal's domain, then assign approval
 * levels based on risk.
 */
export function buildPlan(goal: AdvisorGoal): ActionPlan {
  const steps = buildStepsForGoal(goal);
  const resolved = resolveStepDependencies(steps);

  return {
    id: `plan_${goal.id}`,
    goalId: goal.id,
    steps: resolved,
    status: "draft",
    progress: 0,
    estimatedImpact: estimatePlanImpact(resolved),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Build multiple plans for top-priority goals.
 * Returns plans for the first `limit` goals (default: 3).
 */
export function buildPlansForGoals(
  goals: AdvisorGoal[],
  limit: number = 3,
): ActionPlan[] {
  return goals.slice(0, limit).map(buildPlan);
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — STEP TEMPLATES (per domain)
// ═══════════════════════════════════════════════════════════

/**
 * Generate PlanSteps for a goal based on its domain and metrics.
 * Each domain has a default query → analyze → act → verify pipeline.
 */
function buildStepsForGoal(goal: AdvisorGoal): PlanStep[] {
  const resolved = resolvePlanTools(goal.domain, {
    goalTitle: goal.title,
    metricName: goal.targetMetric.name,
    currentValue: goal.targetMetric.currentValue,
    targetValue: goal.targetMetric.targetValue,
    gap: goal.gap,
  });

  return resolved.map((resolved, idx) => {
    const toolDef = resolved.tool;
    const params = toolDef.buildParams({
      goalTitle: goal.title,
      metricName: goal.targetMetric.name,
      currentValue: goal.targetMetric.currentValue,
      targetValue: goal.targetMetric.targetValue,
      gap: goal.gap,
    });

    return {
      id: `step_${goal.id}_${idx}`,
      goalId: goal.id,
      label: resolved.label,
      description: resolved.description,
      tool: toolDef.tool,
      server: toolDef.server,
      params,
      approvalLevel: toolDef.approvalLevel,
      status: "pending" as PlanStepStatus,
      dependencies: idx > 0 ? [`step_${goal.id}_${idx - 1}`] : [],
      estimatedImpact: toolDef.estimatedImpact,
      order: idx,
    };
  });
}


// ═══════════════════════════════════════════════════════════
// SECTION 4 — DEPENDENCY RESOLUTION
// ═══════════════════════════════════════════════════════════

/**
 * Resolve step dependencies via topological sort.
 * Ensures steps execute in correct order respecting the DAG.
 *
 * Currently all templates are sequential (linear chain).
 * This function handles parallel branches when future
 * templates introduce them.
 */
export function resolveStepDependencies(steps: PlanStep[]): PlanStep[] {
  // Build adjacency: stepId → depends on stepId[]
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const step of steps) {
    adjacency.set(step.id, step.dependencies);
    inDegree.set(step.id, step.dependencies.length);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    sorted.push(current);

    // Find steps that depend on current
    for (const [id, deps] of adjacency) {
      if (deps.includes(current)) {
        const newDegree = (inDegree.get(id) ?? 0) - 1;
        inDegree.set(id, newDegree);
        if (newDegree === 0 && !visited.has(id)) {
          queue.push(id);
        }
      }
    }
  }

  // Map sorted IDs back to steps with correct order
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  return sorted
    .map((id, idx) => {
      const step = stepMap.get(id);
      if (!step) return null;
      return { ...step, order: idx };
    })
    .filter(Boolean) as PlanStep[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — PLAN UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Get the next executable step from a plan.
 * A step is executable when:
 *   1. All dependencies are "done"
 *   2. Step status is "pending" (auto) or "approved" (semi/hitl)
 */
export function getNextExecutableStep(
  plan: ActionPlan,
): PlanStep | null {
  const completedSteps = new Set(
    plan.steps.filter((s) => s.status === "done").map((s) => s.id),
  );

  return (
    plan.steps.find((step) => {
      if (step.status !== "pending" && step.status !== "approved") return false;
      const depsMet = step.dependencies.every((dep) =>
        completedSteps.has(dep),
      );
      return depsMet;
    }) ?? null
  );
}

/**
 * Get steps awaiting HITL/SEMI approval.
 */
export function getPendingApprovalSteps(plan: ActionPlan): PlanStep[] {
  return plan.steps.filter(
    (s) =>
      s.status === "pending" &&
      (s.approvalLevel === "semi" || s.approvalLevel === "hitl") &&
      s.dependencies.every(
        (dep) => plan.steps.find((ds) => ds.id === dep)?.status === "done",
      ),
  );
}

/**
 * Compute plan progress: % of steps completed (done + skipped).
 */
export function computePlanProgress(plan: ActionPlan): number {
  if (plan.steps.length === 0) return 0;
  const completed = plan.steps.filter(
    (s) => s.status === "done" || s.status === "skipped",
  ).length;
  return Math.round((completed / plan.steps.length) * 100);
}

/**
 * Estimate overall plan impact based on step impacts.
 */
function estimatePlanImpact(
  steps: PlanStep[],
): "low" | "medium" | "high" {
  const hasHigh = steps.some((s) => s.estimatedImpact === "high");
  const hasMedium = steps.some((s) => s.estimatedImpact === "medium");
  if (hasHigh) return "high";
  if (hasMedium) return "medium";
  return "low";
}

/**
 * Convert a PlanStep to the format expected by callMCPTool.
 */
export function stepToMCPAction(step: PlanStep): {
  server: string;
  tool: string;
  params: Record<string, unknown>;
} {
  return {
    server: step.server,
    tool: step.tool,
    params: step.overriddenParams ?? step.params,
  };
}