// src/features/events/components/EventFormSteps.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Form Steps (4 wizard step components)
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   efs-* (event form steps)
// @keyframes   1 (in EventFormSteps.css)
// @depends     shared/components/ui: Card, FormField, inputClass,
//              selectClass, shared/lib/utils: cn,
//              lucide-react: CheckCircle2, AlertTriangle,
//              ../types: config objects, ../hooks/useEventForm: EventFormData
//
// 4 wizard step components for event creation form:
//   Step 0 — Info (category, access, title, description, tags)
//   Step 1 — Schedule (dates, times, location)
//   Step 2 — Capacity & Rules (capacity, pricing, access rules, recurrence)
//   Step 3 — Review (summary card with HITL notice)
//
// PRE-WRITE VERIFICATION:
// [x] FormField: label, required?, error?, hint?, children ✅
// [x] inputClass = "ui-field-input" ✅
// [x] selectClass = "ui-field-input ui-field-select" ✅
// [x] Card: className, children ✅
// [x] cn verified in shared/lib/utils ✅
// [x] EventFormData from ../hooks/useEventForm (feature-internal) ✅
// [x] EventCategory from @/shared/types/domain-enums ✅
// [x] Config objects from ../types ✅
//
// ANTI-PATTERNS REMOVED:
// [x] ~40 Tailwind utilities → efs-* BEM classes
// [x] 5 glass-* undefined namespaces → efs-* properly defined
// [x] Dead import: Button (imported, never used) → removed
// [x] Dead import: WizardStep (imported, never used) → removed
// [x] Dead import: EVENT_STATUS_CONFIG (imported, never used) → removed
// [x] Dead import: ACCESS_TYPE_CONFIG (imported, never used) → removed
// [x] font-[ family-name:var(--font-*) ] (15+) → CSS font-family
// [x] Inline styles for colors → CSS custom properties
// [x] bg-[var(--color-amber-400)]/10 → color-mix()
// [x] 0 data-testid → 7 attributes
// [x] 0 aria-pressed → added on all selector buttons
// [x] Props not readonly → readonly
// [x] No CSS file → created from scratch
// [x] No § markers → §0-§3 (TSX), §0-§13 (CSS)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { CheckCircle2, AlertTriangle } from "lucide-react";

// Shared — UI
import { FormField, inputClass, selectClass } from "@/shared/components/ui/FormField";
import { Card } from "@/shared/components/ui/Card";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Shared — Types
import type { EventCategory } from "@/shared/types/domain-enums";

// Feature — Types & Config
import type {
  EventAccessType,
  RecurrencePattern,
  EventPricingModel,
} from "../types";
import {
  EVENT_CATEGORY_CONFIG,
  PRICING_MODEL_CONFIG,
  RECURRENCE_CONFIG,
} from "../types";

// Feature — Hook type (feature-internal, same domain)
import type { EventFormData } from "../hooks/useEventForm";

// Styles
import "./EventFormSteps.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface StepProps {
  /** Current form data from useEventForm */
  readonly form: EventFormData;
  /** Validation errors keyed by field name */
  readonly errors: Record<string, string>;
  /** Field change handler */
  readonly onChange: (field: keyof EventFormData, value: string | number | boolean) => void;
}

