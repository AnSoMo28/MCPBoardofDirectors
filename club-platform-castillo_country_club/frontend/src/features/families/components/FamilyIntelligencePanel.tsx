// src/features/families/components/FamilyIntelligencePanel.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Family Intelligence Panel
// Level 6+ Agency · Production Grade
//
// "The Intelligence Theatre"
//
// A full-spectrum intelligence briefing room that orchestrates
// 6 MCP tools into a single, cohesive narrative experience.
//
// VISUAL CONCEPT:
//   The constellation radar commands the top like a war-room display.
//   The narrative headline declares the situation with AI authority.
//   The insight strip is the MOST IMPORTANT piece — gold for action,
//   urgency-colored for finding. The action chain has a vertical
//   timeline with priority dots and connectors. Detail cards cascade
//   in by urgency priority. The entire panel breathes with urgency
//   atmosphere derived from the composite intelligence state.
//
// Sections:
//   1. Activate (idle) — Brain icon + description + memory badge
//   2. Memory Badge — last analysis timestamp + score deltas
//   3. Briefing — constellation + narrative headline + briefing
//   4. Insight Strip — key finding + immediate action + projection
//   5. Action Chain — predictive timeline with outcomes
//   6. Peer Insight — comparative intelligence
//   7. Controls — refresh + progress indicator
//   8. Details — toggle + priority-ordered dimension dossier cards
//
// Sub-components:
//   - ChurnDetail: risk gauge + factor bars + recommendation
//   - ActivitiesDetail: activity recommendation cards
//   - SocialDetail: match cards with avatar + match score
//   - EngagementDetail: dual gauges + AI summary
//   - LifecycleDetail: stage badge + progress + projection
//   - IntelligenceOverviewDetail: 360° gauge + health factor grid
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (inset highlight, urgency atmosphere wash)
//   D2: Stagger (10 section groups + dynamic card stagger)
//   D3: Cubic-bezier easing on panel entrance
//   D4: Mono for data/scores, UI for body, mono-uppercased for labels
//   D5: Urgency-driven dynamic colors via data-attributes
//   D6: Pseudo-element depth (urgency wash, noise, chain glow)
//   D7: Hover on activate, toggle, chain steps, detail cards
//   D8: Dense but readable (12-14px content, 6-10px gaps)
//   D9: Responsive (detail grid collapses, briefing stacks)
//   D10: aria-expanded, role="region", keyboard accessible
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-intel* namespaced keyframes (12 total)
//
// PRE-WRITE VERIFICATION:
//   Family                  → ../types.ts §2               ✅
//   FamilyChurnPrediction   → ../ai-types.ts §10           ✅
//   ChurnFactor             → ../ai-types.ts §10           ✅
//   ActivityRecommendation  → ../ai-types.ts §11           ✅
//   SocialMatch             → ../social-types.ts §3        ✅
//   MatchReason             → ../social-types.ts §3        ✅
//   FamilyEngagementPlan    → ../ai-types.ts §11           ✅
//   LifecycleProjection     → ../ai-types.ts §6            ✅
//   FamilyIntelligenceState → ../ai-types.ts §13           ✅
//   FamilyHealthScore       → ../ai-types.ts §2            ✅
//   FamilyHealthFactor      → ../ai-types.ts §2            ✅
//   IntelligenceResults     → ../lib/intelligenceCorrelator.ts §1 ✅
//   IntelligenceCorrelation → ../lib/intelligenceCorrelator.ts §1 ✅
//   DimensionScore          → ../lib/intelligenceCorrelator.ts §1 ✅
//   IntelligenceNarrative   → ../lib/intelligenceNarrator.ts §1   ✅
//   ActionChain             → ../lib/actionChainBuilder.ts §1     ✅
//   ActionStep              → ../lib/actionChainBuilder.ts §1     ✅
//   ActionImpact            → ../lib/actionChainBuilder.ts §1     ✅
//   IntelligenceMemory      → ../hooks/useIntelligenceEngine.ts §1 ✅
//   PeerInsight             → ../hooks/useIntelligenceEngine.ts §1 ✅
//   StreamPhase             → ../hooks/useIntelligenceEngine.ts §1 ✅
//   useIntelligenceEngine   → ../hooks/useIntelligenceEngine.ts    ✅
//   IntelligenceConstellation → ./IntelligenceConstellation.tsx    ✅
//   URGENCY_LEVELS          → ../config.ts §27            ✅
//   RISK_LEVELS             → ../config.ts §23            ✅
//   LIFECYCLE_STAGES        → ../config.ts §12            ✅
//   DOMAIN_COLORS           → ../config.ts §25            ✅
//   TIER_CONFIG             → ../config.ts §2              ✅
//   Badge                   → @/shared/components/ui       ✅
//   Button                  → @/shared/components/ui       ✅
//   ScoreGauge              → @/shared/components/ui       ✅
//   getScoreColor           → @/shared/lib/score-utils     ✅
//   SCORE_PRESETS           → @/shared/lib/score-utils     ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() × 3                       → data-* attributes
//   - ~120 Tailwind utilities        → BEM classes
//   - ~12 inline style={{ color }}   → CSS var bridges via data-*
//   - ~35 font-[family-name:]        → BEM typography
//   - Duplicate CSS import           → single import
//   - TIER_CONFIG from ./types       → from ./config
//   - Family360Insight (ghost)       → FamilyIntelligenceState
//   - FamilyActivityRecommendations  → ActivityRecommendation[] direct
//   - SocialMatchSuggestion (ghost)  → SocialMatch
//   - data.daysAtStage (ghost)       → data.daysAtCurrentStage
//   - data.nextTransition (ghost)    → data.projectedStage
//   - data.overallScore (ghost)      → data.healthScore.overall
//   - data.domains[].domain (ghost)  → data.healthScore.factors[].id
//   - sug.reason (ghost)             → sug.reasons[0]?.detail
//   - sug.matchScore as % (wrong)    → Math.round(sug.matchScore * 100)
//   - results.family360 (ghost)      → results.intelligence
//   - Mutable props                  → readonly
//   - Unused imports (5)             → removed
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Brain, Target, Users, TrendingUp, AlertTriangle, Activity,
  Calendar, Zap, RefreshCw, Sparkles, Mail, Award, DollarSign,
  ArrowRight, ChevronDown, ChevronUp, Clock, TrendingDown, Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { ScoreGauge } from "@/shared/components/ui/ScoreGauge";
