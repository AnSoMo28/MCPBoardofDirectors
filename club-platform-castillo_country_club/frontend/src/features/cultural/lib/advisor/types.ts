/**
 * Advisor Types — Cultural Domain
 *
 * Type definitions for the Cultural Advisor Engine.
 * Separated from hooks/engines for independent import and testability.
 *
 * Architecture:
 * - 6 layers × 20 rules
 * - Each rule is a pure function: (data) → CulturalAdvisorInsight | null
 * - Insights are sorted by severity → impact before presentation
 *
 * @module cultural/lib/advisor/types
 */

import type {
  CulturalSummary,
  CulturalAnalytics,
  TasteMutation,
  ResonanceScore,
  CulturalJourney,
  VenuePersonality,
  CulturalStreamSignal,
} from '../../types';

// ══════════════════════════════════════════════════════════
//  1. CORE INSIGHT TYPE
// ══════════════════════════════════════════════════════════

/**
 * Severity levels for advisor insights.
 * Determines visual urgency and sort priority.
 */
export type AdvisorSeverity = 'high' | 'medium' | 'low';

/**
 * Advisory layers — organizes insights by analytical domain.
 *
 * health      → Cultural programming health (diversity, venues, entertainment, density)
 * engagement  → Member engagement metrics (attendance, enrollment, exhibitions, galas)
 * strategy    → Strategic considerations (seasonal, cross-domain, cost, revenue)
 * prediction  → Forward-looking predictions (demand, budget trajectory)
 * innovation  → Hidden opportunities and cross-domain signals
 * intelligence → AI-detected intelligence (mutations, resonance, journey, venue match)
 */
export type AdvisorLayer =
  | 'health'
  | 'engagement'
  | 'strategy'
  | 'prediction'
  | 'innovation'
  | 'intelligence';

/**
 * Action that the insight recommends.
 *
 * Can be a route navigation, an MCP tool call, or both.
 * The DecisionStage component renders these as action buttons.
 */
export interface InsightAction {
  /** Human-readable label for the action button. */
  label: string;
  /** Client-side route to navigate to. */
  route?: string;
  /** MCP server to call (requires tool). */
  server?: string;
  /** MCP tool to invoke (requires server). */
  tool?: string;
  /** Parameters for the MCP tool call. */
  params?: Record<string, unknown>;
}

/**
 * Trigger data for AI narrative generation.
 *
 * When an insight fires, it can optionally request the backend
 * to generate a richer narrative using this context.
 */
export interface InsightTrigger {
  /** MCP server for narrative generation. */
  server: string;
  /** MCP tool for narrative generation. */
  tool: string;
  /** Parameters sent to the narrative engine. */
  params: Record<string, unknown>;
  /** Raw insight data for the narrative engine to elaborate on. */
  insightData: Record<string, unknown>;
}

/**
 * A single advisor insight — the fundamental unit of advisory intelligence.
 *
 * Each insight represents a deterministic observation derived from
 * backend data. Insights are NOT AI-generated — they are rule-based.
 * The AI narrative generation happens AFTER the insight fires,
 * via the trigger mechanism.
 */
