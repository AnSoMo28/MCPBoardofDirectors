// ═══════════════════════════════════════════════════════════
// src/features/guests/GuestManagementDashboard.tsx
// Phase 34 "The Gateway" — "La Gran Sala" (merged rewrite)
// Level 6+ Agency · Production Grade
//
// The living room of guest intelligence.
// Merges:
//   Original: 5 MCP queries, HealthScoreCard, FunnelViz,
//             PipelinePredictorCard, AdvisorBanner, KPIs
//   New:      5-layer Concierge (Canvas, Voice, River,
//             StarMap, AskBar), mode-adaptive layout
//
// Data architecture:
//   5 direct MCP queries → feed legacy components + useGuestDashboard hook
//   useGuestDashboard → feeds Concierge layers (Canvas, Voice, River, StarMap, AskBar)
//
// Checklist: ORCH-1 through ORCH-10, TSX-1-40, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   useMCPQuery → @/shared/hooks/useMCPQuery ✅
//   useGuestDashboard → ./hooks/useGuestDashboard ✅
//   GuestHealthScore → @/shared/mocks/contracts ✅
//   ConversionFunnel → @/shared/mocks/contracts ✅
//   GuestAnalyticsEnhanced → @/shared/mocks/contracts ✅
//   GuestDemandForecast → @/shared/mocks/contracts ✅
//   GuestEngagementProposalList → @/shared/mocks/contracts ✅
//   GuestHealthScoreCard → ./components/GuestHealthScoreCard ✅
//   ConversionFunnelViz → ./components/ConversionFunnelViz ✅
//   PipelinePredictorCard → ./components/PipelinePredictorCard ✅
//   GuestAdvisorBanner → ./components/GuestAdvisorBanner ✅
//   GuestIntelligencePanel → ./components/GuestIntelligencePanel ✅
//   useGuestAdvisor → ./hooks/useGuestAdvisor ✅
//   GuestManagementInsight → ./types ✅
//   GuestDashboardMode → ./types ✅
//   GuestPipelineStage → ./types ✅
//   ConciergeAction → ./lib/conciergeNarrative ✅
//   PageContainer → @/shared/components/layout/PageContainer ✅
//   DetailTabs, DetailTab → @/shared/components/layout/DetailTabs ✅
//   Skeleton → @/shared/components/ui ✅
//   SectionError → @/shared/components/layout/SectionError ✅
//   showToast → @/shared/components/ui/Toast ✅
//   BaseInsight → @/shared/components/AdvisorBanner ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, lazy, Suspense } from "react";

import {
  BarChart3,
  UserPlus,
  PartyPopper,
  Sparkles,
  Brain,
  Loader2,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import {
  DetailTabs,
  type DetailTab,
} from "@/shared/components/layout/DetailTabs";
import { Skeleton } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { showToast } from "@/shared/components/ui/Toast";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";

import type {
  GuestHealthScore,
  ConversionFunnel,
  GuestAnalyticsEnhanced,
  GuestDemandForecast,
  GuestEngagementProposalList,
} from "@/shared/mocks/contracts";

import type {
  GuestDashboardMode,
  GuestPipelineStage
} from "./types";

import type { ConciergeAction } from "./lib/conciergeNarrative";

import { useGuestDashboard } from "./hooks/useGuestDashboard";
import { useGuestAdvisor } from "./hooks/useGuestAdvisor";

// ── Legacy components (preserved from original) ──
import { GuestHealthScoreCard } from "./components/GuestHealthScoreCard";
import { ConversionFunnelViz } from "./components/ConversionFunnelViz";
import { PipelinePredictorCard } from "./components/PipelinePredictorCard";
import { GuestIntelligencePanel } from "./components/GuestIntelligencePanel";
import { GuestAdvisorBanner } from "./components/GuestAdvisorBanner";

// ── Concierge layers (new) ──
import { GuestAmbientCanvas } from "./components/GuestAmbientCanvas";
import { GuestConciergeVoice } from "./components/GuestConciergeVoice";
import { GuestPipelineRiver } from "./components/GuestPipelineRiver";
import { GuestMemoryStarMap } from "./components/GuestMemoryStarMap";
import { GuestAskBar } from "./components/GuestAskBar";

import "./GuestManagementDashboard.css";

// ═══════════════════════════════════════════════════════════
// §1 — LAZY-LOADED TAB PANELS (preserved from original)
// ═══════════════════════════════════════════════════════════

const GuestAnalytics = lazy(() => import("./components/GuestAnalytics"));
const GuestRegistry = lazy(() => import("./components/GuestRegistry"));
const PrivateEventPlanner = lazy(
  () => import("./components/PrivateEventPlanner"),
);
const TrialMembershipManager = lazy(
  () => import("./components/TrialMembershipManager"),
);

// ═══════════════════════════════════════════════════════════
// §2 — SUSPENSE WRAPPER
// ═══════════════════════════════════════════════════════════

function TabPanel({ children }: { readonly children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="gst-dashboard__tab-skeleton">
          <Skeleton className="gst-dashboard__skeleton-heading" />
          <div className="gst-dashboard__skeleton-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="gst-dashboard__skeleton-card" />
            ))}
          </div>
          <div className="gst-dashboard__skeleton-grid-wide">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="gst-dashboard__skeleton-card-lg" />
            ))}
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

