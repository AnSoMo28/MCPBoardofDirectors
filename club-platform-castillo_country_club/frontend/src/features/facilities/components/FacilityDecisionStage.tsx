// src/features/facilities/components/FacilityDecisionStage.tsx
// ═══════════════════════════════════════════════════════════════
// FACILITY DECISION STAGE — "The Five Acts"
//
// 5 thematic tabs organizing all intelligence into decision layers:
//   El Espacio  — Spatial graph + personality
//   El Pulso    — Occupancy + comfort
//   El Futuro   — Predictive maintenance
//   El Negocio  — Revenue + what-if
//   La Memoria  — Stories + memory + resonance
//
// MERGED: Their accessibility + Our living protocol.
// Keyboard nav (roving tabindex) + ARIA tablist + SVG icons
// + breathing indicator + hover micro-movement + entry animation
// + combined urgency logic (count × mode).
//
// Living Component Protocol (5/7):
//   ✅ SENSE 1: RESPIRACIÓN — active indicator breathes
//   ✅ SENSE 2: REACCIÓN — tab hover translateY(-1px)
//   ✅ SENSE 5: SINIESTRÍA — badge urgency = count × mode
//   ✅ SENSE 6: EMPATÍA — data-mode responsive + accent propagation
//   ✅ SENSE 7: NARRATIVA — tab descriptions + total context
// ═══════════════════════════════════════════════════════════════

import { useCallback, useMemo } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import type { FacilitiesDashboardMode } from "../types";
import "./FacilityDecisionStage.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type StageMode =
  | "space"
  | "pulse"
  | "future"
  | "business"
  | "memory";

// ═══════════════════════════════════════════════════════════════
// TAB DEFINITIONS
//
// SVG icons from their version (professional, scalable).
// urgentModes + description merged from both.
// ═══════════════════════════════════════════════════════════════

interface StageTabDef {
  id: StageMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** Which dashboard modes amplify this tab's badge urgency. */
  urgentModes: FacilitiesDashboardMode[];
}

const TABS: StageTabDef[] = [
  {
    id: "space",
    label: "El Espacio",
    description: "Grafo espacial, personalidades, confort",
    urgentModes: ["alert", "critical"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
        <path d="m4.93 4.93 2.83 2.83m8.48 8.48 2.83 2.83m-2.83-14.14 2.83-2.83M4.93 19.07l2.83-2.83" />
      </svg>
    ),
  },
  {
    id: "pulse",
    label: "El Pulso",
    description: "Ocupación en vivo, comfort scores",
    urgentModes: ["critical"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: "future",
    label: "El Futuro",
    description: "Deterioro, mantenimiento, predicciones",
    urgentModes: ["alert", "critical"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    id: "business",
    label: "El Negocio",
    description: "Revenue, what-if, optimización",
    urgentModes: ["alert"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "memory",
    label: "La Memoria",
    description: "Historia, narrativas, resonancia temporal",
    urgentModes: [],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
];

// ═══════════════════════════════════════════════════════════════
// URGENCY LOGIC — Combines count magnitude × dashboard mode
//
// This is the KEY merge: their mode-awareness + our count-based.
//
// In critical mode: count ≥ 1 → high, count ≥ 1 → high
// In alert mode:    count ≥ 3 → high, count ≥ 1 → medium
// In calm mode:     count ≥ 5 → high, count ≥ 3 → medium, else low
// ═══════════════════════════════════════════════════════════════

function computeBadgeUrgency(
  count: number,
  isUrgentTab: boolean,
  mode: FacilitiesDashboardMode,
): "high" | "medium" | "low" | "none" {
  if (count === 0) return "none";

  // Critical mode: everything is urgent
  if (mode === "critical") {
    return count >= 3 ? "high" : "high"; // any count in critical = high
  }

  // Alert mode on an urgent tab
  if (mode === "alert" && isUrgentTab) {
    return count >= 3 ? "high" : "medium";
  }

  // Alert mode on non-urgent tab, or calm mode
  if (count >= 5) return "high";
  if (count >= 3) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface FacilityDecisionStageProps {
  activeTab: StageMode;
  onTabChange: (tab: StageMode) => void;
  children: Record<StageMode, React.ReactNode>;
  insightCounts?: Partial<Record<StageMode, number>>;
  ambientMode?: FacilitiesDashboardMode;
  accentColor?: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function FacilityDecisionStage({
  activeTab,
  onTabChange,
  children,
  insightCounts,
  ambientMode = "calm",
  accentColor,
}: FacilityDecisionStageProps) {
  const prefersReduced = useReducedMotion();

  // ── Total insights for context ──
  const totalInsights = useMemo(
    () =>
      Object.values(insightCounts ?? {}).reduce(
        (sum, count) => sum + (count ?? 0),
        0,
      ),
    [insightCounts],
  );

  // ── Active tab description ──
  const activeDescription = useMemo(
    () => TABS.find((t) => t.id === activeTab)?.description ?? "",
    [activeTab],
  );

  // ── Keyboard navigation (their version — critical for production) ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      if (currentIndex < 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = TABS[(currentIndex + 1) % TABS.length];
        onTabChange(next.id);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = TABS[(currentIndex - 1 + TABS.length) % TABS.length];
        onTabChange(prev.id);
      }
    },
    [activeTab, onTabChange],
  );

  return (
    <div
      className="glass-fac-stage"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
      style={
        accentColor
          ? ({ "--fac-stage-accent": accentColor } as React.CSSProperties)
          : undefined
      }
    >
      {/* ═══ TAB BAR ═══ */}
      <div
        className="glass-fac-stage__tabs"
        role="tablist"
        aria-label="Facility intelligence modes"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const count = insightCounts?.[tab.id] ?? 0;
          const isUrgent = tab.urgentModes.includes(ambientMode);
          const badgeUrgency = computeBadgeUrgency(count, isUrgent, ambientMode);

          return (
            <Button
              variant="unstyled"
              key={tab.id}
              className="glass-fac-stage__tab"
              role="tab"
              aria-selected={isActive}
              aria-controls={`glass-fac-stage-panel-${tab.id}`}
              id={`glass-fac-stage-tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              title={tab.description}
              data-active={isActive}
              data-urgency={badgeUrgency}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="glass-fac-stage__tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="glass-fac-stage__tab-label">{tab.label}</span>

              {/* Badge with combined urgency */}
              {count > 0 && (
                <span
                  className="glass-fac-stage__tab-badge"
                  data-urgency={badgeUrgency}
                  aria-label={`${count} insights`}
                >
                  {count}
                </span>
              )}

              {/* Novelty indicator: urgent tab with 0 active insights */}
              {isUrgent && count === 0 && (
                <span
                  className="glass-fac-stage__tab-indicator"
                  aria-hidden="true"
                />
              )}
            </Button>
          );
        })}
      </div>

      {/* ═══ DESCRIPTION BAR (Sense 7: NARRATIVA) ═══ */}
      <div className="glass-fac-stage__description">
        {activeDescription}
        {totalInsights > 0 && (
          <span className="glass-fac-stage__description-count">
            {" "}&middot; {totalInsights} insight{totalInsights !== 1 ? "s" : ""} activo{totalInsights !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      <div className="glass-fac-stage__content">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={`glass-fac-stage-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`glass-fac-stage-tab-${tab.id}`}
            className="glass-fac-stage__content-panel"
            hidden={tab.id !== activeTab}
          >
            {tab.id === activeTab && (
              <div className="glass-fac-stage__content-inner">
                {children[tab.id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}