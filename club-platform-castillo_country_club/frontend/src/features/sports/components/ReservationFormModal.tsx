// ═══════════════════════════════════════════════════════════
// src/features/sports/components/ReservationFormModal.tsx
// §B4.15 — Reservation Form Modal V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// AUTO approval form for court reservations. Visual court
// picker grid, time range with validation, purpose pills,
// summary preview. Teal submit (AUTO, not HITL).
// Living Protocol: 4/7 (forms)
//
// VERIFIED TYPES:
//   CourtUtilization_Contract → { court_name, sport,
//     total_slots, booked_slots, utilization_pct,
//     peak_hours, avg_daily_bookings, trend }
//   SPORT_CONFIG → { label, icon, color, ... }
//   SportType → enum
//
// CHANGES FROM V1:
//   ✗ cn() ×8 → BEM
//   ✗ Tailwind ×70 → BEM CSS
//   ✗ Button ×2 → BEM buttons
//   ✗ Loader2 → BEM spinner
//   ✗ useReducedMotion → window.matchMedia
//   ✗ animate-in fade-in-0 zoom-in-95 → BEM keyframes
//   ✗ shadow-[var(--shadow-teal)] → data-selected
//   ✗ Mixed import (SportType value+type) → separated
//   ✓ data-mode, data-has-error, data-selected, data-purpose,
//     data-submitting, data-high-demand
//   ✓ Light mode, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component ReservationFormModal
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { X, MapPin, Clock, Calendar } from "lucide-react";
import type { SportType, SportsDashboardMode } from "../types";
import { SPORT_CONFIG } from "../types";
import type { CourtUtilization_Contract } from "@/shared/mocks/contracts";
import "./ReservationFormModal.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface ReservationFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedCourt?: string;
  courtUtilization?: CourtUtilization_Contract[];
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00",
];

const PURPOSE_OPTIONS = [
  { value: "regular", label: "Reserva regular" },
  { value: "practice", label: "Práctica libre" },
  { value: "match", label: "Partido amistoso" },
  { value: "coaching", label: "Sesión de coaching" },
  { value: "family", label: "Actividad familiar" },
];

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function futureDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 FormField ───────────────────────────────────────

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
    <div className="spt-rsv__field">
      <label className="spt-rsv__label">
        {icon}
        {label}
      </label>
      {children}
      {error && <p className="spt-rsv__error">{error}</p>}
    </div>
  );
}

// ── §4.2 CourtPicker ─────────────────────────────────────

