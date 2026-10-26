// src/shared/components/ai/ScenarioBuilder.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Scenario Builder
// Digital Twin Laboratory — Fase 23 AI
//
// "What-if" interface. Glass laboratory with intensity gauge,
// domain-colored sliders, template previews, impact analysis.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingUp,
  TrendingDown,
  FlaskConical,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import {
  getAllMetrics,
  resolveMetric,
} from "@/shared/lib/advisor-engine/nl-rule-parser";
import {
  SCENARIO_TEMPLATES,
  TEMPLATE_CATEGORY_CONFIG,
} from "@/shared/lib/advisor-engine/twin-types";
import type {
  DeltaScenario,
  MetricDelta,
  ScenarioTemplate,
} from "@/shared/lib/advisor-engine/twin-types";
import type { AIDomain } from "@/shared/types/ai-intelligence";
import { formatCRC, formatPct } from "@/shared/lib/financial/format";
import './ScenarioBuilder.css';

// ═══════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════

interface SliderState {
  metricPath: string;
  deltaPct: number;
  active: boolean;
}

const DOMAIN_RGBA: Record<string, string> = {
  executive: "rgba(251, 191, 36, 0.45)",
  family: "rgba(245, 158, 11, 0.45)",
  sports: "rgba(52, 211, 153, 0.45)",
  facilities: "rgba(52, 211, 153, 0.45)",
  cultural_social: "rgba(20, 184, 166, 0.45)",
  wellness: "rgba(20, 184, 166, 0.45)",
  ml_intelligence: "rgba(20, 184, 166, 0.45)",
  satisfaction: "rgba(148, 163, 184, 0.45)",
  communication: "rgba(148, 163, 184, 0.45)",
  global: "rgba(148, 163, 184, 0.45)",
};

/** Describe SVG arc path. startDeg: 0=top, clockwise */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  sweepDeg: number,
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(startDeg + sweepDeg));
  const y2 = cy + r * Math.sin(toRad(startDeg + sweepDeg));
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ═══════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════

function initSliders(
  _context: Record<string, unknown>,
  templateId?: string,
): SliderState[] {
  const metrics = getAllMetrics();
  const template = templateId
    ? SCENARIO_TEMPLATES.find((t) => t.id === templateId)
    : undefined;
  return metrics
    .filter((m) => !m.path.startsWith("_computed."))
    .map((m) => {
      const td = template?.deltas.find((d) => d.metricPath === m.path);
      return {
        metricPath: m.path,
        deltaPct: td ? Math.round(td.relativeChange * 100) : 0,
        active: !!td,
      };
    });
}

