/**
 * @component TodayHero (Fase 25)
 * @namespace .glass-reservations__today-hero
 * @depends MyReservations.css, DayTimeline
 * @note Prominent block for today's reservation with live countdown
 *       and day timeline. Replaces the need to search for today's
 *       reservation in the list.
 * @import import './MyReservations.css';
 */

import { CalendarDays } from "lucide-react";
import type { Reservation, CountdownState, DayTimelineData } from "./types";
import { DayTimeline } from "./DayTimeline";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface TodayHeroProps {
  reservations: Reservation[];
  countdown: CountdownState | null;
  nextReservation: Reservation | null;
  dayTimeline: DayTimelineData | null;
}

/* ═══════════════════════════════════════
   Countdown Display
   ═══════════════════════════════════════ */

function CountdownDisplay({ state }: { state: CountdownState }) {
  if (state.status === "past") return null;

  const timeStr =
    state.hours > 0
      ? `${state.hours}h ${String(state.minutes).padStart(2, "0")}m`
      : `${state.minutes}m`;

  const label =
    state.status === "in_progress" ? "Finaliza en" : "Comienza en";

  return (
    <div
      className={`glass-reservations__countdown glass-reservations__countdown--${state.level}`}
    >
      <span className="glass-reservations__countdown-label">
        {label}
      </span>
      <span className="glass-reservations__countdown-time">
        {timeStr}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function TodayHero({
  reservations,
  countdown,
  nextReservation,
  dayTimeline,
}: TodayHeroProps) {
  const primary = nextReservation ?? reservations[0];
  if (!primary) return null;

  return (
    <div
      className="glass-reservations__today-hero"
      aria-label="Tu reserva de hoy"
    >
      <span className="glass-reservations__today-hero-label">
        <CalendarDays size={10} />
        Hoy
      </span>

      <h3 className="glass-reservations__today-hero-facility">
        {primary.facility_name}
      </h3>
      <p className="glass-reservations__today-hero-time">
        {primary.start_time} — {primary.end_time}
        {reservations.length > 1 &&
          ` · +${reservations.length - 1} más hoy`}
      </p>

      {countdown && countdown.status !== "past" && (
        <CountdownDisplay state={countdown} />
      )}

      {dayTimeline && <DayTimeline data={dayTimeline} />}
    </div>
  );
}