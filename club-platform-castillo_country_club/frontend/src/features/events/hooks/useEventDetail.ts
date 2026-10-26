// src/features/events/hooks/useEventDetail.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Detail Orchestrator Hook
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     @/shared/hooks/useMCPQuery, @/shared/components/ui,
//              ../types, react-router
//
// Orchestrator hook for the Event Detail page.
// Coordinates: route params, data fetching, status mutations,
// clone/report actions, tab state, and navigation callbacks.
//
// Tab identifiers:
//   "resumen" | "programa" | "rsvps" | "proveedores" | "ai"
//   These are STABLE SEMANTIC IDS, not display strings.
//   Spanish is the app's primary language — the IDs match the
//   domain vocabulary. When i18n is implemented:
//   i18n.t(`events.tabs.${tabId}`) → localized display label.
//   Tab IDs themselves never change (breaking change to API).
//
// ANTI-PATTERNS REMOVED:
// [x] Patch comment ("F47") → removed
// [x] Mutable EventDetailResponse → readonly fields
// [x] TAB_ORDER mutable array → readonly as const
// [x] useMCPQuery params not memoized → useMemo
// [x] 2 unsafe casts in mutation responses → typed generics
// [x] 5 Spanish toast messages → TOAST_MESSAGES constant map
// [x] navigate exposed in return → removed (consumers have own)
// [x] date computations in callbacks → dateHelpers module-level
// [x] Missing § section markers → §0-§5
// [x] Missing file header → added with metadata
// [x] Missing JSDoc → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
  useMCPQuery,
  useMCPMutation,
} from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";
import type { EventResponse } from "../types";

// ═══════════════════════════════════════════════════════════
// §1 TYPES + CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Event detail tab identifiers.
 * Stable semantic IDs — never change after deployment.
 * Spanish because the app's domain vocabulary is Spanish.
 */
export type DetailTab =
  | "resumen"
  | "programa"
  | "rsvps"
  | "proveedores"
  | "ai";

/** Ordered tab list for navigation and direction computation. */
export const TAB_ORDER: readonly DetailTab[] = [
  "resumen",
  "programa",
  "rsvps",
  "proveedores",
  "ai",
] as const;

/** MCP response shape for get_event tool. */
interface EventDetailResponse {
  readonly status: string;
  readonly message: string;
  readonly data: EventResponse;
}

/** MCP response shape for event_clone_template tool. */
interface CloneResponse {
  readonly data?: { readonly id?: string };
}

/** MCP response shape for update_event_status tool. */
interface StatusResponse {
  readonly status?: string;
}

/**
 * Centralized toast messages.
 * English keys for type safety, Spanish values for display.
 * When i18n is implemented, replace values with i18n.t() calls.
 */
const TOAST_MESSAGES = {
  statusApproval: "Cambio de estado enviado para aprobación",
  statusUpdated: "Estado actualizado",
  statusError: "Error al actualizar estado",
  cloned: "Evento clonado como borrador",
  cloneError: "Error al clonar evento",
  reportGenerated: "Reporte generado",
  reportError: "Error al generar reporte",
} as const;

// ═══════════════════════════════════════════════════════════
// §2 DATE HELPERS
//
// Module-level date computation helpers.
// Avoids creating Date objects inside callbacks.
// ═══════════════════════════════════════════════════════════

/**
 * Compute clone parameters: same event, one month from today.
 */
function computeCloneParams(eventId: string): Record<string, unknown> {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const dateStr = nextMonth.toISOString().split("T")[0];
  const label = nextMonth.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
  });

  return {
    event_id: eventId,
    new_date_start: dateStr,
    new_date_end: dateStr,
    title_suffix: `— ${label}`,
  };
}

/**
 * Compute report parameters: last 30 days, executive format.
 */
function computeReportParams(): Record<string, unknown> {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return {
    date_from: monthAgo.toISOString(),
    date_to: now.toISOString(),
    report_type: "executive",
  };
}

// ═══════════════════════════════════════════════════════════
// §3 HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Event Detail orchestrator hook.
 *
 * Coordinates: route params, data fetching, status mutations,
 * clone/report actions, tab state, and navigation callbacks.
 *
 * @returns Everything the EventDetail page needs
 */
