// src/features/facilities/components/MaintenanceScoring.tsx
// ═══════════════════════════════════════════════════════════
// MAINTENANCE SCORING — "La Urgencia"
//
// Predictive urgency grid. Tasks scored via computeMaintenanceUrgency,
// sorted by descending urgency. Status transitions via hover-reveal.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — card entry stagger, KPI count-up
//   ✅ SENSE 2: REACCIÓN — card hover translateY(-2px), transitions reveal
//   ✅ SENSE 3: MEMORIA — urgency score, overdue days, cost, status
//   ✅ SENSE 4: INTENCIÓN — transition buttons (Ejecutar, Completar, etc.)
//   ✅ SENSE 5: SINIESTRÍA — critical urgency pulse, overdue left accent
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — urgency summary sentence
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import {
  Wrench,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  User,
  TrendingUp,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import { computeMaintenanceUrgency } from "../types";
import type {
  MaintenanceTask,
  MaintenanceStatus,
  FacilitiesDashboardMode,
} from "../types";

import "./MaintenanceScoring.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, readonly MaintenanceStatus[]> = {
  scheduled: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["completed", "on_hold", "cancelled"],
  on_hold: ["scheduled", "in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

const KPI_DEFS: ReadonlyArray<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overdue", label: "Atrasadas", icon: AlertTriangle },
  { id: "in_progress", label: "En progreso", icon: Wrench },
  { id: "total_cost", label: "Costo total", icon: DollarSign },
  { id: "avg_urgency", label: "Urgencia prom.", icon: TrendingUp },
];

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

const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  in_progress: "En progreso",
  scheduled: "Programado",
  cancelled: "Cancelado",
  on_hold: "En pausa",
};

const MAINTENANCE_PRIORITY_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

