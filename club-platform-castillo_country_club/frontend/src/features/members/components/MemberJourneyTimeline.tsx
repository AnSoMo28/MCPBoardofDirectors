/**
 * MemberJourneyTimeline — Living Journey Map
 * Phase 30 — Block 4.4: Where They've Been + Where They're Going
 *
 * Two lanes: real milestones (past) + ghost predictions (future).
 * Spaced by SIGNIFICANCE, not by date.
 * NOW marker pulses with member state.
 * Domain filter for exploration.
 *
 * The journey isn't a history log — it's a story with foreshadowing.
 */

import { useMemo, useState } from "react";
import {
  Calendar,
  ArrowRight,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Skeleton, EmptyState } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMemberJourney } from "../hooks/useMember360MCP";
import type {
  MemberTemperature,
  MemberState,
} from "../types";
import {
  JOURNEY_STAGE_DISPLAY,
  ACTIVITY_DOMAIN_DISPLAY,
  type JourneyStage,
  type ActivityDomain,
} from "../types";
import type { MemberPredictions } from "../lib/memberPredictions";

import "./MemberJourneyTimeline.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MemberJourneyTimelineProps {
  memberId: string;
  predictions?: MemberPredictions;
  temperature?: MemberTemperature;
}

// Stage order from types.ts
const STAGE_ORDER: JourneyStage[] = [
  "new_member",
  "onboarding",
  "active",
  "engaged",
  "at_risk",
  "dormant",
  "churned",
  "win_back",
];

const JOURNEY_HEALTH_MAP: Record<
  string,
  { label: string; color: string; icon: typeof TrendingUp }
