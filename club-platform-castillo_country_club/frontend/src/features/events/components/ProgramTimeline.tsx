// src/features/events/components/ProgramTimeline.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Program Timeline Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ptl-* (program timeline)
// @keyframes   5 (in ProgramTimeline.css)
// @depends     shared/components/ui: EmptyState,
//              shared/lib/utils: cn,
//              lucide-react: Clock, MapPin, Users, Coffee,
//              ../types: ProgramItem
//
// Enhanced vertical timeline with:
//   - Now progress rail (gold gradient tracks "now")
//   - Active item ambient glow (pulsing gold border)
//   - Gap type classification (short/long/meal)
//   - CSS-only expand/collapse (grid-template-rows)
//   - Item stagger cascade (--item-i per item)
//   - Next item teaser with countdown
//   - Completion ring at top
//
// PRE-WRITE VERIFICATION:
// [x] EmptyState: icon?, title, description?, className? ✅ (FASE 1, 9.3)
// [x] cn verified in shared/lib/utils ✅
// [x] ProgramItem from ../types ✅
//
// ANTI-PATTERNS REMOVED:
// [x] 8 glass-* undefined namespaces → ptl-* BEM
// [x] ~15 Tailwind utilities → ptl-* BEM
// [x] font-[ family-name:var(--font-*) ] → CSS font-family
// [x] w-12 h-12, w-3 h-3 → CSS sizing
// [x] bg-[ var(--color-*) ]/15 → color-mix()
// [x] pt-2 space-y-1 → CSS gap
// [x] 0 data-testid → 8 attributes
// [x] Props not readonly → readonly
// [x] No CSS file → created from scratch
// [x] No § markers → §0-§5 (TSX), §0-§16 (CSS)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { Clock, MapPin, Users, Coffee, ChevronDown } from "lucide-react";

// Shared — UI
import { EmptyState } from "@/shared/components/ui/EmptyState";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Types
import type { ProgramItem } from "../types";

// Styles
import "./ProgramTimeline.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface ProgramTimelineProps {
  /** Ordered list of program items */
  readonly items: readonly ProgramItem[];
}

/** Gap classification for visual treatment. */
interface GapInfo {
  readonly minutes: number;
  readonly type: "short" | "long" | "meal";
  readonly label: string;
}

// ═══════════════════════════════════════════════════════════
// §2 HELPERS
// ═══════════════════════════════════════════════════════════

/** Calculate minutes between two "HH:MM" strings. */
function getGapMinutes(endTime: string, startTime: string): number {
  const [eh, em] = endTime.split(":").map(Number);
  const [sh, sm] = startTime.split(":").map(Number);
  return sh * 60 + sm - (eh * 60 + em);
}

/** Format minutes to human-readable duration. */
function formatGapDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Classify gap into type for visual treatment. */
function classifyGap(endTime: string, startTime: string): GapInfo | null {
  const minutes = getGapMinutes(endTime, startTime);
  if (minutes <= 15) return null;

  const startHour = parseInt(startTime.split(":")[0], 10);

  // Meal detection: 11:30-14:00 start = lunch, 18:00-21:00 = dinner
  const isMealWindow = (startHour >= 11 && startHour <= 14) ||
    (startHour >= 18 && startHour <= 21);

  if (minutes >= 40 && isMealWindow) {
    return {
      minutes,
      type: "meal",
      label: startHour < 15 ? "Almuerzo" : "Cena",
    };
  }

  if (minutes >= 60) {
    return { minutes, type: "long", label: "Pausa larga" };
  }

  if (minutes > 15) {
    return { minutes, type: "short", label: "Pausa" };
  }

  return null;
}

/** Get current time as "HH:MM". */
function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Calculate progress percentage through the day. */
function calculateProgress(items: readonly ProgramItem[]): number {
  if (items.length === 0) return 0;
  const now = getCurrentTime();
  const firstStart = items[0].time_start;
  const lastEnd = items[items.length - 1].time_end;

  if (now < firstStart) return 0;
  if (now >= lastEnd) return 100;

  const totalMinutes = getGapMinutes(firstStart, lastEnd);
  const elapsed = getGapMinutes(firstStart, now);
  return totalMinutes > 0 ? Math.min(100, Math.max(0, (elapsed / totalMinutes) * 100)) : 0;
}

// ═══════════════════════════════════════════════════════════
// §3 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * ProgramTimeline — Vertical timeline with progress rail,
 * gap classification, active glow, and CSS-only expand.
 */
