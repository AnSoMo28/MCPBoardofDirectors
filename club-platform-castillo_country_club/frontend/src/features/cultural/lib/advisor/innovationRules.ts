/**
 * Advisor Innovation Rules — Layer 5 (R15) + Layer 6 Intelligence (R20)
 *
 * Innovation rules detect hidden opportunities and cross-domain signals:
 *
 * R15 — Hidden Cultural Revenue: surfaces cross-domain signals from
 * the analytics engine that suggest untapped cultural revenue potential.
 *
 * R20 — Cross-Domain Opportunity: uses engine-computed intelligence
 * to detect synergy opportunities between Cultural and other modules
 * (Communication, Engagement, Facilities, Member360).
 *
 * These rules are "opportunity finders" — they fire when there's
 * something GOOD that could happen, not when something is BAD.
 * Severity is typically 'low' but impact can be significant.
 *
 * All functions are pure — no hooks, no state, no side effects.
 * All thresholds sourced from CULTURAL_ADVISOR_THRESHOLDS in config.ts.
 *
 * @module cultural/lib/advisor/innovationRules
 */

import { CULTURAL_ADVISOR_THRESHOLDS as T } from '../../config';
import { makeTrigger } from './helpers';
import type {
  AdvisorRuleFn,
  IntelligenceRuleFn
} from './types';
// ══════════════════════════════════════════════════════════
//  R15: HIDDEN CULTURAL REVENUE
// ══════════════════════════════════════════════════════════

/**
 * R15 — Hidden Cultural Revenue
 *
 * Always attempts to fire — the "opportunity radar" of the advisor.
 * Uses cross_domain_signals from the analytics engine to surface
 * revenue or engagement opportunities that aren't visible in
 * standard cultural metrics.
 *
 * These signals come from the backend AI agent (cultural_social_agent)
 * which analyzes cross-domain patterns that a single-module view misses.
 *
 * Examples of cross-domain signals:
 * — "Members who attend wine events also book spa treatments 3x more"
 * — "Gala attendees spend 40% more at the restaurant the same week"
 * — "Exhibition visitors who come on weekdays have 60% higher LTV"
 *
 * @param analytics — CulturalAnalytics with cross_domain_signals.
 * @returns Insight or null if no signals available.
 */
export const rule15_hidden_revenue: AdvisorRuleFn = (analytics) => {
  const signals = analytics.cross_domain_signals;
  if (signals.length === 0) return null;

  // Pick the most actionable signal (first = highest priority from backend)
  const topSignal = signals[0];

  // Additional context: how many signals total
  const signalCount = signals.length;
  const additionalContext = signalCount > 1
    ? ` (+${signalCount - 1} oportunidades adicionales detectadas)`
    : '';

  return {
    id: 'cultural-r15-hidden-revenue',
    severity: 'low',
    domain: 'cultural',
    layer: 'innovation',
    title: 'Oportunidad de revenue cultural no explotada',
    description: `${topSignal}${additionalContext}. Las señales cross-domain revelan patrones que la vista de un solo módulo no captura — hay revenue y engagement latentes que solo necesitan ser activados.`,
    impact: 55,
    confidence: 65,
    action: {
      label: 'Explorar propuestas culturales',
      server: 'cultural_social',
      tool: 'generate_cultural_proposals',
      params: { focus_area: 'lifestyle' },
    },
    trigger: makeTrigger('cultural-r15-hidden-revenue', {
      top_signal: topSignal,
      signal_count: signalCount,
      signals: signals.slice(0, 3),
    }),
  };
};

// ══════════════════════════════════════════════════════════
//  R20: CROSS-DOMAIN OPPORTUNITY (NEW — Intelligence Layer)
// ══════════════════════════════════════════════════════════

