/* ═══════════════════════════════════════════════════════════════
   features/wellness/hooks/useWellnessDashboard.ts

   Castillo Country Club — Wellness Dashboard Orchestrator
   v37 — Adaptive Morphism + Intelligence Pipeline

   Manages: family selection, date ranges, all queries,
   advisor insights, action execution, adaptive mode.

   Adaptive Modes (P1):
     calm     — score ≥ 70 — spacious, teal/emerald
     alert    — score 30-70 — compact, amber
     critical — score < 30 — emergency, red
   ═══════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth.store";
import { callMCPTool } from "@/shared/lib/api";
import { showToast } from "@/shared/components/ui/Toast";
import {
  generateReactionInsight,
  generateExecutingReaction,
} from "@/shared/lib/reactionTemplate";

import { useWellnessQueries } from "./useWellnessQueries";
import { useWellnessAdvisor } from "./useWellnessAdvisor";
import { calculateWellnessScore } from "../types";
import type { WellnessAdvisorInsight, WellnessMode } from "../types";
import type {
  AdvisorReactionInsight,
  AdvisorAction,
} from "@/features/dashboard/types";

/**
 * P2-C3g C16 — shape real de family_search: FamilyBrief
 * (backend/src/club_mcp/models/family.py · 7 campos snake_case).
 * Deuda C3h: unificar con el Family compartido (14 camelCase).
 */
interface SelectedFamily {
  id: string;
  name: string;
  tier: string;
  status: string;
  member_count: number;
  engagement_score: number;
  join_date: string;
}

// ═══════════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════════

function computeDateRanges() {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  const from = new Date(now);
  from.setDate(from.getDate() - 30);

  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);

  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - 30);

  return {
    dateFrom: from.toISOString().split("T")[0],
    dateTo: to,
    prevDateFrom: prevFrom.toISOString().split("T")[0],
    prevDateTo: prevTo.toISOString().split("T")[0],
  };
}

// ═══════════════════════════════════════════════════════════════
// §3  Hook
// ═══════════════════════════════════════════════════════════════

export function useWellnessDashboard(propFamilyId?: string) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "JUNTA";
  const queryClient = useQueryClient();

  // ── State ─────────────────────────────────────────────────

  const [selectedFamily, setSelectedFamily] = useState<SelectedFamily | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [reactions, setReactions] = useState<AdvisorReactionInsight[]>(
    [],
  );
  const [actionStates, setActionStates] = useState<
    Record<string, string>
  >({});
  const [modalInsight, setModalInsight] =
    useState<WellnessAdvisorInsight | null>(null);

  // ── Family resolution ────────────────────────────────────

  const familyId =
    propFamilyId || user?.familyId || selectedFamily?.id || "";

  // ── Date ranges ──────────────────────────────────────────

  const { dateFrom, dateTo, prevDateFrom, prevDateTo } = useMemo(
    computeDateRanges,
    [],
  );

  // ── All queries ──────────────────────────────────────────

  const queries = useWellnessQueries({
    familyId,
    dateFrom,
    dateTo,
    prevDateFrom,
    prevDateTo,
  });

  // ── Advisor insights ─────────────────────────────────────

  const advisorInsights = useWellnessAdvisor({
    report: queries.reportData,
    previousReport: queries.prevReportData,
    profile: queries.profileData,
    recommendations: queries.recommendationsData,
    anomalies: queries.anomaliesData?.anomalies ?? [],
    alerts: queries.anomaliesData?.alerts ?? [],
    predictions: queries.predictionsData
      ? {
          predictions: queries.predictionsData.predictions,
          recommended_interventions:
            queries.predictionsData.recommended_interventions,
        }
      : undefined,
  });

  // ── Adaptive Mode (P1) ───────────────────────────────────

  const mode = useMemo((): WellnessMode => {
    if (!queries.reportData) return "calm";
    const scoreData = calculateWellnessScore(
      queries.reportData,
      queries.prevReportData ?? undefined,
    );
    if (scoreData.composite < 30) return "critical";
    if (scoreData.composite < 70) return "alert";
    return "calm";
  }, [queries.reportData, queries.prevReportData]);

  // ── Current score for Segment Spotlight ───────────────────

  const currentScore = useMemo(() => {
    if (!queries.reportData) return 0;
    return calculateWellnessScore(
      queries.reportData,
      queries.prevReportData ?? undefined,
    ).composite;
  }, [queries.reportData, queries.prevReportData]);

  // ── Action execution ─────────────────────────────────────

  const executeAction = useCallback(
    async (insight: WellnessAdvisorInsight) => {
      const action = insight.action!;
      try {
        const execReaction = generateExecutingReaction(
          action as unknown as AdvisorAction,
          insight.id,
        );
        setReactions((prev) => [execReaction, ...prev]);

        await callMCPTool(action.server, action.tool, action.params);

        setReactions((prev) =>
          prev.filter((r) => r.id !== execReaction.id),
        );
        const reaction = generateReactionInsight(
          action as unknown as AdvisorAction,
          insight.id,
        );
        setReactions((prev) => [reaction, ...prev]);
        setActionStates((prev) => ({
          ...prev,
          [insight.id]: "done",
        }));
        showToast({ type: "success", message: action.label });
        queryClient.invalidateQueries({ queryKey: ["wellness"] });
      } catch {
        setReactions((prev) =>
          prev.filter((r) => r.sourceInsightId !== insight.id),
        );
        showToast({
          type: "error",
          message: "Error al ejecutar la acción",
        });
      }
    },
    [queryClient],
  );

  const handleExecute = useCallback(
    (insightId: string) => {
      const insight = advisorInsights.find((i) => i.id === insightId);
      if (!insight?.action) return;
      if (insight.action.approvalLevel === "auto") {
        executeAction(insight);
      } else {
        setModalInsight(insight);
      }
    },
    [advisorInsights, executeAction],
  );

  const handleModalConfirm = useCallback(async () => {
    if (!modalInsight) return;
    await executeAction(modalInsight);
    setModalInsight(null);
  }, [modalInsight, executeAction]);

  // ── Family selection ─────────────────────────────────────

  const handleFamilySelect = useCallback((family: SelectedFamily) => {
    setSelectedFamily(family);
    setReactions([]);
    setActionStates({});
  }, []);

  const resetFamily = useCallback(() => {
    setSelectedFamily(null);
    setReactions([]);
    setActionStates({});
  }, []);

  // ── Derived ──────────────────────────────────────────────

  const familyName =
    queries.profileData?.family_name ||
    selectedFamily?.name ||
    "Familia";

  return {
    isAdmin,
    familyId,
    familyName,
    selectedFamily,
    handleFamilySelect,
    resetFamily,
    dateFrom,
    dateTo,
    ...queries,
    advisorInsights,
    reactions,
    actionStates,
    modalInsight,
    setModalInsight,
    handleExecute,
    handleModalConfirm,
    mode,
    currentScore,
    activeTab,
    setActiveTab,
    refetchReport: queries.report.refetch,
  };
}