// ═══════════════════════════════════════════════════════════
// PART 3/4: SportsDashboard.tsx V2 — FULL REWRITE
// Level 5+ Apple/Xiaomi · "La Arena" · Phase 33
//
// VERIFIED TYPES:
//   SportsDashboardMode → "calm" | "alert" | "critical"
//   SportsDecisionStageMode → 5 values
//   SportsIntelligenceSummary → 7 fields
//   SportsAmbientState → { mode, intensity, accentColor, pulseRate, trigger? }
//   BaseInsight → from AdvisorBanner
//   SportsAnalytics_Contract → mega object (12 fields)
//   SportsHealthSummary_Contract → 7 fields
//   SportsHealthFactor_Contract → 6 fields
//   CR_WEATHER_RISK → Record<number, { label, level, color }>
//
// CHANGES FROM V1:
//   ✗ SportsAdvisorBanner → eliminated (redundant)
//   ✗ SportsHealthScore V1 → inline HealthGauge (BEM)
//   ✗ EmptyState import → removed (dead)
//   ✗ getGreeting() + getSeason() → moved to hook
//   ✓ Progressive disclosure KPIs (3 layers)
//   ✓ Celebration state
//   ✓ Entrance choreography
//   ✓ Stage cross-fade (key={stageMode})
//   ✓ CrossTab hidden in critical
//   ✓ Narrative paragraph (LP 7)
//   ✓ data-celebration, data-expanded, data-impact
//
// Living Protocol: 7/7
// @version 2.0.0
// @phase   33 — "The Arena"
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";

import {
  CalendarDays,
  Trophy,
  Dumbbell,
  Activity,
  ChevronRight,
} from "lucide-react";

import { SectionError } from "@/shared/components/layout/SectionError";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";

import { useSportsDashboard } from "./hooks/useSportsDashboard";
import type {
  SportsDashboardMode,
  SportsDecisionStageMode,
} from "./types";
import type { SportsAnalytics_Contract } from "@/shared/mocks/contracts";

import { SportsPulse } from "./components/SportsPulse";
import { BriefingOverlay } from "./components/BriefingOverlay";
import { HeroInsight } from "./components/HeroInsight";
import { SportsDecisionStage } from "./components/SportsDecisionStage";
import { SportsIntelligenceStream } from "./components/SportsIntelligenceStream";
import { SportsAmbientCanvas } from "./components/SportsAmbientCanvas";

import "./SportsDashboard.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — HELPERS
// ═══════════════════════════════════════════════════════════

function deriveHeroInsight(
  critical: BaseInsight[],
  high: BaseInsight[],
): BaseInsight | null {
  if (critical.length > 0) return critical[0];
  if (high.length > 0) return high[0];
  return null;
}

function buildDashboardNarrative(
  healthScore: number,
  insightCount: number,
  criticalCount: number,
  mode: SportsDashboardMode,
): string {
  const healthCtx =
    healthScore >= 80
      ? "excelente"
      : healthScore >= 60
        ? "saludable"
        : healthScore >= 40
          ? "necesita atención"
          : "crítica";

  const modeCtx =
    mode === "critical"
      ? "Sistema en modo crítico."
      : mode === "alert"
        ? "Sistema en modo de atención."
        : "Sistema en operación normal.";

  const insightCtx =
    criticalCount > 0
      ? `${criticalCount} insight${criticalCount > 1 ? "s" : ""} crítico${criticalCount > 1 ? "s" : ""}.`
      : "Sin insights críticos.";

  return `Salud deportiva ${healthCtx} (${healthScore}/100). ${insightCtx} ${modeCtx} ${insightCount} insight${insightCount !== 1 ? "s" : ""} activo${insightCount !== 1 ? "s" : ""} en total.`;
}

