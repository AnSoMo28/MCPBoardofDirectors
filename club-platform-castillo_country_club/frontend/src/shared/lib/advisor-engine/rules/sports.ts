// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Sports Domain Rules
//
// 22 declarative rules — 15 original (F32→F47) + 7 Phase 33 "The Arena".
// 5 layers: context (1-3), reactive (4-7), preventive (8-10),
//           optimization (11-13), proactive (14-15),
//           innovation (16-22).
//
// Architecture:
//   RuleDefinition<SportsContext> — pure functions, testable
//   buildSportsCtx() — derives metrics from raw MCP data
//   SPORTS_HEALTH_FACTORS — unified health score (P5, P53)
//   Signals: 2 original + 8 Phase 33 signals
//
// Data source: SportsAnalytics_Contract + SportsHealthSummary_Contract
//              + SportsCalendarItem_Contract[]
//
// Created: F47 B5.2 — Sports Rules Migration
// Updated: Phase 33 "The Arena" — +7 rules, +8 signals, +10 context fields
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import type { SeverityLevel } from "@/shared/types/domain-enums";
import type {
  BaseContext,
  RuleDefinition,
  SignalDefinition,
  HealthFactorDef,
  DomainSignal,
} from "../types";
import { buildInsight } from "../evaluate";

import type {
  SportsAnalytics_Contract,
  SportsHealthSummary_Contract,
  SportsCalendarItem_Contract,
  CourtUtilization_Contract,
  ClassEnrollment_Contract,
  EquipmentLifecycle_Contract,
  SportPopularity_Contract,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT
// ═══════════════════════════════════════════════════════════

export interface SportsContext extends BaseContext {
  domain: "sports";

  // Raw inputs
  analytics: SportsAnalytics_Contract | null;
  health: SportsHealthSummary_Contract | null;
  calendar: SportsCalendarItem_Contract[];

  // Court utilization
  avgUtilization: number;
  underusedCourts: CourtUtilization_Contract[];
  totalCourts: number;

  // Tournaments
  totalTournaments: number;
  upcomingTournaments: number;
  inProgressTournaments: number;
  avgParticipationRate: number;

  // Classes
  activeClasses: number;
  underperformingClasses: ClassEnrollment_Contract[];

  // Equipment
  damagedEquipment: EquipmentLifecycle_Contract[];
  criticalEquipment: EquipmentLifecycle_Contract[];
  staleEquipment: EquipmentLifecycle_Contract[];
  totalEquipment: number;

  // Coaching
  totalCoachingSessions: number;
  uniqueCoaches: number;

  // Engagement
  engagementScore: number;

  // Sport popularity
  sportPopularity: SportPopularity_Contract[];
  dominantSport: string | null;
  sportConcentrationPct: number;
  totalActivity: number;

  // Calendar
  calendarConflicts: number;

  // Seasonal (CR)
  isPeakSeason: boolean;

  // Peak hours
  peakHourSaturation: boolean;
  busiestHour: string | null;
  busiestHourCount: number;

  // ── Phase 33 "The Arena" — Cross-domain fields ──────────
  // From cross-domain signals (consumed by SR20-SR22)
  facOvercapacityEvents: number;
  clubRevenueDeclining: boolean;
  eventCapacityAlerts: number;

  // From engine outputs — Tier 1: defaults to 0; Tier 2: populated
  // (consumed by SR16-SR19)
  athleticPlateauCount: number;
  injuryRiskMembers: number;
  isolatedMembers: number;
  overtrainingFlags: number;

  // From competition/coaching engines (consumed by SR16-SR19)
  tournamentVictories: number;
  coachingMilestones: number;
  skillBreakthroughs: number;
}

export function buildSportsCtx(
  rawData: unknown,
  signals?: DomainSignal[],
): SportsContext {
  const { analytics, health, calendar } = rawData as {
    analytics: SportsAnalytics_Contract | null;
    health: SportsHealthSummary_Contract | null;
    calendar: SportsCalendarItem_Contract[];
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const isPeakSeason = currentMonth >= 12 || currentMonth <= 4;

  // Courts
  const courts = analytics?.court_utilization ?? [];
  const avgUtilization =
    courts.length > 0
      ? courts.reduce((s, c) => s + c.utilization_pct, 0) / courts.length
      : 0;
  const underusedCourts = courts.filter(
    (c) => c.utilization_pct < 30,
  );

  // Tournaments
  const tm = analytics?.tournament_metrics;
  const totalTournaments = tm?.total_tournaments ?? 0;
  const upcomingTournaments = tm?.upcoming_count ?? 0;
  const inProgressTournaments = tm?.in_progress_count ?? 0;
  const avgParticipationRate = tm?.avg_participation_rate ?? 0;

  // Classes
  const classes = analytics?.class_enrollment ?? [];
  const underperformingClasses = classes.filter(
    (c) => c.is_underperforming,
  );

  // Equipment
  const equipment = analytics?.equipment_health ?? [];
  const damagedEquipment = equipment.filter(
    (e) => e.condition === "needs_repair" || e.condition === "fair",
  );
  const criticalEquipment = equipment.filter(
    (e) => e.recommended_action === "replace_urgent",
  );
  const staleEquipment = equipment.filter(
    (e) =>
      e.days_since_maintenance != null && e.days_since_maintenance > 365,
  );

  // Coaching
  const cs = analytics?.coaching_stats;
  const totalCoachingSessions = cs?.total_sessions ?? 0;
  const uniqueCoaches = cs?.coaches?.length ?? 0;

  // Engagement
  const engagementScore = analytics?.member_engagement_score ?? 0;

  // Sport popularity
  const sportPopularity = analytics?.sport_popularity ?? [];
  const totalActivity = sportPopularity.reduce(
    (s, p) => s + p.total_activity,
    0,
  );
  const dominantSport =
    sportPopularity.length > 0 ? sportPopularity[0].sport : null;
  const sportConcentrationPct =
    sportPopularity.length > 0
      ? sportPopularity[0].activity_share_pct
      : 0;

  // Calendar
  const calendarConflicts = calendar.filter(
    (c) => c.is_conflict,
  ).length;

  // Peak hours
  const peakHours = analytics?.peak_hours ?? {};
  const peakEntries = Object.entries(peakHours).sort(
    (a, b) => b[1] - a[1],
  );
  const busiestHour = peakEntries.length > 0 ? peakEntries[0][0] : null;
  const busiestHourCount =
    peakEntries.length > 0 ? peakEntries[0][1] : 0;
  const peakHourSaturation = busiestHourCount > 20;

  // ── Phase 33 "The Arena" — Cross-domain signals ─────────
  const crossSignals = signals ?? [];

  const facOvercapacityEvents = crossSignals.filter(
    (s) =>
      s.signalDefId === "fac_venue_overcapacity" ||
      s.signalDefId === "spt_venue_overcapacity",
  ).length;

  // fin_revenue_decline signal presence → revenue declining
  const clubRevenueDeclining = crossSignals.some(
    (s) => s.signalDefId === "fin_revenue_decline",
  );

  const eventCapacityAlerts = crossSignals.filter(
    (s) => s.signalDefId === "evt_capacity_alert",
  ).length;

  // ── Phase 33 "The Arena" — Engine-derived fields ─────────
  // Tier 1: all default to 0 (engines not yet wired)
  // Tier 2: populated when engines produce output in rawData
  const engineOutputs = (
    rawData as { engineOutputs?: Record<string, unknown> }
  ).engineOutputs;

  const athleticPlateauCount = (
    engineOutputs?.athleticPlateaus as number[] | undefined
  )?.length ?? 0;
  const injuryRiskMembers = (
    engineOutputs?.injuryRisks as number[] | undefined
  )?.length ?? 0;
  const isolatedMembers = (
    engineOutputs?.isolatedMembers as number[] | undefined
  )?.length ?? 0;
  const overtrainingFlags = (
    engineOutputs?.overtrainingFlags as number[] | undefined
  )?.length ?? 0;
  const tournamentVictories =
    (engineOutputs?.tournamentVictories as number | undefined) ?? 0;
  const coachingMilestones =
    (engineOutputs?.coachingMilestones as number | undefined) ?? 0;
  const skillBreakthroughs =
    (engineOutputs?.skillBreakthroughs as number | undefined) ?? 0;

  return {
    domain: "sports",
    signals: signals ?? [],
    analytics,
    health,
    calendar,
    avgUtilization,
    underusedCourts,
    totalCourts: courts.length,
    totalTournaments,
    upcomingTournaments,
    inProgressTournaments,
    avgParticipationRate,
    activeClasses: classes.length,
    underperformingClasses,
    damagedEquipment,
    criticalEquipment,
    staleEquipment,
    totalEquipment: equipment.length,
    totalCoachingSessions,
    uniqueCoaches,
    engagementScore,
    sportPopularity,
    dominantSport,
    sportConcentrationPct,
    totalActivity,
    calendarConflicts,
    isPeakSeason,
    peakHourSaturation,
    busiestHour,
    busiestHourCount,
    // Phase 33 "The Arena"
    facOvercapacityEvents,
    clubRevenueDeclining,
    eventCapacityAlerts,
    athleticPlateauCount,
    injuryRiskMembers,
    isolatedMembers,
    overtrainingFlags,
    tournamentVictories,
    coachingMilestones,
    skillBreakthroughs,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SIGNALS
// ═══════════════════════════════════════════════════════════

// ── Original (2) ──────────────────────────────────────────

const SPT_UTILIZATION_DROP: SignalDefinition = {
  id: "spt_utilization_drop",
  targetDomains: ["global"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Sports court utilization critically low",
  ttl: 300_000,
};

const SPT_CAPACITY_WARNING: SignalDefinition = {
  id: "spt_capacity_warning",
  targetDomains: ["global"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Peak hour saturation in sports facilities",
  ttl: 300_000,
};

// ── Phase 33 "The Arena" — New (8) ────────────────────────

const SPT_SKILL_BREAKTHROUGH: SignalDefinition = {
  id: "spt_skill_breakthrough",
  targetDomains: ["sports", "engagement", "communication"] as AIDomain[],
  defaultSeverity: "info" as SeverityLevel,
  label: "Member skill breakthrough detected",
  ttl: 600_000,
};

const SPT_INJURY_RISK: SignalDefinition = {
  id: "spt_injury_risk",
  targetDomains: ["communication"] as AIDomain[],
  defaultSeverity: "critical" as SeverityLevel,
  label: "High injury risk detected for member(s)",
  ttl: 300_000,
};
const SPT_PARTICIPATION_DECLINE: SignalDefinition = {
  id: "spt_participation_decline",
  targetDomains: ["engagement", "communication"] as AIDomain[],
  defaultSeverity: "warning" as SeverityLevel,
  label: "Sports participation declining",
  ttl: 300_000,
};
const SPT_VENUE_OVERCAPACITY: SignalDefinition = {
  id: "spt_venue_overcapacity",
  targetDomains: ["facilities", "events"] as AIDomain[],
  defaultSeverity: "critical" as SeverityLevel,
  label: "Sports venue at or over capacity",
  ttl: 300_000,
};

const SPT_SEASON_CLIMAX: SignalDefinition = {
  id: "spt_season_climax",
  targetDomains: ["engagement", "communication", "events"] as AIDomain[],
  defaultSeverity: "info" as SeverityLevel,
  label: "Season approaching climax",
  ttl: 600_000,
};
// ═══════════════════════════════════════════════════════════
// SECTION 3 — THRESHOLDS (named, testable, tunable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  COURT_UTIL_LOW_PCT: 30,
  COURT_UTIL_SIGNAL_MIN: 2,
  PARTICIPATION_LOW_PCT: 50,
  CLASS_UNDERPERFORM_PCT: 40,
  COACHING_GAP_SESSIONS: 5,
  OUTDOOR_SHARE_MIN_PCT: 50,
  SPORT_CONCENTRATION_MAX_PCT: 60,
  PEAK_HOUR_SATURATION_COUNT: 20,
  EQUIPMENT_STALE_DAYS: 365,
  ENGAGEMENT_LOW_SCORE: 40,
  // ── Phase 33 "The Arena" ──
  ATHLETIC_PLATEAU_WEEKS: 4,
  INJURY_RISK_HIGH_PCT: 70,
  SOCIAL_ISOLATION_SESSIONS: 10,
  OVERTRAINING_THRESHOLD: 75,
} as const;

const OUTDOOR_SPORTS_DEMAND = [
  "tennis",
  "golf",
  "swimming",
  "volleyball",
  "football",
];
const OUTDOOR_SPORTS_COURTS = ["tennis", "golf", "padel", "swimming"];

// ═══════════════════════════════════════════════════════════
// SECTION 4 — RULES (22 rules × 6 layers)
//
// Layers: context (100), reactive (200), preventive (300),
//         optimization (400), proactive (500), innovation (500)
// ═══════════════════════════════════════════════════════════

// ── Layer 1: Context (3) ──────────────────────────────────

const R1_COURTS_STATUS: RuleDefinition<SportsContext> = {
  id: "R1_COURTS_STATUS",
  name: "Estado de canchas",
  layer: "micro",
  domain: "sports",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.totalCourts === 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "R1_COURTS_STATUS"),
      impact: "low",
      title: `${ctx.totalCourts} canchas monitoreadas`,
      reasoning: `Utilización promedio: ${ctx.avgUtilization.toFixed(1)}%. ${
        ctx.underusedCourts.length > 0
          ? `${ctx.underusedCourts.length} por debajo del ${THRESHOLDS.COURT_UTIL_LOW_PCT}%.`
          : "Todas sobre el target."
      }`,
      confidence: 95,
      target_view: "courts",
    });
  },
};

const R2_ACTIVE_TOURNAMENTS: RuleDefinition<SportsContext> = {
  id: "R2_ACTIVE_TOURNAMENTS",
  name: "Torneos activos",
  layer: "micro",
  domain: "sports",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.totalTournaments === 0) return null;
    const parts: string[] = [];
    if (ctx.inProgressTournaments > 0)
      parts.push(`${ctx.inProgressTournaments} en curso`);
    if (ctx.upcomingTournaments > 0)
      parts.push(`${ctx.upcomingTournaments} próximos`);
    return buildInsight({
      id: generateInsightId("sports", "R2_ACTIVE_TOURNAMENTS"),
      impact: "low",
      title: `${ctx.totalTournaments} torneos registrados`,
      reasoning: `${parts.join(", ")}. Participación promedio: ${ctx.avgParticipationRate}%.`,
      confidence: 90,
      target_view: "tournaments",
    });
  },
};

