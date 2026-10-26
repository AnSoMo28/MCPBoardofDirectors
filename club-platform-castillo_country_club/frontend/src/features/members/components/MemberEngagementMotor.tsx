/**
 * MemberEngagementMotor — Engagement Propulsion Engine
 * Phase 30 — Block 4.10: How To Move Them Forward
 *
 * Not a proposal list. An ENGAGEMENT PROPULSION ENGINE.
 * Each proposal has priority urgency, type visualization,
 * confidence bar, impact indicator, expiry warning.
 * Cross-domain signals as ambient intelligence.
 * Filter pills with domain colors.
 *
 * The motor doesn't just propose — it PRIORIZES, EXPLAINS,
 * and shows WHY each action matters.
 */

import { useState, useMemo } from "react";
import {
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Skeleton, EmptyState } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMemberEngagementProposals } from "../hooks/useMember360MCP";
import type { MemberTemperature, ActivityDomain } from "../types";
import {
  ENGAGEMENT_PROPOSAL_TYPE_DISPLAY,
  getDomainLabel,
  getDomainIcon,
  type EngagementProposalType,
} from "../types";

import "./MemberEngagementMotor.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MemberEngagementMotorProps {
  memberId: string;
  temperature?: MemberTemperature;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const PRIORITY_STYLE: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  high: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    label: "ALTA",
  },
  medium: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    label: "MEDIA",
  },
  low: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    label: "BAJA",
  },
};

const IMPACT_STYLE: Record<
  string,
  { color: string; label: string }
> = {
  high: { color: "var(--color-rose-400)", label: "Alto" },
  medium: { color: "var(--color-amber-400)", label: "Medio" },
  low: { color: "var(--color-teal-400)", label: "Bajo" },
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function isExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const daysLeft =
    (new Date(expiresAt).getTime() - Date.now()) / 86400000;
  return daysLeft > 0 && daysLeft <= 7;
}

