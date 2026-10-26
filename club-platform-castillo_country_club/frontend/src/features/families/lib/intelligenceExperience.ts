// ═══════════════════════════════════════════════════════════
// src/features/families/lib/intelligenceExperience.ts
// Phase 34+ Migration — Intelligence Experience Engine
// Level 6+ Agency · Production Grade
//
// Takes raw advisor insights and produces a structured
// "attention map" that tells components WHERE to render
// each insight and HOW to present it.
//
// This is the brain behind P7: "Intelligence Engine →
// Intelligence Experience". Pure function, zero side effects.
//
// PRE-WRITE VERIFICATION:
//   BaseInsight     → @/shared/components/AdvisorBanner ✅
//   FamilyDetailTab → ../hooks/useFamilyDetail.ts ✅
//   Family          → ../types.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - Insights rendered as flat list → severity-bucketed placement
//   - No narrative text → template-driven narratives
//   - No CTAs on insights → every insight has action slot
//   - No headline → single most important thing surfaced
//   - No deduplication → cross-insight action merging
//
// Design Principles:
//   P1  Narrative First   → generateNarrative()
//   P3  Every Insight CTA → suggestActions()
//   P7  Severity→Place    → bucketBySeverity()
// ═══════════════════════════════════════════════════════════

import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { FamilyDetailTab } from "../hooks/useFamilyDetail";
import type { Family } from "../types";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Where this insight appears in the UI hierarchy. */
export type AttentionPlacement =
  | "interrupt"    // Critical — persistent banner, blocks other content
  | "hero"         // High — large card, visible on load
  | "inline"       // Medium — suggestion row, easy to scan
  | "archive";     // Low — expandable "other observations"

/** An actionable CTA attached to an insight. */
export interface ActionSuggestion {
  readonly label: string;
  readonly variant: "primary" | "secondary" | "ghost";
  /** Tab to navigate to when clicked */
  readonly targetTab: FamilyDetailTab;
}

export interface AdvisorInsight extends BaseInsight {
  targetTab?: FamilyDetailTab;
}

/** A single insight enriched with presentation data. */
export interface AttentionSlot {
  /** The original advisor insight */
  readonly base: BaseInsight;
  /** Where to render it */
  readonly placement: AttentionPlacement;
  /** Human-readable narrative (P1: the story) */
  readonly narrative: string;
  /** Supporting data below narrative */
  readonly evidence: string;
  /** Actionable CTAs (P3: every insight has a button) */
  readonly ctas: readonly ActionSuggestion[];
  /** 0-1 confidence from the advisor engine */
  readonly confidence: number;
}

/**
 * The complete intelligence experience — a structured
 * attention map that tells components exactly what to
 * render where.
 */
export interface IntelligenceExperience {
  /** The single most important thing — rendered first */
  readonly headline: string;
  /** Icon for the headline */
  readonly headlineIcon: string;
  /** Primary CTA for the headline */
  readonly headlineCta?: ActionSuggestion;
  /** Critical insights — interrupt banners */
  readonly interrupts: readonly AttentionSlot[];
  /** High-severity insights — hero cards */
  readonly heroes: readonly AttentionSlot[];
  /** Medium-severity insights — inline suggestions */
  readonly inlines: readonly AttentionSlot[];
  /** Low-severity insights — expandable archive */
  readonly archived: readonly AttentionSlot[];
  /** Total insight count */
  readonly totalCount: number;
  /** Whether any insight is critical or high */
  readonly hasUrgent: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2  Severity Mapping
// ═══════════════════════════════════════════════════════════

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
  positive: 1,
};

const SEVERITY_PLACEMENT: Record<string, AttentionPlacement> = {
  critical: "interrupt",
  high: "hero",
  medium: "inline",
  low: "archive",
  info: "archive",
  positive: "inline",
};

// ═══════════════════════════════════════════════════════════
// §3  Narrative Templates (P1: Narrative First)
// ═══════════════════════════════════════════════════════════

