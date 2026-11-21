// src/shared/components/ai/PlanExecutionDashboard.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Plan Execution Dashboard
// Mission Control Glass — Fase 23 AI
//
// Visualizes autonomous advisor goals as a mission control
// console. Execution rings, flow-animated pipelines,
// inline approval gates, autonomy gauge.
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  SkipForward,
  XCircle,
  Play,
  Shield,
  Activity,
  Loader2,
  Gauge,
  Eye,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useAutonomousAdvisor } from "@/shared/hooks/useAutonomousAdvisor";
import type {
  AdvisorGoal,
  ActionPlan,
  PlanStep,
} from "@/shared/lib/advisor-engine/intent-types";
import {
  GOAL_PRIORITY_CONFIG,
  GOAL_STATUS_CONFIG,
  STEP_STATUS_CONFIG,
} from "@/shared/lib/advisor-engine/intent-types";
import {
  getGoalTimeRemaining,
  getEffectivePriority,
} from "@/shared/lib/advisor-engine/goal-engine";
import { computePlanProgress } from "@/shared/lib/advisor-engine/plan-builder";
import { PlanStepApprovalModal } from "@/shared/components/ui/PlanStepApprovalModal";
import './PlanExecutionDashboard.css';

// ═══════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════

function usePlanExecutionDashboard(
  advisor: ReturnType<typeof useAutonomousAdvisor>,
) {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [approvalStep, setApprovalStep] = useState<PlanStep | null>(null);

  const { goals, plans } = advisor;

  /* Derived data */
  const activeGoals = useMemo(
    () => goals.filter((g) => g.status !== "abandoned"),
    [goals],
  );

  const sortedGoals = useMemo(() => {
    const pw: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const sw: Record<string, number> = {
      blocked: 0,
      executing: 1,
      pending: 2,
      achieved: 3,
    };
    return [...activeGoals].sort((a, b) => {
      const p = (pw[a.priority] ?? 9) - (pw[b.priority] ?? 9);
      if (p !== 0) return p;
      return (sw[a.status] ?? 9) - (sw[b.status] ?? 9);
    });
  }, [activeGoals]);

  const achievedCount = useMemo(
    () => goals.filter((g) => g.status === "achieved").length,
    [goals],
  );

  const blockedCount = useMemo(
    () => goals.filter((g) => g.status === "blocked").length,
    [goals],
  );

  const autonomyScore = useMemo(() => {
    let total = 0;
    let auto = 0;
    plans.forEach((plan) => {
      plan.steps.forEach((step) => {
        total++;
        if (step.approvalLevel === "auto") auto++;
      });
    });
    return total > 0 ? Math.round((auto / total) * 100) : 0;
  }, [plans]);

  /* Actions */
  const toggleGoal = useCallback(
    (goalId: string) =>
      setExpandedGoal((prev) => (prev === goalId ? null : goalId)),
    [],
  );

  const handleExecuteNext = useCallback(
    async (goalId: string) => {
      if (!plans.has(goalId)) advisor.createPlan(goalId);
      await advisor.executeNextStep(goalId);
    },
    [plans, advisor],
  );

  const handleApprove = useCallback(
    (stepId: string) => {
      advisor.approveStep(stepId);
      /* Find owning goal and chain execution */
      for (const [goalId, plan] of plans) {
        if (plan.steps.some((s) => s.id === stepId)) {
          setTimeout(() => advisor.executeNextStep(goalId), 120);
          break;
        }
      }
    },
    [advisor, plans],
  );

  const handleModalApprove = useCallback(
    (stepId: string) => {
      handleApprove(stepId);
      setApprovalStep(null);
    },
    [handleApprove],
  );

  const handleSkip = useCallback(
    (stepId: string) => {
      advisor.skipStep(stepId);
    },
    [advisor],
  );

  return {
    sortedGoals,
    achievedCount,
    blockedCount,
    autonomyScore,
    expandedGoal,
    approvalStep,
    toggleGoal,
    handleExecuteNext,
    handleApprove,
    handleModalApprove,
    handleSkip,
    setApprovalStep,
    isExecuting: advisor.isExecuting,
    abandonGoal: advisor.abandonGoal,
    pendingApprovals: advisor.pendingApprovals,
    overdueGoals: advisor.overdueGoals,
    goals: advisor.goals,
    plans: advisor.plans,
  };
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

/* Execution Ring — SVG donut with animated fill */
function ExecutionRing({
  progress,
  size = 48,
  reduced,
}: {
  progress: number;
  size?: number;
  reduced: boolean;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress / 100);
  const color =
    progress >= 66
      ? "var(--color-emerald-400)"
      : progress >= 33
        ? "var(--color-teal-400)"
        : "var(--color-amber-400)";

  return (
    <svg
      className="glass-plan__ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Progreso ${progress}%`}
    >
      <circle
        className="glass-plan__ring-track"
        cx={size / 2}
        cy={size / 2}
        r={r}
      />
      <motion.circle
        className="glass-plan__ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeDasharray={c}
        initial={
          reduced ? { strokeDashoffset: offset } : { strokeDashoffset: c }
        }
        animate={{ strokeDashoffset: offset }}
        transition={{
          duration: reduced ? 0 : 0.8,
          ease: [0.16, 1, 0.3, 1],
        }}
      />
      <text className="glass-plan__ring-value" x={size / 2} y={size / 2}>
        {progress}%
      </text>
    </svg>
  );
}

/* Pipeline Node — single step in the timeline */
function PipelineNode({
  step,
  isLast,
  reduced,
  onApprove,
  onReview,
  onSkip,
}: {
  step: PlanStep;
  isLast: boolean;
  reduced: boolean;
  onApprove: (stepId: string) => void;
  onReview: (step: PlanStep) => void;
  onSkip: (stepId: string) => void;
}) {
  const cfg = STEP_STATUS_CONFIG[step.status];
  const isAwaiting = step.status === "awaiting_approval";
  const isExecuting = step.status === "executing";
  const isDone = step.status === "done";
  const isFailed = step.status === "failed";
  const isSkipped = step.status === "skipped";

  const Icon = isDone
    ? CheckCircle2
    : isFailed
      ? XCircle
      : isExecuting
        ? Loader2
        : isAwaiting
          ? Shield
          : step.status === "approved"
            ? Zap
            : isSkipped
              ? SkipForward
              : Clock;

  return (
    <div className="glass-plan__node">
      {/* Status dot */}
      <div
        className={cn(
          "glass-plan__node-dot",
          isDone && "glass-plan__node-dot--done",
          isExecuting && "glass-plan__node-dot--executing",
          isAwaiting && "glass-plan__node-dot--awaiting",
          isFailed && "glass-plan__node-dot--failed",
          isSkipped && "glass-plan__node-dot--skipped",
        )}
      />

      {/* Flow particles (executing → next node) */}
      {isExecuting && !isLast && !reduced && (
        <div className="glass-plan__flow">
          {[0, 0.4, 0.8].map((delay, i) => (
            <div
              key={i}
              className="glass-plan__flow-dot"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon
            className={cn(
              "w-3.5 h-3.5 flex-shrink-0",
              isExecuting && "animate-spin",
            )}
            style={{ color: cfg.color }}
          />
          <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
            {step.label}
          </span>
          <span
            className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium font-[family-name:var(--font-mono)]"
            style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
          >
            {cfg.label}
          </span>
          {step.approvalLevel !== "auto" && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium font-[family-name:var(--font-mono)] text-[var(--color-amber-400)] bg-[color-mix(in srgb,var(--color-amber-400)8%,transparent)]">
              <Shield className="w-2 h-2" />
              {step.approvalLevel}
            </span>
          )}
        </div>

        <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] mt-0.5 ml-[22px]">
          {step.server}.{step.tool}
        </p>

        {/* Approval gate */}
        {isAwaiting && (
          <div className="glass-plan__gate mt-2">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[var(--color-amber-400)]" />
                <span className="text-[10px] text-[var(--color-amber-400)] font-semibold font-[family-name:var(--font-mono)] uppercase tracking-wider">
                  Aprobación requerida
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="unstyled"
                  onClick={() => onReview(step)}
                  className="px-2 py-1 rounded text-[10px] font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)] transition-colors"
                >
                  <Eye className="w-3 h-3 inline mr-0.5 -mt-px" />
                  Revisar
                </Button>
                <Button
                  variant="unstyled"
                  onClick={() => onApprove(step.id)}
                  className="px-2.5 py-1 rounded text-[10px] font-semibold font-[family-name:var(--font-ui)] bg-[color-mix(in srgb,var(--color-amber-400)18%,transparent)] text-[var(--color-amber-400)] hover:bg-[color-mix(in srgb,var(--color-amber-400)28%,transparent)] transition-colors"
                >
                  Aprobar
                </Button>
                <Button
                  variant="unstyled"
                  onClick={() => onSkip(step.id)}
                  className="px-2 py-1 rounded text-[10px] font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-500)] hover:text-[var(--color-rose-400)] transition-colors"
                >
                  Omitir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {isFailed && step.result?.error && (
          <p className="text-[10px] text-[var(--color-rose-400)] mt-1 ml-[22px]">
            {step.result.error}
          </p>
        )}
      </div>
    </div>
  );
}

/* Goal Card — mission card with execution ring + expandable pipeline */
function GoalCard({
  goal,
  plan,
  isExpanded,
  onToggle,
  onExecuteNext,
  onAbandon,
  onApprove,
  onReview,
  onSkip,
  isExecuting,
  reduced,
}: {
  goal: AdvisorGoal;
  plan?: ActionPlan;
  isExpanded: boolean;
  onToggle: () => void;
  onExecuteNext: () => void;
  onAbandon: () => void;
  onApprove: (stepId: string) => void;
  onReview: (step: PlanStep) => void;
  onSkip: (stepId: string) => void;
  isExecuting: boolean;
  reduced: boolean;
}) {
  const priorityCfg = GOAL_PRIORITY_CONFIG[goal.priority];
  const statusCfg = GOAL_STATUS_CONFIG[goal.status];
  const progress = plan ? computePlanProgress(plan) : 0;
  const stepsDone =
    plan?.steps.filter(
      (s) => s.status === "done" || s.status === "skipped",
    ).length ?? 0;
  const stepsTotal = plan?.steps.length ?? 0;

  const timeRemaining = goal.deadline ? getGoalTimeRemaining(goal) : null;
  const isOverdue =
    goal.deadline &&
    getEffectivePriority(goal) === "critical" &&
    goal.status !== "achieved";

  return (
    <motion.div
      layout={!reduced}
      className={cn(
        "glass-plan__goal",
        goal.status === "executing" && "glass-plan__goal--active",
        goal.status === "blocked" && "glass-plan__goal--blocked",
        goal.status === "achieved" && "glass-plan__goal--achieved",
      )}
      style={{
        borderLeftColor: priorityCfg.color,
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
      }}
    >
      {/* ── Header (always visible) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer",
          "transition-colors hover:bg-white/[0.02]",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-teal-400)] focus-visible:outline-offset-[-2px]",
        )}
      >
        <ExecutionRing progress={progress} reduced={reduced} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-[family-name:var(--font-mono)]"
              style={{
                color: priorityCfg.color,
                backgroundColor: priorityCfg.bgColor,
              }}
            >
              {priorityCfg.label}
            </span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-mono)]"
              style={{
                color: statusCfg.color,
                backgroundColor: statusCfg.bgColor,
              }}
            >
              {goal.status === "executing" && (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              )}
              {statusCfg.label}
            </span>
          </div>
          <h4 className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
            {goal.title}
          </h4>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
              {stepsDone}/{stepsTotal} pasos
            </span>
            {timeRemaining && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold font-[family-name:var(--font-mono)]",
                  isOverdue
                    ? "text-[var(--color-rose-400)]"
                    : "text-[var(--color-amber-400)]",
                )}
              >
                <Clock className="w-2.5 h-2.5" />
                {timeRemaining}
                {isOverdue && (
                  <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
                )}
              </span>
            )}
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-silver-400)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)] flex-shrink-0" />
        )}
      </div>

      {/* ── Expanded body ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduced ? 0 : 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3">
              {/* Pipeline */}
              {plan && plan.steps.length > 0 ? (
                <div className="glass-plan__pipeline">
                  {plan.steps.map((step, idx) => (
                    <PipelineNode
                      key={step.id}
                      step={step}
                      isLast={idx === plan.steps.length - 1}
                      reduced={reduced}
                      onApprove={onApprove}
                      onReview={onReview}
                      onSkip={onSkip}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                    Plan no creado aún. Ejecuta el primer paso para generar.
                  </p>
                </div>
              )}

              {/* Metrics row */}
              <div className="glass-plan__metrics">
                <div className="glass-plan__metric">
                  <span className="glass-plan__metric-label">Gap</span>
                  <span className="glass-plan__metric-value">
                    {goal.gap}%
                  </span>
                </div>
                <div className="glass-plan__metric">
                  <span className="glass-plan__metric-label">Confianza</span>
                  <span className="glass-plan__metric-value text-[var(--color-teal-400)]">
                    {goal.calibratedConfidence}%
                  </span>
                </div>
                {plan && (
                  <div className="glass-plan__metric">
                    <span className="glass-plan__metric-label">
                      Autonomía
                    </span>
                    <span className="glass-plan__metric-value">
                      {Math.round(
                        (plan.steps.filter((s) => s.approvalLevel === "auto")
                          .length /
                          plan.steps.length) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              {goal.status !== "achieved" && goal.status !== "abandoned" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onExecuteNext}
                    disabled={isExecuting || goal.status === "blocked"}
                    icon={
                      isExecuting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )
                    }
                    className="min-h-[36px] text-xs"
                  >
                    {isExecuting ? "Ejecutando..." : "Siguiente paso"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAbandon}
                    disabled={isExecuting}
                    className="min-h-[36px] text-xs text-[var(--color-silver-500)] hover:text-[var(--color-rose-400)]"
                  >
                    Abandonar
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

interface PlanExecutionDashboardProps {
  advisor: ReturnType<typeof useAutonomousAdvisor>;
}

export function PlanExecutionDashboard({
  advisor,
}: PlanExecutionDashboardProps) {
  const reduced = useReducedMotion();
  const {
    sortedGoals,
    achievedCount,
    blockedCount,
    autonomyScore,
    expandedGoal,
    approvalStep,
    toggleGoal,
    handleExecuteNext,
    handleApprove,
    handleModalApprove,
    handleSkip,
    setApprovalStep,
    isExecuting,
    abandonGoal,
    pendingApprovals,
    overdueGoals,
    goals,
    plans,
  } = usePlanExecutionDashboard(advisor);

  /* ── Empty state ── */
  if (goals.length === 0) {
    return (
      <div className="glass-plan">
        <div className="glass-plan__glow" />
        <div className="relative z-10 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="glass-plan__kpi-icon-wrap"
              style={{
                background:
                  "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
              }}
            >
              <Target className="w-5 h-5 text-[var(--color-teal-400)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                Planes Autónomos
              </h3>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
                Mission Control
              </p>
            </div>
          </div>
          <div className="glass-plan__empty">
            <Target
              className="glass-plan__empty-icon w-12 h-12 text-[var(--color-silver-500)] mb-3"
              strokeWidth={1}
            />
            <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
              Sin objetivos derivados aún.
            </p>
            <p className="text-xs text-[var(--color-silver-500)] mt-1 max-w-[280px]">
              El Advisor necesita insights activos para generar objetivos
              autónomos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fadeUp = reduced
    ? undefined
    : ({
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      } as const);

  const autonomyColor =
    autonomyScore >= 66
      ? "var(--color-emerald-400)"
      : autonomyScore >= 33
        ? "var(--color-teal-400)"
        : "var(--color-amber-400)";

  return (
    <>
      <div className="glass-plan">
        <div className="glass-plan__glow" />

        <div className="relative z-10 p-5 space-y-4">
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="glass-plan__kpi-icon-wrap"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
                }}
              >
                <Target className="w-5 h-5 text-[var(--color-teal-400)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                  Planes Autónomos
                </h3>
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
                  Mission Control
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {overdueGoals.length > 0 && (
                <motion.span
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold font-[family-name:var(--font-mono)] bg-[color-mix(in srgb,var(--color-rose-400)12%,transparent)] text-[var(--color-rose-400)]"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {overdueGoals.length} vencido
                  {overdueGoals.length > 1 ? "s" : ""}
                </motion.span>
              )}
              {pendingApprovals.length > 0 && (
                <motion.span
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold font-[family-name:var(--font-mono)] bg-[color-mix(in srgb,var(--color-amber-400)12%,transparent)] text-[var(--color-amber-400)]"
                >
                  <Shield className="w-3 h-3 animate-pulse" />
                  {pendingApprovals.length} HITL
                </motion.span>
              )}
            </div>
          </div>

          {/* ── KPI Strip + Autonomy ── */}
          <motion.div {...(fadeUp ?? {})} className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(
                [
                  {
                    icon: Activity,
                    label: "Objetivos",
                    value: sortedGoals.length,
                    color: "var(--color-silver-400)",
                  },
                  {
                    icon: CheckCircle2,
                    label: "Logrados",
                    value: achievedCount,
                    color: "var(--color-emerald-400)",
                  },
                  {
                    icon: AlertTriangle,
                    label: "Bloqueados",
                    value: blockedCount,
                    color: "var(--color-rose-400)",
                  },
                  {
                    icon: Shield,
                    label: "HITL",
                    value: pendingApprovals.length,
                    color: "var(--color-amber-400)",
                  },
                ] as const
              ).map((kpi, idx) => (
                <motion.div
                  key={kpi.label}
                  className="glass-plan__kpi"
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: reduced ? 0 : idx * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div
                    className={cn(
                      "glass-plan__kpi-glow",
                      kpi.label === "Objetivos" && "glass-plan__kpi-glow--silver",
                      kpi.label === "Logrados" && "glass-plan__kpi-glow--emerald",
                      kpi.label === "Bloqueados" && "glass-plan__kpi-glow--rose",
                      kpi.label === "HITL" && "glass-plan__kpi-glow--amber",
                    )}
                  />
                  <div className="relative z-10 flex items-center gap-2.5">
                    <kpi.icon
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: kpi.color }}
                    />
                    <div>
                      <p className="text-[9px] text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-mono)]">
                        {kpi.label}
                      </p>
                      <p
                        className="text-lg font-semibold font-[family-name:var(--font-mono)]"
                        style={{ color: kpi.color }}
                      >
                        {kpi.value}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Autonomy gauge */}
            <motion.div
              className="glass-plan__kpi"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: reduced ? 0 : 0.24,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="relative z-10 flex items-center gap-3">
                <Gauge
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: autonomyColor }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-mono)]">
                      Nivel de autonomía
                    </span>
                    <span
                      className="text-[10px] font-semibold font-[family-name:var(--font-mono)]"
                      style={{ color: autonomyColor }}
                    >
                      {autonomyScore}%
                    </span>
                  </div>
                  <div className="glass-plan__autonomy">
                    <motion.div
                      className="glass-plan__autonomy-fill"
                      style={{ background: autonomyColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${autonomyScore}%` }}
                      transition={{
                        duration: reduced ? 0 : 0.8,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Goal list ── */}
          <div className="space-y-2.5">
            {sortedGoals.map((goal, idx) => (
              <motion.div
                key={goal.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: reduced ? 0 : 0.3 + idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <GoalCard
                  goal={goal}
                  plan={plans.get(goal.id)}
                  isExpanded={expandedGoal === goal.id}
                  onToggle={() => toggleGoal(goal.id)}
                  onExecuteNext={() => handleExecuteNext(goal.id)}
                  onAbandon={() => abandonGoal(goal.id)}
                  onApprove={handleApprove}
                  onReview={setApprovalStep}
                  onSkip={handleSkip}
                  isExecuting={isExecuting}
                  reduced={reduced}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Approval Modal (review path) ── */}
      <PlanStepApprovalModal
        isOpen={!!approvalStep}
        onClose={() => setApprovalStep(null)}
        onApprove={handleModalApprove}
        onSkip={(stepId) => {
          handleSkip(stepId);
          setApprovalStep(null);
        }}
        step={approvalStep}
        goal={
          approvalStep
            ? goals.find((g) => g.id === approvalStep.goalId) ?? null
            : null
        }
      />
    </>
  );
}