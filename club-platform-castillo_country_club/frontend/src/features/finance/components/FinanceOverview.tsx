// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Finance Overview
// Fase 19e REWRITE
//
// 6 innovations:
//   1. Glass Surface Transformation (all cards → glass)
//   2. KPI Vital Signs (counter animation + ambient glow)
//   3. Health Gauge Glass (interactive factor breakdown)
//   4. Smart Insight Cards (severity-encoded mini-cards)
//   5. Budget Burn Rate (projection indicator)
//   6. Chart Glass Wrappers
//
// Rules: #1 tokens, #3 chartTheme, #6 RC, #7 CHART,
//   #8 formatCurrency, #9 TOOLTIP_STYLE, #10 AXIS_TICK,
//   #11 focus-visible, #14 EmptyState, #15 toast,
//   #17 Button+Badge, #18 reducedMotion, #20 breakpoint
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  AlertCircle, RefreshCw, Sparkles,
  AlertTriangle, ShieldCheck, Target, Activity,
} from "lucide-react";
import { Button, Badge, Skeleton, showToast } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, formatPercent } from "@/shared/lib/utils";
import { useDataFreshness } from "@/shared/hooks/useDataFreshness";
import { FreshnessBadge } from "@/shared/components/ui/FreshnessBadge";
import {
  CHART, CHART_COLORS, CHART_PALETTE, TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type {
  FinancialSummary,
  AiFinancialReport,
  HealthScoreFactor,
} from "../types";
import {
  HEALTH_GRADE_CONFIG,
  BUDGET_UTILIZATION_CONFIG,
  getBudgetUtilizationStatus,
} from "../types";
import ExportButton from "@/shared/components/export/ExportButton";
import { getScoreColor, SCORE_PRESETS } from "@/shared/lib/score-utils";
import './FinanceOverview.css';

/* ══════════════════════════════════════════════════════════
   Local Sub-components
   ══════════════════════════════════════════════════════════ */

/** Animated counter hook (counter animation — Propuesta 2) */
function useAnimatedCounter(
  target: number,
  duration = 800,
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
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, reduced]);

  return value;
}

