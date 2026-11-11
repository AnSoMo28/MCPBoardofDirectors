// ═══════════════════════════════════════════════════════════
// src/features/sports/components/CoachingFormModal.tsx
// §B4.10 — Coaching Form Modal V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Smart form for coaching session scheduling. Coach picker
// cards, skill level pills, focus area tags. AUTO approval.
// Living Protocol: 4/7 (forms)
//
// VERIFIED TYPES:
//   SPORT_CONFIG → { label, icon, color, ... }
//   SKILL_LEVEL_CONFIG → { label, color, icon }
//   SportType → enum
//   SkillLevel → enum
//
// CHANGES FROM V1:
//   ✗ cn() ×12 → BEM
//   ✗ Tailwind ×60 → BEM CSS
//   ✗ style={{ color/backgroundColor }} → data-attributes
//   ✗ COACHES mock → coaches prop
//   ✗ Button ×3 → BEM buttons
//   ✗ Loader2 → BEM spinner
//   ✗ useReducedMotion → window.matchMedia
//   ✗ animate-in fade-in-0 zoom-in-95 → BEM keyframes
//   ✗ Mixed import (SportType value+type) → separated
//   ✓ data-selected, data-skill-level, data-has-error, data-mode
//   ✓ Light mode, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component CoachingFormModal
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { X, CalendarDays, Clock, MapPin, Target, Users } from "lucide-react";
import type { SportType, SportsDashboardMode } from "../types";
import { SPORT_CONFIG, SKILL_LEVEL_CONFIG } from "../types";
import "./CoachingFormModal.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface CoachOption {
  name: string;
  sports: string[];
  specialties: string[];
}

export interface CoachingFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  coaches: CoachOption[];
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function futureDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 FormField ───────────────────────────────────────

function FormField({
  label,
  error,
  children,
  icon,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="spt-coach-f__field">
      <label className="spt-coach-f__label">
        {icon}
        {label}
      </label>
      {children}
      {error && <p className="spt-coach-f__error">{error}</p>}
    </div>
  );
}

// ── §3.2 TextInput ───────────────────────────────────────

function TextInput({
  value,
  onChange,
  placeholder,
  hasError,
  inputRef,
  type = "text",
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="spt-coach-f__input"
      data-has-error={hasError ? "true" : undefined}
    />
  );
}

// ── §3.3 SelectInput ─────────────────────────────────────

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      className="spt-coach-f__select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

// ── §3.4 CoachPicker ─────────────────────────────────────

