/**
 * useCulturalData — Data Orchestrator Hook (Hook 1 of Two-Hook Pattern)
 *
 * Responsible for ONE thing: fetching and caching all MCP data
 * that the Cultural domain needs. No computation, no transformation,
 * no business logic — pure data orchestration.
 *
 * Uses useMCPQuery for each backend call with appropriate stale times
 * from CULTURAL_FRESHNESS_TIERS in config.ts.
 *
 * Two-Hook Pattern:
 * ┌─────────────────────┐     ┌──────────────────────────┐
 * │  useCulturalData    │────▶│  useCulturalDashboard    │
 * │  (Data Orchestrator)│     │  (Neural Hub)            │
 * │                     │     │                          │
 * │  10 MCP queries     │     │  engines §C1-§C10        │
 * │  stale time mgmt    │     │  advisor R1-R20          │
 * │  loading/error      │     │  deriveCulturalDashboard │
 * └─────────────────────┘     └──────────────────────────┘
 *
 * @module cultural/hooks/useCulturalData
 */

import { useMemo } from 'react';

import { useMCPQuery } from '@/shared/hooks/useMCPQuery';
import { useAuthStore } from '@/stores/auth.store';

import type {
  CulturalSummary,
  CulturalAnalytics,
  CulturalEvent,
  CulturalProposal,
  EntertainmentAct,
  CulturalProgram,
  ArtExhibition,
  CalendarItem,
} from '../types';
import type {
  MemberAttendanceRecord,
  MemberCulturalPreferences,
} from '../lib/tasteProfile';
import {
  CULTURAL_MCP_SERVER,
  CULTURAL_MCP_TOOLS,
  CULTURAL_FRESHNESS_TIERS,
} from '../config';

// ══════════════════════════════════════════════════════════
//  RETURN TYPE
// ══════════════════════════════════════════════════════════

export interface CulturalDataReturn {
  // ── Summary & Analytics ──
  summary: CulturalSummary | undefined;
  analytics: CulturalAnalytics | undefined;

  // ── Calendar ──
  calendar: CalendarItem[] | undefined;

  // ── Entities ──
  events: CulturalEvent[] | undefined;
  entertainmentActs: EntertainmentAct[] | undefined;
  programs: CulturalProgram[] | undefined;
  exhibitions: ArtExhibition[] | undefined;

  // ── Member-specific ──
  memberHistory: MemberAttendanceRecord[] | undefined;
  memberPreferences: MemberCulturalPreferences | undefined;

  // ── AI Proposals ──
  proposals: CulturalProposal[] | undefined;

  // ── State ──
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;

  // ── Actions ──
  refetchAll: () => void;
  refetchSummary: () => void;
  refetchAnalytics: () => void;
  refetchCalendar: () => void;
  refetchEntities: () => void;
}

// ══════════════════════════════════════════════════════════
//  HOOK
// ══════════════════════════════════════════════════════════

/**
 * Fetches and caches all Cultural domain MCP data.
 *
 * @param memberId — Optional. Enables member-specific queries.
 * @returns CulturalDataReturn with all data + state + actions.
 */
