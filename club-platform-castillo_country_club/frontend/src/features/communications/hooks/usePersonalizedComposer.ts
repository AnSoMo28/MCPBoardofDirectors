// src/features/communications/hooks/usePersonalizedComposer.ts
// ═══════════════════════════════════════════════════════════
// Personalized Composer Hook — State, Queries, Intelligence
// Extracted from PersonalizedCommunication.tsx V1 monolith
//
// V2: Uses engine §14 (analyzeTextTone, computeTextToneMatch)
// and §15 (scoreCampaignVariant) for real text analysis.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from "react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";

import type {
  CommunicationsGeneratePersonalizedData,
} from "@/shared/mocks/contracts";

import type {
  CommunicationAnalyticsData,
  CommunicationAnalyticsResponse
} from "../types";

import {
  analyzeTextTone,
  computeTextToneMatch,
  scoreCampaignVariant,
} from "../lib/communicationIntelligence";

import type {
  TextToneProfile,
  CampaignVariantScore,
} from "../lib/communicationIntelligence";

import {
  COMPOSER_FAMILY_OPTIONS,
  COMPOSER_TIER_CONTEXT,
  getOccasionToneIdeal,
  getComposerRiskContext,
  getComposerFatigueContext,
  computeComposerSendTimeSlots
} from "../config";

import type {
  ComposerFamilyOption,
  ComposerOccasionIdeal,
  ComposerRiskContext,
  ComposerFatigueContext,
  ComposerSendTimeSlot,
} from "../config";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface MemberIntelligence {
  silenceDays: number;
  fatigueLevel: "fresh" | "normal" | "elevated" | "saturated";
  communicationCount14d: number;
  avgOpenRate: number | null;
  avgResponseRate: number | null;
  channelPerformance: Record<string, { openRate: number; count: number }>;
  engagementRisk: "safe" | "drifting" | "approaching" | "critical";
  lastCommunicationDate: string | null;
  sentimentSummary: { positive: number; neutral: number; negative: number };
}

export interface ComposerToneMatch {
  overallScore: number;
  formalityMatch: number;
  warmthMatch: number;
  urgencyMatch: number;
  personalizationMatch: number;
  suggestions: string[];
}

// ═══════════════════════════════════════════════════════════
// Intelligence: Member Intelligence (from past_performance)
// ═══════════════════════════════════════════════════════════

interface PastPerfItem {
  campaign_name: string;
  channel: string;
  date: string;
  open_rate_pct: number | null;
  response_rate_pct: number | null;
  sentiment: string;
}

function computeMemberIntelligence(perf: PastPerfItem[]): MemberIntelligence {
  const now = Date.now();
  const FOURTEEN_DAYS = 14 * 86400000;

  const sorted = [...perf].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const lastDate = sorted.length > 0 ? sorted[0].date : null;
  const silenceDays = lastDate
    ? Math.floor((now - new Date(lastDate).getTime()) / 86400000)
    : 999;

  const recent14d = perf.filter(
    (p) => now - new Date(p.date).getTime() < FOURTEEN_DAYS,
  );
  const count14d = recent14d.length;
  const fatigueLevel: MemberIntelligence["fatigueLevel"] =
    count14d >= 6 ? "saturated" :
    count14d >= 4 ? "elevated" :
    count14d >= 1 ? "normal" : "fresh";

  const withOpen = perf.filter((p) => p.open_rate_pct != null);
  const withResponse = perf.filter((p) => p.response_rate_pct != null);
  const avgOpenRate = withOpen.length > 0
    ? Math.round(withOpen.reduce((s, p) => s + (p.open_rate_pct ?? 0), 0) / withOpen.length)
    : null;
  const avgResponseRate = withResponse.length > 0
    ? Math.round(withResponse.reduce((s, p) => s + (p.response_rate_pct ?? 0), 0) / withResponse.length)
    : null;

  // V2 FIX: cleaner channel accumulation (V1 had fragile running-avg logic)
  const channelGroups: Record<string, number[]> = {};
  perf.forEach((p) => {
    if (!channelGroups[p.channel]) channelGroups[p.channel] = [];
    if (p.open_rate_pct != null) channelGroups[p.channel].push(p.open_rate_pct);
  });
  const channelPerf: Record<string, { openRate: number; count: number }> = {};
  Object.entries(channelGroups).forEach(([ch, rates]) => {
    channelPerf[ch] = {
      openRate: rates.length > 0
        ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
        : 0,
      count: rates.length,
    };
  });

  const sentimentSummary = { positive: 0, neutral: 0, negative: 0 };
  perf.forEach((p) => {
    if (p.sentiment === "positivo" || p.sentiment === "positive") sentimentSummary.positive++;
    else if (p.sentiment === "negativo" || p.sentiment === "negative") sentimentSummary.negative++;
    else sentimentSummary.neutral++;
  });

  let risk: MemberIntelligence["engagementRisk"] = "safe";
  if (silenceDays > 30) risk = "critical";
  else if (silenceDays > 21) risk = "approaching";
  else if (silenceDays > 14) risk = "drifting";
  if (sentimentSummary.negative > sentimentSummary.positive && risk === "safe") {
    risk = "drifting";
  }

  return {
    silenceDays,
    fatigueLevel,
    communicationCount14d: count14d,
    avgOpenRate,
    avgResponseRate,
    channelPerformance: channelPerf,
    engagementRisk: risk,
    lastCommunicationDate: lastDate,
    sentimentSummary,
  };
}

