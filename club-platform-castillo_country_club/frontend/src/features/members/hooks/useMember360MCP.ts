/**
 * Member 360 MCP Hooks — Data queries + action mutations.
 * 10 data hooks + 2 action hooks.
 * All use useMCPQuery/useMCPMutation from shared.
 */

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import type {
  Member360ProfileResponse,
  MemberHealthScoreResponse,
  MemberJourneyResponse,
  MemberChurnPredictionResponse,
  MemberLTVAnalysisResponse,
  MemberActivitySummaryResponse,
  MemberSocialProfileResponse,
  MemberEngagementProposalsResponse,
  MemberRiskAssessmentResponse,
  SearchMembers360Response,
} from "../types";

const SERVER = "member_360";
const STALE_TIME = 120_000; // 2 min

// ─── Data Hooks ─────────────────────────────────────────────────────────────

export function useMember360Profile(memberId: string, enabled = true) {
  return useMCPQuery<Member360ProfileResponse>(
    SERVER,
    "get_member_360_profile",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useMemberHealthScore(memberId: string, enabled = true) {
  return useMCPQuery<MemberHealthScoreResponse>(
    SERVER,
    "get_member_health_score",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useMemberJourney(memberId: string, enabled = true) {
  return useMCPQuery<MemberJourneyResponse>(
    SERVER,
    "get_member_journey",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useMemberChurnPrediction(memberId: string, enabled = true) {
  return useMCPQuery<MemberChurnPredictionResponse>(
    SERVER,
    "get_member_churn_prediction",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useMemberLTVAnalysis(memberId: string, enabled = true) {
  return useMCPQuery<MemberLTVAnalysisResponse>(
    SERVER,
    "get_member_ltv_analysis",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useMemberActivitySummary(memberId: string, periodDays = 90, enabled = true) {
  return useMCPQuery<MemberActivitySummaryResponse>(
    SERVER,
    "get_member_activity_summary",
    { member_id: memberId, period_days: periodDays },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useMemberSocialProfile(memberId: string, enabled = true) {
  return useMCPQuery<MemberSocialProfileResponse>(
    SERVER,
    "get_member_social_profile",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useMemberEngagementProposals(memberId: string, enabled = false) {
  return useMCPQuery<MemberEngagementProposalsResponse>(
    SERVER,
    "generate_member_engagement_proposals",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: 0 } // no cache — fresh proposals each time
  );
}

export function useMemberRiskAssessment(memberId: string, enabled = false) {
  return useMCPQuery<MemberRiskAssessmentResponse>(
    SERVER,
    "get_member_risk_assessment",
    { member_id: memberId },
    { enabled: !!memberId && enabled, staleTime: STALE_TIME }
  );
}

export function useSearchMembers360(params?: {
  query?: string;
  tier?: string;
  health_level?: string;
  churn_risk?: string;
  journey_stage?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}) {
  return useMCPQuery<SearchMembers360Response>(
    SERVER,
    "search_members_360",
    params ?? {},
    { staleTime: STALE_TIME }
  );
}

// ─── Action Hooks ───────────────────────────────────────────────────────────

/**
 * Generic action hook for future mutations.
 * Currently all 10 tools are AUTO (intelligence/data, no side effects).
 * Reserved for future tools that may require HITL approval.
 */
export function useMember360Action(toolName: string) {
  return useMCPMutation(SERVER, toolName);
}
