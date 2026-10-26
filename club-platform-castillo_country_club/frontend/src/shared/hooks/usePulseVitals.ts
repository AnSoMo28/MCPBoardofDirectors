// ═══════════════════════════════════════════════════════════
// Castillo Country Club — The Pulse: Vital Signs Hook
// F47-C — P63 Pattern Implementation
//
// Extracts 10 domain health scores as "vital signs" for the club.
// 7 auto/computed + 3 on-demand (expandable).
//
// Auto-loaded (3 new queries):
//   - Satisfaction (get_satisfaction_health_score)
//   - Guest Pipeline (get_guest_health_score)
//   - Communications (get_communication_analytics → delivery_rate_pct)
//
// On-demand (3 queries, loaded when expandVitals=true):
//   - Sports & Recreation (get_sports_health_summary)
//   - Family Programs (get_activity_health_score)
//   - ML Data Quality (get_data_quality_report)
//
// Computed from existing data (4):
//   - Financial (from aiReport.health_score.total)
//   - Events (computed avg capacity from calendarDays)
//   - Recommendations (100 - pending × 5, from advisor insights)
//   - Global (average of all loaded scores)
//
// Pattern: Option B — 3 auto + 3 on-demand for progressive disclosure.
// Rules: #19 (no auto-load AI), P49 (normalizeEnums), P63 (The Pulse).
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useMCPQuery } from "./useMCPQuery";
import type { AiFinancialReport } from "@/features/finance/types";
import type { CalendarDay } from "@/features/events/types";
import type { GlobalAdvisorInsight } from "@/features/dashboard/types";
import type {
  SatisfactionHealthScore,
  GuestHealthScore,
} from "@/shared/mocks/contracts";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";
import { findChainWithRootCause } from "@/shared/lib/advisor-engine/causal-chain";
import { getScoreColorSafe } from "@/shared/lib/score-utils";
// ── Types ──────────────────────────────────────────────────

export interface PulseVital {
  id: string;
  label: string;
  score: number | null;
  color: string;
  trend: "improving" | "stable" | "declining" | null;
  isLoading: boolean;
  isOnDemand: boolean;
  isReady: boolean; // false = on-demand not yet triggered
  detail: string;
  /** Causal chain that explains why this vital is in its current state (F49) */
  causalExplanation?: CausalChain;
}

export interface RadarRingData {
  id: string;
  label: string;
  score: number | null;
  radius: number;
  strokeWidth: number;
}

export interface UsePulseVitalsResult {
  vitals: PulseVital[];
  globalScore: number | null;
  criticalCount: number;
  loadedCount: number;
  totalCount: number;
  expandVitals: boolean;
  setExpandVitals: (v: boolean) => void;
  hasOnDemandVitals: boolean;
  radarRings: RadarRingData[];
  warningCount: number;
}

// ── Helpers ────────────────────────────────────────────────


function getScoreColor(score: number | null): string {
  return getScoreColorSafe(score);
}

function mapTrend(
  t: string | undefined,
): "improving" | "stable" | "declining" | null {
  if (t === "improving" || t === "stable" || t === "declining") return t;
  return null;
}

// ── MCP Response Wrappers ──────────────────────────────────

interface SatisfactionHealthMCPResponse {
  status: string;
  message: string;
  health_score: SatisfactionHealthScore;
}

interface GuestHealthMCPResponse {
  status: string;
  message: string;
  health_score: GuestHealthScore;
}

interface CommAnalyticsMCPResponse {
  status: string;
  message: string;
  analytics: { delivery_rate_pct: number };
}

interface SportsHealthMCPResponse {
  status: string;
  message: string;
  health_summary: { score: number; trend?: string };
}

interface AgeGroupHealthMCPResponse {
  status: string;
  message: string;
  health_score: { score: number; trend?: string };
}

interface DataQualityMCPResponse {
  status: string;
  message: string;
  quality_report: { overall_score: number };
}

// ── Hook ───────────────────────────────────────────────────

