// src/features/communications/lib/communicationIntelligence.ts
// ═══════════════════════════════════════════════════════════
// Communication Intelligence Engine
// Castillo Country Club — Phase 31 "The Voice"
//
// THE ENGINE — 20+ pure functions that transform raw
// communication data into actionable intelligence.
//
// From observer to interlocutor. Each function is pure,
// deterministic, and testable. No side effects.
// ═══════════════════════════════════════════════════════════

import type {
  NotificationChannel,
  SentimentLevel,
  NarrativePhase,
  StoryHealth,
  MessageLength,
  ResonantTone,
  EmotionalSource,
  MessageDirection,
  ConversationOutcome,
  CommunicationFingerprint,
  ReceptivityWindow,
  TopicSensitivity,
  ResponsePattern,
  CommunicationIntelligenceBriefing,
  EmotionalTrajectory,
  EmotionalDataPoint,
  EmotionalTrigger,
  ResonanceEvent,
  EmotionalForecast,
  SilenceProfile,
  SilencePattern,
  ConversationMemoryNode,
  NarrativeArc,
  NarrativeChapter,
  MessageFatigue,
  HistoryItem,
  CommunicationPreferencesData,
  SentimentDataPoint,
  SatisfactionTrendsData,
} from "../types";

import {
  deriveSilenceLevel,
  deriveFatigueLevel,
  deriveEmotionalZone,
  getChannelLabel,
  SILENCE_LEVEL_CONFIG,
  EMOTIONAL_ZONE_CONFIG,
  NARRATIVE_PHASE_CONFIG,
  STORY_HEALTH_CONFIG,
  TONE_SPECTRUM_CONFIG,
} from "../types";

import {
  COMMUNICATION_INTELLIGENCE_DEFAULTS,
  EMOTIONAL_BASELINE_DEFAULTS,
  SILENCE_THRESHOLDS,
  DECAY_CURVE_DEFAULTS,
  deriveInterventionUrgency,
  interpolateDecayCurve,
} from "../config";

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS — Internal utilities
// ═══════════════════════════════════════════════════════════

const VALID_NOTIFICATION_CHANNELS: NotificationChannel[] = [
  "email", "push", "sms", "whatsapp", "in_app",
];

function isValidNotificationChannel(ch: string): ch is NotificationChannel {
  return VALID_NOTIFICATION_CHANNELS.includes(ch as NotificationChannel);
}

function mapNotificationTypeToTopic(notificationType: string): string {
  const mapping: Record<string, string> = {
    announcement: "events",
    event_invite: "events",
    promotional: "promotions",
    survey: "feedback",
    emergency: "safety",
    milestone: "celebration",
    reactivation: "engagement",
    personal_follow_up: "personal",
    maintenance: "facilities",
  };
  return mapping[notificationType] ?? notificationType;
}

/** Normalize score to 0-100. Handles both 0-1 and 0-100 inputs. */
function normalizeScore(score: number): number {
  if (score >= 0 && score <= 1) return Math.round(score * 100);
  return Math.max(0, Math.min(100, score));
}

function mapToEmotionalSource(source: string): EmotionalSource {
  if (source === "interaction") return "interaction";
  if (source === "survey") return "survey";
  if (source === "activity") return "activity";
  return "inferred";
}

function toSentimentLevel(score: number): SentimentLevel {
  if (score >= 80) return "very_positive";
  if (score >= 60) return "positive";
  if (score >= 40) return "neutral";
  if (score >= 20) return "negative";
  return "very_negative";
}

function inferChapterTitle(topic: string, sentiment: SentimentLevel): string {
  const topicLabels: Record<string, string> = {
    events: "Eventos",
    promotions: "Promociones",
    feedback: "Feedback",
    safety: "Seguridad",
    celebration: "Celebración",
    engagement: "Re-engagement",
    personal: "Seguimiento Personal",
    facilities: "Instalaciones",
    general: "Comunicación General",
  };
  const sentimentSuffix: Record<SentimentLevel, string> = {
    very_positive: " — Muy positivo",
    positive: " — Positivo",
    neutral: "",
    negative: " — Negativo",
    very_negative: " — Crítico",
  };
  return `${topicLabels[topic] ?? topic}${sentimentSuffix[sentiment]}`;
}

function computeReceptiveWindowsFromHistory(
  history: HistoryItem[],
): ReceptivityWindow[] {
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );

  for (const item of history) {
    const d = new Date(item.sent_at);
    heatmap[d.getDay()][d.getHours()]++;
  }

  const total = history.length;
  const avgPerSlot = total / (7 * 24);

  const windows: ReceptivityWindow[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (heatmap[day][hour] > avgPerSlot * 2) {
        windows.push({
          day_of_week: day,
          hour_start: hour,
          hour_end: Math.min(hour + 2, 24),
          receptivity_score: Math.min(1.0, heatmap[day][hour] / (avgPerSlot * 5)),
          confidence: Math.min(0.9, total / 30),
          sample_size: heatmap[day][hour],
        });
      }
    }
  }

  return windows.length > 0
    ? windows
    : [...COMMUNICATION_INTELLIGENCE_DEFAULTS.receptivity.default_windows];
}

// ═══════════════════════════════════════════════════════════
// §1  CHANNEL ANALYSIS
// ═══════════════════════════════════════════════════════════

/**
 * Compute channel effectiveness scores from communication history.
 * Each channel is scored 0-1 based on delivery success ratio.
 * Returns all 5 NotificationChannel keys initialized to 0.
 */
export function computeChannelScores(
  history: HistoryItem[],
): Record<NotificationChannel, number> {
  const scores: Record<NotificationChannel, number> = {
    email: 0,
    push: 0,
    sms: 0,
    whatsapp: 0,
    in_app: 0,
  };

  if (history.length === 0) return scores;

  for (const item of history) {
    if (!isValidNotificationChannel(item.channel)) continue;
    const channel = item.channel as NotificationChannel;
    const weight =
      item.status === "sent" || item.status === "delivered" ? 1 : -0.5;
    scores[channel] += weight;
  }

  const maxScore = Math.max(...Object.values(scores), 1);
  for (const ch of Object.keys(scores) as NotificationChannel[]) {
    scores[ch] = Math.max(0, Math.round((scores[ch] / maxScore) * 100) / 100);
  }

  return scores;
}

// ═══════════════════════════════════════════════════════════
// §2  FREQUENCY ANALYSIS
// ═══════════════════════════════════════════════════════════

