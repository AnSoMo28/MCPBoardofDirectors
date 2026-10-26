/**
 * @component ReportHeader (Fase 25)
 * @namespace .glass-board__header
 * @depends BoardReportViewer.css
 * @note Report header with title, metadata, AI badge, approval status.
 * @import import '../BoardReportViewer.css';
 */

import { motion, type Variants } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/shared/components/ui";
import {
  REPORT_TYPE_CONFIG,
  REPORT_STATUS_CONFIG,
} from "@/features/reports/types";
import type { BoardReport } from "@/features/reports/types";

interface ReportHeaderProps {
  report: BoardReport;
  hasAI: boolean;
  fadeIn: Variants;
}

export function ReportHeader({ report, hasAI, fadeIn }: ReportHeaderProps) {
  const statusCfg = REPORT_STATUS_CONFIG[report.status];

  return (
    <motion.div id="board-header" variants={fadeIn}>
      <div className="glass-board__header">
        <div className="glass-board__header-top">
          <div>
            <div className="glass-board__header-title-row">
              <h2 className="glass-board__header-title">
                {report.title}
              </h2>
              <Badge variant={statusCfg.badgeVariant}>
                {statusCfg.label}
              </Badge>
            </div>
            <div className="glass-board__header-meta">
              <span className="glass-board__header-meta-item">
                <Calendar size={14} />
                {REPORT_TYPE_CONFIG[report.type].label} · {report.period}
              </span>
              <span>
                Generado:{" "}
                {new Date(report.generated_at).toLocaleDateString("es-CR")}
              </span>
              {report.approved_by && (
                <span className="glass-board__header-meta-item glass-board__header-approval">
                  <CheckCircle2 size={14} />
                  Aprobado por {report.approved_by}
                </span>
              )}
            </div>
          </div>

          {hasAI && (
            <div className="glass-board__ai-badge">
              <Sparkles className="glass-board__ai-badge-icon" />
              <span className="glass-board__ai-badge-text">
                Asistido por Inteligencia Artificial
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}