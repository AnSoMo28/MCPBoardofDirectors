/**
 * EngagementAdvisorBanner — P40 thin wrapper
 *
 * Thin domain wrapper over generic AdvisorBanner.
 * Layer config: diagnostic, predictive, prescriptive, cross_domain.
 * ~45 lines — no logic, pure configuration + passthrough.
 *
 * Consumes insights from useMemberEngagementAdvisor.
 *
 * Rules: #1 tokens (via AdvisorBanner), #5 production-grade,
 *        #17 Button (via AdvisorBanner)
 */

import { Activity } from "lucide-react";
import { AdvisorBanner, type BaseInsight } from "@/shared/components/AdvisorBanner";
import type { EngInsight } from "../hooks/useMemberEngagementAdvisor";

const ENGAGEMENT_LAYER_CONFIG: Record<string, { label: string; color: string }> = {
  diagnostic: { label: "Diagnóstico", color: "var(--color-amber-400)" },
  predictive: { label: "Predictivo", color: "var(--color-teal-400)" },
  prescriptive: { label: "Prescriptivo", color: "var(--color-emerald-400)" },
  cross_domain: { label: "Cross-domain", color: "var(--color-gold-400)" },
};

interface EngagementAdvisorBannerProps {
  insights: EngInsight[];
  topInsights: EngInsight[];
  hasHighSeverity: boolean;
  onExecute?: (insight: EngInsight) => void;
  className?: string;
}

export function EngagementAdvisorBanner({
  insights,
  topInsights,
  hasHighSeverity,
  onExecute,
  className,
}: EngagementAdvisorBannerProps) {
  return (
    <AdvisorBanner<BaseInsight>
      insights={insights as BaseInsight[]}
      topInsights={topInsights as BaseInsight[]}
      hasHighSeverity={hasHighSeverity}
      layerConfig={ENGAGEMENT_LAYER_CONFIG}
      title="Engagement Advisor"
      accentColor="var(--color-gold-400)"
      icon={Activity}
      emptyMessage="Engagement estable — sin alertas activas."
      onExecute={onExecute as ((insight: BaseInsight) => void) | undefined}
      className={className}
    />
  );
}
