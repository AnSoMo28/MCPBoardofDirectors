// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Conflict Timeline v2 (2027 REWRITE)
//
// Replaces: SchedulingConflicts.tsx + RecConflictTimeline v1
//
// "The Arbiter" — On-demand scheduling conflict detection with
// animated overlap visualization, timeline rail, and enhanced
// severity presentation.
//
// Paradigm: ON-DEMAND (date + severity → MCP → results).
// MCP tool: "detect_scheduling_conflicts".
// Timeline: vertical rail connecting conflict cards.
// Overlap: CSS visual bar showing Event A span, Event B span,
//   and highlighted overlap zone.
// Severity: animated bars that grow on mount.
// AI suggestion: prominent section with Zap accent.
//
// Glass namespace: .glass-rsc
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ArrowLeftRight,
  Brain,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import type {
  SchedulingConflictsResponse,
  SchedulingConflict,
} from "../types";
import {
  ConflictSeverity,
  CONFLICT_SEVERITY_CONFIG,
  sortBySeverity,
  isBlockingConflict,
  isUrgentConflict,
} from "../types";

import "./RecConflictTimeline.css";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const SEVERITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todas las severidades" },
  ...Object.values(ConflictSeverity).map((s) => ({
    value: s,
    label: CONFLICT_SEVERITY_CONFIG[s].label,
  })),
];

