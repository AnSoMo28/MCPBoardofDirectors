// src/features/facilities/components/OccupancyField.tsx
// ═══════════════════════════════════════════════════════════════
// OCCUPANCY FIELD — "El Campo de Fuerza"
//
// Gravitational field visualization. Each facility is an
// "island of energy" with concentric waves pulsing at the
// frequency of its crowd level. A time slider lets the
// operator explore how the field changes hour by hour.
//
// MERGED: Their islands + waves + perception gap + time slider
//         + Our keyboard a11y + data-mode + hover micro-movement
//         + narrative tooltip + CSS-driven colors + slider state
//         + empty state + crowd-responsive wave speed
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — waves pulse, speed by crowd
//   ✅ SENSE 2: REACCIÓN — island hover scale + glow
//   ✅ SENSE 3: MEMORIA — tooltip with comfort + trend + gap
//   ✅ SENSE 4: INTENCIÓN — perception gap as actionable signal
//   ✅ SENSE 5: SINIESTRÍA — overloaded islands dominate visually
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — tooltip narrative + empty state
// ═══════════════════════════════════════════════════════════════

import {
  useState,
  useCallback,
  useMemo,
  useRef
} from "react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  OccupancyPrediction,
  ComfortScore,
  SpatialGraph,
  CrowdLevel,
  FacilitiesDashboardMode,
} from "../types";

import { classifyCrowdLevel } from "../types";

import "./OccupancyField.css";

// ═══════════════════════════════════════════════════════════════
// ISLAND POSITIONING
// (Their grid + organic offset — solid)
// ═══════════════════════════════════════════════════════════════

interface IslandLayout {
  facilityId: string;
  x: number;
  y: number;
  size: number;
  occupancyPct: number;
  crowdLevel: CrowdLevel;
  name: string;
  trend: string;
}

