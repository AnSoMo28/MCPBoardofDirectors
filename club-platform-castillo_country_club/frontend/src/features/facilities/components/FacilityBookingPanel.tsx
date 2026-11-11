// src/features/facilities/components/FacilityBookingPanel.tsx
// ═══════════════════════════════════════════════════════════
// FACILITY BOOKING PANEL — "La Reserva"
//
// Reservation list with status filters, crowd level (Prop #2),
// revenue indicator (Prop #6), and hover details.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — row entry stagger
//   ✅ SENSE 2: REACCIÓN — row hover translateY(-1px), details reveal
//   ✅ SENSE 3: MEMORIA — status, crowd, revenue, dates
//   ✅ SENSE 4: INTENCIÓN — Nueva Reserva CTA, status filter
//   ✅ SENSE 5: SINIESTRÍA — no_show/cancelled muted, confirmed accent
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — reservation summary sentence
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";

import {
  Calendar,
  Plus,
  Clock,
  Users,
  MapPin,
  ChevronRight,
  DollarSign,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  FacilityReservation,
  ReservationStatus,
  RevenueModel,
  OccupancyPrediction,
  CrowdLevel,
  FacilitiesDashboardMode,
} from "../types";

import "./FacilityBookingPanel.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type StatusFilter = "all" | ReservationStatus;

export interface FacilityBookingPanelProps {
  reservations: FacilityReservation[];
  revenueModels?: Record<string, RevenueModel>;
  occupancyPredictions?: Record<string, OccupancyPrediction>;
  isLoading?: boolean;
  ambientMode?: FacilitiesDashboardMode;
  onNewBooking?: () => void;
  onViewReservation?: (reservationId: string) => void;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const FILTER_ORDER: StatusFilter[] = [
  "all",
  "confirmed",
  "pending",
  "completed",
  "no_show",
  "cancelled",
];

const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  completed: "Completada",
  no_show: "No show",
  cancelled: "Cancelada",
};

const CROWD_LABELS: Record<CrowdLevel, string> = {
  empty: "Vacío",
  quiet: "Tranquilo",
  normal: "Normal",
  busy: "Ocupado",
  crowded: "Lleno",
  overloaded: "Sobrecargado",
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs.toLocaleString("es-CR")}`;
}

function parseDayNum(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDate();
}

function parseWeekday(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CR", { weekday: "short" });
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  reservations: FacilityReservation[],
  activeFilter: StatusFilter,
): string {
  if (reservations.length === 0) {
    return "Sin reservas registradas.";
  }

  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const pending = reservations.filter((r) => r.status === "pending").length;

  const parts: string[] = [];
  parts.push(`${reservations.length} reserva${reservations.length > 1 ? "s" : ""}.`);

  if (confirmed > 0) {
    parts.push(`${confirmed} confirmada${confirmed > 1 ? "s" : ""}.`);
  }
  if (pending > 0) {
    parts.push(`${pending} pendiente${pending > 1 ? "s" : ""}.`);
  }

  if (activeFilter !== "all") {
    const filterLabel = STATUS_LABELS[activeFilter] ?? activeFilter;
    const filteredCount = reservations.filter((r) => r.status === activeFilter).length;
    parts.push(`Mostrando: ${filteredCount} ${filterLabel.toLowerCase()}.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function FilterBar({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  counts: Record<string, number>;
}) {
  return (
    <nav className="fac-booking-pan__filters" aria-label="Filtrar por estado">
      {FILTER_ORDER.map((f) => {
        const label = f === "all" ? "Todas" : (STATUS_LABELS[f as ReservationStatus] ?? f);
        const count = counts[f] ?? 0;
        const isActive = activeFilter === f;

        return (
          <Button
            variant="unstyled"
            key={f}
            type="button"
            className="fac-booking-pan__pill"
            data-active={isActive ? "true" : undefined}
            data-res-status={f !== "all" ? f : undefined}
            onClick={() => onFilterChange(f)}
            aria-pressed={isActive}
          >
            {label}
            <span className="fac-booking-pan__pill-count">{count}</span>
          </Button>
        );
      })}
    </nav>
  );
}

