// src/features/facilities/components/SmartBooking.tsx
// ═══════════════════════════════════════════════════════════
// SMART BOOKING — AI Co-Designer for Facility Reservations
// Propuesta #7 (AI Booking Co-Designer)
// V2 rewrite of BookingFormModal
//
// Guided flow: Describe → Suggest → Configure → Submit
// Matching: keyword × category + personality + comfort
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";

import {
  Search,
  Sparkles,
  Calendar,
  Clock,
  Users,
  FileText,
  Loader2,
  Check,
  ArrowLeft,
  Waves,
  Dumbbell,
  Trophy,
  Target,
  Flag,
  UtensilsCrossed,
  Wine,
  Crown,
  Flower2,
  Car,
  Smile,
  Baby,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { getComfortColor } from "../types";
import {
  FACILITY_TYPE_CONFIG,
  FACILITY_CATEGORY_COLORS,
} from "../config";

import type {
  Facility,
  FacilityPersonality,
  ComfortScore
} from "../types";

import "./SmartBooking.css";
import { Button } from "@/shared/components/ui/Button";


/* ─────────────────────────────────────────────────────────
   EXPORTED TYPES
   ───────────────────────────────────────────────────────── */

export interface BookingFormData {
  facility_id: string;
  date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  purpose: string;
}

export interface SmartBookingProps {
  facilities: Facility[];
  facilityPersonalities?: Record<string, FacilityPersonality>;
  comfortScores?: Record<string, ComfortScore>;
  onSubmit: (data: BookingFormData) => Promise<void>;
  className?: string;
}


/* ─────────────────────────────────────────────────────────
   INTERNAL TYPES
   ───────────────────────────────────────────────────────── */

interface VenueSuggestion {
  facility: Facility;
  match_score: number;
  personality_fit: number | undefined;
  comfort_prediction: number | undefined;
  price_estimate: number;
  warnings: string[];
  personality: FacilityPersonality | undefined;
  category_label: string;
  category_color: string | undefined;
  optimal_time: { start: string; end: string };
}

type BookingPhase = "describe" | "select" | "configure";

interface FormErrors {
  facility_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  guest_count?: string;
  purpose?: string;
}


/* ─────────────────────────────────────────────────────────
   CONSTANTS — 0 magic numbers
   ───────────────────────────────────────────────────────── */

/** Time slot interval in minutes. */
const SLOT_INTERVAL = 30;

/** Lucide icon name → component. Verified against FACILITY_TYPE_CONFIG values. */
const TYPE_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Waves,
  Dumbbell,
  Trophy,
  Target,
  Flag,
  UtensilsCrossed,
  Wine,
  Crown,
  Flower2,
  Car,
  Smile,
  Sparkles,
  Baby,
};

/** Event keywords → facility category for matching. */
const EVENT_KEYWORDS: Record<string, string[]> = {
  social: [
    "fiesta", "party", "celebración", "cumpleaños", "birthday",
    "boda", "wedding", "cóctel", "cocktail", "gala", "cena",
    "dinner", "social", "banquete", "recepción", "reception",
    "evento", "event", "almuerzo", "lunch",
  ],
  wellness: [
    "spa", "masaje", "massage", "relax", "wellness",
    "yoga", "meditación", "meditation", "tranquilo",
  ],
  sport: [
    "deporte", "sport", "tenis", "tennis", "golf",
    "natación", "swim", "ejercicio", "fitness",
    "torneo", "tournament", "partido", "match",
  ],
  service: [
    "infantil", "kids", "niños", "children", "juegos",
    "playground",
  ],
};

/** Event description patterns → personality dimension weights. */
const PERSONALITY_PATTERNS = {
  formal:
    /corporativo|corporate|empresa|business|gala|formal|reunión|meeting|conferencia/,
  casual:
    /fiesta|party|casual|amigos|familia|family|bbq|parrillada|diversión/,
  intimate:
    /íntimo|intimate|privado|private|romántico|romantic|cena privada/,
  active:
    /deporte|sport|ejercicio|fitness|torneo|competencia|competir/,
} as const;

/** Optimal time-of-day → suggested time range. */
const TIME_SUGGESTIONS: Record<
  string,
  { start: string; end: string }
> = {
  morning:   { start: "08:00", end: "11:00" },
  afternoon: { start: "13:00", end: "16:00" },
  evening:   { start: "18:00", end: "21:00" },
  night:     { start: "20:00", end: "23:00" },
};