/** Access type option for the selector. */
interface AccessTypeOption {
  readonly value: EventAccessType;
  readonly label: string;
  readonly description: string;
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

const ACCESS_TYPES: readonly AccessTypeOption[] = [
  { value: "open", label: "Abierto", description: "Todos los socios" },
  { value: "semi_private", label: "Semi-privado", description: "Socios + invitados selectos" },
  { value: "private", label: "Privado", description: "Solo invitados" },
] as const;

// ═══════════════════════════════════════════════════════════
// §3 STEP COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.0 StepInfo ────────────────────────────────────────
// Category selector + access type + title + description + tags.

export function StepInfo({ form, errors, onChange }: StepProps) {
  const categories = Object.entries(EVENT_CATEGORY_CONFIG) as [
    EventCategory,
    (typeof EVENT_CATEGORY_CONFIG)[EventCategory],
  ][];

  return (
    <div className="efs" data-testid="efs-step-info">
      {/* Category selector */}
      <FormField label="Categoría del evento" required>
        <div className="efs-categories" role="group" aria-label="Categorías disponibles">
          {categories.map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange("category", key)}
              className={cn("efs-category", form.category === key && "efs-category--active")}
              aria-pressed={form.category === key}
              aria-label={config.label}
            >
              <span className="efs-category__icon" aria-hidden="true">{config.icon}</span>
              <span className="efs-category__label">{config.label}</span>
              {form.category === key && (
                <CheckCircle2 size={16} className="efs-category__check" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </FormField>

      {/* Access type */}
      <FormField label="Tipo de acceso">
        <div className="efs-access-grid" role="group" aria-label="Tipo de acceso">
          {ACCESS_TYPES.map((at) => (
            <button
              key={at.value}
              type="button"
              onClick={() => onChange("event_type", at.value)}
              className={cn("efs-access", form.event_type === at.value && "efs-access--active")}
              aria-pressed={form.event_type === at.value}
              aria-label={`${at.label}: ${at.description}`}
            >
              <span className="efs-access__label">{at.label}</span>
              <span className="efs-access__desc">{at.description}</span>
            </button>
          ))}
        </div>
      </FormField>

      {/* Title */}
      <FormField label="Título del evento" required error={errors.title}>
        <input
          type="text"
          value={form.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Ej: Torneo de Tennis de Verano 2026"
          className={cn(inputClass, errors.title && "efs-field--error")}
          data-testid="efs-input-title"
        />
      </FormField>

      {/* Description */}
      <FormField label="Descripción" required error={errors.description}>
        <textarea
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Descripción detallada del evento, programa, qué incluye..."
          rows={5}
          className={cn(inputClass, "efs-textarea", errors.description && "efs-field--error")}
          data-testid="efs-input-description"
        />
      </FormField>

      {/* Tags */}
      <FormField label="Etiquetas" hint="Separadas por coma">
        <input
          type="text"
          value={form.tags}
          onChange={(e) => onChange("tags", e.target.value)}
          placeholder="tennis, verano, torneo, familia"
          className={inputClass}
          data-testid="efs-input-tags"
        />
      </FormField>
    </div>
  );
}

// ── §3.1 StepSchedule ────────────────────────────────────
// Date/time inputs + location.

export function StepSchedule({ form, errors, onChange }: StepProps) {
  return (
    <div className="efs" data-testid="efs-step-schedule">
      <div className="efs-field-grid">
        <FormField label="Fecha de inicio" required error={errors.startDate}>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            className={cn(inputClass, errors.startDate && "efs-field--error")}
            data-testid="efs-input-start-date"
          />
        </FormField>
        <FormField label="Hora de inicio" required error={errors.startTime}>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => onChange("startTime", e.target.value)}
            className={cn(inputClass, errors.startTime && "efs-field--error")}
            data-testid="efs-input-start-time"
          />
        </FormField>
        <FormField label="Fecha de fin" required error={errors.endDate}>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => onChange("endDate", e.target.value)}
            className={cn(inputClass, errors.endDate && "efs-field--error")}
            data-testid="efs-input-end-date"
          />
        </FormField>
        <FormField label="Hora de fin" required error={errors.endTime}>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => onChange("endTime", e.target.value)}
            className={cn(inputClass, errors.endTime && "efs-field--error")}
            data-testid="efs-input-end-time"
          />
        </FormField>
      </div>

      <FormField label="Ubicación / Instalación" required error={errors.location}>
        <input
          type="text"
          value={form.location}
          onChange={(e) => onChange("location", e.target.value)}
          placeholder="Ej: Cancha de Tennis Principal, Salón de Eventos"
          className={cn(inputClass, errors.location && "efs-field--error")}
          data-testid="efs-input-location"
        />
      </FormField>
    </div>
  );
}

// ── §3.2 StepCapacity ────────────────────────────────────
// Capacity + RSVP + pricing + access rules + recurrence + notes.

export function StepCapacity({ form, errors, onChange }: StepProps) {
  const pricingEntries = Object.entries(PRICING_MODEL_CONFIG) as [
    EventPricingModel,
    (typeof PRICING_MODEL_CONFIG)[EventPricingModel],
  ][];

  const recurrenceEntries = Object.entries(RECURRENCE_CONFIG) as [
    RecurrencePattern,
    { label: string },
  ][];

  return (
    <div className="efs" data-testid="efs-step-capacity">
      {/* Capacity + RSVP */}
      <div className="efs-field-grid">
        <FormField label="Capacidad máxima" required error={errors.maxCapacity}>
          <input
            type="number"
            min={1}
            value={form.maxCapacity}
            onChange={(e) => onChange("maxCapacity", parseInt(e.target.value) || 0)}
            className={cn(inputClass, errors.maxCapacity && "efs-field--error")}
            data-testid="efs-input-capacity"
          />
        </FormField>

        <div className="efs-checkbox-wrap">
          <label className="efs-checkbox">
            <input
              type="checkbox"
              checked={form.requiresRsvp}
              onChange={(e) => onChange("requiresRsvp", e.target.checked)}
              className="efs-checkbox__input"
            />
            <span className="efs-checkbox__label">Requiere RSVP</span>
          </label>
        </div>
      </div>

      {/* Pricing model */}
      <div className="efs-section">
        <FormField label="Modelo de precio">
          <div className="efs-pricing-grid" role="group" aria-label="Modelo de precio">
            {pricingEntries.map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange("pricing_model", key)}
                className={cn("efs-pricing", form.pricing_model === key && "efs-pricing--active")}
                aria-pressed={form.pricing_model === key}
                aria-label={config.label}
              >
                <span className="efs-pricing__icon" aria-hidden="true">{config.icon}</span>
                <span className="efs-pricing__label">{config.label}</span>
              </button>
            ))}
          </div>
        </FormField>

        {form.pricing_model !== "free" && (
          <FormField label="Precio por persona (₡)">
            <input
              type="number"
              min={0}
              step={1000}
              value={form.price_per_person}
              onChange={(e) => onChange("price_per_person", parseInt(e.target.value) || 0)}
              className={inputClass}
              data-testid="efs-input-price"
            />
          </FormField>
        )}
      </div>

      {/* Access rules */}
      <div className="efs-section">
        <p className="efs-section__title">Reglas de acceso</p>

        <div className="efs-checkbox-grid">
          <label className="efs-checkbox">
            <input
              type="checkbox"
              checked={form.is_members_only}
              onChange={(e) => onChange("is_members_only", e.target.checked)}
              className="efs-checkbox__input"
            />
            <span className="efs-checkbox__label">Solo miembros</span>
          </label>

          <label className="efs-checkbox">
            <input
              type="checkbox"
              checked={form.allow_guests}
              onChange={(e) => onChange("allow_guests", e.target.checked)}
              className="efs-checkbox__input"
            />
            <span className="efs-checkbox__label">Permitir invitados</span>
          </label>
        </div>

        {form.allow_guests && (
          <FormField label="Máximo invitados por familia">
            <input
              type="number"
              min={0}
              max={10}
              value={form.max_guests_per_family}
              onChange={(e) => onChange("max_guests_per_family", parseInt(e.target.value) || 0)}
              className={inputClass}
              data-testid="efs-input-max-guests"
            />
          </FormField>
        )}
      </div>

      {/* Recurrence + Dress code */}
      <div className="efs-field-grid">
        <FormField label="Recurrencia">
          <select
            value={form.recurrence}
            onChange={(e) => onChange("recurrence", e.target.value as RecurrencePattern)}
            className={selectClass}
            data-testid="efs-input-recurrence"
          >
            {recurrenceEntries.map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Código de vestimenta" hint="Opcional">
          <input
            type="text"
            value={form.dress_code}
            onChange={(e) => onChange("dress_code", e.target.value)}
            placeholder="Ej: Deportivo, Formal, Casual elegante"
            className={inputClass}
            data-testid="efs-input-dress-code"
          />
        </FormField>
      </div>

      {/* Age groups + Notes */}
      <FormField label="Grupos de edad" hint="Separados por coma. Vacío = todos">
        <input
          type="text"
          value={form.age_groups}
          onChange={(e) => onChange("age_groups", e.target.value)}
          placeholder="all"
          className={inputClass}
          data-testid="efs-input-age-groups"
        />
      </FormField>

      <FormField label="Notas internas" hint="No visibles para socios">
        <textarea
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Notas internas sobre el evento..."
          rows={3}
          className={cn(inputClass, "efs-textarea")}
          data-testid="efs-input-notes"
        />
      </FormField>
    </div>
  );
}

