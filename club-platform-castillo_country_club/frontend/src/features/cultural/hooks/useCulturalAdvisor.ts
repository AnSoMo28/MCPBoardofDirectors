/**
 * useCulturalAdvisor — Neural Advisor Hook
 *
 * Orchestrates 20 deterministic rules across 6 layers.
 * 0ms latency, 0 API calls — computed entirely client-side from cached data.
 *
 * Architecture (V2):
 * — Rules extracted to lib/advisor/ (7 modular files)
 * — Thresholds sourced from config.ts (no magic numbers)
 * — This hook imports rule collections and orchestrates execution
 * — Returns sorted CulturalAdvisorInsight[] by severity → impact
 *
 * Layers:
 * 1. Health (R1-R4, R16-R17) — diversity, venues, entertainment, density, mutations, resonance
 * 2. Engagement (R5-R8, R18) — attendance, enrollment, exhibitions, galas, journey stalls
 * 3. Strategy (R9-R12, R19) — seasonal, calendar fit, cost, revenue, venue mismatch
 * 4. Prediction (R13-R14) — demand forecast, budget trajectory
 * 5. Innovation (R15) — hidden revenue from cross-domain signals
 * 6. Intelligence (R16-R20) — engine-detected signals (mutations, resonance, journey, venue, cross-domain)
 *
 * V1 → V2 CHANGES:
 * — ~500 lines monolith → ~35 lines orchestrator + 7 modular rule files
 * — 25+ magic numbers → config-derived thresholds
 * — cats.sort() mutation fix → [...cats].sort() in rule files
 * — s.next_gala inconsistency → summary.next_gala fixed
 * — makeTrigger hardcoded → config-derived via ADVISOR_TRIGGER_CONFIG
 * — 15 rules → 20 rules (+5 intelligence-layer rules)
 *
 * @module cultural/hooks/useCulturalAdvisor
 */

import { useMemo } from 'react';

import type {
  CulturalSummary,
  CulturalAnalytics
} from '../types';
import type {
  CulturalAdvisorInsight,
  IntelligenceContext,
} from '../lib/advisor/types';
import { sortBySeverityImpact } from '../lib/advisor/helpers';

// ── Rule collections (each file exports typed arrays) ──
import { HEALTH_RULES, HEALTH_INTELLIGENCE_RULES } from '../lib/advisor/healthRules';
import { ENGAGEMENT_RULES, ENGAGEMENT_INTELLIGENCE_RULES } from '../lib/advisor/engagementRules';
import { STRATEGY_RULES, STRATEGY_INTELLIGENCE_RULES } from '../lib/advisor/strategyRules';
import { PREDICTION_RULES } from '../lib/advisor/predictionRules';
import { INNOVATION_RULES, INNOVATION_INTELLIGENCE_RULES } from '../lib/advisor/innovationRules';

// ══════════════════════════════════════════════════════════
//  HOOK PARAMETERS
// ══════════════════════════════════════════════════════════

/**
 * Parameters for useCulturalAdvisor.
 *
 * `summary` and `analytics` are the base inputs from the backend.
 * `intelligence` is optional — when provided, enables intelligence-layer
 * rules (R16-R20) that require engine-computed data.
 */
export interface UseCulturalAdvisorParams {
  summary: CulturalSummary | undefined;
  analytics: CulturalAnalytics | undefined;
  intelligence?: IntelligenceContext;
}

// ══════════════════════════════════════════════════════════
//  HOOK
// ══════════════════════════════════════════════════════════

/**
 * useCulturalAdvisor — 20 rules × 6 layers
 *
 * Consumes cached CulturalSummary + CulturalAnalytics + optional IntelligenceContext.
 * Returns insights sorted by severity (high → medium → low) then impact (desc).
 * Returns [] if data is not yet loaded.
 *
 * @example
 * // Basic usage (layers 1-5, rules R1-R15):
 * const insights = useCulturalAdvisor({ summary, analytics });
 *
 * @example
 * // Full intelligence (layers 1-6, rules R1-R20):
 * const insights = useCulturalAdvisor({
 *   summary,
 *   analytics,
 *   intelligence: {
 *     tasteMutations,
 *     resonanceScores,
 *     culturalJourney,
 *     venuePersonalities,
 *     crossDomainSignals,
 *   },
 * });
 */
export function useCulturalAdvisor(
  params: UseCulturalAdvisorParams,
):  CulturalAdvisorInsight[] {
  const { summary, analytics, intelligence } = params;

  return useMemo(() => {
    if (!summary || !analytics) return [];

    // ── Layers 1-5: Standard rules (summary + analytics only) ──
    const standardInsights: CulturalAdvisorInsight[] = [
      // Layer 1: Health
      ...HEALTH_RULES.map((rule) => rule(analytics, summary)),
      // Layer 2: Engagement
      ...ENGAGEMENT_RULES.map((rule) => rule(analytics, summary)),
      // Layer 3: Strategy
      ...STRATEGY_RULES.map((rule) => rule(analytics, summary)),
      // Layer 4: Prediction
      ...PREDICTION_RULES.map((rule) => rule(analytics, summary)),
      // Layer 5: Innovation
      ...INNOVATION_RULES.map((rule) => rule(analytics, summary)),
    ].filter(Boolean) as CulturalAdvisorInsight[];

    // ── Layer 6: Intelligence rules (require engine-computed context) ──
    let intelligenceInsights: CulturalAdvisorInsight[] = [];

    if (intelligence) {
      intelligenceInsights = [
        // Health intelligence (R16-R17)
        ...HEALTH_INTELLIGENCE_RULES.map((rule) =>
          rule(analytics, summary, intelligence),
        ),
        // Engagement intelligence (R18)
        ...ENGAGEMENT_INTELLIGENCE_RULES.map((rule) =>
          rule(analytics, summary, intelligence),
        ),
        // Strategy intelligence (R19)
        ...STRATEGY_INTELLIGENCE_RULES.map((rule) =>
          rule(analytics, summary, intelligence),
        ),
        // Innovation intelligence (R20)
        ...INNOVATION_INTELLIGENCE_RULES.map((rule) =>
          rule(analytics, summary, intelligence),
        ),
      ].filter(Boolean) as CulturalAdvisorInsight[];
    }

    // ── Merge + Sort ──
    const allInsights = [...standardInsights, ...intelligenceInsights];

    return sortBySeverityImpact(allInsights);
  }, [summary, analytics, intelligence]);
}