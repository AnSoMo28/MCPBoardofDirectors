// src/features/engagement/components/EngagementDashboard.tsx
// ═══════════════════════════════════════════════════════════
// "The Cortex" — Main Engagement Dashboard
// Castillo Country Club — Phase 31 "The Voice"
//
// THE ORCHESTRATOR. Calls useEngagementDashboard() ONCE.
// Passes brain.* as props to all children.
//
// Adaptive Morphism:
//   calm     → 3-col grid + 2-col secondary, full panorama
//   alert    → 3-col grid, gravity promoted, expanded stream
//   critical → 1-col focus, decision stage fills screen
//
// Glass namespace: glass-eng-dashboard
// Data attributes: data-mode (calm | alert | critical)
// Rules: R34, R35, R38, R60, R61, #62, #63
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  RefreshCw,
  AlertCircle,
  Heart,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import { useEngagementDashboard } from "./hooks/useEngagementDashboard";
import { Button } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";

// New neural components (Steps 1-9 — already built)
import { EngagementAmbientCanvas } from "./components/EngagementAmbientCanvas";
import { EngagementPulse } from "./components/EngagementPulse";
import { EngagementDecisionStage } from "./components/EngagementDecisionStage";
import { EngagementIntelligenceStream } from "./components/EngagementIntelligenceStream";
import { EngagementEcosystem } from "./components/EngagementEcosystem";
import { EngagementGravityWell } from "./components/EngagementGravityWell";
import { EngagementDNAHelix } from "./components/EngagementDNAHelix";
import { EngagementMomentsWall } from "./components/EngagementMomentsWall";
import { EngagementResonanceField } from "./components/EngagementResonanceField";

// Existing components (to be rewritten in Steps 11-12)
import { EngagementHealthScore } from "./components/EngagementHealthScore";
import { EngagementTrajectoryNavigator } from "./components/EngagementTrajectoryNavigator";

import type {
  EngagementDashboardFamily,
  WellnessTabData,
  SatisfactionTabData,
  QuarterlyInsightsData,
} from "./types";

import "./EngagementDashboard.css";


// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS (local to this file — no export)
// ══════════════════════════════════════════════════════════════

