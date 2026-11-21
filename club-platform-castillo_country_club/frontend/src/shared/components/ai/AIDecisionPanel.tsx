// src/shared/components/ai/AIDecisionPanel.tsx
// Fase 23 — Silver Tide AI Decision Intelligence Console
// Glass · Generation Ceremony · Risk Gauge · Correlation Map · Scenario Fan
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronDown, TrendingUp, TrendingDown,
  AlertTriangle, Target, Brain, Lightbulb, Loader2, Minus,
  Link2, BarChart3, ArrowRight, Clock,
  Database, Zap, Shield
} from "lucide-react";
import { showToast } from "@/shared/components/ui/Toast";
import { useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import type { AiExecutiveReport } from "@/shared/mocks/contracts";
import './AIDecisionPanel.css';
import { Button } from "@/shared/components/ui/Button";

/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

export type { AiExecutiveReport } from "@/shared/mocks/contracts";

interface AIDecisionPanelProps {
  scope: "executive" | "financial" | "engagement";
  period?: string;
  title?: string;
  onActionClick?: (action: AiExecutiveReport["suggested_actions"][number]) => void;
}

/* ──────────────────────────────────────
   Config
   ────────────────────────────────────── */

const SCOPE_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  accent: string;
  icon: typeof Brain;
}> = {
  executive: {
    title: "Panel de Decisión Estratégica",
    subtitle: "Análisis cross-domain — Finanzas, Engagement, Operaciones",
    accent: "var(--color-gold-400)",
    icon: Brain,
  },
  financial: {
    title: "Análisis Financiero Inteligente",
    subtitle: "P&L, presupuesto, proyecciones y recomendaciones",
    accent: "var(--color-teal-400)",
    icon: BarChart3,
  },
  engagement: {
    title: "Análisis de Engagement",
    subtitle: "Retención, satisfacción, riesgo de churn y oportunidades",
    accent: "var(--color-amber-400)",
    icon: Zap,
  },
};

const SEVERITY_CONFIG: Record<string, {
  color: string;
  label: string;
  icon: typeof AlertTriangle;
  weight: number;
}> = {
  critical: { color: "var(--color-rose-400)", label: "Crítico", icon: AlertTriangle, weight: 4 },
  high: { color: "var(--color-terracotta-400)", label: "Alto", icon: AlertTriangle, weight: 3 },
  medium: { color: "var(--color-amber-400)", label: "Medio", icon: AlertTriangle, weight: 2 },
  low: { color: "var(--color-teal-400)", label: "Bajo", icon: AlertTriangle, weight: 1 },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  high: { color: "var(--color-gold-400)", label: "ALTO" },
  medium: { color: "var(--color-silver-300)", label: "MEDIO" },
  low: { color: "var(--color-silver-400)", label: "BAJO" },
};

const TREND_CONFIG: Record<string, {
  icon: typeof TrendingUp;
  color: string;
  label: string;
}> = {
  improving: { icon: TrendingUp, color: "var(--color-emerald-400)", label: "Mejorando" },
  stable: { icon: Minus, color: "var(--color-silver-400)", label: "Estable" },
  declining: { icon: TrendingDown, color: "var(--color-rose-400)", label: "Descendiendo" },
};

/* ──────────────────────────────────────
   Generation Ceremony
   ────────────────────────────────────── */

const CEREMONY_PHASES = [
  { icon: Database, label: "Recopilando datos operativos...", color: "var(--color-teal-400)" },
  { icon: Link2, label: "Analizando correlaciones cross-domain...", color: "var(--color-amber-400)" },
  { icon: Brain, label: "Generando recomendaciones estratégicas...", color: "var(--color-gold-400)" },
  { icon: Sparkles, label: "Preparando briefing...", color: "var(--color-gold-400)" },
];

