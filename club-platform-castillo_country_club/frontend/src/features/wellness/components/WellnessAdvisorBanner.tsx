/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessAdvisorBanner.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Advisor Banner
   Renders advisor insights with action execution + reactions.

   Proposals: P1 Briefing · P2 Compliance · P3 CSS Stagger ·
     P4 Expand Glow · P5 Timeline · P6 Glass CSS
   ═══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import {
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Layers,
  Sparkles,
} from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { AdvisorReactionCard } from "@/shared/components/ui/AdvisorReactionCard";
import AIInsightNarrative from "@/shared/components/ai/AIInsightNarrative";
import { cn } from "@/shared/lib/utils";
import { IMPACT_CONFIG } from "@/shared/lib/ui/advisorConfig";

import type { WellnessAdvisorInsight } from "../types";
import type { AdvisorReactionInsight } from "@/features/dashboard/types";
import "./WellnessAdvisorBanner.css";
import { toAdvisorReaction } from "@/shared/lib/reactionTemplate";
// ═══════════════════════════════════════════════════════════════
// §1  Config
// ═══════════════════════════════════════════════════════════════

const LAYER_LABELS: Record<string, string> = {
  macro: "Macro",
  micro: "Micro",
  fusion: "Cross-Domain",
};

const MAX_VISIBLE_INSIGHTS = 4;

// ═══════════════════════════════════════════════════════════════
// §2  Props
// ═══════════════════════════════════════════════════════════════

interface WellnessAdvisorBannerProps {
  insights: WellnessAdvisorInsight[];
  reactions: AdvisorReactionInsight[];
  actionStates: Record<string, string>;
  onExecute: (insightId: string) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// §3  Component
// ═══════════════════════════════════════════════════════════════

export function WellnessAdvisorBanner({
  insights,
  reactions,
  actionStates,
  onExecute,
  className,
}: WellnessAdvisorBannerProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedNarrative, setExpandedNarrative] = useState<string | null>(
    null,
  );

  const visibleInsights = showAll
    ? insights
    : insights.slice(0, MAX_VISIBLE_INSIGHTS);

  const highCount = insights.filter((i) => i.impact === "high").length;

  // ── Empty state ──
  if (insights.length === 0 && reactions.length === 0) {
    return (
      <div className={cn("glass-wab", className)} data-impact-count="0">
        <div className="wab__empty">
          <span className="wab__empty-icon">
            <CheckCircle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="wab__empty-title">Wellness Advisor</h3>
            <p className="wab__empty-desc">
              Todo en orden — sin alertas de bienestar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("glass-wab", className)}
      data-impact-count={highCount}
    >
      {/* ═══ Header ═══ */}
      <div className="wab__header">
        <div className="wab__header-left">
          <span className="wab__header-icon">
            <Brain className="w-4 h-4" />
          </span>
          <h3 className="wab__header-title">Wellness Advisor</h3>
          <Badge variant={highCount > 0 ? "danger" : "default"} size="sm">
            {insights.length}
          </Badge>
          {highCount > 0 && (
            <Badge variant="danger" size="sm">
              {highCount} crítica{highCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <span className="wab__header-meta">0ms · client-side</span>
      </div>

      {/* ═══ Insight Cards ═══ */}
      <div className="wab__insights">
        {visibleInsights.map((insight, i) => {
          const impactCfg = IMPACT_CONFIG[insight.impact] ?? IMPACT_CONFIG.low;
          const layerLabel = LAYER_LABELS[insight.layer] ?? "Macro";
          const isExpanded = expandedNarrative === insight.id;
          const isDone = actionStates[insight.id] === "done";

          return (
            <div
              key={insight.id}
              className="wab__card wab__stagger"
              data-impact={insight.impact}
              data-layer={insight.layer}
              data-expanded={isExpanded ? "" : undefined}
              data-done={isDone ? "" : undefined}
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              {/* Main row */}
              <div className="wab__card-row">
                <div className="wab__card-badge-area">
                  <Badge variant={impactCfg.variant} size="sm">
                    {impactCfg.label}
                  </Badge>
                </div>

                <div className="wab__card-body">
                  <div className="wab__card-meta">
                    <span className="wab__layer-tag">{layerLabel}</span>
                    <span className="wab__confidence">{insight.confidence}%</span>
                  </div>

                  <p className="wab__card-title">{insight.title}</p>
                  <p className="wab__card-reasoning">{insight.reasoning}</p>

                  {insight.thresholdContext && (
                    <p className="wab__card-threshold">
                      <Layers className="w-3 h-3" aria-hidden="true" />
                      {insight.thresholdContext.explanation}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="wab__card-actions">
                    {insight.action && !isDone && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onExecute(insight.id)}
                        className="min-h-[36px]"
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        {insight.action.label}
                      </Button>
                    )}
                    {isDone && (
                      <span className="wab__done">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Ejecutado
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedNarrative(isExpanded ? null : insight.id)
                      }
                      className="min-h-[36px] wab__deep-btn"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {isExpanded ? "Cerrar" : "Análisis Profundo"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded narrative (P4) */}
              {isExpanded && (
                <div className="wab__narrative">
                  <div className="wab__narrative-divider" />
                  <AIInsightNarrative
                    insightId={insight.id}
                    insightData={insight as unknown as Record<string, unknown>}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ Show more/less ═══ */}
      {insights.length > MAX_VISIBLE_INSIGHTS && (
        <Button
          variant="unstyled"
          className="wab__toggle"
          onClick={() => setShowAll(!showAll)}
          type="button"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" /> Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver {insights.length - MAX_VISIBLE_INSIGHTS} insight(s) más
            </>
          )}
        </Button>
      )}

      {/* ═══ Reactions timeline (P5) ═══ */}
      {reactions.length > 0 && (
        <div className="wab__reactions">
          <div className="wab__reactions-divider" />
          {reactions.map((reaction, i) => (
            <AdvisorReactionCard
              key={reaction.id}
              reaction={toAdvisorReaction(reaction)}
              showConnector={i < reactions.length - 1}
              isLast={i === reactions.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}