export interface CulturalAdvisorInsight {
  /** Unique identifier for this insight (e.g., 'cultural-r1-diversity'). */
  id: string;
  /** Visual urgency level. */
  severity: AdvisorSeverity;
  /** Domain — always 'cultural' for this module. */
  domain: 'cultural';
  /** Analytical layer this insight belongs to. */
  layer: AdvisorLayer;
  /** Short, actionable title (Spanish). */
  title: string;
  /** Detailed explanation with context and data points (Spanish). */
  description: string;
  /** Impact score 0-100. Higher = more impactful. */
  impact: number;
  /** Confidence in this insight 0-100. Based on data volume. */
  confidence: number;
  /** Recommended action (optional — not all insights have actions). */
  action?: InsightAction;
  /** Trigger for AI narrative generation (optional). */
  trigger?: InsightTrigger;
  /**
   * Optional structured data from the intelligence layer.
   * Used by R16-R20 to pass engine-computed data alongside the insight.
   */
  intelligenceData?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════
//  2. RULE FUNCTION SIGNATURES
// ══════════════════════════════════════════════════════════

/**
 * Standard rule function signature.
 * Takes backend data, returns an insight or null (no issue detected).
 */
export type AdvisorRuleFn = (
  analytics: CulturalAnalytics,
  summary: CulturalSummary,
) => CulturalAdvisorInsight | null;

/**
 * Intelligence rule function signature.
 * Extended input — takes engine-computed intelligence alongside backend data.
 * Used by R16-R20 which need tasteProfile, resonanceScores, etc.
 */
export type IntelligenceRuleFn = (
  analytics: CulturalAnalytics,
  summary: CulturalSummary,
  intelligence: IntelligenceContext,
) => CulturalAdvisorInsight | null;

/**
 * Context provided to intelligence-layer rules (R16-R20).
 * Contains engine-computed data that basic rules don't have access to.
 */
export interface IntelligenceContext {
  tasteMutations: TasteMutation[];
  resonanceScores: ResonanceScore[];
  culturalJourney: CulturalJourney | null;
  venuePersonalities: VenuePersonality[];
  crossDomainSignals: CulturalStreamSignal[];
}

// ══════════════════════════════════════════════════════════
//  3. RULE REGISTRY TYPES
// ══════════════════════════════════════════════════════════

/**
 * Metadata for a rule in the advisor registry.
 * Used for documentation and debugging.
 */
export interface RuleMetadata {
  /** Rule identifier (e.g., 'cultural-r1-diversity'). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Layer this rule belongs to. */
  layer: AdvisorLayer;
  /** Brief description of what this rule detects. */
  description: string;
  /** Data sources this rule depends on. */
  dependencies: ('summary' | 'analytics' | 'intelligence')[];
}

/**
 * A complete rule definition — metadata + execution function.
 */
export interface AdvisorRuleDefinition {
  metadata: RuleMetadata;
  execute: AdvisorRuleFn | IntelligenceRuleFn;
}

// ══════════════════════════════════════════════════════════
//  4. SORTING & FILTERING TYPES
// ══════════════════════════════════════════════════════════

/**
 * Severity sort order — high severity sorts first.
 */
export const SEVERITY_ORDER: Record<AdvisorSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Layer sort order — determines default presentation order
 * when severity and impact are equal.
 */
export const LAYER_ORDER: Record<AdvisorLayer, number> = {
  health: 0,
  engagement: 1,
  strategy: 2,
  prediction: 3,
  innovation: 4,
  intelligence: 5,
};

/**
 * Filter options for the intelligence stream.
 */
export interface InsightFilter {
  /** Show only insights from these layers. */
  layers?: AdvisorLayer[];
  /** Show only insights with this minimum severity. */
  minSeverity?: AdvisorSeverity;
  /** Show only insights with this minimum impact. */
  minImpact?: number;
  /** Search term for title/description. */
  search?: string;
}

// ══════════════════════════════════════════════════════════
//  5. AGGREGATE TYPES
// ══════════════════════════════════════════════════════════

/**
 * Summary statistics for a set of insights.
 * Used by the DecisionStage to determine dashboard mode.
 */
export interface InsightAggregate {
  /** Total number of active insights. */
  total: number;
  /** Count by severity. */
  bySeverity: Record<AdvisorSeverity, number>;
  /** Count by layer. */
  byLayer: Record<AdvisorLayer, number>;
  /** Highest impact insight (for hero display). */
  topInsight: CulturalAdvisorInsight | null;
  /** Average confidence across all insights. */
  avgConfidence: number;
  /** Whether any insight has a critical action. */
  hasCriticalAction: boolean;
}

/**
 * Computes aggregate statistics from a list of insights.
 * Pure function — no hooks, no side effects.
 */
export function computeInsightAggregate(
  insights: CulturalAdvisorInsight[],
): InsightAggregate {
  const bySeverity: Record<AdvisorSeverity, number> = { high: 0, medium: 0, low: 0 };
  const byLayer: Record<AdvisorLayer, number> = {
    health: 0, engagement: 0, strategy: 0,
    prediction: 0, innovation: 0, intelligence: 0,
  };

  let topInsight: CulturalAdvisorInsight | null = null;
  let totalConfidence = 0;
  let hasCriticalAction = false;

  for (const insight of insights) {
    bySeverity[insight.severity] += 1;
    byLayer[insight.layer] += 1;
    totalConfidence += insight.confidence;

    if (!topInsight || insight.impact > topInsight.impact) {
      topInsight = insight;
    }

    if (insight.severity === 'high' && insight.action) {
      hasCriticalAction = true;
    }
  }

  return {
    total: insights.length,
    bySeverity,
    byLayer,
    topInsight,
    avgConfidence: insights.length > 0
      ? Math.round(totalConfidence / insights.length)
      : 0,
    hasCriticalAction,
  };
}