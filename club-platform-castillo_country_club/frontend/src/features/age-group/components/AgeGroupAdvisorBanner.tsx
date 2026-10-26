// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/AgeGroupAdvisorBanner.tsx
// Phase 34+ Migration — Age Group Advisor Banner
// Level 6+ Agency · Production Grade
//
// "The Intelligence Cockpit" — Not a thin wrapper. Integrates:
//   IntelligenceCompass — 7-layer neural filter
//   AI Working Pulse — system activity indicator
//   Tidal Alert — seasonal urgency badges
//   Lens Switch — layer filter pills
//   RippleWave — generational shockwave
//   AgingOutStrip — countdown corridor
//   AdvisorBanner — core insight engine
//
// Original: cn() + triple namespace + className prop + no ARIA
//   → BEM .ag-advisor + data-* + ARIA + CSS co-located
//
// PRE-WRITE VERIFICATION:
//   BaseInsight → @/shared/components/AdvisorBanner ✅
//   AgeGroupLayer → ../types ✅
//   AGE_GROUP_LAYER_META → ../config ✅
//   COHORT_IDENTITIES → ../config ✅
//   GenerationalRipple → ../types ✅
//   AgingOutRisk → ../types ✅
//   EngagementTier → ../types ✅
//   BracketMeta → ./hooks/useAgeGroupAdvisor ✅
//   SeasonalContext → ./hooks/useAgeGroupAdvisor ✅
//   SystemStatus → ./hooks/useAgeGroupDashboard ✅
//   AdvisorVitals → ./hooks/useAgeGroupData ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → data-active, data-clear, data-max-severity, data-empty
//   - .glass-ag-advisor + .ag-advisor + .ag-lens-pill → .ag-advisor__* unified
//   - className prop → removed
//   - ../types for constants → ../config
//   - Missing ARIA → region, aria-pressed, aria-label
//   - Missing CSS import → co-located
//   - Missing data-testid → added
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import { Brain, Activity } from "lucide-react";
import { AdvisorBanner } from "@/shared/components/AdvisorBanner";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";

import {
  AGE_GROUP_LAYER_META,
  COHORT_IDENTITIES,
} from "../config";
import type { AgeGroupLayer } from "../types";
import type {
  GenerationalRipple,
  AgingOutRisk,
  EngagementTier,
} from "../types";
import type {
  BracketMeta,
  SeasonalContext,
} from "../hooks/useAgeGroupAdvisor";
import type { SystemStatus } from "../hooks/useAgeGroupDashboard";
import type { AdvisorVitals } from "../hooks/useAgeGroupData";

import { IntelligenceCompass } from "./IntelligenceCompass";
import { RippleWave } from "./RippleWave";
import { AgingOutStrip } from "./AgingOutStrip";

import "./AgeGroupAdvisorBanner.css";

/* ── §0  Constants ────────────────────────────────────────── */

/**
 * Domain layer → AdvisorEngine layer mapping.
 * TODO[Centralize]: Also defined in IntelligenceCompass.tsx.
 * Move to config.ts when both files are stable.
 */
const DOMAIN_TO_ADVISOR: Record<AgeGroupLayer, string> = {
  balance: "social",
  participation: "engagement",
  growth: "lifecycle",
  cross_domain: "cross_domain",
  engagement: "engagement",
  social: "social",
  financial: "financial",
};

const LAYER_CONFIG = Object.fromEntries(
  Object.entries(DOMAIN_TO_ADVISOR).map(([domain, advisor]) => [
    advisor,
    {
      label: AGE_GROUP_LAYER_META[domain as AgeGroupLayer].icon,
      color: AGE_GROUP_LAYER_META[domain as AgeGroupLayer].color,
    },
  ]),
);

// Deduplicate (multiple domain layers may map to same advisor layer)
const DEDUPED_LAYER_CONFIG: Record<
  string,
  { label: string; color: string }
> = {};
for (const [advisor, config] of Object.entries(LAYER_CONFIG)) {
  if (!DEDUPED_LAYER_CONFIG[advisor]) {
    DEDUPED_LAYER_CONFIG[advisor] = config;
  }
}

