// src/features/families/components/IntelligenceConstellation.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Intelligence Constellation
// Level 6+ Agency · Production Grade
//
// "The Radar Command Display"
//
// A military-grade radar visualization that shows the family's
// intelligence profile as a living, breathing constellation.
//
// VISUAL CONCEPT:
//   Six dimension nodes orbit a pulsing composite score.
//   A filled score polygon reveals the health profile at a glance.
//   Colored arc segments show each dimension's angular range.
//   A golden radar sweep rotates continuously around the center.
//   Hexagonal mesh lines connect adjacent nodes.
//   Correlation particles travel along curved paths between nodes.
//   A status ring fills as dimensions load.
//   Urgency-driven glow halos pulse around critical nodes.
//   A radial vignette draws focus to the center.
//
// SVG Layers (bottom to top):
//   0. Defs — filters, gradients, clipPaths
//   1. Vignette — radial gradient depth
//   2. Guide rings — 3 concentric circles
//   3. Hexagonal mesh — lines between adjacent nodes
//   4. Spokes — center to node lines
//   5. Dimension arcs — colored arc segments per dimension
//   6. Score polygon — filled health profile shape
//   7. Score vertices — dots at polygon vertices
//   8. Correlation edges — curved paths with particles
//   9. Radar sweep — rotating golden wedge
//   10. Dimension nodes — glowing orbs with scores
//   11. Center vital — composite score with pulse
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Wrapper glass card (subtle, embedded)
//   D2: Stagger (node reveal on load)
//   D3: CSS sweep rotation (linear infinite)
//   D4: Mono for all SVG text
//   D5: Urgency/node colors via CSS vars
//   D6: SVG filters for glow (feGaussianBlur)
//   D7: Hover on wrapper (subtle border brighten)
//   D8: Compact sizing (240px intrinsic)
//   D9: Responsive (width: 100%, max-width)
//   D10: role="img", aria-label
//   D11: Light mode adjustments
//   D12: Reduced motion (all SVG animate disabled)
//   D13: fm-const* namespaced keyframes (3)
//
// PRE-WRITE VERIFICATION:
//   DimensionScore          → ../lib/intelligenceCorrelator.ts §1 ✅
//   IntelligenceCorrelation → ../lib/intelligenceCorrelator.ts §1 ✅
//   StreamPhase             → ../hooks/useIntelligenceEngine.ts §1  ✅
//   URGENCY_LEVELS          → ../config.ts §27                     ✅
//   INTELLIGENCE_DIMENSIONS → ../config.ts §26                     ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → removed
//   - className prop → removed
//   - Mutable props → readonly
//   - StreamPhase inline → imported from hook
//   - color-mix() in SVG → fillOpacity (SVG-safe)
//   - No score polygon → ADD
//   - No dimension arcs → ADD
//   - No radar sweep → ADD
//   - No hexagonal mesh → ADD
//   - No status ring → ADD
//   - No vignette → ADD
//   - No score vertices → ADD
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  Brain, TrendingUp, Users, Calendar, Target, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  DimensionScore,
  IntelligenceCorrelation,
} from "../lib/intelligenceCorrelator";
import type { StreamPhase } from "../hooks/useIntelligenceEngine";

import { URGENCY_LEVELS, INTELLIGENCE_DIMENSIONS } from "../config";

import "./IntelligenceConstellation.css";

// ═══════════════════════════════════════════════════════════
// §1  Constants + Helpers
// ═══════════════════════════════════════════════════════════

const SIZE = 240;
const CENTER = SIZE / 2;         // 120
const ORBIT = 78;
const CENTER_R = 30;
const TAU = Math.PI * 2;
const DIM_COUNT = INTELLIGENCE_DIMENSIONS.length; // 6
const HALF_SLICE = TAU / DIM_COUNT / 2;           // PI/6 = 30°

function urgencyRadius(urgency: string, status: string): number {
  if (status !== "loaded") return 6;
  if (urgency === "critical") return 16;
  if (urgency === "high") return 14;
  if (urgency === "medium") return 12;
  if (urgency === "low") return 10;
  return 9;
}

// ═══════════════════════════════════════════════════════════
// §2  Icon Registry
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// §3  Props
// ═══════════════════════════════════════════════════════════

interface IntelligenceConstellationProps {
  readonly dimensions: readonly DimensionScore[];
  readonly compositeScore: number;
  readonly urgencyLevel: string;
  readonly correlations: readonly IntelligenceCorrelation[];
  readonly phase: StreamPhase;
}

// ═══════════════════════════════════════════════════════════
// §4  Component
// ═══════════════════════════════════════════════════════════

