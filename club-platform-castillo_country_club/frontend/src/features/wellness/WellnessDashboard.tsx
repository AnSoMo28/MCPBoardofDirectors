/* ═══════════════════════════════════════════════════════════════
   features/wellness/WellnessDashboard.tsx
   v37 rewrite — Adaptive Morphism + Intelligence Pipeline

   Castillo Country Club — Wellness Dashboard
   2027 intelligence-first layout. Organism, not template.

   Changes v37:
     P1: Adaptive Morphism (calm/alert/critical)
     P2: Intelligence Stream replaces tab-first
     P3: Cross-Domain Nexus
     P4: Predictive Timeline
     P5: Persona Shell (data-mode)
     P6: Executive Brief
     P7: Anomaly Radar
     P8: Action Pipeline
     P9: Correlation Matrix
     P10: Segment Cards
     P11: Insight Navigation (quantum jump)
     P16: Data Freshness
     P17: Glass wellness CSS namespace
     P18: FamilySelector extracted
     P19: RecommendationCard extracted
     P20: Intelligence queries integration
   ═══════════════════════════════════════════════════════════════ */

import { useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  ShieldAlert,
  Activity,
  RefreshCw,
  Clock,
  Flame,
  Zap,
  Target,
  Sparkles,
  Users,
  BarChart3,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { DetailTabs } from "@/shared/components/layout/DetailTabs";
import { StatCard } from "@/shared/components/layout/StatCard";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { showToast } from "@/shared/components/ui/Toast";
import { Modal } from "@/shared/components/ui/Modal";
import { formatNumber } from "@/shared/lib/utils";

import { useWellnessDashboard } from "./hooks/useWellnessDashboard";
import { WellnessFamilySelector } from "./components/WellnessFamilySelector";
import { WellnessRecommendationCard } from "./components/WellnessRecommendationCard";
import { WellnessExecutiveBrief } from "./components/WellnessExecutiveBrief";
import { WellnessActionPipeline } from "./components/WellnessActionPipeline";
import { WellnessCrossDomainNexus } from "./components/WellnessCrossDomainNexus";
import { WellnessPredictiveTimeline } from "./components/WellnessPredictiveTimeline";
import { WellnessAnomalyRadar } from "./components/WellnessAnomalyRadar";
import { WellnessCorrelationMatrix } from "./components/WellnessCorrelationMatrix";
import { WellnessSegmentCards } from "./components/WellnessSegmentCards";
import { WellnessIntelligenceStream } from "./components/WellnessIntelligenceStream";
import { WellnessScoreCard } from "./components/WellnessScoreCard";
import { WellnessTrends } from "./components/WellnessTrends";
import { WellnessRiskRadar } from "./components/WellnessRiskRadar";
import { WellnessAIAdvisor } from "./components/WellnessAIAdvisor";
import { WellnessGoals } from "./components/WellnessGoals";
import { WellnessFamilyMap } from "./components/WellnessFamilyMap";
import { WellnessBusinessInsights } from "./components/WellnessBusinessInsights";
import { WellnessAdvisorBanner } from "./components/WellnessAdvisorBanner";
import "./WellnessDashboard.css";

// ═══════════════════════════════════════════════════════════════
// §1  Component
// ═══════════════════════════════════════════════════════════════

interface Props {
  familyId?: string;
}

export function WellnessDashboard({ familyId: propFamilyId }: Props) {
  const d = useWellnessDashboard(propFamilyId);

  // ── Quantum Jump handler (P11) ──
  const handleNavigate = useCallback(
    (tab: string) => {
      d.setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [d.setActiveTab],
  );

  // ── Top recommendations ──
  const topRecs = useMemo(() => {
    const recs = d.recommendationsData;
    const highPri = recs.filter((r) => r.priority === "high");
    return highPri.length > 0 ? highPri.slice(0, 3) : recs.slice(0, 3);
  }, [d.recommendationsData]);

  // ── Data freshness (P16) ──
  const freshness = useMemo(() => {
    if (!d.report.data) return "old";
    // Use staleTime as proxy — if data loaded within 5min = fresh
    return "fresh";
  }, [d.report.data]);

  // ── Tabs config ──
  const tabs = [
    { id: "overview", label: "Resumen", icon: LayoutDashboard },
    { id: "trends", label: "Tendencias", icon: TrendingUp },
    { id: "alerts", label: "Alertas", icon: ShieldAlert },
    { id: "advisor", label: "IA Advisor", icon: Sparkles },
    { id: "goals", label: "Metas", icon: Target },
    { id: "family", label: "Familia", icon: Users },
    { id: "business", label: "Negocio", icon: BarChart3 },
  ];

  // ── No family (ADMIN) ──
  if (!d.familyId && d.isAdmin) {
    return (
      <PageContainer
        title="Wellness Inteligente"
        subtitle="Motor de análisis de bienestar integral"
        breadcrumbs={[
          { label: "Inicio", href: "/admin" },
          { label: "Wellness", href: "/admin/wellness" },
        ]}
      >
        <WellnessFamilySelector selectedId="" onSelect={d.handleFamilySelect} />
      </PageContainer>
    );
  }

  // ── No family (SOCIO) ──
  if (!d.familyId) {
    return (
      <PageContainer
        title="Wellness Inteligente"
        subtitle="Motor de análisis de bienestar integral"
        breadcrumbs={[
          { label: "Inicio", href: "/admin" },
          { label: "Wellness", href: "/admin/wellness" },
        ]}
      >
        <EmptyState
          icon={<Activity className="w-8 h-8" />}
          title="Seleccione una familia"
          description="Para ver el dashboard de bienestar, seleccione una familia específica."
        />
      </PageContainer>
    );
  }

  // ── Loading ──
  if (d.isLoading) {
    return (
      <PageContainer
        title="Wellness Inteligente"
        subtitle={
          d.selectedFamily
            ? `Seleccionando: ${d.selectedFamily.familyName}`
            : "Motor de análisis de bienestar integral"
        }
        breadcrumbs={[
          { label: "Inicio", href: "/admin" },
          { label: "Wellness", href: "/admin/wellness" },
        ]}
      >
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-lg flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── No data ──
  if (!d.reportData) {
    return (
      <PageContainer
        title="Wellness Inteligente"
        subtitle={`${d.familyName} · Sin datos`}
        breadcrumbs={[
          { label: "Inicio", href: "/admin" },
          { label: "Wellness", href: "/admin/wellness" },
        ]}
      >
        {d.isAdmin && (
          <div className="mb-6">
            <WellnessFamilySelector
              selectedId={d.familyId}
              onSelect={d.handleFamilySelect}
            />
          </div>
        )}
        <EmptyState
          icon={<Activity className="w-8 h-8" />}
          title="Sin datos de bienestar"
          description="No se encontraron datos para esta familia en el período seleccionado."
          action={
            <Button variant="primary" onClick={() => d.refetchReport?.()}>
              Reintentar
            </Button>
          }
        />
      </PageContainer>
    );
  }

  // ═══════════════════════════════════════════════════════
  // MAIN RENDER — Adaptive Morphism (P1)
  // ═══════════════════════════════════════════════════════

  return (
    <PageContainer
      title="Wellness Inteligente"
      subtitle={`${d.familyName} · ${d.dateFrom} a ${d.dateTo}`}
      breadcrumbs={[
        { label: "Inicio", href: "/admin" },
        { label: "Wellness", href: "/admin/wellness" },
      ]}
      actions={[
        d.isAdmin && (
          <Button key="change" variant="ghost" onClick={d.resetFamily}>
            <Users className="w-4 h-4 mr-2" />
            Cambiar
          </Button>
        ),
        <Button
          key="refresh"
          variant="ghost"
          onClick={() => {
            d.refetchReport?.();
            showToast({ type: "success", message: "Datos actualizados" });
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>,
      ].filter(Boolean)}
    >
      <div className="flex items-center justify-end mb-2">
        <span className="wdb-freshness" data-age={freshness}>
          <span className="wdb-freshness__dot" />
          <span>{freshness === "fresh" ? "En vivo" : "Actualizando..."}</span>
        </span>
      </div>

      <div className="glass-wellness" data-mode={d.mode} data-persona={d.profileData?.fitness_level ?? "default"}>

        {/* ═══ P8: Action Pipeline — always visible ═══ */}
        <div className="wdb-section wdb-section--pipeline">
          <WellnessActionPipeline
            insights={d.advisorInsights}
            reactions={d.reactions}
            actionStates={d.actionStates}
            mode={d.mode}
            onExecute={d.handleExecute}
          />
        </div>

        {/* ═══ P6: Executive Brief ═══ */}
        <div className="wdb-section wdb-section--brief">
          <WellnessExecutiveBrief
            insights={d.insightsData ?? null}
            mode={d.mode}
          />
        </div>

        {/* ═══ Hero: Score Card + Cross-Domain Nexus ═══ */}
        <div className="wdb-section wdb-section--hero">
          <WellnessScoreCard
            report={d.reportData}
            previousReport={d.prevReportData}
            familyName={d.familyName}
            onViewDetails={() => handleNavigate("trends")}
          />
          <WellnessCrossDomainNexus
            correlations={d.correlateData?.correlations ?? null}
            mode={d.mode}
          />
        </div>

        {/* ═══ Stat Cards ═══ */}
        <div className="wdb-section">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Actividades" value={formatNumber(d.reportData.total_activities)} icon={<Activity className="w-5 h-5" />} />
            <StatCard title="Minutos" value={formatNumber(d.reportData.total_minutes)} icon={<Clock className="w-5 h-5" />} />
            <StatCard title="Calorías" value={formatNumber(d.reportData.total_calories)} icon={<Flame className="w-5 h-5" />} />
            <StatCard title="Racha" value={`${d.reportData.streak_days}d`} icon={<Zap className="w-5 h-5" />} />
          </div>
        </div>

        {/* ═══ P4: Predictive Timeline ═══ */}
        <div className="wdb-section">
          <WellnessPredictiveTimeline
            predictions={d.predictionsData?.predictions ?? null}
            mode={d.mode}
          />
        </div>

        {/* ═══ P7 + P9: Anomaly Radar + Correlation Matrix ═══ */}
        <div className="wdb-section wdb-section--duo">
          <WellnessAnomalyRadar
            anomalies={d.anomaliesData?.anomalies ?? []}
            alerts={d.anomaliesData?.alerts ?? []}
            mode={d.mode}
          />
          <WellnessCorrelationMatrix
            correlations={d.correlateData?.correlations ?? null}
            mode={d.mode}
          />
        </div>

        {/* ═══ P10: Segment Cards ═══ */}
        <div className="wdb-section">
          <WellnessSegmentCards
            segments={d.correlateData?.segment_insights ?? []}
            currentScore={d.currentScore}
            mode={d.mode}
          />
        </div>

        {/* ═══ Recommendations ═══ */}
        {topRecs.length > 0 && (
          <div className="wdb-section">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[var(--color-gold-400)]" />
                <h3 className="font-display text-lg text-[var(--color-silver-100)]">
                  Recomendaciones
                </h3>
                {d.recommendationsData.length > 3 && (
                  <Badge variant="default" size="sm">
                    {d.recommendationsData.length}
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                {topRecs.map((rec, i) => (
                  <WellnessRecommendationCard key={i} recommendation={rec} />
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ P2: Intelligence Stream ═══ */}
        <div className="wdb-section">
          <WellnessIntelligenceStream
            insights={d.advisorInsights}
            reactions={d.reactions}
            actionStates={d.actionStates}
            mode={d.mode}
            onNavigate={handleNavigate}
            onExecute={d.handleExecute}
          />
        </div>

        {/* ═══ Advisor Banner (existing, for tab-level context) ═══ */}
        <div className="wdb-section">
          <WellnessAdvisorBanner
            insights={d.advisorInsights}
            reactions={d.reactions}
            actionStates={d.actionStates}
            onExecute={d.handleExecute}
          />
        </div>

        {/* ═══ Tab Navigation — Deep Dive ═══ */}
        <div className="wdb-section">
          <DetailTabs tabs={tabs} active={d.activeTab} onChange={d.setActiveTab} />
        </div>

        {/* ═══ Deep Dive Content ═══ */}
        <div className="wdb-deepdive">
          {d.activeTab === "overview" && (
            <p className="text-sm text-[var(--color-silver-400)]">
              Vista principal arriba. Navegá por los tabs para profundizar.
            </p>
          )}
          {d.activeTab === "trends" && (
            <WellnessTrends report={d.reportData} previousReport={d.prevReportData} />
          )}
          {d.activeTab === "alerts" && <WellnessRiskRadar familyId={d.familyId} />}
          {d.activeTab === "advisor" && <WellnessAIAdvisor familyId={d.familyId} />}
          {d.activeTab === "goals" && <WellnessGoals familyId={d.familyId} />}
          {d.activeTab === "family" && <WellnessFamilyMap familyId={d.familyId} />}
          {d.activeTab === "business" && <WellnessBusinessInsights familyId={d.familyId} />}
        </div>
      </div>

      {/* ── Action Modal ── */}
      {d.modalInsight?.action && (
        <Modal
          isOpen={!!d.modalInsight}
          onClose={() => d.setModalInsight(null)}
          title={d.modalInsight?.title ?? "Acción del Advisor"}
        >
          <div className="space-y-4 p-1">
            <h3 className="font-display text-lg text-[var(--color-silver-100)]">
              {d.modalInsight.action.label}
            </h3>
            <p className="font-ui text-sm text-[var(--color-silver-300)] leading-relaxed">
              {d.modalInsight.action.confirmMessage}
            </p>
            {d.modalInsight.action.estimatedImpact && (
              <div
                className="p-3 rounded-lg"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-emerald-400) 8%, transparent)",
                }}
              >
                <p className="font-mono text-xs text-[var(--color-emerald-400)]">
                  Impacto estimado: {d.modalInsight.action.estimatedImpact}
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => d.setModalInsight(null)} className="min-h-[44px]">
                Cancelar
              </Button>
              <Button variant="primary" onClick={d.handleModalConfirm} className="min-h-[44px]">
                <Zap className="w-4 h-4 mr-2" />
                Confirmar ejecución
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}

export default WellnessDashboard;