// ═══════════════════════════════════════════════════════════
// src/features/age-group/AgeGroupDashboard.tsx
// Phase 34+ Migration — Dashboard Orchestrator (v2)
// Level 6+ Agency · Production Grade
//
// "The Nervous System" — Intelligence-first orchestrator.
// Consumes: globals.css tokens, glass-card, frost-badge,
//   alert-card, real keyframes, real typography.
//
// v2 CHANGES vs v1:
//   - glass-ag → glass-card primitives
//   - Custom surface → glass-card + data-tone
//   - Custom badges → frost-badge--gold/teal/emerald
//   - Custom nudge → alert-card--premium
//   - Playfair Display → Cormorant Garamond (--font-display)
//   - Invented tokens → globals.css real tokens
//   - 65+ feature keyframes → reuse globals.css 107+
//   - Broken 1-col hero → 3-col asymmetric grid
//   - CohortVitals stacked → grid within cell
//
// PRE-WRITE VERIFICATION:
//   DashboardTabId → ./hooks/useAgeGroupDashboard ✅
//   BaseInsight → @/shared/components/AdvisorBanner ✅
//   DetailTabs → @/shared/components/layout/DetailTabs ✅
//   SectionError → @/shared/components/layout/SectionError ✅
//   showToast → @/shared/components/ui/Toast ✅
//   All sub-components → ./components/* ✅
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  Brain,
  Sun,
  CloudSun,
  CloudRain,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DetailTabs } from "@/shared/components/layout/DetailTabs";
import { SectionError } from "@/shared/components/layout/SectionError";
import { showToast } from "@/shared/components/ui/Toast";

import { useAgeGroupDashboard } from "./hooks/useAgeGroupDashboard";
import type { DashboardTabId } from "./hooks/useAgeGroupDashboard";
import { GenerationalPrism } from "./components/GenerationalPrism";
import { CohortVitals } from "./components/CohortVitals";
import { AgeGroupHealthScore } from "./components/AgeGroupHealthScore";
import { AgeGroupAdvisorBanner } from "./components/AgeGroupAdvisorBanner";
import { AgeGroupDistributionPanel } from "./components/AgeGroupDistributionPanel";
import { AgeGroupProgramsPanel } from "./components/AgeGroupProgramsPanel";
import { AgeGroupTrendsPanel } from "./components/AgeGroupTrendsPanel";
import { AgeGroupIntelligencePanel } from "./components/AgeGroupIntelligencePanel";

import type { BaseInsight } from "@/shared/components/AdvisorBanner";

import "./AgeGroupDashboard.css";
import { Button } from "@/shared/components/ui/Button";

/* ── §0  Constants ────────────────────────────────────────── */

const TAB_ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  "book-open": BookOpen,
  "trending-up": TrendingUp,
  brain: Brain,
};

const SEASON_ICON_MAP: Record<
  string,
  React.ComponentType<{ readonly size?: number }>
> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  "cloud-rain": CloudRain,
};

/* ── §1  Boot Sequence ───────────────────────────────────── */

const BOOT_AGENTS = [
  "Cohort Analyzer",
  "Balance Engine",
  "Cross-Domain Sync",
  "Seasonal Context",
] as const;

function AwakeningLoader() {
  return (
    <div
      className="ag__awakening"
      role="status"
      aria-label="Inicializando inteligencia demográfica"
      data-testid="ag-awakening"
    >
      <div className="ag__awakening-ring" aria-hidden="true">
        <div className="ag__awakening-pulse" />
        <Brain size={32} className="ag__awakening-icon" />
      </div>

      <div
        className="ag__awakening-agents"
        role="list"
        aria-label="Agentes AI inicializando"
      >
        {BOOT_AGENTS.map((name, i) => (
          <div
            key={name}
            className="ag__awakening-agent"
            role="listitem"
            style={{ "--stagger-i": i } as CSSProperties}
          >
            <span className="ag__awakening-dot" aria-hidden="true" />
            <span>{name}</span>
          </div>
        ))}
      </div>

      <p className="ag__awakening-text">
        Inicializando agentes AI...
      </p>

      <div className="ag__awakening-bar" aria-hidden="true">
        <div className="ag__awakening-bar-fill" />
      </div>
    </div>
  );
}

/* ── §2  Dormant State ───────────────────────────────────── */

function DormantState({
  onRetry,
}: Readonly<{ onRetry: () => void }>) {
  return (
    <div
      className="ag__dormant"
      role="status"
      data-testid="ag-dormant"
    >
      <div className="ag__dormant-orb" aria-hidden="true" />
      <h2 className="ag__dormant-title">
        Sistema AI en espera
      </h2>
      <p className="ag__dormant-desc">
        Sin datos de distribución etaria disponibles
      </p>
      <Button
        variant="unstyled"
        className="ag__dormant-btn lunar-btn lunar-btn--gold"
        onClick={onRetry}
        type="button"
        aria-label="Activar inteligencia demográfica"
      >
        <Activity size={16} aria-hidden="true" />
        <span>Activar inteligencia</span>
      </Button>
    </div>
  );
}