const R3_CLASSES_SUMMARY: RuleDefinition<SportsContext> = {
  id: "R3_CLASSES_SUMMARY",
  name: "Resumen de clases",
  layer: "micro",
  domain: "sports",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.activeClasses === 0) return null;
    const lowCount = ctx.underperformingClasses.length;
    return buildInsight({
      id: generateInsightId("sports", "R3_CLASSES_SUMMARY"),
      impact: "low",
      title: `${ctx.activeClasses} clases activas`,
      reasoning:
        lowCount > 0
          ? `${lowCount} con inscripción baja (<${THRESHOLDS.CLASS_UNDERPERFORM_PCT}%).`
          : "Todas con inscripción saludable.",
      confidence: 90,
      target_view: "classes",
    });
  },
};

// ── Layer 2: Reactive (4) ─────────────────────────────────

const R4_LOW_COURT_UTIL: RuleDefinition<SportsContext> = {
  id: "R4_LOW_COURT_UTIL",
  name: "Canchas subutilizadas",
  layer: "macro",
  domain: "sports",
  priority: 200,
  emitSignals: [SPT_UTILIZATION_DROP],
  evaluate: (ctx) => {
    if (ctx.underusedCourts.length === 0) return null;
    const names = ctx.underusedCourts
      .map((c) => `${c.court_name} (${c.utilization_pct}%)`)
      .join(", ");
    return buildInsight({
      id: generateInsightId("sports", "R4_LOW_COURT_UTIL"),
      impact: "high",
      title: `${ctx.underusedCourts.length} cancha(s) subutilizada(s)`,
      reasoning: `Por debajo del ${THRESHOLDS.COURT_UTIL_LOW_PCT}%: ${names}. Promocionar o reasignar para maximizar el uso del espacio.`,
      confidence: 88,
      target_view: "courts",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "manage_court_reservations",
        params: { action: "create", purpose: "promotion" },
        approval_level: "auto",
        label: "Promocionar canchas",
      },
    });
  },
};

