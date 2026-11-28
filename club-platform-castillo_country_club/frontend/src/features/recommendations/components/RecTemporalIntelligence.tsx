// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Temporal Intelligence (2027 NEW)
//
// "The Timeline" — Past → Present → Future horizontal timeline.
//
// Shows the feedback loop that makes the system smarter over time:
//   Past:    Completed insights with measured outcomes
//            (did they work? satisfaction delta, revenue delta)
//   Present: Current active recommendations in flight
//   Future:  Predicted opportunities with confidence cones
//            (width = uncertainty, shimmer = projection)
//
// The visual metaphor: a living timeline where the club's intelligence
// grows with each cycle. Past solidifies. Future shimmers.
//
// Glass namespace: .glass-rti
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BarChart3,
  Users,
  CalendarDays,
} from "lucide-react";

import type { QuarterlyInsight, Recommendation } from "../types";
import {
  INSIGHT_PERIOD_CONFIG,
  RecommendationType,
  RECOMMENDATION_TYPE_CONFIG,
  RecommendationPriority,
  SuggestionStatus,
  sortByPriority
} from "../types";

import "./RecTemporalIntelligence.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface RecTemporalIntelligenceProps {
  insights: QuarterlyInsight[];
  recommendations: Recommendation[];
  reducedMotion: boolean;
  className?: string;
}

type TimelineSection = "past" | "present" | "future";

interface PastNode {
  id: string;
  label: string;
  period: string;
  satisfaction: number;
  revenue: number;
  membersActive: number;
  eventsHeld: number;
  keyAchievements: string[];
  areasForImprovement: string[];
  status: SuggestionStatus;
}

interface PresentNode {
  id: string;
  title: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  score: number;
  tags: string[];
}

interface FutureNode {
  id: string;
  title: string;
  confidence: number;
  coneWidth: number; // 0-1, wider = more uncertain
  estimatedImpact: string;
  type: RecommendationType;
}

// ═══════════════════════════════════════════════════════════════════════
// TREND ICON RESOLVER
// ═══════════════════════════════════════════════════════════════════════

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp size={12} aria-hidden="true" />;
  if (value < 0) return <TrendingDown size={12} aria-hidden="true" />;
  return <Minus size={12} aria-hidden="true" />;
}

function trendColor(value: number): string {
  if (value > 0) return "var(--color-emerald-400)";
  if (value < 0) return "var(--color-rose-400)";
  return "var(--color-silver-400)";
}

// ═══════════════════════════════════════════════════════════════════════
// DATA TRANSFORMERS
// ═══════════════════════════════════════════════════════════════════════

function buildPastNodes(insights: QuarterlyInsight[]): PastNode[] {
  return [...insights]
    .sort((a, b) => {
      // Sort by year desc, then period desc
      if (a.year !== b.year) return b.year - a.year;
      const periodOrder = { Q4: 4, Q3: 3, Q2: 2, Q1: 1 };
      return (periodOrder[b.period] ?? 0) - (periodOrder[a.period] ?? 0);
    })
    .slice(0, 4) // Last 4 quarters
    .map((insight) => ({
      id: insight.id,
      label: `${insight.year} ${insight.period}`,
      period: INSIGHT_PERIOD_CONFIG[insight.period]?.months ?? insight.period,
      satisfaction: insight.member_satisfaction_avg,
      revenue: insight.revenue_total,
      membersActive: insight.total_members_active,
      eventsHeld: insight.events_held,
      keyAchievements: insight.key_achievements ?? [],
      areasForImprovement: insight.areas_for_improvement ?? [],
      status: insight.status,
    }));
}

function buildPresentNodes(recommendations: Recommendation[]): PresentNode[] {
  return sortByPriority(recommendations)
    .filter(
      (r) =>
        r.priority === RecommendationPriority.Urgent ||
        r.priority === RecommendationPriority.High ||
        r.priority === RecommendationPriority.Medium,
    )
    .slice(0, 6)
    .map((rec) => ({
      id: rec.id,
      title: rec.title,
      type: rec.recommendation_type,
      priority: rec.priority,
      score: rec.score,
      tags: rec.tags ?? [],
    }));
}

