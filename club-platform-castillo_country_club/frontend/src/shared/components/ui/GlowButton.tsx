/**
 * GlowButton.tsx
 * src/shared/components/ui/GlowButton.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-glowbtn
 * @keyframes   1 (ui-glowbtn-rotate) — in GlowButton.css
 * @depends     globals.css §1 tokens
 *
 * SIGNATURE COMPONENT — Rotating conic-gradient glow border
 * with mask-composite technique. The glow is the identity.
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] All tokens verified against globals.css §1
 * [x] --color-abyss verified in globals.css §1
 * [x] --color-gold-400 verified in globals.css §1
 * [x] @property --glow-angle moved to CSS file (NOT runtime injection)
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Runtime CSS injection (document.createElement("style")) → CSS file
 * [x] ~50 Tailwind utilities → BEM CSS classes (.ui-glowbtn__*)
 * [x] Inline style={{ conic-gradient, mask-composite }} → CSS with --glow-color var
 * [x] transition-all → specific properties in CSS
 * [x] font-[family-name:var(--font-ui)] → CSS font-family
 * [x] focus-visible:ring-2 → CSS outline
 * [x] bg-[rgba(13,17,23,0.70)] → CSS with tokenized value
 * [x] backdrop-blur-[8px] without -webkit- → CSS with prefix
 * [x] displayName → named function pattern
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Missing reduced motion → CSS (was only in injected style)
 * [x] Missing print → added in CSS
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  type CSSProperties,
  forwardRef,
} from "react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./GlowButton.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type GlowButtonSize = "sm" | "md" | "lg";

export interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly glowColor?: string;
  readonly speed?: number;
  readonly size?: GlowButtonSize;
}


/* ═══════════════════════════════════════════════════════════════
   §2  COMPONENT — GlowButton
   Rotating conic-gradient glow border with mask-composite.
   Dynamic props (--glow-color, --glow-speed) set via CSS vars.
   ═══════════════════════════════════════════════════════════════ */

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  function GlowButton(
    {
      children,
      glowColor = "var(--color-gold-400)",
      speed = 3,
      size = "md",
      className,
      disabled,
      style,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        data-testid="ui-glowbtn"
        disabled={disabled}
        className={cn(
          "ui-glowbtn",
          `ui-glowbtn--${size}`,
          disabled && "ui-glowbtn--disabled",
          className,
        )}
        style={{
          "--glow-color": glowColor,
          "--glow-speed": `${speed}s`,
          ...style,
        } as CSSProperties}
        {...rest}
      >
        {/* Animated glow border — conic-gradient + mask-composite */}
        <span className="ui-glowbtn__glow" aria-hidden="true" />

        {/* Content — glass surface */}
        <span className="ui-glowbtn__content">
          {children}
        </span>
      </button>
    );
  },
);