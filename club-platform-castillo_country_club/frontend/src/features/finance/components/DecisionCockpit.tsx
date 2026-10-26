// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Decision Cockpit
// Fase 19k REWRITE
//
// 6 innovations:
//   1. Glass Decision Surface (all containers → glass)
//   2. Scenario Visual Diff (comparison bars)
//   3. Confidence Radial Gauge (semi-circular)
//   4. Glass Suggestion Pills
//   5. Historical Timeline (vertical glass nodes)
//   6. Decision Radar Mini (probability spread)
//
// Rules: #1 tokens, #8 formatCurrency, #11 focus-visible,
//   #12 touch, #14 EmptyState, #15 toast, #17 Button,
//   #18 reducedMotion, #19 on-demand, #20 breakpoint, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Target, Sparkles, AlertTriangle, CheckCircle2,
  ShieldCheck, BookOpen, BarChart3, ArrowRight, Copy,
  TrendingUp, Clock, Brain,
} from "lucide-react";
import { Button, showToast } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, cn } from "@/shared/lib/utils";
import type {
  FinanceDecisionSimulateResponse,
  DecisionScenario,
  DecisionHistoricalPrecedent,
} from "../types";
import { DECISION_SCENARIO_CONFIG, DECISION_RISK_CONFIG } from "../types";
import ExportButton from "@/shared/components/export/ExportButton";
import './DecisionCockpit.css';

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