import { getScoreColor, SCORE_PRESETS } from "@/shared/lib/score-utils";

import type {
  FamilyChurnPrediction,
  ActivityRecommendation,
  FamilyEngagementPlan,
  LifecycleProjection,
  FamilyIntelligenceState,
} from "../ai-types";
import type { SocialMatch } from "../social-types";

import { useIntelligenceEngine } from "../hooks/useIntelligenceEngine";
import type {
  IntelligenceMemory
} from "../hooks/useIntelligenceEngine";

import { IntelligenceConstellation } from "./IntelligenceConstellation";

import {
  URGENCY_LEVELS, RISK_LEVELS, LIFECYCLE_STAGES,
  DOMAIN_COLORS, TIER_CONFIG,
} from "../config";

import "./FamilyIntelligencePanel.css";

// ═══════════════════════════════════════════════════════════
// §1  Icon Registry
// ═══════════════════════════════════════════════════════════

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Brain, Target, Users, TrendingUp, AlertTriangle, Activity,
  Calendar, Zap, RefreshCw, Sparkles, Mail, Award, DollarSign,
  ArrowRight, ChevronDown, ChevronUp, Clock, TrendingDown, Eye,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Brain;
}

// ═══════════════════════════════════════════════════════════
// §2  Dimension Title + Content Registry
// Maps config dimension IDs to display titles.
// The key "family360" matches INTELLIGENCE_DIMENSIONS §26.
// The results key is "intelligence" (different!).
// ═══════════════════════════════════════════════════════════

type DimensionId = "churn" | "engagement" | "social" | "lifecycle" | "activities" | "family360";

