// src/features/events/components/EventAdvisorBanner.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Advisor Banner (Command Center) Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   eab-* (event advisor banner)
// @keyframes   11 (in EventAdvisorBanner.css)
// @depends     shared/components/ui: Button, AdvisorReactionCard,
//              shared/lib/utils: cn,
//              ../types: EventAdvisorInsight, CalendarDay,
//              @/shared/types/ai-intelligence: AdvisorActionState,
//                                             AdvisorReaction
//
// Living Command Center for events intelligence with:
//   - Narrative thread (visual connecting line between insights)
//   - Depth-of-field (hero/secondary/supplementary tiers)
//   - Urgency ambient glow (panel border shifts by severity)
//   - Calendar context bar (month stats at a glance)
//   - Inline evidence (capacity/venue data per insight)
//   - Confidence cascade (zone-colored bar, not text)
//   - CSS-only expand/collapse (grid-rows, no framer-motion)
//   - Insight reveal cascade (stagger by impact order)
//   - Action state transitions via shared Button (isLoading)
//   - Cross-domain evidence builder
//
// PRE-WRITE VERIFICATION:
// [x] Button: variant, size, isLoading, icon, fullWidth, ✅
//     className, onClick, disabled, aria-expanded, aria-label
// [x] AdvisorReactionCard: reaction={AdvisorReaction} ✅
// [x] cn verified in shared/lib/utils ✅
// [x] EventAdvisorInsight, CalendarDay → ../types ✅
// [x] AdvisorActionState, AdvisorReaction → shared/types ✅
//
// ANTI-PATTERNS REMOVED (session 2):
// [x] 5 raw <button> → shared Button component
// [x] eab-btn-exec CSS → Button variant="primary"/"success" + isLoading
// [x] eab-btn-nav CSS → Button variant="ghost" size="sm"
// [x] eab-card__expand-btn CSS → Button variant="ghost" size="sm"
// [x] eab-supplementary__toggle CSS → Button variant="ghost" size="sm"
// [x] eab__header raw button → Button variant="ghost" fullWidth
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Calendar,
  AlertTriangle,
  Users,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Shared — Types
import type { AdvisorActionState, AdvisorReaction } from "@/shared/types/ai-intelligence";

// Shared — UI
import { Button } from "@/shared/components/ui/Button";
import { AdvisorReactionCard } from "@/shared/components/ui/AdvisorReactionCard";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Types
import type { EventAdvisorInsight, CalendarDay } from "../types";

// Styles
import "./EventAdvisorBanner.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

type AdvisorLayer = "macro" | "micro" | "fusion";

interface EvidenceData {
  readonly label: string;
  readonly value: string;
  readonly pct?: number;
  readonly color?: string;
}

interface LayerConfig {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly color: string;
}

interface ImpactConfig {
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly order: number;
}

