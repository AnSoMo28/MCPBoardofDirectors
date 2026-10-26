/**
 * @module features/mi-club/reservations/config (Fase 25 — NEW)
 * @note Status config, timeline constants, countdown thresholds.
 */

import {
  Check,
  Clock,
  X as XIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReservationStatus } from "./types";

/* ═══════════════════════════════════════
   Status Config
   ═══════════════════════════════════════ */

export const RESERVATION_STATUS: Record<
  ReservationStatus,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  confirmed: {
    label: "Confirmada",
    color: "var(--color-emerald-400)",
    bgColor: "rgba(52, 211, 153, 0.1)",
    icon: Check,
  },
  pending: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "rgba(251, 191, 36, 0.1)",
    icon: Clock,
  },
  cancelled: {
    label: "Cancelada",
    color: "var(--color-rose-400)",
    bgColor: "rgba(251, 113, 133, 0.1)",
    icon: XIcon,
  },
  completed: {
    label: "Completada",
    color: "var(--color-silver-400)",
    bgColor: "rgba(160, 154, 146, 0.08)",
    icon: Check,
  },
};

/* ═══════════════════════════════════════
   Timeline Constants
   ═══════════════════════════════════════ */

export const TIMELINE = {
  START_HOUR: 6, /* 6am */
  END_HOUR: 22, /* 10pm */
  TOTAL_HOURS: 16, /* 6am to 10pm */
} as const;

/* ═══════════════════════════════════════
   Countdown Thresholds (in minutes)
   ═══════════════════════════════════════ */

export const COUNTDOWN_THRESHOLDS = {
  URGENT: 30, /* <30min = rose pulse */
  WARNING: 120, /* <2h = amber */
} as const;

/* ═══════════════════════════════════════
   Min Reservations for Pattern Detection
   ═══════════════════════════════════════ */

export const REBOOK_PATTERN_MIN = 3;

/* ═══════════════════════════════════════
   Hour Labels for Timeline
   ═══════════════════════════════════════ */

export const TIMELINE_HOURS = [
  { hour: 6, label: "6am" },
  { hour: 8, label: "8am" },
  { hour: 10, label: "10am" },
  { hour: 12, label: "12pm" },
  { hour: 14, label: "2pm" },
  { hour: 16, label: "4pm" },
  { hour: 18, label: "6pm" },
  { hour: 20, label: "8pm" },
  { hour: 22, label: "10pm" },
] as const;