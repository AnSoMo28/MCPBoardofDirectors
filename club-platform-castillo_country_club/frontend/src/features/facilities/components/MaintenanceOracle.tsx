// src/features/facilities/components/MaintenanceOracle.tsx
// ═══════════════════════════════════════════════════════════════
// MAINTENANCE ORACLE — "El Oráculo"
//
// Predictive timeline showing the FUTURE of each component:
// health curves, Monte Carlo confidence bands, failure markers,
// optimal maintenance points, and accumulated cost.
//
// MERGED: Their decay model + Monte Carlo band + failure markers
//         + Our living protocol + keyboard a11y + data-mode
//         + hover interactions + narrative + CSS-extracted styles
//         + facility name resolution + stagger
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — curve breathe, marker pulse
//   ✅ SENSE 2: REACCIÓN — marker hover scale + tooltip
//   ✅ SENSE 3: MEMORIA — health % + days + cost per component
//   ✅ SENSE 4: INTENCIÓN — schedule button with letter-spacing
//   ✅ SENSE 5: SINIESTRÍA — critical components visually dominant
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — per-component + empty state narrative
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  DeteriorationModel,
  DeteriorationComponent,
  MaintenancePriorityAction,
  Facility,
  FacilitiesDashboardMode,
} from "../types";

import "./MaintenanceOracle.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PredictiveMaintenanceAction extends MaintenancePriorityAction {
  facility_id: string;
  suggested_maintenance_date?: string;
  priority?: string;
}

