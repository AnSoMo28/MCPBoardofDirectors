// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/AgingOutStrip.tsx
// Phase 34+ Migration — Aging Out Strip Sub-Component
// Level 6+ Agency · Production Grade
//
// "The Hourglass Corridor" — Horizontal strip of at-risk
// brackets sorted by urgency. Each shows: mini SVG ring,
// years remaining, member count. Gradient background from
// urgent (left) to less urgent (right).
//
// Original: cn() + no ARIA + no CSS import
//   → BEM .ag-aging + data-urgency + ARIA + CSS co-located
//
// PRE-WRITE VERIFICATION:
//   AgingOutRisk → ../types ✅
//   AgeBracketId → ../types ✅
//   AGE_BRACKETS → ../config ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → BEM class only
//   - Missing ARIA → role, aria-label
//   - Missing data-testid → added
//   - Missing .css import → co-located
//   - Import ../types for constants → ../config
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import type { CSSProperties } from "react";
import { Hourglass } from "lucide-react";
import { AGE_BRACKETS } from "../config";
import type { AgingOutRisk } from "../types";

import "./AgingOutStrip.css";

/* ── §1  Props ────────────────────────────────────────────── */

interface AgingOutStripProps {
  /** Aging-out risks from advisor hook */
  readonly risks: AgingOutRisk[];
}

/* ── §2  Mini Ring — Urgency Gauge ────────────────────────── */

function MiniRing({
  urgency,
  color,
}: Readonly<{
  urgency: AgingOutRisk["urgency"];
  color: string;
}>) {
  const r = 12;
  const circumference = 2 * Math.PI * r;
  const pct = urgency === "act" ? 100 : urgency === "plan" ? 50 : 15;
  const offset = circumference * (1 - pct / 100);

  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      className="ag-aging__ring"
      aria-hidden="true"
    >
      <circle
        cx="15"
        cy="15"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="2.5"
      />
      <circle
        cx="15"
        cy="15"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="ag-aging__ring-fill"
      />
    </svg>
  );
}

/* ── §3  Component ────────────────────────────────────────── */

/**
 * AgingOutStrip — "The Hourglass Corridor"
 *
 * Shows brackets with aging-out risk, sorted by urgency.
 * Only renders act + plan urgencies. Returns null if
 * no actionable risks exist.
 */
export function AgingOutStrip({ risks }: AgingOutStripProps) {
  if (risks.length === 0) return null;

  // Sort: act first, then plan, then monitor
  const sorted = [...risks].sort((a, b) => {
    const order: Record<string, number> = { act: 0, plan: 1, monitor: 2 };
    return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
  });

  // Only show act + plan
  const visible = sorted.filter(
    (r) => r.urgency === "act" || r.urgency === "plan",
  );

  if (visible.length === 0) return null;

  return (
    <div
      className="ag-aging"
      role="region"
      aria-label="Alertas de envejecimiento de cohorte"
      data-testid="ag-aging"
      data-max-urgency={visible[0].urgency}
    >
      <div className="ag-aging__header">
        <Hourglass size={14} aria-hidden="true" />
        <span>Aging-out detectado</span>
      </div>

      <div
        className="ag-aging__items"
        role="list"
        aria-label="Grupos en riesgo de envejecimiento"
      >
        {visible.map((risk, i) => {
          const bracket = AGE_BRACKETS.find(
            (b) => b.id === risk.bracketId,
          );
          if (!bracket) return null;

          const urgencyColor =
            risk.urgency === "act"
              ? "var(--color-red-400, #f87171)"
              : "var(--color-amber-400, #fbbf24)";

          return (
            <div
              key={risk.bracketId}
              className="ag-aging__item"
              role="listitem"
              aria-label={`${bracket.label}: ${risk.membersAtRisk} en riesgo, urgencia ${risk.urgency}`}
              data-urgency={risk.urgency}
              style={
                {
                  "--item-color": urgencyColor,
                  "--stagger-i": i,
                } as CSSProperties
              }
            >
              <MiniRing urgency={risk.urgency} color={urgencyColor} />
              <div className="ag-aging__item-info">
                <span className="ag-aging__item-label">
                  {bracket.label}
                </span>
                <span className="ag-aging__item-years">
                  ~{risk.avgYearsRemaining.toFixed(1)} años prom.
                </span>
                <span className="ag-aging__item-members">
                  {risk.membersAtRisk} en riesgo
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}