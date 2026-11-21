// src/features/events/components/QuickAddPanel.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Quick-Add Panel Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   qap-* (quick-add panel)
// @keyframes   4 (in QuickAddPanel.css)
// @depends     shared/lib/utils: cn,
//              shared/components/ui: Button, showToast,
//              shared/components/ui/FormField: inputClass,
//              shared/types/domain-enums: EventCategory,
//              ../types: EventBrief, EVENT_CATEGORY_CONFIG,
//              ../lib/calendarSignals: getDayIntelligence, extractTime,
//              formatSlotDuration,
//              ../hooks/useEventCalendar: QuickAddData,
//              ./ChronoCompass: ChronoCompass
//
// Slide-in panel with:
//   - CSS-only slide + backdrop (data-state)
//   - Day intelligence (load, capacity, venue, conflicts)
//   - Chrono-Compass integration
//   - Category presets with smart suggestions
//   - Conflict detection with suggested slot
//   - Tag selector with custom tag input
//   - Staggered section reveal on open
//
// PRE-WRITE VERIFICATION:
// [x] Button → variant: "ghost"|"primary"|"danger", size: "sm"|"md",
//     icon?, iconPosition?, className?, onClick?
// [x] showToast → { type, message }
// [x] inputClass → Tailwind string (shared utility, kept as-is)
// [x] QuickAddData → { title, category, date, startTime, endTime,
//     location, capacity, tags: string[] }
// [x] EventCategory → "sports"|"cultural"|"social"|"private"|"festive"|
//     "children"|"family"|"corporate"
// [x] getDayIntelligence → DayIntelligence with load, availableSlots,
//     conflictCount, totalCapacity, totalConfirmed, occupancyPct,
//     venueDistribution
// [x] formatSlotDuration → "Xh Ymin" from minutes
//
// ANTI-PATTERNS REMOVED:
// [x] MapPin dead import → removed
// [x] ~60 Tailwind utilities → qap-* BEM classes
// [x] glass-* namespace → qap-*
// [x] ec-stagger-item cross-dependency → qap-section-reveal
// [x] No co-located CSS → QuickAddPanel.css created
// [x] No data-testid → 8 data-testid attributes
// [x] No § markers → §0-§5
// [x] No file header → added
// [x] Props not readonly → readonly
// [x] CATEGORY_PRESETS.tags not readonly → readonly string[]
// [x] TAG_PRESETS not as const → as const
// [x] LOCATION_CAPACITY not as const → as const
// [x] Inline style for bars → CSS custom properties
// [x] font-[ family-name:var(--font-*) ] → CSS font-family
// [x] Button+Tailwind mixing → local CSS for specialized buttons
// [x] Icon sizing via Tailwind → CSS sizing
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from "react";
import { AlertTriangle, X, ArrowRight, Sparkles, Zap } from "lucide-react";

// Shared — UI
import { Button } from "@/shared/components/ui/Button";
import { showToast } from "@/shared/components/ui";
import { inputClass } from "@/shared/components/ui/FormField";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Shared — Types
import type { EventCategory } from "@/shared/types/domain-enums";

// Feature — Types
import type { EventBrief } from "../types";
import { EVENT_CATEGORY_CONFIG } from "../types";

// Feature — Lib
import {
  getDayIntelligence,
  extractTime,
  formatSlotDuration,
} from "../lib/calendarSignals";

// Feature — Hooks
import type { QuickAddData } from "../hooks/useEventCalendar";

// Feature — Components
import { ChronoCompass } from "./ChronoCompass";

// Styles
import "./QuickAddPanel.css";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

interface CategoryPreset {
  readonly location: string;
  readonly capacity: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly tags: readonly string[];
}