// ═══════════════════════════════════════════════════════════
// §3 — FULL DASHBOARD SKELETON
// ═══════════════════════════════════════════════════════════

function DashboardSkeleton() {
  return (
    <div
      className="gst-dashboard"
      data-state="loading"
      role="status"
      aria-label="Cargando dashboard de invitados"
    >
      <div className="gst-dashboard__loading">
        <Loader2 className="gst-dashboard__loading-spinner" />
        <span className="gst-dashboard__loading-text">
          Cargando inteligencia de invitados...
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * "La Gran Sala" — the living room of guest intelligence.
 *
 * Merges original architecture (5 MCP queries, legacy components)
 * with new Concierge architecture (5 intelligence layers).
 *
 * Data flow:
 *   5 MCP queries → legacy components (HealthScore, Funnel, Predictor)
 *   useGuestDashboard hook → Concierge layers (Voice, River, StarMap, AskBar)
 *   useGuestAdvisor → Advisor banner (preserved)
 *
 * @example
 * <Route path="/admin/guests" element={<GuestManagementDashboard />} />
 */
export default function GuestManagementDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");

  // ═══════════════════════════════════════════════════════
  // §4.1 — DATA SOURCES
  // Two paths: direct MCP queries (legacy) + hook (concierge)
  // ═══════════════════════════════════════════════════════

  // ── Direct MCP queries (from original — feeds legacy components) ──
  const healthQuery = useMCPQuery<{ health_score: GuestHealthScore }>(
    "guest_management",
    "get_guest_health_score",
    {},
    { staleTime: 120_000 },
  );

  const funnelQuery = useMCPQuery<{ funnel: ConversionFunnel }>(
    "guest_management",
    "get_conversion_funnel",
    {},
    { staleTime: 120_000 },
  );

  const analyticsEnhancedQuery = useMCPQuery<{ analytics: GuestAnalyticsEnhanced }>(
    "guest_management",
    "get_guest_analytics_enhanced",
    { lookback_days: 90 },
    { staleTime: 120_000 },
  );

  const forecastQuery = useMCPQuery<{ forecast: GuestDemandForecast }>(
    "guest_management",
    "get_guest_forecast",
    { horizon_months: 6 },
    { staleTime: 300_000 },
  );

  const proposalsQuery = useMCPQuery<{ proposals: GuestEngagementProposalList }>(
    "guest_management",
    "generate_guest_engagement_proposals",
    {},
    { staleTime: 300_000 },
  );

  // ── Extract raw MCP data (for legacy components) ──
  const healthData = healthQuery.data?.health_score ?? null;
  const funnelData = funnelQuery.data?.funnel ?? null;
  const analyticsData = analyticsEnhancedQuery.data?.analytics ?? null;
  const forecastData = forecastQuery.data?.forecast ?? null;
  const proposalsData = proposalsQuery.data?.proposals ?? null;

  // ── Hook (from new architecture — feeds Concierge layers) ──
  const dashboard = useGuestDashboard();

  // ── Advisor (from original — feeds AdvisorBanner) ──
  const advisor = useGuestAdvisor(
    healthData,
    funnelData,
    analyticsData,
    forecastData,
    proposalsData,
  );

  // ═══════════════════════════════════════════════════════
  // §4.2 — DERIVED STATE
  // ═══════════════════════════════════════════════════════

  const mode: GuestDashboardMode = dashboard.dashboardMode;

  const isLoading = healthQuery.isLoading || funnelQuery.isLoading;
  const isError = healthQuery.isError || funnelQuery.isError;

  // ═══════════════════════════════════════════════════════
  // §4.3 — HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleConciergeAction = useCallback((action: ConciergeAction) => {
    showToast({
      type: "info",
      message: `Acción: ${action.label}`,
    });
    // TODO: MCP tool execution via action.server, action.tool, action.params
  }, []);

  const handleAdvisorExecute = useCallback(
    (insight: BaseInsight) => {
      showToast({
        type: "info",
        message: `Acción ejecutada — ${insight.title ?? "Procesando..."}`,
      });
    },
    [],
  ); 

  const handleStageClick = useCallback((stageId: GuestPipelineStage) => {
    setActiveTab("analytics");
    showToast({
      type: "info",
      message: `Etapa: ${stageId}`,
    });
  }, []);

  const handleGuestClick = useCallback((guestId: string) => {
    setActiveTab("invitados");
    showToast({
      type: "info",
      message: `Invitado: ${guestId}`,
    });
  }, []);

  const handleRetry = useCallback(() => {
    healthQuery.refetch();
    funnelQuery.refetch();
    analyticsEnhancedQuery.refetch();
    forecastQuery.refetch();
    proposalsQuery.refetch();
  }, [
    healthQuery,
    funnelQuery,
    analyticsEnhancedQuery,
    forecastQuery,
    proposalsQuery,
  ]);

  // ═══════════════════════════════════════════════════════
  // §4.4 — TAB CONFIG
  // ═══════════════════════════════════════════════════════

  const tabs: DetailTab[] = useMemo(
    () => [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "invitados", label: "Invitados", icon: UserPlus },
      { id: "eventos", label: "Eventos", icon: PartyPopper },
      { id: "trials", label: "Trials", icon: Sparkles },
      {
        id: "inteligencia",
        label: "Inteligencia",
        icon: Brain,
        count: proposalsData?.high_priority_count,
      },
    ],
    [proposalsData?.high_priority_count],
  );

  // ═══════════════════════════════════════════════════════
  // §4.5 — LOADING STATE
  // ═══════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <PageContainer
        title="Guest Intelligence"
        subtitle="Cargando inteligencia de invitados..."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Invitados", href: "/admin/guests" },
        ]}
      >
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  // ═══════════════════════════════════════════════════════
  // §4.6 — ERROR STATE
  // ═══════════════════════════════════════════════════════

  if (isError) {
    return (
      <PageContainer
        title="Guest Intelligence"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Invitados", href: "/admin/guests" },
        ]}
      >
        <SectionError
          title="Error cargando datos de invitados"
          description="No se pudieron obtener los datos del módulo de Guest Intelligence."
          onRetry={handleRetry}
        />
      </PageContainer>
    );
  }

  // ═══════════════════════════════════════════════════════
  // §4.7 — MAIN RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <PageContainer
      title="Guest Intelligence"
      subtitle="Gestión de invitados, eventos privados y membresías de prueba"
      breadcrumbs={[
        { label: "Dashboard", href: "/admin" },
        { label: "Invitados", href: "/admin/guests" },
      ]}
    >
      <div
        className="gst-dashboard"
        data-mode={mode}
        data-state="data"
        role="region"
        aria-label="Dashboard de inteligencia de invitados"
        data-testid="guest-dashboard"
      >
        {/* ── Capa 1: Ambient Canvas (behind everything) ── */}
        <GuestAmbientCanvas mode={mode} isActive={true} />

        {/* ── Content (above canvas) ── */}
        <div className="gst-dashboard__content">

          {/* ════════════════════════════════════════════════
              CONCIERGE LAYER: Voice + Legacy Summary
              Voice speaks first, then legacy KPIs below.
              ════════════════════════════════════════════════ */}

          {/* ── Capa 2: The Voice (speaks first) ── */}
          <section
            className="gst-dashboard__section"
            data-layer="voice"
            aria-label="Resumen de inteligencia"
          >
            <GuestConciergeVoice
              dashboard={dashboard}
              onAction={handleConciergeAction}
            />
          </section>

          {/* ── Health Score + Legacy Summary ── */}
          <div
            className="gst-dashboard__summary"
            role="region"
            aria-label="Resumen de salud y métricas"
          >
            {/* Health Score Card (from original) */}
            {healthData && (
              <div className="gst-dashboard__health">
                <GuestHealthScoreCard healthScore={healthData} />
              </div>
            )}

            {/* Pipeline Predictor (from original) */}
            <div className="gst-dashboard__predictor">
              <PipelinePredictorCard
                funnel={funnelData}
                analytics={analyticsData}
                forecast={forecastData}
              />
            </div>
          </div>

          {/* ════════════════════════════════════════════════
              VISUALIZATION LAYER: River + StarMap + Funnel
              Three complementary views of the ecosystem.
              ════════════════════════════════════════════════ */}

          {/* ── Capa 3 + 4: River + StarMap ── */}
          <div
            className="gst-dashboard__visuals"
            data-mode={mode}
            role="region"
            aria-label="Visualización del pipeline y ecosistema"
          >
            <section
              className="gst-dashboard__section"
              data-layer="river"
              aria-label="Pipeline de invitados"
            >
              <GuestPipelineRiver
                pipeline={dashboard.engines?.pipeline ?? null}
                onStageClick={handleStageClick}
              />
            </section>

            <section
              className="gst-dashboard__section"
              data-layer="starmap"
              aria-label="Constelación de ecosistema"
            >
              <GuestMemoryStarMap
                pipeline={dashboard.engines?.pipeline ?? null}
                analytics={analyticsData}
                proposals={proposalsData}
                mode={mode}
                onGuestClick={handleGuestClick}
                onStageClick={handleStageClick}
              />
            </section>
          </div>

          {/* ── Conversion Funnel (from original — full width) ── */}
          {funnelData && (
            <section
              className="gst-dashboard__section"
              data-layer="funnel"
              aria-label="Embudo de conversión"
            >
              <ConversionFunnelViz funnel={funnelData} />
            </section>
          )}

          {/* ════════════════════════════════════════════════
              INTELLIGENCE LAYER: Advisor + AskBar
              Advisor banner (rule-based) + AskBar (conversational)
              ════════════════════════════════════════════════ */}

          {/* ── Advisor Banner (from original — 14 rules) ── */}
          <section
            className="gst-dashboard__section"
            data-layer="advisor"
            aria-label="Recomendaciones del advisor"
          >
            <GuestAdvisorBanner
              insights={[...advisor.insights]}
              topInsights={[...advisor.topInsights]}
              hasHighSeverity={advisor.hasHighSeverity}
              onExecute={handleAdvisorExecute}
            />
          </section>

          {/* ── Capa 5: AskBar (conversational intelligence) ── */}
          <section
            className="gst-dashboard__section"
            data-layer="askbar"
            aria-label="Conversación con la concierge"
          >
            <GuestAskBar
              dashboard={dashboard}
              onAction={handleConciergeAction}
            />
          </section>

          {/* ════════════════════════════════════════════════
              DEEP EXPLORATION: Tabs
              For granular data access when needed.
              ════════════════════════════════════════════════ */}

          <nav
            className="gst-dashboard__tabs-nav"
            aria-label="Secciones de Guest Intelligence"
          >
            <DetailTabs
              tabs={tabs}
              active={activeTab}
              onChange={setActiveTab}
              ariaLabel="Secciones de Guest Intelligence"
            />
          </nav>

          <div className="gst-dashboard__tab-content">
            {activeTab === "analytics" && (
              <TabPanel>
                <GuestAnalytics />
              </TabPanel>
            )}
            {activeTab === "invitados" && (
              <TabPanel>
                <GuestRegistry />
              </TabPanel>
            )}
            {activeTab === "eventos" && (
              <TabPanel>
                <PrivateEventPlanner />
              </TabPanel>
            )}
            {activeTab === "trials" && (
              <TabPanel>
                <TrialMembershipManager />
              </TabPanel>
            )}
            {activeTab === "inteligencia" && (
              <TabPanel>
                <GuestIntelligencePanel
                  forecast={forecastData}
                  proposals={proposalsData}
                  analytics={analyticsData}
                />
              </TabPanel>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}