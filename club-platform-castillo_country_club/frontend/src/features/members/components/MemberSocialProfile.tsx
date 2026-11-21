/**
 * MemberSocialProfile — Social Constellation Portrait
 * Phase 30 — Block 4.7: Who They Know + How They Connect
 *
 * Connection strength shown as mini SVG arcs, not just bars.
 * Influence score as a gauge ring.
 * Referral funnel as a visual conversion pipeline.
 * Cluster affinity with match visualization.
 * Recommended connections with shared interest tags.
 *
 * The social profile doesn't just list connections —
 * it reveals the MEMBER'S SOCIAL GRAVITY.
 */

import { useState } from "react";
import {
  Users,
  UserPlus,
  Network,
  Link2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Skeleton, EmptyState } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMemberSocialProfile } from "../hooks/useMember360MCP";
import type { MemberTemperature } from "../types";
import {
  SOCIAL_CLUSTER_DISPLAY,
  type SocialClusterType,
} from "../types";

import "./MemberSocialProfile.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MemberSocialProfileProps {
  memberId: string;
  temperature?: MemberTemperature;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const CONNECTION_TYPE_LABELS: Record<
  string,
  { label: string; icon: string }
> = {
  family: { label: "Familia", icon: "👨‍👩‍👧‍👦" },
  friend: { label: "Amigo/a", icon: "🤝" },
  co_activity: { label: "Co-actividad", icon: "🎯" },
  referral: { label: "Referido", icon: "📣" },
};

function getStrengthColor(strength: number): string {
  if (strength >= 0.8) return "var(--color-emerald-400)";
  if (strength >= 0.5) return "var(--color-teal-400)";
  if (strength >= 0.3) return "var(--color-amber-400)";
  return "var(--color-silver-500)";
}

function getStrengthLabel(strength: number): string {
  if (strength >= 0.8) return "Fuerte";
  if (strength >= 0.5) return "Media";
  if (strength >= 0.3) return "Leve";
  return "Débil";
}