function ReservationRow({
  reservation,
  revenue,
  occupancy,
  index,
  prefersReduced,
  onView,
}: {
  reservation: FacilityReservation;
  revenue: RevenueModel | undefined;
  occupancy: OccupancyPrediction | undefined;
  index: number;
  prefersReduced: boolean;
  onView?: (id: string) => void;
}) {
  const dayNum = parseDayNum(reservation.date);
  const weekday = parseWeekday(reservation.date);

  const crowdLevel = occupancy?.current_crowd_level;
  const revenueAmount = revenue?.current?.revenue_per_month;

  return (
    <div
      className="fac-booking-pan__row"
      data-res-status={reservation.status}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
      onClick={() => onView?.(reservation.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView?.(reservation.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${reservation.family_name} — ${reservation.facility_name} — ${reservation.start_time}`}
    >
      {/* Date block */}
      <div className="fac-booking-pan__date" data-res-status={reservation.status}>
        <span className="fac-booking-pan__date-weekday">{weekday}</span>
        <span className="fac-booking-pan__date-day">{dayNum}</span>
      </div>

      <div className="fac-booking-pan__divider" />

      {/* Content */}
      <div className="fac-booking-pan__content">
        <div className="fac-booking-pan__content-head">
          <span className="fac-booking-pan__facility">{reservation.facility_name}</span>
          <span className="fac-booking-pan__badge" data-res-status={reservation.status}>
            {STATUS_LABELS[reservation.status] ?? reservation.status}
          </span>
        </div>

        <div className="fac-booking-pan__content-meta">
          <span className="fac-booking-pan__meta-item">
            <Clock className="fac-booking-pan__meta-icon" />
            {reservation.start_time}–{reservation.end_time}
          </span>
          <span className="fac-booking-pan__meta-item">
            <Users className="fac-booking-pan__meta-icon" />
            {reservation.guest_count}
          </span>
          <span className="fac-booking-pan__meta-item">
            <MapPin className="fac-booking-pan__meta-icon" />
            {reservation.family_name}
          </span>

          {/* Crowd level (Prop #2) */}
          {crowdLevel && (
            <span className="fac-booking-pan__crowd" data-crowd-level={crowdLevel}>
              {CROWD_LABELS[crowdLevel] ?? crowdLevel}
              {occupancy && (
                <span className="fac-booking-pan__crowd-pct">
                  {" "}{Math.round(occupancy.current_pct)}%
                </span>
              )}
            </span>
          )}

          {/* Revenue (Prop #6) */}
          {revenueAmount !== undefined && revenueAmount > 0 && (
            <span className="fac-booking-pan__revenue">
              <DollarSign className="fac-booking-pan__meta-icon" />
              {formatCRC(revenueAmount)}/mes
            </span>
          )}
        </div>

        {reservation.purpose && (
          <p className="fac-booking-pan__purpose">{reservation.purpose}</p>
        )}
      </div>

      {/* Hover details */}
      <div className="fac-booking-pan__details">
        {reservation.notes && (
          <p className="fac-booking-pan__detail-notes">{reservation.notes}</p>
        )}
        {reservation.created_at && (
          <span className="fac-booking-pan__detail-created">
            Creada: {reservation.created_at.split("T")[0]}
          </span>
        )}
      </div>

      <ChevronRight className="fac-booking-pan__arrow" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function FacilityBookingPanel({
  reservations,
  revenueModels,
  occupancyPredictions,
  isLoading,
  ambientMode = "calm",
  onNewBooking,
  onViewReservation,
}: FacilityBookingPanelProps) {
  const prefersReduced = useReducedMotion();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: reservations.length,
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    for (const r of reservations) {
      c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [reservations]);

  // Filtered + sorted
  const sorted = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? reservations
        : reservations.filter((r) => r.status === statusFilter);

    return [...filtered].sort(
      (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time),
    );
  }, [reservations, statusFilter]);

  const narrative = buildNarrative(reservations, statusFilter);

  // Loading
  if (isLoading) {
    return (
      <div className="fac-booking-pan" data-mode={ambientMode}>
        <div className="fac-booking-pan__skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fac-booking-pan__skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fac-booking-pan"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <header className="fac-booking-pan__header">
        <div className="fac-booking-pan__header-left">
          <Calendar className="fac-booking-pan__header-icon" />
          <div className="fac-booking-pan__header-text">
            <h3 className="fac-booking-pan__title">Reservas</h3>
            <p className="fac-booking-pan__subtitle">{reservations.length} total</p>
          </div>
        </div>

        {onNewBooking && (
          <Button variant="unstyled" type="button" className="fac-booking-pan__new-btn" onClick={onNewBooking}>
            <Plus className="fac-booking-pan__new-icon" />
            Nueva Reserva
          </Button>
        )}
      </header>

      {/* Narrative (Sense 7) */}
      <p className="fac-booking-pan__narrative">{narrative}</p>

      {/* Filters */}
      <FilterBar
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        counts={counts}
      />

      {/* List */}
      {sorted.length === 0 ? (
        <div className="fac-booking-pan__empty-wrap">
          <p className="fac-booking-pan__empty-text">{narrative}</p>
        </div>
      ) : (
        <div className="fac-booking-pan__list">
          {sorted.map((r, i) => (
            <ReservationRow
              key={r.id}
              reservation={r}
              revenue={revenueModels?.[r.facility_id]}
              occupancy={occupancyPredictions?.[r.facility_id]}
              index={i}
              prefersReduced={prefersReduced}
              onView={onViewReservation}
            />
          ))}
        </div>
      )}
    </div>
  );
}