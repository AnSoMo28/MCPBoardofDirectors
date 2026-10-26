// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsPulse.tsx
// §B3.1 — Sports Pulse Header
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// Adaptive header bar: health micro, alert count, dashboard
// mode indicator, season context. Breathing animation
// responds to dashboard mode.
//
// Living Protocol: 7/7
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsPulse
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { Activity, AlertTriangle } from "lucide-react";
import type { SportsDashboardMode } from "../types";
import "./SportsPulse.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface SeasonInfo {
  label: string;
  isPeak: boolean;
  icon: string;
}

export interface SportsPulseProps {
  dashboardMode: SportsDashboardMode;
  healthScore: number;
  alertCount: number;
  season: SeasonInfo;
  reducedMotion?: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const MODE_LABELS: Record<SportsDashboardMode, string> = {
  calm: "Normal",
  alert: "Atención",
  critical: "Crítico",
};

// ═══════════════════════════════════════════════════════════
// §3 — NARRATIVE (Living Protocol Sense 7)
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  healthScore: number,
  alertCount: number,
  mode: SportsDashboardMode,
  season: SeasonInfo,
): string {
  const healthCtx =
    healthScore >= 80
      ? "excelente"
      : healthScore >= 60
        ? "saludable"
        : healthScore >= 40
          ? "necesita atención"
          : "crítica";

  const alertCtx =
    alertCount === 0
      ? "Sin alertas activas."
      : alertCount === 1
        ? "1 alerta activa."
        : `${alertCount} alertas activas.`;

  const modeCtx =
    mode === "critical"
      ? "Sistema en modo crítico."
      : mode === "alert"
        ? "Sistema en modo de atención."
        : "Sistema en operación normal.";

  return `${alertCtx} Salud deportiva ${healthCtx} (${healthScore}/100). ${modeCtx} ${season.label} — ${season.icon}`;
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsPulse({
  dashboardMode,
  healthScore,
  alertCount,
  season,
  reducedMotion = false,
}: SportsPulseProps) {
  const narrative = useMemo(
    () => buildNarrative(healthScore, alertCount, dashboardMode, season),
    [healthScore, alertCount, dashboardMode, season],
  );

  return (
    <header
      className="spt-pulse"
      data-mode={dashboardMode}
      data-prefers-reduced={reducedMotion}
      role="banner"
      aria-label={narrative}
    >
      <div className="spt-pulse__left">
        <span className="spt-pulse__health">
          <Activity className="spt-pulse__icon" />
          <span className="spt-pulse__score">{healthScore}</span>
          <span className="spt-pulse__label">/100</span>
        </span>
        {alertCount > 0 && (
          <span className="spt-pulse__alerts" data-mode={dashboardMode}>
            <AlertTriangle className="spt-pulse__icon" />
            {alertCount}
          </span>
        )}
      </div>
      <div className="spt-pulse__center">
        <p className="spt-pulse__summary" aria-label={narrative}>
          {healthScore}/100
          {alertCount > 0 ? ` — ${alertCount} alerta${alertCount > 1 ? "s" : ""}` : " — Sin alertas"}
          {" — "}{MODE_LABELS[dashboardMode]}
        </p>
      </div>
      <div className="spt-pulse__right">
        <span className="spt-pulse__mode" data-mode={dashboardMode}>
          {MODE_LABELS[dashboardMode]}
        </span>
        <span className="spt-pulse__season" data-peak={season.isPeak}>
          {season.icon} {season.label}
        </span>
      </div>
    </header>
  );
}