function getInfluenceLevel(score: number): string {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function SocialKPI({
  label,
  value,
  sublabel,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="glass-m360-social__kpi">
      <div className="glass-m360-social__kpi-header">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="glass-m360-social__kpi-label">{label}</span>
      </div>
      <p className="glass-m360-social__kpi-value">{value}</p>
      {sublabel && (
        <p className="glass-m360-social__kpi-sub">{sublabel}</p>
      )}
    </div>
  );
}

/** Mini SVG arc showing connection strength */
function StrengthArc({
  strength,
  reduced,
}: {
  strength: number;
  reduced: boolean;
}) {
  const R = 14;
  const CIRC = 2 * Math.PI * R;
  const halfCirc = CIRC / 2;
  const offset = halfCirc - strength * halfCirc;
  const color = getStrengthColor(strength);

  return (
    <svg
      width="32"
      height="20"
      viewBox="0 0 32 20"
      className="glass-m360-social__strength-arc"
    >
      {/* Track */}
      <path
        d="M 4 18 A 12 12 0 0 1 28 18"
        fill="none"
        stroke="var(--color-surface-3)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Value */}
      <path
        d="M 4 18 A 12 12 0 0 1 28 18"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={halfCirc}
        strokeDashoffset={reduced ? offset : halfCirc}
        className={
          reduced ? "" : "glass-m360-social__strength-arc-fill"
        }
        style={reduced ? { strokeDashoffset: offset } : undefined}
      />
    </svg>
  );
}

/** Influence gauge ring */
function InfluenceGauge({
  score,
  reduced,
}: {
  score: number;
  reduced: boolean;
}) {
  const R = 20;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - score / 100);
  const color =
    score >= 70
      ? "var(--color-emerald-400)"
      : score >= 40
        ? "var(--color-teal-400)"
        : "var(--color-amber-400)";

  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      className="glass-m360-social__influence-svg"
    >
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke="var(--color-surface-3)"
        strokeWidth="3"
      />
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={reduced ? offset : CIRC}
        transform="rotate(-90 24 24)"
        className={
          reduced ? "" : "glass-m360-social__influence-arc"
        }
        style={reduced ? { strokeDashoffset: offset } : undefined}
      />
      <text
        x="24"
        y="25"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-silver-200)"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberSocialProfile({ memberId, className }: MemberSocialProfileProps) {
  const reduced = useReducedMotion();
  const { data, isLoading, isError } =
    useMemberSocialProfile(memberId);
  const [showAllConnections, setShowAllConnections] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-m360-social space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-[18px]" />
      </div>
    );
  }

  if (isError || !data) {
    return <SectionError title="Error cargando perfil social" />;
  }

  const influenceLevel = getInfluenceLevel(
    data.social_influence_score,
  );
  const maxConnections = 4;
  const visibleConnections = showAllConnections
    ? data.connections
    : data.connections.slice(0, maxConnections);

  // Referral conversion rate
  const referralRate =
    data.referrals_made > 0
      ? (data.referrals_converted / data.referrals_made) * 100
      : 0;

  return (
    <div
      className={cn("glass-m360-social", className)}
      data-influence-level={influenceLevel}
      data-cluster-count={data.cluster_membership.length}
    >
      {/* ── KPI Row ── */}
      <div className="glass-m360-social__kpis">
        <SocialKPI
          label="Conexiones"
          value={data.connections_count}
          icon={Users}
          color="var(--color-teal-400)"
        />
        <div className="glass-m360-social__kpi">
          <div className="glass-m360-social__kpi-header">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-teal-400)]" />
            <span className="glass-m360-social__kpi-label">
              Influencia
            </span>
          </div>
          <div className="glass-m360-social__influence-row">
            <InfluenceGauge
              score={data.social_influence_score}
              reduced={reduced}
            />
          </div>
        </div>
        <SocialKPI
          label="Referidos"
          value={data.referrals_made}
          sublabel={`${data.referrals_converted} convertidos`}
          icon={UserPlus}
          color="var(--color-gold-400)"
        />
        <SocialKPI
          label="Clusters"
          value={data.cluster_membership.length}
          icon={Network}
          color="var(--color-silver-300)"
        />
      </div>

      {/* ── Referral Funnel ── */}
      {data.referrals_made > 0 && (
        <div className="glass-m360-social__funnel">
          <div className="glass-m360-social__funnel-bar">
            <div
              className="glass-m360-social__funnel-bar-fill"
              style={{ width: "100%" }}
            >
              <span className="glass-m360-social__funnel-label">
                {data.referrals_made} referidos
              </span>
            </div>
          </div>
          <div className="glass-m360-social__funnel-arrow">→</div>
          <div className="glass-m360-social__funnel-bar">
            <div
              className="glass-m360-social__funnel-bar-fill glass-m360-social__funnel-bar-fill--converted"
              style={{
                width: `${Math.max(5, referralRate)}%`,
              }}
            >
              <span className="glass-m360-social__funnel-label">
                {data.referrals_converted}
              </span>
            </div>
          </div>
          <span className="glass-m360-social__funnel-rate">
            {referralRate.toFixed(0)}%
          </span>
        </div>
      )}

      {/* ── Connections List ── */}
      <div className="glass-m360-social__connections">
        <h3 className="glass-m360-social__section-title">
          <Users className="w-4 h-4 text-[var(--color-teal-400)]" />
          Conexiones ({data.connections_count})
        </h3>

        {data.connections.length === 0 ? (
          <EmptyState
            icon={
              <Heart className="w-8 h-8 text-[var(--color-teal-400)]" />
            }
            title="Sin conexiones"
            description="Este socio aún no tiene conexiones registradas en el club"
          />
        ) : (
          <>
            <div className="glass-m360-social__connection-list">
              {visibleConnections.map((conn, i) => {
                const typeInfo =
                  CONNECTION_TYPE_LABELS[conn.connection_type] ?? {
                    label: conn.connection_type,
                    icon: "👤",
                  };
                const initials = conn.connected_name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("");

                return (
                  <div
                    key={conn.connected_member_id}
                    className="glass-m360-social__connection"
                    style={
                      { "--stagger-i": i } as React.CSSProperties
                    }
                  >
                    {/* Avatar with strength arc */}
                    <div className="glass-m360-social__connection-avatar-wrap">
                      <StrengthArc
                        strength={conn.strength}
                        reduced={reduced}
                      />
                      <div className="glass-m360-social__connection-avatar">
                        {initials}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="glass-m360-social__connection-info">
                      <div className="glass-m360-social__connection-header">
                        <span className="glass-m360-social__connection-name">
                          {conn.connected_name}
                        </span>
                        <span className="glass-m360-social__connection-type">
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </div>
                      <div className="glass-m360-social__connection-meta">
                        <span
                          className="glass-m360-social__connection-strength"
                          style={{
                            color: getStrengthColor(conn.strength),
                          }}
                        >
                          {getStrengthLabel(conn.strength)}
                        </span>
                        <span className="glass-m360-social__connection-activities">
                          {conn.shared_activities} actividad
                          {conn.shared_activities !== 1 ? "es" : ""}{" "}
                          compartida
                          {conn.shared_activities !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Last interaction */}
                    {conn.last_interaction && (
                      <span className="glass-m360-social__connection-date">
                        {new Date(
                          conn.last_interaction,
                        ).toLocaleDateString("es-CR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {data.connections.length > maxConnections && (
              <Button
                variant="unstyled"
                onClick={() =>
                  setShowAllConnections(!showAllConnections)
                }
                className="glass-m360-social__toggle-all"
              >
                {showAllConnections ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> Ver{" "}
                    {data.connections.length - maxConnections} más
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* ── Clusters ── */}
      {data.cluster_membership.length > 0 && (
        <div className="glass-m360-social__clusters">
          <h3 className="glass-m360-social__section-title">
            <Network className="w-4 h-4 text-[var(--color-silver-400)]" />
            Clusters Sociales
          </h3>
          <div className="glass-m360-social__cluster-grid">
            {data.cluster_details.map((cluster, i) => {
              const display =
                SOCIAL_CLUSTER_DISPLAY[
                  cluster.cluster as SocialClusterType
                ];

              return (
                <div
                  key={cluster.cluster}
                  className="glass-m360-social__cluster"
                  style={
                    { "--stagger-i": i } as React.CSSProperties
                  }
                >
                  <div className="glass-m360-social__cluster-header">
                    <span className="glass-m360-social__cluster-icon">
                      {display?.icon ?? "👥"}
                    </span>
                    <span className="glass-m360-social__cluster-name">
                      {display?.label ?? cluster.cluster}
                    </span>
                  </div>
                  <div className="glass-m360-social__cluster-stats">
                    <div className="glass-m360-social__cluster-stat">
                      <p className="glass-m360-social__cluster-stat-value">
                        {cluster.members_count}
                      </p>
                      <p className="glass-m360-social__cluster-stat-label">
                        Miembros
                      </p>
                    </div>
                    <div className="glass-m360-social__cluster-stat">
                      <p className="glass-m360-social__cluster-stat-value">
                        {Math.round(cluster.cohesion * 100)}%
                      </p>
                      <p className="glass-m360-social__cluster-stat-label">
                        Cohesión
                      </p>
                    </div>
                    <div className="glass-m360-social__cluster-stat">
                      <p className="glass-m360-social__cluster-stat-value">
                        {Math.round(cluster.match_score * 100)}%
                      </p>
                      <p className="glass-m360-social__cluster-stat-label">
                        Match
                      </p>
                    </div>
                  </div>
                  {/* Match bar */}
                  <div className="glass-m360-social__cluster-bar-track">
                    <div
                      className="glass-m360-social__cluster-bar-fill"
                      style={{
                        width: `${Math.round(cluster.match_score * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recommended Connections ── */}
      {data.recommended_connections.length > 0 && (
        <div className="glass-m360-social__recommended">
          <h3 className="glass-m360-social__section-title">
            <Link2 className="w-4 h-4 text-[var(--color-gold-400)]" />
            Conexiones Recomendadas
          </h3>
          <div className="glass-m360-social__recommended-list">
            {data.recommended_connections.map((rec, i) => (
              <div
                key={rec.member_id}
                className="glass-m360-social__recommended-card"
                style={
                  { "--stagger-i": i } as React.CSSProperties
                }
              >
                <div className="glass-m360-social__recommended-avatar">
                  {rec.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="glass-m360-social__recommended-info">
                  <p className="glass-m360-social__recommended-name">
                    {rec.name}
                  </p>
                  <p className="glass-m360-social__recommended-reason">
                    {rec.reason}
                  </p>
                  {rec.shared_interests.length > 0 && (
                    <div className="glass-m360-social__recommended-tags">
                      {rec.shared_interests.map((interest) => (
                        <span
                          key={interest}
                          className="glass-m360-social__recommended-tag"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}