// ── §3.3 StepReview ──────────────────────────────────────
// Summary card with HITL notice.

export function StepReview({ form }: { readonly form: EventFormData }) {
  const catConfig = EVENT_CATEGORY_CONFIG[form.category];
  const pricingConfig = PRICING_MODEL_CONFIG[form.pricing_model];
  const recurrenceConfig = RECURRENCE_CONFIG[form.recurrence];
  const accessLabel =
    ACCESS_TYPES.find((a) => a.value === form.event_type)?.label || form.event_type;

  const rows: readonly { readonly label: string; readonly value: string }[] = [
    {
      label: "Inicio",
      value: `${form.startDate || "—"}${form.startTime ? ` a las ${form.startTime}` : ""}`,
    },
    {
      label: "Fin",
      value: `${form.endDate || "—"}${form.endTime ? ` a las ${form.endTime}` : ""}`,
    },
    { label: "Lugar", value: form.location || "—" },
    { label: "Capacidad", value: `${form.maxCapacity} personas` },
    {
      label: "Precio",
      value: form.pricing_model === "free"
        ? "Gratuito"
        : `₡${form.price_per_person.toLocaleString("es-CR")} (${pricingConfig.label})`,
    },
    { label: "RSVP", value: form.requiresRsvp ? "Requerido" : "Libre" },
    {
      label: "Acceso",
      value: [
        accessLabel,
        form.is_members_only ? "Solo miembros" : null,
        form.allow_guests ? `Invitados (máx. ${form.max_guests_per_family}/familia)` : null,
      ]
        .filter(Boolean)
        .join(" — "),
    },
  ];

  const extraRows: { readonly label: string; readonly value: string }[] = [];
  if (form.recurrence !== "none") {
    extraRows.push({ label: "Recurrencia", value: recurrenceConfig.label });
  }
  if (form.dress_code) {
    extraRows.push({ label: "Vestimenta", value: form.dress_code });
  }

  return (
    <div className="efs" data-testid="efs-step-review">
      {/* Summary card */}
      <Card className="efs-review-card">
        <div className="efs-review__header">
          <div
            className="efs-review__icon"
            style={{ "--review-icon-bg": catConfig.bgColor } as React.CSSProperties}
            aria-hidden="true"
          >
            {catConfig.icon}
          </div>
          <div className="efs-review__title-block">
            <h4 className="efs-review__title">{form.title || "Sin título"}</h4>
            <div className="efs-review__meta">
              <span className="efs-review__category" style={{ color: catConfig.color }}>
                {catConfig.label}
              </span>
              <span className="efs-review__dot" aria-hidden="true">&middot;</span>
              <span className="efs-review__access">{accessLabel}</span>
            </div>
          </div>
        </div>

        <div className="efs-review__rows">
          {rows.map((row) => (
            <div key={row.label} className="efs-review-row">
              <span className="efs-review-row__label">{row.label}</span>
              <span className="efs-review-row__value">{row.value}</span>
            </div>
          ))}
          {extraRows.map((row) => (
            <div key={row.label} className="efs-review-row">
              <span className="efs-review-row__label">{row.label}</span>
              <span className="efs-review-row__value">{row.value}</span>
            </div>
          ))}
        </div>

        {/* HITL notice */}
        <div className="efs-hitl" data-testid="efs-hitl-notice">
          <AlertTriangle size={14} className="efs-hitl__icon" aria-hidden="true" />
          <p className="efs-hitl__text">
            La creación de eventos requiere aprobación del administrador.
            Tu solicitud será enviada a la cola de aprobaciones.
          </p>
        </div>
      </Card>

      {/* Description preview */}
      {form.description && (
        <Card className="efs-desc-card">
          <h5 className="efs-desc-card__title">Descripción</h5>
          <p className="efs-desc-card__text">{form.description}</p>
        </Card>
      )}
    </div>
  );
}