/**
 * Derive optimal communication frequency from history.
 * Returns median gap in days between consecutive messages.
 * Falls back to default when < 2 data points.
 */
export function deriveOptimalFrequency(history: HistoryItem[]): number {
  if (history.length < 2) {
    return COMMUNICATION_INTELLIGENCE_DEFAULTS.fingerprint.default_frequency_days;
  }

  const sorted = [...history].sort(
    (a: HistoryItem, b: HistoryItem) =>
      new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gapDays =
      (new Date(sorted[i].sent_at).getTime() -
        new Date(sorted[i - 1].sent_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (gapDays > 0) gaps.push(gapDays);
  }

  if (gaps.length === 0) {
    return COMMUNICATION_INTELLIGENCE_DEFAULTS.fingerprint.default_frequency_days;
  }

  gaps.sort((a: number, b: number) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median =
    gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid];

  return Math.max(1, Math.round(median));
}

// ═══════════════════════════════════════════════════════════
// §3  LENGTH DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect preferred message length from title analysis.
 * Uses average title character count as proxy.
 */
export function detectPreferredLength(history: HistoryItem[]): MessageLength {
  if (history.length === 0) return "moderate";

  const totalLength = history.reduce(
    (sum: number, item: HistoryItem) => sum + item.title.length,
    0,
  );
  const avgLength = totalLength / history.length;

  if (avgLength < 40) return "brief";
  if (avgLength > 100) return "detailed";
  return "moderate";
}

// ═══════════════════════════════════════════════════════════
// §4  TONE INFERENCE
// ═══════════════════════════════════════════════════════════

/**
 * Infer resonant tone from communication patterns.
 * Analyzes message types to determine which tone resonates.
 * Defaults to "warm" for luxury club context.
 */
export function inferResonantTone(history: HistoryItem[]): ResonantTone {
  if (history.length === 0) return "warm";

  const types = history.map((item: HistoryItem) => item.notification_type);
  const personalCount = types.filter(
    (t: string) => t === "personal_follow_up" || t === "milestone",
  ).length;
  const formalCount = types.filter(
    (t: string) => t === "announcement" || t === "emergency",
  ).length;
  const narrativeCount = types.filter(
    (t: string) => t === "event_invite" || t === "promotional",
  ).length;

  const personalRatio = personalCount / history.length;
  const formalRatio = formalCount / history.length;
  const narrativeRatio = narrativeCount / history.length;

  if (formalRatio > 0.5) return "formal";
  if (narrativeRatio > 0.5) return "narrative";
  if (personalRatio > 0.3) return "warm";

  return "warm";
}

// ═══════════════════════════════════════════════════════════
// §5  TOPIC SENSITIVITY
// ═══════════════════════════════════════════════════════════

/**
 * Build topic sensitivity map from communication history.
 * Each topic gets an engagement score (-1 to +1) based on
 * delivery success as a proxy for resonance.
 */
export function buildTopicSensitivity(
  history: HistoryItem[],
): TopicSensitivity[] {
  if (history.length === 0) return [];

  const topicGroups: Record<string, HistoryItem[]> = {};
  for (const item of history) {
    const topic = mapNotificationTypeToTopic(item.notification_type);
    if (!topicGroups[topic]) topicGroups[topic] = [];
    topicGroups[topic].push(item);
  }

  return Object.entries(topicGroups).map(
    ([topic, items]: [string, HistoryItem[]]) => {
      const successCount = items.filter(
        (item: HistoryItem) =>
          item.status === "sent" || item.status === "delivered",
      ).length;
      const responseRate = successCount / items.length;
      const engagementScore = Math.round((responseRate - 0.5) * 2 * 100) / 100;

      const sorted = [...items].sort(
        (a: HistoryItem, b: HistoryItem) =>
          new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
      );

      return {
        topic,
        engagement_score: engagementScore,
        response_rate: Math.round(responseRate * 100) / 100,
        last_tested: sorted[0].sent_at,
      };
    },
  );
}

// ═══════════════════════════════════════════════════════════
// §6  RESPONSE PATTERN
// ═══════════════════════════════════════════════════════════

/**
 * Compute the member's response behavior pattern.
 * Derives avg response time, response rate, and preferred channel.
 */
export function computeResponsePattern(
  history: HistoryItem[],
): ResponsePattern {
  if (history.length === 0) {
    return {
      avg_response_time_hours: 24,
      response_rate: 0,
      preferred_response_channel: null,
      silence_threshold_days: SILENCE_THRESHOLDS.warning,
      last_response: null,
    };
  }

  const sorted = [...history].sort(
    (a: HistoryItem, b: HistoryItem) =>
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
  );

  const delivered = sorted.filter(
    (item: HistoryItem) =>
      item.status === "sent" || item.status === "delivered",
  ).length;
  const responseRate = delivered / sorted.length;

  const gaps: number[] = [];
  const chronological = [...sorted].reverse();
  for (let i = 1; i < chronological.length; i++) {
    const gapHours =
      Math.abs(
        new Date(chronological[i].sent_at).getTime() -
          new Date(chronological[i - 1].sent_at).getTime(),
      ) /
      (1000 * 60 * 60);
    if (gapHours > 0 && gapHours < 720) gaps.push(gapHours);
  }

  const avgResponseTime =
    gaps.length > 0
      ? gaps.reduce((sum: number, g: number) => sum + g, 0) / gaps.length
      : 24;

  const channelCounts: Record<string, number> = {};
  for (const item of sorted) {
    channelCounts[item.channel] = (channelCounts[item.channel] ?? 0) + 1;
  }
  const sortedChannels = Object.entries(channelCounts).sort(
    ([, a]: [string, number], [, b]: [string, number]) => b - a,
  );
  const topChannel = sortedChannels[0]?.[0] ?? null;

  return {
    avg_response_time_hours: Math.round(avgResponseTime * 10) / 10,
    response_rate: Math.round(responseRate * 100) / 100,
    preferred_response_channel:
      isValidNotificationChannel(topChannel ?? "")
        ? (topChannel as NotificationChannel)
        : null,
    silence_threshold_days: SILENCE_THRESHOLDS.warning,
    last_response: sorted[0]?.sent_at ?? null,
  };
}

// ═══════════════════════════════════════════════════════════
// §7  COMMUNICATION FINGERPRINT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build the unique Communication Fingerprint of a member.
 * Synthesizes channel scores, frequency, length, tone, topics,
 * response patterns, and receptive windows into a single profile.
 *
 * This is NOT what the member set in a form.
 * This is what the AI INFERRED from behavioral data.
 */
export function buildCommunicationFingerprint(
  memberId: string,
  history: HistoryItem[],
  _preferences: CommunicationPreferencesData | null,
): CommunicationFingerprint {
  const channelScores = computeChannelScores(history);
  const frequency = deriveOptimalFrequency(history);
  const length = detectPreferredLength(history);
  const tone = inferResonantTone(history);
  const topicSensitivity = buildTopicSensitivity(history);
  const responsePattern = computeResponsePattern(history);

  const channelEntries = Object.entries(channelScores) as [
    NotificationChannel,
    number,
  ][];
  channelEntries.sort(
    ([, a]: [NotificationChannel, number], [, b]: [NotificationChannel, number]) =>
      b - a,
  );
  const preferredChannel = channelEntries[0]?.[0] ?? "email";

  const confidence = Math.min(
    history.length /
      COMMUNICATION_INTELLIGENCE_DEFAULTS.fingerprint.min_interactions,
    1.0,
  );

  const receptiveHours =
    history.length >= 10
      ? computeReceptiveWindowsFromHistory(history)
      : [...COMMUNICATION_INTELLIGENCE_DEFAULTS.receptivity.default_windows];

  return {
    member_id: memberId,
    preferred_channel: preferredChannel,
    channel_scores: channelScores,
    optimal_frequency_days: frequency,
    preferred_length: length,
    resonant_tone: tone,
    receptive_hours: receptiveHours,
    topic_sensitivity: topicSensitivity,
    response_pattern: responsePattern,
    last_updated: new Date().toISOString(),
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════
// §8  EMOTIONAL INTELLIGENCE
// ═══════════════════════════════════════════════════════════

/**
 * Convert SentimentDataPoint[] to EmotionalDataPoint[].
 * Normalizes scores and maps sources.
 */
export function sentimentToEmotionalDataPoints(
  data: SentimentDataPoint[],
): EmotionalDataPoint[] {
  return data.map((sp: SentimentDataPoint) => ({
    date: sp.timestamp,
    score: normalizeScore(sp.score),
    sentiment: sp.sentiment,
    source: mapToEmotionalSource(sp.source),
    confidence: 0.7,
  }));
}

/**
 * Compute emotional velocity and acceleration.
 * Velocity = score change per week. Acceleration = change in velocity.
 */
export function computeEmotionalVelocity(history: EmotionalDataPoint[]): {
  velocity: number;
  acceleration: number;
} {
  if (history.length < 2) return { velocity: 0, acceleration: 0 };

  const sorted = [...history].sort(
    (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const windowSize = Math.min(sorted.length, 5);
  const recent = sorted.slice(-windowSize);
  if (recent.length < 2) return { velocity: 0, acceleration: 0 };

  const first = recent[0];
  const last = recent[recent.length - 1];
  const daysDiff = Math.max(
    1,
    (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const velocity = ((last.score - first.score) / daysDiff) * 7;

  let acceleration = 0;
  if (recent.length >= 4) {
    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, mid);
    const secondHalf = recent.slice(mid);

    const v1Days = Math.max(
      1,
      (new Date(firstHalf[firstHalf.length - 1].date).getTime() -
        new Date(firstHalf[0].date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const v1 =
      ((firstHalf[firstHalf.length - 1].score - firstHalf[0].score) / v1Days) *
      7;

    const v2Days = Math.max(
      1,
      (new Date(secondHalf[secondHalf.length - 1].date).getTime() -
        new Date(secondHalf[0].date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const v2 =
      ((secondHalf[secondHalf.length - 1].score - secondHalf[0].score) /
        v2Days) *
      7;

    acceleration = v2 - v1;
  }

  return {
    velocity: Math.round(velocity * 100) / 100,
    acceleration: Math.round(acceleration * 100) / 100,
  };
}

/**
 * Detect emotional triggers — moments where score shifted ≥ threshold.
 */
export function detectEmotionalTriggers(
  history: EmotionalDataPoint[],
  threshold = 15,
): EmotionalTrigger[] {
  if (history.length < 2) return [];

  const sorted = [...history].sort(
    (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const triggers: EmotionalTrigger[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const change = sorted[i].score - sorted[i - 1].score;
    if (Math.abs(change) >= threshold) {
      const durationDays = Math.max(
        1,
        Math.round(
          (new Date(sorted[i].date).getTime() -
            new Date(sorted[i - 1].date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      triggers.push({
        event_type: change > 0 ? "positive_shift" : "negative_shift",
        impact: Math.round((change / 100) * 100) / 100,
        duration_days: durationDays,
        description:
          change > 0
            ? `Mejora emocional significativa (+${Math.round(change)} pts)`
            : `Descenso emocional significativo (${Math.round(change)} pts)`,
      });
    }
  }

  return triggers;
}

/**
 * Compute resonance events — experiences with lasting emotional echo.
 * Only positive shifts that persist beyond the resonance duration threshold.
 */
export function computeResonanceEvents(
  history: EmotionalDataPoint[],
  minImpactDays = EMOTIONAL_BASELINE_DEFAULTS.resonance_duration_days,
): ResonanceEvent[] {
  if (history.length < 3) return [];

  const sorted = [...history].sort(
    (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const events: ResonanceEvent[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const change = sorted[i].score - sorted[i - 1].score;
    if (change >= 20) {
      let impactDays = 0;
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].score >= sorted[i].score - 5) {
          impactDays =
            (new Date(sorted[j].date).getTime() -
              new Date(sorted[i].date).getTime()) /
            (1000 * 60 * 60 * 24);
        } else {
          break;
        }
      }

      if (impactDays >= minImpactDays) {
        events.push({
          event_id: `res-${sorted[i].date}-${i}`,
          date: sorted[i].date,
          event_type: "emotional_peak",
          impact_duration_days: Math.round(impactDays),
          echo_mentions: 0,
          identity_integration: impactDays > minImpactDays * 2,
        });
      }
    }
  }

  return events;
}

/**
 * Forecast emotional state at 7-day and 30-day horizons.
 * Linear projection from current velocity.
 */
export function forecastEmotionalState(
  current: EmotionalDataPoint,
  velocity: number,
  history: EmotionalDataPoint[],
): EmotionalForecast {
  const predicted7d = Math.max(
    0,
    Math.min(100, current.score + velocity),
  );
  const predicted30d = Math.max(
    0,
    Math.min(100, current.score + velocity * (30 / 7)),
  );

  const confidence =
    history.length >= EMOTIONAL_BASELINE_DEFAULTS.min_data_points
      ? Math.min(history.length / 20, 0.95)
      : 0.3;

  const riskFactors: string[] = [];
  if (velocity < -5) riskFactors.push("Descenso emocional acelerado");
  if (predicted30d < 40) riskFactors.push("Proyección en zona de riesgo");
  if (current.score < 30) riskFactors.push("Estado emocional actual crítico");

  return {
    predicted_score_7d: Math.round(predicted7d),
    predicted_score_30d: Math.round(predicted30d),
    confidence: Math.round(confidence * 100) / 100,
    risk_factors: riskFactors,
    intervention_window: predicted7d < 40 || predicted30d < 35,
  };
}

/**
 * Derive the complete Emotional Trajectory of a member.
 * Maps baseline, current state, velocity, triggers, resonance,
 * and forecast into a unified temporal narrative.
 *
 * Enriches with survey data when available.
 */
export function deriveEmotionalTrajectory(
  memberId: string,
  sentimentData: SentimentDataPoint[],
  surveys: SatisfactionTrendsData | null,
): EmotionalTrajectory {
  const history = sentimentToEmotionalDataPoints(sentimentData);

  // Enrich with survey data if available
  if (surveys?.monthly_averages) {
    for (const month of surveys.monthly_averages) {
      const exists = history.some(
        (dp: EmotionalDataPoint) =>
          dp.date.substring(0, 7) === month.month,
      );
      if (!exists) {
        history.push({
          date: `${month.month}-15T12:00:00Z`,
          score: normalizeScore(month.avg_score),
          sentiment: toSentimentLevel(normalizeScore(month.avg_score)),
          source: "survey",
          confidence: 0.6,
        });
      }
    }
  }

  // Empty state: return baseline
  if (history.length === 0) {
    const baseline: EmotionalDataPoint = {
      date: new Date().toISOString(),
      score: EMOTIONAL_BASELINE_DEFAULTS.baseline_score,
      sentiment: "neutral",
      source: "inferred",
      confidence: 0.2,
    };
    return {
      member_id: memberId,
      baseline,
      current: { ...baseline },
      velocity: 0,
      acceleration: 0,
      trajectory: "stable",
      triggers: [],
      recovery_time_days: EMOTIONAL_BASELINE_DEFAULTS.recovery_time_days,
      resonance_events: [],
      forecast: forecastEmotionalState(baseline, 0, []),
      history: [baseline],
    };
  }

  const sorted = [...history].sort(
    (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Baseline: median of first 30%
  const baselineEnd = Math.max(1, Math.floor(sorted.length * 0.3));
  const baselineScores = sorted
    .slice(0, baselineEnd)
    .map((dp: EmotionalDataPoint) => dp.score)
    .sort((a: number, b: number) => a - b);
  const baselineMid = Math.floor(baselineScores.length / 2);
  const baselineScore =
    baselineScores.length % 2 === 0
      ? (baselineScores[baselineMid - 1] + baselineScores[baselineMid]) / 2
      : baselineScores[baselineMid];

  const baseline: EmotionalDataPoint = {
    date: sorted[0].date,
    score: Math.round(baselineScore),
    sentiment: toSentimentLevel(Math.round(baselineScore)),
    source: "inferred",
    confidence: 0.5,
  };

  const current = sorted[sorted.length - 1];
  const { velocity, acceleration } = computeEmotionalVelocity(sorted);

  const trajectory: EmotionalTrajectory["trajectory"] =
    velocity > 2 ? "ascending" : velocity < -2 ? "descending" : "stable";

  const triggers = detectEmotionalTriggers(sorted);

  const negativeTriggers = triggers.filter(
    (t: EmotionalTrigger) => t.impact < 0,
  );
  const recoveryTime =
    negativeTriggers.length > 0
      ? Math.round(
          negativeTriggers.reduce(
            (sum: number, t: EmotionalTrigger) => sum + t.duration_days,
            0,
          ) / negativeTriggers.length,
        )
      : EMOTIONAL_BASELINE_DEFAULTS.recovery_time_days;

  const resonanceEvents = computeResonanceEvents(sorted);
  const forecast = forecastEmotionalState(current, velocity, sorted);

  return {
    member_id: memberId,
    baseline,
    current,
    velocity,
    acceleration,
    trajectory,
    triggers,
    recovery_time_days: recoveryTime,
    resonance_events: resonanceEvents,
    forecast,
    history: sorted,
  };
}

// ═══════════════════════════════════════════════════════════
// §9  SILENCE INTELLIGENCE
// ═══════════════════════════════════════════════════════════

/**
 * Compute attention decay — engagement retention after N days of silence.
 * Delegates to config's interpolation over the decay curve.
 */
export function computeAttentionDecay(daysSilent: number): number {
  return interpolateDecayCurve(daysSilent);
}

/**
 * Detect recurring silence patterns from communication history.
 * Identifies seasonal, gradual, and post-event silence behaviors.
 */
export function detectSilencePatterns(
  history: HistoryItem[],
): SilencePattern[] {
  if (history.length < 3) return [];

  const sorted = [...history].sort(
    (a: HistoryItem, b: HistoryItem) =>
      new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
  );

  const gaps: { startMs: number; days: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevMs = new Date(sorted[i - 1].sent_at).getTime();
    const currMs = new Date(sorted[i].sent_at).getTime();
    const gapDays = (currMs - prevMs) / (1000 * 60 * 60 * 24);
    if (gapDays > 7) {
      gaps.push({ startMs: prevMs, days: gapDays });
    }
  }

  if (gaps.length === 0) return [];

  const patterns: SilencePattern[] = [];

  // Gradual: gaps increasing over time
  if (gaps.length >= 3) {
    const midIdx = Math.floor(gaps.length / 2);
    const avgFirst =
      gaps
        .slice(0, midIdx)
        .reduce((sum: number, g: { days: number }) => sum + g.days, 0) /
      midIdx;
    const avgSecond =
      gaps
        .slice(midIdx)
        .reduce(
          (sum: number, g: { days: number }) => sum + g.days,
          0,
        ) /
      (gaps.length - midIdx);

    if (avgSecond > avgFirst * 1.5) {
      patterns.push({
        pattern_type: "gradual",
        trigger: "Aumento progresivo de silencio entre interacciones",
        avg_duration_days: Math.round(avgSecond),
        frequency: gaps.length,
      });
    }
  }

  // Seasonal: gaps clustering in specific months
  const monthCounts: Record<number, number> = {};
  for (const gap of gaps) {
    const month = new Date(gap.startMs).getMonth();
    monthCounts[month] = (monthCounts[month] ?? 0) + 1;
  }
  const dominatedMonth = Object.entries(monthCounts).find(
    ([, count]: [string, number]) => count >= gaps.length * 0.4,
  );
  if (dominatedMonth) {
    const monthIdx = Number(dominatedMonth[0]);
    const monthGaps = gaps.filter(
      (g: { startMs: number }) =>
        new Date(g.startMs).getMonth() === monthIdx,
    );
    const avgDuration =
      monthGaps.reduce(
        (sum: number, g: { days: number }) => sum + g.days,
        0,
      ) / monthGaps.length;

    patterns.push({
      pattern_type: "seasonal",
      trigger: `Silencios recurrentes en ${new Date(2024, monthIdx).toLocaleDateString("es-CR", { month: "long" })}`,
      avg_duration_days: Math.round(avgDuration),
      frequency: Number(dominatedMonth[1]),
    });
  }

  return patterns;
}

/**
 * Build the complete Silence Profile of a member.
 * Current silence, average gaps, patterns, disengagement risk,
 * and attention decay curve.
 */
export function buildSilenceProfile(
  memberId: string,
  history: HistoryItem[],
): SilenceProfile {
  if (history.length === 0) {
    return {
      member_id: memberId,
      current_silence_days: 999,
      avg_silence_days: 0,
      silence_threshold_days: SILENCE_THRESHOLDS.warning,
      silence_pattern: [],
      disengagement_risk: 1.0,
      last_renewal_event: null,
      attention_decay_curve: [...DECAY_CURVE_DEFAULTS],
    };
  }

  const sorted = [...history].sort(
    (a: HistoryItem, b: HistoryItem) =>
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
  );

  const lastMs = new Date(sorted[0].sent_at).getTime();
  const currentSilenceDays = Math.floor(
    (Date.now() - lastMs) / (1000 * 60 * 60 * 24),
  );

  const gaps: number[] = [];
  const chronological = [...sorted].reverse();
  for (let i = 1; i < chronological.length; i++) {
    const gap =
      Math.abs(
        new Date(chronological[i].sent_at).getTime() -
          new Date(chronological[i - 1].sent_at).getTime(),
      ) /
      (1000 * 60 * 60 * 24);
    if (gap > 0) gaps.push(gap);
  }
  const avgSilence =
    gaps.length > 0
      ? Math.round(
          gaps.reduce((sum: number, g: number) => sum + g, 0) / gaps.length,
        )
      : 0;

  const patterns = detectSilencePatterns(history);

  const disengagementRisk =
    currentSilenceDays > 0 && avgSilence > 0
      ? Math.min(1.0, currentSilenceDays / (avgSilence * 3))
      : currentSilenceDays > 30
        ? 0.8
        : 0.3;

  return {
    member_id: memberId,
    current_silence_days: currentSilenceDays,
    avg_silence_days: avgSilence,
    silence_threshold_days: SILENCE_THRESHOLDS.warning,
    silence_pattern: patterns,
    disengagement_risk: Math.round(disengagementRisk * 100) / 100,
    last_renewal_event: sorted[0]?.title ?? null,
    attention_decay_curve: [...DECAY_CURVE_DEFAULTS],
  };
}

// ═══════════════════════════════════════════════════════════
// §10  CONVERSATION MEMORY & NARRATIVE
// ═══════════════════════════════════════════════════════════

/**
 * Build conversation memory graph from communication history.
 * Each HistoryItem becomes an outbound ConversationMemoryNode.
 * Inbound nodes would enrich this from response data.
 */
export function buildConversationGraph(
  memberId: string,
  history: HistoryItem[],
): ConversationMemoryNode[] {
  return history.map((item: HistoryItem, index: number) => {
    const channel: NotificationChannel = isValidNotificationChannel(
      item.channel,
    )
      ? (item.channel as NotificationChannel)
      : "email";

    const outcome: ConversationOutcome =
      item.status === "sent" || item.status === "delivered"
        ? "resolved"
        : item.status === "failed" || item.status === "cancelled"
          ? "ignored"
          : "pending";

    return {
      id: `conv-${item.id}`,
      member_id: memberId,
      date: item.sent_at,
      channel,
      direction: "outbound" as MessageDirection,
      topic: mapNotificationTypeToTopic(item.notification_type),
      subtopics: [],
      sentiment: "neutral" as SentimentLevel,
      sentiment_score: 50,
      summary: item.title,
      outcome,
      callback_date: null,
      commitment: null,
      linked_nodes: index > 0 ? [`conv-${history[index - 1].id}`] : [],
    };
  });
}

/**
 * Detect the current narrative phase from chapter history.
 * setup → development → climax → resolution
 */
export function detectCurrentPhase(
  chapters: NarrativeChapter[],
): NarrativePhase {
  if (chapters.length < 3) return "setup";

  const sentimentValues: Record<SentimentLevel, number> = {
    very_positive: 80,
    positive: 65,
    neutral: 50,
    negative: 35,
    very_negative: 20,
  };

  const recent = chapters.slice(-3);
  const scores = recent.map(
    (ch: NarrativeChapter) => sentimentValues[ch.sentiment] ?? 50,
  );

  const maxShift = Math.max(...scores) - Math.min(...scores);
  if (maxShift > 30) return "climax";

  const lastTwo = scores.slice(-2);
  if (Math.abs(lastTwo[1] - lastTwo[0]) < 10 && chapters.length >= 5) {
    return "resolution";
  }

  return "development";
}

/**
 * Compute story health from chapter patterns.
 * strong → healthy narrative. fragile → losing continuity. breaking → needs intervention.
 */
export function computeStoryHealth(
  chapters: NarrativeChapter[],
): StoryHealth {
  if (chapters.length < 2) return "strong";

  const recent = chapters.slice(-3);
  const negativeCount = recent.filter(
    (ch: NarrativeChapter) =>
      ch.sentiment === "negative" || ch.sentiment === "very_negative",
  ).length;

  if (negativeCount >= 2) return "breaking";

  for (let i = 1; i < recent.length; i++) {
    const gap =
      Math.abs(
        new Date(recent[i].date).getTime() -
          new Date(recent[i - 1].date).getTime(),
      ) /
      (1000 * 60 * 60 * 24);
    if (gap > 30) return "fragile";
  }

  if (negativeCount === 1) return "fragile";
  return "strong";
}

/**
 * Build the Narrative Arc from conversation memory nodes.
 * Groups nodes into chapters by time proximity and topic.
 * Each chapter is a story beat in the member-club relationship.
 */
export function buildNarrativeArc(
  memberId: string,
  nodes: ConversationMemoryNode[],
): NarrativeArc {
  if (nodes.length === 0) {
    return {
      member_id: memberId,
      arc_id: `arc-${memberId}-empty`,
      title: "Sin historial de comunicación",
      current_phase: "setup",
      chapters: [],
      open_callbacks: [],
      next_predicted_event: null,
      story_health: "strong",
    };
  }

  const sorted = [...nodes].sort(
    (a: ConversationMemoryNode, b: ConversationMemoryNode) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Group into chapters: same topic within 7 days
  const chapterGroups: ConversationMemoryNode[][] = [];
  let currentGroup: ConversationMemoryNode[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap =
      Math.abs(
        new Date(sorted[i].date).getTime() -
          new Date(currentGroup[currentGroup.length - 1].date).getTime(),
      ) /
      (1000 * 60 * 60 * 24);

    if (gap <= 7 && sorted[i].topic === currentGroup[0].topic) {
      currentGroup.push(sorted[i]);
    } else {
      chapterGroups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }
  chapterGroups.push(currentGroup);

  const chapters: NarrativeChapter[] = chapterGroups.map(
    (group: ConversationMemoryNode[], idx: number) => {
      const avgSentiment =
        group.reduce(
          (sum: number, n: ConversationMemoryNode) =>
            sum + n.sentiment_score,
          0,
        ) / group.length;

      const sentiment: SentimentLevel = toSentimentLevel(avgSentiment);

      return {
        id: `ch-${memberId}-${idx}`,
        date: group[0].date,
        phase: "development" as NarrativePhase,
        title: inferChapterTitle(group[0].topic, sentiment),
        summary: group
          .map((n: ConversationMemoryNode) => n.summary)
          .join("; "),
        sentiment,
        node_ids: group.map((n: ConversationMemoryNode) => n.id),
      };
    },
  );

  const phase = detectCurrentPhase(chapters);
  const health = computeStoryHealth(chapters);

  const openCallbacks = sorted
    .filter(
      (n: ConversationMemoryNode) => n.outcome === "pending",
    )
    .map(
      (n: ConversationMemoryNode) => n.commitment ?? n.summary,
    )
    .filter(Boolean) as string[];

  return {
    member_id: memberId,
    arc_id: `arc-${memberId}-${new Date(sorted[0].date).getFullYear()}`,
    title: `Narrativa de comunicación — ${chapters.length} capítulo${chapters.length !== 1 ? "s" : ""}`,
    current_phase: phase,
    chapters,
    open_callbacks: openCallbacks,
    next_predicted_event: null,
    story_health: health,
  };
}

// ═══════════════════════════════════════════════════════════
// §11  MESSAGE FATIGUE
// ═══════════════════════════════════════════════════════════

/**
 * Compute message fatigue — how saturated the member is.
 * Prevents the club from becoming noise.
 * Returns fatigue level 0-1, trend, and recommended cooldown.
 */
export function computeMessageFatigue(
  memberId: string,
  history: HistoryItem[],
): MessageFatigue {
  const now = Date.now();
  const ms7d = 7 * 24 * 60 * 60 * 1000;
  const ms30d = 30 * 24 * 60 * 60 * 1000;

  const messages7d = history.filter(
    (item: HistoryItem) => now - new Date(item.sent_at).getTime() < ms7d,
  ).length;

  const messages30d = history.filter(
    (item: HistoryItem) => now - new Date(item.sent_at).getTime() < ms30d,
  ).length;

  const threshold =
    COMMUNICATION_INTELLIGENCE_DEFAULTS.fatigue.max_messages_per_week;
  const currentLevel = Math.min(1.0, messages7d / threshold);
  const optOutRisk = Math.min(1.0, currentLevel * currentLevel);

  const mid30d = now - ms30d / 2;
  const firstHalf = history.filter((item: HistoryItem) => {
    const t = new Date(item.sent_at).getTime();
    return t >= now - ms30d && t < mid30d;
  }).length;
  const secondHalf = history.filter((item: HistoryItem) => {
    const t = new Date(item.sent_at).getTime();
    return t >= mid30d;
  }).length;

  const trend: MessageFatigue["trend"] =
    secondHalf > firstHalf * 1.2
      ? "increasing"
      : secondHalf < firstHalf * 0.8
        ? "decreasing"
        : "stable";

  const cooldownDays =
    currentLevel > 0.7
      ? Math.ceil(
          COMMUNICATION_INTELLIGENCE_DEFAULTS.fatigue
            .cooldown_after_opt_out_days * currentLevel,
        )
      : 0;

  return {
    member_id: memberId,
    current_level: Math.round(currentLevel * 100) / 100,
    saturation_threshold:
      COMMUNICATION_INTELLIGENCE_DEFAULTS.fatigue.saturation_threshold,
    messages_received_7d: messages7d,
    messages_received_30d: messages30d,
    opt_out_risk: Math.round(optOutRisk * 100) / 100,
    recommended_cooldown_days: cooldownDays,
    trend,
  };
}

// ═══════════════════════════════════════════════════════════
// §12  COMPOSITE RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════

/**
 * Compute composite disengagement risk from three dimensions:
 * silence (50%), fatigue (20%), emotional state (30%).
 * Returns 0-1 risk score.
 */
export function disengagementRisk(
  silenceProfile: SilenceProfile,
  fatigue: MessageFatigue,
  emotionalTrajectory: EmotionalTrajectory,
): number {
  const silenceRisk = silenceProfile.disengagement_risk;
  const fatigueRisk = fatigue.opt_out_risk;
  const emotionalRisk =
    emotionalTrajectory.current.score < 40
      ? (40 - emotionalTrajectory.current.score) / 40
      : 0;

  return Math.min(
    1.0,
    Math.round((silenceRisk * 0.5 + fatigueRisk * 0.2 + emotionalRisk * 0.3) * 100) / 100,
  );
}

// ═══════════════════════════════════════════════════════════
// §13  INTELLIGENCE BRIEFING GENERATOR
// ═══════════════════════════════════════════════════════════

/**
 * Generate the Communication Intelligence Briefing.
 * Synthesizes fingerprint, emotional trajectory, silence profile,
 * fatigue, and narrative into actionable guidance for staff
 * or automated communication systems.
 *
 * This is what the club's "digital butler" says before speaking.
 */
export function generateCommunicationBriefing(
  fingerprint: CommunicationFingerprint,
  trajectory: EmotionalTrajectory,
  silence: SilenceProfile,
  fatigue: MessageFatigue,
  narrative: NarrativeArc,
): CommunicationIntelligenceBriefing {
  const silenceLevel = deriveSilenceLevel(silence.current_silence_days);
  const fatigueLevel = deriveFatigueLevel(fatigue.current_level);
  const emotionalZone = deriveEmotionalZone(trajectory.current.score);
  const risk = disengagementRisk(silence, fatigue, trajectory);
  const urgency = deriveInterventionUrgency(
    silence.current_silence_days,
    fatigue.current_level,
    trajectory.current.score,
    risk,
  );

  const channelLabel = getChannelLabel(fingerprint.preferred_channel);
  const fingerprintSummary = `Prefiere ${channelLabel}, tono ${TONE_SPECTRUM_CONFIG[fingerprint.resonant_tone].label}, frecuencia cada ${fingerprint.optimal_frequency_days} días`;

  const trajectoryLabel =
    trajectory.trajectory === "ascending"
      ? "mejorando"
      : trajectory.trajectory === "descending"
        ? "empeorando"
        : "estable";
  const emotionalState = `${EMOTIONAL_ZONE_CONFIG[emotionalZone].label} (${trajectory.current.score}/100, ${trajectoryLabel})`;

  const silenceStatus =
    silence.current_silence_days < SILENCE_THRESHOLDS.warning
      ? `Activo (último contacto hace ${silence.current_silence_days} días)`
      : `${SILENCE_LEVEL_CONFIG[silenceLevel].label} — ${silence.current_silence_days} días sin contacto`;

  const narrativeStatus = `${STORY_HEALTH_CONFIG[narrative.story_health].label} — Fase: ${NARRATIVE_PHASE_CONFIG[narrative.current_phase].label}`;

  // Talking points
  const talkingPoints: string[] = [];
  if (trajectory.triggers.length > 0) {
    const lastTrigger = trajectory.triggers[trajectory.triggers.length - 1];
    talkingPoints.push(
      `Último trigger emocional: ${lastTrigger.description}`,
    );
  }
  if (narrative.open_callbacks.length > 0) {
    talkingPoints.push(
      `Compromiso pendiente: ${narrative.open_callbacks[0]}`,
    );
  }
  if (trajectory.forecast.intervention_window) {
    talkingPoints.push(
      "Ventana de intervención activa — actuar pronto",
    );
  }
  if (fingerprint.topic_sensitivity.length > 0) {
    const sorted = [...fingerprint.topic_sensitivity].sort(
      (a: TopicSensitivity, b: TopicSensitivity) =>
        b.engagement_score - a.engagement_score,
    );
    if (sorted[0]) {
      talkingPoints.push(
        `Tema de mayor resonancia: ${sorted[0].topic}`,
      );
    }
  }

  const avoidTopics = fingerprint.topic_sensitivity
    .filter((ts: TopicSensitivity) => ts.engagement_score < -0.3)
    .map((ts: TopicSensitivity) => ts.topic);

  const fatigueWarning =
    fatigueLevel === "saturated" || fatigueLevel === "overloaded";

  const nextWindow = fingerprint.receptive_hours[0];
  const recommendedTiming = fatigueWarning
    ? `Esperar ${fatigue.recommended_cooldown_days} días antes de contactar`
    : nextWindow
      ? `Enviar día ${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][nextWindow.day_of_week]} a las ${nextWindow.hour_start}:00`
      : "Horario laboral estándar";

  return {
    member_id: fingerprint.member_id,
    generated_at: new Date().toISOString(),
    fingerprint_summary: fingerprintSummary,
    emotional_state: emotionalState,
    silence_status: silenceStatus,
    narrative_status: narrativeStatus,
    recommended_channel: fingerprint.preferred_channel,
    recommended_tone: fingerprint.resonant_tone,
    recommended_timing: recommendedTiming,
    fatigue_warning: fatigueWarning,
    intervention_urgency: urgency,
    talking_points:
      talkingPoints.length > 0
        ? talkingPoints
        : ["Sin señales especiales — comunicación de rutina"],
    avoid_topics: avoidTopics,
  };
}
// ═══════════════════════════════════════════════════════════
// §14  TEXT TONE ANALYSIS (Campaign Intelligence)
// ═══════════════════════════════════════════════════════════

/** Tone profile derived from text analysis (not history). */
export interface TextToneProfile {
  formality: number;
  warmth: number;
  urgency: number;
  personalization: number;
  wordCount: number;
}

/** Score breakdown for A/B variant comparison. */
export interface CampaignVariantScore {
  toneMatch: number;
  personalization: number;
  lengthScore: number;
  composite: number;
}

/**
 * Analyze the tone of a text string via keyword heuristics.
 * Different from inferResonantTone() which infers from history.
 */
export function analyzeTextTone(text: string): TextToneProfile {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wc = words.length;

  const formalTerms = [
    "estimado", "estimada", "atentamente", "cordialmente",
    "solicita", "comunicamos", "informamos", "mediante",
    "adjunto", "reciba", "respetuosamente",
  ];
  const casualTerms = [
    "hola", "hey", "querido", "querida", "genial",
    "increíble", "súper", "dale", "cheers",
  ];
  const warmTerms = [
    "querido", "querida", "agradecido", "agradecida",
    "especial", "exclusivo", "cariño", "familia",
    "bienestar", "alegría", "celebrar", "disfrutar",
    "único", "privilegio",
  ];
  const coldTerms = [
    "informe", "comunicado", "notificación", "procedimiento",
    "política", "obligatorio", "requisito", "normativa",
  ];
  const urgentTerms = [
    "urgente", "inmediato", "inmediata", "no pierda",
    "último", "última", "limitado", "solo hoy", "vence", "ya",
  ];
  const personalTerms = [
    "{nombre}", "[nombre]", "tu ", "tus ", "su ", "sus ",
    "personal", "personalizado", "recordamos",
  ];

  const count = (terms: string[]): number =>
    terms.filter((t: string) => lower.includes(t)).length;

  const formality = Math.min(100, Math.max(0, 50 + count(formalTerms) * 14 - count(casualTerms) * 14));
  const warmth = Math.min(100, Math.max(0, 40 + count(warmTerms) * 12 - count(coldTerms) * 10));
  const urgency = Math.min(100, Math.max(0, 15 + count(urgentTerms) * 18));
  const personalization = Math.min(100, Math.max(0, 15 + count(personalTerms) * 20));

  return { formality, warmth, urgency, personalization, wordCount: wc };
}

/**
 * Compute tone match: how well a text profile matches an ideal.
 * Returns 0-100. Lower average difference = higher match.
 */
export function computeTextToneMatch(
  profile: TextToneProfile,
  ideal: {
    idealFormality: number;
    idealWarmth: number;
    idealUrgency: number;
    idealPersonalization: number;
  },
): number {
  const fDiff = Math.abs(profile.formality - ideal.idealFormality);
  const wDiff = Math.abs(profile.warmth - ideal.idealWarmth);
  const uDiff = Math.abs(profile.urgency - ideal.idealUrgency);
  const pDiff = Math.abs(profile.personalization - ideal.idealPersonalization);
  const avg = (fDiff + wDiff + uDiff + pDiff) / 4;
  return Math.max(0, Math.round(100 - avg * 1.5));
}

/**
 * Score a campaign variant for A/B comparison.
 * Composite = toneMatch(40%) + personalization(30%) + lengthScore(30%).
 */
export function scoreCampaignVariant(
  tone: TextToneProfile,
  segmentIdeal: {
    idealFormality: number;
    idealWarmth: number;
    idealUrgency: number;
    idealPersonalization: number;
  },
): CampaignVariantScore {
  const toneMatch = computeTextToneMatch(tone, segmentIdeal);
  const personalization = tone.personalization;
  const lengthScore =
    tone.wordCount >= 80 && tone.wordCount <= 300
      ? 90
      : tone.wordCount >= 50
        ? 70
        : tone.wordCount >= 30
          ? 55
          : 40;
  const composite = Math.round(
    toneMatch * 0.4 + personalization * 0.3 + lengthScore * 0.3,
  );
  return { toneMatch, personalization, lengthScore, composite };
}

// ═══════════════════════════════════════════════════════════
// §15  CAMPAIGN QUALITY & AUDIENCE HEALTH
// ═══════════════════════════════════════════════════════════

/** Campaign quality composite score. */
export interface CampaignQualityScore {
  score: number;
  coverage: number;
  tone: number;
  channel: number;
  compliance: number;
}

/** Audience engagement distribution health assessment. */
export interface EngagementDistributionHealth {
  score: number;
  level: "safe" | "moderate" | "elevated" | "critical";
  detail: string;
  altoPct: number;
  bajoPct: number;
}

/** Frequency risk assessment parsed from description string. */
export interface FrequencyRiskAssessment {
  risk: "low" | "normal" | "high" | "excessive";
  messagesPerWeek: number;
  detail: string;
}

/**
 * Compute campaign quality composite.
 * Dimensions: coverage(30%), tone(25%), channel(25%), compliance(20%).
 */
export function computeCampaignQualityScores(
  coverageScore: number,
  toneMatchAvg: number,
  channelFitScore: number,
  complianceCount: number,
): CampaignQualityScore {
  const compliance = complianceCount > 0
    ? Math.min(100, 60 + complianceCount * 10)
    : 50;
  const score = Math.round(
    coverageScore * 0.3 + toneMatchAvg * 0.25 + channelFitScore * 0.25 + compliance * 0.2,
  );
  return { score, coverage: coverageScore, tone: toneMatchAvg, channel: channelFitScore, compliance };
}

/**
 * Audience coverage = deliverable / total as percentage.
 */
export function computeAudienceCoverage(total: number, deliverable: number): number {
  return total > 0 ? Math.round((deliverable / total) * 100) : 0;
}

/**
 * Compute engagement distribution health.
 * Analyzes alto/bajo ratio to determine audience risk.
 */
export function computeEngagementDistributionHealth(
  byLevel: Record<string, number>,
): EngagementDistributionHealth {
  const total = Object.values(byLevel).reduce((s: number, v: number) => s + v, 0);
  const alto = byLevel.alto ?? 0;
  const bajo = byLevel.bajo ?? 0;
  const altoPct = total > 0 ? Math.round((alto / total) * 100) : 0;
  const bajoPct = total > 0 ? Math.round((bajo / total) * 100) : 0;

  if (bajoPct > 40)
    return { score: 30, level: "critical", detail: `${bajoPct}% de audiencia en bajo engagement — alto riesgo de deserción`, altoPct, bajoPct };
  if (bajoPct > 25)
    return { score: 55, level: "elevated", detail: `${bajoPct}% en bajo engagement — considerá segmentación diferenciada`, altoPct, bajoPct };
  if (altoPct > 50)
    return { score: 90, level: "safe", detail: `${altoPct}% en alto engagement — audiencia receptiva`, altoPct, bajoPct };
  return { score: 70, level: "moderate", detail: "Distribución equilibrada de engagement", altoPct, bajoPct };
}

/**
 * Parse a frequency description string into a risk assessment.
 * E.g. "diario" → excessive, "semanal" → normal, "quincenal" → low.
 */
export function parseFrequencyRiskFromDescription(freq: string): FrequencyRiskAssessment {
  const lower = freq.toLowerCase();
  if (lower.includes("diario") || lower.includes("daily") || lower.includes("cada día"))
    return { risk: "excessive", messagesPerWeek: 7, detail: "Comunicación diaria — alto riesgo de fatiga" };
  if (lower.includes("3 veces") || lower.includes("tres veces"))
    return { risk: "high", messagesPerWeek: 3, detail: "3x/semana — monitorear fatiga de la audiencia" };
  if (lower.includes("2 veces") || lower.includes("dos veces") || lower.includes("bisemanal"))
    return { risk: "normal", messagesPerWeek: 2, detail: "2x/semana — frecuencia moderada" };
  if (lower.includes("semanal") || lower.includes("weekly") || lower.includes("1 vez"))
    return { risk: "normal", messagesPerWeek: 1, detail: "Semanal — frecuencia saludable" };
  if (lower.includes("quincenal") || lower.includes("bi") || lower.includes("cada 15"))
    return { risk: "low", messagesPerWeek: 0.5, detail: "Quincenal — frecuencia conservadora" };
  if (lower.includes("mensual") || lower.includes("monthly"))
    return { risk: "low", messagesPerWeek: 0.25, detail: "Mensual — contacto mínimo" };
  return { risk: "normal", messagesPerWeek: 1, detail: `Frecuencia: ${freq}` };
}