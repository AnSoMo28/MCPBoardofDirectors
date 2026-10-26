// src/features/dashboard/ExecutiveDashboard.tsx
// ═══════════════════════════════════════════════════════════
// Executive Dashboard — Castillo Country Club
//
// Fase 16 — REWRITE
// + Consumes real backend data via get_executive_summary
// + Transform helpers from types.ts (NO MOCK_INLINE)
// + RevenueChart → RevenueSourcesChart (real data)
// + HitlQueue moved to ExecutiveIntelligenceStrip
// + AnomalyFeed + AgeBalanceWidget → E3 (on-demand/sub-page)
// - Eliminated ALL MOCK_INLINE constants
// - Eliminated HitlQueue from body (already in strip)
// - Eliminated duplicate get_operational_pulse query
//   (summary already includes operational data)
//
// Rules: #1 tokens, #2 no blur, #11 a11y, #14 EmptyState,
//        #17 Button, #18 reducedMotion, #20 breakpoint
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { getGreeting } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { exportReport, buildExportData } from "@/shared/lib/exportReport";
import type { ExportMetadata } from "@/shared/lib/exportReport";
import { useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button, Skeleton, showToast } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { AnomalyFeed } from "./components/AnomalyFeed";
import { AgeBalanceWidget } from "./components/AgeBalanceWidget";
import {
  Activity, AlertTriangle, Sparkles, RefreshCw, AlertCircle,
  Scale, ChevronRight, DollarSign, Users,
  ClipboardList, Download, FileSpreadsheet, FileText, Brain, LayoutDashboard,
} from "lucide-react";
import AIDecisionPanel from "@/shared/components/ai/AIDecisionPanel";
import {
  PeriodSelector,
  type DashboardPeriod,
} from "./components/PeriodSelector";
import { KPICards } from "./components/KPICards";
import { RevenueChart } from "./components/RevenueChart";
import { MembershipDonut } from "./components/MembershipDonut";
import { TopActivities } from "./components/TopActivities";
import {
  QuickActions,
  getDefaultActions,
} from "./components/QuickActions";
import YearOverYearToggle from "./components/YearOverYearToggle";
import { ExecutiveIntelligenceStrip } from "./components/ExecutiveIntelligenceStrip";
import { useGlobalData } from "@/features/dashboard/hooks/useGlobalData";
import { usePulseVitals } from "@/shared/hooks/usePulseVitals";
import { ThePulse } from "./components/ThePulse";
import { PulseStatusDot } from "./components/PulseStatusDot";
import { SignalBusDebugPanel } from "@/shared/components/layout/SignalBusDebugPanel";
import GlobalAdvisorBanner from "./components/GlobalAdvisorBanner";
import { PredictiveIntelligenceFeed } from "@/shared/components/ml/PredictiveIntelligenceFeed";

import { AdvisorActionModal } from "@/shared/components/ui/AdvisorActionModal";

import type {
  KPIData,
  TierData,
  ActivityData,
  RevenueSourceData,
  DetectAnomaliesResponse,
  AgeGroupBalanceResponse,
  AnomalyUI,
  AdvisorRecommendation,
  AdvisorReactionInsight,
  AdvisorActionState,
  GlobalAdvisorInsight
} from "./types";
import { generateReactionInsight } from "@/shared/lib/reactionTemplate";
import {
  summaryToKPIs,
  buildTierData,
  buildActivityData,
  buildRevenueSources,
  anomalyToUI,
  ageGroupToUI,
  generateExecutiveRecommendations,
  RECO_PRIORITY_CONFIG,
} from "./types";
import { useChatStore } from "@/stores/chat.store";
import { callMCPTool } from "@/shared/lib/api";
import { DetailTabs } from "@/shared/components/layout/DetailTabs";

