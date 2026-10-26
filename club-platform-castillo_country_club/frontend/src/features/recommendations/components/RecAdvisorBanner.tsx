// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Advisor Banner (2027 NEW)
//
// Extends shared AdvisorBanner with:
//   - Mode-aware behavior (observe/analyze/act)
//   - Critical pulse on header when urgent items exist
//   - System status strip: mode + critical count + source health
//   - Data-impact / data-layer attributes for CSS styling
//   - Glass namespace: .glass-rab
//
// Replaces: 35-line thin wrapper → ~160 LOC intelligence-enhanced banner
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { Lightbulb, Zap, AlertTriangle, BarChart3 } from "lucide-react";

import {
  AdvisorBanner,
  type BaseInsight,
} from "@/shared/components/AdvisorBanner";

import type { RecommendationMode } from "../types";
import { RECOMMENDATION_MODE_CONFIG } from "../types";

import "./RecAdvisorBanner.css";

// ═══════════════════════════════════════════════════════════════════════
// LAYER CONFIG — Domain-specific insight layers
// ═══════════════════════════════════════════════════════════════════════

const LAYER_CONFIG: Record<string, { label: string; color: string }> = {
  macro: { label: "Acciones", color: "var(--color-gold-400)" },
  prediction: { label: "Informes", color: "var(--color-amber-400)" },
  health: { label: "Alertas", color: "var(--color-rose-400)" },
  lifecycle: { label: "Backlog", color: "var(--color-teal-400)" },
};

// ═══════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════

interface RecAdvisorBannerProps {
  insights: BaseInsight[];
  topInsights: BaseInsight[];
  hasHighSeverity: boolean;
  /** Current dashboard adaptive mode */
  mode: RecommendationMode;
  /** Optional: number of critical conflicts for status strip */
  criticalConflictCount?: number;
  /** Optional: number of high-impact opportunities */
  opportunityCount?: number;
  /** Optional: number of autonomous actions ready */
  readyActionCount?: number;
  onExecute?: (insight: BaseInsight) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecAdvisorBanner({
  insights,
  topInsights,
  hasHighSeverity,
  mode,
  criticalConflictCount = 0,
  opportunityCount = 0,
  readyActionCount = 0,
  onExecute,
  className,
}: RecAdvisorBannerProps) {
  // ── Derive impact level from insights ────────────────────────────────
  const highestImpact = useMemo<"high" | "medium" | "low">(() => {
    if (topInsights.some((i) => i.severity === "critical" || i.severity === "high"))
      return "high";
    if (topInsights.some((i) => i.severity === "medium"))
      return "medium";
    return "low";
  }, [topInsights]);

  // ── Determine dominant layer ────────────────────────────────────────
  const dominantLayer = useMemo(() => {
    const layerCounts = new Map<string, number>();
    for (const insight of insights) {
      const layer = insight.layer ?? "macro";
      layerCounts.set(layer, (layerCounts.get(layer) ?? 0) + 1);
    }
    let maxLayer = "macro";
    let maxCount = 0;
    for (const [layer, count] of layerCounts) {
      if (count > maxCount) {
        maxLayer = layer;
        maxCount = count;
      }
    }
    return maxLayer;
  }, [insights]);

  // ── Status items for the strip ──────────────────────────────────────
  const statusItems = useMemo(() => {
    const items: Array<{
      icon: typeof Lightbulb;
      label: string;
      value: string;
      severity: "default" | "warning" | "critical";
    }> = [];

    const modeConfig = RECOMMENDATION_MODE_CONFIG[mode];
    items.push({
      icon: mode === "act" ? Zap : mode === "analyze" ? BarChart3 : Lightbulb,
      label: "Modo",
      value: modeConfig.label,
      severity: mode === "act" ? "critical" : mode === "analyze" ? "warning" : "default",
    });

    if (criticalConflictCount > 0) {
      items.push({
        icon: AlertTriangle,
        label: "Conflictos",
        value: `${criticalConflictCount}`,
        severity: "critical",
      });
    }

    if (opportunityCount > 0) {
      items.push({
        icon: Lightbulb,
        label: "Oportunidades",
        value: `${opportunityCount}`,
        severity: "warning",
      });
    }

    if (readyActionCount > 0) {
      items.push({
        icon: Zap,
        label: "Acciones listas",
        value: `${readyActionCount}`,
        severity: "default",
      });
    }

    return items;
  }, [mode, criticalConflictCount, opportunityCount, readyActionCount]);

  // ── Empty message varies by mode ────────────────────────────────────
  const emptyMessage = useMemo(() => {
    switch (mode) {
      case "act":
        return "Sin acciones urgentes — el sistema está en calma.";
      case "analyze":
        return "Sin alertas activas — el análisis está al día.";
      default:
        return "Sin acciones recomendadas — todo bajo control.";
    }
  }, [mode]);

  return (
    <div
      className={`glass-rab ${className ?? ""}`}
      data-mode={mode}
      data-impact={highestImpact}
      data-layer={dominantLayer}
    >
      {/* ── Core AdvisorBanner ────────────────────────────────────────── */}
      <AdvisorBanner
        insights={insights}
        topInsights={topInsights}
        hasHighSeverity={hasHighSeverity}
        layerConfig={LAYER_CONFIG}
        title="Advisor Proactivo"
        accentColor="var(--color-gold-400)"
        icon={Lightbulb}
        emptyMessage={emptyMessage}
        onExecute={onExecute}
        className="rab-core"
      />

      {/* ── System Status Strip ───────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="rab-status-strip" role="status" aria-label="Estado del sistema">
          {statusItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.label}-${idx}`}
                className="rab-status-item"
                data-severity={item.severity}
                style={{ "--stagger-i": idx } as React.CSSProperties}
              >
                <Icon size={13} aria-hidden="true" className="rab-status-icon" />
                <span className="rab-status-label">{item.label}</span>
                <span className="rab-status-value">{item.value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Critical Pulse Overlay (when act mode + high impact) ──────── */}
      {mode === "act" && highestImpact === "high" && (
        <div className="rab-critical-pulse" aria-hidden="true" />
      )}
    </div>
  );
}