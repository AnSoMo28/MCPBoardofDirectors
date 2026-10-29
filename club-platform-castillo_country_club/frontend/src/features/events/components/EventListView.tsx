// src/features/events/components/EventListView.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — List View Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   elv-* (event list view)
// @keyframes   3 (in EventListView.css)
// @depends     shared/components/ui: EmptyState,
//              shared/lib/utils: cn,
//              ../types: EventBrief, EVENT_CATEGORY_CONFIG,
//              EVENT_STATUS_CONFIG, PRICING_MODEL_CONFIG,
//              ../lib/calendarSignals: extractTime
//
// Grouped event list with:
//   - Today group glow beacon
//   - Staggered card reveal per group
//   - Capacity bar with glow on high/critical
//   - Category-colored accent stripe + status badge
//   - Group count badge with pop animation
//   - Responsive: desktop full → tablet compact → mobile minimal
//
// PRE-WRITE VERIFICATION:
// [x] EventBrief.status is EventStatus → NO `as keyof typeof` needed
// [x] EVENT_STATUS_CONFIG[EventStatus] → direct access
// [x] formatNumber is NOT used → dead import removed
// [x] cn verified in shared/lib/utils
// [x] EmptyState → icon?, title, description?, action?
// [x] extractTime → extracts HH:mm from ISO string
//
// ANTI-PATTERNS REMOVED:
// [x] formatNumber dead import → removed
// [x] `as keyof typeof EVENT_STATUS_CONFIG` → direct access
// [x] ~35 Tailwind utilities → elv-* BEM classes
// [x] glass-* namespace → elv-* (component-specific)
// [x] ec-stagger-item cross-dependency → elv-stagger
// [x] No co-located CSS → EventListView.css
// [x] No data-testid → 5 data-testid attributes
// [x] No § markers → §0-§4
// [x] No file header → added
// [x] events prop mutable → readonly
// [x] MONTH_NAMES not readonly → as const
// [x] Inline style for capacity → CSS custom properties
// [x] font-[ family-name:var(--font-*) ] → CSS font-family
// [x] No light mode → CSS §8
// [x] No print → CSS §11
// [x] No responsive → CSS §10
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";

// Shared — UI
import { EmptyState } from "@/shared/components/ui/EmptyState";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Types
import type { EventBrief } from "../types";
import {
  EVENT_CATEGORY_CONFIG,
  EVENT_STATUS_CONFIG,
  PRICING_MODEL_CONFIG,
} from "../types";

// Feature — Lib
import { extractTime } from "../lib/calendarSignals";

// Styles
import "./EventListView.css";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
] as const;

// ═══════════════════════════════════════════════════════════
// §2 TYPES
// ═══════════════════════════════════════════════════════════

interface EventListViewProps {
  /** Events to display (readonly — matches hook return type) */
  readonly events: readonly EventBrief[];
  /** Called when an event card is clicked */
  readonly onEventClick: (event: EventBrief) => void;
}

// ═══════════════════════════════════════════════════════════
// §3 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Capacity bar with utilization percentage and label.
 * Glows when utilization is high (>70%) or critical (>90%).
 */