function buildFutureNodes(recommendations: Recommendation[]): FutureNode[] {
  // Future nodes are derived from low-priority or reasoning-chain-rich recommendations
  const futureRecs = recommendations
    .filter(
      (r) =>
        r.reasoning_chain !== undefined ||
        r.priority === RecommendationPriority.Low,
    )
    .slice(0, 4);

  return futureRecs.map((rec) => {
    const confidence = rec.reasoning_chain?.overall_confidence ?? 50;
    const coneWidth = Math.max(0.1, 1 - confidence / 100);

    return {
      id: `future-${rec.id}`,
      title: rec.title,
      confidence,
      coneWidth,
      estimatedImpact: rec.reasoning
        ? rec.reasoning.slice(0, 80)
        : "Impacto por determinar",
      type: rec.recommendation_type,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// PAST NODE CARD
// ═══════════════════════════════════════════════════════════════════════

function PastNodeCard({
  node,
  index,
  reducedMotion,
}: {
  node: PastNode;
  index: number;
  reducedMotion: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const delayMs = reducedMotion ? 0 : index * 150;

  return (
    <div
      className="rti-past-node"
      data-status={node.status}
      style={{ "--stagger-i": index, "--node-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {/* ── Node dot on timeline ───────────────────────────────────────── */}
      <div className="rti-node-dot" aria-hidden="true" />

      {/* ── Card ───────────────────────────────────────────────────────── */}
      <div className="rti-past-card">
        <div className="rti-past-header">
          <span className="rti-past-period">{node.label}</span>
          <span className="rti-past-months">{node.period}</span>
          <CheckCircle2 size={12} aria-hidden="true" className="rti-past-check" />
        </div>

        {/* Key metrics */}
        <div className="rti-past-metrics">
          <div className="rti-past-metric">
            <Users size={11} aria-hidden="true" />
            <span className="rti-past-metric-value">
              {node.membersActive.toLocaleString()}
            </span>
            <span className="rti-past-metric-label">activos</span>
          </div>
          <div className="rti-past-metric">
            <CalendarDays size={11} aria-hidden="true" />
            <span className="rti-past-metric-value">{node.eventsHeld}</span>
            <span className="rti-past-metric-label">eventos</span>
          </div>
          <div
            className="rti-past-metric"
            style={{ "--trend-color": trendColor(node.satisfaction - 70) } as React.CSSProperties}
          >
            <TrendIcon value={node.satisfaction - 70} />
            <span className="rti-past-metric-value">{node.satisfaction}</span>
            <span className="rti-past-metric-label">satisfacción</span>
          </div>
          <div className="rti-past-metric">
            <BarChart3 size={11} aria-hidden="true" />
            <span className="rti-past-metric-value">
              ${(node.revenue / 1000).toFixed(0)}K
            </span>
            <span className="rti-past-metric-label">revenue</span>
          </div>
        </div>

        {/* Expand for details */}
        {(node.keyAchievements.length > 0 || node.areasForImprovement.length > 0) && (
          <>
            <Button
              variant="unstyled"
              type="button"
              className="rti-past-expand"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? (
                <ChevronUp size={12} aria-hidden="true" />
              ) : (
                <ChevronDown size={12} aria-hidden="true" />
              )}
              <span>{isExpanded ? "Menos" : "Detalles"}</span>
            </Button>

            {isExpanded && (
              <div className="rti-past-details">
                {node.keyAchievements.length > 0 && (
                  <div className="rti-past-detail-section">
                    <span className="rti-past-detail-title" data-variant="achievement">
                      Logros
                    </span>
                    <ul className="rti-past-detail-list">
                      {node.keyAchievements.slice(0, 3).map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {node.areasForImprovement.length > 0 && (
                  <div className="rti-past-detail-section">
                    <span className="rti-past-detail-title" data-variant="improvement">
                      Mejoras
                    </span>
                    <ul className="rti-past-detail-list">
                      {node.areasForImprovement.slice(0, 3).map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRESENT NODE CARD
// ═══════════════════════════════════════════════════════════════════════

function PresentNodeCard({
  node,
  index,
  reducedMotion,
}: {
  node: PresentNode;
  index: number;
  reducedMotion: boolean;
}) {
  const typeConfig = RECOMMENDATION_TYPE_CONFIG[node.type];
  const delayMs = reducedMotion ? 0 : index * 120;

  return (
    <div
      className="rti-present-node"
      data-priority={node.priority}
      style={{ "--stagger-i": index, "--node-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      <div className="rti-present-dot" aria-hidden="true" data-priority={node.priority} />

      <div className="rti-present-card">
        <div className="rti-present-header">
          <span className="rti-present-score">{node.score}</span>
          <span className="rti-present-type" data-signal-source={typeConfig?.signalSource ?? "internal"}>
            {typeConfig?.label ?? node.type}
          </span>
        </div>
        <h4 className="rti-present-title">{node.title}</h4>
        {node.tags.length > 0 && (
          <div className="rti-present-tags">
            {node.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rti-present-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FUTURE NODE CARD
// ═══════════════════════════════════════════════════════════════════════

function FutureNodeCard({
  node,
  index,
  reducedMotion,
}: {
  node: FutureNode;
  index: number;
  reducedMotion: boolean;
}) {
  const typeConfig = RECOMMENDATION_TYPE_CONFIG[node.type];
  const delayMs = reducedMotion ? 0 : index * 150;

  return (
    <div
      className="rti-future-node"
      style={{ "--stagger-i": index, "--node-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {/* Confidence cone (SVG) */}
      <div className="rti-cone-container" aria-hidden="true">
        <svg className="rti-cone-svg" viewBox="0 0 80 60" preserveAspectRatio="none">
          <polygon
            points={`0,30 ${80 * (1 - node.coneWidth)},${30 - 20 * node.coneWidth} 80,30 ${80 * (1 - node.coneWidth)},${30 + 20 * node.coneWidth}`}
            className="rti-cone-shape"
            style={{ opacity: 0.15 + node.coneWidth * 0.3 } as React.CSSProperties}
          />
          <line x1="0" y1="30" x2="80" y2="30" className="rti-cone-center" />
        </svg>
      </div>

      <div className="rti-future-dot" aria-hidden="true" />

      <div className="rti-future-card">
        <div className="rti-future-header">
          <Sparkles size={12} aria-hidden="true" className="rti-future-sparkle" />
          <span
            className="rti-future-confidence"
            data-confidence-level={
              node.confidence >= 80 ? "high" : node.confidence >= 50 ? "medium" : "low"
            }
          >
            {node.confidence}%
          </span>
          <span className="rti-future-type" data-signal-source={typeConfig?.signalSource ?? "internal"}>
            {typeConfig?.label ?? ""}
          </span>
        </div>
        <h4 className="rti-future-title">{node.title}</h4>
        <p className="rti-future-impact">{node.estimatedImpact}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecTemporalIntelligence({
  insights,
  recommendations,
  reducedMotion,
  className,
}: RecTemporalIntelligenceProps) {
  const [activeSection, setActiveSection] = useState<TimelineSection | null>(null);

  const pastNodes = useMemo(() => buildPastNodes(insights), [insights]);
  const presentNodes = useMemo(
    () => buildPresentNodes(recommendations),
    [recommendations],
  );
  const futureNodes = useMemo(
    () => buildFutureNodes(recommendations),
    [recommendations],
  );

  const handleSectionClick = useCallback((section: TimelineSection) => {
    setActiveSection((prev) => (prev === section ? null : section));
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────
  const isEmpty =
    pastNodes.length === 0 &&
    presentNodes.length === 0 &&
    futureNodes.length === 0;

  if (isEmpty) {
    return (
      <div className={`glass-rti ${className ?? ""}`} data-empty>
        <div className="rti-header">
          <Clock size={16} aria-hidden="true" className="rti-header-icon" />
          <span className="rti-header-title">Línea Temporal</span>
        </div>
        <div className="rti-empty">
          <Clock size={32} aria-hidden="true" className="rti-empty-icon" />
          <p className="rti-empty-text">
            Sin datos temporales disponibles. La línea temporal necesita
            insights trimestrales y recomendaciones activas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-rti ${className ?? ""}`}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="rti-header">
        <Clock size={16} aria-hidden="true" className="rti-header-icon" />
        <span className="rti-header-title">Línea Temporal</span>
        <div className="rti-header-sections">
          <Button
            variant="unstyled"
            type="button"
            className="rti-section-pill"
            data-section="past"
            data-active={activeSection === "past" || undefined}
            onClick={() => handleSectionClick("past")}
          >
            <CheckCircle2 size={11} aria-hidden="true" />
            <span>Pasado ({pastNodes.length})</span>
          </Button>
          <Button
            variant="unstyled"
            type="button"
            className="rti-section-pill"
            data-section="present"
            data-active={activeSection === "present" || undefined}
            onClick={() => handleSectionClick("present")}
          >
            <Target size={11} aria-hidden="true" />
            <span>Presente ({presentNodes.length})</span>
          </Button>
          <Button
            variant="unstyled"
            type="button"
            className="rti-section-pill"
            data-section="future"
            data-active={activeSection === "future" || undefined}
            onClick={() => handleSectionClick("future")}
          >
            <Sparkles size={11} aria-hidden="true" />
            <span>Futuro ({futureNodes.length})</span>
          </Button>
        </div>
      </div>

      {/* ── Timeline body ─────────────────────────────────────────────── */}
      <div className="rti-body">
        {/* ── The Timeline Line ────────────────────────────────────────── */}
        <div className="rti-timeline-line" aria-hidden="true">
          <div className="rti-line-segment rti-line-segment--past" />
          <div className="rti-line-segment rti-line-segment--present" />
          <div className="rti-line-segment rti-line-segment--future" />
        </div>

        {/* ── Past Section ─────────────────────────────────────────────── */}
        <div
          className="rti-section"
          data-section="past"
          data-dimmed={activeSection && activeSection !== "past" ? "" : undefined}
        >
          <div className="rti-section-label">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Pasado</span>
            <ArrowRight size={10} aria-hidden="true" className="rti-section-arrow" />
          </div>

          <div className="rti-past-track">
            {pastNodes.map((node, idx) => (
              <PastNodeCard
                key={node.id}
                node={node}
                index={idx}
                reducedMotion={reducedMotion}
              />
            ))}
            {pastNodes.length === 0 && (
              <div className="rti-section-empty">
                Sin insights trimestrales históricos
              </div>
            )}
          </div>
        </div>

        {/* ── Present Section ──────────────────────────────────────────── */}
        <div
          className="rti-section rti-section--present"
          data-section="present"
          data-dimmed={activeSection && activeSection !== "present" ? "" : undefined}
        >
          <div className="rti-section-label rti-section-label--present">
            <Target size={14} aria-hidden="true" />
            <span>Presente</span>
            <span className="rti-now-marker">AHORA</span>
          </div>

          <div className="rti-present-track">
            {presentNodes.map((node, idx) => (
              <PresentNodeCard
                key={node.id}
                node={node}
                index={idx}
                reducedMotion={reducedMotion}
              />
            ))}
            {presentNodes.length === 0 && (
              <div className="rti-section-empty">
                Sin recomendaciones activas
              </div>
            )}
          </div>
        </div>

        {/* ── Future Section ───────────────────────────────────────────── */}
        <div
          className="rti-section rti-section--future"
          data-section="future"
          data-dimmed={activeSection && activeSection !== "future" ? "" : undefined}
        >
          <div className="rti-section-label rti-section-label--future">
            <Sparkles size={14} aria-hidden="true" />
            <span>Futuro</span>
          </div>

          <div className="rti-future-track">
            {futureNodes.map((node, idx) => (
              <FutureNodeCard
                key={node.id}
                node={node}
                index={idx}
                reducedMotion={reducedMotion}
              />
            ))}
            {futureNodes.length === 0 && (
              <div className="rti-section-empty">
                Sin predicciones disponibles
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}