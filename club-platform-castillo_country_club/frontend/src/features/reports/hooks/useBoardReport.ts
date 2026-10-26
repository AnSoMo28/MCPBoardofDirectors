/**
 * @hook useBoardReport (Fase 25)
 * @module features/reports/hooks
 * @exports useBoardReport, getAvailablePeriods
 * @note Report data, period management (URL-synced), derived computations,
 *       section expand state, print handler.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData } from "@tanstack/react-query";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type { BoardReport, RiskSummary } from "@/features/reports/types";

/* ═══════════════════════════════════════
   Period Logic
   ═══════════════════════════════════════ */

export function getAvailablePeriods(): { value: string; label: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  return Array.from({ length: 5 }, (_, i) => {
    let q = quarter - i;
    let y = year;
    while (q <= 0) {
      q += 4;
      y--;
    }
    return { value: `${y}-Q${q}`, label: `Q${q} ${y}` };
  });
}

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface BoardReportKPI {
  id: string;
  label: string;
  value: number;
  formatted: string;
  icon: string; /* semantic icon name */
}

export interface UseBoardReportReturn {
  /* Period */
  periods: { value: string; label: string }[];
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  /* Report data */
  report: BoardReport | undefined;
  riskData: RiskSummary | undefined;
  isLoading: boolean;
  isRiskLoading: boolean;
  error: Error | null;
  /* Derived */
  metadata: BoardReport["metadata"] | undefined;
  kpis: BoardReportKPI[];
  sections: BoardReport["sections"];
  hasRiskData: boolean;
  hasAIGeneratedContent: boolean;
  /* Section expand */
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
  allExpanded: boolean;
  collapseAll: () => void;
  expandAll: () => void;
  /* Section nav */
  sectionIds: string[];
  activeSection: string | null;
  scrollToSection: (id: string) => void;
  /* Print */
  handlePrint: () => void;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useBoardReport(): UseBoardReportReturn {
  /* ── Period (URL-synced) ── */
  const periods = useMemo(() => getAvailablePeriods(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPeriod = searchParams.get("period");
  const selectedPeriod =
    rawPeriod && periods.some((p) => p.value === rawPeriod)
      ? rawPeriod
      : periods[0].value;

  const setSelectedPeriod = useCallback(
    (p: string) => {
      setSearchParams({ period: p }, { replace: true });
    },
    [setSearchParams],
  );

  /* ── Queries ── */
  const {
    data: report,
    isLoading,
    error,
  } = useMCPQuery<BoardReport>(
    "reports",
    "get_board_report",
    { period: selectedPeriod },
    { staleTime: 5 * 60_000, placeholderData: keepPreviousData },
  );

  const {
    data: riskData,
    isLoading: isRiskLoading,
  } = useMCPQuery<RiskSummary>(
    "reports",
    "get_risk_matrix",
    { period: selectedPeriod },
    { staleTime: 5 * 60_000 },
  );

  /* ── Derived ── */
  const metadata = report?.metadata;
  const sections = report?.sections ?? [];
  const hasRiskData = !!(riskData && riskData.items.length > 0);
  const hasAIGeneratedContent = report?.generated_by === "ai";

  const kpis: BoardReportKPI[] = useMemo(
    () =>
      metadata
        ? [
            {
              id: "families",
              label: "Familias Activas",
              value: metadata.total_families,
              formatted: metadata.total_families.toString(),
              icon: "users",
            },
            {
              id: "revenue",
              label: "Ingresos",
              value: metadata.revenue_total,
              formatted: `₡${(metadata.revenue_total / 1_000_000).toFixed(1)}M`,
              icon: "dollar",
            },
            {
              id: "occupancy",
              label: "Ocupación",
              value: metadata.occupancy_rate,
              formatted: `${metadata.occupancy_rate.toFixed(1)}%`,
              icon: "chart",
            },
            {
              id: "nps",
              label: "NPS Satisfacción",
              value: metadata.satisfaction_nps,
              formatted: metadata.satisfaction_nps.toString(),
              icon: "shield",
            },
          ]
        : [],
    [metadata],
  );

  /* ── Section expand state ── */
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(),
  );

  /* Initialize all sections as expanded when report loads */
  useEffect(() => {
    if (sections.length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set(sections.map((s) => s.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.period]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allExpanded = sections.length > 0 && expandedSections.size === sections.length;

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  const expandAll = useCallback(() => {
    if (sections.length > 0) {
      setExpandedSections(new Set(sections.map((s) => s.id)));
    }
  }, [sections]);

  /* ── Section nav ── */
  const sectionIds = useMemo(
    () => [
      "board-header",
      "board-summary",
      "board-kpis",
      ...sections.map((s) => `board-section-${s.id}`),
      ...(hasRiskData ? ["board-risk"] : []),
    ],
    [sections, hasRiskData],
  );

  const [activeSection, setActiveSection] = useState<string | null>(null);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  }, []);

  /* ── Print (afterprint pattern) ── */
  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(() => {
    setPrinting(true);
  }, []);

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add("is-printing");
    const raf = requestAnimationFrame(() => window.print());
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

  return {
    periods,
    selectedPeriod,
    setSelectedPeriod,
    report,
    riskData,
    isLoading,
    isRiskLoading,
    error: error as Error | null,
    metadata,
    kpis,
    sections,
    hasRiskData,
    hasAIGeneratedContent,
    expandedSections,
    toggleSection,
    allExpanded,
    collapseAll,
    expandAll,
    sectionIds,
    activeSection,
    scrollToSection,
    handlePrint,
  };
}