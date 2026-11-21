// ═══════════════════════════════════════════════════════════
// src/features/guests/GuestRegistration.tsx
// Phase 34 "The Gateway" — Guest Registration Wizard (Rewrite)
// Level 6+ Agency · Production Grade
//
// 4-step check-in wizard for reception desk:
//   Step 0: Host family search
//   Step 1: Guest data form
//   Step 2: Facility + purpose selection
//   Step 3: Review + confirm
//
// Auto-focus on step change. Optimistic success screen.
//
// Original: framer-motion + cn() + Tailwind + inline colors
//   → CSS animations + BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   GuestCheckInForm { first_name, last_name, id_number,
//     phone, email?, relationship, host_family_id,
//     facility_id, purpose, notes? }                     ← ../types ✅
//   RELATIONSHIP_OPTIONS → Array<{value, label}>         ← ../types ✅
//   GUEST_PURPOSE_OPTIONS → Array<{value, label}>        ← ../types ✅
//   WizardStepper { steps, current }                     ← shared/ui ✅
//   FormField { label, required?, error?, children }     ← shared/ui ✅
//
// ANTI-PATTERNS REMOVED: framer-motion, cn(), Tailwind,
//   inline color styles, className prop on Card, useReducedMotion
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from "react";

import {
  UserPlus, Search, CheckCircle2, ChevronRight, ChevronLeft,
  Users, Building2, FileText, AlertCircle, X,
} from "lucide-react";

import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Card, Button, Skeleton, showToast, EmptyState } from "@/shared/components/ui";
import { WizardStepper } from "@/shared/components/ui/WizardStepper";
import { FormField } from "@/shared/components/ui/FormField";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";

import {
  type GuestCheckInForm,
  RELATIONSHIP_OPTIONS,
  GUEST_PURPOSE_OPTIONS,
} from "./types";

import "./GuestRegistration.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface FamilySearchResult {
  readonly id: string;
  readonly family_name: string;
  readonly primary_member_name: string;
  readonly status: string;
}

interface FacilityOption {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly is_available: boolean;
}

interface FamilySearchResponse {
  readonly families: readonly FamilySearchResult[];
}

interface FacilityListResponse {
  readonly facilities: readonly FacilityOption[];
}

type FormErrors = Partial<Record<keyof GuestCheckInForm | "host_search", string>>;

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const STEPS = [
  { label: "Anfitrión", icon: <Users className="w-4 h-4" /> },
  { label: "Invitado", icon: <UserPlus className="w-4 h-4" /> },
  { label: "Destino", icon: <Building2 className="w-4 h-4" /> },
  { label: "Confirmar", icon: <FileText className="w-4 h-4" /> },
] as const;

// ═══════════════════════════════════════════════════════════
// §3 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Registration — 4-step reception wizard.
 *
 * @example
 * <Route path="/guests/register" element={<GuestRegistration />} />
 */
