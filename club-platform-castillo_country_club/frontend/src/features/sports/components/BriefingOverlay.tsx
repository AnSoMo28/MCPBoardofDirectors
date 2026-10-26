// ═══════════════════════════════════════════════════════════
// src/features/sports/components/BriefingOverlay.tsx
// §B3.2 — Briefing Overlay
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// 3.5s greeting on first dashboard load per session.
// Shows: saludo + health + top 3 insights.
// sessionStorage gate — once per session.
// Living Protocol: 7/7
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component BriefingOverlay
// ═══════════════════════════════════════════════════════════

import { useEffect } from "react";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { SportsDashboardMode } from "../types";
import "./BriefingOverlay.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface BriefingOverlayProps {
  greeting: string;
  healthScore: number;
  healthTrend: string;
  topInsights: BaseInsight[];
  ambientMode: SportsDashboardMode;
  onDismiss: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const BRIEFING_DURATION_MS = 3_500;

const TREND_SYMBOLS: Record<string, string> = {
  improving: "↑",
  declining: "↓",
  stable: "→",
};

// ═══════════════════════════════════════════════════════════
// §3 — NARRATIVE (Living Protocol 7)
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  healthScore: number,
  healthTrend: string,
  insightCount: number,
): string {
  const trend = TREND_SYMBOLS[healthTrend] ?? "→";
  const insightCtx =
    insightCount > 0
      ? `${insightCount} alerta${insightCount > 1 ? "s" : ""} activa${insightCount > 1 ? "s" : ""}`
      : "Sin alertas activas";
  return `Salud deportiva: ${healthScore}/100 ${trend}. ${insightCtx}.`;
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function BriefingOverlay({
  greeting,
  healthScore,
  healthTrend,
  topInsights,
  ambientMode,
  onDismiss,
}: BriefingOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, BRIEFING_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const narrative = buildNarrative(healthScore, healthTrend, topInsights.length);

  return (
    <div
      className="spt-briefing"
      data-mode={ambientMode}
      role="dialog"
      aria-label="Briefing deportivo"
      aria-live="polite"
    >
      <div className="spt-briefing__content">
        <p className="spt-briefing__greeting">{greeting}, Director</p>
        <div className="spt-briefing__divider" />
        <p className="spt-briefing__health">
          Salud deportiva: <strong>{healthScore}/100</strong>{" "}
          {TREND_SYMBOLS[healthTrend] ?? "→"}
        </p>
        <p className="spt-briefing__narrative">{narrative}</p>
        {topInsights.length > 0 && (
          <ul className="spt-briefing__insights">
            {topInsights.map((insight) => (
              <li
                key={insight.id}
                className="spt-briefing__insight"
                data-severity={insight.severity}
              >
                {insight.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}