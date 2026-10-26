// src/features/facilities/components/InspectionPanel.tsx
// ═══════════════════════════════════════════════════════════
// INSPECTION PANEL — "El Ojo Clínico"
//
// Inspection history sorted by urgency (fail first).
// Cross-references maintenance tasks per facility.
// Expand/collapse for findings, notes, related tasks.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — card entry stagger
//   ✅ SENSE 2: REACCIÓN — card hover translateY(-2px)
//   ✅ SENSE 3: MEMORIA — result, findings, corrective actions
//   ✅ SENSE 4: INTENCIÓN — expand details, related maintenance
//   ✅ SENSE 5: SINIESTRÍA — fail/major_issues pulse border
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — inspection summary sentence
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";

import {
  ClipboardCheck,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  Inspection,
  InspectionResult,
  MaintenanceTask,
  FacilitiesDashboardMode,
} from "../types";

import "./InspectionPanel.css";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const RESULT_ICON_MAP: Record<InspectionResult, React.ComponentType<{ className?: string }>> = {
  pass: CheckCircle2,
  fail: XCircle,
  major_issues: XCircle,
  minor_issues: AlertTriangle,
};

const RESULT_LABELS: Record<InspectionResult, string> = {
  pass: "Aprobado",
  fail: "Reprobado",
  major_issues: "Problemas mayores",
  minor_issues: "Problemas menores",
};

const RESULT_PRIORITY: Record<InspectionResult, number> = {
  fail: 0,
  major_issues: 1,
  minor_issues: 2,
  pass: 3,
};

