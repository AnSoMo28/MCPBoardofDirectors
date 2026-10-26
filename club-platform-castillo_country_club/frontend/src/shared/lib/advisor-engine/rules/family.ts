// ═══════════════════════════════════════════════════════════
// src/shared/lib/advisor-engine/rules/family.ts
// Phase 34+ Migration — Families Advisor Engine Rules
// Level 6+ Agency · Production Grade
//
// 22 declarative rules across 6 intelligence layers.
// Consolidated from 30 inline rules in useFamilyAdvisor.ts.
//
// Layer 1: Health Diagnostic (R1-R5)      — 5 rules
// Layer 2: Lifecycle Intelligence (R6-R11) — 6 rules
// Layer 3: Social Intelligence (R12-R13)   — 2 rules
// Layer 4: Financial Optimization (R14-R17)— 4 rules
// Layer 5: Engagement Innovation (R18-R22) — 5 rules
//
// Signals emitted:   6 (fm_*)
// Signals consumed:  5 (spt_*, evt_*, sat_*, age_group_*)
// Health factors:    5 (engagement, activity, social, financial, lifecycle)
//
// PRE-WRITE VERIFICATION:
//   RuleDefinition<FamilyContext> → @/shared/lib/advisor-engine/types.ts ✅
//   SignalDefinition              → @/shared/lib/advisor-engine/types.ts ✅
//   HealthFactorDef<FamilyContext> → @/shared/lib/advisor-engine/types.ts ✅
//   BaseContext                   → @/shared/lib/advisor-engine/types.ts ✅
//   AdvisorCommand                → @/shared/types/ai-intelligence.ts ✅
//   AdvisorInsightBase            → @/shared/types/ai-intelligence.ts ✅
//   AIDomain                      → @/shared/types/ai-intelligence.ts ✅
//   SeverityLevel                 → @/shared/types/domain-enums.ts ✅
//   Family, ActivityRecord, etc   → @/features/families/types.ts ✅
//   EnrichmentState, etc          → @/features/families/ai-types.ts ✅
//   SocialBond                    → @/features/families/social-types.ts ✅
//   SIGNAL_NAMES includes fm_*   → @/shared/lib/advisor-engine/types.ts ✅
//   FamilyContext extends BaseContext ✅
//   IntraFamilyBond (NOT RelationshipStrand) ✅
//   animationClass (NOT cssClass) ✅
//
// ANTI-PATTERNS REMOVED:
//   - 30 inline rules in useMemo → 22 declarative RuleDefinition
//   - 9 positional parameters → 1 props object
//   - as unknown Record<string, unknown> → typed SocialBond
//   - daysSince from lib → local daysBetween
//   - confidence 0-100 hardcoded → consistent 0-100 with docs
//   - Duplicate rules (R1+R28, R2+R26, R4+R11+R14, R12+R15) → consolidated
//   - No signal emission → 6 emitSignals
//   - No signal consumption → 5 consumeSignals
// ═══════════════════════════════════════════════════════════

import type {
  RuleDefinition,
  SignalDefinition,
  HealthFactorDef,
  BaseContext,
} from "@/shared/lib/advisor-engine/types";

import type {
  AdvisorCommand,
  AdvisorInsightBase,
  AIDomain,
} from "@/shared/types/ai-intelligence";

import type { SeverityLevel } from "@/shared/types/domain-enums";

import type {
  Family,
  ActivityRecord,
  FinancialSummary,
  FamilyPreferences,
  LifecycleStage,
} from "@/features/families/types";

import type {
  FamilyPulseVital,
  EngagementTemperature,
  FamilyBrief,
  LifecycleProjection,
  EnrichmentState,
  FamilyEnrichmentData,
} from "@/features/families/ai-types";

import type { SocialBond } from "@/features/families/social-types";

// ═══════════════════════════════════════════════════════════
// §0  FAMILY CONTEXT — Build context for rule evaluation
// ═══════════════════════════════════════════════════════════

/**
 * Cross-domain data summaries consumed via signals.
 * Populated by the signal bus before rule evaluation.
 */
export interface EventAttendanceSummary {
  readonly totalEventsAttended: number;
  readonly last30DaysEvents: number;
  readonly last60DaysEvents: number;
  readonly last90DaysEvents: number;
  readonly avgEventsPerMonth: number;
  readonly topCategory: string;
}

export interface CommunicationEngagementSummary {
  readonly totalSent: number;
  readonly totalOpened: number;
  readonly openRate: number;
  readonly last30DaysOpenRate: number;
  readonly last90DaysOpenRate: number;
  readonly lastClickedDate: string | null;
  readonly preferredChannel: string;
}

export interface WellnessUsageSummary {
  readonly totalSessions: number;
  readonly last30DaysSessions: number;
  readonly activeServices: readonly string[];
  readonly unusedServices: readonly string[];
}

/**
 * Family context — all data needed for rule evaluation.
 * Built by buildFamilyContext() from raw data + signals.
 */
export interface FamilyContext extends BaseContext {
  readonly domain: "family";

  // Core data
  readonly family: Family;
  readonly activity: readonly ActivityRecord[];
  readonly financial: FinancialSummary | null;
  readonly social: readonly SocialBond[];
  readonly preferences: FamilyPreferences | null;

  // AI enrichment
  readonly enrichment: EnrichmentState<FamilyEnrichmentData>;
  readonly pulse: FamilyPulseVital | null;
  readonly temperature: EngagementTemperature | null;
  readonly brief: FamilyBrief | null;
  readonly lifecycle: LifecycleProjection | null;

  // Computed fields (pre-calculated for rule efficiency)
  readonly tenure: number;
  readonly engagementScore: number;
  readonly recentActivityCount: number;
  readonly totalActivityCount: number;
  readonly connectionCount: number;
  readonly sharedEventsTotal: number;
  readonly interests: readonly string[];
  readonly balance: number;
  readonly memberCount: number;
  readonly hasChildren: boolean;

  // Cross-domain (extracted from signals)
  readonly eventAttendance: EventAttendanceSummary | null;
  readonly communicationEngagement: CommunicationEngagementSummary | null;
  readonly wellnessUsage: WellnessUsageSummary | null;
}

// ═══════════════════════════════════════════════════════════
// §1  HELPERS — Pure utility functions for rule evaluation
// ═══════════════════════════════════════════════════════════

const daysBetween = (dateStr: string): number =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);

