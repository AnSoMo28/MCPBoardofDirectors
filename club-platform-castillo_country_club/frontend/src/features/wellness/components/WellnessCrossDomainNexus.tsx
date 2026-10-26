/* ═══════════════════════════════════════════════════════════════
   Wellness Cross-Domain Nexus — "The Web" (P3)
   SVG radial graph: wellness ↔ retention/revenue/satisfaction.
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import type { WellnessCorrelation, WellnessMode } from "../types";
import "./WellnessCrossDomainNexus.css";

interface Props {
  correlations: WellnessCorrelation | null;
  mode: WellnessMode;
  className?: string;
}

interface NexusNode {
  x: number;
  y: number;
  label: string;
  coefficient: number;
  significance: string;
  color: string;
}

export function WellnessCrossDomainNexus({
  correlations,
  mode,
  className,
}: Props) {
  const cx = 70;
  const cy = 70;
  const outerR = 55;

  const nodes = useMemo((): NexusNode[] => {
    if (!correlations) return [];

    const defs: {
      key: keyof WellnessCorrelation;
      label: string;
      angle: number;
      color: string;
    }[] = [
      {
        key: "wellness_to_retention",
        label: "Retención",
        angle: -Math.PI / 2,
        color: "var(--color-teal-400)",
      },
      {
        key: "wellness_to_revenue",
        label: "Revenue",
        angle: (Math.PI * 2) / 3 - Math.PI / 2,
        color: "var(--color-gold-400)",
      },
      {
        key: "wellness_to_satisfaction",
        label: "Satisfacción",
        angle: (-Math.PI * 2) / 3 - Math.PI / 2,
        color: "var(--color-emerald-400)",
      },
    ];

    return defs.map((d) => {
      const corr = correlations[d.key];
      return {
        x: cx + outerR * Math.cos(d.angle),
        y: cy + outerR * Math.sin(d.angle),
        label: d.label,
        coefficient: corr.coefficient,
        significance: corr.significance,
        color: d.color,
      };
    });
  }, [correlations]);

  if (!correlations) return null;

  const allHigh = nodes.every(
    (n) => n.significance === "high" && n.coefficient > 0.5,
  );

  return (
    <div className={cn("glass-wn", className)} data-mode={mode}>
      <span className="wn__title">Conexiones</span>
      <svg
        viewBox="0 0 140 140"
        className="wn__svg"
        role="img"
        aria-label="Nexo cross-domain"
      >
        <defs>
          <filter id="wn-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges from center to nodes */}
        {nodes.map((node, i) => {
          const thickness = Math.max(1, node.coefficient * 4);
          const isHigh =
            node.significance === "high" && node.coefficient > 0.5;
          return (
            <line
              key={`edge-${i}`}
              x1={cx}
              y1={cy}
              x2={node.x}
              y2={node.y}
              stroke={node.color}
              strokeWidth={thickness}
              opacity={isHigh ? 0.7 : 0.3}
              strokeLinecap="round"
              className={isHigh ? "wn__edge--glow" : ""}
            />
          );
        })}

        {/* Triangle (P9) — completes when all high */}
        {allHigh && (
          <polygon
            points={nodes.map((n) => `${n.x},${n.y}`).join(" ")}
            fill="var(--color-gold-400)"
            opacity="0.06"
            stroke="var(--color-gold-400)"
            strokeWidth="0.8"
            strokeOpacity="0.3"
            className="wn__triangle"
            filter="url(#wn-glow)"
          />
        )}

        {/* Center node */}
        <circle cx={cx} cy={cy} r="14" fill="var(--color-surface-3)" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="wn__center-text"
        >
          W
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          className="wn__center-sub"
        >
          Wellness
        </text>

        {/* Outer nodes */}
        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            <circle
              cx={node.x}
              cy={node.y}
              r="10"
              fill="var(--color-surface-2)"
              stroke={node.color}
              strokeWidth="1.5"
              opacity={node.coefficient > 0.3 ? 1 : 0.5}
            />
            <text
              x={node.x}
              y={node.y - 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="wn__node-text"
            >
              {(node.coefficient * 100).toFixed(0)}
            </text>
            <text
              x={node.x}
              y={node.y + 7}
              textAnchor="middle"
              className="wn__node-label"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}