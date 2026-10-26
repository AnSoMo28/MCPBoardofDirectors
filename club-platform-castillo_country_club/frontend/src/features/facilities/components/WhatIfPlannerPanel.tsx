// src/features/facilities/components/WhatIfPlannerPanel.tsx
// ═══════════════════════════════════════════════════════════════
// WHAT-IF PLANNER PANEL — "El Arquitecto"
//
// Auto-generated and custom what-if scenarios.
// Each scenario: Before/During/After snapshots, Monte Carlo
// band, cascade effects, mitigation plan, action buttons.
//
// MERGED: Their data model + Monte Carlo + cascade + mitigation
//         + Our living protocol + stagger + data-mode + hover
//         + narrative + extracted CSS + "Ver más" pagination
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — scenario entry stagger
//   ✅ SENSE 2: REACCIÓN — card hover translateY(-2px)
//   ✅ SENSE 3: MEMORIA — snapshot delta indicators
//   ✅ SENSE 4: INTENCIÓN — execute button letter-spacing
//   ✅ SENSE 5: SINIESTRÍA — auto-generated cards get priority visual
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — scenario summary + empty state
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  WhatIfScenario,
  Facility,
  SpatialGraph,
  RevenueModel,
  ComfortScore,
  FacilitiesDashboardMode,
} from "../types";

import "./WhatIfPlannerPanel.css";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_VISIBLE = 4;

// ═══════════════════════════════════════════════════════════════
// CURRENCY FORMATTER (no dependency on shared/utils)
// ═══════════════════════════════════════════════════════════════