/**
 * R20 — Cross-Domain Opportunity
 *
 * Uses engine-computed intelligence to detect synergy opportunities
 * between Cultural and other modules in the ecosystem.
 *
 * This rule analyzes:
 * — CulturalStreamSignals from other modules (Communication, Engagement,
 *   Facilities, Member360) that mention cultural opportunities
 * — Taste mutations that could be leveraged by other modules
 * — Resonance scores that suggest content for Communication campaigns
 * — Venue personalities that match upcoming events from other modules
 *
 * This is the rule that makes Cultural a true "organism" — it sees
 * beyond its own boundaries and identifies where cultural intelligence
 * can create value in other parts of the system.
 *
 * @param _analytics — Unused.
 * @param _summary — Unused.
 * @param intelligence — Engine-computed context with crossDomainSignals,
 *   tasteMutations, resonanceScores, venuePersonalities.
 * @returns Insight or null if no cross-domain opportunities detected.
 */
export const rule20_cross_domain_opportunity: IntelligenceRuleFn = (
  _analytics,
  _summary,
  intelligence,
) => {
  const signals = intelligence.crossDomainSignals;
  if (signals.length < T.R20_CROSS_DOMAIN_MIN_SIGNALS) return null;

  // Classify signals by source module
  const bySource: Record<string, typeof signals> = {};
  for (const signal of signals) {
    const source = signal.source;
    if (!bySource[source]) {
      bySource[source] = [];
    }
    bySource[source].push(signal);
  }

  // Find the highest-priority cross-domain signal
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const sorted = [...signals].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
  );

  const topSignal = sorted[0];
  if (!topSignal) return null;

  // Count active sources (how many different modules are sending signals)
  const activeSources = Object.keys(bySource).length;

  // Build description based on signal sources
  const sourceLabels: Record<string, string> = {
    advisor: 'Advisor',
    proposal: 'Propuestas AI',
    mutation: 'Mutaciones de gusto',
    resonance: 'Resonancia experiencial',
    calendar: 'Calendario',
    cross_domain: 'Otros módulos',
  };

  const sourceList = Object.keys(bySource)
    .map((s) => sourceLabels[s] ?? s)
    .join(', ');

  // Determine severity based on top signal priority
  const severity = topSignal.priority === 'critical' || topSignal.priority === 'high'
    ? 'medium'
    : 'low';

  return {
    id: 'cultural-r20-cross-domain',
    severity,
    domain: 'cultural',
    layer: 'innovation',
    title: 'Oportunidad cross-domain detectada',
    description: `${signals.length} señal(es) de ${activeSources} módulo(s) (${sourceList}). La más significativa: "${topSignal.title}" — ${topSignal.description}. Cuando los módulos hablan entre sí, el club opera como un organismo integrado en vez de silos aislados.`,
    impact: Math.min(100, signals.length * 15 + activeSources * 10),
    confidence: 60,
    action: topSignal.action
      ? {
          label: topSignal.action.label,
          route: topSignal.action.route,
          server: topSignal.action.server,
          tool: topSignal.action.tool,
          params: topSignal.action.params,
        }
      : {
          label: 'Explorar oportunidad',
          server: 'cultural_social',
          tool: 'generate_cultural_proposals',
          params: { focus_area: 'all' },
        },
    trigger: makeTrigger('cultural-r20-cross-domain', {
      signal_count: signals.length,
      active_sources: activeSources,
      source_breakdown: Object.fromEntries(
        Object.entries(bySource).map(([src, sigs]) => [src, sigs.length]),
      ),
      top_signal: {
        title: topSignal.title,
        source: topSignal.source,
        priority: topSignal.priority,
      },
    }),
    intelligenceData: {
      signals: sorted.slice(0, 5).map((s) => ({
        id: s.id,
        source: s.source,
        priority: s.priority,
        title: s.title,
      })),
      activeSources,
      sourceBreakdown: bySource,
    },
  };
};

// ══════════════════════════════════════════════════════════
//  RULE COLLECTION
// ══════════════════════════════════════════════════════════

/** All innovation-layer standard rules (R15). */
export const INNOVATION_RULES: AdvisorRuleFn[] = [
  rule15_hidden_revenue,
];

/** All innovation-layer intelligence rules (R20). */
export const INNOVATION_INTELLIGENCE_RULES: IntelligenceRuleFn[] = [
  rule20_cross_domain_opportunity,
];