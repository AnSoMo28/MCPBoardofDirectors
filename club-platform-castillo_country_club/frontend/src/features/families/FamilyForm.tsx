// src/features/families/FamilyForm.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Family Form (3-Step Wizard)
// Level 6+ Agency · Production Grade
//
// 3-step wizard with live preview, duplicate detection,
// tier context, and frontend-only role select.
//
// PRE-WRITE VERIFICATION:
//   MemberTier, MemberRole       → ./types.ts §1 ✅
//   TIER_CONFIG, ROLE_LABELS     → ./config.ts §2,§1 ✅ (NOT types.ts)
//   useFamilyForm                → ./hooks/useFamilyForm.ts ✅
//   FamilyFormData               → ./hooks/useFamilyForm.ts ✅
//   FamilyMemberDraft            → ./hooks/useFamilyForm.ts ✅
//   PageContainer                → @/shared/components/layout/PageContainer ✅
//   showToast, Button, Badge     → @/shared/components/ui ✅
//   WizardStepper                → @/shared/components/ui/WizardStepper ✅
//   FormField                    → @/shared/components/ui/FormField ✅ (wrapper)
//
// ANTI-PATTERNS REMOVED:
//   - 5 cn() calls → data-* attributes
//   - ~40 Tailwind utilities → BEM .fm-familyForm__*
//   - 3 inline color styles → CSS custom property bridges
//   - glass-family-form__* namespace → fm-familyForm__*
//   - TIER_CONFIG/ROLE_LABELS from ./types → from ./config
//   - cn import → deleted
//   - useReducedMotion hook → deleted (CSS handles)
//   - inputClass/selectClass (Tailwind strings) → own BEM classes
//   - Inline spinner div → BEM .fm-familyForm__spinner
//   - Tailwind in StepReview member rows → BEM
//   - Missing data-testid, role="region" → added
//   - No § markers → 15 CSS sections
// ═══════════════════════════════════════════════════════════

import type { CSSProperties } from "react";
import { useNavigate } from "react-router";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button, Badge } from "@/shared/components/ui";
import { WizardStepper } from "@/shared/components/ui/WizardStepper";
import { FormField } from "@/shared/components/ui/FormField";
import {
  ArrowLeft, ArrowRight, Check, Trash2, UserPlus,
  AlertTriangle, CheckCircle2, X,
} from "lucide-react";

import type { MemberTier, MemberRole } from "./types";
import { TIER_CONFIG, ROLE_LABELS } from "./config";
import { useFamilyForm } from "./hooks/useFamilyForm";
import type { FamilyFormData, FamilyMemberDraft } from "./hooks/useFamilyForm";

import "./FamilyForm.css";

// ═══════════════════════════════════════════════════════════
// §1  Constants
// ═══════════════════════════════════════════════════════════

/** Frontend-only roles — no backend duplicates. */
const ROLE_OPTIONS: ReadonlyArray<{ readonly value: MemberRole; readonly label: string; readonly group: string }> = [
  { value: "titular", label: "Titular", group: "Principal" },
  { value: "conyuge", label: "Cónyuge", group: "Familia" },
  { value: "hijo", label: "Hijo/a", group: "Familia" },
  { value: "dependiente", label: "Dependiente", group: "Familia" },
  { value: "invitado_permanente", label: "Invitado permanente", group: "Otros" },
];

/** Tier context descriptions for selection grid. */
const TIER_CONTEXT: Record<MemberTier, string> = {
  platino: "Máximo beneficio. Ejecutivo dedicado. Acceso ilimitado.",
  oro: "Acceso prioritario. Eventos exclusivos. Descuentos premium.",
  plata: "Acceso estándar. Participación en eventos del club.",
  bronce: "Membresía de inicio. Acceso a instalaciones básicas.",
  basic: "Acceso esencial. Ideal para nuevos miembros.",
  premium: "Beneficios extendidos. Acceso preferencial.",
  vip: "Servicio personalizado. Atención exclusiva 24/7.",
};

// ═══════════════════════════════════════════════════════════
// §2  LivePreviewCard — Sidebar preview
// ═══════════════════════════════════════════════════════════

