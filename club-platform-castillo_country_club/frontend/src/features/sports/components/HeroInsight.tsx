// ═══════════════════════════════════════════════════════════
// src/features/sports/components/HeroInsight.tsx
// §B3.3 — Hero Insight
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// The #1 priority insight, elevated above all other content.
// Full reasoning + metric + action button visible.
// Glow pulse responds to dashboard mode.
// Living Protocol: 7/7
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component HeroInsight
// ═══════════════════════════════════════════════════════════

import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { SportsDashboardMode } from "../types";
import "./HeroInsight.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface HeroInsightProps {
  insight: BaseInsight;
  ambientMode: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const SEVERITY_LABELS: Record<string, string> = {
  critical: "CRÍTICO",
  high: "ALERTA",
};

// ═══════════════════════════════════════════════════════════
// §3 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function HeroInsight({ insight, ambientMode }: HeroInsightProps) {
  return (
    <div
      className="spt-hero"
      data-severity={insight.severity}
      data-impact={insight.impact}
      data-mode={ambientMode}
      role="alert"
      aria-live="assertive"
      aria-label={`Insight prioritario: ${insight.title}`}
    >
      <div className="spt-hero__badge" data-severity={insight.severity}>
        {SEVERITY_LABELS[insight.severity] ?? insight.severity.toUpperCase()}
      </div>

      <h2 className="spt-hero__title">{insight.title}</h2>

      <p className="spt-hero__description">{insight.description}</p>

      {insight.metric && (
        <p className="spt-hero__metric">
          {insight.metric}: <strong>{insight.metricValue}</strong>
        </p>
      )}

      {insight.confidence != null && (
        <div className="spt-hero__confidence">
          <span className="spt-hero__confidence-label">Confianza</span>
          <div className="spt-hero__confidence-bar">
            <div
              className="spt-hero__confidence-fill"
              style={{ width: `${insight.confidence}%` }}
            />
          </div>
          <span className="spt-hero__confidence-value">{insight.confidence}%</span>
        </div>
      )}

      {insight.action && (
        <div className="spt-hero__actions">
          <button
            type="button"
            className="spt-hero__action"
            data-approval={insight.action.approval}
          >
            {insight.action.label}
          </button>
        </div>
      )}
    </div>
  );
}