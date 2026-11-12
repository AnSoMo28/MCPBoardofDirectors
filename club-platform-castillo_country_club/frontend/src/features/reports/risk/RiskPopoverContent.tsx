/**
 * @component RiskPopoverContent (Fase 25)
 * @namespace .glass-risk__pop
 * @depends RiskPopoverContent.css, riskTheme
 * @note Popover detail panel for a risk cell. Desktop absolute, mobile bottom sheet.
 * @import import './RiskPopoverContent.css';
 */
import "./RiskPopoverContent.css";

import { X } from "lucide-react";
import { Badge } from "@/shared/components/ui";
import {
  RISK_LEVEL_CONFIG,
  RISK_CATEGORY_CONFIG,
} from "@/shared/lib/riskTheme";
import type { RiskItem } from "@/features/reports/types";
import { Button } from "@/shared/components/ui/Button";

interface RiskPopoverContentProps {
  risks: RiskItem[];
  onClose: () => void;
}

export function RiskPopoverContent({
  risks,
  onClose,
}: RiskPopoverContentProps) {
  const primary = risks[0];
  if (!primary) return null;

  const levelConfig = RISK_LEVEL_CONFIG[primary.level];
  const categoryConfig = RISK_CATEGORY_CONFIG[primary.category];
  const CategoryIcon = categoryConfig.icon;

  return (
    <div className="glass-risk__pop">
      {/* Mobile drag handle */}
      <div className="glass-risk__pop-handle" />

      {/* Header */}
      <div className="glass-risk__pop-header">
        <div className="glass-risk__pop-header-left">
          <CategoryIcon
            className="glass-risk__pop-header-icon"
            style={{ color: categoryConfig.color }}
          />
          <h4 className="glass-risk__pop-title">{primary.title}</h4>
        </div>
        <Button
          variant="unstyled"
          type="button"
          className="glass-risk__pop-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Cerrar detalle de riesgo"
        >
          <X />
        </Button>
      </div>

      {/* Badges */}
      <div className="glass-risk__pop-badges">
        <Badge
          variant={
            primary.level === "critical"
              ? "danger"
              : primary.level === "high"
                ? "warning"
                : "default"
          }
          size="sm"
        >
          {levelConfig.label}
        </Badge>
        <span
          className="glass-risk__pop-badge-cat"
          style={{
            color: categoryConfig.color,
            backgroundColor: `${categoryConfig.color}18`,
          }}
        >
          {categoryConfig.label}
        </span>
      </div>

      {/* Description */}
      <p className="glass-risk__pop-desc">{primary.description}</p>

      {/* Scores */}
      <div className="glass-risk__pop-scores">
        <div className="glass-risk__pop-score-item">
          <span className="glass-risk__pop-score-label">Prob.</span>
          <span className="glass-risk__pop-score-value">
            {primary.probability}/4
          </span>
        </div>
        <div className="glass-risk__pop-score-item">
          <span className="glass-risk__pop-score-label">Impacto</span>
          <span className="glass-risk__pop-score-value">
            {primary.impact}/4
          </span>
        </div>
        <div
          className="glass-risk__pop-score-item"
          style={{ backgroundColor: levelConfig.bgColor }}
        >
          <span className="glass-risk__pop-score-label">Score</span>
          <span
            className="glass-risk__pop-score-value"
            style={{ color: levelConfig.color }}
          >
            {primary.score}/16
          </span>
        </div>
      </div>

      {/* Mitigation */}
      {primary.mitigation && (
        <div className="glass-risk__pop-mitigation">
          <span className="glass-risk__pop-mitigation-label">Mitigación</span>
          <p className="glass-risk__pop-mitigation-text">
            {primary.mitigation}
          </p>
        </div>
      )}

      {/* Owner */}
      {primary.owner && (
        <div className="glass-risk__pop-owner">
          <span>Responsable:</span>
          <span className="glass-risk__pop-owner-value">{primary.owner}</span>
        </div>
      )}

      {/* Additional risks */}
      {risks.length > 1 && (
        <div className="glass-risk__pop-additional">
          +{risks.length - 1} riesgo{risks.length - 1 > 1 ? "s" : ""}{" "}
          adicional{risks.length - 1 > 1 ? "es" : ""} en esta celda
        </div>
      )}
    </div>
  );
}