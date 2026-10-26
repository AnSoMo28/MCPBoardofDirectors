// ═══════════════════════════════════════════════════════════
// src/features/sports/components/CourtBookingPanel.tsx
// §B4.5 — Court Booking Panel V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Court reservation management. Utilization bars, stats grid,
// filters, reservation list. Data-driven via props.
// Living Protocol: 7/7
//
// VERIFIED TYPES:
//   CourtUtilization_Contract    → from @/shared/mocks/contracts
//   ManageCourtReservations_Contract → MCP response, .reservation? extracted
//   ReservationStatus            → enum: pending/confirmed/cancelled/blocked
//   RESERVATION_STATUS_CONFIG    → { label, color, bgColor }
//   SPORT_CONFIG                 → { label, icon, color, ... }
//   utilizationToBarData         → from ../types
//
// CHANGES FROM V1:
//   ✗ cn() → BEM
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color/backgroundColor }} → data-attributes
//   ✗ useMCPQuery → reservations as prop
//   ✗ showToast → onReservationCreated callback
//   ✗ Loader2 → shimmer skeleton
//   ✗ Button → BEM button
//   ✗ className → removed
//   ✗ Dead imports: cn, Loader2, showToast, useMCPQuery, Button, Filter
//     (Filter icon kept — used in filters section)
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component CourtBookingPanel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  Filter,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Ban,
  Clock3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  SportsDashboardMode,
  ReservationStatus,
  SportType,
} from "../types";
import {
  RESERVATION_STATUS_CONFIG,
  SPORT_CONFIG,
  utilizationToBarData,
} from "../types";
import type { CourtUtilization_Contract } from "@/shared/mocks/contracts";
// import { EmptyState } from "@/shared/components/ui/EmptyState"; // ← V1 path
// import { EmptyState } from "@/shared/components/ui/EmptyState";    // ← user-provided path
// USING @/shared/components/ui/EmptyState based on user-provided source
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ReservationFormModal } from "./ReservationFormModal";
import "./CourtBookingPanel.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Court reservation — extracted from ManageCourtReservations_Contract.reservation
 * Fields verified against V1 usage (r.id, r.court_name, r.sport, r.status,
 * r.date, r.start_time, r.end_time, r.member_name)
 */
export interface CourtReservation {
  id: string;
  court_name: string;
  sport: string;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  member_name: string;
}

export interface CourtBookingPanelProps {
  courtUtilization: CourtUtilization_Contract[];
  reservations: CourtReservation[];
  isLoading?: boolean;
  ambientMode?: SportsDashboardMode;
  onReservationCreated?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const STATUS_ICONS: Record<string, LucideIcon> = {
  confirmed: CheckCircle2,
  pending: Clock3,
  cancelled: XCircle,
  blocked: Ban,
};

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "pending", label: "Pendientes" },
  { value: "cancelled", label: "Canceladas" },
  { value: "blocked", label: "Bloqueadas" },
];

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function deriveStats(reservations: CourtReservation[]) {
  let confirmed = 0;
  let pending = 0;
  let cancelled = 0;
  let blocked = 0;

  for (const r of reservations) {
    switch (r.status) {
      case "confirmed": confirmed++; break;
      case "pending":   pending++;   break;
      case "cancelled": cancelled++; break;
      case "blocked":   blocked++;   break;
    }
  }

  return {
    total: reservations.length,
    confirmed,
    pending,
    cancelled,
    blocked,
  };
}

function deriveAvailableSports(reservations: CourtReservation[]): SportType[] {
  const sports = new Set<string>();
  for (const r of reservations) {
    sports.add(r.sport);
  }
  return Array.from(sports).sort() as SportType[];
}

function deriveUtilLevel(utilPct: number): "high" | "medium" | "low" | "critical" {
  if (utilPct >= 65) return "high";
  if (utilPct >= 40) return "medium";
  if (utilPct >= 25) return "low";
  return "critical";
}