> = {
  healthy: {
    label: "Saludable",
    color: "var(--color-emerald-400)",
    icon: TrendingUp,
  },
  accelerating: {
    label: "Acelerando",
    color: "var(--color-teal-400)",
    icon: TrendingUp,
  },
  stalled: {
    label: "Estancado",
    color: "var(--color-amber-400)",
    icon: Minus,
  },
  declining: {
    label: "En declive",
    color: "var(--color-rose-400)",
    icon: TrendingDown,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberJourneyTimeline({
  memberId,
  predictions,
  temperature,
}: MemberJourneyTimelineProps) {
  const { data, isLoading, isError } = useMemberJourney(memberId);
  const memberState: MemberState = temperature?.state ?? "stable";
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  // ── Build ghost events from predictions ──────────────────────────
  const ghostEvents = useMemo(() => {
    if (!predictions) return [];

    const events: Array<{
      id: string;
      title: string;
      daysFromNow: number;
      confidence: number;
      icon: string;
      color: string;
    }> = [];

    // Lifecycle prediction
    const lp = predictions.lifecyclePrediction;
    if (lp && lp.direction !== "neutral") {
      const stageDisplay =
        JOURNEY_STAGE_DISPLAY[lp.predictedNextStage as JourneyStage];
      events.push({
        id: `lifecycle-${lp.predictedNextStage}`,
        title: `Transición a ${stageDisplay?.label ?? lp.predictedNextStage}`,
        daysFromNow: lp.daysToTransition,
        confidence: lp.confidence,
        icon: lp.direction === "positive" ? "↑" : "↓",
        color:
          lp.direction === "positive"
            ? "var(--color-emerald-400)"
            : "var(--color-rose-400)",
      });
    }

    // Engagement trajectory inflection
    predictions.engagementTrajectory.inflectionPoints.forEach((ip, i) => {
      if (ip.day > 0 && ip.day <= 90) {
        events.push({
          id: `inflection-${i}`,
          title: ip.description,
          daysFromNow: ip.day,
          confidence: 0.6,
          icon: ip.temperatureAtPoint > (temperature?.composite ?? 50) ? "↑" : "↓",
          color:
            ip.temperatureAtPoint > (temperature?.composite ?? 50)
              ? "var(--color-emerald-400)"
              : "var(--color-rose-400)",
        });
      }
    });

    // Churn deadline
    if (
      predictions.churnForecast.daysToLikelyChurn !== null &&
      predictions.churnForecast.daysToLikelyChurn < 180
    ) {
      events.push({
        id: "churn-deadline",
        title: "Fecha probable de churn",
        daysFromNow: predictions.churnForecast.daysToLikelyChurn,
        confidence:
          predictions.churnForecast.predictedProbability.confidence,
        icon: "⚠",
        color: "var(--color-rose-400)",
      });
    }

    return events.sort((a, b) => a.daysFromNow - b.daysFromNow);
  }, [predictions, temperature]);

  // ── Available domains for filter ─────────────────────────────────
  const availableDomains = useMemo(() => {
    if (!data?.milestones) return [];
    const domains = new Set<string>();
    data.milestones.forEach((ms) => {
      if (ms.domain) domains.add(ms.domain);
    });
    return Array.from(domains);
  }, [data?.milestones]);

  const filteredMilestones = useMemo(() => {
    if (!data?.milestones) return [];
    if (!activeDomain) return data.milestones;
    return data.milestones.filter((ms) => ms.domain === activeDomain);
  }, [data?.milestones, activeDomain]);

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-m360-journey space-y-4">
        <Skeleton className="h-24 rounded-[18px]" />
        <Skeleton className="h-64 rounded-[18px]" />
      </div>
    );
  }

  if (isError || !data) {
    return <SectionError title="Error cargando journey" />;
  }

  const stageDisplay =
    JOURNEY_STAGE_DISPLAY[data.current_stage as JourneyStage];
  const healthInfo =
    JOURNEY_HEALTH_MAP[data.journey_health] ?? JOURNEY_HEALTH_MAP.healthy;
  const HealthIcon = healthInfo.icon;

  return (
    <div
      className="glass-m360-journey"
      data-member-state={memberState}
    >
      {/* ── Current Stage Header ── */}
      <div className="glass-m360-journey__header">
        <div className="glass-m360-journey__header-stage">
          <p className="glass-m360-journey__header-label">Etapa Actual</p>
          <span
            className="glass-m360-journey__header-stage-badge"
            style={{
              color: stageDisplay?.color ?? "var(--color-silver-200)",
              background: stageDisplay?.bgColor ?? "transparent",
              borderColor: `color-mix(in srgb, ${stageDisplay?.color ?? "var(--color-silver-600)"} 30%, transparent)`,
            }}
          >
            {stageDisplay?.label ?? data.current_stage}
          </span>
        </div>

        <div className="glass-m360-journey__header-stat">
          <p className="glass-m360-journey__header-label">Días en etapa</p>
          <p className="glass-m360-journey__header-value">
            {data.days_in_stage}
          </p>
        </div>

        <div className="glass-m360-journey__header-stat">
          <p className="glass-m360-journey__header-label">
            Salud del Journey
          </p>
          <span
            className="glass-m360-journey__header-health"
            style={{ color: healthInfo.color }}
          >
            <HealthIcon className="w-3.5 h-3.5" />
            {healthInfo.label}
          </span>
        </div>

        {data.next_expected_transition && (
          <div className="glass-m360-journey__header-stat">
            <p className="glass-m360-journey__header-label">
              Próxima transición
            </p>
            <span className="glass-m360-journey__header-transition">
              {JOURNEY_STAGE_DISPLAY[
                data.next_expected_transition as JourneyStage
              ]?.label ?? data.next_expected_transition}
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>

      {/* ── Stage Progress Bar ── */}
      <div className="glass-m360-journey__progress">
        <h3 className="glass-m360-journey__section-title">
          Progreso del Lifecycle
        </h3>
        <div className="glass-m360-journey__progress-bar">
          {STAGE_ORDER.map((stage) => {
            const display = JOURNEY_STAGE_DISPLAY[stage];
            const isCurrent = stage === data.current_stage;
            const currentIndex = STAGE_ORDER.indexOf(
              data.current_stage as JourneyStage,
            );
            const stageIndex = STAGE_ORDER.indexOf(stage);
            const wasVisited = stageIndex <= currentIndex;
            const historyEntry = data.stage_history?.find(
              (h) => h.stage === stage,
            );

            return (
              <div key={stage} className="glass-m360-journey__progress-step">
                <div
                  className={cn(
                    "glass-m360-journey__progress-segment",
                    isCurrent &&
                      "glass-m360-journey__progress-segment--current",
                  )}
                  style={{
                    background: wasVisited
                      ? display?.color ?? "var(--color-silver-400)"
                      : "var(--color-surface-3)",
                  }}
                />
                <p
                  className={cn(
                    "glass-m360-journey__progress-label",
                    isCurrent &&
                      "glass-m360-journey__progress-label--current",
                  )}
                >
                  {display?.label ?? stage}
                </p>
                {historyEntry && (
                  <p className="glass-m360-journey__progress-duration">
                    {historyEntry.duration_days}d
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stage History Timeline ── */}
      <div className="glass-m360-journey__history">
        <h3 className="glass-m360-journey__section-title">
          <Clock className="w-4 h-4 text-[var(--color-silver-400)]" />
          Historial de Etapas
        </h3>

        {!data.stage_history || data.stage_history.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="Sin historial"
            description="El historial de etapas se registra con el tiempo"
          />
        ) : (
          <div className="glass-m360-journey__timeline">
            {/* Center line */}
            <div className="glass-m360-journey__timeline-line" />

            {data.stage_history.map((entry, idx) => {
              const display =
                JOURNEY_STAGE_DISPLAY[entry.stage as JourneyStage];
              const isCurrent =
                idx === data.stage_history.length - 1;
              const entryDate = new Date(entry.entered_at);
              const exitDate = entry.exited_at
                ? new Date(entry.exited_at)
                : null;

              return (
                <div
                  key={`${entry.stage}-${idx}`}
                  className="glass-m360-journey__timeline-node"
                  style={
                    { "--stagger-i": idx } as React.CSSProperties
                  }
                >
                  {/* Marker */}
                  <div
                    className={cn(
                      "glass-m360-journey__timeline-marker",
                      isCurrent &&
                        "glass-m360-journey__timeline-marker--current",
                    )}
                    style={{
                      background: isCurrent
                        ? display?.color ?? "var(--color-silver-400)"
                        : "var(--color-surface-3)",
                      borderColor: isCurrent
                        ? display?.color ?? "var(--color-silver-400)"
                        : "transparent",
                    }}
                  >
                    {isCurrent ? (
                      <Target className="w-2.5 h-2.5" />
                    ) : (
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="glass-m360-journey__timeline-content">
                    <div className="glass-m360-journey__timeline-header">
                      <span
                        className="glass-m360-journey__timeline-stage-badge"
                        style={{
                          color: display?.color ?? "var(--color-silver-200)",
                          background: display?.bgColor ?? "transparent",
                        }}
                      >
                        {display?.label ?? entry.stage}
                      </span>
                      {isCurrent && (
                        <span className="glass-m360-journey__timeline-current-badge">
                          ACTUAL
                        </span>
                      )}
                      <span className="glass-m360-journey__timeline-duration">
                        {entry.duration_days} días
                      </span>
                    </div>
                    <p className="glass-m360-journey__timeline-date">
                      {entryDate.toLocaleDateString("es-CR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {exitDate && (
                        <>
                          {" → "}
                          {exitDate.toLocaleDateString("es-CR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </>
                      )}
                      {!exitDate && isCurrent && " → presente"}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* NOW marker */}
            <div className="glass-m360-journey__now" data-member-state={memberState}>
              <span className="glass-m360-journey__now-dot" />
              <span className="glass-m360-journey__now-label">Ahora</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Ghost Lane: Predictions ── */}
      {ghostEvents.length > 0 && (
        <div className="glass-m360-journey__ghost">
          <h3 className="glass-m360-journey__section-title">
            ◇ Proyecciones Futuras
          </h3>
          <div className="glass-m360-journey__ghost-list">
            {ghostEvents.map((event, i) => (
              <div
                key={event.id}
                className="glass-m360-journey__ghost-event"
                style={
                  {
                    "--stagger-i": i,
                    "--ghost-color": event.color,
                  } as React.CSSProperties
                }
              >
                <span className="glass-m360-journey__ghost-icon">
                  {event.icon}
                </span>
                <span className="glass-m360-journey__ghost-title">
                  {event.title}
                </span>
                <div className="glass-m360-journey__ghost-meta">
                  <span className="glass-m360-journey__ghost-days">
                    {event.daysFromNow}d
                  </span>
                  <div className="glass-m360-journey__ghost-confidence-bar-wrap">
                    <div
                      className="glass-m360-journey__ghost-confidence-bar"
                      style={{
                        width: `${event.confidence * 100}%`,
                        background: event.color,
                      }}
                    />
                  </div>
                  <span className="glass-m360-journey__ghost-confidence-value">
                    {Math.round(event.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Milestones ── */}
      {data.milestones && data.milestones.length > 0 && (
        <div className="glass-m360-journey__milestones">
          <h3 className="glass-m360-journey__section-title">
            <Target className="w-4 h-4 text-[var(--color-gold-400)]" />
            Hitos
          </h3>

          {availableDomains.length > 1 && (
            <div className="glass-m360-journey__domain-filters">
              <Button
                variant="unstyled"
                onClick={() => setActiveDomain(null)}
                className={cn(
                  "glass-m360-journey__domain-pill",
                  !activeDomain && "glass-m360-journey__domain-pill--active",
                )}
              >
                Todos
              </Button>
              {availableDomains.map((domain) => (
                <Button
                  variant="unstyled"
                  key={domain}
                  onClick={() =>
                    setActiveDomain(
                      activeDomain === domain ? null : domain,
                    )
                  }
                  className={cn(
                    "glass-m360-journey__domain-pill",
                    activeDomain === domain &&
                      "glass-m360-journey__domain-pill--active",
                  )}
                >
                  {ACTIVITY_DOMAIN_DISPLAY[domain as ActivityDomain]
                    ?.label ?? domain}
                </Button>
              ))}
            </div>
          )}

          <div className="glass-m360-journey__milestone-list">
            {filteredMilestones.map((ms) => {
              const msDate = new Date(ms.date);
              return (
                <div
                  key={ms.milestone_id}
                  className={cn(
                    "glass-m360-journey__milestone",
                    ms.celebrated &&
                      "glass-m360-journey__milestone--celebrated",
                  )}
                >
                  <div className="glass-m360-journey__milestone-icon">
                    {ms.celebrated ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                  </div>
                  <div className="glass-m360-journey__milestone-info">
                    <p
                      className={cn(
                        "glass-m360-journey__milestone-title",
                        ms.celebrated &&
                          "glass-m360-journey__milestone-title--celebrated",
                      )}
                    >
                      {ms.title}
                    </p>
                    {ms.description && (
                      <p className="glass-m360-journey__milestone-desc">
                        {ms.description}
                      </p>
                    )}
                  </div>
                  <span className="glass-m360-journey__milestone-date">
                    {msDate.toLocaleDateString("es-CR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}