// src/features/finance/components/FinancialIntelligence.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Financial Intelligence
// FASE 14, B4 — Premium Redesign
//
// Tab 3 "Inteligencia" — Eight sub-features:
//   1. Scenario Simulator — modify variables, see projected impact
//   2. Opportunity Scanner — AI-identified revenue opportunities
//   3. Board Briefing — auto-generated executive briefing
//   4. Member Profitability — scatter plot revenue vs cost per family
//   5. Stress Test — Monte Carlo financial resilience
//   6. Seasonal Calendar — Costa Rica financial seasonality
//   7. Narrative Engine — AI narrative generation
//   8. Decision Cockpit — strategic decision workspace
//
// Rules: #1 tokens, #2 no blur, #3 chartTheme, #6 RC,
//   #8 formatCurrency, #11 focus-visible, #12 touch,
//   #15 toast, #17 Button, #18 reducedMotion, #20 breakpoint,
//   #22 cn
// ═══════════════════════════════════════════════════════════

import ExportButton from "@/shared/components/export/ExportButton";
import {
  useState, useCallback, useMemo, useEffect, useRef,
  lazy, Suspense,
} from "react";
import {
  SlidersHorizontal, Radar, FileText, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, Clock, XCircle,
  Send, RefreshCw, Sparkles, ArrowRight,
  ShieldCheck, Target, Lightbulb,
  Users, Activity, CalendarDays, Crosshair,
} from "lucide-react";
import { Card, Button, showToast } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, cn } from "@/shared/lib/utils";
import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import type {
  ScenarioSimulationData, ScenarioVariableConfig, ScenarioRisk,
  OpportunityScanData, OpportunityItem,
  BoardBriefingData, BriefingMetric, BriefingSection,
  BriefingAlert, BriefingRecommendation, BriefingDecision,
} from "../types";
import {
  SCENARIO_VARIABLE_DEFAULTS, SCENARIO_CATEGORY_LABELS,
  OPPORTUNITY_CATEGORY_CONFIG, OPPORTUNITY_STATUS_CONFIG,
  ANOMALY_SEVERITY_CONFIG, ALERT_SEVERITY_CONFIG,
  BRIEFING_SECTION_SEVERITY_CONFIG, METRIC_ASSESSMENT_CONFIG,
} from "../types";
import { motion, AnimatePresence, type Variants } from "framer-motion";
/* ══════════════════════════════════════════════════════════
   Lazy-loaded sub-features
   ══════════════════════════════════════════════════════════ */

const MemberProfitabilityMatrix = lazy(() => import("./MemberProfitabilityMatrix"));
const StressTestPanel = lazy(() => import("./StressTestPanel"));
const SeasonalCalendar = lazy(() => import("./SeasonalCalendar"));
const NarrativeEngine = lazy(() => import("./NarrativeEngine"));
const DecisionCockpit = lazy(() => import("./DecisionCockpit"));

/* ══════════════════════════════════════════════════════════
   Premium CSS — sliders, shimmer, ambient effects
   ══════════════════════════════════════════════════════════ */

const PREMIUM_CSS = `
  /* ── Custom Range Slider ─────────────────────────── */
  .intel-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    transition: box-shadow 0.25s ease;
  }
  .intel-slider:focus-visible {
    box-shadow: 0 0 0 3px rgba(212,175,55,0.35);
  }
  .intel-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-gold-400);
    border: 3px solid var(--color-surface-1);
    box-shadow: 0 0 0 2px rgba(212,175,55,0.3), 0 2px 8px rgba(0,0,0,0.4);
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
  }
  .intel-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(212,175,55,0.35), 0 4px 16px rgba(0,0,0,0.5);
  }
  .intel-slider::-webkit-slider-thumb:active {
    transform: scale(1.1);
  }
  .intel-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-gold-400);
    border: 3px solid var(--color-surface-1);
    box-shadow: 0 0 0 2px rgba(212,175,55,0.3), 0 2px 8px rgba(0,0,0,0.4);
    cursor: pointer;
  }
  .intel-slider::-moz-range-track {
    height: 6px;
    border-radius: 3px;
  }

  /* ── Shimmer Skeleton ────────────────────────────── */
  @keyframes intel-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0;  }
  }
  .intel-skeleton {
    background: linear-gradient(
      90deg,
      var(--color-surface-2) 0%,
      var(--color-surface-3) 40%,
      var(--color-surface-2) 80%
    );
    background-size: 800px 100%;
    animation: intel-shimmer 1.8s ease infinite;
    border-radius: 16px;
  }

  /* ── Ambient Pulse (KPI cards) ───────────────────── */
  @keyframes intel-pulse {
    0%, 100% { opacity: 0.06; transform: scale(1);   }
    50%      { opacity: 0.10; transform: scale(1.08); }
  }
  .intel-ambient-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    animation: intel-pulse 4s ease-in-out infinite;
  }

  /* ── Gradient Border Card ────────────────────────── */
  .intel-gradient-border {
    position: relative;
  }
  .intel-gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(212,175,55,0.18), transparent 55%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    transition: background 0.4s ease;
  }
  .intel-gradient-border:hover::before {
    background: linear-gradient(135deg, rgba(212,175,55,0.30), rgba(212,175,55,0.05) 70%);
  }

  /* ── Tab Pill Indicator ──────────────────────────── */
  @keyframes intel-glow-pulse {
    0%, 100% { box-shadow: 0 0 0 1px rgba(212,175,55,0.20), 0 0 20px -8px rgba(212,175,55,0.15); }
    50%      { box-shadow: 0 0 0 1px rgba(212,175,55,0.30), 0 0 24px -6px rgba(212,175,55,0.20); }
  }

  /* ── Confidence Ring ─────────────────────────────── */
  @keyframes intel-ring-draw {
    from { stroke-dashoffset: 283; }
  }
  .intel-ring-animated {
    animation: intel-ring-draw 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* ── Noise Texture Overlay ───────────────────────── */
  .intel-noise::after {
    content: '';
    position: fixed;
    inset: 0;
    opacity: 0.025;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ── Scrollbar ───────────────────────────────────── */
  .intel-scroll::-webkit-scrollbar { height: 4px; }
  .intel-scroll::-webkit-scrollbar-track { background: transparent; }
  .intel-scroll::-webkit-scrollbar-thumb { background: var(--color-surface-3); border-radius: 2px; }
  .intel-scroll::-webkit-scrollbar-thumb:hover { background: var(--color-gold-400); }
`;