function daysUntilExpiry(expiresAt: string): number {
  return Math.max(
    0,
    Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / 86400000,
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function FilterPill({
  label,
  active,
  icon,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  icon?: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "glass-m360-motor__pill",
        active && "glass-m360-motor__pill--active",
      )}
      style={
        active
          ? {
              color: color ?? "var(--color-gold-400)",
              background: `color-mix(in srgb, ${color ?? "var(--color-gold-400)"} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${color ?? "var(--color-gold-400)"} 25%, transparent)`,
            }
          : undefined
      }
    >
      {icon ? `${icon} ` : ""}
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberEngagementMotor({ memberId, className }: MemberEngagementMotorProps) {
  useReducedMotion();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useMemberEngagementProposals(memberId, true);

  const [typeFilter, setTypeFilter] = useState<string | null>(
    null,
  );
  const [expandedProposal, setExpandedProposal] = useState<
    string | null
  >(null);

  const filteredProposals = useMemo(() => {
    if (!data?.proposals) return [];
    if (!typeFilter) return data.proposals;
    return data.proposals.filter(
      (p) => p.proposal_type === typeFilter,
    );
  }, [data?.proposals, typeFilter]);

  const activeTypes = useMemo(() => {
    if (!data?.proposals) return [];
    const types = new Set(
      data.proposals.map((p) => p.proposal_type),
    );
    return Array.from(types);
  }, [data?.proposals]);

  // Count by priority
  const priorityCounts = useMemo(() => {
    if (!data?.proposals) return { high: 0, medium: 0, low: 0 };
    return {
      high: data.proposals.filter((p) => p.priority === "high")
        .length,
      medium: data.proposals.filter(
        (p) => p.priority === "medium",
      ).length,
      low: data.proposals.filter((p) => p.priority === "low")
        .length,
    };
  }, [data?.proposals]);

  if (isLoading || isFetching)
    return (
      <Skeleton className="h-48 rounded-[18px]" />
    );
  if (isError || !data)
    return (
      <SectionError title="Error generando propuestas" />
    );

  return (
    <div
      className={cn("glass-m360-motor", className)}
      data-proposal-count={data.total_proposals}
    >
      {/* ── Header ── */}
      <div className="glass-m360-motor__header">
        <div className="glass-m360-motor__header-left">
          <div className="glass-m360-motor__header-icon">
            <Zap className="w-5 h-5 text-[var(--color-gold-400)]" />
          </div>
          <div>
            <h3 className="glass-m360-motor__header-title">
              Motor de Engagement
            </h3>
            <p className="glass-m360-motor__header-sub">
              {data.total_proposals} propuesta
              {data.total_proposals !== 1 ? "s" : ""}{" "}
              personalizada
              {data.total_proposals !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="glass-m360-motor__header-right">
          {/* Priority summary */}
          {data.total_proposals > 0 && (
            <div className="glass-m360-motor__priority-summary">
              {priorityCounts.high > 0 && (
                <span className="glass-m360-motor__priority-dot glass-m360-motor__priority-dot--high">
                  {priorityCounts.high}
                </span>
              )}
              {priorityCounts.medium > 0 && (
                <span className="glass-m360-motor__priority-dot glass-m360-motor__priority-dot--medium">
                  {priorityCounts.medium}
                </span>
              )}
              {priorityCounts.low > 0 && (
                <span className="glass-m360-motor__priority-dot glass-m360-motor__priority-dot--low">
                  {priorityCounts.low}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="glass-m360-motor__regenerate-btn"
          >
            <RefreshCw
              className={cn(
                "w-3 h-3",
                isFetching && "animate-spin",
              )}
            />
            Regenerar
          </button>
        </div>
      </div>

      {/* ── Cross-domain signals ── */}
      {data.cross_domain_signals.length > 0 && (
        <div className="glass-m360-motor__signals">
          {data.cross_domain_signals.map((sig) => (
            <span
              key={sig.signal}
              className="glass-m360-motor__signal"
              data-signal-status={sig.status}
            >
              {sig.signal}: {sig.value}
              <span className="glass-m360-motor__signal-status">
                {sig.status}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Filter pills ── */}
      {activeTypes.length > 1 && (
        <div className="glass-m360-motor__filters">
          <FilterPill
            label="Todas"
            active={!typeFilter}
            onClick={() => setTypeFilter(null)}
          />
          {activeTypes.map((type) => {
            const display =
              ENGAGEMENT_PROPOSAL_TYPE_DISPLAY[
                type as EngagementProposalType
              ];
            return (
              <FilterPill
                key={type}
                label={display?.label ?? type}
                active={typeFilter === type}
                icon={display?.icon}
                color={display?.color}
                onClick={() =>
                  setTypeFilter(
                    typeFilter === type ? null : type,
                  )
                }
              />
            );
          })}
        </div>
      )}

      {/* ── Proposals ── */}
      {filteredProposals.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-8 h-8" />}
          title="Sin propuestas"
          description={
            typeFilter
              ? "No hay propuestas de este tipo. Prueba otro filtro."
              : "El motor no generó propuestas para este socio."
          }
        />
      ) : (
        <div className="glass-m360-motor__proposals">
          {filteredProposals.map((proposal, i) => {
            const typeDisplay =
              ENGAGEMENT_PROPOSAL_TYPE_DISPLAY[
                proposal.proposal_type as EngagementProposalType
              ];
            const priorityStyle =
              PRIORITY_STYLE[proposal.priority] ??
              PRIORITY_STYLE.medium;
            const impactStyle =
              IMPACT_STYLE[proposal.estimated_impact] ??
              IMPACT_STYLE.medium;
            const isExpanded =
              expandedProposal === proposal.proposal_id;
            const domain = proposal.domain as ActivityDomain;
            const domainColor =
              typeDisplay?.color ?? "var(--color-silver-400)";
            const expiringSoon = isExpiringSoon(
              proposal.expires_at,
            );

            return (
              <div
                key={proposal.proposal_id}
                className="glass-m360-motor__proposal"
                data-priority={proposal.priority}
                data-expiring={expiringSoon}
                style={
                  {
                    "--stagger-i": i,
                    "--proposal-color": domainColor,
                  } as React.CSSProperties
                }
              >
                {/* Header */}
                <button
                  onClick={() =>
                    setExpandedProposal(
                      isExpanded
                        ? null
                        : proposal.proposal_id,
                    )
                  }
                  className="glass-m360-motor__proposal-header"
                >
                  <span className="glass-m360-motor__proposal-type-icon">
                    {typeDisplay?.icon ?? "💡"}
                  </span>

                  <div className="glass-m360-motor__proposal-info">
                    <div className="glass-m360-motor__proposal-title-row">
                      <span className="glass-m360-motor__proposal-title">
                        {proposal.title}
                      </span>
                      <span
                        className="glass-m360-motor__proposal-priority"
                        style={{
                          color: priorityStyle.color,
                          background: priorityStyle.bgColor,
                        }}
                      >
                        {priorityStyle.label}
                      </span>
                      {expiringSoon && (
                        <span className="glass-m360-motor__proposal-expiry">
                          {daysUntilExpiry(
                            proposal.expires_at!,
                          )}
                          d
                        </span>
                      )}
                    </div>

                    <div className="glass-m360-motor__proposal-meta">
                      <span
                        className="glass-m360-motor__proposal-domain"
                        style={{
                          color: domainColor,
                          background: `color-mix(in srgb, ${domainColor} 10%, transparent)`,
                        }}
                      >
                        {getDomainIcon(domain)}{" "}
                        {getDomainLabel(domain)}
                      </span>
                      <span className="glass-m360-motor__proposal-confidence">
                        {Math.round(proposal.confidence)}%
                      </span>
                      <span
                        className="glass-m360-motor__proposal-impact"
                        style={{ color: impactStyle.color }}
                      >
                        {impactStyle.label}
                      </span>
                    </div>
                  </div>

                  <div className="glass-m360-motor__proposal-chevron">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="glass-m360-motor__proposal-body">
                    <p className="glass-m360-motor__proposal-desc">
                      {proposal.description}
                    </p>

                    {/* Confidence bar */}
                    <div className="glass-m360-motor__proposal-confidence-bar">
                      <span className="glass-m360-motor__proposal-confidence-label">
                        Confianza
                      </span>
                      <div className="glass-m360-motor__proposal-confidence-track">
                        <div
                          className="glass-m360-motor__proposal-confidence-fill"
                          style={{
                            width: `${proposal.confidence}%`,
                            background: domainColor,
                          }}
                        />
                      </div>
                      <span className="glass-m360-motor__proposal-confidence-value">
                        {Math.round(proposal.confidence)}%
                      </span>
                    </div>

                    {proposal.suggested_action && (
                      <div className="glass-m360-motor__proposal-action">
                        <Zap className="w-3.5 h-3.5 text-[var(--color-gold-400)] flex-shrink-0" />
                        <div>
                          <p className="glass-m360-motor__proposal-action-label">
                            Acción sugerida
                          </p>
                          <p className="glass-m360-motor__proposal-action-text">
                            {proposal.suggested_action}
                          </p>
                        </div>
                      </div>
                    )}

                    {proposal.related_members.length > 0 && (
                      <p className="glass-m360-motor__proposal-related">
                        Socios relacionados:{" "}
                        {proposal.related_members.join(", ")}
                      </p>
                    )}

                    {proposal.expires_at && (
                      <p className="glass-m360-motor__proposal-expires">
                        Expira:{" "}
                        {new Date(
                          proposal.expires_at,
                        ).toLocaleDateString("es-CR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}