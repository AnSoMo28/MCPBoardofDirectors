/**
 * Advisor Engagement Rules — Layer 2 (R5-R8) + Intelligence (R18)
 *
 * Engagement rules assess how effectively the club's cultural programming
 * engages members: attendance trends, program enrollment, exhibition
 * impact, and premium event coverage.
 *
 * Intelligence rule R18 assesses journey stalls — members who have
 * stopped progressing in their cultural journey.
 *
 * All functions are pure — no hooks, no state, no side effects.
 * All thresholds sourced from CULTURAL_ADVISOR_THRESHOLDS in config.ts.
 *
 * @module cultural/lib/advisor/engagementRules
 */

import { CULTURAL_ADVISOR_THRESHOLDS as T } from '../../config';
import type {
  AdvisorRuleFn,
  IntelligenceRuleFn
} from './types';
import {
  makeTrigger,
  impactFromThreshold,
  impactFromTrend,
  buildTrendDescription,
} from './helpers';
// ══════════════════════════════════════════════════════════
//  R5: ATTENDANCE TREND
// ══════════════════════════════════════════════════════════

/**
 * R5 — Attendance Trend
 *
 * Two sub-checks:
 * 1. Declining: attendance trend is 'down' → red flag
 * 2. Stagnant: trend is stable but level is low → yellow flag
 *
 * Attendance is the single most important engagement metric
 * (weight 0.25 in engagement score). A decline here signals
 * fundamental disconnection from cultural programming.
 *
 * @param analytics — CulturalAnalytics with attendance data.
 * @returns Insight or null if attendance is healthy.
 */
export const rule5_attendance: AdvisorRuleFn = (analytics) => {
  // Sub-check 1: Declining
  if (analytics.attendance_trend === 'down') {
    return {
      id: 'cultural-r5-attendance-down',
      severity: 'high',
      domain: 'cultural',
      layer: 'engagement',
      title: 'Asistencia cultural en descenso',
      description:
        buildTrendDescription(
          'down',
          analytics.attendance_trend_pct,
          'asistencia',
        ) + ` Asistencia promedio 30d: ${analytics.avg_attendance_30d.toFixed(0)} personas/evento.`,
      impact: impactFromTrend(
        analytics.avg_attendance_30d,
        analytics.attendance_trend_pct,
        40,
      ),
      confidence: 80,
      action: {
        label: 'Analizar patrones de asistencia',
        server: 'cultural_social',
        tool: 'get_cultural_analytics',
        params: {},
      },
      trigger: makeTrigger('cultural-r5-attendance-down', {
        trend: analytics.attendance_trend,
        trend_pct: analytics.attendance_trend_pct,
        avg_attendance_30d: analytics.avg_attendance_30d,
        total_events_30d: analytics.total_events_30d,
      }),
    };
  }

  // Sub-check 2: Stable but low
  if (
    analytics.attendance_trend === 'stable' &&
    analytics.avg_attendance_30d < T.R5_ATTENDANCE_STAGNANT
  ) {
    return {
      id: 'cultural-r5-attendance-stagnant',
      severity: 'medium',
      domain: 'cultural',
      layer: 'engagement',
      title: 'Asistencia estancada en niveles bajos',
      description: `Asistencia promedio: ${analytics.avg_attendance_30d.toFixed(0)} personas/evento. La tendencia es estable pero el nivel es bajo. Los eventos no están captando suficiente audiencia — considerar nuevos formatos o mejor segmentación.`,
      impact: impactFromThreshold(
        analytics.avg_attendance_30d,
        T.R5_ATTENDANCE_STAGNANT,
      ),
      confidence: 75,
      trigger: makeTrigger('cultural-r5-attendance-stagnant', {
        avg_attendance_30d: analytics.avg_attendance_30d,
        trend: analytics.attendance_trend,
      }),
    };
  }

  return null;
};

// ══════════════════════════════════════════════════════════
//  R6: PROGRAM ENROLLMENT
// ══════════════════════════════════════════════════════════

