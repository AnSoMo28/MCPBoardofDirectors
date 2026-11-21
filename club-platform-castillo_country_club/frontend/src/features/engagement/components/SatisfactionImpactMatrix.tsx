// src/features/engagement/components/SatisfactionImpactMatrix.tsx
/**
 * SatisfactionImpactMatrix — Scatter chart: satisfaction × engagement volume.
 * Each dot = event type. Quadrants provide instant decision guidance.
 *
 * CSS-only scatter plot — zero chart library dependencies.
 *
 * Quadrants:
 *   Top-right:  HIGH satisfaction + HIGH engagement  → INVEST MORE
 *   Top-left:   LOW  satisfaction + HIGH engagement  → REFORMULATE
 *   Bottom-right: HIGH satisfaction + LOW engagement  → PROMOTE
 *   Bottom-left:  LOW  satisfaction + LOW engagement  → EVALUATE
 */

import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import { Target } from "lucide-react";

import type { SatisfactionIntelligence } from "@/shared/mocks/contracts";
import './SatisfactionImpactMatrix.css';

// ═══ CONFIG ═════════════════════════════════════════════════════════════════

const QUADRANT_CONFIG = {
  top_right: {
    label: "INVERTIR MÁS",
    description: "Alta satisfacción + Alto engagement",
    color: "var(--color-emerald-400)",
    bgColor: "var(--color-emerald-bg)",
  },
  top_left: {
    label: "REFORMULAR",
    description: "Baja satisfacción + Alto engagement",
    color: "var(--color-rose-400)",
    bgColor: "var(--color-rose-bg)",
  },
  bottom_right: {
    label: "PROMOVER",
    description: "Alta satisfacción + Bajo engagement",
    color: "var(--color-teal-400)",
    bgColor: "var(--color-teal-bg)",
  },
  bottom_left: {
    label: "EVALUAR",
    description: "Baja satisfacción + Bajo engagement",
    color: "var(--color-silver-400)",
    bgColor: "rgba(255,255,255,0.04)",
  },
};

// ═══ HELPERS ════════════════════════════════════════════════════════════════

function getQuadrant(
  score: number,
  responses: number,
  medianScore: number,
  medianResponses: number
): keyof typeof QUADRANT_CONFIG {
  const highSat = score >= medianScore;
  const highEng = responses >= medianResponses;
  if (highSat && highEng) return "top_right";
  if (!highSat && highEng) return "top_left";
  if (highSat && !highEng) return "bottom_right";
  return "bottom_left";
}

function getDotColor(quadrant: keyof typeof QUADRANT_CONFIG): string {
  return QUADRANT_CONFIG[quadrant].color;
}

// ═══ COMPONENT ═════════════════════════════════════════════════════════════

interface Props {
  intelligence: SatisfactionIntelligence;
  className?: string;
}

