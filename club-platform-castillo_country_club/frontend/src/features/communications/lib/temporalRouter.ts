// src/features/communications/lib/temporalRouter.ts
// ═══════════════════════════════════════════════════════════
// Temporal Communication Physics
// Castillo Country Club — Phase 31 "The Voice"
//
// The science of TIMING — when to send, how often,
// when to follow up, when to stop.
//
// The intelligence engine builds the profile.
// The temporal router USES the profile to make routing decisions.
//
// Pure functions only. No side effects.
// ═══════════════════════════════════════════════════════════

import type {
  NotificationChannel,
  CommunicationFingerprint,
  ReceptivityWindow,
  MessageFatigue,
  CommunicationPreferencesData,
  HistoryItem,
} from "../types";

import {
  getChannelLabel,
} from "../types";

import {
  DEFAULT_RECEIVITY_WINDOWS,
  MESSAGE_TYPE_CONFIG,
  selectOptimalChannel
} from "../config";

// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES — Routing-specific computation results
// ═══════════════════════════════════════════════════════════

/**
 * Full routing decision — channel, time, and whether sending is allowed.
 * Returned by routeMessage() and batchRouteMessages().
 */
export interface RoutingDecision {
  channel: NotificationChannel;
  sendDate: Date;
  allowed: boolean;
  reason: string;
  score: number;
  alternativeDate: Date | null;
}

/**
 * Temporal rhythm detected from communication history.
 * Describes the member's interaction cadence patterns.
 */
export interface TemporalRhythm {
  pattern: "weekly" | "biweekly" | "monthly" | "irregular";
  confidence: number;
  dominantDay: number | null;
  dominantHour: number | null;
  avgGapDays: number;
  gapStdDev: number;
  description: string;
}

/**
 * Impact decay model for a channel + message type combination.
 * Visualizations use this to draw decay curves.
 */
export interface ImpactDecayModel {
  halfLifeDays: number;
  fullDecayDays: number;
  channel: NotificationChannel;
  messageType: string;
}

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════

function parseTimeToMinutes(time: string): number {
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = parts[1] ? Number(parts[1]) : 0;
  return h * 60 + m;
}

function isInQuietHours(
  proposedDate: Date,
  startMinutes: number,
  endMinutes: number,
): boolean {
  const proposedMinutes = proposedDate.getHours() * 60 + proposedDate.getMinutes();

  if (startMinutes <= endMinutes) {
    return proposedMinutes >= startMinutes && proposedMinutes < endMinutes;
  }
  // Midnight-spanning range (e.g., 22:00 → 07:00)
  return proposedMinutes >= startMinutes || proposedMinutes < endMinutes;
}

function getDayName(day: number): string {
  const names = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return names[day] ?? "—";
}

/** Channel rotation for follow-up messages. */
function nextChannelInRotation(current: NotificationChannel): NotificationChannel {
  const rotation: Record<NotificationChannel, NotificationChannel> = {
    email: "whatsapp",
    whatsapp: "sms",
    sms: "push",
    push: "email",
    in_app: "whatsapp",
  };
  return rotation[current] ?? "whatsapp";
}

/** Add days to a Date, returning a new Date. */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

// ═══════════════════════════════════════════════════════════
// §1  RECEPTIVITY SCORING
// ═══════════════════════════════════════════════════════════

/**
 * Score a proposed send time against the member's receptive windows.
 * Returns a 0-1 receptivity score and the matching window (if any).
 * Falls back to defaults when fingerprint has no window data.
 */
