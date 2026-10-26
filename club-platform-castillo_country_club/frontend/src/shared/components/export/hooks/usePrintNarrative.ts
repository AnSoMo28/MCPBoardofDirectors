/**
 * @hook usePrintNarrative (Fase 24)
 * @module shared/components/export/hooks
 * @exports usePrintNarrative, type PrintNarrativeReturn
 * @note Data preparation for narrative print view.
 *       Computes derived table rows, section presence, and manages print/preview state.
 */

import { useState, useCallback, useEffect } from "react";
import { formatCurrency } from "@/shared/lib/utils";
import type {
  NarrativeGenerateData,
  NarrativeComparison,
} from "@/features/finance/types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface ComparisonTableRow extends NarrativeComparison {
  currentFormatted: string;
  previousFormatted: string;
  budgetFormatted: string;
  isExpense: boolean;
}

export interface PrintNarrativeReturn {
  /* Sections */
  summary: string;
  insights: NarrativeGenerateData["insights"];
  comparisons: ComparisonTableRow[];
  recommendations: NarrativeGenerateData["recommendations"];
  risks: NarrativeGenerateData["risk_alerts"];
  details: NarrativeGenerateData["sections"];
  /* Metadata */
  period: string;
  audience: string;
  confidence: number;
  /* Presence flags */
  hasInsights: boolean;
  hasComparisons: boolean;
  hasRecommendations: boolean;
  hasRisks: boolean;
  hasDetails: boolean;
  /* State */
  previewMode: boolean;
  togglePreview: () => void;
  /* Actions */
  handlePrint: () => void;
}

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */

const EXPENSE_METRICS = new Set(["Gastos"]);

function formatMetricValue(value: number, metric: string): string {
  if (metric === "Socios") return value.toString();
  if (metric === "Satisfacción") return `${value}/100`;
  return formatCurrency(value);
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function usePrintNarrative(
  data: NarrativeGenerateData,
): PrintNarrativeReturn {
  /* ── State ── */
  const [previewMode, setPreviewMode] = useState(true);

  const togglePreview = useCallback(() => {
    setPreviewMode((prev) => !prev);
  }, []);

  /* ── Print ── */
  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(() => {
    setPrinting(true);
  }, []);

  useEffect(() => {
    if (!printing) return;

    document.body.classList.add("is-printing");

    const raf = requestAnimationFrame(() => {
      window.print();
    });

    const onAfterPrint = () => {
      document.body.classList.remove("is-printing");
      setPrinting(false);
    };

    window.addEventListener("afterprint", onAfterPrint, { once: true });
    const fallback = setTimeout(onAfterPrint, 5000);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", onAfterPrint);
      clearTimeout(fallback);
      document.body.classList.remove("is-printing");
    };
  }, [printing]);

  /* ── Computed table rows ── */
  const comparisons: ComparisonTableRow[] = data.comparisons.map((c) => ({
    ...c,
    currentFormatted: formatMetricValue(c.current, c.metric),
    previousFormatted: formatMetricValue(c.previous, c.metric),
    budgetFormatted: formatMetricValue(c.budget, c.metric),
    isExpense: EXPENSE_METRICS.has(c.metric),
  }));

  /* ── Return ── */
  return {
    summary: data.executive_summary,
    insights: data.insights,
    comparisons,
    recommendations: data.recommendations,
    risks: data.risk_alerts,
    details: data.sections,
    period: data.period,
    audience: data.audience,
    confidence: data.narrative_confidence,
    hasInsights: data.insights.length > 0,
    hasComparisons: data.comparisons.length > 0,
    hasRecommendations: data.recommendations.length > 0,
    hasRisks: data.risk_alerts.length > 0,
    hasDetails: data.sections.length > 0,
    previewMode,
    togglePreview,
    handlePrint,
  };
}