export function usePulseVitals(options: {
  aiReport: AiFinancialReport | null;
  calendarDays: CalendarDay[] | null;
  advisorInsights: GlobalAdvisorInsight[];
  causalChains?: CausalChain[];
}): UsePulseVitalsResult {
  const { aiReport, calendarDays, advisorInsights, causalChains } = options;
  const [expandVitals, setExpandVitals] = useState(false);

  // ── Auto-loaded queries (3) ─────────────────────────────

  const satisfactionQ = useMCPQuery<SatisfactionHealthMCPResponse>(
    "satisfaction", "get_satisfaction_health_score", {},
    { staleTime: 300_000 },
  );

  const guestQ = useMCPQuery<GuestHealthMCPResponse>(
    "guest_management", "get_guest_health_score", {},
    { staleTime: 300_000 },
  );

  const commQ = useMCPQuery<CommAnalyticsMCPResponse>(
    "communication", "get_communication_analytics", {},
    { staleTime: 300_000 },
  );

  // ── On-demand queries (3) ───────────────────────────────

  const sportsQ = useMCPQuery<SportsHealthMCPResponse>(
    "sports_recreation", "get_sports_health_summary", {},
    { staleTime: 300_000, enabled: expandVitals },
  );

  const ageGroupQ = useMCPQuery<AgeGroupHealthMCPResponse>(
    "age_group", "get_activity_health_score", {},
    { staleTime: 300_000, enabled: expandVitals },
  );

  const mlQ = useMCPQuery<DataQualityMCPResponse>(
    "ml_intelligence", "get_data_quality_report", {},
    { staleTime: 300_000, enabled: expandVitals },
  );

  // ── Computed scores ─────────────────────────────────────

  // 1. Financial: from aiReport (already loaded by useGlobalData)
  const financialScore = useMemo(() => {
    if (!aiReport?.health_score) return null;
    return aiReport.health_score.total;
  }, [aiReport]);

  const financialTrend = useMemo(() => {
    if (!aiReport?.health_score) return null;
    const t = aiReport.health_score.trend_vs_previous;
    if (t > 2) return "improving" as const;
    if (t < -2) return "declining" as const;
    return "stable" as const;
  }, [aiReport]);

  // 2. Events: avg capacity utilization from calendarDays
  const eventsScore = useMemo(() => {
    if (!calendarDays?.length) return null;
    const eventsWithCapacity = calendarDays.flatMap(
      (d) => d.events ?? [],
    ).filter((e) => e.max_capacity > 0);
    if (eventsWithCapacity.length === 0) return null;
    const avgUtil =
      eventsWithCapacity.reduce(
        (sum, e) => sum + (e.current_attendance / e.max_capacity) * 100,
        0,
      ) / eventsWithCapacity.length;
    return Math.round(avgUtil);
  }, [calendarDays]);

  // 9. Recommendations: inverse of pending action count
  const recommendationsScore = useMemo(() => {
    const highSeverity = advisorInsights.filter(
      (i) => i.impact === "high",
    ).length;
    const score = Math.max(0, 100 - highSeverity * 12);
    return advisorInsights.length > 0 ? score : null;
  }, [advisorInsights]);

  // ── Extract auto-loaded scores ──────────────────────────

  const satisfactionScore = satisfactionQ.data?.health_score?.score ?? null;
  const satisfactionTrend = mapTrend(satisfactionQ.data?.health_score?.trend);

  const guestScore = guestQ.data?.health_score?.score ?? null;
  const guestTrend = mapTrend(guestQ.data?.health_score?.trend);

  const commScore = commQ.data?.analytics?.delivery_rate_pct ?? null;

  // ── Extract on-demand scores ────────────────────────────

  const sportsScore = sportsQ.data?.health_summary?.score ?? null;
  const sportsTrend = mapTrend(sportsQ.data?.health_summary?.trend);

  const ageGroupScore = ageGroupQ.data?.health_score?.score ?? null;
  const ageGroupTrend = mapTrend(ageGroupQ.data?.health_score?.trend);

  const mlScore = mlQ.data?.quality_report?.overall_score ?? null;

  // ── Build vitals array ──────────────────────────────────

  const vitals = useMemo<PulseVital[]>(
    () => [
      {
        id: "financial",
        label: "Financiero",
        score: financialScore,
        color: getScoreColor(financialScore),
        trend: financialTrend,
        isLoading: false,
        isOnDemand: false,
        isReady: true,
        detail: aiReport?.health_score
          ? `Score ${financialScore}/100 — ${aiReport.health_score.grade}`
          : "Sin datos",
        causalExplanation: Array.isArray(causalChains) && causalChains.length > 0
          ? findChainWithRootCause(causalChains, "financial")
          : undefined,
      },
      {
        id: "events",
        label: "Eventos",
        score: eventsScore,
        color: getScoreColor(eventsScore),
        trend: null,
        isLoading: false,
        isOnDemand: false,
        isReady: true,
        detail: calendarDays
          ? `${eventsScore}% utilización promedio`
          : "Sin datos",
        causalExplanation: Array.isArray(causalChains) && causalChains.length > 0
          ? findChainWithRootCause(causalChains, "events")
          : undefined,
      },
      {
        id: "satisfaction",
        label: "Satisfacción",
        score: satisfactionScore,
        color: getScoreColor(satisfactionScore),
        trend: satisfactionTrend,
        isLoading: satisfactionQ.isLoading,
        isOnDemand: false,
        isReady: true,
        detail: satisfactionQ.data?.health_score?.summary ?? "Cargando...",
        causalExplanation: Array.isArray(causalChains) && causalChains.length > 0
          ? findChainWithRootCause(causalChains, "satisfaction")
          : undefined,
      },
      {
        id: "guest",
        label: "Invitados",
        score: guestScore,
        color: getScoreColor(guestScore),
        trend: guestTrend,
        isLoading: guestQ.isLoading,
        isOnDemand: false,
        isReady: true,
        detail: guestQ.data?.health_score?.summary ?? "Cargando...",
      },
      {
        id: "communications",
        label: "Comunicación",
        score: commScore,
        color: getScoreColor(commScore),
        trend: null,
        isLoading: commQ.isLoading,
        isOnDemand: false,
        isReady: true,
        detail: commScore !== null
          ? `${commScore}% tasa de entrega`
          : "Cargando...",
        causalExplanation: Array.isArray(causalChains) && causalChains.length > 0
          ? findChainWithRootCause(causalChains, "engagement")
          : undefined,
      },
      {
        id: "sports",
        label: "Deportes",
        score: sportsScore,
        color: getScoreColor(sportsScore),
        trend: sportsTrend,
        isLoading: expandVitals && sportsQ.isLoading,
        isOnDemand: true,
        isReady: expandVitals,
        detail: sportsQ.data?.health_summary
          ? `Score ${sportsScore}/100`
          : expandVitals
            ? "Cargando..."
            : "Expandir para ver",
      },
      {
        id: "family",
        label: "Familias",
        score: ageGroupScore,
        color: getScoreColor(ageGroupScore),
        trend: ageGroupTrend,
        isLoading: expandVitals && ageGroupQ.isLoading,
        isOnDemand: true,
        isReady: expandVitals,
        detail: ageGroupQ.data?.health_score
          ? `Score ${ageGroupScore}/100`
          : expandVitals
            ? "Cargando..."
            : "Expandir para ver",
      },
      {
        id: "ml",
        label: "Datos ML",
        score: mlScore,
        color: getScoreColor(mlScore),
        trend: null,
        isLoading: expandVitals && mlQ.isLoading,
        isOnDemand: true,
        isReady: expandVitals,
        detail: mlQ.data?.quality_report
          ? `Calidad: ${mlScore}/100`
          : expandVitals
            ? "Cargando..."
            : "Expandir para ver",
      },
      {
        id: "recommendations",
        label: "Acciones",
        score: recommendationsScore,
        color: getScoreColor(recommendationsScore),
        trend: null,
        isLoading: false,
        isOnDemand: false,
        isReady: true,
        detail: advisorInsights.length > 0
          ? `${advisorInsights.filter((i) => i.impact === "high").length} acciones de alta prioridad`
          : "Sin acciones pendientes",
      },
    ],
    [
      financialScore, financialTrend, aiReport,
      eventsScore, calendarDays,
      satisfactionScore, satisfactionTrend, satisfactionQ.isLoading, satisfactionQ.data,
      guestScore, guestTrend, guestQ.isLoading, guestQ.data,
      commScore, commQ.isLoading, commQ.data,
      sportsScore, sportsTrend, expandVitals, sportsQ.isLoading, sportsQ.data,
      ageGroupScore, ageGroupTrend, ageGroupQ.isLoading, ageGroupQ.data,
      mlScore, mlQ.isLoading, mlQ.data,
      recommendationsScore, advisorInsights,
      causalChains,
    ],
  );

  // ── Global score: average of all loaded ─────────────────

  const loadedVitals = vitals.filter((v) => v.score !== null);
  const globalScore =
    loadedVitals.length > 0
      ? Math.round(
          loadedVitals.reduce((sum, v) => sum + (v.score ?? 0), 0) /
            loadedVitals.length,
        )
      : null;

  const criticalCount = vitals.filter(
    (v) => v.score !== null && v.score < 50,
  ).length;

  const hasOnDemandVitals = vitals.some((v) => v.isOnDemand);

  const warningCount = vitals.filter(
    (v) => v.score !== null && v.score >= 50 && v.score < 65,
  ).length;

  const radarRings = useMemo<RadarRingData[]>(() => {
    const avg = (...scores: (number | null)[]) => {
      const valid = scores.filter((s): s is number => s != null);
      return valid.length > 0
        ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
        : null;
    };
    return [
      { id: "financial", label: "Finanzas", score: financialScore, radius: 120, strokeWidth: 8 },
      { id: "membership", label: "Miembros", score: avg(ageGroupScore, guestScore, recommendationsScore), radius: 95, strokeWidth: 7 },
      { id: "operational", label: "Operaciones", score: avg(eventsScore, sportsScore, satisfactionScore, commScore), radius: 72, strokeWidth: 6 },
      { id: "intelligence", label: "Inteligencia", score: mlScore, radius: 50, strokeWidth: 5 },
    ];
  }, [financialScore, ageGroupScore, guestScore, recommendationsScore, eventsScore, sportsScore, satisfactionScore, commScore, mlScore]);

  return {
    vitals: [
      ...vitals,
      // Global score as last vital
      {
        id: "global",
        label: "Club",
        score: globalScore,
        color: getScoreColor(globalScore),
        trend: null,
        isLoading: false,
        isOnDemand: false,
        isReady: true,
        detail: `${loadedVitals.length}/${vitals.length} dominios evaluados`,
      },
    ],
    globalScore,
    criticalCount,
    loadedCount: loadedVitals.length,
    totalCount: vitals.length + 1, // +1 for global
    expandVitals,
    setExpandVitals,
    hasOnDemandVitals,
    radarRings,
    warningCount,
  };
}