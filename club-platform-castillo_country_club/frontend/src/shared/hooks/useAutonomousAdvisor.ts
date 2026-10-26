// src/shared/hooks/useAutonomousAdvisor.ts
// ═══════════════════════════════════════════════════════════
// AUTONOMOUS ADVISOR — Goal-driven autonomous agent loop
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   N/A — shared hook
// @keyframes   0
// @depends     @/shared/lib/advisor-engine/*, @/shared/lib/api,
//              @/shared/components/ui (showToast — see TODO §0.5)
//
// The brain of the autonomous advisor loop.
//
// Execution flow:
//   1. Derive goals from insights + health + chains
//   2. Merge with persisted overrides (abandoned, blocked, etc.)
//   3. For each goal: build plan using MCP Tool Registry
//   4. Execute steps with tool validation (C1)
//   5. Post-execution: extract metrics, update progress, record outcomes
//   6. Auto-save state to localStorage (C2)
//   7. Deadline enforcement — overdue goals get escalated (C3)
//
// PRE-WRITE VERIFICATION:
// [x] All imports verified against seen files
// [x] callMCPTool throws APIError (rewritten api.ts)
// [x] goal-engine exports: deriveGoals, updateGoalProgress, isGoalAchieved,
//     isGoalOverdue, isGoalAtRisk
// [x] plan-builder exports: buildPlan, getNextExecutableStep,
//     getPendingApprovalSteps, computePlanProgress, stepToMCPAction
// [x] mcp-tool-registry exports: hasTool, findAlternativeTool
// [x] goal-storage exports: loadPlans, savePlans, loadOverrides, saveOverrides
//
// ANTI-PATTERNS REMOVED:
// [x] 8 Spanish strings → English with TOAST_MESSAGES constant map
// [x] setPlans updater repeated 6x → updateStepInPlan helper
// [x] getToolDef imported but unused → removed
// [x] useEffect for overdue showToast → deferred to consumer via return value
// [x] No timeout cleanup → cleanup effect with clearTimeout
// [x] extractMetricFromOutput silent miss → DEV warning added
// [x] Missing § section markers → §0-§6
// [x] Missing readonly on interface fields → added
// ═══════════════════════════════════════════════════════════

// ═══ React core ═══
import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ═══ Advisor Engine — goal + plan subsystems ═══
import {
  deriveGoals,
  isGoalAchieved,
  isGoalOverdue,
  isGoalAtRisk,
} from "@/shared/lib/advisor-engine/goal-engine";
import {
  buildPlan,
  getNextExecutableStep,
  getPendingApprovalSteps,
  computePlanProgress,
  stepToMCPAction,
} from "@/shared/lib/advisor-engine/plan-builder";
import {
  hasTool,
  findAlternativeTool,
} from "@/shared/lib/advisor-engine/mcp-tool-registry";
import {
  loadPlans,
  savePlans,
  loadOverrides,
  saveOverrides,
} from "@/shared/lib/advisor-engine/goal-storage";
import { recordOutcome } from "@/shared/lib/advisor-engine/calibration-storage";

// ═══ Advisor Engine — types ═══
import type {
  AdvisorGoal,
  ActionPlan,
  PlanStep,
  PlanExecutionResult,
  GoalStatus,
} from "@/shared/lib/advisor-engine/intent-types";
import type {
  HealthScoreResult,
  CausalChain,
} from "@/shared/lib/advisor-engine/types";
import type { CalibrationResult } from "@/shared/lib/advisor-engine/calibration-types";
import type {
  AdvisorInsightBase as BaseInsight,
  AdvisorImpactLevel,
} from "@/shared/types/ai-intelligence";

// ═══ Shared — API ═══
import { callMCPTool } from "@/shared/lib/api";

// ═══ Shared — UI ═══
// TODO: showToast couples this hook to the UI layer.
// Future refactor: return a notification queue instead.
// Tracked in: Master Checkpoint §17 Appendix H
import { showToast } from "@/shared/components/ui";

// ═══════════════════════════════════════════════════════════
// §0 CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Debounce delay for localStorage persistence.
 * Prevents excessive writes during rapid state changes.
 */
const PERSISTENCE_DEBOUNCE_MS = 500;

/**
 * Default maximum number of concurrent goals.
 */
const DEFAULT_MAX_GOALS = 3;