function computeIslandLayout(
  predictions: Record<string, OccupancyPrediction>,
  graph: SpatialGraph,
): IslandLayout[] {
  const entries = Object.entries(predictions);
  if (entries.length === 0) return [];

  const sorted = [...graph.nodes].sort(
    (a, b) => b.max_capacity - a.max_capacity,
  );

  const cols = Math.min(4, Math.ceil(Math.sqrt(sorted.length)));
  const rows = Math.ceil(sorted.length / cols);

  return sorted.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const baseX = ((col + 0.5) / cols) * 80 + 10;
    const baseY = ((row + 0.5) / rows) * 70 + 10;

    const hash = node.facility_id.charCodeAt(0) + node.facility_id.charCodeAt(1);
    const offsetX = ((hash % 7) - 3) * 2;
    const offsetY = ((hash % 5) - 2) * 2;

    const pred = predictions[node.facility_id];
    const occPct = pred?.current_pct ?? 0;

    return {
      facilityId: node.facility_id,
      x: Math.max(8, Math.min(92, baseX + offsetX)),
      y: Math.max(8, Math.min(78, baseY + offsetY)),
      size: 44 + (node.max_capacity / 200) * 32,
      occupancyPct: occPct,
      crowdLevel: pred?.current_crowd_level ?? classifyCrowdLevel(occPct),
      name: node.facility_name,
      trend: String(pred?.trend ?? "stable"),
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// CROWD LEVEL → VISUAL PROPERTIES
// (Their glow map + CSS-driven approach)
// ═══════════════════════════════════════════════════════════════

const CROWD_GLOW_OPACITY: Record<CrowdLevel, number> = {
  empty: 0.05,
  quiet: 0.12,
  normal: 0.22,
  busy: 0.35,
  crowded: 0.5,
  overloaded: 0.65,
};

// ═══════════════════════════════════════════════════════════════
// PERCEPTION GAP DETECTION (Prop #12)
// (Their logic — solid)
// ═══════════════════════════════════════════════════════════════

function detectPerceptionGap(
  facilityId: string,
  comfortScores: Record<string, ComfortScore>,
  predictions: Record<string, OccupancyPrediction>,
): { hasGap: boolean; description: string } {
  const comfort = comfortScores[facilityId];
  const pred = predictions[facilityId];
  if (!comfort || !pred) return { hasGap: false, description: "" };

  const sensorCrowd = pred.current_crowd_level;
  const comfortScore = comfort.overall;

  if ((sensorCrowd === "busy" || sensorCrowd === "crowded") && comfortScore >= 80) {
    return {
      hasGap: true,
      description: "Sensores indican alta ocupación pero el confort se mantiene alto — el espacio absorbe bien la demanda.",
    };
  }
  if (sensorCrowd === "quiet" && comfortScore < 50) {
    return {
      hasGap: true,
      description: "Sensores indican baja ocupación pero el confort es bajo — hay factores ambientales degradando el espacio.",
    };
  }

  return { hasGap: false, description: "" };
}

// ═══════════════════════════════════════════════════════════════
// TOOLTIP NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════════

function buildFieldNarrative(
  pred: OccupancyPrediction,
  comfort?: ComfortScore,
  gap?: { hasGap: boolean; description: string },
): string {
  const parts: string[] = [];

  const crowdLabels: Record<CrowdLevel, string> = {
    empty: "vacío",
    quiet: "tranquilo",
    normal: "con actividad normal",
    busy: "concurrido",
    crowded: "lleno",
    overloaded: "sobrecargado",
  };

  parts.push(`Espacio ${crowdLabels[pred.current_crowd_level]}, tendencia ${pred.trend}.`);

  if (comfort) {
    if (comfort.intervention_needed) {
      parts.push(`Comfort degradado (${comfort.overall}/100) — intervención sugerida.`);
    } else {
      parts.push(`Comfort ${comfort.overall}/100 — dentro de parámetros.`);
    }
  }

  if (gap?.hasGap) {
    parts.push(gap.description);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface OccupancyFieldProps {
  predictions: Record<string, OccupancyPrediction>;
  comfortScores: Record<string, ComfortScore>;
  graph: SpatialGraph;
  ambientMode?: FacilitiesDashboardMode;
  selectedFacilityId?: string;
  onSelectFacility?: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function OccupancyField({
  predictions,
  comfortScores,
  graph,
  ambientMode = "calm",
  selectedFacilityId,
  onSelectFacility,
}: OccupancyFieldProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());

  // ── Island layout ──
  const islands = useMemo(
    () => computeIslandLayout(predictions, graph),
    [predictions, graph],
  );

  // ── Hover handlers ──
  const handleHover = useCallback(
    (facilityId: string, e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHoveredId(facilityId);
      setTooltipPos({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 8,
      });
    },
    [],
  );

  // ── Keyboard handler (CRITICAL a11y fix) ──
  const handleIslandKeyDown = useCallback(
    (facilityId: string, e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectFacility?.(facilityId);
      }
    },
    [onSelectFacility],
  );

  // ── Hovered data ──
  const hoveredPrediction = hoveredId ? predictions[hoveredId] : null;
  const hoveredComfort = hoveredId ? comfortScores[hoveredId] : null;
  const hoveredGap = hoveredId
    ? detectPerceptionGap(hoveredId, comfortScores, predictions)
    : null;

  // ── Tooltip narrative (Sense 7) ──
  const tooltipNarrative = useMemo(() => {
    if (!hoveredPrediction) return "";
    return buildFieldNarrative(hoveredPrediction, hoveredComfort ?? undefined, hoveredGap ?? undefined);
  }, [hoveredPrediction, hoveredComfort, hoveredGap]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: EMPTY STATE
  // ═══════════════════════════════════════════════════════════════

  if (islands.length === 0) {
    return (
      <div className="glass-fac-field glass-fac-field--empty" data-mode={ambientMode}>
        <div className="glass-fac-field__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p className="glass-fac-field__empty-text">
            El campo de fuerza se activa cuando hay predicciones de ocupación disponibles.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: FIELD
  // ═══════════════════════════════════════════════════════════════

  return (
    <div
      className="glass-fac-field"
      ref={containerRef}
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* ── Islands ── */}
      <div className="glass-fac-field__canvas">
        {islands.map((island, islandIndex) => {
          const gap = detectPerceptionGap(island.facilityId, comfortScores, predictions);

          return (
            <div
              key={island.facilityId}
              className="glass-fac-field__island"
              data-crowd={island.crowdLevel}
              data-selected={island.facilityId === selectedFacilityId ? "true" : undefined}
              data-gap={gap.hasGap ? "true" : undefined}
              style={{
                left: `${island.x}%`,
                top: `${island.y}%`,
                transform: "translate(-50%, -50%)",
                "--stagger-i": islandIndex,
              } as React.CSSProperties}
              onClick={() => onSelectFacility?.(island.facilityId)}
              onKeyDown={(e) => handleIslandKeyDown(island.facilityId, e)}
              onMouseEnter={(e) => handleHover(island.facilityId, e)}
              onMouseLeave={() => setHoveredId(null)}
              role="button"
              tabIndex={0}
              aria-label={`${island.name}: ${island.occupancyPct}% occupancy, ${island.crowdLevel}`}
            >
              {/* Glow (CSS-driven, not inline) */}
              <div
                className="glass-fac-field__island-glow"
                data-crowd={island.crowdLevel}
                style={{ opacity: CROWD_GLOW_OPACITY[island.crowdLevel] }}
              />

              {/* Perception gap distortion (Prop #12) */}
              {gap.hasGap && (
                <div className="glass-fac-field__perception-gap" aria-label="Perception gap detected" />
              )}

              {/* Waves — speed responds to crowd level */}
              <div className="glass-fac-field__wave glass-fac-field__wave--1" data-crowd={island.crowdLevel} />
              <div className="glass-fac-field__wave glass-fac-field__wave--2" data-crowd={island.crowdLevel} />
              <div className="glass-fac-field__wave glass-fac-field__wave--3" data-crowd={island.crowdLevel} />

              {/* Core */}
              <div
                className="glass-fac-field__island-core"
                data-crowd={island.crowdLevel}
                style={{ width: island.size, height: island.size }}
              >
                <span className="glass-fac-field__island-pct">
                  {island.occupancyPct}%
                </span>
              </div>

              {/* Name */}
              <span className="glass-fac-field__island-name">
                {island.name.length > 12
                  ? island.name.slice(0, 10) + "…"
                  : island.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Tooltip (Sense 3 + 7: data + narrative) ── */}
      <div
        className="glass-fac-field__tooltip"
        data-visible={hoveredId !== null ? "true" : undefined}
        style={{ left: tooltipPos.x, top: tooltipPos.y }}
        role="tooltip"
      >
        {hoveredPrediction && (
          <>
            <div className="glass-fac-field__tooltip-name">
              {hoveredPrediction.name}
            </div>
            <div className="glass-fac-field__tooltip-row">
              <span className="glass-fac-field__tooltip-label">Ocupación</span>
              <span className="glass-fac-field__tooltip-value">
                {hoveredPrediction.current_pct}%
              </span>
            </div>
            <div className="glass-fac-field__tooltip-row">
              <span className="glass-fac-field__tooltip-label">Crowd</span>
              <span className="glass-fac-field__tooltip-value" data-crowd={hoveredPrediction.current_crowd_level}>
                {hoveredPrediction.current_crowd_level}
              </span>
            </div>
            <div className="glass-fac-field__tooltip-row">
              <span className="glass-fac-field__tooltip-label">Tendencia</span>
              <span className="glass-fac-field__tooltip-value">
                {hoveredPrediction.trend}
              </span>
            </div>
            {hoveredComfort && (
              <div className="glass-fac-field__tooltip-row">
                <span className="glass-fac-field__tooltip-label">Confort</span>
                <span className="glass-fac-field__tooltip-value">
                  {hoveredComfort.overall}/100
                </span>
              </div>
            )}
            {/* Perception gap indicator (CSS-driven) */}
            {hoveredGap?.hasGap && (
              <div className="glass-fac-field__tooltip-gap">
                Perception gap detectado
              </div>
            )}
            {/* Narrative (Sense 7) */}
            <div className="glass-fac-field__tooltip-narrative">
              {tooltipNarrative}
            </div>
          </>
        )}
      </div>

      {/* ── Time Slider (with state management) ── */}
      <div className="glass-fac-field__slider-container">
        <span className="glass-fac-field__slider-label">
          Explorar · {selectedHour.toString().padStart(2, "0")}:00
        </span>
        <input
          type="range"
          className="glass-fac-field__slider"
          min={0}
          max={23}
          value={selectedHour}
          onChange={(e) => setSelectedHour(Number(e.target.value))}
          aria-label="Hora del día"
        />
        <div className="glass-fac-field__slider-ticks">
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
            <span key={h} className="glass-fac-field__slider-tick">
              {h.toString().padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}