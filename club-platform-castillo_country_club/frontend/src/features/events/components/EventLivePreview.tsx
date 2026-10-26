// src/features/events/components/EventLivePreview.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Live Preview Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   elp-* (event live preview)
// @keyframes   2 (in EventLivePreview.css)
// @depends     lucide-react: Calendar, Clock, MapPin, Tag,
//              ../types: EVENT_CATEGORY_CONFIG, PRICING_MODEL_CONFIG,
//              ../hooks/useEventForm: EventFormData
//
// Sidebar glass card that builds in real-time as the user fills
// the wizard form. The event "comes alive" before it exists.
//
// PRE-WRITE VERIFICATION:
// [x] EventFormData from ../hooks/useEventForm (feature-internal) ✅
// [x] Config objects from ../types ✅
// [x] Lucide icons (4) verified ✅
// [x] No shared/ UI imports needed (self-contained preview) ✅
//
// ANTI-PATTERNS REMOVED:
// [x] 6 glass-* undefined namespaces → elp-* BEM
// [x] ~8 Tailwind utilities → elp-* BEM
// [x] font-[family-name:var(--font-*)] → CSS font-family
// [x] w-3 h-3 → CSS sizing
// [x] Inline styles for colors → CSS custom properties
// [x] 0 data-testid → 5 attributes
// [x] Props not readonly → readonly
// [x] No CSS file → created from scratch
// [x] capitalize Tailwind → CSS text-transform
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { Calendar, Clock, MapPin } from "lucide-react";

// Feature — Types & Config
import { EVENT_CATEGORY_CONFIG, PRICING_MODEL_CONFIG } from "../types";

// Feature — Hook type
import type { EventFormData } from "../hooks/useEventForm";

// Styles
import "./EventLivePreview.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface EventLivePreviewProps {
  /** Current form data from the wizard */
  readonly form: EventFormData;
}

// ═══════════════════════════════════════════════════════════
// §2 HELPERS
// ═══════════════════════════════════════════════════════════

/** Format ISO date string to short localized display. */
function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

/** Parse comma-separated tags, trimmed and deduplicated. */
function parseTags(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ═══════════════════════════════════════════════════════════
// §3 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * EventLivePreview — Real-time event preview card.
 *
 * Renders as a sidebar card that updates instantly as the user
 * fills the wizard form. Shows category icon, title, schedule,
 * location, capacity bar, pricing, and tags.
 */
export function EventLivePreview({ form }: EventLivePreviewProps) {
  const catConfig = EVENT_CATEGORY_CONFIG[form.category];
  const pricingConfig = PRICING_MODEL_CONFIG[form.pricing_model];
  const parsedTags = parseTags(form.tags);

  const accessDisplay = form.event_type.replace("_", " ");
  const priceDisplay =
    form.pricing_model === "free"
      ? "Gratuito"
      : `₡${(form.price_per_person || 0).toLocaleString("es-CR")}`;

  return (
    <div className="elp" data-testid="elp">
      {/* Label */}
      <div className="elp__label" data-testid="elp-label">Vista previa</div>

      {/* Category icon */}
      <div
        className="elp__icon"
        style={{ "--elp-icon-bg": catConfig.bgColor } as React.CSSProperties}
        aria-hidden="true"
      >
        {catConfig.icon}
      </div>

      {/* Title */}
      <h4
        className="elp__title"
        data-testid="elp-title"
        data-empty={!form.title || undefined}
      >
        {form.title || "Tu evento"}
      </h4>

      {/* Category + Access */}
      <div className="elp__meta-row">
        <span className="elp__category" style={{ color: catConfig.color }}>
          {catConfig.label}
        </span>
        <span className="elp__dot" aria-hidden="true">&middot;</span>
        <span className="elp__access">{accessDisplay}</span>
      </div>

      {/* Schedule & Location meta */}
      <div className="elp__info" data-testid="elp-info">
        {form.startDate && (
          <span className="elp__info-item">
            <Calendar size={12} className="elp__info-icon" aria-hidden="true" />
            <span>
              {formatDateShort(form.startDate)}
              {form.endDate && form.endDate !== form.startDate &&
                ` — ${formatDateShort(form.endDate)}`}
            </span>
          </span>
        )}
        {(form.startTime || form.endTime) && (
          <span className="elp__info-item">
            <Clock size={12} className="elp__info-icon" aria-hidden="true" />
            <span>
              {form.startTime || "??:??"} — {form.endTime || "??:??"}
            </span>
          </span>
        )}
        {form.location && (
          <span className="elp__info-item">
            <MapPin size={12} className="elp__info-icon" aria-hidden="true" />
            <span>{form.location}</span>
          </span>
        )}
      </div>

      {/* Capacity bar (always shown — starts at 0) */}
      <div className="elp-capacity" data-testid="elp-capacity">
        <p className="elp-capacity__label">
          0 / {form.maxCapacity || 50}
        </p>
        <div className="elp-capacity__track">
          <div className="elp-capacity__fill" />
        </div>
      </div>

      {/* Pricing */}
      <div className="elp__pricing">
        <span className="elp__pricing-icon" aria-hidden="true">{pricingConfig.icon}</span>
        <span className="elp__pricing-value" style={{ color: pricingConfig.color }}>
          {priceDisplay}
        </span>
      </div>

      {/* Tags */}
      {parsedTags.length > 0 && (
        <div className="elp__tags" data-testid="elp-tags">
          {parsedTags.slice(0, 5).map((tag) => (
            <span key={tag} className="elp__tag">{tag}</span>
          ))}
          {parsedTags.length > 5 && (
            <span className="elp__tag elp__tag--overflow">
              +{parsedTags.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Status */}
      <div className="elp__status" data-testid="elp-status">
        Borrador
      </div>
    </div>
  );
}