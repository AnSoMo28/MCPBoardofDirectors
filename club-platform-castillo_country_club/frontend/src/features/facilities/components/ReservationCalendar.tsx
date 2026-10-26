// src/features/facilities/ReservationCalendar.tsx
// ═══════════════════════════════════════════════════════════
// RESERVATION CALENDAR — "El Compás"
//
// Week/Day calendar view for facility reservations.
// Consumes reservation data via useMCPQuery.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — block stagger, current hour line
//   ✅ SENSE 2: REACCIÓN — block hover translateY(-1px)
//   ✅ SENSE 3: MEMORIA — reservation count, status legend
//   ✅ SENSE 4: INTENCIÓN — Nueva reserva CTA, slot click
//   ✅ SENSE 5: SINIESTRÍA — today column accent, current hour
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — calendar summary sentence
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";

import { RESERVATION_STATUS_DISPLAY } from "../types";

import type {
  FacilityReservation,
  ReservationStatus,
  FacilitiesDashboardMode,
} from "../types";

import "./ReservationCalendar.css";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type ViewMode = "week" | "day";

interface CalendarQueryResponse {
  reservations: FacilityReservation[];
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const OPEN_HOUR = 6;
const CLOSE_HOUR = 22;
const WEEK_DAYS = 7;
const SKELETON_ROWS = CLOSE_HOUR - OPEN_HOUR;

const HOUR_SLOTS: ReadonlyArray<number> = (() => {
  const slots: number[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) slots.push(h);
  return slots;
})();

const STATUS_ORDER: ReadonlyArray<ReservationStatus> = [
  "confirmed",
  "pending",
  "completed",
  "no_show",
  "cancelled",
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function currentHour(): number {
  return new Date().getHours();
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function parseHour(timeStr: string): number {
  return parseInt(timeStr.split(":")[0], 10);
}

function getDayName(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CR", { weekday: "short" });
}

function getDayLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

function getFullDateLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getDayNum(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDate();
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getWeekDates(anchor: string): string[] {
  const d = new Date(anchor + "T12:00:00");
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dow + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < WEEK_DAYS; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(dd.toISOString().split("T")[0]);
  }
  return dates;
}

function groupByDate(reservations: FacilityReservation[]): Map<string, FacilityReservation[]> {
  const map = new Map<string, FacilityReservation[]>();
  for (const r of reservations) {
    if (!map.has(r.date)) map.set(r.date, []);
    map.get(r.date)!.push(r);
  }
  return map;
}

function buildHourMap(dayRes: FacilityReservation[]): Map<number, FacilityReservation> {
  const map = new Map<number, FacilityReservation>();
  for (const res of dayRes) {
    const startH = parseHour(res.start_time);
    const endH = parseHour(res.end_time);
    for (let h = startH; h < endH; h++) {
      map.set(h, res);
    }
  }
  return map;
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  reservations: FacilityReservation[],
  _viewMode: ViewMode,
  dateLabel: string,
): string {
  if (reservations.length === 0) {
    return `Sin reservas para ${dateLabel}.`;
  }

  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const pending = reservations.filter((r) => r.status === "pending").length;

  const parts: string[] = [];
  parts.push(`${reservations.length} reserva${reservations.length > 1 ? "s" : ""} para ${dateLabel}.`);

  if (confirmed > 0) {
    parts.push(`${confirmed} confirmada${confirmed > 1 ? "s" : ""}.`);
  }
  if (pending > 0) {
    parts.push(`${pending} pendiente${pending > 1 ? "s" : ""}.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface ReservationCalendarProps {
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function CalendarSkeleton() {
  return (
    <div className="fac-cal__skeleton">
      <div className="fac-cal__skeleton-toolbar" />
      <div className="fac-cal__skeleton-grid">
        <div className="fac-cal__skeleton-gutter">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className="fac-cal__skeleton-gutter-cell" />
          ))}
        </div>
        {Array.from({ length: WEEK_DAYS }).map((_, col) => (
          <div key={col} className="fac-cal__skeleton-col">
            <div className="fac-cal__skeleton-col-head" />
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <div key={i} className="fac-cal__skeleton-slot" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeGutter() {
  return (
    <div className="fac-cal__gutter" aria-hidden="true">
      <div className="fac-cal__gutter-head" />
      {HOUR_SLOTS.map((hour) => (
        <div key={hour} className="fac-cal__gutter-slot">
          <span className="fac-cal__gutter-label">{formatHour(hour)}</span>
        </div>
      ))}
    </div>
  );
}

function DayHeader({ date, isToday }: { date: string; isToday: boolean }) {
  return (
    <div className="fac-cal__day-head" data-today={isToday}>
      <span className="fac-cal__day-name">{getDayName(date)}</span>
      <span className="fac-cal__day-num">{getDayNum(date)}</span>
    </div>
  );
}

function WeekBlock({
  reservation,
  blockIndex,
  prefersReduced,
  onClick,
}: {
  reservation: FacilityReservation;
  blockIndex: number;
  prefersReduced: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="fac-cal__block"
      data-status={reservation.status}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": blockIndex } as React.CSSProperties)
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${reservation.family_name} — ${reservation.start_time} a ${reservation.end_time}`}
    >
      <span className="fac-cal__block-name">{reservation.family_name}</span>
      <span className="fac-cal__block-time">
        {reservation.start_time}–{reservation.end_time}
      </span>
    </div>
  );
}

function DayColumn({
  date,
  reservations,
  isToday,
  nowHour,
  prefersReduced,
  onSlotClick,
  onReservationClick,
}: {
  date: string;
  reservations: FacilityReservation[];
  isToday: boolean;
  nowHour: number;
  prefersReduced: boolean;
  onSlotClick: (date: string, hour: number) => void;
  onReservationClick: (id: string) => void;
}) {
  const hourMap = useMemo(() => buildHourMap(reservations), [reservations]);
  let blockIdx = 0;

  return (
    <div className="fac-cal__day-col" data-today={isToday}>
      <DayHeader date={date} isToday={isToday} />

      {HOUR_SLOTS.map((hour) => {
        const reservation = hourMap.get(hour);
        const isStart = reservation && parseHour(reservation.start_time) === hour;
        const isCurrentHour = isToday && hour === nowHour;

        return (
          <div
            key={hour}
            className="fac-cal__slot"
            data-occupied={!!reservation}
            data-current={isCurrentHour ? "true" : undefined}
            onClick={() => {
              if (!reservation) onSlotClick(date, hour);
            }}
            role={!reservation ? "button" : undefined}
            tabIndex={!reservation ? 0 : undefined}
            aria-label={!reservation ? `Crear reserva ${date} ${formatHour(hour)}` : undefined}
          >
            {isCurrentHour && <span className="fac-cal__slot-now-line" />}
            {isStart && reservation && (
              <WeekBlock
                reservation={reservation}
                blockIndex={blockIdx++}
                prefersReduced={prefersReduced}
                onClick={() => onReservationClick(reservation.id)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekView({
  weekDates,
  today,
  nowHour,
  prefersReduced,
  reservationsByDate,
  onSlotClick,
  onReservationClick,
}: {
  weekDates: string[];
  today: string;
  nowHour: number;
  prefersReduced: boolean;
  reservationsByDate: Map<string, FacilityReservation[]>;
  onSlotClick: (date: string, hour: number) => void;
  onReservationClick: (id: string) => void;
}) {
  return (
    <div className="fac-cal__week" role="grid">
      <TimeGutter />
      {weekDates.map((date) => (
        <DayColumn
          key={date}
          date={date}
          reservations={reservationsByDate.get(date) ?? []}
          isToday={date === today}
          nowHour={nowHour}
          prefersReduced={prefersReduced}
          onSlotClick={onSlotClick}
          onReservationClick={onReservationClick}
        />
      ))}
    </div>
  );
}

function DayBlock({
  reservation,
  onClick,
}: {
  reservation: FacilityReservation;
  onClick: () => void;
}) {
  return (
    <div
      className="fac-cal__day-block"
      data-status={reservation.status}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${reservation.family_name} — ${reservation.start_time} a ${reservation.end_time}`}
    >
      <div className="fac-cal__day-block-head">
        <span className="fac-cal__day-block-name">{reservation.family_name}</span>
        <span className="fac-cal__day-block-time">
          {reservation.start_time} — {reservation.end_time}
        </span>
      </div>
      {reservation.notes && (
        <p className="fac-cal__day-block-notes">{reservation.notes}</p>
      )}
      {reservation.guest_count > 0 && (
        <span className="fac-cal__day-block-guests">
          {reservation.guest_count} invitado{reservation.guest_count !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function DayView({
  anchorDate,
  reservations,
  nowHour,
  onSlotClick,
  onReservationClick,
}: {
  anchorDate: string;
  reservations: FacilityReservation[];
  nowHour: number;
  onSlotClick: (date: string, hour: number) => void;
  onReservationClick: (id: string) => void;
}) {
  const hourMap = useMemo(() => buildHourMap(reservations), [reservations]);
  const isToday = anchorDate === todayISO();

  return (
    <div className="fac-cal__day" role="grid">
      {/* Legend */}
      <div className="fac-cal__legend" aria-label="Leyenda de estados">
        {STATUS_ORDER.map((status) => {
          const cfg = RESERVATION_STATUS_DISPLAY[status];
          if (!cfg) return null;
          return (
            <div key={status} className="fac-cal__legend-item">
              <span className="fac-cal__legend-swatch" data-status={status} />
              <span className="fac-cal__legend-label">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Hour rows */}
      {HOUR_SLOTS.map((hour) => {
        const reservation = hourMap.get(hour);
        const isStart = reservation && parseHour(reservation.start_time) === hour;
        const isCurrentHour = isToday && hour === nowHour;

        return (
          <div
            key={hour}
            className="fac-cal__day-row"
            data-occupied={!!reservation}
            data-current={isCurrentHour ? "true" : undefined}
            onClick={() => {
              if (!reservation) onSlotClick(anchorDate, hour);
            }}
            role={!reservation ? "button" : undefined}
            tabIndex={!reservation ? 0 : undefined}
          >
            <div className="fac-cal__day-row-gutter">
              <span className="fac-cal__day-row-label">{formatHour(hour)}</span>
            </div>
            <div className="fac-cal__day-row-content">
              {isCurrentHour && <span className="fac-cal__day-now-line" />}
              {isStart && reservation && (
                <DayBlock
                  reservation={reservation}
                  onClick={() => onReservationClick(reservation.id)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ReservationCalendar({
  ambientMode = "calm",
}: ReservationCalendarProps) {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [anchorDate, setAnchorDate] = useState(todayISO);
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  const today = todayISO();
  const nowHour = currentHour();
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);

  const dateFrom = viewMode === "week" ? weekDates[0] : anchorDate;
  const dateTo = viewMode === "week" ? weekDates[6] : anchorDate;

  const { data, isLoading, isError, error } = useMCPQuery<CalendarQueryResponse>(
    "facilities",
    "list_reservations",
    { facilityId, dateFrom, dateTo },
    { enabled: !!facilityId },
  );

  const reservations = data?.reservations ?? [];
  const reservationsByDate = useMemo(() => groupByDate(reservations), [reservations]);

  // Narrative (Sense 7)
  const dateLabel = viewMode === "week"
    ? `${getDayLabel(weekDates[0])} — ${getDayLabel(weekDates[6])}`
    : getFullDateLabel(anchorDate);
  const narrative = buildNarrative(reservations, viewMode, dateLabel);

  // Handlers
  const handlePrev = useCallback(() => {
    setAnchorDate((d) => (viewMode === "week" ? addDays(d, -7) : addDays(d, -1)));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setAnchorDate((d) => (viewMode === "week" ? addDays(d, 7) : addDays(d, 1)));
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setAnchorDate(todayISO());
  }, []);

  const handleSlotClick = useCallback(
    (date: string, hour: number) => {
      navigate(`/admin/facilities/${facilityId}/reservations/new?date=${date}&hour=${hour}`);
    },
    [facilityId, navigate],
  );

  const handleReservationClick = useCallback(
    (reservationId: string) => {
      navigate(`/admin/events/${reservationId}`);
    },
    [navigate],
  );

  return (
    <PageContainer
      title="Reservaciones"
      subtitle={`${reservations.length} reservas en el período`}
      breadcrumbs={[
        { label: "Instalaciones", href: "/admin/facilities" },
        { label: "Reservaciones" },
      ]}
      actions={
        <PermissionGate roles={["ADMIN", "STAFF", "SOCIO"]}>
          <button
            type="button"
            className="fac-cal__new-btn"
            onClick={() => navigate(`/admin/facilities/${facilityId}/reservations/new`)}
          >
            <Plus className="fac-cal__new-icon" />
            Nueva reserva
          </button>
        </PermissionGate>
      }
    >
      <div
        className="fac-cal"
        data-mode={ambientMode}
        data-view={viewMode}
        data-prefers-reduced={prefersReduced ? "true" : undefined}
      >
        {/* Toolbar */}
        <nav className="fac-cal__toolbar" aria-label="Navegación del calendario">
          <div className="fac-cal__toolbar-left">
            <button type="button" className="fac-cal__nav-btn" onClick={handlePrev} aria-label={viewMode === "week" ? "Semana anterior" : "Día anterior"}>
              <ChevronLeft className="fac-cal__nav-icon" />
            </button>
            <button type="button" className="fac-cal__today-btn" onClick={handleToday}>
              Hoy
            </button>
            <button type="button" className="fac-cal__nav-btn" onClick={handleNext} aria-label={viewMode === "week" ? "Semana siguiente" : "Día siguiente"}>
              <ChevronRight className="fac-cal__nav-icon" />
            </button>
            <h3 className="fac-cal__toolbar-title">{dateLabel}</h3>
          </div>

          <div className="fac-cal__toggle" role="group" aria-label="Vista">
            {(["week", "day"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="fac-cal__toggle-btn"
                data-active={viewMode === mode ? "true" : undefined}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
              >
                {mode === "week" ? "Semana" : "Día"}
              </button>
            ))}
          </div>
        </nav>

        {/* Narrative (Sense 7) */}
        <p className="fac-cal__narrative">{narrative}</p>

        {/* Content */}
        {isLoading ? (
          <CalendarSkeleton />
        ) : isError ? (
          <div className="fac-cal__error" role="alert">
            <AlertTriangle className="fac-cal__error-icon" />
            <p className="fac-cal__error-title">Error al cargar reservas</p>
            <p className="fac-cal__error-desc">
              {(error as Error)?.message ?? "Intentá de nuevo más tarde."}
            </p>
          </div>
        ) : viewMode === "week" ? (
          <WeekView
            weekDates={weekDates}
            today={today}
            nowHour={nowHour}
            prefersReduced={prefersReduced}
            reservationsByDate={reservationsByDate}
            onSlotClick={handleSlotClick}
            onReservationClick={handleReservationClick}
          />
        ) : (
          <DayView
            anchorDate={anchorDate}
            reservations={reservationsByDate.get(anchorDate) ?? []}
            nowHour={nowHour}
            onSlotClick={handleSlotClick}
            onReservationClick={handleReservationClick}
          />
        )}
      </div>
    </PageContainer>
  );
}