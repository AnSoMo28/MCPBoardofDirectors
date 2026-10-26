// src/features/dashboard/components/GlobalAdvisorBanner.tsx
// ═══════════════════════════════════════════════════════════
// Global Advisor Banner — Castillo Country Club
//
// Premium enhancements:
// + Glass-card wrapper with gold edge glow
// + Animated SVG risk gauge (speedometer)
// + Glass insight cards with impact-colored hover glow
// + Collapsible layer sections
// + Staggered insight card entrance
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, TrendingUp, Lightbulb,
  Zap, ChevronDown, ChevronUp, ArrowRight,
  Shield, LoaderCircle, CheckCircle2, Sparkles,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import type {
  GlobalAdvisorInsight,
  GlobalAdvisorLayer,
  AdvisorReactionInsight,
} from "../types";
import type { AdvisorActionState } from "../types";
import { AdvisorReactionCard } from "@/shared/components/ui/AdvisorReactionCard";
import AIInsightNarrative from "@/shared/components/ai/AIInsightNarrative";
import { usePrefetchTopNarratives } from "@/shared/hooks/useAdvisorNarrative";
import AISimulationPanel from "@/shared/components/ai/AISimulationPanel";
import AIBoardBriefViewer from "@/shared/components/ai/AIBoardBriefViewer";
import type { AiFinancialReport } from "@/features/finance/types";
import type { CalendarDay } from "@/features/events/types";
import type { AdvisorBoardBriefResponse } from "@/shared/mocks/contracts";
import { IMPACT_CONFIG } from "@/shared/lib/ui/advisorConfig";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";
import { CausalChainViz } from "@/shared/components/ai/CausalChainViz";

/* ══════════════════════════════════════════════════════════
   Layer config
   ══════════════════════════════════════════════════════════ */

const LAYER_CONFIG: Record<
  GlobalAdvisorLayer,
  { label: string; icon: LucideIcon; color: string; order: number }
> = {
  diagnostic: { label: "Diagnóstico", icon: AlertTriangle, color: "var(--color-rose-400)", order: 0 },
  strategy: { label: "Estrategia", icon: TrendingUp, color: "var(--color-gold-400)", order: 1 },
  prediction: { label: "Predicción", icon: Activity, color: "var(--color-teal-400)", order: 2 },
  innovation: { label: "Innovación", icon: Lightbulb, color: "var(--color-teal-400)", order: 3 },
  execution: { label: "Ejecución", icon: Zap, color: "var(--color-emerald-400)", order: 4 },
};

/* ══════════════════════════════════════════════════════════
   Risk Gauge — Animated SVG speedometer
   ══════════════════════════════════════════════════════════ */

function RiskGauge({
  score,
  color,
  grade,
  reduced,
}: {
  score: number;
  color: string;
  grade: string;
  reduced: boolean;
}) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div
      className="relative w-12 h-12 flex-shrink-0"
      title={`Riesgo ${grade}: ${Math.round(score)}/100`}
    >
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        {/* Track */}
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="3.5"
        />
        {/* Animated fill */}
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={
            reduced
              ? { strokeDashoffset: circumference - filled }
              : { strokeDashoffset: circumference }
          }
          animate={{ strokeDashoffset: circumference - filled }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 1.2, ease: "easeOut", delay: 0.2 }
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-sm font-bold font-[family-name:var(--font-display)] leading-none"
          style={{ color }}
        >
          {grade}
        </span>
        <span className="text-[8px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] leading-none mt-0.5">
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Props
   ══════════════════════════════════════════════════════════ */

interface GlobalAdvisorBannerProps {
  insights: GlobalAdvisorInsight[];
  systemicRiskScore?: number;
  onExecute?: (insightId: string) => Promise<void>;
  actionStates?: Record<string, AdvisorActionState>;
  reactions?: AdvisorReactionInsight[];
  onGeneratePlan?: () => void;
  isPlanLoading?: boolean;
  financialContext?: AiFinancialReport | null;
  eventsContext?: CalendarDay[] | null;
  briefData?: AdvisorBoardBriefResponse["brief"] | null;
  onCloseBrief?: () => void;
  onAskAdvisor?: () => void;
  causalChains?: CausalChain[];
}

