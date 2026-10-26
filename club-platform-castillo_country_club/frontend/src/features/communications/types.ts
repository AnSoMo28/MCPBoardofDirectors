// src/features/communications/types.ts
// ═══════════════════════════════════════════════════════════
// Communication Intelligence — Source of Truth
// Castillo Country Club — Phase 31 "The Voice"
//
// All types, interfaces, config maps, helpers for communications.
// Backend-aligned 1:1 with Pydantic models.
//
// §1-§14  : Existing (Phase 28 — UNCHANGED)
// §15-§17 : NEW (Phase 31 — Communication Intelligence Layer)
//
// Rules: #1 tokens (0 hardcoded), #8 formatters
// ═══════════════════════════════════════════════════════════

import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";

// ─── Section 1: Enums & Shared Primitives ──────────────────

export type NotificationChannel =
  | "email" | "push" | "sms" | "whatsapp" | "in_app";

export type AudienceTarget =
  | "all" | "socios" | "staff" | "junta"
  | "young_adult" | "adult" | "senior" | "children_parents";

export type EmergencyChannel =
  | "push" | "sms" | "email" | "pa_system" | "app_banner";

export type FrequencyPreference =
  | "realtime" | "daily_digest" | "weekly_digest" | "none";

export type InsightCategory =
  | "timing" | "channel" | "audience"
  | "content" | "frequency" | "risk"
  | "opportunity"
  | "health";

export type InsightPriority = "high" | "medium" | "low";

export type CampaignStatus =
  | "draft" | "active" | "paused" | "completed" | "cancelled";

export type SentimentLevel =
  | "very_positive" | "positive" | "neutral"
  | "negative" | "very_negative";

// ── Phase 31 — New Primitive Types ─────────────────────────

/** Silence classification derived from days since last interaction. */
export type SilenceLevel = "normal" | "warning" | "alert" | "critical";

/** Emotional zone derived from composite emotional score (0-100). */
export type EmotionalZone =
  | "thriving" | "stable" | "concerned" | "at_risk" | "crisis";

/** Message fatigue classification (0-1 score). */
export type FatigueLevel =
  | "fresh" | "normal" | "elevated" | "saturated" | "overloaded";

/** Narrative arc phase — each communication is a chapter in a story. */
export type NarrativePhase = "setup" | "development" | "climax" | "resolution";

/** Story health — how coherent the communication narrative remains. */
export type StoryHealth = "strong" | "fragile" | "breaking";

/** Preferred message length inferred from response patterns. */
export type MessageLength = "brief" | "moderate" | "detailed";

/** Resonant tone — the communication style that generates best engagement. */
export type ResonantTone = "formal" | "warm" | "direct" | "narrative";

/** Source of emotional data point. */
export type EmotionalSource =
  | "interaction" | "survey" | "activity" | "inferred";

/** Direction of a conversation message. */
export type MessageDirection = "inbound" | "outbound";

/** Outcome of a conversation node. */
export type ConversationOutcome =
  | "resolved" | "pending" | "escalated" | "ignored";

// ─── Section 2: Announcement ───────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  body: string;
  body_html?: string;
  category: string;
  category_label: string;
  audience: AudienceTarget[];
  audience_label: string;
  status: "draft" | "scheduled" | "published" | "archived";
  priority: "normal" | "important" | "urgent";
  author_id: string;
  author_name: string;
  published_at: string | null;
  scheduled_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  views_count: number;
  attachments?: AnnouncementAttachment[];
  template_id?: string;
}

export interface AnnouncementAttachment {
  id: string;
  filename: string;
  url: string;
  size_bytes: number;
  mime_type: string;
}