/**
 * R6 — Program Enrollment
 *
 * Fires when cultural programs have low enrollment rates.
 * Programs with <30% enrollment are either poorly promoted,
 * poorly designed, or targeting the wrong audience.
 *
 * @param analytics — CulturalAnalytics with program enrollment data.
 * @returns Insight or null if enrollment is healthy.
 */
export const rule6_enrollment: AdvisorRuleFn = (analytics) => {
  if (analytics.active_programs === 0) return null;

  const issues: string[] = [];
  if (analytics.avg_enrollment_pct < T.R6_ENROLLMENT_CRITICAL) {
    issues.push('inscripción crítica');
  }
  if (analytics.programs_below_threshold > 0) {
    issues.push(
      `${analytics.programs_below_threshold} programa(s) bajo ${T.R6_ENROLLMENT_MIN}%`,
    );
  }

  if (issues.length === 0) return null;

  const severity =
    analytics.avg_enrollment_pct < T.R6_ENROLLMENT_CRITICAL
      ? 'high'
      : 'medium';

  return {
    id: 'cultural-r6-enrollment',
    severity,
    domain: 'cultural',
    layer: 'engagement',
    title: 'Inscripción de programas baja',
    description: `Promedio de inscripción: ${analytics.avg_enrollment_pct.toFixed(0)}%. ${issues.join('; ')}. Los programas culturales necesitan mejor promoción o replantear la oferta para la audiencia correcta.`,
    impact: impactFromThreshold(
      analytics.avg_enrollment_pct,
      T.R6_ENROLLMENT_MIN,
    ),
    confidence: 85,
    action: {
      label: 'Mejorar comunicación de programas',
      server: 'cultural_social',
      tool: 'generate_cultural_proposals',
      params: { focus_area: 'events', target_demographic: 'all' },
    },
    trigger: makeTrigger('cultural-r6-enrollment', {
      avg_enrollment_pct: analytics.avg_enrollment_pct,
      programs_below_threshold: analytics.programs_below_threshold,
      active_programs: analytics.active_programs,
    }),
  };
};

// ══════════════════════════════════════════════════════════
//  R7: EXHIBITION ENGAGEMENT
// ══════════════════════════════════════════════════════════

/**
 * R7 — Exhibition Engagement
 *
 * Three sub-checks:
 * 1. No exhibitions at all → space culturally empty
 * 2. Exhibitions exist but none active → programming gap
 * 3. Low reception rate → missed social opportunity
 *
 * Exhibitions are low-cost, high-impact cultural touchpoints.
 * They keep the club visually alive and attract casual engagement.
 *
 * @param analytics — CulturalAnalytics with exhibition data.
 * @returns Insight or null if exhibition engagement is healthy.
 */
