/**
 * @component ReservationCard (Fase 25)
 * @namespace .glass-reservations__card
 * @depends MyReservations.css
 * @note Reservation card with date block, status, meta, and quick rebook
 *       for completed reservations.
 * @import import './MyReservations.css';
 */

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Clock,
  CalendarDays,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import { RESERVATION_STATUS } from "./config";
import type { Reservation } from "./types";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function getTodayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface ReservationCardProps {
  reservation: Reservation;
  index: number;
}

export function ReservationCard({
  reservation,
  index,
}: ReservationCardProps) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const config = RESERVATION_STATUS[reservation.status];
  const StatusIcon = config.icon;

  const isPast = reservation.date < getTodayLocal();
  const isCompleted = reservation.status === "completed";

  const dateObj = new Date(reservation.date + "T12:00:00");
  const dateDisplay = dateObj.toLocaleDateString("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const monthShort = dateObj
    .toLocaleDateString("es-CR", { month: "short" })
    .slice(0, 3);
  const dayNum = dateObj.getDate();

  const isActive =
    reservation.status === "confirmed" && !isPast;

  const handleClick = useCallback(() => {
    navigate(`/mi-club/reservas/${reservation.id}`);
  }, [navigate, reservation.id]);

  const handleRebook = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(
        `/mi-club/reservas/nueva?facility=${encodeURIComponent(reservation.facility_name)}&date=${reservation.date}&time=${reservation.start_time}`,
      );
    },
    [navigate, reservation],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.3,
        delay: reducedMotion ? 0 : index * 0.04,
      }}
      className={cn(
        "glass-reservations__card",
        isPast && "glass-reservations__card--past",
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      aria-label={`${reservation.facility_name} — ${config.label}`}
    >
      <div className="glass-reservations__card-inner">
        {/* Date block */}
        <div
          className={cn(
            "glass-reservations__card-date",
            isActive && "glass-reservations__card-date--active",
          )}
        >
          <span className="glass-reservations__card-date-month">
            {monthShort}
          </span>
          <span className="glass-reservations__card-date-day">
            {dayNum}
          </span>
        </div>

        {/* Content */}
        <div className="glass-reservations__card-info">
          <div className="glass-reservations__card-title-row">
            <h4 className="glass-reservations__card-title">
              {reservation.facility_name}
            </h4>
            <span
              className="glass-reservations__card-status"
              style={{
                backgroundColor: config.bgColor,
                color: config.color,
              }}
            >
              <StatusIcon size={10} />
              {config.label}
            </span>
          </div>

          <div className="glass-reservations__card-meta">
            <span className="glass-reservations__card-meta-item">
              <Clock size={11} />
              {reservation.start_time} — {reservation.end_time}
            </span>
            <span className="glass-reservations__card-meta-item">
              <CalendarDays size={11} />
              {dateDisplay}
            </span>
          </div>

          {reservation.notes && (
            <p className="glass-reservations__card-notes">
              {reservation.notes}
            </p>
          )}

          {/* Quick rebook for completed */}
          {isCompleted && (
            <button
              type="button"
              className="glass-reservations__rebook-btn"
              onClick={handleRebook}
            >
              <RefreshCw size={12} />
              Reservar de nuevo
            </button>
          )}
        </div>

        <ArrowRight
          size={14}
          className="glass-reservations__card-arrow"
        />
      </div>
    </motion.div>
  );
}