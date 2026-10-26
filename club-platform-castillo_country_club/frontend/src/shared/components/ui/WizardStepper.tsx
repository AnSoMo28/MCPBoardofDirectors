/**
 * WizardStepper.tsx
 * src/shared/components/ui/WizardStepper.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-stepper
 * @keyframes   3 (ui-stepper-check-in, ui-stepper-glow, ui-stepper-shimmer) — in WizardStepper.css
 * @depends     globals.css §1 tokens, lucide-react (Check)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] Check icon verified in lucide-react
 * [x] All tokens verified against globals.css §1
 * [x] --color-gold-400, --color-gold-300, --color-abyss verified
 *
 * ANTI-PATTERNS REMOVED:
 * [x] framer-motion (5 instances) → CSS-only lifecycle (0KB)
 * [x] Tailwind utilities → BEM CSS
 * [x] transition: all → specific properties
 * [x] Hardcoded rgba(201,169,110,*) → color-mix()
 * [x] ease: [0.25,0.1,0.25,1] → Apple easing
 * [x] glass-stepper namespace → ui-stepper
 * [x] Non-namespaced keyframes → ui-stepper-*
 * [x] --color-abyss fallbacks → removed (token exists)
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden → added
 * [x] Missing reduced motion → CSS
 * [x] Missing print → CSS
 * [x] Missing responsive → CSS
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import type { ReactNode } from "react";

// ═══ Third-party ═══
import { Check } from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./WizardStepper.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface WizardStepDef {
  readonly label: string;
  readonly description?: string;
  readonly icon?: ReactNode;
}

export interface WizardStepperProps {
  readonly steps: readonly WizardStepDef[];
  readonly current: number;
}


/* ═══════════════════════════════════════════════════════════════
   §2  COMPONENT — WizardStepper
   Horizontal step progress with glass circles, gold active glow,
   connector shimmer, and spring-like check animation.
   CSS-only lifecycle (no framer-motion).
   ═══════════════════════════════════════════════════════════════ */

export function WizardStepper({ steps, current }: WizardStepperProps) {
  return (
    <nav
      data-testid="ui-stepper"
      aria-label="Progreso del formulario"
      className="ui-stepper"
    >
      <div
        className="ui-stepper__track"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Paso ${current + 1} de ${steps.length}: ${steps[current]?.label}`}
      >
        {steps.map((step, index) => {
          const isActive = index === current;
          const isCompleted = index < current;

          return (
            <div
              key={index}
              className="ui-stepper__step"
              style={{ "--step-index": index } as React.CSSProperties}
            >
              {/* Step circle + label */}
              <div className="ui-stepper__head">
                <div
                  className={cn(
                    "ui-stepper__circle",
                    isActive && "ui-stepper__circle--active",
                    isCompleted && "ui-stepper__circle--completed",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <span className="ui-stepper__check" aria-hidden="true">
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                  ) : step.icon ? (
                    <span className="ui-stepper__icon" aria-hidden="true">
                      {step.icon}
                    </span>
                  ) : (
                    <span className="ui-stepper__number">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Label (hidden on mobile) */}
                <div className="ui-stepper__text">
                  <p
                    className={cn(
                      "ui-stepper__label",
                      isActive && "ui-stepper__label--active",
                      isCompleted && "ui-stepper__label--completed",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="ui-stepper__desc">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector bar */}
              {index < steps.length - 1 && (
                <div className="ui-stepper__connector">
                  <div
                    className={cn(
                      "ui-stepper__connector-fill",
                      isCompleted && "ui-stepper__connector-fill--done",
                    )}
                  >
                    {isCompleted && (
                      <span className="ui-stepper__shimmer" aria-hidden="true" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}