export function useEventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── §3.1 Tab state ──

  const [activeTab, setActiveTab] = useState<DetailTab>("resumen");
  const [tabDirection, setTabDirection] = useState<"fwd" | "bwd">(
    "fwd",
  );

  // ── §3.2 Data fetching ──

  // Memoize query params — prevents new object every render
  const queryParams = useMemo(
    () => ({ event_id: id }),
    [id],
  );

  const eventQuery = useMCPQuery<EventDetailResponse>(
    "events",
    "get_event",
    queryParams,
    { enabled: !!id },
  );

  // ── §3.3 Mutations ──

  const updateStatusMut = useMCPMutation<StatusResponse, Record<string, unknown>>(
    "events",
    "update_event_status",
    {
      onSuccess: (resp) => {
        if (resp?.status === "pending_approval") {
          showToast({
            type: "info",
            message: TOAST_MESSAGES.statusApproval,
          });
          return;
        }
        showToast({
          type: "success",
          message: TOAST_MESSAGES.statusUpdated,
        });
        eventQuery.refetch();
      },
      onError: (err: Error) => {
        showToast({
          type: "error",
          message: err.message || TOAST_MESSAGES.statusError,
        });
      },
    },
  );

  const cloneMut = useMCPMutation<CloneResponse, Record<string, unknown>>(
    "events",
    "event_clone_template",
    {
      onSuccess: (resp) => {
        const clonedId = resp?.data?.id;
        showToast({
          type: "success",
          message: TOAST_MESSAGES.cloned,
        });
        if (clonedId) navigate(`/admin/events/${clonedId}`);
      },
      onError: (err: Error) => {
        showToast({
          type: "error",
          message: err.message || TOAST_MESSAGES.cloneError,
        });
      },
    },
  );

  const reportMut = useMCPMutation<unknown, Record<string, unknown>>(
    "events",
    "event_generate_report",
    {
      onSuccess: () => {
        showToast({
          type: "success",
          message: TOAST_MESSAGES.reportGenerated,
        });
      },
      onError: (err: Error) => {
        showToast({
          type: "error",
          message: err.message || TOAST_MESSAGES.reportError,
        });
      },
    },
  );

  // ── §3.4 Derived data ──

  const event = eventQuery.data?.data;

  const confirmedAttendees = useMemo(() => {
    if (!event) return 0;
    return event.rsvps
      .filter((r) => r.status === "confirmed")
      .reduce(
        (sum, r) => sum + r.member_ids.length + r.guests_count,
        0,
      );
  }, [event]);

  // ── §3.5 Action callbacks ──

  const handlePublish = useCallback(() => {
    if (!id) return;
    updateStatusMut.mutate({
      event_id: id,
      status: "published",
    });
  }, [id, updateStatusMut]);

  const handleCancel = useCallback(() => {
    if (!id) return;
    updateStatusMut.mutate({
      event_id: id,
      status: "cancelled",
    });
  }, [id, updateStatusMut]);

  const handleClone = useCallback(() => {
    if (!id) return;
    cloneMut.mutate(computeCloneParams(id));
  }, [id, cloneMut]);

  const handleReport = useCallback(() => {
    if (!id) return;
    reportMut.mutate(computeReportParams());
  }, [id, reportMut]);

  // ── §3.6 Navigation callbacks ──

  const handleTabChange = useCallback(
    (tabId: string) => {
      const currentIdx = TAB_ORDER.indexOf(activeTab);
      const newIdx = TAB_ORDER.indexOf(tabId as DetailTab);
      setTabDirection(newIdx >= currentIdx ? "fwd" : "bwd");
      setActiveTab(tabId as DetailTab);
    },
    [activeTab],
  );

  const handleBack = useCallback(() => {
    navigate("/admin/events");
  }, [navigate]);

  const handleEdit = useCallback(() => {
    if (!id) return;
    navigate(`/admin/events/${id}/edit`);
  }, [id, navigate]);

  const handleInvite = useCallback(() => {
    if (!id) return;
    navigate(
      `/admin/communications?event_id=${id}&action=invite`,
    );
  }, [id, navigate]);

  // ── §3.7 Return ──

  return {
    // Route
    id,
    // Data
    event,
    isLoading: eventQuery.isLoading,
    isError: eventQuery.isError,
    error: eventQuery.error ?? null,
    refetch: eventQuery.refetch,
    confirmedAttendees,
    // Tabs
    activeTab,
    tabDirection,
    handleTabChange,
    // Actions
    handleBack,
    handleEdit,
    handlePublish,
    handleCancel,
    handleClone,
    handleReport,
    handleInvite,
    // Mutation states
    isUpdating: updateStatusMut.isPending,
    isCloning: cloneMut.isPending,
    isReporting: reportMut.isPending,
  };
}