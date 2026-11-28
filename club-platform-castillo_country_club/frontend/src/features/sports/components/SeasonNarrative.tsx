// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SeasonNarrative.tsx
// §B3.9 — Season Narrative
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// Vertical timeline: the season as a drama in 5 acts.
// Each act is a chapter. Turning points are special markers.
// The current act glows. Progress bar at top.
// Living Protocol: 7/7
//
// Aha Moment: "La temporada es una historia. ¿En qué acto estamos?"
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SeasonNarrative
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Sunrise,
  Swords,
  Flame,
  Trophy,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  SeasonNarrative as SeasonNarrativeData,
  SeasonChapter,
  SeasonAct,
  TurningPoint,
  SportsDashboardMode,
} from "../types";
import { SEASON_ACT_CONFIG } from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./SeasonNarrative.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SeasonNarrativeProps {
  narrative: SeasonNarrativeData | null;
  ambientMode?: SportsDashboardMode;
  onChapterSelect?: (act: SeasonAct) => void;
  onTurningPointSelect?: (tp: TurningPoint) => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const ACT_ORDER: SeasonAct[] = [
  "opening",
  "rivalries_emerge",
  "climax",
  "championship",
  "epilogue",
] as SeasonAct[];

const ACT_ICONS: Record<SeasonAct, typeof Sunrise> = {
  opening: Sunrise,
  rivalries_emerge: Swords,
  climax: Flame,
  championship: Trophy,
  epilogue: BookOpen,
};

const ACT_ROMAN: Record<SeasonAct, string> = {
  opening: "I",
  rivalries_emerge: "II",
  climax: "III",
  championship: "IV",
  epilogue: "V",
};

// ═══════════════════════════════════════════════════════════
// §3 — NARRATIVE HELPERS
// ═══════════════════════════════════════════════════════════

function computeProgress(narrative: SeasonNarrativeData): number {
  if (narrative.totalMatches === 0) return 0;
  return Math.round(
    (narrative.completedMatches / narrative.totalMatches) * 100,
  );
}

function findTurningPointsForAct(
  turningPoints: TurningPoint[],
  _act: SeasonAct,
  startDate: string,
  endDate: string,
): TurningPoint[] {
  return turningPoints.filter(
    (tp) => tp.date >= startDate && tp.date <= endDate,
  );
}

function buildNarrative(
  narrative: SeasonNarrativeData,
  progress: number,
): string {
  const actConfig = SEASON_ACT_CONFIG[narrative.currentAct];
  const currentChapter = narrative.chapters.find(
    (ch) => ch.act === narrative.currentAct,
  );
  const chapterNarrative = currentChapter?.narrative ?? "";
  const nextActIndex =
    ACT_ORDER.indexOf(narrative.currentAct) + 1;
  const nextAct =
    nextActIndex < ACT_ORDER.length
      ? SEASON_ACT_CONFIG[ACT_ORDER[nextActIndex]].label
      : null;
  const nextPart = nextAct
    ? ` Próximo acto: ${nextAct}.`
    : " Temporada en su tramo final.";

  const championPart = narrative.predictedChampion
    ? ` Campeón predicho: socio ${narrative.predictedChampion.memberId} (${narrative.predictedChampion.probability}% confianza).`
    : "";

  return `${actConfig.label} — ${chapterNarrative} Progreso: ${progress}%.${nextPart}${championPart}`;
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 ProgressBar ─────────────────────────────────────

function ProgressBar({
  progress,
  ambientMode,
}: {
  progress: number;
  ambientMode: SportsDashboardMode;
}) {
  return (
    <div
      className="spt-season__progress"
      data-mode={ambientMode}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progreso de temporada: ${progress}%`}
    >
      <div className="spt-season__progress-track">
        <div
          className="spt-season__progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="spt-season__progress-label">{progress}%</span>
    </div>
  );
}

// ── §4.2 TurningPointMarker ──────────────────────────────

function TurningPointMarker({
  tp,
  onSelect,
  ambientMode,
}: {
  tp: TurningPoint;
  onSelect?: (tp: TurningPoint) => void;
  ambientMode: SportsDashboardMode;
}) {
  return (
    <Button
      variant="unstyled"
      type="button"
      className="spt-season__turning"
      data-mode={ambientMode}
      onClick={() => onSelect?.(tp)}
      title={`${tp.event} — ${tp.impact}`}
    >
      <AlertTriangle className="spt-season__turning-icon" />
      <div className="spt-season__turning-content">
        <p className="spt-season__turning-event">{tp.event}</p>
        <p className="spt-season__turning-impact">{tp.impact}</p>
        <p className="spt-season__turning-state">
          <span className="spt-season__turning-before">{tp.beforeState}</span>
          <span className="spt-season__turning-arrow">→</span>
          <span className="spt-season__turning-after">{tp.afterState}</span>
        </p>
      </div>
    </Button>
  );
}

// ── §4.3 ChapterCard ─────────────────────────────────────

function ChapterCard({
  chapter,
  isCurrent,
  turningPoints,
  ambientMode,
  onSelect,
  onTurningPointSelect,
}: {
  chapter: SeasonChapter;
  isCurrent: boolean;
  turningPoints: TurningPoint[];
  ambientMode: SportsDashboardMode;
  onSelect?: (act: SeasonAct) => void;
  onTurningPointSelect?: (tp: TurningPoint) => void;
}) {
  const [expanded, setExpanded] = useState(isCurrent);
  const Icon = ACT_ICONS[chapter.act] ?? Sunrise;
  return (
    <article
      className="spt-season__chapter"
      data-act={chapter.act}
      data-current={isCurrent}
      data-mode={ambientMode}
    >
      {/* ── Timeline node ── */}
      <div className="spt-season__node" data-current={isCurrent}>
        <span className="spt-season__roman">{ACT_ROMAN[chapter.act]}</span>
      </div>

      {/* ── Content ── */}
      <div className="spt-season__chapter-body">
        {/* ── Header ── */}
        <Button
          variant="unstyled"
          type="button"
          className="spt-season__chapter-header"
          onClick={() => {
            setExpanded((prev) => !prev);
            onSelect?.(chapter.act);
          }}
          aria-expanded={expanded}
        >
          <div className="spt-season__chapter-title-row">
            <Icon className="spt-season__chapter-icon" />
            <h4 className="spt-season__chapter-title">{chapter.title}</h4>
            {isCurrent && (
              <span className="spt-season__current-badge">ACTUAL</span>
            )}
          </div>
          <span className="spt-season__chapter-date">
            {formatDateRange(chapter.startDate, chapter.endDate)}
          </span>
          <span className="spt-season__chapter-drama">
            Drama: {chapter.dramaScore}/100
          </span>
          {expanded ? (
            <ChevronUp className="spt-season__chevron" />
          ) : (
            <ChevronDown className="spt-season__chevron" />
          )}
        </Button>

        {/* ── Expanded content ── */}
        {expanded && (
          <div className="spt-season__chapter-detail">
            <p className="spt-season__chapter-narrative">{chapter.narrative}</p>

            {chapter.highlights.length > 0 && (
              <ul className="spt-season__highlights">
                {chapter.highlights.map((h, i) => (
                  <li key={i} className="spt-season__highlight">
                    {h}
                  </li>
                ))}
              </ul>
            )}

            {turningPoints.length > 0 && (
              <div className="spt-season__turnings">
                <p className="spt-season__turnings-label">
                  Momentos clave:
                </p>
                {turningPoints.map((tp, i) => (
                  <TurningPointMarker
                    key={`tp-${i}`}
                    tp={tp}
                    onSelect={onTurningPointSelect}
                    ambientMode={ambientMode}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ── §4.4 PredictionCard ──────────────────────────────────

function PredictionCard({
  predictedChampion,
  ambientMode,
}: {
  predictedChampion: { memberId: string; probability: number };
  ambientMode: SportsDashboardMode;
}) {
  return (
    <div className="spt-season__prediction" data-mode={ambientMode}>
      <Trophy className="spt-season__prediction-icon" />
      <div className="spt-season__prediction-content">
        <p className="spt-season__prediction-label">Campeón predicho</p>
        <p className="spt-season__prediction-value">
          Socio {predictedChampion.memberId}
          <span className="spt-season__prediction-confidence">
            {predictedChampion.probability}% confianza
          </span>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SeasonNarrative({
  narrative,
  ambientMode = "calm",
  onChapterSelect,
  onTurningPointSelect,
}: SeasonNarrativeProps) {
  const progress = useMemo(
    () => (narrative ? computeProgress(narrative) : 0),
    [narrative],
  );

  const narrativeText = useMemo(
    () => (narrative ? buildNarrative(narrative, progress) : ""),
    [narrative, progress],
  );

  const turningPointsByAct = useCallback(
    (act: SeasonAct, startDate: string, endDate: string): TurningPoint[] => {
      if (!narrative) return [];
      return findTurningPointsForAct(
        narrative.turningPoints,
        act,
        startDate,
        endDate,
      );
    },
    [narrative],
  );

  // ── §5.1 — Degraded: no data ──────────────────────────
  if (!narrative || narrative.chapters.length === 0) {
    return (
      <section
        className="spt-season"
        data-mode={ambientMode}
        role="region"
        aria-label="Narrativa de temporada"
      >
        <EmptyState
          icon={<Trophy className="w-5 h-5" />}
          title="Sin temporada activa"
          description="Cuando haya una temporada configurada con partidos y torneos, la narrativa se construirá automáticamente mostrando los 5 actos del drama deportivo."
          compact
        />
      </section>
    );
  }

  // ── §5.2 — Render ─────────────────────────────────────
  return (
    <section
      className="spt-season"
      data-mode={ambientMode}
      role="region"
      aria-label={narrativeText}
    >
      {/* ── Header ── */}
      <div className="spt-season__header">
        <h3 className="spt-season__title">
          Temporada: {SEASON_ACT_CONFIG[narrative.currentAct].label}
        </h3>
        <span className="spt-season__matches">
          {narrative.completedMatches}/{narrative.totalMatches} partidos
        </span>
      </div>

      {/* ── Progress bar ── */}
      <ProgressBar progress={progress} ambientMode={ambientMode} />

      {/* ── Prediction (if available) ── */}
      {narrative.predictedChampion && (
        <PredictionCard
          predictedChampion={narrative.predictedChampion}
          ambientMode={ambientMode}
        />
      )}

      {/* ── Timeline: 5 Acts ── */}
      <div className="spt-season__timeline" role="list">
        {ACT_ORDER.map((act, i) => {
          const chapter = narrative.chapters.find((ch) => ch.act === act);
          if (!chapter) return null;
          const isCurrent = act === narrative.currentAct;
          const tps = turningPointsByAct(
            act,
            chapter.startDate,
            chapter.endDate,
          );

          return (
            <div
              key={act}
              className="spt-season__timeline-item"
              style={{ "--stagger-i": i } as React.CSSProperties}
              role="listitem"
            >
              <ChapterCard
                chapter={chapter}
                isCurrent={isCurrent}
                turningPoints={tps}
                ambientMode={ambientMode}
                onSelect={onChapterSelect}
                onTurningPointSelect={onTurningPointSelect}
              />
            </div>
          );
        })}
      </div>

      {/* ── Footer: Summary ── */}
      <div className="spt-season__footer">
        <p className="spt-season__summary">{narrative.narrativeSummary}</p>
        {narrative.rivalries.length > 0 && (
          <p className="spt-season__rivalries">
            ⚔️ {narrative.rivalries.length} rivalidad
            {narrative.rivalries.length > 1 ? "es" : ""} activa
            {narrative.rivalries.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </section>
  );
}