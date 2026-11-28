/* ═══════════════════════════════════════════════════════════════
   Wellness Recommendation Card — Extracted (P19)
   Config bridge: uses SEVERITY_CONFIG pattern.
   ═══════════════════════════════════════════════════════════════ */

import { ChevronRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { cn } from "@/shared/lib/utils";
import type { WellnessRecommendation } from "../types";
import './WellnessRecommendationCard.css';

const PRIORITY_MAP: Record<
  string,
  { variant: "danger" | "warning" | "default"; label: string; borderColor: string }
> = {
  high: {
    variant: "danger",
    label: "Alta",
    borderColor: "var(--color-rose-400)",
  },
  medium: {
    variant: "warning",
    label: "Media",
    borderColor: "var(--color-amber-400)",
  },
  low: {
    variant: "default",
    label: "Baja",
    borderColor: "var(--color-silver-500)",
  },
};

interface Props {
  recommendation: WellnessRecommendation;
}

export function WellnessRecommendationCard({ recommendation }: Props) {
  const cfg = PRIORITY_MAP[recommendation.priority] ?? PRIORITY_MAP.low;

  return (
    <div
      className={cn(
        "flex gap-4 p-4 rounded-lg",
        "bg-[var(--color-surface-1)] border border-white/[0.06]",
        "hover:border-white/[0.1] transition-colors",
      )}
      style={{ borderLeftWidth: "3px", borderLeftColor: cfg.borderColor }}
    >
      <div className="wellness-recommendation-card flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant={cfg.variant} size="sm">
            {cfg.label}
          </Badge>
          <h4 className="font-ui text-sm text-[var(--color-silver-100)]">
            {recommendation.title}
          </h4>
        </div>
        <p className="font-body text-xs text-[var(--color-silver-400)] line-clamp-2">
          {recommendation.description}
        </p>
      </div>

      {recommendation.related_class_id && (
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 self-center text-[var(--color-gold-400)] min-h-[44px] min-w-[44px]"
          aria-label={`Ver clase ${recommendation.title}`}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}