// src/features/facilities/components/SpatialStoryView.tsx
// ═══════════════════════════════════════════════════════════════
// SPATIAL STORY VIEW — "La Crónica"
//
// 24-frame playback of the club's day. Each frame shows:
//   - Simplified graph state (nodes with occupancy %)
//   - Narrative text
//   - Energy level bar
//   - Ripple effects + resonance patterns
//
// MERGED: Their playback engine + speed + timeline + ripples
//         + Our living protocol + resonance rendering + data-mode
//         + stagger + hover + CSS extraction + empty state narrative
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — energy bars breathe, frame transition
//   ✅ SENSE 2: REACCIÓN — timeline bar hover + node hover
//   ✅ SENSE 3: MEMORIA — energy % + ripple severity + resonance
//   ✅ SENSE 4: INTENCIÓN — Play/Pause + speed toggle
//   ✅ SENSE 5: SINIESTRÍA — high-energy frames dominant, ripples colored
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — frame narrative + resonance narrative + empty
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  TemporalGraphFrame,
  EventRipple,
  ResonancePattern,
  FacilitiesDashboardMode,
} from "../types";

import "./SpatialStoryView.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SPEED_OPTIONS = [1, 2, 4];
const BASE_FRAME_MS = 2000;

// ═══════════════════════════════════════════════════════════════
// ENERGY COLOR — CSS-driven (no inline style)
// ═══════════════════════════════════════════════════════════════

