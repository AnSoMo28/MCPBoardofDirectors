// ═══════════════════════════════════════════════════════════════════════
// Member360 — Risk Observatory
// Phase 30 — Block 3.3: The Radar
// ═══════════════════════════════════════════════════════════════════════
//
// SVG octagonal radar showing risk across 8 dimensions.
// A scan line rotates continuously. Risk polygon plots the threat.
// Axes exceeding the threshold pulse.
//
// 8 Axes: Churn, Financial, Social, Engagement, Satisfaction,
//          Activity, Wellness, External
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import type {
  MemberTemperature,
  DomainSignal,
  ActivityDomain,
} from "../types";
import {
  getDomainIcon,
  getDomainLabel,
} from "../types";
import type {
  MemberRiskAssessmentResponse,
  MemberChurnPredictionResponse,
} from "../types";
import "./MemberRiskObservatory.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberRiskObservatoryProps {
  riskAssessment: MemberRiskAssessmentResponse | null;
  churnPrediction: MemberChurnPredictionResponse | null;
  temperature: MemberTemperature;
  signals: DomainSignal[];
}

interface RiskAxis {
  name: string;
  label: string;
  value: number;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const CX = 100;
const CY = 100;
const MAX_R = 65;
const AXIS_COUNT = 8;
const THRESHOLD = 60;
const GRID_LEVELS = [25, 50, 75, 100];

const AXIS_DEFS: Array<{
  name: string;
  label: string;
  domains?: ActivityDomain[];
}> = [
  { name: "churn", label: "Churn" },
  { name: "financial", label: "Financiero", domains: ["families", "dining"] },
  { name: "social", label: "Social", domains: ["social"] },
  { name: "engagement", label: "Engagement" },
  { name: "satisfaction", label: "Satisfacción", domains: ["events", "cultural"] },
  { name: "activity", label: "Actividad", domains: ["sports", "wellness"] },
  { name: "wellness", label: "Bienestar", domains: ["wellness"] },
  { name: "external", label: "Externo" },
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Derive risk score from domain signals (0-100, higher = more risk) */
function getDomainRisk(
  domains: ActivityDomain[],
  signals: DomainSignal[],
): number {
  const relevant = signals.filter((s) => domains.includes(s.domain));
  if (relevant.length === 0) return 35;

  const negatives = relevant.filter((s) => s.direction === "negative");
  const positives = relevant.filter((s) => s.direction === "positive");

  if (negatives.length > 0) {
    return Math.min(
      100,
      negatives.reduce((sum, s) => sum + s.confidence * 100, 0) /
        negatives.length,
    );
  }
  if (positives.length > 0) {
    return Math.max(
      5,
      30 -
        positives.reduce((sum, s) => sum + s.confidence * 30, 0) /
          positives.length,
    );
  }
  return 40;
}

/** Get risk color from value */
function getRiskColor(value: number): string {
  if (value > 75) return "var(--color-rose-400)";
  if (value > 60) return "var(--color-amber-400)";
  if (value > 40) return "var(--color-teal-400)";
  return "var(--color-emerald-400)";
}

/** Derive all 8 axes from available data */
function deriveRiskAxes(
  riskAssessment: MemberRiskAssessmentResponse | null,
  churnPrediction: MemberChurnPredictionResponse | null,
  temperature: MemberTemperature,
  signals: DomainSignal[],
): RiskAxis[] {
  return AXIS_DEFS.map((def) => {
    let value: number;

    if (def.name === "churn") {
      value =
        riskAssessment?.risk_score ??
        churnPrediction?.churn_score ??
        Math.max(0, 100 - temperature.composite);
    } else if (def.name === "engagement") {
      value = Math.max(0, 100 - temperature.composite);
    } else if (def.name === "external") {
      const criticalCount = signals.filter(
        (s) => s.severity === "critical" || s.severity === "high",
      ).length;
      value = Math.min(100, criticalCount * 20 + 10);
    } else {
      value = getDomainRisk(def.domains ?? [], signals);
    }

    return {
      name: def.name,
      label: def.label,
      value: Math.round(Math.min(100, Math.max(0, value))),
      color: getRiskColor(value),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberRiskObservatory({
  riskAssessment,
  churnPrediction,
  temperature,
  signals,
}: MemberRiskObservatoryProps) {
  const axes = useMemo(
    () =>
      deriveRiskAxes(riskAssessment, churnPrediction, temperature, signals),
    [riskAssessment, churnPrediction, temperature, signals],
  );

  // Grid polygon points helper
  const gridPoints = (level: number) =>
    Array.from({ length: AXIS_COUNT }, (_, i) => {
      const angle = (i / AXIS_COUNT) * 2 * Math.PI - Math.PI / 2;
      const r = (level / 100) * MAX_R;
      return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
    }).join(" ");

  // Risk polygon points
  const polygonPoints = axes
    .map((axis, i) => {
      const angle = (i / AXIS_COUNT) * 2 * Math.PI - Math.PI / 2;
      const r = (Math.min(axis.value, 100) / 100) * MAX_R;
      return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
    })
    .join(" ");

  // Risk factors from assessment or derived from signals
  const riskFactors = riskAssessment?.risk_factors ?? [];
  const protectiveFactors = riskAssessment?.protective_factors ?? [];
  const negativeSignals = signals.filter(
    (s) =>
      s.direction === "negative" ||
      s.severity === "critical" ||
      s.severity === "high",
  );

  return (
    <div className="glass-m360-risk">
      {/* ── Radar SVG ── */}
      <div className="glass-m360-risk__radar-wrap">
        <svg
          viewBox="0 0 200 200"
          className="glass-m360-risk__radar"
          role="img"
          aria-label="Observatorio de riesgo octogonal"
        >
          {/* Grid octagons */}
          {GRID_LEVELS.map((level) => (
            <polygon
              key={level}
              points={gridPoints(level)}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth={level === 100 ? 0.8 : 0.4}
              opacity={0.5}
            />
          ))}

          {/* Threshold line */}
          <polygon
            points={gridPoints(THRESHOLD)}
            fill="none"
            stroke="var(--color-amber-400)"
            strokeWidth="0.6"
            strokeDasharray="3 2"
            opacity="0.4"
          />

          {/* Axis lines */}
          {axes.map((_, i) => {
            const angle = (i / AXIS_COUNT) * 2 * Math.PI - Math.PI / 2;
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={CX + MAX_R * Math.cos(angle)}
                y2={CY + MAX_R * Math.sin(angle)}
                stroke="var(--color-surface-3)"
                strokeWidth="0.4"
                opacity="0.5"
              />
            );
          })}

          {/* Risk polygon */}
          <polygon
            points={polygonPoints}
            fill="var(--color-rose-400)"
            fillOpacity="0.1"
            stroke="var(--color-rose-400)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className="glass-m360-risk__polygon"
          />

          {/* Vertex dots */}
          {axes.map((axis, i) => {
            const angle = (i / AXIS_COUNT) * 2 * Math.PI - Math.PI / 2;
            const r = (Math.min(axis.value, 100) / 100) * MAX_R;
            const x = CX + r * Math.cos(angle);
            const y = CY + r * Math.sin(angle);

            return (
              <circle
                key={axis.name}
                cx={x}
                cy={y}
                r={axis.value > 75 ? 3.5 : 2.5}
                fill={axis.color}
                className={
                  axis.value > 75
                    ? "glass-m360-risk__vertex--critical"
                    : undefined
                }
              />
            );
          })}

          {/* Labels */}
          {axes.map((axis, i) => {
            const angle = (i / AXIS_COUNT) * 2 * Math.PI - Math.PI / 2;
            const labelR = MAX_R + 16;
            const x = CX + labelR * Math.cos(angle);
            const y = CY + labelR * Math.sin(angle);
            const cosA = Math.cos(angle);
            const anchor =
              cosA > 0.3 ? "start" : cosA < -0.3 ? "end" : "middle";

            return (
              <text
                key={axis.name}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize="7"
                fill={
                  axis.value > 60 ? axis.color : "var(--color-silver-500)"
                }
                fontWeight={axis.value > 60 ? "600" : "400"}
              >
                {axis.label}
              </text>
            );
          })}

          {/* Scan line */}
          <g className="glass-m360-risk__scan-group">
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - MAX_R}
              stroke="var(--color-rose-400)"
              strokeWidth="0.8"
              opacity="0.25"
            />
          </g>
        </svg>
      </div>

      {/* ── Risk details ── */}
      <div className="glass-m360-risk__details">
        {/* Overall */}
        <div className="glass-m360-risk__overall">
          <span className="glass-m360-risk__overall-label">
            Riesgo General
          </span>
          <span
            className="glass-m360-risk__overall-score"
            style={{ color: axes[0]?.color }}
          >
            {riskAssessment?.overall_risk ??
              (axes[0]?.value > 60
                ? "Alto"
                : axes[0]?.value > 40
                  ? "Medio"
                  : "Bajo")}
          </span>
          <span className="glass-m360-risk__overall-trend">
            {riskAssessment?.risk_trend ?? temperature.trend}
          </span>
        </div>

        {/* Risk factors from assessment */}
        {riskFactors.length > 0 && (
          <div className="glass-m360-risk__factors">
            <h4 className="glass-m360-risk__factors-title">
              Factores de Riesgo
            </h4>
            {riskFactors.map((rf, i) => (
              <div
                key={i}
                className="glass-m360-risk__factor"
                data-severity={rf.severity}
                style={{ "--stagger-i": i } as React.CSSProperties}
              >
                <span className="glass-m360-risk__factor-source">
                  {rf.source}
                </span>
                <span className="glass-m360-risk__factor-detail">
                  {rf.detail}
                </span>
                <span className="glass-m360-risk__factor-weight">
                  {Math.round(rf.weight * 100)}%
                </span>
                {rf.mitigation && (
                  <span className="glass-m360-risk__factor-mitigation">
                    → {rf.mitigation}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fallback: negative signals as risk factors */}
        {riskFactors.length === 0 && negativeSignals.length > 0 && (
          <div className="glass-m360-risk__factors">
            <h4 className="glass-m360-risk__factors-title">
              Señales de Riesgo
            </h4>
            {negativeSignals.slice(0, 5).map((s, i) => (
              <div
                key={i}
                className="glass-m360-risk__factor"
                data-severity={s.severity}
                style={{ "--stagger-i": i } as React.CSSProperties}
              >
                <span className="glass-m360-risk__factor-source">
                  {getDomainIcon(s.domain)} {getDomainLabel(s.domain)}
                </span>
                <span className="glass-m360-risk__factor-detail">
                  {s.signal}
                </span>
                <span className="glass-m360-risk__factor-weight">
                  {Math.round(s.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {riskFactors.length === 0 && negativeSignals.length === 0 && (
          <p className="glass-m360-risk__empty">
            Sin señales de riesgo detectadas
          </p>
        )}

        {/* Protective factors */}
        {protectiveFactors.length > 0 && (
          <div className="glass-m360-risk__protective">
            <h4 className="glass-m360-risk__protective-title">
              Factores Protectores
            </h4>
            {protectiveFactors.map((pf, i) => (
              <div key={i} className="glass-m360-risk__protective-factor">
                <span className="glass-m360-risk__factor-source">
                  {pf.source}
                </span>
                <span>{pf.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}