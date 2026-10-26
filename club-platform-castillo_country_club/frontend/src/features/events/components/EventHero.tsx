// src/features/events/components/EventHero.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Event Hero Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   evh-* (event hero)
// @keyframes   5 (in EventHero.css)
// @depends     shared/components/ui: Card, Badge,
//              shared/lib/utils: cn,
//              ../types: EventResponse, EVENT_CATEGORY_CONFIG,
//              EVENT_STATUS_CONFIG, PRICING_MODEL_CONFIG,
//              ../lib/calendarSignals: extractTime
//
// Identity card for event detail page with:
//   - Status aura (border color by event status)
//   - Category ambient background (radial gradient)
//   - Capacity utilization gauge (animated, color-coded)
//   - Lifecycle stage indicator (progress bar)
//   - Quick action bar (edit, share, duplicate — optional)
//   - Staggered metric reveal (left-to-right cascade)
//   - Status badge pulse for active events
//   - Description 2-line clamp with fade
//
// PRE-WRITE VERIFICATION:
// [x] EventResponse has: id, title, description, category, status,
//     date_start, date_end, location, max_capacity, current_attendance,
//     pricing_model, price_per_person, tags
// [x] EVENT_CATEGORY_CONFIG[category] → { icon, label, color, bgColor }
// [x] EVENT_STATUS_CONFIG[status] → { label, color }
// [x] PRICING_MODEL_CONFIG[model] → { label, icon }
// [x] extractTime → "HH:mm" from ISO string (calendarSignals)
// [x] Card: className, children (FASE 1 migrated, 9.1)
// [x] Badge: variant, size, dot, children (FASE 1 migrated, 9.3)
// [x] cn verified in shared/lib/utils
//
// ANTI-PATTERNS REMOVED:
// [x] extractTime duplicated locally → imported from calendarSignals
// [x] ~40 Tailwind utilities → evh-* BEM classes
// [x] No co-located CSS → EventHero.css created
// [x] No data-testid → 8 data-testid attributes
// [x] No § markers → §0-§5
// [x] No file header → added
// [x] Props not readonly → readonly
// [x] Inline style for icon bg → CSS custom property
// [x] STATUS_BADGE_VARIANT untyped → typed Record
// [x] font-[family-name:var(--font-*)] → CSS font-family
// [x] Icon sizing via Tailwind → CSS sizing
// [x] Zero intelligence → capacity gauge + lifecycle bar
// [x] Zero CTAs → optional action bar
// [x] No light mode → CSS §8
// [x] No print → CSS §11
// [x] No responsive → CSS §10
// [x] No reduced motion → CSS §9
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { Calendar, Clock, MapPin, DollarSign, Edit3, Share2, Copy } from "lucide-react";

// Shared — UI
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Types
import type { EventResponse } from "../types";
import {
  EVENT_CATEGORY_CONFIG,
  EVENT_STATUS_CONFIG,
  PRICING_MODEL_CONFIG,
} from "../types";

// Feature — Lib
import { extractTime } from "../lib/calendarSignals";

// Styles
import "./EventHero.css";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Status → Badge variant mapping (typed against EVENT_STATUS_CONFIG keys) */
const STATUS_BADGE_MAP: Record<keyof typeof EVENT_STATUS_CONFIG, "success" | "error" | "neutral" | "info" | "gold"> = {
  draft: "neutral",
  pending_approval: "info",
  approved: "info",
  published: "success",
  in_progress: "gold",
  completed: "info",
  cancelled: "error",
};

/** Lifecycle stages in order (for progress indicator) */
const LIFECYCLE_STAGES = [
  "draft", "pending_approval", "approved", "published", "in_progress", "completed",
] as const;

/** Status CSS class map (drives aura color via CSS) */
const STATUS_CLASS_MAP: Record<string, string> = {
  draft: "evh--status-draft",
  pending_approval: "evh--status-pending",
  approved: "evh--status-approved",
  published: "evh--status-published",
  in_progress: "evh--status-active",
  completed: "evh--status-completed",
  cancelled: "evh--status-cancelled",
};

