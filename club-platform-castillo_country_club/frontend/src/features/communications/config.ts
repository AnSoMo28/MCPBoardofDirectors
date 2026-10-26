// src/features/communications/config.ts
// ═══════════════════════════════════════════════════════════
// Communication Intelligence — Configuration
// Castillo Country Club — Phase 31 "The Voice"
//
// All configuration constants, thresholds, defaults, and
// derived classification functions for the communication
// intelligence layer.
//
// Zero hardcoded values — everything from tokens or config.
// Pure functions only — no side effects.
// ═══════════════════════════════════════════════════════════

import {
  COMMUNICATION_MCP_TOOLS,
  COMMUNICATION_FRESHNESS_TIERS,
  COMMUNICATION_INTELLIGENCE_DEFAULTS,
  EMOTIONAL_BASELINE_DEFAULTS,
  SILENCE_THRESHOLDS,
  SILENCE_LEVEL_CONFIG,
  EMOTIONAL_ZONE_CONFIG,
  FATIGUE_LEVEL_CONFIG,
  NARRATIVE_PHASE_CONFIG,
  STORY_HEALTH_CONFIG,
  TONE_SPECTRUM_CONFIG,
  CHANNEL_WEIGHTS,
  DECAY_CURVE_DEFAULTS,
  getChannelLabel,
} from "./types";

import type {
  NotificationChannel,
  EmergencyChannel,
  SentimentLevel,
  SilenceLevel,
  EmotionalZone,
  FatigueLevel,
  ReceptivityWindow,
} from "./types";
import type {
  FrequencyPreference,
  CommunicationFingerprint,
} from "./types";

// ── Re-exports for consumers ───────────────────────────────

export {
  COMMUNICATION_MCP_TOOLS,
  COMMUNICATION_FRESHNESS_TIERS,
  COMMUNICATION_INTELLIGENCE_DEFAULTS,
  EMOTIONAL_BASELINE_DEFAULTS,
  SILENCE_THRESHOLDS,
  SILENCE_LEVEL_CONFIG,
  EMOTIONAL_ZONE_CONFIG,
  FATIGUE_LEVEL_CONFIG,
  NARRATIVE_PHASE_CONFIG,
  STORY_HEALTH_CONFIG,
  TONE_SPECTRUM_CONFIG,
  CHANNEL_WEIGHTS,
  DECAY_CURVE_DEFAULTS,
};

// ═══════════════════════════════════════════════════════════
// DASHBOARD MODE — Adaptive Morphism
// ═══════════════════════════════════════════════════════════

/**
 * Communication Dashboard modes — drive Adaptive Morphism.
 * The dashboard physically reorganizes based on the
 * communication health state.
 */
export const COMMUNICATION_DASHBOARD_MODES = {
  calm: {
    label: "Serenidad",
    columns: 4,
    portraitVisible: true,
    streamCollapsed: false,
    description: "Comunicación saludable — vista panorámica",
  },
  alert: {
    label: "Atención",
    columns: 3,
    portraitVisible: true,
    streamCollapsed: false,
    description: "Señales detectadas — vista densa",
  },
  critical: {
    label: "Intervención",
    columns: 1,
    portraitVisible: false,
    streamCollapsed: false,
    description: "Comunicación en riesgo — vista enfocada",
  },
} as const;

/**
 * Derive dashboard mode from composite communication state.
 * Considers silence level, fatigue level, and emotional zone.
 */
export function deriveCommDashboardMode(
  silenceLevel: SilenceLevel,
  fatigueLevel: FatigueLevel,
  emotionalZone: EmotionalZone,
): "calm" | "alert" | "critical" {
  // Critical: any dimension at crisis level
  if (
    silenceLevel === "critical" ||
    fatigueLevel === "overloaded" ||
    emotionalZone === "crisis"
  ) {
    return "critical";
  }

  // Alert: any dimension at warning/alert level
  if (
    silenceLevel === "alert" ||
    fatigueLevel === "saturated" ||
    emotionalZone === "at_risk"
  ) {
    return "alert";
  }

  // Also alert on warning silence or elevated fatigue + concerned emotion
  if (
    silenceLevel === "warning" ||
    (fatigueLevel === "elevated" && emotionalZone === "concerned")
  ) {
    return "alert";
  }

  return "calm";
}

// ═══════════════════════════════════════════════════════════
// CHANNEL EFFECTIVENESS
// ═══════════════════════════════════════════════════════════

