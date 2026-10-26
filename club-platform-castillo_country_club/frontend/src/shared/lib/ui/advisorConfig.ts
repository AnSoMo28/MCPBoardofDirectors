// src/shared/lib/ui/advisorConfig.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Shared Advisor UI Config
// Fase 25 — Centralized configs for Advisor banners
//
// Single source of truth for IMPACT_CONFIG, LAYER_CONFIG,
// and other shared Advisor UI constants.
// ═══════════════════════════════════════════════════════════

/** Impact badge config — used by all Advisor banners */
import type { AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

/**
 * Impact badge config — used by ALL Advisor banners.
 * SOURCE OF TRUTH for impact UI rendering.
 *
 * NOTE: ai-intelligence.ts has ADVISOR_IMPACT_DISPLAY which mirrors this
 * for type-system use. This file is the UI authority — if you change colors,
 * change them HERE. ADVISOR_IMPACT_DISPLAY will be deprecated in F47.
 */
export const IMPACT_CONFIG: Record<
  AdvisorImpactLevel,
  { label: string; color: string; bgColor: string; variant: "danger" | "warning" | "default"; sortOrder: number }
> = {
  high: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    variant: "danger",
    sortOrder: 0,
  },
  medium: {
    label: "Medio",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    variant: "warning",
    sortOrder: 1,
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
    variant: "default",
    sortOrder: 2,
  },
};