function getKpiDeepContent(
  label: string,
  analytics: SportsAnalytics_Contract | null | undefined,
): string | null {
  if (!analytics) return null;
  switch (label) {
    case "Reservas": {
      const peakEntries = Object.entries(analytics.peak_hours ?? {});
      if (peakEntries.length === 0) return null;
      const topPeak = peakEntries.sort(([, a], [, b]) => b - a)[0];
      return `Horario pico: ${topPeak[0]}:00 (${topPeak[1]} reservas)`;
    }
    case "Torneos": {
      const byStatus = analytics.tournament_metrics?.by_status ?? {};
      const active = byStatus["in_progress"] ?? 0;
      const open = byStatus["registration_open"] ?? 0;
      return `${active} en curso, ${open} con inscripciones abiertas`;
    }
    case "Clases": {
      const underperforming = (analytics.class_enrollment ?? []).filter(
        (c) => c.is_underperforming,
      ).length;
      return underperforming > 0
        ? `${underperforming} clase${underperforming > 1 ? "s" : ""} con baja inscripción`
        : "Todas las clases con buen ritmo";
    }
    case "Engagement": {
      const score = analytics.member_engagement_score ?? 0;
      return score >= 60
        ? "Socios activos y comprometidos"
        : "Hay oportunidad de mejorar la participación";
    }
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const BRIEFING_SESSION_KEY = "spt-briefing-shown-v2";

const STAGE_LABELS: Record<SportsDecisionStageMode, string> = {
  arena: "La Arena",
  trajectory: "La Trayectoria",
  competition: "La Competencia",
  team: "El Equipo",
  business: "El Negocio",
};

// ═══════════════════════════════════════════════════════════
// §3 — INLINE SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 ShimmerSkeleton ─────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div
      className="spt-dashboard__skeleton"
      role="status"
      aria-label="Cargando datos deportivos"
    >
      <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--pulse" />
      <div className="spt-dashboard__skeleton-row">
        <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--health" />
        <div className="spt-dashboard__skeleton-kpis">
          <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--kpi" />
          <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--kpi" />
          <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--kpi" />
          <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--kpi" />
        </div>
      </div>
      <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--hero" />
      <div className="spt-dashboard__skeleton-grid">
        <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--stage" />
        <div className="spt-dashboard__skeleton-block spt-dashboard__skeleton-block--stream" />
      </div>
    </div>
  );
}

// ── §3.2 KPIStatCard (with progressive disclosure) ───────

function KPIStatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  impact,
  expanded,
  deepContent,
  onToggle,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  subtitle?: string;
  impact?: "low" | "medium" | "high";
  expanded?: boolean;
  deepContent?: string | null;
  onToggle?: () => void;
}) {
  return (
    <div
      className="spt-dashboard__kpi"
      data-impact={impact ?? "low"}
      data-expanded={expanded ? "true" : undefined}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle?.();
        }
      }}
    >
      <div className="spt-dashboard__kpi-header">
        <Icon className="spt-dashboard__kpi-icon" />
        <span className="spt-dashboard__kpi-label">{label}</span>
      </div>
      <p className="spt-dashboard__kpi-value">{value}</p>
      {subtitle && (
        <p className="spt-dashboard__kpi-subtitle">{subtitle}</p>
      )}
      {deepContent && (
        <div className="spt-dashboard__kpi-deep">
          <p className="spt-dashboard__kpi-deep-text">{deepContent}</p>
        </div>
      )}
    </div>
  );
}

// ── §3.3 HealthGauge (replaces SportsHealthScore V1) ─────

