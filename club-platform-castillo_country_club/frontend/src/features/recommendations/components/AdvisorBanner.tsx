// src/features/recommendations/components/AdvisorBanner.tsx
/**
 * RecommendationAdvisorBanner — Thin wrapper over generic AdvisorBanner.
 * Provides domain-specific layer config, title, accent, empty message.
 *
 * Migrated from custom implementation (F10) to generic pattern (F47).
 * Previously: 170 lines with custom InsightCard, IMPACT_CONFIG, etc.
 * Now: 35-line thin wrapper over shared AdvisorBanner.
 *
 * Pattern: P40 (Generic AdvisorBanner)
 */

import { Lightbulb } from "lucide-react";
import './AdvisorBanner.css';
import {
  AdvisorBanner,
  type BaseInsight,
} from "@/shared/components/AdvisorBanner";

// ═══ LAYER CONFIG ═══════════════════════════════════════════════════════════

const LAYER_CONFIG: Record<string, { label: string; color: string }> = {
  macro:      { label: "Acciones",    color: "var(--color-gold-400)" },
  prediction: { label: "Informes",    color: "var(--color-amber-400)" },
  health:     { label: "Alertas",     color: "var(--color-rose-400)" },
  lifecycle:  { label: "Backlog",     color: "var(--color-teal-400)" },
};

// ═══ WRAPPER ═══════════════════════════════════════════════════════════════

interface RecommendationAdvisorBannerProps {
  insights: BaseInsight[];
  topInsights: BaseInsight[];
  hasHighSeverity: boolean;
  onExecute?: (insight: BaseInsight) => void;
  className?: string;
}

export function RecommendationAdvisorBanner({
  insights,
  topInsights,
  hasHighSeverity,
  onExecute,
  className,
}: RecommendationAdvisorBannerProps) {
  return (
    <AdvisorBanner
      insights={insights}
      topInsights={topInsights}
      hasHighSeverity={hasHighSeverity}
      layerConfig={LAYER_CONFIG}
      title="Advisor Proactivo"
      accentColor="var(--color-gold-400)"
      icon={Lightbulb}
      emptyMessage="Sin acciones recomendadas — todo bajo control."
      onExecute={onExecute}
      className={`advisor-banner ${className}`}
    />
  );
}