export const rule7_exhibitions: AdvisorRuleFn = (analytics) => {
  // Sub-check 1: No exhibitions at all
  if (analytics.total_exhibitions === 0) {
    return {
      id: 'cultural-r7-no-exhibitions',
      severity: 'medium',
      domain: 'cultural',
      layer: 'engagement',
      title: 'Sin exposiciones — espacio cultural desaprovechado',
      description:
        'No hay exposiciones registradas. Las exposiciones de arte son una forma de bajo costo de mantener el club culturalmente vivo y atraer socios a los espacios comunes.',
      impact: 55,
      confidence: 70,
      action: {
        label: 'Crear exposición',
        server: 'cultural_social',
        tool: 'manage_art_exhibitions',
        params: { action: 'create' },
      },
      trigger: makeTrigger('cultural-r7-no-exhibitions', {}),
    };
  }

  // Sub-check 2: Exhibitions exist but none active
  if (
    analytics.active_exhibitions === 0 &&
    analytics.total_exhibitions > 0
  ) {
    return {
      id: 'cultural-r7-inactive',
      severity: 'medium',
      domain: 'cultural',
      layer: 'engagement',
      title: 'Sin exposiciones activas actualmente',
      description: `${analytics.total_exhibitions} exposiciones registradas pero ninguna activa. Las paredes del club están vacías — oportunidad de programar la próxima exhibición.`,
      impact: 45,
      confidence: 80,
      action: {
        label: 'Programar exposición',
        route: '/admin/cultural',
      },
      trigger: makeTrigger('cultural-r7-inactive', {
        total_exhibitions: analytics.total_exhibitions,
      }),
    };
  }

  // Sub-check 3: Low reception rate
  if (
    analytics.exhibitions_with_reception_pct < T.R7_RECEPTION_MIN &&
    analytics.total_exhibitions >= T.R7_RECEPTION_MIN_EXHIBITIONS
  ) {
    return {
      id: 'cultural-r7-receptions',
      severity: 'low',
      domain: 'cultural',
      layer: 'engagement',
      title: 'Pocas recepciones de apertura',
      description: `Solo ${analytics.exhibitions_with_reception_pct.toFixed(0)}% de exposiciones tienen recepción de apertura. Las recepciones son eventos sociales de alto impacto — conectan artistas con socios y generan buzz cultural.`,
      impact: 35,
      confidence: 75,
      trigger: makeTrigger('cultural-r7-receptions', {
        reception_pct: analytics.exhibitions_with_reception_pct,
      }),
    };
  }

  return null;
};

// ══════════════════════════════════════════════════════════
//  R8: GALA & PREMIUM EVENTS
// ══════════════════════════════════════════════════════════

/**
 * R8 — Gala & Premium Events
 *
 * Two sub-checks:
 * 1. No gala scheduled → missed premium opportunity
 * 2. Gala scheduled but undersized → could be bigger
 *
 * Galas are the flagship cultural events: high revenue, high engagement,
 * high social impact. Absence of galas signals strategic gap.
 *
 * @param _analytics — Unused.
 * @param summary — CulturalSummary with gala highlight data.
 * @returns Insight or null if gala programming is healthy.
 */
export const rule8_galas: AdvisorRuleFn = (_analytics, summary) => {
  // Sub-check 1: No gala coming
  if (!summary.next_gala && summary.upcoming_events_30d > 0) {
    return {
      id: 'cultural-r8-no-gala',
      severity: 'medium',
      domain: 'cultural',
      layer: 'engagement',
      title: 'Sin gala programada — oportunidad premium',
      description: `Hay ${summary.upcoming_events_30d} evento(s) próximos pero ninguna gala formal. Las galas son el evento insignia del club: generan revenue premium, engagement alto y posicionan la marca del club.`,
      impact: 60,
      confidence: 80,
      action: {
        label: 'Organizar gala',
        server: 'cultural_social',
        tool: 'organize_formal_gala',
        params: {},
      },
      trigger: makeTrigger('cultural-r8-no-gala', {
        upcoming_events: summary.upcoming_events_30d,
      }),
    };
  }

  // Sub-check 2: Gala coming but small
  if (
    summary.next_gala &&
    summary.next_gala.guest_count !== undefined &&
    summary.next_gala.guest_count < T.R8_GALA_MIN_GUESTS
  ) {
    const [optimalMin, optimalMax] = T.R8_GALA_OPTIMAL_RANGE;
    return {
      id: 'cultural-r8-small-gala',
      severity: 'low',
      domain: 'cultural',
      layer: 'engagement',
      title: 'Próxima gala con pocos invitados',
      description: `"${summary.next_gala.name}" tiene ${summary.next_gala.guest_count} invitados. Para una gala formal en un club premium, el rango óptimo es ${optimalMin}-${optimalMax} invitados. Considerar ampliar la invitación.`,
      impact: 30,
      confidence: 70,
      trigger: makeTrigger('cultural-r8-small-gala', {
        gala_name: summary.next_gala.name,
        guest_count: summary.next_gala.guest_count,
      }),
    };
  }

  return null;
};

// ══════════════════════════════════════════════════════════
//  R18: JOURNEY STALL (Intelligence Layer)
// ══════════════════════════════════════════════════════════

