// src/features/facilities/components/EventSetupPanel.tsx
// ═══════════════════════════════════════════════════════════
// EVENT SETUP PANEL — "El Montaje"
//
// Event coordination with status pipeline, timeline,
// maintenance conflict detection, and requirements checklist.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — card entry stagger, pipeline dot animation
//   ✅ SENSE 2: REACCIÓN — card hover translateY(-2px)
//   ✅ SENSE 3: MEMORIA — status, timeline, requirements, conflicts
//   ✅ SENSE 4: INTENCIÓN — urgency encoding, days indicator
//   ✅ SENSE 5: SINIESTRÍA — conflict alert, active highlight
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — setup summary sentence
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import {
  PartyPopper,
  MapPin,
  Users,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Wrench,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  EventSetup,
  SetupStatus,
  MaintenanceTask,
  FacilitiesDashboardMode,
} from "../types";

import "./EventSetupPanel.css";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const PIPELINE_STAGES: readonly SetupStatus[] = [
  "requested",
  "planned",
  "in_progress",
  "completed",
];

const MAINTENANCE_CONFLICT_DAYS = 3;

const STATUS_LABELS: Record<SetupStatus, string> = {
  requested: "Solicitado",
  planned: "Planificado",
  in_progress: "En montaje",
  completed: "Completado",
  cancelled: "Cancelado",
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function parseDate(isoStr: string): string {
  if (!isoStr) return "—";
  if (isoStr.includes("T")) return isoStr.split("T")[0];
  return isoStr;
}

function parseTime(isoStr: string): string {
  if (!isoStr || !isoStr.includes("T")) return isoStr ?? "—";
  return isoStr.split("T")[1]?.slice(0, 5) ?? "—";
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function findMaintenanceConflicts(
  setup: EventSetup,
  tasks: MaintenanceTask[],
): MaintenanceTask[] {
  return tasks.filter((t) => {
    if (t.facility_id !== setup.facility_id) return false;
    if (t.status === "completed" || t.status === "cancelled") return false;
    const diff = Math.abs(
      daysUntil(t.scheduled_date) - daysUntil(setup.setup_date),
    );
    return diff <= MAINTENANCE_CONFLICT_DAYS;
  });
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  setups: EventSetup[],
  activeCount: number,
  conflictCount: number,
): string {
  if (setups.length === 0) {
    return "Sin montajes programados.";
  }

  const parts: string[] = [];
  parts.push(`${setups.length} montaje${setups.length > 1 ? "s" : ""} registrado${setups.length > 1 ? "s" : ""}.`);

  if (activeCount > 0) {
    parts.push(`${activeCount} activo${activeCount > 1 ? "s" : ""}.`);
  }

  if (conflictCount > 0) {
    parts.push(`${conflictCount} con conflicto de mantenimiento.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface EventSetupPanelProps {
  eventSetups: EventSetup[];
  maintenanceTasks?: MaintenanceTask[];
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Status Pipeline
// ═══════════════════════════════════════════════════════════

function StatusPipeline({ status }: { status: SetupStatus }) {
  const currentIdx = PIPELINE_STAGES.indexOf(status);

  if (status === "cancelled") {
    return (
      <div className="fac-setup__pipeline" data-setup-status="cancelled">
        <span className="fac-setup__pipeline-cancelled">Cancelado</span>
      </div>
    );
  }

  return (
    <div className="fac-setup__pipeline" data-setup-status={status}>
      {PIPELINE_STAGES.map((s, idx) => {
        const isActive = idx <= currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={s} className="fac-setup__pipeline-step">
            <span
              className="fac-setup__pipeline-dot"
              data-active={isActive ? "true" : undefined}
              data-current={isCurrent ? "true" : undefined}
              data-setup-status={s}
              title={STATUS_LABELS[s]}
            />
            {idx < PIPELINE_STAGES.length - 1 && (
              <span
                className="fac-setup__pipeline-connector"
                data-active={idx < currentIdx ? "true" : undefined}
                data-setup-status={s}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Setup Card
// ═══════════════════════════════════════════════════════════

function SetupCard({
  setup,
  conflicts,
  index,
  prefersReduced,
}: {
  setup: EventSetup;
  conflicts: MaintenanceTask[];
  index: number;
  prefersReduced: boolean;
}) {
  const days = daysUntil(setup.setup_date);
  const isUpcoming = days >= 0 && days <= 7;
  const isPast = days < 0;

  const completedCount = setup.status === "completed" ? setup.requirements.length : 0;

  const urgencyTone =
    setup.status === "in_progress"
      ? "active"
      : isUpcoming
        ? "soon"
        : isPast
          ? "past"
          : "normal";

  return (
    <article
      className="fac-setup__card"
      data-setup-status={setup.status}
      data-urgency={urgencyTone}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      {/* Header */}
      <div className="fac-setup__card-head">
        <div className="fac-setup__card-head-left">
          <span className="fac-setup__card-icon-wrap" data-setup-status={setup.status}>
            <PartyPopper className="fac-setup__card-icon" />
          </span>
          <div className="fac-setup__card-head-text">
            <h4 className="fac-setup__card-title">{setup.event_name}</h4>
            <div className="fac-setup__card-meta">
              <span className="fac-setup__card-meta-item">
                <MapPin className="fac-setup__card-meta-icon" />
                {setup.facility_name}
              </span>
              <span className="fac-setup__card-meta-sep">·</span>
              <span className="fac-setup__card-meta-item">
                <Users className="fac-setup__card-meta-icon" />
                {setup.assigned_to}
              </span>
            </div>
          </div>
        </div>

        <span className="fac-setup__card-badge" data-setup-status={setup.status}>
          {STATUS_LABELS[setup.status] ?? setup.status}
        </span>
      </div>

      {/* Status pipeline */}
      <div className="fac-setup__card-pipeline">
        <StatusPipeline status={setup.status} />
      </div>

      {/* Timeline */}
      <div className="fac-setup__timeline">
        <div className="fac-setup__timeline-slot">
          <span className="fac-setup__timeline-label">Montaje</span>
          <span className="fac-setup__timeline-date">{setup.setup_date}</span>
          <span className="fac-setup__timeline-time">{setup.setup_time}</span>
        </div>
        <div className="fac-setup__timeline-divider" />
        <div className="fac-setup__timeline-slot">
          <span className="fac-setup__timeline-label">Inicio</span>
          <span className="fac-setup__timeline-date">{parseDate(setup.event_start)}</span>
          <span className="fac-setup__timeline-time">{parseTime(setup.event_start)}</span>
        </div>
        <div className="fac-setup__timeline-divider" />
        <div className="fac-setup__timeline-slot">
          <span className="fac-setup__timeline-label">Fin</span>
          <span className="fac-setup__timeline-date">{parseDate(setup.event_end)}</span>
          <span className="fac-setup__timeline-time">{parseTime(setup.event_end)}</span>
        </div>
      </div>

      {/* Maintenance conflict warning */}
      {conflicts.length > 0 && (
        <div className="fac-setup__conflict" role="alert">
          <AlertTriangle className="fac-setup__conflict-icon" />
          <div className="fac-setup__conflict-text">
            <span className="fac-setup__conflict-title">Mantenimiento programado</span>
            {conflicts.slice(0, 2).map((t) => (
              <span key={t.id} className="fac-setup__conflict-item">
                <Wrench className="fac-setup__conflict-item-icon" />
                {t.description} — {t.scheduled_date}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Requirements checklist */}
      <div className="fac-setup__reqs">
        <span className="fac-setup__reqs-title">
          Requisitos ({completedCount}/{setup.requirements.length})
        </span>
        <ul className="fac-setup__reqs-list">
          {setup.requirements.map((req, i) => {
            const isDone = setup.status === "completed";
            return (
              <li key={i} className="fac-setup__reqs-item">
                {isDone ? (
                  <CheckCircle2 className="fac-setup__reqs-icon" data-done="true" />
                ) : (
                  <Circle className="fac-setup__reqs-icon" />
                )}
                <span className="fac-setup__reqs-text" data-done={isDone ? "true" : undefined}>
                  {req}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Notes */}
      {setup.notes && <p className="fac-setup__notes">{setup.notes}</p>}

      {/* Days indicator */}
      <div className="fac-setup__card-footer">
        <span className="fac-setup__days" data-urgency={urgencyTone}>
          {days >= 0
            ? days === 0
              ? "Hoy"
              : days === 1
                ? "Mañana"
                : `En ${days} días`
            : `Hace ${Math.abs(days)} días`}
        </span>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function EventSetupPanel({
  eventSetups,
  maintenanceTasks = [],
  ambientMode = "calm",
}: EventSetupPanelProps) {
  const prefersReduced = useReducedMotion();

  const stats = useMemo(() => {
    const active = eventSetups.filter(
      (s) => s.status === "in_progress" || s.status === "planned",
    ).length;
    return { total: eventSetups.length, active };
  }, [eventSetups]);

  const conflictCount = useMemo(() => {
    let count = 0;
    for (const setup of eventSetups) {
      if (findMaintenanceConflicts(setup, maintenanceTasks).length > 0) {
        count++;
      }
    }
    return count;
  }, [eventSetups, maintenanceTasks]);

  const narrative = buildNarrative(eventSetups, stats.active, conflictCount);

  const sortedSetups = useMemo(() => {
    const statusOrder: Record<SetupStatus, number> = {
      in_progress: 0,
      planned: 1,
      requested: 2,
      completed: 3,
      cancelled: 4,
    };
    return [...eventSetups].sort(
      (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9),
    );
  }, [eventSetups]);

  // Empty state
  if (!eventSetups || eventSetups.length === 0) {
    return (
      <div className="fac-setup fac-setup--empty" data-mode={ambientMode}>
        <PartyPopper className="fac-setup__empty-icon" />
        <p className="fac-setup__empty-text">{narrative}</p>
      </div>
    );
  }

  return (
    <div
      className="fac-setup"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <header className="fac-setup__header">
        <div className="fac-setup__header-left">
          <PartyPopper className="fac-setup__header-icon" />
          <div className="fac-setup__header-text">
            <h3 className="fac-setup__title">Montaje de Eventos</h3>
            <p className="fac-setup__subtitle">
              {stats.active} activo{stats.active !== 1 ? "s" : ""} · {stats.total} total
            </p>
          </div>
        </div>
      </header>

      {/* Narrative (Sense 7) */}
      <p className="fac-setup__narrative">{narrative}</p>

      {/* Grid */}
      <div className="fac-setup__grid">
        {sortedSetups.map((setup, i) => (
          <SetupCard
            key={setup.id}
            setup={setup}
            conflicts={findMaintenanceConflicts(setup, maintenanceTasks)}
            index={i}
            prefersReduced={prefersReduced}
          />
        ))}
      </div>
    </div>
  );
}