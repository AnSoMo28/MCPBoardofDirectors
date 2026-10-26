// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestHealthScoreCard.tsx
// Phase 34 "The Gateway" — Guest Health Score Card (Rewrite)
// Level 6+ Agency · Production Grade
//
// Composite health score visualization.
// Shows: overall score with level badge, trend indicator,
// factor breakdown bars with weights, and alert badges.
//
// Original: cn() + Tailwind + inline styles → BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   GuestHealthScore { score(number), level(string),
//     trend(string), factors(HealthFactor[]),
//     summary(string) }                                  ← mocks/contracts ✅
//   HealthFactor { name(string), score(number),
//     weight(number) }                                   ← accessed: .name, .score, .weight ✅
//   LEVEL_CONFIG levels: "excellent"|"healthy"|
//     "attention"|"critical"                             ← original code ✅
//   TREND values: "improving"|"stable"|"declining"       ← original code ✅
//
// ANTI-PATTERNS REMOVED: cn(), Tailwind, inline colors,
//   className prop, unused UserPlus import
// ═══════════════════════════════════════════════════════════

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import type { GuestHealthScore } from "@/shared/mocks/contracts";

import "./GuestHealthScoreCard.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestHealthScoreCardProps {
  /** Health score from MCP. null → empty state. */
  readonly healthScore: GuestHealthScore | null;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Level config — label only. Colors via CSS data-level. */
const LEVEL_LABELS: Record<string, string> = {
  excellent: "Excelente",
  healthy: "Saludable",
  attention: "Atención",
  critical: "Crítico",
};

/** Trend config — icon + label only. Colors via CSS data-trend. */
const TREND_CONFIG: Record<string, { readonly icon: typeof TrendingUp; readonly label: string }> = {
  improving: { icon: TrendingUp, label: "Mejorando" },
  stable: { icon: Minus, label: "Estable" },
  declining: { icon: TrendingDown, label: "En declive" },
};

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Map factor score to visual level. */
function getFactorLevel(score: number): string {
  if (score >= 70) return "good";
  if (score >= 50) return "attention";
  return "critical";
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Health Score Card — composite score visualization.
 * Shows overall health with level, trend, and factor breakdown.
 *
 * @example
 * <GuestHealthScoreCard healthScore={healthData} />
 */
export function GuestHealthScoreCard({ healthScore }: GuestHealthScoreCardProps) {
  // ── Empty state ──
  if (!healthScore) {
    return (
      <div
        className="gst-health"
        data-state="empty"
        role="region"
        aria-label="Salud del ecosistema de invitados"
        data-testid="guest-health-score"
      >
        <p className="gst-health__empty-text">
          No hay datos de salud disponibles.
        </p>
      </div>
    );
  }

  const { score, level, trend, factors, summary } = healthScore;

  const safeLevel = LEVEL_LABELS[level] ? level : "healthy";
  const levelLabel = LEVEL_LABELS[safeLevel] ?? LEVEL_LABELS.healthy;
  const trendCfg = TREND_CONFIG[trend] ?? TREND_CONFIG.stable;
  const TrendIcon = trendCfg.icon;

  return (
    <div
      className="gst-health"
      data-state="data"
      data-level={safeLevel}
      role="region"
      aria-label={`Salud del ecosistema: ${score}/100 — ${levelLabel}`}
      data-testid="guest-health-score"
    >
      {/* ── Score Header ── */}
      <div className="gst-health__header">
        <div className="gst-health__score-badge">
          <span className="gst-health__score-number">{score}</span>
        </div>

        <div className="gst-health__header-info">
          <div className="gst-health__header-row">
            <span className="gst-health__level-badge" data-level={safeLevel}>
              {levelLabel}
            </span>
            <span className="gst-health__trend" data-trend={trend}>
              <TrendIcon className="gst-health__trend-icon" />
              <span className="gst-health__trend-label">{trendCfg.label}</span>
            </span>
          </div>
          <p className="gst-health__summary">{summary}</p>
        </div>
      </div>

      {/* ── Factor Bars ── */}
      {factors.length > 0 && (
        <div className="gst-health__factors" role="list" aria-label="Factores de salud">
          {factors.map((factor) => (
            <div
              key={factor.name}
              className="gst-health__factor"
              role="listitem"
              aria-label={`${factor.name}: ${factor.score.toFixed(0)}, peso ${(factor.weight * 100).toFixed(0)}%`}
            >
              <div className="gst-health__factor-header">
                <span className="gst-health__factor-name">{factor.name}</span>
                <div className="gst-health__factor-meta">
                  <span className="gst-health__factor-weight">
                    w:{(factor.weight * 100).toFixed(0)}%
                  </span>
                  <span
                    className="gst-health__factor-score"
                    data-factor-level={getFactorLevel(factor.score)}
                  >
                    {factor.score.toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="gst-health__factor-track">
                <div
                  className="gst-health__factor-fill"
                  data-factor-level={getFactorLevel(factor.score)}
                  style={{ "--fill-width": `${Math.min(100, factor.score)}%` } as React.CSSProperties}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}