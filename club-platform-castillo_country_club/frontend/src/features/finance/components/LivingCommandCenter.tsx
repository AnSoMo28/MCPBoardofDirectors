// ═══════════════════════════════════════════════════════════
// Living Command Center — Financial Intelligence Hub
//
// Replaces FinancialAdvisorBanner with a narrative-driven,
// depth-of-field aware intelligence layer.
//
// Architecture:
//   - Hero insight (depth-3): most critical, full detail
//   - Secondary insights (depth-2): important, compact
//   - Supplementary (depth-1): background context
//   - Narrative thread: visual connection between insights
//   - Inline evidence: data previews inside each insight
//   - Reaction log: executed action feedback
//
// 0 API calls. Receives data as props.
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, AlertTriangle, TrendingDown,
  Lightbulb, ChevronDown, ChevronUp, ArrowRight,
  Zap, LoaderCircle, CheckCircle2, Shield, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import type {
  FinancialAdvisorInsight,
  AiFinancialReport,
} from "../types";
import type {
  AdvisorActionState,
  AdvisorReactionInsight,
} from "@/features/dashboard/types";
import { AdvisorReactionCard } from "@/shared/components/ui/AdvisorReactionCard";
import type { AmbientMode } from "../hooks/useAmbientState";
import './LivingCommandCenter.css';
/* ── Types ── */

interface LivingCommandCenterProps {
  insights: FinancialAdvisorInsight[];
  financialContext: AiFinancialReport | null;
  ambientMode: AmbientMode;
  onNavigateToTab: (tab: string) => void;
  onExecute?: (insightId: string) => Promise<void>;
  actionStates?: Record<string, AdvisorActionState>;
  reactions?: AdvisorReactionInsight[];
}

/* ── Layer config ── */

const LAYER_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  macro: {
    label: "Crítico",
    icon: AlertTriangle,
    color: "var(--color-rose-400)",
  },
  micro: {
    label: "Operaciones",
    icon: TrendingDown,
    color: "var(--color-amber-400)",
  },
  fusion: {
    label: "Insight Cruzado",
    icon: Lightbulb,
    color: "var(--color-gold-400)",
  },
};

const IMPACT_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; order: number }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
    order: 0,
  },
  high: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    order: 1,
  },
  medium: {
    label: "Medio",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    order: 2,
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    order: 3,
  },
};

/* ── Inline Evidence Builder ── */

function buildEvidence(
  insight: FinancialAdvisorInsight,
  ctx: AiFinancialReport | null,
): { label: string; value: string; pct?: number; color?: string } | null {
  if (!ctx) return null;

  const { layer } = insight;

  // Macro insights → anomaly data
  if (layer === "macro" && ctx.financial_anomalies.length > 0) {
    const anomaly = ctx.financial_anomalies.find(
      (a) => insight.title.toLowerCase().includes(a.title.toLowerCase().slice(0, 15)),
    ) ?? ctx.financial_anomalies[0];
    if (anomaly) {
      return {
        label: anomaly.domain,
        value: `Desviación: ${anomaly.deviation_pct > 0 ? "+" : ""}${anomaly.deviation_pct.toFixed(1)}%`,
        pct: Math.min(100, Math.abs(anomaly.deviation_pct)),
        color: anomaly.severity === "critical" ? "var(--color-rose-400)" : "var(--color-amber-400)",
      };
    }
  }

  // Micro insights → concentration or cash flow
  if (layer === "micro" && ctx.revenue_concentration) {
    const conc = ctx.revenue_concentration;
    return {
      label: "Diversificación",
      value: `HHI: ${conc.herfindahl_index.toFixed(0)} · Top source: ${conc.sources[0]?.share_pct.toFixed(0)}%`,
      pct: conc.diversification_index * 100,
      color: conc.diversification_index > 0.6 ? "var(--color-emerald-400)" : "var(--color-amber-400)",
    };
  }

  // Fusion insights → health factors
  if (layer === "fusion" && ctx.health_score.factors.length > 0) {
    const factor = ctx.health_score.factors[0];
    return {
      label: factor.name,
      value: `Score: ${factor.score.toFixed(0)} · ${factor.trend === "improving" ? "↑" : factor.trend === "declining" ? "↓" : "→"} ${factor.trend}`,
      pct: factor.score,
      color: factor.score > 70 ? "var(--color-emerald-400)" : factor.score > 50 ? "var(--color-amber-400)" : "var(--color-rose-400)",
    };
  }

  return null;
}

/* ── Insight Card Component ── */

