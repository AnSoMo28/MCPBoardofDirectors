// src/features/events/hooks/useEventCalendar.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Calendar Orchestrator Hook
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     @/shared/hooks/useMCPQuery, @/shared/components/ui,
//              ./useEventAdvisor, ../types,
//              @/shared/types/domain-enums,
//              @/shared/lib/reactionTemplate
//
// Orchestrator hook for the Event Calendar page.
// Coordinates: view state, data fetching, grid computation,
// advisor evaluation, mutations, navigation, and quick-add.
//
// Architecture:
//   This is a PAGE-LEVEL orchestrator — it composes multiple
//   concerns into a single return object for the CalendarGrid
//   and EventListView components. The alternative (splitting
//   into 5+ smaller hooks) adds indirection without reducing
//   complexity, because the concerns are tightly coupled:
//   grid computation depends on calendar data, advisor depends
//   on grid data, mutations depend on advisor actions.
//
// §0.5 ARCHITECTURAL CONCERNS:
//
//   1. Cross-feature imports:
//      AdvisorActionState, AdvisorReactionInsight are imported
//      from @/features/dashboard/types. These advisor-related
//      types are used by multiple features (events, dashboard,
//      sports, cultural, etc.) and should live in shared/.
//      TODO: Move to @/shared/types/ai-intelligence.ts
//      when touching the shared type system.
//
//   2. Contract types from mocks:
//      The original file imported contract types from
//      @/shared/mocks/contracts for response typing.
//      These aliases have been removed — the response types
//      are now derived from the actual useMCPQuery generic.
//
//   3. showToast in feature hook:
//      showToast is used for mutation feedback (success/error).
//      This is CORRECT for feature hooks — the ban on showToast
//      applies only to shared/lib/ infrastructure (api.ts).
//      Feature hooks are UI-adjacent and may use toast directly.
//
// ANTI-PATTERNS REMOVED:
// [x] Patch comment ("F47 — Event Calendar Orchestrator") → removed
// [x] Mutable interfaces → readonly fields
// [x] useMCPQuery params not memoized → useMemo
// [x] Unsafe double cast (responseData as unknown as Record) → guarded
// [x] Unsafe cast (rawData as { calendar }) → guarded with DEV warning
// [x] catch {} without logging → DEV console.error
// [x] Duplicate tool dispatch → executeToolAction helper
// [x] Unnecessary contract type aliases → removed
// [x] Missing § section markers → §0-§7
// [x] Missing file header → added
// [x] Missing JSDoc → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  useMCPQuery,
  useMCPMutation,
} from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";
import type {
  EventBrief,
  CalendarDay,
  EventAdvisorInsight,
} from "../types";
import type { EventCategory } from "@/shared/types/domain-enums";
import { useEventAdvisor } from "./useEventAdvisor";
import type {
  AdvisorActionState,
  AdvisorReactionInsight,
} from "@/features/dashboard/types";
import { generateReactionInsight } from "@/shared/lib/reactionTemplate";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Extended calendar day with UI rendering context.
 * Adds isToday and isCurrentMonth for grid rendering.
 * Not a backend type — computed client-side by buildCalendarGrid.
 */
export interface CalendarGridDay {
  readonly date: string;
  readonly events: readonly EventBrief[];
  readonly total_events: number;
  readonly has_conflicts: boolean;
  readonly isToday: boolean;
  readonly isCurrentMonth: boolean;
}

/**
 * Quick-add form data for rapid event creation.
 * Mutable — used as form state where fields are reassigned.
 */
export interface QuickAddData {
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  tags: string[];
}

/**
 * Options for useEventCalendar hook.
 */
