// src/features/facilities/components/BookingFormModal.tsx
// ═══════════════════════════════════════════════════════════════
// BOOKING FORM MODAL — "La Reserva Inteligente" (REWRITE)
//
// Intelligence Layer additions (I2):
//   1. Venue suggestions — purpose + guests → top 3 matches
//   2. Optimal time slots — facility + date → best 3 hours
//   3. Crowd warning — selected time has high occupancy
//   4. Revenue preview — estimated revenue for this booking
//   5. Maintenance conflict — maintenance scheduled that day
//
// Portal-based. Focus trap. Living Protocol 4/7.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

import {
  X,
  Calendar,
  Clock,
  Users,
  FileText,
  Loader2,
  Sparkles,
  AlertTriangle,
  DollarSign,
  Target,
  Wrench,
  ChevronRight,
  Check
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";

import type {
  Facility,
  FacilitiesDashboardMode,
  OccupancyPrediction,
  RevenueModel,
  MaintenanceTask,
  FacilityReservation,
  VenueMatch,
  OptimalSlot,
  MaintenanceConflict,
} from "../types";

import { matchVenues, classifyPurpose } from "../lib/venueMatching";
import { findOptimalSlots, detectMaintenanceConflict } from "../lib/optimalScheduling";

import "./BookingFormModal.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BookingFormData {
  facility_id: string;
  date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  purpose: string;
}

export interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  preselectedFacilityId?: string | null;
  onSubmit: (data: BookingFormData) => Promise<void>;
  ambientMode?: FacilitiesDashboardMode;
  // Intelligence layer props (optional — backward compatible)
  occupancyPredictions?: Record<string, OccupancyPrediction>;
  revenueModels?: Record<string, RevenueModel>;
  maintenanceTasks?: MaintenanceTask[];
  reservations?: FacilityReservation[];
}

interface FormErrors {
  facility_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  guest_count?: string;
  purpose?: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function generateTimeSlots(
  startHour: number,
  endHour: number,
  intervalMin: number,
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMin) {
      if (h === endHour && m > 0) break;
      slots.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }
  return slots;
}