export function SatisfactionImpactMatrix({ intelligence, className }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const events = intelligence.event_type_comparisons ?? [];
  if (events.length < 2) {
    return (
      <div
        className={cn(
          "rounded-xl bg-[var(--color-surface-1)] border border-[rgba(255,255,255,0.06)]",
          "p-6 text-center",
          className
        )}
      >
        <Target className="satisfaction-impact-matrix w-8 h-8 mx-auto text-[var(--color-silver-500)] mb-2" />
        <p className="text-sm text-[var(--color-silver-400)]">
          Se necesitan al menos 2 tipos de evento para la matriz
        </p>
      </div>
    );
  }

  // Compute medians for quadrant divisions
  const scores = events.map((e) => e.avg_score);
  const responses = events.map((e) => e.total_responses);
  const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];
  const medianResponses = responses.sort((a, b) => a - b)[Math.floor(responses.length / 2)];
  const maxResponses = Math.max(...responses, 1);

  // Map events to positioned dots
  const dots = events.map((evt) => {
    const xPct = ((evt.avg_score - 1) / 4) * 100;
    const yPct = maxResponses > 0 ? (evt.total_responses / maxResponses) * 100 : 50;
    const quadrant = getQuadrant(evt.avg_score, evt.total_responses, medianScore, medianResponses);

    return {
      id: evt.event_type,
      label: evt.display_name,
      xPct,
      yPct,
      score: evt.avg_score,
      responses: evt.total_responses,
      trend: evt.trend,
      quadrant,
      color: getDotColor(quadrant),
    };
  });

  // Quadrant dividers
  const divX = ((medianScore - 1) / 4) * 100;
  const divY = maxResponses > 0 ? (medianResponses / maxResponses) * 100 : 50;

  // Count by quadrant
  const quadrantCounts = {
    top_right: dots.filter((d) => d.quadrant === "top_right").length,
    top_left: dots.filter((d) => d.quadrant === "top_left").length,
    bottom_right: dots.filter((d) => d.quadrant === "bottom_right").length,
    bottom_left: dots.filter((d) => d.quadrant === "bottom_left").length,
  };

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-[var(--color-surface-1)] border border-[rgba(255,255,255,0.06)]",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "var(--color-gold-400)" }} />
          <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">
            Satisfaction Impact Matrix
          </h3>
          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
            {events.length} tipos de evento
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Quadrant legend (mini badges) */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.entries(QUADRANT_CONFIG) as [string, typeof QUADRANT_CONFIG.top_right][]).map(
            ([key, cfg]) => {
              const count = quadrantCounts[key as keyof typeof quadrantCounts];
              if (count === 0) return null;
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold"
                  style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                >
                  {count} {cfg.label.toLowerCase()}
                </span>
              );
            }
          )}
        </div>

        {/* Scatter plot */}
        <div className="relative" style={{ height: "240px" }}>
          {/* Quadrant backgrounds */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px rounded-lg overflow-hidden opacity-30">
            <div className="bg-[var(--color-rose-bg)]" />
            <div className="bg-[var(--color-emerald-bg)]" />
            <div className="bg-[rgba(255,255,255,0.01)]" />
            <div className="bg-[var(--color-teal-bg)]" />
          </div>

          {/* Quadrant divider lines */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[rgba(255,255,255,0.08)]"
            style={{ left: `${divX}%` }}
          />
          <div
            className="absolute left-0 right-0 h-px bg-[rgba(255,255,255,0.08)]"
            style={{ bottom: `${divY}%` }}
          />

          {/* Quadrant labels */}
          <span
            className="absolute text-[8px] font-bold uppercase tracking-wider opacity-40"
            style={{
              right: "8px",
              top: "8px",
              color: QUADRANT_CONFIG.top_right.color,
            }}
          >
            {QUADRANT_CONFIG.top_right.label}
          </span>
          <span
            className="absolute text-[8px] font-bold uppercase tracking-wider opacity-40"
            style={{
              left: "8px",
              top: "8px",
              color: QUADRANT_CONFIG.top_left.color,
            }}
          >
            {QUADRANT_CONFIG.top_left.label}
          </span>
          <span
            className="absolute text-[8px] font-bold uppercase tracking-wider opacity-40"
            style={{
              right: "8px",
              bottom: "8px",
              color: QUADRANT_CONFIG.bottom_right.color,
            }}
          >
            {QUADRANT_CONFIG.bottom_right.label}
          </span>
          <span
            className="absolute text-[8px] font-bold uppercase tracking-wider opacity-40"
            style={{
              left: "8px",
              bottom: "8px",
              color: QUADRANT_CONFIG.bottom_left.color,
            }}
          >
            {QUADRANT_CONFIG.bottom_left.label}
          </span>

          {/* Dots */}
          {dots.map((dot) => {
            const isHovered = hoveredId === dot.id;
            return (
              <div
                key={dot.id}
                className="absolute -translate-x-1/2 translate-y-1/2 cursor-pointer group"
                style={{
                  left: `${dot.xPct}%`,
                  bottom: `${dot.yPct}%`,
                  zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredId(dot.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Dot */}
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-200",
                    isHovered ? "scale-150" : "scale-100"
                  )}
                  style={{
                    backgroundColor: dot.color,
                    borderColor: "var(--color-surface-1)",
                  }}
                />

                {/* Tooltip */}
                <div
                  className={cn(
                    "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg",
                    "bg-[var(--color-surface-2)] border border-[rgba(255,255,255,0.10)]",
                    "shadow-lg whitespace-nowrap pointer-events-none",
                    "transition-all duration-150",
                    isHovered
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-1"
                  )}
                >
                  <p className="text-[11px] font-semibold text-[var(--color-silver-100)]">
                    {dot.label}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--color-silver-400)]">
                      Score: <span className="font-[family-name:var(--font-mono)] font-bold" style={{ color: dot.color }}>{dot.score.toFixed(1)}</span>
                    </span>
                    <span className="text-[10px] text-[var(--color-silver-400)]">
                      Responses: <span className="font-[family-name:var(--font-mono)] font-bold text-[var(--color-silver-200)]">{dot.responses}</span>
                    </span>
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: dot.color }}>
                    {QUADRANT_CONFIG[dot.quadrant].description}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Axis labels */}
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5 text-[9px] text-[var(--color-silver-500)]">
            Satisfacción (1 → 5)
          </span>
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 -rotate-90 text-[9px] text-[var(--color-silver-500)]"
          >
            Engagement volume
          </span>
        </div>
      </div>
    </div>
  );
}