const LAYERS: AgeGroupLayer[] = [
  "balance",
  "participation",
  "growth",
  "cross_domain",
  "engagement",
  "social",
  "financial",
];

/* ── §1  Props ────────────────────────────────────────────── */

interface AgeGroupAdvisorBannerProps {
  /** All active insights from advisor engine */
  readonly insights: BaseInsight[];
  /** Top-N insights for priority display */
  readonly topInsights: BaseInsight[];
  /** Whether any insight has high/critical severity */
  readonly hasHighSeverity: boolean;
  /** Callback when user executes an insight action */
  readonly onExecute?: (insight: BaseInsight) => void;
  /** Ripple propagation data */
  readonly ripples: GenerationalRipple[];
  /** Aging-out risk data per bracket */
  readonly agingOutRisks: AgingOutRisk[];
  /** Seasonal context with next peak countdown */
  readonly seasonalContext: SeasonalContext;
  /** Bracket metadata enrichment per insight */
  readonly insightBrackets: Map<string, BracketMeta>;
  /** Engagement tier enrichment per insight */
  readonly insightTiers: Map<string, EngagementTier>;
  /** System health status */
  readonly systemStatus: SystemStatus;
  /** Advisor engine execution vitals */
  readonly advisorVitals: AdvisorVitals;
}

/* ── §2  Component ────────────────────────────────────────── */

/**
 * AgeGroupAdvisorBanner — "The Intelligence Cockpit"
 *
 * Intelligence-first advisor that integrates compass, pulse,
 * tidal alerts, lens switching, ripple wave, and aging-out
 * corridor into a single cohesive cockpit.
 */