const CATEGORY_PRESETS: Record<EventCategory, CategoryPreset> = {
  sports:    { location: "Canchas de Pádel",      capacity: 30, startTime: "09:00", endTime: "12:00", tags: ["Deporte", "Competencia"] },
  cultural:  { location: "Salón VIP",             capacity: 50, startTime: "19:00", endTime: "22:00", tags: ["Cultural", "Arte"] },
  social:    { location: "Restaurante Principal", capacity: 80, startTime: "11:00", endTime: "14:00", tags: ["Social", "Familiar"] },
  private:   { location: "Salón VIP",             capacity: 50, startTime: "19:00", endTime: "23:00", tags: ["Privado", "Exclusivo"] },
  festive:   { location: "Piscina Principal",     capacity: 60, startTime: "10:00", endTime: "16:00", tags: ["Festivo", "Familiar"] },
  children:  { location: "Restaurante Principal", capacity: 30, startTime: "10:00", endTime: "12:00", tags: ["Infantil", "Familiar"] },
  family:    { location: "Terraza del Spa",       capacity: 40, startTime: "09:00", endTime: "12:00", tags: ["Familiar", "Bienestar"] },
  corporate: { location: "Sala de Juntas",        capacity: 20, startTime: "14:00", endTime: "16:00", tags: ["Corporativo", "Reunión"] },
};

const TAG_PRESETS = [
  "Gala", "Familiar", "Deporte", "Bienestar", "Gastronómico",
  "Infantil", "Corporativo", "Social", "Temporada",
] as const;

const LOCATION_CAPACITY: Record<string, number> = {
  "Salón VIP": 50,
  "Restaurante Principal": 120,
  "Canchas de Pádel": 45,
  "Piscina Principal": 60,
  "Sala de Juntas": 20,
  "Terraza del Spa": 30,
  "Sala de Actividades": 25,
} as const;

const LOCATION_NAMES = Object.keys(LOCATION_CAPACITY);

// ═══════════════════════════════════════════════════════════
// §2 TYPES
// ═══════════════════════════════════════════════════════════

interface QuickAddPanelProps {
  /** Selected date string (YYYY-MM-DD) */
  readonly date: string;
  /** Events on the selected day */
  readonly dayEvents: readonly EventBrief[];
  /** Panel open state */
  readonly isOpen: boolean;
  /** Close panel callback */
  readonly onClose: () => void;
  /** Navigate to full form with prefilled data */
  readonly onFullForm: (data: QuickAddData) => void;
  /** Create draft event */
  readonly onCreateDraft: (data: QuickAddData) => void;
}

// ═══════════════════════════════════════════════════════════
// §3 HELPERS
// ═══════════════════════════════════════════════════════════

/** Format YYYY-MM-DD to localized Spanish long date. */
function formatDateEs(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Check if two "HH:mm" time ranges overlap. */
function hasTimeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && s2 < e1;
}

// ═══════════════════════════════════════════════════════════
// §4 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 Day Intelligence Section ──────────────────────────

interface DayIntelProps {
  readonly dayEvents: readonly EventBrief[];
  readonly intel: ReturnType<typeof getDayIntelligence>;
  readonly startTime: string;
  readonly onSlotClick: (slot: { start: string; end: string }) => void;
}

