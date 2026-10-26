// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/AgeGroupProgramsPanel.tsx
// Phase 34+ Migration — Programs Panel
// Level 6+ Agency · Production Grade
//
// "The Program Cockpit" — Each program rendered with capacity
// pulse ring, affinity radar, cohort heatmap, AI score,
// and expandable details. Sorted by composite AI score.
//
// Original: cn() + 8 namespaces + 6 inline colors + no ARIA
//   → BEM .ag-programs__* + data-* + ARIA + CSS-only colors
//
// PRE-WRITE VERIFICATION:
//   ProgramPopularityEntry → @/shared/mocks/contracts ✅
//   AGE_BRACKETS → ../config ✅
//   AGE_ACTIVITY_MATRIX → ../config ✅
//   COHORT_IDENTITIES → ../config ✅
//   AgeBracketId → ../types ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() × 5 → data-demand, data-expanded, data-top, data-open, data-hot-score
//   - 8 namespaces → .ag-programs__* unified BEM
//   - Inline colors × 6 → data-sat-level, data-ret-level, --badge-color cascade, --bracket-color var bridge
//   - className prop → removed
//   - Props → AgeGroupProgramsPanelProps Readonly
//   - ../types for constants → ../config
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import { Users, Star, RotateCcw, ChevronDown, Brain } from "lucide-react";

import type { ProgramPopularityEntry } from "@/shared/mocks/contracts";

import {
  AGE_BRACKETS,
  AGE_ACTIVITY_MATRIX,
  COHORT_IDENTITIES,
} from "../config";
import type { AgeBracketId } from "../types";

import "./AgeGroupProgramsPanel.css";

/* ── §0  Local Types ──────────────────────────────────────── */

interface ProgramIntelligence {
  readonly program: ProgramPopularityEntry;
  readonly aiScore: number;
  readonly topBracket: {
    readonly id: AgeBracketId;
    readonly label: string;
    readonly color: string;
  } | null;
  readonly affinities: Record<AgeBracketId, number>;
  readonly demandLevel: "critical" | "low" | "normal" | "high";
  readonly fillLabel: string;
  readonly satLevel: "excellent" | "good" | "fair" | "poor";
  readonly retLevel: "high" | "medium" | "low";
  readonly isTop: boolean;
}

interface AgeGroupProgramsPanelProps {
  /** Program popularity data from analytics */
  readonly programs: ProgramPopularityEntry[];
}

/* ── §1  Helpers ──────────────────────────────────────────── */

function getDemandLevel(
  fillRate: number,
): ProgramIntelligence["demandLevel"] {
  if (fillRate >= 80) return "high";
  if (fillRate >= 50) return "normal";
  if (fillRate >= 30) return "low";
  return "critical";
}

function getFillLabel(fillRate: number): string {
  if (fillRate >= 80) return "Alta demanda";
  if (fillRate >= 50) return "Normal";
  if (fillRate >= 30) return "Baja demanda";
  return "Crítico";
}

function getSatLevel(sat: number): ProgramIntelligence["satLevel"] {
  if (sat >= 4.0) return "excellent";
  if (sat >= 3.5) return "good";
  if (sat >= 3.0) return "fair";
  return "poor";
}

function getRetLevel(ret: number): ProgramIntelligence["retLevel"] {
  if (ret >= 70) return "high";
  if (ret >= 50) return "medium";
  return "low";
}

/** Find activity match in AGE_ACTIVITY_MATRIX (normalized) */
function findActivityAffinities(
  programName: string,
): Record<AgeBracketId, number> | null {
  const normalized = programName.toLowerCase().trim();
  const match = AGE_ACTIVITY_MATRIX.find((a) => {
    const actNorm = a.activity.toLowerCase().trim();
    return (
      normalized === actNorm ||
      normalized.includes(actNorm) ||
      actNorm.includes(normalized)
    );
  });
  if (!match) return null;
  return match.scores;
}

/** Composite AI score from fill × sat × retention */
function computeAIScore(prog: ProgramPopularityEntry): number {
  const fill = prog.fill_rate_pct;
  const sat = prog.satisfaction_avg * 20; // 0-5 → 0-100
  const ret = prog.retention_rate;
  return Math.round(fill * 0.3 + sat * 0.35 + ret * 0.35);
}

/* ── §2  Affinity Radar (P1 — internal SVG) ───────────────── */

