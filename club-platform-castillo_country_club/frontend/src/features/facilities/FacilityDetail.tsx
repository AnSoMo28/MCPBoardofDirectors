// src/features/facilities/FacilityDetail.tsx
// ═══════════════════════════════════════════════════════════
// FACILITY DETAIL — "El Retrato"
//
// Full facility detail page with intelligence integration.
// Combines MCP detail data + useFacilitiesDashboard intelligence.
//
// MERGED: Their data display + hero + stats + maint + reservations
//         + Our SVG chart + intelligence + narrative + Living Protocol
//         + CSS-driven colors + data-mode + hover micro-movement
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — hero entry, stagger sections, chart draw-in
//   ✅ SENSE 2: REACCIÓN — stat cards hover, maint items hover
//   ✅ SENSE 3: MEMORIA — health %, comfort score, personality traits
//   ✅ SENSE 4: INTENCIÓN — schedule maintenance CTA, create reservation
//   ✅ SENSE 5: SINIESTRÍA — critical health dominant, anomaly pulse
//   ✅ SENSE 6: EMPATÍA — data-mode from ambient state
//   ✅ SENSE 7: NARRATIVA — facility summary sentence
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";

import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Wrench,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
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
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { formatPercent } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";

import { useFacilitiesDashboard } from "./hooks/useFacilitiesDashboard";

import {
  FACILITY_TYPE_CONFIG
} from "./config";
import {
  FACILITY_STATUS_DISPLAY,
  RESERVATION_STATUS_DISPLAY,
} from "./types";

import type {
  Facility,
  MaintenanceTask,
  MaintenanceType,
  MaintenanceStatus,
  FacilityReservation,
  ComfortScore,
  DeteriorationModel,
  FacilitiesDashboardMode,
} from "./types";

import "./FacilityDetail.css";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface FacilityDetailData {
  facility: Facility & {
    description?: string;
    amenities?: string[];
  };
  upcoming_reservations: FacilityReservation[];
  utilization_history: Array<{ date: string; utilization: number }>;
  maintenance_log: MaintenanceTask[];
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const UPCOMING_LIMIT = 8;

// ═══════════════════════════════════════════════════════════
// LUCIDE ICON MAP
// ═══════════════════════════════════════════════════════════

const TYPE_ICON_MAP: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Waves, Dumbbell, Trophy, Target, Flag,
  UtensilsCrossed, Wine, Crown, Flower2,
  Car, Smile, Sparkles, Baby,
};

// ═══════════════════════════════════════════════════════════
// LABELS (no colors — CSS handles via data-attributes)
// ═══════════════════════════════════════════════════════════

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive:  "Preventivo",
  corrective:  "Correctivo",
  emergency:   "Emergencia",
  renovation:  "Renovación",
  cleaning:    "Limpieza",
  inspection:  "Inspección",
};

const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  completed:   "Completado",
  in_progress: "En progreso",
  scheduled:   "Programado",
  cancelled:   "Cancelado",
  on_hold:     "En pausa",
};

const MAINTENANCE_STATUS_ICONS: Record<
  MaintenanceStatus,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  completed:   CheckCircle2,
  in_progress: Wrench,
  scheduled:   Calendar,
  cancelled:   AlertTriangle,
  on_hold:     Clock,
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

function parseMonth(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CR", {
    month: "short",
  });
}

