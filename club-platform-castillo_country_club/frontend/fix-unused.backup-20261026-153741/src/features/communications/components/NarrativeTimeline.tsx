// src/features/communications/components/NarrativeTimeline.tsx
// ═══════════════════════════════════════════════════════════
// Narrative Timeline — The Living Novel
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a timeline of events. A NOVEL — the story of the
// member-club relationship told in chapters.
//
// Visualizations:
//   1. Story Arc — SVG curve tracing the narrative arc
//   2. Chapter Cards — expandible story beats
//   3. Foreshadowing — dashed markers for predicted events
//   4. Callbacks Ribbon — pending commitments
//   5. Story Health Gauge — strong/fragile/breaking
//
// The system doesn't just track interactions.
// It tells the STORY of the relationship.
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useCallback } from "react";

import type {
  NarrativeArc,
  NarrativeChapter,
  NarrativePhase,
  SentimentLevel,
  ConversationMemoryNode,
} from "../types";

import {
  NARRATIVE_PHASE_CONFIG,
  STORY_HEALTH_CONFIG,
} from "../types";

import type {
  ContinuityContext,
  NarrativeBriefing,
} from "../lib/narrativeEngine";

import {
  buildContinuityContext,
  generateNarrativeBriefing,
  computeNarrativeMomentum,
  generateCallbackContext,
} from "../lib/narrativeEngine";

