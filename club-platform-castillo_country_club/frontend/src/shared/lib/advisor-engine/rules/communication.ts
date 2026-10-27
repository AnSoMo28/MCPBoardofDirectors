// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Communication Domain Rules
//
// 10 declarative rules (originally 8 logical in F28).
// 2 layers: macro (1-6), micro (7-10).
//
// Architecture:
//   RuleDefinition<CommunicationContext> — pure functions, testable
//   buildCommunicationCtx() — derives metrics from raw MCP data
//   COMMUNICATION_HEALTH_FACTORS — unified health score (P5, P53)
//   Signals: comm_delivery_critical (P54)
//
// Data source: CommunicationAnalyticsData + HistoryItem[] + ScheduledItem[]
// All client-side compute, 0ms latency, 0 API calls.
//
// Created: F47 B5.1 — Communication Rules Migration
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
  CommunicationAnalyticsData,
  HistoryItem,
  ScheduledItem,
} from "@/features/communications/types";
import { formatCommunicationDate } from "@/features/communications/types";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT
// ═══════════════════════════════════════════════════════════

export interface CommunicationContext extends BaseContext {
  domain: "communication";

  // Raw inputs
  analytics: CommunicationAnalyticsData | undefined;
  history: HistoryItem[];
  scheduled: ScheduledItem[];

  // Pre-computed metrics
  hasData: boolean;
  totalSent: number;
  deliveryRate: number;
  channelsUsed: number;
  failCount: number;
  failureRate: number;
  healthScore: number;
  healthLabel: string;
  recentCommsCount: number;
  whatsappPct: number;
  personalizationPct: number;
  upcomingCount: number;
  nextScheduledAt: string | undefined;
  nextRecipientCount: number;
  dataConfidence: number;
}