export function scoreProposedTime(
  fingerprint: CommunicationFingerprint,
  proposedDate: Date,
): { score: number; window: ReceptivityWindow | null; reason: string } {
  const day = proposedDate.getDay();
  const hour = proposedDate.getHours();

  const windows =
    fingerprint.receptive_hours.length > 0
      ? fingerprint.receptive_hours
      : [...DEFAULT_RECEIVITY_WINDOWS];

  let bestScore = 0;
  let bestWindow: ReceptivityWindow | null = null;

  for (const w of windows) {
    if (w.day_of_week === day && hour >= w.hour_start && hour < w.hour_end) {
      if (w.receptivity_score > bestScore) {
        bestScore = w.receptivity_score;
        bestWindow = w;
      }
    }
  }

  if (bestWindow) {
    return {
      score: bestScore,
      window: bestWindow,
      reason: `Ventana receptiva detectada: ${getDayName(day)} ${hour}:00 (${Math.round(bestScore * 100)}%)`,
    };
  }

  // No matching window — score based on proximity to nearest window
  let minGap = Infinity;
  for (const w of windows) {
    const dayGap = Math.abs(w.day_of_week - day);
    const wrappedDayGap = Math.min(dayGap, 7 - dayGap);
    const hourGap = Math.abs(
      ((w.hour_start + w.hour_end) / 2) - hour,
    );
    const totalGap = wrappedDayGap * 24 + hourGap;
    if (totalGap < minGap) {
      minGap = totalGap;
    }
  }

  const proximityScore = Math.max(0.1, 0.5 - minGap * 0.01);

  return {
    score: Math.round(proximityScore * 100) / 100,
    window: null,
    reason: `Fuera de ventana receptiva — score de proximidad: ${Math.round(proximityScore * 100)}%`,
  };
}

/**
 * Predict the next receptive window from a given date.
 * Scans forward up to 14 days to find the best upcoming slot.
 */
export function predictNextReceptiveWindow(
  fingerprint: CommunicationFingerprint,
  fromDate: Date,
): { date: Date; dayOfWeek: number; hour: number; score: number } {
  const windows =
    fingerprint.receptive_hours.length > 0
      ? fingerprint.receptive_hours
      : [...DEFAULT_RECEIVITY_WINDOWS];

  let bestDate: Date | null = null;
  let bestScore = 0;
  let bestDay = 0;
  let bestHour = 9;

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const candidate = new Date(fromDate.getTime());
    candidate.setDate(candidate.getDate() + dayOffset);
    const candidateDay = candidate.getDay();

    for (const w of windows) {
      if (w.day_of_week === candidateDay && w.receptivity_score > bestScore) {
        const candidateDate = new Date(candidate.getTime());
        candidateDate.setHours(w.hour_start, 0, 0, 0);

        if (candidateDate.getTime() > fromDate.getTime()) {
          bestDate = candidateDate;
          bestScore = w.receptivity_score;
          bestDay = candidateDay;
          bestHour = w.hour_start;
        }
      }
    }

    if (bestDate && dayOffset > 0) break;
  }

  if (!bestDate) {
    const fallback = new Date(fromDate.getTime());
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(10, 0, 0, 0);
    return { date: fallback, dayOfWeek: fallback.getDay(), hour: 10, score: 0.3 };
  }

  return { date: bestDate, dayOfWeek: bestDay, hour: bestHour, score: bestScore };
}

// ═══════════════════════════════════════════════════════════
// §2  SEND OPTIMIZATION
// ═══════════════════════════════════════════════════════════

/**
 * Find the optimal send time within a date range.
 * Scans each day × hour, scores against fingerprint,
 * applies quiet hours guard, returns the best slot.
 */
