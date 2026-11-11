// src/shared/components/ml/HypotheticalSimulator.tsx
// Fase 23 — Silver Tide Hypothetical Simulator
// Glass · Probability arcs · Risk gauge · Research prompt · Stagger
// ═══════════════════════════════════════════════════════════════════════════════
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus,
  ChevronRight, ShieldCheck, Search,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useHypotheticalSimulator } from "./hooks/useHypotheticalSimulator";
import { cn } from "@/shared/lib/utils";
import './HypotheticalSimulator.css';

/* ──────────────────────────────────────
   Scenario config
   ────────────────────────────────────── */

const SCENARIO_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof TrendingUp; arcColor: string }
> = {
  optimistic: {
    label: "Optimista",
    color: "var(--color-emerald-400)",
    icon: TrendingUp,
    arcColor: "var(--color-emerald-400)",
  },
  baseline: {
    label: "Base",
    color: "var(--color-teal-400)",
    icon: Minus,
    arcColor: "var(--color-teal-400)",
  },
  pessimistic: {
    label: "Pesimista",
    color: "var(--color-rose-400)",
    icon: TrendingDown,
    arcColor: "var(--color-rose-400)",
  },
};

function getScenarioCfg(type: string) {
  return SCENARIO_CONFIG[type] ?? SCENARIO_CONFIG.baseline;
}

/* ──────────────────────────────────────
   Domain color encoding
   ────────────────────────────────────── */

const DOMAIN_COLORS: Record<string, string> = {
  finanzas: "var(--color-gold-400)",
  financiero: "var(--color-gold-400)",
  eventos: "var(--color-teal-400)",
  socios: "var(--color-amber-400)",
  membresía: "var(--color-amber-400)",
  instalaciones: "var(--color-teal-400)",
  deportes: "var(--color-gold-400)",
  engagement: "var(--color-amber-400)",
};

