/**
 * @component AdvisorBanner (Fase 24 — REWRITE)
 * @namespace .glass-advisor
 * @depends useAdvisorBanner, InsightCard, AdvisorBanner.css
 * @note Full rewrite. Backward-compatible: same generic <T extends BaseInsight> interface,
 *       same props. New: CSS co-locado, hook, InsightCard extracted, keyboard nav,
 *       entrance animation, severity glow, action progress ring.
 * @import import './AdvisorBanner.css';
 */

import { useCallback } from "react";
import { ChevronDown, ChevronUp, Layers, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAdvisorBanner } from "@/shared/hooks/useAdvisorBanner";
import { InsightCard } from "./InsightCard";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";
import "./AdvisorBanner.css";

/* ═══════════════════════════════════════
   Types (re-exported for consumers)
   ═══════════════════════════════════════ */

type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";
type AdvisorImpact = "low" | "medium" | "high";

export interface BaseInsight {
  suggestedAction?: string | undefined;
  id: string;
  layer: string;
  severity: AdvisorSeverity;
  title: string;
  description: string;
  impact: AdvisorImpact;
  confidence: number;
  domain: string;
  action?: {
    label: string;
    tool: string;
    server: string;
    params?: Record<string, unknown>;
    approval: string;
    route?: string;
  };
  metric?: string;
  metricValue?: string | number;
  citations?: Array<{
    source: string;
    relevance: number;
    documentId?: string;
  }>;
}

export interface LayerConfig {
  label: string;
  color: string;
}

export interface AdvisorBannerProps<T extends BaseInsight = BaseInsight> {
  insights: T[];
  topInsights: T[];
  hasHighSeverity: boolean;
  layerConfig: Record<string, LayerConfig>;
  title: string;
  accentColor?: string;
  emptyMessage?: string;
  icon?: LucideIcon;
  onExecute?: (insight: T) => Promise<void> | void;
  className?: string;
  causalChains?: CausalChain[];
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function AdvisorBanner<T extends BaseInsight>({
  insights,
  topInsights,
  hasHighSeverity,
  layerConfig,
  title,
  accentColor = "var(--color-teal-400, #2dd4bf)",
  emptyMessage = "Todo en orden — sin alertas activas.",
  icon: Icon = Layers,
  onExecute,
  className,
  causalChains,
}: AdvisorBannerProps<T>) {
  const banner = useAdvisorBanner(
    insights,
    topInsights,
    layerConfig,
    onExecute,
  );

  /* ── Keyboard navigation (↑↓ Home End) ── */
  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const container = e.currentTarget;
      const buttons = Array.from(
        container.querySelectorAll<HTMLButtonElement>(".glass-insight__toggle"),
      );
      const idx = buttons.indexOf(e.target as HTMLButtonElement);
      if (idx === -1) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          buttons[Math.min(idx + 1, buttons.length - 1)]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          buttons[Math.max(idx - 1, 0)]?.focus();
          break;
        case "Home":
          e.preventDefault();
          buttons[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          buttons[buttons.length - 1]?.focus();
          break;
      }
    },
    [],
  );

  /* ── Match causal chains to insights ── */
  const getMatchingChain = useCallback(
    (domain: string) =>
      causalChains?.find((chain) =>
        chain.signals.some((s) => s.sourceDomain === domain),
      ),
    [causalChains],
  );

  /* ── Empty state ── */
  if (insights.length === 0) {
    return (
      <div
        className={cn("glass-advisor__empty", className)}
        role="status"
      >
        <span className="glass-advisor__empty-icon" aria-hidden="true">
          ✓
        </span>
        <p className="glass-advisor__empty-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "glass-advisor",
        "glass-advisor--enter",
        hasHighSeverity
          ? "glass-advisor--critical"
          : "glass-advisor--normal",
        className,
      )}
      style={
        { "--accent-color": accentColor } as React.CSSProperties
      }
    >
      {/* ── Header ── */}
      <div className="glass-advisor__header">
        <div className="glass-advisor__header-left">
          <Icon className="glass-advisor__header-icon" />
          <span className="glass-advisor__header-title">{title}</span>
          <span className="glass-advisor__count-badge">
            {insights.length} insights
          </span>
          {hasHighSeverity && (
            <span className="glass-advisor__alert-badge">
              Acción requerida
            </span>
          )}
        </div>

        <div className="glass-advisor__layers">
          {banner.activeLayers.map((layer) => {
            const count = insights.filter((i) => i.layer === layer).length;
            if (count === 0) return null;
            const cfg = layerConfig[layer];
            return (
              <span
                key={layer}
                className="glass-advisor__layer-tag"
                style={{ color: cfg.color }}
              >
                {count} {cfg.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Insights list ── */}
      <div
        className="glass-advisor__list"
        role="list"
        aria-label="Insights del advisor"
        onKeyDown={handleContainerKeyDown}
      >
        {banner.visibleInsights.map((insight, index) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            isExpanded={banner.expandedInsight === insight.id}
            onToggle={() => banner.toggleInsight(insight.id)}
            actionState={banner.actionStates[insight.id] ?? "idle"}
            onExecute={() => banner.executeAction(insight)}
            onRetry={() => banner.retryAction(insight)}
            layerConfig={layerConfig}
            matchingChain={getMatchingChain(insight.domain)}
            animateEntrance
            staggerDelay={index * 50}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      {banner.hiddenCount > 0 && (
        <div className="glass-advisor__footer">
          <button
            type="button"
            className="glass-advisor__footer-btn"
            onClick={banner.toggleBanner}
          >
            {banner.expanded ? (
              <>
                <ChevronUp className="glass-advisor__footer-icon" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="glass-advisor__footer-icon" />
                Ver {banner.hiddenCount} más
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}