export function findOptimalSendTime(
  fingerprint: CommunicationFingerprint,
  messageType: string,
  rangeStart: Date,
  rangeDays: number,
  preferences?: CommunicationPreferencesData | null,
): { optimalDate: Date; score: number; channel: NotificationChannel } {
  const config = MESSAGE_TYPE_CONFIG[messageType];
  const candidateChannels = config?.channels as NotificationChannel[] | undefined;
  const channel = selectOptimalChannel(
    config?.urgency ?? "medium",
    fingerprint.channel_scores,
    candidateChannels,
  ) as NotificationChannel;

  let bestDate = new Date(rangeStart.getTime());
  bestDate.setHours(10, 0, 0, 0);
  let bestScore = 0;

  const quietStart = preferences?.quiet_hours_start
    ? parseTimeToMinutes(preferences.quiet_hours_start)
    : null;
  const quietEnd = preferences?.quiet_hours_end
    ? parseTimeToMinutes(preferences.quiet_hours_end)
    : null;

  for (let d = 0; d < rangeDays; d++) {
    const dayDate = addDays(rangeStart, d);

    for (let h = 8; h <= 20; h++) {
      const candidate = new Date(dayDate.getTime());
      candidate.setHours(h, 0, 0, 0);

      // Quiet hours guard
      if (quietStart !== null && quietEnd !== null) {
        if (isInQuietHours(candidate, quietStart, quietEnd)) continue;
      }

      const { score } = scoreProposedTime(fingerprint, candidate);

      if (score > bestScore) {
        bestScore = score;
        bestDate = candidate;
      }
    }
  }

  return {
    optimalDate: bestDate,
    score: Math.round(bestScore * 100) / 100,
    channel,
  };
}

/**
 * Build a 7×24 temporal heatmap from the member's fingerprint.
 * Each cell contains the receptivity score for that day/hour.
 * Used by the Temporal Optimizer visualization.
 */
export function buildTemporalHeatmap(
  fingerprint: CommunicationFingerprint,
): number[][] {
  const windows =
    fingerprint.receptive_hours.length > 0
      ? fingerprint.receptive_hours
      : [...DEFAULT_RECEIVITY_WINDOWS];

  // Initialize 7×24 grid with baseline 0.3
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0.3),
  );

  for (const w of windows) {
    for (let h = w.hour_start; h < w.hour_end && h < 24; h++) {
      grid[w.day_of_week][h] = Math.max(
        grid[w.day_of_week][h],
        w.receptivity_score,
      );
    }
  }

  return grid;
}

// ═══════════════════════════════════════════════════════════
// §3  CASCADE & FOLLOW-UP
// ═══════════════════════════════════════════════════════════

/**
 * Compute the follow-up window for a message type.
 * Returns min/max/optimal days to wait before follow-up.
 * Uses MESSAGE_TYPE_CONFIG for base values.
 */
export function computeFollowUpWindow(
  messageType: string,
): { minDays: number; maxDays: number; optimalDays: number } {
  const config = MESSAGE_TYPE_CONFIG[messageType];

  if (!config) {
    return { minDays: 3, maxDays: 14, optimalDays: 7 };
  }

  const baseDecay = config.decayDays;

  if (baseDecay === 0) {
    return { minDays: 0, maxDays: 0, optimalDays: 0 };
  }

  return {
    minDays: Math.max(1, Math.round(baseDecay * 0.5)),
    maxDays: baseDecay * 2,
    optimalDays: baseDecay,
  };
}

/**
 * Compute cascade timing — should we follow up, and when?
 * Implements channel rotation: if the first message was email,
 * follow up on WhatsApp, then SMS, etc.
 *
 * Stops after maxRetries to respect fatigue.
 */