/* ── §3  Orchestrator ─────────────────────────────────────── */

/**
 * Age Group Dashboard — "The Nervous System"
 *
 * Intelligence-first orchestrator that adapts layout to seasonal
 * context, surfaces inter-generational signals via neural bridge,
 * and nudges attention toward high-priority intelligence.
 *
 * Layout: 3-column hero (prism | health | vitals), full-width
 * advisor, tabbed deep-dive. Consumes glass-card, frost-badge,
 * alert-card primitives from globals.css.
 */
export function AgeGroupDashboard() {
  const {
    season,
    intelligenceScore,
    prismSegments,
    tabConfigs,
    systemStatus,
    healthScore,
    analytics,
    recommendations,
    proposals,
    insights,
    topInsights,
    hasHighSeverity,
    cohortHealth,
    agingOutRisks,
    ripples,
    seasonalContext,
    insightBrackets,
    insightTiers,
    advisorVitals,
    isLoading,
    isError,
    healthQuery,
    analyticsQuery,
    recommendationsQuery,
    proposalsQuery,
  } = useAgeGroupDashboard();

  const [activeTab, setActiveTab] =
    useState<DashboardTabId>("demographics");

  /* ── Callbacks ── */

  const handleExecute = useCallback((insight: BaseInsight) => {
    showToast({
      type: "info",
      message: `Acción ejecutada: ${insight.action?.label ?? "Procesando..."}`,
    });
  }, []);

  const handleRetry = useCallback(() => {
    healthQuery.refetch();
    analyticsQuery.refetch();
    recommendationsQuery.refetch();
    proposalsQuery.refetch();
  }, [healthQuery, analyticsQuery, recommendationsQuery, proposalsQuery]);

  /* ── Computed ── */

  useMemo(() => {
        const map: Partial<Record<DashboardTabId, "high">> = {};
        if (hasHighSeverity) map.intelligence = "high";
        if (agingOutRisks?.some((r) => r.urgency === "act")) {
          map.demographics = "high";
        }
        return map;
      }, [hasHighSeverity, agingOutRisks]);

  const topNudge = useMemo(() => {
    if (!hasHighSeverity || !topInsights?.length) return null;
    return topInsights[0];
  }, [hasHighSeverity, topInsights]);

  /* ── Early Returns ── */

  if (isLoading) return <AwakeningLoader />;

  if (isError && !analytics) {
    return (
      <div className="ag__error" data-testid="ag-error">
        <SectionError
          title="Error cargando datos etarios"
          description="No se pudieron obtener los datos del módulo de Gestión Etaria."
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!isLoading && !analytics && !healthScore) {
    return <DormantState onRetry={handleRetry} />;
  }

  /* ── Derived ── */

  const SeasonIcon = SEASON_ICON_MAP[season.icon] ?? Sun;

  function renderTab(tabId: DashboardTabId) {
    switch (tabId) {
      case "demographics":
        return analytics ? (
          <AgeGroupDistributionPanel
            ageDistribution={analytics.age_distribution}
            familyParticipationRate={analytics.family_participation_rate}
            cohortHealth={cohortHealth}
            ripples={ripples}
            agingOutRisks={agingOutRisks}
          />
        ) : null;
      case "programs":
        return analytics ? (
          <AgeGroupProgramsPanel
            programs={analytics.program_popularity}
          />
        ) : null;
      case "trends":
        return analytics ? (
          <AgeGroupTrendsPanel
            trends={analytics.monthly_trends}
          />
        ) : null;
      case "intelligence":
        return (
          <AgeGroupIntelligencePanel
            recommendations={
              recommendations ? [recommendations] : []
            }
            proposals={proposals}
          />
        );
      default:
        return null;
    }
  }

  /* ── Render ── */

  return (
    <div
      className="ag"
      data-season={season.tidePhase}
      data-testid="ag-dashboard"
    >
      {/* ═══════════════════════════════════════════════
          § Header — Neural Crown
          ═══════════════════════════════════════════════ */}
      <header
        className="ag__header"
        role="banner"
        data-testid="ag-header"
      >
        <div className="ag__header-text">
          <h1 className="ag__title">Gestión Etaria</h1>
          <p className="ag__subtitle">
            Directorio de inteligencia demográfica
          </p>
        </div>

        <div className="ag__header-meta">
          <span
            className="frost-badge frost-badge--emerald"
            aria-label={`Estado: ${systemStatus.label}`}
          >
            <span
              className="ag__dot"
              data-healthy={systemStatus.healthy}
              aria-hidden="true"
            />
            {systemStatus.label}
          </span>

          <span
            className="frost-badge frost-badge--teal"
            aria-label={`Estacionalidad: ${season.label}`}
          >
            <SeasonIcon size={12} aria-hidden="true" />
            {season.label}
          </span>

          <span
            className="frost-badge frost-badge--gold"
            aria-label={`AI Score: ${intelligenceScore}`}
          >
            <Brain size={10} aria-hidden="true" />
            AI {intelligenceScore}
          </span>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          § Hero — Brain Stem (3-column asymmetric)
          Prism | Health Score | Cohort Vitals
          ═══════════════════════════════════════════════ */}
      <section
        className="ag__hero"
        role="region"
        aria-label="Resumen demográfico"
        data-testid="ag-hero"
      >
        {/* Prism — Generational donut */}
        <div
          className="glass-card ag__cell ag__cell--prism"
          data-tone="gold"
        >
          <div className="ag__cell-body">
            <GenerationalPrism
              segments={prismSegments}
              intelligenceScore={intelligenceScore}
            />
          </div>
        </div>

        {/* Health Score — Orbital ring + constellation */}
        <div
          className="glass-card ag__cell ag__cell--health"
          data-tone="teal"
        >
          <div className="ag__cell-body">
            {healthScore ? (
              <AgeGroupHealthScore
                score={healthScore.overall_score}
                level={healthScore.level}
                trend={healthScore.trend}
                factors={healthScore.factors}
                alerts={healthScore.alerts}
                summary={healthScore.summary}
                generatedAt={healthScore.generated_at}
                cohortHealth={cohortHealth}
              />
            ) : (
              <div className="ag__cell-placeholder">
                <Brain
                  size={24}
                  className="ag__cell-placeholder-icon"
                  aria-hidden="true"
                />
                <span>Calculando salud...</span>
              </div>
            )}
          </div>
        </div>

        {/* Cohort Vitals — 7 bracket mini-cards */}
        <div
          className="glass-card ag__cell ag__cell--vitals"
          data-tone="emerald"
        >
          <div className="ag__cell-body">
            <CohortVitals segments={prismSegments} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          § Neural Bridge — Inter-generational signals
          ═══════════════════════════════════════════════ */}
      {ripples && ripples.length > 0 && (
        <section
          className="ag__bridge"
          role="region"
          aria-label="Señales inter-generacionales"
          data-testid="ag-bridge"
        >
          {ripples.slice(0, 3).map((ripple, i) => (
            <div
              key={ripple.source}
              className="ag__bridge-path"
              style={
                { "--stagger-i": i } as CSSProperties
              }
            >
              <span className="ag__bridge-src">
                {ripple.source}
              </span>
              <span
                className="ag__bridge-arrow"
                aria-hidden="true"
              >
                →
              </span>
              <span className="ag__bridge-dir">
                {ripple.direction}
              </span>
              <span className="ag__bridge-sig">
                {ripple.description}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          § Advisor Banner — Intelligence Cortex
          ═══════════════════════════════════════════════ */}
      <div
        className="ag__advisor"
        data-testid="ag-advisor"
      >
        <AgeGroupAdvisorBanner
          insights={insights}
          topInsights={topInsights}
          hasHighSeverity={hasHighSeverity}
          onExecute={handleExecute}
          ripples={ripples}
          agingOutRisks={agingOutRisks}
          seasonalContext={seasonalContext}
          insightBrackets={insightBrackets}
          insightTiers={insightTiers}
          systemStatus={systemStatus}
          advisorVitals={advisorVitals}
        />
      </div>

      {/* ═══════════════════════════════════════════════
          § Intelligence Nudge — "Look here first"
          ═══════════════════════════════════════════════ */}
      {topNudge && (
        <Button
          variant="unstyled"
          className="alert-card alert-card--premium ag__nudge"
          onClick={() => setActiveTab("intelligence")}
          type="button"
          aria-label={`Señal de alta prioridad: ${topNudge.title ?? "Investigar"}`}
          data-testid="ag-nudge"
        >
          <Brain
            size={16}
            className="ag__nudge-icon"
            aria-hidden="true"
          />
          <span className="ag__nudge-text">
            {topNudge.title ?? "Señal de alta prioridad detectada"}
          </span>
          <span className="ag__nudge-cta" aria-hidden="true">
            Investigar →
          </span>
        </Button>
      )}

      {/* ═══════════════════════════════════════════════
          § Thought Trails — Adaptive Tabs
          ═══════════════════════════════════════════════ */}
      <nav
        className="ag__tabs"
        role="navigation"
        aria-label="Pestañas de análisis"
        data-testid="ag-tabs"
      >
        <DetailTabs
          tabs={tabConfigs.map((t) => ({
            id: t.id,
            label: t.label,
            icon: TAB_ICON_MAP[t.icon] ?? Brain,
          }))}
          active={activeTab}
          onChange={(id) =>
            setActiveTab(id as DashboardTabId)
          }
        />
      </nav>

      {/* ═══════════════════════════════════════════════
          § Deep Dive — Tab Content
          ═══════════════════════════════════════════════ */}
      <div
        className="ag__content"
        key={activeTab}
        data-testid="ag-content"
      >
        {renderTab(activeTab)}
      </div>
    </div>
  );
}