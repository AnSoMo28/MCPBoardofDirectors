// src/features/engagement/components/SatisfactionProposalsPanel.tsx
/**
 * SatisfactionProposalsPanel — Compact proposals display for satisfaction domain.
 * Pattern: identical to GuestIntelligencePanel proposals section (F42-3).
 */

import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

import type { SatisfactionEngagementProposalList } from "@/shared/mocks/contracts";

// ═══ CONFIG ═════════════════════════════════════════════════════════════════

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  high: {
    label: "Alta",
    color: "var(--color-rose-400)",
    bgColor: "var(--color-rose-bg)",
  },
  medium: {
    label: "Media",
    color: "var(--color-amber-400)",
    bgColor: "var(--color-amber-bg)",
  },
  low: {
    label: "Baja",
    color: "var(--color-silver-400)",
    bgColor: "rgba(255,255,255,0.04)",
  },
};

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  category_improvement: "Mejora de Categoría",
  event_format_change: "Cambio de Formato",
  survey_follow_up: "Seguimiento Encuesta",
  format_replication: "Replicación de Formato",
  communication_enhancement: "Mejora Comunicación",
};

// ═══ COMPONENT ═════════════════════════════════════════════════════════════

interface Props {
  proposals: SatisfactionEngagementProposalList;
  className?: string;
}

export function SatisfactionProposalsPanel({ proposals, className }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll
    ? proposals.proposals
    : proposals.proposals.slice(0, 5);

  return (
    <div
      className={cn(
        "rounded-xl bg-[var(--color-surface-1)] border border-[rgba(255,255,255,0.06)]",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[var(--color-gold-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">
            Propuestas de Satisfacción
          </h3>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface-2)] text-[var(--color-silver-400)]">
            {proposals.total}
          </span>
          {proposals.high_priority_count > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-rose-bg)] text-[var(--color-rose-400)]">
              {proposals.high_priority_count} alta prioridad
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {visible.map((prop, idx) => {
          const pri = PRIORITY_CONFIG[prop.priority] ?? PRIORITY_CONFIG.low;
          const typeLabel =
            PROPOSAL_TYPE_LABELS[prop.proposal_type] ?? prop.proposal_type;

          return (
            <div
              key={prop.proposal_id}
              className={cn(
                "rounded-lg p-3",
                "bg-[var(--color-surface-0)] border border-[rgba(255,255,255,0.04)]",
                "opacity-0 [animation:slideUp_0.4s_ease_forwards]"
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h4 className="text-xs font-medium text-[var(--color-silver-200)]">
                    {prop.title}
                  </h4>
                  <span className="text-[10px] text-[var(--color-silver-500)]">
                    {typeLabel}
                  </span>
                </div>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ml-2"
                  style={{ color: pri.color, backgroundColor: pri.bgColor }}
                >
                  {pri.label}
                </span>
              </div>

              <p className="text-[11px] text-[var(--color-silver-400)] leading-relaxed mb-2">
                {prop.description}
              </p>

              <div className="flex items-center gap-3 text-[10px] text-[var(--color-silver-500)] flex-wrap">
                <span>Impacto: {prop.expected_impact}</span>
                <span>Esfuerzo: {prop.effort}</span>
                <span className="ml-auto font-[family-name:var(--font-mono)]">
                  Confianza: {prop.confidence}%
                </span>
              </div>

              {prop.cross_domain_signals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {prop.cross_domain_signals.map((signal) => (
                    <span
                      key={signal}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-gold-bg)] text-[var(--color-gold-400)]"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {proposals.proposals.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-xs text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)]"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Ver {proposals.proposals.length - 5} más
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
