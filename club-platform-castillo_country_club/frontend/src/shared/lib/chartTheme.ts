// src/shared/lib/chartTheme.ts
// ═══════════════════════════════════════════════════════════
// Recharts Theme — Silver Tide Design System
//
// Recharts SVG attributes require hex values, not CSS vars.
// These constants map 1:1 to Silver Tide tokens.
// Update BOTH sides when changing the design system.
// ═══════════════════════════════════════════════════════════

import type { CSSProperties } from "react";

/** Core chart colors mapped to Silver Tide hex tokens */
export const CHART = {
  axisTick: "#8A95A5",
  axisLabel: "#B8C0CC",
  tooltipBg: "#1C2230",
  tooltipText: "#D8DCE4",
  tooltipBorder: "rgba(255,255,255,0.08)",
  gridStroke: "rgba(255,255,255,0.06)",
  cursorFill: "rgba(255,255,255,0.03)",
} as const;

/** Named palette — semantic chart series */
export const CHART_PALETTE = {
  gold: "#C9A96E",
  terracotta: "#D47A5A",
  sage: "#5B8A6A",
  teal: "#2A9AB5",
  rose: "#C46470",
  emerald: "#3DAA70",
  amber: "#D4A840",
  silver: "#B8C0CC",
} as const;

/** Default color sequence for multi-series */
export const CHART_COLORS = [
  CHART_PALETTE.gold,
  CHART_PALETTE.terracotta,
  CHART_PALETTE.sage,
  CHART_PALETTE.teal,
  CHART_PALETTE.rose,
  CHART_PALETTE.emerald,
] as const;

/** Reusable Tooltip contentStyle — solid surface for data pages */
export const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: 8,
  color: CHART.tooltipText,
  fontSize: 13,
  fontFamily: "var(--font-ui, 'DM Sans')",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

/** Axis tick defaults */
export const AXIS_TICK = {
  fontSize: 11,
  fill: CHART.axisTick,
} as const;