function HealthGauge({
  score,
  level,
  trend,
  factors,
  alerts,
}: {
  score: number;
  level: string;
  trend: string;
  factors: { name: string; score: number; status: string }[];
  alerts: string[];
}) {
  return (
    <div className="spt-dashboard__gauge">
      <div className="spt-dashboard__gauge-score-row">
        <span className="spt-dashboard__gauge-score">{score}</span>
        <span className="spt-dashboard__gauge-slash">/100</span>
        <span className="spt-dashboard__gauge-trend" data-trend={trend}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
        </span>
      </div>
      <span className="spt-dashboard__gauge-level">{level}</span>
      <div className="spt-dashboard__gauge-factors">
        {factors.map((f) => (
          <div key={f.name} className="spt-dashboard__gauge-factor">
            <span className="spt-dashboard__gauge-factor-name">
              {f.name}
            </span>
            <div className="spt-dashboard__gauge-bar-track">
              <div
                className="spt-dashboard__gauge-bar-fill"
                data-status={f.status}
                style={{ width: `${Math.min(100, f.score)}%` }}
              />
            </div>
            <span
              className="spt-dashboard__gauge-factor-score"
              data-status={f.status}
            >
              {f.score}
            </span>
          </div>
        ))}
      </div>
      {alerts.length > 0 && (
        <ul className="spt-dashboard__gauge-alerts">
          {alerts.slice(0, 2).map((a, i) => (
            <li key={i} className="spt-dashboard__gauge-alert">
              ⚠ {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── §3.4 CrossTabSuggestion ──────────────────────────────

function CrossTabSuggestion({
  byMode,
  stageMode,
  onSwitch,
}: {
  byMode: Record<SportsDecisionStageMode, number>;
  stageMode: SportsDecisionStageMode;
  onSwitch: (mode: SportsDecisionStageMode) => void;
}) {
  const suggestions = useMemo(
    () =>
      (Object.entries(byMode) as [SportsDecisionStageMode, number][])
        .filter(([mode, count]) => mode !== stageMode && count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2),
    [byMode, stageMode],
  );

  if (suggestions.length === 0) return null;

  return (
    <div
      className="spt-dashboard__cross-tab"
      role="complementary"
      aria-label="Sugerencias de otros módulos"
    >
      {suggestions.map(([mode, count]) => (
        <Button
          variant="unstyled"
          key={mode}
          type="button"
          className="spt-dashboard__cross-tab-btn"
          onClick={() => onSwitch(mode)}
        >
          💡 {count} insight{count > 1 ? "s" : ""} en{" "}
          <strong>"{STAGE_LABELS[mode]}"</strong>
          <ChevronRight className="spt-dashboard__cross-tab-arrow" />
        </Button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsDashboard() {
  // ── §4.1 Orchestrator hook ─────────────────────────────
  const { insights, criticalInsights, highSeverityInsights, dashboardMode, ambientState, stageMode, setStageMode, byMode, analytics, health, calendar, season, greeting, isLoading, isError, refetch } = useSportsDashboard();

  // ── §4.2 Reduced motion ────────────────────────────────
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // ── §4.3 Briefing state ────────────────────────────────
  const [showBriefing, setShowBriefing] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(BRIEFING_SESSION_KEY);
  });

  const handleDismissBriefing = useCallback(() => {
    sessionStorage.setItem(BRIEFING_SESSION_KEY, "1");
    setShowBriefing(false);
  }, []);

  // ── §4.4 KPI progressive disclosure ────────────────────
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

  const handleKpiToggle = useCallback((label: string) => {
    setExpandedKpi((prev) => (prev === label ? null : label));
  }, []);

  // ── §4.5 Derived data ──────────────────────────────────
  const heroInsight = useMemo(
    () => deriveHeroInsight(criticalInsights, highSeverityInsights),
    [criticalInsights, highSeverityInsights],
  );

  const alertCount = criticalInsights.length + highSeverityInsights.length;

  const isCelebration = useMemo(
    () => (health?.health_score ?? 0) >= 85 && alertCount === 0,
    [health?.health_score, alertCount],
  );

  const narrative = useMemo(
    () =>
      buildDashboardNarrative(
        health?.health_score ?? 0,
        insights.length,
        criticalInsights.length,
        dashboardMode,
      ),
    [
      health?.health_score,
      insights.length,
      criticalInsights.length,
      dashboardMode,
    ],
  );

  const kpis = useMemo(() => {
    if (!analytics) return [];
    const engagement = analytics.member_engagement_score ?? 0;
    const tournaments =
      (analytics.tournament_metrics?.in_progress_count ?? 0) +
      (analytics.tournament_metrics?.upcoming_count ?? 0);
    return [
      {
        icon: CalendarDays,
        label: "Reservas",
        value: analytics.total_active_reservations ?? 0,
        subtitle: "activas",
        impact: "low" as const,
      },
      {
        icon: Trophy,
        label: "Torneos",
        value: tournaments,
        subtitle: `${analytics.tournament_metrics?.in_progress_count ?? 0} en curso`,
        impact: "low" as const,
      },
      {
        icon: Dumbbell,
        label: "Clases",
        value: analytics.total_active_classes ?? 0,
        subtitle: "activas",
        impact: "low" as const,
      },
      {
        icon: Activity,
        label: "Engagement",
        value: engagement.toFixed(1),
        subtitle:
          engagement >= 60
            ? "Saludable"
            : engagement >= 40
              ? "Atención"
              : "Bajo",
        impact:
          engagement >= 60
            ? ("low" as const)
            : engagement >= 40
              ? ("medium" as const)
              : ("high" as const),
      },
    ];
  }, [analytics]);

  // ── §4.6 Loading ───────────────────────────────────────
  if (isLoading) return <ShimmerSkeleton />;

  // ── §4.7 Error ─────────────────────────────────────────
  if (isError) {
    return (
      <div className="spt-dashboard__error">
        <SectionError
          title="Error cargando datos deportivos"
          description="No se pudieron obtener los datos del módulo de Sports & Recreation."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // ── §4.8 Render ────────────────────────────────────────
  return (
    <div
      className="spt-dashboard"
      data-mode={dashboardMode}
      data-celebration={isCelebration ? "true" : undefined}
      data-prefers-reduced={rm}
      role="region"
      aria-label={narrative}
    >
      {/* Background ambient canvas */}
      <SportsAmbientCanvas
        ambientState={ambientState}
        reducedMotion={rm}
      />

      {/* Briefing overlay (first load per session) */}
      {showBriefing && (
        <BriefingOverlay
          greeting={greeting}
          healthScore={health?.health_score ?? 0}
          healthTrend={health?.trend ?? "stable"}
          topInsights={insights.slice(0, 3)}
          ambientMode={dashboardMode}
          onDismiss={handleDismissBriefing}
        />
      )}

      {/* Dashboard content */}
      <div className="spt-dashboard__content">
        {/* ── Pulse header (choreography T+200ms) ── */}
        <div className="spt-dashboard__pulse-area">
          <SportsPulse
            dashboardMode={dashboardMode}
            healthScore={health?.health_score ?? 0}
            alertCount={alertCount}
            season={season}
            reducedMotion={rm}
          />
        </div>

        {/* ── Metrics: Health + KPIs (choreography T+400ms) ── */}
        <div className="spt-dashboard__metrics" data-mode={dashboardMode}>
          {/* Health gauge */}
          <div className="spt-dashboard__health">
            {health && (
              <HealthGauge
                score={health.health_score}
                level={health.level}
                trend={health.trend}
                factors={health.factors.map((f) => ({
                  name: f.name,
                  score: f.score,
                  status: f.status,
                }))}
                alerts={health.alerts}
              />
            )}
          </div>

          {/* KPI grid (staggered entry) */}
          <div className="spt-dashboard__kpis">
            {kpis.map((kpi) => (
              <KPIStatCard
                key={kpi.label}
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                subtitle={kpi.subtitle}
                impact={kpi.impact}
                expanded={expandedKpi === kpi.label}
                deepContent={getKpiDeepContent(kpi.label, analytics)}
                onToggle={() => handleKpiToggle(kpi.label)}
              />
            ))}
          </div>

          {/* Recommendations */}
          {health && health.recommendations.length > 0 && (
            <div className="spt-dashboard__recommendations">
              <p className="spt-dashboard__recommendations-title">
                💡 Recomendaciones
              </p>
              <ul className="spt-dashboard__recommendations-list">
                {health.recommendations.slice(0, 3).map((rec, i) => (
                  <li
                    key={i}
                    className="spt-dashboard__recommendations-item"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Hero insight (choreography T+700ms) ── */}
        {heroInsight && (
          <div className="spt-dashboard__hero-area">
            <HeroInsight
              insight={heroInsight}
              ambientMode={dashboardMode}
            />
          </div>
        )}

        {/* ── Main grid: Stage + Stream (choreography T+900ms) ── */}
        <div className="spt-dashboard__main" data-mode={dashboardMode}>
          <div className="spt-dashboard__stage-area" key={stageMode}>
            <SportsDecisionStage
              stageMode={stageMode}
              ambientMode={dashboardMode}
              byMode={byMode}
              analytics={analytics}
              calendar={calendar}
              onStageChange={setStageMode}
            />
          </div>

          <div className="spt-dashboard__sidebar">
            {/* CrossTab: hidden in critical (stage nav pills suffice) */}
            {dashboardMode !== "critical" && (
              <CrossTabSuggestion
                byMode={byMode}
                stageMode={stageMode}
                onSwitch={setStageMode}
              />
            )}
            <SportsIntelligenceStream
              insights={insights}
              ambientMode={dashboardMode}
            />
          </div>
        </div>

        {/* ── Footer: Narrative (LP 7) ── */}
        <div className="spt-dashboard__footer">
          <p className="spt-dashboard__narrative">{narrative}</p>
        </div>
      </div>
    </div>
  );
}