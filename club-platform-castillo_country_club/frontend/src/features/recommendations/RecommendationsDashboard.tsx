// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Neural Command Center (2027 REWRITE)
//
// Architecture: Intelligence Stream (NOT tabs)
//   1. Mode Indicator — system state awareness
//   2. Focus Navigation — scroll-to-section pills
//   3. Pulse Check — AdvisorBanner
//   4. The Brief — ExecutiveBrief (typing narrative)
//   5. Mode-Dependent Hero — Radar | Canvas+Simulator | Queue
//   6. The Mind — SynthesisEngine (agent-driven)
//   7. Intelligence Grid — ConflictResolver | SocialTopology | Temporal
//   8. Intelligence Stream — Existing components in vertical flow
//
// Adaptive Morphism: layout morphs via data-mode="observe|analyze|act"
// Glass namespace: .glass-rec
//
// v38: 7-tab static layout → 2027: Intelligence Stream with adaptive modes
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  Eye,
  Zap,
  AlertTriangle,
  TrendingUp,
  Target,
  BarChart3,
  Users,
  Lightbulb,
  DollarSign,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui/Button";
import { Skeleton } from "@/shared/components/ui/Skeleton";

import {
  useRecommendationDashboard,
  type FocusPanelId,
} from "./hooks/useRecommendationDashboard";

import {
  runSynthesisPipeline,
  generateAllAutonomousActions,
  assessSynthesisHealth,
} from "./lib/recommendationSynthesis";

// ── Intelligence components (NEW 2027) ────────────────────────────────
import { RecAdvisorBanner } from "./components/RecAdvisorBanner";
import { RecExecutiveBrief } from "./components/RecExecutiveBrief";
import { RecSynthesisEngine } from "./components/RecSynthesisEngine";
import { RecOpportunityRadar } from "./components/RecOpportunityRadar";
import { RecReasoningCanvas } from "./components/RecReasoningCanvas";
import { RecAutonomousQueue } from "./components/RecAutonomousQueue";
import { RecRevenueSimulator } from "./components/RecRevenueSimulator";
import { RecConflictResolver } from "./components/RecConflictResolver";
import { RecSocialTopology } from "./components/RecSocialTopology";
import { RecTemporalIntelligence } from "./components/RecTemporalIntelligence";

// ── Existing components (to be rewritten) ─────────────────────────────
import { FamilyRecommendations } from "./components/FamilyRecommendations";
import { SchedulingConflicts } from "./components/SchedulingConflicts";
import { PredictAttendance } from "./components/PredictAttendance";
import { PricingOptimizer } from "./components/PricingOptimizer";
import { ActivitySuggester } from "./components/ActivitySuggester";
import { SocialClusters } from "./components/SocialClusters";
import { QuarterlyInsights } from "./components/QuarterlyInsights";

import type { RecommendationMode } from "./types";

import "./RecommendationsDashboard.css";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const BREADCRUMBS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Recomendaciones", href: "/admin/recommendations" },
];

const FOCUS_PANELS: Array<{
  id: FocusPanelId;
  label: string;
  icon: typeof Eye;
  sectionId: string;
}> = [
  { id: "overview", label: "General", icon: Eye, sectionId: "rec-hero" },
  { id: "opportunities", label: "Oportunidades", icon: Target, sectionId: "rec-hero" },
  { id: "conflicts", label: "Conflictos", icon: AlertTriangle, sectionId: "rec-grid" },
  { id: "pricing", label: "Precios", icon: DollarSign, sectionId: "rec-stream" },
  { id: "clusters", label: "Clusters", icon: Users, sectionId: "rec-stream" },
  { id: "predictions", label: "Predicciones", icon: TrendingUp, sectionId: "rec-stream" },
  { id: "quarterly", label: "Trimestral", icon: BarChart3, sectionId: "rec-stream" },
  { id: "actions", label: "Acciones", icon: Zap, sectionId: "rec-hero" },
];

const MODE_CONFIG: Record<
  RecommendationMode,
  { label: string; detail: (ctx: { criticalCount: number; correlations: number; signals: number }) => string }