const TRANSITION_LABELS: Record<string, string> = {
  in_progress: "Iniciar",
  completed: "Completar",
  on_hold: "Pausar",
  scheduled: "Reagendar",
  cancelled: "Cancelar",
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs.toLocaleString("es-CR")}`;
}

function isOverdue(scheduledDate: string, status: MaintenanceStatus): boolean {
  if (status === "completed" || status === "cancelled") return false;
  return scheduledDate < todayISO();
}

function daysDiff(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - now.getTime()) / 86_400_000);
}

function urgencyTone(score: number): "critical" | "high" | "moderate" | "low" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

function urgencyLabel(score: number): string {
  if (score >= 80) return "Crítico";
  if (score >= 60) return "Alto";
  if (score >= 40) return "Moderado";
  return "Bajo";
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  tasks: MaintenanceTask[],
  overdueCount: number,
  avgUrgency: number,
  totalCost: number,
): string {
  if (tasks.length === 0) {
    return "Sin tareas de mantenimiento programadas.";
  }

  const parts: string[] = [];
  parts.push(`${tasks.length} tarea${tasks.length > 1 ? "s" : ""} evaluada${tasks.length > 1 ? "s" : ""}.`);
  parts.push(`Urgencia promedio: ${avgUrgency}/100 (${urgencyLabel(avgUrgency)}).`);
  parts.push(`Costo total: ${formatCRC(totalCost)}.`);

  if (overdueCount > 0) {
    parts.push(`${overdueCount} atrasada${overdueCount > 1 ? "s" : ""} — requiere acción inmediata.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface MaintenanceScoringProps {
  tasks: MaintenanceTask[];
  isLoading?: boolean;
  ambientMode?: FacilitiesDashboardMode;
  onStatusChange?: (taskId: string, newStatus: MaintenanceStatus) => void;
  onTaskClick?: (taskId: string) => void;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Maintenance Card
// ═══════════════════════════════════════════════════════════

function MaintenanceCard({
  task,
  urgencyScore,
  index,
  prefersReduced,
  onStatusChange,
  onTaskClick,
}: {
  task: MaintenanceTask;
  urgencyScore: number;
  index: number;
  prefersReduced: boolean;
  onStatusChange?: (id: string, status: MaintenanceStatus) => void;
  onTaskClick?: (id: string) => void;
}) {
  const overdue = isOverdue(task.scheduled_date, task.status);
  const days = daysDiff(task.scheduled_date);
  const transitions = MAINTENANCE_TRANSITIONS[task.status] ?? [];
  const tone = urgencyTone(urgencyScore);

  return (
    <article
      className="fac-maint__card"
      data-priority={task.priority}
      data-maint-status={task.status}
      data-maint-type={task.maintenance_type}
      data-overdue={overdue ? "true" : undefined}
      data-urgency-tone={tone}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
      onClick={() => onTaskClick?.(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTaskClick?.(task.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${task.facility_name} — ${task.description}`}
    >
      {/* Overdue accent bar (CSS-driven) */}
      {overdue && <span className="fac-maint__overdue-bar" />}

      <div className="fac-maint__card-top">
        {/* Urgency badge */}
        <div className="fac-maint__urgency" data-urgency-tone={tone}>
          <span className="fac-maint__urgency-score">{urgencyScore}</span>
          <span className="fac-maint__urgency-label">urgencia</span>
        </div>

        {/* Content */}
        <div className="fac-maint__card-body">
          {/* Badges row */}
          <div className="fac-maint__badges">
            <span className="fac-maint__badge" data-priority={task.priority}>
              {MAINTENANCE_PRIORITY_LABELS[task.priority] ?? task.priority}
            </span>
            <span className="fac-maint__badge" data-maint-type={task.maintenance_type}>
              {MAINTENANCE_TYPE_LABELS[task.maintenance_type] ?? task.maintenance_type}
            </span>
            <span className="fac-maint__badge" data-maint-status={task.status}>
              {MAINTENANCE_STATUS_LABELS[task.status] ?? task.status}
            </span>
          </div>

          {/* Facility + description */}
          <h4 className="fac-maint__card-name">{task.facility_name}</h4>
          <p className="fac-maint__card-desc">{task.description}</p>

          {/* Meta row */}
          <div className="fac-maint__meta">
            <span className="fac-maint__meta-item">
              <Calendar className="fac-maint__meta-icon" />
              {task.scheduled_date}
              {overdue && (
                <span className="fac-maint__meta-overdue">
                  ({Math.abs(days)}d atrasado)
                </span>
              )}
              {!overdue && days === 0 && (
                <span className="fac-maint__meta-today">(hoy)</span>
              )}
              {!overdue && days > 0 && (
                <span className="fac-maint__meta-future">(en {days}d)</span>
              )}
            </span>
            <span className="fac-maint__meta-item">
              <Clock className="fac-maint__meta-icon" />
              {task.scheduled_time} · {task.estimated_duration_hours}h
            </span>
            {task.assigned_to && (
              <span className="fac-maint__meta-item">
                <User className="fac-maint__meta-icon" />
                {task.assigned_to}
              </span>
            )}
            {task.cost != null && task.cost > 0 && (
              <span className="fac-maint__meta-item fac-maint__meta-cost">
                <DollarSign className="fac-maint__meta-icon" />
                {formatCRC(task.cost)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Overdue pulse (CSS-only) */}
      {overdue && (
        <span className="fac-maint__overdue-pulse" aria-label="Atrasado">
          <span className="fac-maint__overdue-pulse-ring" />
          <span className="fac-maint__overdue-pulse-dot" />
        </span>
      )}

      {/* Status transitions (CSS hover-reveal) */}
      {transitions.length > 0 && (
        <div className="fac-maint__transitions">
          <span className="fac-maint__transitions-label">Transición:</span>
          {transitions.map((newStatus) => (
            <Button
              variant="unstyled"
              key={newStatus}
              type="button"
              className="fac-maint__transition-btn"
              data-terminal={newStatus === "cancelled" ? "true" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(task.id, newStatus);
              }}
            >
              {TRANSITION_LABELS[newStatus] ?? newStatus}
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function MaintenanceScoring({
  tasks,
  isLoading,
  ambientMode = "calm",
  onStatusChange,
  onTaskClick,
}: MaintenanceScoringProps) {
  const prefersReduced = useReducedMotion();

  // Scored + sorted
  const scoredTasks = useMemo(
    () => tasks.map((task) => ({ task, urgency: computeMaintenanceUrgency(task) })),
    [tasks],
  );

  const sorted = useMemo(
    () => [...scoredTasks].sort((a, b) => b.urgency - a.urgency),
    [scoredTasks],
  );

  // Stats
  const stats = useMemo(() => {
    const overdueCount = tasks.filter((t) => isOverdue(t.scheduled_date, t.status)).length;
    const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
    const totalCost = tasks.reduce((s, t) => s + (t.cost ?? 0), 0);
    const avgUrgency =
      scoredTasks.length > 0
        ? Math.round(scoredTasks.reduce((s, t) => s + t.urgency, 0) / scoredTasks.length)
        : 0;

    return { overdueCount, inProgressCount, totalCost, avgUrgency };
  }, [tasks, scoredTasks]);

  const narrative = buildNarrative(tasks, stats.overdueCount, stats.avgUrgency, stats.totalCost);

  // KPI values (no colors — CSS handles via data-kpi-id)
  const kpiValues = useMemo(
    () => ({
      overdue: stats.overdueCount,
      in_progress: stats.inProgressCount,
      total_cost: formatCRC(stats.totalCost),
      avg_urgency: stats.avgUrgency,
    }),
    [stats],
  );

  // Loading
  if (isLoading) {
    return (
      <div className="fac-maint" data-mode={ambientMode}>
        <div className="fac-maint__skeleton">
          <div className="fac-maint__skeleton-kpis">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fac-maint__skeleton-kpi" />
            ))}
          </div>
          <div className="fac-maint__skeleton-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fac-maint__skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fac-maint"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <header className="fac-maint__header">
        <div className="fac-maint__header-left">
          <TrendingUp className="fac-maint__header-icon" />
          <div className="fac-maint__header-text">
            <h3 className="fac-maint__title">Maintenance Scoring</h3>
            <p className="fac-maint__subtitle">{tasks.length} tarea{tasks.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>

      {/* Narrative (Sense 7) */}
      <p className="fac-maint__narrative">{narrative}</p>

      {/* KPI strip */}
      <div className="fac-maint__kpis">
        {KPI_DEFS.map((def) => {
          const value = kpiValues[def.id as keyof typeof kpiValues];
          const hasOverdueAlert = def.id === "overdue" && stats.overdueCount > 0;
          const hasActiveAlert = def.id === "in_progress" && stats.inProgressCount > 0;

          return (
            <div
              key={def.id}
              className="fac-maint__kpi"
              data-kpi-id={def.id}
              data-kpi-alert={hasOverdueAlert || hasActiveAlert ? "true" : undefined}
            >
              <div className="fac-maint__kpi-head">
                <def.icon className="fac-maint__kpi-icon" data-kpi-id={def.id} />
                <span className="fac-maint__kpi-label">{def.label}</span>
              </div>
              <p className="fac-maint__kpi-value" data-kpi-id={def.id}>
                {value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Card grid */}
      {sorted.length === 0 ? (
        <div className="fac-maint__empty-wrap">
          <p className="fac-maint__empty-text">{narrative}</p>
        </div>
      ) : (
        <div className="fac-maint__grid">
          {sorted.map((item, index) => (
            <MaintenanceCard
              key={item.task.id}
              task={item.task}
              urgencyScore={item.urgency}
              index={index}
              prefersReduced={prefersReduced}
              onStatusChange={onStatusChange}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}