interface EventAdvisorBannerProps {
  readonly insights: readonly EventAdvisorInsight[];
  readonly onNavigateToDate: (date: string) => void;
  readonly onNavigateToEvent: (eventId: string) => void;
  readonly onExecute?: (insightId: string) => Promise<void>;
  readonly actionStates?: Readonly<Record<string, AdvisorActionState>>;
  readonly reactions?: readonly AdvisorReaction[];
  readonly eventsContext?: readonly CalendarDay[] | null;
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

const LAYER_CONFIG: Record<AdvisorLayer, LayerConfig> = {
  macro: { label: "Calendario", icon: AlertTriangle, color: "var(--color-rose-400)" },
  micro: { label: "Por Evento", icon: Users, color: "var(--color-amber-400)" },
  fusion: { label: "Insight Cruzado", icon: Lightbulb, color: "var(--color-gold-400)" },
};

const IMPACT_CONFIG: Record<string, ImpactConfig> = {
  high: { label: "Alto", color: "var(--color-rose-400)", bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)", order: 0 },
  medium: { label: "Medio", color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)", order: 1 },
  low: { label: "Bajo", color: "var(--color-silver-400)", bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)", order: 2 },
};

const URGENCY_AMBIENT: Record<string, string> = {
  high: "eab--urgency-high",
  medium: "eab--urgency-medium",
  low: "eab--urgency-low",
};

// ═══════════════════════════════════════════════════════════
// §3 HELPERS
// ═══════════════════════════════════════════════════════════

function buildEvidence(
  insight: EventAdvisorInsight,
  calendarData: readonly CalendarDay[],
): EvidenceData | null {
  const layer = insight.layer as string;
  const { target_date, target_id } = insight;

  if (layer === "macro" && calendarData.length > 0) {
    const totalEvents = calendarData.reduce((s, d) => s + d.total_events, 0);
    const conflictDays = calendarData.filter((d) => d.has_conflicts).length;
    const heavyDays = calendarData.filter((d) => d.total_events >= 5).length;
    return {
      label: "Carga mensual",
      value: `${totalEvents} eventos · ${conflictDays} conflictos · ${heavyDays} días pesados`,
      pct: Math.min(100, (heavyDays / calendarData.length) * 100 * 3),
      color: conflictDays > 0 ? "var(--color-rose-400)" : heavyDays > 3 ? "var(--color-amber-400)" : "var(--color-emerald-400)",
    };
  }

  if (layer === "micro" && target_id) {
    for (const day of calendarData) {
      const event = day.events.find((e) => e.id === target_id);
      if (event) {
        const pct = event.max_capacity > 0 ? (event.current_attendance / event.max_capacity) * 100 : 0;
        return {
          label: event.location || "Capacidad",
          value: `${event.current_attendance}/${event.max_capacity} (${Math.round(pct)}%)`,
          pct,
          color: pct >= 90 ? "var(--color-rose-400)" : pct >= 70 ? "var(--color-amber-400)" : "var(--color-emerald-400)",
        };
      }
    }
    if (target_date) {
      const day = calendarData.find((d) => d.date === target_date);
      if (day && day.events.length > 0) {
        const venues = new Set(day.events.map((e) => e.location).filter(Boolean));
        return {
          label: "Día destino",
          value: `${day.total_events} eventos · ${venues.size} sede${venues.size !== 1 ? "s" : ""}`,
          pct: Math.min(100, (day.total_events / 8) * 100),
          color: day.total_events >= 8 ? "var(--color-rose-400)" : day.total_events >= 5 ? "var(--color-amber-400)" : "var(--color-emerald-400)",
        };
      }
    }
  }

  if (layer === "fusion" && calendarData.length > 0) {
    const venueCounts = new Map<string, number>();
    let totalAttendance = 0;
    let totalCapacity = 0;
    for (const day of calendarData) {
      for (const event of day.events) {
        if (event.location) venueCounts.set(event.location, (venueCounts.get(event.location) ?? 0) + 1);
        totalAttendance += event.current_attendance || 0;
        totalCapacity += event.max_capacity || 0;
      }
    }
    if (venueCounts.size > 0) {
      const topVenue = Array.from(venueCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      const occupancy = totalCapacity > 0 ? (totalAttendance / totalCapacity) * 100 : 0;
      return {
        label: `Top sede: ${topVenue[0]}`,
        value: `${topVenue[1]} eventos · Ocupación gral: ${Math.round(occupancy)}%`,
        pct: occupancy,
        color: occupancy >= 85 ? "var(--color-amber-400)" : "var(--color-emerald-400)",
      };
    }
  }

  return null;
}

function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════
// §4 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 Confidence Bar ──────────────────────────────────

function ConfidenceBar({ confidence }: { readonly confidence: number }) {
  const level = getConfidenceLevel(confidence);
  return (
    <div className="eab-confidence" data-testid="eab-confidence">
      <div className="eab-confidence__track">
        <div
          className={cn("eab-confidence__fill", `eab-confidence__fill--${level}`)}
          style={{ "--c-pct": `${confidence}%` } as React.CSSProperties}
        />
      </div>
      <span className={cn("eab-confidence__label", `eab-confidence__label--${level}`)}>
        {confidence}%
      </span>
    </div>
  );
}

// ── §4.2 Calendar Context Bar ────────────────────────────

function CalendarContextBar({
  calendarData,
}: {
  readonly calendarData: readonly CalendarDay[];
}) {
  const totalEvents = calendarData.reduce((s, d) => s + d.total_events, 0);
  const conflictDays = calendarData.filter((d) => d.has_conflicts).length;
  const heavyDays = calendarData.filter((d) => d.total_events >= 5).length;
  const emptyDays = calendarData.filter((d) => d.total_events === 0).length;

  const venueSet = new Set<string>();
  for (const day of calendarData) {
    for (const event of day.events) {
      if (event.location) venueSet.add(event.location);
    }
  }

  const stats = [
    { value: String(totalEvents), label: "Eventos", color: "var(--color-silver-200)" },
    { value: String(conflictDays), label: "Conflictos", color: conflictDays > 0 ? "var(--color-rose-400)" : "var(--color-emerald-400)" },
    { value: String(heavyDays), label: "Días +5", color: heavyDays > 3 ? "var(--color-amber-400)" : "var(--color-silver-200)" },
    { value: String(venueSet.size), label: "Sedes", color: "var(--color-teal-400)" },
    { value: String(emptyDays), label: "Libres", color: "var(--color-silver-400)" },
  ];

  return (
    <div className="eab-context" data-testid="eab-context-bar">
      {stats.map((stat, i) => (
        <div key={stat.label} className="eab-context__item eab-stagger" style={{ "--si": i } as React.CSSProperties}>
          {i > 0 && <div className="eab-context__divider" aria-hidden="true" />}
          <div className="eab-context__stat">
            <span className="eab-context__value" style={{ color: stat.color }}>{stat.value}</span>
            <span className="eab-context__label">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── §4.3 Evidence Block ──────────────────────────────────

function EvidenceBlock({ evidence }: { readonly evidence: EvidenceData }) {
  return (
    <div className="eab-evidence" data-testid="eab-evidence">
      <div className="eab-evidence__header">
        <span className="eab-evidence__label">{evidence.label}</span>
        <span className="eab-evidence__value">{evidence.value}</span>
      </div>
      {evidence.pct !== undefined && (
        <div className="eab-evidence__bar">
          <div
            className="eab-evidence__fill"
            style={{ width: `${Math.min(100, evidence.pct)}%`, background: evidence.color ?? "var(--color-gold-400)" }}
          />
        </div>
      )}
    </div>
  );
}

// ── §4.4 Insight Card ────────────────────────────────────
// ✅ All buttons now use shared Button component.

function InsightCard({
  insight,
  depth,
  evidence,
  isExpanded,
  onToggleExpand,
  onExecute,
  onNavigate,
  actionState,
  staggerIndex,
}: {
  readonly insight: EventAdvisorInsight;
  readonly depth: 1 | 2 | 3;
  readonly evidence: EvidenceData | null;
  readonly isExpanded: boolean;
  readonly onToggleExpand: () => void;
  readonly onExecute?: () => void;
  readonly onNavigate: () => void;
  readonly actionState?: AdvisorActionState;
  readonly staggerIndex: number;
}) {
  const layer = (insight.layer as AdvisorLayer) ?? "fusion";
  const layerCfg = LAYER_CONFIG[layer] ?? LAYER_CONFIG.fusion;
  const impactCfg = IMPACT_CONFIG[insight.impact] ?? IMPACT_CONFIG.low;
  const Icon = layerCfg.icon;

  const showDetail = depth >= 2 || isExpanded;
  const isLoading = actionState === "loading";
  const isDone = actionState === "done";

  return (
    <div
      className={cn(
        "eab-card",
        depth === 3 && "eab-card--hero",
        depth === 2 && "eab-card--secondary",
        depth === 1 && "eab-card--supplementary",
        "eab-stagger",
      )}
      style={{ "--depth-color": impactCfg.color, "--card-i": staggerIndex } as React.CSSProperties}
      data-testid={`eab-insight-${insight.id}`}
    >
      <div className="eab-card__body">
        {/* Header */}
        <div className="eab-card__header">
          <div
            className="eab-card__layer-icon"
            style={{ background: `color-mix(in srgb, ${layerCfg.color} 10%, transparent)`, color: layerCfg.color }}
            aria-hidden="true"
          >
            <Icon size={depth === 3 ? 18 : 14} strokeWidth={1.5} />
          </div>
          <div className="eab-card__content">
            <div className="eab-card__badges">
              <span className="eab-card__impact" style={{ color: impactCfg.color, background: impactCfg.bgColor }}>
                {impactCfg.label}
              </span>
              <span className="eab-card__layer" style={{ color: layerCfg.color }}>
                {layerCfg.label}
              </span>
            </div>
            <p className={cn("eab-card__title", depth === 3 && "eab-card__title--hero")}>
              {insight.title}
            </p>
            {showDetail && insight.reasoning && (
              <p className="eab-card__reasoning">{insight.reasoning}</p>
            )}
            <div className="eab-card__meta">
              <ConfidenceBar confidence={insight.confidence} />
              {depth < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleExpand}
                  aria-expanded={isExpanded}
                  className="eab-card__expand-btn"
                >
                  {isExpanded ? "Menos" : "Más detalle"}
                </Button>
              )}
            </div>
          </div>
          <div className="eab-card__action">
            {insight.action && onExecute ? (
              <Button
                variant={isDone ? "success" : "primary"}
                size="sm"
                isLoading={isLoading}
                icon={isDone ? <CheckCircle2 size={14} /> : <Zap size={14} />}
                onClick={onExecute}
                disabled={isLoading}
                aria-label={isLoading ? "Ejecutando..." : isDone ? "Completado" : "Ejecutar"}
              >
                {isLoading ? "..." : isDone ? "Listo" : "Ejecutar"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowRight size={14} />}
                onClick={onNavigate}
                aria-label="Ir al recurso"
              >
                Ir
              </Button>
            )}
          </div>
        </div>

        {/* Evidence (auto-expand for depth >= 2) */}
        {evidence && showDetail && <EvidenceBlock evidence={evidence} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 COMPONENT
// ═══════════════════════════════════════════════════════════

export function EventAdvisorBanner({
  insights,
  onNavigateToDate,
  onNavigateToEvent,
  onExecute,
  actionStates = {},
  reactions = [],
  eventsContext,
}: EventAdvisorBannerProps) {

  const [expanded, setExpanded] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sorted = useMemo(
    () => [...insights].sort((a, b) => {
      const orderA = IMPACT_CONFIG[a.impact]?.order ?? 3;
      const orderB = IMPACT_CONFIG[b.impact]?.order ?? 3;
      return orderA - orderB;
    }),
    [insights],
  );

  const hero = sorted[0] ?? null;
  const secondary = sorted.slice(1, 3);
  const supplementary = sorted.slice(3);

  const highestUrgency = sorted[0]?.impact ?? "low";
  const ambientClass = URGENCY_AMBIENT[highestUrgency] || "";

  const evidenceMap = useMemo(() => {
    const map = new Map<string, EvidenceData | null>();
    const calData = eventsContext ?? [];
    for (const insight of sorted) map.set(insight.id, buildEvidence(insight, calData));
    return map;
  }, [sorted, eventsContext]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (insights.length === 0) return null;

  const highCount = sorted.filter((i) => i.impact === "high").length;
  let staggerIdx = 0;

  return (
    <div className={cn("eab", ambientClass)} data-testid="eab" data-state={expanded ? "open" : "closed"}>
      {/* ── Header ── */}
      <Button
        variant="ghost"
        fullWidth
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        data-testid="eab-header"
        className="eab__header"
        type="button"
      >
        <div className="eab__header-left">
          <div className="eab__header-icon" aria-hidden="true">
            <Calendar size={18} />
          </div>
          <div className="eab__header-info">
            <h2 className="eab__header-title">Centro de Comando — Eventos</h2>
            <p className="eab__header-subtitle">
              {insights.length} insight{insights.length !== 1 ? "s" : ""}
              {highCount > 0 && (
                <span className="eab__header-urgent">
                  {" "}· {highCount} urgente{highCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <span className="eab__header-chevron" aria-hidden="true">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </Button>

      {/* ── Body (CSS-only expand/collapse) ── */}
      <div className="eab__body-wrapper" data-state={expanded ? "open" : "closed"}>
        <div className="eab__body">
          {eventsContext && eventsContext.length > 0 && (
            <CalendarContextBar calendarData={eventsContext} />
          )}

          {reactions.length > 0 && (
            <div className="eab-reactions" data-testid="eab-reactions">
              <div className="eab-reactions__header">
                <CheckCircle2 size={14} className="eab-reactions__icon" aria-hidden="true" />
                <h3 className="eab-reactions__title">Ejecutado</h3>
                <span className="eab-reactions__count">({reactions.length})</span>
              </div>
              <div className="eab-reactions__list">
                {reactions.slice().reverse().slice(0, 3).map((r) => (
                  <AdvisorReactionCard key={r.id} reaction={r} />
                ))}
              </div>
            </div>
          )}

          {/* Narrative Thread */}
          <div className="eab-thread" data-testid="eab-thread">
            <div className="eab-thread__line" aria-hidden="true" />

            {hero && (
              <div className="eab-thread__step">
                <div className="eab-thread__dot" style={{ background: IMPACT_CONFIG[hero.impact]?.color } as React.CSSProperties} aria-hidden="true" />
                <InsightCard
                  insight={hero}
                  depth={3}
                  evidence={evidenceMap.get(hero.id) ?? null}
                  isExpanded={expandedIds.has(hero.id)}
                  onToggleExpand={() => toggleExpand(hero.id)}
                  onExecute={onExecute ? () => onExecute(hero.id) : undefined}
                  onNavigate={() => {
                    if (hero.target_id) onNavigateToEvent(hero.target_id);
                    else if (hero.target_date) onNavigateToDate(hero.target_date);
                  }}
                  actionState={actionStates[hero.id]}
                  staggerIndex={staggerIdx++}
                />
              </div>
            )}

            {secondary.map((insight) => (
              <div key={insight.id} className="eab-thread__step">
                <div className="eab-thread__dot" style={{ background: IMPACT_CONFIG[insight.impact]?.color } as React.CSSProperties} aria-hidden="true" />
                <InsightCard
                  insight={insight}
                  depth={2}
                  evidence={evidenceMap.get(insight.id) ?? null}
                  isExpanded={expandedIds.has(insight.id)}
                  onToggleExpand={() => toggleExpand(insight.id)}
                  onExecute={onExecute ? () => onExecute(insight.id) : undefined}
                  onNavigate={() => {
                    if (insight.target_id) onNavigateToEvent(insight.target_id);
                    else if (insight.target_date) onNavigateToDate(insight.target_date);
                  }}
                  actionState={actionStates[insight.id]}
                  staggerIndex={staggerIdx++}
                />
              </div>
            ))}
          </div>

          {/* Supplementary Insights */}
          {supplementary.length > 0 && (
            <div className="eab-supplementary" data-testid="eab-supplementary">
              <Button
                variant="ghost"
                size="sm"
                icon={<Sparkles size={12} />}
                className="eab-supplementary__toggle"
                onClick={() => {
                  const allExpanded = supplementary.every((i) => expandedIds.has(i.id));
                  setExpandedIds((prev) => {
                    const next = new Set(prev);
                    supplementary.forEach((i) => allExpanded ? next.delete(i.id) : next.add(i.id));
                    return next;
                  });
                }}
                type="button"
              >
                {supplementary.length} insight{supplementary.length !== 1 ? "s" : ""} adicional{supplementary.length !== 1 ? "es" : ""}
                <ChevronDown size={10} aria-hidden="true" />
              </Button>
              <div className="eab-supplementary__list">
                {supplementary.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    depth={1}
                    evidence={evidenceMap.get(insight.id) ?? null}
                    isExpanded={expandedIds.has(insight.id)}
                    onToggleExpand={() => toggleExpand(insight.id)}
                    onExecute={onExecute ? () => onExecute(insight.id) : undefined}
                    onNavigate={() => {
                      if (insight.target_id) onNavigateToEvent(insight.target_id);
                      else if (insight.target_date) onNavigateToDate(insight.target_date);
                    }}
                    actionState={actionStates[insight.id]}
                    staggerIndex={staggerIdx++}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}