export function AgeGroupAdvisorBanner({ insights, topInsights, hasHighSeverity, onExecute, ripples, agingOutRisks, seasonalContext, insightBrackets, insightTiers, advisorVitals }: AgeGroupAdvisorBannerProps) {
  const [activeLayer, setActiveLayer] = useState<AgeGroupLayer | null>(
    null,
  );

  const isClear = insights.length === 0;

  /* ── Filtered insights ── */
  const filteredInsights = useMemo(() => {
    if (!activeLayer) return insights;
    const advisorLayer = DOMAIN_TO_ADVISOR[activeLayer];
    return insights.filter((i) => i.layer === advisorLayer);
  }, [insights, activeLayer]);

  const filteredTop = useMemo(() => {
    if (!activeLayer) return topInsights;
    const advisorLayer = DOMAIN_TO_ADVISOR[activeLayer];
    return topInsights.filter((i) => i.layer === advisorLayer);
  }, [topInsights, activeLayer]);

  /* ── Max severity for visual emphasis ── */
  const maxSeverity = useMemo(() => {
    if (hasHighSeverity) return "high";
    if (insights.some((i) => i.severity === "medium")) return "medium";
    return "info";
  }, [insights, hasHighSeverity]);

  /* ── Tidal Alert (P6) ── */
  const tidalInsight = useMemo(() => {
    if (!seasonalContext.nextPeak) return null;
    return {
      bracketId: seasonalContext.nextPeak.bracketId,
      label: seasonalContext.nextPeak.label,
      daysUntil: seasonalContext.nextPeak.daysUntil,
    };
  }, [seasonalContext]);

  /* ── AI pulse speed from dominant bracket resonance (P3) ── */
  const pulseSpeed = useMemo(() => {
    let maxResonance = 0;
    let speed = 4;
    for (const [, meta] of insightBrackets) {
      const identity = COHORT_IDENTITIES.find(
        (c) => c.bracketId === meta.id,
      );
      if (identity && identity.energySpeed > 0) {
        const resonance =
          identity.energyAnimation === "expand"
            ? 80
            : identity.energyAnimation === "breathe"
              ? 60
              : 40;
        if (resonance > maxResonance) {
          maxResonance = resonance;
          speed = identity.energySpeed;
        }
      }
    }
    return speed;
  }, [insightBrackets]);

  /* ── Callbacks ── */
  const handleLayerChange = useCallback(
    (layer: AgeGroupLayer | null) => setActiveLayer(layer),
    [],
  );

  /* ── Render ── */
  return (
    <div
      className="ag-advisor"
      role="region"
      aria-label="Advisor de inteligencia etaria"
      data-testid="ag-advisor"
      data-max-severity={maxSeverity}
      data-clear={isClear || undefined}
    >
      {/* § Header — Compass + Title + AI Pulse */}
      <div className="ag-advisor__header">
        <IntelligenceCompass
          insights={filteredInsights}
          activeLayer={activeLayer}
          onLayerChange={handleLayerChange}
          isClear={isClear}
        />

        <div className="ag-advisor__title-block">
          <div className="ag-advisor__title-row">
            <Brain size={18} className="ag-advisor__title-icon" aria-hidden="true" />
            <h3 className="ag-advisor__title">Advisor Etario</h3>
          </div>

          {/* AI Working Pulse */}
          <div className="ag-advisor__ai-status">
            <span
              className="ag-advisor__pulse-dot"
              aria-hidden="true"
              style={
                { "--pulse-speed": `${pulseSpeed}s` } as CSSProperties
              }
            />
            <span className="ag-advisor__ai-label">
              {isClear
                ? "Monitoreando — sin alertas"
                : `AI activo · ${advisorVitals.rulesMatched} reglas · ${advisorVitals.insightsProduced} alertas`}
            </span>
          </div>
        </div>
      </div>

      {/* § Lens Switch Pills (P7) */}
      {!isClear && (
        <div
          className="ag-advisor__lens"
          role="toolbar"
          aria-label="Filtrar por capa de inteligencia"
          data-testid="ag-advisor-lens"
        >
          <button
            className="ag-advisor__pill"
            data-active={!activeLayer || undefined}
            onClick={() => setActiveLayer(null)}
            type="button"
            aria-pressed={!activeLayer}
            aria-label="Mostrar todas las alertas"
          >
            <span>Todos</span>
            <span className="ag-advisor__pill-count">{insights.length}</span>
          </button>

          {LAYERS.map((layer) => {
            const meta = AGE_GROUP_LAYER_META[layer];
            const advisorLayer = DOMAIN_TO_ADVISOR[layer];
            const count = insights.filter(
              (i) => i.layer === advisorLayer,
            ).length;

            return (
              <button
                key={layer}
                className="ag-advisor__pill"
                data-active={activeLayer === layer || undefined}
                data-empty={count === 0 || undefined}
                onClick={() =>
                  setActiveLayer(activeLayer === layer ? null : layer)
                }
                type="button"
                aria-pressed={activeLayer === layer}
                aria-label={`${meta.icon}: ${count} alertas`}
                style={
                  { "--pill-color": meta.color } as CSSProperties
                }
              >
                <span aria-hidden="true">{meta.icon}</span>
                {count > 0 && (
                  <span className="ag-advisor__pill-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* § Tidal Alert (P6) */}
      {tidalInsight && !isClear && (
        <div
          className="ag-advisor__tidal"
          role="status"
          aria-label={`Peak en ${tidalInsight.daysUntil} días para ${tidalInsight.label}`}
          data-testid="ag-advisor-tidal"
        >
          <div className="ag-advisor__tidal-wave" aria-hidden="true" />
          <span className="ag-advisor__tidal-text">
            Peak en {tidalInsight.daysUntil} días — {tidalInsight.label}
          </span>
        </div>
      )}

      {/* § Core Advisor Banner */}
      <div data-testid="ag-advisor-core">
        <AdvisorBanner
          insights={filteredInsights}
          topInsights={filteredTop}
          hasHighSeverity={hasHighSeverity}
          onExecute={onExecute}
          layerConfig={DEDUPED_LAYER_CONFIG}
          title="Advisor Etario"
          accentColor="var(--color-teal-400)"
          icon={Activity}
          emptyMessage={
            isClear
              ? "Todos los grupos equilibrados — sin alertas activas."
              : "Sin alertas en esta dimensión."
          }
        />
      </div>

      {/* § Ripple Wave (P1) */}
      {ripples.length > 0 && (
        <div data-testid="ag-advisor-ripples">
          <RippleWave ripples={ripples} />
        </div>
      )}

      {/* § Aging-Out Strip (P2) */}
      <div data-testid="ag-advisor-aging">
        <AgingOutStrip risks={agingOutRisks} />
      </div>
    </div>
  );
}