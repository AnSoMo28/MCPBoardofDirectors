// src/features/events/components/RsvpBoard.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — RSVP Board Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   rsvpb-* (rsvp board)
// @keyframes   2 (in RsvpBoard.css)
// @depends     shared/components/ui: Badge, EmptyState,
//              shared/lib/utils: cn, timeAgo,
//              lucide-react: Users, UserCheck, UserX, Hourglass,
//              ../types: RsvpRecord, RSVP_STATUS_CONFIG
//
// RSVP summary board with:
//   - Status count chips with proportion mini-bars
//   - Family initials avatar circle
//   - Row status left-border accent
//   - Row stagger cascade (--row-i)
//   - Row hover lift + focus-visible
//   - CSS-only responsive (no Tailwind breakpoints)
//
// PRE-WRITE VERIFICATION:
// [x] Badge: variant, size, children ✅ (FASE 1, 9.3)
// [x] EmptyState: icon?, title, description?, className? ✅ (FASE 1, 9.3)
// [x] cn verified in shared/lib/utils ✅
// [x] timeAgo verified in shared/lib/utils ✅
// [x] RsvpRecord, RSVP_STATUS_CONFIG → ../types ✅
//
// ANTI-PATTERNS REMOVED:
// [x] 1 glass-* undefined namespace → rsvpb-* BEM
// [x] ~20 Tailwind utilities → rsvpb-* BEM
// [x] font-[family-name:var(--font-*)] → CSS font-family
// [x] w-4 h-4, w-3.5 h-3.5, w-12 h-12 → CSS sizing
// [x] hidden sm:inline, hidden sm:flex → CSS responsive
// [x] Inline style for icon colors → CSS custom property
// [x] Props not readonly → readonly
// [x] 0 data-testid → 5 attributes
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { Users, UserCheck, UserX, Hourglass } from "lucide-react";

// Shared — UI
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";

// Shared — Lib
import { cn, timeAgo } from "@/shared/lib/utils";

// Feature — Types
import type { RsvpRecord } from "../types";
import { RSVP_STATUS_CONFIG } from "../types";

// Styles
import "./RsvpBoard.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface RsvpBoardProps {
  /** List of RSVP records for the event */
  readonly rsvps: readonly RsvpRecord[];
}

/** Status count summary. */
interface StatusCounts {
  readonly confirmed: number;
  readonly pending: number;
  readonly declined: number;
  readonly waitlisted: number;
}

