// shared/components/layout/SkipNavigation.tsx
// ═══════════════════════════════════════════════════════════
// WCAG 2.4.1 — Bypass Blocks (Level A)
// Hidden "skip to content" link, visible only on keyboard focus
// ═══════════════════════════════════════════════════════════

import { cn } from "@/shared/lib/utils";
import './SkipNavigation.css';
export function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only",
        "focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]",
        "focus:px-5 focus:py-2.5 focus:rounded-[var(--radius-md)]",
        "focus:bg-[var(--color-gold-400)] focus:text-[var(--color-abyss)]",
        "focus:font-semibold focus:text-sm focus:font-[family-name:var(--font-ui)]",
        "focus:shadow-[var(--shadow-elevated)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-400)] focus:ring-offset-2 focus:ring-offset-[var(--color-abyss)]",
      )}
    >
      Saltar al contenido principal
    </a>
  );
}
