// src/features/communications/hooks/useCommunicationIntelligence.ts
// ═══════════════════════════════════════════════════════════
// Intelligence Layer for CommunicationCenter
// Aggregates data + computes derivations for the Command Center
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type {
  HistoryResponse,
  ScheduledListResponse,
  TemplateListResponse,
} from "../types";

/* ── Backend types (verified from AnnouncementBoard) ── */

interface ChannelBreakdown {
  channel: string;
  count: number;
  percentage: number;
}

interface CommunicationAnalytics {
  period: string;
  total_sent: number;
  total_recipients: number;
  delivery_rate_pct: number;
  avg_recipients_per_send: number;
  best_day_to_send: string;
  best_hour_to_send: string;
  channel_breakdown: ChannelBreakdown[];
  type_breakdown: Array<{ type: string; count: number; percentage: number }>;
  status_breakdown: { sent: number; delivered: number; failed: number; cancelled: number };
  daily_volume: Array<{ date: string; count: number }>;
  hourly_distribution: Array<{ hour: string; count: number }>;
}

interface AnalyticsResponse {
  status: string;
  message: string;
  analytics: CommunicationAnalytics;
}

/* ── Intelligence output types ── */

export interface CommandStatus {
  totalSent: number;
  successRate: number;
  activeChannels: number;
  fatigueScore: number;
  fatigueLevel: "fresh" | "normal" | "elevated" | "saturated" | "overloaded";
  pendingScheduled: number;
  nextScheduledAt: string | null;
}

export interface TemporalAdvice {
  optimalDay: string;
  optimalHour: string;
  confidence: "high" | "medium" | "low";
  label: string;
}

export interface FatigueWarning {
  level: "normal" | "elevated" | "saturated" | "overloaded";
  message: string;
  score: number;
}

export interface CascadeWarning {
  risk: "low" | "medium" | "high";
  count: number;
  message: string;
}

export interface ChannelRecommendation {
  optimal: string;
  effectiveness: Record<string, number>;
  label: string;
}

export interface AudienceGap {
  channel: string;
  issue: string;
  severity: "low" | "medium";
}

const KNOWN_CHANNELS = ["email", "push", "sms", "whatsapp", "in_app"] as const;

/* ── Hook ── */

