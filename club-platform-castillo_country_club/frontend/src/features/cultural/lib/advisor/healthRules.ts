/**
 * Advisor Health Rules — Layer 1 (R1-R4) + Intelligence (R16-R17)
 *
 * Cultural Health rules assess the structural health of the club's
 * cultural programming: diversity, venue utilization, entertainment
 * portfolio, and calendar density.
 *
 * Intelligence rules (R16-R17) assess AI-detected health signals:
 * taste mutations and resonance drops.
 *
 * All functions are pure — no hooks, no state, no side effects.
 * All thresholds sourced from CULTURAL_ADVISOR_THRESHOLDS in config.ts.
 *
 * @module cultural/lib/advisor/healthRules
 */

import { CULTURAL_ADVISOR_THRESHOLDS as T } from '../../config';
import type {
  AdvisorRuleFn,
  IntelligenceRuleFn
} from './types';
import {
  normalizedDiversityScore,
  makeTrigger,
  impactFromThreshold,
  severityFromThresholds,
  buildDiversityDescription,
  buildUtilizationDescription,
  impactFromRange,
} from './helpers';
// ══════════════════════════════════════════════════════════
//  R1: CULTURAL PROGRAMMING DIVERSITY
// ══════════════════════════════════════════════════════════

/**
 * R1 — Cultural Programming Diversity
 *
 * Uses Shannon entropy to measure how evenly cultural categories
 * are programmed. Concentrated programming (only music + gastronomy)
 * scores low; evenly spread across 7 categories scores high.
 *
 * Fires when diversity score falls below R1_DIVERSITY_MIN_SCORE (60).
 *
 * @param analytics — CulturalAnalytics with category_performance data.
 * @returns Insight or null if diversity is healthy.
 */
export const rule1_diversity: AdvisorRuleFn = (analytics) => {
  const cats = analytics.category_performance;
  if (cats.length === 0) return null;

  const counts = cats.map((c) => c.event_count);
  const score = normalizedDiversityScore(counts, 7);

  if (score >= T.R1_DIVERSITY_MIN_SCORE) return null;

  const severity = score < T.R1_DIVERSITY_HIGH_THRESHOLD ? 'high' : 'medium';

  // FIX Phase 32: [...cats].sort() instead of cats.sort() to avoid mutating input
  const topCats = [...cats]
    .sort((x, y) => y.engagement_score - x.engagement_score)
    .slice(0, 2)
    .map((c) => c.category);

  const activeCats = cats.filter((c) => c.event_count > 0).length;

  return {
    id: 'cultural-r1-diversity',
    severity,
    domain: 'cultural',
    layer: 'health',
    title: 'Programación cultural concentrada',
    description: buildDiversityDescription(activeCats, 7, topCats, 'categorías culturales'),
    impact: impactFromThreshold(score, T.R1_DIVERSITY_MIN_SCORE),
    confidence: 85,
    action: {
      label: 'Generar propuestas de diversificación',
      server: 'cultural_social',
      tool: 'generate_cultural_proposals',
      params: { focus_area: 'events' },
    },
    trigger: makeTrigger('cultural-r1-diversity', {
      active_categories: activeCats,
      total_categories: 7,
      diversity_score: score,
      category_distribution: cats.map((c) => ({
        category: c.category,
        count: c.event_count,
      })),
    }),
  };
};

// ══════════════════════════════════════════════════════════
//  R2: VENUE UTILIZATION
// ══════════════════════════════════════════════════════════

/**
 * R2 — Venue Utilization
 *
 * Measures how effectively the club's cultural venues are being used.
 * Low utilization = spaces sitting empty = missed engagement.
 *
 * Fires when average utilization falls below R2_VENUE_UTIL_MIN (40).
 *
 * @param analytics — CulturalAnalytics with venue_utilization data.
 * @returns Insight or null if utilization is healthy.
 */
export const rule2_venues: AdvisorRuleFn = (analytics) => {
  const venues = analytics.venue_utilization;
  if (venues.length === 0) return null;

  const avgUtil = venues.reduce((s, v) => s + v.utilization_rate, 0) / venues.length;
  if (avgUtil >= T.R2_VENUE_UTIL_MIN) return null;

  const underused = venues.filter((v) => v.utilization_rate < T.R2_VENUE_UTIL_UNDERUSED);
  const severity = severityFromThresholds(
    avgUtil,
    T.R2_VENUE_UTIL_HIGH,
    T.R2_VENUE_UTIL_MIN,
  );

  return {
    id: 'cultural-r2-venues',
    severity,
    domain: 'cultural',
    layer: 'health',
    title: 'Venues del club subutilizados',
    description: buildUtilizationDescription(avgUtil, underused.map((v) => v.venue), 'venue'),
    impact: impactFromThreshold(avgUtil, T.R2_VENUE_UTIL_MIN),
    confidence: 80,
    action: {
      label: 'Activar espacios subutilizados',
      server: 'cultural_social',
      tool: 'generate_cultural_proposals',
      params: { focus_area: 'space' },
    },
    trigger: makeTrigger('cultural-r2-venues', {
      avg_utilization: avgUtil,
      underused_venues: underused.map((v) => ({
        venue: v.venue,
        rate: v.utilization_rate,
      })),
    }),
  };
};

