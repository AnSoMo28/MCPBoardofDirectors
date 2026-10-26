// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Expense Manager
// Fase 19j REWRITE
//
// 5 innovations:
//   1. Glass Surface (all containers → glass)
//   2. Smart Category Link (auto-highlight matching budget line)
//   3. Real-Time Budget Warning (inline over-budget alert)
//   4. Budget Severity Encoding (glass lines + status glow)
//   5. Category Chips (visual grid instead of <select>)
//
// Rules: #1 tokens, #8 formatCurrency, #11 focus-visible,
//   #12 touch, #15 toast, #17 Button, #18 reducedMotion,
//   #20 breakpoint, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt, Send, AlertTriangle, CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button, Skeleton, showToast } from "@/shared/components/ui";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, cn } from "@/shared/lib/utils";
import type {
  FinanceExpenseCreateResponse,
  FinanceBudgetCheckResponse,
  BudgetLineData,
} from "@/shared/mocks/contracts";
import {
  EXPENSE_CATEGORY_CONFIG,
  BUDGET_UTILIZATION_CONFIG,
  getBudgetUtilizationStatus,
} from "../types";
import './ExpenseManager.css';

/* ══════════════════════════════════════════════════════════
   Motion
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

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function ExpenseManager() {
  const motionV = useMotion();

  // ── Form state ──

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("maintenance");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // ── Reset ──

  const resetForm = useCallback(() => {
    setDescription("");
    setAmount("");
    setCategory("maintenance");
    setVendor("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  }, []);

  // ── Mutation ──

  const expenseMut = useMCPMutation<FinanceExpenseCreateResponse>(
    "finance",
    "finance_expense_create",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Gasto registrado. Pendiente de aprobación." });
        resetForm();
        budgetQ.refetch();
      },
      onError: (err) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al registrar gasto" });
      },
    },
  );

  // ── Query (budget context) ──

  const budgetQ = useMCPQuery<FinanceBudgetCheckResponse>(
    "finance",
    "finance_budget_check",
    { period: "quarterly" },
    { staleTime: 120_000 },
  );

  const budgetLines = useMemo(() => {
    return budgetQ.data?.data?.lines ?? [];
  }, [budgetQ.data]);

  // ── Smart Budget Warning (Propuesta 3) ──

  const selectedLine = useMemo(() => {
    return budgetLines.find((l: BudgetLineData) => l.category === category);
  }, [budgetLines, category]);

  const amountNum = parseFloat(amount) || 0;
  const projectedUtil = useMemo(() => {
    if (!selectedLine || !selectedLine.budgeted || selectedLine.budgeted <= 0) return null;
    const projectedSpent = selectedLine.spent + amountNum;
    return (projectedSpent / selectedLine.budgeted) * 100;
  }, [selectedLine, amountNum]);

  const budgetWarning = useMemo(() => {
    if (projectedUtil === null || amountNum <= 0) return null;
    if (projectedUtil > 100) {
      const over = projectedUtil - 100;
      return {
        level: "danger" as const,
        message: `Este gasto dejaría la categoría "${EXPENSE_CATEGORY_CONFIG[category]?.label ?? category}" ${over.toFixed(0)}% sobre presupuesto`,
      };
    }
    if (projectedUtil > 90) {
      return {
        level: "caution" as const,
        message: `Quedaría al ${projectedUtil.toFixed(0)}% del presupuesto en "${EXPENSE_CATEGORY_CONFIG[category]?.label ?? category}"`,
      };
    }
    return null;
  }, [projectedUtil, amountNum, category]);

  // ── Submit ──

  const handleSubmit = useCallback(() => {
    if (!description.trim()) {
      showToast({ type: "error", message: "Ingresá una descripción del gasto" });
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      showToast({ type: "error", message: "Ingresá un monto válido mayor a cero" });
      return;
    }
    expenseMut.mutate({
      description: description.trim(),
      amount: amountNum,
      category,
      vendor,
      date,
      notes,
    });
  }, [description, amount, category, vendor, date, notes, expenseMut]);

  // ── Category options from config ──

  const categoryOptions = useMemo(() => {
    return Object.entries(EXPENSE_CATEGORY_CONFIG).map(([value, cfg]) => ({
      value,
      label: cfg.label,
      color: cfg.color,
      bgColor: cfg.bgColor,
    }));
  }, []);

  // ── Render ──

  return (
    <motion.div
      variants={motionV.container}
      initial={false}
      animate="visible"
      className="space-y-6"
    >
      {/* ═══════ Expense Form — GLASS (Propuestas 1+5) ═══════ */}
      <motion.div variants={motionV.item}>
        <div className="glass-expense-panel p-5">
          <div className="relative z-[1]">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Receipt size={16} className="text-[var(--color-gold-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                  Registrar Gasto
                </h3>
              </div>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                Nuevo gasto del club — requiere aprobación HITL
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Description (full width) */}
              <div className="sm:col-span-2">
                <label htmlFor="exp-desc" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">
                  Descripción *
                </label>
                <input
                  id="exp-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Reparación bomba de piscina"
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                    "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                    "placeholder:text-[var(--color-silver-500)]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                    "min-h-[48px]",
                  )}
                />
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="exp-amount" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">
                  Monto (₡) *
                </label>
                <input
                  id="exp-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={0}
                  step={1000}
                  placeholder="₡ 0"
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-mono)]",
                    "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                    "placeholder:text-[var(--color-silver-500)]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                    "min-h-[48px]",
                  )}
                />
              </div>

              {/* Vendor */}
              <div>
                <label htmlFor="exp-vendor" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">
                  Proveedor (opcional)
                </label>
                <input
                  id="exp-vendor"
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Nombre del proveedor"
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                    "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                    "placeholder:text-[var(--color-silver-500)]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                    "min-h-[48px]",
                  )}
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor="exp-date" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">
                  Fecha
                </label>
                <input
                  id="exp-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                    "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                    "min-h-[48px]",
                  )}
                />
              </div>

              {/* Category Chips (Propuesta 5) */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-2">
                  Categoría
                </label>
                <div className="glass-expense-category-grid">
                  {categoryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={cn(
                        "glass-expense-category-chip focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                        category === opt.value && "glass-expense-category-chip--active",
                      )}
                      style={{ "--chip-color": opt.color } as React.CSSProperties}
                      aria-pressed={category === opt.value}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes (full width) */}
              <div className="sm:col-span-2">
                <label htmlFor="exp-notes" className="block text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  id="exp-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales, justificación..."
                  rows={2}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-body)] resize-none",
                    "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                    "placeholder:text-[var(--color-silver-500)]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                  )}
                />
              </div>
            </div>

            {/* Real-Time Budget Warning (Propuesta 3) */}
            <AnimatePresence>
              {budgetWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className={cn(
                    "glass-expense-warning mt-4",
                    budgetWarning.level === "caution" && "glass-expense-warning--caution",
                  )}>
                    <AlertCircle size={14} style={{ color: budgetWarning.level === "danger" ? "var(--color-rose-400)" : "var(--color-amber-400)", flexShrink: 0 }} />
                    <p className="text-xs font-[family-name:var(--font-ui)]" style={{ color: budgetWarning.level === "danger" ? "var(--color-rose-400)" : "var(--color-amber-400)" }}>
                      {budgetWarning.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected category budget context (inline) */}
            {selectedLine && amountNum > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
                    Presupuesto: {EXPENSE_CATEGORY_CONFIG[category]?.label ?? category}
                  </span>
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                    {formatCurrency(selectedLine.spent)} + {formatCurrency(amountNum)} = {formatCurrency(selectedLine.spent + amountNum)} / {formatCurrency(selectedLine.budgeted)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-surface-3)]">
                  {/* Current */}
                  <div className="relative h-full">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((selectedLine.spent / selectedLine.budgeted) * 100, 100)}%`,
                        backgroundColor: getBudgetUtilizationStatus((selectedLine.spent / selectedLine.budgeted) * 100) === "over"
                          ? "var(--color-rose-400)"
                          : getBudgetUtilizationStatus((selectedLine.spent / selectedLine.budgeted) * 100) === "warning"
                            ? "var(--color-amber-400)"
                            : "var(--color-emerald-400)",
                      }}
                    />
                    {/* Projected addition */}
                    <div
                      className="absolute top-0 h-full rounded-r transition-all opacity-40"
                      style={{
                        left: `${Math.min((selectedLine.spent / selectedLine.budgeted) * 100, 100)}%`,
                        width: `${Math.min((amountNum / selectedLine.budgeted) * 100, 100 - (selectedLine.spent / selectedLine.budgeted) * 100)}%`,
                        backgroundColor: "var(--color-gold-400)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={expenseMut.isPending || !description.trim() || !amount}
                icon={expenseMut.isPending ? undefined : <Send size={16} />}
                className="bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110"
              >
                {expenseMut.isPending ? "Registrando…" : "Registrar Gasto"}
              </Button>
              <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                HITL — Requiere aprobación antes de procesarse.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════ Budget Context — GLASS (Propuestas 1+2+4) ═══════ */}
      <motion.div variants={motionV.item}>
        <div className="glass-expense-panel p-5">
          <div className="relative z-[1]">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                Contexto Presupuestario
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                Utilización actual por categoría
              </p>
            </div>

            {budgetQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : budgetLines.length === 0 ? (
              <p className="text-sm text-[var(--color-silver-400)] text-center py-6">
                Sin datos de presupuesto disponibles.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Total utilization summary — glass */}
                {budgetQ.data?.data && (
                  <div className="glass-expense-summary mb-2">
                    <div className="relative z-[1]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                          Utilización total
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-mono)]"
                          style={{
                            color: getBudgetUtilizationStatus(budgetQ.data.data.utilization_pct) === "healthy"
                              ? "var(--color-emerald-400)"
                              : getBudgetUtilizationStatus(budgetQ.data.data.utilization_pct) === "warning"
                                ? "var(--color-amber-400)"
                                : "var(--color-rose-400)",
                          }}
                        >
                          {budgetQ.data.data.utilization_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(budgetQ.data.data.utilization_pct, 100)}%`,
                            backgroundColor:
                              getBudgetUtilizationStatus(budgetQ.data.data.utilization_pct) === "healthy"
                                ? "var(--color-emerald-400)"
                                : getBudgetUtilizationStatus(budgetQ.data.data.utilization_pct) === "warning"
                                  ? "var(--color-amber-400)"
                                  : "var(--color-rose-400)",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                          Gastado: {formatCurrency(budgetQ.data.data.total_spent)}
                        </span>
                        <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                          Presupuesto: {formatCurrency(budgetQ.data.data.total_budgeted)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-category lines — glass (Propuestas 2+4) */}
                {budgetLines.map((line: BudgetLineData) => {
                  const catCfg = EXPENSE_CATEGORY_CONFIG[line.category];
                  const status = getBudgetUtilizationStatus(line.utilization_pct);
                  const statusCfg = BUDGET_UTILIZATION_CONFIG[status];
                  const isHighlighted = line.category === category;

                  const lineVariant =
                    status === "over" ? "glass-expense-budget-line--over" :
                    status === "warning" ? "glass-expense-budget-line--warning" : "";

                  return (
                    <div
                      key={line.category}
                      className={cn(
                        "glass-expense-budget-line",
                        lineVariant,
                        isHighlighted && "glass-expense-budget-line--highlighted",
                      )}
                      style={{ "--line-color": catCfg?.color ?? "var(--color-silver-400)" } as React.CSSProperties}
                    >
                      <div className="relative z-[1]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium font-[family-name:var(--font-ui)]"
                              style={{ color: catCfg?.color ?? "var(--color-silver-400)", backgroundColor: catCfg?.bgColor ?? "transparent" }}
                            >
                              {catCfg?.label ?? line.category}
                            </span>
                            {status === "over" && (
                              <AlertTriangle size={12} className="text-[var(--color-rose-400)]" />
                            )}
                            {status === "healthy" && (
                              <CheckCircle2 size={12} className="text-[var(--color-emerald-400)]" />
                            )}
                            {isHighlighted && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-500)]">
                                SELECCIONADA
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                              {formatCurrency(line.spent)} / {formatCurrency(line.budgeted)}
                            </span>
                            <span className="text-xs font-bold font-[family-name:var(--font-mono)]" style={{ color: statusCfg.color }}>
                              {line.utilization_pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(line.utilization_pct, 100)}%`,
                              backgroundColor: statusCfg.color,
                            }}
                          />
                        </div>
                        {line.remaining < 0 && (
                          <p className="text-[10px] mt-1 font-[family-name:var(--font-mono)]" style={{ color: "var(--color-rose-400)" }}>
                            Sobre presupuesto: {formatCurrency(Math.abs(line.remaining))}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}