// ═══════════════════════════════════════════════════════════
// Ambient State — Financial Dashboard Atmosphere Engine
// Derives mode/colores/intensity from health score.
// Syncs CSS custom properties for WebGL + vignette.
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import type { AiFinancialReport } from "../types";
import { HEALTH_GRADE_CONFIG } from "../types";

export type AmbientMode = "serene" | "alert" | "critical";

export interface AmbientState {
  mode: AmbientMode;
  healthScore: number;
  healthGrade: string;
  primaryColor: string;
  pulseSpeed: string;
  vignetteOpacity: number;
  fluidIntensity: number;
  criticalCount: number;
  highCount: number;
  hasUrgentInsights: boolean;
  /** Trend direction: positive = improving, negative = declining */
  trend: number;
}

const MODE_DEFAULTS: Record<
  AmbientMode,
  { pulseSpeed: string; vignetteOpacity: number; fluidIntensity: number }
> = {
  serene: { pulseSpeed: "4s", vignetteOpacity: 0.02, fluidIntensity: 0.3 },
  alert: { pulseSpeed: "2.5s", vignetteOpacity: 0.05, fluidIntensity: 0.6 },
  critical: { pulseSpeed: "1.5s", vignetteOpacity: 0.09, fluidIntensity: 1.0 },
};

const EMPTY_STATE: AmbientState = {
  mode: "serene",
  healthScore: 0,
  healthGrade: "—",
  primaryColor: "var(--color-teal-400)",
  pulseSpeed: "4s",
  vignetteOpacity: 0.02,
  fluidIntensity: 0.3,
  criticalCount: 0,
  highCount: 0,
  hasUrgentInsights: false,
  trend: 0,
};

export function useAmbientState(
  report: AiFinancialReport | null,
): AmbientState {
  const state = useMemo<AmbientState>(() => {
    if (!report) return EMPTY_STATE;

    const { health_score, financial_anomalies } = report;
    const score = health_score.total;
    const grade = health_score.grade;
    const trend = health_score.trend_vs_previous;

    const criticalCount = financial_anomalies.filter(
      (a) => a.severity === "critical",
    ).length;
    const highCount = financial_anomalies.filter(
      (a) => a.severity === "high",
    ).length;

    let mode: AmbientMode = "serene";
    if (criticalCount > 0 || score < 50) mode = "critical";
    else if (highCount > 0 || score < 70) mode = "alert";

    const defaults = MODE_DEFAULTS[mode];
    const gradeCfg = HEALTH_GRADE_CONFIG[grade];
    const primaryColor = gradeCfg?.color ?? "var(--color-teal-400)";

    return {
      mode,
      healthScore: score,
      healthGrade: grade,
      primaryColor,
      pulseSpeed: defaults.pulseSpeed,
      vignetteOpacity: defaults.vignetteOpacity,
      fluidIntensity: defaults.fluidIntensity,
      criticalCount,
      highCount,
      hasUrgentInsights: criticalCount > 0 || highCount > 0,
      trend,
    };
  }, [report]);

  // Sync CSS custom properties to :root
  // WebGLBackground and vignette read these
  useEffect(() => {
    const root = document.documentElement;
    const props: Array<[string, string]> = [
      ["--ambient-mode", state.mode],
      ["--ambient-intensity", String(state.fluidIntensity)],
      ["--ambient-pulse-speed", state.pulseSpeed],
      ["--ambient-primary", state.primaryColor],
      ["--ambient-vignette", String(state.vignetteOpacity)],
    ];

    props.forEach(([k, v]) => root.style.setProperty(k, v));

    return () => {
      props.forEach(([k]) => root.style.removeProperty(k));
    };
  }, [state]);

  return state;
}