import "./NarrativeTimeline.css";

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface NarrativeTimelineProps {
  arc: NarrativeArc | null;
  nodes: ConversationMemoryNode[];
  silenceDays: number;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const SENTIMENT_VALUES: Record<SentimentLevel, number> = {
  very_positive: 90,
  positive: 70,
  neutral: 50,
  negative: 30,
  very_negative: 10,
};

const SENTIMENT_LABELS: Record<SentimentLevel, string> = {
  very_positive: "Muy positivo",
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
  very_negative: "Muy negativo",
};

/** Build SVG arc path from chapter sentiments. */
function buildArcPath(
  chapters: NarrativeChapter[],
  width: number,
  height: number,
  padX: number,
  padY: number,
): string {
  if (chapters.length === 0) return "";
  if (chapters.length === 1) {
    const y = padY + ((100 - SENTIMENT_VALUES[chapters[0].sentiment]) / 100) * (height - padY * 2);
    return `M ${padX} ${y} L ${width - padX} ${y}`;
  }

  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const step = usableW / (chapters.length - 1);

  const points = chapters.map((ch: NarrativeChapter, i: number) => ({
    x: padX + i * step,
    y: padY + ((100 - SENTIMENT_VALUES[ch.sentiment]) / 100) * usableH,
  }));

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

/** Map narrative phase to step index for the phase indicator. */
function phaseToStep(phase: NarrativePhase): number {
  const map: Record<NarrativePhase, number> = {
    setup: 0,
    development: 1,
    climax: 2,
    resolution: 3,
  };
  return map[phase] ?? 0;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function NarrativeTimeline({
  arc,
  nodes,
  silenceDays,
}: NarrativeTimelineProps) {
  // ── Expanded chapter state ────────────────────────────
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  const toggleChapter = useCallback((chapterId: string) => {
    setExpandedChapter((prev: string | null) =>
      prev === chapterId ? null : chapterId,
    );
  }, []);

  // ── Derived intelligence ──────────────────────────────
  useMemo(() => {
        if (!arc) return null;
        return buildContinuityContext(arc, nodes);
      }, [arc, nodes]);

  const briefing: NarrativeBriefing | null = useMemo(() => {
    if (!arc) return null;
    return generateNarrativeBriefing(arc, nodes, silenceDays);
  }, [arc, nodes, silenceDays]);

  const momentum = useMemo(
    () => (arc ? computeNarrativeMomentum(arc) : 0),
    [arc],
  );

  const callbacks = useMemo(() => {
    if (!arc || nodes.length === 0) return [];
    return generateCallbackContext(arc, nodes, 5);
  }, [arc, nodes]);

  // ── SVG constants ─────────────────────────────────────
  const svgW = 560;
  const svgH = 140;
  const padX = 30;
  const padY = 25;

  // ── Arc path ──────────────────────────────────────────
  const arcPath = useMemo(
    () =>
      arc && arc.chapters.length > 0
        ? buildArcPath(arc.chapters, svgW, svgH, padX, padY)
        : "",
    [arc],
  );

  // ── Chapter positions on arc ──────────────────────────
  const chapterPoints = useMemo(() => {
    if (!arc || arc.chapters.length === 0) return [];
    const usableW = svgW - padX * 2;
    const usableH = svgH - padY * 2;
    const step = usableW / Math.max(arc.chapters.length - 1, 1);
    return arc.chapters.map((ch: NarrativeChapter, i: number) => ({
      x: padX + i * step,
      y: padY + ((100 - SENTIMENT_VALUES[ch.sentiment]) / 100) * usableH,
      chapter: ch,
    }));
  }, [arc]);

  // ── Phase step ────────────────────────────────────────
  const currentPhaseStep = arc ? phaseToStep(arc.current_phase) : 0;

  // ── Empty state ───────────────────────────────────────
  if (!arc || arc.chapters.length === 0) {
    return (
      <div className="glass-comm-narrative" data-health="strong" data-phase="setup">
        <div className="narrative__header">
          <span className="narrative__title">La Novela</span>
        </div>
        <div className="narrative__empty">
          <span>Sin narrativa de comunicación — la historia aún no comienza</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-narrative"
      data-health={arc.story_health}
      data-phase={arc.current_phase}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className="narrative__header">
        <span className="narrative__title">La Novela</span>
        <div className="narrative__health-badge" data-health={arc.story_health}>
          {STORY_HEALTH_CONFIG[arc.story_health].label}
        </div>
      </div>

      {/* ── Phase indicator ─────────────────────────── */}
      <div className="narrative__phases">
        {(Object.keys(NARRATIVE_PHASE_CONFIG) as NarrativePhase[]).map(
          (phase: NarrativePhase, i: number) => {
            const cfg = NARRATIVE_PHASE_CONFIG[phase];
            const isActive = i === currentPhaseStep;
            const isPast = i < currentPhaseStep;
            return (
              <div
                key={phase}
                className="narrative__phase-step"
                data-active={isActive}
                data-past={isPast}
              >
                <div className="narrative__phase-dot" />
                <span className="narrative__phase-label">{cfg.label}</span>
              </div>
            );
          },
        )}
        {/* Connecting line */}
        <div className="narrative__phase-line">
          <div
            className="narrative__phase-line-fill"
            style={{ width: `${(currentPhaseStep / 3) * 100}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* ── Story Arc SVG ──────────────────────────── */}
      <div className="narrative__arc-visual">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="narrative__arc-svg"
          role="img"
          aria-label={`Narrative arc with ${arc.chapters.length} chapters, story health: ${STORY_HEALTH_CONFIG[arc.story_health].label}`}
        >
          <defs>
            <linearGradient id="narrative-arc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="narrative__arc-fill-top" stopOpacity="0.15" />
              <stop offset="100%" className="narrative__arc-fill-bottom" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Phase zone bands */}
          {arc.chapters.length > 1 && (
            <>
              <rect
                x={padX}
                y={padY}
                width={(svgW - padX * 2) / 4}
                height={svgH - padY * 2}
                className="narrative__phase-band"
                data-phase="setup"
                opacity="0.04"
              />
              <rect
                x={padX + (svgW - padX * 2) / 4}
                y={padY}
                width={(svgW - padX * 2) / 4}
                height={svgH - padY * 2}
                className="narrative__phase-band"
                data-phase="development"
                opacity="0.04"
              />
            </>
          )}

          {/* Area fill */}
          {arcPath && (
            <path
              d={`${arcPath} L ${svgW - padX} ${svgH - padY} L ${padX} ${svgH - padY} Z`}
              fill="url(#narrative-arc-fill)"
            />
          )}

          {/* Main arc curve */}
          {arcPath && (
            <path
              d={arcPath}
              className="narrative__arc-curve"
              data-health={arc.story_health}
              fill="none"
            />
          )}

          {/* Chapter points */}
          {chapterPoints.map(
            (pt: { x: number; y: number; chapter: NarrativeChapter }, i: number) => (
              <g
                key={pt.chapter.id}
                className="narrative__arc-point"
                data-sentiment={pt.chapter.sentiment}
                data-expanded={expandedChapter === pt.chapter.id}
              >
                {/* Outer pulse ring */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="8"
                  className="narrative__arc-pulse"
                  data-sentiment={pt.chapter.sentiment}
                />
                {/* Main dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  className="narrative__arc-dot"
                  data-sentiment={pt.chapter.sentiment}
                />
                {/* Chapter number */}
                <text
                  x={pt.x}
                  y={pt.y + 1.5}
                  className="narrative__arc-number"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {i + 1}
                </text>
              </g>
            ),
          )}

          {/* Foreshadowing marker (predicted next event) */}
          {arc.next_predicted_event && chapterPoints.length > 0 && (
            <g className="narrative__foreshadow">
              <circle
                cx={svgW - padX + 15}
                cy={svgH / 2}
                r="6"
                className="narrative__foreshadow-dot"
              />
              <text
                x={svgW - padX + 15}
                y={svgH / 2 + 18}
                className="narrative__foreshadow-label"
                textAnchor="middle"
              >
                {arc.next_predicted_event}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ── Chapter Cards ──────────────────────────── */}
      <div className="narrative__chapters">
        <span className="narrative__section-title">Capítulos</span>
        <div className="narrative__chapter-list">
          {arc.chapters.map((ch: NarrativeChapter, i: number) => {
            const isExpanded = expandedChapter === ch.id;
            const phaseCfg = NARRATIVE_PHASE_CONFIG[ch.phase];
            return (
              <div
                key={ch.id}
                className="narrative__chapter-card"
                data-sentiment={ch.sentiment}
                data-phase={ch.phase}
                data-expanded={isExpanded}
                style={{ "--stagger-i": i } as React.CSSProperties}
                onClick={() => toggleChapter(ch.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleChapter(ch.id);
                  }
                }}
              >
                <div className="narrative__chapter-header">
                  <div className="narrative__chapter-indicator" data-sentiment={ch.sentiment}>
                    <span className="narrative__chapter-number">{i + 1}</span>
                  </div>
                  <div className="narrative__chapter-info">
                    <span className="narrative__chapter-title">{ch.title}</span>
                    <span className="narrative__chapter-meta">
                      {phaseCfg.label} · {SENTIMENT_LABELS[ch.sentiment]} ·{" "}
                      {new Date(ch.date).toLocaleDateString("es-CR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <span className="narrative__chapter-nodes-count">
                    {ch.node_ids.length}
                  </span>
                </div>
                {isExpanded && (
                  <div className="narrative__chapter-expanded">
                    <p className="narrative__chapter-summary">{ch.summary}</p>
                    <span className="narrative__chapter-detail">
                      {ch.node_ids.length} interacción(es) en este capítulo
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Callbacks Ribbon ───────────────────────── */}
      {callbacks.length > 0 && (
        <div className="narrative__callbacks">
          <span className="narrative__section-title">
            Compromisos Pendientes ({callbacks.length})
          </span>
          <div className="narrative__callbacks-strip">
            {callbacks.map((cb: string, i: number) => (
              <div
                key={`cb-${i}`}
                className="narrative__callback-tag"
                style={{ "--stagger-i": i } as React.CSSProperties}
              >
                {cb}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Momentum Gauge ─────────────────────────── */}
      <div className="narrative__momentum">
        <span className="narrative__section-title">Momentum Narrativo</span>
        <div className="narrative__momentum-bar">
          <div
            className="narrative__momentum-fill"
            style={{ width: `${momentum}%` } as React.CSSProperties}
            data-momentum={momentum >= 60 ? "strong" : momentum >= 35 ? "moderate" : "weak"}
          />
        </div>
        <div className="narrative__momentum-info">
          <span className="narrative__momentum-score">{momentum}/100</span>
          <span className="narrative__momentum-label">
            {momentum >= 60
              ? "Narrativa sólida — relación en desarrollo"
              : momentum >= 35
                ? "Narrativa moderada — necesita atención"
                : "Narrativa débil — intervención recomendada"}
          </span>
        </div>
      </div>

      {/* ── Briefing (if available) ────────────────── */}
      {briefing && (
        <div className="narrative__briefing">
          <span className="narrative__section-title">Briefing Narrativo</span>
          <div className="narrative__briefing-content">
            <div className="narrative__briefing-row">
              <span className="narrative__briefing-label">Resumen</span>
              <span className="narrative__briefing-value">{briefing.arcSummary}</span>
            </div>
            <div className="narrative__briefing-row">
              <span className="narrative__briefing-label">Enfoque Recomendado</span>
              <span className="narrative__briefing-value">{briefing.recommendedApproach}</span>
            </div>
            {briefing.keyMoments.length > 0 && (
              <div className="narrative__briefing-row">
                <span className="narrative__briefing-label">Momentos Clave</span>
                <div className="narrative__briefing-moments">
                  {briefing.keyMoments.map((km: string, i: number) => (
                    <span key={i} className="narrative__briefing-moment">
                      {km}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}