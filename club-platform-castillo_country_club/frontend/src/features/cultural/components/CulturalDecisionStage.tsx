/**
 * CulturalDecisionStage — The "stage" of the Cultural Dashboard
 *
 * Central area where the most important cultural decisions are presented.
 * Renders the top advisor insights (critical/high), next upcoming event,
 * and the cultural health gauge in a focused, editorial layout.
 *
 * This is where the operator LOOKS FIRST when they open the dashboard.
 * It shows what needs attention RIGHT NOW.
 *
 * @module cultural/components/CulturalDecisionStage
 */

import { useMemo } from 'react';

import type {
  CulturalSummary,
  CulturalDashboardMode,
} from '../types';
import type {
  CulturalAdvisorInsight,
  AdvisorSeverity,
} from '../lib/advisor/types';
import { SEVERITY_ORDER } from '../lib/advisor/types';
import './CulturalDecisionStage.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalDecisionStageProps {
  /** Top advisor insights to display. */
  insights: CulturalAdvisorInsight[];
  /** Dashboard summary for next event context. */
  summary: CulturalSummary | undefined;
  /** Current dashboard mode for visual styling. */
  dashboardMode: CulturalDashboardMode;
  /** Maximum number of insights to show. Default 3. */
  maxInsights?: number;
  /** Callback when operator clicks an insight action. */
  onInsightAction?: (insight: CulturalAdvisorInsight) => void;
  /** Callback when operator dismisses an insight. */
  onDismiss?: (insightId: string) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  SEVERITY STYLING
// ══════════════════════════════════════════════════════════

const SEVERITY_STYLES: Record<
  AdvisorSeverity,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  high: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#fca5a5',
    dot: '#ef4444',
    label: 'Crítico',
  },
  medium: {
    bg: 'rgba(234, 179, 8, 0.06)',
    border: 'rgba(234, 179, 8, 0.25)',
    text: '#fde68a',
    dot: '#eab308',
    label: 'Atención',
  },
  low: {
    bg: 'rgba(96, 165, 250, 0.05)',
    border: 'rgba(96, 165, 250, 0.2)',
    text: '#93c5fd',
    dot: '#60a5fa',
    label: 'Oportunidad',
  },
};

const MODE_ACCENTS: Record<string, string> = {
  pulse: '#4ade80',
  flowing: '#60a5fa',
  deep: '#a78bfa',
  critical: '#ef4444',
  dormant: '#6b7280',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalDecisionStage({
  insights,
  summary,
  dashboardMode,
  maxInsights = 3,
  onInsightAction,
  onDismiss,
  className = '',
}: CulturalDecisionStageProps) {
  const accent = MODE_ACCENTS[dashboardMode] ?? MODE_ACCENTS.dormant;

  const getSeverityOrder = (severity: AdvisorSeverity) =>
    SEVERITY_ORDER[severity as keyof typeof SEVERITY_ORDER] ?? 3;

  // Sort by severity → impact, take top N
  const topInsights = useMemo(() => {
    return [...insights]
      .sort((a, b) => {
        const sevDiff =
          getSeverityOrder(a.severity as AdvisorSeverity) -
          getSeverityOrder(b.severity as AdvisorSeverity);
        if (sevDiff !== 0) return sevDiff;
        return b.impact - a.impact;
      })
      .slice(0, maxInsights);
  }, [insights, maxInsights]);

  // Next event from summary
  const nextEvent = summary?.next_gala ?? null;
  const upcomingCount = summary?.upcoming_events_30d ?? 0;

  return (
    <section
      className={`cultural-decision-stage ${className}`}
      style={{ '--stage-accent': accent } as React.CSSProperties}
    >
      {/* Header */}
      <header className="cultural-decision-stage__header">
        <h2 className="cultural-decision-stage__title">Decisiones culturales</h2>
        <span className="cultural-decision-stage__count">
          {topInsights.length > 0
            ? `${topInsights.length} acción(es) requerida(s)`
            : 'Todo en orden'}
        </span>
      </header>

      {/* Insight Cards */}
      {topInsights.length > 0 && (
        <div className="cultural-decision-stage__insights">
          {topInsights.map((insight, index) => {
            const styles = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.low;

            return (
              <article
                key={insight.id}
                className="cultural-decision-stage__card"
                style={{
                  '--card-bg': styles.bg,
                  '--card-border': styles.border,
                  '--card-text': styles.text,
                  '--card-dot': styles.dot,
                  animationDelay: `${index * 80}ms`,
                } as React.CSSProperties}
              >
                <div className="cultural-decision-stage__card-header">
                  <span className="cultural-decision-stage__severity-dot" />
                  <span className="cultural-decision-stage__severity-label">
                    {styles.label}
                  </span>
                  <span className="cultural-decision-stage__layer">
                    {insight.layer}
                  </span>
                  {onDismiss && (
                    <Button
                      variant="unstyled"
                      className="cultural-decision-stage__dismiss"
                      onClick={() => onDismiss(insight.id)}
                      aria-label="Descartar"
                    >
                      ×
                    </Button>
                  )}
                </div>

                <h3 className="cultural-decision-stage__card-title">
                  {insight.title}
                </h3>

                <p className="cultural-decision-stage__card-desc">
                  {insight.description}
                </p>

                {/* Impact bar */}
                <div className="cultural-decision-stage__impact">
                  <div className="cultural-decision-stage__impact-bar">
                    <div
                      className="cultural-decision-stage__impact-fill"
                      style={{ width: `${insight.impact}%` }}
                    />
                  </div>
                  <span className="cultural-decision-stage__impact-label">
                    Impacto {insight.impact}/100
                  </span>
                </div>

                {/* Action button */}
                {insight.action && (
                  <Button
                    variant="unstyled"
                    className="cultural-decision-stage__action"
                    onClick={() => onInsightAction?.(insight)}
                  >
                    {insight.action.label}
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* No insights — healthy state */}
      {topInsights.length === 0 && (
        <div className="cultural-decision-stage__healthy">
          <span className="cultural-decision-stage__healthy-icon">◆</span>
          <p>Programación cultural saludable. Sin acciones críticas requeridas.</p>
        </div>
      )}

      {/* Next event context */}
      {nextEvent && (
        <div className="cultural-decision-stage__next-event">
          <span className="cultural-decision-stage__next-label">Próximo evento</span>
          <span className="cultural-decision-stage__next-name">{nextEvent.name}</span>
          {nextEvent.guest_count !== undefined && (
            <span className="cultural-decision-stage__next-guests">
              {nextEvent.guest_count} invitados
            </span>
          )}
        </div>
      )}

      {/* Upcoming count */}
      <div className="cultural-decision-stage__footer">
        <span>{upcomingCount} evento(s) en los próximos 30 días</span>
      </div>
    </section>
  );
}