function CourtPicker({
  courts,
  selectedCourt,
  onSelect,
}: {
  courts: CourtUtilization_Contract[];
  selectedCourt: string;
  onSelect: (courtName: string) => void;
}) {
  return (
    <div className="spt-rsv__field">
      <label className="spt-rsv__label spt-rsv__label--section">
        <MapPin className="spt-rsv__label-icon" />
        Seleccionar Cancha
      </label>
      <div className="spt-rsv__court-grid">
        {courts.map((court) => {
          const sportCfg = SPORT_CONFIG[court.sport as SportType];
          const isSelected = selectedCourt === court.court_name;
          const isHighDemand = court.utilization_pct >= 70;

          return (
            <Button
              variant="unstyled"
              key={court.court_name}
              type="button"
              className="spt-rsv__court-card"
              data-selected={isSelected ? "true" : undefined}
              data-high-demand={isHighDemand ? "true" : undefined}
              onClick={() => onSelect(court.court_name)}
            >
              <span className="spt-rsv__court-icon">
                {sportCfg?.icon ?? "🏟️"}
              </span>
              <span className="spt-rsv__court-name">
                {court.court_name}
              </span>
              <span className="spt-rsv__court-util">
                {court.utilization_pct.toFixed(0)}% uso
              </span>
              {isHighDemand && (
                <span className="spt-rsv__court-demand">
                  Alta demanda
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ── §4.3 TimeRangePicker ─────────────────────────────────

function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startTimeError,
  endTimeError,
}: {
  startTime: string;
  endTime: string;
  onStartTimeChange: (t: string) => void;
  onEndTimeChange: (t: string) => void;
  startTimeError?: string;
  endTimeError?: string;
}) {
  const validEndSlots = useMemo(() => {
    if (!startTime) return TIME_SLOTS;
    const startMin = timeToMinutes(startTime);
    return TIME_SLOTS.filter((t) => timeToMinutes(t) > startMin);
  }, [startTime]);

  return (
    <div className="spt-rsv__row-2">
      <FormField
        label="Hora inicio"
        error={startTimeError}
        icon={<Clock className="spt-rsv__label-icon" />}
      >
        <select
          className="spt-rsv__select"
          value={startTime}
          onChange={(e) => {
            onStartTimeChange(e.target.value);
            if (
              endTime &&
              timeToMinutes(endTime) <= timeToMinutes(e.target.value)
            ) {
              const nextSlot = TIME_SLOTS.find(
                (t) => timeToMinutes(t) > timeToMinutes(e.target.value),
              );
              onEndTimeChange(nextSlot ?? "");
            }
          }}
        >
          <option value="">Seleccionar...</option>
          {TIME_SLOTS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Hora fin"
        error={endTimeError}
        icon={<Clock className="spt-rsv__label-icon" />}
      >
        <select
          className="spt-rsv__select"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
        >
          <option value="">Seleccionar...</option>
          {validEndSlots.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </FormField>
    </div>
  );
}

// ── §4.4 PurposePills ────────────────────────────────────

function PurposePills({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="spt-rsv__purpose-pills">
      {PURPOSE_OPTIONS.map((opt) => (
        <Button
          variant="unstyled"
          key={opt.value}
          type="button"
          className="spt-rsv__purpose-pill"
          data-purpose={opt.value}
          data-selected={selected === opt.value ? "true" : undefined}
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

// ── §4.5 SummaryPreview ──────────────────────────────────

function SummaryPreview({
  court,
  date,
  startTime,
  endTime,
  purpose,
}: {
  court: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}) {
  const purposeLabel =
    PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label ?? purpose;

  return (
    <div className="spt-rsv__summary">
      <p className="spt-rsv__summary-title">Resumen de la reserva</p>
      <div className="spt-rsv__summary-items">
        <span className="spt-rsv__summary-item">
          <MapPin className="spt-rsv__summary-icon" />
          {court}
        </span>
        <span className="spt-rsv__summary-item">
          <Calendar className="spt-rsv__summary-icon" />
          {date}
        </span>
        <span className="spt-rsv__summary-item">
          <Clock className="spt-rsv__summary-icon" />
          {startTime}–{endTime}
        </span>
        <span className="spt-rsv__summary-purpose">{purposeLabel}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function ReservationFormModal({
  onClose,
  onSuccess,
  preselectedCourt,
  courtUtilization = [],
  ambientMode = "calm",
}: ReservationFormModalProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const nameRef = useRef<HTMLInputElement>(null);

  const [selectedCourt, setSelectedCourt] = useState(
    preselectedCourt ?? "",
  );
  const [memberName, setMemberName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("regular");
  const [notes, setNotes] = useState("");
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

  // ── Show summary when all key fields present ──
  const showSummary =
    selectedCourt && date && startTime && endTime;

  // ── Validation ──
  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!selectedCourt) e.court = "Seleccioná una cancha";
    if (!memberName.trim()) e.name = "Ingresá el nombre del socio";
    if (!memberId.trim()) e.memberId = "Ingresá el ID del socio";
    if (!date) e.date = "Seleccioná una fecha";
    if (!startTime) e.startTime = "Seleccioná hora de inicio";
    if (!endTime) e.endTime = "Seleccioná hora de fin";
    if (
      startTime &&
      endTime &&
      timeToMinutes(endTime) <= timeToMinutes(startTime)
    ) {
      e.endTime = "La hora de fin debe ser posterior al inicio";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [selectedCourt, memberName, memberId, date, startTime, endTime]);

  // ── Submit ──
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
      className="spt-rsv__overlay"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="dialog"
      aria-modal="true"
      aria-label="Nueva reserva de cancha"
    >
      {/* Backdrop */}
      <div className="spt-rsv__backdrop" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div
        className="spt-rsv__modal"
        data-submitting={isSubmitting ? "true" : undefined}
      >
        {/* Header */}
        <div className="spt-rsv__header">
          <div>
            <h2 className="spt-rsv__title">🎾 Nueva Reserva de Cancha</h2>
            <p className="spt-rsv__subtitle">
              Ejecución directa (AUTO) — sin aprobación requerida
            </p>
          </div>
          <Button
            variant="unstyled"
            type="button"
            className="spt-rsv__close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="spt-rsv__close-icon" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="spt-rsv__body">
          {/* Court Picker */}
          <CourtPicker
            courts={courtUtilization}
            selectedCourt={selectedCourt}
            onSelect={setSelectedCourt}
          />
          {errors.court && (
            <p className="spt-rsv__error spt-rsv__error--standalone">
              {errors.court}
            </p>
          )}

          {/* Member Info */}
          <div className="spt-rsv__row-2">
            <FormField label="Nombre del socio *" error={errors.name}>
              <input
                ref={nameRef}
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="María Rodríguez"
                className="spt-rsv__input"
                data-has-error={!!errors.name || undefined}
              />
            </FormField>

            <FormField label="ID del socio *" error={errors.memberId}>
              <input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="mbr-001"
                className="spt-rsv__input"
                data-has-error={!!errors.memberId || undefined}
              />
            </FormField>
          </div>

          {/* Date */}
          <FormField
            label="Fecha *"
            error={errors.date}
            icon={<Calendar className="spt-rsv__label-icon" />}
          >
            <input
              type="date"
              value={date}
              min={todayISO()}
              max={futureDateISO(30)}
              onChange={(e) => setDate(e.target.value)}
              className="spt-rsv__input"
              data-has-error={!!errors.date || undefined}
            />
          </FormField>

          {/* Time Range */}
          <TimeRangePicker
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            startTimeError={errors.startTime}
            endTimeError={errors.endTime}
          />

          {/* Purpose */}
          <FormField label="Propósito">
            <PurposePills selected={purpose} onSelect={setPurpose} />
          </FormField>

          {/* Notes */}
          <FormField label="Notas (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Instrucciones especiales, equipamiento necesario..."
              className="spt-rsv__textarea"
            />
          </FormField>

          {/* Summary Preview */}
          {showSummary && (
            <SummaryPreview
              court={selectedCourt}
              date={date}
              startTime={startTime}
              endTime={endTime}
              purpose={purpose}
            />
          )}

          {/* Actions */}
          <div className="spt-rsv__actions">
            <Button
              variant="unstyled"
              type="button"
              className="spt-rsv__cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="unstyled"
              type="submit"
              className="spt-rsv__submit-btn"
              disabled={isSubmitting}
              data-submitting={isSubmitting ? "true" : undefined}
            >
              {isSubmitting ? (
                <>
                  <span className="spt-rsv__spinner" />
                  Reservando...
                </>
              ) : (
                "Confirmar Reserva"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}