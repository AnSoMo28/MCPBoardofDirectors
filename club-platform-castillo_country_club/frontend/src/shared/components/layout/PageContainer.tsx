// src/shared/components/layout/PageContainer.tsx
// ═══════════════════════════════════════════════════════════
// Shared Layout — Page Container
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   pg-* (page container)
// @keyframes   0
// @depends     globals.css §1 tokens, shared/components/ui/Button,
//              react-router (Link)
//
// Standard page wrapper for all feature pages.
// Provides: breadcrumbs, page title, subtitle, action buttons,
// and sr-only live region for page change announcements.
//
// Usage:
//   <PageContainer
//     title="Eventos"
//     subtitle="Calendario mensual"
//     breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Eventos" }]}
//     actions={<Button>Nuevo</Button>}
//   >
//     {content}
//   </PageContainer>
//
// ANTI-PATTERNS REMOVED:
// [x] 25+ Tailwind utilities → pg-* BEM classes
// [x] font-[family-name:var(--font-display)] → CSS font-family
// [x] font-[family-name:var(--font-body)] → CSS font-family
// [x] text-[var(--color-silver-*)] → CSS color tokens
// [x] space-y-5 sm:space-y-6 → CSS gap + responsive
// [x] flex items-center gap-* → CSS flex in BEM
// [x] No data-testid → added
// [x] No co-located CSS → created PageContainer.css
// [x] No print styles → added
// [x] No § markers → §0-§2
//
// FIXES v2.1 — Auditoría G9 (Paquete 1 · REQUEST 1 §13 #6):
// [x] G9-15 (P3) La unión de variantes de PageAction duplicaba manualmente
//     la de Button → deriva silenciosa si Button añade una variante.
//     AHORA `ComponentProps<typeof Button>["variant"]` — única fuente.
//     BreadcrumbItem exportado (API pública del paquete).
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";

// Shared — UI
import { Button } from "@/shared/components/ui";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Styles
import "./PageContainer.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/**
 * G9-15: la variante se deriva del contrato REAL de Button —
 * imposible que derive silenciosamente.
 */
type ButtonVariant = ComponentProps<typeof Button>["variant"];

/** Configuration for a single breadcrumb item. */
export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

/** Configuration for an action button rendered in the page header. */
export interface PageAction {
  readonly label: string;
  readonly onClick: () => void;
  readonly variant?: ButtonVariant;
  readonly icon?: ReactNode;
}

interface PageContainerProps {
  /** Page title rendered as h1 */
  readonly title: string;
  /** Optional subtitle below the title */
  readonly subtitle?: string;
  /** Breadcrumb navigation trail */
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  /** Header actions: JSX directly OR config array (auto-renders as Button) */
  readonly actions?: ReactNode | readonly PageAction[];
  /** Page content */
  readonly children: ReactNode;
  /** Additional CSS class on root element */
  readonly className?: string;
}

// ═══════════════════════════════════════════════════════════
// §2 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Standard page container — provides consistent page layout
 * with breadcrumbs, title, actions, and accessibility announcements.
 */

function isPageActionArray(
  actions: ReactNode | readonly PageAction[],
): actions is readonly PageAction[] {
  return Array.isArray(actions);
}

/** Renders PageAction[] config as Button components. */
function renderPageActions(actions: readonly PageAction[]): ReactNode {
  return actions.map((action, i) => (
    <Button
      key={i}
      variant={action.variant ?? "secondary"}
      size="sm"
      onClick={action.onClick}
      icon={action.icon}
    >
      {action.label}
    </Button>
  ));
}
export function PageContainer({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn("pg-container", className)}
      data-testid="pg-container"
    >
      {/* ── §2.1 Screen reader announcement ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pg-sr-only"
      >
        Página cargada: {title}
      </div>

      {/* ── §2.2 Breadcrumbs ── */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="pg-breadcrumbs"
          data-testid="pg-breadcrumbs"
        >
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="pg-breadcrumbs__item">
                {i > 0 && (
                  <span className="pg-breadcrumbs__separator" aria-hidden="true">
                    /
                  </span>
                )}
                {crumb.href && !isLast ? (
                  <Link to={crumb.href} className="pg-breadcrumbs__link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "pg-breadcrumbs__text",
                      isLast && "pg-breadcrumbs__text--current",
                    )}
                    {...(isLast ? { "aria-current": "page" } : {})}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* ── §2.3 Header ── */}
      <div className="pg-header" data-testid="pg-header">
        <div className="pg-header__title-group">
          <h1 className="pg-header__title">{title}</h1>
          {subtitle && (
            <p className="pg-header__subtitle">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="pg-header__actions" data-testid="pg-actions">
            {isPageActionArray(actions)
              ? renderPageActions(actions)
              : actions}
          </div>
        )}
      </div>

      {/* ── §2.4 Content ── */}
      <div className="pg-content" data-testid="pg-content">
        {children}
      </div>
    </div>
  );
}