function CoachPicker({
  coaches,
  selectedCoach,
  onSelect,
}: {
  coaches: CoachOption[];
  selectedCoach: string;
  onSelect: (coach: CoachOption) => void;
}) {
  return (
    <div className="spt-coach-f__coach-grid">
      {coaches.map((coach) => {
        const isSelected = selectedCoach === coach.name;
        const primarySport = coach.sports[0] as SportType;
        return (
          <Button
            variant="unstyled"
            key={coach.name}
            type="button"
            className="spt-coach-f__coach-card"
            data-selected={isSelected ? "true" : undefined}
            data-sport={primarySport}
            onClick={() => onSelect(coach)}
          >
            <div
              className="spt-coach-f__coach-avatar"
              data-sport={primarySport}
            >
              {getInitials(coach.name)}
            </div>
            <div className="spt-coach-f__coach-info">
              <p className="spt-coach-f__coach-name">{coach.name}</p>
              <p className="spt-coach-f__coach-sports">
                {coach.sports
                  .map((s) => SPORT_CONFIG[s as SportType]?.icon)
                  .join(" ")}
              </p>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

// ── §3.5 SkillLevelPills ─────────────────────────────────

function SkillLevelPills({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (level: string) => void;
}) {
  return (
    <div className="spt-coach-f__skill-pills">
      {Object.entries(SKILL_LEVEL_CONFIG).map(([key, cfg]) => (
        <Button
          variant="unstyled"
          key={key}
          type="button"
          className="spt-coach-f__skill-pill"
          data-skill-level={key}
          data-selected={selected === key ? "true" : undefined}
          onClick={() => onSelect(key)}
        >
          {cfg.icon} {cfg.label}
        </Button>
      ))}
    </div>
  );
}

// ── §3.6 FocusTags ───────────────────────────────────────

function FocusTags({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="spt-coach-f__tags">
      {tags.map((tag) => (
        <span key={tag} className="spt-coach-f__tag">
          <Target className="spt-coach-f__tag-icon" />
          {tag}
          <Button
            variant="unstyled"
            type="button"
            className="spt-coach-f__tag-remove"
            onClick={() => onRemove(tag)}
            aria-label={`Quitar ${tag}`}
          >
            ×
          </Button>
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function CoachingFormModal({
  onClose,
  onSuccess,
  coaches,
  ambientMode = "calm",
}: CoachingFormModalProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const memberNameRef = useRef<HTMLInputElement>(null);

  const [selectedCoach, setSelectedCoach] = useState("");
  const [sport, setSport] = useState<SportType>("tennis" as SportType);
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [date, setDate] = useState(futureDateISO(3));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [focusInput, setFocusInput] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Auto-focus ──
  useEffect(() => {
    const timer = setTimeout(() => memberNameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Escape to close ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ── Selected coach data ──
  const selectedCoachData = coaches.find((c) => c.name === selectedCoach);

  // ── Derived available sports from coaches ──
  const availableSports = Array.from(
    new Set(coaches.flatMap((c) => c.sports)),
  ) as SportType[];

  // ── Handlers ──
  const handleCoachSelect = useCallback(
    (coach: CoachOption) => {
      setSelectedCoach(coach.name);
      if (coach.sports.length === 1) {
        setSport(coach.sports[0] as SportType);
      }
      if (!location && coach.sports.includes("tennis")) {
        setLocation("Cancha Tennis 1");
      }
    },
    [location],
  );

  const addFocusArea = useCallback(() => {
    const trimmed = focusInput.trim();
    if (trimmed && !focusAreas.includes(trimmed)) {
      setFocusAreas((prev) => [...prev, trimmed]);
      setFocusInput("");
    }
  }, [focusInput, focusAreas]);

  const removeFocusArea = useCallback((tag: string) => {
    setFocusAreas((prev) => prev.filter((a) => a !== tag));
  }, []);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!selectedCoach) e.coach = "Seleccioná un coach";
    if (!memberName.trim()) e.memberName = "Ingresá el nombre del socio";
    if (!memberId.trim()) e.memberId = "Ingresá el ID del socio";
    if (!date) e.date = "Seleccioná una fecha";
    if (!startTime) e.startTime = "Seleccioná hora de inicio";
    if (!endTime) e.endTime = "Seleccioná hora de fin";
    if (!location.trim()) e.location = "Ingresá la ubicación";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [selectedCoach, memberName, memberId, date, startTime, endTime, location]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setIsSubmitting(true);
      await new Promise((r) => setTimeout(r, 600));
      setIsSubmitting(false);
      onSuccess();
    },
    [validate, onSuccess],
  );

  // ── Render ──
  return (
    <div
      className="spt-coach-f__overlay"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="dialog"
      aria-modal="true"
      aria-label="Programar sesión de coaching"
    >
      {/* Backdrop */}
      <div
        className="spt-coach-f__backdrop"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="spt-coach-f__modal" data-submitting={isSubmitting ? "true" : undefined}>
        {/* Header */}
        <div className="spt-coach-f__header">
          <div>
            <h2 className="spt-coach-f__title">🎾 Programar Sesión de Coaching</h2>
            <p className="spt-coach-f__subtitle">Ejecución directa (AUTO)</p>
          </div>
          <Button
            variant="unstyled"
            type="button"
            className="spt-coach-f__close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="spt-coach-f__close-icon" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="spt-coach-f__body">
          {/* Coach Picker */}
          <FormField
            label="Seleccionar Coach *"
            error={errors.coach}
            icon={<Users className="spt-coach-f__label-icon" />}
          >
            <CoachPicker
              coaches={coaches}
              selectedCoach={selectedCoach}
              onSelect={handleCoachSelect}
            />

            {/* Selected coach specialties */}
            {selectedCoachData && (
              <div className="spt-coach-f__specialties">
                <span className="spt-coach-f__specialties-label">
                  Especialidades:
                </span>
                {selectedCoachData.specialties.map((s) => (
                  <span key={s} className="spt-coach-f__specialty-tag">
                    <Target className="spt-coach-f__specialty-icon" />
                    {s}
                  </span>
                ))}
              </div>
            )}
          </FormField>

          {/* Sport + Skill Level */}
          <div className="spt-coach-f__row-2">
            <FormField label="Deporte">
              <SelectInput value={sport} onChange={(v) => setSport(v as SportType)}>
                {availableSports.map((s) => {
                  const cfg = SPORT_CONFIG[s];
                  return (
                    <option key={s} value={s}>
                      {cfg.icon} {cfg.label}
                    </option>
                  );
                })}
              </SelectInput>
            </FormField>

            <FormField label="Nivel del socio">
              <SkillLevelPills
                selected={skillLevel}
                onSelect={setSkillLevel}
              />
            </FormField>
          </div>

          {/* Member info */}
          <div className="spt-coach-f__row-2">
            <FormField label="Nombre del socio *" error={errors.memberName}>
              <TextInput
                value={memberName}
                onChange={setMemberName}
                placeholder="María Rodríguez"
                hasError={!!errors.memberName}
                inputRef={memberNameRef}
              />
            </FormField>

            <FormField label="ID del socio *" error={errors.memberId}>
              <TextInput
                value={memberId}
                onChange={setMemberId}
                placeholder="mbr-001"
                hasError={!!errors.memberId}
              />
            </FormField>
          </div>

          {/* Schedule */}
          <div className="spt-coach-f__row-3">
            <FormField
              label="Fecha *"
              error={errors.date}
              icon={<CalendarDays className="spt-coach-f__label-icon" />}
            >
              <TextInput
                value={date}
                onChange={setDate}
                type="date"
                min={todayISO()}
                max={futureDateISO(30)}
                hasError={!!errors.date}
              />
            </FormField>

            <FormField
              label="Inicio"
              icon={<Clock className="spt-coach-f__label-icon" />}
            >
              <TextInput
                value={startTime}
                onChange={setStartTime}
                type="time"
              />
            </FormField>

            <FormField
              label="Fin"
              icon={<Clock className="spt-coach-f__label-icon" />}
            >
              <TextInput
                value={endTime}
                onChange={setEndTime}
                type="time"
              />
            </FormField>
          </div>

          {/* Location */}
          <FormField
            label="Ubicación *"
            error={errors.location}
            icon={<MapPin className="spt-coach-f__label-icon" />}
          >
            <TextInput
              value={location}
              onChange={setLocation}
              placeholder="Cancha Tennis 1"
              hasError={!!errors.location}
            />
          </FormField>

          {/* Focus areas */}
          <FormField
            label="Áreas de enfoque"
            icon={<Target className="spt-coach-f__label-icon" />}
          >
            <div className="spt-coach-f__focus-row">
              <input
                type="text"
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                placeholder="Ej: saque, volea, juego de pies"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFocusArea();
                  }
                }}
                className="spt-coach-f__input spt-coach-f__input--compact"
              />
              <Button
                variant="unstyled"
                type="button"
                className="spt-coach-f__add-btn"
                onClick={addFocusArea}
              >
                +
              </Button>
            </div>
            <FocusTags tags={focusAreas} onRemove={removeFocusArea} />
          </FormField>

          {/* Actions */}
          <div className="spt-coach-f__actions">
            <Button
              variant="unstyled"
              type="button"
              className="spt-coach-f__cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="unstyled"
              type="submit"
              className="spt-coach-f__submit-btn"
              disabled={isSubmitting}
              data-submitting={isSubmitting ? "true" : undefined}
            >
              {isSubmitting ? (
                <>
                  <span className="spt-coach-f__spinner" />
                  Programando...
                </>
              ) : (
                "Programar Sesión"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}