// ══════════════════════════════════════════════════════════
//  R3: ENTERTAINMENT PORTFOLIO
// ══════════════════════════════════════════════════════════

/**
 * R3 — Entertainment Portfolio
 *
 * Two sub-checks:
 * 1. Type diversity: Are we offering enough variety? (min 4 of 7 types)
 * 2. Contracting efficiency: Are we confirming acts or just proposing?
 *
 * Fires when type diversity is low OR contracted rate is below threshold.
 *
 * @param analytics — CulturalAnalytics with entertainment_roi data.
 * @returns Insight or null if portfolio is healthy.
 */
export const rule3_entertainment: AdvisorRuleFn = (analytics) => {
  const acts = analytics.entertainment_roi;
  if (acts.length === 0) return null;

  const uniqueTypes = acts.length;
  const avgContracted = acts.reduce((s, e) => s + e.contracted_rate, 0) / acts.length;

  // Both conditions met — portfolio is healthy
  if (uniqueTypes >= T.R3_ENTERTAINMENT_MIN_TYPES && avgContracted >= T.R3_ENTERTAINMENT_MIN_CONTRACTED) {
    return null;
  }

  // Sub-check 1: Low type diversity
  if (uniqueTypes < T.R3_ENTERTAINMENT_DIVERSITY_MIN) {
    return {
      id: 'cultural-r3-portfolio-diversity',
      severity: 'medium',
      domain: 'cultural',
      layer: 'health',
      title: 'Portfolio de entretenimiento limitado',
      description: buildDiversityDescription(
        uniqueTypes,
        7,
        [],
        'tipos de entretenimiento',
      ),
      impact: impactFromThreshold(uniqueTypes, T.R3_ENTERTAINMENT_MIN_TYPES),
      confidence: 75,
      action: {
        label: 'Explorar nuevos tipos de entretenimiento',
        route: '/admin/cultural',
      },
      trigger: makeTrigger('cultural-r3-portfolio-diversity', {
        unique_types: uniqueTypes,
      }),
    };
  }

  // Sub-check 2: Low contracted rate
  const severity = avgContracted < T.R3_ENTERTAINMENT_CONTRACTED_HIGH ? 'high' : 'medium';

  return {
    id: 'cultural-r3-contracting',
    severity,
    domain: 'cultural',
    layer: 'health',
    title: 'Baja tasa de contratación de artistas',
    description: `Promedio de contratación: ${avgContracted.toFixed(0)}%. Hay interés (actos propuestos) pero el proceso de booking tiene fricción — los actos no se confirman.`,
    impact: impactFromThreshold(avgContracted, T.R3_ENTERTAINMENT_MIN_CONTRACTED),
    confidence: 80,
    action: {
      label: 'Revisar actos pendientes',
      route: '/admin/cultural',
    },
    trigger: makeTrigger('cultural-r3-contracting', {
      avg_contracted_rate: avgContracted,
    }),
  };
};

// ══════════════════════════════════════════════════════════
//  R4: CALENDAR DENSITY
// ══════════════════════════════════════════════════════════

/**
 * R4 — Calendar Density
 *
 * Three sub-checks:
 * 1. Overload: More than 5 events this/next week → canibalization risk
 * 2. Empty: Less than 2 events in next 30 days → club feels dead
 * 3. Light: Less than 6 events in next 30 days → opportunity
 *
 * @param _analytics — Unused (rule only needs summary).
 * @param summary — CulturalSummary with calendar density data.
 * @returns Insight or null if calendar density is healthy.
 */
