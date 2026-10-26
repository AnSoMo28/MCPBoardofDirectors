// ═══════════════════════════════════════════════════════════════════════
// Member360 — Significance-Weighted Timeline
// Phase 30 — Block 3.2: The Journey + The Future
// ═══════════════════════════════════════════════════════════════════════
//
// Vertical timeline with TWO lanes:
//   LEFT:  Real events (past milestones)
//   RIGHT: Ghost predictions (future projected events)
//
// Events are spaced by SIGNIFICANCE, not by date.
// A tier-change milestone gets 4x the visual space of a routine month.
//
// The "now" point glows on the center line.
// Ghost lane fades as confidence decreases.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";

import type {
  MemberTemperature,
  MemberState,
  VitalSign,
  ActivityDomain,
} from "../types";

import {
  MEMBER_STATE_DISPLAY,
  ACTIVITY_DOMAIN_DISPLAY,
  JOURNEY_STAGE_DISPLAY,
} from "../types";

import type {
  MemberPredictions
} from "../lib/memberPredictions";

import type {
  Member360ProfileResponse,
  JourneyMilestone,
} from "../types";
import "./MemberTimeline.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberTimelineProps {
  journey: Member360ProfileResponse | null;
  predictions: MemberPredictions | null;
  temperature: MemberTemperature;
  vitalSigns: VitalSign[];
}

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  domain?: string;
  type: "milestone" | "prediction";
  significance: number;     // 0–1, drives visual spacing
  confidence?: number;      // 0–1, for ghost events
  description?: string;
  icon?: string;
  color?: string;
}

interface GroupedYear {
  year: number;
  events: TimelineEvent[];
}

// ═══════════════════════════════════════════════════════════════════════
// SIGNIFICANCE ALGORITHM
// ═══════════════════════════════════════════════════════════════════════

/**
 * Computes how visually significant a milestone is.
 * High significance = more vertical space, more prominent styling.
 */
