// src/features/recommendations/components/SchedulingConflicts.tsx
// Fase 10, B3 — Detección on-demand de conflictos de programación

import { useState, useCallback } from "react";
import {
  AlertTriangle,
  Search,
  Clock,
  MapPin,
  Zap,
  ArrowRight,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterDropdown } from "@/shared/components/ui/FilterDropdown";

import {
  ConflictSeverity,
  CONFLICT_SEVERITY_CONFIG,
  type SchedulingConflictsResponse,
  type SchedulingConflict,
} from "../types";

// ── Severity filter options ────────────────────────────────

const SEVERITY_OPTIONS = [
  { value: "", label: "Todas las severidades" },
  ...Object.values(ConflictSeverity).map((s) => ({
    value: s,
    label: CONFLICT_SEVERITY_CONFIG[s].label,
  })),
];

// ── Main Component ─────────────────────────────────────────

export function SchedulingConflicts() {
  const prefersReduced = useReducedMotion();

  // ── Form state ──
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [severityFilter, setSeverityFilter] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);

  // ── Level 2: On-demand query ──
  const { data, isLoading, isFetching } = useMCPQuery<SchedulingConflictsResponse>(
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

  // ── Handlers ──
  const handleDetect = useCallback(() => {
    if (!date) return;
    setShouldFetch(true);
  }, [date]);

  const conflicts = data?.conflicts ?? [];
  const totalConflicts = data?.total_conflicts ?? 0;
  const busy = isLoading || isFetching;

  // ── Render ──
  return (
    <div
      className="space-y-5"
      role="region"
      aria-label="Detección de conflictos de programación"
    >
      {/* ── Input form ── */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* Date picker */}
          <div className="flex-1 min-w-0">
            <label
              htmlFor="conflict-date"
              className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5"
            >
              Fecha
            </label>
            <Input
              id="conflict-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setShouldFetch(false);
              }}
            />
          </div>

          {/* Severity filter */}
          <div className="w-full sm:w-52">
            <label className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5">
              Severidad (opcional)
            </label>
            <FilterDropdown
              label="Severidad"
              options={[{ value: "", label: "Todas" }, ...SEVERITY_OPTIONS]}
              value={severityFilter}
              onChange={(v) => {
                setSeverityFilter(v);
                setShouldFetch(false);
              }}
            />
          </div>

          {/* Detect button */}
          <Button
            variant="primary"
            icon={<Search className="w-4 h-4" />}
            onClick={handleDetect}
            disabled={!date || busy}
          >
            {busy ? "Detectando..." : "Detectar Conflictos"}
          </Button>
        </div>
      </Card>

      {/* ── Loading ── */}
      {busy && shouldFetch && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-32 rounded-[var(--radius-lg)]"
            />
          ))}
        </div>
      )}

      {/* ── No fetch yet ── */}
      {!shouldFetch && (
        <EmptyState
          icon={
            <AlertTriangle className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Seleccione una fecha"
          description="Elija una fecha y presione 'Detectar Conflictos' para analizar solapamientos de eventos y recursos."
        />
      )}

      {/* ── No conflicts ── */}
      {!busy && shouldFetch && conflicts.length === 0 && (
        <EmptyState
          icon={
            <Zap className="w-8 h-8 text-[var(--color-emerald-400)]" />
          }
          title="Sin conflictos detectados"
          description={`No se encontraron conflictos para ${formatDateES(date)}.`}
        />
      )}

      {/* ── Results ── */}
      {!busy && conflicts.length > 0 && (
        <div className="space-y-4">
          {/* Summary banner */}
          <div
            className="flex items-center gap-3 p-3 rounded-[var(--radius-md)]"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-amber-400) 10%, transparent)`,
              borderLeft: "3px solid var(--color-amber-400)",
            }}
          >
            <AlertTriangle className="w-5 h-5 text-[var(--color-amber-400)] shrink-0" />
            <p className="text-sm font-ui text-[var(--color-silver-200)]">
              Se detectaron{" "}
              <strong className="text-[var(--color-silver-100)]">
                {totalConflicts} conflicto{totalConflicts !== 1 ? "s" : ""}
              </strong>{" "}
              para {formatDateES(date)}
            </p>
          </div>

          {/* Conflict cards */}
          {conflicts.map((conflict, index) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              index={index}
              prefersReduced={prefersReduced}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Conflict Card ──────────────────────────────────────────

function ConflictCard({
  conflict,
  index,
  prefersReduced,
}: {
  conflict: SchedulingConflict;
  index: number;
  prefersReduced: boolean;
}) {
  const severityCfg = CONFLICT_SEVERITY_CONFIG[conflict.severity];

  // Severity bar width: Low=25, Medium=50, High=75, Critical=100
  const severityPct: Record<ConflictSeverity, number> = {
    [ConflictSeverity.Low]: 25,
    [ConflictSeverity.Medium]: 50,
    [ConflictSeverity.High]: 75,
    [ConflictSeverity.Critical]: 100,
  };

  return (
    <Card
      className={`p-4 space-y-3.5 ${
        prefersReduced
          ? ""
          : "opacity-0 animate-[fadeUp_0.5s_ease_forwards]"
      }`}
      style={
        prefersReduced
          ? undefined
          : { animationDelay: `${index * 80}ms` }
      }
    >
      {/* Left severity accent */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1 rounded-l-[var(--radius-lg)]"
        style={{ backgroundColor: severityCfg.color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={severityCfg.variant} size="sm">
              {severityCfg.label}
            </Badge>
            <span className="text-xs text-[var(--color-silver-500)] font-mono">
              {conflict.conflict_type}
            </span>
          </div>
        </div>

        {/* Severity bar */}
        <div className="w-20 shrink-0">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-silver-600) 30%, transparent)`,
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${severityPct[conflict.severity]}%`,
                backgroundColor: severityCfg.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Event comparison */}
      <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
        {/* Event A */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-ui font-semibold text-[var(--color-silver-100)] truncate">
            {conflict.event_a_name}
          </p>
          <p className="text-[10px] text-[var(--color-silver-500)] font-mono">
            {conflict.event_a_id}
          </p>
        </div>

        {/* VS indicator */}
        <div className="shrink-0 flex items-center">
          <ArrowRight className="w-4 h-4 text-[var(--color-rose-400)]" />
        </div>

        {/* Event B */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-ui font-semibold text-[var(--color-silver-100)] truncate">
            {conflict.event_b_name}
          </p>
          <p className="text-[10px] text-[var(--color-silver-500)] font-mono">
            {conflict.event_b_id}
          </p>
        </div>
      </div>

      {/* Time overlap */}
      {conflict.overlap_start && conflict.overlap_end && (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--color-silver-500)]" />
          <span className="text-xs text-[var(--color-silver-400)]">
            Solapamiento:{" "}
            <span className="font-mono text-[var(--color-silver-300)]">
              {conflict.overlap_start} – {conflict.overlap_end}
            </span>
          </span>
        </div>
      )}

      {/* Shared resources */}
      {conflict.shared_resources.length > 0 && (
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-[var(--color-silver-500)] mt-0.5 shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {conflict.shared_resources.map((resource) => (
              <span
                key={resource}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px]
                           font-ui bg-[var(--color-surface-1)] border border-white/[0.06]
                           text-[var(--color-silver-400)]"
              >
                {resource}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion */}
      {conflict.suggestion && (
        <div
          className="p-3 rounded-[var(--radius-md)]"
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-teal-400) 8%, transparent)`,
            borderLeft: "3px solid var(--color-teal-400)",
          }}
        >
          <p className="text-xs font-ui font-medium text-[var(--color-teal-400)] uppercase tracking-wider mb-1">
            Sugerencia
          </p>
          <p className="text-sm text-[var(--color-silver-300)]">
            {conflict.suggestion}
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Helper ─────────────────────────────────────────────────

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