/**
 * Derive channel effectiveness score for a specific member.
 * Combines global channel weight with member-specific channel scores.
 * Returns 0-1 effectiveness.
 */
export function deriveChannelEffectiveness(
  channel: NotificationChannel,
  memberChannelScores: Record<NotificationChannel, number>,
): number {
  const globalWeight = CHANNEL_WEIGHTS[channel] ?? 0.5;
  const memberScore = memberChannelScores[channel] ?? 0.5;
  return globalWeight * 0.4 + memberScore * 0.6;
}

/**
 * Rank channels by effectiveness for a specific member.
 * Returns sorted array of channels from best to worst.
 */
export function rankChannels(
  memberChannelScores: Record<NotificationChannel, number>,
): NotificationChannel[] {
  const channels = Object.keys(CHANNEL_WEIGHTS) as NotificationChannel[];
  return channels.sort((a, b) => {
    const effA = deriveChannelEffectiveness(a, memberChannelScores);
    const effB = deriveChannelEffectiveness(b, memberChannelScores);
    return effB - effA;
  });
}

// ═══════════════════════════════════════════════════════════
// INTERVENTION URGENCY
// ═══════════════════════════════════════════════════════════

/**
 * Derive intervention urgency from communication state.
 * Returns a 5-level urgency classification.
 */
export function deriveInterventionUrgency(
  silenceDays: number,
  fatigueScore: number,
  emotionalScore: number,
  disengagementRisk: number,
): "none" | "low" | "medium" | "high" | "critical" {
  // Critical: escape velocity or crisis emotion
  if (silenceDays >= SILENCE_THRESHOLDS.escape_velocity || emotionalScore < 20) {
    return "critical";
  }

  // High: critical silence or high disengagement
  if (
    silenceDays >= SILENCE_THRESHOLDS.critical ||
    disengagementRisk > 0.8 ||
    emotionalScore < 30
  ) {
    return "high";
  }

  // Medium: alert silence or saturated fatigue
  if (
    silenceDays >= SILENCE_THRESHOLDS.alert ||
    fatigueScore > 0.7 ||
    disengagementRisk > 0.5
  ) {
    return "medium";
  }

  // Low: warning silence
  if (silenceDays >= SILENCE_THRESHOLDS.warning || fatigueScore > 0.5) {
    return "low";
  }

  return "none";
}

// ═══════════════════════════════════════════════════════════
// TEMPORAL DEFAULTS
// ═══════════════════════════════════════════════════════════

/**
 * Default receptivity windows — the system's best guess before
 * it has enough data to learn the member's actual windows.
 * Calibrated for Costa Rica luxury club demographics.
 */
export const DEFAULT_RECEIVITY_WINDOWS: ReceptivityWindow[] = [
  { day_of_week: 1, hour_start: 9, hour_end: 11, receptivity_score: 0.72, confidence: 0.3, sample_size: 0 },
  { day_of_week: 1, hour_start: 15, hour_end: 17, receptivity_score: 0.65, confidence: 0.3, sample_size: 0 },
  { day_of_week: 2, hour_start: 10, hour_end: 12, receptivity_score: 0.68, confidence: 0.3, sample_size: 0 },
  { day_of_week: 3, hour_start: 9, hour_end: 11, receptivity_score: 0.70, confidence: 0.3, sample_size: 0 },
  { day_of_week: 3, hour_start: 14, hour_end: 16, receptivity_score: 0.65, confidence: 0.3, sample_size: 0 },
  { day_of_week: 4, hour_start: 10, hour_end: 12, receptivity_score: 0.67, confidence: 0.3, sample_size: 0 },
  { day_of_week: 5, hour_start: 9, hour_end: 12, receptivity_score: 0.75, confidence: 0.3, sample_size: 0 },
  { day_of_week: 6, hour_start: 10, hour_end: 13, receptivity_score: 0.60, confidence: 0.3, sample_size: 0 },
];

/**
 * Message type configuration — each message type has
 * different urgency, decay, and retry behavior.
 */
export const MESSAGE_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    urgency: "low" | "medium" | "high" | "critical";
    decayDays: number;
    maxRetries: number;
    channels: (NotificationChannel | EmergencyChannel)[];
  }
