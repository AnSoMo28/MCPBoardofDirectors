// src/features/communications/hooks/useCommunicationDashboard.ts
// ═══════════════════════════════════════════════════════════
// Communication Dashboard — Neural Hub
// Castillo Country Club — Phase 31 "The Voice"
//
// The brain behind the Communication Command Center.
// Aggregates intelligence from all communication engines:
// - Communication Intelligence Engine (fingerprint)
// - Emotional Trajectory (emotional state)
// - Silence Intelligence (silence profile)
// - Narrative Engine (story continuity)
// - Temporal Router (timing optimization)
//
// Derives: dashboard mode, intelligence stream, alerts,
// signals, and ambient state.
//
// Follows the same neural hub pattern as useMember360Dashboard.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

import type {
  CommunicationFingerprint,
  EmotionalTrajectory,
  SilenceProfile,
  MessageFatigue,
  NarrativeArc,
  CommunicationIntelligenceBriefing,
  HistoryItem,
  SentimentDataPoint,
  CommunicationPreferencesData,
  SatisfactionTrendsData,
  SilenceLevel,
  EmotionalZone,
  FatigueLevel,
} from "../types";

import {
  deriveSilenceLevel,
  deriveFatigueLevel,
  deriveEmotionalZone,
} from "../types";

import {
  COMMUNICATION_MCP_TOOLS,
  COMMUNICATION_FRESHNESS_TIERS,
  COMMUNICATION_AMBIENT_CONFIG,
  deriveCommDashboardMode,
  deriveInterventionUrgency,
} from "../config";

import {
  buildCommunicationFingerprint,
  deriveEmotionalTrajectory,
  buildSilenceProfile,
  computeMessageFatigue,
  buildConversationGraph,
  buildNarrativeArc,
  disengagementRisk,
  generateCommunicationBriefing,
} from "../lib/communicationIntelligence";

// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════

/**
 * A single item in the Communication Intelligence Stream.
 * Priority-sorted: the most important signal surfaces first.
 */
export interface CommStreamItem {
  id: string;
  priority: number;
  category:
    | "silence"
    | "emotion"
    | "fatigue"
    | "narrative"
    | "risk"
    | "positive"
    | "optimization"
    | "insight";
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  actionable: boolean;
  icon: string;
}

/**
 * Communication Alert — a time-sensitive signal requiring attention.
 * Distinct from stream items: alerts are fewer, more urgent,
 * and demand explicit acknowledgment or action.
 */
export interface CommAlert {
  id: string;
  type: "silence_critical" | "fatigue_overload" | "emotional_crisis" | "narrative_breaking" | "cascade_risk";
  title: string;
  description: string;
  urgency: "high" | "critical";
  timestamp: string;
}

/**
 * Ambient state — drives the Communication Dashboard's
 * breathing background animation.
 */
export interface CommAmbientState {
  mode: "calm" | "alert" | "critical";
  pulseSpeed: number;
  intensity: number;
  color: string;
  gradient: string;
}

/**
 * Complete dashboard state — everything the Communication
 * Command Center needs to render.
 */
export interface CommDashboardState {
  // Intelligence data
  fingerprint: CommunicationFingerprint | null;
  trajectory: EmotionalTrajectory | null;
  silence: SilenceProfile | null;
  fatigue: MessageFatigue | null;
  narrative: NarrativeArc | null;
  briefing: CommunicationIntelligenceBriefing | null;

  // Derived state
  dashboardMode: "calm" | "alert" | "critical";
  ambient: CommAmbientState;
  streamItems: CommStreamItem[];
  alerts: CommAlert[];

  // Composite scores
  interventionUrgency: "none" | "low" | "medium" | "high" | "critical";
  disengagementRiskScore: number;

  // Derived levels (for data-attributes)
  silenceLevel: SilenceLevel;
  emotionalZone: EmotionalZone;
  fatigueLevel: FatigueLevel;