export function computeCascadeTiming(
  messageType: string,
  initialChannel: NotificationChannel,
  responseReceived: boolean,
  daysSinceInitial: number,
  retryCount = 0,
): {
  shouldFollowUp: boolean;
  followUpDate: Date | null;
  channel: NotificationChannel;
  reason: string;
} {
  if (responseReceived) {
    return {
      shouldFollowUp: false,
      followUpDate: null,
      channel: initialChannel,
      reason: "Respuesta recibida — no se requiere seguimiento",
    };
  }

  const config = MESSAGE_TYPE_CONFIG[messageType];
  const maxRetries = config?.maxRetries ?? 2;

  if (retryCount >= maxRetries) {
    return {
      shouldFollowUp: false,
      followUpDate: null,
      channel: initialChannel,
      reason: `Máximo de ${maxRetries} reintentos alcanzado — respetar silencio`,
    };
  }

  const window = computeFollowUpWindow(messageType);
  const nextChannel = nextChannelInRotation(initialChannel);

  if (daysSinceInitial < window.minDays) {
    return {
      shouldFollowUp: false,
      followUpDate: null,
      channel: nextChannel,
      reason: `Esperar ${window.minDays - daysSinceInitial} días más antes de seguimiento`,
    };
  }

  if (daysSinceInitial >= window.minDays && daysSinceInitial <= window.maxDays) {
    const followDate = new Date();
    followDate.setDate(followDate.getDate() + 1);
    followDate.setHours(10, 0, 0, 0);

    return {
      shouldFollowUp: true,
      followUpDate: followDate,
      channel: nextChannel,
      reason: `Ventana de seguimiento activa — canal rotado a ${getChannelLabel(nextChannel)}`,
    };
  }

  return {
    shouldFollowUp: false,
    followUpDate: null,
    channel: nextChannel,
    reason: `Ventana de seguimiento cerrada (${daysSinceInitial} días > máximo ${window.maxDays})`,
  };
}

// ═══════════════════════════════════════════════════════════
// §4  FREQUENCY & FATIGUE GUARDS
// ═══════════════════════════════════════════════════════════

/**
 * Guard: does the proposed message respect frequency limits?
 * Combines fingerprint optimal frequency with fatigue state.
 */
export function frequencyGuard(
  fingerprint: CommunicationFingerprint,
  fatigue: MessageFatigue,
  daysSinceLastMessage: number,
): { allowed: boolean; reason: string; recommendedWaitDays: number } {
  const optimalDays = fingerprint.optimal_frequency_days;
  const minDays = Math.max(1, Math.round(optimalDays * 0.5));

  // Fatigue overload — hard block
  if (fatigue.current_level >= fatigue.saturation_threshold) {
    return {
      allowed: false,
      reason: `Saturación de mensajes (${Math.round(fatigue.current_level * 100)}%) — cooldown recomendado: ${fatigue.recommended_cooldown_days} días`,
      recommendedWaitDays: fatigue.recommended_cooldown_days,
    };
  }

  // Below minimum frequency — soft block
  if (daysSinceLastMessage < minDays) {
    return {
      allowed: false,
      reason: `Muy pronto — mínimo ${minDays} días entre mensajes (han pasado ${daysSinceLastMessage})`,
      recommendedWaitDays: minDays - daysSinceLastMessage,
    };
  }

  // Below optimal — allowed but flagged
  if (daysSinceLastMessage < optimalDays) {
    return {
      allowed: true,
      reason: `Permitido pero antes de lo óptimo (${optimalDays} días recomendados)`,
      recommendedWaitDays: 0,
    };
  }

  return {
    allowed: true,
    reason: `Frecuencia respetada — ${daysSinceLastMessage} días desde último mensaje`,
    recommendedWaitDays: 0,
  };
}

/**
 * Guard: does the proposed time respect quiet hours?
 * Returns adjusted time if in quiet hours.
 */
export function quietHoursGuard(
  preferences: CommunicationPreferencesData | null,
  proposedDate: Date,
): { allowed: boolean; nextAllowedTime: Date | null } {
  if (!preferences?.quiet_hours_start || !preferences?.quiet_hours_end) {
    return { allowed: true, nextAllowedTime: null };
  }

  const startMinutes = parseTimeToMinutes(preferences.quiet_hours_start);
  const endMinutes = parseTimeToMinutes(preferences.quiet_hours_end);

  if (!isInQuietHours(proposedDate, startMinutes, endMinutes)) {
    return { allowed: true, nextAllowedTime: null };
  }

  // Compute next allowed time
  const nextAllowed = new Date(proposedDate.getTime());
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;

  if (endMinutes > startMinutes) {
    // Same-day quiet hours — wait until end time today
    nextAllowed.setHours(endHour, endMin, 0, 0);
  } else {
    // Midnight-spanning — end time is tomorrow morning
    nextAllowed.setDate(nextAllowed.getDate() + 1);
    nextAllowed.setHours(endHour, endMin, 0, 0);
  }

  return {
    allowed: false,
    nextAllowedTime: nextAllowed,
  };
}