const R5_TOURNAMENT_REG_LOW: RuleDefinition<SportsContext> = {
  id: "R5_TOURNAMENT_REG_LOW",
  name: "Participación en torneos baja",
  layer: "macro",
  domain: "sports",
  priority: 200,
  evaluate: (ctx) => {
    if (
      ctx.avgParticipationRate >= THRESHOLDS.PARTICIPATION_LOW_PCT ||
      (ctx.upcomingTournaments === 0 && ctx.inProgressTournaments === 0)
    )
      return null;
    return buildInsight({
      id: generateInsightId("sports", "R5_TOURNAMENT_REG_LOW"),
      impact: "high",
      title: `Participación en torneos: ${ctx.avgParticipationRate}%`,
      reasoning: `Por debajo del target del ${THRESHOLDS.PARTICIPATION_LOW_PCT}%. Lanzar campaña de inscripción dirigida para llenar los torneos activos.`,
      confidence: 82,
      target_view: "tournaments",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: {},
        approval_level: "auto",
        label: "Enviar campaña de inscripción",
      },
    });
  },
};

const R6_CLASS_LOW_ENROLLMENT: RuleDefinition<SportsContext> = {
  id: "R6_CLASS_LOW_ENROLLMENT",
  name: "Inscripción baja en clases",
  layer: "macro",
  domain: "sports",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.underperformingClasses.length === 0) return null;
    const worst = ctx.underperformingClasses[0];
    const others =
      ctx.underperformingClasses.length > 1
        ? ` y ${ctx.underperformingClasses.length - 1} más`
        : "";
    return buildInsight({
      id: generateInsightId("sports", "R6_CLASS_LOW_ENROLLMENT"),
      impact: "medium",
      title: `Inscripción baja: ${worst.name}`,
      reasoning: `${worst.name} con ${worst.fill_rate_pct}% de capacidad (${worst.enrolled}/${worst.capacity})${others}. Revisar horario o promover.`,
      confidence: 85,
      target_view: "classes",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "manage_fitness_classes",
        params: { action: "update", class_id: worst.class_id },
        approval_level: "auto",
        label: "Ajustar clase",
      },
    });
  },
};