const SEVERITY_BAR_PCT: Record<ConflictSeverity, number> = {
  [ConflictSeverity.Critical]: 100,
  [ConflictSeverity.High]: 75,
  [ConflictSeverity.Medium]: 50,
  [ConflictSeverity.Low]: 25,
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function formatDateES(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es-CR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toMinutes(iso: string): number {
  try {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FORM FIELD
// ═══════════════════════════════════════════════════════════════════════

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rsc-field">
      <label htmlFor={htmlFor} className="rsc-field-label">
        {label}
      </label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// OVERLAP VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════

function OverlapBar({
  conflict,
  reducedMotion,
}: {
  conflict: SchedulingConflict;
  reducedMotion: boolean;
}) {
  if (!conflict.overlap_start || !conflict.overlap_end) return null;

  // Assume events on same day — use minutes from midnight for positioning
  // We derive event spans from context: overlap is the intersection
  const overlapStartMin = toMinutes(conflict.overlap_start);
  const overlapEndMin = toMinutes(conflict.overlap_end);
  const overlapDuration = overlapEndMin - overlapStartMin;

  if (overlapDuration <= 0) return null;

  // Visual: position within a 6:00–23:00 timeline (1020 minutes)
  const dayStart = 6 * 60; // 6:00
  const dayEnd = 23 * 60; // 23:00
  const dayRange = dayEnd - dayStart;

  const overlapLeft = ((overlapStartMin - dayStart) / dayRange) * 100;
  const overlapWidth = (overlapDuration / dayRange) * 100;

  return (
    <div className="rsc-overlap-viz" data-severity={conflict.severity}>
      {/* Time axis labels */}
      <div className="rsc-ov-labels">
        <span className="rsc-ov-label">06:00</span>
        <span className="rsc-ov-label">12:00</span>
        <span className="rsc-ov-label">18:00</span>
        <span className="rsc-ov-label">23:00</span>
      </div>

      {/* Track with overlap zone */}
      <div className="rsc-ov-track">
        {/* Event A row */}
        <div className="rsc-ov-row">
          <span className="rsc-ov-event-label">A</span>
          <div className="rsc-ov-bar-area">
            <div
              className="rsc-ov-event-bar"
              data-event="a"
              data-severity={conflict.severity}
            />
          </div>
        </div>

        {/* Event B row */}
        <div className="rsc-ov-row">
          <span className="rsc-ov-event-label">B</span>
          <div className="rsc-ov-bar-area">
            <div
              className="rsc-ov-event-bar"
              data-event="b"
              data-severity={conflict.severity}
            />
          </div>
        </div>

        {/* Overlap highlight zone */}
        <div
          className="rsc-ov-overlap-zone"
          data-severity={conflict.severity}
          style={
            {
              "--ov-left": `${Math.max(0, overlapLeft)}%`,
              "--ov-width": `${Math.min(100 - overlapLeft, Math.max(2, overlapWidth))}%`,
              "--ov-anim-delay": reducedMotion ? "0ms" : "400ms",
            } as React.CSSProperties
          }
        />
      </div>

      {/* Time labels for overlap */}
      <div className="rsc-ov-times">
        <span className="rsc-ov-time" data-severity={conflict.severity}>
          <Clock size={10} aria-hidden="true" />
          {formatTime(conflict.overlap_start)} – {formatTime(conflict.overlap_end)}
        </span>
        <span className="rsc-ov-duration">
          {overlapDuration} min
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CONFLICT CARD
// ═══════════════════════════════════════════════════════════════════════

function ConflictCard({
  conflict,
  index,
  reducedMotion,
}: {
  conflict: SchedulingConflict;
  index: number;
  reducedMotion: boolean;
}) {
  const severityCfg = CONFLICT_SEVERITY_CONFIG[conflict.severity];
  const blocking = isBlockingConflict(conflict.severity);
  const urgent = isUrgentConflict(conflict.severity);
  const delayMs = reducedMotion ? 0 : index * 80;

  return (
    <div
      className="rsc-card"
      data-severity={conflict.severity}
      data-blocking={blocking ? "" : undefined}
      data-urgent={urgent ? "" : undefined}
      style={
        {
          "--stagger-i": index,
          "--card-delay": `${delayMs}ms`,
          "--fill-delay": `${delayMs + 200}ms`,
        } as React.CSSProperties
      }
    >
      {/* Severity left accent */}
      <div className="rsc-card-accent" data-severity={conflict.severity} aria-hidden="true" />

      {/* Header */}
      <div className="rsc-card-header">
        <div className="rsc-card-badges">
          <span className="rsc-severity-badge" data-severity={conflict.severity}>
            {blocking && <ShieldAlert size={10} aria-hidden="true" />}
            <span>{severityCfg.label}</span>
          </span>
          <span className="rsc-type-label">{conflict.conflict_type}</span>
          {urgent && (
            <span className="rsc-urgent-badge">
              <Zap size={9} aria-hidden="true" />
              Urgente
            </span>
          )}
        </div>

        {/* Severity bar */}
        <div className="rsc-severity-bar">
          <div
            className="rsc-severity-bar-fill"
            data-severity={conflict.severity}
            style={
              {
                "--severity-pct": `${SEVERITY_BAR_PCT[conflict.severity]}%`,
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {/* Event comparison */}
      <div className="rsc-event-compare">
        <div className="rsc-event" data-side="a">
          <span className="rsc-event-name">{conflict.event_a_name}</span>
          <span className="rsc-event-id">{conflict.event_a_id}</span>
        </div>
        <div className="rsc-event-vs">
          <ArrowLeftRight size={14} aria-hidden="true" />
        </div>
        <div className="rsc-event" data-side="b">
          <span className="rsc-event-name">{conflict.event_b_name}</span>
          <span className="rsc-event-id">{conflict.event_b_id}</span>
        </div>
      </div>

      {/* Overlap visualization */}
      <OverlapBar conflict={conflict} reducedMotion={reducedMotion} />

      {/* Shared resources */}
      {conflict.shared_resources.length > 0 && (
        <div className="rsc-resources">
          <MapPin size={12} aria-hidden="true" />
          <div className="rsc-resources-chips">
            {conflict.shared_resources.map((resource) => (
              <span key={resource} className="rsc-resource-chip">
                {resource}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI suggestion */}
      {conflict.suggestion && (
        <div className="rsc-suggestion">
          <div className="rsc-suggestion-icon">
            <Brain size={12} aria-hidden="true" />
          </div>
          <div className="rsc-suggestion-content">
            <span className="rsc-suggestion-label">Sugerencia IA</span>
            <p className="rsc-suggestion-text">{conflict.suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function SchedulingConflicts() {
  const prefersReduced = useReducedMotion();

  // ── Form state ──────────────────────────────────────────────────────
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [severityFilter, setSeverityFilter] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);

  // ── On-demand MCP query ─────────────────────────────────────────────
  const { data, isLoading, isFetching } =
    useMCPQuery<SchedulingConflictsResponse>(
      "proactive_recommendation",
      "detect_scheduling_conflicts",
      {
        date,
        severity_filter: severityFilter || undefined,
      },
      {
        enabled: shouldFetch && date.length > 0,
        staleTime: 30_000,
      },
    );

  // ── Handlers ────────────────────────────────────────────────────────
  const handleDetect = useCallback(() => {
    if (!date) return;
    setShouldFetch(true);
  }, [date]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleDetect();
    },
    [handleDetect],
  );

  // ── Sorted conflicts ────────────────────────────────────────────────
  const conflicts = useMemo(() => {
    const raw = data?.conflicts ?? [];
    return sortBySeverity(raw);
  }, [data]);

  const totalConflicts = data?.total_conflicts ?? 0;
  const busy = isLoading || isFetching;

  // ── Summary stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (conflicts.length === 0) return null;
    const blocking = conflicts.filter(
      (c: SchedulingConflict) => isBlockingConflict(c.severity),
    ).length;
    const urgent = conflicts.filter(
      (c: SchedulingConflict) => isUrgentConflict(c.severity),
    ).length;
    return { total: conflicts.length, blocking, urgent };
  }, [conflicts]);

  return (
    <div
      className="glass-rsc"
      role="region"
      aria-label="Detección de conflictos de programación"
    >
      {/* ── Input form ───────────────────────────────────────────────── */}
      <div className="rsc-form">
        <div className="rsc-form-grid">
          <FormField label="Fecha" htmlFor="rsc-date">
            <input
              id="rsc-date"
              className="rsc-input"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setShouldFetch(false);
              }}
              onKeyDown={handleKeyDown}
            />
          </FormField>

          <FormField label="Severidad (opcional)">
            <select
              className="rsc-select"
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setShouldFetch(false);
              }}
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="rsc-form-action">
            <Button
              variant="primary"
              onClick={handleDetect}
              disabled={!date || busy}
            >
              {busy ? "Detectando..." : "Detectar Conflictos"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {busy && shouldFetch && (
        <div className="rsc-loading">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rsc-skeleton"
              style={
                {
                  "--skeleton-delay": `${i * 100}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* ── Empty: no fetch yet ──────────────────────────────────────── */}
      {!shouldFetch && !busy && (
        <div className="rsc-empty-wrap">
          <EmptyState
            icon={<AlertTriangle size={32} className="rsc-empty-icon" />}
            title="Seleccione una fecha"
            description="Elija una fecha y presione 'Detectar Conflictos' para analizar solapamientos de eventos y recursos."
          />
        </div>
      )}

      {/* ── Empty: no conflicts ──────────────────────────────────────── */}
      {!busy && shouldFetch && conflicts.length === 0 && (
        <div className="rsc-empty-wrap">
          <EmptyState
            icon={
              <CheckCircle2
                size={32}
                className="rsc-empty-icon rsc-empty-icon--clean"
              />
            }
            title="Sin conflictos detectados"
            description={`No se encontraron conflictos para ${formatDateES(date)}.`}
          />
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {!busy && conflicts.length > 0 && (
        <>
          {/* Summary banner */}
          <div
            className="rsc-summary"
            data-severity={
              stats && stats.blocking > 0 ? "blocking" : "warning"
            }
          >
            <AlertTriangle
              size={18}
              aria-hidden="true"
              className="rsc-summary-icon"
            />
            <p className="rsc-summary-text">
              Se detectaron{" "}
              <strong className="rsc-summary-count">
                {totalConflicts}
              </strong>{" "}
              conflicto{totalConflicts !== 1 ? "s" : ""} para{" "}
              {formatDateES(date)}
            </p>
            {stats && (
              <div className="rsc-summary-stats">
                {stats.blocking > 0 && (
                  <span
                    className="rsc-summary-stat"
                    data-variant="blocking"
                  >
                    <ShieldAlert size={11} aria-hidden="true" />
                    <span>
                      {stats.blocking} bloqueante
                      {stats.blocking !== 1 ? "s" : ""}
                    </span>
                  </span>
                )}
                {stats.urgent > 0 && (
                  <span
                    className="rsc-summary-stat"
                    data-variant="urgent"
                  >
                    <Zap size={11} aria-hidden="true" />
                    <span>
                      {stats.urgent} urgente
                      {stats.urgent !== 1 ? "s" : ""}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Timeline rail + conflict cards */}
          <div className="rsc-timeline">
            {conflicts.map((conflict, index) => (
              <div
                key={conflict.id}
                className="rsc-timeline-item"
                data-severity={conflict.severity}
              >
                <ConflictCard
                  conflict={conflict}
                  index={index}
                  reducedMotion={prefersReduced}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}