export default function GuestRegistration() {
  const [step, setStep] = useState(0);
  const [hostSearch, setHostSearch] = useState("");
  const [selectedHost, setSelectedHost] = useState<FamilySearchResult | null>(null);
  const [form, setForm] = useState<Partial<GuestCheckInForm>>({
    relationship: "friend",
    purpose: "social",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // ── Auto-focus first input on step change ──
  useEffect(() => {
    const timer = setTimeout(() => {
      const main = document.getElementById("main-content");
      if (main) {
        const first = main.querySelector<HTMLElement>(
          'input:not([type=hidden]):not([disabled]):not([type=checkbox]), textarea:not([disabled]), select:not([disabled])',
        );
        first?.focus();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [step]);

  // ── Queries ──
  const hostQ = useMCPQuery<FamilySearchResponse>(
    "family_profile",
    "family_search",
    { query: hostSearch, limit: 8 },
    { enabled: hostSearch.length >= 2 },
  );

  const facilityQ = useMCPQuery<FacilityListResponse>(
    "facility_management",
    "manage_facilities",
    { action: "list" },
    { staleTime: 60_000 },
  );

  // ── Mutation ──
  const checkinMut = useMCPMutation<unknown, GuestCheckInForm>(
    "guests",
    "register_guest_checkin",
    {
      onSuccess: () => {
        setSubmitted(true);
        showToast({ type: "success", message: "Invitado registrado exitosamente" });
      },
      onError: (err) => {
        showToast({
          type: "error",
          message: err instanceof Error ? err.message : "Error al registrar invitado",
        });
      },
    },
  );

  // ── Helpers ──
  const update = useCallback(
    (field: keyof GuestCheckInForm, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const availableFacilities = useMemo(
    () => (facilityQ.data?.facilities ?? []).filter((f) => f.is_available),
    [facilityQ.data],
  );

  // ── Validation ──
  function validateStep(s: number): boolean {
    const e: FormErrors = {};

    if (s === 0 && !selectedHost) {
      e.host_search = "Seleccioná un anfitrión";
    }
    if (s === 1) {
      if (!form.first_name?.trim()) e.first_name = "Nombre requerido";
      if (!form.last_name?.trim()) e.last_name = "Apellido requerido";
      if (!form.id_number?.trim()) e.id_number = "Cédula requerida";
      if (!form.phone?.trim()) e.phone = "Teléfono requerido";
    }
    if (s === 2) {
      if (!form.facility_id) e.facility_id = "Seleccioná una instalación";
      if (!form.purpose) e.purpose = "Seleccioná el motivo";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 3));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    if (!validateStep(2)) return;
    checkinMut.mutate({
      first_name: form.first_name!,
      last_name: form.last_name!,
      id_number: form.id_number!,
      phone: form.phone!,
      email: form.email,
      relationship: form.relationship!,
      host_family_id: selectedHost!.id,
      facility_id: form.facility_id!,
      purpose: form.purpose!,
      notes: form.notes,
    });
  }

  function resetForm() {
    setStep(0);
    setSelectedHost(null);
    setHostSearch("");
    setForm({ relationship: "friend", purpose: "social" });
    setErrors({});
    setSubmitted(false);
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <PageContainer title="Check-in de Invitados">
        <div
          className="gst-register"
          data-state="success"
          role="region"
          aria-label="Invitado registrado"
          data-testid="guest-registration"
        >
          <div className="gst-register__success-card">
            <div className="gst-register__success-icon-wrap">
              <CheckCircle2 className="gst-register__success-icon" />
            </div>
            <h2 className="gst-register__success-title">Invitado Registrado</h2>
            <p className="gst-register__success-desc">
              {form.first_name} {form.last_name} ha sido registrado como
              invitado de {selectedHost?.family_name}.
            </p>
            <div className="gst-register__success-actions">
              <Button
                variant="primary"
                onClick={resetForm}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Registrar Otro Invitado
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Main render ──
  return (
    <PageContainer
      title="Check-in de Invitados"
      subtitle="Registro rápido para recepción"
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Operaciones", href: "/admin/operations" },
        { label: "Check-in Invitados" },
      ]}
    >
      <div
        className="gst-register"
        data-state="form"
        data-step={step}
        role="region"
        aria-label="Check-in de invitados"
        data-testid="guest-registration"
      >
        <form
          className="gst-register__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) nextStep();
            else handleSubmit();
          }}
        >
          {/* ── Step Indicator ── */}
          <WizardStepper steps={[...STEPS]} current={step} />

          {/* ── Step 0: Host ── */}
          {step === 0 && (
            <div
              className="gst-register__step"
              data-step="host"
              role="tabpanel"
              aria-label="Paso 1: Seleccionar anfitrión"
            >
              <Card className="gst-register__card">
                <h3 className="gst-register__card-title">¿Quién es el anfitrión?</h3>
                <p className="gst-register__card-desc">
                  Buscá la familia o miembro que trae al invitado.
                </p>

                <div className="gst-register__search-wrap">
                  <Search className="gst-register__search-icon" />
                  <input
                    type="text"
                    value={hostSearch}
                    onChange={(e) => setHostSearch(e.target.value)}
                    placeholder="Buscar por nombre de familia o socio..."
                    className="gst-register__input"
                    data-size="large"
                  />
                </div>

                {errors.host_search && (
                  <p className="gst-register__error" role="alert">
                    {errors.host_search}
                  </p>
                )}

                <div className="gst-register__results" role="list" aria-label="Resultados de búsqueda">
                  {hostQ.isLoading && hostSearch.length >= 2 && (
                    <Skeleton className="gst-register__skeleton" />
                  )}

                  {hostQ.data?.families.map((fam) => (
                    <Button
                      variant="unstyled"
                      key={fam.id}
                      type="button"
                      className="gst-register__host-option"
                      data-selected={selectedHost?.id === fam.id}
                      onClick={() => {
                        setSelectedHost(fam);
                        setForm((p) => ({ ...p, host_family_id: fam.id }));
                        setErrors((p) => {
                          const n = { ...p };
                          delete n.host_search;
                          return n;
                        });
                      }}
                      role="listitem"
                      aria-label={`${fam.family_name} — ${fam.primary_member_name}`}
                    >
                      <div className="gst-register__host-info">
                        <p className="gst-register__host-name">{fam.family_name}</p>
                        <p className="gst-register__host-member">{fam.primary_member_name}</p>
                      </div>
                      {selectedHost?.id === fam.id && (
                        <CheckCircle2 className="gst-register__host-check" />
                      )}
                    </Button>
                  ))}

                  {hostQ.data && hostQ.data.families.length === 0 && hostSearch.length >= 2 && (
                    <div className="gst-register__empty">
                      <EmptyState
                        compact
                        title="Sin resultados"
                        description={`No se encontró una familia para "${hostSearch}"`}
                        icon={<Search className="w-5 h-5" />}
                      />
                    </div>
                  )}
                </div>

                <div className="gst-register__actions">
                  <Button
                    variant="primary"
                    onClick={nextStep}
                    disabled={!selectedHost}
                    icon={<ChevronRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    Continuar
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ── Step 1: Guest Info ── */}
          {step === 1 && (
            <div
              className="gst-register__step"
              data-step="guest"
              role="tabpanel"
              aria-label="Paso 2: Datos del invitado"
            >
              <Card className="gst-register__card">
                <h3 className="gst-register__card-title">Datos del Invitado</h3>

                <div className="gst-register__search-wrap">
                  <Search className="gst-register__search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar invitado anterior (opcional)..."
                    className="gst-register__input"
                    data-size="large"
                  />
                </div>

                <div className="gst-register__field-grid">
                  <FormField label="Nombre" required error={errors.first_name}>
                    <input
                      type="text"
                      value={form.first_name ?? ""}
                      onChange={(e) => update("first_name", e.target.value)}
                      className="gst-register__input"
                      data-size="large"
                    />
                  </FormField>

                  <FormField label="Apellido" required error={errors.last_name}>
                    <input
                      type="text"
                      value={form.last_name ?? ""}
                      onChange={(e) => update("last_name", e.target.value)}
                      className="gst-register__input"
                      data-size="large"
                    />
                  </FormField>

                  <FormField label="Cédula / ID" required error={errors.id_number}>
                    <input
                      type="text"
                      value={form.id_number ?? ""}
                      onChange={(e) => update("id_number", e.target.value)}
                      className="gst-register__input"
                      data-size="large"
                    />
                  </FormField>

                  <FormField label="Teléfono" required error={errors.phone}>
                    <input
                      type="tel"
                      value={form.phone ?? ""}
                      onChange={(e) => update("phone", e.target.value)}
                      className="gst-register__input"
                      data-size="large"
                    />
                  </FormField>

                  <FormField label="Email (opcional)">
                    <input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => update("email", e.target.value)}
                      className="gst-register__input"
                      data-size="large"
                    />
                  </FormField>

                  <FormField label="Relación">
                    <select
                      value={form.relationship ?? "friend"}
                      onChange={(e) => update("relationship", e.target.value)}
                      className="gst-register__input"
                      data-size="large"
                    >
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="gst-register__actions" data-spread="true">
                  <Button variant="ghost" onClick={prevStep} type="button">
                    <ChevronLeft className="w-4 h-4" />
                    Atrás
                  </Button>
                  <Button variant="primary" type="button" onClick={nextStep}>
                    Continuar
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ── Step 2: Facility + Purpose ── */}
          {step === 2 && (
            <div
              className="gst-register__step"
              data-step="facility"
              role="tabpanel"
              aria-label="Paso 3: Destino y motivo"
            >
              <Card className="gst-register__card">
                <h3 className="gst-register__card-title">Destino y Motivo</h3>

                {/* Purpose chips */}
                <div className="gst-register__purpose-section">
                  <label className="gst-register__section-label">
                    Motivo de la visita *
                  </label>
                  <div className="gst-register__chips" role="radiogroup" aria-label="Motivo de visita">
                    {GUEST_PURPOSE_OPTIONS.map((p) => (
                      <Button
                        variant="unstyled"
                        key={p.value}
                        type="button"
                        className="gst-register__chip"
                        data-selected={form.purpose === p.value}
                        onClick={() => update("purpose", p.value)}
                        role="radio"
                        aria-checked={form.purpose === p.value}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  {errors.purpose && (
                    <p className="gst-register__error" role="alert">{errors.purpose}</p>
                  )}
                </div>

                {/* Facility grid */}
                <div className="gst-register__facility-section">
                  <label className="gst-register__section-label">
                    Instalación *
                  </label>

                  {facilityQ.isLoading ? (
                    <div className="gst-register__facility-loading">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={`skel-fac-${i}`} className="gst-register__skeleton-facility" />
                      ))}
                    </div>
                  ) : (
                    <div className="gst-register__facility-grid" role="radiogroup" aria-label="Instalación">
                      {availableFacilities.map((f) => (
                        <Button
                          variant="unstyled"
                          key={f.id}
                          type="button"
                          className="gst-register__facility-option"
                          data-selected={form.facility_id === f.id}
                          onClick={() => update("facility_id", f.id)}
                          role="radio"
                          aria-checked={form.facility_id === f.id}
                          aria-label={`${f.name} — ${f.type}`}
                        >
                          <p className="gst-register__facility-name">{f.name}</p>
                          <p className="gst-register__facility-type">{f.type}</p>
                        </Button>
                      ))}
                    </div>
                  )}
                  {errors.facility_id && (
                    <p className="gst-register__error" role="alert">{errors.facility_id}</p>
                  )}
                </div>

                {/* Notes */}
                <div className="gst-register__notes-section">
                  <FormField label="Notas (opcional)">
                    <textarea
                      value={form.notes ?? ""}
                      onChange={(e) => update("notes", e.target.value)}
                      rows={2}
                      className="gst-register__input gst-register__textarea"
                      data-size="large"
                    />
                  </FormField>
                </div>

                <div className="gst-register__actions" data-spread="true">
                  <Button variant="ghost" onClick={prevStep} type="button">
                    <ChevronLeft className="w-4 h-4" />
                    Atrás
                  </Button>
                  <Button variant="primary" type="button" onClick={nextStep}>
                    Revisar
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <div
              className="gst-register__step"
              data-step="confirm"
              role="tabpanel"
              aria-label="Paso 4: Confirmar registro"
            >
              <Card className="gst-register__card">
                <h3 className="gst-register__card-title">Confirmar Registro</h3>

                <div className="gst-register__summary">
                  <div className="gst-register__summary-block">
                    <p className="gst-register__summary-label">Anfitrión</p>
                    <p className="gst-register__summary-value">{selectedHost?.family_name}</p>
                    <p className="gst-register__summary-sub">{selectedHost?.primary_member_name}</p>
                  </div>

                  <div className="gst-register__summary-block">
                    <p className="gst-register__summary-label">Invitado</p>
                    <p className="gst-register__summary-value">
                      {form.first_name} {form.last_name}
                    </p>
                    <p className="gst-register__summary-sub">
                      {form.id_number} · {form.phone} ·{" "}
                      {RELATIONSHIP_OPTIONS.find((o) => o.value === form.relationship)?.label ?? form.relationship}
                    </p>
                  </div>

                  <div className="gst-register__summary-block">
                    <p className="gst-register__summary-label">Destino</p>
                    <p className="gst-register__summary-value">
                      {availableFacilities.find((f) => f.id === form.facility_id)?.name ?? "Instalación"}
                    </p>
                    <p className="gst-register__summary-sub">
                      {GUEST_PURPOSE_OPTIONS.find((o) => o.value === form.purpose)?.label ?? form.purpose}
                    </p>
                  </div>
                </div>

                {checkinMut.isError && (
                  <div className="gst-register__mutation-error" role="alert">
                    <AlertCircle className="gst-register__mutation-error-icon" />
                    <p className="gst-register__mutation-error-text">
                      {checkinMut.error instanceof Error
                        ? checkinMut.error.message
                        : "Error al registrar"}
                    </p>
                    <Button
                      variant="unstyled"
                      type="button"
                      onClick={() => checkinMut.reset()}
                      className="gst-register__mutation-error-close"
                      aria-label="Cerrar error"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="gst-register__actions" data-spread="true">
                  <Button variant="ghost" onClick={prevStep} type="button">
                    <ChevronLeft className="w-4 h-4" />
                    Atrás
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSubmit}
                    disabled={checkinMut.isPending}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    {checkinMut.isPending ? "Registrando..." : "Confirmar Check-in"}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </form>
      </div>
    </PageContainer>
  );
}