const R7_EQUIPMENT_REPAIR: RuleDefinition<SportsContext> = {
  id: "R7_EQUIPMENT_REPAIR",
  name: "Equipamiento requiere atención",
  layer: "macro",
  domain: "sports",
  priority: 200,
  evaluate: (ctx) => {
    if (
      ctx.criticalEquipment.length === 0 &&
      ctx.damagedEquipment.length === 0
    )
      return null;
    const criticalCount = ctx.criticalEquipment.length;
    const damagedCount = ctx.damagedEquipment.length;
    return buildInsight({
      id: generateInsightId("sports", "R7_EQUIPMENT_REPAIR"),
      impact: criticalCount > 0 ? "high" : "medium",
      title: `${damagedCount} item(s) de equipamiento requieren atención`,
      reasoning:
        criticalCount > 0
          ? `${criticalCount} con reemplazo urgente. ${damagedCount - criticalCount} necesitan mantenimiento. Programar acción inmediata.`
          : `${damagedCount} item(s) con condición fair/needs_repair. Programar mantenimiento preventivo.`,
      confidence: 92,
      target_view: "equipment",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "get_equipment_availability",
        params: {},
        approval_level: "auto",
        label: "Ver equipamiento",
      },
    });
  },
};

// ── Layer 3: Preventive (3) ───────────────────────────────