/**
 * R18 — Journey Stall
 *
 * Fires when a member's cultural journey has stalled:
 * no cultural attendance in R18_JOURNEY_STALL_DAYS days,
 * or the current phase progress is below R18_JOURNEY_STALL_PROGRESS.
 *
 * A stalled journey means the member is drifting away from
 * cultural engagement — early intervention prevents churn.
 *
 * @param _analytics — Unused.
 * @param _summary — Unused.
 * @param intelligence — Engine-computed context with culturalJourney.
 * @returns Insight or null if journey is progressing.
 */
export const rule18_journey_stall: IntelligenceRuleFn = (
  _analytics,
  _summary,
  intelligence,
) => {
  const journey = intelligence.culturalJourney;
  if (!journey || journey.phases.length === 0) return null;

  const currentPhase = journey.phases[0];
  if (!currentPhase) return null;

  // Check if the current phase has events with low progress
  const eventsInPhase = currentPhase.events.length;
  const completedEvents = currentPhase.events.filter(
    (e) => e.matchScore > 0,
  ).length;

  const progressPct =
    eventsInPhase > 0
      ? Math.round((completedEvents / eventsInPhase) * 100)
      : 0;

  if (progressPct >= T.R18_JOURNEY_STALL_PROGRESS) return null;

  // Check if there's been no recent cultural attendance
  const journeyStartDate =
    journey.keyMoments.length > 0
      ? journey.keyMoments[journey.keyMoments.length - 1].date
      : null;

  let daysSinceActivity = 0;
  if (journeyStartDate) {
    const start = new Date(journeyStartDate);
    const now = new Date();
    daysSinceActivity = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  const isStalledByTime = daysSinceActivity >= T.R18_JOURNEY_STALL_DAYS;
  const isStalledByProgress =
    progressPct < T.R18_JOURNEY_STALL_PROGRESS;

  if (!isStalledByTime && !isStalledByProgress) return null;

  const severity =
    isStalledByTime &&
    daysSinceActivity > T.R18_JOURNEY_STALL_DAYS * 2
      ? 'high'
      : 'medium';

  const reason = isStalledByTime
    ? `Sin actividad cultural en ${daysSinceActivity} días`
    : `Progreso de la fase actual: solo ${progressPct}%`;

  return {
    id: 'cultural-r18-journey-stall',
    severity,
    domain: 'cultural',
    layer: 'engagement',
    title: 'Journey cultural estancado',
    description: `${reason}. El socio está en fase "${currentPhase.theme}" de su journey cultural pero no ha avanzado. Sin intervención, el engagement cultural se erosiona. Sugerir una experiencia de bajo riesgo para reactivar.`,
    impact: isStalledByTime
      ? Math.min(100, Math.round(daysSinceActivity * 2))
      : impactFromThreshold(
          progressPct,
          T.R18_JOURNEY_STALL_PROGRESS,
        ),
    confidence: 70,
    action: {
      label: 'Sugerir reactivación cultural',
      server: 'cultural_social',
      tool: 'generate_cultural_proposals',
      params: { focus_area: 'events' },
    },
    trigger: makeTrigger('cultural-r18-journey-stall', {
      current_phase: currentPhase.theme,
      phase_progress_pct: progressPct,
      days_since_activity: daysSinceActivity,
      journey_horizon: journey.horizon,
    }),
    intelligenceData: {
      journey,
      daysSinceActivity,
      progressPct,
    },
  };
};

// ══════════════════════════════════════════════════════════
//  RULE COLLECTION
// ══════════════════════════════════════════════════════════

/** All engagement-layer standard rules (R5-R8). */
export const ENGAGEMENT_RULES: AdvisorRuleFn[] = [
  rule5_attendance,
  rule6_enrollment,
  rule7_exhibitions,
  rule8_galas,
];

/** All engagement-layer intelligence rules (R18). */
export const ENGAGEMENT_INTELLIGENCE_RULES: IntelligenceRuleFn[] = [
  rule18_journey_stall,
];