> = {
  observe: {
    label: "Observando",
    detail: (ctx) => `${ctx.signals} señales en monitoreo`,
  },
  analyze: {
    label: "Analizando",
    detail: (ctx) => `${ctx.correlations} correlaciones activas`,
  },
  act: {
    label: "Actuando",
    detail: (ctx) => `${ctx.criticalCount} acciones urgentes`,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════

function DashboardSkeleton() {
  return (
    <PageContainer
      title="Recomendaciones Proactivas"
      subtitle="Cargando motor de inteligencia..."
      breadcrumbs={BREADCRUMBS}
    >
      <div className="glass-rec" data-mode="observe">
        <Skeleton className="rec-skeleton rec-skeleton--banner" />
        <Skeleton className="rec-skeleton rec-skeleton--brief" />
        <Skeleton className="rec-skeleton rec-skeleton--hero" />
        <div className="rec-intelligence-grid">
          <Skeleton className="rec-skeleton rec-skeleton--panel" />
          <Skeleton className="rec-skeleton rec-skeleton--panel" />
          <Skeleton className="rec-skeleton rec-skeleton--panel" />
        </div>
      </div>
    </PageContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecommendationsDashboard() {
  const dashboard = useRecommendationDashboard();
  const prefersReduced = useReducedMotion();

  // ── Synthesis pipeline (pure computation) ───────────────────────────
  const synthesisInput = useMemo(
    () => ({
      pricings: dashboard.pricings ?? [],
      suggestions: dashboard.suggestions ?? [],
      insights: dashboard.quarterlyInsights ?? [],
      recommendations: dashboard.recommendations ?? [],
      predictions: dashboard.predictions ?? [],
      conflicts: dashboard.conflicts ?? [],
      clusters: dashboard.clusters ?? [],
    }),
    [
      dashboard.pricings,
      dashboard.suggestions,
      dashboard.quarterlyInsights,
      dashboard.recommendations,
      dashboard.predictions,
      dashboard.conflicts,
      dashboard.clusters,
    ],
  );

  const synthesis = useMemo(
    () => runSynthesisPipeline(synthesisInput),
    [synthesisInput],
  );

  const autonomousActions = useMemo(
    () => generateAllAutonomousActions(synthesis.opportunities),
    [synthesis.opportunities],
  );

  const synthesisHealth = useMemo(
    () => assessSynthesisHealth(synthesisInput),
    [synthesisInput],
  );

  // ── Scroll to section ───────────────────────────────────────────────
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
  };

  // ── Loading state ───────────────────────────────────────────────────
  if (dashboard.isLoading) {
    return <DashboardSkeleton />;
  }

  // ── Error state (no data at all) ────────────────────────────────────
  if (dashboard.isError && !dashboard.hasMinimumData) {
    return (
      <PageContainer
        title="Recomendaciones Proactivas"
        subtitle="Motor de inteligencia para optimización del club"
        breadcrumbs={BREADCRUMBS}
      >
        <EmptyState
          title="Sin datos disponibles"
          description="No se pudieron cargar los datos de recomendaciones. Verificá tu conexión e intentá de nuevo."
          action={
            <Button
              variant="primary"
              onClick={() => {
                Object.values(dashboard.queries).forEach((q) =>
                  q.refetch(),
                );
              }}
            >
              Reintentar
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // ── Mode context ────────────────────────────────────────────────────
  const modeCfg = MODE_CONFIG[dashboard.mode];
  const modeDetail = modeCfg.detail({
    criticalCount: dashboard.criticalItems.totalCriticalCount,
    correlations: synthesis.totalCorrelations,
    signals: synthesis.totalSignals,
  });

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <PageContainer
      title="Recomendaciones Proactivas"
      subtitle={`Motor de inteligencia · ${synthesis.totalSignals} señales · ${synthesis.totalCorrelations} correlaciones`}
      breadcrumbs={BREADCRUMBS}
    >
      <div className="glass-rec" data-mode={dashboard.mode}>

        {/* ── Mode Indicator ─────────────────────────────────────────── */}
        <div className="rec-mode-indicator" data-mode={dashboard.mode}>
          <span className="rec-mode-dot" aria-hidden="true" />
          <span className="rec-mode-label">{modeCfg.label}</span>
          <span className="rec-mode-detail">{modeDetail}</span>
        </div>

        {/* ── Focus Navigation ───────────────────────────────────────── */}
        <nav className="rec-focus-nav" aria-label="Navegación de inteligencia">
          {FOCUS_PANELS.map((panel) => {
            const Icon = panel.icon;
            return (
              <button
                key={panel.id}
                type="button"
                className="rec-focus-pill"
                data-active={
                  dashboard.activeFocus === panel.id || undefined
                }
                onClick={() => {
                  dashboard.setActiveFocus(panel.id);
                  scrollToSection(panel.sectionId);
                }}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{panel.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── 1. Pulse Check ─────────────────────────────────────────── */}
        <section data-section="pulse" id="rec-pulse">
          <RecAdvisorBanner
            insights={dashboard.advisor.insights}
            topInsights={dashboard.advisor.topInsights}
            hasHighSeverity={dashboard.advisor.hasHighSeverity}
            mode={dashboard.mode}
          />
        </section>

        {/* ── 2. The Brief ───────────────────────────────────────────── */}
        <section data-section="brief" id="rec-brief">
          <RecExecutiveBrief
            advisor={dashboard.advisor}
            mode={dashboard.mode}
            opportunities={synthesis.opportunities}
            criticalItems={dashboard.criticalItems}
            synthesisHealth={synthesisHealth}
            reducedMotion={prefersReduced}
          />
        </section>

        {/* ── 3. Mode-Dependent Hero ─────────────────────────────────── */}
        <section data-section="hero" id="rec-hero">
          {dashboard.mode === "act" ? (
            <RecAutonomousQueue
              actions={autonomousActions}
              conflicts={dashboard.sortedData.conflicts}
              mode={dashboard.mode}
              reducedMotion={prefersReduced}
            />
          ) : dashboard.mode === "analyze" ? (
            <div className="rec-hero-pair">
              <RecReasoningCanvas
                opportunities={synthesis.opportunities}
                reducedMotion={prefersReduced}
              />
              <RecRevenueSimulator
                pricings={dashboard.sortedData.pricings}
                reducedMotion={prefersReduced}
              />
            </div>
          ) : (
            <RecOpportunityRadar
              opportunities={synthesis.opportunities}
              crossDomainSummaries={synthesis.crossDomainSummaries}
              reducedMotion={prefersReduced}
            />
          )}
        </section>

        {/* ── 4. The Mind ────────────────────────────────────────────── */}
        <section data-section="synthesis" id="rec-synthesis">
          <RecSynthesisEngine
            isSynthesizing={dashboard.isSynthesizing}
            onTrigger={dashboard.triggerSynthesis}
            opportunities={synthesis.opportunities}
            crossDomainSummaries={synthesis.crossDomainSummaries}
            totalSignals={synthesis.totalSignals}
            totalCorrelations={synthesis.totalCorrelations}
            health={synthesisHealth}
            reducedMotion={prefersReduced}
          />
        </section>

        {/* ── 5. Intelligence Grid ───────────────────────────────────── */}
        <section
          className="rec-intelligence-grid"
          data-section="grid"
          id="rec-grid"
        >
          <RecConflictResolver
            conflicts={dashboard.sortedData.conflicts}
            reducedMotion={prefersReduced}
          />
          <RecSocialTopology
            clusters={dashboard.sortedData.clusters}
            reducedMotion={prefersReduced}
          />
          <RecTemporalIntelligence
            insights={dashboard.sortedData.quarterlyInsights}
            recommendations={dashboard.sortedData.recommendations}
            reducedMotion={prefersReduced}
          />
        </section>

        {/* ── 6. Intelligence Stream ─────────────────────────────────── */}
        <section
          className="rec-intelligence-stream"
          data-section="stream"
          id="rec-stream"
        >
          <div className="rec-stream-block" data-stream="recommendations">
            <h3 className="rec-stream-header">
              <Target size={16} aria-hidden="true" />
              Recomendaciones Familiares
            </h3>
            <FamilyRecommendations />
          </div>

          <div className="rec-stream-block" data-stream="conflicts">
            <h3 className="rec-stream-header">
              <AlertTriangle size={16} aria-hidden="true" />
              Conflictos de Programación
            </h3>
            <SchedulingConflicts />
          </div>

          <div className="rec-stream-block" data-stream="predictions">
            <h3 className="rec-stream-header">
              <TrendingUp size={16} aria-hidden="true" />
              Predicciones de Asistencia
            </h3>
            <PredictAttendance />
          </div>

          <div className="rec-stream-block" data-stream="pricing">
            <h3 className="rec-stream-header">
              <DollarSign size={16} aria-hidden="true" />
              Optimización de Precios
            </h3>
            <PricingOptimizer />
          </div>

          <div className="rec-stream-block" data-stream="activities">
            <h3 className="rec-stream-header">
              <Lightbulb size={16} aria-hidden="true" />
              Sugerencias de Actividades
            </h3>
            <ActivitySuggester />
          </div>

          <div className="rec-stream-block" data-stream="clusters">
            <h3 className="rec-stream-header">
              <Users size={16} aria-hidden="true" />
              Clusters Sociales
            </h3>
            <SocialClusters />
          </div>

          <div className="rec-stream-block" data-stream="quarterly">
            <h3 className="rec-stream-header">
              <BarChart3 size={16} aria-hidden="true" />
              Insights Trimestrales
            </h3>
            <QuarterlyInsights />
          </div>
        </section>
      </div>

      {/* ── Inline keyframes (reduced motion fallback) ──────────────── */}
      {!prefersReduced && (
        <style>{`
          @keyframes recFadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes recSlideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </PageContainer>
  );
}