function confidenceColor(pct: number): string {
  if (pct >= 70) return "var(--color-emerald-400)";
  if (pct >= 50) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

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

/** Neural Loading */
function NeuralLoading({ text }: { text: string }) {
  return (
    <div className="glass-decision-panel p-8">
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

/* ══════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════ */

/** Confidence Radial Gauge (Propuesta 3) */
function ConfidenceGauge({ pct }: { pct: number }) {
  const animPct = useAnimatedCounter(pct, 800);
  const r = 36;
  const circ = Math.PI * r;
  const fill = (animPct / 100) * circ;
  const color = confidenceColor(pct);

  return (
    <div className="glass-decision-confidence" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <svg width="80" height="48" viewBox="0 0 80 48" aria-hidden="true">
        <path
          d={`M ${40 - r} ${44} A ${r} ${r} 0 0 1 ${40 + r} ${44}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={`M ${40 - r} ${44} A ${r} ${r} 0 0 1 ${40 + r} ${44}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ - fill}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.33,1,0.68,1)" }}
        />
        <text
          x="40" y="38"
          textAnchor="middle"
          fill="var(--color-silver-100)"
          fontSize="14"
          fontWeight="bold"
          fontFamily="var(--font-display)"
        >
          {Math.round(animPct)}%
        </text>
      </svg>
    </div>
  );
}

/** Decision Radar Mini (Propuesta 6) */
function DecisionRadar({ scenarios }: { scenarios: DecisionScenario[] }) {
  // 3 points on a triangle representing probability spread
  const r = 32;
  const cx = 40;
  const cy = 40;
  const angles = [270, 30, 150]; // top, bottom-right, bottom-left (degrees)
  const points = scenarios.map((s, i) => {
    const angle = (angles[i] * Math.PI) / 180;
    const dist = (s.probability_pct / 100) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
      color: DECISION_SCENARIO_CONFIG[s.name]?.color ?? "var(--color-silver-400)",
      label: s.name.charAt(0),
      labelX: cx + (r + 10) * Math.cos(angle),
      labelY: cy + (r + 10) * Math.sin(angle),
    };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="glass-decision-radar">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        {/* Background triangle */}
        <polygon
          points={angles.map((a) => {
            const rad = (a * Math.PI) / 180;
            return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
        {/* Filled area */}
        <path d={pathD} fill="rgba(201,169,110,0.08)" stroke="var(--color-gold-400)" strokeWidth="1.5" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={p.color} />
            <text x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="central" fill={p.color} fontSize="8" fontWeight="600" fontFamily="var(--font-ui)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Scenario Diff Bar (Propuesta 2) */
function ScenarioDiffBar({
  label,
  scenarios,
  valueKey,
  format,
}: {
  label: string;
  scenarios: DecisionScenario[];
  valueKey: keyof DecisionScenario;
  format: (v: number) => string;
}) {
  const values = scenarios.map((s) => {
    const v = s[valueKey];
    return typeof v === "number" ? v : 0;
  });
  const max = Math.max(...values.map(Math.abs), 1);

  return (
    <div className="space-y-1">
      <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
        {label}
      </span>
      <div className="space-y-1">
        {scenarios.map((s, _i) => {
          const cfg = DECISION_SCENARIO_CONFIG[s.name];
          const v = typeof s[valueKey] === "number" ? (s[valueKey] as number) : 0;
          const pct = (Math.abs(v) / max) * 100;
          return (
            <div key={s.name} className="glass-decision-diff-bar">
              <span className="text-[9px] font-[family-name:var(--font-mono)] w-6 text-right" style={{ color: cfg?.color }}>
                {s.name.charAt(0)}
              </span>
              <div className="glass-decision-diff-bar__track flex-1">
                <div
                  className="glass-decision-diff-bar__fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: cfg?.color ?? "var(--color-silver-400)",
                  }}
                />
              </div>
              <span className="text-[9px] font-[family-name:var(--font-mono)] w-16 text-right text-[var(--color-silver-400)]">
                {format(v)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function DecisionCockpit() {
  const motionV = useMotion();
  const { isMobile } = useBreakpoint();
  const [decisionText, setDecisionText] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);

  const decisionQ = useMCPQuery<FinanceDecisionSimulateResponse>(
    "finance",
    "finance_decision_simulate",
    { decision_text: decisionText },
    { enabled: shouldFetch },
  );

  const data = decisionQ.data?.data;

  const handleSimulate = useCallback(() => {
    if (!decisionText.trim()) {
      showToast({ type: "error", message: "Describe la decisión antes de simular" });
      return;
    }
    setShouldFetch(true);
  }, [decisionText]);

  const handleCopy = useCallback(() => {
    if (!data) return;
    const lines = [
      `DECISIÓN: ${data.decision_summary}`,
      "",
      `RECOMENDACIÓN: ${data.recommendation.recommended_scenario} (${data.recommendation.confidence_pct}% confianza)`,
      "",
      data.recommendation.reasoning,
      "",
      "FACTORES CRÍTICOS DE ÉXITO:",
      ...data.recommendation.critical_success_factors.map((f: string, i: number) => `${i + 1}. ${f}`),
      "",
      "MONITOREAR:",
      ...data.recommendation.watch_items.map((w: string) => `• ${w}`),
      "",
      "KPIs SUGERIDOS:",
      ...data.recommendation.suggested_kpis.map((k: string) => `• ${k}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    showToast({ type: "success", message: "Recomendación copiada al portapapeles" });
  }, [data]);

  // ── Empty State (Rule #19) ──

  if (!shouldFetch) {
    return (
      <motion.div
        variants={motionV.container}
        initial={false}
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={motionV.item}>
          <div className="glass-decision-panel p-8 text-center max-w-2xl mx-auto">
            <div className="relative z-[1]">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-[color-mix(in srgb,var(--color-gold-400)12%,transparent)]">
                <Target className="w-7 h-7 text-[var(--color-gold-400)]" />
              </div>
              <h3 className="text-xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-200)] mb-2">
                Cockpit de Decisiones
              </h3>
              <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-body)] mb-6 max-w-lg mx-auto leading-relaxed">
                Describe la decisión estratégica que necesitas evaluar. La AI generará 3 escenarios
                (optimista, base y pesimista) con probabilidades, impactos financieros en colones,
                precedentes históricos del club y una recomendación fundamentada.
              </p>
              <textarea
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                placeholder="Ej: ¿Deberíamos implementar un programa de membresía junior para hijos de socios de 18-28 años a tarifa preferencial del 60%?"
                className="w-full min-h-[120px] p-4 rounded-xl
                           bg-[var(--color-surface-2)] border border-white/[0.06]
                           text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)]
                           placeholder:text-[var(--color-silver-500)] resize-y
                           focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]
                           mb-4"
                aria-label="Descripción de la decisión estratégica"
              />
              <Button
                variant="primary"
                onClick={handleSimulate}
                disabled={!decisionText.trim()}
                icon={<Sparkles size={16} />}
                className="bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110 min-h-[44px] px-8"
              >
                Simular Escenarios
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Sugerencias — glass pills (Propuesta 4) */}
        <motion.div variants={motionV.item}>
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-2 text-center">
              Ideas para simular:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "¿Membresía junior para 18-28 años?",
                "Aumento de cuota 8% para Gold en 2026",
                "Evento mensual de networking corporativo",
                "Descuento early renewal 15% para Q1",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDecisionText(s)}
                  className="glass-decision-pill focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Loading — Neural ──

  if (decisionQ.isLoading && !data) {
    return <NeuralLoading text="Simulando escenarios, analizando precedentes…" />;
  }

  // ── Error / No Data ──

  if (!data) {
    return (
      <div className="glass-decision-panel p-8 text-center max-w-lg mx-auto">
        <div className="relative z-[1]">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-[var(--color-amber-400)]" />
          <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-4">
            No se pudo generar la simulación. Intenta con una descripción más específica.
          </p>
          <Button
            variant="secondary"
            onClick={() => setShouldFetch(false)}
            className="min-h-[44px]"
          >
            Nueva simulación
          </Button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     Results
     ══════════════════════════════════════════════════════ */

  const isRecommended = (name: string) => name === data.recommendation.recommended_scenario;

  return (
    <motion.div
      variants={motionV.container}
      initial={false}
      animate="visible"
      className="space-y-6"
    >
      {/* ── Compact Input (post-simulation) ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-decision-panel p-4">
          <div className="relative z-[1] flex gap-3">
            <textarea
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              className="flex-1 min-h-[44px] max-h-[80px] p-3 rounded-lg
                         bg-[var(--color-surface-2)] border border-white/[0.06]
                         text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)]
                         resize-none focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
              aria-label="Decisión a simular"
            />
            <Button
              variant="primary"
              onClick={() => {
                if (!decisionText.trim()) {
                  showToast({ type: "error", message: "Describe la decisión antes de simular" });
                  return;
                }
                decisionQ.refetch();
              }}
              icon={<Sparkles size={14} />}
              className="bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110 min-h-[44px]"
            >
              {isMobile ? "Simular" : "Re-simular"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Context Analysis ── */}
      <motion.div variants={motionV.item}>
        <div
          className="glass-decision-panel p-5"
          style={{ borderLeft: "3px solid var(--color-gold-400)" }}
        >
          <div className="relative z-[1]">
            <h3 className="text-sm font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-display)] mb-2">
              Análisis de Contexto
            </h3>
            <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed mb-2">
              {data.decision_summary}
            </p>
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed">
              {data.context_analysis}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Scenario Visual Diff + Radar (Propuestas 2+6) ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-decision-panel p-5">
          <div className="relative z-[1]">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Comparación de Escenarios
              </h3>
              <DecisionRadar scenarios={data.scenarios} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ScenarioDiffBar
                label="Revenue incremental"
                scenarios={data.scenarios}
                valueKey="revenue_delta"
                format={(v) => `+${formatCurrency(v)}`}
              />
              <ScenarioDiffBar
                label="Cash Flow"
                scenarios={data.scenarios}
                valueKey="cash_flow_delta"
                format={(v) => `+${formatCurrency(v)}`}
              />
              <ScenarioDiffBar
                label="ROI"
                scenarios={data.scenarios}
                valueKey="roi_pct"
                format={(v) => `${v.toFixed(0)}%`}
              />
              <ScenarioDiffBar
                label="Inversión"
                scenarios={data.scenarios}
                valueKey="implementation_cost"
                format={(v) => formatCurrency(v)}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 3 Scenario Cards — GLASS (Propuesta 1) ── */}
      <motion.div variants={motionV.item}>
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3",
        )}>
          {data.scenarios.map((scenario: DecisionScenario) => {
            const sCfg = DECISION_SCENARIO_CONFIG[scenario.name] ?? DECISION_SCENARIO_CONFIG.Base;
            const rCfg = DECISION_RISK_CONFIG[scenario.risk_level] ?? DECISION_RISK_CONFIG.medio;
            const recommended = isRecommended(scenario.name);

            return (
              <div
                key={scenario.name}
                className={cn(
                  "glass-decision-scenario",
                  recommended && "glass-decision-scenario--recommended",
                )}
                style={{ "--scenario-color": sCfg.color } as React.CSSProperties}
              >
                <div className="relative z-[1]">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4
                        className="text-base font-bold font-[family-name:var(--font-display)]"
                        style={{ color: sCfg.color }}
                      >
                        {scenario.name}
                      </h4>
                      {recommended && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold font-[family-name:var(--font-mono)] bg-[var(--color-gold-400)] text-[var(--color-abyss)]">
                          RECOMENDADO
                        </span>
                      )}
                    </div>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold font-[family-name:var(--font-mono)]"
                      style={{ color: sCfg.color, backgroundColor: sCfg.bgColor }}
                    >
                      {scenario.probability_pct}%
                    </span>
                  </div>

                  {/* Revenue Hero */}
                  <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: sCfg.bgColor }}>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-0.5">
                      Revenue incremental
                    </p>
                    <p
                      className="text-xl font-bold font-[family-name:var(--font-display)]"
                      style={{ color: sCfg.color }}
                    >
                      +{formatCurrency(scenario.revenue_delta)}
                    </p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-[var(--color-surface-2)]">
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Cash Flow</p>
                      <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                        +{formatCurrency(scenario.cash_flow_delta)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--color-surface-2)]">
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Socios</p>
                      <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                        +{scenario.membership_delta}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--color-surface-2)]">
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">ROI</p>
                      <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                        {scenario.roi_pct}%
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--color-surface-2)]">
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Inversión</p>
                      <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-rose-400)]">
                        {formatCurrency(scenario.implementation_cost)}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-1.5 mb-4 text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                    <Clock size={12} />
                    {scenario.timeline_months} {scenario.timeline_months === 1 ? "mes" : "meses"} para ver resultados
                  </div>

                  {/* Risk Level */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.04]">
                    <ShieldCheck size={14} style={{ color: rCfg.color }} />
                    <span className="text-xs font-medium font-[family-name:var(--font-ui)]" style={{ color: rCfg.color }}>
                      Riesgo: {rCfg.label}
                    </span>
                  </div>

                  {/* Risk Factors */}
                  {scenario.risk_factors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-1.5">
                        Riesgos
                      </p>
                      <ul className="space-y-1">
                        {scenario.risk_factors.map((rf, i) => (
                          <li key={i} className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] flex items-start gap-1.5">
                            <AlertTriangle size={10} className="flex-shrink-0 mt-0.5 text-[var(--color-amber-400)]" />
                            {rf}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Assumptions */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-1.5">
                      Supuestos clave
                    </p>
                    <ul className="space-y-1">
                      {scenario.key_assumptions.map((ka, i) => (
                        <li key={i} className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] flex items-start gap-1.5">
                          <CheckCircle2 size={10} className="flex-shrink-0 mt-0.5 text-[var(--color-teal-400)]" />
                          {ka}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── AI Recommendation — GLASS (Propuesta 1) ── */}
      <motion.div variants={motionV.item}>
        <div
          className="glass-decision-panel p-5"
          style={{ borderLeft: "3px solid var(--color-gold-400)" }}
        >
          <div className="relative z-[1]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-gold-400)]" />
                <h3 className="text-sm font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-display)]">
                  Recomendación AI
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">Confianza:</span>
                  <ConfidenceGauge pct={data.recommendation.confidence_pct} />
                </div>
                <Button
                  variant="ghost"
                  onClick={handleCopy}
                  icon={<Copy size={14} />}
                  className="text-xs min-h-[44px]"
                >
                  Copiar
                </Button>
              </div>
            </div>

            {/* Recommended scenario badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                Escenario recomendado:
              </span>
              {(() => {
                const recCfg = DECISION_SCENARIO_CONFIG[data.recommendation.recommended_scenario]
                  ?? DECISION_SCENARIO_CONFIG.Base;
                return (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold font-[family-name:var(--font-mono)]"
                    style={{ color: recCfg.color, backgroundColor: recCfg.bgColor }}
                  >
                    {data.recommendation.recommended_scenario}
                  </span>
                );
              })()}
            </div>

            {/* Reasoning */}
            <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed mb-5">
              {data.recommendation.reasoning}
            </p>

            {/* Critical Success Factors */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)] mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Factores críticos de éxito
              </h4>
              <ul className="space-y-2">
                {data.recommendation.critical_success_factors.map((csf: string, i: number) => (
                  <li key={i} className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] flex items-start gap-2">
                    <span
                      className="flex items-center justify-center flex-shrink-0
                                 text-[9px] font-bold bg-[var(--color-emerald-400)] text-[var(--color-abyss)]
                                 font-[family-name:var(--font-mono)] rounded-full"
                      style={{ width: 18, height: 18 }}
                    >
                      {i + 1}
                    </span>
                    {csf}
                  </li>
                ))}
              </ul>
            </div>

            {/* Watch Items */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-[var(--color-amber-400)] font-[family-name:var(--font-ui)] mb-2.5 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Monitorear
              </h4>
              <ul className="space-y-2">
                {data.recommendation.watch_items.map((wi: string, i: number) => (
                  <li key={i} className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] flex items-start gap-2">
                    <AlertTriangle size={10} className="flex-shrink-0 mt-0.5 text-[var(--color-amber-400)]" />
                    {wi}
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested KPIs */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-teal-400)] font-[family-name:var(--font-ui)] mb-2.5 flex items-center gap-1.5">
                <BarChart3 size={12} />
                KPIs sugeridos
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.recommendation.suggested_kpis.map((kpi: string, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium font-[family-name:var(--font-ui)]
                               bg-[color-mix(in srgb,var(--color-teal-400)8%,transparent)]
                               text-[var(--color-teal-400)]
                               border border-[color-mix(in srgb,var(--color-teal-400)20%,transparent)]"
                  >
                    {kpi}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Historical Precedents — TIMELINE (Propuesta 5) ── */}
      {data.historical_precedents.length > 0 && (
        <motion.div variants={motionV.item}>
          <div className="glass-decision-panel p-5">
            <div className="relative z-[1]">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={14} className="text-[var(--color-silver-300)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Precedentes Históricos
                </h3>
              </div>
              <div className="glass-decision-timeline">
                {data.historical_precedents.map((prec: DecisionHistoricalPrecedent, idx: number) => (
                  <div key={idx} className="glass-decision-timeline__node">
                    <div className="relative z-[1]">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                            {prec.decision}
                          </h4>
                          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">
                            {new Date(prec.date).toLocaleDateString("es-CR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                            {" — "}Escenario elegido: {prec.chosen_scenario}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                            +{formatCurrency(prec.revenue_impact)}
                          </p>
                          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                            impacto real
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] mb-1.5">
                        <span className="text-[var(--color-silver-500)]">Resultado: </span>
                        {prec.actual_outcome}
                      </p>
                      <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] italic">
                        <span className="not-italic text-[var(--color-teal-400)]">Lección: </span>
                        {prec.lessons_learned}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Sensitivity Notes ── */}
      {data.sensitivity_notes.length > 0 && (
        <motion.div variants={motionV.item}>
          <div className="glass-decision-panel p-5">
            <div className="relative z-[1]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-[var(--color-silver-300)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Notas de Sensibilidad
                </h3>
              </div>
              <ul className="space-y-2">
                {data.sensitivity_notes.map((note: string, i: number) => (
                  <li
                    key={i}
                    className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]
                               flex items-start gap-2 p-2.5 rounded-lg bg-[var(--color-surface-2)]"
                  >
                    <ArrowRight size={10} className="flex-shrink-0 mt-0.5 text-[var(--color-gold-400)]" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Export ── */}
      <motion.div variants={motionV.item}>
        <div className="flex justify-end">
          <ExportButton
            module="decision-cockpit"
            onPrint={() =>
              showToast({ type: "info", message: "Vista de impresión disponible — use Ctrl+P" })
            }
          />
        </div>
      </motion.div>
    </motion.div>
  );
}