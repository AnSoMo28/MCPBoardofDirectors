// ═══════════════════════════════════════════════════════════════════════
// Member360 — The Portrait Room
// Phase 30 — Block 2.1: The Crown Jewel
// ═══════════════════════════════════════════════════════════════════════
//
// Not a dashboard. A ROOM where an AI advisor has already prepared
// everything the director needs to know about a member.
//
// Two modes:
//   LIST — Search + filters + temperature-aware preview cards
//   DETAIL — "The Portrait Room" — Adaptive Morphism 3 modes
//
// Architecture:
//   AmbientCanvas (background breathing)
//   Portrait (SVG orbital rings — THE visual anchor)
//   Narrative (3-act AI briefing — typing effect)
//   DecisionStage (action scenario — when intervention needed)
//   IntelligenceStream (priority-sorted vertical — replaces tabs)
//
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Search,
  Heart
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button, EmptyState, Skeleton } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useSearchMembers360 } from "./hooks/useMember360MCP";
import { useMember360Dashboard } from "./hooks/useMember360Dashboard";
import { MEMBER_STATE_DISPLAY } from "./types";
import type { MemberState, Member360Preview } from "./types";
import type { MemberTier } from "@/shared/types/domain-enums";
import {
  CHURN_RISK_LEVEL_DISPLAY,
  MEMBER_HEALTH_LEVEL_DISPLAY,
  TIER_DISPLAY,
  type ChurnRiskLevel,
  type MemberHealthLevel,
} from "@/shared/types/domain-enums";
import {
  JOURNEY_STAGE_DISPLAY,
  getDomainColor,
  getDomainLabel,
  getDomainIcon,
  getHealthLevelColor,
  type JourneyStage,
} from "./types";

// ── CSS imports ──
import "./Member360Dashboard.css";
import "./components/MemberAmbientCanvas.css";
import "./components/MemberIntelligenceStream.css";
import "./components/MemberDecisionStage.css";

// ── Sub-components (new) ──
import { MemberAmbientCanvas } from "./components/MemberAmbientCanvas";
import { MemberIntelligenceStream } from "./components/MemberIntelligenceStream";
import { MemberDecisionStage } from "./components/MemberDecisionStage";

// ── Sub-components (existing — will be rewritten in Bloque 4) ──
import { MemberIdentityCard } from "./components/MemberIdentityCard";
import { MemberJourneyTimeline } from "./components/MemberJourneyTimeline";
import { MemberFinancialSummary } from "./components/MemberFinancialSummary";
import { MemberSocialProfile } from "./components/MemberSocialProfile";
import { MemberRiskRadar } from "./components/MemberRiskRadar";
import { MemberEngagementMotor } from "./components/MemberEngagementMotor";

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════

export default function Member360Dashboard() {
  const { memberId } = useParams<{ memberId: string }>();

  if (!memberId) return <Member360List />;
  return <Member360Detail memberId={memberId} />;
}

// ═══════════════════════════════════════════════════════════════════════
// LIST MODE — Temperature-aware preview cards
// ═══════════════════════════════════════════════════════════════════════

