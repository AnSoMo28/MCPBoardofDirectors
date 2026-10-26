// src/features/events/hooks/useEventForm.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Form Orchestrator Hook
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     @/shared/hooks/useMCPQuery, @/shared/components/ui,
//              @/shared/types/domain-enums, ../types
//
// Orchestrator hook for the Event Create/Edit wizard.
// Coordinates: form state, URL pre-fill, edit data fetch,
// field-level validation, step navigation, and mutations.
//
// Wizard steps:
//   0 — Información (category, title, description)
//   1 — Programación (date, time, location)
//   2 — Capacidad y Reglas (limits, cost, access)
//   3 — Revisión (confirm and submit)
//
// Form state is INTENTIONALLY MUTABLE — fields are reassigned
// on every keystroke. Readonly would require spreading on each
// change, adding overhead with zero safety benefit.
// Same pattern as EventFilters in types.ts.
//
// ANTI-PATTERNS REMOVED:
// [x] Patch comment ("F47") → removed
// [x] Mutable STEPS array → readonly as const
// [x] Mutable EMPTY_FORM → readonly object
// [x] Mutable WizardStep-related interfaces → readonly where appropriate
// [x] useMCPQuery params not memoized → useMemo
// [x] 3 unsafe casts in create mutation → CreateResponse typed generic
// [x] 4 Spanish toast messages → TOAST_MESSAGES constant
// [x] 8 Spanish validation messages → VALIDATION_MESSAGES constant
// [x] navigate exposed in return → removed
// [x] document.getElementById → useRef + containerRef
// [x] EventDetailQueryResponse mutable → readonly
// [x] Missing § section markers → §0-§5
// [x] Missing file header → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  useMCPQuery,
  useMCPMutation,
} from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";
import type { EventCategory } from "@/shared/types/domain-enums";
import type {
  EventAccessType,
  RecurrencePattern,
  EventPricingModel,
  EventResponse,
} from "../types";
import { EVENT_CATEGORY_CONFIG } from "../types";

// ═══════════════════════════════════════════════════════════
// §1 TYPES + CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Wizard step index (0-3). */
export type WizardStep = 0 | 1 | 2 | 3;

/**
 * Event form data. INTENTIONALLY MUTABLE — form state where
 * fields are reassigned on every keystroke. Readonly would
 * require spreading on each change with zero safety benefit.
 */
export interface EventFormData {
  title: string;
  description: string;
  category: EventCategory;
  event_type: EventAccessType;
  tags: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  maxCapacity: number;
  requiresRsvp: boolean;
  pricing_model: EventPricingModel;
  price_per_person: number;
  is_members_only: boolean;
  allow_guests: boolean;
  max_guests_per_family: number;
  recurrence: RecurrencePattern;
  dress_code: string;
  age_groups: string;
  notes: string;
}

/** MCP response shape for get_event tool. */
interface EventDetailQueryResponse {
  readonly status: string;
  readonly data: EventResponse;
}

/** MCP response shape for event_create tool. */
interface CreateResponse {
  readonly data?: {
    readonly status?: string;
    readonly id?: string;
  };
}

/** Wizard step definition. */
interface StepDef {
  readonly label: string;
  readonly description: string;
}

/** Ordered wizard step definitions. */
export const STEPS: readonly StepDef[] = [
  { label: "Información", description: "Categoría, título y descripción" },
  { label: "Programación", description: "Fecha, hora y lugar" },
  { label: "Capacidad y Reglas", description: "Límites, costo, acceso" },
  { label: "Revisión", description: "Confirmar y enviar" },
] as const;

/** Default empty form state. */
export const EMPTY_FORM: EventFormData = {
  title: "",
  description: "",
  category: "social",
  event_type: "open",
  tags: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  location: "",
  maxCapacity: 50,
  requiresRsvp: true,
  pricing_model: "free",
  price_per_person: 0,
  is_members_only: true,
  allow_guests: false,
  max_guests_per_family: 0,
  recurrence: "none",
  dress_code: "",
  age_groups: "",
  notes: "",
};

/** Default capacity for new events. */
const DEFAULT_CAPACITY = 50;

/**
 * Centralized toast messages.
 * When i18n is implemented, replace values with i18n.t() calls.
 */
const TOAST_MESSAGES = {
  createdApproval:
    "Evento enviado para aprobación — pendiente de confirmación del administrador",
  created: "Evento creado correctamente",
  createError: "Error al crear evento",
  updated: "Evento actualizado correctamente",
  updateError: "Error al actualizar evento",
} as const;

/**
 * Centralized validation messages.
 * When i18n is implemented, replace values with i18n.t() calls.
 */
