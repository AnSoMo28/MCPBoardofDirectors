// src/features/events/components/ChronoCompass.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Chrono-Compass Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   chrono-* (timeline visualization)
// @keyframes   2 (in ChronoCompass.css)
// @depends     shared/lib/utils: cn,
//              ../types: EventBrief, EVENT_CATEGORY_CONFIG,
//              ../lib/calendarSignals: extractTime, formatSlotDuration,
//              AvailableSlot
//
// Visual day timeline (06:00–23:00) showing:
//   - Events as category-colored blocks with stagger reveal
//   - Available gaps as clickable emerald zones
//   - Time markers at 4-hour intervals
//   - Next-event needle with golden pulse
//
// PRE-WRITE VERIFICATION:
// [x] EventBrief has: id, title, category, date_start, date_end
// [x] EVENT_CATEGORY_CONFIG[category] → { icon, label, color, bgColor }
// [x] AvailableSlot → { start, end, durationMinutes }
// [x] extractTime → "HH:mm" from ISO string
// [x] formatSlotDuration → "Xh Ymin" from minutes
// [x] cn verified in shared/lib/utils
//
// ANTI-PATTERNS REMOVED:
// [x] ~15 Tailwind utilities → chrono-* BEM classes
// [x] glass-* namespace → chrono-*
// [x] No co-located CSS → ChronoCompass.css created
// [x] No data-testid → 3 data-testid attributes
// [x] No § markers → §0-§3
// [x] No file header → added
// [x] Props not readonly → readonly
// [x] HOUR_MARKERS 18 entries/5 used → CHRONO_DISPLAY_HOURS (5 const)
// [x] nextEventIdx not memoized → useMemo
// [x] Inline style for position → CSS custom properties
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Types
import type { EventBrief } from "../types";
import { EVENT_CATEGORY_CONFIG } from "../types";

// Feature — Lib
import { extractTime, formatSlotDuration } from "../lib/calendarSignals";
import type { AvailableSlot } from "../lib/calendarSignals";

// Styles
import "./ChronoCompass.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

const CHRONO_START = 6;
const CHRONO_END = 23;
const CHRONO_SPAN = CHRONO_END - CHRONO_START;

/** Hours to display as markers (every ~4h from 06:00 to 23:00) */
const CHRONO_DISPLAY_HOURS = [6, 10, 14, 18, 23] as const;

/** Convert "HH:mm" to percentage position on the track. */
function timeToPct(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const raw = ((h + m / 60 - CHRONO_START) / CHRONO_SPAN) * 100;
  return Math.max(0, Math.min(100, raw));
}

// ═══════════════════════════════════════════════════════════
// §2 TYPES
// ═══════════════════════════════════════════════════════════

interface ChronoCompassProps {
  /** Events for this day (readonly) */
  readonly dayEvents: readonly EventBrief[];
  /** Available time slots */
  readonly availableSlots: readonly AvailableSlot[];
  /** Called when a gap zone is clicked */
  readonly onSlotClick: (slot: { start: string; end: string }) => void;
  /** Currently active slot start time (for visual highlight) */
  readonly activeSlotStart?: string | null;
}

// ═══════════════════════════════════════════════════════════
// §3 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * ChronoCompass — visual day timeline (06:00–23:00).
 *
 * Renders events as category-colored blocks and available gaps
 * as clickable emerald zones. Shows a golden "next event" needle.
 */
export function ChronoCompass({
  dayEvents,
  availableSlots,
  onSlotClick,
  activeSlotStart,
}: ChronoCompassProps) {

  /* ── §3.1 Sort events by start time ── */
  const sortedEvents = useMemo(
    () =>
      [...dayEvents].sort((a, b) =>
        extractTime(a.date_start).localeCompare(extractTime(b.date_start)),
      ),
    [dayEvents],
  );

  /* ── §3.2 Find next event index for needle ── */
  const nextEventIdx = useMemo(() => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return sortedEvents.findIndex(
      (e) => extractTime(e.date_start) > timeStr,
    );
  }, [sortedEvents]);

  return (
    <div className="chrono" data-testid="chrono">
      <div className="chrono__track">

        {/* ── §3.3 Time markers ── */}
        <div className="chrono__markers" aria-hidden="true">
          {CHRONO_DISPLAY_HOURS.map((hour) => {
            const pct = ((hour - CHRONO_START) / CHRONO_SPAN) * 100;
            const label = `${String(hour).padStart(2, "0")}:00`;
            return (
              <div key={hour} className="chrono__marker-group">
                <div
                  className="chrono__marker"
                  style={{ "--m-left": `${pct}%` } as React.CSSProperties}
                />
                <span
                  className="chrono__label"
                  style={{ "--m-left": `${pct}%` } as React.CSSProperties}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── §3.4 Event blocks ── */}
        {sortedEvents.map((event, idx) => {
          const start = extractTime(event.date_start);
          const end = extractTime(event.date_end);
          const left = timeToPct(start);
          const width = timeToPct(end) - left;
          const cat = EVENT_CATEGORY_CONFIG[event.category];

          return (
            <div
              key={event.id}
              className="chrono__block"
              style={{
                "--b-left": `${left}%`,
                "--b-width": `${Math.max(width, 2)}%`,
                "--b-bg": cat.bgColor,
                "--b-color": cat.color,
                "--b-i": idx,
              } as React.CSSProperties}
              title={`${event.title} (${start}–${end})`}
              data-testid={`chrono-block-${event.id}`}
            >
              <span className="chrono__block-label">
                <span aria-hidden="true">{cat.icon}</span>
                {event.title}
              </span>
              {idx === nextEventIdx && (
                <div className="chrono__needle" aria-label="Próximo evento" />
              )}
            </div>
          );
        })}

        {/* ── §3.5 Available gaps ── */}
        {availableSlots.map((slot, i) => {
          const left = timeToPct(slot.start);
          const width = timeToPct(slot.end) - left;
          const isIdeal = slot.durationMinutes >= 120;
          const isActive = activeSlotStart === slot.start;

          return (
            <Button
              variant="unstyled"
              key={`${slot.start}-${i}`}
              type="button"
              onClick={() => onSlotClick({ start: slot.start, end: slot.end })}
              className={cn(
                "chrono__gap",
                isIdeal && "chrono__gap--ideal",
                isActive && "chrono__gap--active",
              )}
              style={{
                "--g-left": `${left}%`,
                "--g-width": `${Math.max(width, 2)}%`,
              } as React.CSSProperties}
              aria-label={`Slot disponible ${slot.start}–${slot.end} (${formatSlotDuration(slot.durationMinutes)})`}
              data-testid={`chrono-gap-${slot.start}`}
            >
              <span className="chrono__gap-label">
                {slot.start}–{slot.end}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}