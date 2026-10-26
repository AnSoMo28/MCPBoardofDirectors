/**
 * Advisor Strategy Rules — Layer 3 (R9-R12) + Intelligence (R19)
 *
 * Strategy rules assess structural and strategic considerations:
 * seasonal alignment, cross-domain calendar fit, entertainment cost
 * efficiency, and budget diversification.
 *
 * Intelligence rule R19 assesses venue-event matching — whether events
 * are being held in venues whose personality aligns with the event type.
 *
 * All functions are pure — no hooks, no state, no side effects.
 * All thresholds sourced from CULTURAL_ADVISOR_THRESHOLDS in config.ts.
 *
 * @module cultural/lib/advisor/strategyRules
 */

import { CULTURAL_ADVISOR_THRESHOLDS as T } from '../../config';
import type {
  AdvisorRuleFn,
  IntelligenceRuleFn,
} from './types';
import {
  normalizedDiversityScore,
  makeTrigger,
  impactFromThreshold
} from './helpers';

// ══════════════════════════════════════════════════════════
//  R9: SEASONAL ALIGNMENT
// ══════════════════════════════════════════════════════════

/**
 * R9 — Seasonal Alignment
 *
 * Checks whether cultural programming aligns with the current season.
 * Costa Rica has distinct seasons (dry, rainy, holiday) that affect
 * member availability and preferences.
 *
 * Two sub-checks:
 * 1. No programming for current season → strategic gap
 * 2. Low enrollment in current season's programs → positioning issue
 *
 * @param analytics — CulturalAnalytics with seasonal_patterns data.
 * @returns Insight or null if seasonal alignment is healthy.
 */
export const rule9_seasonal: AdvisorRuleFn = (analytics) => {
  const currentSeason = analytics.current_season;
  if (!currentSeason) return null;

  const seasonData = analytics.seasonal_patterns.find(
    (sp) => sp.season === currentSeason,
  );

  // Sub-check 1: No programming for current season
  if (!seasonData || seasonData.program_count === 0) {
    return {
      id: 'cultural-r9-no-season',
      severity: 'high',
      domain: 'cultural',
      layer: 'strategy',
      title: `Sin programación para ${currentSeason}`,
      description: `No hay programas culturales para la temporada actual (${currentSeason}). Cada temporada tiene características únicas que la programación cultural debe aprovechar — la ausencia de programas estacionales es una oportunidad desperdiciada.`,
      impact: 75,
      confidence: 85,
      action: {
        label: 'Crear programa estacional',
        server: 'cultural_social',
        tool: 'manage_cultural_program',
        params: { action: 'create' },
      },
      trigger: makeTrigger('cultural-r9-no-season', {
        season: currentSeason,
      }),
    };
  }

  // Sub-check 2: Low enrollment in current season
  if (seasonData.enrollment_rate < T.R9_SEASON_ENROLLMENT_MIN) {
    return {
      id: 'cultural-r9-low-season',
      severity: 'medium',
      domain: 'cultural',
      layer: 'strategy',
      title: `Temporada ${currentSeason} con baja inscripción`,
      description: `Inscripción promedio de la temporada: ${seasonData.enrollment_rate.toFixed(0)}%. ${
        seasonData.top_category
          ? `La categoría principal (${seasonData.top_category}) necesita mejor posicionamiento.`
          : 'Los programas necesitan mejor posicionamiento para la audiencia correcta.'
      }`,
      impact: impactFromThreshold(
        seasonData.enrollment_rate,
        T.R9_SEASON_ENROLLMENT_MIN,
      ),
      confidence: 75,
      trigger: makeTrigger('cultural-r9-low-season', {
        season: currentSeason,
        enrollment_rate: seasonData.enrollment_rate,
        top_category: seasonData.top_category,
        program_count: seasonData.program_count,
      }),
    };
  }

  return null;
};

// ══════════════════════════════════════════════════════════
//  R10: CROSS-DOMAIN CALENDAR FIT
// ══════════════════════════════════════════════════════════

/**
 * R10 — Cross-Domain Calendar Fit
 *
 * Evaluates the two-week calendar window for saturation or emptiness.
 * Too many events compete with each other (cannibalization).
 * Too few events make the club feel inactive.
 *
 * Two sub-checks:
 * 1. Saturation: more than 10 events in 2 weeks
 * 2. Empty: 0 events in 2 weeks
 *
 * @param _analytics — Unused.
 * @param summary — CulturalSummary with weekly event counts.
 * @returns Insight or null if calendar fit is healthy.
 */