const R8_NO_TOURNAMENTS: RuleDefinition<SportsContext> = {
  id: "R8_NO_TOURNAMENTS",
  name: "Sin torneos programados",
  layer: "prediction",
  domain: "sports",
  priority: 300,
  evaluate: (ctx) => {
    if (ctx.upcomingTournaments > 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "R8_NO_TOURNAMENTS"),
      impact: "medium",
      title: "Sin torneos programados próximos",
      reasoning:
        "No hay torneos en los próximos 60 días. Los socios esperan competencia regular. Organizar un torneo mantiene el engagement competitivo.",
      confidence: 80,
      target_view: "tournaments",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "organize_tournament",
        params: { action: "create" },
        approval_level: "hitl",
        label: "Crear torneo",
      },
    });
  },
};

const R9_COACHING_GAP: RuleDefinition<SportsContext> = {
  id: "R9_COACHING_GAP",
  name: "Actividad de coaching baja",
  layer: "prediction",
  domain: "sports",
  priority: 300,
  evaluate: (ctx) => {
    if (ctx.totalCoachingSessions > THRESHOLDS.COACHING_GAP_SESSIONS)
      return null;
    return buildInsight({
      id: generateInsightId("sports", "R9_COACHING_GAP"),
      impact: "medium",
      title: "Actividad de coaching baja",
      reasoning: `Solo ${ctx.totalCoachingSessions} sesión(es) de coaching con ${ctx.uniqueCoaches} coach(es). El coaching privado es un driver de retención y revenue premium.`,
      confidence: 75,
      target_view: "courts",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "coordinate_coaching",
        params: { action: "create" },
        approval_level: "auto",
        label: "Programar coaching",
      },
    });
  },
};

const R10_SEASONAL_MISMATCH: RuleDefinition<SportsContext> = {
  id: "R10_SEASONAL_MISMATCH",
  name: "Deportes outdoor subexplotados en temporada alta",
  layer: "prediction",
  domain: "sports",
  priority: 300,
  evaluate: (ctx) => {
    if (!ctx.isPeakSeason) return null;
    const outdoorActivity = ctx.sportPopularity
      .filter((p) => OUTDOOR_SPORTS_DEMAND.includes(p.sport))
      .reduce((s, p) => s + p.total_activity, 0);
    const outdoorShare =
      ctx.totalActivity > 0
        ? (outdoorActivity / ctx.totalActivity) * 100
        : 0;
    if (outdoorShare >= THRESHOLDS.OUTDOOR_SHARE_MIN_PCT) return null;
    return buildInsight({
      id: generateInsightId("sports", "R10_SEASONAL_MISMATCH"),
      impact: "medium",
      title: "Temporada alta: deportes outdoor subexplotados",
      reasoning: `Estamos en temporada seca (dic-abr) pero los deportes outdoor representan solo ${outdoorShare.toFixed(0)}% de la actividad. Aprovechar el clima para impulsar tennis, golf y swimming.`,
      confidence: 85,
      target_view: "classes",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "manage_fitness_classes",
        params: { action: "create" },
        approval_level: "auto",
        label: "Crear programa outdoor",
      },
    });
  },
};

// ── Layer 4: Optimization (3) ─────────────────────────────

const R11_PEAK_HOUR_SATURATION: RuleDefinition<SportsContext> = {
  id: "R11_PEAK_HOUR_SATURATION",
  name: "Hora pico saturada",
  layer: "utilization",
  domain: "sports",
  priority: 400,
  emitSignals: [SPT_CAPACITY_WARNING],
  evaluate: (ctx) => {
    if (!ctx.peakHourSaturation) return null;
    return buildInsight({
      id: generateInsightId("sports", "R11_PEAK_HOUR_SATURATION"),
      impact: "medium",
      title: `Hora pico saturada: ${ctx.busiestHour}`,
      reasoning: `${ctx.busiestHourCount} reservas en el horario ${ctx.busiestHour}. Considerar pricing dinámico o redistribución de demanda hacia horas valle.`,
      confidence: 82,
      target_view: "courts",
    });
  },
};