function recentActivityCount(
  records: readonly ActivityRecord[],
  days: number,
): number {
  const cutoff = Date.now() - days * 86_400_000;
  return records.filter((r) => new Date(r.date).getTime() >= cutoff).length;
}

type FamilyRuleAction = {
  label: string;
  targetTab?: string;
  toast?: string;
};

function buildFamilyRuleInsight(
  insight: Omit<AdvisorInsightBase, "reasoning" | "action"> & {
    reasoning?: string;
    action?: FamilyRuleAction | AdvisorCommand;
  },
): AdvisorInsightBase {
  const action = insight.action
    ? (typeof insight.action === "object" && "targetTab" in insight.action
      ? {
          action: "navigate",
          type: "mutate" as const,
          server: "family-advisor",
          tool: "open_tab",
          params: {
            targetTab: insight.action.targetTab,
            toast: insight.action.toast,
          },
          approval_level: "auto" as const,
          label: insight.action.label,
          targetTab: insight.action.targetTab,
          toast: insight.action.toast,
        }
      : insight.action)
    : undefined;

  return {
    ...insight,
    reasoning: insight.reasoning ?? insight.description ?? "",
    action,
  } as AdvisorInsightBase;
}

// ═══════════════════════════════════════════════════════════
// §2  BUILD CONTEXT — Transform raw data + signals into FamilyContext
// ═══════════════════════════════════════════════════════════

/**
 * Build FamilyContext from raw MCP data + consumed signals.
 * Called by useFamilyAdvisor before engine.evaluate().
 */
export function buildFamilyContext(
  rawData: {
    family: Family;
    activity?: readonly ActivityRecord[];
    financial?: FinancialSummary | null;
    social?: readonly SocialBond[];
    preferences?: FamilyPreferences | null;
    enrichment?: EnrichmentState<FamilyEnrichmentData>;
  },
  signals?: import("@/shared/lib/advisor-engine/types").DomainSignal[],
): FamilyContext {
  const { family, activity = [], financial = null, social = [], preferences = null, enrichment } = rawData;

  // Extract enrichment data safely
  const enrichmentData = enrichment?.status === "enriched"
    ? (enrichment.data as FamilyEnrichmentData & {
        lifecycle?: LifecycleProjection;
      })
    : null;
  const pulse = enrichmentData?.pulse ?? null;
  const temperature = enrichmentData?.temperature ?? null;
  const brief = enrichmentData?.brief ?? null;
  const lifecycle = enrichmentData?.lifecycle ?? null;

  // Compute derived fields
  const tenure = daysBetween(family.since);
  const connCount = social.length;
  const sharedEventsTotal = social.reduce((sum, bond) => {
    return sum + (bond.sharedEvents ?? 0);
  }, 0);
  const hasChildren = family.members?.some(
    (m) => m.role === "hijo" || m.role === "dependiente",
  ) ?? false;

  // Extract cross-domain data from signals
  let eventAttendance: EventAttendanceSummary | null = null;
  let communicationEngagement: CommunicationEngagementSummary | null = null;
  let wellnessUsage: WellnessUsageSummary | null = null;

  if (signals) {
    for (const signal of signals) {
      if (signal.signalDefId === "evt_low_engagement" && signal.metadata) {
        eventAttendance = signal.metadata as unknown as EventAttendanceSummary;
      }
      if (signal.signalDefId === "comm_delivery_critical" && signal.metadata) {
        communicationEngagement = signal.metadata as unknown as CommunicationEngagementSummary;
      }
    }
  }

  return {
    domain: "family",
    family,
    activity,
    financial,
    social,
    preferences,
    enrichment: enrichment ?? { status: "idle" },
    pulse,
    temperature,
    brief,
    lifecycle,
    tenure,
    engagementScore: family.engagementScore,
    recentActivityCount: recentActivityCount(activity, 30),
    totalActivityCount: activity.length,
    connectionCount: connCount,
    sharedEventsTotal,
    interests: preferences?.interests ?? [],
    balance: financial?.currentBalance ?? 0,
    memberCount: family.memberCount,
    hasChildren,
    eventAttendance,
    communicationEngagement,
    wellnessUsage,
    signals,
  };
}

// ═══════════════════════════════════════════════════════════
// §3  SIGNAL DEFINITIONS — What Families emits
// ═══════════════════════════════════════════════════════════