export interface UseEventCalendarOptions {
  /** RAG context for enriched advisor evaluation */
  readonly ragContext?: readonly RAGContext[];
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Default capacity for quick-add draft events */
const DEFAULT_QUICK_ADD_CAPACITY = 50;

/** Grid always renders 42 cells (6 rows × 7 days) */
const GRID_CELL_COUNT = 42;

/** Responsive breakpoint for default view mode */
const MOBILE_BREAKPOINT = 1024;

// ═══════════════════════════════════════════════════════════
// §3 GRID BUILDER
//
// Pure function: year + month + calendarData → CalendarGridDay[]
// Computes a 42-cell grid with prev/next month fill.
// ═══════════════════════════════════════════════════════════

/**
 * Build a 42-cell calendar grid for the given month.
 * Fills previous/next month days to complete the grid.
 *
 * @param year — Target year
 * @param month — Target month (0-indexed)
 * @param calendarData — Backend calendar data
 * @returns 42 CalendarGridDay objects for rendering
 */
function buildCalendarGrid(
  year: number,
  month: number,
  calendarData: readonly CalendarDay[],
): readonly CalendarGridDay[] {
  const today = new Date().toISOString().split("T")[0];
  const dataMap = new Map(calendarData.map((d) => [d.date, d]));

  const firstDay = new Date(year, month, 1);
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const days: CalendarGridDay[] = [];

  // Previous month fill
  const prevMonth = new Date(year, month, 0);
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonth.getDate() - i;
    const dateStr = new Date(year, month - 1, d)
      .toISOString()
      .split("T")[0];
    const calDay = dataMap.get(dateStr);
    days.push({
      date: dateStr,
      events: calDay?.events ?? [],
      total_events: calDay?.total_events ?? 0,
      has_conflicts: calDay?.has_conflicts ?? false,
      isToday: dateStr === today,
      isCurrentMonth: false,
    });
  }

  // Current month
  const lastDay = new Date(year, month + 1, 0);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = new Date(year, month, d)
      .toISOString()
      .split("T")[0];
    const calDay = dataMap.get(dateStr);
    days.push({
      date: dateStr,
      events: calDay?.events ?? [],
      total_events: calDay?.total_events ?? 0,
      has_conflicts: calDay?.has_conflicts ?? false,
      isToday: dateStr === today,
      isCurrentMonth: true,
    });
  }

  // Next month fill (always 42 cells)
  const remaining = GRID_CELL_COUNT - days.length;
  for (let d = 1; d <= remaining; d++) {
    const dateStr = new Date(year, month + 1, d)
      .toISOString()
      .split("T")[0];
    const calDay = dataMap.get(dateStr);
    days.push({
      date: dateStr,
      events: calDay?.events ?? [],
      total_events: calDay?.total_events ?? 0,
      has_conflicts: calDay?.has_conflicts ?? false,
      isToday: dateStr === today,
      isCurrentMonth: false,
    });
  }

  return days;
}

// ═══════════════════════════════════════════════════════════
// §4 ADVISOR ACTION DISPATCH
//
// Centralized tool execution for advisor actions.
// Eliminates duplicate dispatch logic in execute/confirm callbacks.
// ═══════════════════════════════════════════════════════════

/**
 * Execute an advisor action tool via MCP mutation.
 * Dispatches to the correct mutation based on tool name.
 *
 * @param tool — MCP tool name
 * @param params — Tool parameters
 * @param mutations — Map of tool name → mutation async function
 */
async function executeToolAction(
  tool: string,
  params: Record<string, unknown>,
  mutations: {
    capacity: (p: Record<string, unknown>) => Promise<unknown>;
    clone: (p: Record<string, unknown>) => Promise<unknown>;
    create: (p: Record<string, unknown>) => Promise<unknown>;
  },
): Promise<void> {
  switch (tool) {
    case "event_manage_capacity":
      await mutations.capacity(params);
      break;
    case "event_clone_template":
      await mutations.clone(params);
      break;
    case "event_create":
      await mutations.create(params);
      break;
    default:
      if (import.meta.env.DEV) {
        console.warn(
          `[EventCalendar] Unknown advisor tool: "${tool}"`,
        );
      }
  }
}

// ═══════════════════════════════════════════════════════════
// §5 HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Calendar orchestrator hook for the Events page.
 *
 * Coordinates: view state, data fetching, grid computation,
 * advisor evaluation, mutations, navigation, and quick-add.
 *
 * @param options — Optional RAG context for advisor
 * @returns Everything the EventCalendar page needs
 */