> = {
  announcement: {
    label: "Anuncio",
    urgency: "medium",
    decayDays: 3,
    maxRetries: 0,
    channels: ["push", "email", "in_app"],
  },
  event_invite: {
    label: "Invitación a Evento",
    urgency: "medium",
    decayDays: 7,
    maxRetries: 1,
    channels: ["whatsapp", "push", "email"],
  },
  personal_follow_up: {
    label: "Seguimiento Personal",
    urgency: "high",
    decayDays: 14,
    maxRetries: 2,
    channels: ["whatsapp", "sms"],
  },
  promotional: {
    label: "Promoción",
    urgency: "low",
    decayDays: 2,
    maxRetries: 0,
    channels: ["email", "push"],
  },
  emergency: {
    label: "Emergencia",
    urgency: "critical",
    decayDays: 0,
    maxRetries: 3,
    channels: ["sms", "push", "pa_system", "app_banner"],
  },
  reactivation: {
    label: "Reactivación",
    urgency: "high",
    decayDays: 14,
    maxRetries: 2,
    channels: ["whatsapp", "sms", "email"],
  },
  survey: {
    label: "Encuesta",
    urgency: "low",
    decayDays: 5,
    maxRetries: 1,
    channels: ["email", "push", "in_app"],
  },
  milestone: {
    label: "Hito / Celebración",
    urgency: "medium",
    decayDays: 7,
    maxRetries: 0,
    channels: ["whatsapp", "push", "in_app"],
  },
};

// ═══════════════════════════════════════════════════════════
// COMMUNICATION PULSE — Ambient Config
// ═══════════════════════════════════════════════════════════

/**
 * Ambient pulse configuration for the Communication Dashboard.
 * Drives the breathing background animation based on state.
 */
export const COMMUNICATION_AMBIENT_CONFIG = {
  calm: {
    pulseSpeed: 8,
    intensity: 0.15,
    color: "var(--color-teal-400)",
    gradient: "radial-gradient(ellipse at 30% 40%, color-mix(in srgb, var(--color-teal-400) 8%, transparent), transparent 60%)",
  },
  alert: {
    pulseSpeed: 5,
    intensity: 0.25,
    color: "var(--color-amber-400)",
    gradient: "radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--color-amber-400) 12%, transparent), transparent 55%)",
  },
  critical: {
    pulseSpeed: 2.5,
    intensity: 0.4,
    color: "var(--color-rose-400)",
    gradient: "radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--color-rose-400) 18%, transparent), transparent 50%)",
  },
} as const;

// ═══════════════════════════════════════════════════════════
// COMMUNICATION STREAM — Priority Weights
// ═══════════════════════════════════════════════════════════

/**
 * Priority weights for the Communication Intelligence Stream.
 * Determines which signals surface first in the dashboard.
 */
export const COMMUNICATION_STREAM_PRIORITIES = {
  silence_critical: { weight: 100, category: "silence" },
  disengagement_risk: { weight: 95, category: "risk" },
  emotional_crisis: { weight: 90, category: "emotion" },
  fatigue_overload: { weight: 85, category: "fatigue" },
  narrative_breaking: { weight: 80, category: "narrative" },
  silence_alert: { weight: 75, category: "silence" },
  emotional_decline: { weight: 70, category: "emotion" },
  resonance_event: { weight: 65, category: "positive" },
  fatigue_elevated: { weight: 60, category: "fatigue" },
  channel_optimization: { weight: 50, category: "optimization" },
  milestone_detected: { weight: 45, category: "positive" },
  narrative_development: { weight: 40, category: "narrative" },
  tone_adjustment: { weight: 30, category: "optimization" },
  general_insight: { weight: 20, category: "insight" },
} as const;

// ═══════════════════════════════════════════════════════════
// HELPER: Score to Sentiment Level
// ═══════════════════════════════════════════════════════════

/**
 * Derive SentimentLevel from a numeric score (0-100).
 * Maps continuous score to discrete sentiment categories.
 */
export function scoreToSentimentLevel(score: number): SentimentLevel {
  if (score >= 80) return "very_positive";
  if (score >= 60) return "positive";
  if (score >= 40) return "neutral";
  if (score >= 20) return "negative";
  return "very_negative";
}

// ═══════════════════════════════════════════════════════════
// HELPER: Decay Interpolation
// ═══════════════════════════════════════════════════════════

/**
 * Interpolate engagement retention from the decay curve.
 * Given N days of silence, returns the expected retention (0-1).
 * Linear interpolation between curve points.
 */
