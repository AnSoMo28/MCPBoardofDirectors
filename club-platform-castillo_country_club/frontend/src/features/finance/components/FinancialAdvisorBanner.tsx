// src/features/finance/components/FinancialAdvisorBanner.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Financial Advisor Banner
// Fase 18 — Client-Side Intelligence UI
//
// Command Center inline en el shell de FinancialDashboard.
// Renderiza insights agrupados por capa (macro/micro/fusion).
// Click "Ir" → navega al tab relevante.
//
// 0 API calls. Recibe AdvisorInsight[] como prop.
// Rules: #1 tokens, #2 no blur, #11 focus-visible,
//   #12 min-h, #17 Button, #18 reducedMotion, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, AlertTriangle, TrendingDown, Lightbulb,
  ChevronDown, ChevronUp, ArrowRight, Zap, LoaderCircle, CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import type {
  FinancialAdvisorInsight,
  AdvisorInsightLayer,
} from "../types";
import type { AdvisorActionState, AdvisorReactionInsight } from "@/features/dashboard/types";
import { AdvisorReactionCard } from "@/shared/components/ui/AdvisorReactionCard";
import AIInsightNarrative from "@/shared/components/ai/AIInsightNarrative";
import type { AiFinancialReport } from "../types";
import { usePrefetchTopNarratives } from "@/shared/hooks/useAdvisorNarrative";
import { toAdvisorReaction } from "@/shared/lib/reactionTemplate";
// ── Layer config ──

const LAYER_CONFIG: Record<
  AdvisorInsightLayer,
  { label: string; icon: LucideIcon; color: string; bgColor: string; borderColor: string }
> = {
  macro: {
    label: "Alertas Críticas",
    icon: AlertTriangle,
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 6%, transparent)",
    borderColor: "var(--color-rose-400)",
  },
  micro: {
    label: "Operaciones",
    icon: TrendingDown,
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 6%, transparent)",
    borderColor: "var(--color-amber-400)",
  },
  fusion: {
    label: "Insights Cruzados",
    icon: Lightbulb,
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 6%, transparent)",
    borderColor: "var(--color-gold-400)",
  },
};

const IMPACT_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  high: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  medium: {
    label: "Medio",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)",
  },
};

// ── Props ──

interface FinancialAdvisorBannerProps {
  insights: FinancialAdvisorInsight[];
  onNavigateToTab: (tab: string) => void;
  onExecute?: (insightId: string) => Promise<void>;
  actionStates?: Record<string, AdvisorActionState>;
  reactions?: AdvisorReactionInsight[];
  financialContext?: AiFinancialReport | null;
}

// ── Component ──

export default function FinancialAdvisorBanner({
  insights,
  onNavigateToTab,
  onExecute,
  actionStates = {},
  reactions = [],
  financialContext,
}: FinancialAdvisorBannerProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedNarrative, setExpandedNarrative] = useState<string | null>(null);
  // Predictive Pre-fetch (Propuesta C — F22c)
  usePrefetchTopNarratives(insights, financialContext);
  const prefersReduced = useReducedMotion();

  if (insights.length === 0) return null;

  // Group by layer
  const layers: AdvisorInsightLayer[] = ["macro", "micro", "fusion"];
  const grouped = layers
    .map((layer) => ({
      layer,
      items: insights.filter((i) => i.layer === layer),
    }))
    .filter((g) => g.items.length > 0);

  const highCount = insights.filter((i) => i.impact === "high").length;

  // Motion
  const containerVariants = prefersReduced
    ? undefined
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.05 },
        },
      };

  const itemVariants = prefersReduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: "easeOut" as const },
        },
      } as const;

  return (
    <motion.div
      variants={containerVariants}
      initial={false}
      animate="visible"
      className="rounded-xl border border-[var(--color-gold-400)]/20 bg-[var(--color-surface-1)] overflow-hidden mb-6"
    >
      {/* ── Header ── */}
      <Button
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full justify-between px-5 py-4 rounded-none rounded-t-xl min-h-[56px] active:scale-100"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[color-mix(in srgb, var(--color-gold-400) 12%, transparent)]">
            <Brain className="w-5 h-5 text-[var(--color-gold-400)]" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              Financial Advisor
            </h2>
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
              {insights.length} insight{insights.length !== 1 ? "s" : ""}
              {highCount > 0 && (
                <span className="text-[var(--color-rose-400)]">
                  {" "}· {highCount} crítico{highCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-silver-400)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)]" />
        )}
      </Button>

      {/* ── Body ── */}
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
              {/* ── Reactions — Advisor Reaction System (F22b) ── */}
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
                      <AdvisorReactionCard key={reaction.id} reaction={toAdvisorReaction(reaction)} />
                    ))}
                  </div>
                </motion.div>
              )}

              {grouped.map(({ layer, items }) => {
                const cfg = LAYER_CONFIG[layer];
                const Icon = cfg.icon;

                return (
                  <motion.div key={layer} variants={itemVariants}>
                    {/* Layer header */}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      <h3
                        className="text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-ui)]"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </h3>
                      <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                        ({items.length})
                      </span>
                    </div>

                    {/* Insight cards */}
                    <div className="space-y-2">
                      {items.map((insight) => {
                        const impactCfg = IMPACT_CONFIG[insight.impact];

                        return (
                          <div
                            key={insight.id}
                            className={cn(
                              "p-3 rounded-lg",
                              "bg-[var(--color-surface-0)] border border-white/[0.06]",
                              "transition-colors hover:bg-[var(--color-surface-2)]",
                            )}
                          >
                            {/* Row: badge + content + action button */}
                            <div className="flex items-start gap-3">
                              {/* Impact badge */}
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold font-[family-name:var(--font-mono)] flex-shrink-0 mt-0.5"
                                style={{
                                  color: impactCfg.color,
                                  backgroundColor: impactCfg.bgColor,
                                }}
                              >
                                {impactCfg.label}
                              </span>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                                  {insight.title}
                                </p>
                                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mt-0.5 leading-relaxed">
                                  {insight.reasoning}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
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
                                    {expandedNarrative === insight.id
                                      ? "Cerrar análisis"
                                      : "Análisis Profundo"}
                                  </Button>
                                </div>
                              </div>

                              {/* Action button — inside flex row, right side */}
                              {insight.action && onExecute ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => onExecute(insight.id)}
                                  disabled={actionStates[insight.id] === "loading"}
                                  icon={
                                    actionStates[insight.id] === "loading" ? (
                                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                    ) : actionStates[insight.id] === "done" ? (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    ) : (
                                      <Zap className="w-3.5 h-3.5" />
                                    )
                                  }
                                  aria-label={insight.action.label}
                                  className="flex-shrink-0 mt-0.5 min-h-[44px]"
                                >
                                  {actionStates[insight.id] === "loading"
                                    ? "..."
                                    : actionStates[insight.id] === "done"
                                      ? "Listo"
                                      : "Ejecutar"}
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    onNavigateToTab(insight.target_view ?? "")
                                  }
                                  icon={
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  }
                                  aria-label={`Ir a ${insight.target_view}`}
                                  className="flex-shrink-0 mt-0.5"
                                >
                                  Ir
                                </Button>
                              )}
                            </div>

                            {/* AI Narrative — full-width below the flex row */}
                            {expandedNarrative === insight.id && (
                              <AIInsightNarrative
                                insightId={insight.id}
                                insightData={insight as unknown as Record<string, unknown>}
                                financialContext={financialContext}
                              />
                            )}
                          </div>
                        );
                      })}
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
}
