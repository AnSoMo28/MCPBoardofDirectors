/**
 * @component InsightCard (Fase 24)
 * @namespace .glass-insight
 * @depends InsightCard.css, CausalChainViz
 * @note Generic insight card with severity encoding, expand/collapse,
 *       RAG citations, causal chain, metric row, action progress ring.
 *       Used by AdvisorBanner and potentially other insight displays.
 * @import import './InsightCard.css';
 */

import { GitBranch, Zap, Check, RotateCw, BookOpen } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { CausalChainViz } from "@/shared/components/ai/CausalChainViz";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";
import type { BaseInsight, LayerConfig } from "./AdvisorBanner";
import type { ActionState } from "@/shared/hooks/useAdvisorBanner";
import "./InsightCard.css";

/* ═══════════════════════════════════════
   Severity Config (icon + label)
   ═══════════════════════════════════════ */

import {
  Info,
  AlertTriangle,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

const SEVERITY_MAP: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  critical: { label: "CRÍTICO", icon: ShieldAlert },
  high: { label: "ALTO", icon: AlertTriangle },
  medium: { label: "MEDIO", icon: AlertTriangle },
  low: { label: "BAJO", icon: Info },
  info: { label: "INFO", icon: Info },
};

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface InsightCardProps<T extends BaseInsight> {
  insight: T;
  isExpanded: boolean;
  onToggle: () => void;
  actionState: ActionState;
  onExecute: () => void;
  onRetry: () => void;
  layerConfig: Record<string, LayerConfig>;
  matchingChain?: CausalChain;
  /** Whether entrance animation should play */
  animateEntrance?: boolean;
  /** Stagger delay for entrance animation (ms) */
  staggerDelay?: number;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function InsightCard<T extends BaseInsight>({
  insight,
  isExpanded,
  onToggle,
  actionState,
  onExecute,
  onRetry,
  layerConfig,
  matchingChain,
  animateEntrance = false,
  staggerDelay = 0,
}: InsightCardProps<T>) {
  const sevCfg = SEVERITY_MAP[insight.severity] ?? SEVERITY_MAP.info;
  const SevIcon = sevCfg.icon;
  const layerCfg = layerConfig[insight.layer] ?? {
    label: insight.layer,
    color: "var(--color-silver-400, #a09a92)",
  };

  return (
    <div
      className={cn(
        "glass-insight",
        `glass-insight--${insight.severity}`,
        animateEntrance && "glass-insight--enter",
      )}
      style={
        animateEntrance
          ? ({ animationDelay: `${staggerDelay}ms` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="glass-insight__row">
        {/* ── Severity Icon ── */}
        <div className="glass-insight__icon-wrap">
          <SevIcon className="glass-insight__icon" />
        </div>

        {/* ── Content ── */}
        <div className="glass-insight__content">
          {/* Badges */}
          <div className="glass-insight__badges">
            <span className="glass-insight__severity-badge">
              {sevCfg.label}
            </span>
            <span
              className="glass-insight__layer-badge"
              style={
                { "--layer-color": layerCfg.color } as React.CSSProperties
              }
            >
              {layerCfg.label}
            </span>
          </div>

          {/* Title toggle */}
          <Button
            variant="unstyled"
            type="button"
            className="glass-insight__toggle"
            onClick={onToggle}
            aria-expanded={isExpanded}
          >
            {insight.title}
          </Button>

          {/* Expanded body */}
          {isExpanded && (
            <div className="glass-insight__body glass-insight__body--enter">
              <p className="glass-insight__description">
                {insight.description}
              </p>

              {/* RAG Citations */}
              {insight.citations && insight.citations.length > 0 && (
                <div className="glass-insight__citations">
                  <div className="glass-insight__citations-label">
                    <BookOpen
                      size={10}
                      style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
                    />
                    Fuentes documentales
                  </div>
                  <div className="glass-insight__citation-list">
                    {insight.citations.map((citation, idx) => (
                      <span
                        key={idx}
                        className="glass-insight__citation"
                        title={`Relevancia: ${Math.round(citation.relevance * 100)}%`}
                      >
                        <span className="glass-insight__citation-dot" />
                        {citation.source}
                        <span className="glass-insight__citation-relevance">
                          {Math.round(citation.relevance * 100)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Causal Chain */}
              {matchingChain && (
                <div className="glass-insight__chain">
                  <div className="glass-insight__chain-header">
                    <GitBranch className="glass-insight__chain-icon" />
                    Cadena causal
                    <span className="glass-insight__chain-confidence">
                      {Math.round(matchingChain.compoundConfidence * 100)}%
                      confianza compuesta
                    </span>
                  </div>
                  <CausalChainViz
                    chains={[matchingChain]}
                    compact
                  />
                </div>
              )}

              {/* Metric Row */}
              {insight.metric && (
                <div className="glass-insight__metric-row">
                  <span className="glass-insight__metric-label">
                    {insight.metric}:
                  </span>
                  <span className="glass-insight__metric-value">
                    {insight.metricValue}
                  </span>
                  <span className="glass-insight__metric-confidence">
                    Confianza: {insight.confidence}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action Area ── */}
        {insight.action && (
          <div className="glass-insight__action">
            {actionState === "executing" ? (
              <span className="glass-insight__ring" aria-label="Ejecutando">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle
                    cx="10" cy="10" r="8"
                    className="glass-insight__ring-track"
                  />
                  <circle
                    cx="10" cy="10" r="8"
                    className="glass-insight__ring-fill"
                  />
                </svg>
              </span>
            ) : actionState === "done" ? (
              <span className="glass-insight__action-done">
                <Check size={12} /> Listo
              </span>
            ) : actionState === "error" ? (
              <div className="glass-insight__action-error">
                <span className="glass-insight__action-error-text">
                  Error
                </span>
                <Button
                  variant="unstyled"
                  type="button"
                  className="glass-insight__action-retry"
                  onClick={onRetry}
                >
                  <RotateCw className="glass-insight__action-retry-icon" />
                  Reintentar
                </Button>
              </div>
            ) : (
              <Button
                variant="unstyled"
                type="button"
                className="glass-insight__action-btn"
                onClick={onExecute}
              >
                <Zap className="glass-insight__action-icon" />
                {insight.action.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}