/* ══════════════════════════════════════════════════════════
   Skeleton
   ══════════════════════════════════════════════════════════ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-80 rounded-[var(--radius-lg)]" />
      <Skeleton className="h-48 rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-28 rounded-[var(--radius-lg)]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-80 rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "SOCIO";
  const reduced = useReducedMotion();
  useBreakpoint();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<DashboardPeriod>(
    "current_quarter",
  );
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [showAgeBalance, setShowAgeBalance] = useState(false);
  const [showPredictive, setShowPredictive] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("pulse");


  /* ── Layer 0: Cross-domain data (F47-C) ────────────────── */
  // Replaces direct summaryQ + useGlobalAdvisor with null params.
  // useGlobalData fetches: executive summary, finance AI report,
  // events calendar, and HITL approvals across 3 servers.
  // H-13 FIXED: aiReport, calendarDays, pendingApprovals, todayEvents
  // are now real data instead of null/0.
  const globalData = useGlobalData({ period });
  const summary = globalData.summary;
  const globalInsights = globalData.insights;

  /* ── Layer 1: On-demand anomalies ─────────────────────── */
  const anomalyQ = useMCPQuery<DetectAnomaliesResponse>(
    "executive_dashboard",
    "detect_anomalies",
    {},
    { enabled: showAnomalies },
  );

  const anomalyUIList = useMemo<AnomalyUI[] | undefined>(
    () => anomalyQ.data?.anomalies?.map(anomalyToUI),
    [anomalyQ.data],
  );

  /* ── Layer 1: On-demand age balance ───────────────────── */
  const ageBalanceQ = useMCPQuery<AgeGroupBalanceResponse>(
    "executive_dashboard",
    "get_age_group_balance",
    { period },
    { enabled: showAgeBalance },
  );

  const ageBalanceData = useMemo(
    () =>
      ageBalanceQ.data ? ageGroupToUI(ageBalanceQ.data) : undefined,
    [ageBalanceQ.data],
  );

  /* ── Layer 1: On-demand ML Predictive Intelligence ──── */
  const revenueForecastQ = useMCPQuery<{ revenue_forecast: import("@/shared/mocks/contracts").RevenueForecast | null }>(
    "ml_intelligence",
    "get_revenue_forecast",
    {},
    { enabled: showPredictive, staleTime: 300_000 },
  );
  const churnMLQ = useMCPQuery<{ churn_report: import("@/shared/mocks/contracts").ChurnMLReport | null }>(
    "ml_intelligence",
    "get_churn_ml_scores",
    {},
    { enabled: showPredictive, staleTime: 120_000 },
  );
  const anomalyMLQ = useMCPQuery<{ anomaly_report: import("@/shared/mocks/contracts").AnomalyReport | null }>(
    "ml_intelligence",
    "get_anomaly_report",
    {},
    { enabled: showPredictive, staleTime: 120_000 },
  );
  const dataQualityQ = useMCPQuery<{ quality_report: import("@/shared/mocks/contracts").DataQualityReport | null }>(
    "ml_intelligence",
    "get_data_quality_report",
    {},
    { enabled: showPredictive, staleTime: 120_000 },
  );

  /* ── Layer 2: Client-side advisor recommendations ────── */
  const recommendations = useMemo<AdvisorRecommendation[]>(
    () =>
      summary
        ? generateExecutiveRecommendations(
            summary,
            anomalyQ.data,
            ageBalanceQ.data,
          )
        : [],
    [summary, anomalyQ.data, ageBalanceQ.data],
  );

  // ── Sync advisor context to chat store ──
  const setAdvisorContext = useChatStore((s) => s.setAdvisorContext);


  /* ── The Pulse: Vital Signs (P63) ─────────────────────── */
  const pulseVitals = usePulseVitals({
    aiReport: globalData.aiReport ?? null,
    calendarDays: globalData.calendarDays ?? null,
    advisorInsights: globalInsights ?? [],
    causalChains: globalData.causalChains ?? [],
  });

  // Sync advisor context to chat store for global AIChatWidget
  useEffect(() => {
    if (globalInsights && globalInsights.length > 0) {
      setAdvisorContext({
        insights: globalInsights.map((i) => ({
          id: i.id,
          title: i.title,
          reasoning: i.reasoning,
          impact: i.impact,
          layer: i.layer,
        })),
        period,
        systemicRiskScore: globalInsights.find((i) => i.id === "systemic_risk")
          ? Number(globalInsights.find((i) => i.id === "systemic_risk")!.title.match(/\d+/)?.[0])
          : undefined,
      });
    }
    return () => setAdvisorContext(null);
  }, [globalInsights, period, setAdvisorContext]);

  
  /* ── Board Report mutation (HITL) ────────────────────── */
  const currentYear = new Date().getFullYear();
  const currentQuarter = useMemo(() => {
    const month = new Date().getMonth();
    if (month < 3) return "Q1";
    if (month < 6) return "Q2";
    if (month < 9) return "Q3";
    return "Q4";
  }, []);

  const boardReportMut = useMCPMutation(
    "executive_dashboard",
    "generate_quarterly_board_report",
    {
      onSuccess: (data: unknown) => {
        const d = data as { message: string };
        showToast({ type: "info", message: d.message });
      },
      onError: (err: Error) => {
        showToast({
          type: "error",
          message: err.message || "Error al generar informe",
        });
      },
    },
  );

  /* ── Export mutation (SEMI_AUTO) ──────────────────────── */
  const exportMut = useMCPMutation(
    "executive_dashboard",
    "export_report",
    {
      onSuccess: (data: unknown, _variables) => {
        const d = data as { status: string; data: ExportMetadata };
        if (d.status === "success" && d.data) {
          const format = d.data.format;
          const exportData = buildExportData({
            summary: summary as Record<string, unknown> | null | undefined,
            aiReport: globalData.aiReport as Record<string, unknown> | null | undefined,
            period,
            userName: user?.name ?? "Miembro",
          });
          exportReport(format, exportData, d.data);
          showToast({ type: "success", message: `Archivo ${d.data.file_name} descargado` });
        } else {
          showToast({ type: "success", message: "Exportación exitosa" });
        }
      },
      onError: (err: Error) => {
        showToast({
          type: "error",
          message: err.message || "Error al exportar",
        });
      },
    },
  );

  // ── Advisor Action Bridge (F21) ──
  const [actionStates, setActionStates] = useState<Record<string, AdvisorActionState>>({});
  const [modalInsight, setModalInsight] = useState<GlobalAdvisorInsight | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [briefResult, setBriefResult] = useState<import("@/shared/mocks/contracts").AdvisorBoardBriefResponse["brief"] | null>(null);
  // Advisor chat state managed by chat store (global)
  // ── Advisor Reaction System (F22b) ──
  const [reactions, setReactions] = useState<AdvisorReactionInsight[]>([]);

  const approveMut = useMCPMutation("hitl", "approve_request", {
    onSuccess: () => {
      showToast({ type: "success", message: "Solicitudes aprobadas" });
      globalData.summaryQuery.refetch();
    },
    onError: (err: Error) => showToast({ type: "error", message: err.message }),
  });

  const boardBriefMut = useMCPMutation("advisor_intelligence", "generate_board_brief", {
    onSuccess: (data: unknown) => {
      const d = data as { brief: import("@/shared/mocks/contracts").AdvisorBoardBriefResponse["brief"] };
      if (d.brief) {
        setBriefResult(d.brief);
      }
      showToast({ type: "success", message: "Briefing generado" });
    },
    onError: (err: Error) => showToast({ type: "error", message: err.message }),
  });

  const handleAdvisorExecute = async (insightId: string) => {
    const insight = globalInsights?.find((i) => i.id === insightId);
    if (!insight?.action) return;

    if (insight.action.approval_level !== "auto") {
      setModalInsight(insight);
      return;
    }

    setActionStates((prev) => ({ ...prev, [insightId]: "loading" }));
    try {
      if (insight.action.server === "hitl") {
        await approveMut.mutateAsync(insight.action.params);
      } else if (insight.action.server === "advisor_intelligence") {
        await boardBriefMut.mutateAsync(insight.action.params);
      } else if (insight.action.server === "executive_dashboard") {
        await exportMut.mutateAsync(insight.action.params);
      }
      setActionStates((prev) => ({ ...prev, [insightId]: "done" }));
      // ── Reaction System: generate reaction after successful execution ──
      setReactions((prev) => [...prev, generateReactionInsight(insight!.action!, insightId)]);
    } catch {
      setActionStates((prev) => ({ ...prev, [insightId]: "error" }));
    }
  };

  const handleModalConfirm = async () => {
    if (!modalInsight?.action) return;
    const insightId = modalInsight.id;
    const executedAction = modalInsight.action;
    setActionStates((prev) => ({ ...prev, [insightId]: "loading" }));
    try {
      if (executedAction.server === "executive_dashboard") {
        await exportMut.mutateAsync(executedAction.params);
      } else if (executedAction.server === "advisor_intelligence") {
        await boardBriefMut.mutateAsync(executedAction.params);
      }
      setActionStates((prev) => ({ ...prev, [insightId]: "done" }));
      setModalInsight(null);
      // ── Reaction System: generate reaction after HITL/SEMI confirmation ──
      setReactions((prev) => [...prev, generateReactionInsight(executedAction, insightId)]);
    } catch {
      setActionStates((prev) => ({ ...prev, [insightId]: "error" }));
    }
  };
  // ── Advisor Chat Action Bridge (F24) ──
  async (chatAction: {
        label: string;
        server: string;
        tool: string;
        params: Record<string, unknown>;
        approval_level: string;
      }) => {
        // Try to match to existing insight for reaction system
        const matchingInsight = globalInsights?.find(
          (i) =>
            i.action?.server === chatAction.server &&
            i.action?.tool === chatAction.tool,
        );

        const insightId = matchingInsight?.id ?? `chat_${chatAction.tool}`;
        const actionForReaction: import("@/shared/types/ai-intelligence").AdvisorCommand = matchingInsight?.action ?? {
          type: "mutate" as const,
          server: chatAction.server,
          tool: chatAction.tool,
          params: chatAction.params,
          approval_level: (chatAction.approval_level as "auto" | "semi" | "hitl") ?? "auto",
          label: chatAction.label,
          estimated_impact: "Por determinar",
        };

        // Route to correct mutation
        setActionStates((prev) => ({ ...prev, [insightId]: "loading" }));
        try {
          await callMCPTool(chatAction.server, chatAction.tool, chatAction.params);

          setActionStates((prev) => ({ ...prev, [insightId]: "done" }));
          setReactions((prev) => [
            ...prev,
            generateReactionInsight(actionForReaction, insightId),
          ]);
          showToast({ type: "success", message: `Acción ejecutada: ${chatAction.label}` });
          queryClient.invalidateQueries(); // Invalidate all to refresh data
        } catch {
          setActionStates((prev) => ({ ...prev, [insightId]: "error" }));
          showToast({ type: "error", message: `Error al ejecutar: ${chatAction.label}` });
        }
      };

  const handleGeneratePlan = async () => {
    setIsPlanLoading(true);
    try {
      const result = await callMCPTool<{ plan: { items: unknown[] } }>("advisor_intelligence", "generate_action_plan", {
        insights: (globalInsights ?? []).map((i) => ({
          id: i.id,
          title: i.title,
          reasoning: i.reasoning,
          impact: i.impact,
          layer: i.layer,
          confidence: i.confidence,
        })),
        role: role.toLowerCase(),
        timeframe: "week",
      });
      showToast({
        type: "success",
        message: `Plan generado: ${result.plan.items.length} acciones priorizadas`,
      });
    } catch {
      showToast({ type: "error", message: "Error al generar plan" });
    } finally {
      setIsPlanLoading(false);
    }
  };

  /* ── Transform: backend → sub-component props ──────────── */
  const kpiData = useMemo<KPIData | undefined>(
    () => (summary ? summaryToKPIs(summary) : undefined),
    [summary],
  );

  const tierData = useMemo<TierData[] | undefined>(
    () =>
      summary
        ? buildTierData(summary.membership.by_tier)
        : undefined,
    [summary],
  );

  const activityData = useMemo<ActivityData[] | undefined>(
    () =>
      summary
        ? buildActivityData(summary.operational.top_activities)
        : undefined,
    [summary],
  );

  const revenueData = useMemo<RevenueSourceData[] | undefined>(
    () =>
      summary
        ? buildRevenueSources(summary.financial)
        : undefined,
    [summary],
  );

  /* ── Handlers ──────────────────────────────────────────── */
  const handlePeriodChange = useCallback(
    (newPeriod: DashboardPeriod) => setPeriod(newPeriod),
    [],
  );

  const quickActions = useMemo(
    () => getDefaultActions(role, navigate),
    [role, navigate],
  );

  /* ── Motion ────────────────────────────────────────────── */
  const fadeUp = reduced
    ? undefined
    : {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  /* ── Loading ───────────────────────────────────────────── */
  if (globalData.summaryQuery.isLoading && !summary) {
    return (
      <PageContainer title="Dashboard" subtitle="Cargando...">
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  /* ── Error ─────────────────────────────────────────────── */
  if (globalData.summaryQuery.error && !summary) {
    return (
      <PageContainer title="Dashboard">
        <div className="p-8 text-center rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] border border-white/[0.06]">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--color-rose-400)]" />
          <p className="text-lg font-[family-name:var(--font-ui)] text-[var(--color-silver-200)]">
            No se pudo cargar el dashboard
          </p>
          <p className="text-sm mt-2 text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            {globalData.summaryQuery.error instanceof Error
              ? globalData.summaryQuery.error.message
              : "Error desconocido"}
          </p>
          <Button
            variant="secondary"
            onClick={() => globalData.summaryQuery.refetch()}
            className="mt-4"
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Reintentar
          </Button>
        </div>
      </PageContainer>
    );
  }

  /* ── Render ────────────────────────────────────────────── */
  return (
    <PageContainer
      title={`${getGreeting()}, ${user?.name ?? "Miembro"}`}
      subtitle="Resumen ejecutivo del club"
    >
      <div className="space-y-6">
        {/* ── Dashboard Nav Bar (tabs + period, integrated) ── */}
        <motion.div {...(fadeUp ?? {})}>
          <DetailTabs
            ariaLabel="Secciones del dashboard"
            className="glass-tab-bar"
            tabs={[
              {
                id: "pulse",
                label: "El Pulso",
                icon: Activity,
                indicator: (
                  <PulseStatusDot
                    criticalCount={pulseVitals.criticalCount}
                    warningCount={pulseVitals.warningCount}
                  />
                ),
              },
              {
                id: "dashboard",
                label: "Dashboard Ejecutivo",
                icon: LayoutDashboard,
              },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {/* Period Selector — below tabs, right-aligned */}
          <div className="flex justify-end mt-2">
            <PeriodSelector value={period} onChange={handlePeriodChange} />
          </div>
        </motion.div>

        {/* Tab: El Pulso — Full vital signs experience */}
        {activeTab === "pulse" && (
          <ThePulse
            mode="expanded"
            vitals={pulseVitals.vitals}
            globalScore={pulseVitals.globalScore}
            criticalCount={pulseVitals.criticalCount}
            warningCount={pulseVitals.warningCount}
            loadedCount={pulseVitals.loadedCount}
            totalCount={pulseVitals.totalCount}
            expandVitals={pulseVitals.expandVitals}
            onToggleExpand={() => pulseVitals.setExpandVitals(!pulseVitals.expandVitals)}
            hasOnDemandVitals={pulseVitals.hasOnDemandVitals}
            radarRings={pulseVitals.radarRings}
          />
        )}

        {/* Tab: Dashboard Ejecutivo — Original dashboard content */}
        {activeTab === "dashboard" && (
          <>

        {/* Global Cross-Agent Advisor (F20) */}
        {(globalInsights ?? []).length > 0 && (
          <motion.div
            {...(fadeUp ?? {})}
            transition={{ ...fadeUp?.transition, delay: 0.03 }}
          >
            <GlobalAdvisorBanner
              insights={globalInsights ?? []}
              onExecute={handleAdvisorExecute}
              actionStates={actionStates}
              reactions={reactions}
              onGeneratePlan={handleGeneratePlan}
              isPlanLoading={isPlanLoading}
              financialContext={globalData.aiReport}
              eventsContext={globalData.calendarDays}
              briefData={briefResult}
              onCloseBrief={() => setBriefResult(null)}
              onAskAdvisor={() => useChatStore.getState().setOpen(true)}
              causalChains={globalData.causalChains}
            />


            {modalInsight?.action && (
              <AdvisorActionModal
                isOpen={!!modalInsight}
                onClose={() => setModalInsight(null)}
                onConfirm={handleModalConfirm}
                action={modalInsight.action}
                insightTitle={modalInsight.title}
                insightReasoning={modalInsight.reasoning}
                executionState={actionStates[modalInsight.id] ?? "idle"}
              />
            )}
          </motion.div>
        )}


        {/* Signal Bus Debug (DEV-only — F47-E) */}
        {import.meta.env.DEV && (
          <SignalBusDebugPanel />
        )}

        {/* Intelligence Strip (own queries: health, approvals, calendar) */}
        <motion.div
          {...(fadeUp ?? {})}
          transition={{ ...fadeUp?.transition, delay: 0.05 }}
        >
          <ExecutiveIntelligenceStrip
            period={period}
            kpiRevenue={kpiData?.revenue}
            kpiRevenueChange={kpiData?.revenueChange}
          />
        </motion.div>

        {/* AI Decision Panel (on-demand — Regla #19) */}
        <motion.div
          {...(fadeUp ?? {})}
          transition={{ ...fadeUp?.transition, delay: 0.10 }}
        >
          <AIDecisionPanel scope="executive" period={period} />
        </motion.div>

        {/* KPI cards — YoY context (disabled until backend provides) */}
        <motion.div
          {...(fadeUp ?? {})}
          transition={{ ...fadeUp?.transition, delay: 0.15 }}
        >
          {kpiData && (
            <YearOverYearToggle yoyData={null}>
              <KPICards data={kpiData} />
            </YearOverYearToggle>
          )}
        </motion.div>

        {/* Charts: Revenue Sources (2/3) + Membership Donut (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {revenueData && <RevenueChart data={revenueData} />}
          </div>
          <div>{tierData && <MembershipDonut data={tierData} />}</div>
        </div>

        {/* Top Activities */}
        {activityData && <TopActivities data={activityData} />}

        {/* ═══════════════════════════════════════════════════
           INTELIGENCIA DEL CLUB — Grouped Intelligence CTAs
           ═══════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-gold-400)]" />
            <h2 className="text-lg font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
              Inteligencia del Club
            </h2>
          </div>

          {/* Intelligence grid — 3 columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Anomalías */}
            {showAnomalies ? (
              <div className="sm:col-span-2 lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                    Alertas inteligentes
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAnomalies(false)}
                  >
                    Ocultar
                  </Button>
                </div>
                {anomalyQ.isLoading && <Skeleton className="h-48 rounded-[var(--radius-lg)]" />}
                {anomalyQ.isError && (
                  <SectionError
                    title="Error al cargar alertas"
                    description="No se pudieron cargar las alertas inteligentes."
                    onRetry={() => anomalyQ.refetch()}
                  />
                )}
                {anomalyUIList && anomalyUIList.length === 0 && (
                  <EmptyState
                    icon={<AlertTriangle size={40} strokeWidth={1} />}
                    title="Sin alertas activas"
                    description="El club opera dentro de los parámetros normales."
                  />
                )}
                {anomalyUIList && anomalyUIList.length > 0 && (
                  <AnomalyFeed
                    anomalies={anomalyUIList}
                    onAnomalyClick={(anomaly) => {
                      navigate(
                        `/admin/${anomaly.category === "membership" ? "families" : anomaly.category}`,
                      );
                    }}
                  />
                )}
              </div>
            ) : (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0 }}
              >
                <Button
                  variant="secondary"
                  onClick={() => setShowAnomalies(true)}
                  className="w-full p-4 rounded-[var(--radius-lg)] justify-start hover:border-[var(--color-amber-400)]/20 group h-full active:scale-100"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="p-2 rounded-md bg-[color-mix(in srgb,var(--color-amber-400)12%,transparent)] flex-shrink-0">
                      <AlertTriangle size={20} strokeWidth={1.5} className="text-[var(--color-amber-400)]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-[var(--color-silver-200)]">
                        Anomalías
                      </p>
                      <p className="text-xs text-[var(--color-silver-400)] mt-0.5">
                        Detección inteligente de irregularidades
                      </p>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-silver-500)] group-hover:text-[var(--color-silver-300)] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Card 2: Balance etario */}
            {showAgeBalance ? (
              <div className="sm:col-span-2 lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                    Balance etario
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAgeBalance(false)}>
                    Ocultar
                  </Button>
                </div>
                {ageBalanceQ.isLoading && <Skeleton className="h-72 rounded-[var(--radius-lg)]" />}
                {ageBalanceQ.isError && (
                  <SectionError
                    title="Error al cargar balance etario"
                    description="No se pudieron obtener los datos demográficos."
                    onRetry={() => ageBalanceQ.refetch()}
                  />
                )}
                {ageBalanceData && (
                  <AgeBalanceWidget
                    data={ageBalanceData}
                    giniCoefficient={ageBalanceQ.data?.gini_coefficient ?? 0}
                    aiRecommendation={ageBalanceQ.data?.recommendations?.[0]}
                  />
                )}
              </div>
            ) : (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
              >
                <Button
                  variant="secondary"
                  onClick={() => setShowAgeBalance(true)}
                  className="w-full p-4 rounded-[var(--radius-lg)] justify-start hover:border-[var(--color-teal-400)]/20 group h-full active:scale-100"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="p-2 rounded-md bg-[color-mix(in srgb,var(--color-teal-400)12%,transparent)] flex-shrink-0">
                      <Scale size={20} strokeWidth={1.5} className="text-[var(--color-teal-400)]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-[var(--color-silver-200)]">
                        Balance etario
                      </p>
                      <p className="text-xs text-[var(--color-silver-400)] mt-0.5">
                        Distribución por grupo etario y coeficiente de Gini
                      </p>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-silver-500)] group-hover:text-[var(--color-silver-300)] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Card 3: Predictivo ML */}
            {showPredictive ? (
              <div className="sm:col-span-2 lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                    Inteligencia Predictiva
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowPredictive(false)}>
                    Ocultar
                  </Button>
                </div>
                {revenueForecastQ.isLoading && <Skeleton className="h-48 rounded-[var(--radius-lg)]" />}
                {(revenueForecastQ.isError || anomalyMLQ.isError) && (
                  <SectionError
                    title="Error al cargar datos predictivos"
                    description="No se pudieron obtener los reportes de ML."
                    onRetry={() => {
                      revenueForecastQ.refetch();
                      churnMLQ.refetch();
                      anomalyMLQ.refetch();
                      dataQualityQ.refetch();
                    }}
                  />
                )}
                <PredictiveIntelligenceFeed
                  revenueForecast={revenueForecastQ.data?.revenue_forecast ?? null}
                  churnReport={churnMLQ.data?.churn_report ?? null}
                  anomalyReport={anomalyMLQ.data?.anomaly_report ?? null}
                  dataQuality={dataQualityQ.data?.quality_report ?? null}
                  onNavigateToML={() => navigate("/admin/ml")}
                />
              </div>
            ) : (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.16 }}
              >
                <Button
                  variant="secondary"
                  onClick={() => setShowPredictive(true)}
                  className="w-full p-4 rounded-[var(--radius-lg)] justify-start hover:border-[var(--color-gold-400)]/20 group h-full active:scale-100"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="p-2 rounded-md bg-[color-mix(in srgb,var(--color-gold-400)12%,transparent)] flex-shrink-0">
                      <Brain size={20} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-[var(--color-silver-200)]">
                        Predictivo ML
                      </p>
                      <p className="text-xs text-[var(--color-silver-400)] mt-0.5">
                        Revenue forecast, churn, anomalías y calidad de datos
                      </p>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-silver-500)] group-hover:text-[var(--color-silver-300)] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Card 4: Recomendaciones IA */}
            {showAdvisor ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] border border-white/[0.06] shadow-[var(--shadow-card)] p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={20} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
                      <h3 className="text-base font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                        Recomendaciones Ejecutivas
                      </h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAdvisor(false)}>
                      Ocultar
                    </Button>
                  </div>

                  {recommendations.length === 0 ? (
                    <EmptyState
                      icon={<Sparkles size={40} strokeWidth={1} />}
                      title="Sin recomendaciones"
                      description="Todos los indicadores están dentro de los parámetros esperados."
                    />
                  ) : (
                    <div className="space-y-3">
                      {recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-4 rounded-[var(--radius-md)] border border-white/[0.06] transition-all duration-200 hover:shadow-[var(--shadow-card)]"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]"
                              style={{
                                backgroundColor: RECO_PRIORITY_CONFIG[rec.priority].bg,
                                color: RECO_PRIORITY_CONFIG[rec.priority].color,
                              }}
                            >
                              {RECO_PRIORITY_CONFIG[rec.priority].label}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1">
                            {rec.title}
                          </p>
                          <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-3">
                            {rec.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigate(rec.action.route);
                              showToast({ type: "info", message: rec.action.toast });
                            }}
                            icon={<ChevronRight size={14} strokeWidth={1.5} />}
                          >
                            {rec.action.label}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.24 }}
              >
                <Button
                  variant="secondary"
                  onClick={() => setShowAdvisor(true)}
                  className="w-full p-4 rounded-[var(--radius-lg)] justify-start hover:border-[var(--color-gold-400)]/20 group h-full active:scale-100"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="p-2 rounded-md bg-[color-mix(in srgb,var(--color-gold-400)12%,transparent)] flex-shrink-0">
                      <Sparkles size={20} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-[var(--color-silver-200)]">
                        Recomendaciones IA
                      </p>
                      <p className="text-xs text-[var(--color-silver-400)] mt-0.5">
                        Acciones priorizadas con análisis inteligente
                      </p>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-silver-500)] group-hover:text-[var(--color-silver-300)] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Button>
              </motion.div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
           NAVEGACIÓN RÁPIDA
           ═══════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
            Navegación rápida
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.32 }}
            >
              <Button
                variant="secondary"
                onClick={() => navigate("/admin/finance")}
                className="w-full p-4 rounded-[var(--radius-lg)] justify-start hover:border-[var(--color-gold-400)]/20 group active:scale-100"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-md bg-[color-mix(in srgb,var(--color-gold-400)12%,transparent)] flex-shrink-0">
                    <DollarSign size={20} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-[var(--color-silver-200)]">Detalle financiero</p>
                    <p className="text-xs text-[var(--color-silver-400)]">P&L, presupuestos, análisis con IA</p>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-silver-500)] group-hover:text-[var(--color-silver-300)] transition-colors flex-shrink-0" />
                </div>
              </Button>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.40 }}
            >
              <Button
                variant="secondary"
                onClick={() => navigate("/admin/families")}
                className="w-full p-4 rounded-[var(--radius-lg)] justify-start hover:border-[var(--color-teal-400)]/20 group active:scale-100"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-md bg-[color-mix(in srgb,var(--color-teal-400)12%,transparent)] flex-shrink-0">
                    <Users size={20} strokeWidth={1.5} className="text-[var(--color-teal-400)]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-[var(--color-silver-200)]">Salud de membresía</p>
                    <p className="text-xs text-[var(--color-silver-400)]">Familias, tiers, engagement, churn</p>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-silver-500)] group-hover:text-[var(--color-silver-300)] transition-colors flex-shrink-0" />
                </div>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
           INFORMES Y EXPORTACIÓN — Compact
           ═══════════════════════════════════════════════════ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.48 }}
        >
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] border border-white/[0.06] shadow-[var(--shadow-card)] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} strokeWidth={1.5} className="text-[var(--color-gold-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-ui)]">
                  Informes y Exportación
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => boardReportMut.mutate({
                  year: currentYear,
                  quarter: currentQuarter,
                  requested_by: user?.name ?? "unknown",
                })}
                disabled={boardReportMut.isPending}
                icon={boardReportMut.isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ClipboardList size={14} strokeWidth={1.5} />
                )}
              >
                Informe {currentQuarter} {currentYear}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportMut.mutate({ report_type: "executive_summary", export_format: "pdf", audience: "internal" })}
                disabled={exportMut.isPending}
                icon={<Download size={14} strokeWidth={1.5} />}
              >
                PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportMut.mutate({ report_type: "executive_summary", export_format: "excel", audience: "internal" })}
                disabled={exportMut.isPending}
                icon={<FileSpreadsheet size={14} strokeWidth={1.5} />}
              >
                Excel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportMut.mutate({ report_type: "executive_summary", export_format: "csv", audience: "internal" })}
                disabled={exportMut.isPending}
                icon={<FileText size={14} strokeWidth={1.5} />}
              >
                CSV
              </Button>
            </div>
          </div>
        </motion.div>
          </>
        )}
      </div>

      {/* Quick Actions FAB */}
      <QuickActions actions={quickActions} />



    </PageContainer>
  );
}