/**
 * IntelligenceConstellation — "The Radar Command Display"
 *
 * Military-grade radar visualization showing the family's
 * intelligence profile as a living constellation.
 *
 * @example
 * <IntelligenceConstellation
 *   dimensions={engine.dimensionScores}
 *   compositeScore={engine.compositeScore}
 *   urgencyLevel={engine.urgencyLevel}
 *   correlations={engine.correlations}
 *   phase={engine.phase}
 * />
 */
export function IntelligenceConstellation({
  dimensions,
  compositeScore,
  urgencyLevel,
  correlations,
  phase,
}: IntelligenceConstellationProps) {
  const reduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // ── Node positions (hexagonal orbit) ──
  const nodes = useMemo(
    () =>
      dimensions.map((dim, i) => {
        const angle = (TAU * i) / dimensions.length - Math.PI / 2;
        return {
          ...dim,
          cx: CENTER + Math.cos(angle) * ORBIT,
          cy: CENTER + Math.sin(angle) * ORBIT,
          angle,
          nodeR: urgencyRadius(dim.urgency, dim.status),
        };
      }),
    [dimensions],
  );

  // ── Score polygon points ──
  const scorePoints = useMemo(() => {
    return nodes
      .map((n) => {
        const scoreR =
          CENTER_R + (ORBIT - CENTER_R) * (n.score / 100);
        const x = CENTER + Math.cos(n.angle) * scoreR;
        const y = CENTER + Math.sin(n.angle) * scoreR;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [nodes]);

  // ── Dimension arc paths ──
  const arcPaths = useMemo(() => {
    return nodes.map((n) => {
      const scoreR = CENTER_R + (ORBIT - CENTER_R) * (n.score / 100);
      const startAngle = n.angle - HALF_SLICE;
      const endAngle = n.angle + HALF_SLICE;
      const x1 = CENTER + Math.cos(startAngle) * scoreR;
      const y1 = CENTER + Math.sin(startAngle) * scoreR;
      const x2 = CENTER + Math.cos(endAngle) * scoreR;
      const y2 = CENTER + Math.sin(endAngle) * scoreR;
      return {
        d: `M ${x1.toFixed(1)},${y1.toFixed(1)} A ${scoreR.toFixed(1)},${scoreR.toFixed(1)} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)}`,
        color: n.color,
        loaded: n.status === "loaded",
      };
    });
  }, [nodes]);

  // ── Hexagonal mesh (adjacent node connections) ──
  const meshEdges = useMemo(() => {
    return nodes.map((n, i) => {
      const next = nodes[(i + 1) % nodes.length];
      return { x1: n.cx, y1: n.cy, x2: next.cx, y2: next.cy };
    });
  }, [nodes]);

  // ── Correlation edges ──
  const corrEdges = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return correlations
      .map((corr) => {
        const a = nodeMap.get(corr.dimensions[0]);
        const b = nodeMap.get(corr.dimensions[1]);
        if (!a || !b) return null;
        const midX = (a.cx + b.cx) / 2;
        const midY = (a.cy + b.cy) / 2;
        const curveX = midX + (CENTER - midX) * 0.3;
        const curveY = midY + (CENTER - midY) * 0.3;
        const path = `M ${a.cx},${a.cy} Q ${curveX},${curveY} ${b.cx},${b.cy}`;
        const isAmplifying = corr.impact === "amplifying";
        return {
          id: corr.id,
          path,
          strength: corr.strength,
          color: isAmplifying
            ? "var(--color-rose-400)"
            : "var(--color-emerald-400)",
          opacity: corr.strength * (isAmplifying ? 0.35 : 0.2),
          width: 1 + corr.strength * 2,
          dur: `${(3 - corr.strength).toFixed(1)}s`,
        };
      })
      .filter(Boolean);
  }, [nodes, correlations]);

  // ── Derived ──
  const urgencyCfg =
    URGENCY_LEVELS[urgencyLevel] ?? URGENCY_LEVELS.medium;

  const centerColor =
    phase === "idle"
      ? "var(--color-silver-500)"
      : phase === "analyzing"
        ? "var(--color-gold-400)"
        : urgencyCfg.color;

  const loadedCount = dimensions.filter(
    (d) => d.status === "loaded",
  ).length;
  const statusProgress = loadedCount / DIM_COUNT;
  const statusCircumference = 2 * Math.PI * (CENTER_R + 5);

  // ── Sweep wedge geometry (30° cone) ──
  const sweepAngle = 30;
  const sweepRad = (sweepAngle * Math.PI) / 180;
  const sweepStartX = CENTER + ORBIT * Math.cos(-sweepRad / 2);
  const sweepStartY = CENTER + ORBIT * Math.sin(-sweepRad / 2);
  const sweepEndX = CENTER + ORBIT * Math.cos(sweepRad / 2);
  const sweepEndY = CENTER + ORBIT * Math.sin(sweepRad / 2);
  const sweepPath = `M ${CENTER},${CENTER} L ${sweepStartX.toFixed(1)},${sweepStartY.toFixed(1)} A ${ORBIT},${ORBIT} 0 0,1 ${sweepEndX.toFixed(1)},${sweepEndY.toFixed(1)} Z`;

  const phaseLabel =
    phase === "idle"
      ? "LISTO"
      : phase === "analyzing"
        ? `${loadedCount}/6`
        : phase === "correlating"
          ? "CORR"
          : "SCORE";

  return (
    <div
      className="fm-const"
      data-testid="intelligence-constellation"
      data-phase={phase}
      data-urgency={urgencyLevel}
      role="img"
      aria-label={`Constelación de inteligencia: score ${compositeScore}, urgencia ${urgencyLevel}`}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="fm-const__svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ══════ §0  Defs ══════ */}
        <defs>
          {/* Glow filter — standard */}
          <filter
            id="fm-const-glow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="3"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow filter — strong (critical nodes) */}
          <filter
            id="fm-const-glow-strong"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="5"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Vignette gradient */}
          <radialGradient id="fm-const-vignette">
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(8,12,18,0.4)" />
          </radialGradient>

          {/* Score polygon fill gradient */}
          <radialGradient id="fm-const-poly-fill">
            <stop offset="0%" stopColor={urgencyCfg.color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={urgencyCfg.color} stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* ══════ §1  Vignette ══════ */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={ORBIT + 20}
          fill="url(#fm-const-vignette)"
        />

        {/* ══════ §2  Guide Rings ══════ */}
        {[1, 2, 3].map((i) => (
          <circle
            key={`ring-${i}`}
            cx={CENTER}
            cy={CENTER}
            r={CENTER_R + ((ORBIT - CENTER_R) / 3) * i}
            fill="none"
            stroke="rgba(255,255,255,0.025)"
            strokeWidth="0.5"
          />
        ))}

        {/* ══════ §3  Hexagonal Mesh ══════ */}
        {meshEdges.map((e, i) => (
          <line
            key={`mesh-${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="rgba(255,255,255,0.025)"
            strokeWidth="0.5"
          />
        ))}

        {/* ══════ §4  Spokes (center → nodes) ══════ */}
        {nodes.map((n) => (
          <line
            key={`spoke-${n.id}`}
            x1={CENTER}
            y1={CENTER}
            x2={n.cx}
            y2={n.cy}
            stroke={
              n.status === "loaded"
                ? n.color
                : "rgba(255,255,255,0.04)"
            }
            strokeWidth="0.5"
            opacity={n.status === "loaded" ? 0.2 : 0.04}
            strokeDasharray={
              n.status === "thinking" ? "3 3" : "none"
            }
          >
            {n.status === "thinking" && !reduced && (
              <animate
                attributeName="stroke-dashoffset"
                values="0;-6"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </line>
        ))}

        {/* ══════ §5  Dimension Arcs ══════ */}
        {arcPaths.map((arc, i) => (
          <path
            key={`arc-${i}`}
            d={arc.d}
            fill={arc.color}
            fillOpacity={arc.loaded ? 0.06 : 0.015}
            stroke={arc.color}
            strokeWidth={arc.loaded ? 0.75 : 0.25}
            strokeOpacity={arc.loaded ? 0.25 : 0.05}
          />
        ))}

        {/* ══════ §6  Score Polygon ══════ */}
        {phase !== "idle" && (
          <polygon
            points={scorePoints}
            fill="url(#fm-const-poly-fill)"
            stroke={urgencyCfg.color}
            strokeWidth="1.5"
            strokeOpacity="0.35"
            strokeLinejoin="round"
            filter="url(#fm-const-glow)"
          />
        )}

        {/* ══════ §7  Score Vertices ══════ */}
        {phase !== "idle" &&
          nodes.map((n) => {
            if (n.status !== "loaded") return null;
            const scoreR =
              CENTER_R + (ORBIT - CENTER_R) * (n.score / 100);
            const sx = CENTER + Math.cos(n.angle) * scoreR;
            const sy = CENTER + Math.sin(n.angle) * scoreR;
            return (
              <circle
                key={`vertex-${n.id}`}
                cx={sx}
                cy={sy}
                r="2.5"
                fill={n.color}
                opacity="0.7"
              />
            );
          })}

        {/* ══════ §8  Correlation Edges ══════ */}
        {corrEdges.map((edge) =>
          edge ? (
            <g key={edge.id}>
              <path
                d={edge.path}
                fill="none"
                stroke={edge.color}
                strokeWidth={edge.width}
                opacity={edge.opacity}
                strokeLinecap="round"
              />
              {!reduced && (
                <circle r="1.5" fill={edge.color} opacity="0.6">
                  <animateMotion
                    dur={edge.dur}
                    repeatCount="indefinite"
                    path={edge.path}
                  />
                </circle>
              )}
            </g>
          ) : null,
        )}

        {/* ══════ §9  Radar Sweep ══════ */}
        {phase !== "idle" && !reduced && (
          <g className="fm-const__sweep">
            <path
              d={sweepPath}
              fill={urgencyCfg.color}
              fillOpacity="0.04"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${CENTER} ${CENTER}`}
                to={`360 ${CENTER} ${CENTER}`}
                dur="8s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        )}

        {/* ══════ §10  Status Ring (loaded progress) ══════ */}
        {phase !== "idle" && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={CENTER_R + 5}
            fill="none"
            stroke={centerColor}
            strokeWidth="1.5"
            strokeDasharray={`${
              statusProgress * statusCircumference
            } ${statusCircumference}`}
            strokeLinecap="round"
            opacity="0.35"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        )}

        {/* ══════ §11  Dimension Nodes ══════ */}
        {nodes.map((n) => {
          const isUrgent =
            n.urgency === "critical" || n.urgency === "high";
          const isThinking = n.status === "thinking";

          return (
            <g key={n.id}>
              {/* Pulse ring for urgent nodes */}
              {isUrgent && n.status === "loaded" && !reduced && (
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r={n.nodeR + 4}
                  fill="none"
                  stroke={n.color}
                  strokeWidth="0.75"
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    values={`${n.nodeR + 2};${n.nodeR + 12}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.4;0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Node circle */}
              <circle
                cx={n.cx}
                cy={n.cy}
                r={n.nodeR}
                fill={
                  n.status === "loaded"
                    ? n.color
                    : "rgba(30,36,48,0.8)"
                }
                fillOpacity={n.status === "loaded" ? 0.15 : 1}
                stroke={
                  n.status === "loaded"
                    ? n.color
                    : "rgba(255,255,255,0.06)"
                }
                strokeWidth={n.status === "loaded" ? 1.5 : 0.75}
                filter={
                  isUrgent && n.status === "loaded"
                    ? "url(#fm-const-glow-strong)"
                    : undefined
                }
              />

              {/* Score text */}
              {n.status === "loaded" && (
                <text
                  x={n.cx}
                  y={n.cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={n.color}
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fontWeight="700"
                >
                  {n.score}
                </text>
              )}

              {/* Thinking dots */}
              {isThinking && !reduced && (
                <>
                  {[0, 1, 2].map((dot) => (
                    <circle
                      key={dot}
                      cx={n.cx - 4 + dot * 4}
                      cy={n.cy}
                      r="1.2"
                      fill="var(--color-gold-400)"
                      opacity="0"
                    >
                      <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="1.2s"
                        begin={`${dot * 0.2}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </>
              )}

              {/* Label */}
              <text
                x={n.cx}
                y={
                  n.cy < CENTER
                    ? n.cy - n.nodeR - 6
                    : n.cy + n.nodeR + 11
                }
                textAnchor="middle"
                dominantBaseline={
                  n.cy < CENTER ? "auto" : "hanging"
                }
                fill={
                  n.status === "loaded"
                    ? "var(--color-silver-400)"
                    : "var(--color-silver-600)"
                }
                fontSize="7.5"
                fontFamily="var(--font-mono)"
                fontWeight="600"
                letterSpacing="0.06em"
              >
                {n.shortLabel}
              </text>
            </g>
          );
        })}

        {/* ══════ §12  Center Vital Sign ══════ */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={CENTER_R}
          fill={
            phase === "idle"
              ? "rgba(30,36,48,0.9)"
              : centerColor
          }
          fillOpacity={phase === "idle" ? 1 : 0.1}
          stroke={centerColor}
          strokeWidth={phase === "idle" ? 0.75 : 2}
          opacity={phase === "idle" ? 0.4 : 1}
        />

        {/* Center breathing glow */}
        {phase !== "idle" && !reduced && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={CENTER_R}
            fill="none"
            stroke={centerColor}
            strokeWidth="0.75"
            opacity="0"
          >
            <animate
              attributeName="r"
              values={`${CENTER_R};${CENTER_R + 10}`}
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Center score */}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={
            phase === "idle"
              ? "var(--color-silver-500)"
              : centerColor
          }
          fontSize="16"
          fontFamily="var(--font-mono)"
          fontWeight="700"
        >
          {phase === "idle" ? "—" : compositeScore}
        </text>

        {/* Center phase label */}
        <text
          x={CENTER}
          y={CENTER + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-silver-500)"
          fontSize="7"
          fontFamily="var(--font-mono)"
          fontWeight="600"
          letterSpacing="0.08em"
        >
          {phaseLabel}
        </text>
      </svg>
    </div>
  );
}