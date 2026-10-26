// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestAdvisorBanner.tsx
// Phase 34 "The Gateway" — Guest Advisor Banner (Rewrite)
// Level 6+ Agency · Production Grade
//
// Domain-specific wrapper over shared AdvisorBanner.
// Provides: layer config, title, accent, icon, empty message.
//
// Original: className prop, inline colors → BEM + CSS props
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   AdvisorBanner props: { insights(BaseInsight[]),
//     topInsights(BaseInsight[]), hasHighSeverity(boolean),
//     onExecute?(BaseInsight => void), layerConfig,
//     title(string), accentColor(string), icon(ComponentType),
//     emptyMessage(string) }                              ← AdvisorBanner ✅
//   BaseInsight { id, title, severity, layer,
//     action_label?, ... }                                ← AdvisorBanner types ✅
//
// ANTI-PATTERNS REMOVED: className prop, inline colors
// ═══════════════════════════════════════════════════════════

import { AdvisorBanner } from "@/shared/components/AdvisorBanner";
import { UserPlus } from "lucide-react";

import type { BaseInsight } from "@/shared/components/AdvisorBanner";

import "./GuestAdvisorBanner.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestAdvisorBannerProps {
  /** Advisor insights for guest domain. */
  readonly insights: readonly BaseInsight[];
  /** Top priority insights to surface. */
  readonly topInsights: readonly BaseInsight[];
  /** Whether any insight has high severity. */
  readonly hasHighSeverity: boolean;
  /** Called when user executes an insight action. */
  readonly onExecute?: (insight: BaseInsight) => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Layer config for guest domain advisor.
 * Colors via CSS custom properties — zero inline hex/rgb.
 */
const LAYER_CONFIG = {
  macro:        { label: "Funnel",       color: "var(--gst-adv-terracotta)" },
  lifecycle:    { label: "Pipeline",     color: "var(--gst-adv-teal)" },
  utilization:  { label: "Optimización", color: "var(--gst-adv-amber)" },
  cross_domain: { label: "Cross-domain", color: "var(--gst-adv-gold)" },
} as const;

// ═══════════════════════════════════════════════════════════
// §3 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Advisor Banner — domain-specific advisor wrapper.
 * Thin layer over shared AdvisorBanner with guest-domain config.
 *
 * @example
 * <GuestAdvisorBanner
 *   insights={advisor.insights}
 *   topInsights={advisor.topInsights}
 *   hasHighSeverity={advisor.hasHighSeverity}
 *   onExecute={handleExecute}
 * />
 */
export function GuestAdvisorBanner({
  insights,
  topInsights,
  hasHighSeverity,
  onExecute,
}: GuestAdvisorBannerProps) {
  return (
    <div
      className="gst-adv"
      role="region"
      aria-label="Advisor de invitados"
      data-testid="guest-advisor-banner"
    >
      <AdvisorBanner
        insights={[...insights]}
        topInsights={[...topInsights]}
        hasHighSeverity={hasHighSeverity}
        onExecute={onExecute}
        layerConfig={LAYER_CONFIG}
        title="Advisor de Invitados"
        accentColor="var(--gst-adv-terracotta)"
        icon={UserPlus}
        emptyMessage="Funnel de conversión saludable — sin alertas activas."
      />
    </div>
  );
}