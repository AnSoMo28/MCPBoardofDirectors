/**
 * @component AISystemPage (Fase 25 — REWRITE)
 * @namespace .glass-ai
 * @depends useAISystemPage, SectionCard, AwarenessChart,
 *          SystemHealthDashboard, CommandInterface, NLRuleAuthor,
 *          ScenarioBuilder, AISystemPage.css
 * @note Full rewrite from 350-line monolith to orchestrator with hook +
 *       2 sub-components + inline readiness ring, pulse, activity feed.
 *       Backward-compatible: same default export, same route.
 * @import import './AISystemPage.css';
 */

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { Button, Skeleton } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { timeAgo } from "@/shared/lib/utils";
import { SystemHealthDashboard } from "@/shared/components/ai/SystemHealthDashboard";
import { CommandInterface } from "@/shared/components/ai/CommandInterface";
import { NLRuleAuthor } from "@/shared/components/ai/NLRuleAuthor";
import { ScenarioBuilder } from "@/shared/components/ai/ScenarioBuilder";
import { useAISystemPage } from "./hooks/useAISystemPage";
import {
  AI_SECTIONS,
  SYSTEM_HEALTH_THRESHOLDS,
  ACTIVITY_TYPE_CONFIG,
  READINESS_RING,
} from "./config";
import type {
  SystemHealthLevel,
  RecentActivity,
} from "./types";
import { AwarenessChart } from "./components/AwarenessChart";
import { SectionCard } from "./components/SectionCard";
import "./AISystemPage.css";

/* ═══════════════════════════════════════
   Inline: Readiness Ring
   ═══════════════════════════════════════ */