/* ══════════════════════════════════════════════════════════
   Generate proposed changes for simulation
   ══════════════════════════════════════════════════════════ */

function generateProposedChanges(
  insights: GlobalAdvisorInsight[],
  _financialContext?: AiFinancialReport | null,
): Array<Record<string, unknown>> {
  const changes: Array<Record<string, unknown>> = [];

  const insightText = insights
    .map((i) => `${i.title} ${i.reasoning}`)
    .join(" ")
    .toLowerCase();

  if (insightText.includes("concentra") || insightText.includes("revenue")) {
    changes.push({ change: "pricing_dynamic", description: "Implementar pricing dinámico para diversificar fuentes de revenue" });
  }
  if (insightText.includes("margin") || insightText.includes("costo") || insightText.includes("gasto")) {
    changes.push({ change: "catering_cap", description: "Negociar tope de incremento 12% en contratos de catering" });
  }
  if (insightText.includes("churn") || insightText.includes("retenc") || insightText.includes("abandono")) {
    changes.push({ change: "loyalty_program", description: "Implementar programa de lealtad con beneficios escalonados por antigüedad" });
  }
  if (insightText.includes("event") || insightText.includes("asistencia") || insightText.includes("particip")) {
    changes.push({ change: "event_diversification", description: "Diversificar calendario de eventos según segmentos demográficos" });
  }
  if (insightText.includes("wellness") || insightText.includes("bienestar") || insightText.includes("fitness")) {
    changes.push({ change: "wellness_premium", description: "Lanzar programa premium de bienestar con personal training y spa packages" });
  }

  if (changes.length < 2) {
    changes.push({ change: "pricing_dynamic", description: "Implementar pricing dinámico en eventos premium" });
    changes.push({ change: "catering_cap", description: "Negociar cap de incremento 12% en contratos de catering" });
  }

  return changes.slice(0, 4);
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function GlobalAdvisorBanner({
  insights,
  systemicRiskScore,
  onExecute,
  actionStates = {},
  reactions = [],
  onGeneratePlan,
  isPlanLoading = false,
  financialContext,
  eventsContext,
  briefData,
  onCloseBrief,
  onAskAdvisor,
  causalChains,
}: GlobalAdvisorBannerProps) {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [expanded, setExpanded] = useState(false);
  const [expandedNarrative, setExpandedNarrative] = useState<string | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [collapsedLayers, setCollapsedLayers] = useState<Set<GlobalAdvisorLayer>>(new Set());

  // Predictive Pre-fetch
  usePrefetchTopNarratives(insights, financialContext, eventsContext);

  if (insights.length === 0) return null;

  const toggleLayer = (layer: GlobalAdvisorLayer) => {
    setCollapsedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  // Computed values
  const actionableInsights = useMemo(() => insights.filter((i) => i.action), [insights]);
  const highCount = insights.filter((i) => i.impact === "high").length;
  const medCount = insights.filter((i) => i.impact === "medium").length;
  const lowCount = insights.filter((i) => i.impact === "low").length;

  const layers: GlobalAdvisorLayer[] = ["diagnostic", "strategy", "prediction", "innovation", "execution"];
  const grouped = layers
    .map((layer) => ({ layer, items: insights.filter((i) => i.layer === layer) }))
    .filter((g) => g.items.length > 0);

  // Risk scoring
  const riskScore = systemicRiskScore ?? 50;
  const riskColor =
    riskScore < 30 ? "var(--color-emerald-400)"
    : riskScore < 55 ? "var(--color-amber-400)"
    : "var(--color-rose-400)";

  const riskGrade =
    riskScore < 25 ? "A"
    : riskScore < 45 ? "B"
    : riskScore < 65 ? "C"
    : riskScore < 80 ? "D"
    : "F";

  // Motion variants
  const containerVariants = prefersReduced
    ? undefined
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } };

  const itemVariants = prefersReduced
    ? undefined
    : { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

  return (
    <motion.div
      variants={containerVariants}
      initial={false}
      animate="visible"
      className="glass-advisor-banner"
    >
      {/* ═══ Summary bar (always visible) ═══ */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={expanded}
        aria-label={expanded ? "Colapsar Global Advisor" : "Expandir Global Advisor"}
        className={cn(
          "advisor-summary-bar",
          "w-full flex items-center justify-between px-5 py-4 cursor-pointer",
          "rounded-none min-h-[56px]",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[color-mix(in srgb, var(--color-gold-400) 12%, transparent)]">
            <Shield className="w-5 h-5 text-[var(--color-gold-400)]" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              Global Advisor — Control Tower
            </h2>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                {insights.length} insights
              </span>
              {highCount > 0 && (
                <span className="text-[10px] text-[var(--color-rose-400)] font-[family-name:var(--font-mono)]">
                  {highCount} HIGH
                </span>
              )}
              {medCount > 0 && (
                <span className="text-[10px] text-[var(--color-amber-400)] font-[family-name:var(--font-mono)]">
                  {medCount} MED
                </span>
              )}
              {lowCount > 0 && (
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                  {lowCount} LOW
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Risk Gauge — animated SVG speedometer */}
          {systemicRiskScore !== undefined && (
            <RiskGauge
              score={riskScore}
              color={riskColor}
              grade={riskGrade}
              reduced={prefersReduced}
            />
          )}

          {onGeneratePlan && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onGeneratePlan(); }}
              disabled={isPlanLoading}
              icon={isPlanLoading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              className="min-h-[36px] text-[11px]"
            >
              {isPlanLoading ? "Generando..." : "Plan AI"}
            </Button>
          )}
          {onAskAdvisor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAskAdvisor(); }}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              className="min-h-[36px] text-[11px] text-[var(--color-gold-400)]"
            >
              Preguntar
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--color-silver-400)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)]" />
          )}
        </div>
      </div>

      {/* ═══ Expanded body ═══ */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5">
              {/* ── Reactions ── */}
              {reactions.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald-400)]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-ui)] text-[var(--color-emerald-400)]">
                      Reacciones del Advisor
                    </h3>
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      ({reactions.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {reactions.slice().reverse().map((reaction) => (
                      <AdvisorReactionCard key={reaction.id} reaction={reaction} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Causal Chains ── */}
              {causalChains && causalChains.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-[var(--color-amber-400)]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-ui)] text-[var(--color-amber-400)]">
                      Cadenas Causales
                    </h3>
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      ({causalChains.length})
                    </span>
                  </div>
                  <CausalChainViz chains={causalChains} />
                </motion.div>
              )}

              {/* ── Quick Actions ── */}
              {actionableInsights.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-[var(--color-emerald-400)]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-ui)] text-[var(--color-emerald-400)]">
                      Acciones Disponibles
                    </h3>
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      ({actionableInsights.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {actionableInsights.map((insight) => (
                      <Button
                        key={insight.id}
                        variant="primary"
                        size="sm"
                        onClick={() => onExecute?.(insight.id)}
                        disabled={actionStates[insight.id] === "loading"}
                        icon={
                          actionStates[insight.id] === "loading" ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                          : actionStates[insight.id] === "done" ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <Zap className="w-3.5 h-3.5" />
                        }
                        className="min-h-[44px] text-xs"
                      >
                        {actionStates[insight.id] === "done" ? "Listo" : insight.action!.label}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Board Brief ── */}
              {briefData && (
                <motion.div variants={itemVariants}>
                  <AIBoardBriefViewer briefData={briefData} onClose={onCloseBrief} />
                </motion.div>
              )}

              {/* ── Simulation Panel ── */}
              {showSimulation && financialContext && (
                <motion.div variants={itemVariants}>
                  <AISimulationPanel
                    baseData={{
                      health_score: financialContext.health_score,
                      member_economics: financialContext.member_economics,
                      revenue_concentration: financialContext.revenue_concentration,
                    }}
                    proposedChanges={generateProposedChanges(grouped.flatMap((g) => g.items), financialContext)}
                    timeframe="quarter"
                    onReSimulate={() => {}}
                  />
                </motion.div>
              )}

              {/* ═══ Layer Sections — Collapsible with staggered insight cards ═══ */}
              {grouped.map(({ layer, items }) => {
                const cfg = LAYER_CONFIG[layer];
                const Icon = cfg.icon;
                const isLayerOpen = !collapsedLayers.has(layer);

                return (
                  <motion.div key={layer} variants={itemVariants} className="advisor-layer-section">
                    {/* Layer header — clickable toggle */}
                    <button
                      type="button"
                      onClick={() => toggleLayer(layer)}
                      className="advisor-layer-header"
                      aria-expanded={isLayerOpen}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                      <h3
                        className="text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-ui)]"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </h3>
                      <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                        ({items.length})
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 text-[var(--color-silver-500)] transition-transform duration-200 ml-auto",
                          isLayerOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {/* Layer content — collapsible with staggered cards */}
                    <AnimatePresence initial={false}>
                      {isLayerOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: prefersReduced ? 0 : 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            {items.map((insight, idx) => {
                              const impactCfg = IMPACT_CONFIG[insight.impact];

                              return (
                                <motion.div
                                  key={insight.id}
                                  initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={
                                    prefersReduced
                                      ? { duration: 0 }
                                      : { duration: 0.3, delay: idx * 0.06 }
                                  }
                                >
                                  <div className="glass-insight-card">
                                    {/* Impact glow overlay */}
                                    <div
                                      className={cn(
                                        "glass-insight-card__glow",
                                        `glass-insight-card__glow--${insight.impact}`,
                                      )}
                                      aria-hidden="true"
                                    />

                                    {/* Content — above glow */}
                                    <div className="relative z-[1] flex items-start gap-3">
                                      {/* Impact badge */}
                                      <span
                                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold font-[family-name:var(--font-mono)] flex-shrink-0 mt-0.5"
                                        style={{ color: impactCfg.color, backgroundColor: impactCfg.bgColor }}
                                      >
                                        {impactCfg.label}
                                      </span>

                                      {/* Text content */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                                          {insight.title}
                                        </p>
                                        <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mt-0.5 leading-relaxed">
                                          {insight.reasoning}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                                            Confianza: {insight.confidence}%
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              setExpandedNarrative(
                                                expandedNarrative === insight.id ? null : insight.id,
                                              )
                                            }
                                            className="text-[10px] font-medium px-1 h-auto min-h-0 underline underline-offset-2 decoration-[var(--color-gold-400)]/30 text-[var(--color-gold-400)] hover:text-[var(--color-gold-400)]/80 active:scale-100"
                                          >
                                            {expandedNarrative === insight.id ? "Cerrar" : "Análisis"}
                                          </Button>
                                          {insight.layer === "strategy" && financialContext && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setShowSimulation(!showSimulation)}
                                              className="text-[10px] font-medium px-1 h-auto min-h-0 underline underline-offset-2 decoration-[var(--color-teal-400)]/30 text-[var(--color-teal-400)] hover:text-[var(--color-teal-400)]/80 active:scale-100"
                                            >
                                              Simular
                                            </Button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Action button */}
                                      {insight.action && onExecute ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onExecute(insight.id)}
                                          disabled={actionStates[insight.id] === "loading"}
                                          icon={
                                            actionStates[insight.id] === "loading" ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                            : actionStates[insight.id] === "done" ? <CheckCircle2 className="w-3.5 h-3.5" />
                                            : <Zap className="w-3.5 h-3.5" />
                                          }
                                          aria-label={insight.action.label}
                                          className="flex-shrink-0 mt-0.5"
                                        >
                                          {actionStates[insight.id] === "done" ? "Listo" : "Ejecutar"}
                                        </Button>
                                      ) : insight.target_view ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => navigate(insight.target_view!)}
                                          icon={<ArrowRight className="w-3.5 h-3.5" />}
                                          aria-label={`Ir a ${insight.target_view}`}
                                          className="flex-shrink-0 mt-0.5"
                                        >
                                          Ir
                                        </Button>
                                      ) : null}
                                    </div>

                                    {/* Narrative — full-width below */}
                                    {expandedNarrative === insight.id && (
                                      <div className="relative z-[1] mt-3">
                                        <AIInsightNarrative
                                          insightId={insight.id}
                                          insightData={insight as unknown as Record<string, unknown>}
                                          financialContext={financialContext}
                                          eventsContext={eventsContext}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}