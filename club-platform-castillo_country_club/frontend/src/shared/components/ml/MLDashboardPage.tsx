// src/shared/components/ml/MLDashboardPage.tsx
// Fase 23 — Silver Tide ML Intelligence Neural Console
// Glass KPI · Segment tiles · Neural ambient · Stagger · Boot sequence
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, DollarSign, Users, AlertTriangle,
  Layers, Gauge,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { DetailTabs } from "@/shared/components/layout/DetailTabs";
import { SectionError } from "@/shared/components/layout/SectionError";
import { showToast } from "@/shared/components/ui/Toast";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { PredictiveIntelligenceFeed } from "./PredictiveIntelligenceFeed";
import { HypotheticalSimulator } from "./HypotheticalSimulator";
import { MLAdvisorBanner } from "./MLAdvisorBanner";
import { ModelHealthPanel } from "./ModelHealthPanel";
import { CalibrationDashboard } from "./CalibrationDashboard";
import { useMLDashboardPage } from "./hooks/useMLDashboardPage";
import type { BaseInsight as MLInsight } from "@/shared/components/AdvisorBanner";
import './ml-glass.css';
import './MLDashboardPage.css';
/* ──────────────────────────────────────
   Tab config
   ────────────────────────────────────── */

const TABS = [
  { id: "overview", label: "Overview", icon: Brain },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "members", label: "Miembros", icon: Users },
  { id: "anomalies", label: "Anomalías", icon: AlertTriangle },
  { id: "model-health", label: "Modelos", icon: Gauge },
  { id: "simulator", label: "Simulador", icon: Layers },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ──────────────────────────────────────
   Boot sequence messages
   ────────────────────────────────────── */

const BOOT_MESSAGES = [
  "Inicializando modelos ML...",
  "Cargando anomalías...",
  "Calibrando predicciones...",
  "Compilando intelligence...",
];

/* ──────────────────────────────────────
   KPI Card
   ────────────────────────────────────── */