export const rule10_calendar_fit: AdvisorRuleFn = (_analytics, summary) => {
  const total = summary.events_this_week + summary.events_next_week;

  // Sub-check 1: Saturation
  if (total > T.R10_SATURATION_2WEEK) {
    return {
      id: 'cultural-r10-saturation',
      severity: 'high',
      domain: 'cultural',
      layer: 'strategy',
      title: 'Saturación cultural — fatiga del socio',
      description: `${summary.events_this_week} + ${summary.events_next_week} eventos en 2 semanas (${total} total). Los socios tienen tiempo limitado — demasiados eventos compiten entre sí y la asistencia se diluye. Redistribuir hacia semanas más adelante.`,
      impact: Math.min(100, (total - T.R10_SATURATION_2WEEK + 2) * 12),
      confidence: 80,
      action: {
        label: 'Revisar calendario',
        route: '/admin/cultural',
      },
      trigger: makeTrigger('cultural-r10-saturation', {
        events_this_week: summary.events_this_week,
        events_next_week: summary.events_next_week,
        total_2week: total,
      }),
    };
  }

  // Sub-check 2: Empty
  if (total === 0) {
    return {
      id: 'cultural-r10-empty',
      severity: 'medium',
      domain: 'cultural',
      layer: 'strategy',
      title: 'Dos semanas sin actividad cultural',
      description:
        'Sin eventos esta semana ni la próxima. El club pierde relevancia como espacio de encuentro social — los socios buscan alternativas fuera. Incluso un evento pequeño mantiene el pulso cultural vivo.',
      impact: 55,
      confidence: 85,
      action: {
        label: 'Crear evento rápido',
        server: 'cultural_social',
        tool: 'generate_cultural_proposals',
        params: { focus_area: 'events' },
      },
      trigger: makeTrigger('cultural-r10-empty', {}),
    };
  }

  return null;
};

// ══════════════════════════════════════════════════════════
//  R11: ENTERTAINMENT COST EFFICIENCY
// ══════════════════════════════════════════════════════════

/**
 * R11 — Entertainment Cost Efficiency
 *
 * Identifies entertainment types that exceed the cost-per-minute
 * threshold. High cost per minute doesn't necessarily mean bad —
 * but it signals that alternative options should be evaluated.
 *
 * Fires when any entertainment type exceeds R11_COST_PER_MINUTE_MAX.
 *
 * @param analytics — CulturalAnalytics with entertainment_roi data.
 * @returns Insight or null if all entertainment is cost-efficient.
 */
export const rule11_cost_efficiency: AdvisorRuleFn = (analytics) => {
  const acts = analytics.entertainment_roi;
  if (acts.length === 0) return null;

  const expensive = acts.filter(
    (e) => e.cost_per_minute > T.R11_COST_PER_MINUTE_MAX,
  );

  if (expensive.length === 0) return null;

  const severity = expensive.length > 1 ? 'medium' : 'low';

  // FIX Phase 32: [...expensive].sort() to avoid mutating input
  const sorted = [...expensive].sort(
    (a, b) => b.cost_per_minute - a.cost_per_minute,
  );

  const topExpense = sorted[0];

  return {
    id: 'cultural-r11-cost',
    severity,
    domain: 'cultural',
    layer: 'strategy',
    title: 'Costo de entretenimiento elevado',
    description: `${expensive.length} tipo(s) de entretenimiento superan ₡${T.R11_COST_PER_MINUTE_MAX.toLocaleString()}/min: ${
      sorted
        .map(
          (e) =>
            `${e.entertainment_type} (₡${e.cost_per_minute.toLocaleString()}/min)`,
        )
        .join(', ')
    }. El más costoso es ${topExpense.entertainment_type} con ${topExpense.total_acts} acto(s) y ₡${topExpense.total_cost.toLocaleString()} total. Evaluar alternativas o negociar mejores tarifas.`,
    impact: Math.min(
      100,
      Math.round(
        ((topExpense.cost_per_minute - T.R11_COST_PER_MINUTE_MAX) /
          T.R11_COST_PER_MINUTE_MAX) *
          100 +
          20,
      ),
    ),
    confidence: 70,
    trigger: makeTrigger('cultural-r11-cost', {
      expensive_types: sorted.map((e) => ({
        type: e.entertainment_type,
        cost_per_minute: e.cost_per_minute,
        total_cost: e.total_cost,
        total_acts: e.total_acts,
      })),
    }),
  };
};

// ══════════════════════════════════════════════════════════
//  R12: CULTURAL REVENUE DIVERSIFICATION
// ══════════════════════════════════════════════════════════

/**
 * R12 — Cultural Revenue Diversification
 *
 * Uses Shannon entropy on budget distribution across categories.
 * If one category dominates the budget, the club is over-dependent
 * on a single cultural pillar — risky if that category declines.
 *
 * Fires when budget diversity score falls below R12_REVENUE_DIVERSITY_MIN.
 *
 * @param analytics — CulturalAnalytics with category_performance data.
 * @returns Insight or null if budget is well-diversified.
 */
