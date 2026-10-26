/**
 * EmptyState.tsx
 * src/shared/components/ui/EmptyState.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-emptystate
 * @keyframes   1 (ui-emptystate-glow-pulse) — in EmptyState.css
 * @depends     globals.css §1 tokens, lucide-react (Inbox)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility NOT needed — pure BEM, no dynamic classes
 * [x] Inbox verified in lucide-react
 * [x] All tokens verified against globals.css §1
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden on decorative icon → added
 * [x] File header normalized to standard format
 */

// ═══ React core ═══
import type { ReactNode } from "react";

// ═══ Third-party ═══
import { Inbox } from "lucide-react";
import "./EmptyState.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface EmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly secondaryAction?: ReactNode;
  readonly compact?: boolean;
}


/* ═══════════════════════════════════════════════════════════════
   §2  COMPONENT — EmptyState
   Canonical empty data visualization.
   Always pair with a CTA. Never show a dead end.
   Signature: radial glow beacon behind icon circle.
   ═══════════════════════════════════════════════════════════════ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      data-testid="ui-emptystate"
      className="ui-emptystate"
      data-compact={compact}
      role="status"
      aria-label={title}
    >
      {/* Icon circle with glass treatment + glow beacon */}
      <div className="ui-emptystate__icon-circle" data-compact={compact}>
        <div className="ui-emptystate__icon-inner" aria-hidden="true">
          {icon ?? <Inbox size={compact ? 20 : 28} strokeWidth={1.5} />}
        </div>
      </div>

      {/* Title */}
      <h3 className="ui-emptystate__title" data-compact={compact}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="ui-emptystate__description" data-compact={compact}>
          {description}
        </p>
      )}

      {/* Actions — always include at least one CTA */}
      {(action || secondaryAction) && (
        <div className="ui-emptystate__actions" data-compact={compact}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}