// ═══════════════════════════════════════════════════════════
// §5  IMPACT MODELING
// ═══════════════════════════════════════════════════════════

/** Base half-life in days per channel. */
const CHANNEL_HALF_LIFE: Record<NotificationChannel, number> = {
  whatsapp: 3,
  sms: 2,
  email: 1.5,
  push: 0.5,
  in_app: 0.5,
};

/** Decay multiplier per message type. */
const MESSAGE_DECAY_MULTIPLIER: Record<string, number> = {
  emergency: 0,
  personal_follow_up: 2,
  milestone: 1.5,
  reactivation: 1.5,
  event_invite: 1,
  announcement: 0.8,
  promotional: 0.5,
  survey: 0.5,
};

/**
 * Compute the impact decay model for a channel + message type.
 * halfLifeDays: when 50% of impact is lost.
 * fullDecayDays: when <5% impact remains.
 * Uses ln(2) for exponential decay: fullDecay = halfLife × ln(20)/ln(2).
 */
export function computeImpactDecay(
  channel: NotificationChannel,
  messageType: string,
): ImpactDecayModel {
  const baseHalfLife = CHANNEL_HALF_LIFE[channel] ?? 1;
  const multiplier = MESSAGE_DECAY_MULTIPLIER[messageType] ?? 1;
  const halfLifeDays = Math.max(0.1, baseHalfLife * multiplier);

  // fullDecay: when e^(-λt) < 0.05 → t > ln(20)/λ = halfLife × ln(20)/ln(2)
  const fullDecayDays = Math.round(halfLifeDays * 4.32 * 10) / 10;

  return {
    halfLifeDays: Math.round(halfLifeDays * 10) / 10,
    fullDecayDays,
    channel,
    messageType,
  };
}

/**
 * Compute remaining impact at a given number of days after message.
 * Returns 0-1 fraction of impact remaining.
 */
export function computeRemainingImpact(
  channel: NotificationChannel,
  messageType: string,
  daysSinceMessage: number,
): number {
  const decay = computeImpactDecay(channel, messageType);
  if (decay.halfLifeDays <= 0) return 1.0;

  const lambda = Math.LN2 / decay.halfLifeDays;
  return Math.max(0, Math.round(Math.exp(-lambda * daysSinceMessage) * 100) / 100);
}

// ═══════════════════════════════════════════════════════════
// §6  RHYTHM DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect temporal rhythm from communication history.
 * Identifies weekly, biweekly, monthly, or irregular patterns.
 * Analyzes gap distribution, dominant day/hour, and regularity.
 */