const R12_SPORT_IMBALANCE: RuleDefinition<SportsContext> = {
  id: "R12_SPORT_IMBALANCE",
  name: "Concentración excesiva en un deporte",
  layer: "utilization",
  domain: "sports",
  priority: 400,
  evaluate: (ctx) => {
    if (
      ctx.sportConcentrationPct <=
      THRESHOLDS.SPORT_CONCENTRATION_MAX_PCT
    )
      return null;
    return buildInsight({
      id: generateInsightId("sports", "R12_SPORT_IMBALANCE"),
      impact: "medium",
      title: `${ctx.dominantSport?.toUpperCase()} domina ${ctx.sportConcentrationPct}% de la actividad`,
      reasoning:
        "Concentración excesiva en un solo deporte. Diversificar la oferta reduce riesgo y abre nuevos segmentos de socios.",
      confidence: 78,
      target_view: "intelligence",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: {},
        approval_level: "auto",
        label: "Diversificar oferta",
      },
    });
  },
};

const R13_EQUIPMENT_STALE: RuleDefinition<SportsContext> = {
  id: "R13_EQUIPMENT_STALE",
  name: "Equipamiento sin mantenimiento",
  layer: "utilization",
  domain: "sports",
  priority: 400,
  evaluate: (ctx) => {
    if (ctx.staleEquipment.length === 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "R13_EQUIPMENT_STALE"),
      impact: "high",
      title: `${ctx.staleEquipment.length} item(s) sin mantenimiento en +12 meses`,
      reasoning:
        "Equipamiento sin mantenimiento preventivo incrementa el riesgo de falla y el costo de reemplazo. Programar revisión inmediata.",
      confidence: 90,
      target_view: "equipment",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "get_equipment_availability",
        params: {},
        approval_level: "auto",
        label: "Programar mantenimiento",
      },
    });
  },
};

// ── Layer 5: Proactive (2) ────────────────────────────────

const R14_TOURNAMENT_OPPORTUNITY: RuleDefinition<SportsContext> = {
  id: "R14_TOURNAMENT_OPPORTUNITY",
  name: "Oportunidad de torneo express",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  evaluate: (ctx) => {
    if (!ctx.isPeakSeason || ctx.upcomingTournaments > 0) return null;
    const outdoorCourts =
      ctx.analytics?.court_utilization?.filter((c) =>
        OUTDOOR_SPORTS_COURTS.includes(c.sport),
      ) ?? [];
    const availableCourts = outdoorCourts.filter(
      (c) => c.utilization_pct < 70,
    );
    if (availableCourts.length < 2) return null;
    return buildInsight({
      id: generateInsightId("sports", "R14_TOURNAMENT_OPPORTUNITY"),
      impact: "high",
      title:
        "Temporada alta + canchas disponibles = oportunidad de torneo",
      reasoning: `${availableCourts.length} canchas outdoor con espacio. Es temporada seca — el mejor momento para un torneo express de fin de semana con alto impacto social y de revenue.`,
      confidence: 88,
      target_view: "tournaments",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "organize_tournament",
        params: {
          action: "create",
          name: "Torneo Express Fin de Semana",
        },
        approval_level: "hitl",
        label: "Crear torneo express",
      },
    });
  },
};

