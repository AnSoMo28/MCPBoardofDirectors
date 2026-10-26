// src/features/communications/lib/silenceIntelligence.ts
// ═══════════════════════════════════════════════════════════
// Silence Intelligence
// Castillo Country Club — Phase 31 "The Voice"
//
// Silence is not absence of signal. Silence IS the signal.
//
// While communicationIntelligence.ts provides BASE silence
// functions (buildSilenceProfile, detectSilencePatterns,
// computeAttentionDecay), this module provides ADVANCED
// silence intelligence: causation analysis, disengagement
// prediction, renewal strategy, cascade risk modeling,
// and actionable renewal plans.
//
// The system doesn't just notice when a member goes quiet.
// It understands WHY, predicts WHEN disengagement becomes
// irreversible, and prescribes HOW to bring them back.
//
// Pure functions only. No side effects.
// ═══════════════════════════════════════════════════════════

import type {
  CommunicationFingerprint,
  SilenceProfile,
  EmotionalTrajectory,
  MessageFatigue,
  HistoryItem,
  NarrativeArc,
} from "../types";

import {
  deriveSilenceLevel,
  SILENCE_LEVEL_CONFIG,
  SILENCE_THRESHOLDS,
} from "../types";

import {
  computeAttentionDecay
} from "./communicationIntelligence";

// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Analysis of response gaps — the time between outbound
 * messages and implied member engagement.
 * Large gaps are warning signals. Widening gaps are trends.
 */
export interface ResponseGapAnalysis {
  gaps: ResponseGap[];
  avgGapDays: number;
  medianGapDays: number;
  maxGapDays: number;
  trend: "widening" | "stable" | "narrowing";
  trendConfidence: number;
}

/**
 * A single response gap between two consecutive messages.
 */
export interface ResponseGap {
  startDate: string;
  endDate: string;
  gapDays: number;
  isAnomalous: boolean;
  precedingTopic: string;
}

/**
 * Detailed disengagement prediction — more nuanced than
 * the simple 0-1 risk score from disengagementRisk().
 * Includes stage classification, timeline, and drivers.
 */
export interface DisengagementPrediction {
  stage: "aware" | "cooling" | "drifting" | "slipping" | "gone";
  riskScore: number;
  daysToIrreversible: number | null;
  primaryDrivers: string[];
  interventionWindow: boolean;
  recommendedUrgency: "monitor" | "soft_touch" | "direct_action" | "escalate" | "emergency";
}

/**
 * What breaks silence — the events, topics, or channels
 * that have historically renewed engagement after a quiet period.
 */
export interface EngagementRenewalPattern {
  triggers: RenewalTrigger[];
  avgRenewalTimeDays: number;
  mostEffectiveChannel: string | null;
  mostEffectiveTopic: string | null;
  renewalRate: number;
}

/**
 * A single renewal trigger — something that ended a silence.
 */
export interface RenewalTrigger {
  triggerType: "event" | "topic" | "channel" | "occasion" | "outreach";
  description: string;
  effectiveness: number;
  frequency: number;
}

/**
 * Seasonal silence pattern — recurring quiet periods
 * tied to specific months or calendar events.
 */
export interface SeasonalPattern {
  months: number[];
  monthLabels: string[];
  avgDurationDays: number;
  severity: "normal" | "concerning" | "critical";
  description: string;
}

/**
 * Actionable renewal action — what to do RIGHT NOW
 * to bring a silent member back.
 */
export interface RenewalAction {
  actionType: "monitor" | "soft_touch" | "personal_outreach" | "milestone_trigger" | "social_pull" | "staff_call";
  channel: string;
  suggestedMessage: string;
  timing: string;
  urgency: "low" | "medium" | "high" | "critical";
  estimatedSuccessRate: number;
  rationale: string;
}

/**
 * Full renewal strategy — a multi-step plan to recover
 * a silent member. Combines analysis, prediction, and
 * prescriptive actions into a coherent plan.
 */
export interface RenewalStrategy {
  memberId: string;
  silenceDays: number;
  silenceLevel: string;
  disengagementStage: string;
  steps: RenewalAction[];
  overallSuccessEstimate: number;
  timeWindowDays: number;
  narrative: string;
}

/**
 * Cascade risk — how likely this member's silence will
 * trigger disengagement in connected members.
 * Social contagion of disengagement.
 */
