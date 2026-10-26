

// ═══════════════════════════════════════════════════════════
// src/features/sports/components/ClassFormModal.tsx
// §B4.8 — Class Form Modal V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Smart form for fitness class creation. Schedule builder,
// equipment tags, capacity slider. AUTO approval flow.
// Living Protocol: 4/7 (forms)
//
// VERIFIED TYPES:
//   SPORT_CONFIG → { label, icon, color, ... }
//   CLASS_TYPE_CONFIG → { label, icon }
//   SKILL_LEVEL_CONFIG → { label, color, icon }
//   SportType → enum
//   ClassType → enum
//   SkillLevel → enum
//
// CHANGES FROM V1:
//   ✗ cn() ×12 → BEM
//   ✗ Tailwind ×60 → BEM CSS
//   ✗ Button ×3 → BEM buttons
//   ✗ Loader2 → BEM spinner
//   ✗ useReducedMotion → window.matchMedia
//   ✗ animate-in fade-in-0 zoom-in-95 → BEM keyframes
//   ✗ animate-spin → BEM spin
//   ✗ Mixed import (SportType value+type) → separated
//   ✓ data-mode, data-has-error, data-submitting
//   ✓ Light mode, responsive
//   ✓ No print (modal)
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component ClassFormModal
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Clock, Users, MapPin } from "lucide-react";
import type { SportType } from "../types";
import { SPORT_CONFIG, CLASS_TYPE_CONFIG, SKILL_LEVEL_CONFIG } from "../types";
import type { SportsDashboardMode } from "../types";
import "./ClassFormModal.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface ClassFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const AVAILABLE_SPORTS: SportType[] = [
  "tennis", "fitness", "yoga", "pilates", "swimming",
  "golf", "padel", "basketball",
] as SportType[];

const DAY_OPTIONS = [
  "Lunes", "Martes", "Miércoles", "Jueves",
  "Viernes", "Sábado", "Domingo",
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "13:00", "14:00", "15:00", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
];

const DURATION_OPTIONS = [30, 45, 50, 60, 75, 90, 120];

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
    <div className="spt-cls-form__field">
      <label className="spt-cls-form__label">
        {icon}
        {label}
      </label>
      {children}
      {error && <p className="spt-cls-form__error">{error}</p>}
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hasError?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="spt-cls-form__input"
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
      className="spt-cls-form__select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

// ── §3.4 EquipmentTags ───────────────────────────────────

