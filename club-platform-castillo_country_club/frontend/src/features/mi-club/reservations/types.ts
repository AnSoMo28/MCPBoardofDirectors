/**
 * @module features/mi-club/reservations/types (Fase 25 — NEW)
 * @note Reservation types for the socio reservation view.
 */

/* ═══════════════════════════════════════
   Reservation
   ═══════════════════════════════════════ */

export type ReservationStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";

export interface Reservation {
  id: string;
  facility_name: string;
  facility_type: string;
  date: string; /* YYYY-MM-DD */
  start_time: string; /* HH:MM */
  end_time: string; /* HH:MM */
  status: ReservationStatus;
  notes?: string;
}

export interface ReservationListResponse {
  reservations: Reservation[];
  total: number;
}

/* ═══════════════════════════════════════
   Countdown
   ═══════════════════════════════════════ */

export type CountdownStatus = "upcoming" | "in_progress" | "past";

export interface CountdownState {
  status: CountdownStatus;
  totalMinutes: number;
  hours: number;
  minutes: number;
  level: "normal" | "warning" | "urgent";
}

/* ═══════════════════════════════════════
   Day Timeline
   ═══════════════════════════════════════ */

export interface TimelineBlock {
  id: string;
  facilityName: string;
  startPct: number;
  widthPct: number;
  color: string;
  isInProgress: boolean;
}

export interface DayTimelineData {
  blocks: TimelineBlock[];
  nowPct: number;
  hourLabels: Array<{ pct: number; label: string }>;
}

/* ═══════════════════════════════════════
   Rebook Suggestion
   ═══════════════════════════════════════ */

export interface RebookSuggestion {
  facility: string;
  date: string; /* YYYY-MM-DD of next occurrence */
  startTime: string;
  endTime: string;
  count: number; /* how many times the socio booked this */
}