export function detectRhythm(history: HistoryItem[]): TemporalRhythm {
  if (history.length < 3) {
    return {
      pattern: "irregular",
      confidence: 0.1,
      dominantDay: null,
      dominantHour: null,
      avgGapDays: 0,
      gapStdDev: 0,
      description: "Datos insuficientes para detectar ritmo",
    };
  }

  const sorted = [...history].sort(
    (a: HistoryItem, b: HistoryItem) =>
      new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
  );

  // Compute gaps
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap =
      (new Date(sorted[i].sent_at).getTime() -
        new Date(sorted[i - 1].sent_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (gap > 0) gaps.push(gap);
  }

  if (gaps.length === 0) {
    return {
      pattern: "irregular",
      confidence: 0.1,
      dominantDay: null,
      dominantHour: null,
      avgGapDays: 0,
      gapStdDev: 0,
      description: "Sin gaps detectables entre mensajes",
    };
  }

  const avgGap =
    gaps.reduce((sum: number, g: number) => sum + g, 0) / gaps.length;
  const variance =
    gaps.reduce(
      (sum: number, g: number) => sum + (g - avgGap) ** 2,
      0,
    ) / gaps.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation — lower = more regular
  const cv = avgGap > 0 ? stdDev / avgGap : 1;

  // Day-of-week distribution
  const dayCounts: Record<number, number> = {};
  for (const item of sorted) {
    const day = new Date(item.sent_at).getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const dominantDayEntry = Object.entries(dayCounts).sort(
    ([, a]: [string, number], [, b]: [string, number]) => b - a,
  )[0];
  const dominantDay = dominantDayEntry ? Number(dominantDayEntry[0]) : null;
  const dominantDayRatio = dominantDayEntry
    ? Number(dominantDayEntry[1]) / sorted.length
    : 0;

  // Hour distribution
  const hourCounts: Record<number, number> = {};
  for (const item of sorted) {
    const hour = new Date(item.sent_at).getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }
  const dominantHourEntry = Object.entries(hourCounts).sort(
    ([, a]: [string, number], [, b]: [string, number]) => b - a,
  )[0];
  const dominantHour = dominantHourEntry
    ? Number(dominantHourEntry[0])
    : null;

  // Pattern classification
  let pattern: TemporalRhythm["pattern"];
  let confidence: number;
  let description: string;

  if (cv < 0.3 && avgGap >= 5 && avgGap <= 9) {
    pattern = "weekly";
    confidence = Math.min(0.95, 0.6 + (1 - cv));
    description = `Patrón semanal detectado — intervalo promedio de ${Math.round(avgGap)} días`;
  } else if (cv < 0.3 && avgGap >= 12 && avgGap <= 18) {
    pattern = "biweekly";
    confidence = Math.min(0.9, 0.5 + (1 - cv));
    description = `Patrón bisemanal detectado — intervalo promedio de ${Math.round(avgGap)} días`;
  } else if (cv < 0.4 && avgGap >= 25 && avgGap <= 35) {
    pattern = "monthly";
    confidence = Math.min(0.85, 0.4 + (1 - cv));
    description = `Patrón mensual detectado — intervalo promedio de ${Math.round(avgGap)} días`;
  } else {
    pattern = "irregular";
    confidence = Math.min(0.6, cv);
    description = `Ritmo irregular — intervalo promedio de ${Math.round(avgGap)} días (variabilidad alta)`;
  }

  // Boost confidence if dominant day is strong
  if (dominantDayRatio > 0.4) {
    confidence = Math.min(0.95, confidence + 0.1);
    description += ` — concentrado en ${getDayName(dominantDay!)}`;
  }

  return {
    pattern,
    confidence: Math.round(confidence * 100) / 100,
    dominantDay,
    dominantHour,
    avgGapDays: Math.round(avgGap * 10) / 10,
    gapStdDev: Math.round(stdDev * 10) / 10,
    description,
  };
}

// ═══════════════════════════════════════════════════════════
// §7  FULL ROUTING
// ═══════════════════════════════════════════════════════════

/**
 * Full routing decision — the brain of temporal routing.
 * Combines frequency guard, fatigue guard, channel selection,
 * quiet hours guard, and time optimization into one decision.
 *
 * This is the function that says: "Send THIS message,
 * on THIS channel, at THIS time — or DON'T send at all."
 */
export function routeMessage(
  fingerprint: CommunicationFingerprint,
  messageType: string,
  urgency: "low" | "medium" | "high" | "critical",
  fatigue: MessageFatigue,
  daysSinceLastMessage: number,
  preferences?: CommunicationPreferencesData | null,
): RoutingDecision {
  const now = new Date();

  // Step 1: Frequency guard
  const freqCheck = frequencyGuard(fingerprint, fatigue, daysSinceLastMessage);

  // Critical urgency overrides frequency blocks
  if (!freqCheck.allowed && urgency !== "critical") {
    const alternative = new Date(now.getTime());
    alternative.setDate(alternative.getDate() + freqCheck.recommendedWaitDays);
    alternative.setHours(10, 0, 0, 0);

    return {
      channel: fingerprint.preferred_channel,
      sendDate: now,
      allowed: false,
      reason: freqCheck.reason,
      score: 0,
      alternativeDate: alternative,
    };
  }

  // Step 2: Channel selection
  const config = MESSAGE_TYPE_CONFIG[messageType];
  const candidateChannels = config?.channels as NotificationChannel[] | undefined;
  const channel = selectOptimalChannel(
    urgency,
    fingerprint.channel_scores,
    candidateChannels,
  ) as NotificationChannel;

  // Step 3: Time optimization
  const rangeDays = urgency === "critical" ? 1 : urgency === "high" ? 2 : 7;
  const optimal = findOptimalSendTime(
    fingerprint,
    messageType,
    now,
    rangeDays,
    preferences,
  );

  // Step 4: Quiet hours guard on the optimal time
  const quietCheck = quietHoursGuard(preferences ?? null, optimal.optimalDate);
  const finalDate = quietCheck.allowed
    ? optimal.optimalDate
    : quietCheck.nextAllowedTime ?? optimal.optimalDate;

  // Step 5: For critical urgency, send NOW regardless of optimal time
  if (urgency === "critical") {
    return {
      channel,
      sendDate: now,
      allowed: true,
      reason: `Urgencia crítica — envío inmediato por ${getChannelLabel(channel)}`,
      score: 1.0,
      alternativeDate: null,
    };
  }

  return {
    channel,
    sendDate: finalDate,
    allowed: true,
    reason: `Óptimo: ${getDayName(finalDate.getDay())} ${finalDate.getHours()}:00 por ${getChannelLabel(channel)} (score: ${optimal.score})`,
    score: optimal.score,
    alternativeDate: null,
  };
}

/**
 * Batch route messages for multiple recipients.
 * Each member gets an individual routing decision based
 * on their unique fingerprint and fatigue state.
 * Useful for campaign optimization.
 */
export function batchRouteMessages(
  params: Array<{
    memberId: string;
    fingerprint: CommunicationFingerprint;
    fatigue: MessageFatigue;
    daysSinceLastMessage: number;
    preferences?: CommunicationPreferencesData | null;
  }>,
  messageType: string,
  urgency: "low" | "medium" | "high" | "critical",
): RoutingDecision[] {
  return params.map(
    (p: {
      memberId: string;
      fingerprint: CommunicationFingerprint;
      fatigue: MessageFatigue;
      daysSinceLastMessage: number;
      preferences?: CommunicationPreferencesData | null;
    }) =>
      routeMessage(
        p.fingerprint,
        messageType,
        urgency,
        p.fatigue,
        p.daysSinceLastMessage,
        p.preferences,
      ),
  );
}
// ═══════════════════════════════════════════════════════════
// §8  SIMPLIFIED TIME SLOTS (Campaign Scheduling)
// ═══════════════════════════════════════════════════════════

/** Ranked time slot for campaign scheduling. */
export interface OptimalTimeSlot {
  time: string;
  score: number;
  label: string;
  reason: string;
}

/**
 * Compute simplified optimal time slots for campaign scheduling.
 * Returns up to 3 ranked, deduplicated slots.
 * Used when full fingerprint is unavailable — takes AI-provided
 * timing description and club best hour as inputs.
 */
export function computeOptimalTimeSlots(
  timingDescription: string,
  bestHour: string,
): OptimalTimeSlot[] {
  const baseHour = bestHour || "10:00";
  const slots: OptimalTimeSlot[] = [
    { time: baseHour, score: 92, label: "Óptimo club", reason: timingDescription || "Mejor horario promedio" },
    { time: "09:00", score: 82, label: "Apertura", reason: "Mayor tasa de apertura 9-11 AM" },
    { time: "14:00", score: 68, label: "Post-almuerzo", reason: "Segundo pico de actividad digital" },
  ];
  const seen = new Set<string>();
  return slots.filter((s: OptimalTimeSlot) => {
    if (seen.has(s.time)) return false;
    seen.add(s.time);
    return true;
  }).slice(0, 3);
}
// ═══════════════════════════════════════════════════════════
// §9  ANALYTICS-BASED TIME SCORING (Schedule Intelligence)
// ═══════════════════════════════════════════════════════════

/** Continuous time score derived from club analytics. */
export interface AnalyticsTimeScore {
  score: number;
  level: "optimal" | "good" | "acceptable" | "suboptimal";
  label: string;
  matchesDay: boolean;
  matchesHour: boolean;
  selectedDay: string;
}

/** Ranked time slot from analytics distribution. */
export interface SuggestedTimeSlot {
  day: string;
  hour: string;
  score: number;
  isOptimal: boolean;
  reason: string;
}

/**
 * Compute a continuous 0-100 time score for a proposed schedule.
 * Factors: day match, hour match, hourly distribution popularity,
 * quiet hours penalty. Different from scoreProposedTime() which
 * uses member fingerprints — this uses club-wide analytics.
 */
export function computeAnalyticsTimeScore(
  date: string,
  time: string,
  hourlyDistribution: Array<{ hour: string; count: number }>,
  bestDay: string,
  bestHour: string,
): AnalyticsTimeScore {
  if (!date || !time) {
    return {
      score: 0,
      level: "suboptimal",
      label: "Seleccioná fecha y hora",
      matchesDay: false,
      matchesHour: false,
      selectedDay: "",
    };
  }

  const d = new Date(`${date}T00:00:00`);
  const selectedDay = getDayName(d.getDay());
  const matchesDay = selectedDay === bestDay;
  const matchesHour = time === bestHour;

  let score = 30;

  // Day bonus
  if (matchesDay) score += 30;
  else if (d.getDay() >= 1 && d.getDay() <= 5) score += 10;

  // Hour popularity from distribution
  const hourData = hourlyDistribution.find((h) => h.hour === time);
  const maxCount = Math.max(...hourlyDistribution.map((h) => h.count), 1);
  score += Math.round(((hourData?.count ?? 0) / maxCount) * 25);

  // Exact best-hour match
  if (matchesHour) score += 15;

  // Quiet hours penalty (22:00–07:00)
  const hourNum = parseInt(time.split(":")[0], 10);
  if (hourNum >= 22 || hourNum < 7) score = Math.max(5, score - 25);

  score = Math.min(100, Math.max(0, score));

  const level: AnalyticsTimeScore["level"] =
    score >= 85 ? "optimal" : score >= 65 ? "good" : score >= 40 ? "acceptable" : "suboptimal";
  const label =
    score >= 85
      ? "Horario óptimo — máximo engagement"
      : score >= 65
        ? "Buen horario — engagement alto"
        : score >= 40
          ? "Horario aceptable"
          : "Horario subóptimo";

  return { score, level, label, matchesDay, matchesHour, selectedDay };
}

/**
 * Extract top 3 suggested time slots from hourly distribution.
 * Each slot is scored and ranked. Used by the Schedule Composer
 * to show actionable suggestions.
 */
export function extractSuggestedTimeSlots(
  hourlyDistribution: Array<{ hour: string; count: number }>,
  bestDay: string,
  bestHour: string,
): SuggestedTimeSlot[] {
  if (hourlyDistribution.length === 0) return [];

  const maxCount = Math.max(...hourlyDistribution.map((h) => h.count), 1);
  const sorted = [...hourlyDistribution]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return sorted.map((h) => {
    const isOptimal = h.hour === bestHour;
    const score = isOptimal ? 95 : Math.round(50 + (h.count / maxCount) * 40);
    return {
      day: bestDay,
      hour: h.hour,
      score,
      isOptimal,
      reason: isOptimal
        ? "Mejor horario según historial"
        : `${h.count} interacciones/h en este horario`,
    };
  });
}