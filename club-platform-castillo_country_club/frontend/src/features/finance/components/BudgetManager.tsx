// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Budget Manager
// Fase 19g REWRITE
//
// 5 innovations:
//   1. Glass Surface Transformation (summary + category)
//   2. Summary Gauge (semi-circular utilization gauge)
//   3. Budget Burn Rate (projection indicator)
//   4. Category Glass Lines (mobile cards with status glow)
//   5. Cancel icon fix (✕ text → Lucide X)
//
// Rules: #1 tokens, #8 formatCurrency, #11 focus-visible,
//   #12 touch, #15 toast, #17 Button, #18 reducedMotion,
//   #20 breakpoint, #21 responsive, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  PieChart as PieIcon, Edit3, Save, AlertTriangle,
  CheckCircle2, RefreshCw, X
} from "lucide-react";
import { Button, Skeleton, showToast } from "@/shared/components/ui";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, cn } from "@/shared/lib/utils";
import type {
  FinanceBudgetCheckResponse,
  FinanceCategoryUpdateResponse,
  BudgetLineData,
} from "@/shared/mocks/contracts";
import {
  BUDGET_PERIOD_CONFIG,
  EXPENSE_CATEGORY_CONFIG,
  BUDGET_UTILIZATION_CONFIG,
  getBudgetUtilizationStatus,
} from "../types";
import './BudgetManager.css';

/* ══════════════════════════════════════════════════════════
   Hooks
   ══════════════════════════════════════════════════════════ */

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : ({ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const),
    item: reduced
      ? undefined
      : ({ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}

/** Animated counter hook */
function useAnimatedCounter(
  target: number,
  duration = 600,
  reduced = false,
): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (reduced || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, reduced]);

  return value;
}

/* ══════════════════════════════════════════════════════════
   Semi-Circular Gauge (Propuesta 2)
   ══════════════════════════════════════════════════════════ */