const DIMENSION_TITLES: Record<DimensionId, string> = {
  churn: "Predicción de Churn",
  engagement: "Plan de Engagement",
  social: "Coincidencias Sociales",
  lifecycle: "Ciclo de Vida",
  activities: "Actividades Recomendadas",
  family360: "Vista 360°",
};

// ═══════════════════════════════════════════════════════════
// §3  Sub-components
// ═══════════════════════════════════════════════════════════

// ── §3.1  Memory Badge ──
// Source: IntelligenceMemory from useIntelligenceEngine.ts §1

interface MemoryBadgeProps {
  readonly memory: IntelligenceMemory | null;
  readonly deltas: Readonly<Record<string, number>>;
}

function MemoryBadge({ memory, deltas }: MemoryBadgeProps) {
  if (!memory) return null;

  const daysAgo = Math.floor((Date.now() - memory.timestamp) / 86_400_000);
  const timeStr =
    daysAgo === 0 ? "hoy" :
    daysAgo === 1 ? "ayer" :
    `hace ${daysAgo} días`;

  const deltaKeys = Object.keys(deltas);

  return (
    <div className="fm-intel__memory" data-testid="memory-badge">
      <Clock size={10} className="fm-intel__memory-icon" aria-hidden="true" />
      <span>Último análisis: {timeStr} · Score: {memory.compositeScore}</span>
      {deltaKeys.length > 0 && (
        <>
          <span>·</span>
          {deltaKeys.slice(0, 2).map((key) => {
            const delta = deltas[key];
            return (
              <span
                key={key}
                className="fm-intel__memory-delta"
                data-positive={delta > 0}
              >
                {key}: {delta > 0 ? "+" : ""}{Math.round(delta)}
              </span>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── §3.2  Churn Detail ──
// Source: FamilyChurnPrediction from ai-types.ts §10
//   riskScore: number, riskLevel: string, factors: ChurnFactor[],
//   recommendation: string, confidence: number
// ChurnFactor: { name, impact, direction, detail, severity }

interface ChurnDetailProps {
  readonly data: FamilyChurnPrediction;
}

function ChurnDetail({ data }: ChurnDetailProps) {
  const riskCfg = RISK_LEVELS[data.riskLevel] ?? RISK_LEVELS.medium;
  const maxImpact = Math.max(
    ...data.factors.map((f) => Math.abs(f.impact)),
    1,
  );

  return (
    <div className="fm-intel__churn">
      <div className="fm-intel__churn-header">
        <ScoreGauge
          score={data.riskScore}
          label={riskCfg.label}
          size={80}
          color={riskCfg.color}
        />
        <div className="fm-intel__churn-info">
          <Badge variant={riskCfg.variant} size="sm">
            Riesgo {riskCfg.label}
          </Badge>
          <span className="fm-intel__churn-confidence">
            Confianza: {Math.round(data.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="fm-intel__factors">
        {data.factors.slice(0, 3).map((factor, idx) => {
          const pct = Math.round((Math.abs(factor.impact) / maxImpact) * 100);
          const isPositive = factor.direction === "positive";
          return (
            <div key={idx} className="fm-intel__factor">
              <div className="fm-intel__factor-info">
                <span className="fm-intel__factor-name">{factor.name}</span>
                <span
                  className="fm-intel__factor-impact"
                  data-positive={isPositive}
                >
                  {factor.impact > 0 ? "+" : ""}{factor.impact}
                </span>
              </div>
              <div className="fm-intel__factor-bar-track">
                <div
                  className="fm-intel__factor-bar-fill"
                  data-positive={isPositive}
                  style={{ "--bar-width": `${pct}%` } as CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="fm-intel__insight-box">
        <span className="fm-intel__insight-label">AI:</span>
        <span>{data.recommendation}</span>
      </div>
    </div>
  );
}

// ── §3.3  Activities Detail ──
// Source: ActivityRecommendation[] from ai-types.ts §11
//   id, activityName, category, matchScore, reason,
//   targetMembers, estimatedEngagement, schedulingSuggestion
// NOTE: NO wrapper. Direct array. No basedOn field.

interface ActivitiesDetailProps {
  readonly data: readonly ActivityRecommendation[];
}

function ActivitiesDetail({ data }: ActivitiesDetailProps) {
  return (
    <div className="fm-intel__activities">
      <div className="fm-intel__activity-list">
        {data.slice(0, 3).map((rec) => (
          <div key={rec.id} className="fm-intel__activity-card">
            <div className="fm-intel__activity-header">
              <span className="fm-intel__activity-name">
                {rec.activityName}
              </span>
              <span className="fm-intel__activity-score">
                {rec.matchScore}%
              </span>
            </div>
            <p className="fm-intel__activity-reason">{rec.reason}</p>
            {rec.targetMembers.length > 0 && (
              <p className="fm-intel__activity-target">
                Para: {rec.targetMembers.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── §3.4  Social Detail ──
// Source: SocialMatch[] from social-types.ts §3
//   familyId, familyName, tier (MemberTier), matchScore (0-1!),
//   reasons: MatchReason[], suggestedActivity, suggestedContext,
//   commonInterests, sharedDemographics
// MatchReason: { type, weight, detail }
// CRITICAL: matchScore is 0-1, display as Math.round(matchScore * 100)

interface SocialDetailProps {
  readonly data: readonly SocialMatch[];
}

function SocialDetail({ data }: SocialDetailProps) {
  return (
    <div className="fm-intel__social-list">
      {data.slice(0, 3).map((sug) => {
        const tierCfg = TIER_CONFIG[sug.tier];
        const displayScore = Math.round(sug.matchScore * 100);
        const primaryReason = sug.reasons[0]?.detail ?? "";

        return (
          <div key={sug.familyId} className="fm-intel__social-card">
            <div className="fm-intel__social-header">
              <div
                className="fm-intel__social-avatar"
                style={
                  { "--avatar-bg": tierCfg?.color ?? "var(--color-silver-400)" } as CSSProperties
                }
              >
                {sug.familyName.charAt(0)}
              </div>
              <span className="fm-intel__social-name">
                {sug.familyName}
              </span>
              <span className="fm-intel__social-score">
                {displayScore}%
              </span>
            </div>
            {primaryReason && (
              <p className="fm-intel__social-reason">{primaryReason}</p>
            )}
            {sug.commonInterests.length > 0 && (
              <div className="fm-intel__social-interests">
                {sug.commonInterests.slice(0, 3).map((interest) => (
                  <span key={interest} className="fm-intel__social-interest-tag">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── §3.5  Engagement Detail ──
// Source: FamilyEngagementPlan from ai-types.ts §11
//   currentScore, targetScore, timeframe, actions, aiSummary, estimatedROIPercent

interface EngagementDetailProps {
  readonly data: FamilyEngagementPlan;
}

function EngagementDetail({ data }: EngagementDetailProps) {
  return (
    <div className="fm-intel__engagement">
      <div className="fm-intel__engagement-gauges">
        <ScoreGauge
          score={data.currentScore}
          label="Actual"
          size={60}
          color="var(--color-gold-400)"
        />
        <ArrowRight
          size={16}
          className="fm-intel__engagement-arrow"
          aria-hidden="true"
        />
        <ScoreGauge
          score={data.targetScore}
          label="Objetivo"
          size={60}
          color="var(--color-teal-400)"
        />
      </div>
      <p className="fm-intel__engagement-timeframe">{data.timeframe}</p>
      <div className="fm-intel__insight-box">
        <span>{data.aiSummary}</span>
      </div>
      {data.estimatedROIPercent > 0 && (
        <p className="fm-intel__engagement-roi">
          ROI estimado: +{data.estimatedROIPercent}%
        </p>
      )}
    </div>
  );
}

// ── §3.6  Lifecycle Detail ──
// Source: LifecycleProjection from ai-types.ts §6
//   currentStage, projectedStage, estimatedDaysToTransition,
//   triggerEvents, confidence, interventionWindow: { opens, closes, suggestedActions },
//   historicalStages[], daysAtCurrentStage, stageProgress (0-1)
// CRITICAL: NO daysAtStage → daysAtCurrentStage
// CRITICAL: NO nextTransition → projectedStage + interventionWindow

interface LifecycleDetailProps {
  readonly data: LifecycleProjection;
}

function LifecycleDetail({ data }: LifecycleDetailProps) {
  const stageCfg = LIFECYCLE_STAGES[data.currentStage] ?? LIFECYCLE_STAGES.plateau;
  const projectedCfg = LIFECYCLE_STAGES[data.projectedStage];
  const progressPct = Math.min(data.stageProgress * 100, 100);

  return (
    <div className="fm-intel__lifecycle">
      <div className="fm-intel__lifecycle-header">
        <Badge variant={stageCfg.variant} size="sm">{stageCfg.label}</Badge>
        <span className="fm-intel__lifecycle-days">
          {data.daysAtCurrentStage} días
        </span>
      </div>
      <div className="fm-intel__lifecycle-bar-track">
        <div
          className="fm-intel__lifecycle-bar-fill"
          style={
            {
              "--bar-width": `${progressPct}%`,
              "--bar-color": stageCfg.color,
            } as CSSProperties
          }
        />
      </div>
      <div className="fm-intel__insight-box">
        <span className="fm-intel__insight-label fm-intel__insight-label--teal">
          Proyección:
        </span>
        <span>
          {stageCfg.label} → {projectedCfg?.label ?? data.projectedStage}
          {" · "}Confianza: {Math.round(data.confidence * 100)}%
        </span>
      </div>
      {data.interventionWindow.suggestedActions.length > 0 && (
        <div className="fm-intel__lifecycle-actions">
          <p className="fm-intel__lifecycle-actions-label">
            Acciones sugeridas:
          </p>
          {data.interventionWindow.suggestedActions.slice(0, 2).map(
            (action, i) => (
              <p key={i} className="fm-intel__lifecycle-action-item">
                {action}
              </p>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ── §3.7  Intelligence Overview Detail ──
// Source: FamilyIntelligenceState from ai-types.ts §13
//   healthScore: FamilyHealthScore, lifecycleProjection, temperature,
//   pulse, crossDomainThreads, insights, lastUpdated
// FamilyHealthScore: { overall, status, factors: FamilyHealthFactor[], trend, delta7d, delta30d, computedAt }
// FamilyHealthFactor: { id, label, score, weight, status, finding, trend, recommendation? }
// CRITICAL: NO overallScore → healthScore.overall
// CRITICAL: NO domains → healthScore.factors
// CRITICAL: NO .domain → .id

interface IntelligenceOverviewDetailProps {
  readonly data: FamilyIntelligenceState;
}

function IntelligenceOverviewDetail({ data }: IntelligenceOverviewDetailProps) {
  const { healthScore } = data;

  return (
    <div className="fm-intel__overview">
      <div className="fm-intel__overview-gauge">
        <ScoreGauge
          score={healthScore.overall}
          label="360°"
          size={80}
          color={getScoreColor(healthScore.overall, SCORE_PRESETS.fourTier)}
        />
      </div>
      <div className="fm-intel__domain-grid">
        {healthScore.factors.map((factor) => {
          const domainColor = DOMAIN_COLORS[factor.id] ?? "var(--color-silver-400)";
          return (
            <div
              key={factor.id}
              className="fm-intel__domain-cell"
              style={{ "--domain-color": domainColor } as CSSProperties}
            >
              <div className="fm-intel__domain-header">
                <span className="fm-intel__domain-name">{factor.label}</span>
                <span className="fm-intel__domain-score">{factor.score}</span>
              </div>
              <div className="fm-intel__domain-bar-track">
                <div
                  className="fm-intel__domain-bar-fill"
                  style={{ "--bar-width": `${factor.score}%` } as CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="fm-intel__overview-trend">
        Tendencia: {healthScore.trend} · Δ7d: {healthScore.delta7d > 0 ? "+" : ""}{healthScore.delta7d} · Δ30d: {healthScore.delta30d > 0 ? "+" : ""}{healthScore.delta30d}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4  Detail Content Renderer
// Maps dimension ID → React content.
// CRITICAL: "family360" ID maps to results.intelligence key.
// ═══════════════════════════════════════════════════════════

interface DetailRenderContext {
  readonly churn: FamilyChurnPrediction | null;
  readonly activities: readonly ActivityRecommendation[] | null;
  readonly social: readonly SocialMatch[] | null;
  readonly engagement: FamilyEngagementPlan | null;
  readonly lifecycle: LifecycleProjection | null;
  readonly intelligence: FamilyIntelligenceState | null;
}

function renderDetailContent(
  dimId: DimensionId,
  results: DetailRenderContext,
): ReactNode {
  switch (dimId) {
    case "churn":
      return results.churn ? <ChurnDetail data={results.churn} /> : null;
    case "engagement":
      return results.engagement ? <EngagementDetail data={results.engagement} /> : null;
    case "social":
      return results.social ? <SocialDetail data={results.social} /> : null;
    case "lifecycle":
      return results.lifecycle ? <LifecycleDetail data={results.lifecycle} /> : null;
    case "activities":
      return results.activities ? <ActivitiesDetail data={results.activities} /> : null;
    case "family360":
      return results.intelligence ? <IntelligenceOverviewDetail data={results.intelligence} /> : null;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// §5  Main Component
// ═══════════════════════════════════════════════════════════

interface FamilyIntelligencePanelProps {
  readonly familyId: string;
  readonly familyName?: string;
  readonly familyTier?: string;
  readonly familyEngagement?: number;
}

/**
 * FamilyIntelligencePanel — "The Intelligence Theatre"
 *
 * Unified AI intelligence panel that orchestrates 6 MCP tools
 * into a cohesive narrative briefing experience.
 *
 * @example
 * <FamilyIntelligencePanel
 *   familyId="fam-123"
 *   familyName="Familia García"
 *   familyTier="oro"
 *   familyEngagement={78}
 * />
 */
export function FamilyIntelligencePanel({
  familyId,
  familyName,
  familyTier,
  familyEngagement,
}: FamilyIntelligencePanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const engine = useIntelligenceEngine({
    familyId,
    familyTier,
    familyEngagement,
    familyName,
  });

  const urgencyCfg =
    URGENCY_LEVELS[engine.urgencyLevel] ?? URGENCY_LEVELS.medium;

  // ── Smart priority ordering (B-07) ──
  // Dimension IDs match INTELLIGENCE_DIMENSIONS §26
  const detailOrder = useMemo(() => {
    if (engine.phase !== "complete") return [];

    const urgencyRank: Record<string, number> = {
      critical: 0, high: 1, medium: 2, low: 3, good: 4,
    };

    return [...engine.dimensionScores]
      .sort((a, b) => {
        const aRank = urgencyRank[a.urgency] ?? 5;
        const bRank = urgencyRank[b.urgency] ?? 5;
        return aRank - bRank;
      })
      .map((d) => d.id as DimensionId);
  }, [engine.phase, engine.dimensionScores]);

  // ── Handlers (B-08) ──
  const handleToggleDetails = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  // ═══════════════════════════════════════════════════════
  // IDLE STATE
  // ═══════════════════════════════════════════════════════

  if (engine.phase === "idle") {
    return (
      <div
        className="fm-intel"
        data-testid="family-intelligence-panel"
        data-phase="idle"
        role="region"
        aria-label={`Panel de inteligencia para ${familyName ?? "familia"}`}
      >
        <MemoryBadge memory={engine.memory} deltas={engine.deltas} />
        <button
          type="button"
          className="fm-intel__activate"
          onClick={engine.analyze}
        >
          <Brain size={20} className="fm-intel__activate-icon" aria-hidden="true" />
          <div className="fm-intel__activate-content">
            <p className="fm-intel__activate-title">
              Analizar inteligencia familiar
            </p>
            <p className="fm-intel__activate-hint">
              6 herramientas AI · Correlación cruzada · Plan de acción predictivo
            </p>
          </div>
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ACTIVE STATE
  // ═══════════════════════════════════════════════════════

  return (
    <div
      className="fm-intel"
      data-testid="family-intelligence-panel"
      data-phase={engine.phase}
      data-urgency={engine.urgencyLevel}
      role="region"
      aria-label={`Panel de inteligencia para ${familyName ?? "familia"}`}
    >
      {/* ══════ §A  Memory Badge ══════ */}
      <MemoryBadge memory={engine.memory} deltas={engine.deltas} />

      {/* ══════ §B  Briefing — Constellation + Narrative ══════ */}
      {engine.narrative && (
        <div className="fm-intel__briefing" data-urgency={engine.urgencyLevel}>
          <div className="fm-intel__briefing-header">
            <IntelligenceConstellation
              dimensions={[...engine.dimensionScores]}
              compositeScore={engine.compositeScore}
              urgencyLevel={engine.urgencyLevel}
              correlations={[...engine.correlations]}
              phase={engine.phase}
            />
            <div className="fm-intel__briefing-narrative">
              <p className="fm-intel__briefing-headline">
                {engine.narrative.headline}
              </p>
              <p className="fm-intel__briefing-text">
                {engine.narrative.briefing}
              </p>
            </div>
          </div>
          <div className="fm-intel__briefing-meta">
            <span className="fm-intel__briefing-confidence">
              Confianza: {engine.narrative.confidence}%
            </span>
            <span
              className="fm-intel__briefing-urgency"
              style={
                { "--intel-urgency-color": urgencyCfg.color } as CSSProperties
              }
            >
              {urgencyCfg.label}
            </span>
          </div>
        </div>
      )}

      {/* ══════ §C  Insight Strip — Key Finding + Action ══════ */}
      {engine.narrative && (
        <div
          className="fm-intel__insight-strip"
          data-urgency={engine.urgencyLevel}
        >
          <div className="fm-intel__insight-row">
            <Zap
              size={12}
              className="fm-intel__insight-icon"
              style={
                { "--intel-icon-color": urgencyCfg.color } as CSSProperties
              }
              aria-hidden="true"
            />
            <div>
              <p
                className="fm-intel__insight-strip-label"
                style={
                  { "--intel-label-color": urgencyCfg.color } as CSSProperties
                }
              >
                Hallazgo clave
              </p>
              <p className="fm-intel__insight-strip-text">
                {engine.narrative.keyInsight}
              </p>
            </div>
          </div>
          <div className="fm-intel__insight-row">
            <Target
              size={12}
              className="fm-intel__insight-icon fm-intel__insight-icon--gold"
              aria-hidden="true"
            />
            <div>
              <p className="fm-intel__insight-strip-label fm-intel__insight-strip-label--gold">
                Acción inmediata
              </p>
              <p className="fm-intel__insight-strip-text">
                {engine.narrative.immediateAction}
              </p>
            </div>
          </div>
          {engine.narrative.projectedOutcome && (
            <p className="fm-intel__insight-outcome">
              → {engine.narrative.projectedOutcome}
            </p>
          )}
        </div>
      )}

      {/* ══════ §D  Action Chain ══════ */}
      {engine.actionChain && engine.actionChain.steps.length > 0 && (
        <div className="fm-intel__chain">
          <div className="fm-intel__chain-header">
            <Zap size={12} className="fm-intel__chain-header-icon" aria-hidden="true" />
            <span className="fm-intel__chain-header-label">
              Plan de acción predictivo ({engine.actionChain.steps.length} pasos)
            </span>
          </div>

          <div className="fm-intel__chain-steps">
            {engine.actionChain.steps.map((step, i) => (
              <div key={step.id} className="fm-intel__chain-step">
                <div className="fm-intel__chain-timeline">
                  <div className="fm-intel__chain-dot" data-priority={step.priority} />
                  {i < engine.actionChain!.steps.length - 1 && (
                    <div className="fm-intel__chain-connector" />
                  )}
                </div>
                <div className="fm-intel__chain-content">
                  <p className="fm-intel__chain-timing">{step.timing}</p>
                  <p className="fm-intel__chain-action">{step.action}</p>
                  {step.impacts.length > 0 && (
                    <p className="fm-intel__chain-impact">
                      {step.impacts.map(
                        (imp) =>
                          `${imp.metric}: ${imp.current} → ${imp.predicted}`,
                      ).join(" · ")}
                    </p>
                  )}
                  <p className="fm-intel__chain-context">{step.context}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Outcome */}
          <div className="fm-intel__outcome">
            <p className="fm-intel__outcome-label">
              Resultado estimado · {engine.actionChain.outcome.timeframe}
            </p>
            <div className="fm-intel__outcome-metrics">
              {engine.actionChain.outcome.metrics.map((m) => (
                <div key={m.metric} className="fm-intel__outcome-metric">
                  <span className="fm-intel__outcome-metric-name">
                    {m.metric}:
                  </span>
                  <span className="fm-intel__outcome-current">
                    {m.current}
                  </span>
                  <span className="fm-intel__outcome-arrow">→</span>
                  <span className="fm-intel__outcome-predicted">
                    {m.predicted}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ §E  Peer Insight ══════ */}
      {engine.peerInsight && (
        <div className="fm-intel__peer">
          <Users
            size={12}
            className="fm-intel__peer-icon"
            aria-hidden="true"
          />
          <div>
            <p className="fm-intel__peer-label">Inteligencia comparativa</p>
            <p className="fm-intel__peer-text">
              {engine.peerInsight.successStory}
            </p>
          </div>
        </div>
      )}

      {/* ══════ §F  Controls ══════ */}
      <div className="fm-intel__controls">
        <Button
          variant="ghost"
          size="sm"
          onClick={engine.refetchAll}
          icon={<RefreshCw size={12} />}
          disabled={engine.isAnyLoading}
        >
          Actualizar análisis
        </Button>
        {engine.isAnyLoading && (
          <span className="fm-intel__progress">
            {engine.resolvedCount}/6 herramientas
          </span>
        )}
      </div>

      {/* ══════ §G  Details Toggle ══════ */}
      <button
        type="button"
        className="fm-intel__details-toggle"
        onClick={handleToggleDetails}
        aria-expanded={showDetails}
      >
        {showDetails
          ? <ChevronUp size={14} aria-hidden="true" />
          : <ChevronDown size={14} aria-hidden="true" />}
        {showDetails ? "Ocultar detalle" : "Ver detalle por herramienta"}
      </button>

      {/* ══════ §H  Detail Cards — Priority Ordered ══════ */}
      <div className="fm-intel__details" data-open={showDetails}>
        {detailOrder.map((dimId, cardIndex) => {
          const dim = engine.dimensionScores.find((d) => d.id === dimId);
          if (!dim || dim.status !== "loaded") return null;

          const content = renderDetailContent(dimId, engine.results);
          if (!content) return null;

          const DimIcon = resolveIcon(dim.icon);
          const title = DIMENSION_TITLES[dimId] ?? dimId;
          const delta = engine.deltas[dimId];

          return (
            <div
              key={dimId}
              className="fm-intel__detail-card"
              style={{ "--card-index": cardIndex } as CSSProperties}
            >
              <div className="fm-intel__detail-card-header">
                <div className="fm-intel__detail-card-title-row">
                  <span
                    className="fm-intel__detail-card-icon"
                    style={{ "--dim-color": dim.color } as CSSProperties}
                  >
                    <DimIcon size={14} aria-hidden="true" />
                  </span>
                  <h3 className="fm-intel__detail-card-title">{title}</h3>
                </div>
                <div className="fm-intel__detail-card-scores">
                  <span
                    className="fm-intel__detail-card-score"
                    style={{ "--dim-color": dim.color } as CSSProperties}
                  >
                    {dim.score}
                  </span>
                  {delta !== undefined && (
                    <span
                      className="fm-intel__detail-card-delta"
                      data-positive={delta > 0}
                    >
                      {delta > 0 ? "+" : ""}{Math.round(delta)}
                    </span>
                  )}
                </div>
              </div>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}