export interface CascadeRisk {
  riskScore: number;
  affectedConnections: number;
  mechanism: "social_influence" | "shared_activity_loss" | "referral_decay";
  description: string;
}

/**
 * Silence timeline — visual-friendly data structure
 * showing silence periods, activity bursts, and
 * engagement retention over time.
 */
export interface SilenceTimelineEntry {
  startDate: string;
  endDate: string;
  durationDays: number;
  type: "silence" | "activity";
  retentionAtEnd: number;
  renewalEvent: string | null;
}

export interface SilenceTimeline {
  entries: SilenceTimelineEntry[];
  totalSilenceDays: number;
  totalActivityDays: number;
  silenceRatio: number;
  longestSilenceDays: number;
  currentRetention: number;
}

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════

function daysBetween(dateA: string, dateB: string): number {
  const msA = new Date(dateA).getTime();
  const msB = new Date(dateB).getTime();
  return Math.abs(msB - msA) / (1000 * 60 * 60 * 24);
}

function sortByDateAsc(items: HistoryItem[]): HistoryItem[] {
  return [...items].sort(
    (a: HistoryItem, b: HistoryItem) =>
      new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
  );
}

/** Month names in Spanish. */
const MONTH_LABELS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ═══════════════════════════════════════════════════════════
// §1  RESPONSE GAP ANALYSIS
// ═══════════════════════════════════════════════════════════

/**
 * Analyze response gaps — the silent intervals between
 * consecutive communications.
 *
 * A gap is "anomalous" when it exceeds 2× the median gap.
 * Trend is computed by comparing first-half vs second-half
 * average gaps from the sorted history.
 */