/**
 * Generate a human-readable narrative for an insight.
 * The narrative is the FIRST thing the user reads —
 * it tells a story, not just reports a metric.
 *
 * Uses insight title + description + severity to
 * construct a contextual sentence.
 */
function generateNarrative(
  insight: BaseInsight,
  familyName: string,
): string {
  const name = familyName || "La familia";
  const severity = (insight.severity ?? "info") as
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "info"
    | "positive";

  // If the insight already has a rich description (>30 chars),
  // use it as the narrative base with family context
  if (insight.description && insight.description.length > 30) {
    return severity === "critical"
      ? `Atención inmediata: ${insight.description}`
      : severity === "high"
        ? `${name} — ${insight.description}`
        : insight.description;
  }

  // Otherwise, construct from title with severity framing
  const title = insight.title ?? "Observación";

  switch (severity) {
    case "critical":
      return `${name} necesita atención inmediata. ${title}.`;
    case "high":
      return `${name}: ${title.toLowerCase()}. Revisá esta situación.`;
    case "medium":
      return `${name}: ${title.toLowerCase()}.`;
    case "positive":
      return `Buena noticia para ${name}: ${title.toLowerCase()}.`;
    default:
      return `${title}.`;
  }
}

/**
 * Generate evidence text — supporting data below the narrative.
 * Uses insight description when narrative uses title, or
 * vice versa to avoid repetition.
 */
function generateEvidence(
  insight: BaseInsight,
  _familyName: string,
): string {
  // If description is short, it's likely evidence-level
  if (insight.description && insight.description.length <= 30) {
    return insight.description;
  }

  // If we used description for narrative, evidence is empty
  // (the user already has the full context)
  if (insight.description && insight.description.length > 30) {
    return "";
  }

  // Fallback: layer as context
  const layerLabel: Record<string, string> = {
    health: "Factor de salud",
    lifecycle: "Ciclo de vida",
    social: "Red social",
    financial: "Financiero",
    engagement: "Engagement",
  };

  return layerLabel[insight.layer] ?? "";
}

// ═══════════════════════════════════════════════════════════
// §4  CTA Suggestions (P3: Every Insight Has a Button)
// ═══════════════════════════════════════════════════════════

/**
 * Suggest 1-2 actionable CTAs for an insight.
 * Uses insight.layer + severity + targetTab to determine
 * the most useful actions.
 */
function suggestActions(
  insight: BaseInsight,
): readonly ActionSuggestion[] {
  const actions: ActionSuggestion[] = [];
  const severity = insight.severity ?? "info";
  const targetTab = (insight as BaseInsight & {
    targetTab?: FamilyDetailTab;
  }).targetTab;

  // Primary action: use the insight's suggested action
  if (insight.suggestedAction && targetTab) {
    actions.push({
      label: insight.suggestedAction,
      variant: "primary",
      targetTab,
    });
  }

  // Secondary action: contextual based on layer
  const layer = insight.layer ?? "";
  if (severity === "critical" || severity === "high") {
    if (layer === "engagement" || layer === "health") {
      if (!actions.some((a) => a.targetTab === "communication")) {
        actions.push({
          label: "Enviar mensaje",
          variant: "secondary",
          targetTab: "communication",
        });
      }
    }
    if (layer === "social") {
      if (!actions.some((a) => a.targetTab === "social")) {
        actions.push({
          label: "Ver conexiones",
          variant: "secondary",
          targetTab: "social",
        });
      }
    }
    if (layer === "financial") {
      if (!actions.some((a) => a.targetTab === "finances")) {
        actions.push({
          label: "Ver detalle financiero",
          variant: "secondary",
          targetTab: "finances",
        });
      }
    }
    if (layer === "lifecycle") {
      if (!actions.some((a) => a.targetTab === "overview")) {
        actions.push({
          label: "Ver timeline",
          variant: "secondary",
          targetTab: "overview",
        });
      }
    }
  }

  return actions;
}

