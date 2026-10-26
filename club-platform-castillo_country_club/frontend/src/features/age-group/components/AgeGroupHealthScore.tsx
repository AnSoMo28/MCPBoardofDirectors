// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/AgeGroupHealthScore.tsx
// Phase 34+ Migration — Health Score
// Level 6+ Agency · Production Grade
//
// "The Heart of the Club" — Orbital score ring + factor
// constellation + thermal band + sparkline + AI alerts.
//
// Original: cn() + 4 namespaces + inline colors + no ARIA
//   → BEM .ag-health__* + data-* + CSS var bridge + ARIA
//
// PRE-WRITE VERIFICATION:
//   AgeGroupHealthFactor → @/shared/mocks/contracts ✅
//   MEMBER_HEALTH_LEVEL_DISPLAY → @/shared/types/domain-enums ✅
//   MemberHealthLevel → @/shared/types/domain-enums ✅
//   CohortHealthEntry → ./hooks/useAgeGroupAdvisor ✅
//   AGE_BRACKETS → ../config ✅
//   COHORT_IDENTITIES → ../config ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() × 4 → data-level, data-severity, data-hotspot, data-high-impact
//   - 4 namespaces → .ag-health__* unified BEM
//   - Inline color → CSS var bridge (--trend-color, --badge-color, --seg-color)
//   - cursor: pointer inline → CSS
//   - className prop → removed
//   - Props → AgeGroupHealthScoreProps Readonly
//   - ../types for constants → ../config
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import { AlertTriangle, Check, Clock } from "lucide-react";

import type { AgeGroupHealthFactor } from "@/shared/mocks/contracts";
import { MEMBER_HEALTH_LEVEL_DISPLAY } from "@/shared/types/domain-enums";
import type { MemberHealthLevel } from "@/shared/types/domain-enums";

import { AGE_BRACKETS, COHORT_IDENTITIES } from "../config";
import type { CohortHealthEntry } from "../hooks/useAgeGroupAdvisor";

import "./AgeGroupHealthScore.css";

/* ── §0  Constants ────────────────────────────────────────── */

const TREND_CONFIG: Record<
  string,
  { label: string; color: string; direction: number }
> = {
  improving: { label: "Mejorando", color: "var(--color-emerald-400, #34d399)", direction: 1 },
  stable:    { label: "Estable",   color: "var(--color-silver-400, #a09890)",  direction: 0 },
  declining: { label: "En declive", color: "var(--color-red-400, #f87171)",    direction: -1 },
};

/* ── §1  Local Types ──────────────────────────────────────── */

interface EnrichedAlert {
  readonly text: string;
  readonly severity: "critical" | "warning" | "info";
}

interface ConstellationVertex {
  readonly x: number;
  readonly y: number;
  readonly factor: AgeGroupHealthFactor;
  readonly vertexR: number;
}

interface AgeGroupHealthScoreProps {
  /** Composite health score (0-100) */
  readonly score: number;
  /** Health level string key (maps to MemberHealthLevel) */
  readonly level: string;
  /** Trend direction: improving | stable | declining */
  readonly trend: string;
  /** Factor breakdown from health computation */
  readonly factors: AgeGroupHealthFactor[];
  /** Alert messages from advisor */
  readonly alerts: string[];
  /** AI-generated summary */
  readonly summary?: string;
  /** ISO timestamp of generation */
  readonly generatedAt?: string;
  /** Per-bracket health for thermal band */
  readonly cohortHealth?: CohortHealthEntry[];
}

/* ── §2  Helpers ──────────────────────────────────────────── */

