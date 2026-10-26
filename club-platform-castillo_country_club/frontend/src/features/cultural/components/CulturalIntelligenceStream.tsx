/**
 * CulturalIntelligenceStream — Live intelligence feed
 *
 * A vertical stream of CulturalStreamSignals that shows real-time
 * intelligence from cross-domain signals, taste mutations, resonance
 * changes, and advisor insights.
 *
 * Think of it as a "live ticker" — the operator sees cultural
 * intelligence flowing in as it's detected. Each signal has a
 * priority indicator, source badge, and optional action.
 *
 * @module cultural/components/CulturalIntelligenceStream
 */

import { useMemo, useState } from 'react';

import type {
  CulturalStreamSignal,
} from '../types';
import type {
  CulturalAdvisorInsight,
  AdvisorSeverity,
} from '../lib/advisor/types';
import './CulturalIntelligenceStream.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalIntelligenceStreamProps {
  /** Cross-domain signals from the intelligence engine. */
  signals: CulturalStreamSignal[];
  /** Advisor insights to merge into the stream. */
  advisorInsights: CulturalAdvisorInsight[];
  /** Maximum items to show. Default 8. */
  maxItems?: number;
  /** Callback when operator clicks a signal action. */
  onSignalAction?: (signal: CulturalStreamSignal) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  SOURCE STYLING
// ══════════════════════════════════════════════════════════

const SOURCE_STYLES: Record<
  string,
  { color: string; label: string; icon: string }
> = {
  advisor:     { color: '#a78bfa', label: 'Advisor',     icon: '◈' },
  proposal:    { color: '#60a5fa', label: 'Propuesta',   icon: '◇' },
  mutation:    { color: '#f472b6', label: 'Mutación',    icon: '◆' },
  resonance:   { color: '#4ade80', label: 'Resonancia',  icon: '○' },
  calendar:    { color: '#fbbf24', label: 'Calendario',  icon: '□' },
  cross_domain:{ color: '#fb923c', label: 'Cross-domain',icon: '◈' },
};

const PRIORITY_STYLES: Record<
  string,
  { color: string; weight: number }
> = {
  critical: { color: '#ef4444', weight: 0 },
  high:     { color: '#f59e0b', weight: 1 },
  medium:   { color: '#60a5fa', weight: 2 },
  low:      { color: '#6b7280', weight: 3 },
};

const SEVERITY_TO_PRIORITY: Record<AdvisorSeverity, string> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
};

// ══════════════════════════════════════════════════════════
//  UNIFIED STREAM ITEM TYPE
// ══════════════════════════════════════════════════════════

interface StreamItem {
  id: string;
  priority: string;
  source: string;
  title: string;
  description: string;
  timestamp: string;
  action?: CulturalStreamSignal['action'];
  layer?: string;
  type: 'signal' | 'insight';
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalIntelligenceStream({
  signals,
  advisorInsights,
  maxItems = 8,
  onSignalAction,
  className = '',
}: CulturalIntelligenceStreamProps) {
  const [expanded, setExpanded] = useState(false);

  // Merge signals + advisor insights into unified stream
  const streamItems = useMemo((): StreamItem[] => {
    const items: StreamItem[] = [];

    // Add signals
    for (const signal of signals) {
      items.push({
        id: signal.id,
        priority: signal.priority,
        source: signal.source,
        title: signal.title,
        description: signal.description,
        timestamp: signal.timestamp,
        action: signal.action,
        type: 'signal',
      });
    }

    // Add advisor insights as stream items
    for (const insight of advisorInsights) {
      items.push({
        id: insight.id,
        priority: SEVERITY_TO_PRIORITY[insight.severity] ?? 'medium',
        source: 'advisor',
        title: insight.title,
        description: insight.description,
        timestamp: new Date().toISOString(),
        action: insight.action
          ? {
              label: insight.action.label,
              server: insight.action.server,
              tool: insight.action.tool,
              params: insight.action.params,
            }
          : undefined,
        layer: insight.layer,
        type: 'insight',
      });
    }

    // Sort: critical first, then by timestamp desc
    items.sort((a, b) => {
      const pa = PRIORITY_STYLES[a.priority]?.weight ?? 3;
      const pb = PRIORITY_STYLES[b.priority]?.weight ?? 3;
      if (pa !== pb) return pa - pb;
      return b.timestamp.localeCompare(a.timestamp);
    });

    return expanded ? items : items.slice(0, maxItems);
  }, [signals, advisorInsights, maxItems, expanded]);

  const totalItems = signals.length + advisorInsights.length;
  const hiddenCount = totalItems - maxItems;

  return (
    <aside className={`cultural-intelligence-stream ${className}`}>
      {/* Header */}
      <header className="cultural-intelligence-stream__header">
        <h3 className="cultural-intelligence-stream__title">
          Intelligence Stream
        </h3>
        <span className="cultural-intelligence-stream__count">
          {totalItems} señal(es)
        </span>
      </header>

      {/* Stream items */}
      <div className="cultural-intelligence-stream__list">
        {streamItems.map((item, index) => {
          const sourceStyle = SOURCE_STYLES[item.source] ?? SOURCE_STYLES.advisor;
          const priorityStyle = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.medium;

          return (
            <article
              key={item.id}
              className="cultural-intelligence-stream__item"
              style={{
                '--item-color': sourceStyle.color,
                '--item-priority': priorityStyle.color,
                animationDelay: `${index * 60}ms`,
              } as React.CSSProperties}
            >
              {/* Priority indicator */}
              <div className="cultural-intelligence-stream__indicator">
                <span className="cultural-intelligence-stream__dot" />
              </div>

              {/* Content */}
              <div className="cultural-intelligence-stream__content">
                <div className="cultural-intelligence-stream__meta">
                  <span className="cultural-intelligence-stream__source-badge">
                    {sourceStyle.icon} {sourceStyle.label}
                  </span>
                  {item.layer && (
                    <span className="cultural-intelligence-stream__layer">
                      {item.layer}
                    </span>
                  )}
                </div>

                <h4 className="cultural-intelligence-stream__item-title">
                  {item.title}
                </h4>

                <p className="cultural-intelligence-stream__item-desc">
                  {item.description}
                </p>

                {item.action && (
                  <button
                    className="cultural-intelligence-stream__action"
                    onClick={() => {
                      if (item.type === 'signal' && onSignalAction) {
                        onSignalAction(
                          signals.find((s) => s.id === item.id) ?? signals[0],
                        );
                      }
                    }}
                  >
                    {item.action.label}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Expand/collapse */}
      {hiddenCount > 0 && !expanded && (
        <button
          className="cultural-intelligence-stream__expand"
          onClick={() => setExpanded(true)}
        >
          +{hiddenCount} más
        </button>
      )}
      {expanded && totalItems > maxItems && (
        <button
          className="cultural-intelligence-stream__expand"
          onClick={() => setExpanded(false)}
        >
          Colapsar
        </button>
      )}

      {/* Empty state */}
      {streamItems.length === 0 && (
        <div className="cultural-intelligence-stream__empty">
          <span className="cultural-intelligence-stream__empty-icon">◇</span>
          <p>Sin señales de intelligence activas</p>
        </div>
      )}
    </aside>
  );
}