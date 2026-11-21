// src/features/operations/components/SmartSchedule.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Smart Schedule Optimizer
// Fase 15ext, B3
//
// Pattern: On-demand AI Feature (Rule #19)
//
// Tools:
//   operations_smart_schedule (on-demand, enabled: shouldFetch)
//
// Rules: #1 tokens, #2 no blur, #6 RC, #11 focus-visible,
//   #12 touch, #14 EmptyState, #15 toast, #17 Button,
//   #18 reducedMotion, #19 on-demand, #20 breakpoint,
//   #21 responsive, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock, RefreshCw, AlertTriangle, Lightbulb,
  Users, Building2, Sparkles, ChevronDown, ChevronUp,
  Clock, Zap, CheckCircle2,
  Wrench,
  Brain, ArrowRight, Trophy, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Card, Button, Skeleton, showToast } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatCurrency, cn, formatNumber } from "@/shared/lib/utils";
import {
  TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type {
  get_facility_occupancy_Contract,
  FacilityOccupancyItem,
  get_maintenance_schedule_Contract,
  MaintenanceScheduleItem,

  SchedulingConflictsResponse,
  SchedulingConflict as SchedulingConflictItem,
  QuarterlyInsightGetResponse,
} from "@/shared/mocks/contracts";
import ExportButton from "@/shared/components/export/ExportButton";
import { ConflictSeverity } from "@/features/recommendations/types";
import './SmartSchedule.css';

/* ══════════════════════════════════════════════════════════
   Helpers & Configs
   ══════════════════════════════════════════════════════════ */

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } },
    item: reduced
      ? undefined
      : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
  };
}

const MAINTENANCE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  preventive: { label: "Preventivo", color: "var(--color-teal-400)", bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)" },
  corrective: { label: "Correctivo", color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)" },
  emergency: { label: "Emergencia", color: "var(--color-rose-400)", bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)" },
  renovation: { label: "Renovación", color: "var(--color-gold-400)", bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)" },
};

const MAINTENANCE_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: "Programado", color: "var(--color-teal-400)", bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)" },
  in_progress: { label: "En progreso", color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)" },
  completed: { label: "Completado", color: "var(--color-emerald-400)", bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)" },
  cancelled: { label: "Cancelado", color: "var(--color-silver-400)", bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)" },
};

const FACILITY_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  operational: { label: "Operativa", color: "var(--color-emerald-400)", bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)" },
  maintenance: { label: "Mantto.", color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)" },
  reserved: { label: "Reservada", color: "var(--color-teal-400)", bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)" },
  closed: { label: "Cerrada", color: "var(--color-rose-400)", bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)" },
};

const EVENT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  confirmed: { label: "Confirmado", color: "var(--color-emerald-400)", bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)" },
  pending: { label: "Pendiente", color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)" },
  cancelled: { label: "Cancelado", color: "var(--color-rose-400)", bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)" },
  draft: { label: "Borrador", color: "var(--color-silver-400)", bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)" },
};

const EVENT_CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  social: { label: "Social", color: "var(--color-gold-400)" },
  sports: { label: "Deporte", color: "var(--color-teal-400)" },
  cultural: { label: "Cultural", color: "var(--color-emerald-400)" },
  business: { label: "Negocios", color: "var(--color-silver-300)" },
  wellness: { label: "Bienestar", color: "var(--color-sage-400)" },
  gala: { label: "Gala", color: "var(--color-gold-400)" },
};