function factorToXY(
  index: number,
  total: number,
  score: number,
  maxR: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const r = (score / 100) * maxR;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function generateSparklinePoints(score: number, trend: string): number[] {
  const dir = trend === "improving" ? -1 : trend === "declining" ? 1 : 0;
  const v = trend === "stable" ? 3 : 7;
  const pts: number[] = [];
  for (let i = 0; i < 5; i++) {
    const base = score + dir * (5 - i) * (v / 5);
    const noise = Math.sin(i * 2.3) * 1.8;
    pts.push(Math.max(5, Math.min(95, base + noise)));
  }
  pts.push(score);
  return pts;
}

function computeGhostPoint(score: number, trend: string): number {
  if (trend === "improving") return Math.min(95, score + 5);
  if (trend === "declining") return Math.max(5, score - 5);
  return score;
}

function timeAgoLocal(iso: string): string {
  const diffMin = Math.round(
    (Date.now() - new Date(iso).getTime()) / 60_000,
  );
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

/* ── §3  Component ────────────────────────────────────────── */

/**
 * AgeGroupHealthScore — "The Heart of the Club"
 *
 * Composite health visualization with:
 * - Orbital score ring with glow
 * - Factor constellation (radar polygon)
 * - Thermal band across 7 brackets
 * - Trend sparkline with ghost projection
 * - AI-enriched alert list
 */
export function AgeGroupHealthScore({
  score,
  level,
  trend,
  factors,
  alerts,
  summary,
  generatedAt,
  cohortHealth = [],
}: AgeGroupHealthScoreProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  /* ── Derived config ── */
  const levelKey = (level as MemberHealthLevel) ?? "healthy";
  const levelCfg =
    MEMBER_HEALTH_LEVEL_DISPLAY[levelKey] ??
    MEMBER_HEALTH_LEVEL_DISPLAY.healthy;
  const trendCfg = TREND_CONFIG[trend] ?? TREND_CONFIG.stable;

  /* ── Ring geometry ── */
  const ringR = 62;
  const ringCX = 80;
  const ringCY = 80;
  const circumference = 2 * Math.PI * ringR;
  const ringOffset = circumference * (1 - score / 100);

  /* ── Constellation (P2) ── */
  const constCX = 60;
  const constCY = 60;
  const constMaxR = 42;

  const vertices = useMemo((): ConstellationVertex[] => {
    if (factors.length === 0) return [];
    return factors.map((f, i) => {
      const { x, y } = factorToXY(
        i,
        factors.length,
        f.score,
        constMaxR,
        constCX,
        constCY,
      );
      return { x, y, factor: f, vertexR: 3 + f.weight * 8 };
    });
  }, [factors]);

  const polygonPoints = useMemo(
    () => vertices.map((v) => `${v.x},${v.y}`).join(" "),
    [vertices],
  );

  /* ── Sparkline (P5) ── */
  const sparkPts = useMemo(
    () => generateSparklinePoints(score, trend),
    [score, trend],
  );

  const sparkGhost = useMemo(
    () => computeGhostPoint(score, trend),
    [score, trend],
  );

  const sparkW = 50;
  const sparkH = 14;
  const sparkX0 = ringCX - sparkW / 2;
  const sparkY0 = ringCY + 10;

  const sparkPolyline = useMemo(
    () =>
      sparkPts
        .map((p, i) => {
          const x = sparkX0 + (i / (sparkPts.length - 1)) * sparkW;
          const y = sparkY0 + sparkH - (p / 100) * sparkH;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" "),
    [sparkPts, sparkX0, sparkY0],
  );

  const ghostX = sparkX0 + sparkW;
  const ghostY = sparkY0 + sparkH - (sparkGhost / 100) * sparkH;

  /* ── Thermal segments (P3) ── */
  const thermalSegs = useMemo(() => {
    return AGE_BRACKETS.map((bracket) => {
      const identity = COHORT_IDENTITIES.find(
        (c) => c.bracketId === bracket.id,
      );
      const health = cohortHealth.find(
        (c) => c.bracketId === bracket.id,
      );
      return {
        bracketId: bracket.id,
        color: identity?.color ?? bracket.color,
        healthScore: health?.healthScore ?? 50,
        hotspot: health?.hotspot ?? false,
      };
    });
  }, [cohortHealth]);

  /* ── Alerts (P4) ── */
  const enrichedAlerts = useMemo((): EnrichedAlert[] => {
    return alerts.map((text, i) => ({
      text,
      severity:
        i === 0 &&
        factors.some((f) => f.impact === "high" && f.score < 40)
          ? ("critical" as const)
          : i === 0
            ? ("warning" as const)
            : ("info" as const),
    }));
  }, [alerts, factors]);

  const hotspotCount = thermalSegs.filter((s) => s.hotspot).length;

  /* ── Keyboard for constellation vertices ── */
  const handleVertexKey = useCallback(
    (i: number, e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setHoveredIdx((prev) => (prev === i ? null : i));
      }
    },
    [],
  );

  return (
    <div
      className="ag-health"
      role="region"
      aria-label="Score de salud demográfica"
      data-testid="ag-health"
      data-level={levelKey}
      style={{ "--trend-color": trendCfg.color } as CSSProperties}
    >
      {/* § Header: Ring + Constellation + Info */}
      <div className="ag-health__header">
        {/* Orbital Score Ring (P1) */}
        <svg
          viewBox="0 0 160 160"
          className="ag-health__ring-svg"
          role="img"
          aria-label={`Score de salud: ${score} de 100, tendencia ${trendCfg.label}`}
        >
          <defs>
            <filter id="ag-ring-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track */}
          <circle
            cx={ringCX}
            cy={ringCY}
            r={ringR}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />

          {/* Score arc */}
          <circle
            cx={ringCX}
            cy={ringCY}
            r={ringR}
            fill="none"
            stroke={levelCfg.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={ringOffset}
            className="ag-health__ring-arc"
            filter="url(#ag-ring-glow)"
          />

          {/* Score text */}
          <text
            x={ringCX}
            y={ringCY - 4}
            textAnchor="middle"
            dominantBaseline="central"
            className="ag-health__score-text"
          >
            {score}
          </text>

          {/* Sparkline inside ring (P5) */}
          <polyline
            points={sparkPolyline}
            fill="none"
            stroke={levelCfg.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />

          {/* Ghost point (prediction) */}
          <circle
            cx={ghostX}
            cy={ghostY}
            r="2"
            fill="none"
            stroke={levelCfg.color}
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.4"
          />

          {/* Last sparkline point glow */}
          {sparkPts.length > 0 && (() => {
            const lastX =
              sparkX0 +
              ((sparkPts.length - 1) / (sparkPts.length - 1)) * sparkW;
            const lastY =
              sparkY0 +
              sparkH -
              (sparkPts[sparkPts.length - 1] / 100) * sparkH;
            return (
              <circle
                cx={lastX}
                cy={lastY}
                r="2.5"
                fill={levelCfg.color}
                className="ag-health__spark-dot"
              />
            );
          })()}
        </svg>

        {/* Constellation (P2) */}
        {vertices.length > 0 && (
          <svg
            viewBox="0 0 120 120"
            className="ag-health__constellation-svg"
            role="img"
            aria-label="Mapa dimensional de factores de salud"
          >
            {/* Background rings */}
            {[0.33, 0.66, 1].map((scale) => (
              <circle
                key={scale}
                cx={constCX}
                cy={constCY}
                r={constMaxR * scale}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
            ))}

            {/* Polygon fill */}
            <polygon
              points={polygonPoints}
              fill={levelCfg.color}
              opacity="0.12"
              className="ag-health__constellation-fill"
            />

            {/* Polygon stroke */}
            <polygon
              points={polygonPoints}
              fill="none"
              stroke={levelCfg.color}
              strokeWidth="1"
              opacity="0.5"
            />

            {/* Vertices (interactive) */}
            {vertices.map((v, i) => (
              <circle
                key={i}
                cx={v.x}
                cy={v.y}
                r={v.vertexR}
                fill={levelCfg.color}
                opacity={
                  v.factor.impact === "high"
                    ? 0.8
                    : v.factor.impact === "medium"
                      ? 0.5
                      : 0.3
                }
                className="ag-health__vertex"
                data-high-impact={v.factor.impact === "high" || undefined}
                tabIndex={0}
                role="button"
                aria-label={`${v.factor.name}: ${v.factor.score.toFixed(0)} puntos, peso ${(v.factor.weight * 100).toFixed(0)}%`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => setHoveredIdx(null)}
                onKeyDown={(e) => handleVertexKey(i, e)}
              />
            ))}
          </svg>
        )}

        {/* Info column */}
        <div className="ag-health__info">
          <div className="ag-health__level-row">
            <span
              className="ag-health__level-badge"
              style={
                {
                  "--badge-color": levelCfg.color,
                  "--badge-bg": levelCfg.bgColor,
                } as CSSProperties
              }
            >
              {levelCfg.label}
            </span>
            <span className="ag-health__trend">
              {trendCfg.label}
            </span>
          </div>
          <p className="ag-health__factor-count">
            Score compuesto · {factors.length} factores
          </p>
          {summary && (
            <blockquote className="ag-health__summary">
              &ldquo;{summary}&rdquo;
            </blockquote>
          )}
        </div>
      </div>

      {/* § Vertex tooltip */}
      {hoveredIdx !== null && vertices[hoveredIdx] && (
        <div
          className="ag-health__vertex-tooltip"
          role="tooltip"
          aria-live="polite"
        >
          <span className="ag-health__vt-name">
            {vertices[hoveredIdx].factor.name}
          </span>
          <span className="ag-health__vt-score">
            Score: {vertices[hoveredIdx].factor.score.toFixed(0)}
          </span>
          <span className="ag-health__vt-weight">
            Peso: {(vertices[hoveredIdx].factor.weight * 100).toFixed(0)}%
          </span>
          <span className="ag-health__vt-detail">
            {vertices[hoveredIdx].factor.detail}
          </span>
        </div>
      )}

      {/* § Thermal Band (P3) */}
      {cohortHealth.length > 0 && (
        <div
          className="ag-health__thermal"
          role="img"
          aria-label={`Banda térmica: ${hotspotCount} hotspot${hotspotCount !== 1 ? "s" : ""}`}
          data-testid="ag-health-thermal"
        >
          {thermalSegs.map((seg) => (
            <div
              key={seg.bracketId}
              className="ag-health__thermal-seg"
              data-hotspot={seg.hotspot || undefined}
              style={
                {
                  "--seg-color": seg.color,
                  "--seg-opacity": Math.max(0.15, seg.healthScore / 100),
                } as CSSProperties
              }
            />
          ))}
          <div className="ag-health__thermal-scan" aria-hidden="true" />
          {hotspotCount > 0 && (
            <span className="ag-health__thermal-alert">
              {hotspotCount} hotspot{hotspotCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* § Alerts (P4) */}
      {enrichedAlerts.length > 0 && (
        <div
          className="ag-health__alerts"
          role="list"
          aria-label="Alertas de salud"
          data-testid="ag-health-alerts"
        >
          {enrichedAlerts.map((alert, i) => (
            <div
              key={i}
              className="ag-health__alert-item"
              role="listitem"
              data-severity={alert.severity}
              style={{ "--stagger-i": i } as CSSProperties}
            >
              {alert.severity === "info" ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <AlertTriangle size={13} aria-hidden="true" />
              )}
              <span className="ag-health__alert-text">{alert.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* § Meta Footer (P10) */}
      {(generatedAt || factors.length > 0) && (
        <div className="ag-health__meta" data-testid="ag-health-meta">
          {generatedAt && (
            <span className="ag-health__meta-item">
              <Clock size={11} aria-hidden="true" />
              Generado {timeAgoLocal(generatedAt)}
            </span>
          )}
          <span className="ag-health__meta-item">
            {factors.length} factores evaluados
          </span>
        </div>
      )}
    </div>
  );
}