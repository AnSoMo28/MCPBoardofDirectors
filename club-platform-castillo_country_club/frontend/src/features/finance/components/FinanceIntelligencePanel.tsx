// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Finance Intelligence Panel
// Fase 19h REWRITE
//
// 6 innovations:
//   1. Glass Intelligence Grid (domain accent + severity glow)
//   2. Glass Intelligence Dock (command bar)
//   3. Intelligence Command Center (intro with radar + caps)
//   4. Neural Loading (expanding concentric rings)
//   5. Section Status Encoding (header dots)
//   6. Animated Counters (concentration + economics)
//
// Rules: #1 tokens, #3 chartTheme, #6 RC, #8 formatCurrency,
//   #11 focus, #14 Empty, #17 Button, #18 reducedMotion,
//   #19 on-demand, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, TrendingUp, DollarSign, Users,
  AlertTriangle, Lightbulb, Bell, Target,
  FileText, Layers, RefreshCw, Zap, Activity, Calendar, Scale, PenTool,
  ChevronDown, ChevronUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Badge, Button } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ScoreGauge } from "@/shared/components/ui/ScoreGauge";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn, formatPercent } from "@/shared/lib/utils";
import {
  CHART, CHART_PALETTE, CHART_COLORS,
  TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type {
  AiFinancialReport,
  HealthScoreData,
  CashFlowForecastData,
  RevenueConcentrationData,
  FinancialAnomalyItem,
  FinancialRecommendationItem,
  TrendItemData,
  AlertSignalData,
  CashFlowProjectionData,
  MemberEconomicsData,
  BoardBriefingData,
  ScenarioSimulationData,
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

// ── Advanced tool components ──
import DecisionCockpit from "./DecisionCockpit";
import MemberProfitabilityMatrix from "./MemberProfitabilityMatrix";
import NarrativeEngine from "./NarrativeEngine";
import SeasonalCalendar from "./SeasonalCalendar";
import StressTestPanel from "./StressTestPanel";
import './FinanceIntelligencePanel.css';

// ── Helpers ──────────────────────────────────────────────

function compactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₡${(abs / 1_000).toFixed(0)}K`;
  return `${sign}₡${abs}`;
}

import { getScoreColor, SCORE_PRESETS } from "@/shared/lib/score-utils";
function scoreColor(score: number): string {
  return getScoreColor(score, SCORE_PRESETS.goldStandard);
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

// ── Status dot helper ──

type StatusLevel = "success" | "warning" | "danger";

function StatusDot({ status }: { status: StatusLevel }) {
  return (
    <span
      className={`intelligence-status-dot intelligence-status-dot--${status}`}
      aria-label={`Estado: ${status}`}
    />
  );
}

function SectionHead({
  icon: Icon,
  color,
  title,
  status,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  status?: StatusLevel;
}) {
  return (
    <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4" style={{ color }} />
      {title}
      {status && <StatusDot status={status} />}
    </h3>
  );
}

/** Severity class from status level */
function severityClass(level?: StatusLevel): string {
  if (!level) return "";
  return `glass-intelligence-section--severity-${level}`;
}


// ── Motion ───────────────────────────────────────────────

function useMotionConfig() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : ({ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const),
    item: reduced
      ? undefined
      : ({ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}


// ── Neural Loading (Propuesta 4) ────────────────────────

function NeuralLoading({ text }: { text: string }) {
  return (
    <div className="glass-intelligence-loading">
      <div className="relative w-24 h-24 mb-6">
        <Brain className="w-10 h-10 text-[var(--color-gold-400)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="glass-intelligence-loading__ring"
            style={{ animationDelay: `${i * 0.8}s` }}
          />
        ))}
      </div>
      <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] text-center">
        {text}
      </p>
    </div>
  );
}


// ── Intelligence Intro (Propuesta 3) ────────────────────

function IntelligenceIntro() {
  const capabilities: Array<{ icon: LucideIcon; label: string; desc: string; color: string }> = [
    { icon: Brain, label: "Health Score", desc: "Score compuesto multi-factor", color: "var(--color-gold-400)" },
    { icon: TrendingUp, label: "Forecast", desc: "Proyección de flujo de caja", color: "var(--color-teal-400)" },
    { icon: DollarSign, label: "Concentración", desc: "Diversificación de ingresos", color: "var(--color-amber-400)" },
    { icon: AlertTriangle, label: "Anomalías", desc: "Detección automática", color: "var(--color-rose-400)" },
    { icon: Lightbulb, label: "Recomendaciones", desc: "Acciones cuantificadas", color: "var(--color-emerald-400)" },
    { icon: FileText, label: "Briefing", desc: "Reporte para junta", color: "var(--color-gold-400)" },
    { icon: Layers, label: "Escenarios", desc: "Simulación what-if", color: "var(--color-teal-400)" },
    { icon: Users, label: "Rentabilidad", desc: "Análisis por socio", color: "var(--color-emerald-400)" },
    { icon: Activity, label: "Estrés", desc: "Pruebas de resistencia", color: "var(--color-rose-400)" },
  ];

  return (
    <div className="glass-intelligence-intro">
      {/* Radar sweep */}
      <div className="glass-intelligence-intro__radar" />

      {/* Content */}
      <div className="relative z-[1] text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <Brain className="w-10 h-10 text-[var(--color-gold-400)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)] mb-2">
          Centro de Inteligencia Financiera
        </h3>
        <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-body)] max-w-lg mx-auto mb-6">
          Elegí una acción arriba para generar análisis AI. Incluye health score compuesto,
          forecast estacional, detección de anomalías, recomendaciones cuantificadas,
          briefing ejecutivo y herramientas avanzadas de simulación.
        </p>

        {/* Capability grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 max-w-3xl mx-auto">
          {capabilities.map((cap) => (
            <div key={cap.label} className="intelligence-capability-card">
              <cap.icon className="w-4 h-4" style={{ color: cap.color }} />
              <span className="text-[11px] font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                {cap.label}
              </span>
              <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                {cap.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 1: Health Score — GLASS (Propuestas 1+5)
// ══════════════════════════════════════════════════════════

function HealthScoreSection({ data }: { data: HealthScoreData }) {
  const gradeCfg = HEALTH_GRADE_CONFIG[data.grade] ?? HEALTH_GRADE_CONFIG.C;
  const status: StatusLevel = data.total >= 70 ? "success" : data.total >= 50 ? "warning" : "danger";
  const accent = gradeCfg.color;

  return (
    <div
      className={cn("glass-intelligence-section p-5", severityClass(status))}
      style={{ "--section-accent": accent } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={Brain} color="var(--color-gold-400)" title="Health Score Financiero" status={status} />

        {/* Gauge + Grade */}
        <div className="flex flex-col items-center mb-5">
          <ScoreGauge score={data.total} size={140} strokeWidth={10} color={gradeCfg.color} label={gradeCfg.label} />
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={data.total >= 75 ? "success" : data.total >= 55 ? "warning" : "danger"} size="md">
              {data.grade}
            </Badge>
            {data.trend_vs_previous !== 0 && (
              <span className={cn(
                "text-xs font-[family-name:var(--font-mono)] font-semibold",
                data.trend_vs_previous > 0 ? "text-[var(--color-emerald-400)]" : "text-[var(--color-rose-400)]",
              )}>
                {data.trend_vs_previous > 0 ? "▲" : "▼"} {data.trend_vs_previous > 0 ? "+" : ""}{data.trend_vs_previous}
              </span>
            )}
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-3">
          {data.factors.map((f) => {
            const color = scoreColor(f.score);
            const trendIcon = f.trend === "improving" ? "▲" : f.trend === "declining" ? "▼" : "●";
            const trendColor = f.trend === "improving" ? "var(--color-emerald-400)" : f.trend === "declining" ? "var(--color-rose-400)" : "var(--color-silver-500)";

            return (
              <div key={f.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] flex items-center gap-1.5">
                    <span style={{ color: trendColor }} className="text-[10px]">{trendIcon}</span>
                    {f.name}
                  </span>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                    {f.score.toFixed(1)} · {formatPercent(f.weight * 100, 0)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.score}%`, backgroundColor: color }} />
                </div>
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">{f.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 2: Cash Flow Forecast — GLASS
// ══════════════════════════════════════════════════════════