export function buildCommunicationCtx(
  rawData: unknown,
  signals?: readonly DomainSignal[],
): CommunicationContext {
  const { analytics, history, scheduled } = rawData as {
    analytics: CommunicationAnalyticsData | undefined;
    history: HistoryItem[];
    scheduled: ScheduledItem[];
  };

  if (!analytics || analytics.total_sent === 0) {
    return {
      domain: "communication",
      signals: signals ?? [],
      analytics: undefined,
      history: [],
      scheduled: [],
      hasData: false,
      totalSent: 0,
      deliveryRate: 0,
      channelsUsed: 0,
      failCount: 0,
      failureRate: 0,
      healthScore: 0,
      healthLabel: "Sin datos",
      recentCommsCount: 0,
      whatsappPct: 0,
      personalizationPct: 0,
      upcomingCount: 0,
      nextScheduledAt: undefined,
      nextRecipientCount: 0,
      dataConfidence: 0,
    };
  }

  const {
    total_sent,
    delivery_rate_pct,
    channel_breakdown,
    status_breakdown,
  } = analytics;

  // Failure
  const failCount =
    (status_breakdown.failed ?? 0) + (status_breakdown.cancelled ?? 0);
  const failureRate = (failCount / total_sent) * 100;

  // Channels
  const channelsUsed = channel_breakdown.length;

  // Health composite (delivery 50%, diversity 30%, reliability 20%)
  const deliveryScore = Math.min(delivery_rate_pct, 100);
  const diversityScore = Math.min((channelsUsed / 3) * 100, 100);
  const reliabilityScore = Math.max(0, 100 - failureRate * 5);
  const healthScore = Math.round(
    deliveryScore * 0.5 + diversityScore * 0.3 + reliabilityScore * 0.2,
  );
  const healthLabel =
    healthScore >= 80 ? "Excelente" : healthScore >= 50 ? "Buena" : "Atención";

  // Recent comms (last 7 days)
  const now = new Date();
  const recentCommsCount = history.filter((h) => {
    if (!h.sent_at) return false;
    return (now.getTime() - new Date(h.sent_at).getTime()) / 86_400_000 <= 7;
  }).length;

  // WhatsApp
  const whatsappPct =
    channel_breakdown.find((c) => c.channel === "whatsapp")?.percentage ?? 0;

  // Personalization
  const personalized = history.filter(
    (h) => h.notification_type === "personalized",
  ).length;
  const personalizationPct =
    total_sent > 0 ? (personalized / total_sent) * 100 : 0;

  // Upcoming scheduled
  const upcoming = scheduled.filter((s) => s.status === "queued");
  const sortedUpcoming = [...upcoming].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );

  return {
    domain: "communication",
    signals: signals ?? [],
    analytics: undefined,
    history,
    scheduled,
    hasData: true,
    totalSent: total_sent,
    deliveryRate: delivery_rate_pct,
    channelsUsed,
    failCount,
    failureRate,
    healthScore,
    healthLabel,
    recentCommsCount,
    whatsappPct,
    personalizationPct,
    upcomingCount: upcoming.length,
    nextScheduledAt: sortedUpcoming[0]?.scheduled_at,
    nextRecipientCount: sortedUpcoming[0]?.recipient_ids.length ?? 0,
    dataConfidence: Math.min(100, total_sent * 3 + 30),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SIGNALS
// ═══════════════════════════════════════════════════════════

const COMM_DELIVERY_CRITICAL: SignalDefinition = {
  id: "comm_delivery_critical",
  targetDomains: ["global"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Communication delivery rate critically low",
  ttl: 300_000,
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 — THRESHOLDS (named, testable, tunable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  DELIVERY_CRITICAL: 70,
  DELIVERY_SEVERE: 50,
  HEALTH_CRITICAL: 40,
  HEALTH_WARNING: 60,
  MIN_CHANNELS: 2,
  OPTIMAL_CHANNELS: 3,
  FAILURE_CRITICAL_PCT: 6,
  FAILURE_WARNING_PCT: 3,
  WHATSAPP_MIN_PCT: 10,
  PERSONALIZATION_MIN_PCT: 15,
  MIN_TOTAL_SENT: 10,
} as const;

const CR_BENCHMARK = {
  delivery_rate: 85,
  personalization_target: 25,
} as const;

// ═══════════════════════════════════════════════════════════
// SECTION 4 — RULES (10 rules × 2 layers)
//
// Layer: macro (100) — system health
// Layer: micro (200) — performance details
//
// Severity derivation in hook adapter:
//   impact "high" + confidence ≥ 90 → "critical"
//   impact "high"                   → "high"
//   impact "medium"                 → "medium"
//   impact "low"                    → "info"
// ═══════════════════════════════════════════════════════════

const R1_DELIVERY_CRITICAL: RuleDefinition<CommunicationContext> = {
  id: "R1_DELIVERY_CRITICAL",
  name: "Tasa de entrega baja",
  layer: "macro",
  domain: "communication",
  priority: 100,
  emitSignals: [COMM_DELIVERY_CRITICAL],
  evaluate: (ctx) => {
    if (!ctx.hasData || ctx.deliveryRate >= THRESHOLDS.DELIVERY_CRITICAL)
      return null;
    const isSevere = ctx.deliveryRate < THRESHOLDS.DELIVERY_SEVERE;
    return buildInsight({
      id: generateInsightId("communications", "R1_DELIVERY_CRITICAL"),
      impact: "high",
      title: isSevere
        ? "Tasa de entrega críticamente baja"
        : "Tasa de entrega baja",
      reasoning: `Delivery rate ${ctx.deliveryRate.toFixed(1)}% vs mínimo aceptable ${THRESHOLDS.DELIVERY_CRITICAL}% (benchmark CR: ${CR_BENCHMARK.delivery_rate}%).`,
      confidence: isSevere ? 95 : 80,
      target_view: "analytics",
    });
  },
};

const R2_HEALTH_CRITICAL: RuleDefinition<CommunicationContext> = {
  id: "R2_HEALTH_CRITICAL",
  name: "Salud comunicacional crítica",
  layer: "macro",
  domain: "communication",
  priority: 100,
  evaluate: (ctx) => {
    if (!ctx.hasData || ctx.healthScore >= THRESHOLDS.HEALTH_CRITICAL)
      return null;
    return buildInsight({
      id: generateInsightId("communications", "R2_HEALTH_CRITICAL"),
      impact: "high",
      title: `Salud comunicacional: ${ctx.healthLabel} (${ctx.healthScore}/100)`,
      reasoning: `Health Score ${ctx.healthScore} < ${THRESHOLDS.HEALTH_CRITICAL}. El sistema comunicacional necesita atención inmediata.`,
      confidence: 95,
      target_view: "analytics",
    });
  },
};

const R3_HEALTH_WARNING: RuleDefinition<CommunicationContext> = {
  id: "R3_HEALTH_WARNING",
  name: "Salud comunicacional en atención",
  layer: "macro",
  domain: "communication",
  priority: 101,
  evaluate: (ctx) => {
    if (!ctx.hasData || ctx.healthScore >= THRESHOLDS.HEALTH_WARNING)
      return null;
    if (ctx.healthScore < THRESHOLDS.HEALTH_CRITICAL) return null; // R2 handles
    return buildInsight({
      id: generateInsightId("communications", "R3_HEALTH_WARNING"),
      impact: "medium",
      title: `Salud comunicacional: ${ctx.healthLabel} (${ctx.healthScore}/100)`,
      reasoning: `Health Score ${ctx.healthScore} < ${THRESHOLDS.HEALTH_WARNING} (attention threshold).`,
      confidence: 80,
      target_view: "analytics",
    });
  },
};

const R4_CHANNEL_DIVERSITY: RuleDefinition<CommunicationContext> = {
  id: "R4_CHANNEL_DIVERSITY",
  name: "Diversificación de canales insuficiente",
  layer: "macro",
  domain: "communication",
  priority: 100,
  evaluate: (ctx) => {
    if (!ctx.hasData || ctx.channelsUsed >= THRESHOLDS.MIN_CHANNELS) return null;
    return buildInsight({
      id: generateInsightId("communications", "R4_CHANNEL_DIVERSITY"),
      impact: "high",
      title: "Diversificación de canales insuficiente",
      reasoning: `Solo ${ctx.channelsUsed}/5 canales activos. Si este canal falla, perdés toda tu capacidad de comunicación. Mínimo: ${THRESHOLDS.MIN_CHANNELS}, óptimo: ${THRESHOLDS.OPTIMAL_CHANNELS}+.`,
      confidence: 85,
      target_view: "tools",
    });
  },
};

const R5_FAILURE_RATE_HIGH: RuleDefinition<CommunicationContext> = {
  id: "R5_FAILURE_RATE_HIGH",
  name: "Tasa de fallas elevada",
  layer: "macro",
  domain: "communication",
  priority: 100,
  evaluate: (ctx) => {
    if (!ctx.hasData || ctx.failureRate <= THRESHOLDS.FAILURE_CRITICAL_PCT)
      return null;
    return buildInsight({
      id: generateInsightId("communications", "R5_FAILURE_RATE_HIGH"),
      impact: "high",
      title: `Tasa de fallas elevada: ${ctx.failureRate.toFixed(0)}%`,
      reasoning: `${ctx.failCount} comunicaciones fallidas o canceladas de ${ctx.totalSent} enviadas. Benchmark CR: <${THRESHOLDS.FAILURE_WARNING_PCT}%.`,
      confidence: 85,
      target_view: "analytics",
    });
  },
};

const R6_FAILURE_RATE_WARNING: RuleDefinition<CommunicationContext> = {
  id: "R6_FAILURE_RATE_WARNING",
  name: "Tasa de fallas por encima del promedio",
  layer: "macro",
  domain: "communication",
  priority: 101,
  evaluate: (ctx) => {
    if (!ctx.hasData || ctx.failureRate <= THRESHOLDS.FAILURE_WARNING_PCT)
      return null;
    if (ctx.failureRate > THRESHOLDS.FAILURE_CRITICAL_PCT) return null;
    return buildInsight({
      id: generateInsightId("communications", "R6_FAILURE_RATE_WARNING"),
      impact: "medium",
      title: `Tasa de fallas por encima del promedio: ${ctx.failureRate.toFixed(0)}%`,
      reasoning: `${ctx.failCount} comunicaciones con problemas. El promedio aceptable es <${THRESHOLDS.FAILURE_WARNING_PCT}%.`,
      confidence: 80,
      target_view: "analytics",
    });
  },
};

const R7_COMMS_GAP: RuleDefinition<CommunicationContext> = {
  id: "R7_COMMS_GAP",
  name: "Vacío comunicacional 7 días",
  layer: "micro",
  domain: "communication",
  priority: 200,
  evaluate: (ctx) => {
    if (
      !ctx.hasData ||
      ctx.recentCommsCount > 0 ||
      ctx.history.length === 0
    )
      return null;
    return buildInsight({
      id: generateInsightId("communications", "R7_COMMS_GAP"),
      impact: "high",
      title: "Vacío comunicacional",
      reasoning:
        "No se han enviado comunicaciones en los últimos 7 días. Los socios esperan mantenerse informados.",
      confidence: 85,
      target_view: "center",
    });
  },
};

const R8_WHATSAPP_UNDERUSED: RuleDefinition<CommunicationContext> = {
  id: "R8_WHATSAPP_UNDERUSED",
  name: "WhatsApp subutilizado",
  layer: "micro",
  domain: "communication",
  priority: 200,
  evaluate: (ctx) => {
    if (
      !ctx.hasData ||
      ctx.whatsappPct >= THRESHOLDS.WHATSAPP_MIN_PCT ||
      ctx.totalSent < THRESHOLDS.MIN_TOTAL_SENT
    )
      return null;
    return buildInsight({
      id: generateInsightId("communications", "R8_WHATSAPP_UNDERUSED"),
      impact: "medium",
      title: "WhatsApp subutilizado",
      reasoning: `WhatsApp tiene la tasa de apertura más alta (98%) pero solo se usa en el ${ctx.whatsappPct.toFixed(0)}% de tus comunicaciones.`,
      confidence: 85,
      target_view: "tools",
    });
  },
};

const R9_PERSONALIZATION_LOW: RuleDefinition<CommunicationContext> = {
  id: "R9_PERSONALIZATION_LOW",
  name: "Poca comunicación personalizada",
  layer: "micro",
  domain: "communication",
  priority: 200,
  evaluate: (ctx) => {
    if (
      !ctx.hasData ||
      ctx.personalizationPct >= THRESHOLDS.PERSONALIZATION_MIN_PCT ||
      ctx.totalSent < THRESHOLDS.MIN_TOTAL_SENT
    )
      return null;
    return buildInsight({
      id: generateInsightId("communications", "R9_PERSONALIZATION_LOW"),
      impact: "medium",
      title: "Poca comunicación personalizada",
      reasoning: `Solo ${ctx.personalizationPct.toFixed(0)}% de comunicaciones personalizadas. Las segmentadas obtienen hasta 2x más engagement. Benchmark CR: ${CR_BENCHMARK.personalization_target}%.`,
      confidence: 80,
      target_view: "center",
    });
  },
};

const R10_UPCOMING: RuleDefinition<CommunicationContext> = {
  id: "R10_UPCOMING",
  name: "Envíos programados activos",
  layer: "micro",
  domain: "communication",
  priority: 200,
  evaluate: (ctx) => {
    if (!ctx.hasData || ctx.upcomingCount === 0) return null;
    return buildInsight({
      id: generateInsightId("communications", "R10_UPCOMING"),
      impact: "low",
      title: `${ctx.upcomingCount} envío(s) programado(s)`,
      reasoning: ctx.nextScheduledAt
        ? `Próximo: ${formatCommunicationDate(ctx.nextScheduledAt, true)} a ${ctx.nextRecipientCount} destinatarios.`
        : `${ctx.upcomingCount} notificaciones en cola.`,
      confidence: 95,
      target_view: "tools",
    });
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — RULES ARRAY + HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

export const COMMUNICATION_RULES: RuleDefinition<CommunicationContext>[] = [
  R1_DELIVERY_CRITICAL,
  R2_HEALTH_CRITICAL,
  R3_HEALTH_WARNING,
  R4_CHANNEL_DIVERSITY,
  R5_FAILURE_RATE_HIGH,
  R6_FAILURE_RATE_WARNING,
  R7_COMMS_GAP,
  R8_WHATSAPP_UNDERUSED,
  R9_PERSONALIZATION_LOW,
  R10_UPCOMING,
];

export const COMMUNICATION_HEALTH_FACTORS: HealthFactorDef<CommunicationContext>[] =
  [
    {
      id: "delivery_health",
      label: "Tasa de entrega",
      compute: (ctx) => (ctx.hasData ? Math.min(ctx.deliveryRate, 100) : 0),
      weight: 0.35,
    },
    {
      id: "diversity_health",
      label: "Diversidad de canales",
      compute: (ctx) =>
        ctx.hasData ? Math.min((ctx.channelsUsed / 3) * 100, 100) : 0,
      weight: 0.30,
    },
    {
      id: "reliability_health",
      label: "Confiabilidad",
      compute: (ctx) =>
        ctx.hasData ? Math.max(0, 100 - ctx.failureRate * 5) : 0,
      weight: 0.20,
    },
    {
      id: "activity_health",
      label: "Actividad reciente",
      compute: (ctx) => {
        if (!ctx.hasData) return 0;
        if (ctx.recentCommsCount === 0 && ctx.history.length > 0) return 20;
        if (ctx.recentCommsCount >= 3) return 100;
        return 50 + ctx.recentCommsCount * 15;
      },
      weight: 0.15,
    },
  ];