/* ══════════════════════════════════════════════════════════
   Motion Presets
   ══════════════════════════════════════════════════════════ */

const SPRING_BOUNCY  = { type: "spring" as const, stiffness: 400, damping: 28 };
const SPRING_SMOOTH  = { type: "spring" as const, stiffness: 300, damping: 30 };
const EASE_EXPONENTIAL = [0.16, 1, 0.3, 1] as const;

const VARIANTS_CONTAINER: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const VARIANTS_ITEM: Variants = {
  hidden:  { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

const VARIANTS_ITEM_FAST: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced ? undefined : VARIANTS_CONTAINER,
    item:      reduced ? undefined : VARIANTS_ITEM,
    itemFast:  reduced ? undefined : VARIANTS_ITEM_FAST,
  };
}

/* ══════════════════════════════════════════════════════════
   Animated Number — counts up on value change
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   Confidence Ring — SVG circular progress
   ══════════════════════════════════════════════════════════ */

function ConfidenceRing({
  value,
  size = 40,
  stroke = 3.5,
  color,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="intel-ring-animated"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════
   Delta Bar — visual horizontal bar for delta magnitude
   ══════════════════════════════════════════════════════════ */

function DeltaBar({
  value,
  maxAbs,
  color,
}: {
  value: number;
  maxAbs: number;
  color: string;
}) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs * 100, 100) : 0;
  return (
    <div className="h-1 w-full rounded-full bg-[var(--color-surface-3)] overflow-hidden mt-2">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: EASE_EXPONENTIAL }}
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function deltaColor(val: number, invert = false): string {
  if (val === 0) return "var(--color-silver-400)";
  const positive = invert ? val < 0 : val > 0;
  return positive ? "var(--color-emerald-400)" : "var(--color-rose-400)";
}

function deltaIcon(val: number, invert = false) {
  if (val === 0) return <Minus size={13} />;
  const positive = invert ? val < 0 : val > 0;
  return positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />;
}

