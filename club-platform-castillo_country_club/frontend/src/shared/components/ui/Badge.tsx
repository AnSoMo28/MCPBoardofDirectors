/**
 * Badge.tsx
 * src/shared/components/ui/Badge.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-badge
 * @keyframes   0
 * @depends     globals.css §1 tokens
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] All variant tokens verified against globals.css §1
 * [x] Token reconciliation: rose-400 now #E85D6E (was #C46470 in hardcoded rgba)
 * [x] Badge typography: --font-mono, 9px/10px, weight 700 per D4-05
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Tailwind utilities → BEM CSS classes (.ui-badge__*)
 * [x] font-[family-name:var(--font-ui)] → font-family: var(--font-mono) in CSS
 * [x] font-medium (500) → font-weight: 700 per checkpoint D4-05
 * [x] text-xs (12px) → 9px per checkpoint D4-05
 * [x] Hardcoded rgba → color-mix() in CSS
 * [x] backdrop-blur-[4px] → CSS rule
 * [x] Redundant variants (default=neutral, danger=error) → consolidated
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import type { HTMLAttributes } from "react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./Badge.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   Variants consolidated: default → neutral, danger → error.
   Kept for backward compat but mapped internally.
   ═══════════════════════════════════════════════════════════════ */

export type BadgeVariant =
  | "success" | "warning" | "error" | "info"
  | "neutral" | "gold" | "sage" | "premium"
  | "default"   /* alias → neutral */
  | "danger";   /* alias → error */

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly variant?: BadgeVariant;
  readonly size?: BadgeSize;
  readonly dot?: boolean;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS — Variant normalization
   Backward-compat aliases map to canonical BEM classes.
   ═══════════════════════════════════════════════════════════════ */

function resolveVariantClass(variant: BadgeVariant): string {
  switch (variant) {
    case "default": return "ui-badge--neutral";
    case "danger":  return "ui-badge--error";
    default:        return `ui-badge--${variant}`;
  }
}


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — Badge
   Compact pill. Mono font. color-mix backgrounds.
   ═══════════════════════════════════════════════════════════════ */

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      data-testid="ui-badge"
      className={cn(
        "ui-badge",
        resolveVariantClass(variant),
        `ui-badge--${size}`,
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cn("ui-badge__dot", `ui-badge__dot--${variant === "default" ? "neutral" : variant === "danger" ? "error" : variant}`)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}