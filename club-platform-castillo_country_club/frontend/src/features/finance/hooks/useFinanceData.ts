// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Finance Data Hook
// F47-B — Query Layer Wiring (REFERENCE PATTERN)
//
// Bridges MCP backend → Financial Advisor Engine v2.
// CORRECTED: H-11 (.data key for aiReport), H-12 (flat summary)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useFinancialAdvisor } from "./useFinancialAdvisor";
import type { AiFinancialReport, FinancialSummary } from "../types";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

/** finance.generate_ai_analysis response — inner data at .data key */
interface AiAnalysisMCPResponse {
  status: string;
  message: string;
  data: AiFinancialReport;
}

export interface UseFinanceDataOptions {
  enabled?: boolean;
  staleTime?: number;
  ragContext?: RAGContext[];
}

export function useFinanceData(options: UseFinanceDataOptions = {}) {
  const { enabled = true, staleTime = 120_000, ragContext } = options;

  // ── 1. MCP Queries ──────────────────────────────────────
  // Financial summary: FLAT response (factory returns data at root)
  // AI report: inner data wrapped in .data key

  const summaryQuery = useMCPQuery<FinancialSummary>(
    "finance", "get_financial_summary", {},
    { staleTime, enabled },
  );

  const aiReportQuery = useMCPQuery<AiAnalysisMCPResponse>(
    "finance", "generate_ai_analysis",
    { scope: "financial" },
    { staleTime: 300_000, enabled },
  );

  // ── 2. Extract + Normalize ──────────────────────────────

  const summary: FinancialSummary | null = useMemo(() => {
    if (!summaryQuery.data) return null;
    return normalizeEnums(
      summaryQuery.data, "finance.get_financial_summary",
    ) as FinancialSummary;
  }, [summaryQuery.data]);

  const aiReport: AiFinancialReport | null = useMemo(() => {
    if (!aiReportQuery.data?.data) return null;
    return normalizeEnums(
      aiReportQuery.data.data, "finance.generate_ai_analysis",
    ) as AiFinancialReport;
  }, [aiReportQuery.data]);

  // ── 3. Advisor (25 rules, client-side) ──────────────────

  const insights = useFinancialAdvisor(aiReport, summary, ragContext);

  // ── 4. Combined states ──────────────────────────────────

  const isLoading = summaryQuery.isLoading || aiReportQuery.isLoading;
  const isError = summaryQuery.isError || aiReportQuery.isError;
  const error = summaryQuery.error ?? aiReportQuery.error ?? null;

  return {
    insights, summary, aiReport,
    isLoading, isError, error,
    summaryQuery, aiReportQuery,
  };
}