export function useCommunicationIntelligence() {
  /* ── Data fetching ── */
  const historyQ = useMCPQuery<HistoryResponse>(
    "communication", "get_notification_history", { limit: 100 }, { staleTime: 60_000 },
  );
  const templatesQ = useMCPQuery<TemplateListResponse>(
    "communication", "manage_notification_templates", { action: "list" }, { staleTime: 120_000 },
  );
  const scheduledQ = useMCPQuery<ScheduledListResponse>(
    "communication", "schedule_notification", { action: "list" }, { staleTime: 60_000 },
  );
  const analyticsQ = useMCPQuery<AnalyticsResponse>(
    "communication", "get_communication_analytics", { period: "current_month" }, { staleTime: 120_000 },
  );

  /* ── Raw data ── */
  const history = historyQ.data?.history ?? [];
  const templates = templatesQ.data?.templates ?? [];
  const scheduled = scheduledQ.data?.scheduled ?? [];
  const analytics = analyticsQ.data?.analytics ?? null;

  /* ── Loading / Error ── */
  const isLoading = historyQ.isLoading || templatesQ.isLoading || scheduledQ.isLoading || analyticsQ.isLoading;
  const isError = !isLoading && (historyQ.isError || templatesQ.isError);

  /* ── Command Status ── */
  const commandStatus = useMemo<CommandStatus>(() => {
    const totalSent = analytics?.total_sent ?? history.length;
    const delivered = history.filter((h) => h.status === "sent" || h.status === "delivered").length;
    const successRate = analytics?.delivery_rate_pct ?? (history.length > 0 ? Math.round((delivered / history.length) * 100) : 0);
    const activeChannels = analytics?.channel_breakdown.length ?? new Set(history.map((h) => h.channel)).size;

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const recent7d = history.filter((h) => h.sent_at !== undefined && (now - new Date(h.sent_at).getTime()) < weekMs);
    const fatigueScore = Math.min(100, recent7d.length * 12);
    let fatigueLevel: CommandStatus["fatigueLevel"] = "fresh";
    if (fatigueScore >= 80) fatigueLevel = "overloaded";
    else if (fatigueScore >= 60) fatigueLevel = "saturated";
    else if (fatigueScore >= 40) fatigueLevel = "elevated";
    else if (fatigueScore >= 15) fatigueLevel = "normal";

    const pendingScheduled = scheduled.filter((s) => s.status === "queued").length;
    const nextItem = scheduled
      .filter((s) => s.status === "queued")
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

    return {
      totalSent,
      successRate,
      activeChannels,
      fatigueScore,
      fatigueLevel,
      pendingScheduled,
      nextScheduledAt: nextItem?.scheduled_at ?? null,
    };
  }, [analytics, history, scheduled]);

  /* ── Channel Effectiveness ── */
  const channelEffectiveness = useMemo<Record<string, number>>(() => {
    if (analytics !== null && analytics.channel_breakdown.length > 0) {
      const r: Record<string, number> = {};
      analytics.channel_breakdown.forEach((c) => { r[c.channel] = c.percentage; });
      return r;
    }
    const counts: Record<string, number> = {};
    history.forEach((h) => { counts[h.channel] = (counts[h.channel] || 0) + 1; });
    const max = Math.max(...Object.values(counts), 1);
    const r: Record<string, number> = {};
    Object.entries(counts).forEach(([ch, c]) => { r[ch] = Math.round((c / max) * 100); });
    return r;
  }, [analytics, history]);

  /* ── Temporal Advice ── */
  const temporalAdvice = useMemo<TemporalAdvice>(() => {
    if (analytics?.best_day_to_send !== undefined && analytics.best_day_to_send !== "" && analytics?.best_hour_to_send !== undefined && analytics.best_hour_to_send !== "") {
      return {
        optimalDay: analytics.best_day_to_send,
        optimalHour: analytics.best_hour_to_send,
        confidence: analytics.total_sent >= 20 ? "high" : analytics.total_sent >= 5 ? "medium" : "low",
        label: `${analytics.best_day_to_send} ${analytics.best_hour_to_send}`,
      };
    }
    return { optimalDay: "Jueves", optimalHour: "10:00", confidence: "low", label: "Jueves 10:00 (estimado)" };
  }, [analytics]);

  /* ── Fatigue Warning ── */
  const fatigueWarning = useMemo<FatigueWarning>(() => {
    const s = commandStatus.fatigueScore;
    if (s >= 80) return { level: "overloaded", message: "Saturación crítica — pausá 48h", score: s };
    if (s >= 60) return { level: "saturated", message: "Alta frecuencia — espaciá envíos", score: s };
    if (s >= 40) return { level: "elevated", message: "Frecuencia elevada — monitoreá", score: s };
    return { level: "normal", message: "Frecuencia saludable", score: s };
  }, [commandStatus.fatigueScore]);

  /* ── Cascade Risk ── */
  const cascadeRisk = useMemo<CascadeWarning>(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const upcoming = scheduled.filter((s) => {
      if (s.status !== "queued") return false;
      const t = new Date(s.scheduled_at).getTime();
      return t > now && (t - now) < day;
    });
    if (upcoming.length >= 3) return { risk: "high", count: upcoming.length, message: `${upcoming.length} envíos en 24h — saturación` };
    if (upcoming.length >= 2) return { risk: "medium", count: upcoming.length, message: `${upcoming.length} envíos en 24h` };
    return { risk: "low", count: upcoming.length, message: "Sin conflictos de envío" };
  }, [scheduled]);

  /* ── Channel Recommendation ── */
  const channelRecommendation = useMemo<ChannelRecommendation>(() => {
    const entries = Object.entries(channelEffectiveness);
    if (entries.length === 0) return { optimal: "email", effectiveness: {}, label: "Sin datos — email" };
    const sorted = [...entries].sort(([, a], [, b]) => b - a);
    const [best, pct] = sorted[0];
    return { optimal: best, effectiveness: channelEffectiveness, label: `${best} (${pct}%)` };
  }, [channelEffectiveness]);

  /* ── Audience Gaps ── */
  const audienceGaps = useMemo<AudienceGap[]>(() => {
    if (analytics === null || analytics.channel_breakdown.length === 0) return [];
    const gaps: AudienceGap[] = [];
    const avg = analytics.channel_breakdown.reduce((s, c) => s + c.count, 0) / analytics.channel_breakdown.length;
    const active: Record<string, boolean> = {};
    analytics.channel_breakdown.forEach((c) => {
      active[c.channel] = true;
      if (c.count < avg * 0.3) gaps.push({ channel: c.channel, issue: `Baja actividad: ${c.count} envíos`, severity: "medium" });
    });
    KNOWN_CHANNELS.forEach((ch) => {
      if (!active[ch]) gaps.push({ channel: ch, issue: "Canal sin uso detectado", severity: "low" });
    });
    return gaps;
  }, [analytics]);

  /* ── Reach Estimate ── */
  function getReachEstimate(channels: string[]): number {
    if (analytics === null || analytics.total_sent === 0) return 0;
    const chPct = channels.reduce((s, ch) => {
      const found = analytics.channel_breakdown.find((c) => c.channel === ch);
      return s + (found?.percentage ?? 0);
    }, 0);
    return Math.round(Math.min(100, chPct * 1.2) * (analytics.delivery_rate_pct / 100));
  }

  /* ── Data Freshness ── */
  const dataFreshness = useMemo(() => {
    if (!historyQ.dataUpdatedAt) return { isStale: false, label: "" };
    const m = Math.floor((Date.now() - historyQ.dataUpdatedAt) / 60000);
    return { isStale: m > 30, label: m < 1 ? "Ahora" : `Hace ${m}m` };
  }, [historyQ.dataUpdatedAt]);

  /* ── Refetch ── */
  const refetchAll = () => {
    historyQ.refetch();
    templatesQ.refetch();
    scheduledQ.refetch();
    analyticsQ.refetch();
  };

  return {
    history,
    templates,
    scheduled,
    analytics,
    isLoading,
    isError,
    dataFreshness,
    refetchAll,
    commandStatus,
    channelEffectiveness,
    temporalAdvice,
    fatigueWarning,
    cascadeRisk,
    channelRecommendation,
    audienceGaps,
    getReachEstimate,
  };
}