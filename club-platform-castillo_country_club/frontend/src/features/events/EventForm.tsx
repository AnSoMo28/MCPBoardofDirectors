// src/features/events/EventForm.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Form Page (Wizard)
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ef-* (event form)
// @keyframes   5 (in EventForm.css)
// @depends     shared/components/ui: Button, CardSkeleton, ScoreGauge,
//              WizardStepper (WizardStepDef type),
//              shared/components/layout: PageContainer,
//              shared/lib/utils: cn,
//              ./config: EVENT_ROUTES,
//              ./hooks/useEventForm: useEventForm, STEPS (StepDef[]),
//              ./components/EventFormSteps,
//              ./components/EventLivePreview
//
// PRE-WRITE VERIFICATION:
// [x] STEPS is readonly StepDef[] = { label: string, description: string }
// [x] WizardStepDef = { label: string, description?: string, icon?: ReactNode }
// [x] StepDef IS compatible with WizardStepDef → pass STEPS directly
// [x] EventFormData: startDate, startTime, endDate, endTime (camelCase)
// [x] EventFormData: maxCapacity, requiresRsvp (camelCase)
// [x] EventFormData: pricing_model, price_per_person (snake_case)
// [x] EventFormData: is_members_only, allow_guests (snake_case)
// [x] EventFormData: dress_code, age_groups (snake_case)
// [x] useEventForm returns containerRef for auto-focus
// [x] useEventForm does NOT return navigate
// [x] ScoreGauge → score: number, size?: number, label?: string
// [x] CardSkeleton → noAnimation?, className?, from Skeleton.tsx
// [x] EVENT_ROUTES.list verified in ./config
//
// ANTI-PATTERNS REMOVED:
// [x] `navigate` dead code → removed (not in hook return)
// [x] STEPS mapped incorrectly → pass directly (StepDef ⊆ WizardStepDef)
// [x] EventFormData fields wrong (snake_case assumed) → verified camelCase
// [x] containerRef not used → attached to step content div
// [x] ~15 Tailwind utilities → ef-* BEM classes
// [x] CSS inline (350+ lines) → co-located EventForm.css
// [x] glass-* + ef-* mixed → ef-* only
// [x] No data-testid → 6 data-testid attributes
// [x] No § markers → §0-§2
// [x] No file header → added
// [x] Hardcoded href → EVENT_ROUTES.list
// [x] No ScoreGauge → form completion confidence
// [x] No aria-label on form → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

// Shared — UI
import { Button } from "@/shared/components/ui/Button";
import { CardSkeleton } from "@/shared/components/ui/Skeleton";
import { ScoreGauge } from "@/shared/components/ui/ScoreGauge";
import { WizardStepper } from "@/shared/components/ui/WizardStepper";

// Shared — Layout
import { PageContainer } from "@/shared/components/layout/PageContainer";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Config
import { EVENT_ROUTES } from "./config";

// Feature — Hooks
import { useEventForm, STEPS } from "./hooks/useEventForm";

// Feature — Components
import {
  StepInfo,
  StepSchedule,
  StepCapacity,
  StepReview,
} from "./components/EventFormSteps";
import { EventLivePreview } from "./components/EventLivePreview";

