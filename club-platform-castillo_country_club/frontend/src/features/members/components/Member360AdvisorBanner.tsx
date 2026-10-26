/**
 * Member360AdvisorBanner — Intelligence Advisor
 * Phase 30 — Block 4.3: What The AI Sees
 *
 * Not a banner. A CONVERSATION with an AI advisor.
 * Each insight has weight, resonance, and urgency.
 * Critical insights pulse. The first one is always expanded.
 * Confidence is visual (bar), not just a number.
 *
 * The advisor doesn't just report — it RECOMMENDS.
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Info,
  Shield,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type {
  Member360AdvisorInsight,
  SignalResonance,
  PredictiveWindow,
} from "../types";

import "./Member360AdvisorBanner.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Member360AdvisorBannerProps {
  insights: Member360AdvisorInsight[];
  resonance?: SignalResonance;
  window?: PredictiveWindow | null;
  onExecute?: (insightId: string) => void;
  className?: string;
}

const IMPACT_ICON: Record<string, typeof AlertTriangle> = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: Info,
  low: Shield,
};

const IMPACT_STYLE: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  critical: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    label: "CRÍTICO",
  },
  high: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    label: "ALTO",
  },
  medium: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    label: "MEDIO",
  },
  low: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
    label: "BAJO",
  },
};

const LAYER_LABELS: Record<string, string> = {
  health_identity: "Salud",
  lifecycle: "Lifecycle",
  financial: "Financiero",
  engagement_social: "Engagement",
  churn_risk: "Riesgo",
  cross_domain: "Cross-Domain",
};

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function Member360AdvisorBanner({
  insights,
  resonance,
  window: predictiveWindow,
  onExecute,
  className,
}: Member360AdvisorBannerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  if (!insights.length) return null;

  const criticalCount = insights.filter(
    (i) => i.impact === "critical",
  ).length;
  const highCount = insights.filter((i) => i.impact === "high").length;
  const visible = showAll ? insights : insights.slice(0, 4);

  // Auto-expand first critical insight
  const firstCritical = insights.find((i) => i.impact === "critical");
  const autoExpanded = firstCritical && !expanded.has(firstCritical.id);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Determine overall urgency
  const urgency =
    criticalCount > 0
      ? "critical"
      : highCount > 0
        ? "high"
        : "normal";

  return (
    <div
      className={cn("glass-m360-advisor", className)}
      data-urgency={urgency}
    >
      {/* Header */}
      <div className="glass-m360-advisor__header">
        <div className="glass-m360-advisor__header-left">
          <Zap className="w-4 h-4 text-[var(--color-gold-400)]" />
          <span className="glass-m360-advisor__header-title">
            Advisor Intelligence
          </span>
          <span className="glass-m360-advisor__header-count">
            {insights.length} insight{insights.length !== 1 ? "s" : ""}
          </span>
          {criticalCount > 0 && (
            <span className="glass-m360-advisor__header-badge glass-m360-advisor__header-badge--critical">
              {criticalCount} crítico{criticalCount !== 1 ? "s" : ""}
            </span>
          )}
          {highCount > 0 && (
            <span className="glass-m360-advisor__header-badge glass-m360-advisor__header-badge--high">
              {highCount} alto{highCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Resonance indicator */}
        {resonance && (
          <div
            className="glass-m360-advisor__resonance"
            data-agreement={resonance.agreement}
          >
            <span>
              {resonance.agreementCount}/{resonance.totalDomains}
            </span>
          </div>
        )}

        {/* Window indicator */}
        {predictiveWindow && (
          <div
            className="glass-m360-advisor__window"
            data-window-status={predictiveWindow.status}
          >
            <span>
              {predictiveWindow.daysRemaining ?? "?"}d
            </span>
          </div>
        )}
      </div>

      {/* Insight list */}
      <div className="glass-m360-advisor__list">
        {visible.map((insight, i) => {
          const isExpanded =
            expanded.has(insight.id) ||
            (autoExpanded && insight.id === firstCritical?.id);
          const style =
            IMPACT_STYLE[insight.impact] ?? IMPACT_STYLE.medium;
          const Icon = IMPACT_ICON[insight.impact] ?? Info;

          return (
            <div
              key={insight.id}
              className="glass-m360-advisor__insight"
              data-impact={insight.impact}
              style={
                {
                  "--stagger-i": i,
                  "--insight-color": style.color,
                } as React.CSSProperties
              }
            >
              <div className="glass-m360-advisor__insight-row">
                {/* Impact badge */}
                <span
                  className="glass-m360-advisor__impact-badge"
                  style={{ color: style.color, background: style.bgColor }}
                >
                  {style.label}
                </span>

                {/* Content */}
                <div className="glass-m360-advisor__insight-content">
                  <button
                    onClick={() => toggle(insight.id)}
                    className="glass-m360-advisor__insight-toggle"
                  >
                    <div className="glass-m360-advisor__insight-title-row">
                      <Icon
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: style.color }}
                      />
                      <span className="glass-m360-advisor__insight-title">
                        {insight.title}
                      </span>
                      <span className="glass-m360-advisor__insight-layer">
                        {LAYER_LABELS[insight.layer] ?? insight.layer}
                      </span>
                    </div>
                  </button>

                  {/* Expanded reasoning */}
                  {isExpanded && (
                    <div className="glass-m360-advisor__insight-body">
                      <p className="glass-m360-advisor__insight-reasoning">
                        {insight.reasoning}
                      </p>
                      {insight.data &&
                        Object.keys(insight.data).length > 0 && (
                          <div className="glass-m360-advisor__insight-data">
                            {Object.entries(insight.data).map(([k, v]) => (
                              <span
                                key={k}
                                className="glass-m360-advisor__insight-data-tag"
                              >
                                {k}:{" "}
                                {typeof v === "number"
                                  ? v.toFixed(0)
                                  : Array.isArray(v)
                                    ? v.length
                                    : String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Confidence bar + Action */}
                <div className="glass-m360-advisor__insight-right">
                  {/* Confidence visual bar */}
                  <div className="glass-m360-advisor__confidence">
                    <div className="glass-m360-advisor__confidence-bar-wrap">
                      <div
                        className="glass-m360-advisor__confidence-bar"
                        style={{
                          width: `${insight.confidence}%`,
                          background: style.color,
                        }}
                      />
                    </div>
                    <span className="glass-m360-advisor__confidence-value">
                      {insight.confidence}%
                    </span>
                  </div>

                  {insight.action && onExecute && (
                    <button
                      onClick={() => onExecute(insight.id)}
                      className="glass-m360-advisor__action-btn"
                      style={{ color: style.color }}
                    >
                      {insight.action.label}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more/less */}
      {insights.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="glass-m360-advisor__toggle-all"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3" /> Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Ver {insights.length - 4} más
            </>
          )}
        </button>
      )}
    </div>
  );
}