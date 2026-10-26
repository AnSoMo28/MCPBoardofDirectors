/**
 * @component ReportSection (Fase 25)
 * @namespace .glass-board__section*
 * @depends BoardReportViewer.css
 * @note Collapsible report section with type icon, AI confidence bar,
 *       recommendation highlight, low-confidence warning.
 * @import import '../BoardReportViewer.css';
 */

import { motion, type Variants } from "framer-motion";
import {
  FileText,
  BarChart3,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import type { BoardReport } from "@/features/reports/types";

/* ═══════════════════════════════════════
   Type Icon
   ═══════════════════════════════════════ */

function TypeIcon({ type }: { type: string }) {
  const classMap: Record<string, string> = {
    recommendation: "glass-board__section-type-icon--gold",
    kpi: "glass-board__section-type-icon--emerald",
    narrative: "glass-board__section-type-icon--silver",
  };
  const iconClass = cn(
    "glass-board__section-type-icon",
    classMap[type] ?? classMap.narrative,
  );

  switch (type) {
    case "recommendation":
      return <Sparkles className={iconClass} />;
    case "kpi":
      return <BarChart3 className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

/* ═══════════════════════════════════════
   Confidence Bar
   ═══════════════════════════════════════ */

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const level = pct >= 80 ? "high" : pct >= 50 ? "medium" : "low";

  return (
    <div className="glass-board__confidence">
      <span className="glass-board__confidence-label">Confianza:</span>
      <div className="glass-board__confidence-bar">
        <div
          className={`glass-board__confidence-fill glass-board__confidence-fill--${level}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className="glass-board__confidence-value"
        style={{
          color:
            level === "high"
              ? "var(--color-emerald-400, #34d399)"
              : level === "medium"
                ? "var(--color-amber-400, #fbbf24)"
                : "var(--color-rose-400, #fb7185)",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface ReportSectionProps {
  section: BoardReport["sections"][number];
  isExpanded: boolean;
  onToggle: () => void;
  fadeIn: Variants;  // ← era "object"
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function ReportSection({
  section,
  isExpanded,
  onToggle,
  fadeIn,
}: ReportSectionProps) {
  const isRecommendation = section.type === "recommendation";
  const lowConfidence =
    section.ai_confidence != null && section.ai_confidence < 0.5;

  return (
    <motion.div
      id={`board-section-${section.id}`}
      variants={fadeIn}
    >
      <div
        className={cn(
          "glass-board__section",
          isRecommendation && "glass-board__section--recommendation",
        )}
      >
        {/* ── Header (clickable) ── */}
        <button
          type="button"
          className="glass-board__section-header"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <div className="glass-board__section-header-left">
            <TypeIcon type={section.type} />
            <h3 className="glass-board__section-title">
              {section.title}
            </h3>
            {isRecommendation && (
              <Badge variant="warning" size="sm">
                Recomendación AI
              </Badge>
            )}
          </div>

          <div className="glass-board__section-header-right">
            {section.ai_confidence != null && (
              <ConfidenceBar value={section.ai_confidence} />
            )}
            <ChevronRight
              className={cn(
                "glass-board__section-toggle",
                isExpanded
                  ? "glass-board__section-toggle--open"
                  : "glass-board__section-toggle--closed",
              )}
            />
          </div>
        </button>

        {/* ── Content (collapsible) ── */}
        <div
          className={cn(
            "glass-board__section-content",
            !isExpanded && "glass-board__section-content--collapsed",
          )}
          role="region"
          aria-hidden={!isExpanded}
        >
          <p className="glass-board__section-body">
            {section.content}
          </p>

          {/* Low confidence warning */}
          {lowConfidence && (
            <div className="glass-board__recommendation-bar glass-board__recommendation-bar--low">
              <AlertTriangle
                className="glass-board__recommendation-icon"
                style={{ color: "var(--color-rose-400, #fb7185)" }}
              />
              <p className="glass-board__recommendation-text">
                Recomendación de baja confianza — requiere revisión manual
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}