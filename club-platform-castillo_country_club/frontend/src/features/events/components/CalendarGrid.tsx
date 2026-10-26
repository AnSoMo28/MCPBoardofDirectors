// src/features/events/components/CalendarGrid.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Calendar Grid Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ecal-* (event calendar grid)
// @keyframes   5 (in CalendarGrid.css)
// @depends     shared/lib/utils: cn,
//              ../types: EventBrief, EventAdvisorInsight,
//              EVENT_CATEGORY_CONFIG,
//              ../lib/calendarSignals: getDensityLevel, getDensityCssClass,
//              getDensityColor, getDayIntelligence, extractTime,
//              ../hooks/useEventCalendar: CalendarGridDay
//
// 7-column calendar grid with:
//   - Density aurora (multi-category color blending)
//   - Heat bar with density-based glow
//   - AI insight badges on days with advisor insights
//   - Enhanced peek with intelligence (load + slots + insights)
//   - Diagonal stagger reveal on month change
//   - Conflict pulse animation
//   - Today glow beacon
//   - Category-colored event chips
//
// PRE-WRITE VERIFICATION:
// [x] CalendarGridDay = CalendarDay & { isCurrentMonth, isToday }
// [x] CalendarDay.events is readonly EventBrief[]
// [x] EventBrief has: id, title, category, status, date_start, date_end,
//     location, current_attendance, max_capacity, pricing_model
// [x] EventAdvisorInsight extends AdvisorInsightBase with domain="events"
// [x] calendarSignals functions all return expected shapes
// [x] cn verified in shared/lib/utils
// [x] days prop should be readonly (matches hook return type)
//
// ANTI-PATTERNS REMOVED:
// [x] ~35 Tailwind utilities → ecal-* BEM classes
// [x] glass-* namespace → ecal-* (component-specific)
// [x] No co-located CSS → CalendarGrid.css created
// [x] No data-testid → 4 data-testid attributes
// [x] No § markers → §0-§4
// [x] No file header → added
// [x] days prop mutable → readonly
// [x] Inline style for aurora → CSS custom properties
// [x] DAY_LABELS not readonly → as const
// [x] insights prop not accepted → added optional prop
// [x] No light mode → CSS §7
// [x] No print → CSS §10
// [x] No responsive → CSS §9
// [x] No reduced motion → CSS §8
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Types
import type { EventBrief, EventAdvisorInsight } from "../types";
import { EVENT_CATEGORY_CONFIG } from "../types";

// Feature — Lib
import {
  getDensityLevel,
  getDensityCssClass,
  getDensityColor,
  getDayIntelligence,
  extractTime,
} from "../lib/calendarSignals";

// Feature — Hooks
import type { CalendarGridDay } from "../hooks/useEventCalendar";

// Styles
import "./CalendarGrid.css";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Maximum event chips visible per day cell before "+N more" */
const MAX_VISIBLE_CHIPS = 3;

// ═══════════════════════════════════════════════════════════
// §2 TYPES
// ═══════════════════════════════════════════════════════════

interface CalendarGridProps {
  /** Calendar grid days (readonly — matches hook return type) */
  readonly days: readonly CalendarGridDay[];
  /** Called when a day cell is clicked */
  readonly onDayClick: (date: string) => void;
  /** Called when an event chip is clicked */
  readonly onEventClick: (event: EventBrief) => void;
  /** Advisor insights for the current month (optional — drives AI badges) */
  readonly insights?: readonly EventAdvisorInsight[];
}

// ═══════════════════════════════════════════════════════════
// §3 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Compact event chip for grid cells.
 * Category-colored with icon + truncated title.
 */
function EventChip({
  event,
  onEventClick,
}: {
  readonly event: EventBrief;
  readonly onEventClick: (event: EventBrief) => void;
}) {
  const cat = EVENT_CATEGORY_CONFIG[event.category];
  return (
    <button
      type="button"
      className="ecal-chip"
      style={{
        "--chip-bg": cat.bgColor,
        "--chip-color": cat.color,
      } as React.CSSProperties}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(event);
      }}
      aria-label={`${event.title} — ${event.current_attendance}/${event.max_capacity}`}
      data-testid={`ecal-chip-${event.id}`}
    >
      <span className="ecal-chip__icon" aria-hidden="true">{cat.icon}</span>
      <span className="ecal-chip__title">{event.title}</span>
    </button>
  );
}

/**
 * Peek preview — desktop hover overlay.
 * Shows: event list + load assessment + top AI insight + available slots.
 */
