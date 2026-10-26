// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Stress Test Panel (Monte Carlo)
// Fase 19p REWRITE
//
// 6 innovations:
//   1. Distribution Histogram with Percentile Pins
//   2. Probability Threshold Explorer
//   3. Scenario Memory Overlay (compare P50 lines)
//   4. Break-Even Crossing Markers on fan chart
//   5. Confidence Width Ribbon at month 12
//   6. Real-Time Custom Engine (debounced auto-refetch)
//
// Rules: #1 tokens, #3 chartTheme, #8 formatCurrency,
//   #11 focus-visible, #12 touch, #14 EmptyState, #15 toast,
//   #17 Button, #18 reducedMotion, #20 breakpoint, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Activity, Zap, ShieldCheck, AlertTriangle, TrendingDown, RefreshCw,
  ChevronRight, BarChart3, Target, Save, Trash2,
  Layers,
} from "lucide-react";
import { Button, EmptyState, showToast } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, cn } from "@/shared/lib/utils";
import {
  CHART, TOOLTIP_STYLE, AXIS_TICK
} from "@/shared/lib/chartTheme";
import type { StressTestData, FanChartPoint } from "../types";
import {
  STRESS_SCENARIO_CONFIGS,
  STRESS_METRIC_CONFIG,
} from "../types";
import type { StressScenarioVariable } from "../types";
import './StressTestPanel.css';

/* ══════════════════════════════════════════════════════════
   Constants — HEX for SVG (Rule #3)
   ══════════════════════════════════════════════════════════ */

const FAN_CHART_LINES = {
  p10: { hex: "#C46470", label: "P10 (pesimista)" },
  p25: { hex: "#D4A840", label: "P25" },
  p50: { hex: "#C9A96E", label: "P50 (mediana)" },
  p75: { hex: "#2A9AB5", label: "P75" },
  p90: { hex: "#3DAA70", label: "P90 (optimista)" },
};

const FAN_AREA_FILL = {
  p10_p90: "rgba(201,169,110,0.06)",
  p25_p75: "rgba(201,169,110,0.10)",
};

const OVERLAY_COLORS = ["#6B7FD7", "#E8856B", "#8BC9A0"];

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

interface SavedScenario {
  id: string;
  name: string;
  color: string;
  fanChart: FanChartPoint[];
  pPositive: number;
  p50Final: number;
}

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

function probabilityColor(p: number): string {
  if (p >= 0.75) return "var(--color-emerald-400)";
  if (p >= 0.50) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function probabilityHex(p: number): string {
  if (p >= 0.75) return "#3DAA70";
  if (p >= 0.50) return "#D4A840";
  return "#C46470";
}

function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function skewLabel(s: number): { text: string; color: string } {
  if (s < -0.5) return { text: "Asimétrica negativa — riesgos más extremos", color: "var(--color-rose-400)" };
  if (s > 0.5) return { text: "Asimétrica positiva — oportunidades más extremas", color: "var(--color-emerald-400)" };
  return { text: "Aproximadamente simétrica", color: "var(--color-silver-400)" };
}

/** Detect break-even crossings in fan chart data (Propuesta 4) */
function findBreakEvenCrossings(fanChart: FanChartPoint[]): Array<{ month: string; key: keyof typeof FAN_CHART_LINES }> {
  const crossings: Array<{ month: string; key: keyof typeof FAN_CHART_LINES }> = [];
  for (let i = 1; i < fanChart.length; i++) {
    const prev = fanChart[i - 1]!;
    const curr = fanChart[i]!;
    for (const key of ["p10", "p25", "p50", "p75", "p90"] as const) {
      if ((prev[key] >= 0 && curr[key] < 0) || (prev[key] < 0 && curr[key] >= 0)) {
        crossings.push({ month: curr.month, key });
      }
    }
  }
  return crossings;
}

/* ══════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════ */

/** Neural Loading */
function NeuralLoading({ scenario }: { scenario: string }) {
  const scenarioName = STRESS_SCENARIO_CONFIGS.find((s) => s.id === scenario)?.name ?? scenario;
  return (
    <div className="glass-stress-panel p-8">
      <div className="relative z-[1] flex flex-col items-center justify-center py-8">
        <div className="relative w-20 h-20 mb-4">
          <Activity className="w-8 h-8 text-[var(--color-gold-400)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute top-1/2 left-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full border border-[rgba(201,169,110,0.25)]"
              style={{ animation: `intel-loading-ring 2.4s ease-out infinite`, animationDelay: `${i * 0.8}s` }} />
          ))}
        </div>
        <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1">
          Ejecutando Monte Carlo...
        </p>
        <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
          Escenario: {scenarioName}
        </p>
      </div>
    </div>
  );
}