function CapacityBadge({ event }: { readonly event: EventBrief }) {
  if (event.max_capacity <= 0) return null;

  const pct = Math.round((event.current_attendance / event.max_capacity) * 100);
  const level = pct >= 90 ? "critical" : pct >= 70 ? "high" : "normal";

  return (
    <div className="elv-capacity" data-testid="elv-capacity">
      <div className="elv-capacity__bar">
        <div
          className={cn("elv-capacity__fill", `elv-capacity__fill--${level}`)}
          style={{ "--cap-pct": `${Math.min(100, pct)}%` } as React.CSSProperties}
        />
      </div>
      <span className="elv-capacity__count">
        {event.current_attendance}/{event.max_capacity}
      </span>
      {level !== "normal" && (
        <span className={cn("elv-capacity__label", `elv-capacity__label--${level}`)}>
          ({level === "critical" ? "casi lleno" : "alta demanda"})
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * EventListView — grouped event list with staggered card reveal.
 *
 * Groups events by date. Each group has a date header with
 * day number, month abbreviation, and event count badge.
 * Cards reveal with sequential stagger animation.
 * Today's group gets a gold glow beacon.
 */
export function EventListView({ events, onEventClick }: EventListViewProps) {

  /* ── §4.1 Group events by date ── */
  const grouped = useMemo(() => {
    const map = new Map<string, EventBrief[]>();
    for (const event of events) {
      const key = event.date_start.split("T")[0];
      const existing = map.get(key);
      if (existing) {
        existing.push(event);
      } else {
        map.set(key, [event]);
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  /* ── §4.2 Today string ── */
  const todayStr = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  /* ── §4.3 Empty state ── */
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays />}
        title="Sin eventos"
        description="No hay eventos programados para este período."
        data-testid="elv-empty"
      />
    );
  }

  /* ── §4.4 Render ── */
  return (
    <div className="elv" data-testid="elv">
      {grouped.map(([date, dayEvents], groupIdx) => {
        const dateObj = new Date(date + "T12:00:00");
        const isToday = date === todayStr;

        return (
          <div
            key={date}
            className={cn("elv-group", isToday && "elv-group--today")}
            data-testid={`elv-group-${date}`}
          >
            {/* ── Date header ── */}
            <div className="elv-group__header">
              <div
                className={cn(
                  "elv-group__datebox",
                  isToday && "elv-group__datebox--today",
                )}
              >
                <span className="elv-group__month">
                  {MONTH_NAMES[dateObj.getMonth()]}
                </span>
                <span className="elv-group__daynum">
                  {dateObj.getDate()}
                </span>
              </div>
              <div className="elv-group__info">
                <p className="elv-group__weekday">
                  {dateObj.toLocaleDateString("es-CR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <span className="elv-group__badge">
                  {dayEvents.length} evento{dayEvents.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* ── Event cards ── */}
            <div className="elv-group__cards">
              {dayEvents.map((event, cardIdx) => {
                const cat = EVENT_CATEGORY_CONFIG[event.category];
                const status = EVENT_STATUS_CONFIG[event.status];
                const time = extractTime(event.date_start);
                const timeEnd = extractTime(event.date_end);
                const pricing = PRICING_MODEL_CONFIG[event.pricing_model];

                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${event.title} — ${status.label} — ${time} a ${timeEnd}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onEventClick(event);
                    }}
                    className={cn("elv-card", "elv-stagger")}
                    style={{
                      "--card-accent": cat.color,
                      "--i": groupIdx * 3 + cardIdx,
                    } as React.CSSProperties}
                    data-testid={`elv-card-${event.id}`}
                  >
                    {/* Category icon */}
                    <div
                      className="elv-card__icon"
                      style={{ background: cat.bgColor }}
                      aria-hidden="true"
                    >
                      {cat.icon}
                    </div>

                    {/* Info */}
                    <div className="elv-card__body">
                      <div className="elv-card__title-row">
                        <h4 className="elv-card__title">{event.title}</h4>
                        <span
                          className="elv-card__status"
                          style={{ "--status-color": status.color } as React.CSSProperties}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="elv-card__meta">
                        <span className="elv-card__meta-item">
                          <Clock className="elv-card__meta-icon" aria-hidden="true" />
                          {time} — {timeEnd}
                        </span>
                        {event.location && (
                          <span className="elv-card__meta-item">
                            <MapPin className="elv-card__meta-icon" aria-hidden="true" />
                            {event.location}
                          </span>
                        )}
                      </div>

                      {/* Capacity gauge */}
                      <CapacityBadge event={event} />
                    </div>

                    {/* Pricing badge */}
                    {event.pricing_model !== "free" && (
                      <span
                        className="elv-card__pricing"
                        title={pricing.label}
                        aria-label={pricing.label}
                      >
                        {pricing.icon}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}