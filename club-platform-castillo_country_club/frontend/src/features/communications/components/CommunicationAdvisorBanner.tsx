// src/features/communications/components/CommunicationAdvisorBanner.tsx
// ═══════════════════════════════════════════════════════════
// Communication Advisor Banner — V2 Rewrite
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a passive notification container.
// The first thought of the Cortex that the staff sees.
// The brain's voice saying: "This is what you need to
// know RIGHT NOW about this member."
//
// V2 Intelligence Layer:
//   - Urgency engine (composite 0-100)
//   - Emotional sparkline (last 7 data points)
//   - Silence alert badge
//   - Fatigue warning
//   - Narrative health dot
//   - Escape countdown
//   - HITL action buttons (approve/postpone/delegate/discard)
//
// Zero framer-motion. Zero Tailwind. Zero shared UI.
// Pure CSS Glass. Data-attributes only.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";

import type { LucideIcon } from "lucide-react";
import {
  CalendarClock, Radio, CalendarDays, AlertTriangle,
  Lightbulb, Users, Heart, MessageSquare,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Brain, Zap, Shield, CheckCircle2, Check, Clock,
  SkipForward, Trash2, AlertCircle,
} from "lucide-react";

import type {
  CommunicationInsight,
  InsightCategory,
  EmotionalTrajectory,
  EmotionalDataPoint,
  SilenceProfile,
  MessageFatigue,
  NarrativeArc,
} from "../types";

import {
  deriveSilenceLevel,
  deriveEmotionalZone,
  deriveFatigueLevel,
  EMOTIONAL_ZONE_CONFIG,
  STORY_HEALTH_CONFIG,
} from "../types";
import "./CommunicationAdvisorBanner.css";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const CATEGORY_ICON: Record<InsightCategory, LucideIcon> = {
  timing: CalendarClock,
  channel: Radio,
  frequency: CalendarDays,
  content: MessageSquare,
  risk: AlertTriangle,
  opportunity: Lightbulb,
  audience: Users,
  health: Heart,
};

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  timing: "Timing",
  channel: "Canal",
  frequency: "Frecuencia",
  content: "Contenido",
  risk: "Riesgo",
  opportunity: "Oportunidad",
  audience: "Audiencia",
  health: "Salud",
};

const NAV_LABELS: Record<string, string> = {
  analytics: "Ver analytics",
  center: "Abrir centro",
  tools: "Abrir herramientas",
  intelligence: "Ver inteligencia",
  overview: "Ver resumen",
};

/** Severity badge config. */
const SEVERITY_BADGE: Record<
  string,
  { label: string }