export function interpolateDecayCurve(daysSilent: number): number {
  const curve = DECAY_CURVE_DEFAULTS;

  // Before first point
  if (daysSilent <= curve[0].days_silent) return curve[0].engagement_retention;

  // After last point
  if (daysSilent >= curve[curve.length - 1].days_silent) {
    return curve[curve.length - 1].engagement_retention;
  }

  // Interpolate between two points
  for (let i = 0; i < curve.length - 1; i++) {
    const current = curve[i];
    const next = curve[i + 1];
    if (daysSilent >= current.days_silent && daysSilent <= next.days_silent) {
      const t =
        (daysSilent - current.days_silent) /
        (next.days_silent - current.days_silent);
      return (
        current.engagement_retention +
        t * (next.engagement_retention - current.engagement_retention)
      );
    }
  }

  return 0;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Receptivity Heatmap
// ═══════════════════════════════════════════════════════════

/**
 * Build a 7x24 receptivity heatmap from windows.
 * Returns a 7-day × 24-hour grid of receptivity scores.
 * Used by the Temporal Optimizer visualization.
 */
export function buildReceptivityHeatmap(
  windows: ReceptivityWindow[],
): number[][] {
  // Initialize 7x24 grid with neutral 0.3
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0.3),
  );

  // Apply windows
  for (const w of windows) {
    for (let h = w.hour_start; h < w.hour_end && h < 24; h++) {
      grid[w.day_of_week][h] = Math.max(grid[w.day_of_week][h], w.receptivity_score);
    }
  }

  return grid;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Optimal Channel Selection
// ═══════════════════════════════════════════════════════════

/**
 * Select the optimal channel for a message based on urgency
 * and member fingerprint channel scores.
 * Emergency messages override to SMS + push regardless.
 */
export function selectOptimalChannel(
  urgency: "low" | "medium" | "high" | "critical",
  memberChannelScores: Record<NotificationChannel, number>,
  availableChannels?: (NotificationChannel | EmergencyChannel)[],
): NotificationChannel | EmergencyChannel {
  // Emergency always uses SMS first
  if (urgency === "critical") {
    return "sms";
  }

  const channels = availableChannels ?? (Object.keys(CHANNEL_WEIGHTS) as NotificationChannel[]);

  let bestChannel: NotificationChannel | EmergencyChannel = "email";
  let bestScore = -1;

  for (const ch of channels) {
    if (ch in CHANNEL_WEIGHTS) {
      const effectiveness = deriveChannelEffectiveness(
        ch as NotificationChannel,
        memberChannelScores,
      );
      if (effectiveness > bestScore) {
        bestScore = effectiveness;
        bestChannel = ch;
      }
    }
  }

  return bestChannel;
}
// ═══════════════════════════════════════════════════════════
// CAMPAIGN GENERATOR — Segment, Channel & Thread Config
// ═══════════════════════════════════════════════════════════

export const CAMPAIGN_SEGMENT_OPTIONS = [
  { id: "Deportivos", count: 38, token: "deportivos" },
  { id: "Sociales", count: 31, token: "sociales" },
  { id: "Ejecutivos", count: 24, token: "ejecutivos" },
  { id: "Familiares", count: 32, token: "familiares" },
  { id: "Invisibles", count: 17, token: "invisibles" },
] as const;

export const CAMPAIGN_SEGMENT_TONE_PROFILES: Record<
  string,
  {
    idealFormality: number;
    idealWarmth: number;
    idealUrgency: number;
    idealPersonalization: number;
  }
> = {
  Deportivos: { idealFormality: 35, idealWarmth: 70, idealUrgency: 40, idealPersonalization: 60 },
  Sociales: { idealFormality: 55, idealWarmth: 85, idealUrgency: 30, idealPersonalization: 70 },
  Ejecutivos: { idealFormality: 80, idealWarmth: 45, idealUrgency: 50, idealPersonalization: 50 },
  Familiares: { idealFormality: 40, idealWarmth: 90, idealUrgency: 25, idealPersonalization: 80 },
  Invisibles: { idealFormality: 50, idealWarmth: 75, idealUrgency: 60, idealPersonalization: 75 },
};

export const CAMPAIGN_OBJECTIVE_SUGGESTIONS: string[] = [
  "Incrementar participación en actividades deportivas",
  "Promover renovación temprana de membresía",
  "Invitar a evento social exclusivo",
  "Reactivar socios inactivos",
  "Lanzar nuevo servicio o amenity",
];