/** Fan Chart Tooltip (Rule #2: solid) */
function FanChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const keys = ["p10", "p25", "p50", "p75", "p90"] as const;

  return (
    <div style={TOOLTIP_STYLE} className="p-3 min-w-[180px]">
      <p className="text-xs font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-2">{label}</p>
      <div className="space-y-1">
        {keys.map((key) => {
          const entry = payload.find((p) => p.dataKey === key);
          if (!entry) return null;
          const cfg = FAN_CHART_LINES[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">{cfg.label}</span>
              </span>
              <span className="text-xs font-bold font-[family-name:var(--font-mono)]" style={{ color: cfg.hex }}>
                {compactCurrency(entry.value)}
              </span>
            </div>
          );
        })}
        {/* Overlay P50 values */}
        {payload.filter((p) => p.dataKey.startsWith("overlay_p50_")).map((entry) => {
          const idx = parseInt(entry.dataKey.split("_").pop() ?? "0", 10);
          const color = OVERLAY_COLORS[idx % OVERLAY_COLORS.length]!;
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 pt-1 mt-1 border-t border-white/[0.04]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">Guardado P50</span>
              </span>
              <span className="text-xs font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
                {compactCurrency(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Distribution Histogram with Percentile Pins (Propuesta 1) */
function DistributionHistogram({ finalMonth }: { finalMonth: FanChartPoint }) {
  const mu = finalMonth.p50;
  const sigma = Math.max((finalMonth.p90 - finalMonth.p10) / 2.56, 1);
  const binCount = 28;
  const span = 3.5 * sigma;
  const binWidth = (span * 2) / binCount;

  const bins = Array.from({ length: binCount }, (_, i) => {
    const center = mu - span + i * binWidth + binWidth / 2;
    const z = (center - mu) / sigma;
    const height = Math.exp(-0.5 * z * z);
    return { center, height };
  });

  const svgW = binCount * 4;
  const svgH = 72;

  const percentiles = [
    { value: finalMonth.p10, color: FAN_CHART_LINES.p10.hex, label: "P10" },
    { value: finalMonth.p25, color: FAN_CHART_LINES.p25.hex, label: "P25" },
    { value: finalMonth.p50, color: FAN_CHART_LINES.p50.hex, label: "P50" },
    { value: finalMonth.p75, color: FAN_CHART_LINES.p75.hex, label: "P75" },
    { value: finalMonth.p90, color: FAN_CHART_LINES.p90.hex, label: "P90" },
  ];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full block" style={{ height: svgH }} aria-label="Histograma de distribución Monte Carlo">
        {/* Bars */}
        {bins.map((bin, i) => {
          const barH = bin.height * (svgH - 16);
          const x = i * 4 + 0.5;
          return (
            <rect key={i} x={x} y={svgH - barH - 4} width={3} height={barH} rx={0.5}
              fill="rgba(201, 169, 110, 0.3)" stroke="none" />
          );
        })}
        {/* Percentile pins */}
        {percentiles.map((p) => {
          const pct = ((p.value - (mu - span)) / (span * 2));
          const x = pct * svgW;
          return (
            <g key={p.label}>
              <line x1={x} y1={4} x2={x} y2={svgH - 2} stroke={p.color} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
              <text x={x} y={3} textAnchor="middle" fill={p.color} fontSize={5.5} fontFamily="var(--font-mono, monospace)" fontWeight="600">
                {p.label}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={0} y1={svgH - 4} x2={svgW} y2={svgH - 4} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
      </svg>
    </div>
  );
}

/** Confidence Width Ribbon (Propuesta 5) */
function ConfidenceWidthRibbon({ finalMonth }: { finalMonth: FanChartPoint }) {
  const spread = finalMonth.p90 - finalMonth.p10;
  const minVal = finalMonth.p10;
  const maxVal = finalMonth.p90;
  const range = maxVal - minVal || 1;

  // Map value to percentage position
  const p25Pct = ((finalMonth.p25 - minVal) / range) * 100;
  const p50Pct = ((finalMonth.p50 - minVal) / range) * 100;
  const p75Pct = ((finalMonth.p75 - minVal) / range) * 100;
  return (
    <div>
      <div className="glass-stress-ribbon mb-2">
        {/* P10-P90 full range */}
        <div className="absolute inset-0 rounded-16px" style={{ background: "rgba(201,169,110,0.06)" }} />
        {/* P25-P75 core range */}
        <div className="absolute top-1 bottom-1 rounded-full" style={{
          left: `${p25Pct}%`, right: `${100 - p75Pct}%`,
          background: "rgba(201,169,110,0.12)",
        }} />
        {/* P50 marker */}
        <div className="absolute top-0 bottom-0 w-0.5" style={{
          left: `${p50Pct}%`,
          background: "var(--color-gold-400)",
          boxShadow: "0 0 6px rgba(201,169,110,0.4)",
        }} />
      </div>
      <div className="flex items-center justify-between text-[10px] font-[family-name:var(--font-mono)]">
        <span className="text-[var(--color-rose-400)]">{compactCurrency(finalMonth.p10)}</span>
        <span className="text-[var(--color-gold-400)] font-bold">P50: {compactCurrency(finalMonth.p50)}</span>
        <span className="text-[var(--color-emerald-400)]">{compactCurrency(finalMonth.p90)}</span>
      </div>
      <p className="text-center text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1">
        Incertidumbre total: {compactCurrency(spread)} ({((spread / Math.abs(finalMonth.p50 || 1)) * 100).toFixed(0)}% del P50)
      </p>
    </div>
  );
}

/** Probability Threshold Explorer (Propuesta 2) */
function ProbabilityThresholdExplorer({ finalMonth }: { finalMonth: FanChartPoint }) {
  const mu = finalMonth.p50;
  const sigma = Math.max((finalMonth.p90 - finalMonth.p10) / 2.56, 1);
  const [target, setTarget] = useState(0);

  // Initialize target to 0 (break-even)
  useEffect(() => { setTarget(0); }, []);

  const prob = useMemo(() => {
    const z = (target - mu) / sigma;
    return 1 - normalCDF(z);
  }, [target, mu, sigma]);

  const color = probabilityColor(prob);
  const probHex = probabilityHex(prob);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
          Objetivo de cash flow a 12m
        </span>
        <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
          {formatCurrency(target)}
        </span>
      </div>
      <input
        type="range"
        min={Math.round(finalMonth.p10 * 0.8)}
        max={Math.round(finalMonth.p90 * 1.2)}
        step={Math.round(Math.abs(finalMonth.p90 - finalMonth.p10) / 40) || 100_000}
        value={target}
        onChange={(e) => setTarget(Number(e.target.value))}
        className="glass-stress-slider"
        aria-label="Objetivo de cash flow"
      />
      <div className="flex items-center justify-between mt-1 mb-4">
        <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
          {compactCurrency(Math.round(finalMonth.p10 * 0.8))}
        </span>
        <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
          {compactCurrency(Math.round(finalMonth.p90 * 1.2))}
        </span>
      </div>
      {/* Result */}
      <div className="text-center p-4 rounded-xl" style={{ background: `color-mix(in srgb, ${probHex} 8%, transparent)` }}>
        <p className="text-3xl font-bold font-[family-name:var(--font-display)]" style={{ color }}>
          {(prob * 100).toFixed(0)}%
        </p>
        <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mt-1">
          P(cash flow 12m &gt; {formatCurrency(target)})
        </p>
      </div>
    </div>
  );
}

/** Gauge Card */
function GaugeCard({ label, value, format, cfg }: {
  label: string;
  value: number | string;
  format: "percent" | "currency" | "month";
  cfg: { goodThreshold: number; warnThreshold: number };
}) {
  let displayValue: string;
  let color: string;
  let progressPct: number | null = null;

  if (format === "percent" && typeof value === "number") {
    displayValue = `${(value * 100).toFixed(0)}%`;
    color = probabilityColor(value);
    progressPct = value * 100;
  } else if (format === "currency" && typeof value === "number") {
    displayValue = formatCurrency(value);
    color = value >= cfg.goodThreshold ? "var(--color-emerald-400)" : value >= cfg.warnThreshold ? "var(--color-amber-400)" : "var(--color-rose-400)";
  } else {
    displayValue = String(value);
    color = "var(--color-gold-400)";
  }

  return (
    <div className="glass-stress-card p-4">
      <div className="relative z-[1]">
        <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-2">{label}</p>
        <p className="text-xl font-bold font-[family-name:var(--font-display)]" style={{ color }}>{displayValue}</p>
        {progressPct !== null && (
          <div className="mt-2 h-1.5 rounded-full bg-[var(--color-surface-3)]">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: probabilityHex(typeof value === "number" ? value : 0) }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Custom Scenario Editor — Real-Time (Propuesta 6) */
function CustomScenarioEditor({
  variables,
  onChange,
}: {
  variables: Record<string, { mu: number; sigma: number }>;
  onChange: (vars: Record<string, { mu: number; sigma: number }>) => void;
}) {
  const scenario = STRESS_SCENARIO_CONFIGS.find((s) => s.id === "custom")!;

  return (
    <div className="glass-stress-panel p-5">
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-4">
          <Target size={14} className="text-[var(--color-gold-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Editor de variables personalizadas
          </h3>
          <span className="text-[10px] text-[var(--color-teal-400)] font-[family-name:var(--font-ui)] ml-auto">
            Actualización en tiempo real
          </span>
        </div>
        <div className="space-y-4">
          {scenario.variables.map((v: StressScenarioVariable) => (
            <div key={v.key} className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]">
              <p className="text-xs font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] mb-1">{v.label}</p>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)] mb-3">{v.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">μ (media)</span>
                    <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                      {variables[v.key]?.mu ?? v.mu}{v.unit}
                    </span>
                  </div>
                  <input type="range" min={0} max={v.mu * 3} step={v.mu * 0.05}
                    value={variables[v.key]?.mu ?? v.mu}
                    onChange={(e) => onChange({ ...variables, [v.key]: { ...variables[v.key]!, mu: parseFloat(e.target.value) } })}
                    className="glass-stress-slider"
                    aria-label={`${v.label} media`} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">σ (dispersión)</span>
                    <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                      ±{(variables[v.key]?.sigma ?? v.sigma)}{v.unit}
                    </span>
                  </div>
                  <input type="range" min={0} max={v.sigma * 3} step={v.sigma * 0.1}
                    value={variables[v.key]?.sigma ?? v.sigma}
                    onChange={(e) => onChange({ ...variables, [v.key]: { ...variables[v.key]!, sigma: parseFloat(e.target.value) } })}
                    className="glass-stress-slider"
                    aria-label={`${v.label} dispersión`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function StressTestPanel() {
  const motionV = useMotion();
  const { isMobile } = useBreakpoint();

  const [activeScenario, setActiveScenario] = useState("recession");
  const [iterations, setIterations] = useState(1000);
  const [customVars, setCustomVars] = useState<Record<string, { mu: number; sigma: number }>>(() => {
    const init: Record<string, { mu: number; sigma: number }> = {};
    const custom = STRESS_SCENARIO_CONFIGS.find((s) => s.id === "custom");
    custom?.variables.forEach((v) => { init[v.key] = { mu: v.mu, sigma: v.sigma }; });
    return init;
  });
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

  const currentScenario = useMemo(
    () => STRESS_SCENARIO_CONFIGS.find((s) => s.id === activeScenario),
    [activeScenario],
  );

  /* ── Debounced custom vars for real-time engine (Propuesta 6) ── */
  const [debouncedVars, setDebouncedVars] = useState(customVars);
  useEffect(() => {
    if (activeScenario !== "custom") return;
    const timer = setTimeout(() => setDebouncedVars(customVars), 600);
    return () => clearTimeout(timer);
  }, [customVars, activeScenario]);

  /* ── Data ── */
  const testQ = useMCPQuery<{ status: string; data: StressTestData }>(
    "finance",
    "finance_stress_test",
    {
      scenario: activeScenario,
      iterations,
      variables: activeScenario === "custom" ? debouncedVars : undefined,
    },
    { staleTime: 300_000 },
  );

  const result = testQ.data?.data;

  /* ── Break-even crossings (Propuesta 4) ── */
  const breakEvenCrossings = useMemo(() => {
    if (!result) return [];
    return findBreakEvenCrossings(result.fan_chart);
  }, [result]);

  /* ── Final month for histogram/threshold/ribbon (Propuestas 1+2+5) ── */
  const finalMonth = useMemo(() => {
    if (!result || result.fan_chart.length === 0) return null;
    return result.fan_chart[result.fan_chart.length - 1]!;
  }, [result]);

  /* ── Merged chart data with overlays (Propuesta 3) ── */
  const mergedChart = useMemo(() => {
    if (!result) return [];
    return result.fan_chart.map((point, i) => {
      const merged: Record<string, number | string> = { ...point };
      savedScenarios.forEach((saved, idx) => {
        const savedPoint = saved.fanChart[i];
        if (savedPoint) merged[`overlay_p50_${idx}`] = savedPoint.p50;
      });
      return merged;
    });
  }, [result, savedScenarios]);

  /* ── Handlers ── */
  const handleSaveScenario = useCallback(() => {
    if (!result || !finalMonth) return;
    if (savedScenarios.length >= 3) {
      showToast({ type: "error", message: "Máximo 3 escenarios guardados" });
      return;
    }
    const color = OVERLAY_COLORS[savedScenarios.length % OVERLAY_COLORS.length]!;
    setSavedScenarios((prev) => [...prev, {
      id: `${activeScenario}-${Date.now()}`,
      name: result.scenario_name,
      color,
      fanChart: result.fan_chart,
      pPositive: result.metrics.p_positive_cashflow_12m,
      p50Final: finalMonth.p50,
    }]);
    showToast({ type: "success", message: `"${result.scenario_name}" guardado para comparar` });
  }, [result, finalMonth, activeScenario, savedScenarios.length]);

  const handleRemoveSaved = useCallback((id: string) => {
    setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /* ── Loading ── */
  if (testQ.isLoading && !result) {
    return <NeuralLoading scenario={activeScenario} />;
  }

  /* ── Render ── */
  return (
    <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6">

      {/* ── Scenario Selector ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-stress-panel p-5">
          <div className="relative z-[1]">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[var(--color-gold-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Escenario de estrés
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Iteraciones:</span>
                  {[100, 500, 1000].map((n) => (
                    <button key={n} type="button" onClick={() => setIterations(n)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium font-[family-name:var(--font-mono)] transition-colors min-h-[36px]",
                        iterations === n
                          ? "bg-[var(--color-gold-400)] text-[var(--color-abyss)]"
                          : "bg-[var(--color-surface-2)] text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)]",
                      )}>
                      {n.toLocaleString()}
                    </button>
                  ))}
                </div>
                <Button variant="secondary" onClick={() => { testQ.refetch(); showToast({ type: "info", message: "Test actualizado" }); }}
                  icon={<RefreshCw className={cn("w-4 h-4", testQ.isLoading && "animate-spin")} />}
                  className="text-xs">
                  Ejecutar
                </Button>
              </div>
            </div>
            {/* Scenario chips */}
            <div className="flex flex-wrap gap-2">
              {STRESS_SCENARIO_CONFIGS.map((s) => (
                <button key={s.id} type="button"
                  onClick={() => setActiveScenario(s.id)}
                  className={cn("glass-stress-chip", activeScenario === s.id && "glass-stress-chip--active")}
                  aria-pressed={activeScenario === s.id}
                  title={s.description}>
                  {s.name}
                </button>
              ))}
            </div>
            {currentScenario && (
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] mt-3">
                {currentScenario.description}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Custom Editor (Propuesta 6: real-time) ── */}
      {activeScenario === "custom" && (
        <motion.div variants={motionV.item}>
          <CustomScenarioEditor variables={customVars} onChange={setCustomVars} />
        </motion.div>
      )}

      {/* ── Scenario Memory Bar (Propuesta 3) ── */}
      {(savedScenarios.length > 0 || result) && (
        <motion.div variants={motionV.item}>
          <div className="glass-stress-panel p-3">
            <div className="relative z-[1] flex items-center gap-3 overflow-x-auto pb-0.5">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Layers size={12} className="text-[var(--color-silver-400)]" />
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Comparar:</span>
              </div>
              {savedScenarios.map((s) => (
                <div key={s.id} className="glass-stress-memory-chip flex-shrink-0">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-[family-name:var(--font-ui)] text-[var(--color-silver-300)]">{s.name}</span>
                  <span className="text-[10px] font-[family-name:var(--font-mono)]" style={{ color: probabilityColor(s.pPositive) }}>
                    {(s.pPositive * 100).toFixed(0)}%
                  </span>
                  <button type="button" onClick={() => handleRemoveSaved(s.id)}
                    className="text-[var(--color-silver-500)] hover:text-[var(--color-rose-400)] transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                    aria-label={`Quitar ${s.name}`}>
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
              {result && savedScenarios.length < 3 && (
                <button type="button" onClick={handleSaveScenario}
                  className="glass-stress-memory-chip flex-shrink-0 text-[var(--color-teal-400)]">
                  <Save size={10} />
                  <span className="text-xs font-[family-name:var(--font-ui)]">Guardar actual</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Results ── */}
      {!result && !testQ.isLoading && (
        <EmptyState icon={<Activity className="w-10 h-10" />} title="Sin resultados"
          description="Selecciona un escenario y ejecuta el test de estrés" />
      )}

      {result && (
        <>
          {/* ── Header ── */}
          <motion.div variants={motionV.item}>
            <div className="glass-stress-panel p-4">
              <div className="relative z-[1] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-200)]">
                    {result.scenario_name}
                  </h3>
                  <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                    {result.iterations.toLocaleString()} iteraciones Monte Carlo
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)]"
                  style={{
                    color: probabilityColor(result.metrics.p_positive_cashflow_12m),
                    backgroundColor: `color-mix(in srgb, ${probabilityHex(result.metrics.p_positive_cashflow_12m)} 12%, transparent)`,
                  }}>
                  P(cash flow +) = {(result.metrics.p_positive_cashflow_12m * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── Metrics Panel ── */}
          <motion.div variants={motionV.item}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(STRESS_METRIC_CONFIG).map(([key, cfg]) => {
                const val = result.metrics[key as keyof typeof result.metrics];
                return <GaugeCard key={key} label={cfg.label} value={val as number | string} format={cfg.format} cfg={cfg} />;
              })}
            </div>
          </motion.div>

          {/* ── Fan Chart + Break-Even Crossings (Propuesta 4) ── */}
          <motion.div variants={motionV.item}>
            <div className="glass-stress-panel p-5">
              <div className="relative z-[1]">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-[var(--color-gold-400)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                      Proyección de cash flow acumulado
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {(["p10", "p50", "p90"] as const).map((k) => (
                      <span key={k} className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FAN_CHART_LINES[k].hex }} />
                        <span className="text-[var(--color-silver-400)]">{FAN_CHART_LINES[k].label}</span>
                      </span>
                    ))}
                    {savedScenarios.map((s) => (
                      <span key={s.id} className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[var(--color-silver-400)]">{s.name} P50</span>
                      </span>
                    ))}
                  </div>
                </div>

                {breakEvenCrossings.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <AlertTriangle size={10} className="text-[var(--color-amber-400)]" />
                    <span className="text-[10px] text-[var(--color-amber-400)] font-[family-name:var(--font-ui)]">
                      Cruces break-even:
                    </span>
                    {breakEvenCrossings.map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-[family-name:var(--font-mono)]"
                        style={{ color: FAN_CHART_LINES[c.key].hex, backgroundColor: `color-mix(in srgb, ${FAN_CHART_LINES[c.key].hex} 10%, transparent)` }}>
                        {c.month} ({c.key.toUpperCase()})
                      </span>
                    ))}
                  </div>
                )}

                <ResponsiveContainer width="100%" height={isMobile ? 260 : 360}>
                  <AreaChart data={mergedChart} margin={{ top: 16, right: 24, bottom: 8, left: 24 }}>
                    <CartesianGrid stroke={CHART.gridStroke} />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} />
                    <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => compactCurrency(v)} axisLine={false} />
                    <Tooltip content={<FanChartTooltip />} />
                    <ReferenceLine y={0} stroke={CHART.axisTick} strokeWidth={1.5} strokeDasharray="8 4"
                      label={{ value: "Break-even", position: "right", fill: CHART.axisTick, fontSize: 10, fontFamily: "var(--font-ui, 'DM Sans')" }} />

                    {/* Break-even crossing markers (Propuesta 4) */}
                    {breakEvenCrossings.map((c, i) => (
                      <ReferenceLine key={`be-${i}`} x={c.month} stroke={FAN_CHART_LINES[c.key].hex}
                        strokeDasharray="3 3" strokeOpacity={0.4} />
                    ))}

                    {/* Fan bands */}
                    <Area type="monotone" dataKey="p10" stroke="none" fill={FAN_AREA_FILL.p10_p90} fillOpacity={1} stackId="fan10" />
                    <Area type="monotone" dataKey="p90" stroke="none" fill={FAN_AREA_FILL.p10_p90} fillOpacity={1} stackId="fan90diff" />
                    <Area type="monotone" dataKey="p25" stroke="none" fill={FAN_AREA_FILL.p25_p75} fillOpacity={1} stackId="fan25" />
                    <Area type="monotone" dataKey="p75" stroke="none" fill={FAN_AREA_FILL.p25_p75} fillOpacity={1} stackId="fan75diff" />

                    {/* Lines */}
                    <Area type="monotone" dataKey="p10" stroke={FAN_CHART_LINES.p10.hex} strokeWidth={1} strokeDasharray="4 3" fill="none" dot={false} />
                    <Area type="monotone" dataKey="p25" stroke={FAN_CHART_LINES.p25.hex} strokeWidth={1} strokeDasharray="2 2" fill="none" dot={false} />
                    <Area type="monotone" dataKey="p50" stroke={FAN_CHART_LINES.p50.hex} strokeWidth={2.5} fill="none"
                      dot={{ r: 3, fill: FAN_CHART_LINES.p50.hex, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: FAN_CHART_LINES.p50.hex, stroke: "#F0F2F5", strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="p75" stroke={FAN_CHART_LINES.p75.hex} strokeWidth={1} strokeDasharray="2 2" fill="none" dot={false} />
                    <Area type="monotone" dataKey="p90" stroke={FAN_CHART_LINES.p90.hex} strokeWidth={1} strokeDasharray="4 3" fill="none" dot={false} />

                    {/* Saved scenario P50 overlays (Propuesta 3) */}
                    {savedScenarios.map((saved, idx) => (
                      <Area key={`overlay-${idx}`} type="monotone" dataKey={`overlay_p50_${idx}`}
                        stroke={saved.color} strokeWidth={2} strokeDasharray="6 3" fill="none" dot={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* ── Confidence Width Ribbon (Propuesta 5) ── */}
          {finalMonth && (
            <motion.div variants={motionV.item}>
              <div className="glass-stress-panel p-5">
                <div className="relative z-[1]">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown size={14} className="text-[var(--color-teal-400)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-teal-400)] font-[family-name:var(--font-ui)]">
                      Incertidumbre a 12 meses
                    </h3>
                  </div>
                  <ConfidenceWidthRibbon finalMonth={finalMonth} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Distribution Histogram + Threshold Explorer (Propuestas 1+2) ── */}
          {finalMonth && (
            <motion.div variants={motionV.item}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Histogram (Propuesta 1) */}
                <div className="glass-stress-panel p-5">
                  <div className="relative z-[1]">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 size={14} className="text-[var(--color-gold-400)]" />
                      <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        Distribución de resultados
                      </h3>
                    </div>
                    <DistributionHistogram finalMonth={finalMonth} />
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {[
                        { label: "P10", value: finalMonth.p10, color: FAN_CHART_LINES.p10.hex },
                        { label: "P25", value: finalMonth.p25, color: FAN_CHART_LINES.p25.hex },
                        { label: "P50", value: finalMonth.p50, color: FAN_CHART_LINES.p50.hex },
                        { label: "P75", value: finalMonth.p75, color: FAN_CHART_LINES.p75.hex },
                        { label: "P90", value: finalMonth.p90, color: FAN_CHART_LINES.p90.hex },
                      ].map((p) => (
                        <div key={p.label} className="text-center">
                          <p className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">{p.label}</p>
                          <p className="text-[11px] font-bold font-[family-name:var(--font-mono)]" style={{ color: p.color }}>
                            {compactCurrency(p.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Skewness */}
                    <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-body)] italic mt-3 text-center">
                      {skewLabel(result.distribution_summary.skewness).text} (γ₁ = {result.distribution_summary.skewness.toFixed(2)})
                    </p>
                  </div>
                </div>

                {/* Threshold Explorer (Propuesta 2) */}
                <div className="glass-stress-panel p-5">
                  <div className="relative z-[1]">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={14} className="text-[var(--color-gold-400)]" />
                      <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        Explorador de probabilidad
                      </h3>
                    </div>
                    <ProbabilityThresholdExplorer finalMonth={finalMonth} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Assumptions ── */}
          {result.assumptions.length > 0 && (
            <motion.div variants={motionV.item}>
              <div className="glass-stress-panel p-5">
                <div className="relative z-[1]">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={14} className="text-[var(--color-silver-400)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">
                      Supuestos del modelo
                    </h3>
                  </div>
                  <ul className="space-y-1.5">
                    {result.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                        <ChevronRight size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-silver-500)]" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── AI Commentary ── */}
          {result.ai_commentary && (
            <motion.div variants={motionV.item}>
              <div className="glass-stress-panel p-5" style={{ borderLeft: "3px solid var(--color-gold-400)" }}>
                <div className="relative z-[1]">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-[var(--color-gold-400)]" />
                    <h3 className="text-sm font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)]">
                      Análisis AI
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed">
                    {result.ai_commentary}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}