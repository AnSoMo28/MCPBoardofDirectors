// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Financial Dashboard Hub
// FASE 19: Living Command Center + Ambient Intelligence
//
// REWRITE. Propuestas 1-6 integradas:
//   1. Living Command Center (replaces Advisor Banner)
//   2. Depth-of-field intelligence
//   3. Predictive tab surfacing (inline evidence)
//   4. Ambient intelligence (vignette + fluid sim bridge)
//   5. AI narrative thread (story-connected insights)
//   6. Financial command registry (ready for CommandPalette)
//
// Rules: #1 tokens, #11 focus-visible, #13 DetailTabs,
//   #16 breadcrumbs, #17 Button, #18 reducedMotion,
//   #20 breakpoint, #22 cn
// ═══════════════════════════════════════════════════════════

import { lazy, Suspense, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, BrainCircuit, Lightbulb, CreditCard,
  Receipt, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import {
  DetailTabs,
  type DetailTab,
} from "@/shared/components/layout/DetailTabs";
import { Skeleton, Button, showToast } from "@/shared/components/ui";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import type {
  AiFinancialReport,
  FinancialSummary,
  FinancialAdvisorInsight,
} from "./types";
import { useFinancialAdvisor } from "./hooks/useFinancialAdvisor";
import { useAmbientState } from "./hooks/useAmbientState";
import { useFinancialCommands } from "./hooks/useFinancialCommands";
import LivingCommandCenter from "./components/LivingCommandCenter";
import { LivingPulseBar } from "./components/LivingPulseBar";
import type {
  AdvisorActionState,
  AdvisorReactionInsight,
} from "@/features/dashboard/types";
import { AdvisorActionModal } from "@/shared/components/ui/AdvisorActionModal";
import { generateReactionInsight } from "@/shared/lib/reactionTemplate";
import './components/LivingCommandCenter.css';


// ── Lazy-loaded tab components ──

const FinanceOverview = lazy(() => import("./components/FinanceOverview"));
const FinanceAnalytics = lazy(() => import("./components/FinanceAnalytics"));
const FinanceIntelligencePanel = lazy(
  () => import("./components/FinanceIntelligencePanel"),
);
const BillingCenter = lazy(() => import("./components/BillingCenter"));
const ExpenseManager = lazy(() => import("./components/ExpenseManager"));
const BudgetManager = lazy(() => import("./components/BudgetManager"));
const ReportGenerator = lazy(() => import("./components/ReportGenerator"));

// ── Tab definitions ──

type FinanceTab =
  | "overview"
  | "analytics"
  | "intelligence"
  | "billing"
  | "expenses"
  | "tools";

const TABS: DetailTab[] = [
  { id: "overview", label: "Resumen", icon: BarChart3 },
  { id: "analytics", label: "Análisis", icon: BrainCircuit },
  { id: "intelligence", label: "Inteligencia", icon: Lightbulb },
  { id: "billing", label: "Facturación", icon: CreditCard },
  { id: "expenses", label: "Gastos", icon: Receipt },
  { id: "tools", label: "Herramientas", icon: Wrench },
];

// ── Tools sub-tabs ──

type ToolTab = "budget" | "reports";

const TOOL_TABS: Array<{ id: ToolTab; label: string; icon: LucideIcon }> = [
  { id: "budget", label: "Presupuesto", icon: BarChart3 },
  { id: "reports", label: "Reportes", icon: Receipt },
];

// ── Tab Skeleton (glass-aware) ──

function TabSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl"
            style={{
              backdropFilter: "blur(10px)",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Skeleton className="h-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
// ── Motion variants ──

const PAGE_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// ── Component ──

export default function FinancialDashboard() {
  const reduced = useReducedMotion();
  // ── Restore tab from Command Palette navigation (Propuesta 6) ──
  const [activeTab, setActiveTab] = useState<FinanceTab>(() => {
    const stored = sessionStorage.getItem("castillo-finance-active-tab");
    if (stored) {
      sessionStorage.removeItem("castillo-finance-active-tab");
      return stored as FinanceTab;
    }
    return "overview";
  });
  const [toolTab, setToolTab] = useState<ToolTab>(() => {
    const stored = sessionStorage.getItem("castillo-finance-tool-tab");
    if (stored) {
      sessionStorage.removeItem("castillo-finance-tool-tab");
      return stored as ToolTab;
    }
    return "budget";
  });

  // ── Pre-warming queries ──
  const aiQuery = useMCPQuery<{
    status: string;
    data: AiFinancialReport;
  }>(
    "finance",
    "generate_ai_analysis",
    { scope: "financial", period: "current_quarter" },
    { staleTime: 300_000 },
  );

  const summaryQuery = useMCPQuery<FinancialSummary>(
    "finance",
    "get_financial_summary",
    { period: "current_quarter" },
    { staleTime: 60_000 },
  );

  // ── Ambient Intelligence (Propuesta 4) ──
  const aiReport = aiQuery.data?.data ?? null;
  const ambientState = useAmbientState(aiReport);

  // ── Financial Advisor (client-side) ──
  const advisorInsights = useFinancialAdvisor(
    aiReport,
    summaryQuery.data ?? null,
  );

  // ── Navigation ──
  const handleTabChange = useCallback(
    (id: string) => setActiveTab(id as FinanceTab),
    [],
  );

  const handleNavigateToToolTab = useCallback(
    (tab: string) => setToolTab(tab as ToolTab),
    [],
  );

  const handleAdvisorNavigate = useCallback(
    (tab: string) => {
      setActiveTab(tab as FinanceTab);
      if (tab === "tools") setToolTab("budget");
    },
    [],
  );

  // ── Advisor Action Bridge ──
  const [actionStates, setActionStates] = useState<
    Record<string, AdvisorActionState>
  >({});
  const [modalInsight, setModalInsight] =
    useState<FinancialAdvisorInsight | null>(null);
  const [reactions, setReactions] = useState<AdvisorReactionInsight[]>([]);

  const categoryUpdateMut = useMCPMutation(
    "finance",
    "finance_category_update",
    {
      onSuccess: () => {
        showToast({ type: "success", message: "Categorías actualizadas" });
        summaryQuery.refetch();
      },
      onError: (err: Error) =>
        showToast({ type: "error", message: err.message }),
    },
  );

  const reportGenerateMut = useMCPMutation(
    "finance",
    "finance_report_generate",
    {
      onSuccess: () => {
        showToast({ type: "success", message: "Reporte generado" });
      },
      onError: (err: Error) =>
        showToast({ type: "error", message: err.message }),
    },
  );

  const executeAction = async (
    insight: FinancialAdvisorInsight,
    insightId: string,
  ) => {
    if (!insight.action) return;
    setActionStates((prev) => ({ ...prev, [insightId]: "loading" }));
    try {
      if (insight.action.tool === "finance_category_update") {
        await categoryUpdateMut.mutateAsync(insight.action.params);
      } else if (insight.action.tool === "finance_report_generate") {
        await reportGenerateMut.mutateAsync(insight.action.params);
      }
      setActionStates((prev) => ({ ...prev, [insightId]: "done" }));
      setReactions((prev) => [
        ...prev,
        generateReactionInsight(insight.action!, insightId),
      ]);
    } catch {
      setActionStates((prev) => ({ ...prev, [insightId]: "error" }));
    }
  };

  const handleAdvisorExecute = async (insightId: string) => {
    const insight = advisorInsights?.find((i) => i.id === insightId);
    if (!insight?.action) return;

    if (insight.action.approval_level !== "auto") {
      setModalInsight(insight);
      return;
    }
    await executeAction(insight, insightId);
  };

  const handleModalConfirm = async () => {
    if (!modalInsight?.action) return;
    await executeAction(modalInsight, modalInsight.id);
    setModalInsight(null);
  };

  // ── Financial Commands (Propuesta 6 — ready for CommandPalette) ──
  useFinancialCommands({
        navigateToTab: handleAdvisorNavigate,
        navigateToToolTab: handleNavigateToToolTab,
        generateReport: () => {
          setActiveTab("tools");
          setToolTab("reports");
        },
        openStressTest: () => {
          setActiveTab("intelligence");
        },
      });

  // ── Stagger config ──
  const stagger = reduced ? {} : PAGE_VARIANTS;
  const section = reduced ? {} : SECTION_VARIANTS;

  return (
    <PageContainer
      title="Finanzas"
      subtitle="Gestión financiera integral del club"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Finanzas" },
      ]}
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ── Ambient Vignette (Propuesta 4) ── */}
        <div
          className="ambient-vignette"
          style={{ opacity: ambientState.vignetteOpacity }}
        />

        {/* ── Living Pulse Bar (Propuesta 1) ── */}
        <motion.div variants={section}>
          <LivingPulseBar
            healthScore={ambientState.healthScore}
            healthGrade={ambientState.healthGrade}
            mode={ambientState.mode}
            className="mb-4"
          />
        </motion.div>

        {/* ── Living Command Center (Propuestas 1+3+5) ── */}
        <motion.div variants={section}>
          <LivingCommandCenter
            insights={advisorInsights ?? []}
            financialContext={aiReport}
            ambientMode={ambientState.mode}
            onNavigateToTab={handleAdvisorNavigate}
            onExecute={handleAdvisorExecute}
            actionStates={actionStates}
            reactions={reactions}
          />
        </motion.div>

        {/* ── Advisor Action Modal ── */}
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

        {/* ── Main Tabs ── */}
        <motion.div variants={section}>
          <DetailTabs
            tabs={TABS}
            active={activeTab}
            onChange={handleTabChange}
            ariaLabel="Navegación de finanzas"
          />
        </motion.div>

        {/* ── Tab Content ── */}
        <div className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === "overview" && <FinanceOverview />}
            {activeTab === "analytics" && <FinanceAnalytics />}
            {activeTab === "intelligence" && <FinanceIntelligencePanel />}
            {activeTab === "billing" && <BillingCenter />}
            {activeTab === "expenses" && <ExpenseManager />}
            {activeTab === "tools" && (
              <div className="space-y-6">
                {/* Tools sub-tab bar — glass */}
                <div
                  className="flex gap-1 glass-tab-bar p-1 rounded-lg"
                  role="tablist"
                  aria-label="Herramientas financieras"
                >
                  {TOOL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = toolTab === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        variant="ghost"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setToolTab(tab.id)}
                        icon={<Icon size={16} />}
                        className={cn(
                          "rounded-md px-4 min-h-[44px] active:scale-100 transition-all duration-200",
                          isActive
                            ? "bg-[color-mix(in srgb,var(--color-gold-400) 10%,transparent)] text-[var(--color-silver-200)] shadow-sm"
                            : "text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)]",
                        )}
                      >
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>

                {toolTab === "budget" && <BudgetManager />}
                {toolTab === "reports" && <ReportGenerator />}
              </div>
            )}
          </Suspense>
        </div>
      </motion.div>
    </PageContainer>
  );
}