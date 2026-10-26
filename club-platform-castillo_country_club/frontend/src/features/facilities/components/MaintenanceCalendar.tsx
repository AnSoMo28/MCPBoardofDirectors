// src/features/facilities/components/MaintenanceCalendar.tsx
// ═══════════════════════════════════════════════════════════
// MAINTENANCE CALENDAR — "El Calendario"
//
// Timeline view of maintenance tasks grouped by date.
// Overdue tasks highlighted at top. Today marker.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — day block entry stagger
//   ✅ SENSE 2: REACCIÓN — task row hover translateX(2px)
//   ✅ SENSE 3: MEMORIA — task count, total cost, overdue flag
//   ✅ SENSE 4: INTENCIÓN — urgency encoding on priority/status
//   ✅ SENSE 5: SINIESTRÍA — overdue pulse border, emergency highlight
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — calendar summary sentence
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { Calendar, DollarSign, Clock, AlertTriangle } from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  MaintenanceTask,
  FacilitiesDashboardMode,
} from "../types";

import "./MaintenanceCalendar.css";

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

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const weekday = d.toLocaleDateString("es-CR", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("es-CR", { month: "short" });
  return `${weekday} ${day} ${month}`;
}

// ═══════════════════════════════════════════════════════════
// LABELS (no colors — CSS handles via data-attributes)
// ═══════════════════════════════════════════════════════════

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  preventive: "Preventivo",
  corrective: "Correctivo",
  emergency: "Emergencia",
  renovation: "Renovación",
  cleaning: "Limpieza",
  inspection: "Inspección",
};