export const rule4_density: AdvisorRuleFn = (_analytics, summary) => {
  const thisWeek = summary.events_this_week;
  const nextWeek = summary.events_next_week;
  const upcoming30d = summary.upcoming_events_30d;

  // Sub-check 1: Overloaded
  if (thisWeek > T.R4_CALENDAR_OVERLOAD || nextWeek > T.R4_CALENDAR_OVERLOAD) {
    const maxWeek = Math.max(thisWeek, nextWeek);
    return {
      id: 'cultural-r4-overload',
      severity: 'high',
      domain: 'cultural',
      layer: 'health',
      title: 'Sobrecarga de programación cultural',
      description: `${thisWeek} eventos esta semana, ${nextWeek} la próxima. Más de ${T.R4_CALENDAR_OVERLOAD} eventos/semana genera canibalización de asistencia — los socios eligen y el resto sufre baja concurrencia.`,
      impact: Math.min(100, (maxWeek - T.R4_CALENDAR_OVERLOAD) * 18),
      confidence: 85,
      action: {
        label: 'Redistribuir calendario',
        route: '/admin/cultural',
      },
      trigger: makeTrigger('cultural-r4-overload', {
        events_this_week: thisWeek,
        events_next_week: nextWeek,
      }),
    };
  }

  // Sub-check 2: Empty
  if (upcoming30d < T.R4_CALENDAR_EMPTY) {
    return {
      id: 'cultural-r4-empty',
      severity: 'high',
      domain: 'cultural',
      layer: 'health',
      title: 'Calendario cultural vacío',
      description: upcoming30d === 0
        ? 'Sin eventos culturales programados para los próximos 30 días. El club se siente vacío — los socios buscan entretenimiento fuera.'
        : `Solo ${upcoming30d} evento(s) en los próximos 30 días. La vida cultural del club necesita más actividad.`,
      impact: 85,
      confidence: 90,
      action: {
        label: 'Crear nuevo evento',
        server: 'cultural_social',
        tool: 'manage_social_events',
        params: { action: 'create' },
      },
      trigger: makeTrigger('cultural-r4-empty', {
        upcoming_30d: upcoming30d,
      }),
    };
  }

  // Sub-check 3: Light (opportunity)
  if (upcoming30d < T.R4_CALENDAR_LIGHT) {
    const [optimalMin, optimalMax] = T.R4_CALENDAR_OPTIMAL_RANGE;
    return {
      id: 'cultural-r4-light',
      severity: 'medium',
      domain: 'cultural',
      layer: 'health',
      title: 'Calendario cultural liviano',
      description: `${upcoming30d} eventos en los próximos 30 días. El rango óptimo para clubes premium es ${optimalMin}-${optimalMax}. Hay espacio para más actividad cultural.`,
      impact: impactFromRange(upcoming30d, optimalMin, optimalMax),
      confidence: 75,
      action: {
        label: 'Generar ideas de eventos',
        server: 'cultural_social',
        tool: 'generate_cultural_proposals',
        params: { focus_area: 'events' },
      },
      trigger: makeTrigger('cultural-r4-light', {
        upcoming_30d: upcoming30d,
      }),
    };
  }

  return null;
};

// ══════════════════════════════════════════════════════════
//  R16: TASTE MUTATION DETECTED (NEW — Intelligence Layer)
// ══════════════════════════════════════════════════════════

/**
 * R16 — Taste Mutation Detected
 *
 * Fires when the taste profile engine detects a significant mutation
 * in a member's cultural preferences: a new genre discovery, an
 * abandonment, or a shift in style.
 *
 * This is an intelligence-layer rule — it requires engine-computed data.
 *
 * @param _analytics — Unused.
 * @param _summary — Unused.
 * @param intelligence — Engine-computed context with tasteMutations.
 * @returns Insight or null if no significant mutations.
 */