function UtilizationGauge({
  pct,
  color,
  label,
}: {
  pct: number;
  color: string;
  label: string;
}) {
  const clamped = Math.min(pct, 120);
  // Semi-circle: 180 degrees = PI radians
  // Arc from 180° to 0° (left to right)
  const r = 52;
  const cx = 60;
  const cy = 58;
  const arcLength = Math.PI * r; // half circle
  const fillLength = (clamped / 100) * arcLength;

  return (
    <div className="glass-budget-gauge" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <svg width="120" height="68" viewBox="0 0 120 68" aria-hidden="true">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Fill arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${fillLength} ${arcLength - fillLength}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.33,1,0.68,1)" }}
        />
        {/* Center value */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          fill="var(--color-silver-100)"
          fontSize="18"
          fontWeight="bold"
          fontFamily="var(--font-display)"
        >
          {Math.round(pct)}%
        </text>
        <text
          x={cx} y={cy + 8}
          textAnchor="middle"
          fill={color}
          fontSize="9"
          fontWeight="600"
          fontFamily="var(--font-ui)"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Budget Burn Rate (Propuesta 3)
   ══════════════════════════════════════════════════════════ */

function BudgetBurnRate({
  spent,
  budgeted,
  periodProgress,
}: {
  spent: number;
  budgeted: number;
  periodProgress: number;
}) {
  if (budgeted <= 0) return null;

  const actualPct = (spent / budgeted) * 100;
  const projectedPct = periodProgress > 0 ? (actualPct / periodProgress) * 100 : actualPct;
  const isOver = actualPct > 100;
  const willExceed = projectedPct > 110 && periodProgress < 1;

  const barColor = isOver
    ? "var(--color-rose-400)"
    : actualPct > 90
      ? "var(--color-amber-400)"
      : "var(--color-emerald-400)";

  return (
    <div className="relative z-[1] mt-4 pt-3 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)] text-[var(--color-silver-500)]">
          Burn Rate
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium font-[family-name:var(--font-mono)]" style={{ color: barColor }}>
            {Math.round(actualPct)}% ejecutado
          </span>
          {willExceed && (
            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-rose-400)]">
              Proyección: {Math.round(projectedPct)}%
            </span>
          )}
        </div>
      </div>
      <div className="relative h-[6px] rounded-full bg-white/[0.06] overflow-visible">
        {/* Actual fill */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-600"
          style={{
            width: `${Math.min(100, actualPct)}%`,
            backgroundColor: barColor,
          }}
        />
        {/* Projection marker */}
        {periodProgress < 1 && projectedPct > actualPct && (
          <div
            className="absolute top-[-1px] h-[calc(100%+2px)] border-r-2 border-dashed rounded-r opacity-50"
            style={{
              left: `${Math.min(100, projectedPct)}%`,
              borderRightColor: willExceed ? "var(--color-rose-400)" : "var(--color-amber-400)",
            }}
          />
        )}
        {/* 100% threshold */}
        <div
          className="absolute top-[-4px] bottom-[-4px] w-px bg-[var(--color-amber-400)] opacity-40"
          style={{ left: "100%" }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">0%</span>
        <span className="text-[9px] text-[var(--color-amber-400)] font-[family-name:var(--font-mono)] opacity-60">100%</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function BudgetManager() {
  const motionV = useMotion();
  useBreakpoint();
  const reduced = useReducedMotion();

  // ── State ──

  const [period, setPeriod] = useState("quarterly");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // ── Query ──

  const budgetQ = useMCPQuery<FinanceBudgetCheckResponse>(
    "finance",
    "finance_budget_check",
    { period },
    { staleTime: 120_000 },
  );

  const budget = budgetQ.data?.data;

  // ── Mutation ──

  const updateMut = useMCPMutation<FinanceCategoryUpdateResponse>(
    "finance",
    "finance_category_update",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Presupuesto actualizado" });
        setEditingCategory(null);
        setEditValue("");
        budgetQ.refetch();
      },
      onError: (err) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al actualizar presupuesto" });
      },
    },
  );

  // ── Handlers ──

  const startEdit = useCallback((category: string, currentValue: number) => {
    setEditingCategory(category);
    setEditValue(String(currentValue));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCategory(null);
    setEditValue("");
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingCategory) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) {
      showToast({ type: "error", message: "El presupuesto debe ser un número positivo" });
      return;
    }
    updateMut.mutate({ category: editingCategory, budget_amount: val });
  }, [editingCategory, editValue, updateMut]);

  // ── Derived ──

  const totalBudgeted = budget?.total_budgeted ?? 0;
  const totalSpent = budget?.total_spent ?? 0;
  const totalUtilPct = budget?.utilization_pct ?? 0;
  const totalStatus = getBudgetUtilizationStatus(totalUtilPct);
  const totalStatusCfg = BUDGET_UTILIZATION_CONFIG[totalStatus];

  // Animated counters for summary KPIs
  const animBudgeted = useAnimatedCounter(totalBudgeted, 600, reduced);
  const animSpent = useAnimatedCounter(totalSpent, 600, reduced);
  const animRemaining = useAnimatedCounter(budget?.total_remaining ?? 0, 600, reduced);
  const animUtil = useAnimatedCounter(totalUtilPct, 600, reduced);

  // Period progress approximation
  const currentMonth = new Date().getMonth();
  const periodProgress = period === "monthly"
    ? 1
    : period === "quarterly"
      ? ((currentMonth % 3) + 1) / 3
      : (currentMonth + 1) / 12;

  // Summary glass variant
  const summaryVariant =
    totalStatus === "over" ? "glass-budget-summary--over" :
    totalStatus === "warning" ? "glass-budget-summary--warning" :
    "glass-budget-summary--healthy";

  // ── Render ──

  return (
    <motion.div
      variants={motionV.container}
      initial={false}
      animate="visible"
      className="space-y-6"
    >
      {/* Controls */}
      <motion.div variants={motionV.item}>
        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="budget-period"
            className="text-sm font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-400)]"
          >
            Período:
          </label>
          <select
            id="budget-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
              "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
              "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
              "min-h-[48px]",
            )}
          >
            {Object.entries(BUDGET_PERIOD_CONFIG).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>

          <Button
            variant="secondary"
            onClick={() => {
              budgetQ.refetch();
              showToast({ type: "info", message: "Presupuesto actualizado" });
            }}
            disabled={budgetQ.isLoading}
            icon={<RefreshCw className={cn("w-4 h-4", budgetQ.isLoading && "animate-spin")} />}
            className="text-xs"
          >
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Loading */}
      {budgetQ.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error — glass treatment */}
      {budgetQ.error && !budgetQ.isLoading && (
        <div className="glass-budget-summary p-6 text-center">
          <p className="relative z-[1] text-sm text-[var(--color-silver-400)]">
            No se pudo cargar el presupuesto.
          </p>
          <Button variant="secondary" onClick={() => budgetQ.refetch()} className="mt-3" icon={<RefreshCw className="w-4 h-4" />}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Content */}
      {budget && !budgetQ.isLoading && (
        <>
          {/* ═══════ Total Summary — GLASS + GAUGE + BURN RATE (Propuestas 1+2+3) ═══════ */}
          <motion.div variants={motionV.item}>
            <div className={cn("glass-budget-summary p-5", summaryVariant)}>
              <div className="relative z-[1]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                      Resumen Presupuestario
                    </h3>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                      Período: {BUDGET_PERIOD_CONFIG[period]?.label ?? period}
                    </p>
                  </div>
                  <UtilizationGauge
                    pct={animUtil}
                    color={totalStatusCfg.color}
                    label={totalStatusCfg.label}
                  />
                </div>

                {/* KPI grid — glass mini-cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="glass-budget-kpi">
                    <p className="relative z-[1] text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                      Presupuestado
                    </p>
                    <p className="relative z-[1] text-xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-200)]">
                      {formatCurrency(animBudgeted)}
                    </p>
                  </div>
                  <div className="glass-budget-kpi">
                    <p className="relative z-[1] text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                      Ejecutado
                    </p>
                    <p className="relative z-[1] text-xl font-bold font-[family-name:var(--font-display)]" style={{ color: totalStatusCfg.color }}>
                      {formatCurrency(animSpent)}
                    </p>
                  </div>
                  <div className="glass-budget-kpi">
                    <p className="relative z-[1] text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                      Restante
                    </p>
                    <p className="relative z-[1] text-xl font-bold font-[family-name:var(--font-display)]"
                      style={{ color: (budget.total_remaining ?? 0) >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}
                    >
                      {formatCurrency(animRemaining)}
                    </p>
                  </div>
                </div>

                {/* Global utilization bar */}
                <div className="mt-4">
                  <div className="h-3 rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(totalUtilPct, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{ backgroundColor: totalStatusCfg.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">0%</span>
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      100% = {formatCurrency(totalBudgeted)}
                    </span>
                  </div>
                </div>

                {/* Burn Rate (Propuesta 3) */}
                <BudgetBurnRate
                  spent={totalSpent}
                  budgeted={totalBudgeted}
                  periodProgress={periodProgress}
                />
              </div>
            </div>
          </motion.div>

          {/* ═══════ Per-Category Lines — GLASS (Propuestas 1+4) ═══════ */}
          <motion.div variants={motionV.item}>
            <div className="glass-budget-summary p-5">
              <div className="relative z-[1]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieIcon size={16} className="text-[var(--color-gold-400)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                      Presupuesto por Categoría
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                    Click en editar para ajustar
                  </p>
                </div>

                {/* Mobile: glass cards (Propuesta 4) */}
                <div className="sm:hidden space-y-3">
                  {(budget.lines ?? []).map((line: BudgetLineData) => {
                    const catCfg = EXPENSE_CATEGORY_CONFIG[line.category];
                    const status = getBudgetUtilizationStatus(line.utilization_pct);
                    const statusCfg = BUDGET_UTILIZATION_CONFIG[status];
                    const isEditing = editingCategory === line.category;

                    const cardVariant =
                      status === "over" ? "glass-budget-category--over" :
                      status === "warning" ? "glass-budget-category--warning" : "";

                    return (
                      <div key={line.category} className={cn("glass-budget-category", cardVariant)}>
                        <div className="relative z-[1]">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium font-[family-name:var(--font-ui)]"
                              style={{ color: catCfg?.color, backgroundColor: catCfg?.bgColor }}
                            >
                              {catCfg?.label ?? line.category}
                            </span>
                            {status === "over" ? (
                              <AlertTriangle size={14} className="text-[var(--color-rose-400)]" />
                            ) : (
                              <CheckCircle2 size={14} style={{ color: statusCfg.color }} />
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Ejecutado</p>
                              <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                                {formatCurrency(line.spent)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Presupuesto</p>
                              {isEditing ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className={cn(
                                      "w-24 rounded border px-2 py-1 text-xs text-right font-[family-name:var(--font-mono)]",
                                      "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                                      "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                                    )}
                                    autoFocus
                                    aria-label={`Nuevo presupuesto para ${catCfg?.label ?? line.category}`}
                                  />
                                  <Button
                                    variant="unstyled"
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={updateMut.isPending}
                                    className="p-1.5 rounded text-[var(--color-emerald-400)] hover:bg-[var(--color-surface-3)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label="Guardar"
                                  >
                                    <Save size={14} />
                                  </Button>
                                  <Button
                                    variant="unstyled"
                                    type="button"
                                    onClick={cancelEdit}
                                    className="p-1.5 rounded text-[var(--color-silver-500)] hover:text-[var(--color-silver-300)] hover:bg-[var(--color-surface-3)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label="Cancelar"
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 justify-end">
                                  <p className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                                    {formatCurrency(line.budgeted)}
                                  </p>
                                  <Button
                                    variant="unstyled"
                                    type="button"
                                    onClick={() => startEdit(line.category, line.budgeted)}
                                    className="p-1 text-[var(--color-silver-500)] hover:text-[var(--color-gold-400)] transition-colors"
                                    aria-label={`Editar presupuesto de ${catCfg?.label ?? line.category}`}
                                  >
                                    <Edit3 size={12} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="h-2 rounded-full bg-white/[0.06] mb-1">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(line.utilization_pct, 100)}%`, backgroundColor: statusCfg.color }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-[family-name:var(--font-mono)]" style={{ color: statusCfg.color }}>
                              {line.utilization_pct.toFixed(1)}%
                            </span>
                            <span className="text-xs font-[family-name:var(--font-mono)]"
                              style={{ color: line.remaining >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}
                            >
                              {line.remaining >= 0 ? "Resta: " : "Exceso: "}
                              {formatCurrency(Math.abs(line.remaining))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm font-[family-name:var(--font-ui)]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["Categoría", "Ejecutado", "Presupuesto", "Restante", "Utilización", ""].map((h, i) => (
                          <th
                            key={h}
                            className={`py-3 px-3 font-medium text-[var(--color-silver-500)] ${
                              i === 0 ? "text-left" : i === 5 ? "w-10" : "text-right"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(budget.lines ?? []).map((line: BudgetLineData) => {
                        const catCfg = EXPENSE_CATEGORY_CONFIG[line.category];
                        const status = getBudgetUtilizationStatus(line.utilization_pct);
                        const statusCfg = BUDGET_UTILIZATION_CONFIG[status];
                        const isEditing = editingCategory === line.category;

                        return (
                          <tr key={line.category} className="border-b border-white/[0.04] hover:bg-[var(--color-surface-1)]">
                            <td className="py-3 px-3">
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium font-[family-name:var(--font-ui)]"
                                style={{ color: catCfg?.color, backgroundColor: catCfg?.bgColor }}
                              >
                                {catCfg?.label ?? line.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                              {formatCurrency(line.spent)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {isEditing ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className={cn(
                                      "w-28 rounded border px-2 py-1 text-xs text-right font-[family-name:var(--font-mono)]",
                                      "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                                      "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                                    )}
                                    autoFocus
                                    aria-label={`Nuevo presupuesto para ${catCfg?.label ?? line.category}`}
                                  />
                                  <Button
                                    variant="unstyled"
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={updateMut.isPending}
                                    className="p-1.5 rounded text-[var(--color-emerald-400)] hover:bg-[var(--color-surface-3)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label="Guardar"
                                  >
                                    <Save size={14} />
                                  </Button>
                                  <Button
                                    variant="unstyled"
                                    type="button"
                                    onClick={cancelEdit}
                                    className="p-1.5 rounded text-[var(--color-silver-500)] hover:text-[var(--color-silver-300)] hover:bg-[var(--color-surface-3)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label="Cancelar"
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 justify-end">
                                  <span className="font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                                    {formatCurrency(line.budgeted)}
                                  </span>
                                  <Button
                                    variant="unstyled"
                                    type="button"
                                    onClick={() => startEdit(line.category, line.budgeted)}
                                    className="p-1 text-[var(--color-silver-500)] hover:text-[var(--color-gold-400)] transition-colors"
                                    aria-label={`Editar presupuesto de ${catCfg?.label ?? line.category}`}
                                  >
                                    <Edit3 size={12} />
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-[family-name:var(--font-mono)]"
                              style={{ color: line.remaining >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}
                            >
                              {formatCurrency(line.remaining)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <div className="w-16 h-2 rounded-full bg-white/[0.06]">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(line.utilization_pct, 100)}%`, backgroundColor: statusCfg.color }}
                                  />
                                </div>
                                <span className="font-[family-name:var(--font-mono)] text-xs w-10 text-right" style={{ color: statusCfg.color }}>
                                  {line.utilization_pct.toFixed(0)}%
                                </span>
                                {status === "over" && <AlertTriangle size={12} className="text-[var(--color-rose-400)]" />}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {status === "over" && (
                                <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-rose-400)]">
                                  +{formatCurrency(Math.abs(line.remaining))}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--color-silver-200)] font-bold">
                        <td className="py-3 px-3 text-[var(--color-silver-200)]">Total</td>
                        <td className="py-3 px-3 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                          {formatCurrency(totalSpent)}
                        </td>
                        <td className="py-3 px-3 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                          {formatCurrency(totalBudgeted)}
                        </td>
                        <td className="py-3 px-3 text-right font-[family-name:var(--font-mono)]"
                          style={{ color: (budget.total_remaining ?? 0) >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}
                        >
                          {formatCurrency(budget.total_remaining)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-[family-name:var(--font-mono)]" style={{ color: totalStatusCfg.color }}>
                            {totalUtilPct.toFixed(1)}%
                          </span>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}