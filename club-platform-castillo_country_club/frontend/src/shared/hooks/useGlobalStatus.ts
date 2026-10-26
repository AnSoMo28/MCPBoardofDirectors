// src/shared/hooks/useGlobalStatus.ts
// ═══════════════════════════════════════════════════════════
// Global Status Hook — Smart Sidebar badges
//
// Lightweight queries for sidebar status indicators.
// Only fetched for ADMIN/STAFF roles. Polled every 60s.
// If queries fail, badges silently don't appear.
//
// Rules: #19 (on-demand within roles), performance-safe
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useAuthStore, type UserRole } from "@/stores/auth.store";

interface ApprovalRequest {
  status: string;
}

interface ApprovalListResponse {
  requests: ApprovalRequest[];
  total: number;
}

interface CalendarEvent {
  date: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
}

const ROLES_WITH_APPROVALS: UserRole[] = ["ADMIN"];
const ROLES_WITH_EVENTS_BADGE: UserRole[] = ["ADMIN", "STAFF"];

export function useGlobalStatus() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const showApprovals = role != null && ROLES_WITH_APPROVALS.includes(role);
  const showEventsBadge = role != null && ROLES_WITH_EVENTS_BADGE.includes(role);

  /* ── Pending approvals count ── */
  const approvalsQ = useMCPQuery<ApprovalListResponse>(
    "hitl",
    "get_pending_approvals",
    {},
    {
      enabled: showApprovals,
      staleTime: 60_000,
      refetchInterval: 60_000,
    },
  );

  /* ── Today's events count ── */
  const todayStr = new Date().toISOString().split("T")[0];
  const calendarQ = useMCPQuery<CalendarResponse>(
    "events",
    "event_get_calendar",
    { month: todayStr.slice(0, 7) },
    {
      enabled: showEventsBadge,
      staleTime: 120_000,
      refetchInterval: 120_000,
    },
  );

  const pendingApprovals = useMemo(() => {
    if (!approvalsQ.data) return 0;
    return (approvalsQ.data.requests ?? []).filter(
      (r) => r.status === "pending",
    ).length;
  }, [approvalsQ.data]);

  const todayEvents = useMemo(() => {
    if (!calendarQ.data) return 0;
    return (calendarQ.data.events ?? []).filter(
      (e) => e.date === todayStr,
    ).length;
  }, [calendarQ.data, todayStr]);

  return {
    pendingApprovals,
    todayEvents,
    isLoading: approvalsQ.isLoading || calendarQ.isLoading,
  };
}
