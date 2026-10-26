// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestMemoryGraph.tsx
// Phase 34 "The Gateway" — Signature: Guest Memory Graph
// Level 6+ Agency · Production Grade
//
// Per-guest memory visualization.
// Shows the club's persistent knowledge about a single guest:
//   - Emotional arc (sentiment over time)
//   - Topic patterns (recurring interests)
//   - Callbacks (promises made)
//   - Recall context (what staff should know NOW)
//
// Depends on: MemoryGraph (types.ts §11), RecallContext (guestMemory.ts)
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   MemoryGraph { guestId, nodes(MemoryNode[]), strength,
//     callbacks(Callback[]), emotionalArc(EmotionalArc),
//     topicPatterns(TopicPattern[]), lastUpdated }         ← types.ts §11 ✅
//   MemoryNode { interactionId, type, timestamp, sentiment,
//     topics(string[]), context(Record), recallPriority }  ← types.ts §11 ✅
//   Callback { id, description, promisedDate, status,
//     priority, createdAt }                                 ← types.ts §11 ✅
//   EmotionalArc { points, trend, peak, valley,
//     currentSentiment }                                    ← types.ts §11 ✅
//   EmotionalArcPoint { date, sentiment, event, trigger }  ← types.ts §11 ✅
//   TopicPattern { topic, frequency, avgSentiment,
//     lastMentioned, domains }                              ← types.ts §11 ✅
//   RecallContext { preferences, pendingCallbacks,
//     suggestedTopics, concerns, highlights }               ← guestMemory.ts §6 ✅
//   recallContext(memory: MemoryGraph) → RecallContext      ← guestMemory.ts §6 ✅
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  MemoryGraph,
  EmotionalArc,
  TopicPattern,
  Callback,
} from "../types";

import type { RecallContext } from "../lib/guestMemory";
import { recallContext } from "../lib/guestMemory";

import "./GuestMemoryGraph.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestMemoryGraphProps {
  /** Per-guest memory graph from the engine. null → empty state. */
  readonly memory: MemoryGraph | null;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Memory strength level from 0-100 score. */
function strengthLevel(strength: number): string {
  if (strength >= 80) return "deep";
  if (strength >= 60) return "strong";
  if (strength >= 40) return "moderate";
  if (strength >= 20) return "weak";
  return "minimal";
}

/** Human-readable strength label. */
function strengthLabel(strength: number): string {
  if (strength >= 80) return "Memoria profunda";
  if (strength >= 60) return "Memoria fuerte";
  if (strength >= 40) return "Memoria moderada";
  if (strength >= 20) return "Memoria débil";
  return "Memoria mínima";
}