/* ─────────────────────────────────────────────────────────
   PURE FUNCTIONS
   ───────────────────────────────────────────────────────── */

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs.toLocaleString("es-CR")}`;
}

function generateTimeSlots(
  openingTime: string,
  closingTime: string,
): string[] {
  const openH = parseInt(openingTime.split(":")[0], 10);
  const closeH = parseInt(closingTime.split(":")[0], 10);
  const slots: string[] = [];
  for (let h = openH; h <= closeH; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      if (h === closeH && m > 0) break;
      slots.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }
  return slots;
}

function computeTypeMatch(desc: string, category?: string): number {
  if (!category) return 40;
  const keywords = EVENT_KEYWORDS[category] ?? [];
  const hits = keywords.filter((kw) => desc.includes(kw)).length;
  if (hits === 0) return 40;
  return Math.min(100, 40 + hits * 20);
}

function computePersonalityMatch(
  desc: string,
  p: FacilityPersonality,
): number {
  let score = 50;

  if (PERSONALITY_PATTERNS.formal.test(desc))
    score += (p.formality - 50) * 0.6;
  if (PERSONALITY_PATTERNS.casual.test(desc))
    score += (p.sociality - 50) * 0.6;
  if (PERSONALITY_PATTERNS.intimate.test(desc))
    score += (p.intimacy - 50) * 0.6;
  if (PERSONALITY_PATTERNS.active.test(desc))
    score += (p.energy - 50) * 0.6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function suggestTime(
  facility: Facility,
  personality?: FacilityPersonality,
): { start: string; end: string } {
  const optimal = personality?.optimal_time_of_day ?? "evening";
  const base = TIME_SUGGESTIONS[optimal] ?? TIME_SUGGESTIONS.evening;

  const openH = parseInt(facility.opening_time.split(":")[0], 10);
  const closeH = parseInt(facility.closing_time.split(":")[0], 10);
  const startH = Math.max(
    openH,
    parseInt(base.start.split(":")[0], 10),
  );
  const endH = Math.min(
    closeH,
    parseInt(base.end.split(":")[0], 10),
  );

  return {
    start: `${String(startH).padStart(2, "0")}:00`,
    end: `${String(Math.max(startH + 2, endH)).padStart(2, "0")}:00`,
  };
}

function computeVenueMatches(
  description: string,
  facilities: Facility[],
  personalities: Record<string, FacilityPersonality>,
  comfortScores: Record<string, ComfortScore>,
): VenueSuggestion[] {
  const desc = description.toLowerCase().trim();
  if (!desc || facilities.length === 0) return [];

  return facilities
    .filter((f) => f.status === "operational")
    .map((f) => {
      const config = FACILITY_TYPE_CONFIG[f.facility_type];
      const personality = personalities[f.id];
      const comfort = comfortScores[f.id];

      const typeScore = computeTypeMatch(desc, config?.category);
      const comfortVal = comfort?.overall;
      const personalityVal = personality
        ? computePersonalityMatch(desc, personality)
        : undefined;

      // Weighted total: type 40%, comfort 35%, personality 25%
      const weights = {
        type: typeScore * 0.4,
        comfort: (comfortVal ?? 50) * 0.35,
        personality: (personalityVal ?? 50) * 0.25,
      };
      const total = Math.round(
        weights.type + weights.comfort + weights.personality,
      );

      const warnings: string[] = [];
      if (comfort?.intervention_needed) {
        warnings.push(`Confort: ${comfort.intervention_urgency}`);
      }

      const categoryColor = config
        ? FACILITY_CATEGORY_COLORS[config.category]?.color
        : undefined;

      return {
        facility: f,
        match_score: Math.min(100, Math.max(0, total)),
        personality_fit: personalityVal,
        comfort_prediction: comfortVal,
        price_estimate: f.base_rate,
        warnings,
        personality,
        category_label: config?.label ?? f.facility_type,
        category_color: categoryColor,
        optimal_time: suggestTime(f, personality),
      };
    })
    .sort((a, b) => b.match_score - a.match_score);
}


/* ─────────────────────────────────────────────────────────
   SUB-COMPONENT: Venue Suggestion Card
   ───────────────────────────────────────────────────────── */

function VenueSuggestionCard({
  suggestion,
  index,
  selected,
  onSelect,
  rm,
}: {
  suggestion: VenueSuggestion;
  index: number;
  selected: boolean;
  onSelect: () => void;
  rm: boolean;
}) {
  const {
    facility,
    match_score,
    personality_fit,
    comfort_prediction,
    price_estimate,
    warnings,
    personality,
    category_label,
    category_color,
  } = suggestion;

  const scoreColor = getComfortColor(match_score);
  const config = FACILITY_TYPE_CONFIG[facility.facility_type];
  const TypeIcon =
    TYPE_ICON_MAP[config?.icon ?? ""] ?? Sparkles;

  const scoreTone =
    match_score >= 80 ? "high" : match_score >= 60 ? "medium" : "low";

  return (
    <div
      className="fac-booking__match"
      data-selected={selected}
      data-score-tone={scoreTone}
      style={
        rm
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      {/* Score badge */}
      <div
        className="fac-booking__match-score"
        style={{ color: scoreColor, borderColor: scoreColor }}
      >
        {match_score}
        <small>%</small>
      </div>

      {/* Info */}
      <div className="fac-booking__match-info">
        <span
          className="fac-booking__match-category"
          style={{ color: category_color }}
        >
          <TypeIcon className="fac-booking__match-category-icon" />
          {category_label}
        </span>
        <span className="fac-booking__match-name">
          {facility.name}
        </span>
        {personality && (
          <span className="fac-booking__match-personality">
            &ldquo;{personality.personality_type}&rdquo;
          </span>
        )}
      </div>

      {/* Bars */}
      <div className="fac-booking__match-bars">
        <div className="fac-booking__match-bar">
          <span className="fac-booking__match-bar-label">
            Personalidad
          </span>
          <div className="fac-booking__match-bar-track">
            <div
              className="fac-booking__match-bar-fill"
              style={{
                width: `${personality_fit ?? 0}%`,
              }}
            />
          </div>
          <span className="fac-booking__match-bar-val">
            {personality_fit ?? "—"}
          </span>
        </div>
        <div className="fac-booking__match-bar">
          <span className="fac-booking__match-bar-label">
            Confort
          </span>
          <div className="fac-booking__match-bar-track">
            <div
              className="fac-booking__match-bar-fill"
              style={{
                width: `${comfort_prediction ?? 0}%`,
              }}
            />
          </div>
          <span className="fac-booking__match-bar-val">
            {comfort_prediction ?? "—"}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="fac-booking__match-meta">
        <span>{formatCRC(price_estimate)}/hr</span>
        <span>Cap. {facility.capacity}</span>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="fac-booking__match-warnings">
          {warnings.map((w, i) => (
            <span key={i}>&#9888; {w}</span>
          ))}
        </div>
      )}

      {/* Select button */}
      <Button
        variant="unstyled"
        type="button"
        className="fac-booking__match-select"
        data-selected={selected}
        onClick={onSelect}
      >
        {selected ? (
          <>
            <Check className="fac-booking__match-select-icon" />
            Seleccionado
          </>
        ) : (
          "Seleccionar venue"
        )}
      </Button>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────── */

export function SmartBooking({
  facilities,
  facilityPersonalities,
  comfortScores,
  onSubmit,
  className,
}: SmartBookingProps) {
  const rm = useReducedMotion();

  /* ── State ────────────────────────────────────────── */
  const [phase, setPhase] = useState<BookingPhase>("describe");
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormData>({
    facility_id: "",
    date: todayISO(),
    start_time: "10:00",
    end_time: "12:00",
    guest_count: 1,
    purpose: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /* ── Derived ──────────────────────────────────────── */
  const selectedSuggestion = suggestions.find(
    (s) => s.facility.id === selectedId,
  );
  const selectedFacility = selectedSuggestion?.facility;

  const timeSlots = useMemo(() => {
    if (!selectedFacility) return [];
    return generateTimeSlots(
      selectedFacility.opening_time,
      selectedFacility.closing_time,
    );
  }, [selectedFacility]);

  /* ── Handlers ─────────────────────────────────────── */
  const updateField = useCallback(
    <K extends keyof BookingFormData>(
      field: K,
      value: BookingFormData[K],
    ) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const handleSearch = useCallback(() => {
    if (!description.trim()) return;
    const results = computeVenueMatches(
      description,
      facilities,
      facilityPersonalities ?? {},
      comfortScores ?? {},
    );
    setSuggestions(results);
    setSelectedId(null);
    setPhase("select");
  }, [description, facilities, facilityPersonalities, comfortScores]);

  const handleSelectVenue = useCallback(
    (suggestion: VenueSuggestion) => {
      setSelectedId(suggestion.facility.id);
      setForm((prev) => ({
        ...prev,
        facility_id: suggestion.facility.id,
        start_time: suggestion.optimal_time.start,
        end_time: suggestion.optimal_time.end,
        guest_count: Math.min(
          prev.guest_count || 1,
          suggestion.facility.capacity,
        ),
        purpose: description,
      }));
      setErrors({});
      setPhase("configure");
    },
    [description],
  );

  const handleBack = useCallback(() => {
    if (phase === "configure") {
      setSelectedId(null);
      setPhase("select");
    } else if (phase === "select") {
      setSuggestions([]);
      setPhase("describe");
    }
  }, [phase]);

  const validate = useCallback((): boolean => {
    const e: FormErrors = {};
    if (!form.facility_id) e.facility_id = "Selecciona un venue";
    if (!form.date) e.date = "Selecciona una fecha";
    if (!form.start_time) e.start_time = "Hora de inicio requerida";
    if (!form.end_time) e.end_time = "Hora de fin requerida";
    if (form.start_time >= form.end_time)
      e.end_time = "Debe ser posterior al inicio";
    if (form.guest_count < 1) e.guest_count = "Mínimo 1 invitado";
    if (
      selectedFacility &&
      form.guest_count > selectedFacility.capacity
    ) {
      e.guest_count = `Máximo ${selectedFacility.capacity}`;
    }
    if (!form.purpose.trim()) e.purpose = "Describe el propósito";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, selectedFacility]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      try {
        await onSubmit(form);
      } finally {
        setSubmitting(false);
      }
    },
    [form, validate, onSubmit],
  );

  /* ── Empty guard ──────────────────────────────────── */
  if (!facilities || facilities.length === 0) {
    return (
      <EmptyState
        title="Sin instalaciones disponibles"
        description="No hay instalaciones operativas para crear una reserva."
        className={cn("fac-booking", className)}
      />
    );
  }

  /* ── Render ───────────────────────────────────────── */
  return (
    <div
      className={cn("fac-booking", className)}
      data-phase={phase}
      data-prefers-reduced={rm}
    >
      {/* ─── Header ────────────────────────────────── */}
      <header className="fac-booking__header">
        <Sparkles className="fac-booking__header-icon" />
        <div className="fac-booking__header-text">
          <h3 className="fac-booking__title">
            Co-Diseñador de Reservas
          </h3>
          <p className="fac-booking__subtitle">
            Describe tu evento y el sistema sugiere el espacio
            ideal
          </p>
        </div>
      </header>

      {/* ─── Phase 1: Describe ─────────────────────── */}
      <section className="fac-booking__describe">
        <label
          className="fac-booking__describe-label"
          htmlFor="event-desc"
        >
          ¿Qué evento tenés en mente?
        </label>
        <textarea
          id="event-desc"
          className="fac-booking__describe-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Cena corporativa para 50 personas, ambiente elegante..."
          rows={3}
        />
        <Button
          variant="unstyled"
          type="button"
          className="fac-booking__search-btn"
          onClick={handleSearch}
          disabled={!description.trim()}
        >
          <Search className="fac-booking__search-icon" />
          Buscar venues ideales
        </Button>
      </section>

      {/* ─── Phase 2: Suggestions ──────────────────── */}
      {phase === "select" && (
        <section
          className="fac-booking__suggestions"
          aria-label="Venues sugeridos"
        >
          {suggestions.length > 0 ? (
            <>
              <h4 className="fac-booking__suggestions-title">
                Venues sugeridos ({suggestions.length})
              </h4>
              <div className="fac-booking__suggestions-grid">
                {suggestions.map((s, i) => (
                  <VenueSuggestionCard
                    key={s.facility.id}
                    suggestion={s}
                    index={i}
                    selected={selectedId === s.facility.id}
                    onSelect={() => handleSelectVenue(s)}
                    rm={rm}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="fac-booking__no-matches">
              <p>
                No se encontraron venues que coincidan con tu
                descripción.
              </p>
              <Button
                variant="unstyled"
                type="button"
                className="fac-booking__retry-btn"
                onClick={() => setPhase("describe")}
              >
                Intentar con otra descripción
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ─── Selected venue summary (configure) ────── */}
      {phase === "configure" && selectedSuggestion && (
        <div className="fac-booking__selected">
          <div className="fac-booking__selected-info">
            <span className="fac-booking__selected-name">
              {selectedSuggestion.facility.name}
            </span>
            <span
              className="fac-booking__selected-score"
              style={{
                color: getComfortColor(
                  selectedSuggestion.match_score,
                ),
              }}
            >
              {selectedSuggestion.match_score}% match
            </span>
          </div>
          <Button
            variant="unstyled"
            type="button"
            className="fac-booking__change-btn"
            onClick={() => {
              setSelectedId(null);
              setPhase("select");
            }}
          >
            Cambiar venue
          </Button>
        </div>
      )}

      {/* ─── Phase 3: Configure form ───────────────── */}
      {phase === "configure" && selectedFacility && (
        <form
          onSubmit={handleSubmit}
          className="fac-booking__form"
        >
          {/* Date */}
          <div className="fac-booking__field">
            <label
              className="fac-booking__field-label"
              htmlFor="booking-date"
            >
              <Calendar className="fac-booking__field-icon" />
              Fecha
            </label>
            <input
              id="booking-date"
              type="date"
              className="fac-booking__input"
              value={form.date}
              min={todayISO()}
              onChange={(e) => updateField("date", e.target.value)}
            />
            {errors.date && (
              <p className="fac-booking__field-error">
                {errors.date}
              </p>
            )}
          </div>

          {/* Time range */}
          <div className="fac-booking__time-row">
            <div className="fac-booking__field">
              <label
                className="fac-booking__field-label"
                htmlFor="booking-start"
              >
                <Clock className="fac-booking__field-icon" />
                Inicio
              </label>
              <select
                id="booking-start"
                className="fac-booking__select"
                value={form.start_time}
                onChange={(e) =>
                  updateField("start_time", e.target.value)
                }
              >
                {timeSlots.map((t) => (
                  <option key={`s-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.start_time && (
                <p className="fac-booking__field-error">
                  {errors.start_time}
                </p>
              )}
            </div>
            <div className="fac-booking__field">
              <label
                className="fac-booking__field-label"
                htmlFor="booking-end"
              >
                <Clock className="fac-booking__field-icon" />
                Fin
              </label>
              <select
                id="booking-end"
                className="fac-booking__select"
                value={form.end_time}
                onChange={(e) =>
                  updateField("end_time", e.target.value)
                }
              >
                {timeSlots.map((t) => (
                  <option key={`e-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.end_time && (
                <p className="fac-booking__field-error">
                  {errors.end_time}
                </p>
              )}
            </div>
          </div>

          {/* Guest count */}
          <div className="fac-booking__field">
            <label
              className="fac-booking__field-label"
              htmlFor="booking-guests"
            >
              <Users className="fac-booking__field-icon" />
              Invitados
            </label>
            <div className="fac-booking__slider-row">
              <input
                id="booking-guests"
                type="range"
                className="fac-booking__slider"
                min={1}
                max={selectedFacility.capacity}
                value={form.guest_count}
                onChange={(e) =>
                  updateField(
                    "guest_count",
                    parseInt(e.target.value, 10),
                  )
                }
              />
              <span className="fac-booking__slider-value">
                {form.guest_count}
              </span>
            </div>
            <p className="fac-booking__field-hint">
              Capacidad máxima: {selectedFacility.capacity}{" "}
              personas
            </p>
            {errors.guest_count && (
              <p className="fac-booking__field-error">
                {errors.guest_count}
              </p>
            )}
          </div>

          {/* Purpose */}
          <div className="fac-booking__field">
            <label
              className="fac-booking__field-label"
              htmlFor="booking-purpose"
            >
              <FileText className="fac-booking__field-icon" />
              Propósito
            </label>
            <textarea
              id="booking-purpose"
              className="fac-booking__input fac-booking__input--textarea"
              value={form.purpose}
              onChange={(e) =>
                updateField("purpose", e.target.value)
              }
              placeholder="Describe el propósito de la reserva..."
              rows={2}
            />
            {errors.purpose && (
              <p className="fac-booking__field-error">
                {errors.purpose}
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="fac-booking__preview">
            <span className="fac-booking__preview-label">
              Vista previa
            </span>
            <p className="fac-booking__preview-text">
              {selectedFacility.name} · {form.date} ·{" "}
              {form.start_time}–{form.end_time} ·{" "}
              {form.guest_count} persona(s)
              {form.purpose ? ` · ${form.purpose}` : ""}
            </p>
            {selectedFacility.base_rate > 0 && (
              <p className="fac-booking__preview-price">
                Estimado:{" "}
                {formatCRC(
                  selectedFacility.base_rate *
                    Math.max(
                      1,
                      parseInt(form.end_time) -
                        parseInt(form.start_time),
                    ),
                )}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="fac-booking__actions">
            <Button
              variant="unstyled"
              type="button"
              className="fac-booking__btn-back"
              onClick={handleBack}
            >
              <ArrowLeft className="fac-booking__btn-icon" />
              Volver
            </Button>
            <Button
              variant="unstyled"
              type="submit"
              className="fac-booking__btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="fac-booking__btn-icon fac-booking__btn-icon--spin" />
              ) : (
                <Check className="fac-booking__btn-icon" />
              )}
              {submitting ? "Creando..." : "Crear Reserva"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}