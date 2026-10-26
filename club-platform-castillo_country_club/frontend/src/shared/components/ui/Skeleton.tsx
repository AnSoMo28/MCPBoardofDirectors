/**
 * Skeleton.tsx
 * src/shared/components/ui/Skeleton.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-skeleton
 * @keyframes   2 (ui-skeleton-shimmer, ui-skeleton-sweep) — in Skeleton.css
 * @depends     globals.css §1 tokens, Card.tsx (.glass-card)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] glass-card classes verified in globals.css §4
 * [x] --color-surface-3 verified in globals.css §1
 *
 * ANTI-PATTERNS REMOVED:
 * [x] animate-pulse → namespaced ui-skeleton-shimmer keyframe
 * [x] bg-[var(--color-surface-3)] → CSS background
 * [x] h-*, w-*, mb-*, p-* Tailwind → BEM CSS modifiers
 * [x] style={{ animation: "none" }} hack → .ui-card--static
 * [x] space-y-3 → CSS gap
 * [x] Missing shimmer sweep → added premium sweep animation
 * [x] Missing stagger on lists → nth-child delays
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Mutable props → readonly
 *
 * FIXES v2.1 — Auditoría G9 (Paquete 1 · REQUEST 1 §13 #4):
 * [x] G9-11 (P0) `as React.CSSProperties` referenciaba el global UMD React
 *     SIN importarlo (el módulo solo importa type { HTMLAttributes }) →
 *     TS2686/TS2503 en build estricto ("React refers to a UMD global, but
 *     the current file is a module"). AHORA `type CSSProperties` importado
 *     de react y usado directamente.
 * [x] G9-12 (P1, lado TSX) `noAnimation` aplica la clase `ui-card--static`
 *     que ahora SÍ existe en Skeleton.css (§2.5) — antes era un no-op total.
 */

// ═══ React core ═══
import type { CSSProperties, HTMLAttributes } from "react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./Skeleton.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: "text" | "circular" | "rectangular";
}

export interface CardSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly noAnimation?: boolean;
}

export interface TableSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly rows?: number;
}


/* ═══════════════════════════════════════════════════════════════
   §2  COMPONENT — Skeleton (primitive)
   Single loading placeholder. Shimmer + sweep dual animation.
   ═══════════════════════════════════════════════════════════════ */

export function Skeleton({
  variant = "text",
  className,
  ...rest
}: SkeletonProps) {
  return (
    <div
      data-testid="ui-skeleton"
      aria-hidden="true"
      className={cn(
        "ui-skeleton",
        `ui-skeleton--${variant}`,
        className,
      )}
      {...rest}
    />
  );
}


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — CardSkeleton
   Composite skeleton mimicking a standard card layout.
   Stagger: each line animates sequentially (D2).
   ═══════════════════════════════════════════════════════════════ */

export function CardSkeleton({
  noAnimation = false,
  className,
  ...rest
}: CardSkeletonProps) {
  return (
    <div
      data-testid="ui-card-skeleton"
      aria-label="Cargando"
      role="status"
      className={cn(
        "ui-skeleton-card",
        "glass-card",
        noAnimation && "ui-card--static",
        className,
      )}
      {...rest}
    >
      <div className="ui-skeleton-card__body">
        <Skeleton variant="text" className="ui-skeleton-card__title" />
        <Skeleton variant="text" className="ui-skeleton-card__subtitle" />
        <Skeleton variant="text" className="ui-skeleton-card__metric" />
        <Skeleton variant="text" className="ui-skeleton-card__bar" />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   §4  COMPONENT — TableSkeleton
   Composite skeleton mimicking a table with header + rows.
   Stagger: each row animates sequentially (D2).
   ═══════════════════════════════════════════════════════════════ */

export function TableSkeleton({
  rows = 5,
  className,
  ...rest
}: TableSkeletonProps) {
  return (
    <div
      data-testid="ui-table-skeleton"
      aria-label="Cargando tabla"
      role="status"
      className={cn("ui-skeleton-table", className)}
      {...rest}
    >
      {/* Header skeleton */}
      <Skeleton variant="rectangular" className="ui-skeleton-table__header" />

      {/* Row skeletons — staggered via --skel-index */}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          className="ui-skeleton-table__row"
          style={{ "--skel-index": i } as CSSProperties}
        />
      ))}
    </div>
  );
}
