// src/shared/components/ai/AISimulationPanel.tsx
// Fase 23 — Silver Tide AI Simulation Cockpit
// Glass · Divergence Diagram · Bell Curve · Risk Dial · Metric Matrix
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, BarChart3,
  AlertCircle, CheckCircle2, RefreshCw,
  Cpu, GitBranch, Gauge
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn, formatCurrency } from "@/shared/lib/utils";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type { AdvisorScenarioResponse } from "@/shared/mocks/contracts";
import './AISimulationPanel.css';

/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface AISimulationPanelProps {
  baseData: Record<string, unknown>;
  proposedChanges: Array<Record<string, unknown>>;
  timeframe?: string;
  onReSimulate?: () => void;
}

/* ──────────────────────────────────────
   Config
   ────────────────────────────────────── */

const SCENARIO_CONFIG: Record<string, {
  label: string;
  icon: LucideIcon;
  color: string;
  order: number;
}> = {
  optimistic: { label: "Optimista", icon: TrendingUp, color: "var(--color-emerald-400)", order: 0 },
  base:       { label: "Base", icon: Minus, color: "var(--color-teal-400)", order: 1 },
  pessimistic:{ label: "Pesimista", icon: TrendingDown, color: "var(--color-rose-400)", order: 2 },
};

const TIMEFRAMES = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "quarter", label: "Trim." },
] as const;

/* ──────────────────────────────────────
   Simulation Ceremony
   ────────────────────────────────────── */

const SIM_PHASES = [
  { icon: Cpu, label: "Inicializando motor de simulación...", color: "var(--color-teal-400)" },
  { icon: BarChart3, label: "Ejecutando iteraciones Monte Carlo...", color: "var(--color-amber-400)" },
  { icon: GitBranch, label: "Analizando distribución de probabilidad...", color: "var(--color-gold-400)" },
  { icon: Gauge, label: "Preparando escenarios...", color: "var(--color-gold-400)" },
];