// ── Loading Skeleton ───────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div
      data-glass-eng-dashboard=""
      data-mode="calm"
      className="eng-dashboard eng-dashboard--loading"
    >
      <div className="eng-dashboard__content">
        <div className="eng-skel-strip" />
        <div className="eng-dashboard__body">
          <main className="eng-dashboard__primary">
            <div className="eng-dashboard__grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="eng-skel-card"
                  style={{ "--stagger-i": i } as React.CSSProperties}
                />
              ))}
            </div>
          </main>
          <aside className="eng-dashboard__sidebar">
            <div
              className="eng-skel-card eng-skel-card--short"
              style={{ "--stagger-i": 3 } as React.CSSProperties}
            />
            <div
              className="eng-skel-card eng-skel-card--tall"
              style={{ "--stagger-i": 4 } as React.CSSProperties}
            />
          </aside>
        </div>
        <div className="eng-dashboard__vitals">
          <div
            className="eng-skel-card"
            style={{ "--stagger-i": 5 } as React.CSSProperties}
          />
          <div
            className="eng-skel-card"
            style={{ "--stagger-i": 6 } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

// ── Error State ────────────────────────────────────────────

function DashboardError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div data-glass-eng-dashboard="" className="eng-dashboard">
      <div className="eng-dashboard__error">
        <AlertCircle size={32} className="eng-dashboard__error-icon" />
        <h2 className="eng-dashboard__error-title">
          Error al cargar engagement
        </h2>
        <p className="eng-dashboard__error-message">{error.message}</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw size={14} />
          Reintentar
        </Button>
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────

function DashboardEmpty({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div data-glass-eng-dashboard="" className="eng-dashboard">
      <div className="eng-dashboard__empty">
        <EmptyState
          title="Sin datos de engagement"
          description="No se encontraron datos de familias. El dashboard se activará cuando haya actividad reciente."
          action={
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCw size={14} />
              Actualizar
            </Button>
          }
        />
      </div>
    </div>
  );
}

// ── Deep-Dive: Wellness ────────────────────────────────────

function WellnessDeepDive({ data }: { data: WellnessTabData | null }) {
  if (!data) return null;

  return (
    <details className="eng-dd" data-section="wellness">
      <summary className="eng-dd__header">
        <Heart size={14} className="eng-dd__icon" />
        <span className="eng-dd__title">Wellness</span>
        <span className="eng-dd__badge">
          {data.total_activities} actividades
        </span>
        <ChevronRight size={14} className="eng-dd__chevron" />
      </summary>
      <div className="eng-dd__body">
        <div className="eng-dd__metrics">
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Minutos totales</span>
            <span className="eng-dd__metric-value">
              {data.total_minutes.toLocaleString()}
            </span>
          </div>
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Racha</span>
            <span className="eng-dd__metric-value">
              {data.streak_days} días
            </span>
          </div>
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Más frecuente</span>
            <span className="eng-dd__metric-value">
              {data.most_frequent_activity}
            </span>
          </div>
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Calorías</span>
            <span className="eng-dd__metric-value">
              {data.total_calories.toLocaleString()}
            </span>
          </div>
        </div>

        {data.activity_breakdown.length > 0 && (
          <div className="eng-dd__breakdown">
            {data.activity_breakdown.slice(0, 5).map(
              (
                item: {
                  activity: string;
                  count: number;
                  percentage: number;
                },
                i: number,
              ) => (
                <div
                  key={item.activity}
                  className="eng-dd__breakdown-item"
                  style={{ "--stagger-i": i } as React.CSSProperties}
                >
                  <span className="eng-dd__breakdown-label">
                    {item.activity}
                  </span>
                  <div className="eng-dd__breakdown-bar">
                    <div
                      className="eng-dd__breakdown-fill"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="eng-dd__breakdown-value">
                    {item.count}
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        {data.goals_summary && (
          <div className="eng-dd__metrics">
            <div className="eng-dd__metric">
              <span className="eng-dd__metric-label">Metas activas</span>
              <span className="eng-dd__metric-value">
                {data.goals_summary.active}
              </span>
            </div>
            <div className="eng-dd__metric">
              <span className="eng-dd__metric-label">Completadas</span>
              <span className="eng-dd__metric-value">
                {data.goals_summary.completed}
              </span>
            </div>
            <div className="eng-dd__metric">
              <span className="eng-dd__metric-label">Pausadas</span>
              <span className="eng-dd__metric-value">
                {data.goals_summary.paused}
              </span>
            </div>
          </div>
        )}

        {data.summary && (
          <p className="eng-dd__summary">{data.summary}</p>
        )}
      </div>
    </details>
  );
}

// ── Deep-Dive: Satisfaction ────────────────────────────────

function SatisfactionDeepDive({
  data,
}: {
  data: SatisfactionTabData | null;
}) {
  if (!data) return null;

  return (
    <details className="eng-dd" data-section="satisfaction">
      <summary className="eng-dd__header">
        <TrendingUp size={14} className="eng-dd__icon" />
        <span className="eng-dd__title">Satisfacción</span>
        <span className="eng-dd__badge">NPS {data.current_nps}</span>
        <ChevronRight size={14} className="eng-dd__chevron" />
      </summary>
      <div className="eng-dd__body">
        <div className="eng-dd__metrics">
          {Object.entries(data.category_averages)
            .slice(0, 6)
            .map(([key, value]) => (
              <div key={key} className="eng-dd__metric">
                <span className="eng-dd__metric-label">{key}</span>
                <span className="eng-dd__metric-value">{String(value)}</span>
              </div>
            ))}
        </div>

        {data.key_quotes.length > 0 && (
          <div className="eng-dd__quotes">
            {data.key_quotes
              .slice(0, 3)
              .map(
                (q: {
                  text: string;
                  sentiment: string;
                  family: string;
                  date: string;
                }) => (
                  <blockquote
                    key={`${q.family}-${q.date}`}
                    className="eng-dd__quote"
                    data-sentiment={q.sentiment}
                  >
                    <p>&ldquo;{q.text}&rdquo;</p>
                    <cite>&mdash; {q.family}</cite>
                  </blockquote>
                ),
              )}
          </div>
        )}

        {data.top_improvements.length > 0 && (
          <div className="eng-dd__improvements">
            <h4 className="eng-dd__subtitle">Mejoras detectadas</h4>
            {data.top_improvements
              .slice(0, 3)
              .map(
                (imp: {
                  area: string;
                  mentions: number;
                  impact: string;
                }) => (
                  <div key={imp.area} className="eng-dd__improvement">
                    <span>{imp.area}</span>
                    <span className="eng-dd__improvement-impact">
                      {imp.impact}
                    </span>
                  </div>
                ),
              )}
          </div>
        )}
      </div>
    </details>
  );
}

// ── Deep-Dive: Innovation ──────────────────────────────────

function InnovationDeepDive({
  data,
  conflictCount,
  patternCount,
}: {
  data: QuarterlyInsightsData | null;
  conflictCount: number;
  patternCount: number;
}) {
  if (!data) return null;

  return (
    <details className="eng-dd" data-section="innovation">
      <summary className="eng-dd__header">
        <Sparkles size={14} className="eng-dd__icon" />
        <span className="eng-dd__title">Innovación</span>
        <span className="eng-dd__badge">
          {data.year} {data.period}
        </span>
        <ChevronRight size={14} className="eng-dd__chevron" />
      </summary>
      <div className="eng-dd__body">
        <p className="eng-dd__summary">{data.summary}</p>

        <div className="eng-dd__metrics">
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Miembros activos</span>
            <span className="eng-dd__metric-value">
              {data.total_members_active}
            </span>
          </div>
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Eventos</span>
            <span className="eng-dd__metric-value">{data.events_held}</span>
          </div>
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Asistencia prom.</span>
            <span className="eng-dd__metric-value">
              {data.avg_event_attendance}
            </span>
          </div>
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Conflictos agenda</span>
            <span className="eng-dd__metric-value">{conflictCount}</span>
          </div>
          <div className="eng-dd__metric">
            <span className="eng-dd__metric-label">Patrones emergentes</span>
            <span className="eng-dd__metric-value">{patternCount}</span>
          </div>
        </div>

        {data.top_activities.length > 0 && (
          <div className="eng-dd__breakdown">
            <h4 className="eng-dd__subtitle">Top actividades</h4>
            {data.top_activities
              .slice(0, 4)
              .map(
                (
                  act: { name: string; attendance: number; growth_pct: number },
                  i: number,
                ) => (
                  <div
                    key={act.name}
                    className="eng-dd__breakdown-item"
                    style={{ "--stagger-i": i } as React.CSSProperties}
                  >
                    <span className="eng-dd__breakdown-label">{act.name}</span>
                    <span className="eng-dd__breakdown-value">
                      {act.attendance}
                    </span>
                    <span
                      className="eng-dd__metric-label"
                      style={{
                        color:
                          act.growth_pct >= 0
                            ? "var(--color-emerald-400)"
                            : "var(--color-rose-400)",
                        minWidth: "40px",
                        textAlign: "right",
                      }}
                    >
                      {act.growth_pct >= 0 ? "+" : ""}
                      {act.growth_pct}%
                    </span>
                  </div>
                ),
              )}
          </div>
        )}

        {data.key_achievements.length > 0 && (
          <div className="eng-dd__list">
            <h4 className="eng-dd__subtitle">Logros</h4>
            <ul>
              {data.key_achievements.slice(0, 3).map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {data.areas_for_improvement.length > 0 && (
          <div className="eng-dd__list">
            <h4 className="eng-dd__subtitle">Áreas de mejora</h4>
            <ul>
              {data.areas_for_improvement
                .slice(0, 3)
                .map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

/**
 * The Cortex — main engagement dashboard.
 *
 * THE ORCHESTRATOR. The only component that calls
 * useEngagementDashboard(). All children are pure presentational
 * components receiving props.
 *
 * Adaptive Morphism: layout physically reorganizes based on
 * system emotional state (calm → alert → critical).
 */
export function EngagementDashboard() {
  const brain = useEngagementDashboard();

  // ── Loading ──────────────────────────────────────────────
  if (brain.isLoading) {
    return <DashboardSkeleton />;
  }

  // ── Error (only if no data at all) ───────────────────────
  if (brain.error && !brain.isReady) {
    return (
      <DashboardError
        error={brain.error}
        onRetry={brain.dashboardRefetch}
      />
    );
  }

  // ── Empty ────────────────────────────────────────────────
  if (!brain.isReady) {
    return <DashboardEmpty onRefresh={brain.dashboardRefetch} />;
  }

  // ── Derived values ───────────────────────────────────────
  const mode = brain.dashboardMode;
  const families = brain.families;

  const atRiskCount = useMemo(
    () =>
      families.filter(
        (f: EngagementDashboardFamily) => f.engagement_level === "at_risk",
      ).length,
    [families],
  );

  const totalFamilies = families.length;

  // ── Render ───────────────────────────────────────────────
  return (
    <div
      data-glass-eng-dashboard=""
      data-mode={mode}
      className="eng-dashboard"
    >
      {/* Layer 0: Ambient breathing background (fixed overlay) */}
      <EngagementAmbientCanvas ambientState={brain.ambientState} />

      {/* Layer 1: Content (flows above ambient) */}
      <div className="eng-dashboard__content">
        {/* ── Pulse Strip ─────────────────────────────────── */}
        <EngagementPulse
          mode={mode}
          signals={brain.streamSignals}
          healthScore={brain.healthScore}
          healthGrade={brain.healthGrade}
          velocity={brain.velocity}
          atRiskCount={atRiskCount}
          totalFamilies={totalFamilies}
        />

        {/* ── Body: Primary + Sidebar ─────────────────────── */}
        <div className="eng-dashboard__body">
          {/* Primary area */}
          <main className="eng-dashboard__primary">
            {mode === "critical" ? (
              /* Critical mode: Decision Stage fills the screen */
              <div className="eng-dashboard__critical-focus">
                <EngagementDecisionStage
                  scenario={brain.decisionStage}
                />
                <div className="eng-dashboard__critical-stream">
                  <EngagementIntelligenceStream
                    signals={brain.streamSignals}
                    maxVisible={10}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Main grid: 3 signature visualizations */}
                <div className="eng-dashboard__grid">
                  <EngagementEcosystem ecosystem={brain.ecosystem} />
                  <EngagementGravityWell
                    gravitational={brain.gravitational}
                    aggregateGravity={brain.aggregateGravity}
                  />
                  <EngagementDNAHelix
                    mutations={brain.mutations}
                    families={families}
                  />
                </div>

                {/* Secondary grid: Moments + Resonance (calm only) */}
                {mode === "calm" && (
                  <div className="eng-dashboard__grid-secondary">
                    <EngagementMomentsWall moments={brain.moments} />
                    <EngagementResonanceField
                      resonance={brain.resonance}
                    />
                  </div>
                )}
              </>
            )}
          </main>

          {/* Sidebar: Decision + Stream (hidden in critical) */}
          {mode !== "critical" && (
            <aside className="eng-dashboard__sidebar">
              <EngagementDecisionStage
                scenario={brain.decisionStage}
              />
              <EngagementIntelligenceStream
                signals={brain.streamSignals}
                maxVisible={mode === "alert" ? 8 : 5}
              />
            </aside>
          )}
        </div>

        {/* ── Vitals Row (hidden in critical) ─────────────── */}
        {mode !== "critical" && (
          <div className="eng-dashboard__vitals">
            <EngagementHealthScore
              score={brain.healthScore}
              grade={brain.healthGrade}
              factors={brain.healthFactors}
              velocity={brain.velocity}
            />
            <EngagementTrajectoryNavigator
              families={families}
              velocity={brain.velocity}
            />
          </div>
        )}

        {/* ── Deep-Dive Sections (hidden in critical) ─────── */}
        {mode !== "critical" && (
          <div className="eng-dashboard__deep-dive">
            <WellnessDeepDive data={brain.wellness} />
            <SatisfactionDeepDive data={brain.satisfactionTrends} />
            <InnovationDeepDive
              data={brain.quarterlyInsights}
              conflictCount={brain.schedulingConflicts?.length ?? 0}
              patternCount={brain.emergentPatterns.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}