/**
 * Member360IntelligencePanel — 9-Dimension Intelligence Briefing
 * Phase 30 — Block 4.9: The Full Picture
 *
 * Not an accordion of KV rows. A 9-DIMENSION INTELLIGENCE BRIEFING
 * where each dimension is a mini-dashboard with visual weight.
 *
 * D1-D3: computed instantly from pre-loaded data.
 * D4-D9: lazy-loaded on expand with full visual treatment.
 *
 * Each dimension has: summary bar, expanded visual content,
 * dimension-specific color, stagger reveal.
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  User,
  Heart,
  Route,
  DollarSign,
  Shield,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Skeleton } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import {
  useMemberLTVAnalysis,
  useMemberChurnPrediction,
  useMemberActivitySummary,
  useMemberSocialProfile,
  useMemberEngagementProposals,
  useMemberRiskAssessment,
} from "../hooks/useMember360MCP";
import type {
  Member360ProfileResponse,
  MemberHealthScoreResponse,
  MemberTemperature,
  DomainSignal,
  ActivityDomain,
} from "../types";
import {
  getHealthLevelColor,
  getDomainLabel,
  getDomainIcon,
  getDomainColor,
  LTV_TIER_DISPLAY,
  SOCIAL_CLUSTER_DISPLAY,
  compactCurrency,
  type LTVTier,
  type SocialClusterType,
} from "../types";
import {
  TIER_DISPLAY,
  MEMBER_HEALTH_LEVEL_DISPLAY,
  CHURN_RISK_LEVEL_DISPLAY,
  SEVERITY_DISPLAY,
  TREND_DISPLAY,
  type MemberTier,
  type MemberHealthLevel,
  type ChurnRiskLevel,
  type SeverityLevel,
  type TrendDirection,
} from "@/shared/types/domain-enums";
import {
  JOURNEY_STAGE_DISPLAY,
  type JourneyStage,
} from "../types";

import "./Member360IntelligencePanel.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Member360IntelligencePanelProps {
  memberId: string;
  profile: Member360ProfileResponse;
  healthScore: MemberHealthScoreResponse;
  temperature?: MemberTemperature;
  signals?: DomainSignal[];
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// DIMENSION REGISTRY
// ═══════════════════════════════════════════════════════════════════════

interface DimensionDef {
  id: string;
  number: number;
  title: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const DIMENSIONS: DimensionDef[] = [
  {
    id: "identity",
    number: 1,
    title: "Identidad & Tier",
    icon: User,
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  {
    id: "health",
    number: 2,
    title: "Salud Compuesta",
    icon: Heart,
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  {
    id: "lifecycle",
    number: 3,
    title: "Lifecycle Journey",
    icon: Route,
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  {
    id: "financial",
    number: 4,
    title: "Inteligencia Financiera",
    icon: DollarSign,
    color: "var(--color-emerald-300)",
    bgColor: "color-mix(in srgb, var(--color-emerald-300) 10%, transparent)",
  },
  {
    id: "churn",
    number: 5,
    title: "Riesgo de Churn",
    icon: Shield,
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  {
    id: "activity",
    number: 6,
    title: "Actividad Cross-Domain",
    icon: Activity,
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 10%, transparent)",
  },
  {
    id: "social",
    number: 7,
    title: "Inteligencia Social",
    icon: Users,
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
  {
    id: "engagement",
    number: 8,
    title: "Motor de Engagement",
    icon: Zap,
    color: "var(--color-gold-300)",
    bgColor: "color-mix(in srgb, var(--color-gold-300) 10%, transparent)",
  },
  {
    id: "risk",
    number: 9,
    title: "Evaluación de Riesgo",
    icon: AlertTriangle,
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function Member360IntelligencePanel({
  memberId,
  profile,
  healthScore,
  temperature,
  signals,
  className,
}: Member360IntelligencePanelProps) {
  const reduced = useReducedMotion();
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const toggleDim = (id: string) =>
    setExpandedDim((prev) => (prev === id ? null : id));

  const overallScore = healthScore.composite_score;
  const overallColor = getHealthLevelColor(healthScore.health_level);

  return (
    <div
      className={cn("glass-m360-intelligence", className)}
      data-overall-score={Math.round(overallScore)}
    >
      {/* ── Panel Header ── */}
      <div className="glass-m360-intelligence__header">
        <div className="glass-m360-intelligence__header-icon">
          <Target className="w-5 h-5 text-[var(--color-gold-400)]" />
        </div>
        <div className="glass-m360-intelligence__header-info">
          <h3 className="glass-m360-intelligence__header-title">
            Análisis Profundo 360° — 9 Dimensiones
          </h3>
          <p className="glass-m360-intelligence__header-sub">
            Desglose completo por dimensión de inteligencia
          </p>
        </div>
        <div className="glass-m360-intelligence__header-score">
          <span
            className="glass-m360-intelligence__header-score-value"
            style={{ color: overallColor }}
          >
            {Math.round(overallScore)}
          </span>
          <span className="glass-m360-intelligence__header-score-max">
            /100
          </span>
        </div>
      </div>

      {/* ── Dimension Cards ── */}
      <div className="glass-m360-intelligence__dimensions">
        {DIMENSIONS.map((dim, i) => (
          <DimensionCard
            key={dim.id}
            def={dim}
            index={i}
            isExpanded={expandedDim === dim.id}
            onToggle={() => toggleDim(dim.id)}
            memberId={memberId}
            profile={profile}
            healthScore={healthScore}
            temperature={temperature}
            signals={signals}
            reduced={reduced}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DIMENSION CARD
// ═══════════════════════════════════════════════════════════════════════

function DimensionCard({ def, index, isExpanded, onToggle, memberId, profile, healthScore, temperature, signals }: {
  def: DimensionDef;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  memberId: string;
  profile: Member360ProfileResponse;
  healthScore: MemberHealthScoreResponse;
  temperature?: MemberTemperature;
  signals?: DomainSignal[];
  reduced: boolean;
}) {
  const Icon = def.icon;
  const summary = getDimensionSummary(
    def.id,
    profile,
    healthScore,
    temperature,
    signals,
  );

  return (
    <div
      className={cn(
        "glass-m360-intelligence__dim",
        isExpanded && "glass-m360-intelligence__dim--expanded",
      )}
      data-dimension={def.id}
      style={
        {
          "--stagger-i": index,
          "--dim-color": def.color,
          "--dim-bg": def.bgColor,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="glass-m360-intelligence__dim-header"
      >
        <div
          className="glass-m360-intelligence__dim-icon"
          style={{ background: def.bgColor, color: def.color }}
        >
          <Icon className="w-4 h-4" />
        </div>

        <div className="glass-m360-intelligence__dim-info">
          <div className="glass-m360-intelligence__dim-title-row">
            <span className="glass-m360-intelligence__dim-number">
              D{def.number}
            </span>
            <span className="glass-m360-intelligence__dim-title">
              {def.title}
            </span>
          </div>
          <p className="glass-m360-intelligence__dim-summary">
            {summary}
          </p>
        </div>

        <div className="glass-m360-intelligence__dim-chevron">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="glass-m360-intelligence__dim-content">
          <DimensionContent
            dimensionId={def.id}
            memberId={memberId}
            profile={profile}
            healthScore={healthScore}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DIMENSION SUMMARY (pre-computed)
// ═══════════════════════════════════════════════════════════════════════

function getDimensionSummary(
  dimId: string,
  profile: Member360ProfileResponse,
  health: MemberHealthScoreResponse,
  temperature?: MemberTemperature,
  signals?: DomainSignal[],
): string {
  const signalCount = signals?.length ?? 0;
  const criticalSignals =
    signals?.filter(
      (s) => s.severity === "critical" || s.severity === "high",
    ).length ?? 0;
  const tier = TIER_DISPLAY[profile.member.tier as MemberTier];
  const stage =
    JOURNEY_STAGE_DISPLAY[profile.journey_stage as JourneyStage];
  const level =
    MEMBER_HEALTH_LEVEL_DISPLAY[
      health.health_level as MemberHealthLevel
    ];
  const churn =
    CHURN_RISK_LEVEL_DISPLAY[
      profile.churn_risk as ChurnRiskLevel
    ];

  switch (dimId) {
    case "identity":
      return `${profile.member.first_name} ${profile.member.last_name} · ${tier?.label ?? profile.member.tier} · ${profile.member.role} · Familia ${profile.member.family_name}`;
    case "health":
      return `${Math.round(health.composite_score)}/100 (${level?.label ?? health.health_level}) · Tendencia: ${health.trend}`;
    case "lifecycle":
      return `${stage?.label ?? profile.journey_stage} · ${profile.days_in_stage} días en etapa`;
    case "financial":
      return `LTV ₡${(profile.ltv_estimate / 1000).toFixed(0)}K · Tendencia: ${profile.ltv_trend}`;
    case "churn":
      return `Riesgo: ${churn?.label ?? profile.churn_risk} · Score: ${Math.round(profile.churn_score)}/100`;
    case "activity":
      return `${profile.total_activities_90d} actividades · ${profile.active_domains.length} dominios activos${signalCount > 0 ? ` · ${signalCount} señales` : ""}`;
    case "social":
      return `${profile.connections_count} conexiones · NPS: ${profile.satisfaction_nps?.toFixed(1) ?? "N/A"}`;
    case "engagement":
      return `Engagement: ${Math.round(profile.engagement_score)}/100 · Motor disponible`;
    case "risk":
      return `${(profile.top_risks ?? []).length} riesgos activos${criticalSignals > 0 ? ` · ${criticalSignals} señales críticas` : ""}${temperature ? ` · Temp: ${temperature.composite}` : ""}`;
    default:
      return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DIMENSION CONTENT ROUTER
// ═══════════════════════════════════════════════════════════════════════

function DimensionContent({
  dimensionId,
  memberId,
  profile,
  healthScore,
}: {
  dimensionId: string;
  memberId: string;
  profile: Member360ProfileResponse;
  healthScore: MemberHealthScoreResponse;
}) {
  switch (dimensionId) {
    case "identity":
      return <D1Identity profile={profile} />;
    case "health":
      return <D2Health health={healthScore} />;
    case "lifecycle":
      return <D3Lifecycle profile={profile} />;
    case "financial":
      return <D4Financial memberId={memberId} />;
    case "churn":
      return <D5Churn memberId={memberId} />;
    case "activity":
      return <D6Activity memberId={memberId} />;
    case "social":
      return <D7Social memberId={memberId} />;
    case "engagement":
      return <D8Engagement memberId={memberId} />;
    case "risk":
      return <D9Risk memberId={memberId} />;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// D1: Identity & Tier
// ═══════════════════════════════════════════════════════════════════════

function D1Identity({
  profile,
}: {
  profile: Member360ProfileResponse;
}) {
  const m = profile.member;
  const tier = TIER_DISPLAY[m.tier as MemberTier];
  const tenure = Math.floor(
    (Date.now() - new Date(m.join_date).getTime()) / 86400000,
  );

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Nombre"
        value={`${m.first_name} ${m.last_name}`}
      />
      <KVRow
        label="Tier"
        value={tier?.label ?? m.tier}
        color={tier?.color}
      />
      <KVRow label="Rol" value={m.role} />
      <KVRow label="Familia" value={m.family_name} />
      <KVRow label="Antigüedad" value={`${tenure} días`} />
      {m.age != null && (
        <KVRow label="Edad" value={`${m.age} años`} />
      )}
      {m.age_group && (
        <KVRow label="Grupo etario" value={m.age_group} />
      )}
      {m.email && <KVRow label="Email" value={m.email} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D2: Health Composite
// ═══════════════════════════════════════════════════════════════════════

function D2Health({
  health,
}: {
  health: MemberHealthScoreResponse;
}) {
  const level =
    MEMBER_HEALTH_LEVEL_DISPLAY[
      health.health_level as MemberHealthLevel
    ];

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Score compuesto"
        value={`${Math.round(health.composite_score)}/100`}
        color={level?.color}
      />
      <KVRow
        label="Nivel"
        value={level?.label ?? health.health_level}
        color={level?.color}
      />
      <KVRow
        label="Tendencia"
        value={health.trend_detail ?? health.trend}
      />
      {health.previous_score != null && (
        <KVRow
          label="Score anterior"
          value={`${Math.round(health.previous_score)}/100`}
        />
      )}
      {health.benchmark_percentile != null && (
        <KVRow
          label="Percentil vs tier"
          value={`${Math.round(health.benchmark_percentile)}%`}
        />
      )}

      {/* Factor mini-bars */}
      <div className="glass-m360-intelligence__factor-bars">
        <p className="glass-m360-intelligence__factor-bars-label">
          Factores:
        </p>
        {health.factors.map((f) => (
          <div
            key={f.name}
            className="glass-m360-intelligence__factor-row"
          >
            <span className="glass-m360-intelligence__factor-name">
              {f.name}
            </span>
            <div className="glass-m360-intelligence__factor-bar-track">
              <div
                className="glass-m360-intelligence__factor-bar-fill"
                style={{
                  width: `${f.score}%`,
                  background:
                    f.score >= 70
                      ? "var(--color-emerald-400)"
                      : f.score >= 45
                        ? "var(--color-amber-400)"
                        : "var(--color-rose-400)",
                }}
              />
            </div>
            <span className="glass-m360-intelligence__factor-score">
              {Math.round(f.score)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D3: Lifecycle Journey
// ═══════════════════════════════════════════════════════════════════════

function D3Lifecycle({
  profile,
}: {
  profile: Member360ProfileResponse;
}) {
  const stage =
    JOURNEY_STAGE_DISPLAY[
      profile.journey_stage as JourneyStage
    ];

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Etapa actual"
        value={stage?.label ?? profile.journey_stage}
        color={stage?.color}
      />
      <KVRow
        label="Días en etapa"
        value={`${profile.days_in_stage}`}
      />
      <KVRow
        label="Milestones próximos"
        value={`${(profile.upcoming_milestones ?? []).length}`}
      />
      {(profile.upcoming_milestones ?? []).length > 0 && (
        <div className="glass-m360-intelligence__milestones">
          {profile.upcoming_milestones.map((ms) => (
            <div
              key={ms.milestone_id}
              className="glass-m360-intelligence__milestone"
            >
              <span className="glass-m360-intelligence__milestone-star">
                ★
              </span>
              <span className="glass-m360-intelligence__milestone-title">
                {ms.title}
              </span>
              <span className="glass-m360-intelligence__milestone-date">
                {new Date(ms.date).toLocaleDateString("es-CR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D4: Financial Intelligence
// ═══════════════════════════════════════════════════════════════════════

function D4Financial({ memberId }: { memberId: string }) {
  const { data, isLoading, isError } =
    useMemberLTVAnalysis(memberId);

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (isError || !data)
    return <SectionError title="Error" />;

  const tier = LTV_TIER_DISPLAY[data.ltv_tier as LTVTier];

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="LTV actual"
        value={compactCurrency(data.current_ltv)}
      />
      <KVRow
        label="Gasto mensual"
        value={compactCurrency(data.monthly_avg_spend)}
      />
      <KVRow
        label="Tier de valor"
        value={tier?.label ?? data.ltv_tier}
        color={tier?.color}
      />
      <KVRow label="Tendencia" value={data.ltv_trend} />
      {data.projection_12m != null && (
        <KVRow
          label="Proyección 12m"
          value={compactCurrency(data.projection_12m)}
        />
      )}
      {data.benchmark_vs_tier != null && (
        <KVRow
          label="vs Tier avg"
          value={`${data.benchmark_vs_tier >= 0 ? "+" : ""}${data.benchmark_vs_tier.toFixed(1)}%`}
          color={
            data.benchmark_vs_tier >= 0
              ? "var(--color-emerald-400)"
              : "var(--color-rose-400)"
          }
        />
      )}
      {data.peak_month && (
        <KVRow label="Mes pico" value={data.peak_month} />
      )}
      {data.low_month && (
        <KVRow label="Mes bajo" value={data.low_month} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D5: Churn Risk
// ═══════════════════════════════════════════════════════════════════════

function D5Churn({ memberId }: { memberId: string }) {
  const { data, isLoading, isError } =
    useMemberChurnPrediction(memberId);

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (isError || !data)
    return <SectionError title="Error" />;

  const churn =
    CHURN_RISK_LEVEL_DISPLAY[
      data.churn_risk as ChurnRiskLevel
    ];

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Nivel de riesgo"
        value={churn?.label ?? data.churn_risk}
        color={churn?.color}
      />
      <KVRow
        label="Score"
        value={`${Math.round(data.churn_score)}/100`}
      />
      <KVRow
        label="Confianza"
        value={`${Math.round(data.confidence)}%`}
      />
      <KVRow
        label="Horizonte"
        value={`${data.time_horizon_days} días`}
      />
      {data.risk_factors.length > 0 && (
        <div className="glass-m360-intelligence__risk-list">
          <p className="glass-m360-intelligence__risk-list-label">
            Factores:
          </p>
          {data.risk_factors.map((rf, i) => (
            <p
              key={i}
              className="glass-m360-intelligence__risk-item"
            >
              <span className="glass-m360-intelligence__risk-dot" />
              {rf.detail}
            </p>
          ))}
        </div>
      )}
      {data.recommended_actions.length > 0 && (
        <div className="glass-m360-intelligence__actions-list">
          <p className="glass-m360-intelligence__actions-label">
            Acciones:
          </p>
          {data.recommended_actions.map((a, i) => (
            <p
              key={i}
              className="glass-m360-intelligence__action-item"
            >
              <Zap className="w-3 h-3 flex-shrink-0" />
              {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D6: Cross-Domain Activity — DOMAIN FIX APPLIED
// ═══════════════════════════════════════════════════════════════════════

function D6Activity({ memberId }: { memberId: string }) {
  const { data, isLoading, isError } =
    useMemberActivitySummary(memberId);

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (isError || !data)
    return <SectionError title="Error" />;

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Total actividades"
        value={`${data.total_activities} (${data.period_days}d)`}
      />
      <KVRow
        label="Racha actual"
        value={`${data.activity_streak_current} días`}
      />
      <KVRow
        label="Racha máxima"
        value={`${data.activity_streak_longest} días`}
      />
      <div className="glass-m360-intelligence__domain-bars">
        <p className="glass-m360-intelligence__domain-bars-label">
          Por dominio:
        </p>
        {data.by_domain
          .sort((a, b) => b.count - a.count)
          .map((d) => {
            const domain = d.domain as ActivityDomain;
            return (
              <div
                key={d.domain}
                className="glass-m360-intelligence__domain-row"
              >
                <span className="glass-m360-intelligence__domain-icon">
                  {getDomainIcon(domain)}
                </span>
                <span className="glass-m360-intelligence__domain-label">
                  {getDomainLabel(domain)}
                </span>
                <div className="glass-m360-intelligence__domain-bar-track">
                  <div
                    className="glass-m360-intelligence__domain-bar-fill"
                    style={{
                      width: `${d.percentage}%`,
                      background: getDomainColor(domain),
                    }}
                  />
                </div>
                <span className="glass-m360-intelligence__domain-count">
                  {d.count}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D7: Social Intelligence
// ═══════════════════════════════════════════════════════════════════════

function D7Social({ memberId }: { memberId: string }) {
  const { data, isLoading, isError } =
    useMemberSocialProfile(memberId);

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (isError || !data)
    return <SectionError title="Error" />;

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Conexiones"
        value={`${data.connections_count}`}
      />
      <KVRow
        label="Influencia social"
        value={`${Math.round(data.social_influence_score)}/100`}
      />
      <KVRow
        label="Referidos"
        value={`${data.referrals_made} (${data.referrals_converted} convertidos)`}
      />
      {data.cluster_membership.length > 0 && (
        <div className="glass-m360-intelligence__clusters">
          <p className="glass-m360-intelligence__clusters-label">
            Clusters:
          </p>
          <div className="glass-m360-intelligence__cluster-tags">
            {data.cluster_membership.map((c) => {
              const display =
                SOCIAL_CLUSTER_DISPLAY[
                  c as SocialClusterType
                ];
              return (
                <span
                  key={c}
                  className="glass-m360-intelligence__cluster-tag"
                >
                  {display?.icon ?? "👥"}{" "}
                  {display?.label ?? c}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {data.recommended_connections.length > 0 && (
        <div className="glass-m360-intelligence__recommended">
          <p className="glass-m360-intelligence__recommended-label">
            Recomendadas:
          </p>
          {data.recommended_connections.map((rc) => (
            <p
              key={rc.member_id}
              className="glass-m360-intelligence__recommended-item"
            >
              {rc.name} — {rc.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D8: Engagement Motor
// ═══════════════════════════════════════════════════════════════════════

function D8Engagement({ memberId }: { memberId: string }) {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useMemberEngagementProposals(memberId, true);

  if (isLoading || isFetching)
    return <Skeleton className="h-24 rounded-lg" />;
  if (isError || !data)
    return <SectionError title="Error" />;

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Propuestas"
        value={`${data.total_proposals}`}
      />
      {data.cross_domain_signals.length > 0 && (
        <div className="glass-m360-intelligence__signals">
          {data.cross_domain_signals.map((sig) => (
            <span
              key={sig.signal}
              className="glass-m360-intelligence__signal-badge"
              data-signal-status={sig.status}
            >
              {sig.signal}: {sig.value}
            </span>
          ))}
        </div>
      )}
      {data.proposals.length > 0 && (
        <div className="glass-m360-intelligence__proposals-preview">
          {data.proposals.slice(0, 3).map((p) => (
            <div
              key={p.proposal_id}
              className="glass-m360-intelligence__proposal-card"
            >
              <p className="glass-m360-intelligence__proposal-title">
                {p.title}
              </p>
              <p className="glass-m360-intelligence__proposal-desc">
                {p.description}
              </p>
            </div>
          ))}
          {data.proposals.length > 3 && (
            <p className="glass-m360-intelligence__proposal-more">
              +{data.proposals.length - 3} más
            </p>
          )}
        </div>
      )}
      <button
        onClick={() => refetch()}
        className="glass-m360-intelligence__regenerate-btn"
      >
        <Zap className="w-3 h-3" />
        Regenerar propuestas
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// D9: Risk Assessment
// ═══════════════════════════════════════════════════════════════════════

function D9Risk({ memberId }: { memberId: string }) {
  const { data, isLoading, isError } =
    useMemberRiskAssessment(memberId);

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (isError || !data)
    return <SectionError title="Error" />;

  const overall =
    SEVERITY_DISPLAY[data.overall_risk as SeverityLevel];
  const trend =
    TREND_DISPLAY[data.risk_trend as TrendDirection];

  return (
    <div className="glass-m360-intelligence__dim-body">
      <KVRow
        label="Riesgo general"
        value={overall?.label ?? data.overall_risk}
        color={overall?.color}
      />
      <KVRow
        label="Score"
        value={`${Math.round(data.risk_score)}/100`}
      />
      <KVRow
        label="Tendencia"
        value={trend?.label ?? data.risk_trend}
        color={trend?.color}
      />
      {data.risk_factors.length > 0 && (
        <div className="glass-m360-intelligence__risk-list">
          <p className="glass-m360-intelligence__risk-list-label">
            Factores de riesgo:
          </p>
          {data.risk_factors.map((rf, i) => (
            <p
              key={i}
              className="glass-m360-intelligence__risk-item"
            >
              <span className="glass-m360-intelligence__risk-dot" />
              {rf.detail}
            </p>
          ))}
        </div>
      )}
      {data.protective_factors.length > 0 && (
        <div className="glass-m360-intelligence__protective-list">
          <p className="glass-m360-intelligence__protective-label">
            Factores protectores:
          </p>
          {data.protective_factors.map((pf, i) => (
            <p
              key={i}
              className="glass-m360-intelligence__protective-item"
            >
              <span className="glass-m360-intelligence__protective-dot" />
              {pf.detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// KV ROW HELPER
// ═══════════════════════════════════════════════════════════════════════

function KVRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="glass-m360-intelligence__kv">
      <span className="glass-m360-intelligence__kv-label">
        {label}
      </span>
      <span
        className="glass-m360-intelligence__kv-value"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}