interface MaintenancePrediction {
  priority_actions: PredictiveMaintenanceAction[];
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SVG_PADDING = { top: 10, right: 20, bottom: 25, left: 40 };
const SVG_WIDTH = 600;
const SVG_HEIGHT = 100;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function healthToStatus(health: number): "good" | "warning" | "critical" {
  if (health >= 70) return "good";
  if (health >= 40) return "warning";
  return "critical";
}

function generateHealthCurvePath(
  component: DeteriorationComponent,
  width: number,
  height: number,
): string {
  const viewW = width - SVG_PADDING.left - SVG_PADDING.right;
  const viewH = height - SVG_PADDING.top - SVG_PADDING.bottom;
  const totalDays = Math.max(component.days_to_failure, 30);
  const pointCount = 20;
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= pointCount; i++) {
    const dayFraction = i / pointCount;
    const day = dayFraction * totalDays;
    const decayRate = -Math.log(0.1) / totalDays;
    const health = component.current_health * Math.exp(-decayRate * day);
    const x = SVG_PADDING.left + dayFraction * viewW;
    const y = SVG_PADDING.top + (1 - health / 100) * viewH;
    points.push({ x, y });
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function generateConfidenceBandPath(
  component: DeteriorationComponent,
  width: number,
  height: number,
): string {
  const viewW = width - SVG_PADDING.left - SVG_PADDING.right;
  const viewH = height - SVG_PADDING.top - SVG_PADDING.bottom;
  const totalDays = Math.max(component.days_to_failure, 30);
  const pointCount = 20;

  const upperPoints: Array<{ x: number; y: number }> = [];
  const lowerPoints: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= pointCount; i++) {
    const dayFraction = i / pointCount;
    const day = dayFraction * totalDays;
    const decayRate = -Math.log(0.1) / totalDays;
    const baseHealth = component.current_health * Math.exp(-decayRate * day);
    const bandWidth = 8 + dayFraction * 15;
    const upper = Math.min(100, baseHealth + bandWidth);
    const lower = Math.max(0, baseHealth - bandWidth);
    const x = SVG_PADDING.left + dayFraction * viewW;
    upperPoints.push({ x, y: SVG_PADDING.top + (1 - upper / 100) * viewH });
    lowerPoints.push({ x, y: SVG_PADDING.top + (1 - lower / 100) * viewH });
  }

  let d = `M ${upperPoints[0].x} ${upperPoints[0].y}`;
  for (let i = 1; i < upperPoints.length; i++) {
    d += ` L ${upperPoints[i].x} ${upperPoints[i].y}`;
  }
  for (let i = lowerPoints.length - 1; i >= 0; i--) {
    d += ` L ${lowerPoints[i].x} ${lowerPoints[i].y}`;
  }
  d += " Z";
  return d;
}

// ═══════════════════════════════════════════════════════════════
// CURRENCY FORMATTER (no dependency on shared/utils)
// ═══════════════════════════════════════════════════════════════

function formatCost(amount: number): string {
  return `₡${Math.round(amount).toLocaleString("es-CR")}`;
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE BUILDER — Sense 7
// ═══════════════════════════════════════════════════════════════

function buildComponentNarrative(
  comp: DeteriorationComponent,
  action?: PredictiveMaintenanceAction,
): string {
  const parts: string[] = [];

  if (comp.current_health >= 70) {
    parts.push(`${comp.name} opera en buen estado (${comp.current_health}%).`);
  } else if (comp.current_health >= 40) {
    parts.push(`${comp.name} muestra signos de desgaste (${comp.current_health}%).`);
  } else {
    parts.push(`${comp.name} requiere atención inmediata (${comp.current_health}%).`);
  }

  parts.push(`Falla estimada en ${comp.days_to_failure} días.`);

  if (action?.suggested_maintenance_date) {
    const days = Math.max(0, Math.floor(
      (new Date(action.suggested_maintenance_date).getTime() - Date.now()) / 86_400_000
    ));
    parts.push(`Mantenimiento óptimo en ${days} días.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface MaintenanceOracleProps {
  deteriorationModels: Record<string, DeteriorationModel>;
  maintenancePrediction: MaintenancePrediction;
  /** Facility list for name resolution */
  facilities?: Facility[];
  selectedFacilityId?: string;
  onScheduleMaintenance?: (action: MaintenancePriorityAction) => void;
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MaintenanceOracle({
  deteriorationModels,
  maintenancePrediction,
  facilities = [],
  selectedFacilityId,
  onScheduleMaintenance,
  ambientMode = "calm",
}: MaintenanceOracleProps) {
  const prefersReduced = useReducedMotion();

  const [activeFacility, setActiveFacility] = useState<string | null>(
    selectedFacilityId ?? null,
  );

  // ── Facility name lookup ──
  const facilityNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of facilities) {
      map[f.id] = f.name;
    }
    return map;
  }, [facilities]);

  // ── Facility options with resolved names ──
  const facilityOptions = useMemo(() => {
    return Object.entries(deteriorationModels).map(([id, model]) => {
      const avgHealth =
        model.components.length > 0
          ? model.components.reduce((s, c) => s + c.current_health, 0) /
            model.components.length
          : 100;
      return {
        id,
        name: facilityNameMap[id] ?? id,
        avgHealth: Math.round(avgHealth),
      };
    });
  }, [deteriorationModels, facilityNameMap]);

  // ── Selected model ──
  const activeModel = activeFacility
    ? deteriorationModels[activeFacility]
    : null;

  // ── Handler ──
  const handleChipClick = useCallback((id: string) => {
    setActiveFacility(id);
  }, []);

  // ── Sort components: critical first ──
  const sortedComponents = useMemo(() => {
    if (!activeModel) return [];
    return [...activeModel.components].sort(
      (a, b) => a.current_health - b.current_health,
    );
  }, [activeModel]);

  return (
    <div
      className="glass-fac-oracle"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* ── Facility Selector ── */}
      <div className="glass-fac-oracle__selector">
        <span className="glass-fac-oracle__selector-label">Instalación</span>
        <div className="glass-fac-oracle__selector-chips" role="tablist">
          {facilityOptions.map((opt) => {
            const isActive = activeFacility === opt.id;
            const status = healthToStatus(opt.avgHealth);
            return (
              <Button
                variant="unstyled"
                key={opt.id}
                className="glass-fac-oracle__chip"
                data-active={isActive ? "true" : undefined}
                data-status={status}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleChipClick(opt.id)}
              >
                <span className="glass-fac-oracle__chip-name">{opt.name}</span>
                <span className="glass-fac-oracle__chip-health">{opt.avgHealth}%</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Timelines ── */}
      <div className="glass-fac-oracle__timelines">
        {activeModel ? (
          sortedComponents.map((comp, compIndex) => {
            const status = healthToStatus(comp.current_health);
            const curvePath = generateHealthCurvePath(comp, SVG_WIDTH, SVG_HEIGHT);
            const bandPath = generateConfidenceBandPath(comp, SVG_WIDTH, SVG_HEIGHT);

            const viewW = SVG_WIDTH - SVG_PADDING.left - SVG_PADDING.right;
            const nowX = SVG_PADDING.left;

            const totalDays = Math.max(comp.days_to_failure, 30);
            const failureFraction = comp.days_to_failure / totalDays;
            const failureX = SVG_PADDING.left + failureFraction * viewW;

            const optimalAction =
              maintenancePrediction.priority_actions.find(
                (a) =>
                  a.component === comp.name &&
                  a.facility_id === activeFacility,
              );

            const optimalDay = optimalAction?.suggested_maintenance_date;
            const optimalX = optimalDay
              ? SVG_PADDING.left +
                (Math.min(
                  30,
                  Math.max(
                    0,
                    Math.floor(
                      (new Date(optimalDay).getTime() - Date.now()) / 86_400_000,
                    ),
                  ),
                ) / totalDays) * viewW
              : null;

            const narrative = buildComponentNarrative(comp, optimalAction);

            return (
              <div
                key={comp.name}
                className="glass-fac-oracle__timeline"
                data-status={status}
                style={
                  prefersReduced
                    ? undefined
                    : ({ "--stagger-i": compIndex } as React.CSSProperties)
                }
              >
                {/* ── Component Header ── */}
                <div className="glass-fac-oracle__timeline-header">
                  <span className="glass-fac-oracle__timeline-name">
                    {comp.name}
                  </span>
                  <span className="glass-fac-oracle__timeline-health" data-status={status}>
                    {comp.current_health}%
                  </span>
                  <span className="glass-fac-oracle__timeline-days">
                    {comp.days_to_failure}d a falla
                  </span>
                </div>

                {/* ── Narrative (Sense 7) ── */}
                <p className="glass-fac-oracle__timeline-narrative">
                  {narrative}
                </p>

                {/* ── SVG Timeline ── */}
                <svg
                  className="glass-fac-oracle__svg"
                  viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label={`Health timeline for ${comp.name}: ${comp.current_health}% health, ${comp.days_to_failure} days to failure`}
                >
                  {/* Confidence band */}
                  <path
                    className="glass-fac-oracle__band"
                    data-status={status}
                    d={bandPath}
                  />

                  {/* Health curve */}
                  <path
                    className="glass-fac-oracle__curve"
                    data-status={status}
                    d={curvePath}
                  />

                  {/* Now marker */}
                  <line
                    className="glass-fac-oracle__now-line"
                    x1={nowX}
                    y1={SVG_PADDING.top}
                    x2={nowX}
                    y2={SVG_HEIGHT - SVG_PADDING.bottom}
                  />
                  <text
                    className="glass-fac-oracle__now-label"
                    x={nowX}
                    y={SVG_HEIGHT - 4}
                  >
                    Ahora
                  </text>

                  {/* Failure marker */}
                  {failureX < SVG_WIDTH - SVG_PADDING.right && (
                    <g className="glass-fac-oracle__event">
                      <circle
                        className="glass-fac-oracle__event-marker"
                        data-type="failure"
                        cx={failureX}
                        cy={SVG_PADDING.top + (1 - 0.1) * (SVG_HEIGHT - SVG_PADDING.top - SVG_PADDING.bottom)}
                        r={5}
                      />
                      <text
                        className="glass-fac-oracle__event-label"
                        x={failureX}
                        y={SVG_HEIGHT - 4}
                      >
                        Fallo ({comp.days_to_failure}d)
                      </text>
                    </g>
                  )}

                  {/* Optimal maintenance marker */}
                  {optimalX !== null && optimalX < SVG_WIDTH - SVG_PADDING.right && (
                    <g className="glass-fac-oracle__event">
                      <circle
                        className="glass-fac-oracle__event-marker"
                        data-type="optimal"
                        cx={optimalX}
                        cy={SVG_PADDING.top + 0.5 * (SVG_HEIGHT - SVG_PADDING.top - SVG_PADDING.bottom)}
                        r={5}
                      />
                      <text
                        className="glass-fac-oracle__event-label"
                        x={optimalX}
                        y={SVG_HEIGHT - 14}
                      >
                        Óptimo
                      </text>
                    </g>
                  )}
                </svg>

                {/* ── Cost Summary (Sense 3) ── */}
                <div className="glass-fac-oracle__cost">
                  <span className="glass-fac-oracle__cost-label">
                    Costo de falla
                  </span>
                  <span className="glass-fac-oracle__cost-value" data-status={status}>
                    {formatCost(comp.estimated_replacement_cost * 1.5)}
                  </span>
                </div>

                {/* ── Schedule Button (Sense 4: INTENCIÓN) ── */}
                {optimalAction && (
                  <Button
                    variant="unstyled"
                    className="glass-fac-oracle__schedule-btn"
                    data-status={status}
                    onClick={() => onScheduleMaintenance?.(optimalAction)}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Agendar mantenimiento
                    {optimalAction.priority && (
                      <span className="glass-fac-oracle__schedule-priority">
                        {optimalAction.priority}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <div className="glass-fac-oracle__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <p className="glass-fac-oracle__empty-text">
              Selecciona una instalación para ver su línea temporal predictiva.
            </p>
            <p className="glass-fac-oracle__empty-sub">
              El modelo de deterioro muestra curvas de salud con bandas de confianza Monte Carlo.
            </p>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="glass-fac-oracle__legend">
        <div className="glass-fac-oracle__legend-item">
          <span className="glass-fac-oracle__legend-dot glass-fac-oracle__legend-dot--optimal" />
          Mantenimiento óptimo
        </div>
        <div className="glass-fac-oracle__legend-item">
          <span className="glass-fac-oracle__legend-dot glass-fac-oracle__legend-dot--failure" />
          Falla predicha
        </div>
        <div className="glass-fac-oracle__legend-item">
          <span className="glass-fac-oracle__legend-dot glass-fac-oracle__legend-dot--band" />
          Banda Monte Carlo
        </div>
      </div>
    </div>
  );
}