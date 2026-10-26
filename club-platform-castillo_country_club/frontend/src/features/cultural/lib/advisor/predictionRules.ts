/**
 * Advisor Prediction Rules — Layer 4 (R13-R14)
 *
 * Prediction rules assess forward-looking signals:
 * demand trajectory (oversaturation vs expansion opportunity)
 * and budget trajectory (exhaustion risk vs variance deviation).
 *
 * These rules combine CURRENT state with PROJECTED state to
 * warn about what will happen if no action is taken.
 *
 * All functions are pure — no hooks, no state, no side effects.
 * All thresholds sourced from CULTURAL_ADVISOR_THRESHOLDS in config.ts.
 *
 * @module cultural/lib/advisor/predictionRules
 */

import { CULTURAL_ADVISOR_THRESHOLDS as T } from '../../config';
import type {
  AdvisorRuleFn,
} from './types';
import {
  makeTrigger,
  impactFromThreshold,
  impactFromRange, 
} from './helpers';
// ══════════════════════════════════════════════════════════
//  R13: DEMAND FORECAST
// ══════════════════════════════════════════════════════════

/**
 * R13 — Demand Forecast
 *
 * Two sub-checks that combine attendance trend with upcoming volume:
 *
 * 1. Oversaturation risk: attendance is declining BUT there are many
 *    upcoming events. If supply increases while demand decreases,
 *    each individual event will suffer lower attendance → vicious cycle.
 *
 * 2. Expansion opportunity: attendance is rising BUT there are few
 *    upcoming events. Demand exists but supply doesn't capture it →
 *    missed engagement opportunity.
 *
 * @param analytics — CulturalAnalytics with attendance_trend data.
 * @param summary — CulturalSummary with upcoming_events_30d.
 * @returns Insight or null if demand trajectory is balanced.
 */
export const rule13_demand: AdvisorRuleFn = (analytics, summary) => {
  const upcoming = summary.upcoming_events_30d;

  // Sub-check 1: Oversaturation risk
  if (
    analytics.attendance_trend === 'down' &&
    upcoming > T.R13_OVERSATURATION_UPCOMING
  ) {
    return {
      id: 'cultural-r13-oversaturation',
      severity: 'high',
      domain: 'cultural',
      layer: 'prediction',
      title: 'Riesgo de sobre-saturación cultural',
      description: `Asistencia a la baja (${analytics.attendance_trend_pct.toFixed(1)}%) con ${upcoming} eventos próximos. Si no se ajusta la oferta, cada evento individual perderá audiencia. El remedio no es más eventos — es mejores eventos. Considerar reducir frecuencia y aumentar calidad experiencial.`,
      impact: Math.min(
        100,
        Math.round(
          Math.abs(analytics.attendance_trend_pct) * 3 + upcoming * 5,
        ),
      ),
      confidence: 75,
      action: {
        label: 'Revisar programación',
        route: '/admin/cultural',
      },
      trigger: makeTrigger('cultural-r13-oversaturation', {
        attendance_trend: analytics.attendance_trend,
        attendance_trend_pct: analytics.attendance_trend_pct,
        upcoming_events: upcoming,
        avg_attendance_30d: analytics.avg_attendance_30d,
      }),
    };
  }

  // Sub-check 2: Expansion opportunity
  if (
    analytics.attendance_trend === 'up' &&
    upcoming < T.R13_EXPANSION_UPCOMING
  ) {
    return {
      id: 'cultural-r13-expansion',
      severity: 'low',
      domain: 'cultural',
      layer: 'prediction',
      title: 'Demanda creciente — oportunidad de expansión',
      description: `La asistencia está subiendo (+${analytics.attendance_trend_pct.toFixed(1)}%) pero solo hay ${upcoming} evento(s) próximos. El interés existe — ampliar la oferta cultural capturaría más engagement. Ventana ideal: los socios están receptivos ahora.`,
      impact: impactFromRange(
        upcoming,
        T.R13_EXPANSION_UPCOMING,
        T.R13_EXPANSION_UPCOMING * 2,
      ),
      confidence: 70,
      action: {
        label: 'Expandir programación',
        server: 'cultural_social',
        tool: 'generate_cultural_proposals',
        params: { focus_area: 'events' },
      },
      trigger: makeTrigger('cultural-r13-expansion', {
        attendance_trend: analytics.attendance_trend,
        attendance_trend_pct: analytics.attendance_trend_pct,
        upcoming_events: upcoming,
      }),
    };
  }

  return null;
};

