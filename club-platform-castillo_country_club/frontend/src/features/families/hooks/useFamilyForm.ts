// ═══════════════════════════════════════════════════════════
// src/features/families/hooks/useFamilyForm.ts
// Phase 34+ Migration — Family Create/Edit Wizard Hook
// Level 6+ Agency · Production Grade
//
// Owns form state, step navigation, validation, mutations,
// duplicate detection, and all handlers for the 3-step
// family wizard (General → Members → Confirm).
//
// Components consuming this hook become pure rendering.
//
// PRE-WRITE VERIFICATION:
//   useMCPQuery    → @/shared/hooks/useMCPQuery.ts ✅
//   useMCPMutation → @/shared/hooks/useMCPQuery.ts ✅ (<T, P> → useMutation<T, Error, P>)
//   showToast      → @/shared/components/ui/index.ts → ./Toast.tsx ✅
//   Family, FamilyMember, MemberTier, MemberRole → ../types.ts §1-2 ✅
//   useParams, useNavigate → react-router v6+ ✅
//
// ANTI-PATTERNS REMOVED:
//   - Mutable interfaces → readonly on all
//   - No § markers → 4 sections
//   - No PRE-WRITE VERIFICATION → header block
//   - Record<string, string> for errors → kept (acceptable for wizard)
//
// CHECKLIST: A-05, B-02, B-03, B-07, B-08
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect, useDeferredValue } from "react";
import { useParams, useNavigate } from "react-router";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";

import type {
  Family,
  MemberTier,
  MemberRole,
} from "../types";

// ═══════════════════════════════════════════════════════════
// §1  Local Types
// ═══════════════════════════════════════════════════════════

/** Wizard step index (0 = general, 1 = members, 2 = confirm) */
export type WizardStep = 0 | 1 | 2;

/** Draft member being added/edited in the wizard */
export interface FamilyMemberDraft {
  readonly tempId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly email: string;
  readonly phone: string;
  readonly role: MemberRole;
}

/** Wizard form data — mutable via setForm internally, readonly for consumers */
export type FamilyFormData = {
  readonly familyName: string;
  readonly tier: MemberTier;
  readonly address: string;
  readonly notes: string;
  readonly members: readonly FamilyMemberDraft[];
}

/** Wizard step definition */
export interface StepDef {
  readonly label: string;
  readonly description: string;
}

/** Return type for useFamilyForm */
export interface UseFamilyFormReturn {
  // Navigation
  readonly step: WizardStep;
  readonly setStep: (s: WizardStep) => void;
  readonly handleNext: () => void;
  readonly handleBack: () => void;
  readonly steps: readonly StepDef[];

  // Form state
  readonly form: FamilyFormData;
  readonly errors: Readonly<Record<string, string>>;
  readonly handleFieldChange: (field: keyof FamilyFormData, value: string) => void;

  // Members
  readonly handleAddMember: () => void;
  readonly handleRemoveMember: (tempId: string) => void;
  readonly handleUpdateMember: (tempId: string, field: keyof FamilyMemberDraft, value: string) => void;

  // Submission
  readonly handleSubmit: () => void;
  readonly isSubmitting: boolean;

  // Edit mode
  readonly isEditing: boolean;
  readonly loadingFamily: boolean;