function useScenarioBuilder(
  context: Record<string, unknown>,
  initialTemplateId?: string,
) {
  const [scenarioName, setScenarioName] = useState("");
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplateId ?? null,
  );
  const [sliderStates, setSliderStates] = useState<SliderState[]>(() =>
    initSliders(context, initialTemplateId),
  );

  const metrics = useMemo(() => getAllMetrics(), []);

  const activeDeltas = useMemo<MetricDelta[]>(() => {
    return sliderStates
      .filter((s) => s.active)
      .map((s) => {
        const metric = metrics.find((m) => m.path === s.metricPath);
        if (!metric) return null;
        const currentValue = resolveMetric(context, s.metricPath) ?? 0;
        const simulatedValue = currentValue * (1 + s.deltaPct / 100);
        return {
          metricPath: s.metricPath,
          metricName: metric.names[0],
          currentValue: Math.round(currentValue * 100) / 100,
          simulatedValue: Math.round(simulatedValue * 100) / 100,
          delta: Math.round((simulatedValue - currentValue) * 100) / 100,
          deltaPct: s.deltaPct,
          unit: metric.unit,
          domain: metric.domain,
        };
      })
      .filter((d): d is MetricDelta => d !== null);
  }, [sliderStates, metrics, context]);

  const intensity = useMemo(() => {
    if (activeDeltas.length === 0) return 0;
    const total = activeDeltas.reduce(
      (sum, d) => sum + Math.abs(d.deltaPct),
      0,
    );
    return Math.min(Math.round(total / activeDeltas.length), 100);
  }, [activeDeltas]);

  const impactSummary = useMemo(
    () => ({
      total: activeDeltas.length,
      positive: activeDeltas.filter((d) => d.deltaPct > 0).length,
      negative: activeDeltas.filter((d) => d.deltaPct < 0).length,
      extreme: activeDeltas.filter((d) => Math.abs(d.deltaPct) >= 20).length,
      domains: new Set(activeDeltas.map((d) => d.domain)).size,
    }),
    [activeDeltas],
  );

  const handleSliderChange = useCallback(
    (metricPath: string, value: number) => {
      setSliderStates((prev) =>
        prev.map((s) =>
          s.metricPath === metricPath ? { ...s, deltaPct: value } : s,
        ),
      );
      setSelectedTemplateId(null);
    },
    [],
  );

  const handleToggleSlider = useCallback((metricPath: string) => {
    setSliderStates((prev) =>
      prev.map((s) =>
        s.metricPath === metricPath ? { ...s, active: !s.active } : s,
      ),
    );
    setSelectedTemplateId(null);
  }, []);

  const handleTemplateSelect = useCallback((template: ScenarioTemplate) => {
    setSelectedTemplateId(template.id);
    setScenarioName(template.name);
    setSliderStates((prev) =>
      prev.map((s) => {
        const td = template.deltas.find((d) => d.metricPath === s.metricPath);
        if (td) {
          return {
            ...s,
            active: true,
            deltaPct: Math.round(td.relativeChange * 100),
          };
        }
        return { ...s, active: false, deltaPct: 0 };
      }),
    );
  }, []);

  const handleReset = useCallback(() => {
    setSliderStates((prev) =>
      prev.map((s) => ({ ...s, active: false, deltaPct: 0 })),
    );
    setSelectedTemplateId(null);
    setScenarioName("");
  }, []);

  return {
    scenarioName,
    setScenarioName,
    showTemplates,
    setShowTemplates,
    selectedTemplateId,
    sliderStates,
    activeDeltas,
    intensity,
    impactSummary,
    metrics,
    handleSliderChange,
    handleToggleSlider,
    handleTemplateSelect,
    handleReset,
  };
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

/* Intensity Gauge — semicircular SVG */
function IntensityGauge({
  intensity,
  reduced,
}: {
  intensity: number;
  reduced: boolean;
}) {
  const cx = 40;
  const cy = 34;
  const r = 24;
  const strokeW = 4.5;
  const ARC_START = -135;
  const ARC_SWEEP = 270;
  const arcLen = (ARC_SWEEP / 360) * 2 * Math.PI * r;
  const fillLen = (intensity / 100) * arcLen;

  const color =
    intensity >= 66
      ? "var(--color-rose-400)"
      : intensity >= 33
        ? "var(--color-amber-400)"
        : "var(--color-teal-400)";

  const trackD = describeArc(cx, cy, r, ARC_START, ARC_SWEEP);
  const fillD = describeArc(cx, cy, r, ARC_START, ARC_SWEEP);

  return (
    <div className="flex-shrink-0">
      <svg width="80" height="52" viewBox="0 0 80 52">
        {/* Track */}
        <path
          d={trackD}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeW}
        />
        {/* Fill */}
        <motion.path
          d={fillD}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${arcLen}`}
          initial={reduced ? undefined : { strokeDashoffset: arcLen }}
          animate={{ strokeDashoffset: arcLen - fillLen }}
          transition={{
            duration: reduced ? 0 : 0.7,
            ease: [0.16, 1, 0.3, 1] as any,
          }}
        />
        {/* Center value */}
        <text
          x={cx}
          y={cy - 1}
          textAnchor="middle"
          dominantBaseline="central"
          className="glass-scenario__gauge-value"
        >
          {intensity}
        </text>
        {/* Label */}
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="glass-scenario__gauge-label"
        >
          INTENSIDAD
        </text>
      </svg>
    </div>
  );
}

/* Template Preview — mini bar chart of template deltas */
function TemplatePreview({
  deltas,
}: {
  deltas: { relativeChange: number }[];
}) {
  const bars = deltas.slice(0, 8);
  return (
    <div className="flex items-end gap-[2px] h-4 mt-1.5">
      {bars.map((d, i) => {
        const h = Math.min(Math.abs(d.relativeChange) * 50, 16);
        return (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${Math.max(h, 2)}px`,
              background:
                d.relativeChange >= 0
                  ? "var(--color-emerald-400)"
                  : "var(--color-rose-400)",
              opacity: 0.6,
            }}
          />
        );
      })}
      {deltas.length > 8 && (
        <span className="text-[8px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] ml-0.5">
          +{deltas.length - 8}
        </span>
      )}
    </div>
  );
}

