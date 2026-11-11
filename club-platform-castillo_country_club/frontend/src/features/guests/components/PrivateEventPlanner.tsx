// ═══════════════════════════════════════════════════════════
// src/features/guests/components/PrivateEventPlanner.tsx
// Phase 34 "The Gateway" — Private Event Planner (Rewrite)
// Level 6+ Agency · Production Grade
//
// Private event lifecycle:
//   - Event list with inline pipeline stepper
//   - Create modal with full form (logistics + services)
//   - Status advance: inquiry → planning → confirmed → completed
//   - HITL: requires admin approval
//
// Original: framer-motion + cn() + Tailwind + inline colors
//   → CSS animations + BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   PrivateEventItem { id, event_name, event_type, status,
//     date, start_time?, venue, guest_count, budget,
//     catering_required, decoration_required,
//     entertainment_required, notes? }                     ← ../types (by usage) ✅
//   PRIVATE_EVENT_TYPE_CONFIG → Record<string,
//     { label, color, bgColor }>                          ← ../types (by usage) ✅
//   PRIVATE_EVENT_STATUS_CONFIG → Record<string,
//     { label, color, bgColor }>                          ← ../types (by usage) ✅
//   EVENT_PIPELINE_STEPS → readonly string[]               ← indexOf, map, length ✅
//
// ANTI-PATTERNS REMOVED: framer-motion, cn(), Tailwind,
//   inline colors, useReducedMotion, useBreakpoint,
//   className prop, EmptyState action as object
// FIX: EmptyState action → ReactNode, import path corrected
// ═══════════════════════════════════════════════════════════

import { useState } from "react";

import {
  PartyPopper, Plus, Calendar, MapPin, Users, DollarSign,
  ChevronRight, Utensils, Palette, Music, X, Check,
} from "lucide-react";

import { Button, Skeleton, showToast, Modal } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { formatCurrency } from "@/shared/lib/utils";

import type { PrivateEventItem } from "../types";
import {
  PRIVATE_EVENT_TYPE_CONFIG,
  PRIVATE_EVENT_STATUS_CONFIG,
  EVENT_PIPELINE_STEPS,
} from "../types";

import "./PrivateEventPlanner.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface EventListResponse {
  readonly status: string;
  readonly message: string;
  readonly events: readonly PrivateEventItem[];
}