function CashFlowSection({ data }: { data: CashFlowForecastData }) {
  const chartData = data.periods.map((p) => ({
    label: p.label,
    projected_net: p.projected_net,
    cumulative_cash: p.cumulative_cash,
    band_lower: p.lower_bound,
    band_range: p.upper_bound - p.lower_bound,
    projected_revenue: p.projected_revenue,
    projected_expenses: p.projected_expenses,
  }));

  const confStatus: StatusLevel = data.confidence === "high" ? "success" : data.confidence === "medium" ? "warning" : "danger";

  return (
    <div
      className={cn("glass-intelligence-section p-5", severityClass(confStatus))}
      style={{ "--section-accent": "var(--color-teal-400)" } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={TrendingUp} color="var(--color-teal-400)" title="Proyección Flujo de Caja" status={confStatus} />

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="neutral" size="sm">{data.confidence}</Badge>
          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
            Banda de confianza {data.confidence_band_pct}%
          </span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <CartesianGrid stroke={CHART.gridStroke} />
            <XAxis dataKey="label" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => compactCurrency(v)} width={65} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [compactCurrency(value), name]} />
            <Area type="monotone" dataKey="band_lower" stroke="none" fill="none" stackId="band" />
            <Area type="monotone" dataKey="band_range" stroke="none" fill={CHART_PALETTE.teal} fillOpacity={0.1} stackId="band" />
            <Line type="monotone" dataKey="projected_net" stroke={CHART_PALETTE.teal} strokeWidth={2.5} dot={{ r: 3, fill: CHART_PALETTE.teal }} name="Neto proyectado" />
            <Line type="monotone" dataKey="cumulative_cash" stroke={CHART_PALETTE.gold} strokeWidth={2} strokeDasharray="5 3" dot={false} name="Acumulado" />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: CHART_PALETTE.teal }} /> Neto
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            <span className="w-3 h-0.5 rounded-full inline-block border-t-2 border-dashed" style={{ borderColor: CHART_PALETTE.gold }} /> Acumulado
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: CHART_PALETTE.teal, opacity: 0.2 }} /> Banda {data.confidence_band_pct}%
          </span>
        </div>

        {data.assumptions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-1">Supuestos</p>
            <ul className="space-y-0.5">
              {data.assumptions.map((a, i) => (
                <li key={i} className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">• {a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 3: Revenue Concentration — GLASS + ANIMATED (Propuestas 1+5+6)
// ══════════════════════════════════════════════════════════

function ConcentrationSection({ data }: { data: RevenueConcentrationData }) {
  const reduced = useReducedMotion();
  const donutData = data.sources.map((s, i) => ({
    name: s.label,
    value: s.share_pct,
    amount: s.amount,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Animated counters (Propuesta 6)
  const animDiv = useAnimatedCounter(data.diversification_index * 100, 600, reduced);
  const animHHI = useAnimatedCounter(data.herfindahl_index, 600, reduced);
  const animEntropy = useAnimatedCounter(data.entropy, 600, reduced);

  const divStatus: StatusLevel = data.diversification_index >= 0.6 ? "success" : data.diversification_index >= 0.4 ? "warning" : "danger";

  return (
    <div
      className={cn("glass-intelligence-section p-5", severityClass(divStatus))}
      style={{ "--section-accent": "var(--color-gold-400)" } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={DollarSign} color="var(--color-gold-400)" title="Concentración de Ingresos" status={divStatus} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, _name: string, props: { payload?: { name?: string; amount?: number } }) =>
                    [`${value}% (${compactCurrency(props.payload?.amount ?? 0)})`, props.payload?.name ?? ""]
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">Diversificación</p>
              <p className="text-lg font-bold font-[family-name:var(--font-display)]" style={{ color: scoreColor(data.diversification_index * 100) }}>
                {animDiv.toFixed(1)}%
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">HHI (Herfindahl)</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                {Math.round(animHHI).toLocaleString("es-CR")}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">Entropía Shannon</p>
              <p className="text-lg font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                {animEntropy.toFixed(3)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          {data.sources.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="flex-1 text-xs text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">{s.label}</span>
              <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">{s.share_pct}%</span>
              <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-500)] w-16 text-right">{compactCurrency(s.amount)}</span>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
          <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] leading-relaxed">{data.risk_assessment}</p>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 4: Member Economics — GLASS + ANIMATED (Propuestas 1+5+6)
// ══════════════════════════════════════════════════════════

function MemberEconomicsSection({ data }: { data: MemberEconomicsData }) {
  const reduced = useReducedMotion();

  // Animated counters (Propuesta 6)
  const animRevenue = useAnimatedCounter(data.avg_revenue_per_member, 600, reduced);
  const animCost = useAnimatedCounter(data.avg_cost_per_member, 600, reduced);
  const animMargin = useAnimatedCounter(data.avg_margin_per_member, 600, reduced);
  const animLTV = useAnimatedCounter(data.ltv_estimate, 600, reduced);
  const animCAC = useAnimatedCounter(data.cac_estimate, 600, reduced);
  const animRatio = useAnimatedCounter(data.ltv_cac_ratio, 600, reduced);

  const metrics = [
    { label: "Revenue / socio", value: compactCurrency(animRevenue), color: "var(--color-silver-200)" },
    { label: "Costo / socio", value: compactCurrency(animCost), color: "var(--color-silver-200)" },
    { label: "Margen / socio", value: compactCurrency(animMargin), color: data.avg_margin_per_member >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" },
  ];

  const ratioStatus: StatusLevel = data.ltv_cac_ratio >= 3 ? "success" : data.ltv_cac_ratio >= 2 ? "warning" : "danger";

  return (
    <div
      className={cn("glass-intelligence-section p-5", severityClass(ratioStatus))}
      style={{ "--section-accent": "var(--color-emerald-400)" } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={Users} color="var(--color-emerald-400)" title="Economía por Socio" status={ratioStatus} />

        <div className="grid grid-cols-3 gap-2 mb-4">
          {metrics.map((m) => (
            <div key={m.label} className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06] text-center">
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">{m.label}</p>
              <p className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06] text-center">
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">LTV estimado</p>
            <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-gold-400)]">{compactCurrency(animLTV)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06] text-center">
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">CAC estimado</p>
            <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">{compactCurrency(animCAC)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06] text-center">
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">LTV / CAC</p>
            <p className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color: data.ltv_cac_ratio >= 3 ? "var(--color-emerald-400)" : "var(--color-amber-400)" }}>
              {animRatio.toFixed(1)}x
            </p>
          </div>
        </div>

        {data.by_tier.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-2">Por Tier</p>
            <div className="space-y-1.5">
              {data.by_tier.map((t) => (
                <div key={t.tier} className="flex items-center gap-3 text-xs font-[family-name:var(--font-ui)]">
                  <span className="w-16 text-[var(--color-silver-200)] font-medium">{t.tier}</span>
                  <span className="flex-1 text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">{compactCurrency(t.avg_revenue)}</span>
                  <span className="w-14 text-right font-[family-name:var(--font-mono)]" style={{ color: t.margin_pct >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                    {t.margin_pct.toFixed(1)}%
                  </span>
                  <span className="w-10 text-right text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 5: Anomalies — GLASS + SEVERITY (Propuestas 1+5)
// ══════════════════════════════════════════════════════════

function AnomaliesSection({ anomalies }: { anomalies: FinancialAnomalyItem[] }) {
  const hasCritical = anomalies.some((a) => a.severity === "critical");
  const hasHigh = anomalies.some((a) => a.severity === "high");
  const status: StatusLevel = hasCritical ? "danger" : hasHigh ? "warning" : anomalies.length === 0 ? "success" : "warning";

  if (anomalies.length === 0) {
    return (
      <div
        className={cn("glass-intelligence-section p-5", severityClass(status))}
        style={{ "--section-accent": "var(--color-emerald-400)" } as React.CSSProperties}
      >
        <div className="relative z-[1]">
          <SectionHead icon={AlertTriangle} color="var(--color-emerald-400)" title="Anomalías Detectadas" status={status} />
          <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Sin anomalías detectadas.</p>
        </div>
      </div>
    );
  }

  const sorted = [...anomalies].sort((a, b) => (ANOMALY_SEVERITY_CONFIG[a.severity]?.order ?? 99) - (ANOMALY_SEVERITY_CONFIG[b.severity]?.order ?? 99));

  return (
    <div
      className={cn("glass-intelligence-section p-5", severityClass(status))}
      style={{ "--section-accent": "var(--color-rose-400)" } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={AlertTriangle} color="var(--color-rose-400)" title="Anomalías Detectadas" status={status} />
        <div className="space-y-3">
          {sorted.map((a) => {
            const sevCfg = ANOMALY_SEVERITY_CONFIG[a.severity] ?? ANOMALY_SEVERITY_CONFIG.medium;
            return (
              <div key={a.id} className="p-3 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={a.severity === "critical" || a.severity === "high" ? "danger" : a.severity === "medium" ? "warning" : "neutral"} size="sm">{sevCfg.label}</Badge>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] text-[var(--color-silver-500)] bg-[var(--color-surface-2)]">{a.domain}</span>
                </div>
                <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">{a.title}</p>
                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] leading-relaxed mb-2">{a.detail}</p>
                <div className="flex items-center justify-between text-[10px] font-[family-name:var(--font-ui)]">
                  <span className="text-[var(--color-amber-400)]">Impacto: {compactCurrency(a.estimated_annual_impact)}/año</span>
                  <span className="text-[var(--color-silver-500)]">{a.suggested_action}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 6: Recommendations — GLASS (Propuesta 1)
// ══════════════════════════════════════════════════════════

function RecommendationsSection({ recommendations }: { recommendations: FinancialRecommendationItem[] }) {
  if (recommendations.length === 0) return null;

  const sorted = [...recommendations].sort((a, b) => (RECOMMENDATION_PRIORITY_CONFIG[a.priority]?.order ?? 99) - (RECOMMENDATION_PRIORITY_CONFIG[b.priority]?.order ?? 99));

  const hasCritical = recommendations.some((r) => r.priority === "critical");
  const hasHigh = recommendations.some((r) => r.priority === "high");
  const status: StatusLevel = hasCritical ? "danger" : hasHigh ? "warning" : "success";

  return (
    <div
      className={cn("glass-intelligence-section p-5", severityClass(status))}
      style={{ "--section-accent": "var(--color-gold-400)" } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={Lightbulb} color="var(--color-gold-400)" title="Recomendaciones" status={status} />
        <div className="space-y-3">
          {sorted.map((r) => {
            const catCfg = RECOMMENDATION_CATEGORY_CONFIG[r.category] ?? RECOMMENDATION_CATEGORY_CONFIG.efficiency;
            const priCfg = RECOMMENDATION_PRIORITY_CONFIG[r.priority] ?? RECOMMENDATION_PRIORITY_CONFIG.medium;
            const effCfg = RECOMMENDATION_EFFORT_CONFIG[r.implementation_effort] ?? RECOMMENDATION_EFFORT_CONFIG.medium;
            const confCfg = RECOMMENDATION_CONFIDENCE_CONFIG[r.confidence] ?? RECOMMENDATION_CONFIDENCE_CONFIG.medium;

            return (
              <div key={r.id} className="p-3 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant={r.priority === "critical" || r.priority === "high" ? "danger" : r.priority === "medium" ? "warning" : "neutral"} size="sm">{priCfg.label}</Badge>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-[family-name:var(--font-ui)]" style={{ color: catCfg.color, backgroundColor: `color-mix(in srgb, ${catCfg.color} 12%, transparent)` }}>{catCfg.label}</span>
                </div>
                <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1">{r.action}</p>
                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] leading-relaxed mb-2">{r.justification}</p>
                <div className="flex items-center gap-3 text-[10px] font-[family-name:var(--font-ui)] flex-wrap">
                  <span className="text-[var(--color-emerald-400)] font-semibold">+{compactCurrency(r.estimated_impact_annual)}/año</span>
                  <span style={{ color: effCfg.color }}>Esfuerzo: {effCfg.label}</span>
                  <span style={{ color: confCfg.color }}>Confianza: {confCfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 7: Trends + Alerts — GLASS (Propuestas 1+5)
// ══════════════════════════════════════════════════════════

function TrendsAlertsSection({
  trends,
  alerts,
}: {
  trends: TrendItemData[];
  alerts: AlertSignalData[];
}) {
  const hasAlerts = alerts.length > 0;
  const hasCritical = alerts.some((a) => a.severity === "critical");
  const status: StatusLevel = hasCritical ? "danger" : hasAlerts ? "warning" : "success";

  return (
    <div
      className={cn("glass-intelligence-section p-5", severityClass(status))}
      style={{ "--section-accent": "var(--color-amber-400)" } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={Bell} color="var(--color-amber-400)" title="Tendencias y Alertas" status={status} />

        {trends.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-2">Tendencias Positivas</p>
            <div className="space-y-2">
              {trends.map((t, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-[color-mix(in srgb, var(--color-emerald-400) 6%, transparent)] border border-[var(--color-emerald-400)]/10">
                  <span className="text-xs text-[var(--color-emerald-400)] mt-0.5">▲</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">{t.title}</p>
                    <p className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">{t.detail}</p>
                  </div>
                  <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)] flex-shrink-0">+{t.change_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-2">Señales de Alerta</p>
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const alertCfg = ALERT_SEVERITY_CONFIG[a.severity] ?? ALERT_SEVERITY_CONFIG.medium;
                return (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-[color-mix(in srgb, var(--color-amber-400) 6%, transparent)] border border-[var(--color-amber-400)]/10">
                    <span className="text-xs mt-0.5" style={{ color: alertCfg.color }}>⚠</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">{a.title}</p>
                      <p className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">{a.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {trends.length === 0 && alerts.length === 0 && (
          <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Sin tendencias ni alertas.</p>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 8: Projection — GLASS (Propuesta 1)
// ══════════════════════════════════════════════════════════

function ProjectionSection({ data }: { data: CashFlowProjectionData }) {
  return (
    <div
      className="glass-intelligence-section p-5"
      style={{ "--section-accent": "var(--color-teal-400)" } as React.CSSProperties}
    >
      <div className="relative z-[1]">
        <SectionHead icon={Target} color="var(--color-teal-400)" title="Proyección Estratégica" />

        <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed mb-4">{data.summary}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-2">Factores de Riesgo</p>
            <ul className="space-y-1.5">
              {data.risk_factors.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                  <span className="text-[var(--color-amber-400)] mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-2">Supuestos Clave</p>
            <ul className="space-y-1.5">
              {data.key_assumptions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                  <span className="text-[var(--color-teal-400)] mt-0.5">•</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 9: Board Briefing — GLASS (Propuestas 1+5)
// ══════════════════════════════════════════════════════════

function BriefingSection({ data }: { data: BoardBriefingData }) {
  return (
    <div className="space-y-4">
      {data.key_metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {data.key_metrics.map((m, i) => (
            <div
              key={i}
              className="glass-intelligence-section p-3"
              style={{ "--section-accent": m.assessment === "positive" ? "var(--color-emerald-400)" : m.assessment === "negative" ? "var(--color-rose-400)" : "var(--color-silver-500)" } as React.CSSProperties}
            >
              <p className="relative z-[1] text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">{m.label}</p>
              <p className="relative z-[1] text-lg font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-200)]">{m.value}</p>
              {m.change_pct !== 0 && (
                <span className={cn(
                  "relative z-[1] text-[10px] font-[family-name:var(--font-mono)]",
                  m.assessment === "positive" ? "text-[var(--color-emerald-400)]" : m.assessment === "negative" ? "text-[var(--color-rose-400)]" : "text-[var(--color-silver-500)]",
                )}>
                  {m.change_pct > 0 ? "+" : ""}{m.change_pct}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {data.sections.map((s) => (
        <div
          key={s.id}
          className="glass-intelligence-section p-5"
          style={{ "--section-accent": "var(--color-silver-500)" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <h4 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-2">{s.title}</h4>
            <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed mb-2">{s.content}</p>
            {s.items.length > 0 && (
              <ul className="space-y-1">
                {s.items.map((item, i) => (
                  <li key={i} className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">• {item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}

      {data.upcoming_decisions.length > 0 && (
        <div
          className="glass-intelligence-section p-5"
          style={{ "--section-accent": "var(--color-gold-400)" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <SectionHead icon={Zap} color="var(--color-gold-400)" title="Decisiones Pendientes" />
            <div className="space-y-3">
              {data.upcoming_decisions.map((d, i) => (
                <div key={i} className="p-3 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
                  <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1">{d.title}</p>
                  <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-2">{d.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {d.options.map((opt, j) => (
                      <Badge key={j} variant="neutral" size="sm">{opt}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-[family-name:var(--font-ui)]">
                    <span className="text-[var(--color-silver-500)]">Deadline: {d.deadline}</span>
                    <span className="text-[var(--color-gold-400)]">Impacto: {d.impact_estimate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Section 10: Scenario Simulation — GLASS (Propuesta 1)
// ══════════════════════════════════════════════════════════

function ScenarioSection({ data }: { data: ScenarioSimulationData }) {
  const snapshots = [
    { label: "Baseline", snap: data.baseline, color: "var(--color-silver-400)" },
    { label: "Escenario", snap: data.scenario, color: "var(--color-gold-400)" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {snapshots.map((s) => (
          <div
            key={s.label}
            className="glass-intelligence-section p-4"
            style={{ "--section-accent": s.color } as React.CSSProperties}
          >
            <div className="relative z-[1]">
              <h4 className="text-xs font-semibold font-[family-name:var(--font-ui)] uppercase tracking-wider mb-3" style={{ color: s.color }}>{s.label}</h4>
              <div className="space-y-2">
                {([
                  ["Revenue", s.snap.revenue, "var(--color-silver-200)"],
                  ["Gastos", s.snap.expenses, "var(--color-silver-200)"],
                  ["Neto", s.snap.net, s.snap.net >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)"],
                  ["Margen", s.snap.margin, s.snap.margin >= 15 ? "var(--color-emerald-400)" : "var(--color-amber-400)"],
                  ["Health", s.snap.health_score, scoreColor(s.snap.health_score)],
                  ["Cash Flow 12m", s.snap.cash_flow_12m, s.snap.cash_flow_12m >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)"],
                ] as [string, number, string][]).map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">{label}</span>
                    <span className="text-xs font-semibold font-[family-name:var(--font-mono)]" style={{ color }}>
                      {label === "Margen" ? `${value.toFixed(1)}%` : label === "Health" ? value.toFixed(0) : compactCurrency(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delta */}
      <div
        className="glass-intelligence-section p-4"
        style={{ "--section-accent": "var(--color-gold-400)" } as React.CSSProperties}
      >
        <div className="relative z-[1]">
          <h4 className="text-xs font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-3">Delta</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {([
              ["Revenue", data.delta.revenue_change, compactCurrency],
              ["Gastos", data.delta.expenses_change, compactCurrency],
              ["Neto", data.delta.net_change, compactCurrency],
              ["Margen", data.delta.margin_change, (v: number) => `${v.toFixed(1)}pp`],
              ["Health", data.delta.health_score_change, (v: number) => v.toFixed(1)],
              ["CF 12m", data.delta.cash_flow_12m_change, compactCurrency],
            ] as [string, number, (v: number) => string][]).map(([label, value, fmt]) => (
              <div key={label} className="text-center">
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">{label}</p>
                <p className={cn(
                  "text-sm font-bold font-[family-name:var(--font-mono)]",
                  value > 0 ? "text-[var(--color-emerald-400)]" : value < 0 ? "text-[var(--color-rose-400)]" : "text-[var(--color-silver-500)]",
                )}>
                  {value > 0 ? "+" : ""}{fmt(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risks */}
      {data.risks.length > 0 && (
        <div
          className="glass-intelligence-section p-4"
          style={{ "--section-accent": "var(--color-rose-400)" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <h4 className="text-xs font-semibold text-[var(--color-rose-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-3">Riesgos</h4>
            <div className="space-y-2">
              {data.risks.map((r, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[var(--color-surface-0)] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={r.severity === "critical" || r.severity === "high" ? "danger" : r.severity === "medium" ? "warning" : "neutral"} size="sm">{r.severity}</Badge>
                    <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">{r.factor}</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">{r.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Commentary */}
      <div className="p-4 rounded-xl bg-[color-mix(in srgb, var(--color-gold-400) 6%, transparent)] border border-[var(--color-gold-400)]/12">
        <p className="text-xs font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] mb-1">Comentario AI</p>
        <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">{data.ai_commentary}</p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════

export default function FinanceIntelligencePanel() {
  const motionV = useMotionConfig();
  const [period, setPeriod] = useState("current_quarter");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Toggle states
  const [analysisOn, setAnalysisOn] = useState(false);
  const [briefingOn, setBriefingOn] = useState(false);
  const [scenarioOn, setScenarioOn] = useState(false);
  const [profitabilityOn, setProfitabilityOn] = useState(false);
  const [stressTestOn, setStressTestOn] = useState(false);
  const [seasonalOn, setSeasonalOn] = useState(false);
  const [decisionOn, setDecisionOn] = useState(false);
  const [narrativeOn, setNarrativeOn] = useState(false);

  // ── Queries ──
  const analysisQ = useMCPQuery<{ status: string; message: string; data: AiFinancialReport }>(
    "finance",
    "generate_ai_analysis",
    { period },
    { enabled: analysisOn, staleTime: 0 },
  );

  const briefingQ = useMCPQuery<{ status: string; data: BoardBriefingData }>(
    "finance",
    "finance_board_briefing",
    {},
    { enabled: briefingOn, staleTime: 0 },
  );

  const scenarioQ = useMCPQuery<{ status: string; data: ScenarioSimulationData }>(
    "finance",
    "finance_scenario_simulate",
    {},
    { enabled: scenarioOn, staleTime: 0 },
  );

  const report = analysisQ.data?.data;
  const briefing = briefingQ.data?.data;
  const scenario = scenarioQ.data?.data;

  const nothingActive = !analysisOn && !briefingOn && !scenarioOn
    && !profitabilityOn && !stressTestOn && !seasonalOn
    && !decisionOn && !narrativeOn;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <div className="flex-1">
          <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
            Motor de inteligencia financiera con análisis profundo: health score, forecast estacional,
            detección de anomalías, recomendaciones cuantificadas y briefing ejecutivo para la junta.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm font-[family-name:var(--font-ui)]
                       bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]
                       focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)] min-h-[44px]"
            aria-label="Período de análisis"
          >
            {Object.entries(AI_ANALYSIS_PERIOD_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Action Dock — GLASS (Propuesta 2) ── */}
      <div className="glass-intelligence-dock p-4 sm:p-5">
        <div className="relative z-[1]">
          {/* Primary actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => setAnalysisOn(true)}
              icon={analysisQ.isLoading ? undefined : <Brain className="w-4 h-4" />}
              disabled={analysisQ.isLoading}
            >
              {analysisQ.isLoading ? "Analizando…" : "Generar Análisis Financiero"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setBriefingOn(true)}
              icon={briefingQ.isLoading ? undefined : <FileText className="w-4 h-4" />}
              disabled={briefingQ.isLoading}
            >
              {briefingQ.isLoading ? "Generando…" : "Briefing para Junta"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setScenarioOn(true)}
              icon={scenarioQ.isLoading ? undefined : <Layers className="w-4 h-4" />}
              disabled={scenarioQ.isLoading}
            >
              {scenarioQ.isLoading ? "Simulando…" : "Simular Escenario"}
            </Button>

            {(analysisOn && report) && (
              <Button variant="ghost" onClick={() => analysisQ.refetch()} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Actualizar
              </Button>
            )}
          </div>

          {/* Advanced tools toggle */}
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="glass-intelligence-advanced-toggle focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
              aria-expanded={advancedOpen}
            >
              Avanzado
              {advancedOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <AnimatePresence>
              {advancedOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setProfitabilityOn(true)} icon={<Users className="w-3.5 h-3.5" />}>
                      Rentabilidad
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStressTestOn(true)} icon={<Activity className="w-3.5 h-3.5" />}>
                      Prueba de Estrés
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSeasonalOn(true)} icon={<Calendar className="w-3.5 h-3.5" />}>
                      Calendario
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDecisionOn(true)} icon={<Scale className="w-3.5 h-3.5" />}>
                      Decisiones
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setNarrativeOn(true)} icon={<PenTool className="w-3.5 h-3.5" />}>
                      Narrativa AI
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Intro state — GLASS COMMAND CENTER (Propuesta 3) ── */}
      {nothingActive && <IntelligenceIntro />}

      {/* ── Analysis Loading — NEURAL (Propuesta 4) ── */}
      {analysisOn && analysisQ.isLoading && (
        <NeuralLoading text="Analizando datos financieros, forecast y anomalías…" />
      )}

      {/* ── Analysis Error ── */}
      {analysisOn && analysisQ.isError && (
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10" />}
          title="Error al generar análisis"
          description={(analysisQ.error as Error)?.message || "No se pudo completar el análisis financiero."}
          action={{ label: "Reintentar", onClick: () => analysisQ.refetch() }}
        />
      )}

      {/* ── Analysis Results ── */}
      {report && (
        <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-5">
          <motion.div variants={motionV.item} className="flex items-center gap-2">
            <Badge variant="gold" size="sm">{AI_ANALYSIS_PERIOD_CONFIG[period]?.label ?? period}</Badge>
            <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">{analysisQ.data?.message}</span>
          </motion.div>

          <motion.div variants={motionV.item} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <HealthScoreSection data={report.health_score} />
            <CashFlowSection data={report.cash_flow_forecast} />
          </motion.div>

          <motion.div variants={motionV.item} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ConcentrationSection data={report.revenue_concentration} />
            <MemberEconomicsSection data={report.member_economics} />
          </motion.div>

          <motion.div variants={motionV.item} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AnomaliesSection anomalies={report.financial_anomalies} />
            <RecommendationsSection recommendations={report.recommendations} />
          </motion.div>

          <motion.div variants={motionV.item} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TrendsAlertsSection trends={report.positive_trends} alerts={report.alert_signals} />
            <ProjectionSection data={report.projection} />
          </motion.div>
        </motion.div>
      )}

      {/* ── Briefing Results ── */}
      {briefingOn && briefingQ.isLoading && (
        <NeuralLoading text="Generando briefing para la junta directiva…" />
      )}
      {briefingOn && briefingQ.isError && (
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10" />}
          title="Error al generar briefing"
          description={(briefingQ.error as Error)?.message || "No se pudo generar el briefing."}
          action={{ label: "Reintentar", onClick: () => briefingQ.refetch() }}
        />
      )}
      {briefing && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-[var(--color-gold-400)]" />
            <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Briefing para Junta Directiva</h3>
            <Badge variant="gold" size="sm">{briefing.period}</Badge>
          </div>
          <BriefingSection data={briefing} />
        </div>
      )}

      {/* ── Scenario Results ── */}
      {scenarioOn && scenarioQ.isLoading && (
        <NeuralLoading text="Simulando escenario financiero…" />
      )}
      {scenarioOn && scenarioQ.isError && (
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10" />}
          title="Error en simulación"
          description={(scenarioQ.error as Error)?.message || "No se pudo completar la simulación."}
          action={{ label: "Reintentar", onClick: () => scenarioQ.refetch() }}
        />
      )}
      {scenario && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-[var(--color-teal-400)]" />
            <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Simulación de Escenario</h3>
            <Badge variant="neutral" size="sm">{scenario.time_horizon_months} meses</Badge>
            <Badge variant={scenario.confidence === "high" ? "success" : scenario.confidence === "medium" ? "warning" : "danger"} size="sm">{scenario.confidence}</Badge>
          </div>
          <ScenarioSection data={scenario} />
        </div>
      )}

      {/* ── Advanced Tools — Glass wrapped ── */}
      {profitabilityOn && (
        <div
          className="glass-intelligence-section p-5"
          style={{ "--section-accent": "var(--color-emerald-400)" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-emerald-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Rentabilidad por Socio</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setProfitabilityOn(false)}>Ocultar</Button>
            </div>
            <MemberProfitabilityMatrix />
          </div>
        </div>
      )}

      {stressTestOn && (
        <div
          className="glass-intelligence-section p-5"
          style={{ "--section-accent": "var(--color-rose-400)" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--color-rose-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Prueba de Estrés Financiero</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStressTestOn(false)}>Ocultar</Button>
            </div>
            <StressTestPanel />
          </div>
        </div>
      )}

      {seasonalOn && (
        <div
          className="glass-intelligence-section p-5"
          style={{ "--section-accent": "var(--color-teal-400)" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-teal-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Calendario Estacional</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSeasonalOn(false)}>Ocultar</Button>
            </div>
            <SeasonalCalendar />
          </div>
        </div>
      )}

      {decisionOn && (
        <div
          className="glass-intelligence-section p-5"
          style={{ "--section-accent": "var(--color-gold-400)" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[var(--color-gold-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Simulador de Decisiones</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDecisionOn(false)}>Ocultar</Button>
            </div>
            <DecisionCockpit />
          </div>
        </div>
      )}

      {narrativeOn && (
        <div
          className="glass-intelligence-section p-5"
          style={{ "--section-accent": "var(--color-sage-400, var(--color-silver-400))" } as React.CSSProperties}
        >
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[var(--color-sage-400, var(--color-silver-400))]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">Narrativa AI</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNarrativeOn(false)}>Ocultar</Button>
            </div>
            <NarrativeEngine />
          </div>
        </div>
      )}
    </div>
  );
}