const R15_ENGAGEMENT_LOW: RuleDefinition<SportsContext> = {
  id: "R15_ENGAGEMENT_LOW",
  name: "Engagement deportivo bajo",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  evaluate: (ctx) => {
    if (ctx.engagementScore >= THRESHOLDS.ENGAGEMENT_LOW_SCORE)
      return null;
    return buildInsight({
      id: generateInsightId("sports", "R15_ENGAGEMENT_LOW"),
      impact: "high",
      title: `Engagement deportivo bajo: ${ctx.engagementScore}/100`,
      reasoning: `La participación deportiva está por debajo del nivel saludable (${THRESHOLDS.ENGAGEMENT_LOW_SCORE}). El Motor de Engagement puede generar propuestas personalizadas para reactivar socios.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: {},
        approval_level: "auto",
        label: "Generar propuestas",
      },
    });
  },
};

// ── Layer 6: Innovation — Phase 33 "The Arena" (7) ────────

const SR16_ATHLETIC_PLATEAU: RuleDefinition<SportsContext> = {
  id: "SR16_ATHLETIC_PLATEAU",
  name: "Plateau atlético detectado",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  emitSignals: [SPT_SKILL_BREAKTHROUGH],
  dataDependencies: ["athleticPlateauCount", "skillBreakthroughs"],
  evaluate: (ctx) => {
    if (
      ctx.athleticPlateauCount === 0 && ctx.skillBreakthroughs === 0
    )
      return null;

    if (ctx.skillBreakthroughs > 0) {
      return buildInsight({
        id: generateInsightId("sports", "SR16_ATHLETIC_PLATEAU"),
        impact: "low",
        title: `${ctx.skillBreakthroughs} avance(s) de habilidad detectado(s)`,
        reasoning:
          "Socios han superado su nivel anterior. Reconocer el logro refuerza el compromiso y genera contenido social.",
        confidence: 80,
        target_view: "intelligence",
      });
    }

    return buildInsight({
      id: generateInsightId("sports", "SR16_ATHLETIC_PLATEAU"),
      impact: "medium",
      title: `${ctx.athleticPlateauCount} socio(s) en plateau atlético`,
      reasoning: `Sin progresión en ${THRESHOLDS.ATHLETIC_PLATEAU_WEEKS}+ semanas. Sugerir variación de rutina, nuevo deporte complementario o coaching especializado.`,
      confidence: 75,
      target_view: "intelligence",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: { purpose: "plateau_breakthrough" },
        approval_level: "auto",
        label: "Sugerir variación de rutina",
      },
    });
  },
};

const SR17_INJURY_RISK_CLUSTER: RuleDefinition<SportsContext> = {
  id: "SR17_INJURY_RISK_CLUSTER",
  name: "Cluster de riesgo de lesión",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  emitSignals: [SPT_INJURY_RISK],
  dataDependencies: ["injuryRiskMembers"],
  evaluate: (ctx) => {
    if (ctx.injuryRiskMembers === 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "SR17_INJURY_RISK_CLUSTER"),
      impact: "high",
      title: `${ctx.injuryRiskMembers} socio(s) con riesgo alto de lesión`,
      reasoning:
        "Patrones de uso excesivo o desequilibrio muscular detectados. Contactar proactivamente para recomendar descanso o cross-training.",
      confidence: 78,
      target_view: "intelligence",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: { purpose: "injury_prevention" },
        approval_level: "auto",
        label: "Enviar recomendación preventiva",
      },
    });
  },
};

const SR18_SOCIAL_ISOLATION: RuleDefinition<SportsContext> = {
  id: "SR18_SOCIAL_ISOLATION",
  name: "Socios aislados deportivamente",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  consumeSignals: ["evt_low_engagement"],
  dataDependencies: ["isolatedMembers"],
  evaluate: (ctx) => {
    if (ctx.isolatedMembers === 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "SR18_SOCIAL_ISOLATION"),
      impact: "medium",
      title: `${ctx.isolatedMembers} socio(s) practican solos regularmente`,
      reasoning:
        "Jugadores individuales sin partner frecuente. El Social Sport Engine puede sugerir parejas compatibles para dobles, grupos de running o sesiones de coaching grupal.",
      confidence: 72,
      target_view: "intelligence",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: { purpose: "social_matching" },
        approval_level: "auto",
        label: "Sugerir parejas compatibles",
      },
    });
  },
};

const SR19_OVERTRAINING_DETECTED: RuleDefinition<SportsContext> = {
  id: "SR19_OVERTRAINING_DETECTED",
  name: "Posible sobreentrenamiento",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  emitSignals: [SPT_PARTICIPATION_DECLINE],
  dataDependencies: ["overtrainingFlags"],
  evaluate: (ctx) => {
    if (ctx.overtrainingFlags === 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "SR19_OVERTRAINING_DETECTED"),
      impact: "high",
      title: `${ctx.overtrainingFlags} socio(s) con señales de sobreentrenamiento`,
      reasoning:
        "Frecuencia de entrenamiento excesiva combinada con señales de fatiga. El Sport Wellness Engine recomienda reducir intensidad o agregar días de descanso activo.",
      confidence: 70,
      target_view: "intelligence",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: { purpose: "recovery_plan" },
        approval_level: "auto",
        label: "Sugerir plan de recuperación",
      },
    });
  },
};

const SR20_CROSS_DOMAIN_VENUE: RuleDefinition<SportsContext> = {
  id: "SR20_CROSS_DOMAIN_VENUE",
  name: "Impacto cruzado: capacidad de eventos",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  consumeSignals: ["evt_capacity_alert"],
  emitSignals: [SPT_SEASON_CLIMAX],
  dataDependencies: ["eventCapacityAlerts"],
  evaluate: (ctx) => {
    if (ctx.eventCapacityAlerts === 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "SR20_CROSS_DOMAIN_VENUE"),
      impact: "medium",
      title: "Evento externo impacta disponibilidad deportiva",
      reasoning: `${ctx.eventCapacityAlerts} alerta(s) de capacidad en eventos. Esto puede reducir la disponibilidad de canchas. Revisar calendario y reasignar reservas afectadas.`,
      confidence: 82,
      target_view: "courts",
    });
  },
};

const SR21_CROSS_DOMAIN_FINANCIAL: RuleDefinition<SportsContext> = {
  id: "SR21_CROSS_DOMAIN_FINANCIAL",
  name: "Impacto financiero en oferta deportiva",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  consumeSignals: ["fin_revenue_decline", "fin_margin_pressure"],
  dataDependencies: ["clubRevenueDeclining"],
  evaluate: (ctx) => {
    if (!ctx.clubRevenueDeclining) return null;
    return buildInsight({
      id: generateInsightId("sports", "SR21_CROSS_DOMAIN_FINANCIAL"),
      impact: "high",
      title: "Revenue en declive — optimizar oferta deportiva",
      reasoning:
        "El Motor Financiero detecta caída de revenue. El área deportiva puede contribuir: clases premium, coaching privado, y torneos con entry fee son los items de mayor margen.",
      confidence: 75,
      target_view: "intelligence",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "generate_sports_proposals",
        params: { purpose: "revenue_optimization" },
        approval_level: "auto",
        label: "Optimizar revenue deportivo",
      },
    });
  },
};

const SR22_FACILITY_REASSIGNMENT: RuleDefinition<SportsContext> = {
  id: "SR22_FACILITY_REASSIGNMENT",
  name: "Reasignación por sobrecapacidad de facility",
  layer: "innovation",
  domain: "sports",
  priority: 500,
  consumeSignals: ["fac_venue_overcapacity"],
  emitSignals: [SPT_VENUE_OVERCAPACITY],
  dataDependencies: ["facOvercapacityEvents"],
  evaluate: (ctx) => {
    if (ctx.facOvercapacityEvents === 0) return null;
    return buildInsight({
      id: generateInsightId("sports", "SR22_FACILITY_REASSIGNMENT"),
      impact: "high",
      title: "Facility sobrecargada — reasignar actividades deportivas",
      reasoning: `${ctx.facOvercapacityEvents} evento(s) de sobrecapacidad en facilities. El Arena Intelligence Engine puede redistribuir sesiones a canchas con menor utilización.`,
      confidence: 85,
      target_view: "courts",
      action: {
        action: "mutate",
        type: "mutate",
        server: "sports_recreation",
        tool: "manage_court_reservations",
        params: { action: "reassign" },
        approval_level: "auto",
        label: "Reasignar canchas",
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — RULES ARRAY + HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

export const SPORTS_RULES: RuleDefinition<SportsContext>[] = [
  // Context (3)
  R1_COURTS_STATUS,
  R2_ACTIVE_TOURNAMENTS,
  R3_CLASSES_SUMMARY,
  // Reactive (4)
  R4_LOW_COURT_UTIL,
  R5_TOURNAMENT_REG_LOW,
  R6_CLASS_LOW_ENROLLMENT,
  R7_EQUIPMENT_REPAIR,
  // Preventive (3)
  R8_NO_TOURNAMENTS,
  R9_COACHING_GAP,
  R10_SEASONAL_MISMATCH,
  // Optimization (3)
  R11_PEAK_HOUR_SATURATION,
  R12_SPORT_IMBALANCE,
  R13_EQUIPMENT_STALE,
  // Proactive (2)
  R14_TOURNAMENT_OPPORTUNITY,
  R15_ENGAGEMENT_LOW,
  // ── Phase 33 "The Arena" — Innovation (7) ──
  SR16_ATHLETIC_PLATEAU,
  SR17_INJURY_RISK_CLUSTER,
  SR18_SOCIAL_ISOLATION,
  SR19_OVERTRAINING_DETECTED,
  SR20_CROSS_DOMAIN_VENUE,
  SR21_CROSS_DOMAIN_FINANCIAL,
  SR22_FACILITY_REASSIGNMENT,
];

export const SPORTS_HEALTH_FACTORS: HealthFactorDef<SportsContext>[] = [
  {
    id: "court_utilization",
    label: "Utilización de canchas",
    compute: (ctx) => Math.min(ctx.avgUtilization, 100),
    weight: 0.3,
  },
  {
    id: "class_health",
    label: "Salud de clases",
    compute: (ctx) => {
      if (ctx.activeClasses === 0) return 50;
      const healthy =
        ctx.activeClasses - ctx.underperformingClasses.length;
      return Math.round((healthy / ctx.activeClasses) * 100);
    },
    weight: 0.25,
  },
  {
    id: "equipment_health",
    label: "Salud de equipamiento",
    compute: (ctx) => {
      if (ctx.totalEquipment === 0) return 50;
      return Math.max(
        0,
        Math.round(
          ((ctx.totalEquipment - ctx.damagedEquipment.length) /
            ctx.totalEquipment) *
            100,
        ),
      );
    },
    weight: 0.2,
  },
  {
    id: "engagement",
    label: "Engagement deportivo",
    compute: (ctx) => ctx.engagementScore,
    weight: 0.15,
  },
  {
    id: "tournament_activity",
    label: "Actividad de torneos",
    compute: (ctx) =>
      Math.min(
        100,
        ctx.upcomingTournaments * 30 + ctx.inProgressTournaments * 20,
      ),
    weight: 0.1,
  },
];