const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  in_progress: "En progreso",
  scheduled: "Programado",
  cancelled: "Cancelado",
  on_hold: "En pausa",
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function findRelatedMaintenance(
  inspection: Inspection,
  tasks: MaintenanceTask[],
): MaintenanceTask[] {
  return tasks.filter(
    (t) =>
      t.facility_id === inspection.facility_id &&
      t.status !== "completed" &&
      t.status !== "cancelled",
  );
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  inspections: Inspection[],
  withIssues: number,
  nextDate: string | null,
): string {
  if (inspections.length === 0) {
    return "Sin inspecciones registradas.";
  }

  const passed = inspections.length - withIssues;
  const parts: string[] = [];
  parts.push(`${inspections.length} inspeccion${inspections.length > 1 ? "es" : ""}: ${passed} aprobada${passed !== 1 ? "s" : ""}.`);

  if (withIssues > 0) {
    parts.push(`${withIssues} con hallazgos que requieren atención.`);
  }

  if (nextDate) {
    parts.push(`Próxima inspección: ${nextDate}.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface InspectionPanelProps {
  inspections: Inspection[];
  maintenanceTasks?: MaintenanceTask[];
  isLoading?: boolean;
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Inspection Card
// ═══════════════════════════════════════════════════════════

function InspectionCard({
  inspection,
  relatedTasks,
  index,
  prefersReduced,
}: {
  inspection: Inspection;
  relatedTasks: MaintenanceTask[];
  index: number;
  prefersReduced: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const ResultIcon = RESULT_ICON_MAP[inspection.result] ?? AlertTriangle;
  const hasIssues = inspection.result !== "pass";
  const hasFindings = inspection.findings?.trim().length > 0;

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <article
      className="fac-insp__card"
      data-result={inspection.result}
      data-expanded={expanded ? "true" : undefined}
      data-has-issues={hasIssues ? "true" : undefined}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      {/* Main content */}
      <div className="fac-insp__card-body">
        <div className="fac-insp__card-top">
          {/* Result icon */}
          <div className="fac-insp__result-icon" data-result={inspection.result}>
            <ResultIcon className="fac-insp__result-icon-svg" />
          </div>

          {/* Content */}
          <div className="fac-insp__card-content">
            {/* Header */}
            <div className="fac-insp__card-head">
              <h4 className="fac-insp__card-name">{inspection.facility_name}</h4>
              <span className="fac-insp__card-badge" data-result={inspection.result}>
                {RESULT_LABELS[inspection.result] ?? inspection.result}
              </span>
            </div>

            {/* Meta */}
            <div className="fac-insp__card-meta">
              <span className="fac-insp__meta-item">
                <Calendar className="fac-insp__meta-icon" />
                {inspection.inspection_date}
              </span>
              <span className="fac-insp__meta-item">
                <User className="fac-insp__meta-icon" />
                {inspection.inspector_member_id}
              </span>
              {inspection.next_inspection_date && (
                <span className="fac-insp__meta-item fac-insp__meta-item--next">
                  <Calendar className="fac-insp__meta-icon" />
                  Próxima: {inspection.next_inspection_date}
                </span>
              )}
            </div>

            {/* Findings */}
            {hasFindings && (
              <p className="fac-insp__findings">{inspection.findings}</p>
            )}
          </div>
        </div>

        {/* Corrective actions */}
        {inspection.corrective_actions.length > 0 && (
          <div className="fac-insp__actions">
            {inspection.corrective_actions.map((action, i) => (
              <span key={i} className="fac-insp__action-chip" data-result={inspection.result}>
                {action}
              </span>
            ))}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="fac-insp__details">
            {inspection.notes && (
              <p className="fac-insp__notes">{inspection.notes}</p>
            )}

            {relatedTasks.length > 0 && (
              <div className="fac-insp__related">
                <span className="fac-insp__related-title">
                  <Wrench className="fac-insp__related-icon" />
                  Mantenimiento relacionado
                </span>
                <ul className="fac-insp__related-list">
                  {relatedTasks.slice(0, 3).map((task) => (
                    <li key={task.id} className="fac-insp__related-item">
                      <span className="fac-insp__related-desc">{task.description}</span>
                      <span className="fac-insp__related-status" data-maint-status={task.status}>
                        {MAINTENANCE_STATUS_LABELS[task.status] ?? task.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand toggle */}
      {(hasIssues || hasFindings) && (
        <button
          type="button"
          className="fac-insp__toggle"
          onClick={handleToggle}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="fac-insp__toggle-icon" />
              Contraer
            </>
          ) : (
            <>
              <ChevronDown className="fac-insp__toggle-icon" />
              Ver detalles
            </>
          )}
        </button>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function InspectionPanel({
  inspections,
  maintenanceTasks = [],
  isLoading,
  ambientMode = "calm",
}: InspectionPanelProps) {
  const prefersReduced = useReducedMotion();

  // Sorted: fail first, then by date desc
  const sorted = useMemo(
    () =>
      [...inspections].sort((a, b) => {
        const pa = RESULT_PRIORITY[a.result] ?? 2;
        const pb = RESULT_PRIORITY[b.result] ?? 2;
        if (pa !== pb) return pa - pb;
        return b.inspection_date.localeCompare(a.inspection_date);
      }),
    [inspections],
  );

  // Stats
  const stats = useMemo(() => {
    const withIssues = inspections.filter((i) => i.result !== "pass").length;
    const today = todayISO();
    const nextUpcoming = inspections
      .filter((i) => i.next_inspection_date != null && i.next_inspection_date > today)
      .sort((a, b) => (a.next_inspection_date ?? "").localeCompare(b.next_inspection_date ?? ""));

    return {
      total: inspections.length,
      withIssues,
      nextDate: nextUpcoming[0]?.next_inspection_date ?? null,
    };
  }, [inspections]);

  const narrative = buildNarrative(inspections, stats.withIssues, stats.nextDate);

  // Loading
  if (isLoading) {
    return (
      <div className="fac-insp" data-mode={ambientMode}>
        <div className="fac-insp__skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="fac-insp__skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fac-insp"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <header className="fac-insp__header">
        <div className="fac-insp__header-left">
          <ClipboardCheck className="fac-insp__header-icon" />
          <div className="fac-insp__header-text">
            <h3 className="fac-insp__title">Inspecciones</h3>
            <p className="fac-insp__subtitle">{stats.total} registro{stats.total !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="fac-insp__header-stats">
          {stats.withIssues > 0 && (
            <span className="fac-insp__header-issue">
              {stats.withIssues} con hallazgos
            </span>
          )}
          {stats.nextDate && (
            <span className="fac-insp__header-next">Próxima: {stats.nextDate}</span>
          )}
        </div>
      </header>

      {/* Narrative (Sense 7) */}
      <p className="fac-insp__narrative">{narrative}</p>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="fac-insp__empty-wrap">
          <p className="fac-insp__empty-text">{narrative}</p>
        </div>
      ) : (
        <div className="fac-insp__list">
          {sorted.map((inspection, index) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              relatedTasks={findRelatedMaintenance(inspection, maintenanceTasks)}
              index={index}
              prefersReduced={prefersReduced}
            />
          ))}
        </div>
      )}
    </div>
  );
}