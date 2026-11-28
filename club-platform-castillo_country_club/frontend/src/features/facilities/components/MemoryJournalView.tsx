// src/features/facilities/components/MemoryJournalView.tsx
// ═══════════════════════════════════════════════════════════════
// MEMORY JOURNAL VIEW — "El Diario"
//
// The living memory of each space. Shows:
//   - Narrative chapters (milestone/anomaly/learning/pattern)
//   - Discovered insights with recommendations
//   - Personality evolution
//   - Query bar for conversational memory access
//
// MERGED: Their chapter timeline + insights + query bar
//         + Our living protocol + stagger + data-mode + hover
//         + CSS-extracted styles + narrative summary
//         + chapter type CSS-driven colors + memory stats
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — chapter entry stagger, query pulse
//   ✅ SENSE 2: REACCIÓN — chapter hover translateY(-1px)
//   ✅ SENSE 3: MEMORIA — chapter dates + insight count + stats
//   ✅ SENSE 4: INTENCIÓN — query bar as conversational interface
//   ✅ SENSE 5: SINIESTRÍA — anomaly chapters visually dominant
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — facility summary + chapter stories
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  FacilityNarrative,
  FacilityMemory,
  Facility,
  MemoryAnswer,
  NarrativeChapter,
  FacilitiesDashboardMode,
} from "../types";

import "./MemoryJournalView.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════
// CHAPTER TYPE CONFIG
// CSS-driven via data-type attribute (no inline styles)
// ═══════════════════════════════════════════════════════════════

const CHAPTER_TYPE_ICONS: Record<NarrativeChapter["type"], string> = {
  milestone: "★",
  anomaly: "⚠",
  learning: "◈",
  pattern: "↻",
};

const CHAPTER_TYPE_LABELS: Record<NarrativeChapter["type"], string> = {
  milestone: "Hito",
  anomaly: "Anomalía",
  learning: "Aprendizaje",
  pattern: "Patrón",
};

// ═══════════════════════════════════════════════════════════════
// NARRATIVE SUMMARY — Sense 7
// ═══════════════════════════════════════════════════════════════

