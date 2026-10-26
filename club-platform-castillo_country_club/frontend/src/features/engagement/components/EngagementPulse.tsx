// src/features/engagement/components/EngagementPulse.tsx
// ═══════════════════════════════════════════════════════════
// Engagement Pulse — Cross-domain signals banner
// Castillo Country Club — Phase 31 "The Voice"
//
// The "heartbeat" strip at the top of the dashboard.
// Shows the 3 most important cross-domain signals with
// animated pulse indicators. Replaces the old AdvisorBanner.
//
// Glass namespace: glass-eng-pulse
// Data attributes: data-severity, data-pulse
// Rules: R34, R35, R38, R23, R24
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Heart,
  Shield,
} from "lucide-react";
import type {
  EngagementStreamSignal,
  EngagementDashboardMode,
} from "../types";
import "./EngagementPulse.css";

// ── Severity derivation ────────────────────────────────────

function derivePulseSeverity(
  mode: EngagementDashboardMode,
  topSignal?: EngagementStreamSignal,
): "calm" | "watch" | "alert" | "critical" {
  if (mode === "critical") return "critical";
  if (topSignal && topSignal.priority >= 85) return "critical";
  if (mode === "alert") return "alert";
  if (topSignal && topSignal.priority >= 65) return "watch";
  return "calm";
}

// ── Severity config ────────────────────────────────────────

const PULSE_SEVERITY_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: typeof AlertTriangle;
    message: string;
  }
> = {
  calm: {
    label: "Estable",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    icon: Heart,
    message: "Engagement estable — sin señales críticas",
  },
  watch: {
    label: "Observar",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    icon: TrendingUp,
    message: "Señales detectadas — monitorear evolución",
  },
  alert: {
    label: "Atención",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    icon: AlertTriangle,
    message: "Señales de alerta — revisar inteligencia",
  },
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
    icon: Shield,
    message: "Intervención necesaria — actuar ahora",
  },
};

// ── Trend icon helper ──────────────────────────────────────

function getTrendIcon(trend: string) {
  if (trend === "improving") return TrendingUp;
  if (trend === "declining") return TrendingDown;
  return Zap;
}

function getTrendColor(trend: string): string {
  if (trend === "improving") return "var(--color-emerald-400)";
  if (trend === "declining") return "var(--color-rose-400)";
  return "var(--color-silver-400)";
}

// ── Component ──────────────────────────────────────────────

interface EngagementPulseProps {
  mode: EngagementDashboardMode;
  signals: EngagementStreamSignal[];
  healthScore: number;
  healthGrade: string;
  velocity: {
    trajectory: "improving" | "stable" | "declining";
    velocity_per_week: number;
  } | null;
  atRiskCount: number;
  totalFamilies: number;
  onSignalClick?: (signal: EngagementStreamSignal) => void;
}

/**
 * The heartbeat strip — shows system emotional state at a glance.
 * 3 compact signal cards + health score indicator + trend pulse.
 */
export function EngagementPulse({ mode, signals, healthScore, healthGrade, velocity, atRiskCount, onSignalClick }: EngagementPulseProps) {
  const severity = derivePulseSeverity(mode, signals[0]);
  const sevCfg = PULSE_SEVERITY_CONFIG[severity];
  const SevIcon = sevCfg.icon;

  const top3 = useMemo(() => signals.slice(0, 3), [signals]);

  const TrendIcon = velocity ? getTrendIcon(velocity.trajectory) : Zap;
  const trendColor = velocity ? getTrendColor(velocity.trajectory) : "var(--color-silver-400)";

  return (
    <div
      data-glass-eng-pulse=""
      data-severity={severity}
      data-pulse={mode}
      className="eng-pulse"
    >
      {/* ── Health Indicator ──────────────────────────────── */}
      <div className="eng-pulse__health">
        <div className="eng-pulse__health-score" data-grade={healthGrade}>
          <span className="eng-pulse__health-number">{healthScore}</span>
          <span className="eng-pulse__health-grade">{healthGrade}</span>
        </div>
        <div className="eng-pulse__health-meta">
          <span className="eng-pulse__health-label">Health Score</span>
          <div className="eng-pulse__health-bar">
            <div
              className="eng-pulse__health-fill"
              style={{ width: `${Math.min(100, healthScore)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Severity Badge ────────────────────────────────── */}
      <div className="eng-pulse__severity" style={{ color: sevCfg.color, backgroundColor: sevCfg.bgColor }}>
        <SevIcon size={14} />
        <span>{sevCfg.label}</span>
        <span className="eng-pulse__severity-dot" />
      </div>

      {/* ── Trend Indicator ───────────────────────────────── */}
      {velocity && (
        <div className="eng-pulse__trend" style={{ color: trendColor }}>
          <TrendIcon size={14} />
          <span className="eng-pulse__trend-value">
            {velocity.velocity_per_week >= 0 ? "+" : ""}
            {velocity.velocity_per_week.toFixed(1)}/sem
          </span>
        </div>
      )}

      {/* ── Top 3 Signals ─────────────────────────────────── */}
      <div className="eng-pulse__signals">
        {top3.map((signal, idx) => (
          <button
            key={signal.id}
            type="button"
            className="eng-pulse__signal"
            style={{ "--stagger-i": idx } as React.CSSProperties}
            onClick={() => onSignalClick?.(signal)}
            aria-label={`Señal: ${signal.title}`}
          >
            <span className="eng-pulse__signal-priority">{signal.priority}</span>
            <span className="eng-pulse__signal-title">{signal.title}</span>
          </button>
        ))}
        {top3.length === 0 && (
          <span className="eng-pulse__signal eng-pulse__signal--empty">
            Sin señales activas
          </span>
        )}
      </div>

      {/* ── At Risk Counter ───────────────────────────────── */}
      {atRiskCount > 0 && (
        <div className="eng-pulse__risk">
          <AlertTriangle size={12} />
          <span>{atRiskCount}</span>
          <span className="eng-pulse__risk-label">en riesgo</span>
        </div>
      )}
    </div>
  );
}