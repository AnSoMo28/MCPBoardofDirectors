// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Member Profitability Matrix
// Fase 19l REWRITE
//
// 6 innovations:
//   1. Glass Profitability Surface (all containers → glass)
//   2. Mini Sparklines per Quadrant (margin distribution)
//   3. Quadrant Labels on Scatter (instant readability)
//   4. Active Quadrant Highlight (filtered quadrant brightens)
//   5. Churn Radial Gauge (semi-circular per row)
//   6. Glass Ranking Rows (hover + selection)
//
// Rules: #1 tokens, #3 chartTheme, #6 RC, #8 formatCurrency,
//   #11 focus-visible, #12 touch, #14 EmptyState, #15 toast,
//   #17 Button, #18 reducedMotion, #20 breakpoint,
//   #21 responsive table→cards, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  Users, TrendingUp, TrendingDown,
  ArrowUpDown, ChevronDown, ChevronUp, Target, ShieldAlert,
  Zap, BarChart3, Star, Activity, Brain,
} from "lucide-react";
import { Button, EmptyState } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, cn } from "@/shared/lib/utils";
import {
  CHART, TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type {
  MemberProfitabilityFamily,
  MemberProfitabilityData,
} from "../types";
import {
  QUADRANT_CONFIG,
  TIER_DISPLAY,
} from "../types";
import ExportButton from "@/shared/components/export/ExportButton";
import './MemberProfitabilityMatrix.css';

/* ══════════════════════════════════════════════════════════
   Constants — HEX values for SVG (Rule #3)
   ══════════════════════════════════════════════════════════ */

const QUADRANT_HEX: Record<string, string> = {
  star: "#3DAA70",
  workhorse: "#D4A840",
  potential: "#2A9AB5",
  risk: "#C46470",
};
/* ══════════════════════════════════════════════════════════
   Helpers
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

function compactCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `₡${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `₡${(v / 1_000).toFixed(0)}K`;
  return `₡${v.toLocaleString("es-CR")}`;
}

function churnRiskConfig(score: number): { color: string; label: string } {
  if (score <= 20) return { color: "var(--color-emerald-400)", label: "Bajo" };
  if (score <= 40) return { color: "var(--color-teal-400)", label: "Moderado" };
  if (score <= 60) return { color: "var(--color-amber-400)", label: "Medio" };
  if (score <= 80) return { color: "var(--color-rose-400)", label: "Alto" };
  return { color: "var(--color-rose-400)", label: "Crítico" };
}

function churnRiskHex(score: number): string {
  if (score <= 20) return "#3DAA70";
  if (score <= 40) return "#2A9AB5";
  if (score <= 60) return "#D4A840";
  return "#C46470";
}

type SortField = "family_name" | "tier" | "revenue_12m" | "cost_12m" | "margin_pct" | "trend_pct" | "ltv_estimate" | "churn_risk_score";
type SortDir = "asc" | "desc";
type QuadrantKey = "star" | "workhorse" | "potential" | "risk";

/* ══════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════ */

/** Neural Loading */
function NeuralLoading({ text }: { text: string }) {
  return (
    <div className="glass-profit-panel p-8">
      <div className="relative z-[1] flex flex-col items-center justify-center py-8">
        <div className="relative w-20 h-20 mb-4">
          <Brain className="w-8 h-8 text-[var(--color-gold-400)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full border border-[rgba(201,169,110,0.25)]"
              style={{
                animation: `intel-loading-ring 2.4s ease-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">{text}</p>
      </div>
    </div>
  );
}

/** Mini Sparkline (Propuesta 2) */
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-5" />;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const range = max - min || 1;
  const w = 48;
  const h = 20;
  const pts = sorted.map((v, i) => ({
    x: (i / (sorted.length - 1)) * w,
    y: h - 2 - ((v - min) / range) * (h - 4),
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </svg>
  );
}

/** Churn Radial Gauge (Propuesta 5) */
function ChurnGauge({ score }: { score: number }) {
  const size = 30;
  const r = 10;
  const circ = Math.PI * r;
  const fill = (score / 100) * circ;
  const color = churnRiskHex(score);
  const cx = size / 2;
  const cy = size / 2 + 2;
  const cfg = churnRiskConfig(score);
  return (
    <div className="flex items-center gap-1.5">
      <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`} aria-hidden="true">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${fill} ${circ - fill}`}
          style={{ transition: "stroke-dasharray 0.4s cubic-bezier(0.33,1,0.68,1)" }}
        />
      </svg>
      <div className="flex flex-col">
        <span className="font-[family-name:var(--font-mono)] text-[10px] leading-none" style={{ color: cfg.color }}>
          {score}
        </span>
        <span className="text-[8px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] leading-none">
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Custom Scatter Tooltip (Rule #2: solid, no blur)
   ══════════════════════════════════════════════════════════ */

function ScatterTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: MemberProfitabilityFamily }>;
}) {
  if (!active || !payload?.length) return null;
  const f = payload[0]!.payload;
  const tierCfg = TIER_DISPLAY[f.tier] ?? TIER_DISPLAY.basic;
  const quadCfg = QUADRANT_CONFIG[f.quadrant as QuadrantKey];
  const churn = churnRiskConfig(f.churn_risk_score);

  return (
    <div style={TOOLTIP_STYLE} className="p-3 max-w-[260px]">
      <p className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)] mb-1">
        {f.family_name}
      </p>
      <div className="flex items-center gap-2 mb-2">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-ui)]"
          style={{ color: tierCfg.color, backgroundColor: tierCfg.bgColor }}>
          {tierCfg.label}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-ui)]"
          style={{ color: quadCfg?.color, backgroundColor: quadCfg?.bgColor }}>
          {quadCfg?.label}
        </span>
      </div>
      <div className="space-y-1 text-xs font-[family-name:var(--font-mono)]">
        <div className="flex justify-between">
          <span className="text-[var(--color-silver-400)]">Revenue:</span>
          <span className="text-[var(--color-silver-200)]">{formatCurrency(f.revenue_12m)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-silver-400)]">Costo:</span>
          <span className="text-[var(--color-silver-200)]">{formatCurrency(f.cost_12m)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-silver-400)]">Margen:</span>
          <span style={{ color: f.margin_pct >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
            {f.margin_pct.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-silver-400)]">Churn risk:</span>
          <span style={{ color: churn.color }}>{f.churn_risk_score}/100 ({churn.label})</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Family Detail Card — GLASS (selected from scatter)
   ══════════════════════════════════════════════════════════ */

function FamilyDetailCard({ family, onClose }: {
  family: MemberProfitabilityFamily;
  onClose: () => void;
}) {
  const motionV = useMotion();
  const tierCfg = TIER_DISPLAY[family.tier] ?? TIER_DISPLAY.basic;
  const quadCfg = QUADRANT_CONFIG[family.quadrant as QuadrantKey];
  const churn = churnRiskConfig(family.churn_risk_score);
  const trendUp = family.trend_pct > 0;

  return (
    <motion.div
      variants={motionV.item}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <div
        className="glass-profit-panel p-5"
        style={{ borderLeft: `3px solid ${quadCfg?.color ?? "var(--color-silver-500)"}` }}
      >
        <div className="relative z-[1]">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-base font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                {family.family_name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]"
                  style={{ color: tierCfg.color, backgroundColor: tierCfg.bgColor }}>
                  {tierCfg.label}
                </span>
                <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                  {family.member_count} socios
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--color-silver-500)] hover:text-[var(--color-silver-200)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Cerrar detalle"
            >
              ✕
            </button>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Revenue 12m", value: formatCurrency(family.revenue_12m), color: "var(--color-silver-200)" },
              { label: "Costo 12m", value: formatCurrency(family.cost_12m), color: "var(--color-silver-200)" },
              {
                label: "Margen",
                value: `${family.margin_pct.toFixed(1)}%`,
                color: family.margin_pct >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)",
              },
              {
                label: "Tendencia",
                value: `${trendUp ? "+" : ""}${family.trend_pct.toFixed(1)}%`,
                color: trendUp ? "var(--color-emerald-400)" : "var(--color-rose-400)",
              },
              { label: "LTV estimado", value: formatCurrency(family.ltv_estimate), color: "var(--color-gold-400)" },
              {
                label: "Churn risk",
                value: `${family.churn_risk_score}/100 — ${churn.label}`,
                color: churn.color,
              },
            ].map((m) => (
              <div key={m.label} className="p-2.5 rounded-lg bg-[var(--color-surface-2)]">
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">
                  {m.label}
                </p>
                <p className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color: m.color }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div className="p-3 rounded-lg bg-[var(--color-surface-1)] border border-white/[0.04]">
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1 uppercase tracking-wider">
              Insight AI
            </p>
            <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed">
              {family.ai_insight}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
            <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              Fuente: {family.top_revenue_source}
            </span>
            <span className="text-[var(--color-silver-600)]">·</span>
            <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              Última actividad: {new Date(family.last_activity_date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function MemberProfitabilityMatrix() {
  const motionV = useMotion();
  const { isMobile, isDesktop } = useBreakpoint();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quadrantFilter, setQuadrantFilter] = useState<QuadrantKey | "">("");
  const [sortField, setSortField] = useState<SortField>("revenue_12m");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* ── Data ── */

  const profQ = useMCPQuery<{ status: string; data: MemberProfitabilityData }>(
    "finance",
    "finance_member_profitability",
    {},
    { staleTime: 300_000 },
  );

  const data = profQ.data?.data;
  const families = data?.families ?? [];
  const summary = data?.summary;

  /* ── Computed ── */

  const avgRevenue = useMemo(() => {
    if (!families.length) return 0;
    return families.reduce((s, f) => s + f.revenue_12m, 0) / families.length;
  }, [families]);

  const avgCost = useMemo(() => {
    if (!families.length) return 0;
    return families.reduce((s, f) => s + f.cost_12m, 0) / families.length;
  }, [families]);

  const xDomain = useMemo<[number, number]>(() => {
    if (!families.length) return [0, 1];
    const max = Math.max(...families.map((f) => f.revenue_12m));
    return [0, max * 1.15];
  }, [families]);

  const yDomain = useMemo<[number, number]>(() => {
    if (!families.length) return [0, 1];
    const max = Math.max(...families.map((f) => f.cost_12m));
    return [0, max * 1.15];
  }, [families]);

  /** Margin distributions per quadrant for sparklines (Propuesta 2) */
  const quadrantMargins = useMemo(() => {
    const map: Record<QuadrantKey, number[]> = { star: [], workhorse: [], potential: [], risk: [] };
    families.forEach((f) => {
      const qk = f.quadrant as QuadrantKey;
      if (qk in map) map[qk].push(f.margin_pct);
    });
    return map;
  }, [families]);

  const selectedFamily = useMemo(
    () => families.find((f) => f.family_id === selectedId) ?? null,
    [families, selectedId],
  );

  const filtered = useMemo(() => {
    if (!quadrantFilter) return families;
    return families.filter((f) => f.quadrant === quadrantFilter);
  }, [families, quadrantFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir(field === "family_name" ? "asc" : "desc");
      }
    },
    [sortField],
  );

  const handleDotClick = useCallback(
    (familyId: string) => {
      setSelectedId((prev) => (prev === familyId ? null : familyId));
    },
    [],
  );

  /* ── Loading / Empty ── */

  if (profQ.isLoading && !data) {
    return <NeuralLoading text="Analizando rentabilidad por familia…" />;
  }

  if (!data || families.length === 0) {
    return (
      <div className="glass-profit-panel p-8 text-center max-w-lg mx-auto">
        <div className="relative z-[1]">
          <EmptyState icon={<Users className="w-10 h-10" />} title="Sin datos" description="No hay datos de rentabilidad disponibles" />
        </div>
      </div>
    );
  }

  /* ── Render ── */

  const quadrantOrder: QuadrantKey[] = ["star", "workhorse", "potential", "risk"];
  const quadrantIcons: Record<QuadrantKey, typeof Star> = {
    star: Star,
    workhorse: Activity,
    potential: Zap,
    risk: ShieldAlert,
  };

  return (
    <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6">

      {/* ── Summary Strip with Sparklines (Propuestas 1+2) ── */}
      <motion.div variants={motionV.item}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {quadrantOrder.map((qk) => {
            const cfg = QUADRANT_CONFIG[qk];
            const count = summary?.[`${qk}_count` as keyof typeof summary] as number ?? 0;
            const Icon = quadrantIcons[qk];
            const margins = quadrantMargins[qk];
            return (
              <div
                key={qk}
                className="glass-profit-card glass-profit-card--quadrant"
                style={{ "--quadrant-color": cfg.color } as React.CSSProperties}
              >
                <div className="relative z-[1]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} style={{ color: cfg.color }} />
                      <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">{cfg.label}</p>
                    </div>
                    <MiniSparkline values={margins} color={cfg.color} />
                  </div>
                  <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-200)]">{count}</p>
                </div>
              </div>
            );
          })}
          <div className="glass-profit-card">
            <div className="relative z-[1]">
              <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-2">Concentración Top10</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-gold-400)]">
                {summary?.revenue_concentration_top10_pct.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Scatter Chart + Detail — GLASS (Propuestas 1+3+4) ── */}
      <motion.div variants={motionV.item}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="glass-profit-scatter lg:col-span-2">
            <div className="relative z-[1]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[var(--color-gold-400)]" />
                  <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                    Mapa de rentabilidad por familia
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] hidden sm:block">
                    Tamaño = # socios · Click para detalle
                  </p>
                  <ExportButton
                    module="rentabilidad-socios"
                    onPrint={() => window.print()}
                  />
                </div>
              </div>

              <div className="relative">
                <ResponsiveContainer width="100%" height={isMobile ? 300 : 380}>
                  <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 24 }}>
                    <CartesianGrid stroke={CHART.gridStroke} />

                    {/* Quadrant backgrounds — Propuesta 4: active highlight */}
                    <ReferenceArea
                      x1={avgRevenue} x2={xDomain[1]} y1={0} y2={avgCost}
                      fill="#3DAA70"
                      fillOpacity={quadrantFilter === "star" ? 0.12 : 0.04}
                      strokeOpacity={0}
                    />
                    <ReferenceArea
                      x1={avgRevenue} x2={xDomain[1]} y1={avgCost} y2={yDomain[1]}
                      fill="#D4A840"
                      fillOpacity={quadrantFilter === "workhorse" ? 0.12 : 0.04}
                      strokeOpacity={0}
                    />
                    <ReferenceArea
                      x1={0} x2={avgRevenue} y1={0} y2={avgCost}
                      fill="#2A9AB5"
                      fillOpacity={quadrantFilter === "potential" ? 0.12 : 0.04}
                      strokeOpacity={0}
                    />
                    <ReferenceArea
                      x1={0} x2={avgRevenue} y1={avgCost} y2={yDomain[1]}
                      fill="#C46470"
                      fillOpacity={quadrantFilter === "risk" ? 0.12 : 0.04}
                      strokeOpacity={0}
                    />

                    <XAxis
                      type="number"
                      dataKey="revenue_12m"
                      domain={xDomain}
                      tick={AXIS_TICK}
                      tickFormatter={(v: number) => compactCurrency(v)}
                      name="Revenue"
                    />
                    <YAxis
                      type="number"
                      dataKey="cost_12m"
                      domain={yDomain}
                      tick={AXIS_TICK}
                      tickFormatter={(v: number) => compactCurrency(v)}
                      name="Costo"
                    />

                    <Tooltip content={<ScatterTooltip />} cursor={false} />

                    {/* Quadrant dividers */}
                    <ReferenceLine
                      x={avgRevenue}
                      stroke={CHART.axisTick}
                      strokeDasharray="6 4"
                      strokeOpacity={0.4}
                    />
                    <ReferenceLine
                      y={avgCost}
                      stroke={CHART.axisTick}
                      strokeDasharray="6 4"
                      strokeOpacity={0.4}
                    />

                    <Scatter
                      data={families}
                      shape={(props: unknown) => {
                        const p = props as Record<string, unknown>;
                        const cx = p.cx as number;
                        const cy = p.cy as number;
                        const payload = p.payload as MemberProfitabilityFamily;
                        if (!cx || !cy || !payload) return <g />;
                        const r = 8 + payload.member_count * 2.5;
                        const hexFill = QUADRANT_HEX[payload.quadrant] ?? "#8A95A5";
                        const isSelected = payload.family_id === selectedId;
                        return (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected ? r + 3 : r}
                              fill={hexFill}
                              fillOpacity={isSelected ? 0.9 : 0.6}
                              stroke={isSelected ? "#F0F2F5" : hexFill}
                              strokeWidth={isSelected ? 3 : 2}
                              style={{ cursor: "pointer", transition: "r 0.2s ease, fill-opacity 0.2s ease" }}
                              onClick={() => handleDotClick(payload.family_id)}
                            />
                            {isDesktop && (
                              <text
                                x={cx}
                                y={cy - r - 6}
                                textAnchor="middle"
                                fill={CHART.axisLabel}
                                fontSize={10}
                                fontFamily="var(--font-ui, 'DM Sans')"
                                style={{ pointerEvents: "none" }}
                              >
                                {payload.family_name.split(" ")[0]}
                              </text>
                            )}
                          </g>
                        );
                      }}
                    >
                      {families.map((f, i) => (
                        <Cell key={`cell-${i}`} fill={QUADRANT_HEX[f.quadrant] ?? "#8A95A5"} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>

                {/* Quadrant Labels (Propuesta 3) */}
                <div className={cn(
                  "quadrant-label top-4 right-6",
                  quadrantFilter === "star" && "quadrant-label--active",
                )} style={{ color: "#3DAA70" }}>Star</div>
                <div className={cn(
                  "quadrant-label bottom-10 right-6",
                  quadrantFilter === "workhorse" && "quadrant-label--active",
                )} style={{ color: "#D4A840" }}>Workhorse</div>
                <div className={cn(
                  "quadrant-label top-4 left-8",
                  quadrantFilter === "potential" && "quadrant-label--active",
                )} style={{ color: "#2A9AB5" }}>Potencial</div>
                <div className={cn(
                  "quadrant-label bottom-10 left-8",
                  quadrantFilter === "risk" && "quadrant-label--active",
                )} style={{ color: "#C46470" }}>Riesgo</div>
              </div>
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedFamily ? (
                <FamilyDetailCard
                  key={selectedFamily.family_id}
                  family={selectedFamily}
                  onClose={() => setSelectedId(null)}
                />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="glass-profit-panel p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
                    <div className="relative z-[1]">
                      <Target size={32} className="text-[var(--color-silver-500)] mb-3 mx-auto" />
                      <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                        Haz clic en un punto del gráfico para ver el detalle de la familia
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Quadrant Strategy Cards — GLASS (Propuestas 1+4) ── */}
      <motion.div variants={motionV.item}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quadrantOrder.map((qk) => {
            const cfg = QUADRANT_CONFIG[qk];
            const isActive = quadrantFilter === qk;
            const Icon = quadrantIcons[qk];
            return (
              <button
                key={qk}
                type="button"
                onClick={() => setQuadrantFilter(isActive ? "" : qk)}
                className={cn(
                  "glass-profit-card glass-profit-card--quadrant text-left focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                  isActive && "glass-profit-card--active",
                )}
                style={{ "--quadrant-color": cfg.color } as React.CSSProperties}
                aria-pressed={isActive}
              >
                <div className="relative z-[1]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} style={{ color: cfg.color }} />
                    <span className="text-sm font-bold font-[family-name:var(--font-ui)]" style={{ color: cfg.color }}>{cfg.label}</span>
                    {summary && (
                      <span className="ml-auto px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                        {summary[`${qk}_count` as keyof typeof summary] as number}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed">
                    {cfg.strategy}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Ranking: Table (desktop) + Cards (mobile) — GLASS (Propuestas 1+5+6) ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-profit-panel p-5">
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Ranking de familias
                {quadrantFilter && (
                  <span className="ml-2 text-xs font-normal" style={{ color: QUADRANT_CONFIG[quadrantFilter].color }}>
                    ({QUADRANT_CONFIG[quadrantFilter].label})
                  </span>
                )}
              </h3>
              {quadrantFilter && (
                <Button variant="ghost" onClick={() => setQuadrantFilter("")} className="text-xs">
                  Limpiar filtro
                </Button>
              )}
            </div>

            {/* Desktop table — hidden on mobile (Rule #21) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs font-[family-name:var(--font-ui)]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {([
                      { field: "family_name" as SortField, label: "Familia" },
                      { field: "tier" as SortField, label: "Tier" },
                      { field: "revenue_12m" as SortField, label: "Revenue" },
                      { field: "cost_12m" as SortField, label: "Costo" },
                      { field: "margin_pct" as SortField, label: "Margen" },
                      { field: "trend_pct" as SortField, label: "Tendencia" },
                      { field: "ltv_estimate" as SortField, label: "LTV" },
                      { field: "churn_risk_score" as SortField, label: "Churn" },
                    ]).map((col) => (
                      <th key={col.field}>
                        <button
                          type="button"
                          onClick={() => toggleSort(col.field)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider",
                            "text-[var(--color-silver-500)] hover:text-[var(--color-silver-300)] transition-colors min-h-[44px]",
                            sortField === col.field && "text-[var(--color-gold-400)]",
                          )}
                        >
                          {col.label}
                          {sortField === col.field && (
                            sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                          {sortField !== col.field && <ArrowUpDown size={10} className="opacity-30" />}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((f) => {
                    const tierCfg = TIER_DISPLAY[f.tier] ?? TIER_DISPLAY.basic;
                    const isSelected = f.family_id === selectedId;
                    const quadColor = QUADRANT_HEX[f.quadrant] ?? "var(--color-silver-500)";
                    return (
                      <tr
                        key={f.family_id}
                        className={cn(
                          "glass-profit-row",
                          isSelected && "glass-profit-row--selected",
                        )}
                        style={isSelected ? { "--quadrant-color": quadColor } as React.CSSProperties : undefined}
                        onClick={() => handleDotClick(f.family_id)}
                      >
                        <td className="px-2 py-3 font-medium text-[var(--color-silver-200)]">{f.family_name}</td>
                        <td className="px-2 py-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ color: tierCfg.color, backgroundColor: tierCfg.bgColor }}>
                            {tierCfg.label}
                          </span>
                        </td>
                        <td className="px-2 py-3 font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                          {formatCurrency(f.revenue_12m)}
                        </td>
                        <td className="px-2 py-3 font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                          {formatCurrency(f.cost_12m)}
                        </td>
                        <td className="px-2 py-3 font-[family-name:var(--font-mono)] font-bold"
                          style={{ color: f.margin_pct >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                          {f.margin_pct.toFixed(1)}%
                        </td>
                        <td className="px-2 py-3">
                          <span className="flex items-center gap-1 font-[family-name:var(--font-mono)]"
                            style={{ color: f.trend_pct >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                            {f.trend_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {f.trend_pct > 0 ? "+" : ""}{f.trend_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-2 py-3 font-[family-name:var(--font-mono)] text-[var(--color-gold-400)]">
                          {compactCurrency(f.ltv_estimate)}
                        </td>
                        <td className="px-2 py-3">
                          <ChurnGauge score={f.churn_risk_score} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — visible on mobile only (Rule #21) — Propuesta 1 */}
            <div className="sm:hidden space-y-3">
              {sorted.map((f) => {
                const tierCfg = TIER_DISPLAY[f.tier] ?? TIER_DISPLAY.basic;
                const quadCfg = QUADRANT_CONFIG[f.quadrant as QuadrantKey];
                const churn = churnRiskConfig(f.churn_risk_score);
                const isSelected = f.family_id === selectedId;
                return (
                  <button
                    key={f.family_id}
                    type="button"
                    onClick={() => handleDotClick(f.family_id)}
                    className={cn(
                      "glass-profit-mobile-card",
                      isSelected && "glass-profit-mobile-card--selected",
                    )}
                  >
                    <div className="relative z-[1]">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                            {f.family_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ color: tierCfg.color, backgroundColor: tierCfg.bgColor }}>
                              {tierCfg.label}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ color: quadCfg?.color, backgroundColor: quadCfg?.bgColor }}>
                              {quadCfg?.label}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                          {formatCurrency(f.revenue_12m)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <p className="text-[10px] text-[var(--color-silver-500)]">Costo</p>
                          <p className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                            {formatCurrency(f.cost_12m)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--color-silver-500)]">Margen</p>
                          <p className="text-xs font-bold font-[family-name:var(--font-mono)]"
                            style={{ color: f.margin_pct >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                            {f.margin_pct.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--color-silver-500)]">Churn</p>
                          <p className="text-xs font-[family-name:var(--font-mono)]" style={{ color: churn.color }}>
                            {f.churn_risk_score}/100
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}