function InsightCard({
  insight,
  depth,
  evidence,
  isExpanded,
  onToggleExpand,
  onExecute,
  onNavigate,
  actionState,
  reduced,
}: {
  insight: FinancialAdvisorInsight;
  depth: 1 | 2 | 3;
  evidence: ReturnType<typeof buildEvidence>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onExecute?: () => void;
  onNavigate: () => void;
  actionState?: AdvisorActionState;
  reduced: boolean;
}) {
  const layerCfg = LAYER_CONFIG[insight.layer];
  const impactCfg = IMPACT_CONFIG[insight.impact] ?? IMPACT_CONFIG.low;
  const Icon = layerCfg?.icon ?? Lightbulb;

  const depthClass = depth === 3 ? "depth-3" : depth === 2 ? "depth-2" : "";
  const borderClass =
    depth === 3
      ? "glass-insight-card--hero"
      : depth === 2
        ? "glass-insight-card--secondary"
        : "glass-insight-card--supplementary";

  return (
    <motion.div
      layout={!reduced}
      className={cn(
        "glass-insight-card p-4",
        depthClass,
        borderClass,
      )}
      style={
        {
          "--depth-color": impactCfg.color,
        } as React.CSSProperties
      }
    >
      <div className="relative z-[1]">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Layer icon */}
          <div
            className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
            style={{
              backgroundColor: `color-mix(in srgb, ${layerCfg?.color ?? "var(--color-silver-400)"} 10%, transparent)`,
            }}
          >
            <Icon
              size={depth === 3 ? 18 : 14}
              strokeWidth={1.5}
              style={{ color: layerCfg?.color }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded"
                style={{
                  color: impactCfg.color,
                  backgroundColor: impactCfg.bgColor,
                }}
              >
                {impactCfg.label}
              </span>
              <span
                className="text-[10px] font-medium font-[family-name:var(--font-mono)]"
                style={{ color: layerCfg?.color }}
              >
                {layerCfg?.label}
              </span>
            </div>

            <p
              className={cn(
                "font-medium font-[family-name:var(--font-ui)]",
                depth === 3 ? "text-base text-[var(--color-silver-100)]" : "text-sm text-[var(--color-silver-200)]",
              )}
            >
              {insight.title}
            </p>

            {(depth >= 2 || isExpanded) && (
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mt-1 leading-relaxed">
                {insight.reasoning}
              </p>
            )}

            {/* Confidence + expand toggle */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                Confianza: {insight.confidence}%
              </span>
              {depth < 3 && (
                <Button
                  variant="ghost"
                  onClick={onToggleExpand}
                  className="text-[10px] text-[var(--color-gold-400)] hover:text-[var(--color-gold-400)]/80 underline underline-offset-2 transition-colors p-0 h-auto min-h-0 active:scale-100"
                >
                  {isExpanded ? "Menos" : "Más detalle"}
                </Button>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="flex-shrink-0 mt-0.5">
            {insight.action && onExecute ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onExecute}
                disabled={actionState === "loading"}
                icon={
                  actionState === "loading" ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : actionState === "done" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )
                }
                className="min-h-[44px]"
              >
                {actionState === "loading"
                  ? "..."
                  : actionState === "done"
                    ? "Listo"
                    : "Ejecutar"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigate}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                className="min-h-[44px]"
              >
                Ir
              </Button>
            )}
          </div>
        </div>

        {/* Inline Evidence — predictive tab surfacing */}
        {evidence && depth >= 2 && (
          <div className="inline-evidence mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
                {evidence.label}
              </span>
              <span className="text-[10px] font-bold text-[var(--color-silver-300)] font-[family-name:var(--font-mono)]">
                {evidence.value}
              </span>
            </div>
            {evidence.pct !== undefined && (
              <div className="inline-evidence__bar">
                <div
                  className="inline-evidence__bar-fill"
                  style={{
                    width: `${Math.min(100, evidence.pct)}%`,
                    backgroundColor: evidence.color ?? "var(--color-gold-400)",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Expanded content for depth-1 insights */}
        {depth < 2 && isExpanded && (
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className="overflow-hidden"
            >
              {evidence && (
                <div className="inline-evidence mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
                      {evidence.label}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-silver-300)] font-[family-name:var(--font-mono)]">
                      {evidence.value}
                    </span>
                  </div>
                  {evidence.pct !== undefined && (
                    <div className="inline-evidence__bar">
                      <div
                        className="inline-evidence__bar-fill"
                        style={{
                          width: `${Math.min(100, evidence.pct)}%`,
                          backgroundColor: evidence.color ?? "var(--color-gold-400)",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main Component ── */

export default function LivingCommandCenter({ insights, financialContext, onNavigateToTab, onExecute, actionStates = {}, reactions = [] }: LivingCommandCenterProps) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sort by impact priority
  const sorted = useMemo(() => {
    return [...insights].sort((a, b) => {
      const orderA = IMPACT_CONFIG[a.impact]?.order ?? 3;
      const orderB = IMPACT_CONFIG[b.impact]?.order ?? 3;
      return orderA - orderB;
    });
  }, [insights]);

  // Split into depth tiers
  const hero = sorted[0] ?? null;
  const secondary = sorted.slice(1, 3);
  const supplementary = sorted.slice(3);

  // Build evidence for each insight
  const evidenceMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildEvidence>>();
    for (const insight of sorted) {
      map.set(insight.id, buildEvidence(insight, financialContext));
    }
    return map;
  }, [sorted, financialContext]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (insights.length === 0) {
    return (
      <div className="glass-living-command px-5 py-4 mb-6">
        <div className="flex items-center gap-3 relative z-[1]">
          <div className="p-2 rounded-lg bg-[color-mix(in srgb, var(--color-emerald-400) 10%, transparent)]">
            <Shield size={18} className="text-[var(--color-emerald-400)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              Todo en orden
            </p>
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              Sin alertas financieras activas
            </p>
          </div>
        </div>
      </div>
    );
  }

  const containerVariants = reduced
    ? undefined
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.1 },
        },
      };

  const itemVariants = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
        },
      };

  return (
    <motion.div
      variants={containerVariants}
      initial={false}
      animate="visible"
      className="glass-living-command mb-6"
    >
      {/* ── Header ── */}
      <Button
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full justify-between px-5 py-4 rounded-none active:scale-100 relative z-[1]"
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-gold-400) 12%, transparent)`,
            }}
          >
            <Brain size={18} className="text-[var(--color-gold-400)]" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              Centro de Comando
            </h2>
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
              {insights.length} insight{insights.length !== 1 ? "s" : ""}
              {sorted.filter((i) => i.impact === "high").length > 0 && (
                <span className="text-[var(--color-rose-400)]">
                  {" "}· {sorted.filter((i) => i.impact === "high").length} urgente
                  {sorted.filter((i) => i.impact === "high").length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--color-silver-400)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--color-silver-400)]" />
        )}
      </Button>

      {/* ── Body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 relative z-[1]">
              {/* ── Reactions Log ── */}
              {reactions.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-[var(--color-emerald-400)]" />
                    <h3 className="text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                      Ejecutado
                    </h3>
                    <span className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
                      ({reactions.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {reactions
                      .slice()
                      .reverse()
                      .slice(0, 3)
                      .map((r) => (
                        <AdvisorReactionCard key={r.id} reaction={r} />
                      ))}
                  </div>
                </motion.div>
              )}

              {/* ── Narrative Thread ── */}
              <div className="narrative-thread">
                <div className="narrative-thread__line" />

                {/* Hero insight */}
                {hero && (
                  <motion.div
                    key={hero.id}
                    variants={itemVariants}
                    className="narrative-thread__step mb-4"
                    style={
                      {
                        "--step-color":
                          IMPACT_CONFIG[hero.impact]?.color ?? "var(--color-silver-400)",
                      } as React.CSSProperties
                    }
                  >
                    <InsightCard
                      insight={hero}
                      depth={3}
                      evidence={evidenceMap.get(hero.id) ?? null}
                      isExpanded={expandedIds.has(hero.id)}
                      onToggleExpand={() => toggleExpand(hero.id)}
                      onExecute={
                        onExecute ? () => onExecute(hero.id) : undefined
                      }
                      onNavigate={() =>
                        onNavigateToTab(hero.target_view ?? "")
                      }
                      actionState={actionStates[hero.id]}
                      reduced={reduced}
                    />
                  </motion.div>
                )}

                {/* Secondary insights */}
                {secondary.map((insight) => (
                  <motion.div
                    key={insight.id}
                    variants={itemVariants}
                    className="narrative-thread__step mb-3"
                    style={
                      {
                        "--step-color":
                          IMPACT_CONFIG[insight.impact]?.color ?? "var(--color-silver-400)",
                      } as React.CSSProperties
                    }
                  >
                    <InsightCard
                      insight={insight}
                      depth={2}
                      evidence={evidenceMap.get(insight.id) ?? null}
                      isExpanded={expandedIds.has(insight.id)}
                      onToggleExpand={() => toggleExpand(insight.id)}
                      onExecute={
                        onExecute ? () => onExecute(insight.id) : undefined
                      }
                      onNavigate={() =>
                        onNavigateToTab(insight.target_view ?? "")
                      }
                      actionState={actionStates[insight.id]}
                      reduced={reduced}
                    />
                  </motion.div>
                ))}
              </div>

              {/* ── Supplementary Insights ── */}
              {supplementary.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const allExpanded = supplementary.every((i) =>
                        expandedIds.has(i.id),
                      );
                      setExpandedIds((prev) => {
                        const next = new Set(prev);
                        supplementary.forEach((i) =>
                          allExpanded ? next.delete(i.id) : next.add(i.id),
                        );
                        return next;
                      });
                    }}
                    className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)] text-[var(--color-silver-500)] hover:text-[var(--color-silver-300)] transition-colors active:scale-100"
                  >
                    <Sparkles size={12} />
                    {supplementary.length} insight{supplementary.length !== 1 ? "s" : ""} adicional{supplementary.length !== 1 ? "es" : ""}
                    <ChevronDown size={10} />
                  </Button>

                  <div className="space-y-2">
                    {supplementary.map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        depth={1}
                        evidence={evidenceMap.get(insight.id) ?? null}
                        isExpanded={expandedIds.has(insight.id)}
                        onToggleExpand={() => toggleExpand(insight.id)}
                        onExecute={
                          onExecute ? () => onExecute(insight.id) : undefined
                        }
                        onNavigate={() =>
                          onNavigateToTab(insight.target_view ?? "")
                        }
                        actionState={actionStates[insight.id]}
                        reduced={reduced}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}