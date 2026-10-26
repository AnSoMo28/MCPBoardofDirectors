// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsIntelligenceStream.tsx
// §B3.5 — Sports Intelligence Stream
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// Sidebar feed of all advisor insights, sorted by severity.
// Expandible with "ver más" for long lists.
// Each card: severity badge, title, metric, action.
// Living Protocol: 7/7
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsIntelligenceStream
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Brain } from "lucide-react";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { SportsDashboardMode } from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./SportsIntelligenceStream.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SportsIntelligenceStreamProps {
  insights: BaseInsight[];
  ambientMode: SportsDashboardMode;
  maxVisible?: number;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const DEFAULT_MAX_VISIBLE = 10;

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 InsightCard ─────────────────────────────────────
// Single insight in the stream.
// LP: 3 (memoria) + 4 (intención) + 5 (siniestría) + 6 (empatía)

function InsightCard({
  insight,
  ambientMode,
}: {
  insight: BaseInsight;
  ambientMode: SportsDashboardMode;
}) {
  return (
    <article
      className="spt-stream__card"
      data-severity={insight.severity}
      data-impact={insight.impact}
      data-mode={ambientMode}
    >
      <div className="spt-stream__card-header">
        <span className="spt-stream__severity" data-severity={insight.severity}>
          {insight.severity}
        </span>
        <span className="spt-stream__domain">{insight.domain}</span>
      </div>
      <h3 className="spt-stream__card-title">{insight.title}</h3>
      {insight.metric && (
        <p className="spt-stream__card-metric">
          {insight.metric}: <strong>{insight.metricValue}</strong>
        </p>
      )}
      {insight.action && (
        <button
          type="button"
          className="spt-stream__card-action"
          data-approval={insight.action.approval}
        >
          {insight.action.label}
        </button>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsIntelligenceStream({
  insights,
  ambientMode,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: SportsIntelligenceStreamProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () =>
      [...insights].sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5),
      ),
    [insights],
  );

  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const hiddenCount = sorted.length - maxVisible;

  if (sorted.length === 0) {
    return (
      <aside
        className="spt-stream"
        data-mode={ambientMode}
        role="feed"
        aria-label="Inteligencia deportiva"
      >
        <h3 className="spt-stream__title">Inteligencia</h3>
        <EmptyState
          icon={<Brain className="w-5 h-5" />}
          title="Sin insights"
          description="El advisor no detectó alertas en este momento."
        />
      </aside>
    );
  }

  return (
    <aside
      className="spt-stream"
      data-mode={ambientMode}
      role="feed"
      aria-label="Inteligencia deportiva"
    >
      <h3 className="spt-stream__title">
        Inteligencia
        <span className="spt-stream__count">{sorted.length}</span>
      </h3>
      <div className="spt-stream__list">
        {visible.map((insight, i) => (
          <div
            key={insight.id}
            className="spt-stream__item"
            style={{ "--stagger-i": i } as React.CSSProperties}
          >
            <InsightCard insight={insight} ambientMode={ambientMode} />
          </div>
        ))}
      </div>
      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          className="spt-stream__expand"
          onClick={() => setExpanded(true)}
        >
          Ver {hiddenCount} más
        </button>
      )}
    </aside>
  );
}