function EquipmentTags({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="spt-cls-form__tags">
      {tags.map((tag) => (
        <span key={tag} className="spt-cls-form__tag">
          {tag}
          <button
            type="button"
            className="spt-cls-form__tag-remove"
            onClick={() => onRemove(tag)}
            aria-label={`Quitar ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function ClassFormModal({
  onClose,
  onSuccess,
  ambientMode = "calm",
}: ClassFormModalProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [sport, setSport] = useState<SportType>("fitness" as SportType);
  const [classType, setClassType] = useState("group");
  const [instructor, setInstructor] = useState("");
  const [skillLevel, setSkillLevel] = useState("all_levels");
  const [scheduleDay, setScheduleDay] = useState("Lunes");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [duration, setDuration] = useState(60);
  const [maxCapacity, setMaxCapacity] = useState(20);
  const [location, setLocation] = useState("");
  const [equipmentInput, setEquipmentInput] = useState("");
  const [equipmentTags, setEquipmentTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Auto-focus ──
  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 100);
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

  // ── Handlers ──
  const addEquipment = useCallback(() => {
    const items = equipmentInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !equipmentTags.includes(s));
    if (items.length > 0) {
      setEquipmentTags((prev) => [...prev, ...items]);
      setEquipmentInput("");
    }
  }, [equipmentInput, equipmentTags]);

  const removeEquipment = useCallback((tag: string) => {
    setEquipmentTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Ingresá el nombre de la clase";
    if (!instructor.trim()) e.instructor = "Ingresá el nombre del instructor";
    if (!location.trim()) e.location = "Ingresá la ubicación";
    if (maxCapacity < 1) e.capacity = "Capacidad mínima: 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, instructor, location, maxCapacity]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setIsSubmitting(true);
      // Simulate API call
      await new Promise((r) => setTimeout(r, 600));
      setIsSubmitting(false);
      onSuccess();
    },
    [validate, onSuccess],
  );

  // ── Render ──
  return (
    <div
      className="spt-cls-form__overlay"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="dialog"
      aria-modal="true"
      aria-label="Crear clase de fitness"
    >
      {/* Backdrop */}
      <div
        className="spt-cls-form__backdrop"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="spt-cls-form__modal" data-submitting={isSubmitting ? "true" : undefined}>
        {/* Header */}
        <div className="spt-cls-form__header">
          <div>
            <h2 className="spt-cls-form__title">🧘 Crear Clase de Fitness</h2>
            <p className="spt-cls-form__subtitle">Ejecución directa (AUTO)</p>
          </div>
          <button
            type="button"
            className="spt-cls-form__close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="spt-cls-form__close-icon" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="spt-cls-form__body">
          {/* Name */}
          <FormField label="Nombre de la clase *" error={errors.name}>
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Yoga Matutino"
              hasError={!!errors.name}
              inputRef={nameRef}
            />
          </FormField>

          {/* Sport + Type + Skill */}
          <div className="spt-cls-form__row-3">
            <FormField label="Deporte">
              <SelectInput value={sport} onChange={(v) => setSport(v as SportType)}>
                {AVAILABLE_SPORTS.map((s) => {
                  const cfg = SPORT_CONFIG[s];
                  return (
                    <option key={s} value={s}>
                      {cfg.icon} {cfg.label}
                    </option>
                  );
                })}
              </SelectInput>
            </FormField>

            <FormField label="Tipo">
              <SelectInput value={classType} onChange={setClassType}>
                {Object.entries(CLASS_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Nivel">
              <SelectInput value={skillLevel} onChange={setSkillLevel}>
                {Object.entries(SKILL_LEVEL_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.icon} {cfg.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          {/* Instructor */}
          <FormField label="Instructor *" error={errors.instructor}>
            <TextInput
              value={instructor}
              onChange={setInstructor}
              placeholder="Ana Vargas"
              hasError={!!errors.instructor}
            />
          </FormField>

          {/* Schedule: Day + Time + Duration */}
          <div className="spt-cls-form__row-3">
            <FormField label="Día">
              <SelectInput value={scheduleDay} onChange={setScheduleDay}>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Hora" icon={<Clock className="spt-cls-form__label-icon" />}>
              <SelectInput value={scheduleTime} onChange={setScheduleTime}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Duración">
              <SelectInput value={duration} onChange={(v) => setDuration(parseInt(v))}>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          {/* Capacity + Location */}
          <div className="spt-cls-form__row-2">
            <FormField
              label="Capacidad máx. *"
              error={errors.capacity}
              icon={<Users className="spt-cls-form__label-icon" />}
            >
              <div className="spt-cls-form__range-row">
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                  className="spt-cls-form__range"
                />
                <span className="spt-cls-form__range-value">
                  {maxCapacity}
                </span>
              </div>
            </FormField>

            <FormField
              label="Ubicación *"
              error={errors.location}
              icon={<MapPin className="spt-cls-form__label-icon" />}
            >
              <TextInput
                value={location}
                onChange={setLocation}
                placeholder="Salón Wellness"
                hasError={!!errors.location}
              />
            </FormField>
          </div>

          {/* Equipment */}
          <FormField label="Equipamiento necesario">
            <div className="spt-cls-form__equip-row">
              <input
                type="text"
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                placeholder="Separar con comas: mat, bloques, pesas"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEquipment();
                  }
                }}
                className="spt-cls-form__input spt-cls-form__input--compact"
              />
              <button
                type="button"
                className="spt-cls-form__add-btn"
                onClick={addEquipment}
              >
                +
              </button>
            </div>
            <EquipmentTags tags={equipmentTags} onRemove={removeEquipment} />
          </FormField>

          {/* Actions */}
          <div className="spt-cls-form__actions">
            <button
              type="button"
              className="spt-cls-form__cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="spt-cls-form__submit-btn"
              disabled={isSubmitting}
              data-submitting={isSubmitting ? "true" : undefined}
            >
              {isSubmitting ? (
                <>
                  <span className="spt-cls-form__spinner" />
                  Creando...
                </>
              ) : (
                "Crear Clase"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}