export interface AnnouncementListResponse {
  announcements: Announcement[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnnouncementForm {
  title: string;
  body: string;
  category: string;
  audience: AudienceTarget[];
  priority: "normal" | "important" | "urgent";
  scheduled_at?: string;
  expires_at?: string;
  template_id?: string;
}

// ─── Section 3: Template (backend-aligned) ─────────────────

export interface CommunicationTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body_template: string;
  channels: string[];
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface TemplateListResponse {
  templates: CommunicationTemplate[];
}

// ─── Section 4: Emergency Broadcast ───────────────────────

export interface EmergencyBroadcastForm {
  title: string;
  message: string;
  severity: "critical" | "high" | "medium";
  channels: EmergencyChannel[];
  target_audience: AudienceTarget[];
  requires_acknowledgment: boolean;
  expires_in_minutes: number;
  author_id?: string;
}

export interface EmergencyBroadcastResponse {
  broadcast_id: string;
  status: "pending_human_approval" | "approved" | "sent" | "cancelled";
  message: string;
  approval_required: boolean;
  estimated_recipients: number;
}

// ─── Section 5: Legacy AI Insight (Phase 11) ──────────────

/**
 * @deprecated F47 — Renamed to LegacyCommunicationInsight to avoid collision
 * with the new CommunicationInsight (Engine v2 type).
 * Will be removed in F48.
 */
export interface LegacyCommunicationInsight {
  id: string;
  type: "engagement_low" | "best_time" | "audience_suggestion" | "tone_warning";
  title: string;
  description: string;
  confidence: number;
  action?: string;
}

// ─── Section 6: History & Scheduled (shared) ──────────────

export interface HistoryItem {
  id: string;
  notification_type: string;
  title: string;
  channel: string;
  recipient_count: number;
  status: string;
  sent_at: string;
  created_by: string;
  notes?: string;
}

export interface HistoryResponse {
  history: HistoryItem[];
  total: number;
}

export interface ScheduledItem {
  id: string;
  template_id: string;
  recipient_ids: string[];
  channel: string;
  scheduled_at: string;
  status: string;
  params: Record<string, string>;
  sent_at?: string;
  notes?: string;
}

export interface ScheduledListResponse {
  scheduled: ScheduledItem[];
}

export interface HITLResponse {
  status: string;
  request_id?: string;
  message: string;
  details?: Record<string, unknown>;
}

// ─── Section 7: Analytics ─────────────────────────────────

export interface ChannelBreakdown {
  channel: string;
  count: number;
  percentage: number;
}

export interface TypeBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export interface StatusBreakdown {
  sent: number;
  delivered: number;
  failed: number;
  cancelled: number;
}

export interface CommunicationAnalyticsData {
  period: string;
  total_sent: number;
  total_recipients: number;
  delivery_rate_pct: number;
  avg_recipients_per_send: number;
  best_day_to_send: string;
  best_hour_to_send: string;
  channel_breakdown: ChannelBreakdown[];
  type_breakdown: TypeBreakdown[];
  status_breakdown: StatusBreakdown;
  daily_volume: { date: string; count: number }[];
  hourly_distribution: { hour: string; count: number }[];
}

export interface CommunicationAnalyticsResponse {
  status: string;
  message: string;
  analytics: CommunicationAnalyticsData;
}

// ─── Section 8: Preferences ───────────────────────────────

export interface CommunicationPreferencesData {
  id: string;
  member_id: string;
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

export interface CommunicationPreferencesResponse {
  status: string;
  message?: string;
  preferences?: CommunicationPreferencesData;
}

// ─── Section 9: AI Intelligence (Phase 11 legacy) ─────────

export interface CommunicationIntelligenceInsight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  confidence: number;
  metric?: string;
  recommendation: string;
  action_label?: string;
  action_route?: string;
}

export interface CommunicationInsightsResponse {
  status: string;
  message: string;
  insights: CommunicationIntelligenceInsight[];
  summary: string;
  generated_at: string;
}

// ─── Section 10: Intelligence (F28 — backend-aligned) ─────

export interface CommunicationInsightDimension {
  dimension: string;
  score: number;
  status: string;
  finding: string;
  recommendation: string;
  benchmark?: string;
  metric_value?: number | null;
  metric_unit?: string | null;
}

export interface GenerateInsightsResponse {
  status: string;
  message: string;
  overall_score: number;
  dimensions: CommunicationInsightDimension[];
  alerts: string[];
  opportunities: string[];
  generated_at: string;
}

export interface HealthFactors {
  delivery: number;
  diversity: number;
  reliability: number;
  frequency: number;
  engagement: number;
}

export interface CommunicationHealthData {
  score: number;
  level: string;
  factors: HealthFactors;
  trend: string;
  benchmark_comparison: string;
}

export interface CommunicationHealthResponse {
  status: string;
  message: string;
  health: CommunicationHealthData;
}

// ─── Section 11: Campaign (F28) ───────────────────────────

export interface CampaignMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  channels: string[];
  target_audience: string;
  template_id?: string;
  start_date?: string;
  end_date?: string;
  metrics: CampaignMetrics;
  created_by: string;
  created_at: string;
}

export interface CampaignSummary {
  total_campaigns: number;
  total_sent: number;
  avg_engagement: number;
  top_channel: string;
  top_type: string;
}

export interface CampaignPerformanceData {
  id: string;
  name: string;
  status: string;
  channels: string[];
  total_sent: number;
  success_count: number;
  success_rate: number;
  engagement_score: number;
}

export interface CampaignPerformanceResponse {
  status: string;
  message: string;
  campaigns: CampaignPerformanceData[];
  summary: CampaignSummary;
  top_performers: CampaignPerformanceData[];
  recommendations: string[];
}

// ─── Section 12: Sentiment (F28) ──────────────────────────

export interface SentimentDataPoint {
  id: string;
  source: string;
  text: string;
  sentiment: SentimentLevel;
  score: number;
  channel?: string;
  member_id?: string;
  timestamp: string;
}

export interface SentimentTrend {
  period: string;
  data_points: SentimentDataPoint[];
  overall_score: number;
  trend: "improving" | "stable" | "declining";
  monthly_averages: { month: string; avg_score: number; survey_count: number }[];
  prediction_30d?: { score: number; confidence: number };
}

// ─── Section 13: Cross-Agent (satisfaction) ────────────────

export interface SatisfactionTrendsData {
  months_analyzed: number;
  total_surveys: number;
  overall_trend: string;
  monthly_averages?: { month: string; avg_score: number; survey_count: number }[];
}

export interface SatisfactionTrendsResponse {
  status: string;
  message: string;
  trends: SatisfactionTrendsData;
}

// ─── Section 14: Health Score (client-side) ────────────────

/**
 * @deprecated F47 — Use HealthScoreResult from shared/lib/advisor-engine/types.ts.
 * Will be removed in F48.
 */
export interface CommunicationHealthScore {
  score: number;
  label: string;
  color: string;
  factors: { delivery: number; diversity: number; reliability: number };
}

// ═══════════════════════════════════════════════════════════
// ═══  PHASE 31 — COMMUNICATION INTELLIGENCE LAYER  ════════
// ═══  "The Voice" — From Observer to Interlocutor   ════════
// ═══════════════════════════════════════════════════════════

// ─── Section 15: Communication Intelligence ────────────────
//
// The Communication Fingerprint — each member has a unique
// psycho-communication profile that describes HOW they want
// to be communicated with: channel, frequency, length, tone,
// timing, topics, and response patterns.
//
// This is not "preferences the member set in a form."
// This is the AI-inferred profile from behavioral analysis.

/**
 * The unique communication fingerprint of each member.
 * Computed from historical interactions, response patterns,
 * and engagement signals across all channels.
 */
export interface CommunicationFingerprint {
  member_id: string;
  preferred_channel: NotificationChannel;
  channel_scores: Record<NotificationChannel, number>;
  optimal_frequency_days: number;
  preferred_length: MessageLength;
  resonant_tone: ResonantTone;
  receptive_hours: ReceptivityWindow[];
  topic_sensitivity: TopicSensitivity[];
  response_pattern: ResponsePattern;
  last_updated: string;
  confidence: number;
}

/**
 * A time window when the member is most receptive to communication.
 * Multiple windows form a weekly receptivity heatmap.
 */
export interface ReceptivityWindow {
  day_of_week: number;
  hour_start: number;
  hour_end: number;
  receptivity_score: number;
  confidence: number;
  sample_size: number;
}

/**
 * How a member responds to specific communication topics.
 * Positive = resonance, negative = rejection.
 */
export interface TopicSensitivity {
  topic: string;
  engagement_score: number;
  response_rate: number;
  last_tested: string;
}

/**
 * The member's response behavior pattern.
 * How fast they respond, how often, and when silence becomes a signal.
 */
export interface ResponsePattern {
  avg_response_time_hours: number;
  response_rate: number;
  preferred_response_channel: NotificationChannel | null;
  silence_threshold_days: number;
  last_response: string | null;
}

/**
 * AI-generated communication briefing for staff or automated systems.
 * Synthesizes fingerprint + emotional state + silence + narrative
 * into actionable guidance for the next interaction.
 */
export interface CommunicationIntelligenceBriefing {
  member_id: string;
  generated_at: string;
  fingerprint_summary: string;
  emotional_state: string;
  silence_status: string;
  narrative_status: string;
  recommended_channel: NotificationChannel;
  recommended_tone: ResonantTone;
  recommended_timing: string;
  fatigue_warning: boolean;
  intervention_urgency: "none" | "low" | "medium" | "high" | "critical";
  talking_points: string[];
  avoid_topics: string[];
}

// ─── Section 16: Emotional Intelligence ────────────────────
//
// Emotional Trajectory Mapping — no es "sentiment score 7/10".
// Es un MAPEO temporal de la emoción del socio: baseline,
// velocity, triggers, recovery time, resonance echoes.
//
// The system doesn't just detect how a member feels.
// It understands the ARC of their emotional journey.

/**
 * The complete emotional trajectory of a member over time.
 * Maps the arc: where they've been, where they are,
 * where they're heading, and what caused each shift.
 */
export interface EmotionalTrajectory {
  member_id: string;
  baseline: EmotionalDataPoint;
  current: EmotionalDataPoint;
  velocity: number;
  acceleration: number;
  trajectory: "ascending" | "stable" | "descending";
  triggers: EmotionalTrigger[];
  recovery_time_days: number;
  resonance_events: ResonanceEvent[];
  forecast: EmotionalForecast;
  history: EmotionalDataPoint[];
}

/**
 * A single point in the member's emotional timeline.
 * Each data point has a source and confidence level.
 */
export interface EmotionalDataPoint {
  date: string;
  score: number;
  sentiment: SentimentLevel;
  source: EmotionalSource;
  confidence: number;
}

/**
 * An event that shifted the member's emotional state.
 * Understanding triggers enables proactive intervention.
 */
export interface EmotionalTrigger {
  event_type: string;
  impact: number;
  duration_days: number;
  description: string;
}

/**
 * An experience that produced a lasting emotional echo.
 * These are the moments that define the member-club relationship.
 */
export interface ResonanceEvent {
  event_id: string;
  date: string;
  event_type: string;
  impact_duration_days: number;
  echo_mentions: number;
  identity_integration: boolean;
}

/**
 * AI-predicted emotional state at future horizons.
 * Includes risk factors and intervention windows.
 */
export interface EmotionalForecast {
  predicted_score_7d: number;
  predicted_score_30d: number;
  confidence: number;
  risk_factors: string[];
  intervention_window: boolean;
}

// ─── Section 17: Silence & Conversation Memory ─────────────
//
// Silence Intelligence — what the member DOESN'T say,
// DOESN'T do, DOESN'T respond to is equally valuable signal.
//
// Conversation Memory Graph — each interaction is a node
// in a continuous narrative that spans months or years.
//
// Message Fatigue — the system tracks saturation to prevent
// the club from becoming noise.

/**
 * The member's silence profile.
 * Silence is not absence of signal — it IS the signal.
 */
export interface SilenceProfile {
  member_id: string;
  current_silence_days: number;
  avg_silence_days: number;
  silence_threshold_days: number;
  silence_pattern: SilencePattern[];
  disengagement_risk: number;
  last_renewal_event: string | null;
  attention_decay_curve: DecayPoint[];
}

/**
 * A recurring pattern in the member's silence behavior.
 * Patterns reveal whether silence is seasonal, reactive, or gradual disengagement.
 */
export interface SilencePattern {
  pattern_type: "seasonal" | "post_complaint" | "post_event" | "gradual";
  trigger: string;
  avg_duration_days: number;
  frequency: number;
}

/**
 * A point on the attention decay curve.
 * Shows how engagement retention decreases over silence days.
 */
export interface DecayPoint {
  days_silent: number;
  engagement_retention: number;
}

/**
 * A single node in the conversation memory graph.
 * Each interaction is remembered, contextualized, and linked.
 */
export interface ConversationMemoryNode {
  id: string;
  member_id: string;
  date: string;
  channel: NotificationChannel;
  direction: MessageDirection;
  topic: string;
  subtopics: string[];
  sentiment: SentimentLevel;
  sentiment_score: number;
  summary: string;
  outcome: ConversationOutcome;
  callback_date: string | null;
  commitment: string | null;
  linked_nodes: string[];
}

/**
 * A narrative arc — communication as a continuous story.
 * Each message is a chapter, not an isolated event.
 * The system maintains narrative continuity across months.
 */
export interface NarrativeArc {
  member_id: string;
  arc_id: string;
  title: string;
  current_phase: NarrativePhase;
  chapters: NarrativeChapter[];
  open_callbacks: string[];
  next_predicted_event: string | null;
  story_health: StoryHealth;
}

/**
 * A chapter in the communication narrative.
 * Groups related conversation nodes into a story beat.
 */
export interface NarrativeChapter {
  id: string;
  date: string;
  phase: NarrativePhase;
  title: string;
  summary: string;
  sentiment: SentimentLevel;
  node_ids: string[];
}

/**
 * Message fatigue tracking — how saturated the member is.
 * The system prevents the club from becoming noise.
 */
export interface MessageFatigue {
  member_id: string;
  current_level: number;
  saturation_threshold: number;
  messages_received_7d: number;
  messages_received_30d: number;
  opt_out_risk: number;
  recommended_cooldown_days: number;
  trend: "increasing" | "stable" | "decreasing";
}

// ═══════════════════════════════════════════════════════════
// CONFIG MAPS — Silver Tide Tokens (0 hardcoded)
// ═══════════════════════════════════════════════════════════

// ── Existing Config Maps (Phase 28 — UNCHANGED) ────────────

export const ANNOUNCEMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Borrador",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
  scheduled: {
    label: "Programado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  published: {
    label: "Publicado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  archived: {
    label: "Archivado",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
};

export const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  normal: {
    label: "Normal",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
  important: {
    label: "Importante",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  urgent: {
    label: "Urgente",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "events", label: "Eventos" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "sports", label: "Deportes" },
  { value: "dining", label: "Gastronomía" },
  { value: "financial", label: "Financiero" },
  { value: "policy", label: "Políticas" },
  { value: "seasonal", label: "Temporada" },
];

export const AUDIENCE_OPTIONS: { value: AudienceTarget; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "socios", label: "Miembros" },
  { value: "staff", label: "Equipo del Club" },
  { value: "junta", label: "Junta Directiva" },
  { value: "young_adult", label: "Adultos Jóvenes (18-35)" },
  { value: "adult", label: "Profesionales (36-55)" },
  { value: "senior", label: "Seniors (56+)" },
  { value: "children_parents", label: "Padres de Familia" },
];

export const EMERGENCY_SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    icon: "alert-triangle",
  },
  high: {
    label: "Alto",
    color: "var(--color-amber-400)",
    icon: "alert-circle",
  },
  medium: {
    label: "Medio",
    color: "var(--color-gold-400)",
    icon: "info",
  },
};

