/**
 * @component DecisionDocument (Fase 24 — REWRITE)
 * @namespace .glass-decision
 * @depends useDecisionDocument, useScrollSpy, DecisionDocument.css
 * @note Full rewrite from 430-line monolith to orchestrator with 9 sub-components.
 *       Progressive loading, staggered queries, document outline, print optimization.
 *       Backward-compatible: same props interface ({ isOpen, onClose }).
 * @import import './DecisionDocument.css';
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Printer, X, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useScrollSpy } from "@/shared/hooks/useScrollSpy";
import { useDecisionDocument } from "./hooks/useDecisionDocument";
import { DocumentHeader } from "./decision/DocumentHeader";
import { SituationSection } from "./decision/SituationSection";
import { ScenarioSection } from "./decision/ScenarioSection";
import { StressSection } from "./decision/StressSection";
import { DecisionSection } from "./decision/DecisionSection";
import { InsightsSection } from "./decision/InsightsSection";
import { RecommendationsSection } from "./decision/RecommendationsSection";
import { RiskAlertsSection } from "./decision/RiskAlertsSection";
import { DocumentFooter } from "./decision/DocumentFooter";
import { DocumentOutline } from "./decision/DocumentOutline";
import "./DecisionDocument.css";

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */

const DOC_SECTIONS = [
  { id: "doc-situation", label: "1. Situación", module: "narrativa" },
  { id: "doc-scenario", label: "2. Escenarios", module: "escenarios" },
  { id: "doc-stress", label: "3. Resiliencia", module: "resiliencia" },
  { id: "doc-decisions", label: "4. Decisiones", module: "decisiones" },
  { id: "doc-insights", label: "5. Insights", module: "narrativa" },
  { id: "doc-recommendations", label: "6. Recomendaciones", module: "narrativa" },
  { id: "doc-risks", label: "7. Alertas", module: "narrativa" },
] as const;

const TOTAL_MODULES = 4;

const SECTION_IDS = DOC_SECTIONS.map((s) => s.id);

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface DecisionDocumentProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function DecisionDocument({ isOpen, onClose }: DecisionDocumentProps) {
  const doc = useDecisionDocument(isOpen);
  const prefersReducedMotion = useReducedMotion();

  /* ── Scroll spy (callback ref for container) ── */
  const { activeId, scrollTo } = useScrollSpy(SECTION_IDS, null);

  /* ── Escape to close ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* ── Focus first button on open ── */
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(".glass-decision__toolbar button")
        ?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  if (!isOpen) return null;

  /* ── Motion config ── */
  const containerVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06 },
        },
      };

  const itemVariants = prefersReducedMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: EASE },
        },
      };

  return (
    <div
      className={cn("glass-decision", doc.printMode && "glass-decision--print")}
      role="dialog"
      aria-label="Documento de Decisión"
      aria-modal="true"
    >
      {/* ── Toolbar ── */}
      <div className="glass-decision__toolbar no-print">
        <div className="glass-decision__toolbar-left">
          <FileText size={18} className="glass-decision__toolbar-icon" />
          <span className="glass-decision__toolbar-title">
            Documento de Decisión
          </span>
          <span className="glass-decision__toolbar-count">
            {doc.loadedCount}/{TOTAL_MODULES} módulos
          </span>
        </div>
        <div className="glass-decision__toolbar-right">
          <div className="glass-decision__progress" aria-hidden="true">
            <div
              className="glass-decision__progress-fill"
              style={{ width: `${doc.progressPercent}%` }}
            />
          </div>
          <Button
            variant="primary"
            onClick={doc.handlePrint}
            disabled={doc.isNarrativeLoading}
            icon={
              doc.isNarrativeLoading ? (
                <Loader2 className="glass-decision__spin" />
              ) : (
                <Printer size={16} />
              )
            }
            className="text-xs"
          >
            Imprimir / PDF
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            icon={<X size={16} />}
            className="text-xs"
          >
            Cerrar
          </Button>
        </div>
      </div>

      {/* ── Body (Outline + Content) ── */}
      <div className="glass-decision__body">
        <DocumentOutline
          sections={DOC_SECTIONS}
          activeId={activeId}
          loadedModules={doc.loadedModules}
          onNavigate={scrollTo}
        />

        <motion.div
          className="glass-decision__content"
          variants={containerVariants}
          initial={false}
          animate="visible"
        >
          {/* Header */}
          {doc.narrative && (
            <motion.div variants={itemVariants}>
              <DocumentHeader
                period={doc.narrative.period}
                audience={doc.narrative.audience}
                confidence={doc.narrative.narrative_confidence}
                generatedAt={doc.narrative.generated_at}
                loadedCount={doc.loadedCount}
                totalCount={TOTAL_MODULES}
              />
            </motion.div>
          )}

          {/* §1 Situación */}
          <motion.div variants={itemVariants}>
            <SituationSection
              id="doc-situation"
              summary={doc.narrative?.executive_summary}
            />
          </motion.div>

          {/* §2 Escenarios */}
          <motion.div variants={itemVariants}>
            <ScenarioSection
              id="doc-scenario"
              isLoading={doc.isScenarioLoading}
              deltas={doc.scenarioDeltas}
              aiCommentary={doc.scenario?.ai_commentary as string | undefined}
            />
          </motion.div>

          {/* §3 Resiliencia */}
          <motion.div variants={itemVariants}>
            <StressSection
              id="doc-stress"
              isLoading={doc.isStressLoading}
              metrics={doc.stressMetrics}
              aiCommentary={doc.stress?.ai_commentary as string | undefined}
            />
          </motion.div>

          {/* §4 Decisiones */}
          <motion.div variants={itemVariants}>
            <DecisionSection
              id="doc-decisions"
              isLoading={doc.isDecisionLoading}
              data={doc.decision}
            />
          </motion.div>

          {/* §5 Insights */}
          {doc.narrative && (
            <motion.div variants={itemVariants}>
              <InsightsSection
                id="doc-insights"
                insights={doc.narrative.insights}
              />
            </motion.div>
          )}

          {/* §6 Recomendaciones */}
          {doc.narrative && (
            <motion.div variants={itemVariants}>
              <RecommendationsSection
                id="doc-recommendations"
                recommendations={doc.narrative.recommendations}
              />
            </motion.div>
          )}

          {/* §7 Alertas */}
          {doc.narrative && doc.narrative.risk_alerts.length > 0 && (
            <motion.div variants={itemVariants}>
              <RiskAlertsSection
                id="doc-risks"
                alerts={doc.narrative.risk_alerts}
              />
            </motion.div>
          )}

          {/* Footer */}
          <motion.div variants={itemVariants}>
            <DocumentFooter />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default DecisionDocument;