function healthToStatus(health: number): "good" | "warning" | "critical" {
  if (health >= 70) return "good";
  if (health >= 40) return "warning";
  return "critical";
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE BUILDER — Sense 7
// ═══════════════════════════════════════════════════════════

function buildFacilityNarrative(
  facilityName: string,
  status: string,
  avgUtil: number,
  comfortScore?: ComfortScore,
  deterioration?: DeteriorationModel,
  maintenanceCount?: number,
  reservationCount?: number,
): string {
  const parts: string[] = [];

  parts.push(`${facilityName}`);

  if (status === "operational") {
    parts.push("opera normalmente");
  } else if (status === "maintenance") {
    parts.push("está en mantenimiento");
  } else {
    parts.push(`está en estado: ${status}`);
  }

  parts.push(`con ${formatPercent(avgUtil, 0)} de utilización promedio.`);

  if (comfortScore) {
    if (comfortScore.overall >= 75) {
      parts.push(`Confort excelente (${comfortScore.overall}/100).`);
    } else if (comfortScore.overall >= 50) {
      parts.push(`Confort aceptable (${comfortScore.overall}/100).`);
    } else {
      parts.push(`Confort bajo (${comfortScore.overall}/100) — requiere atención.`);
    }
  }

  if (deterioration) {
    const criticalCount = deterioration.components.filter(
      (c) => c.current_health < 40,
    ).length;
    if (criticalCount > 0) {
      parts.push(
        `${criticalCount} componente${criticalCount > 1 ? "s" : ""} con salud crítica.`,
      );
    }
  }

  if (maintenanceCount && maintenanceCount > 0) {
    parts.push(`${maintenanceCount} tarea${maintenanceCount > 1 ? "s" : ""} de mantenimiento.`);
  }

  if (reservationCount && reservationCount > 0) {
    parts.push(`${reservationCount} reserva${reservationCount > 1 ? "s" : ""} próximas.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Pure SVG Utilization Chart (replaces Recharts)
// ═══════════════════════════════════════════════════════════

const CHART_W = 520;
const CHART_H = 150;
const CHART_PAD = { t: 8, r: 8, b: 22, l: 34 };

function UtilizationChart({
  data,
  prefersReduced,
}: {
  data: Array<{ date: string; utilization: number }>;
  prefersReduced: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const avg = useMemo(
    () =>
      data.length > 0
        ? data.reduce((s, d) => s + d.utilization, 0) / data.length
        : 0,
    [data],
  );

  const plotW = CHART_W - CHART_PAD.l - CHART_PAD.r;
  const plotH = CHART_H - CHART_PAD.t - CHART_PAD.b;

  const xScale = useCallback(
    (i: number) =>
      CHART_PAD.l + (data.length > 1 ? i / (data.length - 1) : 0.5) * plotW,
    [data.length, plotW],
  );

  const yScale = useCallback(
    (v: number) => CHART_PAD.t + (1 - v / 100) * plotH,
    [plotH],
  );

  // Build paths
  const linePath = useMemo(() => {
    if (data.length === 0) return "";
    return data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(d.utilization).toFixed(1)}`,
      )
      .join(" ");
  }, [data, xScale, yScale]);

  const areaPath = useMemo(() => {
    if (data.length === 0) return "";
    const baseline = yScale(0);
    return (
      linePath +
      ` L ${xScale(data.length - 1).toFixed(1)} ${baseline.toFixed(1)}` +
      ` L ${xScale(0).toFixed(1)} ${baseline.toFixed(1)} Z`
    );
  }, [linePath, data.length, xScale, yScale]);

  const status = healthToStatus(avg);

  return (
    <div className="fac-detail__card" data-status={status}>
      <div className="fac-detail__card-head">
        <h4 className="fac-detail__card-title">
          Utilización (30 días)
        </h4>
        <span className="fac-detail__card-stat" data-status={status}>
          Promedio: {formatPercent(avg, 0)}
        </span>
      </div>

      <div className="fac-detail__chart-wrap">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="fac-detail__chart-svg"
          role="img"
          aria-label={`Utilization chart: average ${formatPercent(avg, 0)}`}
        >
          <defs>
            <linearGradient id="facDetailAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="fac-detail__chart-grad-top" />
              <stop offset="100%" className="fac-detail__chart-grad-bottom" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => (
            <line
              key={v}
              x1={CHART_PAD.l}
              y1={yScale(v)}
              x2={CHART_W - CHART_PAD.r}
              y2={yScale(v)}
              className="fac-detail__chart-grid"
            />
          ))}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#facDetailAreaGrad)"
              className="fac-detail__chart-area"
            />
          )}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              className="fac-detail__chart-line"
              data-status={status}
              strokeDasharray={prefersReduced ? "none" : "1000"}
              strokeDashoffset={prefersReduced ? "0" : "1000"}
            />
          )}

          {/* Y-axis labels */}
          {[0, 50, 100].map((v) => (
            <text
              key={v}
              x={CHART_PAD.l - 4}
              y={yScale(v) + 3}
              className="fac-detail__chart-label"
              textAnchor="end"
            >
              {v}%
            </text>
          ))}

          {/* X-axis labels — every 5th */}
          {data
            .filter((_, i) => i % 5 === 0 || i === data.length - 1)
            .map((d, _, _arr) => {
              const origIdx = data.indexOf(d);
              return (
                <text
                  key={origIdx}
                  x={xScale(origIdx)}
                  y={CHART_H - 4}
                  className="fac-detail__chart-label"
                  textAnchor="middle"
                >
                  {new Date(d.date).getDate()}
                </text>
              );
            })}

          {/* Hover columns (invisible hit areas) */}
          {data.map((_, i) => (
            <rect
              key={i}
              x={xScale(i) - plotW / data.length / 2}
              y={CHART_PAD.t}
              width={plotW / data.length}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="fac-detail__chart-hit"
            />
          ))}

          {/* Hover indicator */}
          {hoverIdx !== null && (
            <>
              <line
                x1={xScale(hoverIdx)}
                y1={CHART_PAD.t}
                x2={xScale(hoverIdx)}
                y2={yScale(0)}
                className="fac-detail__chart-hover-line"
              />
              <circle
                cx={xScale(hoverIdx)}
                cy={yScale(data[hoverIdx].utilization)}
                r={4}
                className="fac-detail__chart-hover-dot"
                data-status={status}
              />
            </>
          )}
        </svg>

        {/* Tooltip (HTML overlay) */}
        {hoverIdx !== null && (
          <div
            className="fac-detail__chart-tooltip"
            style={{
              left: `${((xScale(hoverIdx) / CHART_W) * 100).toFixed(1)}%`,
            }}
          >
            <span className="fac-detail__chart-tooltip-date">
              {new Date(data[hoverIdx].date).toLocaleDateString("es-CR", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="fac-detail__chart-tooltip-value" data-status={status}>
              {data[hoverIdx].utilization.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Maintenance Log
// ═══════════════════════════════════════════════════════════

function MaintenanceLog({
  records,
  prefersReduced,
}: {
  records: MaintenanceTask[];
  prefersReduced: boolean;
}) {
  if (records.length === 0) {
    return (
      <div className="fac-detail__card">
        <div className="fac-detail__card-head">
          <Wrench className="fac-detail__card-head-icon" />
          <h4 className="fac-detail__card-title">Mantenimiento</h4>
        </div>
        <p className="fac-detail__card-empty">
          Sin registros de mantenimiento
        </p>
      </div>
    );
  }

  // Sort: emergency first, then by date desc
  const sorted = useMemo(() => {
    const priority: Record<MaintenanceType, number> = {
      emergency: 0,
      corrective: 1,
      preventive: 2,
      renovation: 3,
      inspection: 4,
      cleaning: 5,
    };
    return [...records].sort(
      (a, b) =>
        (priority[a.maintenance_type] ?? 9) - (priority[b.maintenance_type] ?? 9),
    );
  }, [records]);

  return (
    <div className="fac-detail__card">
      <div className="fac-detail__card-head">
        <Wrench className="fac-detail__card-head-icon" />
        <h4 className="fac-detail__card-title">Mantenimiento</h4>
        <span className="fac-detail__card-stat">
          {records.length} registro{records.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="fac-detail__maint-list">
        {sorted.map((record, index) => {
          const StatusIcon =
            MAINTENANCE_STATUS_ICONS[record.status] ?? CheckCircle2;

          return (
            <div
              key={record.id}
              className="fac-detail__maint-item"
              data-maint-type={record.maintenance_type}
              data-maint-status={record.status}
              style={
                prefersReduced
                  ? undefined
                  : ({ "--stagger-i": index } as React.CSSProperties)
              }
            >
              <div className="fac-detail__maint-icon">
                <StatusIcon className="fac-detail__maint-icon-svg" />
              </div>

              <div className="fac-detail__maint-body">
                <div className="fac-detail__maint-labels">
                  <span className="fac-detail__maint-type">
                    {MAINTENANCE_TYPE_LABELS[record.maintenance_type]}
                  </span>
                  <span className="fac-detail__maint-status">
                    {MAINTENANCE_STATUS_LABELS[record.status]}
                  </span>
                </div>

                <p className="fac-detail__maint-desc">
                  {record.description}
                </p>

                <div className="fac-detail__maint-meta">
                  {record.assigned_to && (
                    <span>{record.assigned_to}</span>
                  )}
                  <span>
                    {new Date(record.scheduled_date).toLocaleDateString("es-CR")}
                  </span>
                  {record.cost != null && record.cost > 0 && (
                    <span>{formatCRC(record.cost)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Upcoming Reservations
// ═══════════════════════════════════════════════════════════

function UpcomingReservations({
  reservations,
  prefersReduced,
}: {
  reservations: FacilityReservation[];
  prefersReduced: boolean;
}) {
  const limited = reservations.slice(0, UPCOMING_LIMIT);

  if (limited.length === 0) {
    return (
      <div className="fac-detail__card">
        <div className="fac-detail__card-head">
          <Calendar className="fac-detail__card-head-icon fac-detail__card-head-icon--accent" />
          <h4 className="fac-detail__card-title">Próximas reservas</h4>
        </div>
        <p className="fac-detail__card-empty">
          Sin reservas próximas
        </p>
      </div>
    );
  }

  return (
    <div className="fac-detail__card">
      <div className="fac-detail__card-head">
        <Calendar className="fac-detail__card-head-icon fac-detail__card-head-icon--accent" />
        <h4 className="fac-detail__card-title">Próximas reservas</h4>
        <span className="fac-detail__card-stat">
          {reservations.length} total
        </span>
      </div>

      <div className="fac-detail__upcoming-list">
        {limited.map((res, index) => {
          const statusCfg = RESERVATION_STATUS_DISPLAY[res.status];

          return (
            <div
              key={res.id}
              className="fac-detail__upcoming-item"
              data-res-status={res.status}
              style={
                prefersReduced
                  ? undefined
                  : ({ "--stagger-i": index } as React.CSSProperties)
              }
            >
              <div className="fac-detail__upcoming-date">
                <span className="fac-detail__upcoming-month">
                  {parseMonth(res.date)}
                </span>
                <span className="fac-detail__upcoming-day">
                  {parseDayNum(res.date)}
                </span>
              </div>

              <div className="fac-detail__upcoming-body">
                <p className="fac-detail__upcoming-name">
                  {res.family_name}
                </p>
                <p className="fac-detail__upcoming-time">
                  {res.start_time} — {res.end_time}
                  {res.guest_count > 0 &&
                    ` · ${res.guest_count} invitados`}
                </p>
              </div>

              {statusCfg && (
                <span className="fac-detail__upcoming-status">
                  {statusCfg.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Intelligence Panel (Sense 3: MEMORIA)
// Shows personality, comfort, and deterioration intelligence
// from the dashboard hub.
// ═══════════════════════════════════════════════════════════

function IntelligencePanel({ comfortScore, deterioration, ambientMode }: {
  facilityId: string;
  comfortScore?: ComfortScore;
  deterioration?: DeteriorationModel;
  ambientMode: FacilitiesDashboardMode;
}) {
  if (!comfortScore && !deterioration) return null;

  const healthStatus = deterioration
    ? healthToStatus(
        deterioration.components.reduce((s, c) => s + c.current_health, 0) /
          Math.max(1, deterioration.components.length),
      )
    : undefined;

  return (
    <div className="fac-detail__intel" data-mode={ambientMode}>
      <h4 className="fac-detail__intel-title">Inteligencia</h4>

      <div className="fac-detail__intel-grid">
        {/* Comfort Score */}
        {comfortScore && (
          <div
            className="fac-detail__intel-card"
            data-status={healthToStatus(comfortScore.overall)}
          >
            <span className="fac-detail__intel-label">Confort</span>
            <span className="fac-detail__intel-value">
              {comfortScore.overall}
            </span>
            <span className="fac-detail__intel-unit">/100</span>
            {comfortScore.factors.length > 0 && (
              <div className="fac-detail__intel-factors">
                {comfortScore.factors.slice(0, 3).map((f: { name: string; value: string | number }, i: number) => (
                  <span key={i} className="fac-detail__intel-factor">
                    {f.name}: {f.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deterioration Health */}
        {deterioration && (
          <div
            className="fac-detail__intel-card"
            data-status={healthStatus}
          >
            <span className="fac-detail__intel-label">Salud</span>
            <span className="fac-detail__intel-value">
              {Math.round(
                deterioration.components.reduce(
                  (s, c) => s + c.current_health,
                  0,
                ) / Math.max(1, deterioration.components.length),
              )}
            </span>
            <span className="fac-detail__intel-unit">/100</span>
            <div className="fac-detail__intel-factors">
              {deterioration.components.slice(0, 3).map((c, i) => (
                <span
                  key={i}
                  className="fac-detail__intel-factor"
                  data-status={healthToStatus(c.current_health)}
                >
                  {c.name}: {c.current_health}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rm = useReducedMotion();

  // ── MCP detail data ──
  const {
    data,
    isLoading,
    isError,
    error,
  } = useMCPQuery<FacilityDetailData>(
    "facilities",
    "get_facility",
    { facilityId: id },
    { enabled: !!id },
  );

  // ── Intelligence from dashboard hub ──
  const dashboard = useFacilitiesDashboard({
    enabled: !!data && !isLoading,
    utilizationEnabled: true,
    analyticsEnabled: false,
    optimizationEnabled: false,
  });

  // ── Intelligence lookups for this facility ──
  const comfortScore = id ? dashboard.comfortScores[id] : undefined;
  const deterioration = id ? dashboard.deteriorationModels[id] : undefined;
  const ambientMode = dashboard.dashboardMode;

  // ── Loading ──
  if (isLoading) {
    return (
      <PageContainer title="Instalación" subtitle="Cargando...">
        <div className="fac-detail" data-mode="calm">
          <div className="fac-detail__skeleton">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="fac-detail__skeleton-block" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Error ──
  if (isError || !data) {
    return (
      <PageContainer title="Instalación">
        <div className="fac-detail" data-mode="calm">
          <div className="fac-detail__error">
            <EmptyState
              icon={<AlertTriangle size={48} strokeWidth={1.5} />}
              title="Error al cargar"
              description={
                (error as Error)?.message ??
                "No se pudo cargar la instalación."
              }
            />
            <button
              type="button"
              className="fac-detail__error-btn"
              onClick={() => navigate("/admin/facilities")}
            >
              <ArrowLeft className="fac-detail__error-btn-icon" />
              Volver a instalaciones
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Data ──
  const {
    facility,
    upcoming_reservations,
    utilization_history,
    maintenance_log,
  } = data;

  const typeConfig = FACILITY_TYPE_CONFIG[facility.facility_type];
  const statusConfig = FACILITY_STATUS_DISPLAY[facility.status];
  const TypeIcon = TYPE_ICON_MAP[typeConfig?.icon ?? ""] ?? Sparkles;

  // Average utilization
  const avgUtilization = useMemo(
    () =>
      utilization_history.length > 0
        ? utilization_history.reduce((s, d) => s + d.utilization, 0) /
          utilization_history.length
        : 0,
    [utilization_history],
  );

  // Narrative (Sense 7)
  const narrative = buildFacilityNarrative(
    facility.name,
    facility.status,
    avgUtilization,
    comfortScore,
    deterioration,
    maintenance_log.length,
    upcoming_reservations.length,
  );

  // Critical maintenance count (Sense 5)
  const criticalMaintenance = maintenance_log.filter(
    (m) =>
      m.maintenance_type === "emergency" ||
      m.status === "in_progress",
  ).length;

  return (
    <PageContainer
      title={facility.name}
      subtitle={typeConfig?.label ?? facility.facility_type}
      breadcrumbs={[
        { label: "Instalaciones", href: "/admin/facilities" },
        { label: facility.name },
      ]}
      actions={
        <div className="fac-detail__actions">
          <Button
            variant="ghost"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate("/admin/facilities")}
          >
            Volver
          </Button>
          <PermissionGate roles={["ADMIN", "STAFF"]}>
            <Button
              variant="primary"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() =>
                navigate(`/admin/facilities/${id}/reservations`)
              }
            >
              Ver reservas
            </Button>
          </PermissionGate>
        </div>
      }
    >
      <div
        className="fac-detail"
        data-mode={ambientMode}
        data-prefers-reduced={rm ? "true" : undefined}
      >
        {/* ─── Narrative Summary (Sense 7) ─── */}
        <p className="fac-detail__narrative">
          {narrative}
        </p>

        {/* ─── Hero Card ─── */}
        <section
          className="fac-detail__hero"
          data-status={facility.status}
          data-category={typeConfig?.category}
        >
          <div className="fac-detail__hero-top">
            <div className="fac-detail__hero-icon" data-category={typeConfig?.category}>
              <TypeIcon className="fac-detail__hero-icon-svg" />
            </div>

            <div className="fac-detail__hero-info">
              <div className="fac-detail__hero-head">
                <h2 className="fac-detail__hero-name">
                  {facility.name}
                </h2>
                {statusConfig && (
                  <span
                    className="fac-detail__hero-badge"
                    data-status={facility.status}
                  >
                    <span className="fac-detail__hero-badge-dot" />
                    {statusConfig.label}
                  </span>
                )}
              </div>

              {facility.description && (
                <p className="fac-detail__hero-desc">
                  {facility.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick stats (Sense 2: hover micro-movement) */}
          <div className="fac-detail__stats">
            <div className="fac-detail__stat">
              <Clock className="fac-detail__stat-icon" />
              <div>
                <p className="fac-detail__stat-label">Horario</p>
                <p className="fac-detail__stat-value">
                  {facility.opening_time} — {facility.closing_time}
                </p>
              </div>
            </div>

            <div className="fac-detail__stat">
              <Users className="fac-detail__stat-icon" />
              <div>
                <p className="fac-detail__stat-label">Capacidad</p>
                <p className="fac-detail__stat-value">
                  {facility.capacity} personas
                </p>
              </div>
            </div>

            {facility.base_rate > 0 && (
              <div className="fac-detail__stat">
                <DollarSign className="fac-detail__stat-icon" />
                <div>
                  <p className="fac-detail__stat-label">Tarifa base</p>
                  <p className="fac-detail__stat-value">
                    {formatCRC(facility.base_rate)}
                  </p>
                </div>
              </div>
            )}

            <div className="fac-detail__stat">
              {avgUtilization >= 50 ? (
                <TrendingUp className="fac-detail__stat-icon" />
              ) : (
                <TrendingDown className="fac-detail__stat-icon" />
              )}
              <div>
                <p className="fac-detail__stat-label">Utilización</p>
                <p className="fac-detail__stat-value" data-status={healthToStatus(avgUtilization)}>
                  {formatPercent(avgUtilization, 0)}
                </p>
              </div>
            </div>

            {/* Sense 3: Critical maintenance count */}
            {criticalMaintenance > 0 && (
              <div className="fac-detail__stat fac-detail__stat--alert">
                <AlertTriangle className="fac-detail__stat-icon" />
                <div>
                  <p className="fac-detail__stat-label">Alertas</p>
                  <p className="fac-detail__stat-value">
                    {criticalMaintenance} urgente{criticalMaintenance > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Amenities */}
          {facility.amenities && facility.amenities.length > 0 && (
            <div className="fac-detail__amenities">
              {facility.amenities.map((a) => (
                <span key={a} className="fac-detail__amenity">
                  {a}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ─── Intelligence Panel (Sense 3: MEMORIA) ─── */}
        <IntelligencePanel
          facilityId={id ?? ""}
          comfortScore={comfortScore}
          deterioration={deterioration}
          ambientMode={ambientMode}
        />

        {/* ─── Content Grid ─── */}
        <div className="fac-detail__grid">
          <UtilizationChart
            data={utilization_history}
            prefersReduced={rm}
          />
          <UpcomingReservations
            reservations={upcoming_reservations}
            prefersReduced={rm}
          />
        </div>

        {/* ─── Maintenance ─── */}
        <MaintenanceLog
          records={maintenance_log}
          prefersReduced={rm}
        />
      </div>
    </PageContainer>
  );
}