// src/shared/lib/riskTheme.ts
// Risk visualization theme — Silver Tide design system.
// Hex values for contexts requiring computed colors (inline styles, SVG).
// Parallels shared/lib/chartTheme.ts for risk-specific configurations.
//
// Token origin (global.css @theme):
//   --color-emerald-400:    #3DAA70  (éxito / positivo)
//   --color-teal-400:       #2A9AB5  (funcional / datos)
//   --color-gold-400:       #C9A96E  (acento primario / marca)
//   --color-silver-300:     #B8C0CC  (texto secondary)
//   --color-terracotta-400: #D47A5A  (tierra / charts)
//   --color-amber-400:      #D4A840  (warning)
//   --color-rose-400:       #C46470  (error / destructivo)
import { DollarSign, Cog, Building2, ClipboardCheck, Target, Monitor } from "lucide-react";
import type { LucideIcon } from "lucide-react";
// ── Types ──

export type RiskCategory =
  | "financial"
  | "operational"
  | "reputational"
  | "regulatory"
  | "strategic"
  | "technological";

export type RiskLevel = "low" | "medium" | "high" | "critical";

// ── Internal helper ──

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Category config ──
// Colors: Silver Tide semantic mapping per risk domain.
// Icons: emoji — consider Lucide React components for future consistency.

export const RISK_CATEGORY_CONFIG: Record<
  RiskCategory,
  { label: string; color: string; icon: LucideIcon }
> = {
  financial: {
    label: "Financiero",
    color: "#3DAA70", // --color-emerald-400
    icon: DollarSign,
  },
  operational: {
    label: "Operativo",
    color: "#2A9AB5", // --color-teal-400
    icon: Cog,
  },
  reputational: {
    label: "Reputacional",
    color: "#C9A96E", // --color-gold-400
    icon: Building2,
  },
  regulatory: {
    label: "Regulatorio",
    color: "#B8C0CC", // --color-silver-300
    icon: ClipboardCheck,
  },
  strategic: {
    label: "Estratégico",
    color: "#D47A5A", // --color-terracotta-400
    icon: Target,
  },
  technological: {
    label: "Tecnológico",
    color: "#2A9AB5", // --color-teal-400
    icon: Monitor,
  },
};

// ── Level config ──
// Escalating severity: emerald → amber → terracotta → rose.
// Backgrounds: withAlpha at 12-18% following project pattern.

export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string }
> = {
  low: {
    label: "Bajo",
    color: "#3DAA70", // --color-emerald-400
    bgColor: withAlpha("#3DAA70", 0.12),
  },
  medium: {
    label: "Medio",
    color: "#D4A840", // --color-amber-400
    bgColor: withAlpha("#D4A840", 0.12),
  },
  high: {
    label: "Alto",
    color: "#D47A5A", // --color-terracotta-400
    bgColor: withAlpha("#D47A5A", 0.15),
  },
  critical: {
    label: "Crítico",
    color: "#C46470", // --color-rose-400
    bgColor: withAlpha("#C46470", 0.18),
  },
};

// ── Axis labels ──

export const PROBABILITY_LABELS: Record<number, string> = {
  1: "Rara",
  2: "Posible",
  3: "Probable",
  4: "Casi segura",
};

export const IMPACT_LABELS: Record<number, string> = {
  1: "Menor",
  2: "Moderado",
  3: "Mayor",
  4: "Crítico",
};

// ── Cell helpers (heatmap score → visual) ──

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 13) return "critical";
  if (score >= 9) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function getRiskCellColor(score: number): string {
  return RISK_LEVEL_CONFIG[getRiskLevel(score)].color;
}

export function getRiskCellBg(score: number): string {
  return RISK_LEVEL_CONFIG[getRiskLevel(score)].bgColor;
}
