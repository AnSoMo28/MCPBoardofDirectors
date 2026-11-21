// src/features/engagement/components/SatisfactionHealthScoreCard.tsx
/**
 * SatisfactionHealthScoreCard — Health score card for satisfaction domain.
 * Shows: composite score, level badge, trend, factor bars, sentiment summary.
 * Differentiator from other health cards: sentiment breakdown (positive/neutral/negative).
 */

import { cn } from "@/shared/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle
} from "lucide-react";

import type { SatisfactionHealthScore } from "@/shared/mocks/contracts";
import './SatisfactionHealthScoreCard.css';

// ═══ CONFIG ═════════════════════════════════════════════════════════════════

const LEVEL_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  excellent: {
    label: "Excelente",
    color: "var(--color-emerald-400)",
    bgColor: "var(--color-emerald-bg)",
  },
  healthy: {
    label: "Saludable",
    color: "var(--color-teal-400)",
    bgColor: "var(--color-teal-bg)",
  },
  attention: {
    label: "Atención",
    color: "var(--color-amber-400)",
    bgColor: "var(--color-amber-bg)",
  },
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "var(--color-rose-bg)",
  },
};

const TREND_MAP: Record<
  string,
  { icon: typeof TrendingUp; color: string; label: string }
> = {
  improving: {
    icon: TrendingUp,
    color: "var(--color-emerald-400)",
    label: "Mejorando",
  },
  stable: {
    icon: Minus,
    color: "var(--color-silver-400)",
    label: "Estable",
  },
  declining: {
    icon: TrendingDown,
    color: "var(--color-rose-400)",
    label: "En declive",
  },
};

function getFactorColor(score: number): string {
  if (score >= 70) return "var(--color-emerald-400)";
  if (score >= 50) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function getSentimentColor(_pct: number, type: "positive" | "neutral" | "negative"): string {
  if (type === "positive") return "var(--color-emerald-400)";
  if (type === "negative") return "var(--color-rose-400)";
  return "var(--color-silver-400)";
}

// ═══ COMPONENT ═════════════════════════════════════════════════════════════

interface Props {
  healthScore: SatisfactionHealthScore;
  className?: string;
}

export function SatisfactionHealthScoreCard({ healthScore, className }: Props) {
  const {
    overall_score,
    level,
    trend,
    factors,
    sentiment_summary,
    alerts,
  } = healthScore;
  const safeAlerts = alerts ?? [];

  const levelCfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.healthy;
  const trendCfg = TREND_MAP[trend] ?? TREND_MAP.stable;
  const TrendIcon = trendCfg.icon;

  const sentimentData = [
    { label: "Positivo", pct: sentiment_summary.positive_pct, type: "positive" as const },
    { label: "Neutro", pct: sentiment_summary.neutral_pct, type: "neutral" as const },
    { label: "Negativo", pct: sentiment_summary.negative_pct, type: "negative" as const },
  ];

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-[var(--color-surface-1)] border border-[rgba(255,255,255,0.06)]",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      {/* Score header */}
      <div className="satisfaction-health-score-card p-4 pb-3 flex items-center gap-4">
        <div
          className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: levelCfg.bgColor }}
        >
          <span
            className="text-2xl font-bold font-[family-name:var(--font-mono)]"
            style={{ color: levelCfg.color }}
          >
            {overall_score}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: levelCfg.color, backgroundColor: levelCfg.bgColor }}
            >
              {levelCfg.label}
            </span>
            <div className="flex items-center gap-1">
              <TrendIcon className="w-3.5 h-3.5" style={{ color: trendCfg.color }} />
              <span className="text-[10px] font-medium" style={{ color: trendCfg.color }}>
                {trendCfg.label}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--color-silver-400)]">
            Score de satisfacción compuesto · {factors.length} factores
          </p>
        </div>

        {safeAlerts.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-amber-bg)]">
            <AlertTriangle className="w-3 h-3 text-[var(--color-amber-400)]" />
            <span className="text-[11px] font-medium text-[var(--color-amber-400)]">
              {safeAlerts.length}
            </span>
          </div>
        )}
      </div>

      {/* Factor bars */}
      <div className="px-4 pb-3 space-y-2">
        {factors.map((factor) => (
          <div key={factor.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--color-silver-300)] truncate mr-2">
                {factor.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-[var(--color-silver-500)]">
                  w:{(factor.weight * 100).toFixed(0)}%
                </span>
                <span
                  className="font-[family-name:var(--font-mono)] text-[11px] font-semibold"
                  style={{ color: getFactorColor(factor.score) }}
                >
                  {factor.score.toFixed(0)}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, factor.score)}%`,
                  backgroundColor: getFactorColor(factor.score),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sentiment summary */}
      <div className="px-4 pb-3 pt-1 border-t border-[rgba(255,255,255,0.04)]">
        <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider mb-2 font-medium">
          Sentimiento
        </p>
        <div className="h-3 rounded-full overflow-hidden flex bg-[var(--color-surface-2)]">
          {sentimentData.map((s) => {
            if (s.pct <= 0) return null;
            return (
              <div
                key={s.label}
                className="h-full transition-all duration-500"
                style={{
                  width: `${s.pct}%`,
                  backgroundColor: getSentimentColor(s.pct, s.type),
                }}
                title={`${s.label}: ${s.pct.toFixed(1)}%`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          {sentimentData.map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getSentimentColor(s.pct, s.type) }}
              />
              <span className="text-[10px] text-[var(--color-silver-400)]">
                {s.label}: {s.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {safeAlerts.length > 0 && (
        <div className="px-4 pb-3 pt-1 border-t border-[rgba(255,255,255,0.04)]">
          {safeAlerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 mt-1.5 first:mt-0">
              <AlertTriangle className="w-3 h-3 text-[var(--color-amber-400)] mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-[var(--color-silver-400)] leading-relaxed">
                {alert}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