function AffinityRadar({
  affinities,
  size = 70,
}: {
  readonly affinities: Record<AgeBracketId, number> | null;
  readonly size?: number;
}) {
  const cx = size / 2;
  const cy = size * 0.85;
  const maxR = size * 0.55;
  const bracketIds = AGE_BRACKETS.map((b) => b.id);

  const points = bracketIds.map((id, i) => {
    const angle = Math.PI - (i / (bracketIds.length - 1)) * Math.PI;
    const score = affinities ? (affinities[id] ?? 0) : 0;
    const r = (score / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
      score,
      id,
    };
  });

  const polygonStr = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  /* Outer arc path */
  const arcPath = (() => {
    const r = maxR;
    const sx = cx + r * Math.cos(Math.PI);
    const sy = cy - r * Math.sin(Math.PI);
    const ex = cx + r * Math.cos(0);
    const ey = cy - r * Math.sin(0);
    return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  })();

  return (
    <svg
      viewBox={`0 0 ${size} ${size * 0.9}`}
      className="ag-programs__radar"
      role="img"
      aria-label="Afinidad por cohorte etaria"
    >
      {/* Outer arc */}
      <path
        d={arcPath}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.5"
      />
      {/* Mid arc */}
      <path
        d={(() => {
          const r = maxR * 0.5;
          const sx = cx + r * Math.cos(Math.PI);
          const sy = cy - r * Math.sin(Math.PI);
          const ex = cx + r * Math.cos(0);
          const ey = cy - r * Math.sin(0);
          return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
        })()}
        fill="none"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="0.5"
      />
      {/* Affinity polygon */}
      {affinities && (
        <polygon
          points={polygonStr}
          fill="var(--color-gold-400, #d4a853)"
          opacity="0.1"
          stroke="var(--color-gold-400, #d4a853)"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
      )}
      {/* Data points */}
      {points.map((p) => {
        const bracket = AGE_BRACKETS.find((b) => b.id === p.id);
        return (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.score > 70 ? 3 : p.score > 30 ? 2 : 1.5}
            className="ag-programs__radar-dot"
            style={
              {
                "--dot-color": bracket?.color ?? "#a09890",
              } as CSSProperties
            }
            opacity={p.score > 50 ? 0.9 : 0.4}
          />
        );
      })}
    </svg>
  );
}

/* ── §3  Capacity Ring (P2 — internal SVG) ────────────────── */

function CapacityRing({
  fillRate,
  retentionRate,
}: {
  readonly fillRate: number;
  readonly retentionRate: number;
}) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fillOffset = circ * (1 - fillRate / 100);

  const churnPct = (100 - retentionRate) / 100;
  const retainedPct = fillRate * (1 - churnPct);
  const retainedOffset = circ * (1 - retainedPct / 100);
  const churnDash = `${circ * (fillRate / 100 - retainedPct / 100)} ${circ}`;

  return (
    <svg
      viewBox="0 0 60 60"
      className="ag-programs__cap-ring"
      role="img"
      aria-label={`Capacidad: ${fillRate.toFixed(0)}%`}
    >
      {/* Track */}
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="4"
      />
      {/* Fill — uses --badge-color inherited from card */}
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke="var(--badge-color, #7a7570)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={fillOffset}
        className="ag-programs__cap-ring-fill"
      />
      {/* Churn ghost */}
      {churnPct > 0.1 && (
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
          strokeDasharray={churnDash}
          strokeDashoffset={retainedOffset}
          className="ag-programs__cap-ring-ghost"
        />
      )}
      {/* Center percentage */}
      <text
        x="30"
        y="28"
        textAnchor="middle"
        dominantBaseline="central"
        className="ag-programs__cap-ring-pct"
      >
        {fillRate.toFixed(0)}
      </text>
      <text
        x="30"
        y="38"
        textAnchor="middle"
        className="ag-programs__cap-ring-label"
      >
        %
      </text>
    </svg>
  );
}

/* ── §4  Cohort Heatmap Band (P4 — internal) ──────────────── */

