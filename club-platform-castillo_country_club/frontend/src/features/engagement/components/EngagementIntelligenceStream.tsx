// src/features/engagement/components/EngagementIntelligenceStream.tsx
// ═══════════════════════════════════════════════════════════
// Intelligence Stream — Priority-sorted signal panel
// Castillo Country Club — Phase 31 "The Voice"
//
// Replaces the old tab system. The most important signal
// surfaces first, regardless of which "category" it's in.
//
// Glass namespace: glass-eng-stream
// Data attributes: data-priority, data-category, data-actionable
// Rules: R34, R35, R38, R23, R24
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import {
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Sparkles,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  EngagementStreamSignal,
  StreamSignalCategory,
} from "../types";
import { Button } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./EngagementIntelligenceStream.css";

// ── Category display config ────────────────────────────────

const CATEGORY_CONFIG: Record<
  StreamSignalCategory,
  { label: string; color: string; bgColor: string; icon: typeof AlertTriangle }
> = {
  risk: {
    label: "Riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    icon: AlertTriangle,
  },
  prediction: {
    label: "Predicción",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    icon: Brain,
  },
  opportunity: {
    label: "Oportunidad",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    icon: Lightbulb,
  },
  positive: {
    label: "Positivo",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
    icon: TrendingUp,
  },
  insight: {
    label: "Insight",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    icon: Sparkles,
  },
  anomaly: {
    label: "Anomalía",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
    icon: Zap,
  },
};

// ── Helpers ────────────────────────────────────────────────

function getPriorityBand(priority: number): "critical" | "high" | "medium" | "low" {
  if (priority >= 85) return "critical";
  if (priority >= 65) return "high";
  if (priority >= 40) return "medium";
  return "low";
}

// ── Component ──────────────────────────────────────────────

interface EngagementIntelligenceStreamProps {
  signals: EngagementStreamSignal[];
  maxVisible?: number;
  onSignalClick?: (signal: EngagementStreamSignal) => void;
}

/**
 * Priority-sorted intelligence stream.
 * Signals surface based on importance, not category.
 * The stream IS the navigation — no tabs needed.
 */
export function EngagementIntelligenceStream({
  signals,
  maxVisible = 5,
  onSignalClick,
}: EngagementIntelligenceStreamProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleSignals = expanded ? signals : signals.slice(0, maxVisible);
  const hiddenCount = signals.length - maxVisible;

  if (signals.length === 0) {
    return (
      <div data-glass-eng-stream="" className="eng-stream">
        <div className="eng-stream__header">
          <Sparkles className="eng-stream__header-icon" size={16} />
          <h3 className="eng-stream__title">Intelligence Stream</h3>
        </div>
        <EmptyState
          title="Sin señales activas"
          description="El engagement está estable. No hay señales prioritarias."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Ver historial
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div data-glass-eng-stream="" className="eng-stream">
      <div className="eng-stream__header">
        <Sparkles className="eng-stream__header-icon" size={16} />
        <h3 className="eng-stream__title">Intelligence Stream</h3>
        <span className="eng-stream__count">{signals.length}</span>
      </div>

      <div className="eng-stream__list" role="list" aria-label="Señales de inteligencia">
        {visibleSignals.map((signal, idx) => {
          const catCfg = CATEGORY_CONFIG[signal.category] ?? CATEGORY_CONFIG.insight;
          const Icon = catCfg.icon;
          const band = getPriorityBand(signal.priority);

          return (
            <Button
              variant="unstyled"
              key={signal.id}
              type="button"
              className="eng-stream__item"
              data-priority={band}
              data-category={signal.category}
              data-actionable={signal.actionable}
              style={{ "--stagger-i": idx } as React.CSSProperties}
              onClick={() => onSignalClick?.(signal)}
              aria-label={`${catCfg.label}: ${signal.title}. Prioridad ${signal.priority}.`}
            >
              <div className="eng-stream__item-icon" style={{ color: catCfg.color }}>
                <Icon size={16} />
              </div>

              <div className="eng-stream__item-body">
                <div className="eng-stream__item-header">
                  <span
                    className="eng-stream__item-badge"
                    style={{ color: catCfg.color, backgroundColor: catCfg.bgColor }}
                  >
                    {catCfg.label}
                  </span>
                  <span className="eng-stream__item-priority">
                    {signal.priority}
                  </span>
                </div>
                <p className="eng-stream__item-title">{signal.title}</p>
                <p className="eng-stream__item-description">{signal.description}</p>
                <div className="eng-stream__item-meta">
                  <span className="eng-stream__item-confidence">
                    Confianza: {signal.confidence}%
                  </span>
                  {signal.familyName && (
                    <span className="eng-stream__item-family">
                      {signal.familyName}
                    </span>
                  )}
                  {signal.actionable && (
                    <span className="eng-stream__item-actionable">
                      Accionable
                    </span>
                  )}
                </div>
              </div>

              <div className="eng-stream__item-arrow" aria-hidden="true">
                <ChevronDown size={14} />
              </div>
            </Button>
          );
        })}
      </div>

      {hiddenCount > 0 && !expanded && (
        <Button
          variant="unstyled"
          type="button"
          className="eng-stream__expand"
          onClick={() => setExpanded(true)}
          aria-expanded="false"
        >
          <ChevronDown size={14} />
          <span>Ver {hiddenCount} señales más</span>
        </Button>
      )}

      {expanded && signals.length > maxVisible && (
        <Button
          variant="unstyled"
          type="button"
          className="eng-stream__expand"
          onClick={() => setExpanded(false)}
          aria-expanded="true"
        >
          <ChevronUp size={14} />
          <span>Contraer</span>
        </Button>
      )}
    </div>
  );
}