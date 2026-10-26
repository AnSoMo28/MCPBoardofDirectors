// src/features/communications/hooks/usePreferenceIntelligence.ts
// ═══════════════════════════════════════════════════════════
// Preference Intelligence Hook — Computes all derived intelligence
// for the Communication Preferences component.
//
// Two layers:
//  - Analytics layer (always available): club-level channel stats
//  - History layer (when available): per-member fingerprint, fatigue
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  CommunicationAnalyticsData,
  CommunicationFingerprint,
  HistoryItem,
  NotificationChannel,
} from "../types";

import {
  buildCommunicationFingerprint,
  computeChannelScores as computeMemberChannelScores,
  computeMessageFatigue,
} from "../lib/communicationIntelligence";
import type {
  PreferencesForm
} from "../config";

import {
  PREFS_CHANNEL_TOGGLE_CONFIG,
  PREFS_FREQUENCY_FIELDS,
  computePreferenceQuality,
  computeQuietHoursConflict,
  getFrequencyVolumeLevel,
  buildReceptivityHeatmap,
} from "../config";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface ChannelScore {
  pct: number;
  count: number;
  level: string;
}

export interface ChannelSuggestion {
  channel: string;
  label: string;
  reason: string;
  effectiveness: number;
  level: string;
}

export interface FingerprintMini {
  style: string;
  engagement: string;
  schedule: string;
  activeLabels: string[];
}

export interface FatigueImpact {
  currentLevel: number;
  messagesIn7d: number;
  messagesIn30d: number;
  trend: string;
  risk: string;
  cooldownDays: number;
}

export interface PreferenceIntelligence {
  // Analytics-based (always available)
  analyticsChannelScores: Record<string, ChannelScore>;
  qualityScore: number;
  qualityDelta: number;
  quietConflict: { hasConflict: boolean; bestHour: string } | null;
  activeChannelCount: number;
  frequencyLevel: string;
  channelSuggestions: ChannelSuggestion[];
  fingerprintMini: FingerprintMini;

  // History-based (optional — null when history unavailable)
  fingerprint: CommunicationFingerprint | null;
  fatigue: FatigueImpact | null;
  memberChannelScores: Record<NotificationChannel, number> | null;
  receptivityHeatmap: number[][] | null;
}

// ═══════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════