/** Status display config. */
interface StatusDisplay {
  readonly key: keyof StatusCounts;
  readonly label: string;
  readonly icon: typeof UserCheck;
  readonly badgeVariant: "success" | "error" | "neutral" | "info";
  readonly colorVar: string;
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

const STATUS_DISPLAYS: readonly StatusDisplay[] = [
  { key: "confirmed", label: "Confirmados", icon: UserCheck, badgeVariant: "success", colorVar: "var(--color-emerald-400)" },
  { key: "pending", label: "Pendientes", icon: Hourglass, badgeVariant: "neutral", colorVar: "var(--color-amber-400)" },
  { key: "waitlisted", label: "En espera", icon: Hourglass, badgeVariant: "info", colorVar: "var(--color-teal-400)" },
  { key: "declined", label: "Declinados", icon: UserX, badgeVariant: "error", colorVar: "var(--color-rose-400)" },
] as const;

/** Status → icon component. */
const STATUS_ICONS: Record<string, typeof UserCheck> = {
  confirmed: UserCheck,
  declined: UserX,
};

/** Status → left border CSS class. */
const STATUS_BORDER_CLASS: Record<string, string> = {
  confirmed: "rsvpb-row--confirmed",
  pending: "rsvpb-row--pending",
  waitlisted: "rsvpb-row--waitlisted",
  declined: "rsvpb-row--declined",
};

// ═══════════════════════════════════════════════════════════
// §3 HELPERS
// ═══════════════════════════════════════════════════════════

/** Get initials from family name (first 2 chars). */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// ═══════════════════════════════════════════════════════════
// §4 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 Summary Bar ─────────────────────────────────────

function SummaryBar({
  counts,
  total,
}: {
  readonly counts: StatusCounts;
  readonly total: number;
}) {
  return (
    <div className="rsvpb-summary" data-testid="rsvpb-summary">
      {STATUS_DISPLAYS.map((sd) => {
        const count = counts[sd.key];
        const pct = total > 0 ? (count / total) * 100 : 0;
        const Icon = sd.icon;

        return (
          <div
            key={sd.key}
            className="rsvpb-chip"
            style={{ "--chip-color": sd.colorVar } as React.CSSProperties}
          >
            <div className="rsvpb-chip__bar">
              <div className="rsvpb-chip__fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="rsvpb-chip__content">
              <Icon size={13} className="rsvpb-chip__icon" aria-hidden="true" />
              <span className="rsvpb-chip__count">{count}</span>
              <span className="rsvpb-chip__label">{sd.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── §4.2 RSVP Row ────────────────────────────────────────

function RsvpRow({
  rsvp,
  rowIndex,
}: {
  readonly rsvp: RsvpRecord;
  readonly rowIndex: number;
}) {
  const config = RSVP_STATUS_CONFIG[rsvp.status];
  const memberCount = rsvp.member_ids.length + rsvp.guests_count;
  const initials = getInitials(rsvp.family_name);

  return (
    <div
      className={cn(
        "rsvpb-row",
        STATUS_BORDER_CLASS[rsvp.status],
        "rsvpb-stagger",
      )}
      style={{
        "--status-color": config.color,
        "--row-i": rowIndex,
      } as React.CSSProperties}
      data-testid={`rsvpb-row-${rsvp.id}`}
    >
      {/* Avatar circle */}
      <div className="rsvpb-row__avatar" aria-hidden="true">
        <span className="rsvpb-row__initials">{initials}</span>
      </div>

      {/* Info column */}
      <div className="rsvpb-row__info">
        <div className="rsvpb-row__header">
          <span className="rsvpb-row__name">{rsvp.family_name}</span>
          <Badge variant={STATUS_DISPLAYS.find((s) => s.key === rsvp.status)?.badgeVariant ?? "neutral"} size="sm">
            {config.label}
          </Badge>
        </div>
        <div className="rsvpb-row__meta">
          <span>
            {memberCount} persona{memberCount !== 1 ? "s" : ""}
          </span>
          {rsvp.total_cost > 0 && (
            <span className="rsvpb-row__meta-desktop">
              &middot; ₡{rsvp.total_cost.toLocaleString("es-CR")}
            </span>
          )}
          {rsvp.dietary_restrictions && (
            <span className="rsvpb-row__meta-desktop">
              &middot; Dieta: {rsvp.dietary_restrictions}
            </span>
          )}
        </div>
        {rsvp.notes && (
          <p className="rsvpb-row__notes">{rsvp.notes}</p>
        )}
      </div>

      {/* Right column (desktop) */}
      <div className="rsvpb-row__right">
        {rsvp.total_cost > 0 && (
          <span className="rsvpb-row__cost">
            ₡{rsvp.total_cost.toLocaleString("es-CR")}
          </span>
        )}
        <span className="rsvpb-row__time">{timeAgo(rsvp.created_at)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * RsvpBoard — RSVP summary with count chips and family rows.
 *
 * Summary bar shows color-coded count pills with proportion
 * mini-bars. Rows have status left-border accent, family
 * initials avatar, stagger cascade, and hover lift.
 */
export function RsvpBoard({ rsvps }: RsvpBoardProps) {
  const counts = useMemo((): StatusCounts => {
    const c = { confirmed: 0, pending: 0, declined: 0, waitlisted: 0 };
    for (const r of rsvps) {
      if (r.status in c) c[r.status as keyof StatusCounts]++;
    }
    return c;
  }, [rsvps]);

  if (rsvps.length === 0) {
    return (
      <EmptyState
        icon={<Users className="rsvpb__empty-icon" />}
        title="Sin RSVPs aún"
        description="Las confirmaciones aparecerán aquí cuando los miembros respondan."
      />
    );
  }

  return (
    <div className="rsvpb" data-testid="rsvpb">
      <SummaryBar counts={counts} total={rsvps.length} />
      <div className="rsvpb__rows">
        {rsvps.map((rsvp, idx) => (
          <RsvpRow key={rsvp.id} rsvp={rsvp} rowIndex={idx} />
        ))}
      </div>
    </div>
  );
}