function effortColor(e: string): string {
  if (e === "low") return "var(--color-emerald-400)";
  if (e === "medium") return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function effortLabel(e: string): string {
  if (e === "low") return "Bajo";
  if (e === "medium") return "Medio";
  return "Alto";
}

function confidenceInfo(c: number): { color: string; label: string } {
  if (c >= 80) return { color: "var(--color-emerald-400)", label: "Alta" };
  if (c >= 60) return { color: "var(--color-amber-400)", label: "Media" };
  return { color: "var(--color-rose-400)", label: "Baja" };
}

function sliderFill(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, var(--color-gold-400) ${pct}%, var(--color-surface-3) ${pct}%)`;
}

/* ══════════════════════════════════════════════════════════
   Premium Skeleton — shimmer loading block
   ══════════════════════════════════════════════════════════ */

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn("intel-skeleton", className)} />;
}

/* ══════════════════════════════════════════════════════════
   Sub-tabs
   ══════════════════════════════════════════════════════════ */

type IntelTab =
  | "narrative" | "simulator" | "opportunities" | "briefing"
  | "profitability" | "stress" | "calendar" | "decision";

const INTEL_TABS: Array<{ id: IntelTab; label: string; icon: typeof SlidersHorizontal }> = [
  { id: "narrative",     label: "Narrativa",    icon: Sparkles },
  { id: "simulator",     label: "Simulador",    icon: SlidersHorizontal },
  { id: "opportunities", label: "Oportunidades", icon: Radar },
  { id: "briefing",      label: "Briefing",     icon: FileText },
  { id: "profitability", label: "Rentabilidad", icon: Users },
  { id: "stress",        label: "Estrés",       icon: Activity },
  { id: "calendar",      label: "Calendario",   icon: CalendarDays },
  { id: "decision",      label: "Decisiones",   icon: Crosshair },
];

/* ══════════════════════════════════════════════════════════
   Premium Tab Bar
   ══════════════════════════════════════════════════════════ */

function IntelTabBar({
  active,
  onChange,
}: {
  active: IntelTab;
  onChange: (id: IntelTab) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <nav
      role="tablist"
      aria-label="Inteligencia financiera"
      className="intel-scroll relative flex gap-1 overflow-x-auto pb-1 rounded-2xl
                 bg-[var(--color-surface-1)] border border-white/[0.06] p-1.5"
    >
      {INTEL_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px]",
              "font-semibold font-[family-name:var(--font-ui)] transition-colors",
              "min-h-[44px] whitespace-nowrap flex-shrink-0 outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--color-gold-400)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-surface-1)]",
              isActive
                ? "text-[var(--color-silver-100)]"
                : "text-[var(--color-silver-500)] hover:text-[var(--color-silver-300)]",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="intel-tab-indicator"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))",
                  boxShadow: "0 0 0 1px rgba(212,175,55,0.20), 0 4px 16px -6px rgba(212,175,55,0.12)",
                }}
                transition={reduced ? { duration: 0 } : SPRING_BOUNCY}
              />
            )}
            <Icon size={15} className="relative z-10 flex-shrink-0" />
            <span className="relative z-10 hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════
   Ambient Background — subtle radial glow
   ══════════════════════════════════════════════════════════ */

function AmbientGlow({
  color = "var(--color-gold-400)",
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("intel-ambient-orb", className)}
      style={{
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        opacity: 0.06,
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════════
   1. SCENARIO SIMULATOR
   ══════════════════════════════════════════════════════════ */

function ScenarioSimulator() {
  const motionV = useMotion();
  const reduced = useReducedMotion();
  const [variables, setVariables] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    SCENARIO_VARIABLE_DEFAULTS.forEach((v) => { init[v.key] = v.defaultValue; });
    return init;
  });

  const simQ = useMCPQuery<{ status: string; data: ScenarioSimulationData }>(
    "finance", "finance_scenario_simulate", { variables }, { staleTime: 300_000 },
  );
  const sim = simQ.data?.data;

  const updateVar = useCallback((key: string, val: number) => {
    setVariables((prev) => ({ ...prev, [key]: val }));
  }, []);

  const resetVars = useCallback(() => {
    const init: Record<string, number> = {};
    SCENARIO_VARIABLE_DEFAULTS.forEach((v) => { init[v.key] = v.defaultValue; });
    setVariables(init);
  }, []);

  const hasChanges = SCENARIO_VARIABLE_DEFAULTS.some((v) => variables[v.key] !== v.defaultValue);

  const grouped = useMemo(() => {
    const groups: Record<string, ScenarioVariableConfig[]> = {};
    SCENARIO_VARIABLE_DEFAULTS.forEach((v) => {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category]!.push(v);
    });
    return groups;
  }, []);

  // Max absolute delta for bar scaling
  const maxDelta = useMemo(() => {
    if (!sim) return 1;
    return Math.max(
      Math.abs(sim.delta.revenue_change),
      Math.abs(sim.delta.expenses_change),
      Math.abs(sim.delta.net_change),
      Math.abs(sim.delta.margin_change),
      Math.abs(sim.delta.health_score_change),
      Math.abs(sim.delta.cash_flow_12m_change),
      1,
    );
  }, [sim]);

  const deltaMetrics = sim ? [
    { label: "Revenue",      key: "revenue",         baseline: sim.baseline.revenue,         scenario: sim.scenario.revenue,         delta: sim.delta.revenue_change,         fmt: formatCurrency, invert: false },
    { label: "Gastos",       key: "expenses",        baseline: sim.baseline.expenses,        scenario: sim.scenario.expenses,        delta: sim.delta.expenses_change,        fmt: formatCurrency, invert: true },
    { label: "Neto",         key: "net",             baseline: sim.baseline.net,             scenario: sim.scenario.net,             delta: sim.delta.net_change,             fmt: formatCurrency, invert: false },
    { label: "Margen",       key: "margin",          baseline: sim.baseline.margin,          scenario: sim.scenario.margin,          delta: sim.delta.margin_change,          fmt: (v: number) => `${v.toFixed(1)}%`, invert: false },
    { label: "Health Score", key: "health_score",    baseline: sim.baseline.health_score,    scenario: sim.scenario.health_score,    delta: sim.delta.health_score_change,    fmt: (v: number) => `${Math.round(v)}`,  invert: false },
    { label: "Cash Flow 12m",key: "cash_flow_12m",  baseline: sim.baseline.cash_flow_12m,  scenario: sim.scenario.cash_flow_12m,  delta: sim.delta.cash_flow_12m_change,  fmt: formatCurrency, invert: false },
  ] : [];

  return (
    <motion.div
      variants={motionV.container}
      initial={false}
      animate="visible"
      className="space-y-6 relative"
    >
      {/* ── Variables Panel ──────────────────────────── */}
      <motion.div variants={motionV.item}>
        <div className="intel-gradient-border rounded-2xl">
          <Card className="p-6 relative overflow-hidden rounded-2xl">
            <AmbientGlow className="w-72 h-72 -top-24 -left-24" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                       style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))" }}>
                    <SlidersHorizontal size={16} className="text-[var(--color-gold-400)]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                      Variables del escenario
                    </h3>
                    <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                      Ajusta los parámetros y simula el impacto financiero
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {hasChanges && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <Button variant="ghost" onClick={resetVars} className="text-xs h-8">
                          Resetear
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      simQ.refetch();
                      showToast({ type: "info", message: "Simulación actualizada" });
                    }}
                    icon={<RefreshCw className={cn("w-3.5 h-3.5", simQ.isLoading && "animate-spin")} />}
                    className="text-xs h-8 bg-[var(--color-surface-2)] border-white/[0.08]"
                  >
                    Simular
                  </Button>
                </div>
              </div>

              {/* Variables Grid */}
              <div className="space-y-6">
                {Object.entries(grouped).map(([cat, vars]) => (
                  <div key={cat}>
                    <p className="text-[11px] font-bold text-[var(--color-silver-500)] uppercase tracking-[0.08em]
                                  font-[family-name:var(--font-ui)] mb-3 flex items-center gap-2">
                      <span className="w-4 h-px bg-[var(--color-gold-400)]/40" />
                      {SCENARIO_CATEGORY_LABELS[cat] ?? cat}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {vars.map((v) => {
                        const val = variables[v.key];
                        const isDefault = val === v.defaultValue;
                        const direction = val > v.defaultValue ? "up" : val < v.defaultValue ? "down" : "neutral";
                        return (
                          <div
                            key={v.key}
                            className={cn(
                              "group relative p-4 rounded-xl border transition-all duration-300",
                              isDefault
                                ? "bg-[var(--color-surface-2)]/50 border-white/[0.04]"
                                : "bg-[var(--color-surface-2)] border-[var(--color-gold-400)]/15",
                            )}
                          >
                            {/* Label + Value */}
                            <div className="flex items-center justify-between mb-3">
                              <label
                                htmlFor={`sim-${v.key}`}
                                className="text-[12px] font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]"
                              >
                                {v.label}
                              </label>
                              <motion.span
                                key={val}
                                initial={reduced ? false : { scale: 1.15, opacity: 0.7 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={cn(
                                  "text-[15px] font-bold font-[family-name:var(--font-mono)] tabular-nums",
                                  isDefault ? "text-[var(--color-silver-400)]"
                                    : direction === "up" ? "text-[var(--color-emerald-400)]"
                                    : "text-[var(--color-rose-400)]",
                                )}
                              >
                                {val > 0 && v.type === "percentage" ? "+" : ""}
                                {val}{v.unit}
                              </motion.span>
                            </div>

                            {/* Slider */}
                            <input
                              id={`sim-${v.key}`}
                              type="range"
                              min={v.min}
                              max={v.max}
                              step={v.step}
                              value={val}
                              onChange={(e) => updateVar(v.key, parseFloat(e.target.value))}
                              className="intel-slider w-full"
                              style={{ background: sliderFill(val, v.min, v.max) }}
                              aria-label={`${v.label}: ${val}${v.unit}`}
                            />

                            {/* Range labels */}
                            <div className="flex justify-between mt-1.5">
                              <span className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
                                {v.min}{v.unit}
                              </span>
                              <span className={cn(
                                "text-[10px] font-[family-name:var(--font-mono)]",
                                isDefault ? "text-[var(--color-silver-600)]" : "text-[var(--color-gold-400)]/60",
                              )}>
                                def: {v.defaultValue}{v.unit}
                              </span>
                              <span className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
                                {v.max}{v.unit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ── Loading ──────────────────────────────────── */}
      {simQ.isLoading && !sim && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <ShimmerBlock key={i} className="h-36" />)}
        </div>
      )}

      {/* ── Delta Cards ──────────────────────────────── */}
      <AnimatePresence>
        {sim && (
          <>
            <motion.div variants={motionV.item}>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {deltaMetrics.map((m, idx) => (
                  <motion.div
                    key={m.key}
                    initial={reduced ? false : { opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: idx * 0.05, ...SPRING_SMOOTH }}
                    className="intel-gradient-border rounded-2xl"
                  >
                    <Card className="p-4 relative overflow-hidden rounded-2xl group">
                      {/* Ambient orb */}
                      <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full transition-opacity duration-500 group-hover:opacity-[0.12]"
                           style={{ backgroundColor: deltaColor(m.delta, m.invert), opacity: 0.06 }} />

                      <div className="relative z-10">
                        <p className="text-[11px] font-semibold text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-3">
                          {m.label}
                        </p>

                        {/* Baseline → Scenario */}
                        <div className="flex items-end gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)] mb-0.5">Base</p>
                            <p className="text-[13px] font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] truncate tabular-nums">
                              {m.fmt(m.baseline)}
                            </p>
                          </div>
                          <ArrowRight size={14} className="text-[var(--color-silver-600)] flex-shrink-0 mb-1" />
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)] mb-0.5">Escenario</p>
                            <p className="text-[14px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-100)] truncate tabular-nums">
                              {m.fmt(m.scenario)}
                            </p>
                          </div>
                        </div>

                        {/* Delta bar + value */}
                        <div className="mt-3 pt-3 border-t border-white/[0.04]">
                          <div className="flex items-center gap-1.5">
                            {deltaIcon(m.delta, m.invert)}
                            <span
                              className="text-[14px] font-bold font-[family-name:var(--font-mono)] tabular-nums"
                              style={{ color: deltaColor(m.delta, m.invert) }}
                            >
                              {m.delta > 0 ? "+" : ""}{m.fmt(m.delta)}
                            </span>
                          </div>
                          <DeltaBar value={m.delta} maxAbs={maxDelta} color={deltaColor(m.delta, m.invert)} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ── Risks ──────────────────────────────────── */}
            {sim.risks.length > 0 && (
              <motion.div variants={motionV.item}>
                <div className="intel-gradient-border rounded-2xl">
                  <Card className="p-6 rounded-2xl">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-amber-400)]/10">
                        <AlertTriangle size={14} className="text-[var(--color-amber-400)]" />
                      </div>
                      <h3 className="text-[14px] font-bold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                        Riesgos asociados
                      </h3>
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)]
                                       bg-[var(--color-amber-400)]/10 text-[var(--color-amber-400)]">
                        {sim.risks.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {sim.risks.map((r: ScenarioRisk, idx: number) => {
                        const cfg = ANOMALY_SEVERITY_CONFIG[r.severity];
                        return (
                          <motion.div
                            key={idx}
                            initial={reduced ? false : { opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="p-4 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]
                                       hover:border-white/[0.08] transition-colors"
                            style={{ borderLeft: `3px solid ${cfg?.color ?? "var(--color-silver-500)"}` }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <h4 className="text-[13px] font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                                    {r.factor}
                                  </h4>
                                  <span
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                                               font-[family-name:var(--font-mono)]"
                                    style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}
                                  >
                                    {cfg?.label ?? r.severity}
                                  </span>
                                </div>
                                <p className="text-[12px] text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed">
                                  {r.detail}
                                </p>
                                {r.affected_segments.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                                    {r.affected_segments.map((s: string) => (
                                      <span
                                        key={s}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-medium font-[family-name:var(--font-ui)]
                                                   bg-[var(--color-surface-3)] text-[var(--color-silver-400)] border border-white/[0.04]"
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0 pt-0.5">
                                <ConfidenceRing value={r.probability * 100} size={44} color={cfg?.color ?? "var(--color-silver-400)"} />
                                <p className="text-[13px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)] mt-1">
                                  {(r.probability * 100).toFixed(0)}%
                                </p>
                                <p className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                                  probabilidad
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* ── AI Commentary ─────────────────────────── */}
            {sim.ai_commentary && (
              <motion.div variants={motionV.item}>
                <div className="intel-gradient-border rounded-2xl">
                  <Card className="p-6 rounded-2xl relative overflow-hidden">
                    <AmbientGlow
                      color="var(--color-gold-400)"
                      className="w-80 h-80 -top-40 right-0"
                    />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                             style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))" }}>
                          <Sparkles size={15} className="text-[var(--color-gold-400)]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[14px] font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-display)]">
                            Análisis AI
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold font-[family-name:var(--font-ui)]
                                           bg-[var(--color-gold-400)]/8 text-[var(--color-gold-400)] border border-[var(--color-gold-400)]/15">
                            Confianza: {sim.confidence}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium font-[family-name:var(--font-ui)]
                                           bg-[var(--color-surface-3)] text-[var(--color-silver-400)]">
                            Horizonte: {sim.time_horizon_months}m
                          </span>
                        </div>
                      </div>
                      <p className="text-[14px] text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-[1.75]">
                        {sim.ai_commentary}
                      </p>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   2. OPPORTUNITY SCANNER
   ══════════════════════════════════════════════════════════ */

function OpportunityScanner() {
  const motionV = useMotion();
  const reduced = useReducedMotion();
  const [statusFilter, ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const scanQ = useMCPQuery<{ status: string; data: OpportunityScanData }>(
    "finance", "finance_opportunities_scan", {}, { staleTime: 600_000 },
  );
  const scan = scanQ.data?.data;

  const filtered = useMemo(() => {
    if (!scan) return [];
    let list = scan.opportunities;
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    if (categoryFilter) list = list.filter((o) => o.category === categoryFilter);
    return list;
  }, [scan, statusFilter, categoryFilter]);

  const categoryTotals = useMemo(() => {
    if (!scan) return {};
    const totals: Record<string, { count: number; revenue: number }> = {};
    scan.opportunities.forEach((o) => {
      if (!totals[o.category]) totals[o.category] = { count: 0, revenue: 0 };
      totals[o.category]!.count++;
      totals[o.category]!.revenue += o.estimated_monthly_revenue;
    });
    return totals;
  }, [scan]);

  if (scanQ.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <ShimmerBlock key={i} className="h-28" />)}
        </div>
        <ShimmerBlock className="h-20" />
        {Array.from({ length: 3 }).map((_, i) => <ShimmerBlock key={i} className="h-52" />)}
      </div>
    );
  }

  if (!scan) return null;

  return (
    <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6">

      {/* ── Summary Strip ────────────────────────────── */}
      <motion.div variants={motionV.item}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Oportunidades",   value: `${scan.opportunities.length}`,                         color: CHART_PALETTE.gold,    icon: Radar },
            { label: "Revenue potencial", value: `${formatCurrency(scan.total_opportunity_value)}/mes`, color: CHART_PALETTE.emerald, icon: TrendingUp },
            { label: "Calidad datos",    value: `${scan.data_quality_score}/100`,                       color: CHART_PALETTE.teal,    icon: ShieldCheck },
            { label: "Alta confianza",   value: `${scan.opportunities.filter((o) => o.confidence >= 80).length}`, color: CHART_PALETTE.amber, icon: Target },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, ...SPRING_SMOOTH }}
                className="intel-gradient-border rounded-2xl"
              >
                <Card className="p-5 relative overflow-hidden rounded-2xl group">
                  <div
                    className="intel-ambient-orb w-24 h-24 -top-8 -right-8 transition-opacity duration-500"
                    style={{ backgroundColor: stat.color }}
                  />
                  <div className="relative z-10">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                         style={{ backgroundColor: `${stat.color}18` }}>
                      <Icon size={15} style={{ color: stat.color }} />
                    </div>
                    <p className="text-[11px] font-semibold text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]
                                  uppercase tracking-wider mb-1">
                      {stat.label}
                    </p>
                    <p className="text-[26px] font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]
                                  leading-none tracking-tight">
                      {stat.value}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Category Breakdown ───────────────────────── */}
      <motion.div variants={motionV.item}>
        <Card className="p-5 rounded-2xl border border-white/[0.04]">
          <h3 className="text-[13px] font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-3">
            Por categoría
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryTotals).map(([cat, data]) => {
              const cfg = OPPORTUNITY_CATEGORY_CONFIG[cat];
              const isActive = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(isActive ? "" : cat)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[12px] font-medium",
                    "transition-all duration-200 min-h-[44px] font-[family-name:var(--font-ui)]",
                    "border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-400)]",
                    isActive
                      ? "border-[var(--color-gold-400)]/30 bg-[var(--color-gold-400)]/8"
                      : "border-white/[0.06] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] hover:border-white/[0.1]",
                  )}
                  aria-pressed={isActive}
                >
                  <span style={{ color: cfg?.color }}>{cfg?.label ?? cat}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-3)] text-[var(--color-silver-400)]
                                   font-[family-name:var(--font-mono)] text-[11px]">
                    {data.count}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[11px]" style={{ color: cfg?.color }}>
                    {formatCurrency(data.revenue)}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* ── Opportunity Cards ────────────────────────── */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <motion.div variants={motionV.item}>
            <Card className="p-14 text-center rounded-2xl border border-white/[0.04]">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center">
                <Radar size={26} className="text-[var(--color-silver-500)]" />
              </div>
              <p className="text-[14px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                Sin resultados
              </p>
              <p className="text-[12px] text-[var(--color-silver-600)] mt-1 font-[family-name:var(--font-ui)]">
                Ajusta los filtros para ver más oportunidades
              </p>
            </Card>
          </motion.div>
        ) : (
          filtered.map((opp: OpportunityItem, idx: number) => {
            const catCfg = OPPORTUNITY_CATEGORY_CONFIG[opp.category];
            const statusCfg = OPPORTUNITY_STATUS_CONFIG[opp.status];
            const conf = confidenceInfo(opp.confidence);

            return (
              <motion.div
                key={opp.id}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, ...SPRING_SMOOTH }}
              >
                <div className="intel-gradient-border rounded-2xl">
                  <Card className="p-6 rounded-2xl relative overflow-hidden group
                                   transition-all duration-300 hover:-translate-y-0.5">
                    {/* Status ambient */}
                    <div
                      className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{ backgroundColor: statusCfg?.color ?? "transparent", opacity: 0 }}
                    />

                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap mb-2">
                            <h4 className="text-[16px] font-bold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                              {opp.title}
                            </h4>
                            <span
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                                         font-[family-name:var(--font-mono)]"
                              style={{ color: statusCfg?.color, backgroundColor: statusCfg?.bgColor }}
                            >
                              {statusCfg?.label ?? opp.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-[family-name:var(--font-ui)]"
                              style={{ color: catCfg?.color, backgroundColor: catCfg?.bgColor }}
                            >
                              {catCfg?.label ?? opp.category}
                            </span>
                            <span className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                              Llegada a revenue: {opp.time_to_revenue_weeks} sem
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[28px] font-bold font-[family-name:var(--font-display)] text-[var(--color-emerald-400)]
                                        leading-none tracking-tight">
                            {formatCurrency(opp.estimated_monthly_revenue)}
                          </p>
                          <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1">
                            /mes estimado
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[13px] text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-[1.7] mb-4">
                        {opp.description}
                      </p>

                      {/* Metrics row */}
                      <div className="flex items-center gap-5 flex-wrap mb-4">
                        {/* Confidence ring */}
                        <div className="flex items-center gap-2.5">
                          <ConfidenceRing value={opp.confidence} size={36} color={conf.color} />
                          <div>
                            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Confianza</p>
                            <p className="text-[13px] font-bold font-[family-name:var(--font-mono)]" style={{ color: conf.color }}>
                              {opp.confidence}%
                            </p>
                          </div>
                        </div>

                        {/* Effort */}
                        <div>
                          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Esfuerzo</p>
                          <p className="text-[13px] font-bold font-[family-name:var(--font-mono)]" style={{ color: effortColor(opp.implementation_effort) }}>
                            {effortLabel(opp.implementation_effort)}
                          </p>
                        </div>

                        {/* Segments */}
                        {opp.affected_segments.length > 0 && (
                          <div>
                            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">Segmentos</p>
                            <div className="flex flex-wrap gap-1">
                              {opp.affected_segments.map((s: string) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium
                                             bg-[var(--color-surface-3)] text-[var(--color-silver-400)]
                                             font-[family-name:var(--font-ui)] border border-white/[0.04]"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Data basis */}
                      <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)] italic mb-4
                                    pl-3 border-l-2 border-[var(--color-surface-3)]">
                        {opp.data_basis}
                      </p>

                      {/* Risk factors */}
                      {opp.risk_factors.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-[var(--color-amber-400)]/5 border border-[var(--color-amber-400)]/10 mb-4">
                          <p className="text-[10px] font-bold text-[var(--color-amber-400)] uppercase tracking-wider
                                        font-[family-name:var(--font-ui)] mb-2">
                            Riesgos identificados
                          </p>
                          <ul className="space-y-1.5">
                            {opp.risk_factors.map((rf: string, i: number) => (
                              <li key={i} className="text-[12px] text-[var(--color-silver-400)] font-[family-name:var(--font-body)]
                                                     flex items-start gap-2 leading-relaxed">
                                <AlertTriangle size={11} className="flex-shrink-0 mt-1 text-[var(--color-amber-400)]" />
                                {rf}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      {opp.status === "new" && (
                        <div className="flex items-center gap-2 pt-4 border-t border-white/[0.04]">
                          <Button
                            variant="primary"
                            onClick={() => showToast({ type: "success", message: `"${opp.title}" marcada como aprobada` })}
                            icon={<CheckCircle2 size={14} />}
                            className="text-xs h-9 bg-[var(--color-emerald-400)] text-[var(--color-abyss)]
                                       hover:brightness-110 font-semibold"
                          >
                            Implementar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => showToast({ type: "info", message: `"${opp.title}" programada` })}
                            icon={<Clock size={14} />}
                            className="text-xs h-9"
                          >
                            Programar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => showToast({ type: "info", message: `"${opp.title}" descartada` })}
                            icon={<XCircle size={14} />}
                            className="text-xs h-9 text-[var(--color-silver-500)]"
                          >
                            Descartar
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   3. BOARD BRIEFING
   ══════════════════════════════════════════════════════════ */

function BoardBriefing() {
  const motionV = useMotion();
  const reduced = useReducedMotion();

  const briefingQ = useMCPQuery<{ status: string; data: BoardBriefingData }>(
    "finance", "finance_board_briefing", {}, { staleTime: 600_000 },
  );
  const briefing = briefingQ.data?.data;

  if (briefingQ.isLoading) {
    return (
      <div className="space-y-4">
        <ShimmerBlock className="h-24" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <ShimmerBlock key={i} className="h-28" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <ShimmerBlock key={i} className="h-36" />)}
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6">

      {/* ── Header Bar ───────────────────────────────── */}
      <motion.div variants={motionV.item}>
        <div className="intel-gradient-border rounded-2xl">
          <Card className="p-5 rounded-2xl relative overflow-hidden">
            <AmbientGlow className="w-96 h-48 -top-24 left-1/4" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-[20px] font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]
                               tracking-tight">
                  Briefing Ejecutivo
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[12px] text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] font-semibold">
                    {briefing.period}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[var(--color-silver-600)]" />
                  <span className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                    {new Date(briefing.generated_at).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    briefingQ.refetch();
                    showToast({ type: "info", message: "Briefing actualizado" });
                  }}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="text-xs h-9 bg-[var(--color-surface-2)] border-white/[0.08]"
                >
                  Regenerar
                </Button>
                <ExportButton
                  module="board-briefing"
                  onPrint={() => showToast({ type: "info", message: "Vista de impresión disponible" })}
                />
                <Button
                  variant="primary"
                  onClick={() => showToast({ type: "success", message: "Briefing enviado a la junta directiva" })}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="text-xs h-9 bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110 font-semibold"
                >
                  Enviar a Junta
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ── Key Metrics ──────────────────────────────── */}
      <motion.div variants={motionV.item}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {briefing.key_metrics.map((m: BriefingMetric, idx: number) => {
            const assessCfg = METRIC_ASSESSMENT_CONFIG[m.assessment];
            return (
              <motion.div
                key={idx}
                initial={reduced ? false : { opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.06, ...SPRING_SMOOTH }}
                className="intel-gradient-border rounded-2xl"
              >
                <Card className="p-5 relative overflow-hidden rounded-2xl">
                  <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full"
                       style={{ backgroundColor: assessCfg?.color, opacity: 0.06 }} />
                  <div className="relative z-10">
                    <p className="text-[11px] font-semibold text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]
                                  uppercase tracking-wider mb-2">
                      {m.label}
                    </p>
                    <p className="text-[30px] font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]
                                  leading-none tracking-tight tabular-nums">
                      {m.value}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {m.trend === "up" ? (
                        <TrendingUp size={13} style={{ color: assessCfg?.color }} />
                      ) : m.trend === "down" ? (
                        <TrendingDown size={13} style={{ color: assessCfg?.color }} />
                      ) : (
                        <Minus size={13} className="text-[var(--color-silver-500)]" />
                      )}
                      <span
                        className="text-[12px] font-bold font-[family-name:var(--font-mono)] tabular-nums"
                        style={{ color: assessCfg?.color }}
                      >
                        {m.change_pct > 0 ? "+" : ""}{m.change_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Sections ─────────────────────────────────── */}
      {briefing.sections.map((section: BriefingSection, idx: number) => {
        const sevCfg = BRIEFING_SECTION_SEVERITY_CONFIG[section.severity];
        return (
          <motion.div key={section.id} variants={motionV.item}>
            <div className="intel-gradient-border rounded-2xl">
              <Card className="p-6 rounded-2xl" style={{ borderLeft: `3px solid ${sevCfg?.color ?? "var(--color-silver-600)"}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold
                               font-[family-name:var(--font-mono)]"
                    style={{ backgroundColor: sevCfg?.bgColor, color: sevCfg?.color }}
                  >
                    {idx + 1}
                  </span>
                  <h3 className="text-[15px] font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
                    {section.title}
                  </h3>
                </div>
                <p className="text-[13px] text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-[1.75] mb-4">
                  {section.content}
                </p>
                {section.items.length > 0 && (
                  <ul className="space-y-2">
                    {section.items.map((item: string, i: number) => {
                      const isPositive = item.startsWith("✅");
                      const isWarning = item.startsWith("⚠") || item.startsWith("🟡");
                      const isNegative = item.startsWith("🔴");
                      return (
                        <motion.li
                          key={i}
                          initial={reduced ? false : { opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-start gap-2.5 text-[13px] text-[var(--color-silver-300)]
                                     font-[family-name:var(--font-ui)] leading-relaxed"
                        >
                          <span className="flex-shrink-0 mt-0.5">
                            {isPositive ? <CheckCircle2 size={14} className="text-[var(--color-emerald-400)]" /> :
                             isWarning  ? <AlertTriangle size={14} className="text-[var(--color-amber-400)]" /> :
                             isNegative ? <XCircle size={14} className="text-[var(--color-rose-400)]" /> :
                             <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-silver-500)] mt-1.5" />}
                          </span>
                          <span>{item.replace(/^[✅⚠🔴🟡]\s*/, "")}</span>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </motion.div>
        );
      })}

      {/* ── Alerts ───────────────────────────────────── */}
      {briefing.alerts.length > 0 && (
        <motion.div variants={motionV.item}>
          <div className="intel-gradient-border rounded-2xl">
            <Card className="p-6 rounded-2xl">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-amber-400)]/10">
                  <AlertTriangle size={14} className="text-[var(--color-amber-400)]" />
                </div>
                <h3 className="text-[14px] font-bold text-[var(--color-amber-400)] font-[family-name:var(--font-ui)]">
                  Alertas
                </h3>
                <span className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                                 bg-[var(--color-amber-400)]/15 text-[var(--color-amber-400)] font-[family-name:var(--font-mono)]">
                  {briefing.alerts.length}
                </span>
              </div>
              <div className="space-y-3">
                {briefing.alerts.map((alert: BriefingAlert, idx: number) => {
                  const cfg = ALERT_SEVERITY_CONFIG[alert.severity];
                  return (
                    <motion.div
                      key={idx}
                      initial={reduced ? false : { opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3.5 p-4 rounded-xl border transition-colors hover:border-white/[0.08]"
                      style={{
                        backgroundColor: cfg?.bgColor ? `${cfg.bgColor}08` : "var(--color-surface-2)",
                        borderColor: "white/[0.04]",
                      }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                           style={{ backgroundColor: cfg?.bgColor }}>
                        <AlertTriangle size={13} style={{ color: cfg?.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[13px] font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                            {alert.title}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                                       font-[family-name:var(--font-mono)]"
                            style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}
                          >
                            {cfg?.label ?? alert.severity}
                          </span>
                          {alert.requires_action && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-[family-name:var(--font-ui)]
                                             bg-[var(--color-gold-400)]/10 text-[var(--color-gold-400)] border border-[var(--color-gold-400)]/15">
                              Requiere acción
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed">
                          {alert.detail}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ── Recommendations ──────────────────────────── */}
      {briefing.recommendations.length > 0 && (
        <motion.div variants={motionV.item}>
          <div className="intel-gradient-border rounded-2xl">
            <Card className="p-6 rounded-2xl">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-teal-400)]/10">
                  <Lightbulb size={14} className="text-[var(--color-teal-400)]" />
                </div>
                <h3 className="text-[14px] font-bold text-[var(--color-teal-400)] font-[family-name:var(--font-ui)]">
                  Recomendaciones
                </h3>
              </div>
              <div className="space-y-4">
                {briefing.recommendations.map((rec: BriefingRecommendation, idx: number) => {
                  const priCfg = ANOMALY_SEVERITY_CONFIG[rec.priority];
                  return (
                    <motion.div
                      key={rec.id}
                      initial={reduced ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="flex gap-4 p-4 rounded-xl bg-[var(--color-surface-2)]/50 border border-white/[0.04]
                                 hover:border-white/[0.08] transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold
                                   font-[family-name:var(--font-mono)]"
                        style={{ backgroundColor: "var(--color-teal-400)", color: "var(--color-abyss)" }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <p className="text-[13px] font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                            {rec.action}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                                       font-[family-name:var(--font-mono)]"
                            style={{ color: priCfg?.color, backgroundColor: priCfg?.bgColor }}
                          >
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-[12px] text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed mb-2">
                          {rec.justification}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={12} className="text-[var(--color-emerald-400)]" />
                          <p className="text-[12px] font-semibold font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                            {rec.estimated_impact}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ── Upcoming Decisions ───────────────────────── */}
      {briefing.upcoming_decisions.length > 0 && (
        <motion.div variants={motionV.item}>
          <div className="intel-gradient-border rounded-2xl">
            <Card className="p-6 rounded-2xl relative overflow-hidden">
              <AmbientGlow color="var(--color-gold-400)" className="w-80 h-80 -bottom-40 right-0" />
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-gold-400)]/10">
                    <Target size={14} className="text-[var(--color-gold-400)]" />
                  </div>
                  <h3 className="text-[14px] font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)]">
                    Próximas decisiones requeridas
                  </h3>
                </div>
                <div className="space-y-4">
                  {briefing.upcoming_decisions.map((dec: BriefingDecision, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={reduced ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className="p-5 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.06]
                                 hover:border-[var(--color-gold-400)]/15 transition-colors"
                    >
                      <h4 className="text-[15px] font-bold text-[var(--color-silver-100)] font-[family-name:var(--font-display)] mb-2">
                        {dec.title}
                      </h4>
                      <p className="text-[12px] text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed mb-4">
                        {dec.description}
                      </p>
                      <div className="space-y-2 mb-4">
                        {dec.options.map((opt: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-surface-1)] border border-white/[0.04]
                                       hover:border-white/[0.08] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                          >
                            <span
                              className="w-6 h-6 rounded-full border border-[var(--color-gold-400)]/30 flex items-center
                                         justify-center text-[11px] font-bold text-[var(--color-gold-400)]
                                         font-[family-name:var(--font-mono)] flex-shrink-0"
                            >
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="text-[13px] text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">
                              {opt}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-5 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-amber-400)] font-[family-name:var(--font-ui)]">
                          <Clock size={13} />
                          <span className="font-semibold">Deadline:</span>
                          {new Date(dec.deadline).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-emerald-400)] font-[family-name:var(--font-mono)]">
                          <TrendingUp size={13} />
                          {dec.impact_estimate}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Tab Content Wrapper — crossfade with scale
   ══════════════════════════════════════════════════════════ */

function TabPanel({
  id,
  activeId,
  children,
}: {
  id: string;
  activeId: string;
  children: React.ReactNode;
}) {
  if (id !== activeId) return null;
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: EASE_EXPONENTIAL }}
    >
      {children}
    </motion.div>
  );
}

function LazySuspense({ children, lines = 4 }: { children: React.ReactNode; lines?: number }) {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => <ShimmerBlock key={i} className="h-36" />)}
      </div>
    }>
      {children}
    </Suspense>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function FinancialIntelligence() {
  const [activeTab, setActiveTab] = useState<IntelTab>("narrative");

  return (
    <div className="space-y-6 relative intel-noise">
      {/* Premium CSS injection */}
      <style dangerouslySetInnerHTML={{ __html: PREMIUM_CSS }} />

      {/* Ambient atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
           style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.03), transparent 70%)" }} />

      {/* Tab bar */}
      <div className="relative z-10">
        <IntelTabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <TabPanel id="narrative" activeId={activeTab}>
            <LazySuspense lines={5}>
              <NarrativeEngine />
            </LazySuspense>
          </TabPanel>

          <TabPanel id="simulator" activeId={activeTab}>
            <ScenarioSimulator />
          </TabPanel>

          <TabPanel id="opportunities" activeId={activeTab}>
            <OpportunityScanner />
          </TabPanel>

          <TabPanel id="briefing" activeId={activeTab}>
            <BoardBriefing />
          </TabPanel>

          <TabPanel id="profitability" activeId={activeTab}>
            <LazySuspense lines={3}>
              <MemberProfitabilityMatrix />
            </LazySuspense>
          </TabPanel>

          <TabPanel id="stress" activeId={activeTab}>
            <LazySuspense lines={4}>
              <StressTestPanel />
            </LazySuspense>
          </TabPanel>

          <TabPanel id="calendar" activeId={activeTab}>
            <LazySuspense lines={3}>
              <SeasonalCalendar />
            </LazySuspense>
          </TabPanel>

          <TabPanel id="decision" activeId={activeTab}>
            <LazySuspense lines={4}>
              <DecisionCockpit />
            </LazySuspense>
          </TabPanel>
        </AnimatePresence>
      </div>
    </div>
  );
}