  // Loading / error
  isLoading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════
// STREAM ITEM GENERATORS — Private
// ═══════════════════════════════════════════════════════════

function buildSilenceStreamItems(
  silence: SilenceProfile,
): CommStreamItem[] {
  const items: CommStreamItem[] = [];
  const level = deriveSilenceLevel(silence.current_silence_days);

  if (level === "critical") {
    items.push({
      id: "silence-critical",
      priority: 100,
      category: "silence",
      title: "Silencio crítico",
      description: `${silence.current_silence_days} días sin contacto — punto de no retorno cercano`,
      severity: "critical",
      actionable: true,
      icon: "alert-triangle",
    });
  } else if (level === "alert") {
    items.push({
      id: "silence-alert",
      priority: 75,
      category: "silence",
      title: "Silencio prolongado",
      description: `${silence.current_silence_days} días sin contacto — atención requerida`,
      severity: "high",
      actionable: true,
      icon: "alert-circle",
    });
  } else if (level === "warning") {
    items.push({
      id: "silence-warning",
      priority: 50,
      category: "silence",
      title: "Silencio detectado",
      description: `${silence.current_silence_days} días sin contacto — monitorear`,
      severity: "medium",
      actionable: false,
      icon: "clock",
    });
  }

  if (silence.disengagement_risk > 0.6) {
    items.push({
      id: "silence-disengagement",
      priority: 90,
      category: "risk",
      title: "Riesgo de desengagement",
      description: `${Math.round(silence.disengagement_risk * 100)}% de probabilidad — intervención necesaria`,
      severity: "critical",
      actionable: true,
      icon: "user-x",
    });
  }

  return items;
}

function buildEmotionStreamItems(
  trajectory: EmotionalTrajectory,
): CommStreamItem[] {
  const items: CommStreamItem[] = [];
  const zone = deriveEmotionalZone(trajectory.current.score);

  if (zone === "crisis") {
    items.push({
      id: "emotion-crisis",
      priority: 90,
      category: "emotion",
      title: "Crisis emocional",
      description: `Score emocional en ${trajectory.current.score}/100 — intervención urgente`,
      severity: "critical",
      actionable: true,
      icon: "heart-crack",
    });
  } else if (zone === "at_risk") {
    items.push({
      id: "emotion-at-risk",
      priority: 70,
      category: "emotion",
      title: "Emoción en riesgo",
      description: `Score descendente a ${trajectory.current.score}/100`,
      severity: "high",
      actionable: true,
      icon: "trending-down",
    });
  }

  if (trajectory.trajectory === "descending" && trajectory.velocity < -5) {
    items.push({
      id: "emotion-declining",
      priority: 65,
      category: "emotion",
      title: "Descenso emocional acelerado",
      description: `Velocidad: ${trajectory.velocity.toFixed(1)} pts/semana`,
      severity: "high",
      actionable: true,
      icon: "trending-down",
    });
  }

  if (trajectory.forecast.intervention_window) {
    items.push({
      id: "emotion-intervention-window",
      priority: 60,
      category: "emotion",
      title: "Ventana de intervención activa",
      description: `Proyección 7d: ${trajectory.forecast.predicted_score_7d}/100 — actuar ahora`,
      severity: "medium",
      actionable: true,
      icon: "clock",
    });
  }

  // Positive: resonance events
  if (trajectory.resonance_events.length > 0) {
    items.push({
      id: "emotion-resonance",
      priority: 30,
      category: "positive",
      title: `${trajectory.resonance_events.length} evento(s) de resonancia`,
      description: "Experiencias con eco emocional prolongado detectadas",
      severity: "info",
      actionable: false,
      icon: "sparkles",
    });
  }

  return items;
}

function buildFatigueStreamItems(
  fatigue: MessageFatigue,
): CommStreamItem[] {
  const items: CommStreamItem[] = [];
  const level = deriveFatigueLevel(fatigue.current_level);

  if (level === "overloaded") {
    items.push({
      id: "fatigue-overloaded",
      priority: 85,
      category: "fatigue",
      title: "Sobrecarga de mensajes",
      description: `${fatigue.messages_received_7d} mensajes en 7 días — riesgo de opt-out: ${Math.round(fatigue.opt_out_risk * 100)}%`,
      severity: "critical",
      actionable: true,
      icon: "bell-off",
    });
  } else if (level === "saturated") {
    items.push({
      id: "fatigue-saturated",
      priority: 60,
      category: "fatigue",
      title: "Saturación de mensajes",
      description: `Nivel de fatiga: ${Math.round(fatigue.current_level * 100)}% — reducir frecuencia`,
      severity: "high",
      actionable: true,
      icon: "bell-minus",
    });
  } else if (level === "elevated") {
    items.push({
      id: "fatigue-elevated",
      priority: 40,
      category: "fatigue",
      title: "Fatiga elevada",
      description: `Tendencia: ${fatigue.trend} — monitorear`,
      severity: "medium",
      actionable: false,
      icon: "bell",
    });
  }

  return items;
}

function buildNarrativeStreamItems(
  narrative: NarrativeArc,
): CommStreamItem[] {
  const items: CommStreamItem[] = [];

  if (narrative.story_health === "breaking") {
    items.push({
      id: "narrative-breaking",
      priority: 80,
      category: "narrative",
      title: "Narrativa fragmentada",
      description: "La historia de comunicación se está rompiendo — intervención necesaria",
      severity: "critical",
      actionable: true,
      icon: "book-open",
    });
  } else if (narrative.story_health === "fragile") {
    items.push({
      id: "narrative-fragile",
      priority: 45,
      category: "narrative",
      title: "Narrativa frágil",
      description: "Continuidad comunicacional perdiendo coherencia",
      severity: "medium",
      actionable: true,
      icon: "book-open",
    });
  }

  if (narrative.open_callbacks.length > 0) {
    items.push({
      id: "narrative-callbacks",
      priority: 55,
      category: "narrative",
      title: `${narrative.open_callbacks.length} compromiso(s) pendiente(s)`,
      description: narrative.open_callbacks[0] ?? "Compromisos sin resolver",
      severity: "medium",
      actionable: true,
      icon: "bookmark",
    });
  }

  if (narrative.chapters.length > 0) {
    const lastChapter = narrative.chapters[narrative.chapters.length - 1];
    if (
      lastChapter &&
      (lastChapter.sentiment === "positive" || lastChapter.sentiment === "very_positive")
    ) {
      items.push({
        id: "narrative-positive",
        priority: 20,
        category: "positive",
        title: "Narrativa positiva",
        description: `Último capítulo: "${lastChapter.title}"`,
        severity: "info",
        actionable: false,
        icon: "check-circle",
      });
    }
  }

  return items;
}

// ═══════════════════════════════════════════════════════════
// ALERT GENERATORS — Private
// ═══════════════════════════════════════════════════════════

function buildAlerts(
  silence: SilenceProfile,
  trajectory: EmotionalTrajectory,
  fatigue: MessageFatigue,
  narrative: NarrativeArc,
  cascadeRisk: number,
): CommAlert[] {
  const alerts: CommAlert[] = [];
  const now = new Date().toISOString();

  const silenceLevel = deriveSilenceLevel(silence.current_silence_days);
  if (silenceLevel === "critical") {
    alerts.push({
      id: "alert-silence",
      type: "silence_critical",
      title: "Silencio crítico",
      description: `${silence.current_silence_days} días sin contacto`,
      urgency: "critical",
      timestamp: now,
    });
  }

  const fatigueLevel = deriveFatigueLevel(fatigue.current_level);
  if (fatigueLevel === "overloaded") {
    alerts.push({
      id: "alert-fatigue",
      type: "fatigue_overload",
      title: "Sobrecarga de mensajes",
      description: `${fatigue.messages_received_7d} mensajes en 7 días — opt-out riesgo: ${Math.round(fatigue.opt_out_risk * 100)}%`,
      urgency: "high",
      timestamp: now,
    });
  }

  const emotionalZone = deriveEmotionalZone(trajectory.current.score);
  if (emotionalZone === "crisis") {
    alerts.push({
      id: "alert-emotion",
      type: "emotional_crisis",
      title: "Crisis emocional",
      description: `Score: ${trajectory.current.score}/100`,
      urgency: "critical",
      timestamp: now,
    });
  }

  if (narrative.story_health === "breaking") {
    alerts.push({
      id: "alert-narrative",
      type: "narrative_breaking",
      title: "Narrativa rota",
      description: "La comunicación ha perdido continuidad",
      urgency: "high",
      timestamp: now,
    });
  }

  if (cascadeRisk > 0.5) {
    alerts.push({
      id: "alert-cascade",
      type: "cascade_risk",
      title: "Riesgo de cascada social",
      description: `Conexiones sociales en riesgo por desengagement (score: ${Math.round(cascadeRisk * 100)}%)`,
      urgency: "high",
      timestamp: now,
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════
// AMBIENT STATE — Private
// ═══════════════════════════════════════════════════════════

function deriveAmbient(mode: "calm" | "alert" | "critical"): CommAmbientState {
  const config = COMMUNICATION_AMBIENT_CONFIG[mode];
  return {
    mode,
    pulseSpeed: config.pulseSpeed,
    intensity: config.intensity,
    color: config.color,
    gradient: config.gradient,
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Communication Dashboard Neural Hub.
 *
 * Aggregates all communication intelligence engines into
 * a single reactive state object. The dashboard component
 * only needs this hook — it gets everything it needs.
 *
 * Data flow:
 * MCP queries → raw data → pure functions → derived intelligence
 *
 * @param memberId Optional — when provided, computes per-member
 *   intelligence (fingerprint, trajectory, silence). When omitted,
 *   returns global communication health only.
 */
export function useCommunicationDashboard(memberId?: string) {
  // ── Data fetching ──────────────────────────────────────

  const historyQuery = useMCPQuery(
    memberId
      ? COMMUNICATION_MCP_TOOLS.GET_MEMBER_COMMUNICATION_HISTORY
      : COMMUNICATION_MCP_TOOLS.GET_COMMUNICATION_HISTORY,
    memberId ?? "",
    {
      staleTime: COMMUNICATION_FRESHNESS_TIERS.warm.maxAge,
    },
  );

  const sentimentQuery = useMCPQuery(
    COMMUNICATION_MCP_TOOLS.GET_SENTIMENT_DATA,
    memberId ?? "all",
    {
      staleTime: COMMUNICATION_FRESHNESS_TIERS.warm.maxAge,
    },
  );

  const preferencesQuery = useMCPQuery(
    COMMUNICATION_MCP_TOOLS.GET_PREFERENCES,
    memberId ?? "",
    {
      staleTime: COMMUNICATION_FRESHNESS_TIERS.stale.maxAge,
      enabled: !!memberId,
    },
  );

  const satisfactionQuery = useMCPQuery(
    COMMUNICATION_MCP_TOOLS.GET_SENTIMENT_TRENDS,
    memberId ?? "all",
    {
      staleTime: COMMUNICATION_FRESHNESS_TIERS.stale.maxAge,
    },
  );

  // ── Raw data extraction ────────────────────────────────

  const history: HistoryItem[] = useMemo(() => {
    const raw = historyQuery.data as { history?: HistoryItem[] } | undefined;
    return raw?.history ?? [];
  }, [historyQuery.data]);

  const sentimentData: SentimentDataPoint[] = useMemo(() => {
    const raw = sentimentQuery.data as { data_points?: SentimentDataPoint[] } | undefined;
    return raw?.data_points ?? [];
  }, [sentimentQuery.data]);

  const preferences: CommunicationPreferencesData | null = useMemo(() => {
    const raw = preferencesQuery.data as { preferences?: CommunicationPreferencesData } | undefined;
    return raw?.preferences ?? null;
  }, [preferencesQuery.data]);

  const satisfaction: SatisfactionTrendsData | null = useMemo(() => {
    const raw = satisfactionQuery.data as { trends?: SatisfactionTrendsData } | undefined;
    return raw?.trends ?? null;
  }, [satisfactionQuery.data]);

  // ── Intelligence computation (pure functions) ──────────

  const fingerprint: CommunicationFingerprint | null = useMemo(() => {
    if (!memberId || history.length === 0) return null;
    return buildCommunicationFingerprint(memberId, history, preferences);
  }, [memberId, history, preferences]);

  const trajectory: EmotionalTrajectory | null = useMemo(() => {
    if (!memberId) return null;
    return deriveEmotionalTrajectory(memberId, sentimentData, satisfaction);
  }, [memberId, sentimentData, satisfaction]);

  const silence: SilenceProfile | null = useMemo(() => {
    if (!memberId || history.length === 0) return null;
    return buildSilenceProfile(memberId, history);
  }, [memberId, history]);

  const fatigue: MessageFatigue | null = useMemo(() => {
    if (!memberId) return null;
    return computeMessageFatigue(memberId, history);
  }, [memberId, history]);

  const narrative: NarrativeArc | null = useMemo(() => {
    if (!memberId || history.length === 0) return null;
    const nodes = buildConversationGraph(memberId, history);
    return buildNarrativeArc(memberId, nodes);
  }, [memberId, history]);

  // ── Composite scores ───────────────────────────────────

  const disengagementRiskScore = useMemo(() => {
    if (!silence || !fatigue || !trajectory) return 0;
    return disengagementRisk(silence, fatigue, trajectory);
  }, [silence, fatigue, trajectory]);

  const interventionUrgency = useMemo(() => {
    if (!silence || !fatigue || !trajectory) return "none" as const;
    return deriveInterventionUrgency(
      silence.current_silence_days,
      fatigue.current_level,
      trajectory.current.score,
      disengagementRiskScore,
    );
  }, [silence, fatigue, trajectory, disengagementRiskScore]);

  // ── Derived levels (for data-attributes) ───────────────

  const silenceLevel: SilenceLevel = useMemo(
    () => (silence ? deriveSilenceLevel(silence.current_silence_days) : "normal"),
    [silence],
  );

  const emotionalZone: EmotionalZone = useMemo(
    () => (trajectory ? deriveEmotionalZone(trajectory.current.score) : "stable"),
    [trajectory],
  );

  const fatigueLevel: FatigueLevel = useMemo(
    () => (fatigue ? deriveFatigueLevel(fatigue.current_level) : "fresh"),
    [fatigue],
  );

  // ── Dashboard mode (Adaptive Morphism) ─────────────────

  const dashboardMode = useMemo(
    () => deriveCommDashboardMode(silenceLevel, fatigueLevel, emotionalZone),
    [silenceLevel, fatigueLevel, emotionalZone],
  );

  const ambient = useMemo(
    () => deriveAmbient(dashboardMode),
    [dashboardMode],
  );

  // ── Intelligence Stream ────────────────────────────────

  const streamItems = useMemo(() => {
    const items: CommStreamItem[] = [];

    if (silence) items.push(...buildSilenceStreamItems(silence));
    if (trajectory) items.push(...buildEmotionStreamItems(trajectory));
    if (fatigue) items.push(...buildFatigueStreamItems(fatigue));
    if (narrative) items.push(...buildNarrativeStreamItems(narrative));

    // Sort by priority descending
    items.sort(
      (a: CommStreamItem, b: CommStreamItem) => b.priority - a.priority,
    );

    return items;
  }, [silence, trajectory, fatigue, narrative]);

  // ── Alerts ─────────────────────────────────────────────

  const alerts = useMemo(() => {
    if (!silence || !trajectory || !fatigue || !narrative) return [];
    return buildAlerts(
      silence,
      trajectory,
      fatigue,
      narrative,
      disengagementRiskScore,
    );
  }, [silence, trajectory, fatigue, narrative, disengagementRiskScore]);

  // ── Briefing ───────────────────────────────────────────

  const briefing: CommunicationIntelligenceBriefing | null = useMemo(() => {
    if (!fingerprint || !trajectory || !silence || !fatigue || !narrative) {
      return null;
    }
    return generateCommunicationBriefing(
      fingerprint,
      trajectory,
      silence,
      fatigue,
      narrative,
    );
  }, [fingerprint, trajectory, silence, fatigue, narrative]);

  // ── Loading / error ────────────────────────────────────

  const isLoading =
    historyQuery.isLoading ||
    sentimentQuery.isLoading ||
    (!!memberId && preferencesQuery.isLoading);

  const error =
    historyQuery.error?.message ??
    sentimentQuery.error?.message ??
    null;

  // ── Assemble state ─────────────────────────────────────

  return useMemo<CommDashboardState>(
    () => ({
      fingerprint,
      trajectory,
      silence,
      fatigue,
      narrative,
      briefing,
      dashboardMode,
      ambient,
      streamItems,
      alerts,
      interventionUrgency,
      disengagementRiskScore,
      silenceLevel,
      emotionalZone,
      fatigueLevel,
      isLoading,
      error,
    }),
    [
      fingerprint,
      trajectory,
      silence,
      fatigue,
      narrative,
      briefing,
      dashboardMode,
      ambient,
      streamItems,
      alerts,
      interventionUrgency,
      disengagementRiskScore,
      silenceLevel,
      emotionalZone,
      fatigueLevel,
      isLoading,
      error,
    ],
  );
}