function ReadinessRing({
  score,
  level,
}: {
  score: number | null;
  level: SystemHealthLevel;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  if (score === null) return null;

  const { radius, strokeWidth, size } = READINESS_RING;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = SYSTEM_HEALTH_THRESHOLDS[level].color;

  return (
    <div
      className="glass-ai__readiness-ring"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Salud del sistema: ${score}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="glass-ai__readiness-ring-bg"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="glass-ai__readiness-ring-fill"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: mounted ? offset : circumference,
            stroke: color,
            strokeWidth,
          }}
        />
      </svg>
      <span
        className="glass-ai__readiness-ring-label"
        style={{ color }}
      >
        {score}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Inline: System Pulse
   ═══════════════════════════════════════ */

function SystemPulse({
  level,
  onClick,
}: {
  level: SystemHealthLevel;
  onClick: () => void;
}) {
  return (
    <Button
      variant="unstyled"
      type="button"
      className={`glass-ai__pulse glass-ai__pulse--${level}`}
      onClick={onClick}
      aria-label="Refrescar datos del sistema"
      title="Click para re-analizar"
    >
      <span className="glass-ai__pulse-dot" />
      <span className="glass-ai__pulse-text">
        {SYSTEM_HEALTH_THRESHOLDS[level].label}
      </span>
    </Button>
  );
}

/* ═══════════════════════════════════════
   Inline: Activity Feed
   ═══════════════════════════════════════ */

function ActivityFeed({
  activities,
}: {
  activities: RecentActivity[];
}) {
  if (activities.length === 0) return null;

  return (
    <div className="glass-ai__activity">
      <span className="glass-ai__activity-title">
        Actividad reciente
      </span>
      <div className="glass-ai__activity-list">
        {activities.map((a) => {
          const config = ACTIVITY_TYPE_CONFIG[a.type];
          const Icon = config.icon;
          return (
            <div key={a.id} className="glass-ai__activity-item">
              <div
                className="glass-ai__activity-icon"
                style={{ color: config.color }}
              >
                <Icon size={14} />
              </div>
              <span className="glass-ai__activity-text">
                {a.message}
              </span>
              <span className="glass-ai__activity-time">
                {timeAgo(a.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Section map (avoids repetition)
   ═══════════════════════════════════════ */

function DashboardContent({
  evolution,
  handleApprove,
  handleReject,
  handleImplement,
  handleRunAnalysis,
}: {
  evolution: ReturnType<typeof useAISystemPage>["evolution"];
  handleApprove: (id: string) => void;
  handleReject: (id: string) => void;
  handleImplement: (id: string) => void;
  handleRunAnalysis: () => void;
}) {
  if (!evolution.state.latestReport) return null;
  return (
    <SystemHealthDashboard
      report={evolution.state.latestReport}
      onApproveProposal={handleApprove}
      onRejectProposal={handleReject}
      onImplementProposal={handleImplement}
      onRunAnalysis={handleRunAnalysis}
      isAnalyzing={evolution.state.isAnalyzing}
    />
  );
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export function AISystemPage() {
  const h = useAISystemPage();
  const reduced = useReducedMotion();

  /* ── Context actions ── */
  const contextActions = useMemo(() => {
    const actions: Array<{
      icon: typeof Brain;
      message: string;
      onClick: () => void;
      color: string;
    }> = [];

    if (!h.hasReport) {
      actions.push({
        icon: Brain,
        message: "Ejecutá tu primer análisis para comenzar",
        onClick: h.handleRunAnalysis,
        color: "var(--color-gold-400)",
      });
      return actions;
    }

    const pending =
      h.proposalStats.total - h.proposalStats.implemented;
    if (pending > 0) {
      actions.push({
        icon: AlertTriangle,
        message: `${pending} propuesta${pending > 1 ? "s" : ""} pendiente${pending > 1 ? "s" : ""}`,
        onClick: () =>
          h.navigateToSection("dashboard"),
        color: "var(--color-amber-400)",
      });
    }

    if (h.systemHealthLevel === "critical") {
      actions.push({
        icon: RefreshCw,
        message: "Sistema en estado crítico — re-analizá",
        onClick: h.handleRunAnalysis,
        color: "var(--color-rose-400)",
      });
    }

    return actions;
  }, [
    h.hasReport,
    h.proposalStats,
    h.systemHealthLevel,
    h.handleRunAnalysis,
    h.navigateToSection,
  ]);

  /* ── Animation ── */
  const fadeUp = reduced
    ? undefined
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35 },
      };

  /* ── Render ── */
  return (
    <PageContainer title="Sistema AI">
      <div className="glass-ai">
        {/* ═══ Header ═══ */}
        <header className="glass-ai__header">
          <div className="glass-ai__header-row">
            <div className="glass-ai__header-info">
              <h2 className="glass-ai__header-title">
                <Brain
                  size={20}
                  className="glass-ai__header-brain"
                />
                Auto-conciencia, evolución y control
              </h2>
              <p className="glass-ai__header-subtitle">
                Inteligencia del club
              </p>
            </div>

            <div className="glass-ai__header-actions">
              <ReadinessRing
                score={h.systemHealthScore}
                level={h.systemHealthLevel}
              />
              <SystemPulse
                level={h.systemHealthLevel}
                onClick={h.handleRunAnalysis}
              />
            </div>
          </div>

          {/* Stats + Re-analyze */}
          <div className="glass-ai__stats">
            <span className="glass-ai__stat-chip">
              {h.proposalStats.total} propuesta
              {h.proposalStats.total !== 1 ? "s" : ""}
            </span>
            <span className="glass-ai__stat-chip">
              {h.proposalStats.implemented} implementada
              {h.proposalStats.implemented !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={h.handleRunAnalysis}
              disabled={h.evolution.state.isAnalyzing}
              icon={
                h.evolution.state.isAnalyzing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )
              }
              className="text-[var(--color-silver-400)] text-xs min-h-[32px]"
            >
              {h.evolution.state.isAnalyzing
                ? "Analizando..."
                : "Re-analizar"}
            </Button>
            <span className="glass-ai__last-analyzed">
              Último análisis: {timeAgo(h.lastAnalyzedAt)}
            </span>
          </div>

          {/* Context bar */}
          {contextActions.length > 0 && (
            <div className="glass-ai__context-bar">
              {contextActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <Button
                    variant="unstyled"
                    key={i}
                    type="button"
                    className="glass-ai__context-bar-item"
                    onClick={action.onClick}
                  >
                    <Icon
                      size={14}
                      style={{ color: action.color }}
                    />
                    <span>{action.message}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </header>

        {/* ═══ Activity Feed ═══ */}
        <ActivityFeed activities={h.recentActivity} />

        {/* ═══ Page Error ═══ */}
        {h.pageError && (
          <div className="glass-ai__error">
            <p className="glass-ai__error-text">
              Error: {h.pageError}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={h.handleRunAnalysis}
              className="glass-ai__error-retry text-[var(--color-silver-400)] text-xs min-h-[32px]"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* ═══ Loading Skeleton ═══ */}
        {h.isLoading && !h.hasReport && (
          <div className="glass-ai__skeleton-group">
            <Skeleton className="h-[300px] w-full rounded-[14px]" />
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-[72px] rounded-[10px]"
                />
              ))}
            </div>
          </div>
        )}

        {/* ═══ Sections ═══ */}
        <ErrorBoundary>
          {/* Dashboard */}
          <SectionCard
            id="dashboard"
            icon={AI_SECTIONS[0].icon}
            title={AI_SECTIONS[0].title}
            description={AI_SECTIONS[0].description}
            accentColor={AI_SECTIONS[0].accentColor}
            isCollapsed={h.collapsedSections.has("dashboard")}
            onToggle={() => h.toggleSection("dashboard")}
          >
            <DashboardContent
              evolution={h.evolution}
              handleApprove={h.handleApprove}
              handleReject={h.handleReject}
              handleImplement={h.handleImplement}
              handleRunAnalysis={h.handleRunAnalysis}
            />
          </SectionCard>

          {/* Commands */}
          <SectionCard
            id="commands"
            icon={AI_SECTIONS[1].icon}
            title={AI_SECTIONS[1].title}
            description={AI_SECTIONS[1].description}
            accentColor={AI_SECTIONS[1].accentColor}
            isCollapsed={h.collapsedSections.has("commands")}
            onToggle={() => h.toggleSection("commands")}
          >
            <CommandInterface
              turns={h.commandInterface.conversation.turns}
              isProcessing={
                h.commandInterface.conversation.isProcessing
              }
              onCommand={h.commandInterface.submitCommand}
              onFollowup={h.commandInterface.submitFollowup}
              onAction={h.commandInterface.handleAction}
            />
          </SectionCard>

          {/* Rules */}
          <SectionCard
            id="rules"
            icon={AI_SECTIONS[2].icon}
            title={AI_SECTIONS[2].title}
            description={AI_SECTIONS[2].description}
            accentColor={AI_SECTIONS[2].accentColor}
            isCollapsed={h.collapsedSections.has("rules")}
            onToggle={() => h.toggleSection("rules")}
          >
            <NLRuleAuthor />
          </SectionCard>

          {/* Simulator */}
          <SectionCard
            id="simulator"
            icon={AI_SECTIONS[3].icon}
            title={AI_SECTIONS[3].title}
            description={AI_SECTIONS[3].description}
            accentColor={AI_SECTIONS[3].accentColor}
            isCollapsed={h.collapsedSections.has("simulator")}
            onToggle={() => h.toggleSection("simulator")}
          >
            <ScenarioBuilder
              context={(h.summaryData ?? {}) as Record<string, unknown>}
              onSimulate={h.handleSimulate}
              isSimulating={h.isSimulating}
            />
          </SectionCard>
        </ErrorBoundary>

        {/* ═══ Awareness Chart ═══ */}
        {h.awarenessHistory.length > 2 && (
          <motion.div {...(fadeUp ?? {})}>
            <AwarenessChart history={h.awarenessHistory} />
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}

export default AISystemPage;