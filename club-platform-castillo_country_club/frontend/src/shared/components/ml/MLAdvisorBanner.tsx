// src/shared/components/ml/MLAdvisorBanner.tsx
/**
 * MLAdvisorBanner — Thin wrapper over generic AdvisorBanner.
 * Provides domain-specific layer config, title, accent, empty message.
 * This is the TRANSVERSAL advisor — covers all domains via ML Intelligence.
 */

import { AdvisorBanner } from "@/shared/components/AdvisorBanner";
import { Brain } from "lucide-react";

import type { BaseInsight } from "@/shared/components/AdvisorBanner";

// ═══ DOMAIN CONFIG ═════════════════════════════════════════════════════════

const LAYER_CONFIG = {
  health:     { label: "Modelos",     color: "var(--color-teal-400)" },
  prediction: { label: "Predicciones", color: "var(--color-amber-400)" },
  micro:      { label: "Insights",    color: "var(--color-emerald-400)" },
} as const;

// ═══ COMPONENT ═════════════════════════════════════════════════════════════

export function MLAdvisorBanner(props: {
  insights: BaseInsight[];
  topInsights: BaseInsight[];
  hasHighSeverity: boolean;
  onExecute?: (insight: BaseInsight) => void;
  className?: string;
}) {
  return (
    <AdvisorBanner
      {...props}
      layerConfig={LAYER_CONFIG}
      title="ML Intelligence Advisor"
      accentColor="var(--color-gold-400)"
      icon={Brain}
      emptyMessage="Modelos saludables, data quality óptima — sin anomalías."
    />
  );
}