export const rule16_taste_mutation: IntelligenceRuleFn = (
  _analytics,
  _summary,
  intelligence,
) => {
  const mutations = intelligence.tasteMutations;
  if (mutations.length === 0) return null;

  const significant = mutations.filter(
    (m) =>
      m.confidence >= T.R16_MUTATION_CONFIDENCE &&
      m.magnitude >= T.R16_MUTATION_MAGNITUDE,
  );

  if (significant.length === 0) return null;

  const top = significant.reduce((max, m) =>
    m.magnitude > max.magnitude ? m : max,
    significant[0],
  );

  const typeLabels: Record<string, string> = {
    discovery: 'Nuevo descubrimiento',
    abandonment: 'Abandono de género',
    shift: 'Cambio de interés',
    deepening: 'Profundización',
    broadening: 'Expansión de gustos',
  };

  const typeLabel = typeLabels[top.type] ?? 'Mutación detectada';
  const genreLabel = top.toGenre ?? top.fromGenre ?? 'género';

  return {
    id: 'cultural-r16-mutation',
    severity: top.confidence > 0.85 ? 'high' : 'medium',
    domain: 'cultural',
    layer: 'health',
    title: `${typeLabel}: ${genreLabel}`,
    description: `Se detectó una mutación en el perfil cultural con ${(top.confidence * 100).toFixed(0)}% de confianza y magnitud ${top.magnitude}/100. ${
      top.type === 'discovery'
        ? 'Nueva oportunidad de engagement — diseñar experiencias que refuercen este interés emergente.'
        : top.type === 'abandonment'
          ? 'Riesgo de pérdida de engagement en este género — investigar causa y ofrecer alternativas.'
          : 'Evolución natural del gusto — adaptar la programación a esta nueva dirección.'
    }`,
    impact: Math.min(100, Math.round(top.magnitude * 1.2)),
    confidence: Math.round(top.confidence * 100),
    action: {
      label: 'Explorar cambio de perfil cultural',
      server: 'cultural_social',
      tool: 'generate_cultural_proposals',
      params: { focus_area: 'lifestyle' },
    },
    trigger: makeTrigger('cultural-r16-mutation', {
      mutation_type: top.type,
      from_genre: top.fromGenre,
      to_genre: top.toGenre,
      confidence: top.confidence,
      magnitude: top.magnitude,
      stability: top.predictedStability,
    }),
    intelligenceData: {
      mutations: significant.map((m) => ({
        type: m.type,
        from: m.fromGenre,
        to: m.toGenre,
        confidence: m.confidence,
        magnitude: m.magnitude,
      })),
    },
  };
};

// ══════════════════════════════════════════════════════════
//  R17: RESONANCE DROP (NEW — Intelligence Layer)
// ══════════════════════════════════════════════════════════

/**
 * R17 — Resonance Drop
 *
 * Fires when the average experiential resonance score has dropped
 * significantly over the lookback period. This signals that recent
 * events are not having the intended emotional impact.
 *
 * @param _analytics — Unused.
 * @param _summary — Unused.
 * @param intelligence — Engine-computed context with resonanceScores.
 * @returns Insight or null if resonance is stable or rising.
 */
export const rule17_resonance_drop: IntelligenceRuleFn = (
  _analytics,
  _summary,
  intelligence,
) => {
  const scores = intelligence.resonanceScores;
  if (scores.length < 2) return null;

  // Sort by timestamp to compare recent vs older
  const sorted = [...scores].sort(
    (a, b) => new Date(a.eventId).getTime() - new Date(b.eventId).getTime(),
  );

  const midpoint = Math.floor(sorted.length / 2);
  const olderHalf = sorted.slice(0, midpoint);
  const recentHalf = sorted.slice(midpoint);

  const olderAvg = olderHalf.reduce((s, r) => s + r.totalResonance, 0) / olderHalf.length;
  const recentAvg = recentHalf.reduce((s, r) => s + r.totalResonance, 0) / recentHalf.length;

  const drop = olderAvg - recentAvg;

  if (drop < T.R17_RESONANCE_DROP) return null;

  return {
    id: 'cultural-r17-resonance-drop',
    severity: drop > T.R17_RESONANCE_DROP * 2 ? 'high' : 'medium',
    domain: 'cultural',
    layer: 'health',
    title: 'Caída en resonancia experiencial',
    description: `La resonancia promedio de los eventos recientes bajó ${drop.toFixed(0)} puntos (de ${olderAvg.toFixed(0)} a ${recentAvg.toFixed(0)}). Los eventos ya no reverberan como antes — revisar la calidad experiencial, el match venue-evento, o el perfil sensorial.`,
    impact: Math.min(100, Math.round(drop * 2)),
    confidence: 75,
    action: {
      label: 'Analizar eventos de baja resonancia',
      route: '/admin/cultural',
    },
    trigger: makeTrigger('cultural-r17-resonance-drop', {
      older_avg: olderAvg,
      recent_avg: recentAvg,
      drop: drop,
      sample_size: scores.length,
    }),
    intelligenceData: {
      olderAverage: olderAvg,
      recentAverage: recentAvg,
      drop: drop,
    },
  };
};

// ══════════════════════════════════════════════════════════
//  RULE COLLECTION
// ══════════════════════════════════════════════════════════

/** All health-layer standard rules (R1-R4). */
export const HEALTH_RULES: AdvisorRuleFn[] = [
  rule1_diversity,
  rule2_venues,
  rule3_entertainment,
  rule4_density,
];

/** All health-layer intelligence rules (R16-R17). */
export const HEALTH_INTELLIGENCE_RULES: IntelligenceRuleFn[] = [
  rule16_taste_mutation,
  rule17_resonance_drop,
];