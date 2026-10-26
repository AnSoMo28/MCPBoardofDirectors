// ═══════════════════════════════════════════════════════════
// F47-B — Satisfaction Data Hook (4 data sources)
// Keys: .health_score (verified), others inferred
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useSatisfactionAdvisor } from "./useSatisfactionAdvisor";
import type {
  SatisfactionHealthScore,
  SatisfactionIntelligence,
  SatisfactionBenchmarkReport,
  SatisfactionEngagementProposalList,
} from "@/shared/mocks/contracts";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

interface HealthScoreMCPResponse {
  status: string;
  message: string;
  health_score: SatisfactionHealthScore;
}

interface IntelligenceMCPResponse {
  status: string;
  message: string;
  intelligence: SatisfactionIntelligence;
}

interface BenchmarkMCPResponse {
  status: string;
  message: string;
  benchmark: SatisfactionBenchmarkReport;
}

interface ProposalsMCPResponse {
  status: string;
  message: string;
  proposals: SatisfactionEngagementProposalList;
}

export interface UseSatisfactionDataOptions {
  enabled?: boolean;
  staleTime?: number;
  ragContext?: RAGContext[];
}

export function useSatisfactionData(options: UseSatisfactionDataOptions = {}) {
  const { enabled = true, staleTime = 120_000, ragContext } = options;

  const healthQuery = useMCPQuery<HealthScoreMCPResponse>(
    "satisfaction", "get_satisfaction_health_score", {},
    { staleTime, enabled },
  );

  const intelligenceQuery = useMCPQuery<IntelligenceMCPResponse>(
    "satisfaction", "get_satisfaction_intelligence", {},
    { staleTime, enabled },
  );

  const benchmarkQuery = useMCPQuery<BenchmarkMCPResponse>(
    "satisfaction", "get_satisfaction_benchmark", {},
    { staleTime: 300_000, enabled },
  );

  const proposalsQuery = useMCPQuery<ProposalsMCPResponse>(
    "satisfaction", "generate_satisfaction_engagement_proposals", {},
    { staleTime: 300_000, enabled },
  );

  const healthScore: SatisfactionHealthScore | null = useMemo(() => {
    if (!healthQuery.data?.health_score) return null;
    return normalizeEnums(
      healthQuery.data.health_score, "satisfaction.get_satisfaction_health_score",
    ) as SatisfactionHealthScore;
  }, [healthQuery.data]);

  const intelligence: SatisfactionIntelligence | null = useMemo(() => {
    if (!intelligenceQuery.data?.intelligence) return null;
    return normalizeEnums(
      intelligenceQuery.data.intelligence, "satisfaction.get_satisfaction_intelligence",
    ) as SatisfactionIntelligence;
  }, [intelligenceQuery.data]);

  const benchmarks: SatisfactionBenchmarkReport | null = useMemo(() => {
    if (!benchmarkQuery.data?.benchmark) return null;
    return normalizeEnums(
      benchmarkQuery.data.benchmark, "satisfaction.get_satisfaction_benchmark",
    ) as SatisfactionBenchmarkReport;
  }, [benchmarkQuery.data]);

  const proposals: SatisfactionEngagementProposalList | null = useMemo(() => {
    if (!proposalsQuery.data?.proposals) return null;
    return normalizeEnums(
      proposalsQuery.data.proposals, "satisfaction.generate_satisfaction_engagement_proposals",
    ) as SatisfactionEngagementProposalList;
  }, [proposalsQuery.data]);

  const insights = useSatisfactionAdvisor( healthScore, intelligence, benchmarks, proposals , ragContext);

  const queries = [healthQuery, intelligenceQuery, benchmarkQuery, proposalsQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  return {
    insights, healthScore, intelligence, benchmarks, proposals,
    isLoading, isError, error,
    healthQuery, intelligenceQuery, benchmarkQuery, proposalsQuery,
  };
}