export function analyzeResponseGaps(
  history: HistoryItem[],
): ResponseGapAnalysis {
  if (history.length < 2) {
    return {
      gaps: [],
      avgGapDays: 0,
      medianGapDays: 0,
      maxGapDays: 0,
      trend: "stable",
      trendConfidence: 0,
    };
  }

  const sorted = sortByDateAsc(history);
  const gaps: ResponseGap[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const gapDays = daysBetween(sorted[i - 1].sent_at, sorted[i].sent_at);
    gaps.push({
      startDate: sorted[i - 1].sent_at,
      endDate: sorted[i].sent_at,
      gapDays: Math.round(gapDays),
      isAnomalous: false, // computed below
      precedingTopic: sorted[i - 1].notification_type,
    });
  }

  // Statistics
  const gapValues = gaps.map((g: ResponseGap) => g.gapDays);
  const avgGapDays =
    Math.round(
      (gapValues.reduce((s: number, d: number) => s + d, 0) / gapValues.length) * 10,
    ) / 10;
  const sortedGaps = [...gapValues].sort((a: number, b: number) => a - b);
  const midIdx = Math.floor(sortedGaps.length / 2);
  const medianGapDays =
    sortedGaps.length % 2 === 0
      ? (sortedGaps[midIdx - 1] + sortedGaps[midIdx]) / 2
      : sortedGaps[midIdx];
  const maxGapDays = sortedGaps[sortedGaps.length - 1] ?? 0;

  // Anomalous: > 2× median
  for (const gap of gaps) {
    gap.isAnomalous = gap.gapDays > medianGapDays * 2;
  }

  // Trend: compare first half vs second half
  let trend: ResponseGapAnalysis["trend"] = "stable";
  let trendConfidence = 0;

  if (gaps.length >= 4) {
    const halfIdx = Math.floor(gaps.length / 2);
    const firstHalf = gaps.slice(0, halfIdx);
    const secondHalf = gaps.slice(halfIdx);
    const avgFirst =
      firstHalf.reduce((s: number, g: ResponseGap) => s + g.gapDays, 0) /
      firstHalf.length;
    const avgSecond =
      secondHalf.reduce((s: number, g: ResponseGap) => s + g.gapDays, 0) /
      secondHalf.length;

    const ratio = avgSecond / Math.max(avgFirst, 0.1);
    if (ratio > 1.3) {
      trend = "widening";
      trendConfidence = Math.min(0.95, (ratio - 1) * 2);
    } else if (ratio < 0.7) {
      trend = "narrowing";
      trendConfidence = Math.min(0.95, (1 - ratio) * 2);
    } else {
      trend = "stable";
      trendConfidence = Math.min(0.9, 1 - Math.abs(ratio - 1));
    }
  }

  return {
    gaps,
    avgGapDays,
    medianGapDays: Math.round(medianGapDays * 10) / 10,
    maxGapDays: Math.round(maxGapDays),
    trend,
    trendConfidence: Math.round(trendConfidence * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════
// §2  DISENGAGEMENT PREDICTION
// ═══════════════════════════════════════════════════════════

/**
 * Predict disengagement with stage classification and timeline.
 * More nuanced than the simple 0-1 score from disengagementRisk().
 *
 * Stages:
 * - aware: silence noticed but normal range
 * - cooling: engagement declining, gaps widening
 * - drifting: consistent silence pattern, attention fading
 * - slipping: approaching irreversibility, urgent action needed
 * - gone: beyond escape velocity, recovery unlikely without intervention
 *
 * Each stage has specific intervention strategies.
 */
export function predictDisengagement(
  silenceProfile: SilenceProfile,
  trajectory: EmotionalTrajectory,
  fatigue: MessageFatigue,
  history: HistoryItem[],
): DisengagementPrediction {
  const silenceDays = silenceProfile.current_silence_days;
  const retention = computeAttentionDecay(silenceDays);
  const gapAnalysis = analyzeResponseGaps(history);

  // Stage classification
  let stage: DisengagementPrediction["stage"];
  let daysToIrreversible: number | null = null;

  if (silenceDays >= SILENCE_THRESHOLDS.escape_velocity) {
    stage = "gone";
    daysToIrreversible = 0;
  } else if (silenceDays >= SILENCE_THRESHOLDS.critical) {
    stage = "slipping";
    daysToIrreversible = Math.max(
      0,
      SILENCE_THRESHOLDS.escape_velocity - silenceDays,
    );
  } else if (silenceDays >= SILENCE_THRESHOLDS.alert) {
    stage = "drifting";
    daysToIrreversible = Math.max(
      0,
      SILENCE_THRESHOLDS.critical - silenceDays,
    );
  } else if (
    silenceDays >= SILENCE_THRESHOLDS.warning ||
    gapAnalysis.trend === "widening"
  ) {
    stage = "cooling";
    daysToIrreversible = Math.max(
      0,
      SILENCE_THRESHOLDS.alert - silenceDays,
    );
  } else {
    stage = "aware";
    daysToIrreversible =
      silenceDays > 0
        ? Math.max(0, SILENCE_THRESHOLDS.warning - silenceDays)
        : null;
  }

  // Risk score: weighted composite
  const silenceRisk = silenceProfile.disengagement_risk;
  const emotionalRisk =
    trajectory.current.score < 40
      ? (40 - trajectory.current.score) / 40
      : 0;
  const fatigueRisk = fatigue.opt_out_risk;
  const trendRisk =
    gapAnalysis.trend === "widening" ? 0.3 : gapAnalysis.trend === "stable" ? 0.1 : 0;

  const riskScore =
    Math.min(
      1.0,
      silenceRisk * 0.35 +
        emotionalRisk * 0.25 +
        fatigueRisk * 0.15 +
        trendRisk +
        (1 - retention) * 0.15,
    );

  // Primary drivers
  const drivers: string[] = [];
  if (silenceDays >= SILENCE_THRESHOLDS.warning) {
    drivers.push(`${silenceDays} días de silencio (umbral: ${SILENCE_THRESHOLDS.warning} días)`);
  }
  if (gapAnalysis.trend === "widening") {
    drivers.push("Gaps entre comunicaciones se están ampliando");
  }
  if (trajectory.trajectory === "descending") {
    drivers.push(`Emoción descendente (score: ${trajectory.current.score})`);
  }
  if (fatigue.current_level > 0.5) {
    drivers.push(`Fatiga de mensajes elevada (${Math.round(fatigue.current_level * 100)}%)`);
  }
  if (trajectory.triggers.length > 0) {
    const last = trajectory.triggers[trajectory.triggers.length - 1];
    if (last.impact < 0) {
      drivers.push(`Trigger negativo reciente: ${last.description}`);
    }
  }
  if (drivers.length === 0) {
    drivers.push("Sin drivers de desengagement significativos");
  }

  // Urgency
  let recommendedUrgency: DisengagementPrediction["recommendedUrgency"];
  if (stage === "gone") recommendedUrgency = "emergency";
  else if (stage === "slipping") recommendedUrgency = "escalate";
  else if (stage === "drifting") recommendedUrgency = "direct_action";
  else if (stage === "cooling") recommendedUrgency = "soft_touch";
  else recommendedUrgency = "monitor";

  return {
    stage,
    riskScore: Math.round(riskScore * 100) / 100,
    daysToIrreversible,
    primaryDrivers: drivers,
    interventionWindow: stage !== "gone",
    recommendedUrgency,
  };
}

// ═══════════════════════════════════════════════════════════
// §3  ENGAGEMENT RENEWAL ANALYSIS
// ═══════════════════════════════════════════════════════════

/**
 * Analyze what historically broke silence — the renewal triggers.
 * Looks at history for patterns: after a gap > threshold,
 * what kind of message brought the member back?
 *
 * Returns the most effective triggers ranked by effectiveness.
 */
export function computeEngagementRenewal(
  history: HistoryItem[],
  silenceThresholdDays = 7,
): EngagementRenewalPattern {
  if (history.length < 3) {
    return {
      triggers: [],
      avgRenewalTimeDays: 0,
      mostEffectiveChannel: null,
      mostEffectiveTopic: null,
      renewalRate: 0,
    };
  }

  const sorted = sortByDateAsc(history);
  const triggers: RenewalTrigger[] = [];
  let renewalCount = 0;
  let totalRenewalDays = 0;

  // Find silence → renewal sequences
  for (let i = 1; i < sorted.length; i++) {
    const gapDays = daysBetween(sorted[i - 1].sent_at, sorted[i].sent_at);

    if (gapDays >= silenceThresholdDays) {
      renewalCount++;
      totalRenewalDays += gapDays;

      // The message that broke silence
      const renewalItem = sorted[i];
      const topic = renewalItem.notification_type;
      const channel = renewalItem.channel;

      // Topic trigger
      const existingTopic = triggers.find(
        (t: RenewalTrigger) => t.triggerType === "topic" && t.description === topic,
      );
      if (existingTopic) {
        existingTopic.frequency++;
        existingTopic.effectiveness = Math.min(
          1.0,
          existingTopic.effectiveness + 0.1,
        );
      } else {
        triggers.push({
          triggerType: "topic",
          description: topic,
          effectiveness: 0.5,
          frequency: 1,
        });
      }

      // Channel trigger
      const existingChannel = triggers.find(
        (t: RenewalTrigger) => t.triggerType === "channel" && t.description === channel,
      );
      if (existingChannel) {
        existingChannel.frequency++;
        existingChannel.effectiveness = Math.min(
          1.0,
          existingChannel.effectiveness + 0.1,
        );
      } else {
        triggers.push({
          triggerType: "channel",
          description: channel,
          effectiveness: 0.5,
          frequency: 1,
        });
      }
    }
  }

  // Sort by effectiveness
  triggers.sort(
    (a: RenewalTrigger, b: RenewalTrigger) =>
      b.effectiveness - a.effectiveness ||
      b.frequency - a.frequency,
  );

  const avgRenewalTimeDays =
    renewalCount > 0
      ? Math.round(totalRenewalDays / renewalCount)
      : 0;

  const topicTrigger = triggers.find(
    (t: RenewalTrigger) => t.triggerType === "topic",
  );
  const channelTrigger = triggers.find(
    (t: RenewalTrigger) => t.triggerType === "channel",
  );

  return {
    triggers,
    avgRenewalTimeDays,
    mostEffectiveChannel: channelTrigger?.description ?? null,
    mostEffectiveTopic: topicTrigger?.description ?? null,
    renewalRate:
      renewalCount > 0
        ? Math.round((renewalCount / (sorted.length - 1)) * 100) / 100
        : 0,
  };
}

// ═══════════════════════════════════════════════════════════
// §4  SEASONAL PATTERN DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect seasonal silence patterns — recurring quiet periods
 * tied to specific months.
 *
 * Members in Costa Rica may go silent during:
 * - December-January (holiday season)
 * - Semana Santa (March/April)
 * - Rainy season (September-October)
 *
 * Understanding seasonality prevents false alarms.
 */
export function detectSeasonalPatterns(
  history: HistoryItem[],
  minOccurrences = 2,
): SeasonalPattern[] {
  if (history.length < 6) return [];

  const sorted = sortByDateAsc(history);

  // Group gaps by month of the preceding message
  const monthlyGaps: Record<number, number[]> = {};
  for (let i = 1; i < sorted.length; i++) {
    const gapDays = daysBetween(sorted[i - 1].sent_at, sorted[i].sent_at);
    if (gapDays > 7) {
      const month = new Date(sorted[i - 1].sent_at).getMonth();
      if (!monthlyGaps[month]) monthlyGaps[month] = [];
      monthlyGaps[month].push(gapDays);
    }
  }

  const patterns: SeasonalPattern[] = [];

  for (const [monthStr, gaps] of Object.entries(monthlyGaps)) {
    const month = Number(monthStr);
    if (gaps.length < minOccurrences) continue;

    const avgDuration =
      Math.round(
        (gaps.reduce((s: number, d: number) => s + d, 0) / gaps.length) * 10,
      ) / 10;

    const severity: SeasonalPattern["severity"] =
      avgDuration > 30 ? "critical" : avgDuration > 14 ? "concerning" : "normal";

    patterns.push({
      months: [month],
      monthLabels: [MONTH_LABELS_ES[month] ?? `Mes ${month}`],
      avgDurationDays: avgDuration,
      severity,
      description:
        `Silencios recurrentes en ${MONTH_LABELS_ES[month] ?? `mes ${month}`} ` +
        `(${gaps.length} veces, promedio ${avgDuration} días)`,
    });
  }

  // Sort by severity (critical first)
  const severityOrder: Record<string, number> = {
    critical: 0,
    concerning: 1,
    normal: 2,
  };
  patterns.sort(
    (a: SeasonalPattern, b: SeasonalPattern) =>
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2),
  );

  return patterns;
}

// ═══════════════════════════════════════════════════════════
// §5  SILENCE CAUSE ANALYSIS
// ═══════════════════════════════════════════════════════════

/**
 * Analyze probable causes of silence.
 * Combines gap analysis, seasonal patterns, fatigue data,
 * and emotional trajectory to infer WHY the member is quiet.
 *
 * Returns a list of probable causes ranked by likelihood.
 */
export function analyzeSilenceCauses(
  history: HistoryItem[],
  fatigue: MessageFatigue,
  trajectory: EmotionalTrajectory,
): Array<{ cause: string; likelihood: number; evidence: string }> {
  const causes: Array<{ cause: string; likelihood: number; evidence: string }> = [];

  // Fatigue-driven silence
  if (fatigue.current_level > 0.6) {
    causes.push({
      cause: "Saturación de mensajes",
      likelihood: Math.min(0.95, fatigue.current_level),
      evidence: `${fatigue.messages_received_7d} mensajes en 7 días — nivel de fatiga: ${Math.round(fatigue.current_level * 100)}%`,
    });
  }

  // Emotional withdrawal
  if (trajectory.trajectory === "descending" && trajectory.velocity < -3) {
    causes.push({
      cause: "Retiro emocional",
      likelihood: Math.min(0.9, Math.abs(trajectory.velocity) / 10),
      evidence: `Emoción descendente a ${trajectory.velocity.toFixed(1)} pts/semana — score actual: ${trajectory.current.score}`,
    });
  }

  // Negative trigger response
  const negativeTriggers = trajectory.triggers.filter(
    (t: { impact: number }) => t.impact < -0.15,
  );
  if (negativeTriggers.length > 0) {
    const last = negativeTriggers[negativeTriggers.length - 1];
    causes.push({
      cause: "Reacción a experiencia negativa",
      likelihood: 0.7,
      evidence: `Trigger negativo: ${last.description} (impacto: ${last.impact})`,
    });
  }

  // Seasonal
  const seasonal = detectSeasonalPatterns(history);
  const now = new Date().getMonth();
  const currentSeasonal = seasonal.find(
    (p: SeasonalPattern) => p.months.includes(now),
  );
  if (currentSeasonal) {
    causes.push({
      cause: "Patrón estacional",
      likelihood: 0.5,
      evidence: currentSeasonal.description,
    });
  }

  // Communication style mismatch
  const gapAnalysis = analyzeResponseGaps(history);
  if (gapAnalysis.trend === "widening" && gapAnalysis.gaps.length >= 3) {
    causes.push({
      cause: "Desalineación de estilo comunicativo",
      likelihood: 0.4,
      evidence: `Gaps ampliándose — ${gapAnalysis.gaps.length} gaps detectados, tendencia: ${gapAnalysis.trend}`,
    });
  }

  // Sort by likelihood
  causes.sort(
    (a: { likelihood: number }, b: { likelihood: number }) =>
      b.likelihood - a.likelihood,
  );

  if (causes.length === 0) {
    causes.push({
      cause: "Sin causa identificable",
      likelihood: 0.1,
      evidence: "Patrón de comunicación dentro de rangos normales",
    });
  }

  return causes;
}

// ═══════════════════════════════════════════════════════════
// §6  SILENCE TIMELINE
// ═══════════════════════════════════════════════════════════

/**
 * Build a visual-friendly silence timeline.
 * Alternates between silence and activity periods.
 * Each entry includes engagement retention at period end.
 * Used by the SilenceMap component for visualization.
 */
export function buildSilenceTimeline(
  history: HistoryItem[],
  activityThresholdDays = 3,
): SilenceTimeline {
  if (history.length === 0) {
    return {
      entries: [],
      totalSilenceDays: 0,
      totalActivityDays: 0,
      silenceRatio: 0,
      longestSilenceDays: 0,
      currentRetention: 0,
    };
  }

  const sorted = sortByDateAsc(history);
  const entries: SilenceTimelineEntry[] = [];

  let totalSilenceDays = 0;
  let totalActivityDays = 0;
  let longestSilenceDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    // Activity burst — the message itself
    entries.push({
      startDate: sorted[i].sent_at,
      endDate: sorted[i].sent_at,
      durationDays: 0,
      type: "activity",
      retentionAtEnd: 1.0,
      renewalEvent: null,
    });

    // Silence gap until next message
    if (i < sorted.length - 1) {
      const gapDays = daysBetween(sorted[i].sent_at, sorted[i + 1].sent_at);

      if (gapDays > activityThresholdDays) {
        const retention = computeAttentionDecay(gapDays);
        entries.push({
          startDate: sorted[i].sent_at,
          endDate: sorted[i + 1].sent_at,
          durationDays: Math.round(gapDays),
          type: "silence",
          retentionAtEnd: Math.round(retention * 100) / 100,
          renewalEvent: sorted[i + 1].title ?? null,
        });
        totalSilenceDays += gapDays;
        longestSilenceDays = Math.max(longestSilenceDays, gapDays);
      } else {
        totalActivityDays += gapDays;
      }
    }
  }

  // Current silence (from last message to now)
  const lastDate = sorted[sorted.length - 1].sent_at;
  const currentSilenceDays =
    (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);
  if (currentSilenceDays > activityThresholdDays) {
    entries.push({
      startDate: lastDate,
      endDate: new Date().toISOString(),
      durationDays: Math.round(currentSilenceDays),
      type: "silence",
      retentionAtEnd:
        Math.round(computeAttentionDecay(currentSilenceDays) * 100) / 100,
      renewalEvent: null,
    });
    totalSilenceDays += currentSilenceDays;
    longestSilenceDays = Math.max(longestSilenceDays, currentSilenceDays);
  }

  const totalDays = totalSilenceDays + totalActivityDays;
  const silenceRatio =
    totalDays > 0
      ? Math.round((totalSilenceDays / totalDays) * 100) / 100
      : 0;

  return {
    entries,
    totalSilenceDays: Math.round(totalSilenceDays),
    totalActivityDays: Math.round(totalActivityDays),
    silenceRatio,
    longestSilenceDays: Math.round(longestSilenceDays),
    currentRetention:
      Math.round(computeAttentionDecay(currentSilenceDays) * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════
// §7  CASCADE RISK
// ═══════════════════════════════════════════════════════════

/**
 * Estimate cascade risk — how this member's silence could
 * spread to their social connections.
 *
 * When a high-influence member disengages, their connections
 * lose a social anchor. This function estimates that ripple effect.
 *
 * Note: socialProfile data is optional. When unavailable,
 * cascade risk is estimated from activity frequency alone.
 */
export function computeCascadeRisk(
  _memberId: string,
  silenceDays: number,
  socialConnectionsCount: number,
  socialInfluenceScore: number,
): CascadeRisk {
  if (socialConnectionsCount === 0 || silenceDays < SILENCE_THRESHOLDS.warning) {
    return {
      riskScore: 0,
      affectedConnections: 0,
      mechanism: "social_influence",
      description: "Sin riesgo de cascada — socio sin conexiones significativas o dentro de rango normal",
    };
  }

  // Cascade risk scales with influence, connections, and silence duration
  const silenceFactor = Math.min(1.0, silenceDays / SILENCE_THRESHOLDS.escape_velocity);
  const influenceFactor = socialInfluenceScore / 100;
  const connectionFactor = Math.min(1.0, socialConnectionsCount / 10);

  const riskScore =
    Math.min(
      1.0,
      silenceFactor * 0.4 + influenceFactor * 0.35 + connectionFactor * 0.25,
    );

  const affectedConnections = Math.round(
    socialConnectionsCount * riskScore * 0.6,
  );

  // Mechanism selection
  let mechanism: CascadeRisk["mechanism"];
  if (socialInfluenceScore > 70) {
    mechanism = "social_influence";
  } else if (socialConnectionsCount > 5) {
    mechanism = "shared_activity_loss";
  } else {
    mechanism = "referral_decay";
  }

  const descriptions: Record<CascadeRisk["mechanism"], string> = {
    social_influence:
      `Socio con alta influencia (${socialInfluenceScore}) en silencio — ${affectedConnections} conexiones en riesgo de perder referencia social`,
    shared_activity_loss:
      `Socio con ${socialConnectionsCount} conexiones en silencio — actividades compartidas pueden perder participantes`,
    referral_decay:
      `Potencial de referidos comprometido — socio en silencio no genera nuevos prospectos`,
  };

  return {
    riskScore: Math.round(riskScore * 100) / 100,
    affectedConnections,
    mechanism,
    description: descriptions[mechanism],
  };
}

// ═══════════════════════════════════════════════════════════
// §8  RENEWAL STRATEGY
// ═══════════════════════════════════════════════════════════

/**
 * Suggest a single renewal action based on disengagement stage
 * and the most effective historical triggers.
 * This is the "what to do RIGHT NOW" function.
 */
export function suggestRenewalAction(
  profile: SilenceProfile,
  fingerprint: CommunicationFingerprint,
  _trajectory: EmotionalTrajectory,
  renewalPattern: EngagementRenewalPattern,
): RenewalAction {
  const silenceDays = profile.current_silence_days;
  const level = deriveSilenceLevel(silenceDays);

  // Use the most effective channel from renewal history if available
  const channel =
    renewalPattern.mostEffectiveChannel ?? fingerprint.preferred_channel;

  // Use the most effective topic from renewal history if available
  const topicContext = renewalPattern.mostEffectiveTopic
    ? ` sobre ${renewalPattern.mostEffectiveTopic}`
    : "";

  // Escalate action based on severity
  if (level === "critical") {
    return {
      actionType: "staff_call",
      channel: "phone",
      suggestedMessage: `Llamada personal${topicContext} — socio en silencio ${silenceDays} días. Tono: ${fingerprint.resonant_tone}.`,
      timing: "Inmediato — hoy",
      urgency: "critical",
      estimatedSuccessRate: 0.6,
      rationale: `Silencio crítico (${silenceDays} días). Llamada personal es el último recurso antes de pérdida irreversible.`,
    };
  }

  if (level === "alert") {
    return {
      actionType: "personal_outreach",
      channel,
      suggestedMessage: `Mensaje personalizado${topicContext} con referencia a última interacción. Tono: ${fingerprint.resonant_tone}.`,
      timing: "En las próximas 48 horas",
      urgency: "high",
      estimatedSuccessRate: 0.45,
      rationale: `Alerta de silencio (${silenceDays} días). Outreach personal con contexto narrativo.`,
    };
  }

  if (level === "warning") {
    return {
      actionType: "soft_touch",
      channel,
      suggestedMessage: `Comunicación de bajo perfil${topicContext} — sin presión, solo presencia.`,
      timing: "Esta semana",
      urgency: "medium",
      estimatedSuccessRate: 0.35,
      rationale: `Warning de silencio (${silenceDays} días). Touch suave para no saturar.`,
    };
  }

  return {
    actionType: "monitor",
    channel,
    suggestedMessage: `Continuar con ritmo normal. Próximo mensaje en ${fingerprint.optimal_frequency_days} días.`,
    timing: `Próximo ciclo (${fingerprint.optimal_frequency_days} días)`,
    urgency: "low",
    estimatedSuccessRate: 0.0,
    rationale: "Silencio dentro de rango normal — no se requiere acción especial.",
  };
}

/**
 * Build a complete renewal strategy — multi-step plan
 * to recover a silent member.
 *
 * Combines silence analysis, disengagement prediction,
 * renewal patterns, and fingerprint into a coherent plan
 * with sequenced actions and timeline.
 */
export function buildRenewalStrategy(
  profile: SilenceProfile,
  fingerprint: CommunicationFingerprint,
  trajectory: EmotionalTrajectory,
  fatigue: MessageFatigue,
  history: HistoryItem[],
  _narrative: NarrativeArc,
): RenewalStrategy {
  const silenceDays = profile.current_silence_days;
  const level = deriveSilenceLevel(silenceDays);
  const levelLabel = SILENCE_LEVEL_CONFIG[level].label;
  const prediction = predictDisengagement(profile, trajectory, fatigue, history);
  const renewalPattern = computeEngagementRenewal(history);
  const causes = analyzeSilenceCauses(history, fatigue, trajectory);

  // Build step sequence
  const steps: RenewalAction[] = [];

  // Step 1: Immediate action (based on current severity)
  const immediateAction = suggestRenewalAction(
    profile,
    fingerprint,
    trajectory,
    renewalPattern,
  );
  steps.push(immediateAction);

  // Step 2: Follow-up (if not already critical)
  if (level !== "critical") {
    const followUpChannel =
      fingerprint.preferred_channel === immediateAction.channel
        ? "whatsapp"
        : fingerprint.preferred_channel;

    steps.push({
      actionType: "soft_touch",
      channel: followUpChannel,
      suggestedMessage: "Seguimiento suave — verificar recepción del primer contacto.",
      timing: `${Math.max(2, Math.round(fingerprint.optimal_frequency_days / 2))} días después del primer contacto`,
      urgency: "medium",
      estimatedSuccessRate: 0.25,
      rationale: "Segundo touchpoint para confirmar engagement.",
    });
  }

  // Step 3: Social pull (if has connections)
  if (steps.length < 4) {
    steps.push({
      actionType: "social_pull",
      channel: "in_app",
      suggestedMessage: "Invitación a actividad grupal o evento social.",
      timing: `${fingerprint.optimal_frequency_days} días después del seguimiento`,
      urgency: "low",
      estimatedSuccessRate: 0.2,
      rationale: "Activación social como alternativa a comunicación directa.",
    });
  }

  // Overall success estimate
  const stepSuccessRates = steps.map(
    (s: RenewalAction) => s.estimatedSuccessRate,
  );
  // P(at least one succeeds) = 1 - P(all fail)
  const allFail = stepSuccessRates.reduce(
    (p: number, rate: number) => p * (1 - rate),
    1,
  );
  const overallSuccess = Math.round((1 - allFail) * 100) / 100;

  // Time window
  const timeWindowDays =
    prediction.daysToIrreversible ?? SILENCE_THRESHOLDS.escape_velocity;

  // Narrative description
  const topCause = causes[0]?.cause ?? "causa desconocida";
  const narrativeText =
    `Socio ${levelLabel} — ${silenceDays} días de silencio. ` +
    `Causa probable: ${topCause}. ` +
    `Etapa de desengagement: ${prediction.stage}. ` +
    `Ventana de intervención: ${timeWindowDays} días. ` +
    `${steps.length} acciones planificadas con ${Math.round(overallSuccess * 100)}% de éxito estimado.`;

  return {
    memberId: profile.member_id,
    silenceDays,
    silenceLevel: levelLabel,
    disengagementStage: prediction.stage,
    steps,
    overallSuccessEstimate: overallSuccess,
    timeWindowDays,
    narrative: narrativeText,
  };
}