function Member360List() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSearchMembers360();
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<string>();
  const [tierFilter, setTierFilter] = useState<string>();

  const filtered = useMemo(() => {
    let result = data?.members ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
          m.family_name.toLowerCase().includes(q),
      );
    }
    if (healthFilter) result = result.filter((m) => m.health_level === healthFilter);
    if (tierFilter) result = result.filter((m) => m.tier === tierFilter);
    return result;
  }, [data, search, healthFilter, tierFilter]);

  if (isLoading) {
    return (
      <div className="glass-m360 glass-m360--list" data-mode="calm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="glass-m360__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-[18px]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) return <SectionError title="Error cargando socios" />;

  return (
    <div className="glass-m360 glass-m360--list" data-mode="calm">
      {/* Header */}
      <div className="glass-m360__header">
        <h1 className="glass-m360__title">Member 360 Intelligence</h1>
        <p className="glass-m360__subtitle">
          Vista unificada — {data?.total ?? 0} socios
        </p>
      </div>

      {/* Search */}
      <div className="glass-m360__search-wrap">
        <Search className="glass-m360__search-icon" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar socio o familia..."
          className="glass-m360__search-input"
        />
      </div>

      {/* Filter pills */}
      <div className="glass-m360__filters">
        <FilterPill
          label="Todos"
          active={!healthFilter}
          onClick={() => setHealthFilter(undefined)}
        />
        {(["critical", "attention", "healthy", "excellent"] as const).map((level) => {
          const display = MEMBER_HEALTH_LEVEL_DISPLAY[level as MemberHealthLevel];
          return (
            <FilterPill
              key={level}
              label={display?.label ?? level}
              active={healthFilter === level}
              color={display?.color}
              bgColor={display?.bgColor}
              onClick={() => setHealthFilter(healthFilter === level ? undefined : level)}
            />
          );
        })}
        <div className="glass-m360__filter-divider" />
        {(["vip", "platino", "oro", "premium", "plata", "bronce", "basic"] as const).map((tier) => {
          const td = TIER_DISPLAY[tier as MemberTier];
          return (
            <FilterPill
              key={tier}
              label={td?.label ?? tier}
              active={tierFilter === tier}
              color={td?.color}
              bgColor={td?.bgColor}
              onClick={() => setTierFilter(tierFilter === tier ? undefined : tier)}
            />
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-8 h-8 text-[var(--color-silver-400)]" />}
          title="No se encontraron socios"
          description={search || healthFilter || tierFilter ? "Intenta ajustar los filtros" : "No hay socios registrados"}
        />
      ) : (
        <div className="glass-m360__grid">
          {filtered.map((member, idx) => (
            <TemperatureCard
              key={member.member_id}
              member={member}
              delay={idx * 0.04}
              onClick={() => navigate(`/admin/member-360/${member.member_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter Pill ────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  color,
  bgColor,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  bgColor?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="unstyled"
      onClick={onClick}
      className={cn("glass-m360__pill", active && "glass-m360__pill--active")}
      style={
        active
          ? {
              color: color ?? "var(--color-gold-400)",
              background: bgColor ?? "color-mix(in srgb, var(--color-gold-400) 15%, transparent)",
              borderColor: `color-mix(in srgb, ${color ?? "var(--color-gold-400)"} 30%, transparent)`,
            }
          : undefined
      }
    >
      {label}
    </Button>
  );
}

// ── Temperature Card — Preview card with temperature-aware ambient glow ───

function TemperatureCard({
  member,
  delay,
  onClick,
}: {
  member: Member360Preview;
  delay: number;
  onClick: () => void;
}) {
  const reduced = useReducedMotion();
  const tier = TIER_DISPLAY[member.tier as MemberTier];
  const churn = CHURN_RISK_LEVEL_DISPLAY[member.churn_risk as ChurnRiskLevel];
  const stage = JOURNEY_STAGE_DISPLAY[member.journey_stage as JourneyStage];
  const healthColor = getHealthLevelColor(member.health_level);
  const initials = `${member.first_name[0]}${member.last_name[0]}`;
  const ringR = 18;
  const ringCirc = 2 * Math.PI * ringR;

  // Derive temperature zone from health score
  const tempZone: MemberState =
    member.health_score >= 85 ? "thriving" :
    member.health_score >= 65 ? "stable" :
    member.health_score >= 45 ? "drifting" :
    member.health_score >= 25 ? "at_risk" : "disengaging";
  const stateDisplay = MEMBER_STATE_DISPLAY[tempZone];

  return (
    <Button
      variant="unstyled"
      onClick={onClick}
      className={cn(
        "glass-m360__temp-card",
        !reduced && "glass-m360__temp-card--animate",
      )}
      style={
        !reduced
          ? ({ animationDelay: `${delay}s`, "--card-state-color": stateDisplay.color } as React.CSSProperties)
          : ({ "--card-state-color": stateDisplay.color } as React.CSSProperties)
      }
      data-member-state={tempZone}
    >
      {/* Ambient glow */}
      <div className="glass-m360__card-glow" />

      <div className="glass-m360__card-header">
        <div className="glass-m360__card-avatar" style={{ borderColor: tier?.color ?? "var(--color-silver-600)" }}>
          {initials}
        </div>
        <div className="glass-m360__card-info">
          <h3 className="glass-m360__card-name">
            {member.first_name} {member.last_name}
          </h3>
          <p className="glass-m360__card-meta">
            {tier?.label ?? member.tier} · {member.family_name}
          </p>
        </div>

        {/* Temperature ring */}
        <svg width="48" height="48" viewBox="0 0 48 48" className="glass-m360__card-ring">
          <circle cx="24" cy="24" r={ringR} fill="none" stroke="var(--color-surface-3)" strokeWidth="3" />
          <circle
            cx="24" cy="24" r={ringR}
            fill="none"
            stroke={healthColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={ringCirc}
            strokeDashoffset={ringCirc * (1 - member.health_score / 100)}
            transform="rotate(-90 24 24)"
            className="glass-m360__card-ring-value"
          />
          <text x="24" y="25" textAnchor="middle" dominantBaseline="middle" fill="var(--color-silver-100)" fontSize="11" fontWeight="600" className="glass-m360__card-ring-text">
            {Math.round(member.health_score)}
          </text>
        </svg>
      </div>

      {/* State badge + meta */}
      <div className="glass-m360__card-badges">
        <span className="glass-m360__state-badge" style={{ color: stateDisplay.color, background: stateDisplay.bgColor }}>
          {stateDisplay.icon} {stateDisplay.label}
        </span>
        {churn && (
          <span className="glass-m360__meta-badge" style={{ color: churn.color, background: churn.bgColor }}>
            {churn.label}
          </span>
        )}
        {stage && (
          <span className="glass-m360__meta-badge" style={{ color: stage.color, background: stage.bgColor }}>
            {stage.label}
          </span>
        )}
      </div>
    </Button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL MODE — "The Portrait Room"
// ═══════════════════════════════════════════════════════════════════════

function Member360Detail({ memberId }: { memberId: string }) {
  const navigate = useNavigate();

  // ── Neural Hub — ALL intelligence from ONE hook ──
  const hub = useMember360Dashboard({
    memberId,
    clubAvgTemperature: 55,
  });

  // ── Loading state ──
  if (hub.isLoading) {
    return (
      <div className="glass-m360 glass-m360--detail" data-mode="calm" data-member-state="stable">
        <MemberAmbientCanvas temperature={50} mode="calm" state="stable" />
        <div className="glass-m360__loading">
          <div className="glass-m360__loading-orb" />
          <p className="glass-m360__loading-text">Analizando socio...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (hub.isError || !hub.profile) {
    return (
      <div className="glass-m360 glass-m360--detail" data-mode="calm">
        <Button variant="ghost" onClick={() => navigate("/admin/member-360")} className="glass-m360__back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <SectionError title="Error cargando perfil del socio" />
      </div>
    );
  }

  const member = hub.profile.member;
  const mode = hub.mode;
  const state = hub.temperature.state;
  const stateDisplay = MEMBER_STATE_DISPLAY[state];

  return (
    <div
      className="glass-m360 glass-m360--detail"
      data-mode={mode}
      data-member-state={state}
      data-temperature-zone={hub.temperature.zone}
      style={
        {
          "--m360-stagger-ms": `${hub.ambientState.staggerMs}ms`,
          "--m360-glow-pulse-sec": `${hub.ambientState.glowPulseSec}s`,
          "--m360-orb-rotation-sec": `${hub.ambientState.orbRotationSec}s`,
          "--m360-ambient-intensity": hub.ambientState.ambientIntensity,
          "--m360-animation-speed": hub.ambientState.animationSpeed,
          "--m360-temperature": hub.temperature.composite,
          "--m360-state-color": stateDisplay.color,
        } as React.CSSProperties
      }
    >
      {/* ── Ambient Background ── */}
      <MemberAmbientCanvas
        temperature={hub.temperature.composite}
        mode={mode}
        state={state}
      />

      {/* ── Navigation ── */}
      <div className="glass-m360__nav" data-revealed>
        <Button variant="ghost" onClick={() => navigate("/admin/member-360")} className="glass-m360__back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <div className="glass-m360__nav-meta">
          <span className="glass-m360__mode-badge" data-mode={mode}>
            {mode === "calm" ? "◈ Exploración" : mode === "alert" ? "◇ Atención" : "● Crítico"}
          </span>
          <span className="glass-m360__intelligence-score">
            Inteligencia: {hub.intelligenceScore}/100
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          THE PORTRAIT ROOM — Spatial composition changes by mode
          ═══════════════════════════════════════════════════════════════ */}

      <div className="glass-m360__room" data-mode={mode}>
        {/* ── LEFT: The Portrait ── */}
        <section className="glass-m360__portrait-section" data-revealed>
          <PortraitOrb
            temperature={hub.temperature}
            vitalSigns={hub.vitalSigns}
            portraitRings={hub.portraitRings}
            memberName={`${member.first_name} ${member.last_name}`}
            tier={member.tier}
          />
          <MemberIdentityCard member={member} />
        </section>

        {/* ── RIGHT: The Narrative + Decision ── */}
        <section className="glass-m360__narrative-section">
          {/* Narrative */}
          {hub.narrative && (
            <div className="glass-m360__narrative" data-revealed data-tone={hub.narrative.primary.tone}>
              <div className="glass-m360__narrative-header">
                <span className="glass-m360__narrative-icon">{hub.narrative.primary.visual.icon}</span>
                <h2 className="glass-m360__narrative-headline">{hub.narrative.primary.headline}</h2>
              </div>
              <p className="glass-m360__narrative-subtitle">{hub.narrative.primary.subtitle}</p>
              <div className="glass-m360__narrative-body">
                <TypingText
                  text={hub.narrative.primary.body}
                  speedCPS={hub.narrative.primary.typingSpeedCPS}
                  reduced={false}
                />
              </div>
              {hub.narrative.primary.action && (
                <div className="glass-m360__narrative-action">
                  <span className="glass-m360__narrative-action-label">
                    {hub.narrative.primary.action.label}
                  </span>
                  <span className="glass-m360__narrative-action-urgency" data-urgency={hub.narrative.primary.action.urgency}>
                    {hub.narrative.primary.action.urgency}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Decision Stage — ONLY when intervention needed */}
          {(state === "at_risk" || state === "disengaging") && hub.predictions && (
            <MemberDecisionStage
              temperature={hub.temperature}
              predictions={hub.predictions}
              narrative={hub.narrative}
              memberName={`${member.first_name} ${member.last_name}`}
            />
          )}
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          INTELLIGENCE STREAM — Priority-sorted, replaces tabs
          ═══════════════════════════════════════════════════════════════ */}

      <MemberIntelligenceStream
        mode={mode}
        tabOrder={hub.tabOrder}
        activeFocus={hub.activeFocus}
        onFocusChange={hub.setActiveFocus}
      >
        {/* VITAL SIGNS — Always first after narrative */}
        <StreamSection
          id="vitals"
          title="Signos Vitales"
          icon="💊"
          color="var(--color-amber-400)"
          priority={1}
          defaultExpanded={mode !== "calm"}
        >
          {hub.vitalSigns.length > 0 ? (
            <VitalSignsGrid vitalSigns={hub.vitalSigns} portraitRings={hub.portraitRings} />
          ) : (
            <Skeleton className="h-32 rounded-xl" />
          )}
        </StreamSection>

        {/* CROSS-DOMAIN SIGNALS */}
        <StreamSection
          id="signals"
          title="Señales Cross-Domain"
          icon="🔗"
          color="var(--color-teal-400)"
          priority={2}
          defaultExpanded={state === "at_risk" || state === "disengaging"}
          badge={hub.actionableSignals.length > 0 ? `${hub.actionableSignals.length} accionables` : undefined}
        >
          <CrossDomainSignals signals={hub.signals} resonance={hub.resonance} />
        </StreamSection>

        {/* PREDICTIONS + WINDOWS */}
        {hub.predictions && (
          <StreamSection
            id="predictions"
            title="Predicciones"
            icon="🔮"
            color="var(--color-gold-400)"
            priority={3}
            defaultExpanded={hub.predictions.windows.some((w) => w.status === "imminent" || w.status === "closing")}
            badge={hub.predictions.windows.filter((w) => w.status !== "open").length > 0
              ? `${hub.predictions.windows.filter((w) => w.status !== "open").length} ventanas activas`
              : undefined}
          >
            <PredictionsPanel predictions={hub.predictions} />
          </StreamSection>
        )}

        {/* ENGAGEMENT DNA */}
        {hub.dna.length > 0 && (
          <StreamSection
            id="dna"
            title="Engagement DNA"
            icon="🧬"
            color="var(--color-emerald-400)"
            priority={4}
            defaultExpanded={false}
          >
            <EngagementDNAPanel dna={hub.dna} />
          </StreamSection>
        )}

        {/* ADVISOR INSIGHTS */}
        {hub.advisorInsights.length > 0 && (
          <StreamSection
            id="actions"
            title="Insights del Advisor"
            icon="🧠"
            color="var(--color-gold-300)"
            priority={5}
            defaultExpanded={mode === "critical"}
            badge={hub.advisorInsights.filter((i) => i.impact === "critical").length > 0
              ? `${hub.advisorInsights.filter((i) => i.impact === "critical").length} críticos`
              : undefined}
          >
            <AdvisorInsightsList insights={hub.advisorInsights} />
          </StreamSection>
        )}

        {/* EXISTING COMPONENTS — Embedded in stream, will be rewritten in Bloque 4 */}

        <StreamSection id="journey" title="Journey" icon="🗺️" color="var(--color-teal-300)" priority={6} defaultExpanded={false}>
          <MemberJourneyTimeline memberId={memberId} />
        </StreamSection>

        <StreamSection id="financial" title="Finanzas" icon="💰" color="var(--color-emerald-400)" priority={7} defaultExpanded={false}>
          <MemberFinancialSummary memberId={memberId} />
        </StreamSection>

        <StreamSection id="social" title="Social" icon="🤝" color="var(--color-teal-400)" priority={8} defaultExpanded={false}>
          <MemberSocialProfile memberId={memberId} />
        </StreamSection>

        <StreamSection id="risks" title="Riesgo" icon="⚠️" color="var(--color-amber-400)" priority={9} defaultExpanded={false}>
          <MemberRiskRadar memberId={memberId} />
        </StreamSection>

        <StreamSection id="motor" title="Motor de Engagement" icon="⚡" color="var(--color-gold-400)" priority={10} defaultExpanded={false}>
          <MemberEngagementMotor memberId={memberId} />
        </StreamSection>
      </MemberIntelligenceStream>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PORTRAIT ORB — SVG orbital rings + central temperature orb
// ═══════════════════════════════════════════════════════════════════════

function PortraitOrb({ temperature, portraitRings, memberName }: {
  temperature: import("./types").MemberTemperature;
  vitalSigns: import("./types").VitalSign[];
  portraitRings: import("./lib/memberSignals").PortraitRingProps[];
  memberName: string;
  tier: string;
}) {
  const stateDisplay = MEMBER_STATE_DISPLAY[temperature.state];
  const center = 50;

  return (
    <div className="glass-m360__portrait">
      <svg viewBox="0 0 100 100" className="glass-m360__portrait-svg">
        {/* Orbital rings */}
        {portraitRings.map((ring, i) => (
          <circle
            key={ring.dimension}
            cx={center}
            cy={center}
            r={ring.radius}
            fill="none"
            stroke={ring.color}
            strokeWidth={ring.strokeWidth}
            strokeDasharray={ring.dashArray}
            opacity={ring.opacity}
            className="glass-m360__portrait-ring"
            style={
              {
                "--ring-index": i,
                "--ring-duration": `${ring.orbitDurationSec}s`,
                animationDuration: `${ring.orbitDurationSec}s`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Central orb — temperature glow */}
        <circle
          cx={center}
          cy={center}
          r={12}
          fill={stateDisplay.color}
          opacity={0.3}
          className="glass-m360__portrait-orb-glow"
        />
        <circle
          cx={center}
          cy={center}
          r={8}
          fill={stateDisplay.color}
          opacity={0.7}
          className="glass-m360__portrait-orb-core"
        />

        {/* Temperature text */}
        <text
          x={center}
          y={center + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-silver-100)"
          fontSize="7"
          fontWeight="700"
          className="glass-m360__portrait-temp-text"
        >
          {temperature.composite}
        </text>
      </svg>

      {/* Labels below portrait */}
      <div className="glass-m360__portrait-labels">
        <span className="glass-m360__portrait-name">{memberName}</span>
        <span className="glass-m360__portrait-state" style={{ color: stateDisplay.color }}>
          {stateDisplay.icon} {stateDisplay.label}
        </span>
        <span className="glass-m360__portrait-trend">
          {temperature.momentum.velocity > 0.1 ? "↑" : temperature.momentum.velocity < -0.1 ? "↓" : "→"}{" "}
          {temperature.trend}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VITAL SIGNS GRID — 6 dimension gauges
// ═══════════════════════════════════════════════════════════════════════

function VitalSignsGrid({
  vitalSigns,
  portraitRings,
}: {
  vitalSigns: import("./types").VitalSign[];
  portraitRings: import("./lib/memberSignals").PortraitRingProps[];
}) {
  return (
    <div className="glass-m360__vitals-grid">
      {vitalSigns.map((vs, i) => {
        const ring = portraitRings.find((r) => r.dimension === vs.name);
        const circumference = 2 * Math.PI * 16;
        const offset = circumference * (1 - vs.value / 100);

        return (
          <div
            key={vs.name}
            className="glass-m360__vital-card"
            data-status={vs.status}
            style={
              {
                "--vital-color": ring?.color ?? "var(--color-silver-400)",
                "--stagger-i": i,
              } as React.CSSProperties
            }
          >
            <div className="glass-m360__vital-ring-wrap">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-surface-3)" strokeWidth="2.5" />
                <circle
                  cx="20" cy="20" r="16"
                  fill="none"
                  stroke={ring?.color ?? "var(--color-silver-400)"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90 20 20)"
                  className="glass-m360__vital-arc"
                />
                <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" fill="var(--color-silver-100)" fontSize="9" fontWeight="600" className="glass-m360__vital-text">
                  {vs.value}
                </text>
              </svg>
            </div>
            <div className="glass-m360__vital-info">
              <span className="glass-m360__vital-name">{vs.name}</span>
              <span className="glass-m360__vital-trend" data-trend={vs.trend}>
                {vs.trend === "improving" ? "↑" : vs.trend === "declining" ? "↓" : "→"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CROSS-DOMAIN SIGNALS — Resonance visualization
// ═══════════════════════════════════════════════════════════════════════

function CrossDomainSignals({
  signals,
  resonance,
}: {
  signals: import("./types").DomainSignal[];
  resonance: import("./types").SignalResonance;
}) {
  return (
    <div className="glass-m360__signals">
      {/* Resonance header */}
      <div className="glass-m360__resonance" data-agreement={resonance.agreement}>
        <span className="glass-m360__resonance-label">
          Resonancia: {resonance.agreement} ({resonance.agreementCount}/{resonance.totalDomains})
        </span>
        <span className="glass-m360__resonance-confidence">
          Confianza: {Math.round(resonance.amplifiedConfidence * 100)}%
        </span>
      </div>

      {/* Signal list */}
      <div className="glass-m360__signal-list">
        {signals.map((signal, i) => (
          <div
            key={`${signal.domain}-${i}`}
            className="glass-m360__signal-item"
            data-direction={signal.direction}
            data-severity={signal.severity}
            style={{ "--stagger-i": i } as React.CSSProperties}
          >
            <span className="glass-m360__signal-domain" style={{ color: getDomainColor(signal.domain) }}>
              {getDomainIcon(signal.domain)} {getDomainLabel(signal.domain)}
            </span>
            <span className="glass-m360__signal-text">{signal.signal}</span>
            <span className="glass-m360__signal-confidence">
              {Math.round(signal.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PREDICTIONS PANEL — Windows + trajectory + next best action
// ═══════════════════════════════════════════════════════════════════════

function PredictionsPanel({ predictions }: { predictions: import("./lib/memberPredictions").MemberPredictions }) {
  return (
    <div className="glass-m360__predictions">
      {/* Windows */}
      {predictions.windows.length > 0 && (
        <div className="glass-m360__windows">
          {predictions.windows.map((window, i) => (
            <div
              key={window.metric}
              className="glass-m360__window"
              data-status={window.status}
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              <span className="glass-m360__window-metric">{window.metric}</span>
              <span className="glass-m360__window-status">{window.status}</span>
              <span className="glass-m360__window-days">
                {window.daysRemaining !== null ? `${window.daysRemaining}d` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Engagement trajectory */}
      <div className="glass-m360__trajectory" data-shape={predictions.engagementTrajectory.shape}>
        <span className="glass-m360__trajectory-label">
          Trayectoria: {predictions.engagementTrajectory.shape}
        </span>
        <span className="glass-m360__trajectory-30d">
          30d: {predictions.engagementTrajectory.predicted30d.estimate}
          <span className="glass-m360__trajectory-band">
            [{predictions.engagementTrajectory.predicted30d.lower}–{predictions.engagementTrajectory.predicted30d.upper}]
          </span>
        </span>
      </div>

      {/* Next best action */}
      {predictions.nextBestAction.actions.length > 0 && (
        <div className="glass-m360__nba">
          <p className="glass-m360__nba-strategy">{predictions.nextBestAction.strategy}</p>
          <p className="glass-m360__nba-outcome">{predictions.nextBestAction.expectedOutcome}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ENGAGEMENT DNA PANEL — Channel visualization
// ═══════════════════════════════════════════════════════════════════════

function EngagementDNAPanel({ dna }: { dna: import("./types").EngagementDNAChannel[] }) {
  return (
    <div className="glass-m360__dna">
      {dna.map((channel, i) => {
        return (
          <div
            key={channel.domain}
            className="glass-m360__dna-channel"
            data-trend={channel.trend}
            data-preferred={channel.preferred || undefined}
            style={{ "--stagger-i": i } as React.CSSProperties}
          >
            <span className="glass-m360__dna-domain" style={{ color: getDomainColor(channel.domain) }}>
              {getDomainIcon(channel.domain)} {getDomainLabel(channel.domain)}
            </span>
            <div className="glass-m360__dna-bar-wrap">
              <div
                className="glass-m360__dna-bar"
                style={{
                  width: `${channel.recencyScore}%`,
                  background: getDomainColor(channel.domain),
                }}
              />
            </div>
            <span className="glass-m360__dna-score">{channel.recencyScore}</span>
            <span className="glass-m360__dna-freq">{channel.frequency}/mo</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ADVISOR INSIGHTS LIST — Sorted by priority
// ═══════════════════════════════════════════════════════════════════════

function AdvisorInsightsList({ insights }: { insights: import("./types").Member360AdvisorInsight[] }) {
  return (
    <div className="glass-m360__insights">
      {insights.map((insight, i) => (
        <div
          key={insight.id}
          className="glass-m360__insight"
          data-impact={insight.impact}
          style={{ "--stagger-i": i } as React.CSSProperties}
        >
          <div className="glass-m360__insight-header">
            <span className="glass-m360__insight-impact">{insight.impact}</span>
            <span className="glass-m360__insight-confidence">{insight.confidence}%</span>
          </div>
          <h4 className="glass-m360__insight-title">{insight.title}</h4>
          <p className="glass-m360__insight-reasoning">{insight.reasoning}</p>
          {insight.action && (
            <span className="glass-m360__insight-action">{insight.action.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STREAM SECTION — Wrapper for IntelligenceStream children
// ═══════════════════════════════════════════════════════════════════════

function StreamSection({
  id,
  title,
  icon,
  color,
  priority,
  defaultExpanded,
  badge,
  children,
}: {
  id: string;
  title: string;
  icon: string;
  color: string;
  priority: number;
  defaultExpanded: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className="glass-m360__stream-section"
      data-section-id={id}
      data-expanded={expanded || undefined}
      data-priority={priority}
      style={{ "--section-color": color, "--stagger-i": priority } as React.CSSProperties}
    >
      <Button
        variant="unstyled"
        className="glass-m360__stream-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="glass-m360__stream-icon">{icon}</span>
        <span className="glass-m360__stream-title">{title}</span>
        {badge && <span className="glass-m360__stream-badge" style={{ color }}>{badge}</span>}
        <span className="glass-m360__stream-chevron" data-expanded={expanded || undefined}>
          ›
        </span>
      </Button>
      {expanded && (
        <div className="glass-m360__stream-content">
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TYPING TEXT — Character-by-character reveal
// ═══════════════════════════════════════════════════════════════════════

function TypingText({
  text,
  speedCPS,
  reduced,
}: {
  text: string;
  speedCPS: number;
  reduced: boolean;
}) {
  // In reduced motion, show full text immediately
  // In production, this would use requestAnimationFrame for smooth typing
  // For now, use CSS animation with steps()
  const charCount = text.length;
  const durationSec = reduced ? 0 : charCount / speedCPS;

  return (
    <span
      className="glass-m360__typing"
      style={
        {
          "--typing-chars": charCount,
          "--typing-duration": `${durationSec}s`,
        } as React.CSSProperties
      }
    >
      {text}
    </span>
  );
}