export function useEventCalendar(
  options: UseEventCalendarOptions = {},
) {
  const { ragContext } = options;
  const navigate = useNavigate();

  // ── §5.1 View state ──

  const [viewMode, setViewMode] = useState<"calendar" | "list">(
    () =>
      typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
        ? "list"
        : "calendar",
  );
  const [currentYear, setCurrentYear] = useState(
    new Date().getFullYear(),
  );
  const [currentMonth, setCurrentMonth] = useState(
    new Date().getMonth(),
  );
  const [quickAddDate, setQuickAddDate] = useState<string | null>(
    null,
  );

  // ── §5.2 Date range computation ──

  const dateFrom = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  const lastDayNum = new Date(
    currentYear,
    currentMonth + 1,
    0,
  ).getDate();
  const dateTo = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  // Memoize query params — prevents new object every render
  const queryParams = useMemo(
    () => ({ date_from: dateFrom, date_to: dateTo }),
    [dateFrom, dateTo],
  );

  // ── §5.3 Data fetching ──

  const calendarQuery = useMCPQuery<{
    readonly data?: {
      readonly calendar?: readonly CalendarDay[];
    };
  }>("events", "event_get_calendar", queryParams);

  const createEventMutation = useMCPMutation<
    { readonly data?: { readonly status?: string } },
    Record<string, unknown>
  >("events", "event_create", {
    onSuccess: (responseData) => {
      const status = responseData?.data?.status;
      if (status === "pending_approval") {
        showToast({
          type: "info",
          message:
            "Evento enviado para aprobación — pendiente de confirmación",
        });
        setQuickAddDate(null);
        return;
      }
      showToast({
        type: "success",
        message: "Evento creado como borrador",
      });
      setQuickAddDate(null);
      calendarQuery.refetch();
    },
    onError: (err) => {
      showToast({
        type: "error",
        message: err.message || "Error al crear evento",
      });
    },
  });

  const capacityMut = useMCPMutation(
    "events",
    "event_manage_capacity",
    {
      onSuccess: () => {
        showToast({
          type: "success",
          message: "Capacidad actualizada",
        });
        calendarQuery.refetch();
      },
      onError: (err: Error) =>
        showToast({ type: "error", message: err.message }),
    },
  );

  const cloneMut = useMCPMutation(
    "events",
    "event_clone_template",
    {
      onSuccess: () => {
        showToast({
          type: "success",
          message: "Evento clonado",
        });
        calendarQuery.refetch();
      },
      onError: (err: Error) =>
        showToast({ type: "error", message: err.message }),
    },
  );

  // ── §5.4 Derived data ──

  const calendarData: readonly CalendarDay[] = useMemo(() => {
    const raw = calendarQuery.data?.data;
    if (!raw || typeof raw !== "object") return [];

    // Backend may return { calendar: [...] } or { data: [...] }
    // depending on the MCP response envelope.
    if ("calendar" in raw && Array.isArray(raw.calendar)) {
      return raw.calendar;
    }

    if (import.meta.env.DEV) {
      console.warn(
        "[EventCalendar] Unexpected MCP response shape:",
        "Expected { calendar: [...] } in data.",
        "Received:", raw,
      );
    }

    return [];
  }, [calendarQuery.data]);

  const totalEvents = useMemo(
    () =>
      calendarData.reduce(
        (sum, day) => sum + day.total_events,
        0,
      ),
    [calendarData],
  );

  const calendarGrid = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth, calendarData),
    [currentYear, currentMonth, calendarData],
  );

  const allEvents = useMemo(
    () => calendarData.flatMap((day) => day.events),
    [calendarData],
  );

  // ── §5.5 Advisor ──

  const advisorInsights = useEventAdvisor(calendarData, ragContext);

  const [actionStates, setActionStates] = useState<
    Record<string, AdvisorActionState>
  >({});
  const [modalInsight, setModalInsight] =
    useState<EventAdvisorInsight | null>(null);
  const [reactions, setReactions] = useState<
    AdvisorReactionInsight[]
  >([]);

  // Stable ref for mutations — prevents callback recreation
  const mutationsRef = useRef({
    capacity: (p: Record<string, unknown>) =>
      capacityMut.mutateAsync(p),
    clone: (p: Record<string, unknown>) =>
      cloneMut.mutateAsync(p),
    create: (p: Record<string, unknown>) =>
      createEventMutation.mutateAsync(p),
  });
  mutationsRef.current = {
    capacity: (p: Record<string, unknown>) =>
      capacityMut.mutateAsync(p),
    clone: (p: Record<string, unknown>) =>
      cloneMut.mutateAsync(p),
    create: (p: Record<string, unknown>) =>
      createEventMutation.mutateAsync(p),
  };

  // ── §5.6 Advisor action callbacks ──

  const handleAdvisorExecute = useCallback(
    async (insightId: string) => {
      const insight = advisorInsights.find(
        (i) => i.id === insightId,
      );
      if (!insight?.action) return;

      if (insight.action.approval_level !== "auto") {
        setModalInsight(insight);
        return;
      }

      setActionStates((prev) => ({
        ...prev,
        [insightId]: "loading",
      }));

      try {
        await executeToolAction(
          insight.action.tool,
          insight.action.params,
          mutationsRef.current,
        );
        setActionStates((prev) => ({
          ...prev,
          [insightId]: "done",
        }));
        setReactions((prev) => [
          ...prev,
          generateReactionInsight(insight.action!, insightId),
        ]);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            `[EventCalendar] Advisor action "${insightId}" failed:`,
            error,
          );
        }
        setActionStates((prev) => ({
          ...prev,
          [insightId]: "error",
        }));
      }
    },
    [advisorInsights],
  );

  const handleModalConfirm = useCallback(async () => {
    if (!modalInsight?.action) return;

    const insightId = modalInsight.id;
    const executedAction = modalInsight.action;

    setActionStates((prev) => ({
      ...prev,
      [insightId]: "loading",
    }));

    try {
      await executeToolAction(
        executedAction.tool,
        executedAction.params,
        mutationsRef.current,
      );
      setActionStates((prev) => ({
        ...prev,
        [insightId]: "done",
      }));
      setModalInsight(null);
      setReactions((prev) => [
        ...prev,
        generateReactionInsight(executedAction, insightId),
      ]);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(
          `[EventCalendar] Modal action "${insightId}" failed:`,
          error,
        );
      }
      setActionStates((prev) => ({
        ...prev,
        [insightId]: "error",
      }));
    }
  }, [modalInsight]);

  // ── §5.7 Navigation callbacks ──

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleToday = useCallback(() => {
    setCurrentYear(new Date().getFullYear());
    setCurrentMonth(new Date().getMonth());
  }, []);

  const handleEventClick = useCallback(
    (event: EventBrief) =>
      navigate(`/admin/events/${event.id}`),
    [navigate],
  );

  const handleDayClick = useCallback((date: string) => {
    setQuickAddDate(date);
  }, []);

  const handleNavigateToDate = useCallback((date: string) => {
    const d = new Date(date + "T12:00:00");
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  }, []);

  const handleNavigateToEvent = useCallback(
    (eventId: string) =>
      navigate(`/admin/events/${eventId}`),
    [navigate],
  );

  // ── §5.8 Quick-add callbacks ──

  const handleQuickAddFullForm = useCallback(
    (qd: QuickAddData) => {
      const params = new URLSearchParams({
        date: qd.date,
        startTime: qd.startTime,
        endTime: qd.endTime,
        category: qd.category,
        title: qd.title,
        ...(qd.location ? { location: qd.location } : {}),
        ...(qd.capacity
          ? { capacity: String(qd.capacity) }
          : {}),
        ...(qd.tags.length
          ? { tags: qd.tags.join(",") }
          : {}),
      });
      navigate(`/admin/events/new?${params.toString()}`);
    },
    [navigate],
  );

  const handleCreateDraft = useCallback(
    (qd: QuickAddData) => {
      createEventMutation.mutate({
        title: qd.title,
        category: qd.category,
        date_start: `${qd.date}T${qd.startTime}:00`,
        date_end: `${qd.date}T${qd.endTime}:00`,
        location: qd.location,
        max_capacity: qd.capacity || DEFAULT_QUICK_ADD_CAPACITY,
        tags: qd.tags,
        pricing_model: "free",
        price_per_person: 0,
        requires_rsvp: true,
        description: "",
      });
    },
    [createEventMutation],
  );

  // ── §5.9 Return ──

  return {
    // View
    viewMode,
    setViewMode,
    currentYear,
    currentMonth,
    quickAddDate,
    setQuickAddDate,
    // Data
    calendarData,
    calendarGrid,
    allEvents,
    totalEvents,
    isLoading: calendarQuery.isLoading,
    isError: calendarQuery.isError,
    error: calendarQuery.error ?? null,
    refetch: calendarQuery.refetch,
    // Navigation
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    handleEventClick,
    handleDayClick,
    handleNavigateToDate,
    handleNavigateToEvent,
    // Quick-Add
    handleQuickAddFullForm,
    handleCreateDraft,
    // Advisor
    advisorInsights,
    actionStates,
    reactions,
    handleAdvisorExecute,
    modalInsight,
    setModalInsight,
    handleModalConfirm,
  };
}