function buildFacilitySummary(
  narrative: FacilityNarrative,
  facilityName: string,
): string {
  const chapterCount = narrative.chapters.length;
  const anomalyCount = narrative.chapters.filter((c) => c.type === "anomaly").length;
  const insightCount = narrative.insights.length;

  const parts: string[] = [];
  parts.push(`${facilityName} tiene ${chapterCount} capítulo${chapterCount !== 1 ? "s" : ""} en su memoria.`);

  if (anomalyCount > 0) {
    parts.push(`${anomalyCount} anomalía${anomalyCount !== 1 ? "s" : ""} registrada${anomalyCount !== 1 ? "s" : ""}.`);
  }

  if (insightCount > 0) {
    parts.push(`${insightCount} patrón${insightCount !== 1 ? "es" : ""} descubierto${insightCount !== 1 ? "s" : ""}.`);
  }

  if (narrative.personality_evolution) {
    parts.push("Evolución de personalidad disponible.");
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface MemoryJournalViewProps {
  narratives: Record<string, FacilityNarrative>;
  memories: Record<string, FacilityMemory>;
  facilities: Facility[];
  ambientMode?: FacilitiesDashboardMode;
  onQueryMemory?: (facilityId: string, query: string) => MemoryAnswer | null;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MemoryJournalView({ narratives, facilities, ambientMode = "calm", onQueryMemory }: MemoryJournalViewProps) {
  const prefersReduced = useReducedMotion();

  const [activeFacility, setActiveFacility] = useState<string | null>(
    facilities[0]?.id ?? null,
  );
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [queryAnswer, setQueryAnswer] = useState<MemoryAnswer | null>(null);

  // Current narrative + memory
  const narrative = activeFacility ? narratives[activeFacility] : null;
  const activeFacilityName = useMemo(() => {
    const f = facilities.find((f) => f.id === activeFacility);
    return f?.name ?? "";
  }, [facilities, activeFacility]);

  // Summary (Sense 7)
  const summary = useMemo(() => {
    if (!narrative || !activeFacilityName) return "";
    return buildFacilitySummary(narrative, activeFacilityName);
  }, [narrative, activeFacilityName]);

  // Handlers
  const handleChapterClick = useCallback((chapterId: string) => {
    setExpandedChapter((prev) => (prev === chapterId ? null : chapterId));
  }, []);

  const handleQuery = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeFacility || !queryText.trim()) return;

      const answer = onQueryMemory?.(activeFacility, queryText.trim());
      setQueryAnswer(answer ?? null);
    },
    [activeFacility, queryText, onQueryMemory],
  );

  const handleQueryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setQueryAnswer(null);
        setQueryText("");
      }
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div
      className="glass-fac-journal"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* ── Facility Selector ── */}
      <div className="glass-fac-journal__selector">
        <span className="glass-fac-journal__selector-label">Espacio</span>
        <div className="glass-fac-journal__selector-chips" role="tablist">
          {facilities.map((f) => {
            const isActive = activeFacility === f.id;
            return (
              <Button
                variant="unstyled"
                key={f.id}
                className="glass-fac-journal__chip"
                data-active={isActive ? "true" : undefined}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFacility(f.id)}
              >
                {f.name.length > 12 ? f.name.slice(0, 10) + "…" : f.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Facility Summary (Sense 7) ── */}
      {narrative && summary && (
        <p className="glass-fac-journal__summary">
          {summary}
        </p>
      )}

      {/* ── Timeline ── */}
      {narrative ? (
        <div className="glass-fac-journal__timeline">
          {narrative.chapters.map((chapter, chapterIndex) => {
            const isExpanded = expandedChapter === chapter.id;
            const icon = CHAPTER_TYPE_ICONS[chapter.type] ?? "•";
            const typeLabel = CHAPTER_TYPE_LABELS[chapter.type] ?? chapter.type;

            return (
              <div
                key={chapter.id}
                className="glass-fac-journal__chapter"
                data-type={chapter.type}
                data-expanded={isExpanded ? "true" : undefined}
                style={
                  prefersReduced
                    ? undefined
                    : ({ "--stagger-i": chapterIndex } as React.CSSProperties)
                }
                onClick={() => handleChapterClick(chapter.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleChapterClick(chapter.id);
                  }
                }}
                aria-expanded={isExpanded}
              >
                {/* Chapter header */}
                <div className="glass-fac-journal__chapter-header">
                  <span className="glass-fac-journal__chapter-icon" data-type={chapter.type}>
                    {icon}
                  </span>
                  <span className="glass-fac-journal__chapter-title">
                    {chapter.title}
                  </span>
                  <span className="glass-fac-journal__chapter-type-badge" data-type={chapter.type}>
                    {typeLabel}
                  </span>
                  <span className="glass-fac-journal__chapter-date">
                    {chapter.date}
                  </span>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="glass-fac-journal__chapter-body">
                    <div className="glass-fac-journal__chapter-story">
                      {chapter.story}
                    </div>
                    <div className="glass-fac-journal__chapter-impact">
                      {chapter.impact}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Insights Section (Sense 3: MEMORIA) ── */}
          {narrative.insights.length > 0 && (
            <div className="glass-fac-journal__insights">
              <div className="glass-fac-journal__insights-title">
                Patrones descubiertos ({narrative.insights.length})
              </div>
              {narrative.insights.map((insight, i) => (
                <div
                  key={i}
                  className="glass-fac-journal__insight-item"
                  style={
                    prefersReduced
                      ? undefined
                      : ({ "--stagger-i": i } as React.CSSProperties)
                  }
                >
                  <span className="glass-fac-journal__insight-pattern">
                    {insight.pattern}
                  </span>
                  {insight.recommendation && (
                    <span className="glass-fac-journal__insight-recommendation">
                      → {insight.recommendation}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Personality Evolution ── */}
          {narrative.personality_evolution && (
            <div className="glass-fac-journal__evolution">
              <div className="glass-fac-journal__evolution-title">
                Evolución de personalidad
              </div>
              <div className="glass-fac-journal__evolution-text">
                {narrative.personality_evolution}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="glass-fac-journal__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p className="glass-fac-journal__empty-text">
            {facilities.length === 0
              ? "Sin instalaciones disponibles."
              : "Selecciona un espacio para explorar su memoria."}
          </p>
          <p className="glass-fac-journal__empty-sub">
            El diario contiene capítulos, patrones y evolución de cada espacio.
          </p>
        </div>
      )}

      {/* ── Query Bar (Sense 4: INTENCIÓN — conversational memory) ── */}
      <form className="glass-fac-journal__query" onSubmit={handleQuery}>
        <svg
          className="glass-fac-journal__query-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="glass-fac-journal__query-input"
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          onKeyDown={handleQueryKeyDown}
          placeholder="Pregunta a la memoria..."
          aria-label="Preguntar a la memoria del espacio"
        />
        <Button
          variant="unstyled"
          type="submit"
          className="glass-fac-journal__query-submit"
          disabled={!queryText.trim() || !activeFacility}
          aria-label="Enviar pregunta"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </Button>
      </form>

      {/* ── Query Answer ── */}
      {queryAnswer && (
        <div className="glass-fac-journal__answer">
          <div className="glass-fac-journal__answer-text">
            {queryAnswer.answer}
          </div>
          <div className="glass-fac-journal__answer-confidence">
            <span className="glass-fac-journal__answer-confidence-label">
              Confianza
            </span>
            <div className="glass-fac-journal__answer-confidence-bar">
              <div
                className="glass-fac-journal__answer-confidence-fill"
                style={{ width: `${queryAnswer.confidence}%` }}
              />
            </div>
            <span className="glass-fac-journal__answer-confidence-value">
              {queryAnswer.confidence}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}