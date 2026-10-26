/**
 * FormField.tsx
 * src/shared/components/ui/FormField.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-field (wrapper), .ui-field-input (standalone input), .ui-field-select (select)
 * @keyframes   0
 * @depends     globals.css §1 tokens, lucide-react (AlertTriangle)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] AlertTriangle verified in lucide-react
 * [x] All tokens verified against globals.css §1
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Tailwind utilities → BEM CSS classes (.ui-field__*)
 * [x] font-[family-name:var(--font-ui)] → CSS font-family
 * [x] transition-all → specific properties in CSS
 * [x] focus-visible:ring-2 → CSS outline per D10-01
 * [x] backdrop-blur-[12px] without -webkit- → CSS with prefix
 * [x] border-white/[0.08] → rgba(255,255,255,0.06) consistent
 * [x] Hardcoded rgba → color-mix() in CSS
 * [x] SVG data URL in Tailwind → CSS ::after chevron
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Mutable props → readonly
 * [x] inputClass/selectClass → CSS class exports
 */

// ═══ React core ═══
import type { ReactNode } from "react";

// ═══ Third-party ═══
import { AlertTriangle } from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./FormField.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface FormFieldProps {
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly hint?: string;
  readonly children: ReactNode;
  readonly className?: string;
}


/* ═══════════════════════════════════════════════════════════════
   §2  EXPORTED CLASS CONSTANTS
   Backward-compatible: existing consumers use these as className.
   Values now point to BEM CSS classes instead of Tailwind strings.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Base styled input class for standalone <input> elements
 * that don't use the full Input.tsx component.
 * @example <input className={inputClass} />
 */
export const inputClass = "ui-field-input";

/**
 * Styled select class — extends input with chevron + cursor.
 * @example <select className={selectClass} />
 */
export const selectClass = "ui-field-input ui-field-select";


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — FormField
   Wrapper: label + required indicator + children + error/hint.
   ═══════════════════════════════════════════════════════════════ */

export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div data-testid="ui-field" className={cn("ui-field", className)}>
      <label className="ui-field__label">
        {label}
        {required && (
          <span className="ui-field__required" aria-label="obligatorio">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p className="ui-field__hint">{hint}</p>
      )}

      {error && (
        <p className="ui-field__error" role="alert">
          <AlertTriangle size={12} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}