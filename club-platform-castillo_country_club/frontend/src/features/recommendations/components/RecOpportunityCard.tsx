// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Opportunity Card (2027)
//
// Shared card component used across 6+ recommendation components.
// Config-driven from RECOMMENDATION_TYPE_CONFIG + SUGGESTION_STATUS_CONFIG.
// All dynamic styling via data-attributes. Children slot for extensions.
//
// Namespace: .roc-* (no glass wrapper — parent provides context)
// ═══════════════════════════════════════════════════════════════════════

import { Lightbulb } from "lucide-react";
import {
  RECOMMENDATION_TYPE_CONFIG,
  SUGGESTION_STATUS_CONFIG,
  type RecommendationType,
} from "../types";
import "./RecOpportunityCard.css";

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getLevel(
  v: number,
  hi: number,
  mid: number,
): "high" | "medium" | "low" {
  return v >= hi ? "high" : v >= mid ? "medium" : "low";
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export interface RecOpportunityCardProps {
  title: string;
  type: RecommendationType;
  description?: string;
  confidence?: number;
  impactScore?: number;
  status?: string;
  domainSource?: string;
  expanded?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function RecOpportunityCard({
  title,
  type,
  description,
  confidence,
  impactScore,
  status,
  domainSource,
  expanded,
  onClick,
  icon,
  children,
  className,
}: RecOpportunityCardProps) {
  const config = RECOMMENDATION_TYPE_CONFIG[type];
  const confLvl =
    confidence != null ? getLevel(confidence, 75, 50) : undefined;
  const impLvl =
    impactScore != null ? getLevel(impactScore, 70, 40) : undefined;
  const clickable = !!onClick;

  return (
    <div
      className={`roc-card${className ? ` ${className}` : ""}`}
      data-rec-type={type}
      data-confidence-level={confLvl}
      data-impact={impLvl}
      data-status={status}
      data-domain={domainSource}
      data-expanded={expanded ? "" : undefined}
      data-clickable={clickable ? "" : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {/* Header */}
      <div className="roc-header">
        <div className="roc-icon" data-rec-type={type}>
          {icon ?? <Lightbulb size={14} aria-hidden="true" />}
        </div>
        <div className="roc-header-text">
          <span className="roc-type-label" data-rec-type={type}>
            {config?.label ?? String(type)}
          </span>
          <h4 className="roc-title">{title}</h4>
        </div>
        {status && (
          <span className="roc-status" data-status={status}>
            {(SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[status]?.label ?? status}
          </span>
        )}
      </div>

      {/* Description */}
      {description && <p className="roc-desc">{description}</p>}

      {/* Metric bars */}
      {(confidence != null || impactScore != null) && (
        <div className="roc-metrics">
          {confidence != null && (
            <div className="roc-bar" data-confidence-level={confLvl}>
              <span className="roc-bar-label">Confianza</span>
              <div className="roc-bar-track">
                <div
                  className="roc-bar-fill"
                  style={
                    { "--roc-pct": `${confidence}%` } as React.CSSProperties
                  }
                />
              </div>
              <span className="roc-bar-val">{confidence}%</span>
            </div>
          )}
          {impactScore != null && (
            <div className="roc-bar" data-impact={impLvl}>
              <span className="roc-bar-label">Impacto</span>
              <div className="roc-bar-track">
                <div
                  className="roc-bar-fill"
                  style={
                    { "--roc-pct": `${impactScore}%` } as React.CSSProperties
                  }
                />
              </div>
              <span className="roc-bar-val">{impactScore}</span>
            </div>
          )}
        </div>
      )}

      {/* Extension slot */}
      {children}
    </div>
  );
}