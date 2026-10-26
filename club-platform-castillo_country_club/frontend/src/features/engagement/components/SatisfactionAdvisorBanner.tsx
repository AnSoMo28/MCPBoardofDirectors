// src/features/engagement/components/SatisfactionAdvisorBanner.tsx
/**
 * SatisfactionAdvisorBanner — Thin wrapper over generic AdvisorBanner.
 * Provides domain-specific layer config, title, accent, empty message.
 */

import { AdvisorBanner } from "@/shared/components/AdvisorBanner";
import { Star } from "lucide-react";

import type { BaseInsight } from "@/shared/components/AdvisorBanner";

// ═══ DOMAIN CONFIG ═════════════════════════════════════════════════════════

const LAYER_CONFIG = {
  health:       { label: "Salud",       color: "var(--color-emerald-400)" },
  prediction:   { label: "Tendencias",  color: "var(--color-teal-400)" },
  micro:        { label: "Insights",    color: "var(--color-amber-400)" },
  cross_domain: { label: "Cross-domain", color: "var(--color-gold-400)" },
} as const;

// ═══ COMPONENT ═════════════════════════════════════════════════════════════

export function SatisfactionAdvisorBanner(props: {
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
      title="Advisor de Satisfacción"
      accentColor="var(--color-amber-400)"
      icon={Star}
      emptyMessage="Satisfacción estable — todas las categorías en rango saludable."
    />
  );
}
