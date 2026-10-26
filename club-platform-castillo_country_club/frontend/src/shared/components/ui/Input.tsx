/**
 * Input.tsx
 * src/shared/components/ui/Input.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-input
 * @keyframes   0
 * @depends     globals.css §1 tokens, lucide-react (Check, AlertCircle)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] Check, AlertCircle icons verified in lucide-react
 * [x] All tokens verified against globals.css §1
 * [x] Character counter tokens: --color-amber-400, --color-rose-400 verified
 *
 * ANTI-PATTERNS REMOVED:
 * [x] .glass-input-* namespace → .ui-input-* BEM convention
 * [x] transition: all → specific properties in CSS
 * [x] React.ReactNode (no import) → ReactNode type import
 * [x] Hardcoded rgba in focus/error/success → color-mix() in CSS
 * [x] Missing data-testid → added
 * [x] Missing readonly on props → added
 * [x] Default export → named export pattern via forwardRef function name
 */

// ═══ React core ═══
import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
} from "react";

// ═══ Third-party ═══
import { Check, AlertCircle } from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./Input.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

interface InputAction {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onClick: () => void;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly error?: string;
  readonly hint?: string;
  readonly success?: string;
  readonly icon?: ReactNode;
  readonly action?: InputAction;
}


/* ═══════════════════════════════════════════════════════════════
   §2  COMPONENT — Input
   Glass input with validation states, character count, action slot.
   ═══════════════════════════════════════════════════════════════ */

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      hint,
      success,
      icon,
      action,
      className,
      id,
      maxLength,
      value,
      ...rest
    },
    ref,
  ) {

    /* ─── §2.1  Derived ─────────────────────────────────────── */

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const currentLength = typeof value === "string" ? value.length : 0;
    const hasCharLimit = maxLength !== undefined && maxLength > 0;
    const charRatio = hasCharLimit ? currentLength / maxLength : 0;
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    const counterClass = hasCharLimit
      ? charRatio >= 1
        ? "ui-input__counter--full"
        : charRatio >= 0.9
          ? "ui-input__counter--warning"
          : ""
      : "";

    const stateClass = hasError
      ? "ui-input--error"
      : hasSuccess
        ? "ui-input--success"
        : "";

    const describedBy = hasError
      ? `${inputId}-error`
      : hasSuccess
        ? `${inputId}-success`
        : hint
          ? `${inputId}-hint`
          : undefined;


    /* ─── §2.2  Render ──────────────────────────────────────── */

    return (
      <div data-testid="ui-input" className="ui-input">

        {/* Label + Character count */}
        {(label || hasCharLimit) && (
          <div className="ui-input__label-row">
            {label && (
              <label htmlFor={inputId} className="ui-input__label">
                {label}
              </label>
            )}
            {hasCharLimit && (
              <span className={cn("ui-input__counter", counterClass)}>
                {currentLength}/{maxLength}
              </span>
            )}
          </div>
        )}

        {/* Input container */}
        <div className="ui-input__container">
          {/* Leading icon */}
          {icon && (
            <span className="ui-input__icon" aria-hidden="true">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            maxLength={maxLength}
            value={value}
            className={cn(
              "ui-input__field",
              stateClass,
              icon && "ui-input__field--has-icon",
              action && "ui-input__field--has-action",
              className,
            )}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            {...rest}
          />

          {/* Validation feedback icon */}
          {hasError && (
            <span className="ui-input__feedback ui-input__feedback--error" aria-hidden="true">
              <AlertCircle size={16} />
            </span>
          )}
          {hasSuccess && (
            <span className="ui-input__feedback ui-input__feedback--success" aria-hidden="true">
              <Check size={16} />
            </span>
          )}

          {/* Action button */}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="ui-input__action"
              aria-label={action.label}
              tabIndex={-1}
            >
              {action.icon}
            </button>
          )}
        </div>

        {/* Messages */}
        {hasError && (
          <p
            id={`${inputId}-error`}
            className="ui-input__message ui-input__message--error"
            role="alert"
          >
            <AlertCircle size={12} aria-hidden="true" />
            {error}
          </p>
        )}
        {hasSuccess && (
          <p
            id={`${inputId}-success`}
            className="ui-input__message ui-input__message--success"
          >
            <Check size={12} aria-hidden="true" />
            {success}
          </p>
        )}
        {hint && !hasError && !hasSuccess && (
          <p
            id={`${inputId}-hint`}
            className="ui-input__message ui-input__message--hint"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);