export const CAMPAIGN_CHANNEL_OPTIONS = [
  { id: "email", label: "Email", token: "email" },
  { id: "whatsapp", label: "WhatsApp", token: "whatsapp" },
  { id: "sms", label: "SMS", token: "sms" },
] as const;

export const NARRATIVE_THREAD_KEYWORDS: Record<
  string,
  { label: string; token: string; framing: string }
> = {
  renovación: {
    label: "Renovación",
    token: "renewal",
    framing: "Narrativa de valor continuado — enfatizar beneficios exclusivos y reconocimiento de lealtad",
  },
  evento: {
    label: "Evento",
    token: "event",
    framing: "Narrativa de exclusividad — crear sensación de pertenencia y experiencia única",
  },
  reactivación: {
    label: "Reactivación",
    token: "reactivation",
    framing: "Narrativa de reconexión — tono cálido, personal, sin presión",
  },
  deportiv: {
    label: "Deportes",
    token: "sports",
    framing: "Narrativa de bienestar — enfocar en salud, comunidad y logros",
  },
  cumpleaños: {
    label: "Celebración",
    token: "celebration",
    framing: "Narrativa de reconocimiento — tono personal y festivo",
  },
  bienvenida: {
    label: "Bienvenida",
    token: "welcome",
    framing: "Narrativa de integración — cálido, informativo, orientador",
  },
};
// ═══════════════════════════════════════════════════════════
// SCHEDULE COMPOSER — Template, Channel & Timing Config
// ═══════════════════════════════════════════════════════════

export const SCHEDULE_TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  welcome: "Bienvenida",
  event_reminder: "Recordatorio evento",
  payment_reminder: "Recordatorio pago",
  birthday: "Cumpleaños",
  anniversary: "Aniversario",
  seasonal_greeting: "Saludo temporada",
  maintenance_notice: "Aviso mantenimiento",
  promotion: "Promoción",
};

export const SCHEDULE_CHANNEL_OPTIONS = [
  { id: "email", label: "Email", token: "email" },
  { id: "push", label: "Push", token: "push" },
  { id: "sms", label: "SMS", token: "sms" },
  { id: "whatsapp", label: "WhatsApp", token: "whatsapp" },
  { id: "in_app", label: "In-App", token: "in_app" },
] as const;

export const SPANISH_DAY_NAMES = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
] as const;

export const TEMPLATE_CATEGORY_TO_MESSAGE_TYPE: Record<string, string> = {
  welcome: "announcement",
  event_reminder: "event_invite",
  payment_reminder: "personal_follow_up",
  birthday: "milestone",
  anniversary: "milestone",
  seasonal_greeting: "announcement",
  maintenance_notice: "announcement",
  promotion: "promotional",
};

export const CLUB_QUIET_HOURS = { start: 22, end: 7 } as const;

// ═══════════════════════════════════════════════════════════
// PREFERENCES CONFIG — Extracted from CommunicationPreferences V1
// Add these exports to the EXISTING config.ts
// ═══════════════════════════════════════════════════════════

// ── Preferences Form Type ──────────────────────────────────