function GenerationCeremony({ reduced }: { reduced: boolean }) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) { setPhase(3); setProgress(100); return; }
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 3000);
    const t3 = setTimeout(() => setPhase(3), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 95));
    }, 100);
    return () => clearInterval(interval);
  }, [reduced]);

  const current = CEREMONY_PHASES[phase];
  const PhaseIcon = current.icon;

  return (
    <motion.div
      className="glass-decision__ceremony"
      initial={reduced ? undefined : { opacity: 0 }}
      animate={reduced ? undefined : { opacity: 1 }}
    >
      <div className="glass-decision__ceremony-content">
        <motion.div
          key={phase}
          initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass-decision__ceremony-icon"
        >
          <PhaseIcon size={20} style={{ color: current.color }} />
          <span className="glass-decision__ceremony-ring" style={{ borderColor: current.color }} />
        </motion.div>

        <div className="glass-decision__ceremony-text">
          <motion.p
            key={current.label}
            initial={reduced ? undefined : { opacity: 0, y: 4 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            className="glass-decision__ceremony-label"
          >
            {current.label}
          </motion.p>
          <p className="glass-decision__ceremony-sub">
            Advisor Intelligence procesando tu solicitud
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="glass-decision__ceremony-track">
        <motion.div
          className="glass-decision__ceremony-fill"
          initial={reduced ? undefined : { width: 0 }}
          animate={reduced ? undefined : { width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Phase dots */}
      <div className="glass-decision__ceremony-phases">
        {CEREMONY_PHASES.map((p, i) => (
          <span
            key={i}
            className={cn(
              "glass-decision__ceremony-dot",
              i <= phase && "glass-decision__ceremony-dot--active",
            )}
            style={i <= phase ? { background: p.color } : undefined}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Risk Gauge — Radial SVG
   ────────────────────────────────────── */

function RiskGauge({
  value,
  max,
  reduced,
}: {
  value: number;
  max: number;
  reduced: boolean;
}) {
  const pct = (value / max) * 100;
  const color =
    value >= 7 ? "var(--color-rose-400)"
    : value >= 4 ? "var(--color-amber-400)"
    : "var(--color-emerald-400)";

  const label =
    value >= 7 ? "CRÍTICO"
    : value >= 4 ? "MEDIO"
    : "BAJO";

  /* SVG arc calculation */
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(pct / 100) * circumference * 0.75} ${circumference}`;

  return (
    <div className="glass-decision__gauge">
      <svg viewBox="0 0 80 80" className="glass-decision__gauge-svg">
        {/* Background arc */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="6"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(135 40 40)"
        />
        {/* Value arc */}
        <motion.circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          transform="rotate(135 40 40)"
          initial={reduced ? undefined : { strokeDasharray: `0 ${circumference}` }}
          animate={reduced ? undefined : { strokeDasharray }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="glass-decision__gauge-center">
        <span className="glass-decision__gauge-value" style={{ color }}>
          {value}
        </span>
        <span className="glass-decision__gauge-max">/{max}</span>
      </div>
      <span className="glass-decision__gauge-label" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────
   Stat Pulsar — Metric Visualization
   ────────────────────────────────────── */

function StatPulsar({
  label,
  value,
  icon,
  color,
  subValue,
  reduced,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subValue?: string;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="glass-decision__pulsar"
      whileHover={reduced ? undefined : { scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      <span className="glass-decision__pulsar-glow" style={{ background: color }} />
      <div className="glass-decision__pulsar-icon" style={{ color }}>
        {icon}
      </div>
      <span className="glass-decision__pulsar-value" style={{ color }}>
        {value}
      </span>
      <span className="glass-decision__pulsar-label">{label}</span>
      {subValue && (
        <span className="glass-decision__pulsar-sub">{subValue}</span>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Cross-Domain Correlation Map (executive)
   ────────────────────────────────────── */

function CrossDomainMap({
  insights,
  reduced,
}: {
  insights: AiExecutiveReport["cross_domain_insights"];
  reduced: boolean;
}) {
  const domains = useMemo(() => {
    const set = new Set<string>();
    insights.forEach((ci) => ci.domains.forEach((d) => set.add(d)));
    return Array.from(set);
  }, [insights]);

  const domainColors: Record<string, string> = {
    finance: "var(--color-emerald-400)",
    engagement: "var(--color-amber-400)",
    operations: "var(--color-teal-400)",
    financial: "var(--color-emerald-400)",
  };

  return (
    <div className="glass-decision__domain-map">
      {/* Domain nodes */}
      <div className="glass-decision__domain-nodes">
        {domains.map((d, i) => (
          <motion.div
            key={d}
            className="glass-decision__domain-node"
            style={{ borderColor: domainColors[d] || "var(--color-silver-400)" }}
            initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <span
              className="glass-decision__domain-dot"
              style={{ background: domainColors[d] || "var(--color-silver-400)" }}
            />
            <span className="glass-decision__domain-label">{d}</span>
          </motion.div>
        ))}
      </div>

      {/* Connection lines (simplified with CSS) */}
      {domains.length > 1 && (
        <div className="glass-decision__domain-connector">
          <span className="glass-decision__domain-line" />
          <Link2 className="w-3 h-3 text-[var(--color-silver-500)]" />
          <span className="glass-decision__domain-line" />
        </div>
      )}

      {/* Insights */}
      <div className="glass-decision__domain-insights">
        {insights.map((ci, i) => (
          <motion.div
            key={i}
            className="glass-decision__domain-insight"
            initial={reduced ? undefined : { opacity: 0, x: -6 }}
            animate={reduced ? undefined : { opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <div className="glass-decision__domain-tags">
              {ci.domains.map((d, j) => (
                <span
                  key={j}
                  className="glass-decision__domain-tag"
                  style={{
                    borderColor: domainColors[d] || "var(--color-silver-400)",
                    color: domainColors[d] || "var(--color-silver-400)",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            <p className="glass-decision__domain-text">{ci.insight}</p>
            <p className="glass-decision__domain-corr">{ci.correlation}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Urgency Stack — Risk Alerts
   ────────────────────────────────────── */

function UrgencyStack({
  alerts,
  reduced,
}: {
  alerts: AiExecutiveReport["risk_alerts"];
  reduced: boolean;
}) {
  const sorted = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const wa = SEVERITY_CONFIG[a.severity]?.weight ?? 0;
      const wb = SEVERITY_CONFIG[b.severity]?.weight ?? 0;
      return wb - wa;
    });
  }, [alerts]);

  return (
    <div className="glass-decision__urgency">
      {sorted.map((alert, i) => {
        const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
        const SevIcon = sev.icon;
        const isCritical = alert.severity === "critical";

        return (
          <motion.div
            key={i}
            className={cn(
              "glass-decision__alert",
              isCritical && "glass-decision__alert--critical",
            )}
            initial={reduced ? undefined : { opacity: 0, x: -8 }}
            animate={reduced ? undefined : { opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <span className="glass-decision__alert-bar" style={{ background: sev.color }} />
            <SevIcon size={14} className="flex-shrink-0" style={{ color: sev.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="glass-decision__alert-badge" style={{ background: sev.color }}>
                  {sev.label}
                </span>
                {alert.affected_segment && (
                  <span className="glass-decision__alert-segment">{alert.affected_segment}</span>
                )}
              </div>
              <p className="glass-decision__alert-title">{alert.title}</p>
              <p className="glass-decision__alert-desc">{alert.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────
   Impact Ranking — Recommendations
   ────────────────────────────────────── */

function ImpactRanking({
  recommendations,
  reduced,
}: {
  recommendations: AiExecutiveReport["recommendations"];
  reduced: boolean;
}) {
  return (
    <div className="glass-decision__ranking">
      {recommendations.map((rec, i) => {
        const pCfg = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;
        const isFirst = i === 0;

        /* Heuristic impact bar width */
        const impactMatch = rec.estimated_impact?.match(/(\d+)/);
        const impactPct = impactMatch ? Math.min(parseInt(impactMatch[1], 10), 100) : 50 + (3 - i) * 15;

        return (
          <motion.div
            key={i}
            className={cn(
              "glass-decision__rec",
              isFirst && "glass-decision__rec--primary",
            )}
            initial={reduced ? undefined : { opacity: 0, x: -6 }}
            animate={reduced ? undefined : { opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="glass-decision__rec-num" style={{ color: pCfg.color }}>
              {isFirst ? (
                <span className="glass-decision__rec-badge" style={{ background: pCfg.color }}>
                  {i + 1}
                </span>
              ) : (
                <span className="glass-decision__rec-idx">{i + 1}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="glass-decision__rec-priority" style={{ color: pCfg.color }}>
                  {pCfg.label}
                </span>
                <span className="glass-decision__rec-domain">{rec.domain}</span>
              </div>
              <p className="glass-decision__rec-action">{rec.action}</p>
              <p className="glass-decision__rec-justify">{rec.justification}</p>

              {/* Impact bar */}
              <div className="glass-decision__rec-impact">
                <div className="glass-decision__rec-impact-track">
                  <motion.div
                    className="glass-decision__rec-impact-fill"
                    style={{ background: pCfg.color }}
                    initial={reduced ? undefined : { width: 0 }}
                    animate={reduced ? undefined : { width: `${impactPct}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                  />
                </div>
                <span className="glass-decision__rec-impact-label">
                  {rec.estimated_impact}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────
   Scenario Fan — Projection Visualization
   ────────────────────────────────────── */

function ScenarioFan({
  projection,
  reduced,
}: {
  projection: NonNullable<AiExecutiveReport["projection"]>;
  reduced: boolean;
}) {
  const confPct = Math.round(projection.confidence * 100);

  return (
    <div className="glass-decision__fan">
      <div className="glass-decision__fan-header">
        <span className="glass-decision__fan-method">{projection.method}</span>
        <span className="glass-decision__fan-conf">{confPct}% confianza</span>
      </div>

      <div className="glass-decision__fan-chart">
        {/* Now marker */}
        <span className="glass-decision__fan-now">Ahora</span>

        {/* Fan lines */}
        <div className="glass-decision__fan-lines">
          <motion.div
            className="glass-decision__fan-line glass-decision__fan-line--optimistic"
            initial={reduced ? undefined : { scaleX: 0 }}
            animate={reduced ? undefined : { scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="glass-decision__fan-label">{projection.optimistic}</span>
          </motion.div>

          <motion.div
            className="glass-decision__fan-line glass-decision__fan-line--base"
            initial={reduced ? undefined : { scaleX: 0 }}
            animate={reduced ? undefined : { scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <span className="glass-decision__fan-label">{projection.base}</span>
          </motion.div>

          <motion.div
            className="glass-decision__fan-line glass-decision__fan-line--pessimistic"
            initial={reduced ? undefined : { scaleX: 0 }}
            animate={reduced ? undefined : { scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <span className="glass-decision__fan-label">{projection.pessimistic}</span>
          </motion.div>
        </div>

        {/* Fan area */}
        <motion.div
          className="glass-decision__fan-area"
          initial={reduced ? undefined : { opacity: 0 }}
          animate={reduced ? undefined : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        />
      </div>

      {/* Legend */}
      <div className="glass-decision__fan-legend">
        {[
          { label: "Optimista", color: "var(--color-emerald-400)" },
          { label: "Base", color: "var(--color-gold-400)" },
          { label: "Pesimista", color: "var(--color-rose-400)" },
        ].map((s) => (
          <span key={s.label} className="glass-decision__fan-legend-item">
            <span className="glass-decision__fan-legend-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Command Bar — Suggested Actions
   ────────────────────────────────────── */

function CommandBar({
  actions,
  onActionClick,
  reduced,
}: {
  actions: AiExecutiveReport["suggested_actions"];
  onActionClick?: (action: AiExecutiveReport["suggested_actions"][number]) => void;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="glass-decision__command"
      initial={reduced ? undefined : { opacity: 0, y: 6 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="glass-decision__command-header">
        <Zap className="w-3.5 h-3.5 text-[var(--color-gold-400)]" />
        <span className="glass-decision__command-title">Acciones</span>
      </div>
      <div className="glass-decision__command-actions">
        {actions.map((action, i) => {
          const pCfg = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;
          return (
            <motion.button
              key={i}
              className="glass-decision__command-chip"
              onClick={() => onActionClick?.(action)}
              whileHover={reduced ? undefined : { scale: 1.02, y: -1 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              initial={reduced ? undefined : { opacity: 0, y: 4 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <ArrowRight size={13} style={{ color: pCfg.color }} />
              <span>{action.label}</span>
              {action.priority === "high" && (
                <span className="glass-decision__command-priority">PRIORITARIO</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Data Validation
   ────────────────────────────────────── */

function isValidReport(data: unknown): data is AiExecutiveReport {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return !!(
    d.risk_score &&
    d.executive_summary &&
    d.trend &&
    Array.isArray(d.risk_alerts) &&
    Array.isArray(d.recommendations) &&
    Array.isArray(d.suggested_actions)
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export default function AIDecisionPanel({
  scope,
  period = "current_quarter",
  title,
  onActionClick,
}: AIDecisionPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const reduced = useReducedMotion();
  const config = SCOPE_CONFIG[scope];
  const ScopeIcon = config.icon;

  const mutation = useMCPMutation<AiExecutiveReport, { scope: string; period: string }>(
    "executive_dashboard",
    "generate_ai_analysis",
    {
      onSuccess: () => showToast({ type: "success", message: "Análisis generado exitosamente" }),
      onError: (err) =>
        showToast({
          type: "error",
          message: err instanceof Error ? err.message : "Análisis no disponible",
        }),
    },
  );

  const data = isValidReport(mutation.data) ? mutation.data : null;
  const isLoading = mutation.isPending;
  const hasError = mutation.isError;

  const handleGenerate = () => mutation.mutate({ scope, period });

  const trendCfg = data?.trend ? TREND_CONFIG[data.trend] || TREND_CONFIG.stable : null;
  const TrendIcon = trendCfg?.icon || Minus;

  /* Freshness */
  const [freshness, setFreshness] = useState("");
  useEffect(() => {
    if (!data) return;
    setFreshness("ahora");
    const interval = setInterval(() => setFreshness("reciente"), 60_000);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <div className={cn("glass-decision", `glass-decision--${scope}`)}>
      {/* Ambient glow */}
      <span className="glass-decision__glow" style={{ background: config.accent }} />

      {/* ═══ Header ═══ */}
      <div className="glass-decision__header">
        <div className="glass-decision__header-left">
          <div className="glass-decision__header-icon" style={{ color: config.accent }}>
            <ScopeIcon size={20} strokeWidth={1.5} />
            <span className="glass-decision__header-icon-glow" style={{ background: config.accent }} />
          </div>
          <div>
            <h3 className="glass-decision__header-title">{title || config.title}</h3>
            <p className="glass-decision__header-sub">{config.subtitle}</p>
          </div>
        </div>

        <div className="glass-decision__header-right">
          {data && (
            <div className="glass-decision__header-meta">
              <span className="glass-decision__header-freshness">
                <Clock className="w-3 h-3" />
                {freshness}
              </span>
              {data.confidence && (
                <span className="glass-decision__header-trust">
                  <Shield className="w-3 h-3" />
                  {Math.round(data.confidence * 100)}%
                </span>
              )}
            </div>
          )}

          <div className="glass-decision__header-actions">
            {data && (
              <Button
                variant="unstyled"
                onClick={() => setExpanded((v) => !v)}
                className="glass-decision__header-toggle"
                aria-expanded={expanded}
              >
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} />
                </motion.div>
              </Button>
            )}
            <Button
              variant="unstyled"
              onClick={handleGenerate}
              disabled={isLoading}
              className={cn("glass-decision__header-generate", data && "glass-decision__header-generate--secondary")}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isLoading ? "Analizando…" : data ? "Regenerar" : "Generar Análisis"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Loading: Generation Ceremony ═══ */}
      {isLoading && <GenerationCeremony reduced={reduced} />}

      {/* ═══ Error ═══ */}
      {hasError && !isLoading && (
        <motion.div
          className="glass-decision__error"
          initial={reduced ? undefined : { opacity: 0 }}
          animate={reduced ? undefined : { opacity: 1 }}
        >
          <AlertTriangle className="w-4 h-4 text-[var(--color-silver-400)]" />
          <p>No se pudo generar el análisis.</p>
          <Button variant="unstyled" onClick={handleGenerate} className="glass-decision__error-retry">
            Reintentar
          </Button>
        </motion.div>
      )}

      {/* ═══ Report ═══ */}
      {data && !isLoading && (
        <AnimatePresence mode="wait">
          {expanded && (
            <motion.div
              key="report-body"
              className="glass-decision__body"
              initial={reduced ? undefined : { opacity: 0, height: 0 }}
              animate={reduced ? undefined : { opacity: 1, height: "auto" }}
              exit={reduced ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* ── Tier 1: Summary + Metrics ── */}
              <div className="glass-decision__tier">
                {/* Executive Summary */}
                <motion.div
                  className="glass-decision__summary"
                  initial={reduced ? undefined : { opacity: 0, y: 8 }}
                  animate={reduced ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h4 className="glass-decision__section-title">Resumen Ejecutivo</h4>
                  <p className="glass-decision__summary-text">{data.executive_summary}</p>
                </motion.div>

                {/* Risk Gauge + Stat Pulsars */}
                <motion.div
                  className="glass-decision__metrics"
                  initial={reduced ? undefined : { opacity: 0, y: 8 }}
                  animate={reduced ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                >
                  <RiskGauge
                    value={data.risk_score.value}
                    max={data.risk_score.max}
                    reduced={reduced}
                  />

                  <div className="glass-decision__pulsars">
                    <StatPulsar
                      label="Tendencia"
                      value={trendCfg?.label || "—"}
                      icon={<TrendIcon size={16} strokeWidth={1.5} />}
                      color={trendCfg?.color || "var(--color-silver-400)"}
                      reduced={reduced}
                    />
                    <StatPulsar
                      label="Confianza"
                      value={`${Math.round(data.confidence * 100)}%`}
                      icon={<BarChart3 size={16} strokeWidth={1.5} />}
                      color={data.confidence >= 0.8 ? "var(--color-emerald-400)" : data.confidence >= 0.6 ? "var(--color-amber-400)" : "var(--color-rose-400)"}
                      reduced={reduced}
                    />
                    <StatPulsar
                      label="Horizonte"
                      value={`${data.horizon_days}d`}
                      icon={<Target size={16} strokeWidth={1.5} />}
                      color="var(--color-teal-400)"
                      subValue="días"
                      reduced={reduced}
                    />
                  </div>
                </motion.div>

                {/* Factor Constellation */}
                {data.risk_score.factors?.length > 0 && (
                  <motion.div
                    className="glass-decision__factors"
                    initial={reduced ? undefined : { opacity: 0 }}
                    animate={reduced ? undefined : { opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {data.risk_score.factors.map((factor, i) => (
                      <motion.span
                        key={i}
                        className="glass-decision__factor"
                        initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
                        animate={reduced ? undefined : { opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.04 }}
                      >
                        {factor}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* ── Tier 2: Cross-Domain + Alerts ── */}
              <div className="glass-decision__tier glass-decision__tier--2">
                {/* Cross-Domain Insights (executive only) */}
                {scope === "executive" && data.cross_domain_insights?.length > 0 && (
                  <motion.div
                    className="glass-decision__section"
                    initial={reduced ? undefined : { opacity: 0, y: 8 }}
                    animate={reduced ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <h4 className="glass-decision__section-title glass-decision__section-title--teal">
                      <Link2 size={14} strokeWidth={1.5} />
                      Señales Cruzadas
                    </h4>
                    <CrossDomainMap insights={data.cross_domain_insights} reduced={reduced} />
                  </motion.div>
                )}

                {/* Risk Alerts */}
                {data.risk_alerts?.length > 0 && (
                  <motion.div
                    className="glass-decision__section"
                    initial={reduced ? undefined : { opacity: 0, y: 8 }}
                    animate={reduced ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="glass-decision__section-title glass-decision__section-title--amber">
                      <AlertTriangle size={14} strokeWidth={1.5} />
                      Alertas de Riesgo
                      <span className="glass-decision__alert-count">{data.risk_alerts.length}</span>
                    </h4>
                    <UrgencyStack alerts={data.risk_alerts} reduced={reduced} />
                  </motion.div>
                )}
              </div>

              {/* ── Tier 3: Recommendations + Projection + Actions ── */}
              <div className="glass-decision__tier glass-decision__tier--3">
                {/* Recommendations */}
                {data.recommendations?.length > 0 && (
                  <motion.div
                    className="glass-decision__section"
                    initial={reduced ? undefined : { opacity: 0, y: 8 }}
                    animate={reduced ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <h4 className="glass-decision__section-title glass-decision__section-title--gold">
                      <Lightbulb size={14} strokeWidth={1.5} />
                      Recomendaciones
                    </h4>
                    <ImpactRanking recommendations={data.recommendations} reduced={reduced} />
                  </motion.div>
                )}

                {/* Projection */}
                {data.projection && (
                  <motion.div
                    className="glass-decision__section"
                    initial={reduced ? undefined : { opacity: 0, y: 8 }}
                    animate={reduced ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="glass-decision__section-title">Proyección</h4>
                    <ScenarioFan projection={data.projection} reduced={reduced} />
                  </motion.div>
                )}

                {/* Suggested Actions — Command Bar */}
                {data.suggested_actions?.length > 0 && (
                  <CommandBar
                    actions={data.suggested_actions}
                    onActionClick={onActionClick}
                    reduced={reduced}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}