// ═══════════════════════════════════════════════════════════
// Intelligence: Tone Suggestions
// ═══════════════════════════════════════════════════════════

function generateToneSuggestions(
  profile: TextToneProfile,
  ideal: ComposerOccasionIdeal,
): string[] {
  const suggestions: string[] = [];
  const formDiff = Math.abs(profile.formality - ideal.idealFormality);
  const warmDiff = Math.abs(profile.warmth - ideal.idealWarmth);

  if (formDiff > 20) {
    suggestions.push(
      profile.formality > ideal.idealFormality
        ? "Tono más formal de lo ideal — considerá humanizar"
        : "Tono menos formal de lo ideal — considerá profesionalizar",
    );
  }
  if (warmDiff > 20) {
    suggestions.push(
      profile.warmth > ideal.idealWarmth
        ? "Calidez alta — adecuada para ocasión personal"
        : "Calidez baja — considerá agregar empatía",
    );
  }
  if (profile.personalization < 50) {
    suggestions.push("Personalización baja — agregá referencias específicas del socio");
  }
  if (profile.wordCount < 30) {
    suggestions.push("Mensaje muy breve — considerá expandir con detalles relevantes");
  }
  if (profile.wordCount > 400) {
    suggestions.push("Mensaje extenso — considerá condensar para mejorar lectura");
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════

export function usePersonalizedComposer() {
  // ── State ──────────────────────────────────────
  const [familyId, setFamilyId] = useState("");
  const [channel, setChannel] = useState("email");
  const [occasion, setOccasion] = useState("");
  const [triggerFetch, setTriggerFetch] = useState(false);
  const [selectedAlt, setSelectedAlt] = useState(0);

  // ── Analytics query (always on) ───────────────
  const analyticsQ = useMCPQuery<CommunicationAnalyticsResponse>(
    "communication",
    "get_communication_analytics",
    { period: "last_90_days" },
    { staleTime: 300_000 },
  );

  // ── Generation query (triggered) ──────────────
  const genQ = useMCPQuery<CommunicationsGeneratePersonalizedData>(
    "communication",
    "communications_generate_personalized",
    { family_id: familyId, channel, occasion },
    { enabled: triggerFetch },
  );

  // ── Disable trigger after data arrives ─────────
  useEffect(() => {
    if (genQ.data && triggerFetch) {
      setTriggerFetch(false);
    }
  }, [genQ.data, triggerFetch]);

  // ── Data ──────────────────────────────────────
  const data: CommunicationsGeneratePersonalizedData | null = genQ.data ?? null;
  const clubAnalytics: CommunicationAnalyticsData | undefined = analyticsQ.data?.analytics;

  // ── Handlers ───────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!familyId || !occasion.trim()) {
      showToast({
        type: "error",
        message: "Seleccioná una familia y describí la ocasión",
      });
      return;
    }
    setSelectedAlt(0);
    setTriggerFetch(true);
  }, [familyId, occasion]);

  const handleRegenerate = useCallback(() => {
    setSelectedAlt(0);
    setTriggerFetch(true);
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      type: "success",
      message: "Contenido copiado al portapapeles",
    });
  }, []);

  // ════════════════════════════════════════════════
  // INTELLIGENCE LAYER
  // ════════════════════════════════════════════════

  // ── Member Intelligence (from past_performance) ─
  const memberIntel = useMemo((): MemberIntelligence | null => {
    if (!data?.past_communication_performance) return null;
    return computeMemberIntelligence(data.past_communication_performance);
  }, [data]);

  // ── Text Tone Profile (engine §14 — analyzes ACTUAL generated text) ──
  const textToneProfile = useMemo((): TextToneProfile | null => {
    if (!data?.content?.body) return null;
    return analyzeTextTone(data.content.body);
  }, [data?.content?.body]);

  // ── Tone Match (engine §14 — compares text profile vs occasion ideal) ──
  const toneMatch = useMemo((): ComposerToneMatch | null => {
    if (!textToneProfile) return null;
    const ideal = getOccasionToneIdeal(occasion);
    const overallScore = computeTextToneMatch(textToneProfile, ideal);

    return {
      overallScore,
      formalityMatch: Math.max(0, 100 - Math.abs(textToneProfile.formality - ideal.idealFormality) * 2),
      warmthMatch: Math.max(0, 100 - Math.abs(textToneProfile.warmth - ideal.idealWarmth) * 2),
      urgencyMatch: Math.max(0, 100 - Math.abs(textToneProfile.urgency - ideal.idealUrgency) * 2),
      personalizationMatch: Math.max(0, 100 - Math.abs(textToneProfile.personalization - ideal.idealPersonalization) * 2),
      suggestions: generateToneSuggestions(textToneProfile, ideal),
    };
  }, [textToneProfile, occasion]);

  // ── Variant Scores (engine §15 — score each alternative) ──
  const variantScores = useMemo((): CampaignVariantScore[] => {
    if (!data?.alternative_versions || data.alternative_versions.length === 0) return [];
    const ideal = getOccasionToneIdeal(occasion);
    return data.alternative_versions.map(
      (alt: { body: string }) => {
        const profile = analyzeTextTone(alt.body);
        return scoreCampaignVariant(profile, ideal);
      },
    );
  }, [data?.alternative_versions, occasion]);

  // ── Send Time Slots ───────────────────────────
  const sendTimeSlots = useMemo((): ComposerSendTimeSlot[] => {
    if (!data?.suggested_send_time) return [];
    return computeComposerSendTimeSlots(
      data.suggested_send_time,
      clubAnalytics?.best_hour_to_send ?? "",
    );
  }, [data?.suggested_send_time, clubAnalytics?.best_hour_to_send]);

  // ── Derived ───────────────────────────────────
  const selectedFamily: ComposerFamilyOption | undefined = COMPOSER_FAMILY_OPTIONS.find(
    (f) => f.id === familyId,
  );
  const tierCtx = selectedFamily ? COMPOSER_TIER_CONTEXT[selectedFamily.tier] : null;
  const riskCtx: ComposerRiskContext | null = memberIntel
    ? getComposerRiskContext(memberIntel.engagementRisk)
    : null;
  const fatigueCtx: ComposerFatigueContext | null = memberIntel
    ? getComposerFatigueContext(memberIntel.fatigueLevel)
    : null;

  // ── Return ────────────────────────────────────
  return {
    // State
    familyId, setFamilyId,
    channel, setChannel,
    occasion, setOccasion,
    selectedAlt, setSelectedAlt,
    // Data
    data,
    clubAnalytics,
    memberIntel,
    textToneProfile,
    toneMatch,
    variantScores,
    sendTimeSlots,
    selectedFamily,
    tierCtx,
    riskCtx,
    fatigueCtx,
    // Status
    isLoading: genQ.isLoading,
    isError: genQ.isError,
    hasData: !!data,
    // Handlers
    handleGenerate,
    handleRegenerate,
    handleCopy,
  };
}