export const EMERGENCY_CHANNEL_OPTIONS: {
  value: EmergencyChannel;
  label: string;
}[] = [
  { value: "push", label: "Notificación Push" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Correo" },
  { value: "pa_system", label: "Sistema de Audio" },
  { value: "app_banner", label: "Banner en App" },
];

export const FREQUENCY_CONFIG: Record<
  string,
  { label: string; description: string }
> = {
  realtime: { label: "Tiempo real", description: "Recibir al instante" },
  daily_digest: { label: "Resumen diario", description: "Agregado una vez al día" },
  weekly_digest: { label: "Resumen semanal", description: "Agregado semanalmente" },
  none: { label: "Sin envío", description: "No recibir" },
};

export const INSIGHT_CATEGORY_CONFIG: Record<
  InsightCategory,
  { label: string; color: string; bgColor: string }
> = {
  timing: {
    label: "Timing",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  channel: {
    label: "Canal",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  audience: {
    label: "Audiencia",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  content: {
    label: "Contenido",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
  frequency: {
    label: "Frecuencia",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  risk: {
    label: "Riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  opportunity: {
    label: "Oportunidad",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  health: {
    label: "Salud",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export const INSIGHT_PRIORITY_CONFIG: Record<
  InsightPriority,
  { label: string; color: string; bgColor: string; sortOrder: number }
> = {
  high: {
    label: "Alta",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    sortOrder: 0,
  },
  medium: {
    label: "Media",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    sortOrder: 1,
  },
  low: {
    label: "Baja",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
    sortOrder: 2,
  },
};

// ── Phase 31 — New Config Maps ─────────────────────────────

/**
 * MCP tool names for the Communications domain.
 * Used by hooks to route calls through the MCP protocol.
 */
export const COMMUNICATION_MCP_TOOLS = {
  GET_COMMUNICATION_HISTORY: "communications.get_history",
  GET_PREFERENCES: "communications.get_preferences",
  GENERATE_PERSONALIZED: "communications_generate_personalized",  
  UPDATE_PREFERENCES: "communications.update_preferences",
  GET_ANALYTICS: "communications.get_analytics",
  GET_SENTIMENT_TRENDS: "communications.get_sentiment_trends",
  GET_SENTIMENT_DATA: "communications.get_sentiment_data",
  GET_CAMPAIGNS: "communications.get_campaigns",
  GET_CAMPAIGN_PERFORMANCE: "communications.get_campaign_performance",
  GET_ANNOUNCEMENTS: "communications.get_announcements",
  CREATE_ANNOUNCEMENT: "communications.create_announcement",
  SEND_EMERGENCY: "communications.send_emergency",
  GET_HEALTH: "communications.get_health",
  GET_INSIGHTS: "communications.get_insights",
  GENERATE_INSIGHTS: "communications.generate_insights",
  GET_TEMPLATES: "communications.get_templates",
  GET_MEMBER_COMMUNICATION_HISTORY: "communications.get_member_history",
  GET_MEMBER_FINGERPRINT: "communications.get_member_fingerprint",
  GET_EMOTIONAL_TRAJECTORY: "communications.get_emotional_trajectory",
  GET_SILENCE_PROFILE: "communications.get_silence_profile",
  GET_CONVERSATION_MEMORY: "communications.get_conversation_memory",
} as const;

/**
 * Temporal freshness tiers for communication data.
 * Each tier defines max age before data is considered stale.
 */
export const COMMUNICATION_FRESHNESS_TIERS = {
  realtime: { maxAge: 60_000, label: "Tiempo real" },
  fresh: { maxAge: 300_000, label: "Reciente" },
  warm: { maxAge: 1_800_000, label: "Tibio" },
  stale: { maxAge: 3_600_000, label: "Desactualizado" },
  cold: { maxAge: Infinity, label: "Frío" },
} as const;

/**
 * Default values for the Communication Intelligence engine.
 * Calibrated for luxury club demographics.
 */
export const COMMUNICATION_INTELLIGENCE_DEFAULTS = {
  fingerprint: {
    default_frequency_days: 7,
    min_confidence: 0.3,
    history_window_days: 180,
    min_interactions: 5,
  },
  receptivity: {
    default_windows: [
      { day_of_week: 1, hour_start: 9, hour_end: 11, receptivity_score: 0.7 },
      { day_of_week: 3, hour_start: 14, hour_end: 16, receptivity_score: 0.65 },
      { day_of_week: 5, hour_start: 10, hour_end: 12, receptivity_score: 0.6 },
    ] as ReceptivityWindow[],
    min_sample_size: 3,
  },
  fatigue: {
    max_messages_per_week: 5,
    max_messages_per_channel_week: 3,
    saturation_threshold: 0.7,
    cooldown_after_opt_out_days: 30,
  },
} as const;

/**
 * Emotional baseline defaults — calibrated for luxury club members.
 * These are starting points; the system learns each member's true baseline.
 */
export const EMOTIONAL_BASELINE_DEFAULTS = {
  baseline_score: 65,
  recovery_time_days: 7,
  resonance_duration_days: 14,
  velocity_threshold: 0.1,
  forecast_horizon_days: 30,
  min_data_points: 5,
} as const;

/**
 * Silence thresholds — days of silence before escalation.
 * Warning: member is quiet. Alert: pattern emerging.
 * Critical: intervention needed. Escape: may be lost.
 */
export const SILENCE_THRESHOLDS = {
  warning: 7,
  alert: 14,
  critical: 30,
  escape_velocity: 60,
} as const;

/**
 * Visual configuration for silence levels.
 * All colors use Silver Tide tokens — zero hardcoded.
 */
export const SILENCE_LEVEL_CONFIG: Record<
  SilenceLevel,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  normal: {
    label: "Normal",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    icon: "check-circle",
  },
  warning: {
    label: "Atención",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    icon: "clock",
  },
  alert: {
    label: "Alerta",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    icon: "alert-circle",
  },
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    icon: "alert-triangle",
  },
};

/**
 * Visual configuration for emotional zones.
 * Maps emotional score ranges to visual identity.
 */
export const EMOTIONAL_ZONE_CONFIG: Record<
  EmotionalZone,
  { label: string; color: string; bgColor: string; scoreRange: [number, number] }
> = {
  thriving: {
    label: "Floreciendo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    scoreRange: [75, 100],
  },
  stable: {
    label: "Estable",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    scoreRange: [55, 74],
  },
  concerned: {
    label: "Preocupado",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    scoreRange: [40, 54],
  },
  at_risk: {
    label: "En Riesgo",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    scoreRange: [25, 39],
  },
  crisis: {
    label: "Crisis",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    scoreRange: [0, 24],
  },
};

/**
 * Visual configuration for fatigue levels.
 */
export const FATIGUE_LEVEL_CONFIG: Record<
  FatigueLevel,
  { label: string; color: string; bgColor: string; threshold: [number, number] }
> = {
  fresh: {
    label: "Fresco",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    threshold: [0, 0.24],
  },
  normal: {
    label: "Normal",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    threshold: [0.25, 0.49],
  },
  elevated: {
    label: "Elevado",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    threshold: [0.5, 0.69],
  },
  saturated: {
    label: "Saturado",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    threshold: [0.7, 0.89],
  },
  overloaded: {
    label: "Sobrecargado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    threshold: [0.9, 1.0],
  },
};

/**
 * Narrative phase configuration — each phase has visual identity
 * and expected duration in days.
 */
export const NARRATIVE_PHASE_CONFIG: Record<
  NarrativePhase,
  { label: string; color: string; description: string; expectedDurationDays: number }
> = {
  setup: {
    label: "Inicio",
    color: "var(--color-teal-400)",
    description: "Estableciendo la relación",
    expectedDurationDays: 30,
  },
  development: {
    label: "Desarrollo",
    color: "var(--color-gold-400)",
    description: "Profundizando la conexión",
    expectedDurationDays: 90,
  },
  climax: {
    label: "Momento Clave",
    color: "var(--color-amber-400)",
    description: "Punto de inflexión en la relación",
    expectedDurationDays: 14,
  },
  resolution: {
    label: "Resolución",
    color: "var(--color-emerald-400)",
    description: "Nuevo equilibrio alcanzado",
    expectedDurationDays: 30,
  },
};

/**
 * Visual configuration for story health.
 */
export const STORY_HEALTH_CONFIG: Record<
  StoryHealth,
  { label: string; color: string; bgColor: string; description: string }
> = {
  strong: {
    label: "Sólida",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    description: "Narrativa coherente y en desarrollo",
  },
  fragile: {
    label: "Frágil",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    description: "Narrativa perdiendo continuidad",
  },
  breaking: {
    label: "Rompiendo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    description: "Narrativa rota — intervención necesaria",
  },
};

/**
 * Tone spectrum — psycho-linguistic profiles.
 * Each tone has markers that the AI uses to adapt message composition.
 */
export const TONE_SPECTRUM_CONFIG: Record<
  ResonantTone,
  { label: string; description: string; markers: string[] }
> = {
  formal: {
    label: "Formal",
    description: "Comunicación profesional y respetuosa",
    markers: ["estimado", "cordialmente", "atentamente", "reciba un cordial saludo"],
  },
  warm: {
    label: "Cercano",
    description: "Tono amigable y personal",
    markers: ["hola", "qué alegría", "te esperamos", "nos encanta"],
  },
  direct: {
    label: "Directo",
    description: "Conciso y al punto — respeta su tiempo",
    markers: ["importante", "acción requerida", "fecha límite", "resumen"],
  },
  narrative: {
    label: "Narrativo",
    description: "Storytelling envolvente — crea conexión emocional",
    markers: ["su historia", "nuevos capítulos", "juntos", "este momento"],
  },
};

/**
 * Default channel effectiveness weights.
 * WhatsApp dominates in Latin American luxury clubs.
 */
export const CHANNEL_WEIGHTS: Record<NotificationChannel, number> = {
  whatsapp: 0.95,
  push: 0.80,
  sms: 0.75,
  email: 0.60,
  in_app: 0.45,
};

/**
 * Default attention decay curve — engagement retention over silence.
 * This is the default curve; the system learns each member's actual curve.
 * Values represent the fraction of engagement retained after N days of silence.
 */
export const DECAY_CURVE_DEFAULTS: DecayPoint[] = [
  { days_silent: 0, engagement_retention: 1.0 },
  { days_silent: 1, engagement_retention: 0.95 },
  { days_silent: 3, engagement_retention: 0.82 },
  { days_silent: 7, engagement_retention: 0.60 },
  { days_silent: 14, engagement_retention: 0.35 },
  { days_silent: 30, engagement_retention: 0.12 },
  { days_silent: 60, engagement_retention: 0.03 },
  { days_silent: 90, engagement_retention: 0.01 },
];

// ═══════════════════════════════════════════════════════════
// HELPERS — Pure Functions (Rule #8: formatters centralized)
// ═══════════════════════════════════════════════════════════

// ── Existing Helpers (Phase 28 — UNCHANGED) ────────────────

/**
 * Format date for Communication module display.
 * Centralizes toLocaleDateString/toLocaleTimeString (Rule #8).
 */
export function formatCommunicationDate(
  dateInput: string | number | Date,
  includeTime = false,
): string {
  const d =
    typeof dateInput === "string"
      ? new Date(dateInput)
      : typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;

  if (isNaN(d.getTime())) return "—";

  const dateStr = d.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (!includeTime) return dateStr;

  const timeStr = d.toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateStr} ${timeStr}`;
}

/**
 * Calculate communication health score (client-side, 0 tokens).
 * 3 factors: delivery (50%), diversity (30%), reliability (20%).
 * Returns score 0-100, label, CSS color, and factor breakdown.
 */
export function calculateCommunicationHealth(
  analytics: CommunicationAnalyticsData,
): CommunicationHealthScore {
  const {
    delivery_rate_pct,
    channel_breakdown,
    status_breakdown,
    total_sent,
  } = analytics;

  if (total_sent === 0) {
    return {
      score: 0,
      label: "Sin datos",
      color: "var(--color-silver-500)",
      factors: { delivery: 0, diversity: 0, reliability: 0 },
    };
  }

  const delivery = Math.min(delivery_rate_pct, 100);
  const channelsUsed = channel_breakdown.length;
  const diversity = Math.min((channelsUsed / 3) * 100, 100);
  const failureRate =
    ((status_breakdown.failed + status_breakdown.cancelled) / total_sent) *
    100;
  const reliability = Math.max(0, 100 - failureRate * 5);

  const score = Math.round(
    delivery * 0.5 + diversity * 0.3 + reliability * 0.2,
  );

  let label: string;
  let color: string;
  if (score >= 80) {
    label = "Excelente";
    color = "var(--color-emerald-400)";
  } else if (score >= 50) {
    label = "Buena";
    color = "var(--color-amber-400)";
  } else {
    label = "Atención";
    color = "var(--color-rose-400)";
  }

  return {
    score,
    label,
    color,
    factors: {
      delivery: Math.round(delivery),
      diversity: Math.round(diversity),
      reliability: Math.round(reliability),
    },
  };
}

// ── Phase 31 — New Helpers ─────────────────────────────────

/**
 * Derive silence level from days since last interaction.
 * Uses SILENCE_THRESHOLDS for classification.
 */
export function deriveSilenceLevel(days: number): SilenceLevel {
  if (days >= SILENCE_THRESHOLDS.escape_velocity) return "critical";
  if (days >= SILENCE_THRESHOLDS.critical) return "critical";
  if (days >= SILENCE_THRESHOLDS.alert) return "alert";
  if (days >= SILENCE_THRESHOLDS.warning) return "warning";
  return "normal";
}

/**
 * Derive fatigue level from saturation score (0-1).
 * Uses FATIGUE_LEVEL_CONFIG thresholds.
 */
export function deriveFatigueLevel(score: number): FatigueLevel {
  if (score >= 0.9) return "overloaded";
  if (score >= 0.7) return "saturated";
  if (score >= 0.5) return "elevated";
  if (score >= 0.25) return "normal";
  return "fresh";
}

/**
 * Derive emotional zone from composite emotional score (0-100).
 * Uses EMOTIONAL_ZONE_CONFIG score ranges.
 */
export function deriveEmotionalZone(score: number): EmotionalZone {
  if (score >= 75) return "thriving";
  if (score >= 55) return "stable";
  if (score >= 40) return "concerned";
  if (score >= 25) return "at_risk";
  return "crisis";
}

/**
 * Format emotional score for display — includes zone label and sign.
 * Example: "72 — Estable" or "28 — En Riesgo"
 */
export function formatEmotionalScore(score: number): string {
  const zone = deriveEmotionalZone(score);
  const label = EMOTIONAL_ZONE_CONFIG[zone].label;
  return `${score} — ${label}`;
}

/**
 * Get human-readable label for a notification channel.
 * Returns capitalized display name.
 */
export function getChannelLabel(channel: NotificationChannel): string {
  const labels: Record<NotificationChannel, string> = {
    email: "Correo",
    push: "Push",
    sms: "SMS",
    whatsapp: "WhatsApp",
    in_app: "En la App",
  };
  return labels[channel] ?? channel;
}

/**
 * Compute receptivity score for a given fingerprint at a proposed time.
 * Returns 0-1 score based on matching receptive windows.
 * Returns 0.5 if no window data available (neutral default).
 */
export function computeReceptivityScore(
  fingerprint: CommunicationFingerprint,
  dayOfWeek: number,
  hour: number,
): number {
  if (fingerprint.receptive_hours.length === 0) return 0.5;

  let bestMatch = 0;
  for (const window of fingerprint.receptive_hours) {
    if (
      window.day_of_week === dayOfWeek &&
      hour >= window.hour_start &&
      hour < window.hour_end
    ) {
      bestMatch = Math.max(bestMatch, window.receptivity_score);
    }
  }

  return bestMatch > 0 ? bestMatch : 0.3;
}

// ═══════════════════════════════════════════════════════════
// F47 — Communication Advisor Type (Engine v2)
//
// Replaces the F28 CommunicationAdvisorInsight (deprecated below).
// AdvisorInsightBase provides: id, impact, title, reasoning,
// confidence, target_view, action, domain, layer.
// Communication-specific: category + severity.
// ═══════════════════════════════════════════════════════════

export type CommunicationInsight = AdvisorInsightBase & {
  category: InsightCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
};

/**
 * @deprecated F47 — Use CommunicationInsight instead.
 * Will be removed in F48.
 */
export interface CommunicationAdvisorInsight {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  impact: number;
  confidence: number;
  domain: "communications";
  reasoning: string;
  category: "timing" | "channel" | "frequency" | "risk" | "opportunity" | "audience" | "health";
  icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
  color: string;
  action?: {
    label: string;
    tab?: string;
    toast?: string;
  };
}