// ═══════════════════════════════════════════════════════════
// §5  Main Function — buildIntelligenceExperience
// ═══════════════════════════════════════════════════════════

/**
 * Build the complete intelligence experience from raw insights.
 *
 * Takes advisor engine output and produces a structured attention
 * map that tells FamilyAdvisorBanner exactly WHAT to render WHERE.
 *
 * Pure function. No side effects. No hooks. No JSX.
 * Testable, predictable, deterministic.
 *
 * @param insights - Raw insights from useFamilyAdvisor
 * @param family - Family data for contextual narratives
 * @returns Structured intelligence experience
 *
 * @example
 * const experience = buildIntelligenceExperience(
 *   advisor.insights,
 *   data.family,
 * );
 * // experience.interrupts → render as persistent banners
 * // experience.heroes → render as large cards
 * // experience.inlines → render as suggestion rows
 * // experience.archived → render in expandable
 * // experience.headline → "Los García podrían irse"
 */
export function buildIntelligenceExperience(
  insights: readonly BaseInsight[],
  family: Family | null,
): IntelligenceExperience {
  const familyName = family?.familyName ?? "";

  if (insights.length === 0) {
    return {
      headline: "Sin observaciones",
      headlineIcon: "CheckCircle",
      interrupts: [],
      heroes: [],
      inlines: [],
      archived: [],
      totalCount: 0,
      hasUrgent: false,
    };
  }

  // ── Sort by severity (highest first) ──
  const sorted = [...insights].sort((a, b) => {
    const wa = SEVERITY_WEIGHT[a.severity] ?? 0;
    const wb = SEVERITY_WEIGHT[b.severity] ?? 0;
    return wb - wa;
  });

  // ── Enrich each insight with presentation data ──
  const slots: AttentionSlot[] = sorted.map((insight) => {
    const severity = insight.severity ?? "info";
    const placement = SEVERITY_PLACEMENT[severity] ?? "archive";

    return {
      base: insight,
      placement,
      narrative: generateNarrative(insight, familyName),
      evidence: generateEvidence(insight, familyName),
      ctas: suggestActions(insight),
      confidence: 1, // Default — advisor engine can override
    };
  });

  // ── Deduplicate CTAs across all slots ──
  // If two insights suggest "Enviar mensaje" to the same tab,
  // keep only the one from the higher-severity insight.
  const usedCtaKeys = new Set<string>();
  const dedupedSlots = slots.map((slot) => {
    const uniqueCtas = slot.ctas.filter((cta) => {
      const key = `${cta.label}:${cta.targetTab}`;
      if (usedCtaKeys.has(key)) return false;
      usedCtaKeys.add(key);
      return true;
    });
    return { ...slot, ctas: uniqueCtas };
  });

  // ── Bucket by placement ──
  const interrupts: AttentionSlot[] = [];
  const heroes: AttentionSlot[] = [];
  const inlines: AttentionSlot[] = [];
  const archived: AttentionSlot[] = [];

  for (const slot of dedupedSlots) {
    switch (slot.placement) {
      case "interrupt":
        interrupts.push(slot);
        break;
      case "hero":
        heroes.push(slot);
        break;
      case "inline":
        inlines.push(slot);
        break;
      case "archive":
        archived.push(slot);
        break;
    }
  }

  // ── Pick headline ──
  // The headline is the narrative of the highest-severity insight.
  const topSlot = dedupedSlots[0];
  const headline = topSlot.narrative;
  const topSeverity = (topSlot.base.severity ?? "info") as
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "info"
    | "positive";

  const headlineIcon = topSeverity === "critical" || topSeverity === "high"
    ? "AlertTriangle"
    : topSeverity === "positive"
      ? "CheckCircle"
      : "Info";
  const headlineCta = topSlot.ctas[0];

  const hasUrgent = interrupts.length > 0 || heroes.length > 0;

  return {
    headline,
    headlineIcon,
    headlineCta,
    interrupts,
    heroes,
    inlines,
    archived,
    totalCount: insights.length,
    hasUrgent,
  };
}