// ══════════════════════════════════════════════════════════
//  R14: BUDGET TRAJECTORY
// ══════════════════════════════════════════════════════════

/**
 * R14 — Budget Trajectory
 *
 * Two sub-checks on financial health:
 *
 * 1. Budget nearly exhausted: utilization >90% means there's
 *    almost no margin left for the rest of the period. If a
 *    high-value opportunity arises (e.g., a top artist), the
 *    club can't capitalize on it.
 *
 * 2. Significant variance: spending is deviating >20% from plan.
 *    This signals that either entertainment costs are out of
 *    control, or the original budget was unrealistic.
 *
 * @param analytics — CulturalAnalytics with budget data.
 * @returns Insight or null if budget trajectory is healthy.
 */
export const rule14_budget: AdvisorRuleFn = (analytics) => {
  // Sub-check 1: Budget nearly exhausted
  if (analytics.budget_utilization_pct > T.R14_BUDGET_EXHAUSTED) {
    return {
      id: 'cultural-r14-budget-exhausted',
      severity: 'high',
      domain: 'cultural',
      layer: 'prediction',
      title: 'Budget cultural casi agotado',
      description: `Utilización del presupuesto: ${analytics.budget_utilization_pct.toFixed(0)}%. Queda poco margen para oportunidades de última hora. Si surge un artista de alto valor o una gala espontánea, el club no podrá capitalizarla. Revisar gastos pendientes o solicitar ampliación presupuestaria.`,
      impact: impactFromThreshold(
        100 - analytics.budget_utilization_pct,
        100 - T.R14_BUDGET_EXHAUSTED,
      ),
      confidence: 85,
      action: {
        label: 'Revisar finanzas culturales',
        route: '/admin/finance',
      },
      trigger: makeTrigger('cultural-r14-budget-exhausted', {
        utilization_pct: analytics.budget_utilization_pct,
        planned: analytics.total_budget_planned,
        spent: analytics.total_budget_spent,
        remaining: analytics.total_budget_planned - analytics.total_budget_spent,
      }),
    };
  }

  // Sub-check 2: Significant variance
  if (analytics.budget_variance_pct > T.R14_BUDGET_VARIANCE_MAX) {
    // Determine direction: over or under budget
    const isOverBudget = analytics.total_budget_spent > analytics.total_budget_planned;
    const direction = isOverBudget ? 'por encima' : 'por debajo';

    return {
      id: 'cultural-r14-budget-variance',
      severity: analytics.budget_variance_pct > T.R14_BUDGET_VARIANCE_MAX * 2
        ? 'high'
        : 'medium',
      domain: 'cultural',
      layer: 'prediction',
      title: 'Variación presupuestaria significativa',
      description: `Desviación presupuestaria: ${analytics.budget_variance_pct.toFixed(1)}% ${direction} de lo planificado. ${
        isOverBudget
          ? 'Los costos culturales están excediendo lo presupuestado — revisar contratos de entretenimiento y proveedores antes de que la desviación se amplíe.'
          : 'El presupuesto está subutilizado — hay recursos disponibles que podrían activarse para impulsar la programación cultural.'
      }`,
      impact: Math.min(
        100,
        Math.round(analytics.budget_variance_pct * 2.5),
      ),
      confidence: 75,
      trigger: makeTrigger('cultural-r14-budget-variance', {
        variance_pct: analytics.budget_variance_pct,
        planned: analytics.total_budget_planned,
        spent: analytics.total_budget_spent,
        direction,
      }),
    };
  }

  return null;
};



// ══════════════════════════════════════════════════════════
//  RULE COLLECTION
// ══════════════════════════════════════════════════════════

/** All prediction-layer standard rules (R13-R14). */
export const PREDICTION_RULES: AdvisorRuleFn[] = [
  rule13_demand,
  rule14_budget,
];