const MAINTENANCE_PRIORITY_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  in_progress: "En progreso",
  scheduled: "Programado",
  cancelled: "Cancelado",
  on_hold: "En pausa",
};

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface DayGroup {
  date: string;
  label: string;
  isToday: boolean;
  isOverdue: boolean;
  tasks: MaintenanceTask[];
  totalCost: number;
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  tasks: MaintenanceTask[],
  dayGroups: DayGroup[],
  totalCost: number,
): string {
  if (tasks.length === 0) {
    return "Sin tareas de mantenimiento programadas.";
  }

  const overdue = dayGroups.filter((g) => g.isOverdue && !g.isToday);
  const emergency = tasks.filter((t) => t.maintenance_type === "emergency").length;

  const parts: string[] = [];
  parts.push(`${tasks.length} tarea${tasks.length > 1 ? "s" : ""} en ${dayGroups.length} día${dayGroups.length > 1 ? "s" : ""}.`);
  parts.push(`Costo total: ${formatCRC(totalCost)}.`);

  if (overdue.length > 0) {
    parts.push(`${overdue.length} día${overdue.length > 1 ? "s" : ""} vencido${overdue.length > 1 ? "s" : ""}.`);
  }
  if (emergency > 0) {
    parts.push(`${emergency} emergencia${emergency > 1 ? "s" : ""}.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface MaintenanceCalendarProps {
  tasks: MaintenanceTask[];
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Day Block
// ═══════════════════════════════════════════════════════════

function DayBlock({
  group,
  index,
  prefersReduced,
}: {
  group: DayGroup;
  index: number;
  prefersReduced: boolean;
}) {
  return (
    <div
      className="fac-maint-cal__day"
      data-today={group.isToday}
      data-overdue={group.isOverdue}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      {/* Day header */}
      <div className="fac-maint-cal__day-header">
        <div className="fac-maint-cal__day-header-left">
          {group.isOverdue && !group.isToday && (
            <AlertTriangle className="fac-maint-cal__overdue-icon" />
          )}
          <span className="fac-maint-cal__day-label">
            {group.label}
            {group.isToday && " (Hoy)"}
          </span>
          <span className="fac-maint-cal__day-count">
            {group.tasks.length} tarea{group.tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="fac-maint-cal__day-cost">
          {formatCRC(group.totalCost)}
        </span>
      </div>

      {/* Task rows */}
      <div className="fac-maint-cal__day-tasks">
        {group.tasks.map((task) => (
          <div
            key={task.id}
            className="fac-maint-cal__task"
            data-priority={task.priority}
            data-maint-type={task.maintenance_type}
            data-maint-status={task.status}
          >
            {/* Time */}
            <div className="fac-maint-cal__task-time">
              <Clock className="fac-maint-cal__task-time-icon" />
              <span>{task.scheduled_time}</span>
            </div>

            {/* Content */}
            <div className="fac-maint-cal__task-body">
              <div className="fac-maint-cal__task-head">
                <span className="fac-maint-cal__task-facility">
                  {task.facility_name}
                </span>
                <span className="fac-maint-cal__task-priority" data-priority={task.priority}>
                  {MAINTENANCE_PRIORITY_LABELS[task.priority] ?? task.priority}
                </span>
              </div>
              <p className="fac-maint-cal__task-desc">{task.description}</p>
            </div>

            {/* Meta */}
            <div className="fac-maint-cal__task-meta">
              <span className="fac-maint-cal__task-type" data-maint-type={task.maintenance_type}>
                {MAINTENANCE_TYPE_LABELS[task.maintenance_type] ?? task.maintenance_type}
              </span>
              <span className="fac-maint-cal__task-status" data-maint-status={task.status}>
                {MAINTENANCE_STATUS_LABELS[task.status] ?? task.status}
              </span>
              <span className="fac-maint-cal__task-cost">
                {formatCRC(task.cost)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function MaintenanceCalendar({
  tasks,
  ambientMode = "calm",
}: MaintenanceCalendarProps) {
  const prefersReduced = useReducedMotion();
  const today = todayISO();

  // Group by date
  const dayGroups = useMemo((): DayGroup[] => {
    const groups = new Map<string, MaintenanceTask[]>();

    for (const task of tasks) {
      const existing = groups.get(task.scheduled_date) ?? [];
      existing.push(task);
      groups.set(task.scheduled_date, existing);
    }

    const sorted = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayTasks]) => {
        const isOverdue =
          date < today &&
          dayTasks.some((t) => t.status !== "completed" && t.status !== "cancelled");
        return {
          date,
          label: formatDateLabel(date),
          isToday: date === today,
          isOverdue,
          tasks: dayTasks.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
          totalCost: dayTasks.reduce((s, t) => s + t.cost, 0),
        };
      });

    // Overdue first, then today, then future
    const overdue = sorted.filter((g) => g.isOverdue && !g.isToday);
    const todayItems = sorted.filter((g) => g.isToday);
    const future = sorted.filter((g) => !g.isOverdue && !g.isToday);

    return [...overdue, ...todayItems, ...future];
  }, [tasks, today]);

  const totalCost = useMemo(() => tasks.reduce((s, t) => s + t.cost, 0), [tasks]);
  const narrative = buildNarrative(tasks, dayGroups, totalCost);

  // ── Empty state ──
  if (tasks.length === 0) {
    return (
      <div className="fac-maint-cal fac-maint-cal--empty" data-mode={ambientMode}>
        <Calendar className="fac-maint-cal__empty-icon" />
        <p className="fac-maint-cal__empty-text">
          {narrative}
        </p>
      </div>
    );
  }

  return (
    <div
      className="fac-maint-cal"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <div className="fac-maint-cal__header">
        <div className="fac-maint-cal__header-left">
          <Calendar className="fac-maint-cal__header-icon" />
          <h3 className="fac-maint-cal__title">Calendario de Mantenimiento</h3>
        </div>
        <div className="fac-maint-cal__header-right">
          <span className="fac-maint-cal__header-stat">{dayGroups.length} día{dayGroups.length !== 1 ? "s" : ""}</span>
          <span className="fac-maint-cal__header-total">
            <DollarSign className="fac-maint-cal__header-total-icon" />
            {formatCRC(totalCost)}
          </span>
        </div>
      </div>

      {/* Narrative (Sense 7) */}
      <p className="fac-maint-cal__narrative">{narrative}</p>

      {/* Day blocks */}
      <div className="fac-maint-cal__days">
        {dayGroups.map((group, index) => (
          <DayBlock
            key={group.date}
            group={group}
            index={index}
            prefersReduced={prefersReduced}
          />
        ))}
      </div>
    </div>
  );
}