function MLKPI({
  label, value, subtitle, color, delay, reduced,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="glass-ml-kpi"
      initial={reduced ? undefined : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <p className="glass-ml-kpi__label">{label}</p>
      <p className="glass-ml-kpi__value" style={{ color }}>{value}</p>
      {subtitle && <p className="glass-ml-kpi__sub">{subtitle}</p>}
      <div className="glass-ml-kpi__bar" style={{ background: color }} />
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Boot Loader
   ────────────────────────────────────── */

function MLBootLoader({ reduced }: { reduced: boolean }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % BOOT_MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageContainer title="ML Intelligence" subtitle="Cargando modelos predictivos...">
      <div className="glass-ml-boot">
        <motion.div
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="w-10 h-10 text-[var(--color-gold-400)]" />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            className="glass-ml-boot__msg"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {BOOT_MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </PageContainer>
  );
}

/* ──────────────────────────────────────
   Segmentation Panel
   ────────────────────────────────────── */

function MLSegmentationPanel({ segmentation, reduced }: {
  segmentation: import("@/shared/mocks/contracts").MemberSegmentation | null;
  churnReport: import("@/shared/mocks/contracts").ChurnMLReport | null;
  reduced: boolean;
}) {
  if (!segmentation) return null;
  const { segments, silhouette_score } = segmentation;

  return (
    <motion.div
      className="glass-ml-segment"
      initial={reduced ? undefined : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.3 }}
    >
      <div className="glass-ml-segment__header">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-teal-400)]" />
          <h3 className="glass-ml-segment__title">Segmentación de Miembros</h3>
        </div>
        <span className="glass-ml-segment__meta">
          weighted_composite · Silhouette: {silhouette_score.toFixed(2)}
        </span>
      </div>

      <div className="glass-ml-segment__grid">
        {segments.map((seg, i) => {
          const churnColor =
            seg.churn_risk_pct > 20 ? "var(--color-rose-400)"
            : seg.churn_risk_pct > 10 ? "var(--color-amber-400)"
            : "var(--color-emerald-400)";

          return (
            <motion.div
              key={seg.segment_id}
              className="glass-ml-segment__tile"
              initial={reduced ? undefined : { opacity: 0, scale: 0.95 }}
              animate={reduced ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.35 + i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="glass-ml-segment__tile-label">{seg.label}</span>
                <span className="glass-ml-segment__tile-count">{seg.member_count}</span>
              </div>
              <p className="glass-ml-segment__tile-strategy">{seg.recommended_strategy ?? ""}</p>

              {/* Revenue bar */}
              <div className="glass-ml-segment__metric">
                <span>Revenue</span>
                <div className="glass-ml-segment__metric-bar-track">
                  <motion.div
                    className="glass-ml-segment__metric-bar-fill"
                    style={{ background: "var(--color-gold-400)" }}
                    initial={reduced ? undefined : { width: 0 }}
                    animate={reduced ? undefined : { width: `${seg.revenue_contribution_pct}%` }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.05 }}
                  />
                </div>
                <span style={{ color: "var(--color-gold-400)" }}>{seg.revenue_contribution_pct}%</span>
              </div>

              {/* Churn risk */}
              <div className="glass-ml-segment__metric">
                <span>Churn</span>
                <div className="glass-ml-segment__metric-bar-track">
                  <motion.div
                    className="glass-ml-segment__metric-bar-fill"
                    style={{ background: churnColor }}
                    initial={reduced ? undefined : { width: 0 }}
                    animate={reduced ? undefined : { width: `${seg.churn_risk_pct}%` }}
                    transition={{ duration: 0.5, delay: 0.45 + i * 0.05 }}
                  />
                </div>
                <span style={{ color: churnColor }}>{seg.churn_risk_pct}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export default function MLDashboardPage() {
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const {
    dqData, anomalyData, revenueData, churnData,
    segmentData, advisor, isLoading, isError, refetchAll,
    kpis, ambientHue,
  } = useMLDashboardPage();

  const handleExecute = (insight: MLInsight) => {
    showToast({ type: "info", message: `Acción ejecutada — ${insight.action?.label ?? "Procesando..."}` });
  };

  /* ── Loading ── */
  if (isLoading) return <MLBootLoader reduced={reduced} />;

  /* ── Error ── */
  if (isError) {
    return (
      <PageContainer title="ML Intelligence">
        <SectionError
          title="Error cargando ML Intelligence"
          description="No se pudieron obtener los datos de inteligencia predictiva."
          onRetry={refetchAll}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="ML Intelligence" subtitle="Inteligencia predictiva, anomalías y simulación">
      <div className="glass-ml-page">
        {/* ═══ Neural ambient glow ═══ */}
        <span
          className="glass-ml-page__glow"
          style={{
            background: `radial-gradient(circle, hsl(${ambientHue} 70% 55% / 0.04) 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />

        {/* ═══ KPI Strip ═══ */}
        <div className="glass-ml-kpi-grid">
          {kpis.map((kpi, i) => (
            <MLKPI
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              subtitle={kpi.subtitle}
              color={kpi.color}
              delay={i * 0.08}
              reduced={reduced}
            />
          ))}
        </div>

        {/* ═══ Advisor Banner ═══ */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 6 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          <MLAdvisorBanner
            insights={advisor.insights}
            topInsights={advisor.topInsights}
            hasHighSeverity={advisor.hasHighSeverity}
            onExecute={handleExecute}
          />
        </motion.div>

        {/* ═══ Tab Navigation ═══ */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 6 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
        >
          <DetailTabs
            tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
            active={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
          />
        </motion.div>

        {/* ═══ Tab Content ═══ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={reduced ? undefined : { opacity: 0, y: 8 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="glass-ml-content"
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                <PredictiveIntelligenceFeed
                  revenueForecast={revenueData}
                  churnReport={churnData}
                  anomalyReport={anomalyData}
                  dataQuality={dqData}
                />
                <MLSegmentationPanel segmentation={segmentData} churnReport={churnData} reduced={reduced} />
                <CalibrationDashboard />
              </div>
            )}

            {activeTab === "revenue" && (
              <PredictiveIntelligenceFeed
                revenueForecast={revenueData}
                churnReport={null}
                anomalyReport={null}
                dataQuality={null}
              />
            )}

            {activeTab === "members" && (
              <div className="space-y-6">
                <MLSegmentationPanel segmentation={segmentData} churnReport={churnData} reduced={reduced} />
                <PredictiveIntelligenceFeed
                  revenueForecast={null}
                  churnReport={churnData}
                  anomalyReport={null}
                  dataQuality={null}
                />
              </div>
            )}

            {activeTab === "anomalies" && (
              <PredictiveIntelligenceFeed
                revenueForecast={null}
                churnReport={null}
                anomalyReport={anomalyData}
                dataQuality={dqData}
              />
            )}

            {activeTab === "model-health" && (
              <div className="space-y-6">
                <ModelHealthPanel />
                <CalibrationDashboard />
              </div>
            )}

            {activeTab === "simulator" && (
              <HypotheticalSimulator />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageContainer>
  );
}