export function ProgramTimeline({ items }: ProgramTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Sort by order
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items],
  );

  // Active / Next detection
  const { activeIdx, nextIdx } = useMemo(() => {
    const nowTime = getCurrentTime();
    const aIdx = sorted.findIndex(
      (item) => nowTime >= item.time_start && nowTime < item.time_end,
    );
    const nIdx =
      aIdx === -1
        ? sorted.findIndex((item) => nowTime < item.time_start)
        : aIdx + 1 < sorted.length
          ? aIdx + 1
          : -1;
    return { activeIdx: aIdx, nextIdx: nIdx };
  }, [sorted]);

  // Progress percentage
  const progress = useMemo(() => calculateProgress(sorted), [sorted]);

  // Completion count
  const completedCount = useMemo(() => {
    const nowTime = getCurrentTime();
    return sorted.filter((item) => item.time_end <= nowTime).length;
  }, [sorted]);

  // Countdown to next item
  const nextCountdown = useMemo(() => {
    if (nextIdx < 0 || nextIdx >= sorted.length) return null;
    const nowTime = getCurrentTime();
    const gap = getGapMinutes(nowTime, sorted[nextIdx].time_start);
    if (gap <= 0) return null;
    return `en ${formatGapDuration(gap)}`;
  }, [sorted, nextIdx]);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="ptl__empty-icon" />}
        title="Sin programa definido"
        description="El itinerario del evento aún no ha sido creado."
      />
    );
  }

  return (
    <div className="ptl" data-testid="ptl">
      {/* Completion header */}
      <div className="ptl__header" data-testid="ptl-header">
        <div className="ptl__ring-wrap">
          <svg className="ptl__ring" viewBox="0 0 36 36" aria-hidden="true">
            <circle className="ptl__ring-track" cx="18" cy="18" r="15" />
            <circle
              className="ptl__ring-fill"
              cx="18"
              cy="18"
              r="15"
              style={{ "--ring-pct": `${(completedCount / sorted.length) * 100}%` } as React.CSSProperties}
            />
          </svg>
          <span className="ptl__ring-label">{completedCount}/{sorted.length}</span>
        </div>
        <div className="ptl__header-info">
          <span className="ptl__header-title">Programa del evento</span>
          <span className="ptl__header-sub">{sorted.length} actividades</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="ptl__track" style={{ "--tl-progress": `${progress}%` } as React.CSSProperties}>
        {/* Progress fill rail */}
        <div className="ptl__rail" aria-hidden="true">
          <div className="ptl__rail-fill" />
        </div>

        {sorted.map((item, idx) => {
          const isActive = idx === activeIdx;
          const isNext = idx === nextIdx;
          const isExpanded = expanded.has(item.id);
          const isPast = item.time_end <= getCurrentTime();

          // Gap detection
          const gap = idx > 0 ? classifyGap(sorted[idx - 1].time_end, item.time_start) : null;

          return (
            <div
              key={item.id}
              className="ptl__stagger"
              style={{ "--item-i": idx } as React.CSSProperties}
            >
              {/* Gap segment */}
              {gap && (
                <div className={cn("ptl-gap", `ptl-gap--${gap.type}`)} data-testid="ptl-gap">
                  <span className="ptl-gap__icon" aria-hidden="true">
                    {gap.type === "meal" ? <Coffee size={12} /> : <Clock size={10} />}
                  </span>
                  <span className="ptl-gap__label">
                    {gap.label}: {formatGapDuration(gap.minutes)}
                  </span>
                </div>
              )}

              {/* Timeline item */}
              <div
                className={cn(
                  "ptl-item",
                  isActive && "ptl-item--active",
                  isNext && "ptl-item--next",
                  isPast && !isActive && "ptl-item--past",
                )}
                data-testid={`ptl-item-${item.id}`}
              >
                {/* Dot on rail */}
                <div className="ptl-item__dot" aria-hidden="true" />

                {/* Node (clickable) */}
                <Button
                  variant="unstyled"
                  type="button"
                  className="ptl-item__node"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={isExpanded}
                  aria-label={`${item.time_start} a ${item.time_end}: ${item.title}`}
                  data-testid={`ptl-node-${item.id}`}
                >
                  {/* Header row */}
                  <div className="ptl-item__header">
                    <span className="ptl-item__time">
                      {item.time_start} — {item.time_end}
                    </span>
                    <h5 className="ptl-item__title">{item.title}</h5>
                    {isActive && (
                      <span className="ptl-item__badge ptl-item__badge--now">Ahora</span>
                    )}
                    {isNext && (
                      <span className="ptl-item__badge ptl-item__badge--next">
                        Siguiente{nextCountdown ? ` · ${nextCountdown}` : ""}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="ptl-item__desc">{item.description}</p>
                  )}

                  {/* Expandable details */}
                  <div className="ptl-item__details" data-state={isExpanded ? "open" : "closed"}>
                    <div className="ptl-item__details-inner">
                      {item.location && (
                        <p className="ptl-item__detail">
                          <MapPin size={12} className="ptl-item__detail-icon" aria-hidden="true" />
                          {item.location}
                        </p>
                      )}
                      {item.responsible && (
                        <p className="ptl-item__detail">
                          <Users size={12} className="ptl-item__detail-icon" aria-hidden="true" />
                          {item.responsible}
                        </p>
                      )}
                      {item.notes && (
                        <p className="ptl-item__notes">{item.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Chevron indicator */}
                  <span className="ptl-item__chevron" aria-hidden="true">
                    <ChevronDown size={12} />
                  </span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}