function LivePreviewCard({
  form,
  isEditing,
}: {
  readonly form: FamilyFormData;
  readonly isEditing: boolean;
}) {
  const tier = TIER_CONFIG[form.tier];
  const initials = form.familyName
    ? form.familyName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
    : "??";
  const hasName = form.familyName.trim().length > 0;
  const hasMembers = form.members.length > 0;
  const isComplete = hasName && hasMembers;

  return (
    <div
      className="fm-familyForm__preview-card"
      data-complete={isComplete || undefined}
    >
      <span className="fm-familyForm__preview-title">Vista previa</span>
      <div
        className="fm-familyForm__preview-avatar"
        style={{ "--form-tier-color": hasName ? tier.color : "var(--color-surface-3)" } as CSSProperties}
      >
        {initials}
      </div>
      <span className="fm-familyForm__preview-name">
        {form.familyName || "Nombre de la familia"}
      </span>
      <div className="fm-familyForm__preview-meta">
        <Badge
          variant={
            form.tier === "platino" ? "neutral"
            : form.tier === "oro" ? "gold"
            : form.tier === "plata" ? "info"
            : "warning"
          }
          size="sm"
        >
          {tier.label}
        </Badge>
        {hasMembers && (
          <span>
            {form.members.length} miembro{form.members.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <span
        className="fm-familyForm__preview-status"
        data-status={isEditing ? "editing" : isComplete ? "ready" : "progress"}
      >
        {isEditing ? "Editando" : isComplete ? "Lista para crear" : "En progreso"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §3  StepBasicInfo — Step 0
// ═══════════════════════════════════════════════════════════

function StepBasicInfo({
  form,
  errors,
  onChange,
}: {
  readonly form: FamilyFormData;
  readonly errors: Record<string, string>;
  readonly onChange: (field: keyof FamilyFormData, value: string) => void;
}) {
  return (
    <div className="fm-familyForm__step" data-step-panel>
      <FormField label="Nombre de la familia" required error={errors.familyName}>
        <input
          type="text"
          value={form.familyName}
          onChange={(e) => onChange("familyName", e.target.value)}
          placeholder="Ej: Familia Rodríguez Mora"
          className="fm-familyForm__input"
          data-error={!!errors.familyName || undefined}
        />
      </FormField>

      <FormField label="Nivel de membresía" required>
        <div className="fm-familyForm__tier-grid">
          {(Object.entries(TIER_CONFIG) as [MemberTier, (typeof TIER_CONFIG)[MemberTier]][]).map(
            ([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange("tier", key)}
                className="fm-familyForm__tier-card"
                data-active={form.tier === key || undefined}
                style={{ "--form-tier-color": config.color } as CSSProperties}
              >
                <span className="fm-familyForm__tier-label">{config.label}</span>
                <span className="fm-familyForm__tier-desc">
                  {TIER_CONTEXT[key]}
                </span>
                {form.tier === key && (
                  <CheckCircle2 size={16} className="fm-familyForm__tier-check" />
                )}
              </button>
            ),
          )}
        </div>
      </FormField>

      <FormField label="Dirección">
        <input
          type="text"
          value={form.address}
          onChange={(e) => onChange("address", e.target.value)}
          placeholder="Dirección del hogar principal"
          className="fm-familyForm__input"
        />
      </FormField>

      <FormField label="Notas internas">
        <textarea
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Notas visibles solo para administración..."
          rows={3}
          className="fm-familyForm__textarea"
        />
      </FormField>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4  StepMembers — Step 1
// ═══════════════════════════════════════════════════════════

function StepMembers({
  members,
  errors,
  onAdd,
  onRemove,
  onUpdate,
}: {
  readonly members: readonly FamilyMemberDraft[];
  readonly errors: Record<string, string>;
  readonly onAdd: () => void;
  readonly onRemove: (tempId: string) => void;
  readonly onUpdate: (tempId: string, field: keyof FamilyMemberDraft, value: string) => void;
}) {
  return (
    <div className="fm-familyForm__step" data-step-panel>
      {errors.members && (
        <div className="fm-familyForm__error" role="alert">
          <AlertTriangle size={16} className="fm-familyForm__error-icon" />
          <span>{errors.members}</span>
        </div>
      )}

      {members.map((member, index) => (
        <div
          key={member.tempId}
          className="fm-familyForm__member-card"
          data-titular={member.role === "titular" || undefined}
          style={{ "--member-index": index } as CSSProperties}
        >
          <div className="fm-familyForm__member-header">
            <div className="fm-familyForm__member-header-left">
              <span className="fm-familyForm__member-name">
                {member.role === "titular" ? "Titular" : `Miembro ${index + 1}`}
              </span>
              {member.role === "titular" && (
                <Badge variant="gold" size="sm">PRINCIPAL</Badge>
              )}
            </div>
            {member.role !== "titular" && (
              <Button
                type="button"
                variant="danger"
                onClick={() => onRemove(member.tempId)}
                aria-label="Eliminar miembro"
                icon={<Trash2 size={16} />}
              />
            )}
          </div>

          <div className="fm-familyForm__member-fields">
            <FormField label="Nombre" required>
              <input
                type="text"
                value={member.firstName}
                onChange={(e) => onUpdate(member.tempId, "firstName", e.target.value)}
                placeholder="Nombre"
                className="fm-familyForm__input"
              />
            </FormField>
            <FormField label="Apellido" required>
              <input
                type="text"
                value={member.lastName}
                onChange={(e) => onUpdate(member.tempId, "lastName", e.target.value)}
                placeholder="Apellido"
                className="fm-familyForm__input"
              />
            </FormField>
            <FormField label="Fecha de nacimiento" required>
              <input
                type="date"
                value={member.dateOfBirth}
                onChange={(e) => onUpdate(member.tempId, "dateOfBirth", e.target.value)}
                className="fm-familyForm__input"
              />
            </FormField>
            <FormField label="Rol">
              <select
                value={member.role}
                onChange={(e) => onUpdate(member.tempId, "role", e.target.value)}
                className="fm-familyForm__select"
              >
                <optgroup label="Principal">
                  {ROLE_OPTIONS.filter((r) => r.group === "Principal").map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Familia">
                  {ROLE_OPTIONS.filter((r) => r.group === "Familia").map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Otros">
                  {ROLE_OPTIONS.filter((r) => r.group === "Otros").map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </optgroup>
              </select>
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                value={member.email}
                onChange={(e) => onUpdate(member.tempId, "email", e.target.value)}
                placeholder="correo@ejemplo.com"
                className="fm-familyForm__input"
              />
            </FormField>
            <FormField label="Teléfono">
              <input
                type="tel"
                value={member.phone}
                onChange={(e) => onUpdate(member.tempId, "phone", e.target.value)}
                placeholder="8888-8888"
                className="fm-familyForm__input"
              />
            </FormField>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="fm-familyForm__add-member"
        onClick={onAdd}
      >
        <UserPlus size={20} />
        Agregar miembro
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5  StepReview — Step 2
// ═══════════════════════════════════════════════════════════

function StepReview({ form }: { readonly form: FamilyFormData }) {
  const tier = TIER_CONFIG[form.tier];

  return (
    <div className="fm-familyForm__step" data-step-panel>
      {/* Family data */}
      <div className="fm-familyForm__review-section">
        <h4 className="fm-familyForm__review-heading">Datos de la familia</h4>
        <div className="fm-familyForm__review-row">
          <span className="fm-familyForm__review-label">Nombre</span>
          <span className="fm-familyForm__review-value">{form.familyName}</span>
        </div>
        <div className="fm-familyForm__review-row">
          <span className="fm-familyForm__review-label">Nivel</span>
          <Badge
            variant={
              form.tier === "platino" ? "neutral"
              : form.tier === "oro" ? "gold"
              : form.tier === "plata" ? "info"
              : "warning"
            }
            size="sm"
          >
            {tier.label}
          </Badge>
        </div>
        {form.address && (
          <div className="fm-familyForm__review-row">
            <span className="fm-familyForm__review-label">Dirección</span>
            <span className="fm-familyForm__review-value">{form.address}</span>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="fm-familyForm__review-section">
        <h4 className="fm-familyForm__review-heading">
          Miembros ({form.members.length})
        </h4>
        <div className="fm-familyForm__review-members">
          {form.members.map((member) => (
            <div key={member.tempId} className="fm-familyForm__review-member">
              <div className="fm-familyForm__review-avatar">
                <span aria-hidden="true">
                  {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                </span>
              </div>
              <div className="fm-familyForm__review-member-info">
                <p className="fm-familyForm__review-member-name">
                  {member.firstName} {member.lastName}
                </p>
                <p className="fm-familyForm__review-member-detail">
                  {ROLE_LABELS[member.role as MemberRole] || member.role}
                  {member.email && ` — ${member.email}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §6  FamilyForm — Main Component
// ═══════════════════════════════════════════════════════════

/**
 * FamilyForm — 3-step intelligence-aware family wizard.
 *
 * Steps:
 *   1. Basic info (name, tier, address, notes)
 *   2. Members (role, contact, birthdate)
 *   3. Review (summary before submit)
 *
 * Features:
 *   - Live preview sidebar
 *   - Duplicate detection warning
 *   - Tier context descriptions
 *   - Frontend-only role select
 *
 * @example
 * // Route: /admin/families/new
 * // Route: /admin/families/:id/edit
 */
export default function FamilyForm() {
  useNavigate();
  const {
    step, handleNext, handleBack, steps,
    form, errors, handleFieldChange,
    handleAddMember, handleRemoveMember, handleUpdateMember,
    handleSubmit, isSubmitting,
    isEditing, loadingFamily,
    potentialDuplicate, dismissDuplicate,
  } = useFamilyForm();

  /* ── Loading ── */
  if (loadingFamily) {
    return (
      <PageContainer title={isEditing ? "Editar familia" : "Nueva familia"}>
        <div className="fm-familyForm__loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="fm-familyForm__loading-skeleton" />
          ))}
        </div>
      </PageContainer>
    );
  }

  /* ── Render ── */
  return (
    <PageContainer
      title={isEditing ? "Editar familia" : "Nueva familia"}
      subtitle="Completá los datos en cada paso"
      breadcrumbs={[
        { label: "Familias", href: "/admin/families" },
        { label: isEditing ? "Editar" : "Nueva familia" },
      ]}
    >
      <div
        className="fm-familyForm"
        data-testid="family-form"
        role="region"
        aria-label={isEditing ? "Formulario de edición de familia" : "Formulario de nueva familia"}
      >
        <div className="fm-familyForm__layout">

          {/* ══════ MAIN FORM ══════ */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 2) handleNext();
              else handleSubmit();
            }}
            noValidate
            className="fm-familyForm__form"
            aria-label={isEditing ? "Editar familia" : "Crear nueva familia"}
          >
            <WizardStepper steps={[...steps]} current={step} />

            {/* Duplicate warning */}
            {potentialDuplicate && (
              <div className="fm-familyForm__duplicate" role="alert">
                <AlertTriangle size={16} className="fm-familyForm__duplicate-icon" />
                <p className="fm-familyForm__duplicate-text">
                  Familia similar encontrada: <strong>{potentialDuplicate.familyName}</strong>.
                  ¿Es la misma familia?
                </p>
                <button
                  type="button"
                  className="fm-familyForm__duplicate-dismiss"
                  onClick={dismissDuplicate}
                  aria-label="Descartar advertencia"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Step panels */}
            <div
              key={step}
              className="fm-familyForm__panel"
              role="group"
              aria-label={`Paso ${step + 1}: ${steps[step]?.label}`}
            >
              {step === 0 && (
                <StepBasicInfo form={form} errors={errors} onChange={handleFieldChange} />
              )}
              {step === 1 && (
                <StepMembers
                  members={form.members}
                  errors={errors}
                  onAdd={handleAddMember}
                  onRemove={handleRemoveMember}
                  onUpdate={handleUpdateMember}
                />
              )}
              {step === 2 && <StepReview form={form} />}
            </div>

            {/* Navigation */}
            <div className="fm-familyForm__nav">
              <div>
                {step > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    icon={<ArrowLeft size={16} />}
                  >
                    Anterior
                  </Button>
                )}
              </div>
              <div>
                {step < 2 ? (
                  <Button
                    type="submit"
                    variant="primary"
                    icon={<ArrowRight size={16} />}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    icon={
                      isSubmitting
                        ? <div className="fm-familyForm__spinner" />
                        : <Check size={16} />
                    }
                  >
                    {isSubmitting ? "Guardando..." : isEditing ? "Actualizar familia" : "Crear familia"}
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* ══════ LIVE PREVIEW SIDEBAR ══════ */}
          <aside className="fm-familyForm__preview" aria-hidden="true">
            <LivePreviewCard form={form} isEditing={isEditing} />
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}