function CohortHeatmap({
  affinities,
}: {
  readonly affinities: Record<AgeBracketId, number> | null;
}) {
  if (!affinities) return null;

  return (
    <div
      className="ag-programs__heatmap"
      role="img"
      aria-label="Mapa de calor por cohorte"
    >
      {AGE_BRACKETS.map((bracket) => {
        const score = affinities[bracket.id] ?? 0;
        const identity = COHORT_IDENTITIES.find(
          (c) => c.bracketId === bracket.id,
        );

        return (
          <div
            key={bracket.id}
            className="ag-programs__heatmap-seg"
            data-hot-score={score >= 70 || undefined}
            style={
              {
                "--seg-color": identity?.color ?? bracket.color,
                "--seg-opacity": Math.max(0.1, score / 100),
              } as CSSProperties
            }
            title={`${bracket.label}: ${score}%`}
          />
        );
      })}
      <div className="ag-programs__heatmap-scanner" aria-hidden="true" />
    </div>
  );
}

/* ── §5  Program Card (internal) ──────────────────────────── */

function ProgramCard({
  intel,
  index,
}: {
  readonly intel: ProgramIntelligence;
  readonly index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const prog = intel.program;

  const churnEstimate = Math.round(
    (prog.total_enrolled * (100 - prog.retention_rate)) / 100,
  );

  return (
    <div
      className="ag-programs__card"
      data-demand={intel.demandLevel}
      data-expanded={expanded || undefined}
      style={
        {
          "--stagger-i": index,
        } as CSSProperties
      }
    >
      {/* § Header */}
      <div className="ag-programs__card-header">
        <div className="ag-programs__card-header-left">
          <h4 className="ag-programs__card-title">{prog.program}</h4>
          <p className="ag-programs__card-subtitle">
            {prog.total_enrolled} inscritos / {prog.capacity} capacidad
          </p>
        </div>

        <div className="ag-programs__card-header-right">
          {/* AI Score badge (P3) */}
          <span
            className="ag-programs__card-ai-badge"
            data-top={intel.isTop || undefined}
          >
            <Brain size={10} aria-hidden="true" />
            {intel.aiScore}
          </span>

          {/* Fill status badge — color from data-demand cascade */}
          <span className="ag-programs__card-fill-badge">
            {intel.fillLabel}
          </span>
        </div>
      </div>

      {/* § Body: Ring + Radar + Metrics */}
      <div className="ag-programs__card-body">
        {/* Capacity Ring (P2) */}
        <CapacityRing
          fillRate={prog.fill_rate_pct}
          retentionRate={prog.retention_rate}
        />

        {/* Radar + Top bracket */}
        <div className="ag-programs__card-radar-block">
          <AffinityRadar affinities={intel.affinities} size={70} />
          {intel.topBracket && (
            <span
              className="ag-programs__card-top-bracket"
              style={
                { "--bracket-color": intel.topBracket.color } as CSSProperties
              }
            >
              {intel.topBracket.label}
            </span>
          )}
        </div>

        {/* Metrics (P6 Quick Scan) */}
        <div className="ag-programs__card-metrics">
          <div className="ag-programs__metric">
            <span className="ag-programs__metric-icon" aria-hidden="true">
              <Users size={12} />
            </span>
            <div className="ag-programs__metric-data">
              <span className="ag-programs__metric-label">Inscritos</span>
              <span className="ag-programs__metric-value">
                {prog.total_enrolled}
              </span>
            </div>
          </div>

          <div
            className="ag-programs__metric"
            data-sat-level={intel.satLevel}
          >
            <span className="ag-programs__metric-icon" aria-hidden="true">
              <Star size={12} />
            </span>
            <div className="ag-programs__metric-data">
              <span className="ag-programs__metric-label">Satisfacción</span>
              <span className="ag-programs__metric-value">
                {prog.satisfaction_avg.toFixed(1)}/5
              </span>
            </div>
          </div>

          <div
            className="ag-programs__metric"
            data-ret-level={intel.retLevel}
          >
            <span className="ag-programs__metric-icon" aria-hidden="true">
              <RotateCcw size={12} />
            </span>
            <div className="ag-programs__metric-data">
              <span className="ag-programs__metric-label">Retención</span>
              <span className="ag-programs__metric-value">
                {prog.retention_rate.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* § Cohort Heatmap (P4) */}
      <CohortHeatmap affinities={intel.affinities} />

      {/* § Expand Toggle (P5) */}
      <button
        className="ag-programs__card-expand-btn"
        onClick={() => setExpanded(!expanded)}
        type="button"
        aria-expanded={expanded}
        aria-label={
          expanded
            ? "Contraer detalles del programa"
            : "Expandir detalles del programa"
        }
      >
        <ChevronDown
          size={14}
          className="ag-programs__card-expand-icon"
          data-open={expanded || undefined}
          aria-hidden="true"
        />
      </button>

      {/* § Expanded Content (P5) */}
      {expanded && (
        <div className="ag-programs__card-expanded">
          <div
            className="ag-programs__expanded-section"
            style={{ "--stagger-i": 0 } as CSSProperties}
          >
            <span className="ag-programs__expanded-label">Enrollment</span>
            <span className="ag-programs__expanded-value">
              {prog.total_enrolled} de {prog.capacity} (
              {prog.fill_rate_pct.toFixed(0)}%)
            </span>
          </div>
          <div
            className="ag-programs__expanded-section"
            style={{ "--stagger-i": 1 } as CSSProperties}
          >
            <span className="ag-programs__expanded-label">
              Churn estimado
            </span>
            <span className="ag-programs__expanded-value">
              ~{churnEstimate} en riesgo
            </span>
          </div>
          {intel.topBracket && (
            <div
              className="ag-programs__expanded-section"
              style={{ "--stagger-i": 2 } as CSSProperties}
            >
              <span className="ag-programs__expanded-label">
                Cohorte principal
              </span>
              <span
                className="ag-programs__expanded-value"
                style={
                  {
                    "--bracket-color": intel.topBracket.color,
                  } as CSSProperties
                }
              >
                {intel.topBracket.label}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── §6  Dormant Programs — Empty State (P10) ─────────────── */

function DormantPrograms() {
  return (
    <div
      className="ag-programs__dormant"
      role="status"
      aria-label="Sin programas activos"
      data-testid="ag-programs-dormant"
    >
      <AffinityRadar affinities={null} size={80} />
      <h4 className="ag-programs__dormant-title">Sin programas activos</h4>
      <p className="ag-programs__dormant-desc">
        El sistema monitoreará nuevos programas cuando estén disponibles
      </p>
    </div>
  );
}

/* ── §7  Main Component ──────────────────────────────────── */

/**
 * AgeGroupProgramsPanel — "The Program Cockpit"
 *
 * Renders program intelligence cards sorted by composite AI score.
 * Each card integrates capacity pulse ring, affinity radar,
 * cohort heatmap, and expandable deep-dive details.
 */
export function AgeGroupProgramsPanel({
  programs,
}: AgeGroupProgramsPanelProps) {
  /* ── Build intelligence (P3 sort + P1 affinities) ── */
  const intelligences = useMemo((): ProgramIntelligence[] => {
    if (programs.length === 0) return [];

    const withScores = programs.map((prog) => {
      const aiScore = computeAIScore(prog);
      const affinities = findActivityAffinities(prog.program);
      const demandLevel = getDemandLevel(prog.fill_rate_pct);

      /* Top bracket */
      let topBracket: ProgramIntelligence["topBracket"] = null;
      if (affinities) {
        const sorted = Object.entries(affinities).sort(
          ([, a], [, b]) => b - a,
        );
        if (sorted.length > 0) {
          const [topId, topScore] = sorted[0];
          if (topScore > 0) {
            const bracket = AGE_BRACKETS.find(
              (b) => b.id === (topId as AgeBracketId),
            );
            if (bracket) {
              topBracket = {
                id: bracket.id,
                label: bracket.label,
                color: bracket.color,
              };
            }
          }
        }
      }

      return {
        program: prog,
        aiScore,
        topBracket,
        affinities: affinities ?? ({} as Record<AgeBracketId, number>),
        demandLevel,
        fillLabel: getFillLabel(prog.fill_rate_pct),
        satLevel: getSatLevel(prog.satisfaction_avg),
        retLevel: getRetLevel(prog.retention_rate),
        isTop: false,
      };
    });

    withScores.sort((a, b) => b.aiScore - a.aiScore);
    if (withScores.length > 0) withScores[0].isTop = true;

    return withScores;
  }, [programs]);

  /* ── Empty ── */
  if (programs.length === 0) return <DormantPrograms />;

  return (
    <div
      className="ag-programs"
      role="region"
      aria-label="Panel de programas por grupo etario"
      data-testid="ag-programs"
    >
      <div
        className="ag-programs__list"
        role="list"
        aria-label="Programas ordenados por score AI"
      >
        {intelligences.map((intel, idx) => (
          <div key={intel.program.program} role="listitem">
            <ProgramCard intel={intel} index={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}