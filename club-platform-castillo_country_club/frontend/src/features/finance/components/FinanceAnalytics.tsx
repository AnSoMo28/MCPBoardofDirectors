// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Finance Analytics
// Fase 19f REWRITE
//
// 5 innovations:
//   1. Glass Section Transform (all sections → glass)
//   2. Severity-Glass Encoding (left border + inner glow)
//   3. Health Score Premium Glass (glow filter + counter)
//   4. KPI Mini-Cards Glass (concentration + economics)
//   5. Section Accessibility (aria-controls, unique IDs)
//
// Rules: #1 tokens, #3 chartTheme, #6 RC, #7 CHART,
//   #8 formatCurrency, #9 TOOLTIP_STYLE, #10 AXIS_TICK,
//   #11 focus-visible, #12 touch, #15 toast, #17 Button,
//   #18 reducedMotion, #20 breakpoint, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  Activity, Target, AlertCircle, Lightbulb,
  TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  Users, BrainCircuit, RefreshCw,
} from "lucide-react";
import { Button, Skeleton, showToast } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, cn } from "@/shared/lib/utils";
import {
  CHART, CHART_PALETTE, CHART_COLORS, TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type {
  AiFinancialReport,
  HealthScoreFactor,
  CashFlowPeriodData,
  RevenueSourceData,
  FinancialAnomalyItem,
  FinancialRecommendationItem,
  TrendItemData,
  AlertSignalData,
  TierEconomicsData,
} from "../types";
import {
  HEALTH_GRADE_CONFIG,
  ANOMALY_SEVERITY_CONFIG,
  ALERT_SEVERITY_CONFIG,
  RECOMMENDATION_CATEGORY_CONFIG,
  RECOMMENDATION_PRIORITY_CONFIG,
  RECOMMENDATION_EFFORT_CONFIG,
  RECOMMENDATION_CONFIDENCE_CONFIG,
  AI_ANALYSIS_PERIOD_CONFIG,
} from "../types";
import { getScoreColor, SCORE_PRESETS } from "@/shared/lib/score-utils";
import './FinanceAnalytics.css';
/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

/** Animated counter hook (Propuesta 3) */
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
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue((target) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, reduced]);

  return value;
}

function scoreColor(s: number): string {
  return getScoreColor(s, SCORE_PRESETS.goldStandard);
}

function sevColor(s: string): string {
  return ANOMALY_SEVERITY_CONFIG[s]?.color ?? "var(--color-silver-400)";
}

function trendArrow(t: string): string {
  if (t === "improving") return "▲";
  if (t === "declining") return "▼";
  return "—";
}

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
      : ({ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}

/* ══════════════════════════════════════════════════════════
   Expandable Section Wrapper — GLASS (Propuestas 1+2+5)
   ══════════════════════════════════════════════════════════ */

type SectionVariant = "default" | "danger" | "warning" | "success" | "info";

function Section({
  title,
  icon,
  iconColor,
  variant = "default",
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  variant?: SectionVariant;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const btnId = useId();
  const panelId = useId();

  const variantClass = variant !== "default"
    ? `glass-analytics-section--${variant}`
    : "";

  return (
    <div className={cn("glass-analytics-section", variantClass)}>
      <button
        id={btnId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "glass-analytics-section__header",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
        )}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: iconColor }}>{icon}</span>
          <h3
            className="text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-ui)]"
            style={{ color: iconColor }}
          >
            {title}
          </h3>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-[var(--color-silver-500)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--color-silver-500)]" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={btnId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden glass-analytics-section__content"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Section Components
   ══════════════════════════════════════════════════════════ */

