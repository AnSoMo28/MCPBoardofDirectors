// src/features/facilities/components/FacilityPulse.tsx
// ═══════════════════════════════════════════════════════════════
// FACILITY PULSE — "The Heartbeat Bar"
//
// Top bar that communicates the club's state at a glance.
// Left: mode indicator (dot + dynamic label)
// Center: metric chips (facilities, utilization, alerts, risk)
// Right: cross-domain signal (domain badge + text + confidence)
// Bottom: 2px ambient accent bar
//
// MERGED: Their accent bar + SVG + divider + title
//         + Our narrative + status encoding + micro-interactions
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — bottom accent bar breathes
//   ✅ SENSE 2: REACCIÓN — chips scale on hover
//   ✅ SENSE 3: MEMORIA — utilization status encoding
//   ✅ SENSE 4: INTENCIÓN — cross-domain signal as callout
//   ✅ SENSE 5: SINIESTRÍA — alert chips get priority weight
//   ✅ SENSE 6: EMPATÍA — reads data-mode from container
//   ✅ SENSE 7: NARRATIVA — computed descriptive sentence
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  FacilitiesDashboardMode,
  FacilitiesAmbientState,
  CrossDomainSignal,
} from "../types";

import "./FacilityPulse.css";

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface FacilityPulseProps {
  ambientState: FacilitiesAmbientState;
  totalFacilities: number;
  activeAlerts: number;
  facilitiesAtRiskPct: number;
  crossDomainSignal?: CrossDomainSignal;
  utilizationPct?: number;
}

// ═══════════════════════════════════════════════════════════════
// MODE ENCODING
// ═══════════════════════════════════════════════════════════════

const MODE_ICONS: Record<FacilitiesDashboardMode, string> = {
  calm: "●",
  alert: "◐",
  critical: "◉",
};

// ═══════════════════════════════════════════════════════════════
// NARRATIVE BUILDER — Sense 7: NARRATIVA
//
// Dynamic sentence derived from live data.
// NOT static labels — reads actual numbers and context.
// ═══════════════════════════════════════════════════════════════

function buildPulseNarrative(
  mode: FacilitiesDashboardMode,
  totalFacilities: number,
  activeAlerts: number,
  facilitiesAtRiskPct: number,
  utilizationPct?: number,
): string {
  if (mode === "critical") {
    const parts: string[] = [];
    parts.push(
      `${activeAlerts} alerta${activeAlerts !== 1 ? "s" : ""} crítica${activeAlerts !== 1 ? "s" : ""}`,
    );
    if (facilitiesAtRiskPct > 20) {
      parts.push(`${Math.round(facilitiesAtRiskPct)}% de espacios en riesgo`);
    }
    return parts.join(" · ");
  }

  if (mode === "alert") {
    const parts: string[] = [];
    parts.push(
      `${activeAlerts} advertencia${activeAlerts !== 1 ? "s" : ""} activa${activeAlerts !== 1 ? "s" : ""}`,
    );
    if (utilizationPct != null && utilizationPct > 85) {
      parts.push(`ocupación alta (${Math.round(utilizationPct)}%)`);
    }
    return parts.join(" · ");
  }

  // calm
  const parts: string[] = [];
  parts.push(
    `${totalFacilities} espacio${totalFacilities !== 1 ? "s" : ""} operando normalmente`,
  );
  if (utilizationPct != null) {
    parts.push(`${Math.round(utilizationPct)}% utilización`);
  }
  return parts.join(" · ");
}