/** Callback status symbol. */
function callbackStatusSymbol(status: Callback["status"]): string {
  switch (status) {
    case "pending": return "⏳";
    case "overdue": return "⚠";
    case "fulfilled": return "✓";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Trend symbol for emotional arc. */
function trendSymbol(trend: EmotionalArc["trend"]): string {
  switch (trend) {
    case "improving": return "↑";
    case "declining": return "↓";
    case "stable": return "→";
    default: {
      const _exhaustive: never = trend;
      return _exhaustive;
    }
  }
}

/** Sentiment to visual level. */
function sentimentLevel(sentiment: number): string {
  if (sentiment >= 0.5) return "positive";
  if (sentiment >= 0) return "neutral";
  if (sentiment >= -0.5) return "negative";
  return "critical";
}

/** Format ISO date to short display. */
function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return iso;
  }
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function EmotionalArcChart({ arc }: { readonly arc: EmotionalArc }) {
  if (arc.points.length === 0) return null;

  const minS = -1;
  const maxS = 1;
  const range = maxS - minS;

  return (
    <div className="gst-memory__arc">
      <div className="gst-memory__arc-header">
        <span className="gst-memory__arc-title">Arco emocional</span>
        <span className="gst-memory__arc-trend" data-trend={arc.trend}>
          {trendSymbol(arc.trend)}
        </span>
      </div>
      <div className="gst-memory__arc-chart" role="img" aria-label={`Arco emocional, tendencia ${arc.trend}`}>
        {arc.points.map((point, i) => {
          const normalized = (point.sentiment - minS) / range;
          const height = Math.max(4, normalized * 100);
          return (
            <div
              key={`point-${i}`}
              className="gst-memory__arc-bar"
              data-sentiment={sentimentLevel(point.sentiment)}
              style={{ height: `${height}%` }}
              title={`${formatShortDate(point.date)}: ${point.sentiment.toFixed(2)} — ${point.event}`}
            />
          );
        })}
      </div>
      <div className="gst-memory__arc-footer">
        <span className="gst-memory__arc-current">
          Actual: {arc.currentSentiment.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function TopicPatterns({ patterns }: { readonly patterns: readonly TopicPattern[] }) {
  if (patterns.length === 0) return null;

  return (
    <div className="gst-memory__topics">
      <h4 className="gst-memory__section-title">Patrones de interés</h4>
      <div className="gst-memory__topics-list" role="list" aria-label="Patrones de interés">
        {patterns.map((tp) => (
          <div key={tp.topic} className="gst-memory__topic" role="listitem">
            <span className="gst-memory__topic-name">{tp.topic}</span>
            <span className="gst-memory__topic-freq">{tp.frequency}×</span>
            <span
              className="gst-memory__topic-sentiment"
              data-sentiment={sentimentLevel(tp.avgSentiment)}
            >
              {tp.avgSentiment > 0 ? "+" : ""}{tp.avgSentiment.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CallbacksList({ callbacks }: { readonly callbacks: readonly Callback[] }) {
  if (callbacks.length === 0) return null;

  return (
    <div className="gst-memory__callbacks">
      <h4 className="gst-memory__section-title">Promesas pendientes</h4>
      <div className="gst-memory__callbacks-list" role="list" aria-label="Promesas pendientes">
        {callbacks.map((cb) => (
          <div
            key={cb.id}
            className="gst-memory__callback"
            data-status={cb.status}
            data-priority={cb.priority}
            role="listitem"
          >
            <span className="gst-memory__callback-status">{callbackStatusSymbol(cb.status)}</span>
            <span className="gst-memory__callback-desc">{cb.description}</span>
            {cb.promisedDate && (
              <span className="gst-memory__callback-date">
                {formatShortDate(cb.promisedDate)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecallPanel({ ctx }: { readonly ctx: RecallContext }) {
  const hasContent =
    ctx.preferences.length > 0 ||
    ctx.pendingCallbacks.length > 0 ||
    ctx.suggestedTopics.length > 0 ||
    ctx.concerns.length > 0 ||
    ctx.highlights.length > 0;

  if (!hasContent) return null;

  return (
    <div className="gst-memory__recall">
      <h4 className="gst-memory__section-title">Lo que el staff debe saber ahora</h4>
      <div className="gst-memory__recall-grid">
        {ctx.preferences.length > 0 && (
          <div className="gst-memory__recall-group">
            <span className="gst-memory__recall-label">Preferencias</span>
            <ul className="gst-memory__recall-list">
              {ctx.preferences.map((p) => (
                <li key={p} className="gst-memory__recall-item">{p}</li>
              ))}
            </ul>
          </div>
        )}
        {ctx.suggestedTopics.length > 0 && (
          <div className="gst-memory__recall-group">
            <span className="gst-memory__recall-label">Temas sugeridos</span>
            <ul className="gst-memory__recall-list">
              {ctx.suggestedTopics.map((t) => (
                <li key={t} className="gst-memory__recall-item">{t}</li>
              ))}
            </ul>
          </div>
        )}
        {ctx.concerns.length > 0 && (
          <div className="gst-memory__recall-group">
            <span className="gst-memory__recall-label">Preocupaciones</span>
            <ul className="gst-memory__recall-list">
              {ctx.concerns.map((c) => (
                <li key={c} className="gst-memory__recall-item gst-memory__recall-item--concern">{c}</li>
              ))}
            </ul>
          </div>
        )}
        {ctx.highlights.length > 0 && (
          <div className="gst-memory__recall-group">
            <span className="gst-memory__recall-label">Momentos positivos</span>
            <ul className="gst-memory__recall-list">
              {ctx.highlights.map((h) => (
                <li key={h} className="gst-memory__recall-item gst-memory__recall-item--highlight">{h}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Memory Graph — per-guest memory visualization.
 * Shows the club's persistent knowledge about a single guest:
 * emotional arc, topic patterns, callbacks, and recall context.
 *
 * @example
 * <GuestMemoryGraph memory={guestMemoryGraph} />
 */
export function GuestMemoryGraph({ memory }: GuestMemoryGraphProps) {
  // ── Derive recall context ──
  const recall: RecallContext | null = useMemo(
    () => (memory ? recallContext(memory) : null),
    [memory],
  );

  // ── Empty state ──
  if (!memory) {
    return (
      <div
        className="gst-memory"
        data-state="empty"
        role="region"
        aria-label="Memoria del invitado"
        data-testid="guest-memory-graph"
      >
        <p className="gst-memory__empty-text">
          No hay datos de memoria disponibles para este invitado.
        </p>
      </div>
    );
  }

  return (
    <div
      className="gst-memory"
      data-state="data"
      data-strength={strengthLevel(memory.strength)}
      role="region"
      aria-label={`Memoria del invitado — ${strengthLabel(memory.strength)}`}
      data-testid="guest-memory-graph"
    >
      {/* ── Header ── */}
      <div className="gst-memory__header">
        <div className="gst-memory__strength">
          <span className="gst-memory__strength-score">{memory.strength}</span>
          <span className="gst-memory__strength-label">{strengthLabel(memory.strength)}</span>
        </div>
        <span className="gst-memory__node-count">
          {memory.nodes.length} interacciones
        </span>
      </div>

      {/* ── Emotional Arc ── */}
      <EmotionalArcChart arc={memory.emotionalArc} />

      {/* ── Topic Patterns ── */}
      <TopicPatterns patterns={memory.topicPatterns} />

      {/* ── Callbacks ── */}
      <CallbacksList callbacks={memory.callbacks} />

      {/* ── Recall Context (what staff should know) ── */}
      {recall && <RecallPanel ctx={recall} />}
    </div>
  );
}