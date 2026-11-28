// src/features/communications/CommunicationDashboard.tsx
// ═══════════════════════════════════════════════════════════
// Communication Cortex — The Living Brain V2
// Castillo Country Club — Phase 31 "The Voice"
//
// V2: Real Adaptive Morphism. SVG mini-visualizations in every
// panel. Decision as narrative block. Composite score as hero
// gauge. Thinking entries with cursor animation. Glass-native
// page wrapper (no shared UI). Error state handling.
//
// Eliminated: PageContainer, Skeleton, cn utility.
// Namespace: glass-comm-dashboard
// ═══════════════════════════════════════════════════════════

import { useMemo, Suspense } from "react";
import {
  Brain, Heart, Clock, BookOpen, Bell, Zap, Eye,
  AlertTriangle, Activity,
  CheckCircle, Shield, ChevronRight, Radio,
  Send, CalendarClock, PenLine, RefreshCw, Target,
} from "lucide-react";

import { showToast } from "@/shared/components/ui";

import { useCommunicationDashboard } from "./hooks/useCommunicationDashboard";
import type {
  CommDashboardState,
  CommStreamItem,
} from "./hooks/useCommunicationDashboard";

import {
  EMOTIONAL_ZONE_CONFIG,
  FATIGUE_LEVEL_CONFIG,
  NARRATIVE_PHASE_CONFIG,
  STORY_HEALTH_CONFIG,
  getChannelLabel,
} from "./types";

import type {
  EmotionalDataPoint,
  NarrativeChapter,
  NotificationChannel,
} from "./types";

import { COMMUNICATION_DASHBOARD_MODES } from "./config";

import { CommunicationCortex } from "./components/CommunicationCortex";
import type { ThinkingEntry } from "./components/CommunicationCortex";

import "./CommunicationDashboard.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// SVG SUB: Composite Score Ring (hero gauge)
// ═══════════════════════════════════════════════════════════