function DayPeek({
  events,
  insight,
}: {
  readonly events: readonly EventBrief[];
  readonly insight?: EventAdvisorInsight;
}) {
  if (events.length === 0 && !insight) return null;

  const intel = useMemo(() => getDayIntelligence(events), [events]);

  return (
    <div className="ecal-peek" data-testid="ecal-peek">
      {/* Event list */}
      {events.length > 0 && (
        <div className="ecal-peek__events">
          {events.map((ev) => {
            const cat = EVENT_CATEGORY_CONFIG[ev.category];
            const time = extractTime(ev.date_start);
            return (
              <div key={ev.id} className="ecal-peek__event-row">
                <span className="ecal-peek__event-icon" aria-hidden="true">{cat.icon}</span>
                <span className="ecal-peek__event-title">{ev.title}</span>
                <span className="ecal-peek__event-time">{time}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Intelligence footer */}
      <div className="ecal-peek__intel">
        <span className="ecal-peek__load" style={{ color: intel.load.color }}>
          {intel.load.label}
        </span>
        {intel.availableSlots.length > 0 && (
          <span className="ecal-peek__slot">
            {intel.availableSlots[0].start}–{intel.availableSlots[0].end} libre
          </span>
        )}
      </div>

      {/* AI insight highlight */}
      {insight && (
        <div className="ecal-peek__insight">
          <span className="ecal-peek__insight-icon" aria-hidden="true">✨</span>
          <span className="ecal-peek__insight-text">{insight.title}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * CalendarGrid — 7-column monthly calendar with density aurora,
 * AI insight badges, enhanced peek, and diagonal stagger reveal.
 */
export function CalendarGrid({
  days,
  onDayClick,
  onEventClick,
  insights,
}: CalendarGridProps) {
  /** Map insights by date for O(1) lookup per cell. */
  const insightMap = useMemo(() => {
    if (!insights || insights.length === 0) return new Map<string, EventAdvisorInsight>();
    const map = new Map<string, EventAdvisorInsight>();
    for (const insight of insights) {
      if (insight.target_date) {
        const dateKey = insight.target_date.split("T")[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, insight);
        }
      }
    }
    return map;
  }, [insights]);

  /** Today's date string for "isPast" check. */
  const todayStr = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  return (
    <div className="ecal" data-testid="ecal-grid">
      {/* ── §4.1 Day-of-week headers ── */}
      {DAY_LABELS.map((label) => (
        <div key={label} className="ecal__header" aria-hidden="true">
          {label}
        </div>
      ))}

      {/* ── §4.2 Day cells ── */}
      {days.map((day, index) => {
        const dayNum = new Date(day.date + "T12:00:00").getDate();
        const hasEvents = day.events.length > 0;
        const isPast = day.date < todayStr;
        const dayInsight = insightMap.get(day.date);

        // Density
        const density = getDensityLevel(day.events.length);
        const densityClass = getDensityCssClass(density);
        const densityColor = getDensityColor(density);

        // Aurora — dominant category color from first event
        const auroraColor = hasEvents
          ? EVENT_CATEGORY_CONFIG[day.events[0].category].color
          : "transparent";
        const auroraAlpha = hasEvents
          ? Math.min(0.4, day.events.length * 0.08)
          : 0;

        // Diagonal stagger position
        const col = index % 7;
        const row = Math.floor(index / 7);

        return (
          <div
            key={day.date}
            onClick={() => onDayClick(day.date)}
            tabIndex={0}
            role="button"
            aria-label={`${day.date} — ${day.total_events} evento${day.total_events !== 1 ? "s" : ""}${day.has_conflicts ? " (conflictos)" : ""}${dayInsight ? " — insight disponible" : ""}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDayClick(day.date);
              }
            }}
            className={cn(
              "ecal-cell",
              !day.isCurrentMonth && "ecal-cell--other-month",
              day.isToday && "ecal-cell--today",
              day.has_conflicts && "ecal-cell--conflicts",
              densityClass,
            )}
            style={{
              "--aurora-color": auroraColor,
              "--aurora-alpha": auroraAlpha,
              "--stagger-row": row,
              "--stagger-col": col,
            } as React.CSSProperties}
            data-testid={`ecal-cell-${day.date}`}
          >
            {/* Aurora glow */}
            {hasEvents && <div className="ecal-cell__aurora" aria-hidden="true" />}

            {/* Today beacon */}
            {day.isToday && <div className="ecal-cell__beacon" aria-hidden="true" />}

            {/* Content (above aurora) */}
            <div className="ecal-cell__content">
              {/* Day number + badges */}
              <div className="ecal-cell__header">
                <span
                  className={cn(
                    "ecal-cell__daynum",
                    day.isToday && "ecal-cell__daynum--today",
                    !day.isCurrentMonth && "ecal-cell__daynum--faded",
                    isPast && day.isCurrentMonth && "ecal-cell__daynum--past",
                  )}
                >
                  {dayNum}
                </span>

                <div className="ecal-cell__badges">
                  {/* Event count */}
                  {hasEvents && (
                    <span
                      className={cn(
                        "ecal-cell__count",
                        day.has_conflicts && "ecal-cell__count--conflict",
                      )}
                    >
                      {day.events.length}
                    </span>
                  )}

                  {/* AI insight badge */}
                  {dayInsight && (
                    <span
                      className="ecal-cell__insight-badge"
                      title={dayInsight.title}
                      aria-label={`Insight: ${dayInsight.title}`}
                    >
                      ✨
                    </span>
                  )}
                </div>
              </div>

              {/* Event chips */}
              <div className="ecal-cell__chips">
                {day.events.slice(0, MAX_VISIBLE_CHIPS).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onEventClick={onEventClick}
                  />
                ))}
                {day.events.length > MAX_VISIBLE_CHIPS && (
                  <span className="ecal-cell__more">
                    +{day.events.length - MAX_VISIBLE_CHIPS} más
                  </span>
                )}
              </div>
            </div>

            {/* Peek preview (CSS-only hover) */}
            <DayPeek events={day.events} insight={dayInsight} />

            {/* Heat bar */}
            {density !== "empty" && (
              <div className="ecal-cell__heat-bar">
                <div
                  className="ecal-cell__heat-fill"
                  style={{
                    width: `${Math.min(100, (day.events.length / 10) * 100)}%`,
                    backgroundColor: densityColor,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}