function computeSignificance(milestone: JourneyMilestone): number {
  let score = 0.3; // base

  // Title-based significance (JourneyMilestone has no type field)
  const title = milestone.title.toLowerCase();
  const desc = (milestone.description ?? "").toLowerCase();
  const combined = `${title} ${desc}`;

  const highKeywords = [
    "tier", "cambio", "riesgo", "aniversario", "logro",
    "intervención", "retención", "churn", "upgrade", "vip",
  ];
  const mediumKeywords = [
    "engagement", "actividad", "social", "financiero",
    "participación", "conexión", "membresía", "evento",
  ];

  if (highKeywords.some((kw) => combined.includes(kw))) score += 0.4;
  else if (mediumKeywords.some((kw) => combined.includes(kw))) score += 0.2;

  // Recency: events near "now" are more significant
  const daysAgo = Math.abs(
    (Date.now() - new Date(milestone.date).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysAgo < 30) score += 0.2;
  else if (daysAgo < 90) score += 0.1;

  // Clamp
  return Math.min(1, Math.max(0.1, score));
}

/**
 * Derives domain from milestone metadata.
 */
function deriveMilestoneDomain(
  milestone: JourneyMilestone,
): string | undefined {
  // If milestone has a domain field, use it
  if ("domain" in milestone && typeof milestone.domain === "string") {
    return milestone.domain;
  }
  // Infer from title keywords (JourneyMilestone has no type field)
  const title = milestone.title.toLowerCase();
  if (title.includes("evento") || title.includes("participación")) return "events";
  if (title.includes("deporte") || title.includes("actividad física")) return "sports";
  if (title.includes("social") || title.includes("conexión") || title.includes("referido")) return "social";
  if (title.includes("financiero") || title.includes("pago") || title.includes("ltv")) return "families";
  if (title.includes("tier") || title.includes("membresía") || title.includes("upgrade")) return "recommendations";
  if (title.includes("bienestar") || title.includes("salud") || title.includes("riesgo")) return "wellness";
  if (title.includes("comunicación") || title.includes("contacto")) return "communications";
  return undefined;
}

/**
 * Gets display icon for a milestone type.
 */
function getMilestoneIcon(type: string): string {
  const iconMap: Record<string, string> = {
    tier_change: "⭐",
    state_change: "◈",
    risk_event: "⚠",
    anniversary: "🎂",
    achievement: "🏆",
    engagement_milestone: "🎯",
    social_milestone: "🤝",
    financial_milestone: "💰",
    activity_milestone: "🏃",
    intervention: "⚡",
  };
  return iconMap[type] ?? "•";
}

/**
 * Gets color for a milestone.
 */
function getMilestoneColor(milestone: JourneyMilestone, domain?: string): string {
  const title = milestone.title.toLowerCase();
  if (title.includes("tier") || title.includes("upgrade") || title.includes("vip")) return "var(--color-gold-400)";
  if (title.includes("riesgo") || title.includes("churn") || title.includes("alerta")) return "var(--color-rose-400)";
  if (title.includes("logro") || title.includes("meta") || title.includes("aniversario")) return "var(--color-emerald-400)";
  if (domain) {
    const display = ACTIVITY_DOMAIN_DISPLAY[domain as ActivityDomain];
    if (display) return display.color;
  }
  return "var(--color-silver-400)";
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberTimeline({ journey, predictions, temperature }: MemberTimelineProps) {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const state = temperature.state;
  // ── Build real events from journey milestones ─────────────────────
  const realEvents = useMemo<TimelineEvent[]>(() => {
    const milestones = journey?.upcoming_milestones ?? [];
    return milestones.map((ms) => {
      const domain = deriveMilestoneDomain(ms);
      return {
        id: ms.milestone_id,
        title: ms.title,
        date: ms.date,
        domain,
        type: "milestone" as const,
        significance: computeSignificance(ms),
        description: ms.description ?? undefined,
        icon: getMilestoneIcon(ms.milestone_type),
        color: getMilestoneColor(ms, domain),
      };
    });
  }, [journey]);

  // ── Build ghost events from predictions ───────────────────────────
  const ghostEvents = useMemo<TimelineEvent[]>(() => {
    if (!predictions) return [];

    const events: TimelineEvent[] = [];

    // Lifecycle transition prediction
    if (predictions.lifecyclePrediction) {
      const lt = predictions.lifecyclePrediction;
      const stageKey = lt.predictedNextStage as import("../types").JourneyStage;
      events.push({
        id: `lifecycle-${lt.predictedNextStage}`,
        title: `Transición a ${JOURNEY_STAGE_DISPLAY[stageKey]?.label ?? lt.predictedNextStage}`,
        date: new Date(
          Date.now() + lt.daysToTransition * 24 * 60 * 60 * 1000,
        ).toISOString(),
        type: "prediction",
        significance: lt.confidence * 0.8,
        confidence: lt.confidence,
        description: lt.trigger,
        icon: lt.direction === "positive" ? "↑" : lt.direction === "negative" ? "↓" : "◇",
        color: lt.direction === "positive"
          ? "var(--color-emerald-400)"
          : lt.direction === "negative"
            ? "var(--color-rose-400)"
            : "var(--color-silver-400)",
      });
    }

    // Engagement trajectory inflection points
    if (predictions.engagementTrajectory.inflectionPoints.length > 0) {
      predictions.engagementTrajectory.inflectionPoints.forEach((ip, i) => {
        // Derive significance from temperature delta at inflection
        const tempDelta = Math.abs(ip.temperatureAtPoint - temperature.composite);
        const significance = Math.min(1, 0.3 + tempDelta / 100);

        events.push({
          id: `inflection-${i}`,
          title: `Punto de inflexión (día ${ip.day})`,
          date: new Date(
            Date.now() + ip.day * 24 * 60 * 60 * 1000,
          ).toISOString(),
          type: "prediction",
          significance,
          confidence: significance, // derive from temperature distance
          description: ip.description,
          icon: ip.temperatureAtPoint > temperature.composite ? "↑" : "↓",
          color:
            ip.temperatureAtPoint > temperature.composite
              ? "var(--color-emerald-400)"
              : "var(--color-rose-400)",
        });
      });
    }

    // Churn window deadline
    if (
      predictions.churnForecast.daysToLikelyChurn !== null &&
      predictions.churnForecast.daysToLikelyChurn < 180
    ) {
      events.push({
        id: "churn-deadline",
        title: "Fecha probable de churn",
        date: new Date(
          Date.now() +
            predictions.churnForecast.daysToLikelyChurn * 24 * 60 * 60 * 1000,
        ).toISOString(),
        type: "prediction",
        significance: predictions.churnForecast.predictedProbability.estimate,
        confidence:
          (predictions.churnForecast.predictedProbability.confidence ?? 50) / 100,
        description: `${Math.round(predictions.churnForecast.predictedProbability.estimate * 100)}% probabilidad`,
        icon: "⚠",
        color: "var(--color-rose-400)",
      });
    }

    return events;
  }, [predictions]);

  // ── All events sorted by date ─────────────────────────────────────
  const allEvents = useMemo(() => {
    const combined = [...realEvents, ...ghostEvents];
    return combined.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [realEvents, ghostEvents]);

  // ── Unique domains for filter ─────────────────────────────────────
  const domains = useMemo(() => {
    const set = new Set<string>();
    realEvents.forEach((e) => {
      if (e.domain) set.add(e.domain);
    });
    return Array.from(set);
  }, [realEvents]);

  // ── Filter events by domain ───────────────────────────────────────
  const filteredEvents = useMemo(() => {
    if (!activeDomain) return allEvents;
    return allEvents.filter(
      (e) =>
        e.domain === activeDomain ||
        e.type === "prediction", // Always show predictions
    );
  }, [allEvents, activeDomain]);

  // ── Group by year ─────────────────────────────────────────────────
  const grouped = useMemo<GroupedYear[]>(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const event of filteredEvents) {
      const year = new Date(event.date).getFullYear();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(event);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, events]) => ({ year, events }));
  }, [filteredEvents]);

  // ── Empty state ───────────────────────────────────────────────────
  if (allEvents.length === 0) {
    return (
      <div className="glass-m360-timeline" data-member-state={state}>
        <div className="glass-m360-timeline__empty">
          <span className="glass-m360-timeline__empty-icon">🗺️</span>
          <p>Sin eventos de journey disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-m360-timeline"
      data-member-state={state}
    >
      {/* ── Domain filter ── */}
      {domains.length > 1 && (
        <div className="glass-m360-timeline__filters">
          <button
            className={`glass-m360-timeline__filter ${!activeDomain ? "glass-m360-timeline__filter--active" : ""}`}
            onClick={() => setActiveDomain(null)}
          >
            Todos
          </button>
          {domains.map((domain) => {
            const display = ACTIVITY_DOMAIN_DISPLAY[domain as ActivityDomain];
            return (
              <button
                key={domain}
                className={`glass-m360-timeline__filter ${activeDomain === domain ? "glass-m360-timeline__filter--active" : ""}`}
                style={
                  activeDomain === domain
                    ? {
                        color: display?.color ?? "var(--color-gold-400)",
                        borderColor: `color-mix(in srgb, ${display?.color ?? "var(--color-gold-400)"} 30%, transparent)`,
                        background: `color-mix(in srgb, ${display?.color ?? "var(--color-gold-400)"} 10%, transparent)`,
                      }
                    : undefined
                }
                onClick={() =>
                  setActiveDomain(activeDomain === domain ? null : domain)
                }
              >
                {display?.icon ?? "•"} {display?.label ?? domain}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Timeline body ── */}
      <div className="glass-m360-timeline__body">
        {grouped.map((group) => (
          <div key={group.year} className="glass-m360-timeline__year-group">
            {/* Year header */}
            <div className="glass-m360-timeline__year-header">
              <span className="glass-m360-timeline__year-label">
                {group.year}
              </span>
            </div>

            {/* Events */}
            {group.events.map((event, i) => (
              <TimelineNode
                key={event.id}
                event={event}
                index={i}
                isGhost={event.type === "prediction"}
                state={state}
              />
            ))}
          </div>
        ))}

        {/* ── NOW marker ── */}
        <div className="glass-m360-timeline__now" data-member-state={state}>
          <span className="glass-m360-timeline__now-dot" />
          <span className="glass-m360-timeline__now-label">Ahora</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TIMELINE NODE — Individual event
// ═══════════════════════════════════════════════════════════════════════

function TimelineNode({ event, index, isGhost }: {
  event: TimelineEvent;
  index: number;
  isGhost: boolean;
  state: MemberState;
}) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(event.date);

  // Significance drives vertical spacing
  const spacingPx = Math.round(12 + event.significance * 36);

  return (
    <div
      className={`glass-m360-timeline__node ${isGhost ? "glass-m360-timeline__node--ghost" : ""}`}
      data-significance={event.significance > 0.6 ? "high" : event.significance > 0.3 ? "medium" : "low"}
      data-ghost={isGhost || undefined}
      style={
        {
          "--node-spacing": `${spacingPx}px`,
          "--node-color": event.color ?? "var(--color-silver-400)",
          "--stagger-i": index,
          marginBottom: `${spacingPx}px`,
        } as React.CSSProperties
      }
    >
      {/* Marker on the center line */}
      <div className="glass-m360-timeline__marker">
        <span
          className="glass-m360-timeline__marker-dot"
          style={{ background: event.color }}
        />
      </div>

      {/* Event content */}
      <button
        className="glass-m360-timeline__event"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {/* Date */}
        <span className="glass-m360-timeline__event-date">
          {date.toLocaleDateString("es-CR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>

        {/* Icon + Title */}
        <div className="glass-m360-timeline__event-header">
          <span className="glass-m360-timeline__event-icon">
            {event.icon ?? "•"}
          </span>
          <span className="glass-m360-timeline__event-title">
            {event.title}
          </span>
        </div>

        {/* Confidence bar (ghost only) */}
        {isGhost && event.confidence != null && (
          <div className="glass-m360-timeline__confidence">
            <div className="glass-m360-timeline__confidence-bar">
              <div
                className="glass-m360-timeline__confidence-fill"
                style={{ width: `${event.confidence * 100}%` }}
              />
            </div>
            <span className="glass-m360-timeline__confidence-label">
              {Math.round(event.confidence * 100)}% confianza
            </span>
          </div>
        )}

        {/* Expanded description */}
        {expanded && event.description && (
          <p className="glass-m360-timeline__event-desc">
            {event.description}
          </p>
        )}
      </button>
    </div>
  );
}