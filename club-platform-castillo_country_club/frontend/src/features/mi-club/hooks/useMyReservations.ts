/**
 * @hook useMyReservations (Fase 25)
 * @module features/mi-club/hooks
 * @note Brain of the reservations view. Queries data, computes countdown,
 *       day timeline, rebook suggestions, filters, and derived state.
 */

import { useState, useMemo, useEffect } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useAuthStore } from "@/stores/auth.store";
import {
  TIMELINE,
  COUNTDOWN_THRESHOLDS,
  REBOOK_PATTERN_MIN,
  RESERVATION_STATUS,
  TIMELINE_HOURS,
} from "../reservations/config";
import type {
  Reservation,
  ReservationListResponse,
  CountdownState,
  DayTimelineData,
  TimelineBlock,
  RebookSuggestion,
} from "../reservations/types";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function getTodayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function parseTimeHM(time: string): { h: number; m: number } {
  const [h, m] = time.split(":").map(Number);
  return { h, m };
}

function timeToPct(time: string): number {
  const { h, m } = parseTimeHM(time);
  const decimal = h + m / 60;
  const clamped = Math.max(TIMELINE.START_HOUR, Math.min(TIMELINE.END_HOUR, decimal));
  return ((clamped - TIMELINE.START_HOUR) / TIMELINE.TOTAL_HOURS) * 100;
}

function nowPct(): number {
  const now = new Date();
  const decimal = now.getHours() + now.getMinutes() / 60;
  if (decimal < TIMELINE.START_HOUR || decimal > TIMELINE.END_HOUR) return -1;
  return ((decimal - TIMELINE.START_HOUR) / TIMELINE.TOTAL_HOURS) * 100;
}

function computeCountdown(
  date: string,
  startTime: string,
  endTime: string,
): CountdownState {
  const now = Date.now();
  const start = new Date(`${date}T${startTime}`).getTime();
  const end = new Date(`${date}T${endTime}`).getTime();

  if (now >= start && now <= end) {
    const totalMinutes = Math.floor((end - now) / 60_000);
    const level =
      totalMinutes < COUNTDOWN_THRESHOLDS.URGENT
        ? "urgent"
        : totalMinutes < COUNTDOWN_THRESHOLDS.WARNING
          ? "warning"
          : "normal";
    return {
      status: "in_progress",
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      level,
    };
  }

  if (now < start) {
    const totalMinutes = Math.floor((start - now) / 60_000);
    const level =
      totalMinutes < COUNTDOWN_THRESHOLDS.URGENT
        ? "urgent"
        : totalMinutes < COUNTDOWN_THRESHOLDS.WARNING
          ? "warning"
          : "normal";
    return {
      status: "upcoming",
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      level,
    };
  }

  return { status: "past", totalMinutes: 0, hours: 0, minutes: 0, level: "normal" };
}

function findRebookSuggestion(
  reservations: Reservation[],
): RebookSuggestion | null {
  const completed = reservations.filter(
    (r) => r.status === "completed",
  );
  if (completed.length < REBOOK_PATTERN_MIN) return null;

  /* Group by facility */
  const groups = new Map<string, Reservation[]>();
  for (const r of completed) {
    const existing = groups.get(r.facility_name) ?? [];
    existing.push(r);
    groups.set(r.facility_name, existing);
  }

  /* Find most repeated facility */
  let bestFacility: string | null = null;
  let bestCount = 0;
  for (const [facility, res] of groups) {
    if (res.length > bestCount) {
      bestFacility = facility;
      bestCount = res.length;
    }
  }

  if (!bestFacility || bestCount < REBOOK_PATTERN_MIN) return null;

  const facilityRes = groups.get(bestFacility)!;
  facilityRes.sort((a, b) => b.date.localeCompare(a.date));
  const last = facilityRes[0];

  /* Next occurrence of that day of week */
  const lastDate = new Date(last.date + "T12:00:00");
  const dayOfWeek = lastDate.getDay();
  const now = new Date();
  const todayDow = now.getDay();
  let daysUntil = dayOfWeek - todayDow;
  if (daysUntil <= 0) daysUntil += 7;
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + daysUntil);
  const nextDateStr = nextDate
    .toISOString()
    .split("T")[0];

  return {
    facility: bestFacility,
    date: nextDateStr,
    startTime: last.start_time,
    endTime: last.end_time,
    count: bestCount,
  };
}

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type StatusFilter = "upcoming" | "all";