export const rule12_revenue: AdvisorRuleFn = (analytics) => {
  const cats = analytics.category_performance;
  if (cats.length < 3) return null;

  const budgets = cats.map((c) => c.total_budget);
  const score = normalizedDiversityScore(budgets, cats.length);

  if (score >= T.R12_REVENUE_DIVERSITY_MIN) return null;

  // FIX Phase 32: [...cats].sort() to avoid mutating input
  const topCat = [...cats].reduce(
    (max, c) => (c.total_budget > max.total_budget ? c : max),
    cats[0],
  );

  const totalBudget = cats.reduce((s, c) => s + c.total_budget, 0);
  const topShare =
    totalBudget > 0 ? (topCat.total_budget / totalBudget) * 100 : 0;

  const severity = score < 30 ? 'medium' : 'low';

  return {
    id: 'cultural-r12-concentration',
    severity,
    domain: 'cultural',
    layer: 'strategy',
    title: 'Presupuesto cultural concentrado',
    description: `${topCat.category} concentra el ${topShare.toFixed(0)}% del presupuesto cultural (diversificación: ${score}/100). Diversificar reduce riesgo y aumenta el engagement cross-categoría — un socio que solo experimenta un tipo de cultura es más probable que se desconecte.`,
    impact: impactFromThreshold(score, T.R12_REVENUE_DIVERSITY_MIN),
    confidence: 70,
    trigger: makeTrigger('cultural-r12-concentration', {
      top_category: topCat.category,
      top_share_pct: topShare,
      diversification_score: score,
      total_categories: cats.length,
    }),
  };
};

// ══════════════════════════════════════════════════════════
//  R19: VENUE-EVENT MISMATCH (NEW — Intelligence Layer)
// ══════════════════════════════════════════════════════════

/**
 * R19 — Venue-Event Mismatch
 *
 * Uses venue personality data to detect when events are being
 * held in venues whose characteristics don't match the event type.
 *
 * Example: An intimate jazz session in a grand ballroom (high capacity,
 * formal personality) is a mismatch — the venue personality doesn't
 * support the intimate experience the event requires.
 *
 * @param analytics — CulturalAnalytics with venue_utilization data.
 * @param _summary — Unused.
 * @param intelligence — Engine-computed context with venuePersonalities.
 * @returns Insight or null if venue-event alignment is healthy.
 */
export const rule19_venue_mismatch: IntelligenceRuleFn = (
  analytics,
  _summary,
  intelligence,
) => {
  const personalities = intelligence.venuePersonalities;
  if (personalities.length === 0) return null;

  // Analyze venue-event alignment from analytics venue data
  const venueData = analytics.venue_utilization;
  if (venueData.length === 0) return null;

  const mismatches: Array<{
    venue: string;
    utilizationRate: number;
    personality: string;
    issue: string;
  }> = [];

  for (const venue of venueData) {
    const personality = personalities.find(
      (p) => p.venueName === venue.venue || p.venueId === venue.venue,
    );
    if (!personality) continue;

    // High utilization + low satisfaction = venue might not be right for what's being hosted
    if (venue.utilization_rate > 50 && personality.avgSatisfaction < T.R19_VENUE_MISMATCH_SCORE) {
      mismatches.push({
        venue: venue.venue,
        utilizationRate: venue.utilization_rate,
        personality: `${personality.formality > 70 ? 'formal' : personality.formality > 40 ? 'semi-formal' : 'casual'}, ${personality.energy > 60 ? 'energético' : 'sereno'}`,
        issue: 'Alta utilización pero baja satisfacción — el venue se usa mucho pero no genera la experiencia esperada',
      });
    }

    // Very low versatility + diverse event types = mismatch
    if (personality.versatility < 30 && venue.total_bookings > 5) {
      mismatches.push({
        venue: venue.venue,
        utilizationRate: venue.utilization_rate,
        personality: `versatilidad: ${personality.versatility}/100`,
        issue: 'Venue con baja versatilidad usado para múltiples tipos de evento — considerar especialización',
      });
    }
  }

  if (mismatches.length === 0) return null;

  const topMismatch = mismatches[0];

  return {
    id: 'cultural-r19-venue-mismatch',
    severity: mismatches.length > 1 ? 'medium' : 'low',
    domain: 'cultural',
    layer: 'strategy',
    title: 'Desajuste venue-evento detectado',
    description: `${mismatches.length} venue(s) muestran señales de desajuste: ${mismatches.map((m) => m.venue).join(', ')}. El más significativo: ${topMismatch.venue} (${topMismatch.personality}) — ${topMismatch.issue}. El venue correcto es tan importante como el evento correcto.`,
    impact: Math.min(100, mismatches.length * 25 + 20),
    confidence: 65,
    action: {
      label: 'Revisar asignación de venues',
      route: '/admin/cultural',
    },
    trigger: makeTrigger('cultural-r19-venue-mismatch', {
      mismatches: mismatches.map((m) => ({
        venue: m.venue,
        utilization: m.utilizationRate,
        personality: m.personality,
        issue: m.issue,
      })),
    }),
    intelligenceData: {
      mismatches,
    },
  };
};

// ══════════════════════════════════════════════════════════
//  RULE COLLECTION
// ══════════════════════════════════════════════════════════

/** All strategy-layer standard rules (R9-R12). */
export const STRATEGY_RULES: AdvisorRuleFn[] = [
  rule9_seasonal,
  rule10_calendar_fit,
  rule11_cost_efficiency,
  rule12_revenue,
];

/** All strategy-layer intelligence rules (R19). */
export const STRATEGY_INTELLIGENCE_RULES: IntelligenceRuleFn[] = [
  rule19_venue_mismatch,
];