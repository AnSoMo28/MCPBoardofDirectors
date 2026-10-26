/**
 * @component BoardReportViewer (Fase 25 — REWRITE)
 * @namespace .glass-board
 * @depends useBoardReport, PrintLayout, sub-components, BoardReportViewer.css
 * @note Full rewrite from 320-line monolith to orchestrator with 5 sub-components.
 *       URL-synced period, collapsible sections, KPI counter animation,
 *       section outline, PrintLayout shared integration.
 *       Backward-compatible: same route, same rendering.
 * @import import './BoardReportViewer.css';
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Minimize2, Maximize2, Sparkles } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui";
import { PrintLayout } from "@/shared/components/export/PrintLayout";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBoardReport } from "./hooks/useBoardReport";
import { PeriodSelector } from "./board/PeriodSelector";
import { ReportHeader } from "./board/ReportHeader";
import { KPICards } from "./board/KPICards";
import { ReportSection } from "./board/ReportSection";
import { BoardReportSkeleton } from "./board/BoardReportSkeleton";
import RiskHeatmap from "./RiskHeatmap";
import "./BoardReportViewer.css";

/* ═══════════════════════════════════════
   EASE constant (avoids TS inference issue)
   ═══════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function BoardReportViewer() {
  const board = useBoardReport();
  const reducedMotion = useReducedMotion();

  /* ── Motion variants ── */
  const stagger = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: reducedMotion ? 0 : 0.08 },
      },
    }),
    [reducedMotion],
  );

  const fadeUp = useMemo(
    () => ({
      hidden: { opacity: 0, y: reducedMotion ? 0 : 16 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: reducedMotion ? 0 : 0.35,
          ease: EASE,
        },
      },
    }),
    [reducedMotion],
  );

  /* ── Section nav items ── */
  const navItems = useMemo(() => {
    const items = [
      { id: "board-header", label: "Header" },
      { id: "board-summary", label: "Resumen" },
      { id: "board-kpis", label: "KPIs" },
      ...board.sections.map((s) => ({
        id: `board-section-${s.id}`,
        label: s.title.slice(0, 20) + (s.title.length > 20 ? "…" : ""),
      })),
    ];
    if (board.hasRiskData) {
      items.push({ id: "board-risk", label: "Riesgos" });
    }
    return items;
  }, [board.sections, board.hasRiskData]);

  return (
    <PageContainer
      title="Reportes de Junta Directiva"
      subtitle="Informes ejecutivos con análisis inteligente"
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Reportes de Junta" },
      ]}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={board.handlePrint}
          icon={<FileText size={16} />}
        >
          Exportar
        </Button>
      }
    >
      {/* ── Period selector ── */}
      <PeriodSelector
        periods={board.periods}
        selectedPeriod={board.selectedPeriod}
        onSelect={board.setSelectedPeriod}
      />

      {/* ── Error state ── */}
      {board.error && !board.report && (
        <EmptyState
          icon={
            <FileText className="w-8 h-8 text-[var(--color-rose-400)]" />
          }
          title="Error al cargar reporte"
          description="No se pudo obtener el reporte para este periodo. Intentá de nuevo."
          action={
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              icon={<FileText className="w-4 h-4" />}
            >
              Reintentar
            </Button>
          }
        />
      )}

      {/* ── Loading ── */}
      {board.isLoading && <BoardReportSkeleton />}

      {/* ── Report content ── */}
      {!board.isLoading && board.report && (
        <PrintLayout
          title="Reporte de Junta"
          subtitle={board.report.period}
          isOpen
          onClose={() => {}} /* always "open" in-page mode */
          onPrint={board.handlePrint}
        >
          <div
            style={{
              display: "flex",
              gap: 24,
              maxWidth: 1140,
              margin: "0 auto",
            }}
          >
            {/* ── Desktop outline ── */}
            <nav
              className="glass-board__outline"
              aria-label="Secciones del reporte"
            >
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`glass-board__outline-btn ${
                    board.activeSection === item.id
                      ? "glass-board__outline-btn--active"
                      : ""
                  }`}
                  onClick={() => board.scrollToSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* ── Content ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Mobile section nav chips */}
              <div className="glass-board__nav">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`glass-board__nav-chip ${
                      board.activeSection === item.id
                        ? "glass-board__nav-chip--active"
                        : ""
                    }`}
                    onClick={() => board.scrollToSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Section expand controls */}
              <div className="glass-board__controls no-print">
                <button
                  type="button"
                  className="glass-board__controls-btn"
                  onClick={
                    board.allExpanded
                      ? board.collapseAll
                      : board.expandAll
                  }
                >
                  {board.allExpanded ? (
                    <>
                      <Minimize2 size={12} />
                      Colapsar todo
                    </>
                  ) : (
                    <>
                      <Maximize2 size={12} />
                      Expandir todo
                    </>
                  )}
                </button>
              </div>

              {/* Staggered content */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Header */}
                <ReportHeader
                  report={board.report}
                  hasAI={board.hasAIGeneratedContent}
                  fadeIn={fadeUp}
                />

                {/* Executive Summary */}
                <motion.div id="board-summary" variants={fadeUp}>
                  <div className="glass-board__summary">
                    <div className="glass-board__summary-header">
                      <Sparkles className="glass-board__summary-icon" />
                      <h3 className="glass-board__summary-title">
                        Resumen Ejecutivo
                      </h3>
                    </div>
                    <p className="glass-board__summary-body">
                      {board.report.executive_summary}
                    </p>
                  </div>
                </motion.div>

                {/* KPIs */}
                <KPICards kpis={board.kpis} fadeIn={fadeUp} />

                {/* Sections */}
                {board.sections.map((section) => (
                  <ReportSection
                    key={section.id}
                    section={section}
                    isExpanded={board.expandedSections.has(section.id)}
                    onToggle={() => board.toggleSection(section.id)}
                    fadeIn={fadeUp}
                  />
                ))}

                {/* Risk Heatmap */}
                {board.hasRiskData && (
                  <motion.div id="board-risk" variants={fadeUp}>
                    <div className="glass-board__risk">
                      <RiskHeatmap risks={board.riskData!} />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </PrintLayout>
      )}

      {/* ── Empty — no report for period ── */}
      {!board.isLoading && !board.error && !board.report && (
        <EmptyState
          icon={<FileText size={48} />}
          title="Sin reporte para este periodo"
          description="No se encontró un reporte de Junta para el periodo seleccionado."
        />
      )}
    </PageContainer>
  );
}

export default BoardReportViewer;