// ═══════════════════════════════════════════════════════════
// §2 TYPES
// ═══════════════════════════════════════════════════════════

interface EventHeroProps {
  /** Full event data (detail view) */
  readonly event: EventResponse;
  /** Called when edit button is clicked (optional — page controls) */
  readonly onEdit?: () => void;
  /** Called when share button is clicked */
  readonly onShare?: () => void;
  /** Called when duplicate button is clicked */
  readonly onDuplicate?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §3 HELPERS
// ═══════════════════════════════════════════════════════════

/** Format ISO date to localized Spanish short format. */
function formatDateShort(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Get lifecycle progress percentage (0-100). Returns null for cancelled/unknown. */
function getLifecyclePct(status: string): number | null {
  if (status === "cancelled") return null;
  const idx = LIFECYCLE_STAGES.indexOf(status as typeof LIFECYCLE_STAGES[number]);
  if (idx < 0) return null;
  return (idx / (LIFECYCLE_STAGES.length - 1)) * 100;
}

/** Get capacity utilization level. */
function getCapacityLevel(pct: number): "normal" | "high" | "critical" {
  if (pct >= 90) return "critical";
  if (pct >= 70) return "high";
  return "normal";
}

// ═══════════════════════════════════════════════════════════
// §4 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Capacity utilization gauge.
 * Shows animated bar + count + percentage.
 * Color-coded: normal=emerald, high=amber, critical=rose.
 */
function CapacityGauge({
  current,
  max,
}: {
  readonly current: number;
  readonly max: number;
}) {
  if (max <= 0) return null;

  const pct = Math.round((current / max) * 100);
  const level = getCapacityLevel(pct);

  return (
    <div className="evh-cap" data-testid="evh-capacity">
      <div className="evh-cap__track">
        <div
          className={cn("evh-cap__fill", `evh-cap__fill--${level}`)}
          style={{ "--cap-pct": `${Math.min(100, pct)}%` } as React.CSSProperties}
        />
      </div>
      <span className="evh-cap__count">
        {current}/{max}
      </span>
      <span className={cn("evh-cap__pct", `evh-cap__pct--${level}`)}>
        {pct}%
      </span>
    </div>
  );
}

/**
 * Lifecycle stage indicator.
 * Thin bar showing event's position in its journey.
 * Cancelled events show a special rose state.
 */
function LifecycleBar({
  status,
}: {
  readonly status: string;
}) {
  const pct = getLifecyclePct(status);
  const isCancelled = status === "cancelled";

  return (
    <div className="evh-lifecycle" data-testid="evh-lifecycle">
      <div className="evh-lifecycle__track">
        {pct !== null && (
          <div
            className="evh-lifecycle__fill"
            style={{ "--lc-pct": `${pct}%` } as React.CSSProperties}
          />
        )}
        {isCancelled && <div className="evh-lifecycle__fill evh-lifecycle__fill--cancelled" />}
      </div>
      <span className={cn("evh-lifecycle__label", isCancelled && "evh-lifecycle__label--cancelled")}>
        {isCancelled ? "Cancelado" : EVENT_STATUS_CONFIG[status as keyof typeof EVENT_STATUS_CONFIG]?.label || status}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * EventHero — identity card for event detail page.
 *
 * The highest-visibility component. Communicates WHAT, WHEN, WHERE,
 * STATUS, HEALTH, and provides CTAs. Status aura + category ambient
 * let the manager FEEL the event's state before reading anything.
 */
export function EventHero({
  event,
  onEdit,
  onShare,
  onDuplicate,
}: EventHeroProps) {
  const cat = EVENT_CATEGORY_CONFIG[event.category];
  const status = EVENT_STATUS_CONFIG[event.status];
  const pricing = PRICING_MODEL_CONFIG[event.pricing_model];
  const statusClass = STATUS_CLASS_MAP[event.status] || "";
  const badgeVariant = STATUS_BADGE_MAP[event.status] || "neutral";

  // Safe description (2-line clamp handled in CSS)
  const description = event.description?.trim() || "";

  // Price display
  const isFree = event.pricing_model === "free";
  const priceDisplay = isFree
    ? "Gratuito"
    : `₡${event.price_per_person.toLocaleString("es-CR")}`;

  // Has optional actions?
  const hasActions = onEdit || onShare || onDuplicate;

  return (
    <Card
      className={cn("evh", statusClass)}
      style={{ "--cat-color": cat.color } as React.CSSProperties}
      data-testid="evh"
    >
      {/* Category ambient glow */}
      <div className="evh__ambient" aria-hidden="true" />

      {/* ── §5.1 Header: icon + title + status ── */}
      <div className="evh__header">
        <div
          className="evh__icon"
          style={{ "--icon-bg": cat.bgColor } as React.CSSProperties}
          aria-hidden="true"
        >
          {cat.icon}
        </div>
        <div className="evh__title-block">
          <div className="evh__title-row">
            <h2 className="evh__title" data-testid="evh-title">
              {event.title}
            </h2>
            <Badge
              variant={badgeVariant}
              size="sm"
              dot
            >
              {status.label}
            </Badge>
          </div>
          {description && (
            <p className="evh__description" data-testid="evh-description">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ── §5.2 Info metrics grid ── */}
      <div className="evh__metrics">
        <div className="evh__metric evh-stagger" style={{ "--mi": 0 } as React.CSSProperties}>
          <Calendar className="evh__metric-icon" aria-hidden="true" />
          <div className="evh__metric-body">
            <span className="evh__metric-label">Fecha</span>
            <span className="evh__metric-value" data-testid="evh-date">
              {formatDateShort(event.date_start)}
            </span>
          </div>
        </div>

        <div className="evh__metric evh-stagger" style={{ "--mi": 1 } as React.CSSProperties}>
          <Clock className="evh__metric-icon" aria-hidden="true" />
          <div className="evh__metric-body">
            <span className="evh__metric-label">Horario</span>
            <span className="evh__metric-value" data-testid="evh-time">
              {extractTime(event.date_start)} — {extractTime(event.date_end)}
            </span>
          </div>
        </div>

        <div className="evh__metric evh-stagger" style={{ "--mi": 2 } as React.CSSProperties}>
          <MapPin className="evh__metric-icon" aria-hidden="true" />
          <div className="evh__metric-body">
            <span className="evh__metric-label">Lugar</span>
            <span className="evh__metric-value" data-testid="evh-location">
              {event.location || "Por confirmar"}
            </span>
          </div>
        </div>

        <div className="evh__metric evh-stagger" style={{ "--mi": 3 } as React.CSSProperties}>
          <DollarSign className="evh__metric-icon" aria-hidden="true" />
          <div className="evh__metric-body">
            <span className="evh__metric-label">Costo</span>
            <span className="evh__metric-value" data-testid="evh-price">
              {priceDisplay}
              {!isFree && (
                <span className="evh__metric-note">{pricing.label}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── §5.3 Intelligence strip ── */}
      <div className="evh__intel">
        <CapacityGauge
          current={event.current_attendance}
          max={event.max_capacity}
        />
        <LifecycleBar status={event.status} />
      </div>

      {/* ── §5.4 Quick actions (optional) ── */}
      {hasActions && (
        <div className="evh__actions" data-testid="evh-actions">
          {onEdit && (
            <button
              type="button"
              className="evh-action evh-action--primary"
              onClick={onEdit}
              aria-label="Editar evento"
            >
              <Edit3 className="evh-action__icon" aria-hidden="true" />
              <span>Editar</span>
            </button>
          )}
          {onShare && (
            <button
              type="button"
              className="evh-action evh-action--ghost"
              onClick={onShare}
              aria-label="Compartir evento"
            >
              <Share2 className="evh-action__icon" aria-hidden="true" />
              <span>Compartir</span>
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              className="evh-action evh-action--ghost"
              onClick={onDuplicate}
              aria-label="Duplicar evento"
            >
              <Copy className="evh-action__icon" aria-hidden="true" />
              <span>Duplicar</span>
            </button>
          )}
        </div>
      )}
    </Card>
  );
}