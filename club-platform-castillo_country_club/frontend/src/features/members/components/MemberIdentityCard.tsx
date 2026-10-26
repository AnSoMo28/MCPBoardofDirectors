/**
 * MemberIdentityCard — The Living Identity
 * Phase 30 — Block 4.1: Who They Are
 *
 * Not a static name card. A LIVING IDENTITY that breathes with
 * the member's temperature and pulses with their state.
 *
 * The avatar wears a temperature ring. The border shifts with state.
 * Quick stats appear as micro-gauges. The card itself is alive.
 */

import { useMemo } from "react";
import { Calendar, User, Mail, Zap, Activity, Shield } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type {
  MemberIdentity,
  MemberTemperature,
  MemberState,
} from "../types";
import { MEMBER_STATE_DISPLAY } from "../types";
import { TIER_DISPLAY, type MemberTier } from "@/shared/types/domain-enums";

import "./MemberIdentityCard.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MemberIdentityCardProps {
  member: MemberIdentity;
  temperature?: MemberTemperature;
  state?: MemberState;
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  primary: "Titular",
  spouse: "Cónyuge",
  child: "Hijo/a",
  dependent: "Dependiente",
};

const TENURE_LEVELS = {
  new: { label: "Nuevo", color: "var(--color-teal-400)" },
  growing: { label: "En crecimiento", color: "var(--color-gold-300)" },
  established: { label: "Establecido", color: "var(--color-gold-400)" },
  veteran: { label: "Veterano", color: "var(--color-emerald-400)" },
} as const;

type TenureLevel = keyof typeof TENURE_LEVELS;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberIdentityCard({
  member,
  temperature,
  state,
  className,
}: MemberIdentityCardProps) {
  const memberState: MemberState = state ?? temperature?.state ?? "stable";
  const stateDisplay = MEMBER_STATE_DISPLAY[memberState];

  const tenure = useMemo(() => {
    const days = Math.floor(
      (Date.now() - new Date(member.join_date).getTime()) / 86400000,
    );
    if (days < 30)
      return { text: `${days} días`, level: "new" as TenureLevel };
    if (days < 365)
      return {
        text: `${Math.floor(days / 30)} meses`,
        level: "growing" as TenureLevel,
      };
    const y = Math.floor(days / 365);
    const m = Math.floor((days % 365) / 30);
    return {
      text: m > 0 ? `${y}a ${m}m` : `${y} año${y !== 1 ? "s" : ""}`,
      level: (y >= 5 ? "veteran" : "established") as TenureLevel,
    };
  }, [member.join_date]);

  const tenureLevel = TENURE_LEVELS[tenure.level];
  const initials = `${member.first_name[0]}${member.last_name[0]}`;
  const tier = TIER_DISPLAY[member.tier as MemberTier];

  // Temperature ring math
  const ringR = 24;
  const ringCirc = 2 * Math.PI * ringR;
  const tempValue = temperature?.composite ?? 50;
  const ringOffset = ringCirc * (1 - tempValue / 100);

  return (
    <div
      className={cn("glass-m360-identity", className)}
      data-member-state={memberState}
      data-tenure={tenure.level}
    >
      {/* Ambient glow — driven by member state */}
      <div className="glass-m360-identity__glow" />

      <div className="glass-m360-identity__content">
        {/* ── Avatar with temperature ring ── */}
        <div className="glass-m360-identity__avatar-wrap">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            className="glass-m360-identity__avatar-svg"
          >
            {/* Track */}
            <circle
              cx="28"
              cy="28"
              r={ringR}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth="2.5"
            />
            {/* Temperature arc */}
            <circle
              cx="28"
              cy="28"
              r={ringR}
              fill="none"
              stroke={stateDisplay.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 28 28)"
              className="glass-m360-identity__ring-arc"
            />
          </svg>

          {/* Avatar circle */}
          <div
            className="glass-m360-identity__avatar"
            style={{
              borderColor: tier?.color ?? "var(--color-silver-600)",
              color: tier?.color ?? "var(--color-silver-200)",
              background: tier?.bgColor ?? "transparent",
            }}
          >
            {initials}
          </div>

          {/* State micro-indicator */}
          <span
            className="glass-m360-identity__state-dot"
            style={{ background: stateDisplay.color }}
            title={stateDisplay.label}
          />
        </div>

        {/* ── Info ── */}
        <div className="glass-m360-identity__info">
          {/* Name + badges */}
          <div className="glass-m360-identity__header">
            <h2 className="glass-m360-identity__name">
              {member.first_name} {member.last_name}
            </h2>
            {tier && (
              <span
                className="glass-m360-identity__tier-badge"
                style={{ color: tier.color, background: tier.bgColor }}
              >
                {tier.label}
              </span>
            )}
            <span
              className="glass-m360-identity__state-badge"
              style={{
                color: stateDisplay.color,
                background: stateDisplay.bgColor,
              }}
            >
              {stateDisplay.icon} {stateDisplay.label}
            </span>
          </div>

          {/* Family + Role */}
          <p className="glass-m360-identity__family">
            Familia {member.family_name} ·{" "}
            {ROLE_LABELS[member.role] ?? member.role}
          </p>

          {/* Quick stats (only when temperature available) */}
          {temperature && (
            <div className="glass-m360-identity__stats">
              <div className="glass-m360-identity__stat">
                <Zap className="glass-m360-identity__stat-icon" />
                <span className="glass-m360-identity__stat-value">
                  {tempValue}
                </span>
                <span className="glass-m360-identity__stat-label">Temp</span>
              </div>
              <div className="glass-m360-identity__stat">
                <Activity className="glass-m360-identity__stat-icon" />
                <span className="glass-m360-identity__stat-value">
                  {temperature.momentum.velocity > 0.1
                    ? "↑"
                    : temperature.momentum.velocity < -0.1
                      ? "↓"
                      : "→"}
                </span>
                <span className="glass-m360-identity__stat-label">
                  Momentum
                </span>
              </div>
              <div className="glass-m360-identity__stat">
                <Shield className="glass-m360-identity__stat-icon" />
                <span className="glass-m360-identity__stat-value">
                  {Math.round(temperature.momentum.thermalMass * 100)}%
                </span>
                <span className="glass-m360-identity__stat-label">Masa</span>
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="glass-m360-identity__meta">
            <span
              className="glass-m360-identity__meta-item"
              style={{ color: tenureLevel.color }}
            >
              <Calendar className="w-3 h-3" />
              {tenure.text}
              <span className="glass-m360-identity__tenure-level">
                {tenureLevel.label}
              </span>
            </span>
            {member.age != null && (
              <span className="glass-m360-identity__meta-item">
                <User className="w-3 h-3" />
                {member.age} años
              </span>
            )}
            {member.email && (
              <span className="glass-m360-identity__meta-item glass-m360-identity__meta-item--truncate">
                <Mail className="w-3 h-3 flex-shrink-0" />
                {member.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}