function buildBookingNarrative(
  total: number,
  confirmed: number,
  pending: number,
  courtCount: number,
): string {
  return (
    `Panel de reservas: ${total} reserva${total !== 1 ? "s" : ""} ` +
    `(${confirmed} confirmada${confirmed !== 1 ? "s" : ""}, ` +
    `${pending} pendiente${pending !== 1 ? "s" : ""}). ` +
    `${courtCount} cancha${courtCount !== 1 ? "s" : ""} trackeada${courtCount !== 1 ? "s" : ""}.`
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 UtilizationBars ─────────────────────────────────

function UtilizationBars({ bars }: { bars: ReturnType<typeof utilizationToBarData> }) {
  if (bars.length === 0) return null;

  return (
    <div className="spt-booking__util">
      <p className="spt-booking__util-label">
        Utilización por cancha (30 días)
      </p>
      <div className="spt-booking__util-bars">
        {bars.map((bar) => {
          const level = deriveUtilLevel(bar.utilization);

          return (
            <div key={bar.court} className="spt-booking__util-row">
              <div className="spt-booking__util-info">
                <p className="spt-booking__util-court">{bar.court}</p>
                <p className="spt-booking__util-sport">{bar.sport}</p>
              </div>
              <div className="spt-booking__bar-track">
                <div
                  className="spt-booking__bar-fill"
                  data-level={level}
                  style={{ width: `${Math.min(100, bar.utilization)}%` }}
                />
              </div>
              <span className="spt-booking__bar-value" data-level={level}>
                {bar.utilization.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── §4.2 StatsGrid ───────────────────────────────────────

function StatsGrid({ stats }: { stats: ReturnType<typeof deriveStats> }) {
  const items = [
    { label: "Total", value: stats.total, level: "default" as const },
    { label: "Confirmadas", value: stats.confirmed, level: "high" as const },
    { label: "Pendientes", value: stats.pending, level: "medium" as const },
    { label: "Canceladas", value: stats.cancelled, level: "critical" as const },
  ];

  return (
    <div className="spt-booking__stats">
      {items.map((item) => (
        <div
          key={item.label}
          className="spt-booking__stat-card"
          data-level={item.level}
        >
          <p className="spt-booking__stat-label">{item.label}</p>
          <p className="spt-booking__stat-value" data-level={item.level}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── §4.3 Filters ─────────────────────────────────────────

function Filters({
  sportFilter,
  statusFilter,
  availableSports,
  resultCount,
  onSportChange,
  onStatusChange,
}: {
  sportFilter: string;
  statusFilter: string;
  availableSports: SportType[];
  resultCount: number;
  onSportChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}) {
  return (
    <div className="spt-booking__filters">
      <Filter className="spt-booking__filter-icon" />

      <select
        className="spt-booking__select"
        value={sportFilter}
        onChange={(e) => onSportChange(e.target.value)}
      >
        <option value="all">Todos los deportes</option>
        {availableSports.map((s) => {
          const cfg = SPORT_CONFIG[s];
          return (
            <option key={s} value={s}>
              {cfg?.label ?? s}
            </option>
          );
        })}
      </select>

      <select
        className="spt-booking__select"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <span className="spt-booking__filter-count">
        {resultCount} resultado{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── §4.4 ReservationCard ─────────────────────────────────

function ReservationCard({ reservation }: { reservation: CourtReservation }) {
  const statusCfg =
    RESERVATION_STATUS_CONFIG[reservation.status as ReservationStatus] ??
    RESERVATION_STATUS_CONFIG.pending;
  const sportCfg = SPORT_CONFIG[reservation.sport as SportType];
  const StatusIcon = STATUS_ICONS[reservation.status] ?? Clock3;

  return (
    <div
      className="spt-booking__card"
      data-status={reservation.status}
    >
      {/* Status icon */}
      <div className="spt-booking__card-icon" data-status={reservation.status}>
        <StatusIcon className="spt-booking__card-icon-svg" data-status={reservation.status} />
      </div>

      {/* Info */}
      <div className="spt-booking__card-info">
        <div className="spt-booking__card-title-row">
          <span className="spt-booking__card-court">
            {reservation.court_name}
          </span>
          <span className="spt-booking__card-sport-icon">
            {sportCfg?.icon}
          </span>
          <span
            className="spt-booking__card-status-badge"
            data-status={reservation.status}
          >
            {statusCfg.label}
          </span>
        </div>
        <div className="spt-booking__card-meta">
          <span className="spt-booking__card-meta-item">
            <CalendarDays className="spt-booking__card-meta-icon" />
            {reservation.date}
          </span>
          <span className="spt-booking__card-meta-item">
            <Clock className="spt-booking__card-meta-icon" />
            {reservation.start_time}–{reservation.end_time}
          </span>
          <span className="spt-booking__card-meta-item">
            <MapPin className="spt-booking__card-meta-icon" />
            {reservation.member_name}
          </span>
        </div>
      </div>

      {/* Sport label (desktop) */}
      <span className="spt-booking__card-sport-label">
        {sportCfg?.label ?? reservation.sport}
      </span>
    </div>
  );
}

// ── §4.5 ShimmerSkeleton ─────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div className="spt-booking__skeleton" role="status" aria-label="Cargando reservas">
      <div className="spt-booking__skeleton-block spt-booking__skeleton-block--short" />
      <div className="spt-booking__skeleton-block spt-booking__skeleton-block--card" />
      <div className="spt-booking__skeleton-block spt-booking__skeleton-block--card" />
      <div className="spt-booking__skeleton-block spt-booking__skeleton-block--card" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function CourtBookingPanel({
  courtUtilization,
  reservations,
  isLoading = false,
  ambientMode = "calm",
  onReservationCreated,
}: CourtBookingPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Derived data ──
  const stats = useMemo(() => deriveStats(reservations), [reservations]);

  const utilizationBars = useMemo(
    () => utilizationToBarData(courtUtilization),
    [courtUtilization],
  );

  const availableSports = useMemo(
    () => deriveAvailableSports(reservations),
    [reservations],
  );

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (sportFilter !== "all" && r.sport !== sportFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [reservations, sportFilter, statusFilter]);

  // ── Narrative (LP 7) ──
  const narrative = useMemo(
    () => buildBookingNarrative(stats.total, stats.confirmed, stats.pending, courtUtilization.length),
    [stats.total, stats.confirmed, stats.pending, courtUtilization.length],
  );

  // ── Handlers ──
  const handleFormClose = useCallback(() => setShowForm(false), []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    onReservationCreated?.();
  }, [onReservationCreated]);

  // ── Render ──
  return (
    <section
      className="spt-booking"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-booking__header">
        <h3 className="spt-booking__title">🎾 Reservaciones de Canchas</h3>
        <button
          type="button"
          className="spt-booking__new-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus className="spt-booking__new-btn-icon" />
          Nueva Reserva
        </button>
      </div>

      {/* ── Utilization Bars ── */}
      <UtilizationBars bars={utilizationBars} />

      {/* ── Stats ── */}
      <StatsGrid stats={stats} />

      {/* ── Filters ── */}
      <Filters
        sportFilter={sportFilter}
        statusFilter={statusFilter}
        availableSports={availableSports}
        resultCount={filteredReservations.length}
        onSportChange={setSportFilter}
        onStatusChange={setStatusFilter}
      />

      {/* ── Reservations List ── */}
      {isLoading ? (
        <ShimmerSkeleton />
      ) : filteredReservations.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-6 h-6" />}
          title="Sin reservaciones"
          description="No hay reservas de canchas con los filtros seleccionados."
          compact
        />
      ) : (
        <div className="spt-booking__list">
          {filteredReservations.map((r, _i) => (
            <ReservationCard
              key={r.id}
              reservation={r}
            />
          ))}
        </div>
      )}

      {/* ── Footer: Narrative (LP 7) ── */}
      <div className="spt-booking__footer">
        <p className="spt-booking__narrative">{narrative}</p>
      </div>

      {/* ── Modal ── */}
      {showForm && (
        <ReservationFormModal
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          courtUtilization={courtUtilization}
        />
      )}
    </section>
  );
}