function formatCost(amount: number): string {
  return `₡${Math.round(amount).toLocaleString("es-CR")}`;
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE BUILDER — Sense 7
// ═══════════════════════════════════════════════════════════════

function buildScenarioNarrative(scenario: WhatIfScenario): string {
  const mc = scenario.monte_carlo;
  const parts: string[] = [];

  parts.push(scenario.action.description);

  const delta = scenario.after.total_revenue_impact - scenario.before.total_revenue_impact;
  if (delta > 0) {
    parts.push(`Mejora estimada: +${formatCost(delta)}/mes.`);
  } else if (delta < 0) {
    parts.push(`Impacto temporal: ${formatCost(delta)}/mes durante implementación.`);
  }

  if (mc.confidence >= 80) {
    parts.push(`Alta confianza (${mc.confidence}%) en el resultado.`);
  } else {
    parts.push(`Confianza moderada (${mc.confidence}%) — resultado varía.`);
  }

  if (scenario.mitigation.expected_recovery_pct >= 80) {
    parts.push(`Recuperación esperada del ${scenario.mitigation.expected_recovery_pct}%.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════
// DELTA HELPER — Sense 3: MEMORIA
// ═══════════════════════════════════════════════════════════════

function computeDelta(
  before: number,
  after: number,
): { value: number; direction: "up" | "down" | "flat" } {
  const delta = after - before;
  return {
    value: Math.abs(delta),
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface WhatIfPlannerPanelProps {
  autoScenarios: WhatIfScenario[];
  facilities: Facility[];
  graph: SpatialGraph;
  revenueModels: Record<string, RevenueModel>;
  comfortScores: Record<string, ComfortScore>;
  ambientMode?: FacilitiesDashboardMode;
  onExecuteScenario?: (scenario: WhatIfScenario) => void;
  onDismissScenario?: (scenarioId: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function WhatIfPlannerPanel({
  autoScenarios,
  revenueModels,
  ambientMode = "calm",
  onExecuteScenario,
  onDismissScenario,
}: WhatIfPlannerPanelProps) {
  const prefersReduced = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE);

  const handleExecute = useCallback(
    (scenario: WhatIfScenario) => {
      onExecuteScenario?.(scenario);
    },
    [onExecuteScenario],
  );

  const handleDismiss = useCallback(
    (scenarioId: string) => {
      onDismissScenario?.(scenarioId);
    },
    [onDismissScenario],
  );

  const handleShowMore = useCallback(() => {
    setVisibleCount((c) => c + MAX_VISIBLE);
  }, []);

  // ── Sorted: auto-generated first, then by Monte Carlo P50 descending ──
  const sortedScenarios = useMemo(() => {
    return [...autoScenarios].sort((a, b) => {
      if (a.auto_generated !== b.auto_generated) {
        return a.auto_generated ? -1 : 1;
      }
      return b.monte_carlo.p50 - a.monte_carlo.p50;
    });
  }, [autoScenarios]);

  const visible = useMemo(
    () => sortedScenarios.slice(0, visibleCount),
    [sortedScenarios, visibleCount],
  );

  const hasMore = sortedScenarios.length > visibleCount;

  // ═══════════════════════════════════════════════════════════════
  // RENDER: EMPTY STATE
  // ═══════════════════════════════════════════════════════════════

  if (autoScenarios.length === 0) {
    return (
      <div className="glass-fac-whatif glass-fac-whatif--empty" data-mode={ambientMode}>
        <div className="glass-fac-whatif__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
          <p className="glass-fac-whatif__empty-text">
            Sin escenarios detectados. El sistema analiza continuamente
            y propone cuando detecta oportunidades.
          </p>
          <p className="glass-fac-whatif__empty-sub">
            {Object.keys(revenueModels).length} modelos de revenue monitoreados.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SCENARIOS
  // ═══════════════════════════════════════════════════════════════

  return (
    <div
      className="glass-fac-whatif"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {visible.map((scenario, scenarioIndex) => {
        const mc = scenario.monte_carlo;
        const impact = scenario.impact;
        const narrative = buildScenarioNarrative(scenario);

        // Monte Carlo bar positioning
        const rangeMin = Math.min(mc.p10, mc.p90);
        const rangeMax = Math.max(mc.p10, mc.p90);
        const totalRange = Math.max(rangeMax - rangeMin, 1);
        const barStart = ((mc.p25 - rangeMin) / totalRange) * 100;
        const barEnd = ((mc.p75 - rangeMin) / totalRange) * 100;
        const medianPos = ((mc.p50 - rangeMin) / totalRange) * 100;

        // Revenue delta (Sense 3)
        const revenueDelta = computeDelta(
          scenario.before.total_revenue_impact,
          scenario.after.total_revenue_impact,
        );

        return (
          <div
            key={scenario.id}
            className="glass-fac-whatif__scenario"
            data-auto={scenario.auto_generated ? "true" : undefined}
            style={
              prefersReduced
                ? undefined
                : ({ "--stagger-i": scenarioIndex } as React.CSSProperties)
            }
          >
            {/* Auto badge */}
            {scenario.auto_generated && (
              <div className="glass-fac-whatif__auto-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Auto-detectado
              </div>
            )}

            {/* Title */}
            <h4 className="glass-fac-whatif__title">
              {scenario.action.description}
            </h4>

            {/* Narrative (Sense 7) */}
            <p className="glass-fac-whatif__narrative">
              {narrative}
            </p>

            {/* Snapshots (Sense 3: MEMORIA with delta indicators) */}
            <div className="glass-fac-whatif__snapshots">
              <div className="glass-fac-whatif__snapshot glass-fac-whatif__snapshot--before">
                <div className="glass-fac-whatif__snapshot-label">Antes</div>
                <div className="glass-fac-whatif__snapshot-metric">
                  {formatCost(scenario.before.total_revenue_impact)}
                </div>
                <div className="glass-fac-whatif__snapshot-detail">
                  Revenue/mes · {scenario.before.avg_comfort} comfort
                </div>
              </div>

              <div className="glass-fac-whatif__snapshot glass-fac-whatif__snapshot--during">
                <div className="glass-fac-whatif__snapshot-label">Durante</div>
                <div className="glass-fac-whatif__snapshot-metric">
                  {formatCost(scenario.during.total_revenue_impact)}
                </div>
                <div className="glass-fac-whatif__snapshot-detail">
                  Revenue/mes · {scenario.during.avg_comfort} comfort
                </div>
              </div>

              <div className="glass-fac-whatif__snapshot glass-fac-whatif__snapshot--after">
                <div className="glass-fac-whatif__snapshot-label">Después</div>
                <div className="glass-fac-whatif__snapshot-metric">
                  {formatCost(scenario.after.total_revenue_impact)}
                </div>
                <div className="glass-fac-whatif__snapshot-detail">
                  Revenue/mes · {scenario.after.avg_comfort} comfort
                </div>
                {/* Delta indicator (Sense 3) */}
                {revenueDelta.direction !== "flat" && (
                  <div
                    className="glass-fac-whatif__snapshot-delta"
                    data-direction={revenueDelta.direction}
                  >
                    {revenueDelta.direction === "up" ? "↑" : "↓"}{" "}
                    {formatCost(revenueDelta.value)}
                  </div>
                )}
              </div>
            </div>

            {/* Monte Carlo */}
            <div className="glass-fac-whatif__monte-carlo">
              <div className="glass-fac-whatif__monte-carlo-title">
                Monte Carlo · {mc.iterations} iteraciones · {mc.confidence}% confianza
              </div>
              <div className="glass-fac-whatif__monte-carlo-bar">
                <div
                  className="glass-fac-whatif__monte-carlo-range"
                  style={{
                    left: `${barStart}%`,
                    width: `${barEnd - barStart}%`,
                  }}
                />
                <div
                  className="glass-fac-whatif__monte-carlo-median"
                  style={{ left: `${medianPos}%` }}
                />
              </div>
              <div className="glass-fac-whatif__monte-carlo-labels">
                <span className="glass-fac-whatif__monte-carlo-label">
                  P10: {formatCost(mc.p10)}
                </span>
                <span className="glass-fac-whatif__monte-carlo-label glass-fac-whatif__monte-carlo-label--median">
                  P50: {formatCost(mc.p50)}
                </span>
                <span className="glass-fac-whatif__monte-carlo-label">
                  P90: {formatCost(mc.p90)}
                </span>
              </div>
            </div>

            {/* Cascade Risks */}
            {impact.cascade_risks.length > 0 && (
              <div className="glass-fac-whatif__cascade">
                <div className="glass-fac-whatif__cascade-title">
                  Efectos cascada
                </div>
                {impact.cascade_risks.slice(0, 4).map((risk, i) => (
                  <div key={i} className="glass-fac-whatif__cascade-item">
                    <span
                      className="glass-fac-whatif__cascade-dot"
                      data-positive={risk.includes("+") ? "true" : undefined}
                    />
                    {risk}
                  </div>
                ))}
              </div>
            )}

            {/* Mitigation Plan */}
            {scenario.mitigation.actions.length > 0 && (
              <div className="glass-fac-whatif__mitigation">
                <div className="glass-fac-whatif__mitigation-title">
                  Plan de mitigación
                </div>
                {scenario.mitigation.actions.slice(0, 3).map((action, i) => (
                  <div key={i} className="glass-fac-whatif__mitigation-action">
                    {action.description}
                  </div>
                ))}
                <div className="glass-fac-whatif__mitigation-recovery">
                  Recuperación esperada: {scenario.mitigation.expected_recovery_pct}%
                </div>
              </div>
            )}

            {/* Action Buttons (Sense 4: INTENCIÓN) */}
            <div className="glass-fac-whatif__actions">
              {scenario.auto_generated && (
                <button
                  className="glass-fac-whatif__btn glass-fac-whatif__btn--execute"
                  onClick={() => handleExecute(scenario)}
                >
                  Ejecutar escenario
                </button>
              )}
              <button
                className="glass-fac-whatif__btn glass-fac-whatif__btn--dismiss"
                onClick={() => handleDismiss(scenario.id)}
              >
                Descartar
              </button>
            </div>
          </div>
        );
      })}

      {/* "Ver más" pagination */}
      {hasMore && (
        <button
          className="glass-fac-whatif__more"
          onClick={handleShowMore}
        >
          Ver más ({sortedScenarios.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
}