function buildModeLabel(mode: FacilitiesDashboardMode): string {
  switch (mode) {
    case "calm":
      return "El club late con normalidad";
    case "alert":
      return "Atención requerida";
    case "critical":
      return "Alerta crítica activa";
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILIZATION STATUS — Sense 3: MEMORIA
// ═══════════════════════════════════════════════════════════════

function getUtilizationStatus(
  pct: number,
): "critical" | "high" | "low" | "normal" {
  if (pct > 90) return "critical";
  if (pct > 80) return "high";
  if (pct < 30) return "low";
  return "normal";
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function FacilityPulse({
  ambientState,
  totalFacilities,
  activeAlerts,
  facilitiesAtRiskPct,
  crossDomainSignal,
  utilizationPct,
}: FacilityPulseProps) {
  const { mode, accent_color } = ambientState;

  // ── Narrative (Sense 7) ──
  const narrative = useMemo(
    () =>
      buildPulseNarrative(
        mode,
        totalFacilities,
        activeAlerts,
        facilitiesAtRiskPct,
        utilizationPct,
      ),
    [mode, totalFacilities, activeAlerts, facilitiesAtRiskPct, utilizationPct],
  );

  const modeLabel = useMemo(() => buildModeLabel(mode), [mode]);

  // ── Utilization status (Sense 3) ──
  const utilizationStatus = useMemo(() => {
    if (utilizationPct == null) return null;
    return getUtilizationStatus(utilizationPct);
  }, [utilizationPct]);

  return (
    <div
      className="glass-fac-pulse"
      data-mode={mode}
      style={{ "--fac-pulse-accent": accent_color } as React.CSSProperties}
    >
      {/* ── Mode Indicator ── */}
      <div className="glass-fac-pulse__mode" data-mode={mode}>
        <span className="glass-fac-pulse__mode-icon" aria-hidden="true">
          {MODE_ICONS[mode]}
        </span>
        <span className="glass-fac-pulse__mode-label">{modeLabel}</span>
      </div>

      {/* ── Narrative (Sense 7: NARRATIVA) ── */}
      <p className="glass-fac-pulse__narrative">
        {narrative}
      </p>

      {/* ── Metric Chips (Sense 2 + 3 + 5) ── */}
      <div className="glass-fac-pulse__chips">
        <span className="glass-fac-pulse__chip" data-chip="facilities">
          <span className="glass-fac-pulse__chip-value">{totalFacilities}</span>
          espacio{totalFacilities !== 1 ? "s" : ""}
        </span>

        {utilizationPct != null && (
          <span
            className="glass-fac-pulse__chip"
            data-chip="utilization"
            data-utilization={utilizationStatus ?? "normal"}
          >
            <span className="glass-fac-pulse__chip-value">
              {Math.round(utilizationPct)}%
            </span>
            util.
          </span>
        )}

        <span
          className="glass-fac-pulse__chip"
          data-chip="alerts"
          data-has-alerts={activeAlerts > 0 ? "true" : undefined}
        >
          <span className="glass-fac-pulse__chip-value">{activeAlerts}</span>
          alerta{activeAlerts !== 1 ? "s" : ""}
        </span>

        {facilitiesAtRiskPct > 0 && (
          <span
            className="glass-fac-pulse__chip"
            data-chip="at-risk"
            data-risk={facilitiesAtRiskPct > 30 ? "high" : facilitiesAtRiskPct > 15 ? "medium" : "low"}
          >
            <span className="glass-fac-pulse__chip-value">
              {Math.round(facilitiesAtRiskPct)}%
            </span>
            riesgo
          </span>
        )}
      </div>

      {/* ── Divider ── */}
      {crossDomainSignal && <div className="glass-fac-pulse__divider" />}

      {/* ── Cross-Domain Signal (Sense 4 + their SVG + title) ── */}
      {crossDomainSignal && (
        <div
          className="glass-fac-pulse__signal"
          data-severity={crossDomainSignal.severity}
        >
          <span className="glass-fac-pulse__signal-badge">
            {crossDomainSignal.domain}
          </span>
          <svg
            className="glass-fac-pulse__signal-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span
            className="glass-fac-pulse__signal-text"
            title={crossDomainSignal.signal}
          >
            {crossDomainSignal.signal}
          </span>
          <span className="glass-fac-pulse__signal-confidence">
            {Math.round(crossDomainSignal.confidence * 100)}%
          </span>
        </div>
      )}

      {/* ── Bottom Accent Bar (their version — Sense 1) ── */}
      <div className="glass-fac-pulse__accent-bar" aria-hidden="true" />
    </div>
  );
}