// Icons
import {
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

// Styles
import "./EventForm.css";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Breadcrumb configs for new vs edit flows.
 * StepDef { label, description } is compatible with
 * WizardStepDef { label, description?, icon? } — no mapping needed.
 * STEPS is passed directly to WizardStepper.
 */
const BREADCRUMBS_NEW = [
  { label: "Eventos", href: EVENT_ROUTES.list },
  { label: "Nuevo evento" },
] as const;

const BREADCRUMBS_EDIT = [
  { label: "Eventos", href: EVENT_ROUTES.list },
  { label: "Editar" },
] as const;

// ═══════════════════════════════════════════════════════════
// §2 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * EventForm — multi-step wizard for creating/editing events.
 *
 * Features:
 *   - 4-step wizard: Info → Schedule → Capacity → Review
 *   - Form completion confidence gauge (ScoreGauge)
 *   - Category-reactive live preview sidebar (desktop)
 *   - Directional step transitions (CSS-only)
 *   - Category-aware section accent glow
 *   - Auto-focus on first input via containerRef
 */
export function EventForm() {
  const {
    containerRef,
    isEditing,
    step,
    stepDirection,
    form,
    errors,
    handleChange,
    handleNext,
    handleBack,
    handleSubmit,
    isLoading,
    isSubmitting,
  } = useEventForm();

  /* ── §2.1 Derived data ── */

  const breadcrumbs = isEditing ? BREADCRUMBS_EDIT : BREADCRUMBS_NEW;
  const title = isEditing ? "Editar evento" : "Nuevo evento";

  /**
   * Form completion confidence: percentage of required fields filled.
   * Drives ScoreGauge in the wizard header.
   * Fields verified against EventFormData (useEventForm.ts §1).
   */
  const formConfidence = useMemo(() => {
    const fields = [
      form.title.length > 0,
      form.category.length > 0,
      form.startDate.length > 0,
      form.endDate.length > 0,
      form.location.length > 0,
      form.maxCapacity > 0,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [form.title, form.category, form.startDate, form.endDate, form.location, form.maxCapacity]);

  /* ── §2.2 Loading skeleton ── */
  if (isLoading) {
    return (
      <PageContainer
        title={title}
        breadcrumbs={breadcrumbs}
        data-testid="ef-loading"
      >
        <div className="ef-skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </PageContainer>
    );
  }

  /* ── §2.3 Render ── */
  return (
    <PageContainer
      title={title}
      subtitle="Completá los datos en cada paso"
      breadcrumbs={breadcrumbs}
      actions={
        <ScoreGauge
          score={formConfidence}
          size={36}
          label="Completitud"
          data-testid="ef-confidence"
        />
      }
    >
      {/* Category-aware accent wrapper */}
      <div
        className={cn("ef-form", "ef-form--with-preview")}
        data-category={form.category}
        data-testid="ef-form"
      >
        {/* ── §2.4 Form column ── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) handleNext();
            else handleSubmit();
          }}
          aria-label={title}
          data-testid="ef-wizard"
        >
          {/* Wizard stepper */}
          <div className="ef-stagger" style={{"--i": 0} as React.CSSProperties}>
            <WizardStepper
              steps={STEPS}
              current={step}
            />
          </div>

          {/* Step content with directional transition + auto-focus ref */}
          <div
            ref={containerRef}
            className={cn(
              "ef-step-content",
              stepDirection === "fwd" && "ef-step-content--fwd",
              stepDirection === "bwd" && "ef-step-content--bwd",
            )}
            data-testid="ef-step-content"
          >
            {step === 0 && (
              <StepInfo form={form} errors={errors} onChange={handleChange} />
            )}
            {step === 1 && (
              <StepSchedule form={form} errors={errors} onChange={handleChange} />
            )}
            {step === 2 && (
              <StepCapacity form={form} errors={errors} onChange={handleChange} />
            )}
            {step === 3 && <StepReview form={form} />}
          </div>

          {/* ── §2.5 Navigation ── */}
          <div className="ef-nav ef-stagger" style={{"--i": 1} as React.CSSProperties} data-testid="ef-nav">
            <div>
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  icon={<ArrowLeft />}
                  aria-label="Paso anterior"
                >
                  Anterior
                </Button>
              )}
            </div>

            <div>
              {step < 3 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  icon={<ArrowRight />}
                  iconPosition="right"
                  aria-label="Siguiente paso"
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  icon={<Check />}
                  aria-label={isEditing ? "Actualizar evento" : "Crear evento"}
                  data-testid="ef-submit"
                >
                  {isEditing ? "Actualizar evento" : "Crear evento"}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* ── §2.6 Live Preview sidebar (desktop) ── */}
        <div className="ef-preview" data-testid="ef-preview">
          <EventLivePreview form={form} />
        </div>
      </div>
    </PageContainer>
  );
}