function getEnergyDataLevel(level: number): "high" | "medium" | "low" {
  if (level >= 70) return "high";
  if (level >= 40) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════════
// RESONANCE NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface SpatialStoryViewProps {
  frames: TemporalGraphFrame[];
  ripples: EventRipple[];
  resonancePatterns: ResonancePattern[];
  autoPlay?: boolean;
  ambientMode?: FacilitiesDashboardMode;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SpatialStoryView({
  frames,
  ripples,
  resonancePatterns,
  autoPlay = false,
  ambientMode = "calm",
}: SpatialStoryViewProps) {
  const prefersReduced = useReducedMotion();

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay && !prefersReduced);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Current frame data
  const frame = frames[currentFrame] ?? null;

  // ── Playback loop ──
  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const intervalMs = BASE_FRAME_MS / speed;
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, frames.length]);

  // ── Handlers ──
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSpeedToggle = useCallback(() => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  }, []);

  const handleTimelineClick = useCallback(
    (hour: number) => {
      const frameIndex = frames.findIndex((f) => {
        const h = parseInt(f.timestamp.split(":")[0], 10);
        return h === hour;
      });
      if (frameIndex >= 0) {
        setCurrentFrame(frameIndex);
        setIsPlaying(false);
      }
    },
    [frames],
  );

  // ── Sorted ripples: highest severity first ──
  const sortedRipples = useMemo(() => {
    return [...ripples].sort((a, b) => b.cascade_severity - a.cascade_severity);
  }, [ripples]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: EMPTY STATE
  // ═══════════════════════════════════════════════════════════════

  if (frames.length === 0) {
    return (
      <div className="glass-fac-story glass-fac-story--empty" data-mode={ambientMode}>
        <div className="glass-fac-story__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p className="glass-fac-story__empty-text">
            Sin datos temporales disponibles. La crónica se genera cuando hay
            suficiente historial de reservas y ocupación.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: STORY VIEWER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div
      className="glass-fac-story"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* ── Controls ── */}
      <div className="glass-fac-story__controls">
        <Button
          variant="unstyled"
          className="glass-fac-story__btn"
          data-active={isPlaying ? "true" : undefined}
          onClick={handlePlayPause}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </Button>

        <Button
          variant="unstyled"
          className="glass-fac-story__speed"
          onClick={handleSpeedToggle}
          aria-label={`Velocidad: ${speed}x`}
        >
          {speed}x
        </Button>

        <div className="glass-fac-story__frame-info">
          <span className="glass-fac-story__frame-time">
            {frame?.timestamp ?? "00:00"}
          </span>
          <span className="glass-fac-story__frame-energy" data-level={getEnergyDataLevel(frame?.energy_level ?? 0)}>
            {frame?.energy_level ?? 0}/100 energía
          </span>
        </div>
      </div>

      {/* ── Narrative (Sense 7: crossfade key) ── */}
      {frame && (
        <div
          className="glass-fac-story__narrative"
          key={`narrative-${currentFrame}`}
        >
          {frame.narrative}
        </div>
      )}

      {/* ── Simplified Graph Area ── */}
      <div className="glass-fac-story__graph-area">
        {frame && (
          <div className="glass-fac-story__graph-nodes" key={`graph-${currentFrame}`}>
            {frame.graph.nodes.map((node, nodeIndex) => {
              const occPct =
                node.max_capacity > 0
                  ? Math.round(
                      (node.current_occupancy / node.max_capacity) * 100,
                    )
                  : 0;
              const isActive = occPct > 30;
              const energyLevel = getEnergyDataLevel(occPct);

              return (
                <div
                  key={node.facility_id}
                  className="glass-fac-story__graph-node"
                  data-active={isActive ? "true" : undefined}
                  data-crowd={node.crowd_level}
                  style={
                    prefersReduced
                      ? undefined
                      : ({ "--stagger-i": nodeIndex } as React.CSSProperties)
                  }
                >
                  <span className="glass-fac-story__graph-node-name">
                    {node.facility_name.length > 10
                      ? node.facility_name.slice(0, 8) + "…"
                      : node.facility_name}
                  </span>
                  <span className="glass-fac-story__graph-node-pct">
                    {occPct}%
                  </span>
                  <div className="glass-fac-story__graph-node-energy">
                    <div
                      className="glass-fac-story__graph-node-energy-fill"
                      data-level={energyLevel}
                      style={{ width: `${occPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 24h Energy Timeline ── */}
      <div className="glass-fac-story__timeline" role="group" aria-label="Línea temporal de 24 horas">
        {frames.map((f, i) => {
          const hour = parseInt(f.timestamp.split(":")[0], 10);
          const heightPct = Math.max(8, f.energy_level);
          const isCurrent = i === currentFrame;
          const energyLevel = getEnergyDataLevel(f.energy_level);

          return (
            <div
              key={f.timestamp}
              className="glass-fac-story__hour-bar"
              data-current={isCurrent ? "true" : undefined}
              data-level={energyLevel}
              style={{ height: `${heightPct}%` }}
              onClick={() => handleTimelineClick(hour)}
              role="button"
              tabIndex={0}
              aria-label={`Hora ${hour}:00, energía ${f.energy_level}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTimelineClick(hour);
                }
              }}
            >
              <span className="glass-fac-story__hour-label">{hour}</span>
            </div>
          );
        })}
      </div>

      {/* ── Ripple Cascade ── */}
      {sortedRipples.length > 0 && (
        <div className="glass-fac-story__ripples">
          <div className="glass-fac-story__ripples-title">
            Efectos cascada detectados
          </div>
          {sortedRipples.slice(0, 3).map((ripple, i) => (
            <div
              key={i}
              className="glass-fac-story__ripple"
              data-severity={ripple.cascade_severity > 60 ? "high" : ripple.cascade_severity > 30 ? "medium" : "low"}
              style={
                prefersReduced
                  ? undefined
                  : ({ "--stagger-i": i } as React.CSSProperties)
              }
            >
              <span className="glass-fac-story__ripple-dot" />
              <span className="glass-fac-story__ripple-text">
                {ripple.source_event.event_name}
              </span>
              <span className="glass-fac-story__ripple-meta">
                → {ripple.total_affected_facilities} espacio(s) · severidad {ripple.cascade_severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Resonance Patterns (previously dead prop — now rendered) ── */}
      {resonancePatterns.length > 0 && (
        <div className="glass-fac-story__resonance">
          <div className="glass-fac-story__resonance-title">
            Patrones de resonancia
          </div>
          {resonancePatterns.slice(0, 3).map((pattern, i) => (
            <div
              key={i}
              className="glass-fac-story__resonance-item"
              style={
                prefersReduced
                  ? undefined
                  : ({ "--stagger-i": i } as React.CSSProperties)
              }
            >
              <span className="glass-fac-story__resonance-trigger">
                "{pattern.trigger}"
              </span>
              <span className="glass-fac-story__resonance-meta">
                {pattern.times_observed} ocurrencias · ₡{Math.round(pattern.hidden_cost_avg).toLocaleString("es-CR")} costo oculto promedio
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}