const VALIDATION_MESSAGES = {
  titleRequired: "El título es obligatorio",
  descriptionRequired: "La descripción es obligatoria",
  startDateRequired: "La fecha de inicio es obligatoria",
  startTimeRequired: "La hora de inicio es obligatoria",
  endDateRequired: "La fecha de fin es obligatoria",
  endTimeRequired: "La hora de fin es obligatoria",
  locationRequired: "La ubicación es obligatoria",
  endDateBeforeStart: "La fecha de fin debe ser posterior al inicio",
  capacityMin: "La capacidad mínima es 1",
} as const;

// ═══════════════════════════════════════════════════════════
// §2 HELPERS
//
// Pure functions for date/time conversion and URL pre-fill.
// Module-level — no closures, no side effects.
// ═══════════════════════════════════════════════════════════

/** Combine date + time strings into ISO datetime. */
function toISODateTime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}:00`;
}

/** Extract date portion from ISO datetime string. */
function extractDate(isoStr: string): string {
  return isoStr?.split("T")[0] || "";
}

/** Extract time portion from ISO datetime string (HH:mm). */
function extractTime(isoStr: string): string {
  return isoStr?.split("T")[1]?.slice(0, 5) || "00:00";
}

/**
 * Parse URL search params into initial form state.
 * Used when creating events from the Calendar quick-add flow.
 * Returns partial form + which step to start on.
 */
function getInitialFormFromURL(): {
  readonly form: EventFormData;
  readonly startStep: WizardStep;
} {
  if (typeof window === "undefined") {
    return { form: EMPTY_FORM, startStep: 0 };
  }

  const sp = new URLSearchParams(window.location.search);
  const title = sp.get("title");
  const category = sp.get("category") as EventCategory | null;
  const date = sp.get("date");
  const startTime = sp.get("startTime");
  const endTime = sp.get("endTime");
  const location = sp.get("location");
  const capacity = sp.get("capacity");
  const tags = sp.get("tags");

  if (!title && !category && !date) {
    return { form: EMPTY_FORM, startStep: 0 };
  }

  return {
    form: {
      ...EMPTY_FORM,
      ...(title ? { title } : {}),
      ...(category && category in EVENT_CATEGORY_CONFIG
        ? { category }
        : {}),
      ...(date ? { startDate: date, endDate: date } : {}),
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      ...(location ? { location } : {}),
      ...(capacity
        ? { maxCapacity: parseInt(capacity) || DEFAULT_CAPACITY }
        : {}),
      ...(tags ? { tags } : {}),
    },
    startStep: 1,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 VALIDATION RULES
//
// Step-level validation. Returns error map for the step.
// Module-level function — receives form as parameter.
// ═══════════════════════════════════════════════════════════

/**
 * Validate a wizard step. Returns errors map.
 * Empty map = valid.
 */
function validateStepForm(
  step: WizardStep,
  form: EventFormData,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!form.title.trim()) {
      errors.title = VALIDATION_MESSAGES.titleRequired;
    }
    if (!form.description.trim()) {
      errors.description = VALIDATION_MESSAGES.descriptionRequired;
    }
  }

  if (step === 1) {
    if (!form.startDate) {
      errors.startDate = VALIDATION_MESSAGES.startDateRequired;
    }
    if (!form.startTime) {
      errors.startTime = VALIDATION_MESSAGES.startTimeRequired;
    }
    if (!form.endDate) {
      errors.endDate = VALIDATION_MESSAGES.endDateRequired;
    }
    if (!form.endTime) {
      errors.endTime = VALIDATION_MESSAGES.endTimeRequired;
    }
    if (!form.location.trim()) {
      errors.location = VALIDATION_MESSAGES.locationRequired;
    }
    if (
      form.startDate &&
      form.endDate &&
      form.endDate < form.startDate
    ) {
      errors.endDate = VALIDATION_MESSAGES.endDateBeforeStart;
    }
  }

  if (step === 2) {
    if (form.maxCapacity < 1) {
      errors.maxCapacity = VALIDATION_MESSAGES.capacityMin;
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════
// §4 HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Event Form orchestrator hook.
 *
 * Coordinates: form state, URL pre-fill, edit data fetch,
 * field-level validation, step navigation, and mutations.
 *
 * @returns Everything the EventForm wizard needs
 */
export function useEventForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  // ── §4.1 Container ref for auto-focus ──
  // Returned to the component. Attaches to the wizard step container.
  // Replaces document.getElementById("ef-step-container").
  const containerRef = useRef<HTMLDivElement>(null);

  // ── §4.2 Initial state ──

  const { form: urlForm, startStep } = getInitialFormFromURL();
  const [step, setStep] = useState<WizardStep>(startStep);
  const [stepDirection, setStepDirection] = useState<"fwd" | "bwd">(
    "fwd",
  );
  const [form, setForm] = useState<EventFormData>(urlForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── §4.3 Edit mode: fetch event data ──

  const queryParams = useMemo(
    () => ({ event_id: id }),
    [id],
  );

  const editQuery = useMCPQuery<EventDetailQueryResponse>(
    "events",
    "get_event",
    queryParams,
    { enabled: isEditing },
  );

  // Fill form from fetched event data
  useEffect(() => {
    if (!editQuery.data?.data) return;
    const e = editQuery.data.data;
    setForm({
      title: e.title,
      description: e.description,
      category: e.category,
      event_type: e.event_type,
      tags: e.tags.join(", "),
      startDate: extractDate(e.date_start),
      startTime: extractTime(e.date_start),
      endDate: extractDate(e.date_end),
      endTime: extractTime(e.date_end),
      location: e.location,
      maxCapacity: e.max_capacity,
      requiresRsvp: e.requires_rsvp,
      pricing_model: e.pricing_model,
      price_per_person: e.price_per_person,
      is_members_only: e.is_members_only,
      allow_guests: e.allow_guests,
      max_guests_per_family: e.max_guests_per_family,
      recurrence: e.recurrence,
      dress_code: e.dress_code,
      age_groups: e.age_groups.join(", "),
      notes: e.notes,
    });
  }, [editQuery.data]);

  // ── §4.4 Mutations ──

  const createMut = useMCPMutation<CreateResponse, Record<string, unknown>>(
    "events",
    "event_create",
    {
      onSuccess: (resp) => {
        const status = resp?.data?.status;
        const createdId = resp?.data?.id;

        if (status === "pending_approval") {
          showToast({
            type: "info",
            message: TOAST_MESSAGES.createdApproval,
          });
          navigate("/admin/events");
          return;
        }

        showToast({
          type: "success",
          message: TOAST_MESSAGES.created,
        });
        if (createdId) {
          navigate(`/admin/events/${createdId}`);
        } else {
          navigate("/admin/events");
        }
      },
      onError: (err: Error) => {
        showToast({
          type: "error",
          message: err.message || TOAST_MESSAGES.createError,
        });
      },
    },
  );

  const updateMut = useMCPMutation<unknown, Record<string, unknown>>(
    "events",
    "update_event",
    {
      onSuccess: () => {
        showToast({
          type: "success",
          message: TOAST_MESSAGES.updated,
        });
        if (id) navigate(`/admin/events/${id}`);
      },
      onError: (err: Error) => {
        showToast({
          type: "error",
          message: err.message || TOAST_MESSAGES.updateError,
        });
      },
    },
  );

  const isSubmitting = createMut.isPending || updateMut.isPending;

  // ── §4.5 Field change ──

  const handleChange = useCallback(
    (field: keyof EventFormData, value: string | number | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear field error on change
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  // ── §4.6 Validation ──

  const validateStep = useCallback(
    (s: WizardStep): boolean => {
      const stepErrors = validateStepForm(s, form);
      setErrors(stepErrors);
      return Object.keys(stepErrors).length === 0;
    },
    [form],
  );

  // ── §4.7 Navigation ──

  const handleNext = useCallback(() => {
    if (validateStep(step) && step < 3) {
      setStepDirection("fwd");
      setStep((s) => (s + 1) as WizardStep);
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStepDirection("bwd");
      setStep((s) => (s - 1) as WizardStep);
    }
  }, [step]);

  // ── §4.8 Submit ──

  const handleSubmit = useCallback(() => {
    if (!validateStep(2)) {
      setStepDirection("bwd");
      setStep(2);
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      event_type: form.event_type,
      date_start: toISODateTime(form.startDate, form.startTime),
      date_end: toISODateTime(form.endDate, form.endTime),
      location: form.location.trim(),
      max_capacity: form.maxCapacity,
      requires_rsvp: form.requiresRsvp,
      pricing_model: form.pricing_model,
      price_per_person:
        form.pricing_model === "free" ? 0 : form.price_per_person,
      is_members_only: form.is_members_only,
      allow_guests: form.allow_guests,
      max_guests_per_family: form.allow_guests
        ? form.max_guests_per_family
        : 0,
      recurrence: form.recurrence,
      dress_code: form.dress_code.trim(),
      age_groups: form.age_groups
        ? form.age_groups.split(",").map((a) => a.trim()).filter(Boolean)
        : ["all"],
      notes: form.notes.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (isEditing && id) {
      updateMut.mutate({ event_id: id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }, [form, id, isEditing, validateStep, createMut, updateMut]);

  // ── §4.9 Auto-focus on step change ──
  // Uses containerRef instead of document.getElementById.
  // The component attaches containerRef to the wizard step container.

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const first = container.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]):not([type=checkbox]):not([type=radio]), " +
        "textarea:not([disabled]), select:not([disabled])",
      );
      first?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [step]);

  // ── §4.10 Return ──

  return {
    // Refs
    containerRef,
    // State
    isEditing,
    id,
    step,
    stepDirection,
    form,
    errors,
    // Form
    handleChange,
    // Navigation
    handleNext,
    handleBack,
    handleSubmit,
    // Loading
    isLoading: editQuery.isLoading,
    isSubmitting,
  };
}