function CompositeScoreRing({
  score,
  mode,
}: {
  score: number;
  mode: "calm" | "alert" | "critical";
}) {
  const W = 180;
  const H = 180;
  const cx = W / 2;
  const cy = H / 2;
  const r = 68;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const level = score >= 70 ? "good" : score >= 40 ? "fair" : "poor";

  return (
    <div className="comm-ring" data-mode={mode}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="comm-ring__svg"
        role="img"
        aria-label={`Salud comunicacional: ${score} de 100`}
      >
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" className="comm-ring__track" strokeWidth={10}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" className="comm-ring__fill" data-level={level}
          strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Score */}
        <text x={cx} y={cy - 10} textAnchor="middle" className="comm-ring__number">
          {score}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="comm-ring__label">
          Salud
        </text>
      </svg>
      <span className="comm-ring__mode-label" data-mode={mode}>
        {COMMUNICATION_DASHBOARD_MODES[mode].label}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SVG SUB: Emotional Sparkline
// ═══════════════════════════════════════════════════════════

function EmotionalSparkline({ history }: { history: EmotionalDataPoint[] }) {
  if (history.length < 2) return null;

  const W = 120;
  const H = 36;
  const pad = 4;

  const sorted = [...history].sort(
    (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const pts = sorted.slice(-20);
  const xStep = (W - pad * 2) / Math.max(pts.length - 1, 1);

  const polyline = pts
    .map((dp: EmotionalDataPoint, i: number) => {
      const x = pad + i * xStep;
      const y = H - pad - (dp.score / 100) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const last = pts[pts.length - 1];
  const lx = pad + (pts.length - 1) * xStep;
  const ly = H - pad - (last.score / 100) * (H - pad * 2);

  // Trigger markers
  const triggers = pts.filter(
    (dp: EmotionalDataPoint, i: number) =>
      i > 0 && Math.abs(dp.score - pts[i - 1].score) >= 15,
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="comm-sparkline"
      role="img"
      aria-label={`Historial emocional: ${pts.length} puntos`}
    >
      <polyline
        points={polyline}
        fill="none"
        className="comm-sparkline__line"
        strokeWidth={1.5}
      />
      {triggers.map((dp: EmotionalDataPoint, i: number) => {
        const idx = pts.indexOf(dp);
        const tx = pad + idx * xStep;
        const ty = H - pad - (dp.score / 100) * (H - pad * 2);
        return (
          <circle
            key={i}
            cx={tx} cy={ty} r={2.5}
            className="comm-sparkline__trigger"
            data-positive={dp.score > pts[idx - 1]?.score}
          />
        );
      })}
      <circle cx={lx} cy={ly} r={3.5} className="comm-sparkline__dot" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// SVG SUB: Channel Bars
// ═══════════════════════════════════════════════════════════

function ChannelBars({
  channelScores,
  preferred,
}: {
  channelScores: Record<NotificationChannel, number>;
  preferred: NotificationChannel;
}) {
  const entries = (Object.entries(channelScores) as [NotificationChannel, number][])
    .sort(([, a]: [NotificationChannel, number], [, b]: [NotificationChannel, number]) => b - a);

  return (
    <div className="comm-ch-bars">
      {entries.map(([ch, score]: [NotificationChannel, number]) => (
        <div
          key={ch}
          className="comm-ch-bar"
          data-channel={ch}
          data-preferred={ch === preferred}
        >
          <span className="comm-ch-bar__label">{getChannelLabel(ch)}</span>
          <div className="comm-ch-bar__track">
            <div
              className="comm-ch-bar__fill"
              style={{ "--bar-w": `${Math.max(score * 100, 2)}%` } as React.CSSProperties}
            />
          </div>
          <span className="comm-ch-bar__value">{Math.round(score * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SVG SUB: Narrative Timeline Dots
// ═══════════════════════════════════════════════════════════

function NarrativeDots({
  chapters,
  openCallbacks,
}: {
  chapters: NarrativeChapter[];
  openCallbacks: string[];
}) {
  if (chapters.length === 0) return null;

  return (
    <div className="comm-nar-dots">
      <div className="comm-nar-dots__line" />
      <div className="comm-nar-dots__row">
        {chapters.map((ch: NarrativeChapter, i: number) => (
          <div
            key={ch.id}
            className="comm-nar-dot"
            data-sentiment={ch.sentiment}
            data-current={i === chapters.length - 1}
            title={ch.title}
          />
        ))}
        {openCallbacks.length > 0 && (
          <div
            className="comm-nar-callback"
            title={`${openCallbacks.length} compromiso(s) pendiente(s)`}
          >
            ◆
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function computeCompositeScore(state: CommDashboardState): number {
  const emotional = state.trajectory?.current.score ?? 50;
  const silenceRetention = state.silence
    ? Math.round((1 - state.silence.disengagement_risk) * 100)
    : 50;
  const fatigueFreshness = state.fatigue
    ? Math.round((1 - state.fatigue.current_level) * 100)
    : 50;
  const narrativeStrength = state.narrative
    ? state.narrative.story_health === "strong"
      ? 80
      : state.narrative.story_health === "fragile"
        ? 50
        : 25
    : 50;

  return Math.round(
    emotional * 0.4 +
      silenceRetention * 0.2 +
      fatigueFreshness * 0.2 +
      narrativeStrength * 0.2,
  );
}

function getStreamIcon(category: CommStreamItem["category"]) {
  const map: Record<string, typeof Brain> = {
    silence: Clock,
    emotion: Heart,
    fatigue: Bell,
    narrative: BookOpen,
    risk: AlertTriangle,
    positive: CheckCircle,
    optimization: Zap,
    insight: Eye,
  };
  return map[category] ?? Eye;
}

function generateThinkingEntries(state: CommDashboardState): ThinkingEntry[] {
  const entries: ThinkingEntry[] = [];
  const now = Date.now();

  if (state.trajectory) {
    const zoneCfg = EMOTIONAL_ZONE_CONFIG[state.emotionalZone];
    const dir = state.trajectory.trajectory;
    const dirLabel =
      dir === "ascending" ? "↗ ascendiendo" :
      dir === "descending" ? "↘ descendiendo" : "→ estable";

    entries.push({
      id: "think-emo",
      timestamp: new Date(now).toISOString(),
      type: dir === "descending" ? "analysis" : "observation",
      text: `Emoción: ${zoneCfg.label} (${state.trajectory.current.score}/100), ${dirLabel} a ${Math.abs(state.trajectory.velocity).toFixed(1)} pts/sem.`,
      icon: dir === "descending" ? "trending-down" : dir === "ascending" ? "trending-up" : "activity",
    });

    if (state.trajectory.forecast.intervention_window) {
      entries.push({
        id: "think-forecast",
        timestamp: new Date(now + 500).toISOString(),
        type: "prediction",
        text: `Proyección 7d: ${state.trajectory.forecast.predicted_score_7d}/100. Ventana de intervención ACTIVA — actuar antes de que baje de 35.`,
        icon: "trending-up",
        confidence: state.trajectory.forecast.confidence,
      });
    }
  }

  if (state.silence && state.silence.current_silence_days > 0) {
    const days = state.silence.current_silence_days;
    const base = state.silence.avg_silence_days;
    const mult = base > 0 ? (days / base).toFixed(1) : "∞";
    entries.push({
      id: "think-silence",
      timestamp: new Date(now + 1000).toISOString(),
      type: days > 14 ? "evaluation" : "observation",
      text: `Silencio: ${days} días (baseline: ${base}d → ${mult}×). Desengagement risk: ${Math.round(state.silence.disengagement_risk * 100)}%.`,
      icon: days > 14 ? "alert-triangle" : "clock",
    });
  }

  if (state.narrative) {
    const health = STORY_HEALTH_CONFIG[state.narrative.story_health];
    const phase = NARRATIVE_PHASE_CONFIG[state.narrative.current_phase];
    entries.push({
      id: "think-narrative",
      timestamp: new Date(now + 2000).toISOString(),
      type: state.narrative.story_health === "breaking" ? "evaluation" : "observation",
      text: `Narrativa: ${health.label} — ${state.narrative.chapters.length} capítulos, fase ${phase.label.toLowerCase()}.${state.narrative.open_callbacks.length > 0 ? ` ${state.narrative.open_callbacks.length} compromiso(s) pendiente(s).` : ""}`,
      icon: "book-open",
    });
  }

  if (state.fatigue && state.fatigue.current_level > 0.3) {
    entries.push({
      id: "think-fatigue",
      timestamp: new Date(now + 3000).toISOString(),
      type: state.fatigue.current_level > 0.7 ? "decision" : "analysis",
      text: `Fatiga: ${Math.round(state.fatigue.current_level * 100)}% (${state.fatigue.messages_received_7d} msgs/7d). Tendencia: ${state.fatigue.trend}.${state.fatigue.current_level > 0.7 ? ` Recomiendo pausa de ${state.fatigue.recommended_cooldown_days}d.` : ""}`,
      icon: "bell",
    });
  }

  if (state.briefing) {
    entries.push({
      id: "think-decision",
      timestamp: new Date(now + 4000).toISOString(),
      type: "action",
      text: `Propuesta: canal ${state.briefing.recommended_channel}, tono ${state.briefing.recommended_tone}. ${state.briefing.recommended_timing}.${state.briefing.fatigue_warning ? " ⚠ Fatiga alta — esperar." : ""}`,
      icon: "zap",
      confidence: Math.round((1 - state.disengagementRiskScore) * 100),
    });
  }

  if (entries.length === 0) {
    entries.push({
      id: "think-idle",
      timestamp: new Date(now).toISOString(),
      type: "observation",
      text: state.isLoading
        ? "Cargando inteligencia comunicacional..."
        : "Seleccioná un socio para activar el Communication Cortex.",
      icon: "eye",
    });
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface CommunicationDashboardProps {
  memberId?: string;
}

export function CommunicationDashboard({ memberId }: CommunicationDashboardProps) {
  const state = useCommunicationDashboard(memberId);

  const compositeScore = useMemo(() => computeCompositeScore(state), [state]);
  const thinkingEntries = useMemo(() => generateThinkingEntries(state), [state]);
  const modeConfig = COMMUNICATION_DASHBOARD_MODES[state.dashboardMode];

  const hasError = !state.isLoading && !!memberId && !state.trajectory && !state.fingerprint;

  // ── Page wrapper (replaces PageContainer) ─────────
  function PageShell({ children }: { children: React.ReactNode }) {
    return (
      <div className="comm-page">
        <nav className="comm-page__breadcrumbs" aria-label="Navegación">
          <a href="/admin" className="comm-page__crumb">Dashboard</a>
          <ChevronRight size={12} className="comm-page__crumb-sep" />
          <a href="/admin/communications" className="comm-page__crumb">Comunicaciones</a>
          <ChevronRight size={12} className="comm-page__crumb-sep" />
          <span className="comm-page__crumb comm-page__crumb--current">Cortex</span>
        </nav>
        <h1 className="comm-page__title">Communication Cortex</h1>
        <p className="comm-page__subtitle">Cerebro de inteligencia comunicacional</p>
        {children}
      </div>
    );
  }

  // ── Empty state (no memberId) ─────────────────────
  if (!memberId) {
    return (
      <PageShell>
        <div className="comm-empty-hero">
          <div className="comm-empty-hero__icon">
            <Brain size={40} />
          </div>
          <h2 className="comm-empty-hero__title">Communication Cortex</h2>
          <p className="comm-empty-hero__sub">
            Seleccioná un socio para activar el cerebro comunicacional.
            El cortex analizará emoción, silencio, fatiga, narrativa y fingerprint
            para proponer la comunicación óptima.
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Error state ───────────────────────────────────
  if (hasError) {
    return (
      <PageShell>
        <div className="comm-error-state">
          <AlertTriangle size={32} className="comm-error-state__icon" />
          <h3>No se pudo cargar la inteligencia</h3>
          <p>Intentá nuevamente o verificá la conexión.</p>
          <Button
            variant="unstyled"
            className="comm-error-state__retry"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} />
            <span>Reintentar</span>
          </Button>
        </div>
      </PageShell>
    );
  }

  // ══════════════════════════════════════════════════
  // ACTIVE RENDER
  // ══════════════════════════════════════════════════

  return (
    <PageShell>
      <div
        className="glass-comm-dashboard"
        data-mode={state.dashboardMode}
        data-zone={state.emotionalZone}
        data-silence={state.silenceLevel}
        data-fatigue={state.fatigueLevel}
      >
        {/* ── Ambient background (CSS-only) ────────── */}
        <div className="comm-ambient" data-mode={state.dashboardMode} />

        {/* ── Header strip ─────────────────────────── */}
        <header className="comm-header">
          <div className="comm-header__left">
            <Brain size={20} className="comm-header__brain-icon" />
            <span className="comm-header__title">Cortex</span>
          </div>

          <div className="comm-header__center">
            <div className="comm-header__zone" data-zone={state.emotionalZone}>
              <Heart size={14} />
              <span>{EMOTIONAL_ZONE_CONFIG[state.emotionalZone].label}</span>
              {state.trajectory && (
                <span className="comm-header__score">
                  {state.trajectory.current.score}
                </span>
              )}
            </div>

            {state.narrative && (
              <div
                className="comm-header__narrative"
                data-health={state.narrative.story_health}
              >
                <BookOpen size={14} />
                <span>{NARRATIVE_PHASE_CONFIG[state.narrative.current_phase].label}</span>
              </div>
            )}

            {state.fatigue && (
              <div className="comm-header__fatigue" data-level={state.fatigueLevel}>
                <Bell size={14} />
                <span>{FATIGUE_LEVEL_CONFIG[state.fatigueLevel].label}</span>
              </div>
            )}
          </div>

          <div className="comm-header__mode" data-mode={state.dashboardMode}>
            <Shield size={14} />
            <span>{modeConfig.label}</span>
          </div>
        </header>

        {/* ── Silence alert banner ─────────────────── */}
        {state.silenceLevel === "critical" && state.silence && (
          <div className="comm-silence-alert" data-severity="critical">
            <AlertTriangle size={18} />
            <div className="comm-silence-alert__content">
              <strong>Silencio crítico</strong>
              <span>
                {state.silence.current_silence_days} días sin contacto —
                riesgo: {Math.round(state.silence.disengagement_risk * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* ── Hero: Composite Ring + Cortex ────────── */}
        <section className="comm-hero-row">
          <CompositeScoreRing score={compositeScore} mode={state.dashboardMode} />

          <div className="comm-cortex-section">
            {state.isLoading ? (
              <div className="comm-cortex-skeleton">
                <div className="comm-skeleton comm-skeleton--tall" />
              </div>
            ) : (
              <Suspense
                fallback={<div className="comm-skeleton comm-skeleton--tall" />}
              >
                <CommunicationCortex
                  state={state}
                  thinkingEntries={thinkingEntries}
                  compositeScore={compositeScore}
                />
              </Suspense>
            )}
          </div>
        </section>

        {/* ── Decision + Stream ────────────────────── */}
        <section className="comm-actions" data-mode={state.dashboardMode}>

          {/* Decision Panel — narrative block */}
          <div className="comm-decision-panel">
            <h3 className="comm-section-title">
              <Zap size={16} />
              <span>Decisiones Propuestas</span>
            </h3>

            {state.briefing ? (
              <>
                <div className="comm-decision__narrative">
                  <p>
                    Recomiendo contactar por{" "}
                    <strong>{getChannelLabel(state.briefing.recommended_channel)}</strong>{" "}
                    con tono <strong>{state.briefing.recommended_tone}</strong>.
                    {state.briefing.recommended_timing && (
                      <> {state.briefing.recommended_timing}.</>
                    )}
                  </p>

                  {state.briefing.talking_points.length > 0 && (
                    <blockquote className="comm-decision__talking">
                      {state.briefing.talking_points[0]}
                    </blockquote>
                  )}

                  {state.briefing.avoid_topics.length > 0 && (
                    <p className="comm-decision__avoid">
                      <span>Evitá mencionar:</span>{" "}
                      {state.briefing.avoid_topics.join(", ")}
                    </p>
                  )}
                </div>

                <div className="comm-decision__actions">
                  <Button
                    variant="unstyled"
                    className="comm-decision__cta comm-decision__cta--primary"
                    onClick={() => showToast({ type: "success", message: "Envío iniciado" })}
                  >
                    <Send size={14} />
                    <span>Enviar ahora</span>
                  </Button>
                  <Button
                    variant="unstyled"
                    className="comm-decision__cta comm-decision__cta--secondary"
                    onClick={() => showToast({ type: "success", message: "Programado" })}
                  >
                    <CalendarClock size={14} />
                    <span>Programar</span>
                  </Button>
                  <Button
                    variant="unstyled"
                    className="comm-decision__cta comm-decision__cta--tertiary"
                    onClick={() => showToast({ type: "info", message: "Abriendo compositor..." })}
                  >
                    <PenLine size={14} />
                    <span>Personalizar</span>
                  </Button>
                </div>

                <div
                  className="comm-decision__urgency"
                  data-urgency={state.interventionUrgency}
                >
                  <Shield size={14} />
                  <span>Urgencia: {state.interventionUrgency}</span>
                  {state.briefing.fatigue_warning && (
                    <span className="comm-decision__fatigue-warn">
                      ⚠ Fatiga alta
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="comm-decision__empty">
                {memberId
                  ? "Sin decisiones propuestas — esperando datos"
                  : "Seleccioná un socio para ver decisiones"}
              </div>
            )}
          </div>

          {/* Intelligence Stream */}
          <div className="comm-stream-panel">
            <h3 className="comm-section-title">
              <Activity size={16} />
              <span>Señales de Inteligencia</span>
              {state.streamItems.length > 0 && (
                <span className="comm-stream__count">
                  {state.streamItems.length}
                </span>
              )}
            </h3>

            {state.streamItems.length > 0 ? (
              <div className="comm-stream__list">
                {state.streamItems.map((item: CommStreamItem, i: number) => {
                  const Icon = getStreamIcon(item.category);
                  return (
                    <div
                      key={item.id}
                      className="comm-stream__item"
                      data-severity={item.severity}
                      data-category={item.category}
                      style={{ "--stagger-i": i } as React.CSSProperties}
                    >
                      <div className="comm-stream__highlight" data-severity={item.severity} />
                      <Icon size={16} className="comm-stream__icon" />
                      <div className="comm-stream__content">
                        <span className="comm-stream__title">{item.title}</span>
                        <span className="comm-stream__desc">{item.description}</span>
                      </div>
                      {item.actionable && (
                        <ChevronRight size={14} className="comm-stream__action-arrow" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="comm-stream__empty">
                Sin señales activas — ecosistema en equilibrio
              </div>
            )}
          </div>
        </section>

        {/* ── Deep Intelligence Panels ─────────────── */}
        <section className="comm-panels" data-mode={state.dashboardMode}>

          {/* Emotional — sparkline */}
          <div className="comm-panel-card" data-panel="emotional">
            <div className="comm-panel-card__header">
              <Heart size={16} />
              <span>Campo Emocional</span>
            </div>
            <div className="comm-panel-card__body">
              {state.trajectory ? (
                <>
                  <div className="comm-panel__top-row">
                    <div className="comm-panel__metric">
                      <span className="comm-panel__big-number">
                        {state.trajectory.current.score}
                      </span>
                      <span className="comm-panel__unit">/100</span>
                    </div>
                    <EmotionalSparkline history={state.trajectory.history} />
                  </div>
                  <div className="comm-panel__label">
                    {EMOTIONAL_ZONE_CONFIG[state.emotionalZone].label}
                  </div>
                  <div className="comm-panel__detail">
                    {state.trajectory.velocity > 0 ? "+" : ""}
                    {state.trajectory.velocity.toFixed(1)} pts/sem
                    {state.trajectory.forecast.intervention_window && (
                      <span className="comm-panel__alert-tag">Intervención</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="comm-panel__empty">Sin datos</div>
              )}
            </div>
          </div>

          {/* Channels — bar chart */}
          <div className="comm-panel-card" data-panel="channels">
            <div className="comm-panel-card__header">
              <Radio size={16} />
              <span>Canales</span>
            </div>
            <div className="comm-panel-card__body">
              {state.fingerprint ? (
                <>
                  <ChannelBars
                    channelScores={state.fingerprint.channel_scores}
                    preferred={state.fingerprint.preferred_channel}
                  />
                  <div className="comm-panel__detail">
                    Tono: {state.fingerprint.resonant_tone} · Cada{" "}
                    {state.fingerprint.optimal_frequency_days}d
                  </div>
                </>
              ) : (
                <div className="comm-panel__empty">Sin datos</div>
              )}
            </div>
          </div>

          {/* Narrative — dot timeline */}
          <div className="comm-panel-card" data-panel="narrative">
            <div className="comm-panel-card__header">
              <BookOpen size={16} />
              <span>Narrativa</span>
            </div>
            <div className="comm-panel-card__body">
              {state.narrative ? (
                <>
                  <div className="comm-panel__metric">
                    <span className="comm-panel__big-number">
                      {state.narrative.chapters.length}
                    </span>
                    <span className="comm-panel__unit">capítulos</span>
                  </div>
                  <NarrativeDots
                    chapters={state.narrative.chapters}
                    openCallbacks={state.narrative.open_callbacks}
                  />
                  <div
                    className="comm-panel__label"
                    data-health={state.narrative.story_health}
                  >
                    {STORY_HEALTH_CONFIG[state.narrative.story_health].label}
                  </div>
                  <div className="comm-panel__detail">
                    Fase: {NARRATIVE_PHASE_CONFIG[state.narrative.current_phase].label}
                  </div>
                </>
              ) : (
                <div className="comm-panel__empty">Sin datos</div>
              )}
            </div>
          </div>

          {/* Retention — risk gauge */}
          <div className="comm-panel-card" data-panel="gravity">
            <div className="comm-panel-card__header">
              <Target size={16} />
              <span>Retención</span>
            </div>
            <div className="comm-panel-card__body">
              <div className="comm-retention-gauge">
                <svg viewBox="0 0 120 68" className="comm-retention-gauge__svg">
                  <path
                    d="M 12 60 A 48 48 0 0 1 108 60"
                    fill="none" className="comm-retention-gauge__track" strokeWidth={8}
                  />
                  <path
                    d="M 12 60 A 48 48 0 0 1 108 60"
                    fill="none"
                    className="comm-retention-gauge__fill"
                    data-urgency={state.interventionUrgency}
                    strokeWidth={8} strokeLinecap="round"
                    strokeDasharray={`${Math.PI * 48}`}
                    strokeDashoffset={`${Math.PI * 48 * (1 - state.disengagementRiskScore)}`}
                  />
                  <text x={60} y={50} textAnchor="middle" className="comm-retention-gauge__number">
                    {Math.round(state.disengagementRiskScore * 100)}
                  </text>
                  <text x={60} y={64} textAnchor="middle" className="comm-retention-gauge__unit">
                    % riesgo
                  </text>
                </svg>
              </div>
              <div
                className="comm-panel__label"
                data-urgency={state.interventionUrgency}
              >
                {state.interventionUrgency === "none"
                  ? "Estable"
                  : `Urgencia: ${state.interventionUrgency}`}
              </div>
              <div className="comm-panel__detail">
                {state.alerts.length > 0
                  ? `${state.alerts.length} alerta(s) activa(s)`
                  : "Sin alertas"}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}