function getDomainColor(domain: string): string {
  const lower = domain.toLowerCase();
  for (const [key, color] of Object.entries(DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "var(--color-silver-400)";
}

/* ──────────────────────────────────────
   Suggested questions
   ────────────────────────────────────── */

const SUGGESTIONS = [
  "¿Qué pasa si aumentamos las cuotas un 10%?",
  "¿Impacto de agregar 50 nuevos socios este trimestre?",
  "¿Qué pasa si cerramos la piscina por mantenimiento 30 días?",
  "¿Efecto de reducir el presupuesto de eventos un 20%?",
];

/* ──────────────────────────────────────
   Animation helpers
   ────────────────────────────────────── */

function staggerDelay(base: number, index: number, step = 0.05): number {
  return base + index * step;
}

/* ──────────────────────────────────────
   Sub-components
   ────────────────────────────────────── */

/* ── Risk Gauge ── */
function RiskGauge({
  text,
  reduced,
}: {
  text: string;
  reduced: boolean;
}) {
  /* Parse severity from keywords */
  const lower = text.toLowerCase();
  const severity =
    lower.includes("alto") || lower.includes("crítico") ? 8 :
    lower.includes("medio") || lower.includes("moderado") ? 5 :
    lower.includes("bajo") || lower.includes("menor") ? 2 : 5;

  const gaugeColor =
    severity >= 7 ? "var(--color-rose-400)" :
    severity >= 4 ? "var(--color-amber-400)" :
    "var(--color-emerald-400)";

  const needleAngle = -90 + (severity / 10) * 180;

  return (
    <div className="glass-sim__risk">
      <div className="glass-sim__risk-gauge">
        <svg viewBox="0 0 100 55" className="glass-sim__risk-svg">
          {/* Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Green zone */}
          <path d="M 10 50 A 40 40 0 0 1 35 14" fill="none" stroke="var(--color-emerald-400)" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
          {/* Amber zone */}
          <path d="M 35 14 A 40 40 0 0 1 65 14" fill="none" stroke="var(--color-amber-400)" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
          {/* Rose zone */}
          <path d="M 65 14 A 40 40 0 0 1 90 50" fill="none" stroke="var(--color-rose-400)" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
          {/* Needle */}
          <motion.line
            x1="50" y1="50"
            x2="50" y2="16"
            stroke={gaugeColor}
            strokeWidth="2"
            strokeLinecap="round"
            initial={reduced ? undefined : { rotate: -90 }}
            animate={{ rotate: needleAngle }}
            transition={reduced ? undefined : { type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
            style={{ transformOrigin: "50px 50px" }}
          />
          <circle cx="50" cy="50" r="3" fill={gaugeColor} />
        </svg>
      </div>
      <p className="glass-sim__risk-text">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: gaugeColor }} />
        {text}
      </p>
    </div>
  );
}

/* ── Probability Arc (mini gauge) ── */
function ProbabilityArc({
  probability,
  color,
  reduced,
}: {
  probability: number;
  color: string;
  reduced: boolean;
}) {
  const r = 18;
  const circ = Math.PI * r; /* semicircle */
  const fill = probability * circ;

  return (
    <svg viewBox="0 0 44 26" className="glass-sim__arc">
      <path
        d="M 4 24 A 18 18 0 0 1 40 24"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <motion.path
        d="M 4 24 A 18 18 0 0 1 40 24"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={reduced ? undefined : { strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - fill }}
        transition={reduced ? undefined : { duration: 0.6, delay: 0.3, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

/* ── Scenario Card ── */
function ScenarioCard({
  scenario,
  isRecommended,
  isExpanded,
  onToggle,
  reduced,
  delay,
  index,
}: {
  scenario: NonNullable<import("@/shared/mocks/contracts").SimulationResponse["scenarios"]>[number];
  isRecommended: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  reduced: boolean;
  delay: number;
  index: number;
}) {
  const cfg = getScenarioCfg(scenario.scenario_type);
  const ScIcon = cfg.icon;
  const pct = Math.round(scenario.probability * 100);

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 10 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.25, delay: staggerDelay(delay, index) }}
    >
      <Button
        variant="unstyled"
        onClick={onToggle}
        className={cn(
          "glass-sim__scenario",
          isRecommended && "glass-sim__scenario--recommended",
        )}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <ScIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
          <span className="glass-sim__scenario-name">{scenario.label}</span>
          {isRecommended && (
            <span className="glass-sim__scenario-badge">Recomendado</span>
          )}
          <ChevronRight
            className={cn(
              "w-3 h-3 text-[var(--color-silver-500)] transition-transform ml-auto",
              isExpanded && "rotate-90",
            )}
          />
        </div>

        {/* Description */}
        <p className="glass-sim__scenario-desc">
          {scenario.description}
        </p>

        {/* Probability — arc + label */}
        <div className="flex items-center gap-3 mt-2">
          <ProbabilityArc probability={scenario.probability} color={cfg.arcColor} reduced={reduced} />
          <div className="flex-1">
            <div className="glass-sim__prob-bar-track">
              <motion.div
                className="glass-sim__prob-bar-fill"
                style={{ background: cfg.color }}
                initial={reduced ? undefined : { width: 0 }}
                animate={reduced ? undefined : { width: `${pct}%` }}
                transition={reduced ? undefined : { duration: 0.5, delay: 0.3 }}
              />
            </div>
            <span className="glass-sim__prob-pct" style={{ color: cfg.color }}>{pct}%</span>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={reduced ? undefined : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduced ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className="glass-sim__scenario-details"
            >
              {/* Assumptions */}
              {scenario.key_assumptions?.length > 0 && (
                <div>
                  <p className="glass-sim__detail-label">Supuestos clave</p>
                  <ul className="glass-sim__detail-list">
                    {scenario.key_assumptions.map((a, i) => (
                      <motion.li
                        key={i}
                        initial={reduced ? undefined : { opacity: 0, x: -6 }}
                        animate={reduced ? undefined : { opacity: 1, x: 0 }}
                        transition={reduced ? undefined : { delay: i * 0.03 }}
                        className="glass-sim__detail-item"
                      >
                        <span className="text-[var(--color-silver-500)]">-</span>
                        {a}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {scenario.risks?.length > 0 && (
                <div>
                  <p className="glass-sim__detail-label glass-sim__detail-label--risk">Riesgos</p>
                  <ul className="glass-sim__detail-list">
                    {scenario.risks.map((r, i) => (
                      <motion.li
                        key={i}
                        initial={reduced ? undefined : { opacity: 0, x: -6 }}
                        animate={reduced ? undefined : { opacity: 1, x: 0 }}
                        transition={reduced ? undefined : { delay: 0.05 + i * 0.03 }}
                        className="glass-sim__detail-item"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-[var(--color-amber-400)] flex-shrink-0 mt-0.5" />
                        {r}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export function HypotheticalSimulator() {
  const reduced = useReducedMotion();
  const {
    question, setQuestion, shouldFetch, setShouldFetch,
    expandedScenario, recentQuestions, simQuery,
    handleSimulate, handleSuggestion, handleToggleExpand, handleRetry,
  } = useHypotheticalSimulator();

  const data = simQuery.data;
  const scenarios = data?.scenarios ?? [];
  const recommended = data?.recommended_scenario;

  /* ── Loading ── */
  if (simQuery.isLoading && shouldFetch) {
    return (
      <div className="glass-sim">
        <div className="glass-sim__header">
          <Zap className="w-5 h-5 text-[var(--color-gold-400)]" />
          <h3 className="glass-sim__title">Simulador Hipotético</h3>
        </div>
        <div className="glass-sim__loading">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-teal-400)]" />
          <span>Simulando escenarios...</span>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (simQuery.isError) {
    return (
      <div className="glass-sim">
        <div className="glass-sim__header">
          <Zap className="w-5 h-5 text-[var(--color-gold-400)]" />
          <h3 className="glass-sim__title">Simulador Hipotético</h3>
        </div>
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="Error en simulación"
          description="No se pudo completar el análisis hipotético."
          action={<Button onClick={handleRetry}>Reintentar</Button>}
        />
      </div>
    );
  }

  return (
    <div className="glass-sim">
      {/* Ambient glow */}
      <span className="glass-sim__glow" aria-hidden="true" />

      {/* Header */}
      <div className="glass-sim__header">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--color-gold-400)]" />
          <h3 className="glass-sim__title">Simulador Hipotético</h3>
        </div>
        {data?.confidence != null && (
          <span
            className={cn(
              "glass-sim__confidence",
              data.confidence >= 80 && "glass-sim__confidence--high",
              data.confidence >= 60 && data.confidence < 80 && "glass-sim__confidence--medium",
              data.confidence < 60 && "glass-sim__confidence--low",
            )}
          >
            {data.confidence}% confianza
          </span>
        )}
      </div>

      {/* Input — Research Prompt */}
      <div className="glass-sim__input-wrap">
        <Search className="glass-sim__input-icon" />
        <input
          type="text"
          value={question}
          onChange={(e) => { setQuestion(e.target.value); setShouldFetch(false); }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSimulate(); }}
          placeholder="Escribí un escenario hipotético..."
          className="glass-sim__input"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSimulate}
          disabled={!question.trim() || simQuery.isLoading}
          className="glass-sim__submit"
        >
          {simQuery.isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span className="ml-1.5">Simular</span>
        </Button>
      </div>

      {/* Recent questions + Suggestions */}
      {!data && !shouldFetch && (
        <div className="glass-sim__suggestions">
          {recentQuestions.length > 0 && (
            <div className="glass-sim__recent">
              <span className="glass-sim__recent-label">Recientes:</span>
              {recentQuestions.map((q) => (
                <Button
                  variant="unstyled"
                  key={q}
                  onClick={() => handleSuggestion(q)}
                  className="glass-sim__chip glass-sim__chip--recent"
                >
                  {q.length > 40 ? q.slice(0, 40) + "…" : q}
                </Button>
              ))}
            </div>
          )}
          <div className="glass-sim__prompts">
            {SUGGESTIONS.map((q) => (
              <Button
                variant="unstyled"
                key={q}
                onClick={() => handleSuggestion(q)}
                className="glass-sim__chip"
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Results ═══ */}
      {data && (
        <AnimatePresence mode="wait">
          <motion.div
            key={data.question}
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-sim__results"
          >
            {/* Question echo */}
            <motion.p
              className="glass-sim__question-echo"
              initial={reduced ? undefined : { opacity: 0, y: 4 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              &ldquo;{data.question}&rdquo;
            </motion.p>

            {/* Risk assessment */}
            {data.risk_assessment && (
              <motion.div
                initial={reduced ? undefined : { opacity: 0, y: 6 }}
                animate={reduced ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
              >
                <RiskGauge text={data.risk_assessment} reduced={reduced} />
              </motion.div>
            )}

            {/* Scenarios grid */}
            <div className="glass-sim__grid">
              {scenarios.map((sc, i) => (
                <ScenarioCard
                  key={sc.scenario_type}
                  scenario={sc}
                  isRecommended={sc.scenario_type === recommended}
                  isExpanded={expandedScenario === sc.scenario_type}
                  onToggle={() => handleToggleExpand(sc.scenario_type)}
                  reduced={reduced}
                  delay={0.2}
                  index={i}
                />
              ))}
            </div>

            {/* Cross-domain impacts */}
            {data.cross_domain_impacts?.length > 0 && (
              <motion.div
                className="glass-sim__cross-domain"
                initial={reduced ? undefined : { opacity: 0, y: 6 }}
                animate={reduced ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.4 }}
              >
                <p className="glass-sim__detail-label">Impactos Cross-Domain</p>
                <div className="glass-sim__cross-grid">
                  {data.cross_domain_impacts.map((impact, i) => {
                    const domainColor = getDomainColor(impact.domain);
                    return (
                      <motion.div
                        key={i}
                        className="glass-sim__cross-item"
                        initial={reduced ? undefined : { opacity: 0, x: -6 }}
                        animate={reduced ? undefined : { opacity: 1, x: 0 }}
                        transition={reduced ? undefined : { delay: 0.45 + i * 0.05 }}
                      >
                        <span className="glass-sim__cross-dot" style={{ background: domainColor }} />
                        <span className="glass-sim__cross-domain-name" style={{ color: domainColor }}>
                          {impact.domain}
                        </span>
                        <span className="glass-sim__cross-impact">{impact.impact}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}