/** Radial SVG gauge (Propuesta 3 — glass enhanced) */
function HealthScoreGauge({ score, grade }: { score: number; grade: string }) {
  if (!Number.isFinite(score)) return null;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const animatedScore = useAnimatedCounter(score);
  const pct = (animatedScore / 100) * circ;
  const gradeCfg = HEALTH_GRADE_CONFIG[grade];
  const color = gradeCfg?.color ?? "var(--color-silver-400)";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="meter"
      aria-valuenow={Math.round(score)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Health Score: ${Math.round(score)} de 100, grado ${grade}`}
    >
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
        <defs>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="rgba(255,255,255,0.04)" strokeWidth="10"
        />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${pct} ${circ - pct}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          filter="url(#gauge-glow)"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.33,1,0.68,1)" }}
        />
        <text
          x="70" y="60" textAnchor="middle"
          fill="var(--color-silver-100)" fontSize="32"
          fontWeight="bold" fontFamily="var(--font-display)"
        >
          {Math.round(animatedScore)}
        </text>
        <text
          x="70" y="82" textAnchor="middle"
          fill={color} fontSize="18"
          fontWeight="bold" fontFamily="var(--font-display)"
        >
          {grade}
        </text>
      </svg>
    </div>
  );
}

/** Mini sparkline for KPI cards */
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const data = values.map((v, i) => ({ i, v }));
  const gradientId = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="h-8 w-16 mt-1 opacity-70">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone" dataKey="v" stroke={color}
            strokeWidth={1.5} dot={false} fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Score color helper */
function scoreColor(s: number): string {
  return getScoreColor(s, SCORE_PRESETS.goldStandard);
}

/** Motion helper */
function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : ({ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } } as const),
    item: reduced
      ? undefined
      : ({ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}

/** Alert card variant mapping */
const ALERT_CARD_VARIANT: Record<string, string> = {
  critical: "alert-card--critical",
  high: "alert-card--error",
  medium: "alert-card--warning",
  low: "alert-card--info",
  info: "alert-card--info",
};

/* ══════════════════════════════════════════════════════════
   Quick Deterministic Insights
   ══════════════════════════════════════════════════════════ */

interface InsightItem {
  icon: React.ReactNode;
  text: string;
  color: string;
  severity: "positive" | "warning" | "alert";
}

function computeInsights(
  summary: FinancialSummary,
  ai: AiFinancialReport | null,
): InsightItem[] {
  const insights: InsightItem[] = [];
  const expCats = summary.expense_by_category ?? [];

  const margin = summary.profit_margin ?? 0;
  insights.push({
    icon: <Percent size={14} />,
    text: `Margen operativo: ${formatPercent(margin, 1)} ${
      margin >= 15 ? "(benchmark privado: 15-25%)" : "(por debajo del mínimo recomendado 15%)"
    }`,
    color: margin >= 15 ? "var(--color-emerald-400)" : "var(--color-rose-400)",
    severity: margin >= 15 ? "positive" : "alert",
  });

  if (expCats.length > 0) {
    const top = [...expCats].sort((a, b) => b.amount - a.amount)[0]!;
    insights.push({
      icon: <AlertCircle size={14} />,
      text: `Categoría de mayor gasto: ${top.label} (${formatCurrency(top.amount)})`,
      color: "var(--color-amber-400)",
      severity: "warning",
    });
  }

  const overBudget = expCats.filter((c) => c.variance_pct > 0);
  if (overBudget.length > 0) {
    insights.push({
      icon: <AlertTriangle size={14} />,
      text: `${overBudget.length} categoría${overBudget.length > 1 ? "s" : ""} sobre presupuesto: ${overBudget.map((c) => c.label).join(", ")}`,
      color: "var(--color-rose-400)",
      severity: "alert",
    });
  } else {
    insights.push({
      icon: <ShieldCheck size={14} />,
      text: "Todas las categorías dentro del presupuesto",
      color: "var(--color-emerald-400)",
      severity: "positive",
    });
  }

  const net = summary.net_income ?? 0;
  insights.push({
    icon: <DollarSign size={14} />,
    text: `Ingreso neto: ${formatCurrency(net)} ${net > 0 ? "(positivo)" : "(negativo)"}`,
    color: net > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)",
    severity: net > 0 ? "positive" : "alert",
  });

  if (ai?.health_score) {
    const hs = ai.health_score;
    const gradeCfg = HEALTH_GRADE_CONFIG[hs.grade];
    insights.push({
      icon: <Activity size={14} />,
      text: `Health Score: ${Math.round(hs.total)}/100 (${hs.grade} — ${gradeCfg?.label ?? hs.grade})`,
      color: gradeCfg?.color ?? "var(--color-silver-400)",
      severity: hs.total >= 70 ? "positive" : hs.total >= 50 ? "warning" : "alert",
    });
  }

  const revChange = summary.revenue_change_pct ?? 0;
  if (revChange !== 0) {
    insights.push({
      icon: revChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
      text: `Revenue ${revChange >= 0 ? "+" : ""}${formatPercent(revChange, 1)} vs trimestre anterior`,
      color: revChange >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)",
      severity: revChange >= 0 ? "positive" : "alert",
    });
  }

  const revCats = summary.revenue_by_category ?? [];
  const growing = [...revCats].sort((a, b) => b.trend_pct - a.trend_pct);
  if (growing.length > 0 && growing[0]!.trend_pct > 10) {
    insights.push({
      icon: <Target size={14} />,
      text: `Crecimiento destacado: ${growing[0]!.label} (+${formatPercent(growing[0]!.trend_pct, 0)})`,
      color: "var(--color-emerald-400)",
      severity: "positive",
    });
  }

  return insights;
}

/* ══════════════════════════════════════════════════════════
   Budget Burn Rate Component (Propuesta 5)
   ══════════════════════════════════════════════════════════ */

function BudgetBurnRate({
  actual,
  budget,
  periodProgress,
}: {
  actual: number;
  budget: number;
  periodProgress: number;
}) {
  if (budget <= 0) return null;

  const actualPct = (actual / budget) * 100;
  const projectedPct = periodProgress > 0 ? (actualPct / periodProgress) * 100 : actualPct;
  const isOverBudget = actualPct > 100;
  const willExceed = projectedPct > 110 && periodProgress < 1;

  const barColor = isOverBudget
    ? "var(--color-rose-400)"
    : actualPct > 90
      ? "var(--color-amber-400)"
      : "var(--color-emerald-400)";

  const projectionColor = willExceed
    ? "var(--color-rose-400)"
    : "var(--color-amber-400)";

  return (
    <div className="mt-4 pt-3 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)] text-[var(--color-silver-500)]">
          Burn Rate
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium font-[family-name:var(--font-mono)]" style={{ color: barColor }}>
            {Math.round(actualPct)}% utilizado
          </span>
          {willExceed && (
            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-rose-400)]">
              Proyección: {Math.round(projectedPct)}%
            </span>
          )}
        </div>
      </div>
      <div className="glass-budget-burn">
        {/* Actual fill */}
        <div
          className="glass-budget-burn__actual"
          style={{
            width: `${Math.min(100, actualPct)}%`,
            backgroundColor: barColor,
          }}
        />
        {/* Projection marker */}
        {periodProgress < 1 && projectedPct > actualPct && (
          <div
            className="glass-budget-burn__projection"
            style={{
              left: `${Math.min(100, projectedPct)}%`,
              borderRightColor: projectionColor,
            }}
          />
        )}
        {/* 100% threshold */}
        <div
          className="glass-budget-burn__threshold"
          style={{ left: "100%" }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
          0%
        </span>
        <span className="text-[9px] text-[var(--color-amber-400)] font-[family-name:var(--font-mono)] opacity-60">
          100%
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function FinanceOverview() {
  const motionV = useMotion();
  const { isMobile } = useBreakpoint();
  useReducedMotion();

  /* ── Data queries ── */

  const summaryQ = useMCPQuery<FinancialSummary>(
    "finance",
    "get_financial_summary",
    { period: "current_quarter" },
    { staleTime: 60_000 },
  );

  const aiQ = useMCPQuery<{ status: string; data: AiFinancialReport }>(
    "finance",
    "generate_ai_analysis",
    { scope: "financial", period: "current_quarter" },
    { staleTime: 300_000 },
  );

  const ai = aiQ.data?.data;
  const summaryFreshness = useDataFreshness(summaryQ);

  /* ── Derived trends (hooks before early returns) ── */
  const netTrend = useMemo(() => {
    const mt = summaryQ.data?.monthly_trend ?? [];
    if (mt.length < 2) return null;
    const prev = mt[mt.length - 2]!;
    const curr = mt[mt.length - 1]!;
    if (!prev.net && prev.net !== 0) return null;
    const prevAbs = Math.abs(prev.net) || 1;
    return ((curr.net - prev.net) / prevAbs) * 100;
  }, [summaryQ.data]);

  const marginTrend = useMemo(() => {
    const mt = summaryQ.data?.monthly_trend ?? [];
    if (mt.length < 2) return null;
    const prev = mt[mt.length - 2]!;
    const curr = mt[mt.length - 1]!;
    if (!prev.revenue || prev.revenue === 0) return null;
    const prevMargin = (prev.net / prev.revenue) * 100;
    const currMargin = (curr.net / curr.revenue) * 100;
    if (prevMargin === 0) return null;
    return ((currMargin - prevMargin) / Math.abs(prevMargin)) * 100;
  }, [summaryQ.data]);

  const insights = useMemo(
    () => (summaryQ.data ? computeInsights(summaryQ.data, ai ?? null) : []),
    [summaryQ.data, ai],
  );

  /* ── Loading state ── */

  if (summaryQ.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Error state ── */

  if (summaryQ.error) {
    return (
      <EmptyState
        icon={<AlertCircle className="w-12 h-12" />}
        title="Error al cargar"
        description={summaryQ.error instanceof Error ? summaryQ.error.message : "No se pudo cargar el resumen financiero."}
        action={{ label: "Reintentar", onClick: () => summaryQ.refetch() }}
      />
    );
  }

  const data = summaryQ.data;
  if (!data) {
    return (
      <EmptyState
        icon={<DollarSign className="w-12 h-12" />}
        title="Sin datos financieros"
        description="No se encontró información financiera para este período."
      />
    );
  }

  /* ── Derived data ── */

  const monthlyTrend = data.monthly_trend ?? [];
  const revByCategory = data.revenue_by_category ?? [];
  const expByCategory = data.expense_by_category ?? [];

  const revSpark = monthlyTrend.map((m) => m.revenue);
  const expSpark = monthlyTrend.map((m) => m.expenses);
  const netSpark = monthlyTrend.map((m) => m.net);

  const totalBudget = expByCategory.reduce((s, c) => s + c.budget, 0);
  const budgetUtilPct = totalBudget > 0 ? ((data.total_expenses ?? 0) / totalBudget) * 100 : 0;
  const totalVariance = expByCategory.reduce((s, c) => s + c.variance, 0);
  const totalOverBudget = totalVariance > 0;

  // Period progress (approximate — current month within quarter)
  const currentMonth = new Date().getMonth();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  const periodProgress = ((currentMonth - quarterStartMonth + 1) / 3);

  /* ── KPI definitions ── */

  const kpis = [
    {
      label: "Ingresos Totales",
      rawValue: data.total_revenue ?? 0,
      displayValue: formatCurrency(data.total_revenue ?? 0),
      trend: data.revenue_change_pct,
      icon: <DollarSign className="w-5 h-5" />,
      color: CHART_PALETTE.gold,
      invertTrend: false,
      spark: revSpark,
    },
    {
      label: "Gastos Totales",
      rawValue: data.total_expenses ?? 0,
      displayValue: formatCurrency(data.total_expenses ?? 0),
      trend: data.expense_change_pct,
      icon: <TrendingDown className="w-5 h-5" />,
      color: CHART_PALETTE.terracotta,
      invertTrend: true,
      spark: expSpark,
    },
    {
      label: "Ingreso Neto",
      rawValue: data.net_income ?? 0,
      displayValue: formatCurrency(data.net_income ?? 0),
      trend: netTrend,
      icon: <TrendingUp className="w-5 h-5" />,
      color: CHART_PALETTE.teal,
      invertTrend: false,
      spark: netSpark,
    },
    {
      label: "Margen",
      rawValue: data.profit_margin ?? 0,
      displayValue: formatPercent(data.profit_margin ?? 0),
      trend: marginTrend,
      icon: <Percent className="w-5 h-5" />,
      color: CHART_PALETTE.sage,
      invertTrend: false,
      spark: null,
    },
    {
      label: "Utilización Ppto",
      rawValue: budgetUtilPct,
      displayValue: `${Math.round(budgetUtilPct)}%`,
      trend: null as number | null,
      icon: <Target className="w-5 h-5" />,
      color: budgetUtilPct > 100 ? "var(--color-rose-400)" : budgetUtilPct > 90 ? "var(--color-amber-400)" : "var(--color-emerald-400)",
      invertTrend: false,
      spark: null,
    },
  ];

  /* ── Chart data ── */

  const revenueChartData = revByCategory.map((cat, idx) => ({
    name: cat.label,
    value: cat.amount,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const trendData = monthlyTrend.map((m) => ({
    name: m.month_label,
    Ingresos: m.revenue,
    Gastos: m.expenses,
    Neto: m.net,
  }));

  /* ── Render ── */

  return (
    <motion.div
      variants={motionV.container}
      initial={false}
      animate="visible"
      className="space-y-6"
    >
      {/* ═══════ KPI Cards (Propuestas 1+2) ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          // Determine ambient glow class
          const trendPositive = kpi.trend !== null && kpi.trend !== undefined
            ? (kpi.invertTrend ? kpi.trend < 0 : kpi.trend >= 0)
            : null;
          const glowClass = trendPositive === true
            ? "glass-finance-kpi--positive"
            : trendPositive === false
              ? "glass-finance-kpi--negative"
              : "";

          return (
            <motion.div key={kpi.label} variants={motionV.item}>
              <div className={`glass-finance-kpi p-5 ${glowClass}`}>
                {/* Background accent */}
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.05] -translate-y-8 translate-x-8"
                  style={{ backgroundColor: kpi.color }}
                />
                <div className="relative z-[1] flex items-start justify-between">
                  <div>
                    <p className="text-sm font-[family-name:var(--font-ui)] text-[var(--color-silver-400)]">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold font-[family-name:var(--font-display)] mt-1 text-[var(--color-silver-200)]">
                      {kpi.displayValue}
                    </p>
                    {kpi.trend !== null && kpi.trend !== undefined && (
                      <div className="flex items-center gap-1 mt-2">
                        {kpi.trend >= 0 ? (
                          <TrendingUp
                            className="w-3.5 h-3.5"
                            style={{
                              color: kpi.invertTrend ? "var(--color-rose-400)" : "var(--color-emerald-400)",
                            }}
                          />
                        ) : (
                          <TrendingDown
                            className="w-3.5 h-3.5"
                            style={{
                              color: kpi.invertTrend ? "var(--color-emerald-400)" : "var(--color-rose-400)",
                            }}
                          />
                        )}
                        <span
                          className="text-xs font-medium font-[family-name:var(--font-mono)]"
                          style={{
                            color:
                              kpi.trend >= 0
                                ? kpi.invertTrend ? "var(--color-rose-400)" : "var(--color-emerald-400)"
                                : kpi.invertTrend ? "var(--color-emerald-400)" : "var(--color-rose-400)",
                          }}
                        >
                          {kpi.trend >= 0 ? "+" : ""}
                          {formatPercent(kpi.trend, 1)}
                        </span>
                        <span className="text-xs text-[var(--color-silver-400)]">vs ant.</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <div
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${kpi.color} 12%, transparent)`,
                        color: kpi.color,
                      }}
                    >
                      {kpi.icon}
                    </div>
                    {kpi.spark && <MiniSparkline values={kpi.spark} color={kpi.color} />}
                  </div>
                </div>

                {/* Budget burn rate (last KPI only) */}
                {kpi.label === "Utilización Ppto" && totalBudget > 0 && (
                  <BudgetBurnRate
                    actual={data.total_expenses ?? 0}
                    budget={totalBudget}
                    periodProgress={periodProgress}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════ Health Score + Smart Insights (Propuestas 3+4) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Health Score Gauge (glass — Propuesta 3) */}
        {ai?.health_score && (
          <motion.div variants={motionV.item}>
            <div className="glass-finance-health p-5 h-full flex flex-col items-center justify-center">
              <p className="text-xs font-semibold text-[var(--color-silver-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-3">
                Health Score Financiero
              </p>
              <HealthScoreGauge
                score={ai.health_score.total}
                grade={ai.health_score.grade}
              />
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mt-2">
                {ai.health_score.trend_vs_previous >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(ai.health_score.trend_vs_previous).toFixed(1)} pts vs anterior
              </p>
              {/* Factor mini-bars (glass — Propuesta 3) */}
              <div className="w-full mt-4 space-y-1">
                {ai.health_score.factors.map((f: HealthScoreFactor) => (
                  <div key={f.name} className="glass-finance-health__factor-row">
                    <p className="text-[10px] w-16 text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] truncate flex-shrink-0">
                      {f.name}
                    </p>
                    <div className="glass-finance-health__factor-bar flex-1">
                      <div
                        className="glass-finance-health__factor-fill"
                        style={{
                          width: `${f.score}%`,
                          backgroundColor: scoreColor(f.score),
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-[family-name:var(--font-mono)] w-6 text-right flex-shrink-0"
                      style={{ color: scoreColor(f.score) }}
                    >
                      {Math.round(f.score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Smart Insight Cards (Propuesta 4) */}
        <motion.div variants={motionV.item}>
          <div className="glass-finance-chart p-5 h-full">
            <div className="relative z-[1]">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[var(--color-gold-400)]" />
                <h3 className="text-sm font-semibold font-[family-name:var(--font-ui)] text-[var(--color-silver-200)]">
                  Insights del Período
                </h3>
              </div>
              <div className="space-y-2">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="glass-finance-insight"
                    style={
                      { "--insight-color": insight.color } as React.CSSProperties
                    }
                  >
                    <div
                      className="p-1 rounded flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${insight.color} 12%, transparent)`,
                        color: insight.color,
                      }}
                    >
                      {insight.icon}
                    </div>
                    <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] leading-relaxed">
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Alert Signals (from AI) */}
              {ai?.alert_signals && ai.alert_signals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <p className="text-xs font-semibold text-[var(--color-amber-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">
                    Alertas activas
                  </p>
                  <div className="space-y-2">
                    {ai.alert_signals.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`alert-card flex items-start gap-2 ${ALERT_CARD_VARIANT[alert.severity] ?? "alert-card--warning"}`}
                      >
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                            {alert.title}
                          </p>
                          <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                            {alert.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════ Charts (Propuestas 1+6 — glass containers) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category */}
        <motion.div variants={motionV.item}>
          <div className="glass-finance-chart p-5">
            <div className="relative z-[1]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                    Ingresos por Rubro
                  </h3>
                  <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                    Distribución del período
                  </p>
                </div>
                <FreshnessBadge freshness={summaryFreshness} className="mt-1" />
              </div>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueChartData}
                    layout="vertical"
                    margin={{ left: 12, right: 24 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3" stroke={CHART.gridStroke}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `₡${(v / 1_000_000).toFixed(0)}M`}
                      tick={AXIS_TICK} axisLine={false} tickLine={false}
                    />
                    <YAxis
                      type="category" dataKey="name" width={isMobile ? 80 : 110}
                      tick={{ ...AXIS_TICK, fontSize: 12, fill: CHART.axisLabel }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: CHART.cursorFill }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {revenueChartData.map((entry, idx) => (
                        <Cell key={`rv-${idx}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Monthly Trend */}
        <motion.div variants={motionV.item}>
          <div className="glass-finance-chart p-5">
            <div className="relative z-[1]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                    Tendencia Mensual
                  </h3>
                  <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                    Ingresos vs Gastos
                  </p>
                </div>
                <FreshnessBadge freshness={summaryFreshness} className="mt-1" />
              </div>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fin-gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PALETTE.gold} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={CHART_PALETTE.gold} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fin-gExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PALETTE.terracotta} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={CHART_PALETTE.terracotta} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.gridStroke} />
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v: number) => `₡${(v / 1_000_000).toFixed(0)}M`}
                      tick={AXIS_TICK} axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: 12,
                        fontFamily: "var(--font-ui, 'DM Sans')",
                        color: CHART.axisLabel,
                      }}
                    />
                    <Area
                      type="monotone" dataKey="Ingresos"
                      stroke={CHART_PALETTE.gold} fill="url(#fin-gRev)"
                      strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                    />
                    <Area
                      type="monotone" dataKey="Gastos"
                      stroke={CHART_PALETTE.terracotta} fill="url(#fin-gExp)"
                      strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════ Expense vs Budget Table (glass — Propuesta 1) ═══════ */}
      <motion.div variants={motionV.item}>
        <div className="glass-finance-chart p-5">
          <div className="relative z-[1]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                  Gastos vs Presupuesto
                </h3>
                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                  Análisis de variación presupuestaria
                </p>
              </div>
              <FreshnessBadge freshness={summaryFreshness} className="mt-1" />
            </div>
            {expByCategory.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="w-12 h-12" />}
                title="Sin datos de gastos"
                description="No hay información presupuestaria para este período."
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block mt-4 overflow-x-auto">
                  <table className="w-full text-sm font-[family-name:var(--font-ui)]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["Rubro", "Real", "Presupuesto", "Variación", "%"].map((h, i) => (
                          <th
                            key={h}
                            className={`text-${i === 0 ? "left" : "right"} py-3 px-4 font-medium text-[var(--color-silver-400)] ${
                              i >= 3 ? "hidden md:table-cell" : i === 2 ? "hidden sm:table-cell" : ""
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expByCategory.map((cat) => {
                        const over = cat.variance > 0;
                        const status = getBudgetUtilizationStatus(
                          cat.budget > 0 ? (cat.amount / cat.budget) * 100 : 0,
                        );
                        const statusCfg = BUDGET_UTILIZATION_CONFIG[status];

                        return (
                          <tr
                            key={cat.category}
                            className="border-b border-white/[0.06] transition-colors hover:bg-[var(--color-surface-3)]"
                          >
                            <td className="py-3 px-4 font-medium text-[var(--color-silver-200)]">
                              {cat.label}
                            </td>
                            <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                              {formatCurrency(cat.amount)}
                            </td>
                            <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] hidden sm:table-cell">
                              {formatCurrency(cat.budget)}
                            </td>
                            <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)]">
                              <span style={{ color: statusCfg.color }}>
                                {over ? "+" : ""}{formatCurrency(cat.variance)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right hidden md:table-cell">
                              <Badge variant={over ? "error" : "success"} size="sm">
                                {cat.variance_pct > 0 ? "+" : ""}{formatPercent(cat.variance_pct, 1)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--color-silver-200)] font-bold">
                        <td className="py-3 px-4 text-[var(--color-silver-200)]">Total Gastos</td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                          {formatCurrency(data.total_expenses)}
                        </td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] hidden sm:table-cell">
                          {formatCurrency(totalBudget)}
                        </td>
                        <td
                          className="py-3 px-4 text-right font-[family-name:var(--font-mono)]"
                          style={{
                            color: totalOverBudget ? "var(--color-rose-400)" : "var(--color-emerald-400)",
                          }}
                        >
                          {totalOverBudget ? "+" : ""}{formatCurrency(totalVariance)}
                        </td>
                        <td className="hidden md:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Phone cards (Rule #21) */}
                <div className="sm:hidden mt-4 space-y-3">
                  {expByCategory.map((cat) => {
                    const over = cat.variance > 0;
                    const status = getBudgetUtilizationStatus(
                      cat.budget > 0 ? (cat.amount / cat.budget) * 100 : 0,
                    );
                    const statusCfg = BUDGET_UTILIZATION_CONFIG[status];
                    const pct = cat.budget > 0 ? Math.min((cat.amount / cat.budget) * 100, 100) : 0;

                    return (
                      <div key={cat.category} className="rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                            {cat.label}
                          </span>
                          <Badge variant={over ? "error" : "success"} size="sm">
                            {cat.variance_pct > 0 ? "+" : ""}{formatPercent(cat.variance_pct, 1)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-[family-name:var(--font-ui)] mb-2">
                          <div>
                            <span className="text-[var(--color-silver-500)]">Real</span>
                            <p className="font-[family-name:var(--font-mono)] text-[var(--color-silver-200)] mt-0.5">
                              {formatCurrency(cat.amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[var(--color-silver-500)]">Presupuesto</span>
                            <p className="font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] mt-0.5">
                              {formatCurrency(cat.budget)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-3)]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: statusCfg.color,
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-[family-name:var(--font-mono)] flex-shrink-0"
                            style={{ color: statusCfg.color }}
                          >
                            {over ? "+" : ""}{formatCurrency(cat.variance)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total summary card */}
                  <div className="rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-gold-400)]/20 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        Total Gastos
                      </span>
                      <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                        {formatCurrency(data.total_expenses)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                        Presupuesto: {formatCurrency(totalBudget)}
                      </span>
                      <span
                        className="text-xs font-semibold font-[family-name:var(--font-mono)]"
                        style={{
                          color: totalOverBudget ? "var(--color-rose-400)" : "var(--color-emerald-400)",
                        }}
                      >
                        {totalOverBudget ? "+" : ""}{formatCurrency(totalVariance)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══════ Quick Actions ═══════ */}
      <motion.div variants={motionV.item}>
        <div className="flex flex-wrap gap-3">
          <ExportButton
            module="resumen-financiero"
            onPrint={() => window.print()}
          />
          <Button
            variant="secondary"
            onClick={() => {
              summaryQ.refetch();
              aiQ.refetch();
              showToast({ type: "info", message: "Datos actualizados" });
            }}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Actualizar Datos
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}