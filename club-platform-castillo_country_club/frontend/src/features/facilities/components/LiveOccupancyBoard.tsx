// src/features/facilities/components/LiveOccupancyBoard.tsx
// ═══════════════════════════════════════════════════════════
// LIVE OCCUPANCY BOARD — "La Mesa de Control"
//
// Real-time facility status grid with occupancy pulse,
// capacity bars, upcoming reservations, and quick actions.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — pulse indicators, card entry stagger
//   ✅ SENSE 2: REACCIÓN — card hover translateY(-2px), action reveal
//   ✅ SENSE 3: MEMORIA — occupancy %, crowd level, maintenance count
//   ✅ SENSE 4: INTENCIÓN — Reservar ahora / Ver detalle CTAs
//   ✅ SENSE 5: SINIESTRÍA — occupied/maintenance cards dominant
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — board summary sentence
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import {
  MapPin,
  Clock,
  ChevronRight,
  Eye,
  Wrench,
  Users,
  Waves,
  Dumbbell,
  Trophy,
  Target,
  Flag,
  UtensilsCrossed,
  Wine,
  Crown,
  Flower2,
  Car,
  Smile,
  Sparkles,
  Baby,
  Building2,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import { FACILITY_TYPE_CONFIG } from "../config";
import { CROWD_LEVEL_DISPLAY } from "../types";

import type {
  Facility,
  FacilityReservation,
  OccupancyPrediction,
  CrowdLevel,
  MaintenanceTask,
  FacilitiesDashboardMode,
} from "../types";

import "./LiveOccupancyBoard.css";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

type LiveStatus = "available" | "busy" | "occupied" | "maintenance" | "closed";

const BUSY_SOON_MINUTES = 30;
const UPCOMING_LIMIT = 3;

const STATUS_LABELS: Record<LiveStatus, string> = {
  available: "Disponible",
  busy: "Próximamente ocupado",
  occupied: "Ocupado",
  maintenance: "En mantenimiento",
  closed: "Cerrado",
};

function capacityLevel(pct: number): "critical" | "high" | "moderate" | "low" {
  if (pct >= 90) return "critical";
  if (pct >= 70) return "high";
  if (pct >= 40) return "moderate";
  return "low";
}

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Waves, Dumbbell, Trophy, Target, Flag,
  UtensilsCrossed, Wine, Crown, Flower2,
  Car, Smile, Sparkles, Baby,
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function currentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":");
  return parseInt(h ?? "0", 10) * 60 + parseInt(m ?? "0", 10);
}

// ═══════════════════════════════════════════════════════════
// CARD DATA COMPUTATION
// ═══════════════════════════════════════════════════════════

interface OccupancyCardData {
  facility: Facility;
  liveStatus: LiveStatus;
  currentPct: number;
  crowdLevel: CrowdLevel | undefined;
  currentActivity: string | null;
  endTime: string | null;
  upcomingReservations: FacilityReservation[];
  maintenanceCount: number;
}