> = {
  critical: { label: "Crítico" },
  high: { label: "Alto" },
  medium: { label: "Medio" },
  low: { label: "Bajo" },
  info: { label: "Info" },
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/** Build SVG sparkline path from last N data points. */
function buildSparklinePath(
  points: EmotionalDataPoint[],
  width: number,
  height: number,
  padX: number,
  padY: number,
): string {
  if (points.length === 0) return "";

  const sorted = [...points].sort(
    (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const step = sorted.length > 1 ? usableW / (sorted.length - 1) : 0;

  const coords = sorted.map((dp: EmotionalDataPoint, i: number) => ({
    x: padX + i * step,
    y: padY + (1 - dp.score / 100) * usableH,
  }));

  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    path += ` L ${coords[i].x} ${coords[i].y}`;
  }
  return path;
}

/** Derive composite urgency from all available signals. */
function computeCompositeUrgency(
  disengagementRisk: number,
  silenceDays: number,
  velocity: number,
): number {
  // Pure computation — no engine dependency
  const riskWeight = disengagementRisk * 40;
  const silenceWeight = Math.min(30, (silenceDays / 30) * 30);
  const velocityWeight = Math.abs(velocity) > 0 ? Math.min(30, Math.abs(velocity) * 5) : 0;
  return Math.round(Math.min(100, riskWeight + silenceWeight + velocityWeight));
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface CommunicationAdvisorBannerProps {
  insights: CommunicationInsight[];
  onNavigate?: (tab: string) => void;
  trajectory?: EmotionalTrajectory | null;
  silence?: SilenceProfile | null;
  fatigue?: MessageFatigue | null;
  narrative?: NarrativeArc | null;
  disengagementRisk?: number;
  onAction?: (
    action: "approve" | "postpone" | "delegate" | "discard",
    insightId: string,
  ) => void;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function CommunicationAdvisorBanner({
  insights,
  onNavigate,
  trajectory = null,
  silence = null,
  fatigue = null,
  narrative = null,
  disengagementRisk = 0,
  onAction,
}: CommunicationAdvisorBannerProps) {

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev: string | null) => (prev === id ? null : id));
  }, []);

  // ── Derived intelligence ──────────────────────────────
  const silenceDays = silence?.current_silence_days ?? 0;
  const silenceLevel = silence ? deriveSilenceLevel(silenceDays) : "normal";
  const velocity = trajectory?.velocity ?? 0;
  const currentScore = trajectory?.current.score ?? 50;
  const currentZone = trajectory ? deriveEmotionalZone(currentScore) : "stable";
  const fatigueLevel = fatigue ? deriveFatigueLevel(fatigue.current_level) : "fresh";
  const storyHealth = narrative?.story_health ?? "strong";

  const compositeUrgency = useMemo(
    () => computeCompositeUrgency(disengagementRisk, silenceDays, velocity),
    [disengagementRisk, silenceDays, velocity],
  );

  // ── Sparkline data (last 7 points) ────────────────────
  const sparklinePoints = useMemo(() => {
    if (!trajectory || trajectory.history.length === 0) return [];
    const sorted = [...trajectory.history].sort(
      (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return sorted.slice(-7);
  }, [trajectory]);

  const sparklinePath = useMemo(
    () => buildSparklinePath(sparklinePoints, 200, 28, 4, 4),
    [sparklinePoints],
  );

  // ── Urgency classification ────────────────────────────
  const urgencyLevel: "none" | "low" | "medium" | "high" | "critical" =
    compositeUrgency >= 80
      ? "critical"
      : compositeUrgency >= 55
        ? "high"
        : compositeUrgency >= 30
          ? "medium"
          : compositeUrgency > 0
            ? "low"
            : "none";

  // ── Insight counts ────────────────────────────────────
  const criticalCount = insights.filter(
    (i: CommunicationInsight) => i.severity === "critical" || i.severity === "high",
  ).length;
  const mediumCount = insights.filter(
    (i: CommunicationInsight) => i.severity === "medium",
  ).length;

  // ── Visible insights ──────────────────────────────────
  const visibleInsights = showAll ? insights : insights.slice(0, 4);
  const hasMore = insights.length > 4;

  // ── Escape countdown ──────────────────────────────────
  const showEscapeCountdown = disengagementRisk > 0.5;
  const daysToEscape = silence ? Math.max(0, 60 - silenceDays) : null;

  // ── Empty state ───────────────────────────────────────
  if (insights.length === 0) {
    return (
      <div className="glass-comm-banner" data-urgency="none" data-has-insights="false">
        <div className="banner__empty">
          <CheckCircle2 size={20} className="banner__empty-icon" />
          <div>
            <span className="banner__empty-title">
              Communication Advisor — Todo en orden
            </span>
            <span className="banner__empty-desc">
              No se detectaron alertas ni oportunidades de mejora.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-banner"
      data-urgency={urgencyLevel}
      data-has-insights="true"
      data-zone={currentZone}
      data-silence={silenceLevel}
      data-fatigue={fatigueLevel}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className="banner__header">
        <div className="banner__header-left">
          <Shield size={18} />
          <div className="banner__header-text">
            <span className="banner__title">Communication Advisor</span>
            <span className="banner__subtitle">
              {insights.length} hallazgo(s)
              {criticalCount > 0 && (
                <span className="banner__count-critical">
                  {" "}· {criticalCount} alerta(s)
                </span>
              )}
              {mediumCount > 0 && (
                <span className="banner__count-medium">
                  {" "}· {mediumCount} atención
                </span>
              )}
            </span>
          </div>
        </div>
        {compositeUrgency > 0 && (
          <div className="banner__urgency-badge" data-urgency={urgencyLevel}>
            <AlertTriangle size={12} />
            <span>{compositeUrgency}%</span>
          </div>
        )}
      </div>

      {/* ── Intelligence Strip ──────────────────────── */}
      {(trajectory || silence || fatigue || narrative) && (
        <div className="banner__intel-strip">
          {/* Emotional sparkline */}
          {sparklinePath && (
            <svg
              viewBox="0 0 200 28"
              className="banner__sparkline"
              role="img"
              aria-label={`Emotional trajectory: currently ${currentScore}/100, ${velocity > 0 ? "ascending" : velocity < 0 ? "descending" : "stable"}`}
            >
              <path
                d={sparklinePath}
                className="banner__sparkline-curve"
                data-zone={currentZone}
                fill="none"
              />
            </svg>
          )}

          {/* Zone badge */}
          <span className="banner__intel-badge" data-zone={currentZone}>
            {EMOTIONAL_ZONE_CONFIG[currentZone].label} {currentScore}
          </span>

          {/* Velocity arrow */}
          {Math.abs(velocity) > 0.5 && (
            <span className="banner__intel-velocity" data-direction={velocity > 0 ? "up" : "down"}>
              {velocity > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{velocity > 0 ? "+" : ""}{velocity.toFixed(1)}/sem</span>
            </span>
          )}

          {/* Silence badge */}
          {silence && silenceDays > 3 && (
            <span className="banner__intel-badge" data-silence={silenceLevel}>
              Silencio: {silenceDays}d
            </span>
          )}

          {/* Fatigue badge */}
          {fatigue && fatigue.current_level > 0.4 && (
            <span className="banner__intel-badge" data-fatigue={fatigueLevel}>
              Fatiga: {Math.round(fatigue.current_level * 100)}%
            </span>
          )}

          {/* Narrative dot */}
          {narrative && (
            <span className="banner__intel-narrative" data-health={storyHealth}>
              {STORY_HEALTH_CONFIG[storyHealth].label}
            </span>
          )}
        </div>
      )}

      {/* ── Insight Cards ───────────────────────────── */}
      <div className="banner__insights">
        {visibleInsights.map((insight: CommunicationInsight, idx: number) => {
          const sevCfg = SEVERITY_BADGE[insight.severity] ?? SEVERITY_BADGE.medium;
          const Icon = CATEGORY_ICON[insight.category] ?? AlertTriangle;
          const isExpanded = expandedId === insight.id;

          return (
            <div
              key={insight.id}
              className="insight-card"
              data-severity={insight.severity}
              data-expanded={isExpanded}
              style={{ "--stagger-i": idx } as React.CSSProperties}
            >
              {/* Severity accent bar */}
              <div className="insight-card__accent" data-severity={insight.severity} />

              <div className="insight-card__body">
                {/* Header */}
                <div className="insight-card__header">
                  <div className="insight-card__icon" data-severity={insight.severity}>
                    <Icon size={14} />
                  </div>
                  <span className="insight-card__sev-badge" data-severity={insight.severity}>
                    {sevCfg.label}
                  </span>
                  <span className="insight-card__metric">
                    {insight.impact} impact
                  </span>
                  <span className="insight-card__metric">
                    {insight.confidence}% conf
                  </span>
                  <span className="insight-card__category">
                    {CATEGORY_LABELS[insight.category]}
                  </span>
                </div>

                {/* Title + reasoning */}
                <h4 className="insight-card__title">{insight.title}</h4>
                <p className="insight-card__reasoning">{insight.reasoning}</p>

                {/* Actions */}
                <div className="insight-card__actions">
                  {insight.target_view && (
                    <button
                      className="insight-action-btn"
                      data-action="navigate"
                      onClick={() => onNavigate?.(insight.target_view!)}
                    >
                      <Zap size={12} />
                      <span>{NAV_LABELS[insight.target_view] ?? "Ver detalle"}</span>
                    </button>
                  )}

                  <button
                    className="insight-action-btn"
                    data-action="analysis"
                    onClick={() => toggleExpand(insight.id)}
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <Brain size={12} />}
                    <span>{isExpanded ? "Cerrar" : "Análisis"}</span>
                  </button>

                  {onAction && (
                    <>
                      <button
                        className="insight-action-btn"
                        data-action="approve"
                        onClick={() => onAction("approve", insight.id)}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        className="insight-action-btn"
                        data-action="postpone"
                        onClick={() => onAction("postpone", insight.id)}
                      >
                        <Clock size={12} />
                      </button>
                      <button
                        className="insight-action-btn"
                        data-action="delegate"
                        onClick={() => onAction("delegate", insight.id)}
                      >
                        <SkipForward size={12} />
                      </button>
                      <button
                        className="insight-action-btn"
                        data-action="discard"
                        onClick={() => onAction("discard", insight.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>

                {/* Expanded analysis */}
                {isExpanded && (
                  <div className="insight-card__analysis">
                    <div className="insight-analysis__block">
                      <span className="insight-analysis__label">Causa raíz</span>
                      <p className="insight-analysis__text">{insight.reasoning}</p>
                    </div>
                    {insight.domain && (
                      <div className="insight-analysis__block">
                        <span className="insight-analysis__label">Dominio</span>
                        <p className="insight-analysis__text">{insight.domain}</p>
                      </div>
                    )}
                    {insight.target_view && (
                      <div className="insight-analysis__block">
                        <span className="insight-analysis__label">Acción recomendada</span>
                        <p className="insight-analysis__text">
                          Navegar a {NAV_LABELS[insight.target_view] ?? insight.target_view}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Show more ──────────────────────────────── */}
      {hasMore && !showAll && (
        <button
          className="banner__show-more"
          onClick={() => setShowAll(true)}
        >
          <ChevronDown size={14} />
          <span>Ver {insights.length - 4} hallazgo(s) más</span>
        </button>
      )}

      {/* ── Escape countdown ───────────────────────── */}
      {showEscapeCountdown && daysToEscape !== null && (
        <div
          className="banner__countdown"
          data-critical={daysToEscape <= 7}
        >
          <AlertCircle size={14} />
          <span>
            {daysToEscape <= 0
              ? "Punto de no retorno alcanzado"
              : `Punto de no retorno: ${daysToEscape} días`}
          </span>
        </div>
      )}

      {/* ── Fatigue warning ────────────────────────── */}
      {fatigue && fatigue.current_level > 0.6 && (
        <div className="banner__fatigue-warning">
          <AlertTriangle size={12} />
          <span>
            Socio con fatiga alta ({Math.round(fatigue.current_level * 100)}%).
            Reducir frecuencia de contacto.
          </span>
        </div>
      )}
    </div>
  );
}