  // Duplicate detection
  readonly potentialDuplicate: Family | null;
  readonly dismissDuplicate: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2  Constants
// ═══════════════════════════════════════════════════════════

const EMPTY_FORM: FamilyFormData = {
  familyName: "",
  tier: "oro",
  address: "",
  notes: "",
  members: [],
};

const STEPS: readonly StepDef[] = [
  { label: "Datos generales", description: "Nombre, nivel y dirección" },
  { label: "Miembros", description: "Titular y dependientes" },
  { label: "Confirmación", description: "Revisar y enviar" },
];

// ═══════════════════════════════════════════════════════════
// §3  Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Create an empty member draft with a unique tempId.
 * Uses crypto.randomUUID() — available in all modern browsers.
 */
function createEmptyMember(): FamilyMemberDraft {
  return {
    tempId: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    role: "titular",
  };
}

// ═══════════════════════════════════════════════════════════
// §4  Hook
// ═══════════════════════════════════════════════════════════

/**
 * Family Create/Edit Wizard hook.
 *
 * Owns the complete wizard pipeline:
 *   1. Form state → field changes, member add/remove/update
 *   2. Step navigation → validation before advancing
 *   3. Duplicate detection → NL search as user types family name
 *   4. Mutations → create/update via MCP with success/error toasts
 *   5. Edit mode → loads existing family data into form
 *
 * @example
 * const form = useFamilyForm();
 * <WizardStepper steps={form.steps} current={form.step} />
 * <button onClick={form.handleNext}>Siguiente</button>
 */
export function useFamilyForm(): UseFamilyFormReturn {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  // ── State ──
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FamilyFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // ── Load family for edit mode ──
  const { data: familyData, isLoading: loadingFamily } = useMCPQuery<{
    data: { family: Family };
  }>(
    "family_profile",
    "family_get_profile",
    { familyId: id },
    { enabled: isEditing },
  );

  useEffect(() => {
    if (!familyData?.data?.family) return;
    const f = familyData.data.family;
    setForm({
      familyName: f.familyName,
      tier: f.tier,
      address: f.address ?? "",
      notes: f.notes ?? "",
      members: f.members.map((m) => ({
        tempId: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        dateOfBirth: m.dateOfBirth,
        email: m.email,
        phone: m.phone,
        role: m.role,
      })),
    });
  }, [familyData]);

  // ── Duplicate detection (create mode only) ──
  const deferredName = useDeferredValue(form.familyName);

  const { data: dupSearchData } = useMCPQuery<{ families: Family[] }>(
    "family_profile",
    "family_search",
    { query: deferredName, limit: 5 },
    { enabled: !isEditing && deferredName.trim().length > 3 },
  );

  const potentialDuplicate = useMemo((): Family | null => {
    if (isEditing || duplicateDismissed || !dupSearchData?.families) return null;
    const search = form.familyName.toLowerCase().trim();
    if (search.length < 3) return null;
    return (
      dupSearchData.families.find(
        (f) => f.familyName.toLowerCase().trim() === search,
      ) ?? null
    );
  }, [isEditing, duplicateDismissed, dupSearchData, form.familyName]);

  const dismissDuplicate = useCallback(
    () => setDuplicateDismissed(true),
    [],
  );

  // ── Mutations ──
  const createFamily = useMCPMutation<
    { data: { id?: string; status?: string; request_id?: string } },
    FamilyFormData
  >("family_profile", "family_create_profile", {
    onSuccess: (data) => {
      const payload = data?.data;
      if (payload?.status === "pending_approval") {
        showToast({
          type: "info",
          message: "Solicitud enviada — pendiente de aprobación por la directiva",
        });
        navigate("/admin/families");
        return;
      }
      showToast({ type: "success", message: "Familia creada correctamente" });
      navigate(`/admin/families/${payload?.id ?? ""}`);
    },
    onError: (err: Error) => {
      showToast({
        type: "error",
        message: err.message || "Error al crear familia",
      });
    },
  });

  const updateFamily = useMCPMutation<
    { data: { id?: string; status?: string; request_id?: string } },
    { familyId: string } & FamilyFormData
  >("family_profile", "family_update_profile", {
    onSuccess: (data) => {
      const payload = data?.data;
      if (payload?.status === "pending_approval") {
        showToast({
          type: "info",
          message: "Actualización enviada — pendiente de aprobación",
        });
        navigate("/admin/families");
        return;
      }
      showToast({
        type: "success",
        message: "Familia actualizada correctamente",
      });
      navigate(`/admin/families/${id}`);
    },
    onError: (err: Error) => {
      showToast({
        type: "error",
        message: err.message || "Error al actualizar familia",
      });
    },
  });

  const isSubmitting = createFamily.isPending || updateFamily.isPending;

  // ── Handlers ──

  const handleFieldChange = useCallback(
    (field: keyof FamilyFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      if (field === "familyName") setDuplicateDismissed(false);
    },
    [],
  );

  const handleAddMember = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      members: [...prev.members, createEmptyMember()],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.members;
      return next;
    });
  }, []);

  const handleRemoveMember = useCallback((tempId: string) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.tempId !== tempId),
    }));
  }, []);

  const handleUpdateMember = useCallback(
    (tempId: string, field: keyof FamilyMemberDraft, value: string) => {
      setForm((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.tempId === tempId ? { ...m, [field]: value } : m,
        ),
      }));
    },
    [],
  );

  // ── Validation ──
  const validateStep = useCallback(
    (stepNum: WizardStep): boolean => {
      const newErrors: Record<string, string> = {};

      if (stepNum === 0) {
        if (!form.familyName.trim()) {
          newErrors.familyName = "El nombre de la familia es obligatorio";
        }
      }

      if (stepNum === 1) {
        if (form.members.length === 0) {
          newErrors.members = "Agregá al menos un miembro";
        } else {
          const hasTitular = form.members.some((m) => m.role === "titular");
          if (!hasTitular) {
            newErrors.members = "La familia debe tener un titular";
          }
          const incomplete = form.members.some(
            (m) => !m.firstName.trim() || !m.lastName.trim(),
          );
          if (incomplete) {
            newErrors.members =
              "Todos los miembros deben tener nombre y apellido";
          }
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [form],
  );

  // ── Navigation ──
  const handleNext = useCallback(() => {
    if (validateStep(step) && step < 2) {
      setStep((s) => (s + 1) as WizardStep);
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => (s - 1) as WizardStep);
  }, [step]);

  // ── Submit ──
  const handleSubmit = useCallback(() => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (isEditing && id) {
      updateFamily.mutate({ familyId: id, ...form });
    } else {
      createFamily.mutate(form);
    }
  }, [form, id, isEditing, validateStep, createFamily, updateFamily]);

  // ── Auto-focus first input on step change ──
  useEffect(() => {
    const timer = setTimeout(() => {
      const panel = document.querySelector("[data-step-panel]");
      if (panel) {
        const first = panel.querySelector<HTMLElement>(
          "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])",
        );
        first?.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [step]);

  return {
    // Navigation
    step,
    setStep,
    handleNext,
    handleBack,
    steps: STEPS,
    // Form state
    form,
    errors,
    handleFieldChange,
    // Members
    handleAddMember,
    handleRemoveMember,
    handleUpdateMember,
    // Submission
    handleSubmit,
    isSubmitting,
    // Edit mode
    isEditing,
    loadingFamily,
    // Duplicate detection
    potentialDuplicate,
    dismissDuplicate,
  };
}