interface EventMutationResponse {
  readonly status: string;
  readonly message: string;
  readonly event?: PrivateEventItem;
  readonly request_id?: string;
  readonly details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function getNextStatus(current: string): string | null {
  const idx = EVENT_PIPELINE_STEPS.indexOf(current as (typeof EVENT_PIPELINE_STEPS)[number]);
  if (idx < 0 || idx >= EVENT_PIPELINE_STEPS.length - 1) return null;
  return EVENT_PIPELINE_STEPS[idx + 1];
}

// ═══════════════════════════════════════════════════════════
// §3 — PIPELINE STEPPER
// ═══════════════════════════════════════════════════════════

function PipelineStepper({ currentStatus }: { readonly currentStatus: string }) {
  const currentIdx = EVENT_PIPELINE_STEPS.indexOf(currentStatus as (typeof EVENT_PIPELINE_STEPS)[number]);
  const isCancelled = currentStatus === "cancelled";

  if (isCancelled) {
    return (
      <div className="evt-planner__pipeline" data-cancelled="true" role="list" aria-label="Pipeline del evento">
        <div className="evt-planner__pipeline-step" data-state="cancelled">
          <div className="evt-planner__step-dot" data-state="cancelled">
            <X className="evt-planner__step-check" />
          </div>
          <span className="evt-planner__step-label">Cancelado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="evt-planner__pipeline" role="list" aria-label="Pipeline del evento">
      {EVENT_PIPELINE_STEPS.map((step, idx) => {
        const cfg = PRIVATE_EVENT_STATUS_CONFIG[step];
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const stepState = isCompleted ? "completed" : isCurrent ? "current" : "future";

        return (
          <div key={step} className="evt-planner__pipeline-step" data-state={stepState}>
            <div className="evt-planner__step-indicator">
              <div
                className="evt-planner__step-dot"
                data-state={stepState}
                role="listitem"
                aria-label={`Paso ${idx + 1}: ${cfg?.label ?? step} — ${stepState}`}
              >
                {isCompleted ? (
                  <Check className="evt-planner__step-check" />
                ) : (
                  <span className="evt-planner__step-number">{idx + 1}</span>
                )}
              </div>
              <span className="evt-planner__step-label" title={cfg?.label ?? step}>
                {cfg?.label ?? step}
              </span>
            </div>
            {idx < EVENT_PIPELINE_STEPS.length - 1 && (
              <div className="evt-planner__step-connector" data-completed={isCompleted} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — CREATE EVENT MODAL
// ═══════════════════════════════════════════════════════════

function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: Record<string, unknown>) => void;
  readonly isPending: boolean;
}) {
  const [form, setForm] = useState({
    family_id: "",
    event_name: "",
    event_type: "birthday",
    venue: "",
    date: "",
    start_time: "",
    end_time: "",
    guest_count: 0,
    budget: 0,
    coordinator_member_id: "",
    description: "",
    special_requirements: "",
    catering_required: false,
    decoration_required: false,
    entertainment_required: false,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.family_id.trim()) e.family_id = "Requerido";
    if (!form.event_name.trim()) e.event_name = "Requerido";
    if (!form.venue.trim()) e.venue = "Requerido";
    if (!form.date) e.date = "Requerido";
    if (!form.coordinator_member_id.trim()) e.coordinator_member_id = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit({ action: "create", ...form });
  }

  function handleClose() {
    onClose();
    setForm({
      family_id: "", event_name: "", event_type: "birthday", venue: "", date: "",
      start_time: "", end_time: "", guest_count: 0, budget: 0, coordinator_member_id: "",
      description: "", special_requirements: "", catering_required: false,
      decoration_required: false, entertainment_required: false, notes: "",
    });
    setErrors({});
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Evento Privado">
      <div className="evt-planner__modal-body">
        {/* Basic Info */}
        <div className="evt-planner__form-row" data-cols="2">
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">ID Familia *</label>
            <input
              type="text"
              value={form.family_id}
              onChange={(e) => update("family_id", e.target.value)}
              placeholder="fam-001"
              className="evt-planner__input"
              aria-invalid={!!errors.family_id}
            />
            {errors.family_id && <p className="evt-planner__error" role="alert">{errors.family_id}</p>}
          </div>
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Tipo de Evento</label>
            <select
              value={form.event_type}
              onChange={(e) => update("event_type", e.target.value)}
              className="evt-planner__input"
            >
              {Object.entries(PRIVATE_EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="evt-planner__form-group">
          <label className="evt-planner__label">Nombre del Evento *</label>
          <input
            type="text"
            value={form.event_name}
            onChange={(e) => update("event_name", e.target.value)}
            placeholder="Ej: Boda Quesada-Solano"
            className="evt-planner__input"
            aria-invalid={!!errors.event_name}
          />
          {errors.event_name && <p className="evt-planner__error" role="alert">{errors.event_name}</p>}
        </div>

        {/* Logistics */}
        <div className="evt-planner__form-row" data-cols="2">
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Venue *</label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => update("venue", e.target.value)}
              placeholder="Jardín Principal"
              className="evt-planner__input"
              aria-invalid={!!errors.venue}
            />
            {errors.venue && <p className="evt-planner__error" role="alert">{errors.venue}</p>}
          </div>
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Fecha *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className="evt-planner__input"
              data-variant="mono"
              aria-invalid={!!errors.date}
            />
            {errors.date && <p className="evt-planner__error" role="alert">{errors.date}</p>}
          </div>
        </div>

        <div className="evt-planner__form-row" data-cols="3">
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Hora inicio</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => update("start_time", e.target.value)}
              className="evt-planner__input"
              data-variant="mono"
            />
          </div>
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Hora fin</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => update("end_time", e.target.value)}
              className="evt-planner__input"
              data-variant="mono"
            />
          </div>
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Invitados</label>
            <input
              type="number"
              value={form.guest_count || ""}
              onChange={(e) => update("guest_count", Number(e.target.value))}
              placeholder="0"
              className="evt-planner__input"
              min={0}
            />
          </div>
        </div>

        <div className="evt-planner__form-row" data-cols="2">
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Presupuesto (₡)</label>
            <input
              type="number"
              value={form.budget || ""}
              onChange={(e) => update("budget", Number(e.target.value))}
              placeholder="0"
              className="evt-planner__input"
              min={0}
            />
          </div>
          <div className="evt-planner__form-group">
            <label className="evt-planner__label">Coordinador (member ID) *</label>
            <input
              type="text"
              value={form.coordinator_member_id}
              onChange={(e) => update("coordinator_member_id", e.target.value)}
              placeholder="member-003"
              className="evt-planner__input"
              aria-invalid={!!errors.coordinator_member_id}
            />
            {errors.coordinator_member_id && (
              <p className="evt-planner__error" role="alert">{errors.coordinator_member_id}</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="evt-planner__form-group">
          <label className="evt-planner__label">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            placeholder="Descripción del evento..."
            className="evt-planner__input evt-planner__textarea"
          />
        </div>

        <div className="evt-planner__form-group">
          <label className="evt-planner__label">Requisitos especiales</label>
          <textarea
            value={form.special_requirements}
            onChange={(e) => update("special_requirements", e.target.value)}
            rows={2}
            placeholder="DJ en vivo, arreglo floral, etc."
            className="evt-planner__input evt-planner__textarea"
          />
        </div>

        {/* Services */}
        <div className="evt-planner__form-group">
          <label className="evt-planner__label">Servicios Requeridos</label>
          <div className="evt-planner__service-chips" role="group" aria-label="Servicios requeridos">
            {[
              { key: "catering_required" as const, label: "Catering", icon: Utensils, service: "catering" },
              { key: "decoration_required" as const, label: "Decoración", icon: Palette, service: "decoration" },
              { key: "entertainment_required" as const, label: "Entretenimiento", icon: Music, service: "entertainment" },
            ].map((svc) => {
              const selected = form[svc.key];
              const SvcIcon = svc.icon;
              return (
                <Button
                  variant="unstyled"
                  key={svc.key}
                  type="button"
                  onClick={() => update(svc.key, !selected)}
                  className="evt-planner__service-btn"
                  data-active={selected}
                  data-service={svc.service}
                  aria-pressed={selected}
                >
                  <SvcIcon className="evt-planner__service-icon" />
                  {svc.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="evt-planner__form-group">
          <label className="evt-planner__label">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={2}
            className="evt-planner__input evt-planner__textarea"
          />
        </div>

        {/* HITL notice */}
        <div className="evt-planner__hitl-notice" role="note">
          <p className="evt-planner__hitl-text">
            Los eventos privados requieren aprobación del administrador.
            Tu solicitud será revisada antes de confirmar la reserva.
          </p>
        </div>

        {/* Submit */}
        <div className="evt-planner__modal-actions">
          <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending}
            icon={<PartyPopper className="w-4 h-4" />}
          >
            {isPending ? "Enviando…" : "Solicitar Evento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Private Event Planner — event lifecycle management.
 * Pipeline stepper with status advance, creation modal.
 *
 * @example
 * <PrivateEventPlanner />
 */
export default function PrivateEventPlanner() {
  const [showCreate, setShowCreate] = useState(false);

  // ── Query ──
  const eventsQ = useMCPQuery<EventListResponse>(
    "guest_management",
    "plan_private_event",
    { action: "list" },
    { staleTime: 60_000 },
  );

  const events = eventsQ.data?.events ?? [];

  // ── Mutations ──
  const createMut = useMCPMutation<EventMutationResponse>(
    "guest_management",
    "plan_private_event",
    {
      onSuccess: (data) => {
        if (data?.status === "pending_approval") {
          showToast({
            type: "info",
            message: "Solicitud enviada — pendiente de aprobación del administrador",
          });
          setShowCreate(false);
          eventsQ.refetch();
          return;
        }
        showToast({ type: "success", message: data.message ?? "Evento registrado" });
        setShowCreate(false);
        eventsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al crear evento" }),
    },
  );

  const updateStatusMut = useMCPMutation<EventMutationResponse>(
    "guest_management",
    "plan_private_event",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Estado actualizado" });
        eventsQ.refetch();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al actualizar" }),
    },
  );

  function handleAdvanceStatus(event: PrivateEventItem) {
    const next = getNextStatus(event.status);
    if (!next) return;
    updateStatusMut.mutate({ action: "update_status", event_id: event.id, new_status: next });
  }

  // ── Loading ──
  if (eventsQ.isLoading) {
    return (
      <div className="evt-planner" data-state="loading" role="region" aria-label="Eventos privados" data-testid="private-event-planner">
        <div className="evt-planner__loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="evt-planner__skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="evt-planner"
      data-state="data"
      role="region"
      aria-label="Eventos privados"
      data-testid="private-event-planner"
    >
      {/* ── Header ── */}
      <div className="evt-planner__header">
        <p className="evt-planner__header-count">
          {(events as PrivateEventItem[]).length} evento(s) privado(s)
        </p>
        <Button
          variant="primary"
          onClick={() => setShowCreate(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Nuevo Evento
        </Button>
      </div>

      {/* ── Event List ── */}
      <div className="evt-planner__list">
        {(events as PrivateEventItem[]).length === 0 ? (
          <EmptyState
            title="Sin eventos privados"
            description="Creá un evento privado para una familia del club."
            icon={<PartyPopper className="w-8 h-8" />}
            action={
              <Button
                variant="primary"
                onClick={() => setShowCreate(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Crear Evento
              </Button>
            }
          />
        ) : (
          <div className="evt-planner__event-list" role="list" aria-label="Eventos privados">
            {(events as PrivateEventItem[]).map((event, i) => {
              const typeCfg = PRIVATE_EVENT_TYPE_CONFIG[event.event_type]
                ?? PRIVATE_EVENT_TYPE_CONFIG.other;
              const statusCfg = PRIVATE_EVENT_STATUS_CONFIG[event.status]
                ?? PRIVATE_EVENT_STATUS_CONFIG.inquiry;
              const nextStatus = getNextStatus(event.status);
              const nextCfg = nextStatus
                ? PRIVATE_EVENT_STATUS_CONFIG[nextStatus as keyof typeof PRIVATE_EVENT_STATUS_CONFIG]
                : null;
              const isCancelled = event.status === "cancelled";
              const isCompleted = event.status === "completed";

              return (
                <div
                  key={event.id}
                  className="evt-planner__event-card"
                  data-status={event.status}
                  role="listitem"
                  style={{ "--stagger-i": i } as React.CSSProperties}
                >
                  {/* Header */}
                  <div className="evt-planner__event-header">
                    <div className="evt-planner__event-info">
                      <div className="evt-planner__event-title-row">
                        <h4 className="evt-planner__event-name">{event.event_name}</h4>
                        <span
                          className="evt-planner__badge"
                          data-kind="type"
                          style={{
                            "--badge-color": typeCfg.color,
                            "--badge-bg": typeCfg.bgColor,
                          } as React.CSSProperties}
                        >
                          {typeCfg.label}
                        </span>
                        <span
                          className="evt-planner__badge"
                          data-kind="status"
                          style={{
                            "--badge-color": statusCfg.color,
                            "--badge-bg": statusCfg.bgColor,
                          } as React.CSSProperties}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      <div className="evt-planner__event-meta">
                        <span className="evt-planner__meta-item">
                          <Calendar className="evt-planner__meta-icon" />
                          {event.date}{event.start_time ? ` ${event.start_time}` : ""}
                        </span>
                        <span className="evt-planner__meta-item">
                          <MapPin className="evt-planner__meta-icon" />
                          {event.venue}
                        </span>
                        <span className="evt-planner__meta-item">
                          <Users className="evt-planner__meta-icon" />
                          {event.guest_count} invitados
                        </span>
                        {event.budget > 0 && (
                          <span className="evt-planner__meta-item">
                            <DollarSign className="evt-planner__meta-icon" />
                            {formatCurrency(event.budget)}
                          </span>
                        )}
                      </div>

                      {/* Service tags */}
                      <div className="evt-planner__service-tags">
                        {event.catering_required && (
                          <span className="evt-planner__service-tag" data-service="catering">
                            <Utensils className="evt-planner__service-tag-icon" /> Catering
                          </span>
                        )}
                        {event.decoration_required && (
                          <span className="evt-planner__service-tag" data-service="decoration">
                            <Palette className="evt-planner__service-tag-icon" /> Decoración
                          </span>
                        )}
                        {event.entertainment_required && (
                          <span className="evt-planner__service-tag" data-service="entertainment">
                            <Music className="evt-planner__service-tag-icon" /> Entretenimiento
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Advance action */}
                    {!isCancelled && !isCompleted && nextCfg && (
                      <Button
                        variant="secondary"
                        onClick={() => handleAdvanceStatus(event)}
                        disabled={updateStatusMut.isPending}
                        icon={<ChevronRight className="w-4 h-4" />}
                      >
                        Avanzar a {nextCfg.label}
                      </Button>
                    )}
                  </div>

                  {/* Pipeline stepper */}
                  <div className="evt-planner__event-pipeline">
                    <PipelineStepper currentStatus={event.status} />
                  </div>

                  {/* Notes */}
                  {event.notes && (
                    <p className="evt-planner__event-notes">
                      {event.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <CreateEventModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMut.mutate(data)}
        isPending={createMut.isPending}
      />
    </div>
  );
}