export interface PreferencesForm {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  announcements: FrequencyPreference;
  events: FrequencyPreference;
  promotions: FrequencyPreference;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface SessionChange {
  timestamp: number;
  field: string;
  from: string;
  to: string;
}

// ── Channel Toggle Config ──────────────────────────────────

export type ChannelKey = keyof Pick<
  PreferencesForm,
  "email_enabled" | "push_enabled" | "sms_enabled" | "whatsapp_enabled" | "in_app_enabled"
>;

export type FrequencyKey = keyof Pick<
  PreferencesForm,
  "announcements" | "events" | "promotions"
>;

export const PREFS_CHANNEL_TOGGLE_CONFIG: Array<{
  key: ChannelKey;
  label: string;
  token: string;
}> = [
  { key: "email_enabled", label: "Email", token: "email" },
  { key: "push_enabled", label: "Push", token: "push" },
  { key: "sms_enabled", label: "SMS", token: "sms" },
  { key: "whatsapp_enabled", label: "WhatsApp", token: "whatsapp" },
  { key: "in_app_enabled", label: "In-App", token: "in_app" },
];

// ── Frequency Config ───────────────────────────────────────

export const PREFS_FREQUENCY_FIELDS: Array<{
  key: FrequencyKey;
  label: string;
  description: string;
}> = [
  { key: "announcements", label: "Anuncios del club", description: "Comunicados generales, cambios de política" },
  { key: "events", label: "Eventos", description: "Invitaciones, recordatorios de eventos" },
  { key: "promotions", label: "Promociones", description: "Ofertas, beneficios, descuentos" },
];

/**
 * Volume per frequency — maps FrequencyPreference to estimated msgs/month.
 * CLEANED: only valid FrequencyPreference values (V1 had dead keys
 * "monthly_digest" and "never" that don't exist in the type).
 */
export const PREFS_FREQUENCY_VOLUME: Record<FrequencyPreference, number> = {
  realtime: 90,
  daily_digest: 30,
  weekly_digest: 4,
  none: 0,
};

export const PREFS_FREQUENCY_TOKENS: Record<FrequencyPreference, string> = {
  realtime: "high",
  daily_digest: "medium",
  weekly_digest: "low",
  none: "none",
};

export const PREFS_FREQUENCY_RECOMMENDATIONS: Record<FrequencyKey, FrequencyPreference> = {
  announcements: "weekly_digest",
  events: "realtime",
  promotions: "weekly_digest",
};

export const PREFS_FREQUENCY_REC_REASONS: Record<FrequencyKey, string> = {
  announcements: "Semanal — suficiente sin saturar",
  events: "Tiempo real — eventos requieren acción inmediata",
  promotions: "Semanal — mejora tasa de lectura",
};

export const PREFS_FIELD_LABELS: Record<string, string> = {
  email_enabled: "Email",
  push_enabled: "Push",
  sms_enabled: "SMS",
  whatsapp_enabled: "WhatsApp",
  in_app_enabled: "In-App",
  announcements: "Anuncios",
  events: "Eventos",
  promotions: "Promociones",
  quiet_hours_start: "Inicio silencio",
  quiet_hours_end: "Fin silencio",
};

export const PREFS_DEFAULT_FORM: PreferencesForm = {
  email_enabled: true,
  push_enabled: true,
  sms_enabled: false,
  whatsapp_enabled: true,
  in_app_enabled: true,
  announcements: "realtime",
  events: "realtime",
  promotions: "weekly_digest",
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
};

// ── Preference Quality Scoring ─────────────────────────────

/**
 * Compute quality score (0-100) for a preference configuration.
 * Dimensions: channel diversity(25), frequency balance(25),
 * quiet hours quality(25), customization(25).
 *
 * Optionally enriched with fingerprint confidence when available.
 */
export function computePreferenceQuality(
  form: PreferencesForm,
  fingerprint?: CommunicationFingerprint | null,
): number {
  let score = 0;

  // Channel diversity (0-25)
  const activeCount = PREFS_CHANNEL_TOGGLE_CONFIG.filter(
    (ch) => form[ch.key],
  ).length;
  if (activeCount >= 3) score += 25;
  else if (activeCount === 2) score += 18;
  else if (activeCount === 1) score += 10;

  // Frequency balance (0-25)
  const freqValues = PREFS_FREQUENCY_FIELDS.map((f) => form[f.key]);
  const noneCount = freqValues.filter((v) => v === "none").length;
  const realtimeCount = freqValues.filter((v) => v === "realtime").length;
  if (noneCount === freqValues.length) score += 0;
  else if (realtimeCount === freqValues.length) score += 12;
  else if (noneCount === 0) score += 25;
  else score += 15;

  // Quiet hours quality (0-25)
  const qs = timeToMinutes(form.quiet_hours_start);
  const qe = timeToMinutes(form.quiet_hours_end);
  if (qs !== 0 || qe !== 0) {
    const duration = qs < qe ? qe - qs : 1440 - qs + qe;
    if (duration >= 360 && duration <= 600) score += 25;
    else if (duration >= 240) score += 18;
    else score += 8;
  }

  // Customization (0-25)
  const isDefaultish =
    form.email_enabled &&
    form.push_enabled &&
    !form.sms_enabled &&
    form.whatsapp_enabled &&
    form.in_app_enabled;
  score += isDefaultish ? 8 : 25;

  // Enrichment: fingerprint confidence bonus
  if (fingerprint && fingerprint.confidence > 0.5) {
    score = Math.min(100, score + Math.round(fingerprint.confidence * 5));
  }

  return Math.min(score, 100);
}

// ── Quiet Hours Conflict Detector ──────────────────────────

export function computeQuietHoursConflict(
  quietStart: string,
  quietEnd: string,
  bestHour: string,
): { hasConflict: boolean; bestHour: string } | null {
  if (!bestHour) return null;

  const qs = timeToMinutes(quietStart);
  const qe = timeToMinutes(quietEnd);
  if (qs === 0 && qe === 0) return null;

  const bestMinutes = timeToMinutes(bestHour);

  let inQuiet = false;
  if (qs < qe) {
    inQuiet = bestMinutes >= qs && bestMinutes < qe;
  } else {
    inQuiet = bestMinutes >= qs || bestMinutes < qe;
  }

  return inQuiet ? { hasConflict: true, bestHour } : null;
}

// ── Frequency Volume Level ─────────────────────────────────

export function getFrequencyVolumeLevel(form: PreferencesForm): string {
  const totalVolume = PREFS_FREQUENCY_FIELDS.reduce(
    (s, f) => s + (PREFS_FREQUENCY_VOLUME[form[f.key]] ?? 0),
    0,
  );
  if (totalVolume > 200) return "Saturación";
  if (totalVolume > 100) return "Alto";
  if (totalVolume > 30) return "Moderado";
  if (totalVolume > 0) return "Bajo";
  return "Nulo";
}

// ── Utility ────────────────────────────────────────────────

export function timeToMinutes(time: string): number {
  const parts = time.split(":").map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

// ═══════════════════════════════════════════════════════════
// PERSONALIZED COMPOSER — Family, Channel, Occasion Config
// Extracted from PersonalizedCommunication.tsx V1
// ═══════════════════════════════════════════════════════════


// ── Composer Interfaces ────────────────────────────────────

export interface ComposerFamilyOption {
  id: string;
  name: string;
  tier: string;
}

export interface ComposerChannelOption {
  id: string;
  label: string;
  token: string;
}

export interface ComposerOccasionIdeal {
  idealFormality: number;
  idealWarmth: number;
  idealUrgency: number;
  idealPersonalization: number;
}

export interface ComposerRiskContext {
  label: string;
  token: string;
  detail: string;
  action: string;
}

export interface ComposerFatigueContext {
  label: string;
  token: string;
  detail: string;
}

export interface ComposerSendTimeSlot {
  time: string;
  score: number;
  label: string;
  reason: string;
}

// ── Family Options ─────────────────────────────────────────

export const COMPOSER_FAMILY_OPTIONS: ComposerFamilyOption[] = [
  { id: "FAM-007", name: "Montero Quirós", tier: "Platinum" },
  { id: "FAM-003", name: "Quesada Vargas", tier: "Gold" },
  { id: "FAM-011", name: "Vargas Rojas", tier: "Gold" },
  { id: "FAM-025", name: "Zamora Villalobos", tier: "Gold" },
  { id: "FAM-019", name: "Obando Salazar", tier: "Silver" },
  { id: "FAM-031", name: "Brenes Gutiérrez", tier: "Silver" },
];

// ── Channel Options ────────────────────────────────────────

export const COMPOSER_CHANNEL_OPTIONS: ComposerChannelOption[] = [
  { id: "email", label: "Email", token: "email" },
  { id: "whatsapp", label: "WhatsApp", token: "whatsapp" },
  { id: "sms", label: "SMS", token: "sms" },
];

// ── Occasion Suggestions ───────────────────────────────────

export const COMPOSER_OCCASION_SUGGESTIONS: string[] = [
  "Reconocimiento de antigüedad",
  "Felicitación de cumpleaños",
  "Invitación a evento exclusivo",
  "Renovación de membresía",
  "Bienvenida después de ausencia",
  "Seguimiento post-evento",
];

// ── Occasion Tone Ideal (V2: +idealPersonalization for §14/§15 engines) ──

export const COMPOSER_OCCASION_TONE_MAP: Record<string, ComposerOccasionIdeal> = {
  "Reconocimiento de antigüedad": {
    idealFormality: 80, idealWarmth: 75, idealUrgency: 30, idealPersonalization: 85,
  },
  "Felicitación de cumpleaños": {
    idealFormality: 40, idealWarmth: 90, idealUrgency: 20, idealPersonalization: 90,
  },
  "Invitación a evento exclusivo": {
    idealFormality: 70, idealWarmth: 60, idealUrgency: 60, idealPersonalization: 70,
  },
  "Renovación de membresía": {
    idealFormality: 85, idealWarmth: 50, idealUrgency: 70, idealPersonalization: 60,
  },
  "Bienvenida después de ausencia": {
    idealFormality: 50, idealWarmth: 85, idealUrgency: 40, idealPersonalization: 80,
  },
  "Seguimiento post-evento": {
    idealFormality: 60, idealWarmth: 70, idealUrgency: 50, idealPersonalization: 75,
  },
};

// ── Tier Context ───────────────────────────────────────────

export const COMPOSER_TIER_CONTEXT: Record<
  string,
  { label: string; token: string; expectation: string }
> = {
  Platinum: {
    label: "Platino",
    token: "platinum",
    expectation: "Tono altamente personalizado, referencias exclusivas, trato preferencial",
  },
  Gold: {
    label: "Oro",
    token: "gold",
    expectation: "Tono cálido-profesional, reconocimiento de lealtad",
  },
  Silver: {
    label: "Plata",
    token: "silver",
    expectation: "Tono cercano, invitaciones a subir de categoría",
  },
};

// ── Occasion Ideal Lookup ──────────────────────────────────

/**
 * Find the best matching tone ideal for an occasion string.
 * Falls back to balanced defaults when no match.
 */
export function getOccasionToneIdeal(occasion: string): ComposerOccasionIdeal {
  const lower = occasion.toLowerCase();
  const matchedKey = Object.keys(COMPOSER_OCCASION_TONE_MAP).find(
    (key) => lower.includes(key.toLowerCase().split(" ")[0]),
  );
  if (matchedKey) return COMPOSER_OCCASION_TONE_MAP[matchedKey];

  // Default: balanced
  return {
    idealFormality: 60,
    idealWarmth: 65,
    idealUrgency: 40,
    idealPersonalization: 70,
  };
}

// ── Risk Context ───────────────────────────────────────────

export function getComposerRiskContext(
  risk: "safe" | "drifting" | "approaching" | "critical",
): ComposerRiskContext {
  switch (risk) {
    case "critical":
      return {
        label: "Crítico",
        token: "critical",
        detail: "Contacto perdido hace mucho — alto riesgo de deserción",
        action: "Contactá personalmente antes de enviar comunicación masiva",
      };
    case "approaching":
      return {
        label: "Acercándose",
        token: "approaching",
        detail: "Silencio prolongado — necesita atención",
        action: "Usá un tono cálido y personal, referenciá interacciones pasadas",
      };
    case "drifting":
      return {
        label: "A la deriva",
        token: "drifting",
        detail: "Engagement bajo — necesita reactivación",
        action: "Ofrecé valor tangible: evento exclusivo, beneficio especial",
      };
    case "safe":
    default:
      return {
        label: "Estable",
        token: "safe",
        detail: "Engagement saludable",
        action: "Mantené el ritmo actual de comunicación",
      };
  }
}

// ── Fatigue Context ────────────────────────────────────────

export function getComposerFatigueContext(
  level: "fresh" | "normal" | "elevated" | "saturated",
): ComposerFatigueContext {
  switch (level) {
    case "saturated":
      return {
        label: "Saturado",
        token: "saturated",
        detail: "6+ comunicaciones en 14 días — alto riesgo de fatiga",
      };
    case "elevated":
      return {
        label: "Elevado",
        token: "elevated",
        detail: "4-5 comunicaciones en 14 días — monitorear",
      };
    case "normal":
      return { label: "Normal", token: "normal", detail: "Frecuencia saludable" };
    case "fresh":
    default:
      return { label: "Sin contacto", token: "fresh", detail: "Sin comunicaciones recientes" };
  }
}

// ── Send Time Slots ────────────────────────────────────────

export function computeComposerSendTimeSlots(
  suggestedTime: string,
  bestHour: string,
): ComposerSendTimeSlot[] {
  const slots: ComposerSendTimeSlot[] = [
    { time: suggestedTime, score: 92, label: "Sugerido AI", reason: "Basado en perfil del socio" },
    { time: bestHour || "10:00", score: 85, label: "Óptimo club", reason: "Mejor horario promedio del club" },
    { time: "09:00", score: 72, label: "Mañana", reason: "Alta tasa de apertura matutina" },
  ];

  const seen = new Set<string>();
  return slots.filter((s) => {
    if (seen.has(s.time)) return false;
    seen.add(s.time);
    return true;
  }).slice(0, 3);
}

// ── Channel label helper (safe string → NotificationChannel cast) ──

export function channelToLabel(channel: string): string {
  return getChannelLabel(channel as NotificationChannel);
}