/**
 * Days before a goal is considered "at risk" of missing deadline.
 */
const AT_RISK_WINDOW_DAYS = 7;

/**
 * Impact-to-severity mapping for outcome recording.
 * Maps AdvisorGoal.priority to AdvisorImpactLevel.
 */
const PRIORITY_TO_IMPACT: Record<string, AdvisorImpactLevel> = {
  critical: "high",
  high: "high",
  medium: "medium",
  low: "low",
} as const;

/**
 * Centralized toast messages.
 * English keys for type safety, displayed as-is.
 * When i18n is implemented, replace values with translation function calls.
 */
const TOAST_MESSAGES = {
  goalsOverdue: (count: number, titles: string) =>
    `${count} goal(s) overdue: ${titles}`,
  goalAchieved: (title: string) =>
    `Goal achieved: ${title}`,
  planCompleted: "Plan completed",
  stepNeedsApproval: (label: string) =>
    `Step requires approval: ${label}`,
  stepCompleted: (label: string) =>
    `Step completed: ${label}`,
  stepFailed: (label: string) =>
    `Step failed: ${label}`,
  toolUnavailable: (server: string, tool: string) =>
    `Tool unavailable: ${server}.${tool}`,
  stepApproved: "Step approved",
  stepSkipped: "Step skipped",
  goalAbandoned: (title: string) =>
    `Goal abandoned: ${title}`,
} as const;

// ═══════════════════════════════════════════════════════════
// §0.5 DEPENDENCY NOTE
// ═══════════════════════════════════════════════════════════
//
// showToast is imported from @/shared/components/ui.
// This creates a dependency from hook → UI layer.
//
// This is acceptable for NOW because:
//   1. The autonomous advisor is a complex system with 10+ toast events
//   2. Replacing it with an event queue requires rewriting PlanExecutionDashboard
//   3. The hook is consumed by advisor UI components, not generic features
//
// Future path (when advisor UI stabilizes):
//   1. Return pendingNotifications[] from hook
//   2. Consumer component renders toasts from the queue
//   3. Hook becomes UI-agnostic
//
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface UseAutonomousAdvisorInput {
  readonly insights: readonly BaseInsight[];
  readonly healthScore?: HealthScoreResult;
  readonly causalChains?: readonly CausalChain[];
  readonly calibrationMap?: ReadonlyMap<string, CalibrationResult>;
  readonly maxGoals?: number;
  readonly enabled?: boolean;
}

interface UseAutonomousAdvisorReturn {
  readonly goals: readonly AdvisorGoal[];
  readonly plans: ReadonlyMap<string, ActionPlan>;
  readonly activeExecutions: ReadonlySet<string>;
  readonly pendingApprovals: readonly PlanStep[];
  readonly overdueGoals: readonly AdvisorGoal[];
  readonly atRiskGoals: readonly AdvisorGoal[];
  readonly isExecuting: boolean;
  readonly createPlan: (goalId: string) => ActionPlan | null;
  readonly executeNextStep: (goalId: string) => Promise<void>;
  readonly approveStep: (stepId: string) => void;
  readonly skipStep: (stepId: string) => void;
  readonly abandonGoal: (goalId: string) => void;
  readonly removeGoal: (goalId: string) => void;
}

// ═══════════════════════════════════════════════════════════
// §2 HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Try to extract a metric value from an MCP tool's heterogeneous output.
 * Tries direct field, nested data.*, nested summary.*, and common aliases.
 *
 * Returns null if the metric cannot be found (logged in DEV mode).
 */