function DayIntelSection({ dayEvents, intel, startTime, onSlotClick }: DayIntelProps) {
  if (dayEvents.length === 0) return null;

  return (
    <div className="qap-intel" data-testid="qap-intel">

      {/* Load score */}
      <div className="qap-intel__section" style={{ "--si": 0 } as React.CSSProperties}>
        <div className="qap-intel__row">
          <span className="qap-intel__label">Carga del día</span>
          <span
            className="qap-intel__value"
            style={{ color: intel.load.color }}
          >
            {intel.load.label}
          </span>
        </div>
        <div className="qap-intel__bar">
          <div
            className="qap-intel__fill"
            style={{
              "--fill-w": `${Math.min(100, (dayEvents.length / 10) * 100)}%`,
              background: intel.load.color,
            } as React.CSSProperties}
          />
        </div>
        <p className="qap-intel__note">
          {dayEvents.length} evento{dayEvents.length !== 1 ? "s" : ""} programado{dayEvents.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Capacity summary */}
      {intel.totalCapacity > 0 && (
        <div className="qap-intel__section" style={{ "--si": 1 } as React.CSSProperties}>
          <div className="qap-intel__row">
            <span className="qap-intel__label">Capacidad</span>
            <span className="qap-intel__value qap-intel__value--muted">
              {intel.totalConfirmed}/{intel.totalCapacity}
              <span className="qap-intel__note"> ({Math.round(intel.occupancyPct)}%)</span>
            </span>
          </div>
          <div className="qap-intel__bar qap-intel__bar--thin">
            <div
              className="qap-intel__fill"
              style={{
                "--fill-w": `${Math.min(100, intel.occupancyPct)}%`,
                background: intel.occupancyPct >= 90
                  ? "var(--color-rose-400)"
                  : intel.occupancyPct >= 70
                    ? "var(--color-amber-400)"
                    : "var(--color-emerald-400)",
              } as React.CSSProperties}
            />
          </div>
        </div>
      )}

      {/* Venue distribution */}
      {intel.venueDistribution.length > 1 && (
        <div className="qap-intel__section" style={{ "--si": 2 } as React.CSSProperties}>
          <p className="qap-intel__label">Distribución por sede</p>
          <div className="qap-intel__venues">
            {intel.venueDistribution.map((v) => (
              <div key={v.venue} className="qap-intel__venue">
                <span className="qap-intel__venue-name">{v.venue}</span>
                <div className="qap-intel__venue-bar">
                  <div
                    className="qap-intel__venue-fill"
                    style={{ "--fill-w": `${v.pct}%`, background: v.color } as React.CSSProperties}
                  />
                </div>
                <span className="qap-intel__venue-count">{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicts */}
      {intel.conflictCount > 0 && (
        <div className="qap-intel__conflict" style={{ "--si": 3 } as React.CSSProperties}>
          <AlertTriangle className="qap-intel__conflict-icon" aria-hidden="true" />
          <span>
            {intel.conflictCount} conflicto{intel.conflictCount !== 1 ? "s" : ""} de horario
          </span>
        </div>
      )}

      {/* Chrono-Compass */}
      {intel.availableSlots.length > 0 && (
        <div className="qap-intel__section" style={{ "--si": 4 } as React.CSSProperties}>
          <div className="qap-intel__compass-head">
            <Zap className="qap-intel__compass-icon" aria-hidden="true" />
            <p className="qap-intel__label qap-intel__label--accent">Línea de tiempo</p>
          </div>
          <ChronoCompass
            dayEvents={dayEvents}
            availableSlots={intel.availableSlots}
            onSlotClick={onSlotClick}
            activeSlotStart={startTime}
          />
          <div className="qap-intel__slots">
            {intel.availableSlots.map((slot, i) => (
              <Button
                variant="unstyled"
                key={i}
                type="button"
                onClick={() => onSlotClick(slot)}
                className={cn(
                  "qap-intel__slot",
                  startTime === slot.start && "qap-intel__slot--active",
                )}
                data-testid={`qap-slot-${slot.start}`}
              >
                {slot.start}–{slot.end}
                <span className="qap-intel__slot-dur">
                  ({formatSlotDuration(slot.durationMinutes)})
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── §4.2 Tag Selector ─────────────────────────────────────

interface TagSelectorProps {
  readonly selectedTags: readonly string[];
  readonly onChange: (tags: string[]) => void;
}

function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [showCustomTag, setShowCustomTag] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");

  const toggleTag = useCallback(
    (tag: string) => {
      onChange(
        selectedTags.includes(tag)
          ? selectedTags.filter((t) => t !== tag)
          : [...selectedTags, tag],
      );
    },
    [selectedTags, onChange],
  );

  const addCustomTag = useCallback(() => {
    const tag = customTagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
      setCustomTagInput("");
      setShowCustomTag(false);
    }
  }, [customTagInput, selectedTags, onChange]);

  return (
    <div className="qap-tags" data-testid="qap-tags">
      <label className="qap-form__label">Etiquetas</label>
      <div className="qap-tags__list">
        {TAG_PRESETS.map((tag) => {
          const sel = selectedTags.includes(tag);
          return (
            <Button
              variant="unstyled"
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn("qap-tag", sel && "qap-tag--selected")}
              data-testid={`qap-tag-${tag}`}
            >
              {sel && "\u2713 "}
              {tag}
            </Button>
          );
        })}

        {/* Custom tags already selected */}
        {selectedTags
          .filter((t) => !TAG_PRESETS.includes(t as typeof TAG_PRESETS[number]))
          .map((tag) => (
            <Button
              variant="unstyled"
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="qap-tag qap-tag--selected"
            >
              {"\u2713 "}{tag}
            </Button>
          ))}

        {/* Add custom tag */}
        {!showCustomTag ? (
          <Button
            variant="unstyled"
            type="button"
            onClick={() => setShowCustomTag(true)}
            className="qap-tag qap-tag--add"
          >
            + Personalizada
          </Button>
        ) : (
          <div className="qap-tag-input">
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustomTag(); }
              }}
              placeholder="Nueva etiqueta"
              autoFocus
              className="qap-tag-input__field"
            />
            <Button
              variant="unstyled"
              type="button"
              onClick={addCustomTag}
              className="qap-tag-input__btn qap-tag-input__btn--ok"
              aria-label="Agregar etiqueta"
            >
              {"\u2713"}
            </Button>
            <Button
              variant="unstyled"
              type="button"
              onClick={() => { setShowCustomTag(false); setCustomTagInput(""); }}
              className="qap-tag-input__btn qap-tag-input__btn--cancel"
              aria-label="Cancelar"
            >
              {"\u2715"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * QuickAddPanel — slide-in panel for rapid event creation.
 *
 * Shows day intelligence, chrono-compass, and a compact form
 * with category presets, conflict detection, and tag selection.
 * CSS-only slide animation via data-state attribute.
 */
export function QuickAddPanel({
  date,
  dayEvents,
  isOpen,
  onClose,
  onFullForm,
  onCreateDraft,
}: QuickAddPanelProps) {

  // ── §5.1 Form state ──
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("social");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [presetApplied, setPresetApplied] = useState(false);

  // ── §5.2 Derived ──
  const intel = useMemo(() => getDayIntelligence(dayEvents), [dayEvents]);
  const dateDisplay = useMemo(() => formatDateEs(date), [date]);

  const conflicts = useMemo(() => {
    if (!location || !startTime || !endTime) return [];
    return dayEvents.filter(
      (e) =>
        e.location?.toLowerCase() === location.toLowerCase() &&
        hasTimeOverlap(startTime, endTime, extractTime(e.date_start), extractTime(e.date_end)),
    );
  }, [dayEvents, location, startTime, endTime]);

  const suggestedSlot = useMemo(() => {
    if (conflicts.length === 0) return null;
    return conflicts.reduce((max, e) => {
      const t = extractTime(e.date_end);
      return t > max ? t : max;
    }, "00:00");
  }, [conflicts]);

  // ── §5.3 Escape key ──
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // ── §5.4 Callbacks ──
  const handleCategoryChange = useCallback(
    (newCat: EventCategory) => {
      setCategory(newCat);
      if (!presetApplied) setShowSuggestion(true);
    },
    [presetApplied],
  );

  const handleApplyPreset = useCallback(() => {
    const preset = CATEGORY_PRESETS[category];
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    setLocation(preset.location);
    setCapacity(preset.capacity);
    setSelectedTags([...preset.tags]);
    setShowSuggestion(false);
    setPresetApplied(true);
  }, [category]);

  const handleLocationChange = useCallback((value: string) => {
    setLocation(value);
    const cap = LOCATION_CAPACITY[value];
    if (cap !== undefined) setCapacity(cap);
  }, []);

  const handleSlotClick = useCallback((slot: { start: string; end: string }) => {
    setStartTime(slot.start);
    setEndTime(slot.end);
  }, []);

  const buildData = useCallback(
    (): QuickAddData => ({
      title: title.trim(),
      category,
      date,
      startTime,
      endTime,
      location: location.trim(),
      capacity,
      tags: selectedTags,
    }),
    [title, category, date, startTime, endTime, location, capacity, selectedTags],
  );

  const handleCreate = useCallback(() => {
    if (!title.trim()) {
      showToast({ type: "warning", message: "Ingresá un título para el evento" });
      return;
    }
    onCreateDraft(buildData());
  }, [title, buildData, onCreateDraft]);

  // ── §5.5 Render ──
  return (
    <>
      {/* Backdrop */}
      <div
        className="qap-backdrop"
        data-state={isOpen ? "open" : "closed"}
        data-testid="qap-backdrop"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="qap"
        data-state={isOpen ? "open" : "closed"}
        role="dialog"
        aria-label="Nuevo evento"
        aria-hidden={!isOpen}
        data-testid="qap"
      >
        {/* ── Header ── */}
        <div className="qap__header">
          <div className="qap__header-info">
            <h3 className="qap__header-title">Nuevo Evento</h3>
            <p className="qap__header-date">{dateDisplay}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X size={20} />}
            aria-label="Cerrar"
          />
        </div>

        {/* ── Body ── */}
        <div className="qap__body">

          {/* Day Intelligence */}
          <DayIntelSection
            dayEvents={dayEvents}
            intel={intel}
            startTime={startTime}
            onSlotClick={handleSlotClick}
          />

          {/* Existing events */}
          {dayEvents.length > 0 && (
            <div className="qap-existing" data-testid="qap-existing">
              <p className="qap-existing__title">
                Eventos existentes ({dayEvents.length})
              </p>
              <div className="qap-existing__list">
                {dayEvents.map((ev) => {
                  const cat = EVENT_CATEGORY_CONFIG[ev.category];
                  const time = extractTime(ev.date_start);
                  return (
                    <Button
                      variant="unstyled"
                      key={ev.id}
                      type="button"
                      onClick={() => window.open(`/admin/events/${ev.id}`, "_blank")}
                      className="qap-existing__chip"
                      style={{
                        "--chip-bg": cat.bgColor,
                        "--chip-color": cat.color,
                      } as React.CSSProperties}
                    >
                      <span aria-hidden="true">{cat.icon}</span>
                      <span className="qap-existing__chip-title">{ev.title}</span>
                      <span className="qap-existing__chip-time">{time}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <div className="qap-form" data-testid="qap-form">
            <p className="qap-form__heading">Crear nuevo evento</p>

            {/* Title */}
            <div className="qap-form__field">
              <label className="qap-form__label" htmlFor="qap-title">
                Título del evento *
              </label>
              <input
                id="qap-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Torneo de Tennis de Verano"
                autoFocus
                className={cn(inputClass, "qap-input")}
                data-testid="qap-title"
              />
            </div>

            {/* Category */}
            <div className="qap-form__field">
              <label className="qap-form__label">Categoría</label>
              <div className="qap-cat-grid">
                {(Object.entries(EVENT_CATEGORY_CONFIG) as [EventCategory, typeof EVENT_CATEGORY_CONFIG[EventCategory]][]).map(
                  ([key, config]) => (
                    <Button
                      variant="unstyled"
                      key={key}
                      type="button"
                      onClick={() => handleCategoryChange(key)}
                      className={cn(
                        "qap-cat-btn",
                        category === key && "qap-cat-btn--selected",
                      )}
                      style={{
                        "--cat-color": config.color,
                        "--cat-bg": config.bgColor,
                      } as React.CSSProperties}
                      data-testid={`qap-cat-${key}`}
                    >
                      <span aria-hidden="true">{config.icon}</span>
                      <span className="qap-cat-btn__label">{config.label}</span>
                    </Button>
                  ),
                )}
              </div>
            </div>

            {/* Smart suggestion */}
            {showSuggestion && !presetApplied && (
              <div className="qap-suggestion" data-testid="qap-suggestion">
                <Sparkles className="qap-suggestion__icon" aria-hidden="true" />
                <div className="qap-suggestion__info">
                  <p className="qap-suggestion__title">
                    Sugerencia para &ldquo;{EVENT_CATEGORY_CONFIG[category].label}&rdquo;
                  </p>
                  <p className="qap-suggestion__detail">
                    {CATEGORY_PRESETS[category].location} &middot;{" "}
                    {CATEGORY_PRESETS[category].startTime}&ndash;{CATEGORY_PRESETS[category].endTime} &middot;{" "}
                    {CATEGORY_PRESETS[category].capacity} personas
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApplyPreset}
                  className="qap-suggestion__btn"
                >
                  Aplicar
                </Button>
              </div>
            )}

            {/* Time */}
            <div className="qap-times">
              <div className="qap-form__field">
                <label className="qap-form__label" htmlFor="qap-start">Inicio</label>
                <input
                  id="qap-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={cn(inputClass, "qap-input", "qap-input--mono")}
                  data-testid="qap-start"
                />
              </div>
              <div className="qap-form__field">
                <label className="qap-form__label" htmlFor="qap-end">Fin</label>
                <input
                  id="qap-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={cn(inputClass, "qap-input", "qap-input--mono")}
                  data-testid="qap-end"
                />
              </div>
            </div>

            {/* Location */}
            <div className="qap-form__field">
              <label className="qap-form__label" htmlFor="qap-location">Ubicación</label>
              <select
                id="qap-location"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                className={cn(inputClass, "qap-input", !location && "qap-input--placeholder")}
                data-testid="qap-location"
              >
                <option value="">Seleccionar ubicación...</option>
                {LOCATION_NAMES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc} ({LOCATION_CAPACITY[loc]} pers.)
                  </option>
                ))}
              </select>
            </div>

            {/* Capacity */}
            <div className="qap-form__field">
              <label className="qap-form__label" htmlFor="qap-capacity">Capacidad</label>
              <input
                id="qap-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                className={cn(inputClass, "qap-input", "qap-input--mono")}
                data-testid="qap-capacity"
              />
            </div>

            {/* Conflict warning */}
            {conflicts.length > 0 && (
              <div className="qap-conflict" data-testid="qap-conflict">
                <AlertTriangle className="qap-conflict__icon" aria-hidden="true" />
                <div className="qap-conflict__body">
                  <p className="qap-conflict__title">
                    Conflicto con selección actual
                  </p>
                  {conflicts.map((c) => (
                    <div key={c.id} className="qap-conflict__item">
                      <span className="qap-conflict__item-text">
                        {c.title} &middot; {extractTime(c.date_start)}&ndash;{extractTime(c.date_end)}
                      </span>
                      <Button
                        variant="unstyled"
                        type="button"
                        onClick={() => window.open(`/admin/events/${c.id}`, "_blank")}
                        className="qap-conflict__link"
                      >
                        Ver
                      </Button>
                    </div>
                  ))}
                  {suggestedSlot && (
                    <Button
                      variant="unstyled"
                      type="button"
                      onClick={() => setStartTime(suggestedSlot)}
                      className="qap-conflict__suggest"
                    >
                      <ArrowRight size={12} />
                      Sugerir: {suggestedSlot}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            <TagSelector
              selectedTags={selectedTags}
              onChange={setSelectedTags}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="qap__footer">
          <Button
            variant="primary"
            onClick={handleCreate}
            className="qap__footer-btn"
            icon={<Sparkles size={16} />}
          >
            Crear evento
          </Button>
          <Button
            variant="ghost"
            onClick={() => onFullForm(buildData())}
            className="qap__footer-btn qap__footer-btn--ghost"
            icon={<ArrowRight size={16} />}
            iconPosition="right"
          >
            Detalles avanzados
          </Button>
        </div>
      </div>
    </>
  );
}