/**
 * @component RecommendationPreview (Fase 25)
 * @namespace .glass-landing__recs
 * @depends RecommendationPreview.css, RecommendationCard styles
 * @note Recommendation trigger with inline preview of top rec.
 *       Doesn't call AI endpoint until user clicks.
 *       Once loaded, shows expandable recommendation cards.
 * @import import './RecommendationPreview.css';
 */
import "./RecommendationPreview.css";

import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button, EmptyState, Skeleton } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { getScoreColor, SCORE_PRESETS } from "@/shared/lib/score-utils";
import { ICON_MAP, PRIORITY_CONFIG } from "../config";
import type { FamilyRecommendation } from "../types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface RecommendationPreviewProps {
  showTrigger: boolean;
  onLoad: () => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  recommendations: FamilyRecommendation[];
}

/* ═══════════════════════════════════════
   Inline Recommendation Card
   ═══════════════════════════════════════ */

function RecCard({
  rec,
  index,
}: {
  rec: FamilyRecommendation;
  index: number;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const priorityCfg =
    PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.medium;
  const IconComp = ICON_MAP[rec.recommendation_type] ?? Sparkles;
  const scoreColor = getScoreColor(
    rec.score,
    SCORE_PRESETS.recommendationGold,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
      className="glass-landing__rec-card"
    >
      <div className="glass-landing__rec-card-body">
        <div className="glass-landing__rec-card-header">
          <div
            className="glass-landing__rec-card-icon"
            style={{
              backgroundColor: `color-mix(in srgb, ${scoreColor} 12%, transparent)`,
              color: scoreColor,
            }}
          >
            <IconComp size={16} />
          </div>
          <div className="glass-landing__rec-card-info">
            <div className="glass-landing__rec-card-title-row">
              <h4 className="glass-landing__rec-card-name">
                {rec.title}
              </h4>
              <div className="glass-landing__rec-card-badges">
                <span
                  className="glass-landing__rec-card-priority"
                  style={{
                    color: priorityCfg.color,
                    backgroundColor: priorityCfg.bgColor,
                  }}
                >
                  {priorityCfg.label}
                </span>
                <span
                  className="glass-landing__rec-card-score"
                  style={{ color: scoreColor }}
                >
                  {rec.score}
                </span>
              </div>
            </div>
            <p className="glass-landing__rec-card-desc">
              {rec.description}
            </p>
          </div>
        </div>
      </div>

      {/* Reasoning expand */}
      <Button
        variant="unstyled"
        type="button"
        className="glass-landing__rec-card-reasoning-btn"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        )}
        {expanded ? "Menos detalle" : "¿Por qué esta recomendación?"}
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="glass-landing__rec-card-reasoning">
              <p className="glass-landing__rec-card-reasoning-text">
                {rec.reasoning}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      {rec.action_label && (
        <div className="px-4 pb-3">
          <Button
            variant="ghost"
            onClick={() => {
              if (rec.action_route) navigate(rec.action_route);
            }}
            icon={<ArrowRight size={14} />}
            iconPosition="right"
            className="text-[var(--color-gold-400)] text-xs !p-0 !min-h-0 font-[family-name:var(--font-ui)]"
          >
            {rec.action_label}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function RecommendationPreview({
  showTrigger,
  onLoad,
  isLoading,
  isError,
  onRetry,
  recommendations,
}: RecommendationPreviewProps) {
  return (
    <div>
      <div className="glass-landing__recs-header">
        <h2 className="glass-landing__recs-title">
          Recomendación personalizada
        </h2>
      </div>

      {showTrigger ? (
        /* Trigger — no AI call yet */
        <Button
          variant="unstyled"
          type="button"
          className="glass-landing__recs-trigger"
          onClick={onLoad}
        >
          <div className="glass-landing__recs-trigger-inner">
            <div className="glass-landing__recs-trigger-icon">
              <Sparkles size={16} />
            </div>
            <div className="glass-landing__recs-trigger-text">
              <p className="glass-landing__recs-trigger-label">
                Ver recomendación personalizada
              </p>
              <p className="glass-landing__recs-trigger-desc">
                Generada por inteligencia artificial según tu
                actividad y preferencias
              </p>
            </div>
            <ArrowRight
              size={16}
              className="glass-landing__recs-trigger-arrow"
            />
          </div>
        </Button>
      ) : isLoading ? (
        /* Loading */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="glass-landing__rec-card"
              style={{ padding: 16 }}
            >
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : isError ? (
        /* Error */
        <SectionError
          title="No se pudieron generar las recomendaciones"
          onRetry={onRetry}
        />
      ) : recommendations.length > 0 ? (
        /* Cards */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recommendations.map((rec, idx) => (
            <RecCard key={rec.id} rec={rec} index={idx} />
          ))}
        </div>
      ) : (
        /* Empty */
        <EmptyState
          compact
          title="Sin recomendaciones"
          description="Seguí participando en actividades para recibir sugerencias personalizadas."
          icon={<Sparkles className="w-6 h-6" />}
        />
      )}
    </div>
  );
}