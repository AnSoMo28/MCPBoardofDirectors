/**
 * TrendIcon.tsx
 * src/shared/components/ui/TrendIcon.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-trend
 * @keyframes   0
 * @depends     globals.css §1 tokens, lucide-react (TrendingUp, TrendingDown, Minus)
 *
 * PRE-WRITE VERIFICATION:
 * [x] TrendingUp, TrendingDown, Minus verified in lucide-react
 * [x] All tokens verified against globals.css §1
 * [x] emerald-400, rose-400, silver-500 verified in §1 reconciliation
 *
 * ANTI-PATTERNS REMOVED:
 * [x] style={{ color: "var(--...)" }} → BEM CSS classes
 * [x] 3 separate returns → single render with data-attr
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden → added (decorative icon)
 * [x] Missing className → added
 * [x] Missing readonly → added
 */

// ═══ React core ═══
import { type CSSProperties } from "react";

// ═══ Third-party ═══
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./TrendIcon.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type TrendDirection = "up" | "down" | "stable";

export interface TrendIconProps {
  readonly trend: TrendDirection;
  readonly size?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const ICON_MAP: Record<TrendDirection, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — TrendIcon
   Compact trend direction indicator. Decorative by default.
   Color driven by data-trend attribute → CSS.
   ═══════════════════════════════════════════════════════════════ */

export function TrendIcon({
  trend,
  size = 14,
  className,
  style,
}: TrendIconProps) {
  const Icon = ICON_MAP[trend];

  return (
    <span
      data-testid="ui-trend"
      data-trend={trend}
      className={cn("ui-trend", className)}
      style={style}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={1.5} />
    </span>
  );
}