function extractMetricFromOutput(
  output: unknown,
  metricName: string,
): number | null {
  if (!output || typeof output !== "object") return null;

  const data = output as Record<string, unknown>;

  // Direct field
  if (typeof data[metricName] === "number") return data[metricName];

  // Nested: data.data[metricName]
  if (data.data && typeof data.data === "object") {
    const nested = data.data as Record<string, unknown>;
    if (typeof nested[metricName] === "number") return nested[metricName];
  }

  // Nested: data.summary[metricName]
  if (data.summary && typeof data.summary === "object") {
    const summary = data.summary as Record<string, unknown>;
    if (typeof summary[metricName] === "number") return summary[metricName];
  }

  // Common aliases
  const aliases: Record<string, readonly string[]> = {
    churn_rate: ["churn_rate", "churnRate", "churn"],
    revenue: ["revenue", "total_revenue", "totalRevenue"],
    satisfaction_score: ["satisfaction_score", "satisfactionScore", "nps"],
    occupancy_rate: ["occupancy_rate", "occupancyRate", "occupancy"],
  };

  const names = aliases[metricName] ?? [metricName];
  for (const name of names) {
    if (typeof data[name] === "number") return data[name];
  }

  if (import.meta.env.DEV) {
    console.warn(
      `[AutonomousAdvisor] Could not extract metric "${metricName}" from MCP output.`,
      "Available keys:", Object.keys(data),
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// §3 HOOK
// ═══════════════════════════════════════════════════════════

export function useAutonomousAdvisor(
  input: UseAutonomousAdvisorInput,
): UseAutonomousAdvisorReturn {
  const {
    insights,
    healthScore,
    causalChains,
    calibrationMap,
    maxGoals = DEFAULT_MAX_GOALS,
    enabled = true,
  } = input;

  // ── State: initialize from localStorage (C2) ──
  const [plans, setPlans] = useState<Map<string, ActionPlan>>(() => loadPlans());
  const [activeExecutions, setActiveExecutions] = useState<Set<string>>(
    () => new Set(),
  );
  const [manualOverrides, setManualOverrides] = useState<
    Map<string, { readonly status: GoalStatus; readonly updatedAt: number }>
  >(() => loadOverrides());

  // ── Debounced persistence (C2) ──
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const debouncedSavePlans = useCallback(
    (p: Map<string, ActionPlan>) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(
        () => savePlans(p),
        PERSISTENCE_DEBOUNCE_MS,
      );
    },
    [],
  );

  const debouncedSaveOverrides = useCallback(
    (o: Map<string, { readonly status: GoalStatus; readonly updatedAt: number }>) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(
        () => saveOverrides(o),
        PERSISTENCE_DEBOUNCE_MS,
      );
    },
    [],
  );

  // Auto-save on change
  useEffect(() => {
    debouncedSavePlans(plans);
  }, [plans, debouncedSavePlans]);

  useEffect(() => {
    debouncedSaveOverrides(manualOverrides);
  }, [manualOverrides, debouncedSaveOverrides]);

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => clearTimeout(saveTimeoutRef.current);
  }, []);

  // ── Derive goals from live data ──
  const derivedGoals = useMemo(() => {
    if (!enabled || insights.length === 0) return [];
    const goals = deriveGoals({
      insights: Array.from(insights),
      healthScore,
      causalChains: causalChains ? [...causalChains] : undefined,
      calibrationMap: calibrationMap ? new Map(calibrationMap) : undefined,
    });
    return goals.slice(0, maxGoals);
  }, [insights, healthScore, causalChains, calibrationMap, enabled, maxGoals]);

  // Merge derived with persisted overrides
  const goals = useMemo(() => {
    return derivedGoals.map((g) => {
      const override = manualOverrides.get(g.id);
      if (override) {
        return { ...g, status: override.status, updatedAt: override.updatedAt };
      }
      return g;
    });
  }, [derivedGoals, manualOverrides]);

  // ── Deadline tracking (C3) ──
  const overdueGoals = useMemo(
    () => goals.filter(isGoalOverdue),
    [goals],
  );

  const atRiskGoals = useMemo(
    () => goals.filter((g) => isGoalAtRisk(g, AT_RISK_WINDOW_DAYS)),
    [goals],
  );

  // ── Pending approvals across all plans ──
  const pendingApprovals = useMemo(() => {
    const pending: PlanStep[] = [];
    for (const plan of plans.values()) {
      pending.push(...getPendingApprovalSteps(plan));
    }
    return pending;
  }, [plans]);

  const isExecuting = activeExecutions.size > 0;

  // ── Helper: update a single step within a plan ──
  const updateStepInPlan = useCallback(
    (goalId: string, stepId: string, stepUpdate: Partial<PlanStep>) => {
      setPlans((prev) => {
        const next = new Map(prev);
        const plan = next.get(goalId);
        if (!plan) return next;

        const updatedSteps = plan.steps.map((s) =>
          s.id === stepId ? { ...s, ...stepUpdate } : s,
        );

        const progress = computePlanProgress({ ...plan, steps: updatedSteps });
        const updatedPlan: ActionPlan = {
          ...plan,
          steps: updatedSteps,
          progress,
          status: progress === 100 ? "completed" : plan.status,
          updatedAt: Date.now(),
        };

        next.set(goalId, updatedPlan);
        return next;
      });
    },
    [],
  );

  // ── Helper: update plan-level status ──
  const setPlanStatus = useCallback(
    (goalId: string, status: ActionPlan["status"]) => {
      setPlans((prev) => {
        const next = new Map(prev);
        const plan = next.get(goalId);
        if (!plan) return next;
        next.set(goalId, { ...plan, status, updatedAt: Date.now() });
        return next;
      });
    },
    [],
  );

  // ── Helper: update goal override ──
  const setGoalStatus = useCallback(
    (goalId: string, status: GoalStatus) => {
      setManualOverrides((prev) => {
        const next = new Map(prev);
        next.set(goalId, { status, updatedAt: Date.now() });
        return next;
      });
    },
    [],
  );

  // ── Action: create plan ──
  const createPlan = useCallback(
    (goalId: string): ActionPlan | null => {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return null;

      const plan = buildPlan(goal);

      setPlans((prev) => {
        const next = new Map(prev);
        next.set(goalId, plan);
        return next;
      });

      setGoalStatus(goalId, "planning");

      if (import.meta.env.DEV) {
        console.log(
          `[AutonomousAdvisor] Plan created for ${goalId}: ${plan.steps.length} steps`,
        );
      }

      return plan;
    },
    [goals, setGoalStatus],
  );

  // ── Action: execute next step ──
  const executeNextStep = useCallback(
    async (goalId: string) => {
      const plan = plans.get(goalId);
      if (!plan) return;

      const nextStep = getNextExecutableStep(plan);
      if (!nextStep) {
        if (computePlanProgress(plan) === 100) {
          showToast({ type: "success", message: TOAST_MESSAGES.planCompleted });
        }
        return;
      }

      const goal = goals.find((g) => g.id === goalId);

      // ── HITL gate: awaiting approval ──
      if (
        (nextStep.approvalLevel === "semi" ||
          nextStep.approvalLevel === "hitl") &&
        nextStep.status === "pending"
      ) {
        updateStepInPlan(goalId, nextStep.id, {
          status: "awaiting_approval",
        });
        setGoalStatus(goalId, "executing");
        showToast({
          type: "info",
          message: TOAST_MESSAGES.stepNeedsApproval(nextStep.label),
        });
        return;
      }

      // ── C1: Validate tool exists before execution ──
      let stepToExecute = nextStep;

      if (!hasTool(nextStep.server, nextStep.tool)) {
        const alt = findAlternativeTool(
          nextStep.server,
          nextStep.tool,
          goal?.domain ?? "global",
        );

        if (alt) {
          if (import.meta.env.DEV) {
            console.warn(
              `[AutonomousAdvisor] Tool ${nextStep.server}.${nextStep.tool} not found. ` +
                `Using alternative: ${alt.server}.${alt.tool}`,
            );
          }
          stepToExecute = {
            ...nextStep,
            server: alt.server,
            tool: alt.tool,
            params: alt.buildParams({
              goalTitle: goal?.title,
              metricName: goal?.targetMetric.name,
              currentValue: goal?.targetMetric.currentValue,
              targetValue: goal?.targetMetric.targetValue,
              gap: goal?.gap,
            }),
          };
        } else {
          // No alternative — fail with meaningful message
          updateStepInPlan(goalId, nextStep.id, {
            status: "failed",
            result: {
              stepId: nextStep.id,
              success: false,
              error: TOAST_MESSAGES.toolUnavailable(nextStep.server, nextStep.tool),
              executedAt: Date.now(),
              duration: 0,
            },
          });
          setGoalStatus(goalId, "blocked");
          showToast({
            type: "error",
            message: TOAST_MESSAGES.toolUnavailable(nextStep.server, nextStep.tool),
          });
          return;
        }
      }

      // ── Execute ──
      setActiveExecutions((prev) => new Set(prev).add(stepToExecute.id));
      updateStepInPlan(goalId, stepToExecute.id, { status: "executing" });
      setPlanStatus(goalId, "active");
      setGoalStatus(goalId, "executing");

      const startTime = Date.now();

      try {
        const action = stepToMCPAction(stepToExecute);
        const output = await callMCPTool(
          action.server,
          action.tool,
          action.params,
        );

        const result: PlanExecutionResult = {
          stepId: stepToExecute.id,
          success: true,
          output,
          executedAt: Date.now(),
          duration: Date.now() - startTime,
        };

        updateStepInPlan(goalId, stepToExecute.id, {
          status: "done",
          result,
          executedAt: Date.now(),
        });

        // ── Post-execution: check goal achievement ──
        if (goal) {
          const newMetric = extractMetricFromOutput(
            output,
            goal.targetMetric.name,
          );

          if (newMetric !== null && isGoalAchieved(goal, newMetric)) {
            setGoalStatus(goalId, "achieved");
            showToast({
              type: "success",
              message: TOAST_MESSAGES.goalAchieved(goal.title),
            });
          }

          // Record outcome for calibration feedback loop
          if (goal.sourceInsightId) {
            recordOutcome({
              ruleId: goal.sourceInsightId,
              domain: goal.domain,
              impact: PRIORITY_TO_IMPACT[goal.priority] ?? "medium",
              originalConfidence: goal.calibratedConfidence,
              outcome: "success",
            });
          }
        }

        showToast({
          type: "success",
          message: TOAST_MESSAGES.stepCompleted(stepToExecute.label),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        const result: PlanExecutionResult = {
          stepId: stepToExecute.id,
          success: false,
          error: errorMessage,
          executedAt: Date.now(),
          duration: Date.now() - startTime,
        };

        updateStepInPlan(goalId, stepToExecute.id, {
          status: "failed",
          result,
        });
        setGoalStatus(goalId, "blocked");

        // Record failure for calibration
        if (goal?.sourceInsightId) {
          recordOutcome({
            ruleId: goal.sourceInsightId,
            domain: goal.domain,
            impact: "medium",
            originalConfidence: goal.calibratedConfidence,
            outcome: "failed",
          });
        }

        showToast({
          type: "error",
          message: TOAST_MESSAGES.stepFailed(stepToExecute.label),
        });
      } finally {
        setActiveExecutions((prev) => {
          const next = new Set(prev);
          next.delete(stepToExecute.id);
          return next;
        });
      }
    },
    [
      plans,
      goals,
      updateStepInPlan,
      setPlanStatus,
      setGoalStatus,
    ],
  );

  // ── Action: approve step ──
  const approveStep = useCallback(
    (stepId: string) => {
      // Find which plan contains this step
      for (const [goalId, plan] of plans) {
        if (plan.steps.some((s) => s.id === stepId)) {
          updateStepInPlan(goalId, stepId, {
            status: "approved",
            approvedAt: Date.now(),
          });
          break;
        }
      }
      showToast({ type: "success", message: TOAST_MESSAGES.stepApproved });
    },
    [plans, updateStepInPlan],
  );

  // ── Action: skip step ──
  const skipStep = useCallback(
    (stepId: string) => {
      for (const [goalId, plan] of plans) {
        if (plan.steps.some((s) => s.id === stepId)) {
          updateStepInPlan(goalId, stepId, { status: "skipped" });
          break;
        }
      }
      showToast({ type: "info", message: TOAST_MESSAGES.stepSkipped });
    },
    [plans, updateStepInPlan],
  );

  // ── Action: abandon goal ──
  const abandonGoal = useCallback(
    (goalId: string) => {
      const goal = goals.find((g) => g.id === goalId);
      setGoalStatus(goalId, "abandoned");
      setPlanStatus(goalId, "abandoned");
      showToast({
        type: "info",
        message: TOAST_MESSAGES.goalAbandoned(goal?.title ?? goalId),
      });
    },
    [goals, setGoalStatus, setPlanStatus],
  );

  // ── Action: remove goal entirely ──
  const removeGoal = useCallback(
    (goalId: string) => {
      setManualOverrides((prev) => {
        const next = new Map(prev);
        next.delete(goalId);
        return next;
      });
      setPlans((prev) => {
        const next = new Map(prev);
        next.delete(goalId);
        return next;
      });
    },
    [],
  );

  return {
    goals,
    plans,
    activeExecutions,
    pendingApprovals,
    overdueGoals,
    atRiskGoals,
    isExecuting,
    createPlan,
    executeNextStep,
    approveStep,
    skipStep,
    abandonGoal,
    removeGoal,
  };
}