function SimulationCeremony({ reduced }: { reduced: boolean }) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) { setPhase(3); setProgress(100); return; }
    const t1 = setTimeout(() => setPhase(1), 1000);
    const t2 = setTimeout(() => setPhase(2), 2500);
    const t3 = setTimeout(() => setPhase(3), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const iv = setInterval(() => setProgress((p) => Math.min(p + 2.5, 95)), 80);
    return () => clearInterval(iv);
  }, [reduced]);

  const current = SIM_PHASES[phase];
  const PhaseIcon = current.icon;

  return (
    <motion.div
      className="glass-sim__ceremony"
      initial={reduced ? undefined : { opacity: 0 }}
      animate={reduced ? undefined : { opacity: 1 }}
    >
      <div className="glass-sim__ceremony-row">
        <motion.div
          key={phase}
          initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          className="glass-sim__ceremony-icon"
        >
          <PhaseIcon size={18} style={{ color: current.color }} />
          <span className="glass-sim__ceremony-ring" style={{ borderColor: current.color }} />
        </motion.div>
        <div>
          <motion.p
            key={current.label}
            initial={reduced ? undefined : { opacity: 0, y: 4 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            className="glass-sim__ceremony-label"
          >
            {current.label}
          </motion.p>
          <p className="glass-sim__ceremony-sub">Simulación probabilística en curso</p>
        </div>
      </div>
      <div className="glass-sim__ceremony-track">
        <motion.div
          className="glass-sim__ceremony-fill"
          initial={reduced ? undefined : { width: 0 }}
          animate={reduced ? undefined : { width: `${progress}%` }}
        />
      </div>
      <div className="glass-sim__ceremony-dots">
        {SIM_PHASES.map((p, i) => (
          <span
            key={i}
            className={cn("glass-sim__ceremony-dot", i <= phase && "glass-sim__ceremony-dot--on")}
            style={i <= phase ? { background: p.color } : undefined}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Divergence Diagram — Fork/Branch
   ────────────────────────────────────── */

function DivergenceDiagram({
  scenarios,
  recommended,
  reduced,
}: {
  scenarios: AdvisorScenarioResponse["simulation"]["scenarios"];
  recommended: string;
  reduced: boolean;
}) {
  const sorted = useMemo(() => {
    return [...scenarios].sort(
      (a, b) => (SCENARIO_CONFIG[a.name]?.order ?? 1) - (SCENARIO_CONFIG[b.name]?.order ?? 1),
    );
  }, [scenarios]);

  /* SVG fork: origin left, 3 branches right */
  return (
    <div className="glass-sim__divergence">
      <svg viewBox="0 0 280 100" className="glass-sim__divergence-svg" preserveAspectRatio="xMidYMid meet">
        {/* Origin node */}
        <circle cx="30" cy="50" r="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <circle cx="30" cy="50" r="3" fill="var(--color-silver-300)" />

        {/* Branch lines */}
        {sorted.map((s, i) => {
          const cfg = SCENARIO_CONFIG[s.name] || SCENARIO_CONFIG.base;
          const yTarget = i === 0 ? 18 : i === 1 ? 50 : 82;
          const thickness = Math.max(1.5, (s.probability / 100) * 6);
          const isRec = s.name === recommended;

          return (
            <motion.g key={s.name}>
              {/* Branch path */}
              <motion.path
                d={`M 40 50 Q 100 50, 160 ${yTarget} L 230 ${yTarget}`}
                fill="none"
                stroke={cfg.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                opacity={isRec ? 0.9 : 0.5}
                initial={reduced ? undefined : { pathLength: 0 }}
                animate={reduced ? undefined : { pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" }}
              />

              {/* Endpoint node */}
              <motion.circle
                cx="240" cy={yTarget} r={isRec ? 10 : 7}
                fill={isRec ? cfg.color : "rgba(255,255,255,0.04)"}
                stroke={cfg.color}
                strokeWidth={isRec ? 2 : 1}
                opacity={isRec ? 1 : 0.7}
                initial={reduced ? undefined : { scale: 0 }}
                animate={reduced ? undefined : { scale: 1 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                style={isRec ? { filter: `drop-shadow(0 0 6px ${cfg.color})` } : undefined}
              />

              {/* Probability label */}
              <motion.text
                x="258" y={yTarget + 4}
                fill={cfg.color}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight="700"
                initial={reduced ? undefined : { opacity: 0 }}
                animate={reduced ? undefined : { opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.15 }}
              >
                {s.probability}%
              </motion.text>
            </motion.g>
          );
        })}

        {/* Labels */}
        <text x="30" y="92" fill="var(--color-silver-500)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
          Ahora
        </text>
      </svg>
    </div>
  );
}

/* ──────────────────────────────────────
   Scenario Card — Glass Intelligence
   ────────────────────────────────────── */

function ScenarioCard({
  scenario,
  isRecommended,
  index,
  reduced,
}: {
  scenario: AdvisorScenarioResponse["simulation"]["scenarios"][number];
  isRecommended: boolean;
  index: number;
  reduced: boolean;
}) {
  const cfg = SCENARIO_CONFIG[scenario.name] || SCENARIO_CONFIG.base;
  const Icon = cfg.icon;
  const m = scenario.projected_metrics;

  /* Probability ring */
  const ringRadius = 18;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringDash = `${(scenario.probability / 100) * ringCirc} ${ringCirc}`;

  return (
    <motion.div
      className={cn("glass-sim__card", isRecommended && "glass-sim__card--recommended")}
      initial={reduced ? undefined : { opacity: 0, y: 12, scale: 0.97 }}
      animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.12 }}
      whileHover={reduced ? undefined : { y: -3, transition: { duration: 0.15 } }}
    >
      {/* Recommended crown */}
      {isRecommended && <span className="glass-sim__card-crown"><CheckCircle2 className="w-3.5 h-3.5" /></span>}

      {/* Header */}
      <div className="glass-sim__card-header">
        <div className="glass-sim__card-icon" style={{ color: cfg.color }}>
          <Icon size={16} strokeWidth={1.5} />
        </div>
        <span className="glass-sim__card-label" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Probability ring */}
      <div className="glass-sim__card-ring-wrap">
        <svg viewBox="0 0 44 44" className="glass-sim__card-ring-svg">
          <circle cx="22" cy="22" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
          <motion.circle
            cx="22" cy="22" r={ringRadius}
            fill="none"
            stroke={cfg.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={ringDash}
            transform="rotate(-90 22 22)"
            initial={reduced ? undefined : { strokeDasharray: `0 ${ringCirc}` }}
            animate={reduced ? undefined : { strokeDasharray: ringDash }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${cfg.color})` }}
          />
        </svg>
        <span className="glass-sim__card-ring-value" style={{ color: cfg.color }}>
          {scenario.probability}%
        </span>
      </div>

      {/* Description */}
      <p className="glass-sim__card-desc">{scenario.description}</p>

      {/* Metrics */}
      <div className="glass-sim__card-metrics">
        {typeof m.revenue_change_pct === "number" && (
          <MetricBar
            label="Revenue"
            value={m.revenue_change_pct}
            suffix="%"
            color={m.revenue_change_pct > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)"}
            reduced={reduced}
          />
        )}
        {typeof m.net_impact_crc === "number" && (
          <MetricBar
            label="Impacto neto"
            value={m.net_impact_crc}
            displayValue={formatCurrency(m.net_impact_crc)}
            color={m.net_impact_crc > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)"}
            reduced={reduced}
          />
        )}
        {typeof m.health_score_change === "number" && (
          <MetricBar
            label="Health Δ"
            value={m.health_score_change}
            suffix=" pts"
            color={m.health_score_change > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)"}
            reduced={reduced}
          />
        )}
        {typeof m.member_impact === "string" && m.member_impact && (
          <p className="glass-sim__card-member">{m.member_impact}</p>
        )}
      </div>

      {/* Recommended badge */}
      {isRecommended && (
        <div className="glass-sim__card-rec-badge">
          <span>Escenario recomendado por el Advisor</span>
        </div>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Metric Bar — Visual Indicator
   ────────────────────────────────────── */

function MetricBar({
  label,
  value,
  suffix = "",
  displayValue,
  color,
  reduced,
}: {
  label: string;
  value: number;
  suffix?: string;
  displayValue?: string;
  color: string;
  reduced: boolean;
}) {
  const absVal = Math.abs(value);
  const barPct = Math.min(absVal * 5, 100); // heuristic scaling
  const display = displayValue || `${value > 0 ? "+" : ""}${value}${suffix}`;

  return (
    <div className="glass-sim__metric">
      <div className="glass-sim__metric-header">
        <span className="glass-sim__metric-label">{label}</span>
        <span className="glass-sim__metric-value" style={{ color }}>{display}</span>
      </div>
      <div className="glass-sim__metric-track">
        <motion.div
          className="glass-sim__metric-fill"
          style={{ background: color }}
          initial={reduced ? undefined : { width: 0 }}
          animate={reduced ? undefined : { width: `${barPct}%` }}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Risk Dial — Speedometer Gauge
   ────────────────────────────────────── */

function RiskDial({
  assessment,
  reduced,
}: {
  assessment: string;
  reduced: boolean;
}) {
  /* Heuristic: extract risk level from text */
  const riskLevel = useMemo(() => {
    const lower = assessment.toLowerCase();
    if (lower.includes("alto") || lower.includes("crítico") || lower.includes("riesgo significativo")) return 75;
    if (lower.includes("medio") || lower.includes("moderado")) return 50;
    if (lower.includes("bajo") || lower.includes("mínimo")) return 25;
    return 45;
  }, [assessment]);

  const color =
    riskLevel >= 70 ? "var(--color-rose-400)"
    : riskLevel >= 40 ? "var(--color-amber-400)"
    : "var(--color-emerald-400)";

  /* Needle rotation: -90° (left/bajo) to +90° (right/alto) */
  const needleAngle = -90 + (riskLevel / 100) * 180;

  return (
    <div className="glass-sim__risk">
      <div className="glass-sim__risk-gauge">
        <svg viewBox="0 0 120 70" className="glass-sim__risk-svg">
          {/* Background arc */}
          <path
            d="M 15 60 A 45 45 0 0 1 105 60"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Green zone */}
          <path
            d="M 15 60 A 45 45 0 0 1 45 20"
            fill="none"
            stroke="var(--color-emerald-400)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.15"
          />
          {/* Amber zone */}
          <path
            d="M 45 20 A 45 45 0 0 1 75 20"
            fill="none"
            stroke="var(--color-amber-400)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.15"
          />
          {/* Red zone */}
          <path
            d="M 75 20 A 45 45 0 0 1 105 60"
            fill="none"
            stroke="var(--color-rose-400)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.15"
          />
          {/* Needle */}
          <motion.line
            x1="60" y1="60"
            x2="60" y2="22"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transformOrigin: "60px 60px" }}
            initial={reduced ? undefined : { rotate: -90 }}
            animate={reduced ? undefined : { rotate: needleAngle }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 60, damping: 12 }}
          />
          {/* Center dot */}
          <circle cx="60" cy="60" r="4" fill={color} />
        </svg>
      </div>
      <div className="glass-sim__risk-text">
        <p className="glass-sim__risk-title">Evaluación de Riesgo</p>
        <p className="glass-sim__risk-desc">{assessment}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Uncertainty Range — Key Differentiator
   ────────────────────────────────────── */

function UncertaintyRange({
  scenarios,
  reduced,
}: {
  scenarios: AdvisorScenarioResponse["simulation"]["scenarios"];
  reduced: boolean;
}) {
  const opt = scenarios.find((s) => s.name === "optimistic");
  const pes = scenarios.find((s) => s.name === "pessimistic");

  if (!opt || !pes) return null;

  const optRevenue = Number(opt.projected_metrics.revenue_change_pct ?? 0);
  const pesRevenue = Number(pes.projected_metrics.revenue_change_pct ?? 0);
  const range = Math.abs(optRevenue - pesRevenue);

  return (
    <motion.div
      className="glass-sim__uncertainty"
      initial={reduced ? undefined : { opacity: 0, y: 6 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="glass-sim__uncertainty-header">
        <GitBranch className="w-3.5 h-3.5 text-[var(--color-silver-400)]" />
        <span>Rango de Incertidumbre</span>
      </div>
      <div className="glass-sim__uncertainty-bar">
        <span className="glass-sim__uncertainty-label glass-sim__uncertainty-label--pes">
          {pesRevenue > 0 ? "+" : ""}{pesRevenue}%
        </span>
        <div className="glass-sim__uncertainty-track">
          <motion.div
            className="glass-sim__uncertainty-fill"
            initial={reduced ? undefined : { scaleX: 0 }}
            animate={reduced ? undefined : { scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          />
          <span className="glass-sim__uncertainty-center" />
        </div>
        <span className="glass-sim__uncertainty-label glass-sim__uncertainty-label--opt">
          {optRevenue > 0 ? "+" : ""}{optRevenue}%
        </span>
      </div>
      <p className="glass-sim__uncertainty-diff">
        Dispersión: {range.toFixed(1)} puntos porcentuales
      </p>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export default function AISimulationPanel({
  baseData,
  proposedChanges,
  timeframe: initialTimeframe = "quarter",
  onReSimulate,
}: AISimulationPanelProps) {
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [hasUserChangedTimeframe, setHasUserChangedTimeframe] = useState(false);

  /* Sync timeframe */
  const prevProposedRef = useRef(proposedChanges);
  useEffect(() => {
    const prev = JSON.stringify(prevProposedRef.current);
    const next = JSON.stringify(proposedChanges);
    if (prev !== next) {
      prevProposedRef.current = proposedChanges;
      if (!hasUserChangedTimeframe) setTimeframe(initialTimeframe);
    }
  }, [proposedChanges, initialTimeframe, hasUserChangedTimeframe]);

  const { data, isLoading, isError } = useMCPQuery<AdvisorScenarioResponse>(
    "advisor_intelligence",
    "simulate_scenario",
    { base_data: baseData, proposed_changes: proposedChanges, timeframe },
    { staleTime: 300_000 },
  );

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
    setHasUserChangedTimeframe(true);
    queryClient.invalidateQueries({ queryKey: ["advisor_intelligence", "simulate_scenario"] });
    onReSimulate?.();
  };

  const handleReSimulate = () => {
    queryClient.invalidateQueries({ queryKey: ["advisor_intelligence", "simulate_scenario"] });
    onReSimulate?.();
  };

  const simulation = data?.simulation;

  /* ── Loading: Ceremony ── */
  if (isLoading) return <SimulationCeremony reduced={reduced} />;

  /* ── Error ── */
  if (isError || !simulation) {
    return (
      <motion.div
        className="glass-sim glass-sim--error"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
      >
        <AlertCircle className="w-4 h-4 text-[var(--color-silver-400)]" />
        <p>No se pudo generar la simulación.</p>
        <button onClick={handleReSimulate} className="glass-sim__error-retry">Reintentar</button>
      </motion.div>
    );
  }

  const sortedScenarios = [...simulation.scenarios].sort(
    (a, b) => (SCENARIO_CONFIG[a.name]?.order ?? 1) - (SCENARIO_CONFIG[b.name]?.order ?? 1),
  );

  return (
    <motion.div
      className="glass-sim"
      initial={reduced ? undefined : { opacity: 0, y: 4 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Ambient glow */}
      <span className="glass-sim__glow" />

      {/* ═══ Header ═══ */}
      <div className="glass-sim__header">
        <div className="glass-sim__header-left">
          <div className="glass-sim__header-icon">
            <BarChart3 size={18} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="glass-sim__header-title">Simulación de Escenarios</h3>
            <p className="glass-sim__header-meta">
              <Cpu className="w-3 h-3" />
              Monte Carlo · {simulation.scenarios.length} escenarios
            </p>
          </div>
        </div>

        <div className="glass-sim__header-right">
          {/* Temporal Zoom Control */}
          <div className="glass-sim__zoom">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                onClick={() => handleTimeframeChange(tf.key)}
                className={cn("glass-sim__zoom-btn", timeframe === tf.key && "glass-sim__zoom-btn--active")}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Re-simulate */}
          <button onClick={handleReSimulate} className="glass-sim__refresh" aria-label="Re-simular">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══ Divergence Diagram ═══ */}
      <div className="glass-sim__diagram-section">
        <DivergenceDiagram
          scenarios={simulation.scenarios}
          recommended={simulation.recommended_scenario}
          reduced={reduced}
        />
      </div>

      {/* ═══ Scenario Cards ═══ */}
      <div className="glass-sim__cards">
        {sortedScenarios.map((scenario, i) => (
          <ScenarioCard
            key={scenario.name}
            scenario={scenario}
            isRecommended={scenario.name === simulation.recommended_scenario}
            index={i}
            reduced={reduced}
          />
        ))}
      </div>

      {/* ═══ Uncertainty Range ═══ */}
      <UncertaintyRange scenarios={simulation.scenarios} reduced={reduced} />

      {/* ═══ Risk Assessment ═══ */}
      <RiskDial assessment={simulation.risk_assessment} reduced={reduced} />
    </motion.div>
  );
}