/** 1. Health Score — GLASS PREMIUM (Propuesta 3) */
function HealthScoreSection({ data }: { data: AiFinancialReport["health_score"] }) {
  const reduced = useReducedMotion();
  const animatedTotal = useAnimatedCounter(data.total ?? 0, 800, reduced);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = (animatedTotal / 100) * circ;
  const gradeCfg = HEALTH_GRADE_CONFIG[data.grade];
  const color = gradeCfg?.color ?? "var(--color-silver-400)";

  // Severity variant based on grade
  const sectionVariant: SectionVariant =
    (data.total ?? 0) >= 70 ? "success" :
    (data.total ?? 0) >= 50 ? "warning" : "danger";

  return (
    <Section
      title="Health Score Compuesto"
      icon={<Activity size={14} />}
      iconColor={color}
      variant={sectionVariant}
    >
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
        {/* Gauge with glow (Propuesta 3) */}
        <div className="flex flex-col items-center gap-2">
          <div
            role="meter"
            aria-valuenow={Math.round(data.total ?? 0)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Health Score: ${Math.round(data.total)} de 100, grado ${data.grade}`}
          >
            <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
              <defs>
                <filter id="analytics-gauge-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
              <circle
                cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12"
                strokeDasharray={`${pct} ${circ - pct}`} strokeLinecap="round"
                transform="rotate(-90 80 80)"
                filter="url(#analytics-gauge-glow)"
                style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.33,1,0.68,1)" }}
              />
              <text x="80" y="68" textAnchor="middle" fill="var(--color-silver-100)" fontSize="36" fontWeight="bold" fontFamily="var(--font-display)">
                {Math.round(animatedTotal)}
              </text>
              <text x="80" y="94" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="var(--font-display)">
                {data.grade}
              </text>
            </svg>
          </div>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium font-[family-name:var(--font-ui)]"
            style={{ color, backgroundColor: gradeCfg?.bgColor ?? "transparent" }}
          >
            {gradeCfg?.label ?? data.grade} ({gradeCfg?.range ?? ""})
          </span>
          <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            {data.trend_vs_previous != null ? (
              <>{data.trend_vs_previous >= 0 ? "▲" : "▼"} {Math.abs(data.trend_vs_previous).toFixed(1)} pts vs anterior</>
            ) : (
              "Sin datos anteriores"
            )}
          </p>
        </div>

        {/* Factor bars */}
        <div className="space-y-3">
          {(data.factors ?? []).map((f: HealthScoreFactor) => (
            <div key={f.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                    {f.name}
                  </p>
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                    peso {((f.weight ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-[family-name:var(--font-mono)]" style={{ color: scoreColor(f.score) }}>
                    {Math.round(f.score ?? 0)}
                  </span>
                  <span className="text-xs text-[var(--color-silver-500)]">
                    {trendArrow(f.trend)}
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--color-surface-3)]">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${f.score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ backgroundColor: scoreColor(f.score) }}
                />
              </div>
              <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)]">
                {f.detail}{f.contribution != null ? ` · Contribución: ${f.contribution.toFixed(1)} pts` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** 2. Cash Flow Forecast */
function CashFlowSection({ data }: { data: AiFinancialReport["cash_flow_forecast"] }) {
  const { isMobile } = useBreakpoint();
  const cfData = (data.periods ?? []).map((p: CashFlowPeriodData) => ({
    name: p.label,
    Neto: p.projected_net,
    Acumulado: p.cumulative_cash,
    lower: p.lower_bound,
    upper: p.upper_bound,
  }));

  if (!data || !data.periods || cfData.length === 0) return null;

  return (
    <Section
      title={`Proyección Flujo de Caja — ${data.method} (${data.confidence})`}
      icon={<Activity size={14} />}
      iconColor="var(--color-teal-400)"
      variant="info"
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cfData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cf-band-fa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_PALETTE.teal} stopOpacity={0.15} />
                <stop offset="100%" stopColor={CHART_PALETTE.teal} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.gridStroke} />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => `₡${(v / 1_000_000).toFixed(0)}M`}
              tick={AXIS_TICK} axisLine={false} tickLine={false}
              width={isMobile ? 50 : 65}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-ui)" }} />
            <ReferenceLine y={0} stroke={CHART.gridStroke} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(42,154,181,0.08)" name="Límite superior" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="var(--color-surface-1)" name="Límite inferior" />
            <Area
              type="monotone" dataKey="Neto"
              stroke={CHART_PALETTE.teal} fill="url(#cf-band-fa)"
              strokeWidth={2} dot={{ r: 3, fill: CHART_PALETTE.teal }}
              name="Neto proyectado"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {(data.assumptions ?? []).length > 0 && (
        <ul className="mt-3 space-y-1">
          {(data.assumptions ?? []).map((a: string, i: number) => (
            <li key={i} className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-body)]">
              • {a}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** 3. Revenue Concentration — GLASS KPIs (Propuesta 4) */
function RevenueConcentrationSection({ data }: { data: AiFinancialReport["revenue_concentration"] }) {
  const reduced = useReducedMotion();
  if (!data || !data.sources || data.sources.length === 0) return null;

  const divColor = scoreColor(data.diversification_index * 100);
  const hhiColor = data.herfindahl_index > 2500 ? "var(--color-rose-400)" : "var(--color-emerald-400)";

  // Animated counters for KPIs
  const animDiv = useAnimatedCounter((data.diversification_index ?? 0) * 100, 600, reduced);
  const animEntropy = useAnimatedCounter(data.entropy ?? 0, 600, reduced);
  const animHHI = useAnimatedCounter(data.herfindahl_index ?? 0, 600, reduced);

  return (
    <Section
      title="Concentración de Ingresos"
      icon={<Target size={14} />}
      iconColor="var(--color-gold-400)"
    >
      {/* KPI row — glass mini-cards (Propuesta 4) */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="glass-analytics-kpi">
          <p className="relative z-[1] text-2xl font-bold font-[family-name:var(--font-display)]" style={{ color: divColor }}>
            {animDiv.toFixed(0)}%
          </p>
          <p className="relative z-[1] text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">
            Diversificación
          </p>
        </div>
        <div className="glass-analytics-kpi">
          <p className="relative z-[1] text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-200)]">
            {animEntropy.toFixed(2)}
          </p>
          <p className="relative z-[1] text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">
            Shannon H / max {(data.max_entropy ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="glass-analytics-kpi">
          <p className="relative z-[1] text-2xl font-bold font-[family-name:var(--font-display)]" style={{ color: hhiColor }}>
            {Math.round(animHHI).toLocaleString()}
          </p>
          <p className="relative z-[1] text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">
            HHI
          </p>
        </div>
      </div>

      {/* Risk assessment */}
      <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed mb-4">
        {data.risk_assessment}
      </p>

      {/* Source bars */}
      <div className="space-y-2.5">
        {data.sources.map((s: RevenueSourceData, idx: number) => (
          <div key={s.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] truncate max-w-[200px]">
                  {s.label}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium font-[family-name:var(--font-ui)]"
                  style={{
                    color: s.trend === "growing" ? "var(--color-emerald-400)" : s.trend === "declining" ? "var(--color-rose-400)" : "var(--color-silver-500)",
                    backgroundColor: s.trend === "growing" ? "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)" : s.trend === "declining" ? "color-mix(in srgb, var(--color-rose-400) 10%, transparent)" : "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
                  }}
                >
                  {s.trend === "growing" ? "↗" : s.trend === "declining" ? "↘" : "→"} {s.trend}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                  {formatCurrency(s.amount)}
                </span>
                <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)] w-14 text-right">
                  {(s.share_pct ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-[var(--color-surface-3)]">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${s.share_pct}%` }}
                transition={{ duration: 0.6, delay: idx * 0.08 }}
                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** 4. Anomalies — severity variant (Propuesta 2) */
function AnomaliesSection({ items }: { items: FinancialAnomalyItem[] }) {
  if (!items || items.length === 0) return null;

  // Determine worst severity for section variant
  const hasCritical = items.some((a) => a.severity === "critical");
  const hasHigh = items.some((a) => a.severity === "high");
  const sectionVariant: SectionVariant = hasCritical ? "danger" : hasHigh ? "warning" : "default";

  return (
    <Section
      title="Anomalías Detectadas"
      icon={<AlertCircle size={14} />}
      iconColor="var(--color-rose-400)"
      variant={sectionVariant}
    >
      <div className="space-y-3">
        {items.map((a) => {
          const color = sevColor(a.severity);
          const cfg = ANOMALY_SEVERITY_CONFIG[a.severity];
          return (
            <div
              key={a.id}
              className="p-4 rounded-xl border-l-4 bg-[var(--color-surface-2)]"
              style={{ borderLeftColor: color }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                      {a.title}
                    </h4>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]"
                      style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}
                    >
                      {cfg?.label ?? a.severity}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium font-[family-name:var(--font-ui)] bg-[var(--color-surface-3)] text-[var(--color-silver-500)]">
                      {a.domain}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed">
                    {a.detail}
                  </p>
                  {a.suggested_action && (
                    <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] mt-2 italic">
                      → {a.suggested_action}
                    </p>
                  )}
                </div>
                {a.estimated_annual_impact !== 0 && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
                      {formatCurrency(a.estimated_annual_impact)}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                      impacto anual
                    </p>
                  </div>
                )}
              </div>
              {a.deviation_pct !== 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      Desviación
                    </span>
                    <span className="text-[10px] font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
                      {a.deviation_pct > 0 ? "+" : ""}{a.deviation_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-surface-3)] max-w-xs">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(Math.abs(a.deviation_pct), 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** 5. Recommendations */
function RecommendationsSection({ items }: { items: FinancialRecommendationItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <Section
      title="Recomendaciones Estratégicas"
      icon={<Lightbulb size={14} />}
      iconColor="var(--color-teal-400)"
      variant="info"
    >
      <div className="space-y-4">
        {items.map((r, idx) => {
          const priCfg = RECOMMENDATION_PRIORITY_CONFIG[r.priority];
          const catCfg = RECOMMENDATION_CATEGORY_CONFIG[r.category];
          const effCfg = RECOMMENDATION_EFFORT_CONFIG[r.implementation_effort];
          const confCfg = RECOMMENDATION_CONFIDENCE_CONFIG[r.confidence];

          return (
            <div key={r.id ?? `rec-${idx}`} className="flex gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                style={{
                  backgroundColor: catCfg?.color ?? "var(--color-teal-400)",
                  color: "var(--color-abyss, #0a0a0f)",
                }}
              >
                {idx + 1}
              </span>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                    {r.action}
                  </p>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]"
                    style={{ color: priCfg?.color, backgroundColor: priCfg?.bgColor }}
                  >
                    {priCfg?.label ?? r.priority}
                  </span>
                  {catCfg && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-ui)]"
                      style={{ color: catCfg.color, backgroundColor: `color-mix(in srgb, ${catCfg.color} 10%, transparent)` }}
                    >
                      {catCfg.label}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed">
                  {r.justification}
                </p>

                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs font-medium font-[family-name:var(--font-mono)]"
                    style={{ color: r.estimated_impact_annual > 0 ? "var(--color-emerald-400)" : "var(--color-silver-500)" }}
                  >
                    {formatCurrency(r.estimated_impact_annual)}/año
                  </span>
                  {confCfg && (
                    <span className="flex items-center gap-1 text-xs font-[family-name:var(--font-ui)]">
                      <span className="text-[var(--color-silver-500)]">Confianza:</span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-8 rounded-full bg-[var(--color-surface-3)]">
                          <span className="block h-full rounded-full" style={{ width: `${confCfg.pct}%`, backgroundColor: confCfg.color }} />
                        </span>
                        <span style={{ color: confCfg.color }}>{confCfg.label}</span>
                      </span>
                    </span>
                  )}
                  {effCfg && (
                    <span className="flex items-center gap-1 text-xs font-[family-name:var(--font-ui)]">
                      <span className="text-[var(--color-silver-500)]">Esfuerzo:</span>
                      <span style={{ color: effCfg.color }}>{effCfg.label}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** 6. Positive Trends — success variant */
function TrendsSection({ items }: { items: TrendItemData[] }) {
  if (!items || items.length === 0) return null;

  return (
    <Section
      title="Tendencias Positivas"
      icon={<TrendingUp size={14} />}
      iconColor="var(--color-emerald-400)"
      variant="success"
    >
      <div className="space-y-3">
        {items.map((t, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-2)]">
            <div className="p-1.5 rounded-lg flex-shrink-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)", color: "var(--color-emerald-400)" }}
            >
              <TrendingUp size={14} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  {t.title}
                </p>
                <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                  +{(t.change_pct ?? 0).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] mt-0.5">
                {t.detail}
              </p>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1">
                {t.period}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** 7. Alert Signals — warning variant */
function AlertsSection({ items }: { items: AlertSignalData[] }) {
  if (!items || items.length === 0) return null;

  return (
    <Section
      title="Señales de Alerta"
      icon={<AlertTriangle size={14} />}
      iconColor="var(--color-amber-400)"
      variant="warning"
    >
      <div className="space-y-3">
        {items.map((a, idx) => {
          const cfg = ALERT_SEVERITY_CONFIG[a.severity];
          return (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ backgroundColor: cfg?.bgColor ?? "transparent" }}
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: cfg?.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  {a.title}
                </p>
                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] mt-0.5">
                  {a.detail}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] font-[family-name:var(--font-mono)]" style={{ color: cfg?.color }}>
                    Desviación: {(a.deviation_pct ?? 0) > 0 ? "+" : ""}{(a.deviation_pct ?? 0).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                    Umbral: {(a.threshold_exceeded ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** 8. Projection */
function ProjectionSection({ data }: { data: AiFinancialReport["projection"] }) {
  if (!data.summary) return null;

  return (
    <Section
      title={`Proyección — ${data.method} (${data.confidence})`}
      icon={<BrainCircuit size={14} />}
      iconColor="var(--color-silver-400)"
    >
      <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed mb-4">
        {data.summary}
      </p>

      {(data.key_assumptions ?? []).length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">
            Supuestos clave
          </p>
          <ul className="space-y-1">
            {(data.key_assumptions ?? []).map((a: string, i: number) => (
              <li key={i} className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] flex items-start gap-2">
                <span className="text-[var(--color-teal-400)]">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(data.risk_factors ?? []).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-amber-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">
            Factores de riesgo
          </p>
          <ul className="space-y-1">
            {(data.risk_factors ?? []).map((rf: string, i: number) => (
              <li key={i} className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] flex items-start gap-2">
                <AlertTriangle size={10} className="flex-shrink-0 mt-1 text-[var(--color-amber-400)]" />
                {rf}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/** 9. Member Economics — GLASS KPIs (Propuesta 4) */
function MemberEconomicsSection({ data }: { data: AiFinancialReport["member_economics"] }) {
  const reduced = useReducedMotion();
  if (data.avg_revenue_per_member <= 0) return null;

  const kpis = [
    { label: "Revenue/socio", value: data.avg_revenue_per_member, format: formatCurrency, color: CHART_PALETTE.gold },
    { label: "Costo/socio", value: data.avg_cost_per_member, format: formatCurrency, color: CHART_PALETTE.terracotta },
    { label: "Margen/socio", value: data.avg_margin_per_member, format: formatCurrency, color: CHART_PALETTE.teal },
    { label: "LTV estimado", value: data.ltv_estimate, format: formatCurrency, color: CHART_PALETTE.emerald },
    { label: "CAC estimado", value: data.cac_estimate, format: formatCurrency, color: CHART_PALETTE.amber },
    {
      label: "LTV:CAC",
      value: data.ltv_cac_ratio ?? 0,
      format: (v: number) => `${v.toFixed(1)}x`,
      color: (data.ltv_cac_ratio ?? 0) > 3 ? CHART_PALETTE.emerald : CHART_PALETTE.amber,
    },
  ];
  const animRevenue = useAnimatedCounter(data.avg_revenue_per_member, 600, reduced);
  const animCost = useAnimatedCounter(data.avg_cost_per_member, 600, reduced);
  const animMargin = useAnimatedCounter(data.avg_margin_per_member, 600, reduced);
  const animLTV = useAnimatedCounter(data.ltv_estimate, 600, reduced);
  const animCAC = useAnimatedCounter(data.cac_estimate, 600, reduced);
  const animRatio = useAnimatedCounter(data.ltv_cac_ratio ?? 0, 600, reduced);
  const animValues = [animRevenue, animCost, animMargin, animLTV, animCAC, animRatio];
  return (
    <Section
      title="Economía por Socio"
      icon={<Users size={14} />}
      iconColor="var(--color-silver-400)"
    >
      {/* KPI grid — glass mini-cards (Propuesta 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {kpis.map((m, idx) => (
          <div key={m.label} className="glass-analytics-kpi">
            <p className="relative z-[1] text-lg font-bold font-[family-name:var(--font-mono)]" style={{ color: m.color }}>
              {m.format(animValues[idx])}
            </p>
            <p className="relative z-[1] text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">
              {m.label}
            </p>
          </div>
        ))} 
      </div>

      {/* By-tier table */}
      {(data.by_tier ?? []).length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm font-[family-name:var(--font-ui)]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Tier", "Socios", "Revenue Prom.", "Costo Prom.", "Margen %"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-2.5 px-3 font-medium text-[var(--color-silver-500)] text-${i === 0 ? "left" : "right"} ${
                      i === 1 ? "hidden sm:table-cell" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.by_tier ?? []).map((t: TierEconomicsData) => (
                <tr key={t.tier} className="border-b border-white/[0.04] hover:bg-[var(--color-surface-1)]">
                  <td className="py-2.5 px-3 font-medium text-[var(--color-silver-200)] capitalize">{t.tier}</td>
                  <td className="py-2.5 px-3 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-300)] hidden sm:table-cell">{t.count}</td>
                  <td className="py-2.5 px-3 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">{formatCurrency(t.avg_revenue)}</td>
                  <td className="py-2.5 px-3 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">{formatCurrency(t.avg_cost)}</td>
                  <td className="py-2.5 px-3 text-right font-[family-name:var(--font-mono)]">
                    <span style={{ color: (t.margin_pct ?? 0) >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                      {(t.margin_pct ?? 0).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function FinanceAnalytics() {
  const [period, setPeriod] = useState("current_quarter");
  const motionV = useMotion();

  const aiQ = useMCPQuery<{ status: string; data: AiFinancialReport }>(
    "finance",
    "generate_ai_analysis",
    { scope: "financial", period },
    { staleTime: 300_000 },
  );

  const ai = aiQ.data?.data;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <label
          htmlFor="ai-period"
          className="text-sm font-medium font-[family-name:var(--font-ui)] text-[var(--color-silver-400)]"
        >
          Período:
        </label>
        <select
          id="ai-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
            "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
            "min-h-[48px]",
          )}
        >
          {Object.entries(AI_ANALYSIS_PERIOD_CONFIG).map(([value, cfg]) => (
            <option key={value} value={value}>{cfg.label}</option>
          ))}
        </select>

        <Button
          variant="secondary"
          onClick={() => {
            aiQ.refetch();
            showToast({ type: "info", message: "Análisis actualizado" });
          }}
          disabled={aiQ.isLoading}
          icon={<RefreshCw className={cn("w-4 h-4", aiQ.isLoading && "animate-spin")} />}
        >
          Actualizar
        </Button>
      </div>

      {/* Loading */}
      {aiQ.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error — glass treatment */}
      {aiQ.error && !aiQ.isLoading && (
        <div className="glass-analytics-section p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-[var(--color-rose-400)]" />
          <p className="relative z-[1] text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            No se pudo generar el análisis. Verificá que el backend tenga implementado generate_ai_analysis.
          </p>
          <Button variant="secondary" onClick={() => aiQ.refetch()} className="mt-4" icon={<RefreshCw className="w-4 h-4" />}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Report */}
      {ai && !aiQ.isLoading && (
        <motion.div
          variants={motionV.container}
          initial={false}
          animate="visible"
          className="space-y-4"
        >
          {ai.health_score && (
            <motion.div variants={motionV.item}>
              <HealthScoreSection data={ai.health_score} />
            </motion.div>
          )}
          {ai.cash_flow_forecast && (
            <motion.div variants={motionV.item}>
              <CashFlowSection data={ai.cash_flow_forecast} />
            </motion.div>
          )}
          {ai.revenue_concentration && (
            <motion.div variants={motionV.item}>
              <RevenueConcentrationSection data={ai.revenue_concentration} />
            </motion.div>
          )}
          {ai.financial_anomalies && (
            <motion.div variants={motionV.item}>
              <AnomaliesSection items={ai.financial_anomalies} />
            </motion.div>
          )}
          {ai.recommendations && (
            <motion.div variants={motionV.item}>
              <RecommendationsSection items={ai.recommendations} />
            </motion.div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ai.positive_trends && (
              <motion.div variants={motionV.item}>
                <TrendsSection items={ai.positive_trends} />
              </motion.div>
            )}
            {ai.alert_signals && (
              <motion.div variants={motionV.item}>
                <AlertsSection items={ai.alert_signals} />
              </motion.div>
            )}
          </div>
          {ai.projection && (
            <motion.div variants={motionV.item}>
              <ProjectionSection data={ai.projection} />
            </motion.div>
          )}
          {ai.member_economics && (
            <motion.div variants={motionV.item}>
              <MemberEconomicsSection data={ai.member_economics} />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}