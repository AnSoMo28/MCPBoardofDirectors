// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsAdvisorBanner.tsx
// §B4.1 — Sports Advisor Banner V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Thin wrapper over shared AdvisorBanner. Domain-specific
// config for sports layer labels and accent color.
//
// Changes from V1:
//   ✗ className prop → removed
//   ✓ LAYER_CONFIG with 5 sports layers
//   ✓ accentColor: teal for sports domain
//   ✓ Pattern verified: thin wrapper over shared component
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsAdvisorBanner
// ═══════════════════════════════════════════════════════════

import { Activity } from "lucide-react";
import {
  AdvisorBanner,
  type BaseInsight,
} from "@/shared/components/AdvisorBanner";

// ═══════════════════════════════════════════════════════════
// §1 — LAYER CONFIG
// ═══════════════════════════════════════════════════════════

const LAYER_CONFIG: Record<string, { label: string; color: string }> = {
  micro:       { label: "Contexto",     color: "var(--color-silver-400)" },
  macro:       { label: "Reactivo",     color: "var(--color-rose-400)" },
  prediction:  { label: "Preventivo",   color: "var(--color-amber-400)" },
  utilization: { label: "Optimización", color: "var(--color-teal-400)" },
  innovation:  { label: "Proactivo",    color: "var(--color-emerald-400)" },
};

// ═══════════════════════════════════════════════════════════
// §2 — PROPS
// ═══════════════════════════════════════════════════════════

export interface SportsAdvisorBannerProps {
  insights: BaseInsight[];
  topInsights: BaseInsight[];
  hasHighSeverity: boolean;
  onExecute?: (insight: BaseInsight) => void;
}

// ═══════════════════════════════════════════════════════════
// §3 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsAdvisorBanner({
  insights,
  topInsights,
  hasHighSeverity,
  onExecute,
}: SportsAdvisorBannerProps) {
  return (
    <AdvisorBanner
      insights={insights}
      topInsights={topInsights}
      hasHighSeverity={hasHighSeverity}
      layerConfig={LAYER_CONFIG}
      title="Advisor Deportivo"
      accentColor="var(--color-teal-400)"
      icon={Activity}
      emptyMessage="La arena deportiva está funcionando óptimamente."
      onExecute={onExecute}
    />
  );
}