// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/IntelligenceCompass.tsx
// Phase 34+ Migration — Intelligence Compass Sub-Component
// Level 6+ Agency · Production Grade
//
// "The Neural Compass" — Mini SVG donut with 7 segments
// (one per AgeGroupLayer). Active layers glow proportionally
// to insight severity. Click/keyboard to filter by layer.
//
// Original: cn() + inline cursor + no ARIA + no keyboard
//   → BEM .ag-compass + data-* + ARIA + keyboard nav + CSS
//
// PRE-WRITE VERIFICATION:
//   AgeGroupLayer → ../types ✅
//   AGE_GROUP_LAYER_META → ../config ✅
//   BaseInsight → @/shared/components/AdvisorBanner ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → data-active, data-clear, data-severity
//   - style={{ cursor: "pointer" }} → CSS
//   - Missing keyboard → tabIndex, onKeyDown, role="option"
//   - Missing ARIA → role, aria-label, aria-selected
//   - Import ../types for constants → ../config
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { Check } from "lucide-react";
import { AGE_GROUP_LAYER_META } from "../config";
import type { AgeGroupLayer } from "../types";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";

import "./IntelligenceCompass.css";

/* ── §0  Constants ────────────────────────────────────────── */

const DOMAIN_TO_ADVISOR: Record<AgeGroupLayer, string> = {
  balance: "social",
  participation: "engagement",
  growth: "lifecycle",
  cross_domain: "cross_domain",
  engagement: "engagement",
  social: "social",
  financial: "financial",
};

const LAYERS: AgeGroupLayer[] = [
  "balance",
  "participation",
  "growth",
  "cross_domain",
  "engagement",
  "social",
  "financial",
];

const SEV_ORDER = ["low", "info", "medium", "high", "critical"];

/* ── §1  SVG Arc Helper ───────────────────────────────────── */

function polarToXY(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const os = polarToXY(cx, cy, outerR, startDeg);
  const oe = polarToXY(cx, cy, outerR, endDeg);
  const ie = polarToXY(cx, cy, innerR, endDeg);
  const is_ = polarToXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is_.x} ${is_.y}`,
    "Z",
  ].join(" ");
}

/* ── §2  Props ────────────────────────────────────────────── */

interface IntelligenceCompassProps {
  /** Insights from advisor hook */
  readonly insights: BaseInsight[];
  /** Currently active layer filter */
  readonly activeLayer: AgeGroupLayer | null;
  /** Callback when layer selection changes */
  readonly onLayerChange: (layer: AgeGroupLayer | null) => void;
  /** Show check mark instead of count (all resolved) */
  readonly isClear?: boolean;
}

/* ── §3  Component ────────────────────────────────────────── */

/**
 * IntelligenceCompass — "The Neural Compass"
 *
 * 7-segment SVG donut. Each segment represents an advisor layer.
 * Click or use keyboard to filter insights by layer. Severity
 * drives visual emphasis: critical segments pulse, high segments glow.
 */
export function IntelligenceCompass({
  insights,
  activeLayer,
  onLayerChange,
  isClear = false,
}: IntelligenceCompassProps) {
  const [hoveredLayer, setHoveredLayer] = useState<AgeGroupLayer | null>(
    null,
  );

  /* ── Computed: insight count per layer ── */
  const layerCounts = useMemo(() => {
    const counts: Partial<Record<AgeGroupLayer, number>> = {};
    for (const insight of insights) {
      for (const [domainLayer, advisorLayer] of Object.entries(
        DOMAIN_TO_ADVISOR,
      )) {
        if (insight.layer === advisorLayer) {
          counts[domainLayer as AgeGroupLayer] =
            (counts[domainLayer as AgeGroupLayer] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [insights]);

  /* ── Computed: max severity per layer ── */
  const layerSeverity = useMemo(() => {
    const sev: Partial<Record<AgeGroupLayer, string>> = {};
    for (const insight of insights) {
      for (const [domainLayer, advisorLayer] of Object.entries(
        DOMAIN_TO_ADVISOR,
      )) {
        if (insight.layer === advisorLayer) {
          const current = sev[domainLayer as AgeGroupLayer] ?? "low";
          if (SEV_ORDER.indexOf(insight.severity) > SEV_ORDER.indexOf(current)) {
            sev[domainLayer as AgeGroupLayer] = insight.severity;
          }
        }
      }
    }
    return sev;
  }, [insights]);

  /* ── Keyboard handler ── */
  const handleKeyDown = useCallback(
    (layer: AgeGroupLayer, e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onLayerChange(activeLayer === layer ? null : layer);
      }
    },
    [activeLayer, onLayerChange],
  );

  /* ── SVG geometry ── */
  const cx = 60;
  const cy = 60;
  const outerR = 52;
  const innerR = 32;
  const gap = 3;
  const segDeg = (360 - gap * LAYERS.length) / LAYERS.length;

  return (
    <div
      className="ag-compass"
      data-clear={isClear || undefined}
      data-testid="ag-compass"
    >
      <svg
        viewBox="0 0 120 120"
        className="ag-compass__svg"
        role="listbox"
        aria-label="Filtrar insights por capa de inteligencia"
        aria-multiselectable={false}
      >
        {LAYERS.map((layer, i) => {
          const start = i * (segDeg + gap);
          const end = start + segDeg;
          const path = arcPath(cx, cy, innerR, outerR, start, end);
          const meta = AGE_GROUP_LAYER_META[layer];
          const count = layerCounts[layer] ?? 0;
          const maxSev = layerSeverity[layer];
          const isActive = activeLayer === layer;
          const isHovered = hoveredLayer === layer;

          const opacity = isClear
            ? 0.5
            : count > 0
              ? isActive || isHovered
                ? 1
                : 0.7
              : 0.2;

          return (
            <path
              key={layer}
              d={path}
              fill={meta.color}
              opacity={opacity}
              className="ag-compass__seg"
              role="option"
              aria-label={`${meta.icon}: ${count} alertas`}
              aria-selected={isActive}
              tabIndex={0}
              data-active={isActive || undefined}
              data-severity={count > 0 ? maxSev : undefined}
              data-has-insights={count > 0 || undefined}
              onClick={() =>
                onLayerChange(activeLayer === layer ? null : layer)
              }
              onKeyDown={(e) => handleKeyDown(layer, e)}
              onMouseEnter={() => setHoveredLayer(layer)}
              onMouseLeave={() => setHoveredLayer(null)}
            />
          );
        })}

        {/* Center: count or check */}
        {isClear ? (
          <foreignObject x={cx - 10} y={cy - 10} width={20} height={20}>
            <Check
              size={20}
              className="ag-compass__check"
              aria-hidden="true"
            />
          </foreignObject>
        ) : (
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="central"
            className="ag-compass__count"
            aria-label={`${insights.length} insights totales`}
          >
            {insights.length}
          </text>
        )}
      </svg>

      {/* ── Hovered layer tooltip ── */}
      {hoveredLayer && !isClear && (
        <div
          className="ag-compass__tooltip"
          role="tooltip"
          aria-live="polite"
        >
          <span
            className="ag-compass__tooltip-dot"
            aria-hidden="true"
            style={{ background: AGE_GROUP_LAYER_META[hoveredLayer].color }}
          />
          <span className="ag-compass__tooltip-label">
            {AGE_GROUP_LAYER_META[hoveredLayer].icon}
          </span>
          <span className="ag-compass__tooltip-count">
            {layerCounts[hoveredLayer] ?? 0} alertas
          </span>
        </div>
      )}
    </div>
  );
}