export function usePreferenceIntelligence(
  form: PreferencesForm,
  analytics: CommunicationAnalyticsData | undefined,
  history: HistoryItem[] | undefined,
  memberId: string | null,
  originalQuality: number,
): PreferenceIntelligence {
  // ── Analytics-based: Channel scores from club data ──
  const analyticsChannelScores = useMemo(() => {
    const scores: Record<string, ChannelScore> = {};
    const allChannels = ["email", "push", "sms", "whatsapp", "in_app"];

    if (analytics && analytics.channel_breakdown.length > 0) {
      const maxPct = Math.max(
        ...analytics.channel_breakdown.map(
          (c: { percentage: number }) => c.percentage,
        ),
        1,
      );
      analytics.channel_breakdown.forEach(
        (c: { channel: string; percentage: number; count: number }) => {
          const normalized = (c.percentage / maxPct) * 100;
          scores[c.channel] = {
            pct: c.percentage,
            count: c.count,
            level:
              normalized >= 60 ? "high" :
              normalized >= 30 ? "medium" :
              normalized > 0 ? "low" : "unused",
          };
        },
      );
    }

    allChannels.forEach((ch) => {
      if (!scores[ch]) scores[ch] = { pct: 0, count: 0, level: "unused" };
    });

    return scores;
  }, [analytics]);

  // ── Analytics-based: Quality score ──────────────
  const qualityScore = useMemo(
    () => computePreferenceQuality(form),
    [form],
  );

  const qualityDelta = qualityScore - originalQuality;

  // ── Analytics-based: Quiet conflict ─────────────
  const quietConflict = useMemo(
    () =>
      computeQuietHoursConflict(
        form.quiet_hours_start,
        form.quiet_hours_end,
        analytics?.best_hour_to_send ?? "",
      ),
    [form.quiet_hours_start, form.quiet_hours_end, analytics?.best_hour_to_send],
  );

  // ── Analytics-based: Active channel count ───────
  const activeChannelCount: number = PREFS_CHANNEL_TOGGLE_CONFIG.filter(
    (ch) => form[ch.key],
  ).length;

  // ── Analytics-based: Frequency level ────────────
  const frequencyLevel: string = useMemo(
    () => getFrequencyVolumeLevel(form),
    [form],
  );

  // ── Analytics-based: Channel suggestions ────────
  const channelSuggestions = useMemo(() => {
    const suggestions: ChannelSuggestion[] = [];
    PREFS_CHANNEL_TOGGLE_CONFIG.forEach((ch) => {
      if (!form[ch.key]) {
        const score = analyticsChannelScores[ch.token];
        if (score && score.count > 0) {
          suggestions.push({
            channel: ch.token,
            label: ch.label,
            reason: `${ch.label}: ${score.pct}% del tráfico del club, ${score.count} envíos exitosos`,
            effectiveness: score.pct,
            level: score.level,
          });
        }
      }
    });
    return suggestions;
  }, [form, analyticsChannelScores]);

  // ── Analytics-based: Fingerprint mini ───────────
  const fingerprintMini = useMemo((): FingerprintMini => {
    const active = PREFS_CHANNEL_TOGGLE_CONFIG.filter((ch) => form[ch.key]);
    const activeLabels = active.map((ch) => ch.label);

    let style = "Mínimo";
    if (active.length >= 4) style = "Multicanal";
    else if (active.length >= 2) style = "Equilibrado";
    else if (active.length === 1) style = "Enfocado";

    const freqValues = PREFS_FREQUENCY_FIELDS.map((f) => form[f.key]);
    const realtimeCount = freqValues.filter((v) => v === "realtime").length;
    let engagement = "Bajo";
    if (realtimeCount >= 2) engagement = "Alto";
    else if (realtimeCount >= 1) engagement = "Medio";

    const qs = Number(form.quiet_hours_start.split(":")[0]) * 60 +
               Number(form.quiet_hours_start.split(":")[1] || 0);
    const qe = Number(form.quiet_hours_end.split(":")[0]) * 60 +
               Number(form.quiet_hours_end.split(":")[1] || 0);
    const hasQuiet = qs !== 0 || qe !== 0;
    const schedule = hasQuiet ? "Sensible" : "Flexible";

    return { style, engagement, schedule, activeLabels };
  }, [form]);

  // ── History-based: Communication Fingerprint ────
  const fingerprint = useMemo((): CommunicationFingerprint | null => {
    if (!history || history.length === 0 || !memberId) return null;
    return buildCommunicationFingerprint(memberId, history, null);
  }, [history, memberId]);

  // ── History-based: Member channel scores ────────
  const memberChannelScores = useMemo((): Record<NotificationChannel, number> | null => {
    if (!history || history.length === 0) return null;
    return computeMemberChannelScores(history);
  }, [history]);

  // ── History-based: Fatigue ──────────────────────
  const fatigue = useMemo((): FatigueImpact | null => {
    if (!history || history.length === 0 || !memberId) return null;
    const mf = computeMessageFatigue(memberId, history);
    return {
      currentLevel: mf.current_level,
      messagesIn7d: mf.messages_received_7d,
      messagesIn30d: mf.messages_received_30d,
      trend: mf.trend,
      risk: mf.opt_out_risk > 0.7 ? "Alto" : mf.opt_out_risk > 0.4 ? "Medio" : "Bajo",
      cooldownDays: mf.recommended_cooldown_days,
    };
  }, [history, memberId]);

  // ── History-based: Receptivity heatmap ──────────
  const receptivityHeatmap = useMemo((): number[][] | null => {
    if (!fingerprint) return null;
    return buildReceptivityHeatmap(fingerprint.receptive_hours);
  }, [fingerprint]);

  // ── Return ──────────────────────────────────────
  return {
    analyticsChannelScores,
    qualityScore,
    qualityDelta,
    quietConflict,
    activeChannelCount,
    frequencyLevel,
    channelSuggestions,
    fingerprintMini,
    fingerprint,
    fatigue,
    memberChannelScores,
    receptivityHeatmap,
  };
}