export interface UseMyReservationsReturn {
  /* Data */
  reservations: Reservation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  /* Filters */
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter) => void;
  filtered: Reservation[];
  upcomingCount: number;
  /* Today */
  todayReservations: Reservation[];
  hasTodayReservation: boolean;
  /* Countdown */
  countdown: CountdownState | null;
  nextReservation: Reservation | null;
  /* Timeline */
  dayTimeline: DayTimelineData | null;
  /* Rebook */
  rebookSuggestion: RebookSuggestion | null;
  /* Helpers */
  hasUpcoming: boolean;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useMyReservations(): UseMyReservationsReturn {
  const user = useAuthStore((s) => s.user);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("upcoming");

  /* ── Query ── */
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useMCPQuery<ReservationListResponse>(
    "facilities",
    "get_reservations",
    { family_id: user?.familyId || "" },
    { enabled: !!user?.familyId },
  );

  const reservations = data?.reservations ?? [];
  const today = getTodayLocal();

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    if (statusFilter === "upcoming") {
      return reservations.filter(
        (r) =>
          r.date >= today &&
          r.status !== "cancelled" &&
          r.status !== "completed",
      );
    }
    return reservations;
  }, [reservations, statusFilter, today]);

  const upcomingCount = useMemo(
    () =>
      reservations.filter(
        (r) =>
          r.date >= today &&
          r.status !== "cancelled" &&
          r.status !== "completed",
      ).length,
    [reservations, today],
  );

  const hasUpcoming = upcomingCount > 0;

  /* ── Today ── */
  const todayReservations = useMemo(
    () =>
      reservations.filter(
        (r) => r.date === today && r.status !== "cancelled",
      ),
    [reservations, today],
  );

  const hasTodayReservation = todayReservations.length > 0;

  /* ── Countdown (next reservation today) ── */
  const [countdown, setCountdown] = useState<CountdownState | null>(
    null,
  );

  const nextReservation = useMemo(() => {
    if (!hasTodayReservation) return null;
    /* Sort by start_time, find the first that hasn't ended */
    const sorted = [...todayReservations].sort(
      (a, b) => a.start_time.localeCompare(b.start_time),
    );
    const now = new Date();
    const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return (
      sorted.find(
        (r) => r.end_time > nowHM && r.status === "confirmed",
      ) ??
      sorted.find((r) => r.end_time > nowHM) ??
      sorted[0]
    );
  }, [todayReservations, hasTodayReservation]);

  useEffect(() => {
    if (!nextReservation) {
      setCountdown(null);
      return;
    }

    const update = () => {
      setCountdown(
        computeCountdown(
          nextReservation.date,
          nextReservation.start_time,
          nextReservation.end_time,
        ),
      );
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [nextReservation]);

  /* ── Day Timeline ── */
  const dayTimeline = useMemo<DayTimelineData | null>(() => {
    if (!hasTodayReservation) return null;

    const blocks: TimelineBlock[] = todayReservations.map((r) => {
      const startPct = timeToPct(r.start_time);
      const endPct = timeToPct(r.end_time);
      const widthPct = Math.max(endPct - startPct, 2); /* min 2% visibility */
      const now = new Date();
      const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const isInProgress =
        r.start_time <= nowHM &&
        r.end_time > nowHM &&
        r.status === "confirmed";

      const statusCfg = RESERVATION_STATUS[r.status];
      return {
        id: r.id,
        facilityName: r.facility_name,
        startPct,
        widthPct,
        color: isInProgress
          ? "var(--color-gold-400)"
          : statusCfg.color,
        isInProgress,
      };
    });

    const hourLabels = TIMELINE_HOURS.map((h) => ({
      pct:
        ((h.hour - TIMELINE.START_HOUR) / TIMELINE.TOTAL_HOURS) *
        100,
      label: h.label,
    }));

    return { blocks, nowPct: nowPct(), hourLabels };
  }, [todayReservations, hasTodayReservation]);

  /* ── Rebook Suggestion ── */
  const rebookSuggestion = useMemo(
    () => findRebookSuggestion(reservations),
    [reservations],
  );

  return {
    reservations,
    isLoading,
    error: error as Error | null,
    refetch,
    statusFilter,
    setStatusFilter,
    filtered,
    upcomingCount,
    todayReservations,
    hasTodayReservation,
    countdown,
    nextReservation,
    dayTimeline,
    rebookSuggestion,
    hasUpcoming,
  };
}