export function useCulturalData(memberId?: string): CulturalDataReturn {
  const { user } = useAuthStore();
  // user type may not contain clubId in its TypeScript definition; access dynamically
  const clubId = (user as any)?.clubId ?? '';

  // ── 1. Cultural Summary ──
  const summaryQuery = useMCPQuery<CulturalSummary>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.SUMMARY,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.SUMMARY },
  );

  // ── 2. Cultural Analytics ──
  const analyticsQuery = useMCPQuery<CulturalAnalytics>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.ANALYTICS,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.ANALYTICS },
  );

  // ── 3. Cultural Calendar ──
  const calendarQuery = useMCPQuery<CalendarItem[]>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.CALENDAR,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.CALENDAR },
  );

  // ── 4. Cultural Events ──
  const eventsQuery = useMCPQuery<CulturalEvent[]>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.EVENTS_LIST,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.ENTITIES },
  );

  // ── 5. Entertainment Acts ──
  const entertainmentQuery = useMCPQuery<EntertainmentAct[]>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.ENTERTAINMENT_LIST,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.ENTITIES },
  );

  // ── 6. Cultural Programs ──
  const programsQuery = useMCPQuery<CulturalProgram[]>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.PROGRAMS_LIST,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.ENTITIES },
  );

  // ── 7. Art Exhibitions ──
  const exhibitionsQuery = useMCPQuery<ArtExhibition[]>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.EXHIBITIONS_LIST,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.ENTITIES },
  );

  // ── 8. Member Cultural History ──
  const memberHistoryQuery = useMCPQuery<MemberAttendanceRecord[]>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.MEMBER_HISTORY,
    { club_id: clubId, member_id: memberId ?? '' },
    {
      staleTime: CULTURAL_FRESHNESS_TIERS.MEMBER,
      enabled: !!memberId,
    },
  );

  // ── 9. Member Cultural Preferences ──
  const memberPreferencesQuery = useMCPQuery<MemberCulturalPreferences>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.MEMBER_PREFERENCES,
    { club_id: clubId, member_id: memberId ?? '' },
    {
      staleTime: CULTURAL_FRESHNESS_TIERS.MEMBER,
      enabled: !!memberId,
    },
  );

  // ── 10. Cultural Proposals (AI-generated) ──
  const proposalsQuery = useMCPQuery<CulturalProposal[]>(
    CULTURAL_MCP_SERVER,
    CULTURAL_MCP_TOOLS.GENERATE_PROPOSALS,
    { club_id: clubId },
    { staleTime: CULTURAL_FRESHNESS_TIERS.PROPOSALS },
  );

  // ── Aggregate loading + error state ──
  const baseQueries = [
    summaryQuery,
    analyticsQuery,
    calendarQuery,
    eventsQuery,
    entertainmentQuery,
    programsQuery,
    exhibitionsQuery,
    proposalsQuery,
  ];

  const memberQueries = memberId
    ? [memberHistoryQuery, memberPreferencesQuery]
    : [];

  const allQueries = [...baseQueries, ...memberQueries];

  const isLoading = allQueries.some((q) => q.isLoading);
  const isReady = !isLoading && summaryQuery.data !== undefined;
  const error = allQueries.find((q) => q.error)?.error ?? null;

  // ── Refetch actions ──
  const refetchAll = useMemo(
    () => () => {
      allQueries.forEach((q) => q.refetch());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clubId, memberId],
  );

  const refetchSummary = useMemo(
    () => () => {
      summaryQuery.refetch();
      analyticsQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [summaryQuery, analyticsQuery],
  );

  const refetchAnalytics = useMemo(
    () => () => {
      analyticsQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analyticsQuery],
  );

  const refetchCalendar = useMemo(
    () => () => {
      calendarQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendarQuery],
  );

  const refetchEntities = useMemo(
    () => () => {
      eventsQuery.refetch();
      entertainmentQuery.refetch();
      programsQuery.refetch();
      exhibitionsQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventsQuery, entertainmentQuery, programsQuery, exhibitionsQuery],
  );

  return {
    summary: summaryQuery.data,
    analytics: analyticsQuery.data,
    calendar: calendarQuery.data,
    events: eventsQuery.data,
    entertainmentActs: entertainmentQuery.data,
    programs: programsQuery.data,
    exhibitions: exhibitionsQuery.data,
    memberHistory: memberHistoryQuery.data,
    memberPreferences: memberPreferencesQuery.data,
    proposals: proposalsQuery.data,

    isLoading,
    isReady,
    error,

    refetchAll,
    refetchSummary,
    refetchAnalytics,
    refetchCalendar,
    refetchEntities,
  };
}