function utilizationColor(pct: number): string {
  if (pct > 110) return "var(--color-rose-400)"; // Overtime
  if (pct >= 80) return "var(--color-emerald-400)";
  if (pct >= 50) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function addHours(time: string, hours: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + Math.round(hours * 60);
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/* ══════════════════════════════════════════════════════════
   Custom Tooltip — Utilization (Rule #9)
   ══════════════════════════════════════════════════════════ */

// ── Utilization tooltip types (derived from schedule data) ──
interface ScheduleStaffUtilization {
  staff_name: string;
  hours_scheduled: number;
  hours_available: number;
  utilization_pct: number;
  overtime_hours: number;
}

interface ScheduleFacilityUtilization {
  facility: string;
  hours_booked: number;
  hours_available: number;
  utilization_pct: number;
}

interface UtilizationPayloadItem {
  payload: ScheduleStaffUtilization | ScheduleFacilityUtilization;
}

function UtilizationTooltip({ active, payload }: { active?: boolean; payload?: UtilizationPayloadItem[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  const isStaff = "staff_name" in d;
  const name = isStaff ? (d as ScheduleStaffUtilization).staff_name : (d as ScheduleFacilityUtilization).facility;

  return (
    <div style={TOOLTIP_STYLE} className="smart-schedule rounded-lg p-3 border border-white/[0.08] shadow-lg min-w-[160px]">
      <p className="text-xs font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1.5">
        {name}
      </p>
      <div className="space-y-1 text-[10px] font-[family-name:var(--font-mono)]">
        <div className="flex justify-between gap-3">
          <span className="text-[var(--color-silver-400)]">Utilización</span>
          <span className="font-bold" style={{ color: utilizationColor(d.utilization_pct) }}>{d.utilization_pct}%</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[var(--color-silver-400)]">Horas</span>
          <span className="text-[var(--color-silver-200)]">
            {"hours_scheduled" in d
              ? `${(d as ScheduleStaffUtilization).hours_scheduled}h / ${(d as ScheduleStaffUtilization).hours_available}h`
              : `${(d as ScheduleFacilityUtilization).hours_booked}h / ${(d as ScheduleFacilityUtilization).hours_available}h`
            }
          </span>
        </div>
        {"overtime_hours" in d && (d as ScheduleStaffUtilization).overtime_hours > 0 && (
           <div className="flex justify-between gap-3">
            <span className="text-[var(--color-rose-400)]">Horas Extra</span>
            <span className="text-[var(--color-rose-400)]">+{(d as ScheduleStaffUtilization).overtime_hours}h</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   Facility Status Grid — auto-load sub-component
   ══════════════════════════════════════════════════════════ */

function FacilityStatusGrid({
  facilities,
  loading,
  error,
  onRetry,
}: {
  facilities: FacilityOccupancyItem[] | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading && !facilities) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (error || !facilities) {
    return (
      <Card className="p-5">
        <SectionError
          title="Error al cargar instalaciones"
          description="No se pudo obtener el estado de las instalaciones."
          onRetry={onRetry}
        />
      </Card>
    );
  }

  const statusOrder = ["operational", "reserved", "maintenance", "closed"];
  const counts = facilities.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-[var(--color-teal-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Instalaciones
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
            {facilities.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusOrder.map((s) => {
            const c = counts[s];
            if (!c) return null;
            const cfg = FACILITY_STATUS_CONFIG[s] ?? FACILITY_STATUS_CONFIG.operational;
            return (
              <span
                key={s}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium font-[family-name:var(--font-mono)]"
                style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                {c} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {facilities.map((f) => {
          const cfg = FACILITY_STATUS_CONFIG[f.status] ?? FACILITY_STATUS_CONFIG.operational;
          return (
            <div
              key={f.facility_id}
              className={cn(
                "p-3 rounded-xl border border-white/[0.06] bg-[var(--color-surface-2)]",
                f.active_maintenance > 0 && "ring-1 ring-[var(--color-amber-400)]/30",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                  style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                >
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate mb-1">
                {f.facility_name}
              </p>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                {f.capacity} cap. · {f.opening_time}-{f.closing_time}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-1.5">
        {facilities.map((f) => {
          const cfg = FACILITY_STATUS_CONFIG[f.status] ?? FACILITY_STATUS_CONFIG.operational;
          return (
            <div
              key={f.facility_id}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
              <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] flex-1 truncate">
                {f.facility_name}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)] flex-shrink-0"
                style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Cross-Agent Sub-Component: Event Calendar for Schedule
   ══════════════════════════════════════════════════════════ */

function EventCalendarSection({ date }: { date: string }) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  useBreakpoint();
  const reduced = useReducedMotion();

  // Date range: selected date ± 1 day for context
  const dateRange = useMemo(() => {
    const d = new Date(date + "T12:00:00");
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const fmt = (dt: Date) => dt.toISOString().split("T")[0];
    return { date_from: fmt(prev), date_to: fmt(next) };
  }, [date]);

  interface CalendarDayResponse {
    status: string;
    message: string;
    data: Array<{
      date: string;
      total_events: number;
      has_conflicts: boolean;
      events: Array<{
        id: string;
        title: string;
        time_start: string;
        time_end: string;
        location: string;
        category: string;
        status: string;
        expected_attendance: number;
        rsvp_count: number;
        notes?: string;
      }>;
    }>;
    total_events: number;
    conflict_days: number;
  }

  const query = useMCPQuery<CalendarDayResponse>(
    "events",
    "event_get_calendar",
    { date_from: dateRange.date_from, date_to: dateRange.date_to },
    { enabled: shouldFetch, staleTime: 0 },
  );

  const calData = query.data;

  // Find the selected day's data
  const selectedDay = calData?.data?.find((d) => d.date === date);
  const dayEvents = selectedDay?.events ?? [];
  const totalEvents = calData?.total_events ?? 0;
  const conflictDays = calData?.conflict_days ?? 0;

  /* ── CTA ── */
  if (!shouldFetch) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock size={18} className="text-[var(--color-gold-400)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Eventos del Día
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                Ver eventos programados para {new Date(date + "T12:00:00").toLocaleDateString("es-CR", { day: "numeric", month: "long" })} y detectar solapamientos
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShouldFetch(true)}
            icon={<CalendarClock className="w-4 h-4" />}
            className="min-h-[44px] flex-shrink-0"
          >
            Ver Eventos
          </Button>
        </div>
      </Card>
    );
  }

  /* ── Loading ── */
  if (query.isLoading && !calData) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  /* ── Error ── */
  if (query.isError || !calData) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <SectionError
          title="Error al cargar eventos"
          description="No se pudo obtener el calendario de eventos."
          onRetry={() => query.refetch()}
        />
      </Card>
    );
  }

  /* ── Empty ── */
  if (dayEvents.length === 0) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-emerald-400)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[var(--color-emerald-400)]" />
            <h3 className="text-sm font-semibold text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)]">
              Sin eventos programados
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShouldFetch(false)}
            className="min-h-[44px] text-xs"
          >
            Nueva búsqueda
          </Button>
        </div>
        <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
          No hay eventos en el calendario para esta fecha. Las instalaciones están disponibles para reservas.
        </p>
      </Card>
    );
  }

  /* ── Results ── */
  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={14} className="text-[var(--color-gold-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Eventos del Día
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
            {dayEvents.length}
          </span>
          {selectedDay?.has_conflicts && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[color-mix(in srgb,var(--color-rose-400)15%,transparent)] text-[var(--color-rose-400)]">
              Conflicto
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
            icon={<RefreshCw className="w-3 h-3" />}
            className="min-h-[44px] text-xs"
          >
            Refrescar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShouldFetch(false)}
            className="min-h-[44px] text-xs"
          >
            Cerrar
          </Button>
        </div>
      </div>

      {/* Context badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
          {totalEvents} evento{totalEvents !== 1 ? "s" : ""} total
        </span>
        {conflictDays > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium font-[family-name:var(--font-mono)] bg-[color-mix(in srgb,var(--color-rose-400)12%,transparent)] text-[var(--color-rose-400)]">
            {conflictDays} día{conflictDays > 1 ? "s" : ""} con conflictos
          </span>
        )}
      </div>

      {/* Event list — desktop */}
      <div className="hidden sm:block space-y-2">
        {dayEvents
          .sort((a, b) => a.time_start.localeCompare(b.time_start))
          .map((evt) => {
            const statusCfg = EVENT_STATUS_CONFIG[evt.status] ?? EVENT_STATUS_CONFIG.pending;
            const catCfg = EVENT_CATEGORY_CONFIG[evt.category];
            const expanded = expandedEvent === evt.id;

            return (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]"
              >
                <Button
                  variant="unstyled"
                  type="button"
                  onClick={() => setExpandedEvent(expanded ? null : evt.id)}
                  className="w-full text-left flex items-center justify-between gap-3 min-h-[44px] focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-300)] flex-shrink-0 w-24">
                      {evt.time_start} — {evt.time_end}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
                        {evt.title}
                      </h4>
                      {catCfg && (
                        <span className="text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]" style={{ color: catCfg.color }}>
                          {catCfg.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                      style={{ color: statusCfg.color, backgroundColor: statusCfg.bgColor }}
                    >
                      {statusCfg.label}
                    </span>
                    {expanded ? (
                      <ChevronUp size={14} className="text-[var(--color-silver-500)]" />
                    ) : (
                      <ChevronDown size={14} className="text-[var(--color-silver-500)]" />
                    )}
                  </div>
                </Button>

                {expanded && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, height: 0 }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                    transition={{ duration: reduced ? 0 : 0.2 }}
                    className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5"
                  >
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                      <span className="text-[var(--color-silver-500)]">Ubicación: </span>
                      {evt.location}
                    </p>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                      <span className="text-[var(--color-silver-500)]">Asistentes: </span>
                      {evt.expected_attendance} esperados · {evt.rsvp_count} confirmados
                    </p>
                    {evt.notes && (
                      <p className="text-xs text-[var(--color-gold-400)] italic font-[family-name:var(--font-body)]">
                        "{evt.notes}"
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
      </div>

      {/* Event list — mobile */}
      <div className="sm:hidden space-y-1.5">
        {dayEvents
          .sort((a, b) => a.time_start.localeCompare(b.time_start))
          .map((evt) => {
            const statusCfg = EVENT_STATUS_CONFIG[evt.status] ?? EVENT_STATUS_CONFIG.pending;
            return (
              <div
                key={evt.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]"
              >
                <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] flex-shrink-0">
                  {evt.time_start}
                </span>
                <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] flex-1 truncate">
                  {evt.title}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)] flex-shrink-0"
                  style={{ color: statusCfg.color, backgroundColor: statusCfg.bgColor }}
                >
                  {statusCfg.label}
                </span>
              </div>
            );
          })}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Intelligence Sub-Component: Scheduling Conflicts (S3)
   ══════════════════════════════════════════════════════════ */

const SCHEDULING_CONFLICT_SEV: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  high: {
    label: "Alto",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  warning: {
    label: "Alerta",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  medium: {
    label: "Medio",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
  },
};

const CONFLICT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  resource_overlap: {
    label: "Recurso",
    icon: Building2,
    color: "var(--color-rose-400)",
  },
  staff_double_booking: {
    label: "Personal",
    icon: Users,
    color: "var(--color-amber-400)",
  },
  capacity_exceeded: {
    label: "Capacidad",
    icon: AlertTriangle,
    color: "var(--color-amber-400)",
  },
  time_overlap: {
    label: "Horario",
    icon: Clock,
    color: "var(--color-teal-400)",
  },
};

function buildConflictsInsight(
  conflicts: SchedulingConflictItem[],
  facilities: FacilityOccupancyItem[] | undefined,
  maintenance: MaintenanceScheduleItem[] | undefined,
): string {
  if (conflicts.length === 0) {
    return "No se detectaron conflictos de programación. Los recursos están correctamente asignados.";
  }

  const critical = conflicts.filter(
    (c) => c.severity === "critical" || c.severity === "high",
  );
  const resourceConflicts = conflicts.filter(
    (c) => c.conflict_type === "resource_overlap" || c.conflict_type === "venue_overlap",
  );
  const staffConflicts = conflicts.filter(
    (c) => c.conflict_type === "staff_double_booking",
  );

  let text = `${conflicts.length} conflicto${conflicts.length > 1 ? "s" : ""} detectado${conflicts.length > 1 ? "s" : ""}`;

  if (critical.length > 0) {
    text += `, ${critical.length} de alta prioridad`;
  }
  text += ". ";

  // Cross-reference with facilities
  if (resourceConflicts.length > 0 && facilities) {
    const maintFacilities = facilities.filter(
      (f) => f.status === "maintenance",
    );
    if (maintFacilities.length > 0) {
      text += `${maintFacilities.length} instalación${maintFacilities.length > 1 ? "es" : ""} en mantenimiento podría estar causando conflictos de recurso. `;
    }
  }

  // Cross-reference with maintenance
  if (maintenance) {
    const activeMaint = maintenance.filter(
      (m) => m.status === "in_progress" || m.status === "scheduled",
    );
    const affectedByConflicts = activeMaint.filter((m) =>
      conflicts.some(
        (c) =>
          c.event_a_name.includes(m.facility_name) ||
          c.event_b_name.includes(m.facility_name) ||
          c.shared_resources.some((r) => r.includes(m.facility_name)),
      ),
    );
    if (affectedByConflicts.length > 0) {
      text += `${affectedByConflicts.length} tarea${affectedByConflicts.length > 1 ? "s" : ""} de mantenimiento involucrada${affectedByConflicts.length > 1 ? "s" : ""}. `;
    }
  }

  if (staffConflicts.length > 0) {
    text += `${staffConflicts.length} conflicto${staffConflicts.length > 1 ? "s" : ""} de asignación de personal requiere${staffConflicts.length === 1 ? "" : "n"} reasignación.`;
  }

  return text.trim();
}

/* ══════════════════════════════════════════════════════════
   AI Schedule Advisor — Recommendation Engine (S4)
   ══════════════════════════════════════════════════════════ */

interface ScheduleRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low" | "positive";
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  metric?: string;
  action?: {
    label: string;
    toast: string;
  };
}

const SCHEDULE_RECO_PRIORITY: Record<
  string,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  critical: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    borderColor: "var(--color-rose-400)",
    label: "Crítico",
  },
  high: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    borderColor: "var(--color-amber-400)",
    label: "Alta",
  },
  medium: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    borderColor: "var(--color-teal-400)",
    label: "Media",
  },
  low: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
    borderColor: "var(--color-silver-400)",
    label: "Baja",
  },
  positive: {
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    borderColor: "var(--color-emerald-400)",
    label: "Positivo",
  },
};

function generateScheduleRecommendations(
  facilities: FacilityOccupancyItem[] | undefined,
  maintenance: MaintenanceScheduleItem[] | undefined,
  events: Array<{
    id: string;
    title: string;
    time_start: string;
    time_end: string;
    location: string;
    category: string;
    status: string;
    expected_attendance: number;
    rsvp_count: number;
  }>,
  conflicts: SchedulingConflictItem[],
  date: string,
): ScheduleRecommendation[] {
  const recs: ScheduleRecommendation[] = [];

  /* ── Rule 1: CRITICAL — Critical/High severity conflicts ── */
  const criticalConflicts = conflicts.filter(
    (c) =>
      c.severity === ConflictSeverity.Critical ||
      c.severity === ConflictSeverity.High,
  );
  if (criticalConflicts.length > 0) {
    const worst = criticalConflicts[0];
    recs.push({
      id: "reco_critical_conflict",
      priority: "critical",
      icon: AlertTriangle,
      category: "Conflicto Crítico",
      title: `${criticalConflicts.length} conflicto${criticalConflicts.length > 1 ? "s" : ""} de alta severidad`,
      description: `"${worst.event_a_name}" vs "${worst.event_b_name}": ${worst.suggestion}`,
      metric: `${criticalConflicts.length} conflicto${criticalConflicts.length > 1 ? "s" : ""}`,
      action: {
        label: "Ver conflictos",
        toast:
          "Revise la sección de Conflictos Detectados para las resoluciones sugeridas",
      },
    });
  }

  /* ── Rule 2: HIGH — Events at facilities under maintenance ── */
  if (maintenance && events.length > 0) {
    const activeMaint = maintenance.filter(
      (m) =>
        m.scheduled_date === date &&
        m.status !== "completed" &&
        m.status !== "cancelled",
    );
    const affectedEvents = events.filter((e) =>
      activeMaint.some(
        (m) =>
          e.location.includes(m.facility_name) ||
          m.facility_name.includes(e.location),
      ),
    );
    if (affectedEvents.length > 0) {
      recs.push({
        id: "reco_maint_events",
        priority: "high",
        icon: Wrench,
        category: "Mantenimiento × Eventos",
        title: `${affectedEvents.length} evento${affectedEvents.length > 1 ? "s" : ""} en instalación con mantenimiento`,
        description: `"${affectedEvents[0].title}" (${affectedEvents[0].location}) coincide con mantenimiento en ${activeMaint[0].facility_name}. Considere reubicar.`,
        action: {
          label: "Coordinar",
          toast: `Coordine con ${activeMaint[0].assigned_to} para reubicar el evento antes del mantenimiento`,
        },
      });
    }
  }

  /* ── Rule 3: HIGH — Staff double-booking ── */
  const staffConflicts = conflicts.filter(
    (c) => c.conflict_type === "staff_double_booking",
  );
  if (staffConflicts.length > 0) {
    const allStaff = staffConflicts.flatMap((c) => c.shared_resources);
    const uniqueStaff = [...new Set(allStaff)];
    recs.push({
      id: "reco_staff_conflict",
      priority: "high",
      icon: Users,
      category: "Personal",
      title: `${staffConflicts.length} conflicto${staffConflicts.length > 1 ? "s" : ""} de asignación de personal`,
      description: `Personal afectado: ${uniqueStaff.join(", ")}. Requiere reasignación.`,
      action: {
        label: "Coordinar",
        toast:
          "Coordine la reasignación de personal con los supervisores de área",
      },
    });
  }

  /* ── Rule 4: MEDIUM — High event load ── */
  if (events.length >= 5) {
    recs.push({
      id: "reco_busy_day",
      priority: "medium",
      icon: CalendarClock,
      category: "Carga Operativa",
      title: `Día con ${events.length} eventos programados`,
      description:
        "Alta carga operativa. Verifique que haya suficiente personal de apoyo y tiempos de setup adecuados.",
      metric: `${events.length} eventos`,
    });
  }

  /* ── Rule 5: MEDIUM — Maintenance on busy day ── */
  const dayMaint =
    maintenance?.filter(
      (m) => m.scheduled_date === date && m.status !== "completed",
    ) ?? [];
  if (dayMaint.length > 0 && events.length > 0) {
    const maintHours = dayMaint.reduce(
      (s, m) => s + m.estimated_duration_hours,
      0,
    );
    recs.push({
      id: "reco_maint_busy",
      priority: "medium",
      icon: Wrench,
      category: "Mantenimiento",
      title: `${dayMaint.length} tarea${dayMaint.length > 1 ? "s" : ""} de mantenimiento en día activo`,
      description: `${maintHours}h de mantenimiento programado. Coordinar horarios para minimizar impacto en eventos.`,
      metric: `${maintHours}h mantto.`,
    });
  }

  /* ── Rule 6: MEDIUM — Low facility utilization ── */
  if (facilities) {
    const operational = facilities.filter(
      (f) => f.status === "operational",
    );
    const idle = operational.filter(
      (f) => f.current_setups === 0 && f.active_maintenance === 0,
    );
    if (
      operational.length > 0 &&
      idle.length > operational.length * 0.5
    ) {
      recs.push({
        id: "reco_low_util",
        priority: "medium",
        icon: Building2,
        category: "Eficiencia",
        title: `${idle.length} instalaciones operativas sin actividad`,
        description: `Más del 50% de las instalaciones operativas están sin uso: ${idle
          .slice(0, 3)
          .map((f) => f.facility_name)
          .join(", ")}${idle.length > 3 ? "..." : ""}.`,
        metric: `${idle.length} ociosas`,
      });
    }
  }

  /* ── Rule 7: POSITIVE — No conflicts with events ── */
  if (conflicts.length === 0 && events.length > 0) {
    recs.push({
      id: "reco_no_conflicts",
      priority: "positive",
      icon: CheckCircle2,
      category: "Operación",
      title: "Agenda sin conflictos",
      description: `Todos los ${events.length} eventos están correctamente programados sin solapamientos de recursos ni personal.`,
      metric: `${events.length} OK`,
    });
  }

  /* ── Rule 8: POSITIVE — All facilities operational ── */
  if (facilities) {
    const allOp = facilities.filter((f) => f.status === "operational");
    const noMaint =
      maintenance?.filter(
        (m) =>
          m.scheduled_date === date &&
          (m.status === "in_progress" || m.status === "scheduled"),
      ) ?? [];
    if (allOp.length === facilities.length && noMaint.length === 0) {
      recs.push({
        id: "reco_all_operational",
        priority: "positive",
        icon: CheckCircle2,
        category: "Instalaciones",
        title: "Todas las instalaciones operativas",
        description:
          "No hay instalaciones en mantenimiento ni cerradas. Capacidad completa disponible para eventos.",
        metric: `${allOp.length} operativas`,
      });
    }
  }

  return recs;
}

function generateScheduleNarrative(
  facilities: FacilityOccupancyItem[] | undefined,
  maintenance: MaintenanceScheduleItem[] | undefined,
  events: Array<{ title: string; location: string }>,
  conflicts: SchedulingConflictItem[],
  date: string,
): string {
  const parts: string[] = [];

  if (events.length > 0) {
    parts.push(
      `Hay ${events.length} evento${events.length > 1 ? "s" : ""} programado${events.length > 1 ? "s" : ""} para esta fecha.`,
    );
  }

  if (conflicts.length > 0) {
    const critical = conflicts.filter(
      (c) =>
        c.severity === ConflictSeverity.Critical ||
        c.severity === ConflictSeverity.High,
    );
    if (critical.length > 0) {
      parts.push(
        `${critical.length} conflicto${critical.length > 1 ? "s" : ""} de alta prioridad requiere${critical.length === 1 ? "" : "n"} resolución inmediata.`,
      );
    } else {
      parts.push(
        `${conflicts.length} conflicto${conflicts.length > 1 ? "s" : ""} menor${conflicts.length > 1 ? "es" : ""} detectado${conflicts.length > 1 ? "s" : ""}.`,
      );
    }
  } else if (events.length > 0) {
    parts.push("No se detectaron conflictos de programación.");
  }

  const dayMaint =
    maintenance?.filter(
      (m) =>
        m.scheduled_date === date &&
        m.status !== "completed" &&
        m.status !== "cancelled",
    ) ?? [];
  if (dayMaint.length > 0) {
    parts.push(
      `${dayMaint.length} tarea${dayMaint.length > 1 ? "s" : ""} de mantenimiento programada${dayMaint.length > 1 ? "s" : ""} para esta fecha.`,
    );
  }

  if (facilities) {
    const maint = facilities.filter((f) => f.status === "maintenance");
    if (maint.length > 0) {
      parts.push(
        `${maint.length} instalación${maint.length > 1 ? "es" : ""} en mantenimiento: ${maint.map((f) => f.facility_name).join(", ")}.`,
      );
    }
  }

  return (
    parts.join(" ") ||
    "Análisis de agenda completo. Revise las recomendaciones a continuación."
  );
}

function SchedulingConflictsSection({
  date,
  facilities,
  maintenance,
}: {
  date: string;
  facilities: FacilityOccupancyItem[] | undefined;
  maintenance: MaintenanceScheduleItem[] | undefined;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);

  const query = useMCPQuery<SchedulingConflictsResponse>(
    "proactive_recommendation",
    "detect_scheduling_conflicts",
    { date },
    { enabled: shouldFetch, staleTime: 0 },
  );

  const conflicts = query.data?.conflicts;
  const insight = useMemo(
    () =>
      conflicts
        ? buildConflictsInsight(conflicts, facilities, maintenance)
        : "",
    [conflicts, facilities, maintenance],
  );

  /* ── CTA ── */
  if (!shouldFetch) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-[var(--color-rose-400)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Detección Inteligente de Conflictos
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                Analizar solapamientos de recursos, personal y capacidad para{" "}
                {new Date(date + "T12:00:00").toLocaleDateString("es-CR", {
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShouldFetch(true)}
            icon={<AlertTriangle className="w-4 h-4" />}
            className="min-h-[44px] flex-shrink-0"
          >
            Detectar
          </Button>
        </div>
      </Card>
    );
  }

  /* ── Loading ── */
  if (query.isLoading && !conflicts) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  /* ── Error ── */
  if (query.isError || !conflicts) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <SectionError
          title="Error al detectar conflictos"
          description="No se pudo ejecutar la detección de conflictos de programación."
          onRetry={() => query.refetch()}
        />
      </Card>
    );
  }

  /* ── Clean bill ── */
  if (conflicts.length === 0) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-emerald-400)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={14}
              className="text-[var(--color-emerald-400)]"
            />
            <h3 className="text-sm font-semibold text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)]">
              Sin conflictos detectados
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShouldFetch(false)}
            className="min-h-[44px] text-xs"
          >
            Nueva búsqueda
          </Button>
        </div>
        <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
          {insight}
        </p>
      </Card>
    );
  }

  /* ── Results ── */
  const sevCounts: Record<string, number> = {};
  for (const c of conflicts) {
    sevCounts[c.severity] = (sevCounts[c.severity] || 0) + 1;
  }
  const sevOrder = ["critical", "high", "warning", "medium", "low"];

  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={14}
            className="text-[var(--color-rose-400)]"
          />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Conflictos Detectados
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
            {conflicts.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
            icon={<RefreshCw className="w-3 h-3" />}
            className="min-h-[44px] text-xs"
          >
            Re-analizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShouldFetch(false)}
            className="min-h-[44px] text-xs"
          >
            Nueva búsqueda
          </Button>
        </div>
      </div>

      {/* Severity badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sevOrder.map((sev) => {
          const count = sevCounts[sev];
          if (!count) return null;
          const cfg =
            SCHEDULING_CONFLICT_SEV[sev] ?? SCHEDULING_CONFLICT_SEV.medium;
          return (
            <span
              key={sev}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium font-[family-name:var(--font-mono)]"
              style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              {count} {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Conflict cards */}
      <div className="space-y-3 mb-4">
        {conflicts.map((conf) => {
          const sevCfg =
            SCHEDULING_CONFLICT_SEV[conf.severity] ??
            SCHEDULING_CONFLICT_SEV.warning;
          const typeCfg = CONFLICT_TYPE_CONFIG[conf.conflict_type];
          const TypeIcon = typeCfg?.icon ?? AlertTriangle;

          return (
            <div
              key={conf.id}
              className="p-4 rounded-xl border-l-4 bg-[var(--color-surface-2)]"
              style={{ borderLeftColor: sevCfg.color }}
            >
              {/* Conflict header */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                  style={{
                    color: sevCfg.color,
                    backgroundColor: sevCfg.bgColor,
                  }}
                >
                  {sevCfg.label}
                </span>
                {typeCfg && (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                    <TypeIcon
                      size={10}
                      style={{ color: typeCfg.color }}
                    />
                    {typeCfg.label}
                  </span>
                )}
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                  {conf.overlap_start} — {conf.overlap_end}
                </span>
              </div>

              {/* Conflicting resources */}
              <p className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">
                "{conf.event_a_name}"
              </p>
              <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">
                vs
              </p>
              <p className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-2">
                "{conf.event_b_name}"
              </p>

              {/* Shared resources */}
              <div className="flex flex-wrap gap-2 mb-2">
                {conf.shared_resources.map((r) => (
                  <span
                    key={r}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]"
                  >
                    <Building2 size={10} />
                    {r}
                  </span>
                ))}
              </div>

              {/* Resolution */}
              <div className="p-3 rounded-lg bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)] border border-[var(--color-gold-400)]/[0.1]">
                <div className="flex items-start gap-2">
                  <Lightbulb
                    size={12}
                    className="text-[var(--color-gold-400)] flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--color-gold-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-0.5">
                      Resolución sugerida
                    </p>
                    <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
                      {conf.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-reference insight */}
      <div className="p-3 rounded-lg bg-[color-mix(in srgb,var(--color-teal-400)6%,transparent)]">
        <div className="flex items-start gap-2">
          <Sparkles
            size={12}
            className="text-[var(--color-teal-400)] flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   AI Schedule Advisor — Deep Insights Sub-Component (S4)
   ══════════════════════════════════════════════════════════ */

function ScheduleDeepInsights() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;

  const query = useMCPQuery<QuarterlyInsightGetResponse>(
    "proactive_recommendation",
    "generate_quarterly_insights",
    { action: "generate", year: currentYear, period: currentQuarter },
    { staleTime: 0 },
  );

  const insight = query.data?.insight;

  if (query.isLoading) {
    return (
      <div className="space-y-3 mt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError || !insight) {
    return (
      <div className="mt-4">
        <SectionError
          title="Error al generar insights"
          description="No se pudo obtener el análisis trimestral."
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Summary */}
      <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
        {insight.summary}
      </p>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Key Achievements */}
        <div className="p-3 rounded-xl bg-[color-mix(in srgb,var(--color-emerald-400)6%,transparent)] border border-[var(--color-emerald-400)]/[0.1]">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy size={12} className="text-[var(--color-emerald-400)]" />
            <p className="text-[9px] font-semibold text-[var(--color-emerald-400)] uppercase tracking-wider font-[family-name:var(--font-ui)]">
              Logros Operativos
            </p>
          </div>
          <ul className="space-y-1.5">
            {insight.key_achievements.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2
                  size={10}
                  className="text-[var(--color-emerald-400)] flex-shrink-0 mt-0.5"
                />
                <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                  {a}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="p-3 rounded-xl bg-[color-mix(in srgb,var(--color-amber-400)6%,transparent)] border border-[var(--color-amber-400)]/[0.1]">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle
              size={12}
              className="text-[var(--color-amber-400)]"
            />
            <p className="text-[9px] font-semibold text-[var(--color-amber-400)] uppercase tracking-wider font-[family-name:var(--font-ui)]">
              Áreas de Mejora
            </p>
          </div>
          <ul className="space-y-1.5">
            {insight.areas_for_improvement.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertCircle
                  size={10}
                  className="text-[var(--color-amber-400)] flex-shrink-0 mt-0.5"
                />
                <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                  {a}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Strategic Recommendations */}
        <div className="p-3 rounded-xl bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)] border border-[var(--color-gold-400)]/[0.1]">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={12} className="text-[var(--color-gold-400)]" />
            <p className="text-[9px] font-semibold text-[var(--color-gold-400)] uppercase tracking-wider font-[family-name:var(--font-ui)]">
              Recomendaciones Estratégicas
            </p>
          </div>
          <ul className="space-y-1.5">
            {insight.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Sparkles
                  size={10}
                  className="text-[var(--color-gold-400)] flex-shrink-0 mt-0.5"
                />
                <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                  {r}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-[var(--color-surface-1)] border border-white/[0.04]">
        {[
          {
            label: "Socios activos",
            value: formatNumber(insight.total_members_active),
          },
          { label: "Eventos", value: String(insight.events_held) },
          {
            label: "Asist. promedio",
            value: formatNumber(Math.round(insight.avg_event_attendance)),
          },
          {
            label: "Revenue",
            value: `$${(insight.revenue_total / 1000).toFixed(0)}K`,
          },
          {
            label: "Satisfacción",
            value: `${insight.member_satisfaction_avg}/5.0`,
          },
        ].map((stat) => (
          <div key={stat.label} className="text-center px-3">
            <p className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AI Schedule Advisor — Main Sub-Component (S4)
   ══════════════════════════════════════════════════════════ */

function AIScheduleAdvisor({
  date,
  facilities,
  maintenance,
}: {
  date: string;
  facilities: FacilityOccupancyItem[] | undefined;
  maintenance: MaintenanceScheduleItem[] | undefined;
}) {
  const { isMobile } = useBreakpoint();
  const [shouldAnalyze, setShouldAnalyze] = useState(false);
  const [showDeepInsights, setShowDeepInsights] = useState(false);

  /* ── On-demand queries (self-contained) ── */
  const dateRange = useMemo(() => {
    const d = new Date(date + "T12:00:00");
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const fmt = (dt: Date) => dt.toISOString().split("T")[0];
    return { date_from: fmt(prev), date_to: fmt(next) };
  }, [date]);

  // Response shape matching event_get_calendar (Fase 18)
  interface CalendarDayResponse {
    status: string;
    message: string;
    data: Array<{
      date: string;
      total_events: number;
      has_conflicts: boolean;
      events: Array<{
        id: string;
        title: string;
        time_start: string;
        time_end: string;
        location: string;
        category: string;
        status: string;
        expected_attendance: number;
        rsvp_count: number;
        notes?: string;
      }>;
    }>;
    total_events: number;
    conflict_days: number;
  }

  const eventsQ = useMCPQuery<CalendarDayResponse>(
    "events",
    "event_get_calendar",
    { date_from: dateRange.date_from, date_to: dateRange.date_to },
    { enabled: shouldAnalyze, staleTime: 0 },
  );

  const conflictsQ = useMCPQuery<SchedulingConflictsResponse>(
    "proactive_recommendation",
    "detect_scheduling_conflicts",
    { date },
    { enabled: shouldAnalyze, staleTime: 0 },
  );

  /* ── Derived data ── */
  const calData = eventsQ.data;
  const selectedDay = calData?.data?.find((d) => d.date === date);
  const dayEvents = selectedDay?.events ?? [];
  const conflicts = conflictsQ.data?.conflicts ?? [];

  const isReady = shouldAnalyze && !eventsQ.isLoading && !conflictsQ.isLoading;
  const hasError = eventsQ.isError || conflictsQ.isError;

  const recommendations = useMemo(
    () =>
      isReady && !hasError
        ? generateScheduleRecommendations(
            facilities,
            maintenance,
            dayEvents,
            conflicts,
            date,
          )
        : [],
    [isReady, hasError, facilities, maintenance, dayEvents, conflicts, date],
  );

  const narrative = useMemo(
    () =>
      isReady && !hasError
        ? generateScheduleNarrative(
            facilities,
            maintenance,
            dayEvents,
            conflicts,
            date,
          )
        : "",
    [isReady, hasError, facilities, maintenance, dayEvents, conflicts, date],
  );

  const criticalRecs = recommendations.filter(
    (r) => r.priority === "critical" || r.priority === "high",
  );
  const mediumRecs = recommendations.filter((r) => r.priority === "medium");
  const positiveRecs = recommendations.filter(
    (r) => r.priority === "positive" || r.priority === "low",
  );

  const handleAction = (rec: ScheduleRecommendation) => {
    if (rec.action?.toast) {
      showToast({ type: "info", message: rec.action.toast });
    }
  };

  /* ── CTA ── */
  if (!shouldAnalyze) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain size={18} className="text-[var(--color-gold-400)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Asistente de Agenda AI
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                Analizar eventos, conflictos, mantenimiento e instalaciones para generar recomendaciones inteligentes
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShouldAnalyze(true)}
            icon={<Brain className="w-4 h-4" />}
            className="min-h-[44px] flex-shrink-0"
          >
            Analizar
          </Button>
        </div>
      </Card>
    );
  }

  /* ── Loading ── */
  if (!isReady && !hasError) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  /* ── Error ── */
  if (hasError) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <SectionError
          title="Error al analizar agenda"
          description="No se pudieron obtener los datos para el análisis."
          onRetry={() => {
            eventsQ.refetch();
            conflictsQ.refetch();
          }}
        />
      </Card>
    );
  }

  /* ── Results ── */
  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[var(--color-gold-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)]">
            Asistente de Agenda AI
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              eventsQ.refetch();
              conflictsQ.refetch();
            }}
            icon={<RefreshCw className="w-3 h-3" />}
            className="min-h-[44px] text-xs"
          >
            Re-analizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShouldAnalyze(false)}
            className="min-h-[44px] text-xs"
          >
            Cerrar
          </Button>
        </div>
      </div>

      {/* Narrative */}
      <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed mb-5">
        {narrative}
      </p>

      {/* ── Critical / High priority ── */}
      {criticalRecs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-semibold text-[var(--color-rose-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} />
            Requiere Atención Inmediata
          </p>
          <div className="space-y-2">
            {criticalRecs.map((rec) => {
              const cfg = SCHEDULE_RECO_PRIORITY[rec.priority];
              const RecIcon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl border-l-3"
                  style={{
                    borderLeftColor: cfg.borderColor,
                    backgroundColor: cfg.bgColor,
                  }}
                >
                  <RecIcon
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: cfg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                        style={{
                          color: cfg.color,
                          backgroundColor: cfg.bgColor,
                        }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                        {rec.category}
                      </span>
                      {rec.metric && (
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                          {rec.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">
                      {rec.title}
                    </p>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                      {rec.description}
                    </p>
                  </div>
                  {rec.action && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(rec)}
                        icon={<ArrowRight className="w-3 h-3" />}
                        className="flex-shrink-0 min-h-[44px] text-xs hidden sm:inline-flex"
                      >
                        {rec.action.label}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(rec)}
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                        className="flex-shrink-0 min-h-[44px] sm:hidden"
                        aria-label={rec.action.label}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Medium priority ── */}
      {mediumRecs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-semibold text-[var(--color-teal-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1.5">
            <Zap size={10} />
            Optimizaciones
          </p>
          <div className="space-y-2">
            {mediumRecs.map((rec) => {
              const cfg = SCHEDULE_RECO_PRIORITY[rec.priority];
              const RecIcon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]"
                >
                  <RecIcon
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: cfg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        {rec.title}
                      </p>
                      {rec.metric && (
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                          {rec.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                      {rec.description}
                    </p>
                  </div>
                  {rec.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(rec)}
                      icon={<ArrowRight className="w-3 h-3" />}
                      className="flex-shrink-0 min-h-[44px] text-xs"
                    >
                      {isMobile ? "" : rec.action.label}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Positive / Opportunities ── */}
      {positiveRecs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-semibold text-[var(--color-emerald-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1.5">
            <Trophy size={10} />
            Positivo
          </p>
          <div className="flex flex-wrap gap-2">
            {positiveRecs.map((rec) => {
              const cfg = SCHEDULE_RECO_PRIORITY[rec.priority];
              const RecIcon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className={cn(
                    "flex items-start gap-2 p-2.5 rounded-xl border border-white/[0.06]",
                    "bg-[var(--color-surface-2)] max-w-xs",
                  )}
                >
                  <RecIcon
                    size={12}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: cfg.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] text-left">
                      {rec.title}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)] text-left line-clamp-1">
                      {rec.metric} — {rec.category}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Deep Insights CTA ── */}
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        {!showDeepInsights ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                ¿Querés un análisis más profundo?
              </p>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)]">
                Insights trimestrales con logros operativos, áreas de mejora y recomendaciones estratégicas
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeepInsights(true)}
              icon={<Brain className="w-4 h-4" />}
              className="min-h-[44px] flex-shrink-0"
            >
              {isMobile ? "Insights" : "Insights Trimestrales"}
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">
                Insights Trimestrales Profundos
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeepInsights(false)}
                className="min-h-[44px] text-xs"
              >
                Colapsar
              </Button>
            </div>
            <ScheduleDeepInsights />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function SmartSchedule() {
  const reduced = useReducedMotion();
  const motionV = useMotion();
  const { isMobile } = useBreakpoint();
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  /* ── Auto-load queries ── */
  const facilitiesQ = useMCPQuery<get_facility_occupancy_Contract["data"]>(
    "facility_management",
    "get_facility_occupancy",
    {},
    { staleTime: 120_000 },
  );

  const maintenanceQ = useMCPQuery<get_maintenance_schedule_Contract["data"]>(
    "facility_management",
    "get_maintenance_schedule",
    {},
    { staleTime: 300_000 },
  );

  /* ── Derived ── */
  const facilities = facilitiesQ.data?.facilities;
  const allMaintenance = maintenanceQ.data?.schedule;

  const dayMaintenance = useMemo(() => {
    if (!allMaintenance || !shouldFetch) return [];
    return allMaintenance.filter((m) => m.scheduled_date === date);
  }, [allMaintenance, date, shouldFetch]);

  const facilityUtilData = useMemo(() => {
    if (!facilities) return [];
    return facilities
      .filter((f: FacilityOccupancyItem) => f.status !== "closed")
      .map((f: FacilityOccupancyItem) => ({
        facility: f.facility_name.length > 14 ? f.facility_name.slice(0, 14) + "…" : f.facility_name,
        utilization_pct:
          f.capacity > 0
            ? Math.min(
                100,
                Math.round(
                  ((f.current_setups + f.active_maintenance) / f.capacity) * 100,
                ),
              )
            : 0,
        hours_booked: f.current_setups + f.active_maintenance,
        hours_available: f.capacity,
        status: f.status,
      }));
  }, [facilities]);

  const nextMaintenance = useMemo(() => {
    if (!allMaintenance) return null;
    const upcoming = allMaintenance
      .filter((m) => m.status === "scheduled" && m.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    return upcoming[0] ?? null;
  }, [allMaintenance, today]);

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */
  return (
    <motion.div
      variants={motionV.container}
      initial={false}
      animate="visible"
      className="space-y-6 mt-6"
    >
      {/* ═══════════════════════════════════════════════════
          1. FACILITY STATUS — auto-load, always visible
          ═══════════════════════════════════════════════════ */}
      <motion.div variants={motionV.item}>
        <FacilityStatusGrid
          facilities={facilities}
          loading={facilitiesQ.isLoading}
          error={!!facilitiesQ.isError}
          onRetry={() => facilitiesQ.refetch()}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          2. MAINTENANCE OVERVIEW — auto-load, always visible
          ═══════════════════════════════════════════════════ */}
      <motion.div variants={motionV.item}>
        {maintenanceQ.isLoading && !allMaintenance ? (
          <Card className="p-5">
            <Skeleton className="h-4 w-48 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          </Card>
        ) : maintenanceQ.isError || !allMaintenance ? (
          <Card className="p-5">
            <SectionError
              title="Error al cargar mantenimiento"
              description="No se pudo obtener el calendario de mantenimiento."
              onRetry={() => maintenanceQ.refetch()}
            />
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-[var(--color-amber-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Mantenimiento Programado
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
                  {allMaintenance.length}
                </span>
              </div>
              {nextMaintenance && (
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                  Próximo: {nextMaintenance.facility_name} — {new Date(nextMaintenance.scheduled_date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>

            {/* Desktop list */}
            <div className="hidden sm:block space-y-2">
              {allMaintenance.map((m) => {
                const typeCfg = MAINTENANCE_TYPE_CONFIG[m.maintenance_type] ?? MAINTENANCE_TYPE_CONFIG.preventive;
                const statusCfg = MAINTENANCE_STATUS_CONFIG[m.status] ?? MAINTENANCE_STATUS_CONFIG.scheduled;
                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                          style={{ color: typeCfg.color, backgroundColor: typeCfg.bgColor }}
                        >
                          {typeCfg.label}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                          style={{ color: statusCfg.color, backgroundColor: statusCfg.bgColor }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        {m.facility_name}
                      </p>
                      <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                        {m.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                        {new Date(m.scheduled_date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                      </p>
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                        {m.scheduled_time} · {m.estimated_duration_hours}h
                      </p>
                      {m.cost > 0 && (
                        <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                          {formatCurrency(m.cost)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile compact */}
            <div className="sm:hidden space-y-1.5">
              {allMaintenance.map((m) => {
                const typeCfg = MAINTENANCE_TYPE_CONFIG[m.maintenance_type] ?? MAINTENANCE_TYPE_CONFIG.preventive;
                const statusCfg = MAINTENANCE_STATUS_CONFIG[m.status] ?? MAINTENANCE_STATUS_CONFIG.scheduled;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: typeCfg.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
                        {m.facility_name}
                      </p>
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                        {new Date(m.scheduled_date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })} · {m.scheduled_time}
                      </p>
                    </div>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)] flex-shrink-0"
                      style={{ color: statusCfg.color, backgroundColor: statusCfg.bgColor }}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          3. DATE PICKER + CTA — on-demand analysis
          ═══════════════════════════════════════════════════ */}
      <motion.div variants={motionV.item}>
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[color-mix(in srgb,var(--color-teal-400)12%,transparent)] flex items-center justify-center">
                <CalendarClock size={18} className="text-[var(--color-teal-400)]" />
              </div>
              <div>
                <h3 className="text-base font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
                  Análisis de Agenda
                </h3>
                <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                  Selecciona una fecha para analizar eventos, conflictos y optimizaciones
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <CalendarClock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-silver-500)] pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06]
                            text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]
                            focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]
                            min-h-[44px]"
                />
              </div>
              <Button
                variant="primary"
                onClick={() => setShouldFetch(true)}
                icon={<Sparkles size={16} />}
                className="bg-[var(--color-teal-400)] text-[var(--color-abyss)] hover:brightness-110 min-h-[44px] px-6"
              >
                {isMobile ? <Sparkles size={18} /> : "Generar"}
              </Button>
            </div>
          </div>

          {/* Quick date picks */}
          <div className="flex gap-2 mt-3">
            {[today, new Date(Date.now() + 86400000).toISOString().split("T")[0]].map((d) => (
              <Button
                key={d}
                variant="ghost"
                size="sm"
                onClick={() => setDate(d)}
                className="text-xs min-h-[44px] underline"
              >
                {d === today ? "Hoy" : "Mañana"}
              </Button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          4. AFTER GENERATE — timeline + charts
          ═══════════════════════════════════════════════════ */}
      {shouldFetch && (
        <>
          {/* ── Schedule Header ── */}
          <motion.div variants={motionV.item}>
            <Card className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center border border-white/[0.06]">
                  <CalendarClock size={18} className="text-[var(--color-teal-400)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
                    Agenda Inteligente
                  </h3>
                  <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                    {new Date(date + "T12:00:00").toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
                    {" · "}{dayMaintenance.length} tarea{dayMaintenance.length !== 1 ? "s" : ""} de mantenimiento
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  facilitiesQ.refetch();
                  maintenanceQ.refetch();
                  showToast({ type: "info", message: "Datos actualizados" });
                }}
                icon={<RefreshCw className="w-4 h-4" />}
                className="min-h-[44px] text-xs"
              >
                {isMobile ? "" : "Actualizar"}
              </Button>
            </Card>
          </motion.div>

          {/* ── Maintenance Timeline for Selected Date ── */}
          {dayMaintenance.length > 0 ? (
            <motion.div variants={motionV.item}>
              <Card className="p-5 overflow-hidden">
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-6 flex items-center gap-2">
                  <Clock size={14} className="text-[var(--color-silver-400)]" /> Cronograma del Día
                </h3>
                <div className="relative ml-20 sm:ml-28 border-l border-white/[0.06] pb-4">
                  {dayMaintenance
                    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
                    .map((m) => {
                      const typeCfg = MAINTENANCE_TYPE_CONFIG[m.maintenance_type] ?? MAINTENANCE_TYPE_CONFIG.preventive;
                      const expanded = expandedBlock === m.id;

                      return (
                        <div key={m.id} className="relative mb-4">
                          {/* Time label */}
                          <div className="absolute -left-20 sm:-left-28 top-0 h-full flex flex-col justify-start text-right pr-3">
                            <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                              {m.scheduled_time}
                            </span>
                            <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-silver-500)]">
                              {addHours(m.scheduled_time, m.estimated_duration_hours)}
                            </span>
                          </div>

                          {/* Block */}
                          <Button
                            variant="unstyled"
                            type="button"
                            onClick={() => setExpandedBlock(expanded ? null : m.id)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border-l-4 transition-all",
                              "hover:bg-[var(--color-surface-2)]",
                              "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                              "min-h-[44px]",
                            )}
                            style={{
                              borderLeftColor: typeCfg.color,
                              backgroundColor: typeCfg.bgColor,
                            }}
                            aria-expanded={expanded}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)] bg-black/20"
                                  style={{ color: typeCfg.color }}
                                >
                                  {typeCfg.label}
                                </span>
                                <h4 className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
                                  {m.facility_name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] hidden sm:block">
                                  {m.estimated_duration_hours}h
                                </span>
                                {expanded ? (
                                  <ChevronUp size={14} className="text-[var(--color-silver-500)]" />
                                ) : (
                                  <ChevronDown size={14} className="text-[var(--color-silver-500)]" />
                                )}
                              </div>
                            </div>

                            {expanded && (
                              <motion.div
                                initial={reduced ? false : { opacity: 0, height: 0 }}
                                animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                                transition={{ duration: reduced ? 0 : 0.2 }}
                                className="mt-3 pt-3 border-t border-white/[0.1] space-y-2"
                              >
                                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                                  <span className="text-[var(--color-silver-500)]">Descripción: </span>
                                  {m.description}
                                </p>
                                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                                  <span className="text-[var(--color-silver-500)]">Responsable: </span>
                                  {m.assigned_to}
                                </p>
                                {m.cost > 0 && (
                                  <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
                                    <span className="text-[var(--color-silver-500)]">Costo: </span>
                                    {formatCurrency(m.cost)}
                                  </p>
                                )}
                                {m.notes && (
                                  <p className="text-xs text-[var(--color-gold-400)] italic font-[family-name:var(--font-body)]">
                                    "{m.notes}"
                                  </p>
                                )}
                              </motion.div>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={motionV.item}>
              <Card className="p-8 text-center">
                <CheckCircle2 size={28} className="mx-auto mb-3 text-[var(--color-emerald-400)]" />
                <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">
                  Sin mantenimiento programado para esta fecha
                </p>
                <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-body)] mt-1">
                  Las instalaciones están disponibles para eventos y actividades
                </p>
              </Card>
            </motion.div>
          )}

          {/* ── Facility Utilization Chart (derived from occupancy) ── */}
          {facilityUtilData.length > 0 && (
            <motion.div variants={motionV.item}>
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-4 flex items-center gap-2">
                  <Building2 size={14} className="text-[var(--color-silver-400)]" /> Utilización de Instalaciones
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(200, facilityUtilData.length * 32)}>
                  <BarChart data={facilityUtilData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" tick={AXIS_TICK} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="facility" tick={AXIS_TICK} width={100} />
                    <Tooltip content={<UtilizationTooltip />} />
                    <Bar dataKey="utilization_pct" radius={[0, 4, 4, 0]} maxBarSize={16}>
                      {facilityUtilData.map((f: { utilization_pct: number }, idx: number) => (
                        <Cell key={idx} fill={utilizationColor(f.utilization_pct)} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}

          {/* ── CROSS-AGENT: Event Calendar (S2) ── */}
          <motion.div variants={motionV.item}>
            <EventCalendarSection date={date} />
          </motion.div>
          {/* ── INTELLIGENCE: Scheduling Conflicts (S3) ── */}
          <motion.div variants={motionV.item}>
            <SchedulingConflictsSection
              date={date}
              facilities={facilities}
              maintenance={allMaintenance}
            />
          </motion.div>
          {/* ── AI SCHEDULE ADVISOR (S4) ── */}
          <motion.div variants={motionV.item}>
            <AIScheduleAdvisor
              date={date}
              facilities={facilities}
              maintenance={allMaintenance}
            />
          </motion.div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════
          5. EXPORT
          ═══════════════════════════════════════════════════ */}
      <motion.div variants={motionV.item}>
        <div className="flex justify-end">
          <ExportButton
            module="smart-schedule"
            onPrint={() => showToast({ type: "info", message: "Vista de impresión disponible — use Ctrl+P" })}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
