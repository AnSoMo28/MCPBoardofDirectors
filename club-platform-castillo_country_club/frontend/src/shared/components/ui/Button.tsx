import {
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
  forwardRef,
} from "react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import { useRipple } from "@/shared/hooks/useRipple";
import "./Button.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type ButtonVariant =
  | "primary"
  | "sage"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "unstyled";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly isLoading?: boolean;
  readonly icon?: ReactNode;
  readonly iconPosition?: "left" | "right";
  readonly fullWidth?: boolean;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS — Class mapping
   Lunar sweep variants map to globals.css §11 classes.
   ═══════════════════════════════════════════════════════════════ */

const LUNAR_VARIANT: Record<ButtonVariant, string> = {
  primary:   "lunar-btn lunar-btn--gold",
  sage:      "lunar-btn lunar-btn--emerald",
  secondary: "lunar-btn lunar-btn--silver",
  ghost:     "lunar-btn lunar-btn--silver",
  danger:    "lunar-btn lunar-btn--rose",
  success:   "lunar-btn lunar-btn--green",
  unstyled:  "",
};


/* ═══════════════════════════════════════════════════════════════
   §3  UTILITY — Ref merger
   Merges forwarded ref + ripple hook ref.
   ═══════════════════════════════════════════════════════════════ */

function mergeRefs<T>(...refs: ReadonlyArray<Ref<T> | undefined | null>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}


/* ═══════════════════════════════════════════════════════════════
   §4  COMPONENT — Button
   BEM: .ui-btn, .ui-btn--{variant}, .ui-btn--{size}
   Lunar sweep: globals.css §11 (.lunar-btn classes)
   Ripple: useRipple hook (JS-driven, CSS-animated)
   ═══════════════════════════════════════════════════════════════ */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || isLoading;
    const rippleRef = useRipple<HTMLButtonElement>(variant !== "unstyled");

    // unstyled: passthrough puro — el swap del codemod B5 es visual-neutral
    // (sites con CSS de feature propio: glass-*, BEM). Sin ui-btn classes,
    // sin ripple, sin spinner-wrap: children directo, DOM idéntico al
    // <button> original salvo el nombre del tag.
    if (variant === "unstyled") {
      return (
        <button
          ref={ref}
          disabled={isDisabled}
          className={className}
          {...rest}
        >
          {children}
        </button>
      );
    }

    return (
      <button
        ref={mergeRefs(ref, rippleRef)}
        disabled={isDisabled}
        data-testid="ui-btn"
        className={cn(
          "ui-btn",
          `ui-btn--${variant}`,
          `ui-btn--${size}`,
          LUNAR_VARIANT[variant],
          fullWidth && "ui-btn--full",
          isLoading && "ui-btn--loading",
          className,
        )}
        {...rest}
      >
        {isLoading ? (
          <span className="ui-btn__spinner" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
                opacity="0.25"
              />
              <path
                fill="currentColor"
                opacity="0.75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        ) : (
          <span className="ui-btn__content">
            {icon && iconPosition === "left" && (
              <span className="ui-btn__icon ui-btn__icon--left" aria-hidden="true">
                {icon}
              </span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className="ui-btn__icon ui-btn__icon--right" aria-hidden="true">
                {icon}
              </span>
            )}
          </span>
        )}
      </button>
    );
  },
);