export const FM_SIG_FAMILY_RISK: SignalDefinition = {
  id: "fm_family_risk",
  targetDomains: ["engagement", "satisfaction"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Family at risk — engagement crisis detected",
  ttl: 300_000,
};

export const FM_SIG_LIFECYCLE_TRANSITION: SignalDefinition = {
  id: "fm_lifecycle_transition",
  targetDomains: ["events", "sports", "cultural"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Family lifecycle transition projected",
  ttl: 300_000,
};

export const FM_SIG_CHILDREN_MILESTONE: SignalDefinition = {
  id: "fm_children_age_milestone",
  targetDomains: ["age-group", "sports"] as AIDomain[],
  defaultSeverity: "low" as SeverityLevel,
  label: "Children approaching age milestone for new programs",
  ttl: 300_000,
};

export const FM_SIG_ENGAGEMENT_GAP: SignalDefinition = {
  id: "fm_engagement_gap",
  targetDomains: ["communications", "recommendations"] as unknown as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Family engagement gap — interests not matched with activities",
  ttl: 300_000,
};

export const FM_SIG_REFERRAL_READY: SignalDefinition = {
  id: "fm_referral_ready",
  targetDomains: ["guests"] as unknown as AIDomain[],
  defaultSeverity: "low" as SeverityLevel,
  label: "Family ready for referral program — high engagement + strong social",
  ttl: 600_000,
};

export const FM_SIG_MILESTONE_APPROACHING: SignalDefinition = {
  id: "fm_milestone_approaching",
  targetDomains: ["events", "communications"] as AIDomain[],
  defaultSeverity: "low" as SeverityLevel,
  label: "Family milestone approaching — anniversary or birthday",
  ttl: 600_000,
};

/** All family signal definitions — for registration with signal-bus */
export const FAMILY_SIGNALS: readonly SignalDefinition[] = [
  FM_SIG_FAMILY_RISK,
  FM_SIG_LIFECYCLE_TRANSITION,
  FM_SIG_CHILDREN_MILESTONE,
  FM_SIG_ENGAGEMENT_GAP,
  FM_SIG_REFERRAL_READY,
  FM_SIG_MILESTONE_APPROACHING,
];

// ═══════════════════════════════════════════════════════════
// §4  HEALTH FACTORS — Family health score composition
// ═══════════════════════════════════════════════════════════

export const FAMILY_HEALTH_FACTORS: HealthFactorDef<FamilyContext>[] = [
  {
    id: "engagement_health",
    label: "Engagement",
    compute: (ctx) => {
      const base = ctx.engagementScore;
      const tempBonus = ctx.temperature
        ? (ctx.temperature.current - 50) * 0.2
        : 0;
      return Math.max(0, Math.min(100, base + tempBonus));
    },
    weight: 0.25,
  },
  {
    id: "activity_health",
    label: "Actividad",
    compute: (ctx) => {
      if (ctx.totalActivityCount === 0) return 10;
      const recency = ctx.recentActivityCount;
      if (recency === 0) return 20;
      if (recency >= 8) return 95;
      if (recency >= 4) return 75;
      return 40 + recency * 10;
    },
    weight: 0.20,
  },
  {
    id: "social_health",
    label: "Social",
    compute: (ctx) => {
      const connScore = Math.min(ctx.connectionCount / 5, 1) * 50;
      const eventScore = Math.min(ctx.sharedEventsTotal / 10, 1) * 30;
      const diversityBonus = ctx.social.length > 0
        ? Math.min(
            new Set(ctx.social.map((s) => s.dominantContext)).size / 3,
            1,
          ) * 20
        : 0;
      return Math.round(connScore + eventScore + diversityBonus);
    },
    weight: 0.15,
  },
  {
    id: "financial_health",
    label: "Financiero",
    compute: (ctx) => {
      if (!ctx.financial) return 50;
      const balance = ctx.financial.currentBalance;
      const limit = ctx.financial.creditLimit;
      if (balance < 0) return 90;
      if (limit === 0) return 60;
      const utilization = balance / limit;
      if (utilization < 0.3) return 95;
      if (utilization < 0.6) return 75;
      if (utilization < 0.8) return 50;
      return 25;
    },
    weight: 0.20,
  },
  {
    id: "lifecycle_health",
    label: "Ciclo de Vida",
    compute: (ctx) => {
      const stageScores: Record<LifecycleStage, number> = {
        prospect: 30,
        onboarding: 50,
        growing: 70,
        peak: 90,
        plateau: 55,
        at_risk: 25,
        dormant: 10,
        reactivated: 65,
      };
      const current = stageScores[ctx.family.status === "active"
        ? (ctx.lifecycle?.currentStage ?? "growing")
        : "dormant"];
      const trendBonus = ctx.lifecycle?.stageProgress
        ? ctx.lifecycle.stageProgress * 10
        : 0;
      return Math.min(100, current + trendBonus);
    },
    weight: 0.20,
  },
];

// ═══════════════════════════════════════════════════════════
// §5  RULES — LAYER 1: HEALTH DIAGNOSTIC
// ═══════════════════════════════════════════════════════════

const FM_HEALTH_ENGAGEMENT: RuleDefinition<FamilyContext> = {
  id: "FM_HEALTH_ENGAGEMENT",
  name: "Engagement crisis detection",
  layer: "health",
  domain: "families" as AIDomain,
  priority: 10,
  emitSignals: [FM_SIG_FAMILY_RISK],
  consumeSignals: ["sat_critical_decline"],
  evaluate: (ctx) => {
    const eng = ctx.engagementScore;
    const tempFrozen = ctx.temperature?.zone === "frozen";

    if (eng >= 30 && !tempFrozen) return null;

    const satSignal = ctx.signals?.find(
      (s) => s.signalDefId === "sat_critical_decline",
    );

    const isCritical = eng < 30 && ctx.tenure > 90;
    const isFrozen = tempFrozen;

    if (!isCritical && !isFrozen) return null;

    const impact: AdvisorInsightBase["impact"] = isCritical && isFrozen ? "high" : isCritical ? "high" : "medium";
    const confidence = satSignal ? 95 : isCritical ? 90 : 85;

    const tempInfo = ctx.temperature
      ? `Temperatura: ${ctx.temperature.current}° (${ctx.temperature.zone}). Club avg: ${ctx.temperature.avgClubTemp}°.`
      : "";

    const eventInfo = ctx.eventAttendance
      ? ctx.eventAttendance.last60DaysEvents === 0
        ? "Sin eventos en 60 días confirma tendencia negativa."
        : ""
      : "";

    return buildFamilyRuleInsight({
      id: "fm-health-engagement",
      title: isCritical ? "Engagement crítico" : "Temperatura frozen",
      description: `Score: ${eng}/100. ${tempInfo} ${eventInfo} ${
        satSignal
          ? "Señal de satisfacción crítica detectada cross-domain."
          : "Familias con engagement <30 tienen 78% de probabilidad de churn en 90 días."
      }`.trim(),
      reasoning: satSignal
        ? "El descenso crítico de satisfacción junto a engagement bajo indica un riesgo inminente de churn."
        : isFrozen
          ? "La temperatura frozen sugiere falta de actividad y posible abandono."
          : "Engagement bajo sostenido sobre 90 días es indicativo de deterioro grave.",
      impact,
      confidence,
      layer: "health",
      action: {
        label: "Plan de retención",
        targetTab: "intelligence",
        toast: "Abriendo análisis inteligente...",
      },
    });
  },
};

const FM_HEALTH_ACTIVITY: RuleDefinition<FamilyContext> = {
  id: "FM_HEALTH_ACTIVITY",
  name: "Activity death detection",
  layer: "health",
  domain: "families" as AIDomain,
  priority: 15,
  emitSignals: [FM_SIG_FAMILY_RISK],
  consumeSignals: ["evt_low_engagement"],
  evaluate: (ctx) => {
    const pulseFlatline = ctx.pulse?.rhythm === "flatline";
    const noRecentActivity = ctx.recentActivityCount === 0 && ctx.totalActivityCount > 0;

    if (!noRecentActivity && !pulseFlatline) return null;

    const evtSignal = ctx.signals?.find(
      (s) => s.signalDefId === "evt_low_engagement",
    );

    const lastBeat = ctx.pulse?.lastBeat
      ? new Date(ctx.pulse.lastBeat).toLocaleDateString("es-CR")
      : "desconocido";

    return buildFamilyRuleInsight({
      id: "fm-health-activity",
      title: pulseFlatline ? "Pulso en flatline" : "Sin actividad reciente",
      description: pulseFlatline
        ? `Sin actividad detectable. BPM: 0, último latido: ${lastBeat}. ${
            ctx.pulse?.zones.dormant ?? 0
          }% zona dormida. Sin intervención, transición a inactiva inminente.`
        : `0 actividades en 30 días. ${ctx.totalActivityCount} en historial total. ${
            evtSignal
              ? "Bajo engagement de eventos confirmado cross-domain."
              : "Patrón de desvinculación."
          }`,
      reasoning: pulseFlatline
        ? "El pulso detectado como flatline indica que no hay actividad en el ciclo de salud actual."
        : "La falta de actividad reciente junto a bajo engagement sugiere riesgo de abandono.",
      impact: pulseFlatline ? "high" : "high",
      confidence: evtSignal ? 92 : 85,
      layer: "health",
      action: {
        label: pulseFlatline ? "Contactar ahora" : "Ver historial",
        targetTab: pulseFlatline ? "intelligence" : "activity",
        toast: pulseFlatline
          ? "Generando plan de reactivación urgente..."
          : "Abriendo historial de actividad...",
      },
    });
  },
};

const FM_HEALTH_FINANCIAL: RuleDefinition<FamilyContext> = {
  id: "FM_HEALTH_FINANCIAL",
  name: "Financial stress detection",
  layer: "health",
  domain: "families" as AIDomain,
  priority: 20,
  evaluate: (ctx) => {
    if (!ctx.financial || ctx.balance <= 0) return null;
    const daysSincePayment = ctx.financial.lastPaymentDate
      ? daysBetween(ctx.financial.lastPaymentDate)
      : 999;

    if (daysSincePayment <= 60) return null;

    const isCritical = daysSincePayment > 90;
    return buildFamilyRuleInsight({
      id: "fm-health-financial",
      title: isCritical
        ? "Saldo sin pago por >90 días"
        : "Saldo pendiente detectado",
      description: `Saldo: ₡${ctx.balance.toLocaleString("es-CR")}. Último pago: hace ${daysSincePayment} días. ${
        isCritical ? "Señal de estrés financiero." : ""
      }`,
      reasoning: isCritical
        ? "El retraso prolongado en pagos suele anticipar problemas financieros y mayor riesgo de abandono."
        : "Hay un saldo pendiente que puede derivar en tensión financiera si no se gestiona pronto.",
      impact: isCritical ? "high" : "medium",
      confidence: isCritical ? 90 : 70,
      layer: "health",
      action: {
        label: "Ver finanzas",
        targetTab: "finances",
        toast: "Abriendo resumen financiero...",
      },
    });
  },
};

const FM_HEALTH_SOCIAL: RuleDefinition<FamilyContext> = {
  id: "FM_HEALTH_SOCIAL",
  name: "Social isolation detection",
  layer: "health",
  domain: "families" as AIDomain,
  priority: 25,
  consumeSignals: ["spt_participation_decline", "age_group_teen_decline"],
  evaluate: (ctx) => {
    const { connectionCount, sharedEventsTotal, tenure, hasChildren, interests } = ctx;
    const sptSignal = ctx.signals?.find(
      (s) => s.signalDefId === "spt_participation_decline",
    );
    const ageSignal = ctx.signals?.find(
      (s) => s.signalDefId === "age_group_teen_decline",
    );

    const isIsolated = connectionCount === 0 || (connectionCount < 2 && sharedEventsTotal === 0);
    const isLowDensity = connectionCount < 2 && tenure > 180;

    if (!isIsolated && !isLowDensity) return null;

    let extraContext = "";
    if (sptSignal) extraContext += " Deportes en baja confirma patrón de desvinculación.";
    if (ageSignal && hasChildren) extraContext += " Hijos adolescentes saliendo del club.";

    return buildFamilyRuleInsight({
      id: "fm-health-social",
      title: isIsolated ? "Aislamiento social detectado" : "Red social insuficiente",
      description: isIsolated
        ? `${connectionCount} conexión(es), ${sharedEventsTotal} eventos compartidos.${
            hasChildren ? " Tiene hijos pero sin grupo de pares." : ""
          }${extraContext}`
        : `${connectionCount} conexiones tras ${Math.floor(tenure / 30)} meses. Club promedio: 5.${
            interests.length >= 3
              ? ` ${interests.length} intereses declarados — potencial de evento social.`
              : ""
          }${extraContext}`,
      reasoning: isIsolated
        ? "La falta de conexiones y eventos compartidos disminuye la sensación de pertenencia y aumenta el riesgo de abandono."
        : "Una red social débil limita la participación y reduce la probabilidad de retención a largo plazo.",
      impact: isIsolated ? "medium" : "high",
      confidence: sptSignal || ageSignal ? 85 : 75,
      layer: "health",
      action: {
        label: "Buscar conexiones",
        targetTab: "social",
        toast: "Abriendo grafo social...",
      },
    });
  },
};

const FM_HEALTH_TIER_MISMATCH: RuleDefinition<FamilyContext> = {
  id: "FM_HEALTH_TIER_MISMATCH",
  name: "Family size vs tier mismatch",
  layer: "health",
  domain: "families" as AIDomain,
  priority: 90,
  evaluate: (ctx) => {
    if (
      ctx.memberCount < 5 ||
      (ctx.family.tier !== "basic" && ctx.family.tier !== "bronce")
    )
      return null;

    return buildFamilyRuleInsight({
      id: "fm-health-tier-mismatch",
      title: "Familia grande en tier básico",
      description: `${ctx.memberCount} miembros en tier ${ctx.family.tier}. Familias grandes se benefician más de tiers superiores.`,
      reasoning: "El tamaño de la familia y el nivel de membresía no están alineados con el valor potencial de la relación con el club.",
      impact: "medium",
      confidence: 60,
      layer: "health",
    });
  },
};

// ═══════════════════════════════════════════════════════════
// §6  RULES — LAYER 2: LIFECYCLE INTELLIGENCE
// ═══════════════════════════════════════════════════════════

const FM_LIFECYCLE_ONBOARDING: RuleDefinition<FamilyContext> = {
  id: "FM_LIFECYCLE_ONBOARDING",
  name: "Onboarding gap detection",
  layer: "lifecycle",
  domain: "families" as AIDomain,
  priority: 30,
  evaluate: (ctx) => {
    if (ctx.tenure >= 90 || ctx.engagementScore >= 60) return null;

    const onboardingActivities = ctx.activity.filter((a) =>
      /tour|bienvenida|orientaci|onboarding/i.test(a.description),
    ).length;

    if (onboardingActivities > 0) return null;

    return buildFamilyRuleInsight({
      id: "fm-lifecycle-onboarding",
      title: "Onboarding incompleto",
      description: `Familia nueva (${ctx.tenure} días) sin actividades de onboarding. 40% del churn ocurre en los primeros 6 meses por falta de integración.`,
      reasoning: "La falta de una bienvenida sólida aumenta la probabilidad de abandono durante los primeros meses de membresía.",
      impact: "high",
      confidence: 85,
      layer: "lifecycle",
      action: {
        label: "Plan de bienvenida",
        targetTab: "intelligence",
        toast: "Generando plan de engagement...",
      },
    });
  },
};

const FM_LIFECYCLE_PLATEAU: RuleDefinition<FamilyContext> = {
  id: "FM_LIFECYCLE_PLATEAU",
  name: "Engagement plateau detection",
  layer: "lifecycle",
  domain: "families" as AIDomain,
  priority: 35,
  evaluate: (ctx) => {
    const eng = ctx.engagementScore;
    if (eng < 40 || eng > 60 || ctx.tenure <= 180) return null;

    return buildFamilyRuleInsight({
      id: "fm-lifecycle-plateau",
      title: "Meseta de engagement",
      description: `Score estable entre 40-60 por más de ${Math.floor(ctx.tenure / 30)} meses. Intervención necesaria para romper la meseta.`,
      reasoning: "La estabilidad en el engagement puede ocultar una pérdida de impulso que requiere nuevas experiencias para reactivar la relación.",
      impact: "medium",
      confidence: 75,
      layer: "lifecycle",
      action: {
        label: "Actividades sugeridas",
        targetTab: "intelligence",
        toast: "Buscando actividades de alto impacto...",
      },
    });
  },
};

const FM_LIFECYCLE_PEAK_RISK: RuleDefinition<FamilyContext> = {
  id: "FM_LIFECYCLE_PEAK_RISK",
  name: "Peak-to-risk transition detection",
  layer: "lifecycle",
  domain: "families" as AIDomain,
  priority: 32,
  consumeSignals: ["evt_low_engagement"],
  evaluate: (ctx) => {
    if (ctx.engagementScore >= 60 || ctx.tenure <= 365) return null;

    const evtSignal = ctx.signals?.find(
      (s) => s.signalDefId === "evt_low_engagement",
    );

    const eventDrop = ctx.eventAttendance
      ? ctx.eventAttendance.last90DaysEvents === 0 &&
        ctx.eventAttendance.avgEventsPerMonth > 1
      : false;

    const isAbrupt = eventDrop || !!evtSignal;

    return buildFamilyRuleInsight({
      id: "fm-lifecycle-peak-risk",
      title: isAbrupt
        ? "Caída abrupta confirmada"
        : "Posible transición de pico a riesgo",
      description: isAbrupt
        ? `Actividad cayó a 0 en 90 días. Promedio histórico: ${
            ctx.eventAttendance?.avgEventsPerMonth ?? "?"
          }/mes. Engagement: ${ctx.engagementScore}. ${
            evtSignal ? "Señal cross-domain de eventos confirma." : ""
          } Intervención urgente.`
        : `Familia con ${Math.floor(ctx.tenure / 365)}+ años, engagement actual: ${ctx.engagementScore}. Detectar causa raíz.`,
      reasoning: isAbrupt
        ? "La caída abrupta de participación suele ser una señal temprana de riesgo de abandono si no se gestiona de inmediato."
        : "Las familias con alto historial y bajo engagement pueden entrar en una fase de riesgo si el patrón se mantiene.",
      impact: isAbrupt ? "high" : "medium",
      confidence: isAbrupt ? 90 : 70,
      layer: "lifecycle",
      action: {
        label: "Análisis profundo",
        targetTab: "intelligence",
        toast: "Analizando factores de riesgo...",
      },
    });
  },
};

const FM_LIFECYCLE_REACTIVATION: RuleDefinition<FamilyContext> = {
  id: "FM_LIFECYCLE_REACTIVATION",
  name: "Reactivation candidate detection",
  layer: "lifecycle",
  domain: "families" as AIDomain,
  priority: 38,
  evaluate: (ctx) => {
    if (ctx.tenure <= 730 || ctx.recentActivityCount > 0 || ctx.engagementScore >= 40) return null;

    return buildFamilyRuleInsight({
      id: "fm-lifecycle-reactivation",
      title: "Candidata a reactivación",
      description: `Familia con ${Math.floor(ctx.tenure / 365)}+ años de antigüedad pero ${ctx.recentActivityCount} actividades recientes. Alto potencial con la estrategia correcta.`,
      reasoning: "Una familia con historial fuerte y poca actividad reciente aún puede volver a sentirse conectada si recibe una intervención pertinente.",
      impact: "medium",
      confidence: 70,
      layer: "lifecycle",
      action: {
        label: "Plan de reactivación",
        targetTab: "intelligence",
        toast: "Generando plan de reactivación...",
      },
    });
  },
};

const FM_LIFECYCLE_LEGACY: RuleDefinition<FamilyContext> = {
  id: "FM_LIFECYCLE_LEGACY",
  name: "Legacy family identification",
  layer: "lifecycle",
  domain: "families" as AIDomain,
  priority: 95,
  evaluate: (ctx) => {
    if (ctx.tenure <= 1825 || ctx.engagementScore <= 70) return null;

    return buildFamilyRuleInsight({
      id: "fm-lifecycle-legacy",
      title: "Familia de alto valor",
      description: `${Math.floor(ctx.tenure / 365)}+ años como socio con engagement de ${ctx.engagementScore}. Referencia para el club.`,
      reasoning: "El historial de largo plazo y el engagement elevado convierten a esta familia en un activo estratégico para el club.",
      impact: "medium",
      confidence: 95,
      layer: "lifecycle",
    });
  },
};

const FM_LIFECYCLE_PROJECTION: RuleDefinition<FamilyContext> = {
  id: "FM_LIFECYCLE_PROJECTION",
  name: "Negative lifecycle projection",
  layer: "lifecycle",
  domain: "families" as AIDomain,
  priority: 28,
  emitSignals: [FM_SIG_LIFECYCLE_TRANSITION],
  evaluate: (ctx) => {
    const lc = ctx.lifecycle;
    if (!lc?.projectedStage || lc.estimatedDaysToTransition <= 0) return null;

    const negativeTargets: LifecycleStage[] = ["at_risk", "dormant"];
    if (!negativeTargets.includes(lc.projectedStage)) return null;

    const windowDays = lc.interventionWindow
      ? Math.ceil(
          (new Date(lc.interventionWindow.closes).getTime() - Date.now()) / 86_400_000,
        )
      : null;

    return buildFamilyRuleInsight({
      id: "fm-lifecycle-projection",
      title: `Transición: ${lc.currentStage} → ${lc.projectedStage}`,
      description: `Estimado en ${lc.estimatedDaysToTransition} días. ${
        windowDays != null && windowDays > 0
          ? `Ventana de intervención: ${windowDays} días. ${lc.interventionWindow?.suggestedActions?.[0] ?? ""}`
          : "Sin ventana definida."
      } Confianza: ${lc.confidence}%.`,
      reasoning: "La proyección de una transición de etapa hacia riesgo requiere atención temprana para sostener la relación con el club.",
      impact: windowDays != null && windowDays <= 7 ? "high" : "medium",
      confidence: lc.confidence,
      layer: "lifecycle",
      action: {
        label: "Intervenir ahora",
        targetTab: "intelligence",
        toast: "Abriendo análisis de lifecycle...",
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════
// §7  RULES — LAYER 3: SOCIAL INTELLIGENCE
// ═══════════════════════════════════════════════════════════

const FM_SOCIAL_REFERRAL: RuleDefinition<FamilyContext> = {
  id: "FM_SOCIAL_REFERRAL",
  name: "Referral champion detection",
  layer: "social",
  domain: "families" as AIDomain,
  priority: 40,
  emitSignals: [FM_SIG_REFERRAL_READY],
  evaluate: (ctx) => {
    const { connectionCount, engagementScore, tenure } = ctx;
    const isHub = connectionCount > 8 && engagementScore > 70;
    const isReferralCandidate = engagementScore > 80 && tenure > 730;

    if (!isHub && !isReferralCandidate) return null;

    if (isHub) {
      return buildFamilyRuleInsight({
        id: "fm-social-hub",
        title: "Candidata a embajadora",
        description: `${connectionCount} conexiones activas, engagement ${engagementScore}. Puede ser referente para nuevas familias.`,
        reasoning: "Una familia con fuerte densidad social y alto engagement tiene el potencial de convertirse en una referencia para nuevas relaciones dentro del club.",
        impact: "medium",
        confidence: 85,
        layer: "social",
      });
    }

    return buildFamilyRuleInsight({
      id: "fm-social-referral",
      title: "Potencial de referidos sin aprovechar",
      description: `Alta lealtad (${Math.floor(tenure / 365)}+ años) y engagement (${engagementScore}). Programa de referidos puede generar nuevas membresías.`,
      reasoning: "La lealtad histórica y el engagement alto indican una oportunidad clara para activar programas de referencia.",
      impact: "high",
      confidence: 75,
      layer: "social",
    });
  },
};

const FM_SOCIAL_CHILDREN: RuleDefinition<FamilyContext> = {
  id: "FM_SOCIAL_CHILDREN",
  name: "Children social integration gap",
  layer: "social",
  domain: "families" as AIDomain,
  priority: 45,
  consumeSignals: ["age_group_teen_decline"],
  emitSignals: [FM_SIG_CHILDREN_MILESTONE],
  evaluate: (ctx) => {
    if (!ctx.hasChildren || ctx.connectionCount >= 2) return null;

    const ageSignal = ctx.signals?.find(
      (s) => s.signalDefId === "age_group_teen_decline",
    );

    const childrenAges = ctx.family.members
      ?.filter((m) => m.role === "hijo" || m.role === "dependiente")
      .map((m) => Math.floor((Date.now() - new Date(m.dateOfBirth).getTime()) / 31_536_000_000))
      ?? [];

    const approachingMilestone = childrenAges.some(
      (age) => age === 12 || age === 13 || age === 17 || age === 18,
    );

    return buildFamilyRuleInsight({
      id: "fm-social-children",
      title: "Sin grupo de pares para hijos",
      description: `La familia tiene hijos pero pocas conexiones sociales.${
        ageSignal
          ? " Señal de age-group: adolescentes con baja participación deportiva."
          : ""
      }${
        approachingMilestone
          ? " Hijo(s) cerca de transición de edad — integrar en nuevos programas."
          : ""
      } Integrar con otros niños mejora retención familiar 40%.`,
      reasoning: "La falta de grupos de pares para los hijos reduce la probabilidad de que la familia se integre de forma duradera en el club.",
      impact: approachingMilestone ? "medium" : "medium",
      confidence: ageSignal ? 80 : 70,
      layer: "social",
      action: {
        label: "Ver coincidencias",
        targetTab: "social",
        toast: "Buscando familias con hijos...",
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════
// §8  RULES — LAYER 4: FINANCIAL OPTIMIZATION
// ═══════════════════════════════════════════════════════════

const FM_FINANCIAL_TIER_UPGRADE: RuleDefinition<FamilyContext> = {
  id: "FM_FINANCIAL_TIER_UPGRADE",
  name: "Tier upgrade opportunity",
  layer: "financial",
  domain: "families" as AIDomain,
  priority: 50,
  consumeSignals: ["fin_spending_detected"],
  evaluate: (ctx) => {
    const { engagementScore, family } = ctx;
    if (engagementScore <= 80) return null;

    const upgradeable = ["basic", "bronce", "premium", "oro"] as const;
    if (!upgradeable.includes(family.tier as typeof upgradeable[number])) return null;

    const nextTier = family.tier === "basic" || family.tier === "bronce"
      ? "Premium"
      : "VIP";

    const finSignal = ctx.signals?.find(
      (s) => s.signalDefId === "fin_spending_detected",
    );

    const spendingGrowth = ctx.financial != null && ctx.financial.ytdCharges > 0;

    return buildFamilyRuleInsight({
      id: "fm-financial-tier-upgrade",
      title: `Oportunidad de upgrade a ${nextTier}`,
      description: `Engagement ${engagementScore} + tier ${family.tier}${
        spendingGrowth ? " + gasto activo" : ""
      }${finSignal ? " + señal de gasto cross-domain" : ""}. Alto engagement + tier bajo = mayor revenue con upgrade.`,
      reasoning: "El perfil de alta participación y gasto sugiere que una mejora de tier podría aumentar el valor del miembro sin comprometer la experiencia.",
      impact: "high",
      confidence: finSignal ? 90 : spendingGrowth ? 85 : 70,
      layer: "financial",
      action: {
        label: "Ver finanzas",
        targetTab: "finances",
        toast: "Abriendo análisis financiero...",
      },
    });
  },
};

const FM_FINANCIAL_CONCENTRATION: RuleDefinition<FamilyContext> = {
  id: "FM_FINANCIAL_CONCENTRATION",
  name: "Activity concentration risk",
  layer: "financial",
  domain: "families" as AIDomain,
  priority: 55,
  evaluate: (ctx) => {
    if (ctx.totalActivityCount <= 3) return null;

    const typeCounts: Record<string, number> = {};
    ctx.activity.forEach((a) => {
      typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    });

    const maxEntry = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0];
    if (!maxEntry) return null;

    const concentration = maxEntry[1] / ctx.totalActivityCount;
    if (concentration <= 0.4) return null;

    return buildFamilyRuleInsight({
      id: "fm-financial-concentration",
      title: "Concentración de actividad",
      description: `${Math.round(concentration * 100)}% de actividad es '${maxEntry[0]}'. Diversificar reduce riesgo de abandono.`,
      reasoning: "Una concentración excesiva en un único tipo de actividad puede limitar la oportunidad de sostener el engagement a lo largo del tiempo.",
      impact: "medium",
      confidence: 65,
      layer: "financial",
    });
  },
};

const FM_FINANCIAL_LTV: RuleDefinition<FamilyContext> = {
  id: "FM_FINANCIAL_LTV",
  name: "LTV trajectory analysis",
  layer: "financial",
  domain: "families" as AIDomain,
  priority: 60,
  evaluate: (ctx) => {
    if (ctx.tenure <= 365 || ctx.engagementScore <= 50 || !ctx.financial) return null;

    const monthlyValue = (ctx.financial.ytdCharges || 0) / 12;
    if (monthlyValue <= 0) return null;

    const projectedLTV = monthlyValue * Math.max(12, ctx.tenure / 30);
    const benchmarkLTV = 2_400_000;
    const vsBenchmark = projectedLTV > benchmarkLTV ? "por encima" : "por debajo";

    return buildFamilyRuleInsight({
      id: "fm-financial-ltv",
      title: "LTV en trayectoria",
      description: `Proyectado: ~₡${Math.round(projectedLTV).toLocaleString("es-CR")} — ${vsBenchmark} del benchmark (₡2.4M). ${Math.floor(ctx.tenure / 365)}+ años de historial.`,
      reasoning: "El valor de por vida proyectado sugiere que esta familia puede aportar un retorno superior si se nutre de forma consistente.",
      impact: "medium",
      confidence: 65,
      layer: "financial",
    });
  },
};

const FM_FINANCIAL_HEALTH_RISK: RuleDefinition<FamilyContext> = {
  id: "FM_FINANCIAL_HEALTH_RISK",
  name: "Financial health risk",
  layer: "financial",
  domain: "families" as AIDomain,
  priority: 18,
  evaluate: (ctx) => {
    if (!ctx.financial) return null;

    const { creditLimit, currentBalance, lastPaymentDate } = ctx.financial;
    const utilization = creditLimit > 0
      ? (Math.abs(currentBalance) / creditLimit) * 100
      : 0;
    const paymentDelay = lastPaymentDate ? daysBetween(lastPaymentDate) : 0;

    if (utilization <= 80 && paymentDelay <= 60) return null;

    return buildFamilyRuleInsight({
      id: "fm-financial-health-risk",
      title: utilization > 80 ? "Alta utilización de crédito" : "Pagos retrasados",
      description: utilization > 80
        ? `${Math.round(utilization)}% del límite utilizado. Puede causar fricción en la experiencia.`
        : `Último pago hace ${paymentDelay} días. Posible dificultad financiera.`,
      reasoning: "La presión financiera se traduce en fricción y puede afectar la percepción de valor del club si no se aborda a tiempo.",
      impact: "high",
      confidence: 85,
      layer: "financial",
      action: {
        label: "Ver finanzas",
        targetTab: "finances",
        toast: "Abriendo detalle financiero...",
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════
// §9  RULES — LAYER 5: ENGAGEMENT INNOVATION
// ═══════════════════════════════════════════════════════════

const FM_ENGAGEMENT_ACTIVITY_GAP: RuleDefinition<FamilyContext> = {
  id: "FM_ENGAGEMENT_ACTIVITY_GAP",
  name: "Interest-activity gap",
  layer: "engagement",
  domain: "families" as AIDomain,
  priority: 52,
  emitSignals: [FM_SIG_ENGAGEMENT_GAP],
  evaluate: (ctx) => {
    if (ctx.interests.length === 0 || ctx.recentActivityCount >= 2) return null;

    return buildFamilyRuleInsight({
      id: "fm-engagement-activity-gap",
      title: "Intereses declarados sin actividad",
      description: `${ctx.interests.length} intereses (${ctx.interests.slice(0, 3).join(", ")}) pero ${ctx.recentActivityCount} actividades en 30 días. Conectar intereses con actividades.`,
      reasoning: "Cuando los intereses no se traducen en experiencias, la familia pierde oportunidades de conexión y de disfrute.",
      impact: "medium",
      confidence: 75,
      layer: "engagement",
      action: {
        label: "Ver recomendaciones",
        targetTab: "intelligence",
        toast: "Generando recomendaciones...",
      },
    });
  },
};

const FM_ENGAGEMENT_MILESTONE: RuleDefinition<FamilyContext> = {
  id: "FM_ENGAGEMENT_MILESTONE",
  name: "Anniversary / milestone approaching",
  layer: "engagement",
  domain: "families" as AIDomain,
  priority: 70,
  emitSignals: [FM_SIG_MILESTONE_APPROACHING],
  evaluate: (ctx) => {
    const now = new Date();
    const anniversaryMonth = new Date(ctx.family.since).getMonth();
    if (now.getMonth() !== anniversaryMonth) return null;

    const years = now.getFullYear() - new Date(ctx.family.since).getFullYear();
    return buildFamilyRuleInsight({
      id: "fm-engagement-milestone",
      title: `Aniversario este mes — ${years}° año`,
      description: `Momento ideal para reconocimiento personalizado. Aniversarios aumentan engagement 15% cuando se reconocen.`,
      reasoning: "Los hitos de membresía son oportunidades claras para reforzar el vínculo emocional del socio con el club.",
      impact: "medium",
      confidence: 95,
      layer: "engagement",
    });
  },
};

const FM_ENGAGEMENT_WELLNESS: RuleDefinition<FamilyContext> = {
  id: "FM_ENGAGEMENT_WELLNESS",
  name: "Wellness integration opportunity",
  layer: "engagement",
  domain: "families" as AIDomain,
  priority: 58,
  evaluate: (ctx) => {
    if (ctx.totalActivityCount <= 2) return null;

    const hasWellness = ctx.wellnessUsage
      ? (ctx.wellnessUsage.totalSessions ?? 0) > 0
      : ctx.activity.some(
          (a) =>
            a.type === "reservation" &&
            /spa|wellness|yoga|masaj/i.test(a.description),
        );

    if (hasWellness) return null;

    const unusedList = ctx.wellnessUsage?.unusedServices?.join(", ") || "spa, yoga, masajes";

    return buildFamilyRuleInsight({
      id: "fm-engagement-wellness",
      title: "Sin uso de wellness",
      description: `Familia activa sin participación en wellness. Servicios: ${unusedList}. Paquetes de bienestar aumentan satisfacción familiar 25%.`,
      reasoning: "La falta de exploración de experiencias de bienestar deja un espacio valioso para enriquecer la relación con el club.",
      impact: "medium",
      confidence: ctx.wellnessUsage ? 80 : 60,
      layer: "engagement",
    });
  },
};

const FM_ENGAGEMENT_COMMS: RuleDefinition<FamilyContext> = {
  id: "FM_ENGAGEMENT_COMMS",
  name: "Communication responsiveness",
  layer: "engagement",
  domain: "families" as AIDomain,
  priority: 56,
  evaluate: (ctx) => {
    if (ctx.communicationEngagement) {
      if (ctx.communicationEngagement.last90DaysOpenRate >= 20) return null;

      return buildFamilyRuleInsight({
        id: "fm-engagement-comms",
        title: "Baja respuesta a comunicaciones",
        description: `Open rate: ${Math.round(ctx.communicationEngagement.last90DaysOpenRate)}% en 90 días (benchmark: 35%). Canal preferido: ${ctx.communicationEngagement.preferredChannel}. Cambiar estrategia.`,
        reasoning: "La baja respuesta sugiere que el mensaje no está alineado con el contexto ni con las preferencias del miembro.",
        impact: "medium",
        confidence: 85,
        layer: "engagement",
      });
    }

    if (ctx.engagementScore >= 50 || ctx.tenure <= 90) return null;

    return buildFamilyRuleInsight({
      id: "fm-engagement-comms",
      title: "Baja respuesta a comunicaciones",
      description: "Engagement bajo sugiere que las comunicaciones actuales no conectan. Personalizar contenido.",
      reasoning: "Una comunicación poco relevante reduce la probabilidad de activar acciones y reforzar la relación del socio con el club.",
      impact: "medium",
      confidence: 55,
      layer: "engagement",
    });
  },
};

const FM_ENGAGEMENT_CROSS_SELL: RuleDefinition<FamilyContext> = {
  id: "FM_ENGAGEMENT_CROSS_SELL",
  name: "Cross-sell opportunity",
  layer: "engagement",
  domain: "families" as AIDomain,
  priority: 62,
  evaluate: (ctx) => {
    if (ctx.totalActivityCount <= 3) return null;

    const activityTypes = new Set(ctx.activity.map((a) => a.type));
    if (activityTypes.size > 1) return null;

    const usedType = [...activityTypes][0];
    const suggestions: Record<string, string> = {
      event: "reservaciones de instalaciones",
      reservation: "eventos sociales y deportivos",
      charge: "actividades recreativas",
      payment: "eventos y reservaciones",
      communication: "actividades presenciales",
    };

    return buildFamilyRuleInsight({
      id: "fm-engagement-cross-sell",
      title: "Oportunidad de cross-sell",
      description: `Familia usa solo '${usedType}'. Sugerir ${suggestions[usedType] || "nuevas categorías"} para ampliar engagement.`,
      reasoning: "Ampliar el uso de categorías de experiencia puede elevar el engagement y aumentar el valor percibido del club.",
      impact: "medium",
      confidence: 65,
      layer: "engagement",
      action: {
        label: "Ver recomendaciones",
        targetTab: "intelligence",
        toast: "Buscando nuevas actividades...",
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════
// §10  RULE REGISTRY — All rules in priority order
// ═══════════════════════════════════════════════════════════

export const FAMILY_RULES: RuleDefinition<FamilyContext>[] = [
  // Layer 1: Health Diagnostic
  FM_HEALTH_ENGAGEMENT,      // 10
  FM_HEALTH_ACTIVITY,         // 15
  FM_HEALTH_FINANCIAL,        // 18
  FM_FINANCIAL_HEALTH_RISK,   // 20
  FM_HEALTH_SOCIAL,           // 25
  FM_LIFECYCLE_PROJECTION,    // 28

  // Layer 2: Lifecycle Intelligence
  FM_LIFECYCLE_ONBOARDING,    // 30
  FM_LIFECYCLE_PEAK_RISK,     // 32
  FM_LIFECYCLE_PLATEAU,       // 35
  FM_LIFECYCLE_REACTIVATION,  // 38

  // Layer 3: Social Intelligence
  FM_SOCIAL_REFERRAL,         // 40
  FM_SOCIAL_CHILDREN,         // 45

  // Layer 4: Financial Optimization
  FM_FINANCIAL_TIER_UPGRADE,  // 50
  FM_ENGAGEMENT_ACTIVITY_GAP, // 52
  FM_ENGAGEMENT_COMMS,        // 56
  FM_ENGAGEMENT_WELLNESS,     // 58
  FM_FINANCIAL_LTV,           // 60
  FM_ENGAGEMENT_CROSS_SELL,   // 62
  FM_FINANCIAL_CONCENTRATION, // 55

  // Layer 5: Engagement Innovation
  FM_ENGAGEMENT_MILESTONE,    // 70

  // Layer 6: Legacy / Info
  FM_HEALTH_TIER_MISMATCH,    // 90
  FM_LIFECYCLE_LEGACY,        // 95
];

// ═══════════════════════════════════════════════════════════
// §11  ADVISOR CONFIG — Complete config for Advisor Engine
// ═══════════════════════════════════════════════════════════

/**
 * Complete Advisor Engine configuration for the Families domain.
 * Import and pass to useAdvisorEngine() in useFamilyAdvisor.ts.
 */
export const FAMILY_ADVISOR_CONFIG = {
  domain: "families" as AIDomain,
  buildCtx: buildFamilyContext,
  rules: FAMILY_RULES,
  healthFactors: FAMILY_HEALTH_FACTORS,
} as const;