function computeCardData(
  facilities: Facility[],
  reservations: FacilityReservation[],
  predictions: Record<string, OccupancyPrediction>,
  maintenance: MaintenanceTask[],
): OccupancyCardData[] {
  const today = todayISO();
  const now = currentHHMM();
  const nowMin = timeToMinutes(now);

  const todayRes = reservations.filter((r) => r.date === today);

  return facilities.map((facility) => {
    const facRes = todayRes
      .filter((r) => r.facility_id === facility.id)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

    const current = facRes.find((r) => {
      const s = timeToMinutes(r.start_time);
      const e = timeToMinutes(r.end_time);
      return nowMin >= s && nowMin < e;
    });

    const upcomingSoon = facRes.find((r) => {
      const s = timeToMinutes(r.start_time);
      return s > nowMin && s <= nowMin + BUSY_SOON_MINUTES;
    });

    const upcoming = facRes.filter((r) => timeToMinutes(r.start_time) > nowMin);

    const maintCount = maintenance.filter(
      (t) =>
        t.facility_id === facility.id &&
        t.status !== "completed" &&
        t.status !== "cancelled",
    ).length;

    const occ = predictions[facility.id];

    let liveStatus: LiveStatus;
    let currentActivity: string | null = null;
    let endTime: string | null = null;

    if (facility.status === "maintenance" || facility.status === "renovation") {
      liveStatus = "maintenance";
    } else if (facility.status === "closed") {
      liveStatus = "closed";
    } else if (current) {
      liveStatus = "occupied";
      currentActivity = `${current.purpose} — ${current.family_name}`;
      endTime = current.end_time;
    } else if (upcomingSoon) {
      liveStatus = "busy";
      currentActivity = `${upcomingSoon.start_time}: ${upcomingSoon.purpose}`;
      endTime = upcomingSoon.end_time;
    } else {
      liveStatus = "available";
    }

    return {
      facility,
      liveStatus,
      currentPct: occ?.current_pct ?? 0,
      crowdLevel: occ?.current_crowd_level,
      currentActivity,
      endTime,
      upcomingReservations: upcoming,
      maintenanceCount: maintCount,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(stats: {
  total: number;
  available: number;
  busy: number;
  occupied: number;
  maintenance: number;
}): string {
  const parts: string[] = [];
  parts.push(`Monitoreando ${stats.total} espacio${stats.total !== 1 ? "s" : ""}.`);

  if (stats.occupied > 0) {
    parts.push(`${stats.occupied} ocupado${stats.occupied > 1 ? "s" : ""}.`);
  }
  if (stats.available > 0) {
    parts.push(`${stats.available} disponible${stats.available > 1 ? "s" : ""}.`);
  }
  if (stats.busy > 0) {
    parts.push(`${stats.busy} por ocuparse pronto.`);
  }
  if (stats.maintenance > 0) {
    parts.push(`${stats.maintenance} en mantenimiento.`);
  }

  if (stats.occupied === 0 && stats.maintenance === 0) {
    parts.push("Todo en orden.");
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface LiveOccupancyBoardProps {
  facilities: Facility[];
  occupancyPredictions?: Record<string, OccupancyPrediction>;
  reservations: FacilityReservation[];
  maintenanceTasks?: MaintenanceTask[];
  ambientMode?: FacilitiesDashboardMode;
  onQuickBook?: (facilityId: string, facilityName: string) => void;
  onViewDetail?: (facilityId: string) => void;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Pulse Indicator
// ═══════════════════════════════════════════════════════════

function PulseIndicator({
  status,
  size = 8,
}: {
  status: LiveStatus;
  size?: number;
}) {
  const shouldPulse = status !== "closed";

  return (
    <span
      className="fac-occ__pulse"
      data-live={status}
      style={{ "--pulse-size": `${size}px` } as React.CSSProperties}
    >
      {shouldPulse && <span className="fac-occ__pulse-ring" />}
      <span className="fac-occ__pulse-dot" />
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Capacity Bar
// ═══════════════════════════════════════════════════════════

function CapacityBar({ pct }: { pct: number }) {
  const level = capacityLevel(pct);

  return (
    <div className="fac-occ__bar">
      <div className="fac-occ__bar-head">
        <span className="fac-occ__bar-label">
          <Users className="fac-occ__bar-label-icon" />
          Capacidad
        </span>
        <span className="fac-occ__bar-value" data-capacity={level}>
          {pct}%
        </span>
      </div>
      <div className="fac-occ__bar-track">
        <div
          className="fac-occ__bar-fill"
          data-capacity={level}
          style={{ "--bar-pct": `${pct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Facility Card
// ═══════════════════════════════════════════════════════════

function FacilityCard({
  data,
  index,
  prefersReduced,
  onQuickBook,
  onViewDetail,
}: {
  data: OccupancyCardData;
  index: number;
  prefersReduced: boolean;
  onQuickBook?: (id: string, name: string) => void;
  onViewDetail?: (id: string) => void;
}) {
  const {
    facility,
    liveStatus,
    currentPct,
    crowdLevel,
    currentActivity,
    endTime,
    upcomingReservations,
    maintenanceCount,
  } = data;

  const config = FACILITY_TYPE_CONFIG[facility.facility_type];
  const TypeIcon = TYPE_ICON_MAP[config?.icon ?? ""] ?? Building2;
  const crowdDisplay = crowdLevel ? CROWD_LEVEL_DISPLAY[crowdLevel] : undefined;
  const isDisabled = liveStatus === "closed" || liveStatus === "maintenance";

  return (
    <article
      className="fac-occ__card"
      data-live={liveStatus}
      data-category={config?.category}
      data-disabled={isDisabled ? "true" : undefined}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
      role="article"
      aria-label={`${facility.name}: ${STATUS_LABELS[liveStatus]}`}
    >
      {/* Top accent */}
      <span className="fac-occ__card-accent" data-live={liveStatus} />

      {/* Header */}
      <div className="fac-occ__card-head">
        <div className="fac-occ__card-head-left">
          <div className="fac-occ__card-icon" data-category={config?.category}>
            <TypeIcon className="fac-occ__card-icon-svg" />
          </div>
          <div className="fac-occ__card-head-text">
            <h4 className="fac-occ__card-name">{facility.name}</h4>
            <span className="fac-occ__card-type">
              {config?.label ?? facility.facility_type}
            </span>
          </div>
        </div>
        <PulseIndicator status={liveStatus} />
      </div>

      {/* Status + hours */}
      <div className="fac-occ__card-status">
        <span className="fac-occ__card-status-text" data-live={liveStatus}>
          {STATUS_LABELS[liveStatus]}
        </span>
        {!isDisabled && (
          <span className="fac-occ__card-hours">
            {facility.opening_time}–{facility.closing_time}
          </span>
        )}
        {crowdDisplay && (
          <span className="fac-occ__card-crowd" data-crowd={crowdLevel}>
            {crowdDisplay.label} {Math.round(currentPct)}%
          </span>
        )}
      </div>

      {/* Current activity */}
      {(liveStatus === "occupied" || liveStatus === "busy") && currentActivity && (
        <div className="fac-occ__card-activity">
          <p className="fac-occ__card-activity-text">{currentActivity}</p>
          {endTime && (
            <span className="fac-occ__card-activity-end">
              <Clock className="fac-occ__card-activity-icon" />
              Termina a las {endTime}
            </span>
          )}
        </div>
      )}

      {/* Maintenance indicator */}
      {liveStatus === "maintenance" && maintenanceCount > 0 && (
        <div className="fac-occ__card-maint" role="alert">
          <Wrench className="fac-occ__card-maint-icon" />
          <span>
            {maintenanceCount} tarea{maintenanceCount !== 1 ? "s" : ""} de mantenimiento activa{maintenanceCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Capacity bar */}
      <CapacityBar pct={currentPct} />

      {/* Upcoming reservations */}
      <div className="fac-occ__card-upcoming">
        {upcomingReservations.length > 0 ? (
          <>
            <p className="fac-occ__card-upcoming-title">Próximas reservas</p>
            {upcomingReservations.slice(0, UPCOMING_LIMIT).map((res) => (
              <div key={res.id} className="fac-occ__card-upcoming-item">
                <span className="fac-occ__card-upcoming-dot" data-res-status={res.status} />
                <span className="fac-occ__card-upcoming-time">
                  {res.start_time}–{res.end_time}
                </span>
                <span className="fac-occ__card-upcoming-name">{res.family_name}</span>
              </div>
            ))}
          </>
        ) : (
          <p className="fac-occ__card-upcoming-empty">Sin reservas próximas</p>
        )}
      </div>

      {/* Actions (Sense 4: INTENCIÓN) */}
      <div className="fac-occ__card-actions">
        {liveStatus === "available" ? (
          <button
            type="button"
            className="fac-occ__btn fac-occ__btn--book"
            onClick={(e) => {
              e.stopPropagation();
              onQuickBook?.(facility.id, facility.name);
            }}
          >
            Reservar ahora
            <ChevronRight className="fac-occ__btn-icon" />
          </button>
        ) : (
          <button
            type="button"
            className="fac-occ__btn fac-occ__btn--view"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail?.(facility.id);
            }}
          >
            <Eye className="fac-occ__btn-icon" />
            Ver detalle
          </button>
        )}
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Stats Bar
// ═══════════════════════════════════════════════════════════

function StatsBar({ stats }: {
  stats: { total: number; available: number; busy: number; occupied: number; maintenance: number };
}) {
  return (
    <div className="fac-occ__stats">
      <div className="fac-occ__stats-item">
        <PulseIndicator status="available" size={6} />
        <span className="fac-occ__stats-label">{stats.available} disponible{stats.available !== 1 ? "s" : ""}</span>
      </div>
      <div className="fac-occ__stats-item">
        <PulseIndicator status="busy" size={6} />
        <span className="fac-occ__stats-label">{stats.busy} por ocuparse</span>
      </div>
      <div className="fac-occ__stats-item">
        <PulseIndicator status="occupied" size={6} />
        <span className="fac-occ__stats-label">{stats.occupied} ocupado{stats.occupied !== 1 ? "s" : ""}</span>
      </div>
      {stats.maintenance > 0 && (
        <div className="fac-occ__stats-item">
          <PulseIndicator status="maintenance" size={6} />
          <span className="fac-occ__stats-label">{stats.maintenance} en mantenimiento</span>
        </div>
      )}
      <span className="fac-occ__stats-total">
        {stats.total} espacios monitoreados
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function LiveOccupancyBoard({
  facilities,
  occupancyPredictions,
  reservations,
  maintenanceTasks = [],
  ambientMode = "calm",
  onQuickBook,
  onViewDetail,
}: LiveOccupancyBoardProps) {
  const prefersReduced = useReducedMotion();

  const cardData = useMemo(
    () => computeCardData(facilities, reservations, occupancyPredictions ?? {}, maintenanceTasks),
    [facilities, reservations, occupancyPredictions, maintenanceTasks],
  );

  const stats = useMemo(() => {
    const total = cardData.length;
    const available = cardData.filter((c) => c.liveStatus === "available").length;
    const occupied = cardData.filter((c) => c.liveStatus === "occupied").length;
    const busy = cardData.filter((c) => c.liveStatus === "busy").length;
    const maintenance = cardData.filter((c) => c.liveStatus === "maintenance").length;
    return { total, available, occupied, busy, maintenance };
  }, [cardData]);

  const narrative = buildNarrative(stats);

  // ── Empty state ──
  if (cardData.length === 0) {
    return (
      <div className="fac-occ fac-occ--empty" data-mode={ambientMode}>
        <EmptyState
          icon={<MapPin size={32} strokeWidth={1.5} />}
          title="Sin datos de instalaciones"
          description="No hay instalaciones disponibles para monitorear."
        />
      </div>
    );
  }

  return (
    <div
      className="fac-occ"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Narrative (Sense 7) */}
      <p className="fac-occ__narrative">{narrative}</p>

      {/* Stats summary */}
      <StatsBar stats={stats} />

      {/* Grid */}
      <div className="fac-occ__grid">
        {cardData.map((data, index) => (
          <FacilityCard
            key={data.facility.id}
            data={data}
            index={index}
            prefersReduced={prefersReduced}
            onQuickBook={onQuickBook}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>
    </div>
  );
}