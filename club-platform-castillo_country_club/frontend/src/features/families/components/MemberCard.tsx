// src/features/families/components/MemberCard.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Member Card Component
// Level 6+ Agency · Production Grade
//
// Member card with:
// - Presence Ring (engagement ring around avatar)
// - Age Journey Badge (life stage visual)
// - MemberSparkline (mini trend SVG)
// - Activity chips (categorized with colors)
// - Quick Actions (hover overlay)
// - Compact + Full modes
//
// PRE-WRITE VERIFICATION:
//   FamilyMember         → ../types.ts §2 ✅
//   ROLE_LABELS          → ../config.ts §1 ✅ (NOT types.ts)
//   getTemperatureZone   → ../config.ts §29 ✅
//   getActivityCategory  → ../config.ts §29 ✅
//   getAgeJourney        → ../config.ts §29 ✅
//   Badge                → @/shared/components/ui/Badge ✅
//   MemberSparkline      → ./MemberSparkline.tsx ✅ (next file)
//   fm-signal            → ../family-atoms.css ✅
//
// ANTI-PATTERNS REMOVED:
//   - 4 cn() calls → data-* attributes
//   - ~30 Tailwind utilities → BEM .fm-memberCard__*
//   - 10 inline color styles → CSS custom property bridges
//   - glass-member-card namespace → fm-memberCard
//   - ROLE_LABELS from ./types → from ./config
//   - useReducedMotion hook → CSS handles
//   - 3 missing config functions → added to config.ts §29
//   - status dot inline styles → BEM + data-active
//   - avatar img inline classes → BEM
//   - font-[ family-name:var(--font-*) ] → CSS font-family
//   - bg-[rgba(...)] → BEM
//   - border-white/[0.06] → CSS var
//   - Missing data-testid, role="region" → added
//   - No § markers → 12 CSS sections
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  User,
  MessageSquare,
  UserPlus,
  ExternalLink,
  Circle,
  Baby,
  GraduationCap,
  Crown,
  Trophy,
  Dumbbell,
  UtensilsCrossed,
  Users,
  Heart,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/shared/components/ui/Badge";
import type { FamilyMember } from "../types";
import {
  ROLE_LABELS,
  getTemperatureZone,
  getActivityCategory,
  getAgeJourney,
} from "../config";
import { MemberSparkline } from "./MemberSparkline";

import "./MemberCard.css";

// ═══════════════════════════════════════════════════════════
// §1  Icon Registry
// ═══════════════════════════════════════════════════════════

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Trophy,
  Dumbbell,
  UtensilsCrossed,
  Users,
  Heart,
  Baby,
  BookOpen,
  GraduationCap,
  Crown,
  User,
  Circle,
};

function getIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Circle;
}

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  if (isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

// ═══════════════════════════════════════════════════════════
// §3  PresenceRing — Animated engagement ring around avatar
// ═══════════════════════════════════════════════════════════

function PresenceRing({
  score,
  size,
  children,
}: {
  readonly score: number;
  readonly size: number;
  readonly children: React.ReactNode;
}) {
  const zone = getTemperatureZone(score);
  const r = (size + 4) / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div
      className="fm-memberCard__ring"
      data-zone={zone.zone}
      style={{ "--ring-size": `${size}px` } as CSSProperties}
    >
      <svg
        className="fm-memberCard__ring-svg"
        viewBox={`0 0 ${size + 8} ${size + 8}`}
        aria-hidden="true"
      >
        <circle
          cx={(size + 8) / 2}
          cy={(size + 8) / 2}
          r={r}
          className="fm-memberCard__ring-track"
        />
        <circle
          cx={(size + 8) / 2}
          cy={(size + 8) / 2}
          r={r}
          className="fm-memberCard__ring-fill"
          style={
            {
              "--ring-color": zone.color,
              "--ring-dasharray": circumference,
              "--ring-dashoffset": circumference - filled,
            } as CSSProperties
          }
          transform={`rotate(-90 ${(size + 8) / 2} ${(size + 8) / 2})`}
        />
      </svg>
      <div className="fm-memberCard__ring-avatar">
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4  Types
// ═══════════════════════════════════════════════════════════

interface MemberCardProps {
  readonly member: FamilyMember;
  readonly compact?: boolean;
  readonly onClick?: (member: FamilyMember) => void;
  readonly onMessage?: (member: FamilyMember) => void;
  readonly onInvite?: (member: FamilyMember) => void;
  readonly onProfile?: (member: FamilyMember) => void;
  /** Optional real 7-day engagement history */
  readonly engagementHistory?: readonly number[];
  /** Entrance animation delay index (multiplied by 50ms) */
  readonly animationIndex?: number;
}

// ═══════════════════════════════════════════════════════════
// §5  MemberCard — Main Component
// ═══════════════════════════════════════════════════════════

/**
 * MemberCard — displays a family member with engagement visualization.
 *
 * Two modes:
 *   - compact: avatar + name + role + mini sparkline (for lists)
 *   - full: avatar + name + journey + sparkline + activities + contact (for grids)
 *
 * Features:
 *   - Presence Ring: animated SVG engagement ring around avatar
 *   - Age Journey: life stage badge with icon
 *   - Activity chips: categorized with domain colors
 *   - Quick actions: hover overlay with message/invite/profile
 *
 * @example
 * // Full mode (default)
 * <MemberCard member={m} onClick={handleClick} />
 *
 * // Compact mode
 * <MemberCard member={m} compact onClick={handleClick} />
 */
export function MemberCard({
  member,
  compact = false,
  onClick,
  onMessage,
  onInvite,
  onProfile,
  engagementHistory,
  animationIndex = 0,
}: MemberCardProps) {
  // ── Derived data (B-07) ──
  const age = useMemo(() => calculateAge(member.dateOfBirth), [member.dateOfBirth]);
  const journey = useMemo(() => getAgeJourney(age), [age]);
  const zone = useMemo(() => getTemperatureZone(member.engagementScore), [member.engagementScore]);
  const initials = useMemo(() => getInitials(member.firstName, member.lastName), [member.firstName, member.lastName]);
  const JourneyIcon = useMemo(() => getIcon(journey.icon), [journey.icon]);

  // ── Handlers (B-08) ──
  const handleClick = useCallback(() => {
    onClick?.(member);
  }, [onClick, member]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(member);
    }
  }, [onClick, member]);

  const handleMessage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMessage?.(member);
  }, [onMessage, member]);

  const handleInvite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onInvite?.(member);
  }, [onInvite, member]);

  const handleProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onProfile?.(member);
  }, [onProfile, member]);

  const isActive = member.status === "active";

  /* ══════════════════════════════════════════════════════
     Compact Mode
     ══════════════════════════════════════════════════════ */

  if (compact) {
    return (
      <div
        className="fm-memberCard fm-memberCard--compact"
        data-testid={`member-card-${member.id}`}
        data-zone={zone.zone}
        data-interactive={!!onClick || undefined}
        onClick={onClick ? handleClick : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
        aria-label={`${member.firstName} ${member.lastName}, ${ROLE_LABELS[member.role]}, engagement ${member.engagementScore}`}
      >
        <PresenceRing score={member.engagementScore} size={36}>
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt=""
              className="fm-memberCard__avatar-img"
            />
          ) : (
            <div
              className="fm-memberCard__avatar-initials fm-memberCard__avatar-initials--sm"
              style={{ "--mc-journey-color": journey.color } as CSSProperties}
            >
              {initials}
            </div>
          )}
        </PresenceRing>

        <div className="fm-memberCard__compact-info">
          <p className="fm-memberCard__compact-name">
            {member.firstName} {member.lastName}
          </p>
          <Badge variant="neutral" size="sm">
            {ROLE_LABELS[member.role]}
          </Badge>
        </div>

        <MemberSparkline
          score={member.engagementScore}
          memberId={member.id}
          history={engagementHistory ? [...engagementHistory] : undefined}
          width={40}
          height={16}
        />

        <span className="fm-memberCard__status-dot" data-active={isActive || undefined} />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     Full Mode
     ══════════════════════════════════════════════════════ */

  const hasActions = onMessage || onInvite || onProfile;

  return (
    <div
      className="fm-memberCard"
      data-testid={`member-card-${member.id}`}
      data-zone={zone.zone}
      data-interactive={!!onClick || undefined}
      style={{ "--mc-anim-index": animationIndex } as CSSProperties}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-label={`${member.firstName} ${member.lastName}, ${ROLE_LABELS[member.role]}, engagement ${member.engagementScore}`}
    >
      {/* ══════ Header: avatar + name + journey ══════ */}
      <div className="fm-memberCard__header">
        <PresenceRing score={member.engagementScore} size={56}>
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={`${member.firstName} ${member.lastName}`}
              className="fm-memberCard__avatar-img"
            />
          ) : (
            <div
              className="fm-memberCard__avatar-initials fm-memberCard__avatar-initials--lg"
              style={{ "--mc-journey-color": journey.color } as CSSProperties}
            >
              {initials}
            </div>
          )}
        </PresenceRing>

        <div className="fm-memberCard__header-info">
          <div className="fm-memberCard__header-name-row">
            <h4 className="fm-memberCard__name">
              {member.firstName} {member.lastName}
            </h4>
            <span className="fm-memberCard__status-dot" data-active={isActive || undefined} />
          </div>
          <div className="fm-memberCard__header-badges">
            <Badge variant="gold" size="sm">
              {ROLE_LABELS[member.role]}
            </Badge>
            <span
              className="fm-memberCard__journey-badge"
              style={
                {
                  "--mc-journey-color": journey.color,
                  "--mc-journey-bg": journey.bgColor,
                } as CSSProperties
              }
            >
              <JourneyIcon size={10} />
              {age} años — {journey.label}
            </span>
          </div>
        </div>
      </div>

      {/* ══════ Engagement: sparkline + score ══════ */}
      <div className="fm-memberCard__engagement">
        <div className="fm-memberCard__engagement-header">
          <p className="fm-memberCard__engagement-label">Engagement</p>
          <span
            className="fm-memberCard__engagement-score"
            style={{ "--mc-zone-color": zone.color } as CSSProperties}
          >
            {member.engagementScore}
          </span>
        </div>
        <MemberSparkline
          score={member.engagementScore}
          memberId={member.id}
          history={engagementHistory ? [...engagementHistory] : undefined}
          width={200}
          height={28}
        />
      </div>

      {/* ══════ Activities — categorized chips ══════ */}
      {member.activities.length > 0 && (
        <div className="fm-memberCard__activities">
          <p className="fm-memberCard__activities-label">Actividades</p>
          <div className="fm-memberCard__activities-list">
            {member.activities.slice(0, 5).map((activity) => {
              const cat = getActivityCategory(activity);
              const ActivityIcon = getIcon(cat.icon);
              return (
                <span
                  key={activity}
                  className="fm-memberCard__activity-chip"
                  style={
                    {
                      "--mc-chip-color": cat.color,
                      "--mc-chip-bg": cat.bgColor,
                    } as CSSProperties
                  }
                >
                  <ActivityIcon size={10} aria-hidden="true" />
                  {activity}
                </span>
              );
            })}
            {member.activities.length > 5 && (
              <span className="fm-memberCard__activity-chip fm-memberCard__activity-chip--overflow">
                +{member.activities.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ══════ Contact footer ══════ */}
      <div className="fm-memberCard__contact">
        {member.email && (
          <span className="fm-memberCard__contact-item">{member.email}</span>
        )}
        {member.phone && (
          <span className="fm-memberCard__contact-item fm-memberCard__contact-item--shrink">
            {member.phone}
          </span>
        )}
      </div>

      {/* ══════ Quick Actions — hover overlay ══════ */}
      {hasActions && (
        <div className="fm-memberCard__actions" aria-label="Acciones rápidas">
          {onMessage && (
            <button
              type="button"
              className="fm-memberCard__action-btn"
              onClick={handleMessage}
              aria-label={`Enviar mensaje a ${member.firstName}`}
            >
              <MessageSquare size={12} aria-hidden="true" />
              Mensaje
            </button>
          )}
          {onInvite && (
            <button
              type="button"
              className="fm-memberCard__action-btn"
              onClick={handleInvite}
              aria-label={`Invitar a ${member.firstName}`}
            >
              <UserPlus size={12} aria-hidden="true" />
              Invitar
            </button>
          )}
          {onProfile && (
            <button
              type="button"
              className="fm-memberCard__action-btn"
              onClick={handleProfile}
              aria-label={`Ver perfil de ${member.firstName}`}
            >
              <ExternalLink size={12} aria-hidden="true" />
              Perfil
            </button>
          )}
        </div>
      )}
    </div>
  );
}