/* Metric Slider — domain-colored track fill */
function MetricSlider({
  metricName,
  unit,
  domain,
  currentValue,
  simulatedValue,
  deltaPct,
  active,
  onToggle,
  onChange,
  reduced,
}: {
  metricName: string;
  unit: string;
  domain: AIDomain | "global";
  currentValue: number | null;
  simulatedValue: number | null;
  deltaPct: number;
  active: boolean;
  onToggle: () => void;
  onChange: (value: number) => void;
  reduced: boolean | undefined;
}) {
  const isPositive = deltaPct > 0;
  const isNegative = deltaPct < 0;
  const isSignificant = Math.abs(deltaPct) >= 10;

  const formatValue = (val: number | null): string => {
    if (val === null) return "N/A";
    if (unit === "₡") return formatCRC(val);
    if (unit === "%") return formatPct(val);
    if (unit === "pts") return `${Math.round(val)} pts`;
    return Math.round(val).toLocaleString("es-CR");
  };

  /* Track fill from center */
  const zeroPct = 33.33;
  const valuePct = ((deltaPct + 50) / 150) * 100;
  const fillStart = Math.min(zeroPct, valuePct);
  const fillEnd = Math.max(zeroPct, valuePct);
  const domainRgba = DOMAIN_RGBA[domain] || DOMAIN_RGBA.global;

  const trackBg =
    active && deltaPct !== 0
      ? `linear-gradient(to right, var(--slider-base) ${fillStart}%, ${domainRgba} ${fillStart}%, ${domainRgba} ${fillEnd}%, var(--slider-base) ${fillEnd}%)`
      : undefined;

  return (
    <div
      className={cn(
        "glass-scenario__slider",
        active ? "glass-scenario__slider--active" : "glass-scenario__slider--dimmed",
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-3 mb-1.5">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "w-8 h-[18px] rounded-full relative flex-shrink-0 transition-colors",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
            active
              ? "bg-[var(--color-teal-400)]"
              : "bg-[var(--color-surface-0)]",
          )}
          role="switch"
          aria-checked={active}
          aria-label={`${active ? "Desactivar" : "Activar"} ${metricName}`}
        >
          <span
            className={cn(
              "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform",
              active ? "translate-x-[15px]" : "translate-x-[3px]",
            )}
          />
        </button>

        <span className="flex-1 min-w-0 text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate capitalize">
          {metricName}
        </span>

        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] flex-shrink-0"
          style={{
            color: `var(--color-${
              domain === "executive"
                ? "gold"
                : domain === "family"
                  ? "amber"
                : domain === "sports" || domain === "facilities"
                  ? "emerald"
                : domain === "wellness" || domain === "cultural_social"
                  ? "teal"
                : domain === "ml_intelligence"
                  ? "teal"
                : "silver"
            }-400)`,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {domain}
        </span>

        {active && deltaPct !== 0 && (
          <span
            className={cn(
              "text-[10px] font-semibold font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded flex-shrink-0",
              isPositive
                ? "text-[var(--color-emerald-400)] bg-[color-mix(in srgb,var(--color-emerald-400)10%,transparent)]"
                : "text-[var(--color-rose-400)] bg-[color-mix(in srgb,var(--color-rose-400)10%,transparent)]",
            )}
          >
            {isPositive ? "+" : ""}
            {deltaPct}%
          </span>
        )}
      </div>

      {/* Values */}
      {active && (
        <div className="flex items-center gap-3 mb-2 pl-11 text-[10px] font-[family-name:var(--font-mono)]">
          <span className="text-[var(--color-silver-500)]">
            Actual:{" "}
            <span className="text-[var(--color-silver-300)]">
              {formatValue(currentValue)}
            </span>
          </span>
          {(isPositive || isNegative) && simulatedValue !== null && (
            <>
              <span className="text-[var(--color-silver-600)]">→</span>
              <span>
                Sim:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    isPositive
                      ? "text-[var(--color-emerald-400)]"
                      : "text-[var(--color-rose-400)]",
                  )}
                >
                  {formatValue(simulatedValue)}
                </span>
              </span>
              {isSignificant &&
                (isPositive ? (
                  <TrendingUp className="w-3 h-3 text-[var(--color-emerald-400)]" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-[var(--color-rose-400)]" />
                ))}
            </>
          )}
        </div>
      )}

      {/* Slider */}
      {active && (
        <div className="pl-11 relative">
          <input
            type="range"
            min={-50}
            max={100}
            step={1}
            value={deltaPct}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="glass-scenario__range"
            style={{
              background: trackBg,
              transition: reduced ? "none" : "background 0.1s ease",
            }}
            aria-label={`Ajustar ${metricName}: ${deltaPct}%`}
          />
          <div className="glass-scenario__center-mark" />
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
              -50%
            </span>
            <span className="text-[8px] text-[var(--color-gold-400)] font-[family-name:var(--font-mono)] font-semibold">
              0%
            </span>
            <span className="text-[8px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
              +100%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

interface ScenarioBuilderProps {
  context: Record<string, unknown>;
  onSimulate: (scenario: DeltaScenario) => void;
  isSimulating?: boolean;
  initialTemplateId?: string;
}

export function ScenarioBuilder({
  context,
  onSimulate,
  isSimulating = false,
  initialTemplateId,
}: ScenarioBuilderProps) {
  const reduced = useReducedMotion();
  const {
    scenarioName,
    setScenarioName,
    showTemplates,
    setShowTemplates,
    selectedTemplateId,
    sliderStates,
    activeDeltas,
    intensity,
    impactSummary,
    metrics,
    handleSliderChange,
    handleToggleSlider,
    handleTemplateSelect,
    handleReset,
  } = useScenarioBuilder(context, initialTemplateId);

  const hasActive = activeDeltas.length > 0;

  const handleSimulate = useCallback(() => {
    if (!hasActive) return;
    const scenario: DeltaScenario = {
      id: `scenario_manual_${Date.now()}`,
      name: scenarioName || "Escenario personalizado",
      description: `${activeDeltas.length} métrica(s) ajustada(s)`,
      deltas: activeDeltas,
      createdAt: Date.now(),
      createdBy: "manager",
    };
    onSimulate(scenario);
  }, [hasActive, scenarioName, activeDeltas, onSimulate]);

  const stagger = (delay: number) =>
    reduced
      ? undefined
      : ({
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.35,
            delay,
            ease: [0.16, 1, 0.3, 1] as any,
          },
        } as const);

  return (
    <div className="glass-scenario">
      <div className="glass-scenario__glow" />
      <div className="relative z-10 p-5 space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[color-mix(in srgb,var(--color-teal-400)12%,transparent)]">
            <FlaskConical className="w-4.5 h-4.5 text-[var(--color-teal-400)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
              Laboratorio de Escenarios
            </h3>
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
              Digital Twin · What-If Analysis
            </p>
          </div>
        </div>

        {/* ── Templates ── */}
        <motion.div {...(stagger(0) ?? {})}>
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-0)]/30 border border-white/[0.04] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3",
                "transition-colors hover:bg-white/[0.02]",
                "focus-visible:outline-2 focus-visible:outline-[var(--color-teal-400)] focus-visible:outline-offset-[-2px]",
              )}
              aria-expanded={showTemplates}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[var(--color-gold-400)]" />
                <span className="text-xs font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Escenarios predefinidos
                </span>
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                  ({SCENARIO_TEMPLATES.length})
                </span>
              </div>
              {showTemplates ? (
                <ChevronUp className="w-4 h-4 text-[var(--color-silver-400)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)]" />
              )}
            </button>

            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SCENARIO_TEMPLATES.map((tpl) => {
                      const catCfg = TEMPLATE_CATEGORY_CONFIG[tpl.category];
                      const isSelected = selectedTemplateId === tpl.id;

                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleTemplateSelect(tpl)}
                          className={cn(
                            "glass-scenario__tpl",
                            isSelected && "glass-scenario__tpl--selected",
                          )}
                          aria-pressed={isSelected}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-base flex-shrink-0 mt-0.5">
                              {tpl.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[11px] font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
                                  {tpl.name}
                                </span>
                                <span
                                  className="text-[8px] px-1 py-0.5 rounded font-[family-name:var(--font-mono)] flex-shrink-0"
                                  style={{
                                    color: catCfg.color,
                                    background: "rgba(255,255,255,0.04)",
                                  }}
                                >
                                  {catCfg.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] line-clamp-1">
                                {tpl.description}
                              </p>
                              <TemplatePreview deltas={tpl.deltas} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Analysis Strip (Intensity + Impact) ── */}
        <motion.div {...(stagger(0.1) ?? {})}>
          <div className="glass-scenario__analysis">
            <IntensityGauge intensity={intensity} reduced={!!reduced} />

            <div className="flex-1 min-w-0">
              {hasActive ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
                      {impactSummary.total} activo
                      {impactSummary.total !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--color-silver-600)]">·</span>
                    {impactSummary.positive > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-emerald-400)] font-[family-name:var(--font-mono)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald-400)]" />
                        {impactSummary.positive} positivo
                        {impactSummary.positive !== 1 ? "s" : ""}
                      </span>
                    )}
                    {impactSummary.negative > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-rose-400)] font-[family-name:var(--font-mono)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-rose-400)]" />
                        {impactSummary.negative} negativo
                        {impactSummary.negative !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
                      <Layers className="w-3 h-3" />
                      {impactSummary.domains} dominio
                      {impactSummary.domains !== 1 ? "s" : ""}
                    </span>
                    {impactSummary.extreme > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-amber-400)] font-[family-name:var(--font-mono)]">
                        <AlertTriangle className="w-3 h-3" />
                        {impactSummary.extreme} extremo
                        {impactSummary.extreme !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] italic">
                  Activa métricas o selecciona un template para comenzar.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Sliders Section ── */}
        <motion.div {...(stagger(0.2) ?? {})}>
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-0)]/30 border border-white/[0.04] p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-teal-400)]" />
                <span className="text-xs font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Ajustar métricas
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-[var(--color-silver-400)] text-[10px]"
              >
                Reset
              </Button>
            </div>

            {/* Scenario name */}
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Nombre del escenario (opcional)"
              className="glass-scenario__input"
              aria-label="Nombre del escenario"
            />

            {/* Metric sliders */}
            <div className="space-y-2">
              {sliderStates.map((slider) => {
                const metric = metrics.find(
                  (m) => m.path === slider.metricPath,
                );
                if (!metric) return null;
                const currentValue = resolveMetric(context, slider.metricPath);
                const simulatedValue =
                  currentValue !== null
                    ? currentValue * (1 + slider.deltaPct / 100)
                    : null;

                return (
                  <MetricSlider
                    key={slider.metricPath}
                    metricName={metric.names[0]}
                    unit={metric.unit}
                    domain={metric.domain}
                    currentValue={currentValue}
                    simulatedValue={simulatedValue}
                    deltaPct={slider.deltaPct}
                    active={slider.active}
                    onToggle={() => handleToggleSlider(slider.metricPath)}
                    onChange={(val) =>
                      handleSliderChange(slider.metricPath, val)
                    }
                    reduced={reduced}
                  />
                );
              })}
            </div>

            {/* Simulate bar */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSimulate}
                disabled={!hasActive || isSimulating}
                icon={
                  isSimulating ? (
                    <SlidersHorizontal className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )
                }
                className={cn(
                  "min-h-[40px]",
                  hasActive &&
                    !isSimulating &&
                    "glass-scenario__simulate--ready",
                )}
              >
                {isSimulating ? "Simulando..." : "Simular escenario"}
              </Button>
              {hasActive && !isSimulating && (
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] truncate">
                  {activeDeltas.length} delta(s)
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}