function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs.toLocaleString("es-CR")}`;
}

const TIME_SLOTS = generateTimeSlots(5, 23, 30);

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function FormField({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fac-book-modal__field">
      <label className="fac-book-modal__label">
        <Icon className="fac-book-modal__label-icon" />
        {label}
      </label>
      {children}
      {error && <p className="fac-book-modal__error">{error}</p>}
    </div>
  );
}

function VenueSuggestionCard({
  match,
  index,
  onSelect,
}: {
  match: VenueMatch;
  index: number;
  onSelect: () => void;
}) {
  return (
    <Button
      variant="unstyled"
      type="button"
      className="fac-book-modal__suggestion"
      onClick={onSelect}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <div className="fac-book-modal__suggestion-head">
        <span className="fac-book-modal__suggestion-name">
          {match.facility_name}
        </span>
        <span className="fac-book-modal__suggestion-score">
          {match.match_score}%
        </span>
      </div>
      <div className="fac-book-modal__suggestion-meta">
        <span className="fac-book-modal__suggestion-fit">
          Capacidad: {match.personality_fit}%
        </span>
        <span className="fac-book-modal__suggestion-price">
          {formatCRC(match.price_estimate)}
        </span>
      </div>
      {match.warnings.length > 0 && (
        <div className="fac-book-modal__suggestion-warnings">
          {match.warnings.map((w, i) => (
            <span key={i} className="fac-book-modal__suggestion-warning">
              <AlertTriangle className="fac-book-modal__suggestion-warning-icon" />
              {w}
            </span>
          ))}
        </div>
      )}
      {index === 0 && (
        <span className="fac-book-modal__suggestion-badge">
          <Sparkles className="fac-book-modal__suggestion-badge-icon" />
          Recomendado
        </span>
      )}
    </Button>
  );
}

function OptimalSlotCard({
  slot,
  index,
  onSelect,
}: {
  slot: OptimalSlot;
  index: number;
  onSelect: () => void;
}) {
  const crowdColor =
    slot.crowd_pct < 40
      ? "var(--color-teal-400)"
      : slot.crowd_pct < 70
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  return (
    <Button
      variant="unstyled"
      type="button"
      className={cn(
        "fac-book-modal__slot",
        slot.is_recommended && "fac-book-modal__slot--recommended",
      )}
      onClick={onSelect}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <div className="fac-book-modal__slot-time">
        <Clock className="fac-book-modal__slot-icon" />
        <span>{slot.start_time} – {slot.end_time}</span>
      </div>
      <div className="fac-book-modal__slot-meta">
        <span className="fac-book-modal__slot-crowd" style={{ color: crowdColor }}>
          {slot.crowd_pct}% ocupación
        </span>
        <span
          className="fac-book-modal__slot-revenue"
          data-positive={slot.revenue_delta >= 0}
        >
          {slot.revenue_delta >= 0 ? "+" : ""}
          {formatCRC(slot.revenue_delta)}
        </span>
      </div>
      {slot.is_recommended && (
        <span className="fac-book-modal__slot-badge">
          <Check className="fac-book-modal__slot-badge-icon" />
          Mejor horario
        </span>
      )}
    </Button>
  );
}

function CrowdWarning({ crowdPct }: { crowdPct: number }) {
  return (
    <div className="fac-book-modal__crowd-warning" role="alert">
      <AlertTriangle className="fac-book-modal__crowd-warning-icon" />
      <span>
        Ocupación alta ({crowdPct}%) en este horario. Considerá un horario alternativo.
      </span>
    </div>
  );
}

function RevenuePreview({ revenue }: { revenue: number }) {
  return (
    <div className="fac-book-modal__revenue-preview">
      <DollarSign className="fac-book-modal__revenue-icon" />
      <span className="fac-book-modal__revenue-label">Revenue estimado:</span>
      <span className="fac-book-modal__revenue-value">{formatCRC(revenue)}</span>
    </div>
  );
}

function MaintenanceConflictBanner({
  conflict,
  onUseAlternative,
}: {
  conflict: MaintenanceConflict;
  onUseAlternative?: (date: string) => void;
}) {
  return (
    <div className="fac-book-modal__maintenance-conflict" role="alert">
      <Wrench className="fac-book-modal__maintenance-icon" />
      <div className="fac-book-modal__maintenance-body">
        <p className="fac-book-modal__maintenance-title">
          {conflict.task_count} mantenimiento{conflict.task_count > 1 ? "s" : ""} programado{conflict.task_count > 1 ? "s" : ""}
        </p>
        {conflict.task_descriptions.map((desc, i) => (
          <p key={i} className="fac-book-modal__maintenance-desc">{desc}</p>
        ))}
        {onUseAlternative && (
          <Button
            variant="unstyled"
            type="button"
            className="fac-book-modal__maintenance-alt"
            onClick={() => onUseAlternative(conflict.earliest_available_date)}
          >
            Usar {conflict.earliest_available_date}
            <ChevronRight className="fac-book-modal__maintenance-alt-icon" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function BookingFormModal({
  isOpen,
  onClose,
  facilities,
  preselectedFacilityId,
  onSubmit,
  ambientMode = "calm",
  occupancyPredictions,
  revenueModels,
  maintenanceTasks = [],
  reservations = [],
}: BookingFormModalProps) {
  const prefersReduced = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isClosing, setIsClosing] = useState(false);

  const [form, setForm] = useState<BookingFormData>({
    facility_id: preselectedFacilityId ?? "",
    date: todayISO(),
    start_time: "10:00",
    end_time: "12:00",
    guest_count: 1,
    purpose: "",
  });

  // ── Intelligence enabled? ──
  const hasIntelligence = !!occupancyPredictions && !!revenueModels;

  // ── Venue Suggestions ──
  const venueSuggestions = useMemo((): VenueMatch[] => {
    if (!hasIntelligence) return [];
    if (form.purpose.length < 3 || form.guest_count < 1) return [];

    return matchVenues(
      form.purpose,
      form.guest_count,
      facilities,
      occupancyPredictions!,
      revenueModels!,
      maintenanceTasks,
      form.date,
      form.start_time,
    ).slice(0, 3);
  }, [
    hasIntelligence,
    form.purpose,
    form.guest_count,
    form.date,
    form.start_time,
    facilities,
    occupancyPredictions,
    revenueModels,
    maintenanceTasks,
  ]);

  // ── Purpose classification ──
  const purposeClass = useMemo(() => {
    if (form.purpose.length < 3) return null;
    return classifyPurpose(form.purpose);
  }, [form.purpose]);

  // ── Optimal Time Slots ──
  const optimalSlots = useMemo((): OptimalSlot[] => {
    if (!hasIntelligence || !form.facility_id || !form.date) return [];

    const facility = facilities.find((f) => f.id === form.facility_id);
    if (!facility) return [];

    return findOptimalSlots(
      facility,
      form.date,
      form.guest_count,
      reservations,
      maintenanceTasks,
      occupancyPredictions![form.facility_id],
    );
  }, [
    hasIntelligence,
    form.facility_id,
    form.date,
    form.guest_count,
    facilities,
    reservations,
    maintenanceTasks,
    occupancyPredictions,
  ]);

  // ── Crowd Warning ──
  const crowdWarning = useMemo(() => {
    if (!hasIntelligence || !form.facility_id) return null;
    const prediction = occupancyPredictions![form.facility_id];
    if (!prediction) return null;
    if (prediction.congestion_risk > 60) return prediction.current_pct;
    return null;
  }, [hasIntelligence, form.facility_id, occupancyPredictions]);

  // ── Revenue Preview ──
  const revenuePreview = useMemo(() => {
    if (!hasIntelligence || !form.facility_id) return null;
    const model = revenueModels![form.facility_id];
    if (!model) return null;
    const perEvent = model.current.revenue_per_event;
    const avgGuests = Math.max(1, model.current.revenue_per_month / Math.max(perEvent, 1));
    const ratio = Math.min(2, form.guest_count / avgGuests);
    return Math.round(perEvent * ratio);
  }, [hasIntelligence, form.facility_id, form.guest_count, revenueModels]);

  // ── Maintenance Conflict ──
  const maintenanceConflict = useMemo((): MaintenanceConflict | null => {
    if (!form.facility_id || !form.date) return null;
    return detectMaintenanceConflict(
      form.facility_id,
      form.date,
      maintenanceTasks,
    );
  }, [form.facility_id, form.date, maintenanceTasks]);

  // ── Reset on open ──
  useEffect(() => {
    if (isOpen) {
      setForm({
        facility_id: preselectedFacilityId ?? "",
        date: todayISO(),
        start_time: "10:00",
        end_time: "12:00",
        guest_count: 1,
        purpose: "",
      });
      setErrors({});
      setIsClosing(false);
    }
  }, [isOpen, preselectedFacilityId]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // ── Focus trap ──
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstInput = dialogRef.current.querySelector<HTMLElement>(
        "select, input, textarea, button",
      );
      firstInput?.focus();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (prefersReduced) {
      onClose();
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose, prefersReduced]);

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

  const validate = useCallback((): boolean => {
    const e: FormErrors = {};
    if (!form.facility_id) e.facility_id = "Selecciona una instalación";
    if (!form.date) e.date = "Selecciona una fecha";
    if (!form.start_time) e.start_time = "Hora de inicio requerida";
    if (!form.end_time) e.end_time = "Hora de fin requerida";
    if (form.start_time >= form.end_time)
      e.end_time = "La hora de fin debe ser posterior al inicio";
    if (form.guest_count < 1) e.guest_count = "Mínimo 1 invitado";
    if (!form.purpose.trim()) e.purpose = "Describe el propósito";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setLoading(true);
      try {
        await onSubmit(form);
      } catch {
        // Error handled by parent
      } finally {
        setLoading(false);
      }
    },
    [form, validate, onSubmit],
  );

  // ── Venue suggestion click → auto-fill facility ──
  const handleSelectVenue = useCallback((facilityId: string) => {
    updateField("facility_id", facilityId);
  }, [updateField]);

  // ── Optimal slot click → auto-fill time ──
  const handleSelectSlot = useCallback((startTime: string, endTime: string) => {
    updateField("start_time", startTime);
    updateField("end_time", endTime);
  }, [updateField]);

  // ── Maintenance alternative date ──
  const handleUseAlternativeDate = useCallback((date: string) => {
    updateField("date", date);
  }, [updateField]);

  const selectedFacility = facilities.find((f) => f.id === form.facility_id);
  const maxGuests = selectedFacility?.capacity ?? 200;

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div
      className="fac-book-modal"
      data-mode={ambientMode}
      data-closing={isClosing ? "true" : undefined}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
      data-intelligence={hasIntelligence ? "true" : undefined}
    >
      {/* Backdrop */}
      <div
        className="fac-book-modal__backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="fac-book-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Nueva Reserva"
        data-mode={ambientMode}
      >
        {/* Header */}
        <div className="fac-book-modal__header">
          <div>
            <h2 className="fac-book-modal__title">
              {hasIntelligence ? "Nueva Reserva Inteligente" : "Nueva Reserva"}
            </h2>
            <p className="fac-book-modal__subtitle">
              {selectedFacility
                ? `Reserva: ${selectedFacility.name}`
                : purposeClass
                  ? `Detectado: ${purposeClass.label}`
                  : "Selecciona una instalación"}
            </p>
          </div>
          <Button
            variant="unstyled"
            type="button"
            className="fac-book-modal__close"
            onClick={handleClose}
            aria-label="Cerrar"
          >
            <X className="fac-book-modal__close-icon" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="fac-book-modal__form">
          {/* Purpose (moved first — drives suggestions) */}
          <FormField label="Propósito" icon={FileText} error={errors.purpose}>
            <textarea
              value={form.purpose}
              onChange={(e) => updateField("purpose", e.target.value)}
              placeholder="Ej: Fiesta de cumpleaños, cena corporativa, evento familiar..."
              rows={2}
              className="fac-book-modal__textarea"
            />
            {purposeClass && purposeClass.intent !== "general" && (
              <p className="fac-book-modal__purpose-detected">
                <Sparkles className="fac-book-modal__purpose-icon" />
                Detectado: {purposeClass.label}
              </p>
            )}
          </FormField>

          {/* Guest count (moved up — feeds suggestions) */}
          <FormField label="Invitados" icon={Users} error={errors.guest_count}>
            <div className="fac-book-modal__slider-row">
              <input
                type="range"
                min={1}
                max={maxGuests}
                value={form.guest_count}
                onChange={(e) =>
                  updateField("guest_count", parseInt(e.target.value, 10))
                }
                className="fac-book-modal__slider"
              />
              <span className="fac-book-modal__slider-value">
                {form.guest_count}
              </span>
            </div>
            <p className="fac-book-modal__hint">
              Máximo: {maxGuests} personas
            </p>
          </FormField>

          {/* ═══ VENUE SUGGESTIONS (Intelligence Layer) ═══ */}
          {hasIntelligence && venueSuggestions.length > 0 && (
            <div className="fac-book-modal__intelligence-section">
              <div className="fac-book-modal__section-header">
                <Target className="fac-book-modal__section-icon" />
                <span className="fac-book-modal__section-title">
                  Espacios recomendados
                </span>
              </div>
              <div className="fac-book-modal__suggestions">
                {venueSuggestions.map((match, i) => (
                  <VenueSuggestionCard
                    key={match.facility_id}
                    match={match}
                    index={i}
                    onSelect={() => handleSelectVenue(match.facility_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Facility */}
          <FormField
            label="Instalación"
            icon={Calendar}
            error={errors.facility_id}
          >
            <select
              value={form.facility_id}
              onChange={(e) => updateField("facility_id", e.target.value)}
              className="fac-book-modal__select"
            >
              <option value="">Seleccionar instalación...</option>
              {facilities
                .filter((f) => f.status === "operational")
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — Cap. {f.capacity}
                  </option>
                ))}
            </select>
          </FormField>

          {/* Date */}
          <FormField label="Fecha" icon={Calendar} error={errors.date}>
            <input
              type="date"
              value={form.date}
              min={todayISO()}
              onChange={(e) => updateField("date", e.target.value)}
              className="fac-book-modal__input"
            />
          </FormField>

          {/* ═══ MAINTENANCE CONFLICT (Intelligence Layer) ═══ */}
          {hasIntelligence && maintenanceConflict?.has_conflict && (
            <MaintenanceConflictBanner
              conflict={maintenanceConflict}
              onUseAlternative={handleUseAlternativeDate}
            />
          )}

          {/* Time range */}
          <div className="fac-book-modal__time-row">
            <FormField
              label="Hora inicio"
              icon={Clock}
              error={errors.start_time}
            >
              <select
                value={form.start_time}
                onChange={(e) => updateField("start_time", e.target.value)}
                className="fac-book-modal__select"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={`s-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Hora fin"
              icon={Clock}
              error={errors.end_time}
            >
              <select
                value={form.end_time}
                onChange={(e) => updateField("end_time", e.target.value)}
                className="fac-book-modal__select"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={`e-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* ═══ OPTIMAL TIME SLOTS (Intelligence Layer) ═══ */}
          {hasIntelligence && optimalSlots.length > 0 && (
            <div className="fac-book-modal__intelligence-section">
              <div className="fac-book-modal__section-header">
                <Clock className="fac-book-modal__section-icon" />
                <span className="fac-book-modal__section-title">
                  Mejores horarios para {form.date}
                </span>
              </div>
              <div className="fac-book-modal__slots">
                {optimalSlots.map((slot, i) => (
                  <OptimalSlotCard
                    key={`${slot.start_time}-${slot.end_time}`}
                    slot={slot}
                    index={i}
                    onSelect={() =>
                      handleSelectSlot(slot.start_time, slot.end_time)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ═══ CROWD WARNING (Intelligence Layer) ═══ */}
          {hasIntelligence && crowdWarning !== null && (
            <CrowdWarning crowdPct={crowdWarning} />
          )}

          {/* Preview */}
          {selectedFacility && (
            <div className="fac-book-modal__preview">
              <span className="fac-book-modal__preview-label">
                Vista previa
              </span>
              <p className="fac-book-modal__preview-text">
                {selectedFacility.name} · {form.date} · {form.start_time}–
                {form.end_time} · {form.guest_count} persona
                {form.guest_count !== 1 ? "s" : ""}
                {form.purpose ? ` · ${form.purpose}` : ""}
              </p>

              {/* ═══ REVENUE PREVIEW (Intelligence Layer) ═══ */}
              {hasIntelligence && revenuePreview !== null && (
                <RevenuePreview revenue={revenuePreview} />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="fac-book-modal__actions">
            <Button
              variant="unstyled"
              type="button"
              className="fac-book-modal__btn fac-book-modal__btn--cancel"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              variant="unstyled"
              type="submit"
              className="fac-book-modal__btn fac-book-modal__btn--submit"
              disabled={loading}
            >
              {loading && (
                <Loader2 className="fac-book-modal__btn-spinner" />
              )}
              Crear Reserva
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}