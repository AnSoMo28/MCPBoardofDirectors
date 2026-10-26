/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessGoals.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Goals
   Goal tracking and management with progress visualization.

   Proposals: P1 Ladder · P2 Compliance · P3 Data Bug ·
     P4 Data Attrs · P5 Expand · P6 Glass Tabs · P7 Glass CSS
   ═══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import {
  Target,
  Dumbbell,
  Apple,
  Brain,
  Scale,
  Move,
  Heart,
  Zap,
  CheckCircle,
  Pause,
  XCircle,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { cn } from "@/shared/lib/utils";

import type {
  WellnessGoal,
  GoalStatus,
  WellnessGoalType,
} from "../types";
import { GOAL_TYPE_CONFIG } from "../types";
import "./WellnessGoals.css";

// ═══════════════════════════════════════════════════════════════
// §1  Config
// ═══════════════════════════════════════════════════════════════

interface WellnessGoalsResponse {
  status: string;
  data: WellnessGoal[];
  total: number;
}

const STATUS_CONFIG: Record<
  GoalStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "danger";
    icon: LucideIcon;
  }
> = {
  active: { label: "Activo", variant: "default", icon: Target },
  completed: { label: "Completado", variant: "success", icon: CheckCircle },
  paused: { label: "Pausado", variant: "warning", icon: Pause },
  abandoned: { label: "Abandonado", variant: "danger", icon: XCircle },
};
const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell,
  Apple,
  Brain,
  Scale,
  Move,
  Heart,
  Zap,
  Target,
};

function getGoalIcon(type: WellnessGoalType): LucideIcon {
  const config = GOAL_TYPE_CONFIG[type];
  return ICON_MAP[config?.icon] ?? Target;
}

const FILTER_TABS = ["all", "active", "completed", "paused"] as const;

// ═══════════════════════════════════════════════════════════════
// §2  Goal Card
// ═══════════════════════════════════════════════════════════════

function GoalCard({ goal }: { goal: WellnessGoal }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[goal.status];
  const Icon = getGoalIcon(goal.goal_type);
  const StatusIcon = statusCfg.icon;

  const pct =
    goal.target_value > 0
      ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
      : 0;

  const isNearTarget = pct >= 75;
  const isComplete = goal.status === "completed";

  return (
    <div
      className={cn("wag__card", isNearTarget && "wag__card--near")}
      data-goal-type={goal.goal_type}
      data-status={goal.status}
      data-expanded={expanded ? "" : undefined}
      data-complete={isComplete ? "" : undefined}
    >
      <div className="wag__card-content">
        {/* Icon */}
        <span className="wag__card-icon">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>

        {/* Main content */}
        <div className="wag__card-body">
          {/* Header */}
          <button
            className="wag__card-header"
            onClick={() => setExpanded(!expanded)}
            type="button"
            aria-expanded={expanded}
          >
            <div className="wag__card-title-row">
              <h4 className="wag__card-title">{goal.title}</h4>
              <Badge variant={statusCfg.variant} size="sm">
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusCfg.label}
              </Badge>
            </div>
            <ChevronDown className="wag__card-chevron w-4 h-4" aria-hidden="true" />
          </button>

          {/* Description (expandable) */}
          {goal.description && (
            <div className="wag__card-desc-wrap">
              <p className="wag__card-desc">{goal.description}</p>
            </div>
          )}

          {/* Progress */}
          <div className="wag__progress">
            <div className="wag__progress-track">
              <div
                className="wag__progress-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="wag__progress-values">
              {goal.current_value}/{goal.target_value} {goal.unit}
            </span>
            <span className="wag__progress-pct">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §3  Component
// ═══════════════════════════════════════════════════════════════

interface WellnessGoalsProps {
  familyId: string;
}

export function WellnessGoals({ familyId }: WellnessGoalsProps) {
  const [filter, setFilter] = useState<GoalStatus | "all">("all");

  const { data: goalsResp, isLoading } = useMCPQuery<WellnessGoalsResponse>(
    "wellness",
    "wellness_recommendations",
    { family_id: familyId },
    { staleTime: 120_000 },
  );

  // P3: Parse from response
  const goals: WellnessGoal[] = goalsResp?.data ?? [];

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="glass-wag">
        <div className="wag__loading">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (goals.length === 0) {
    return (
      <div className="glass-wag">
        <EmptyState
          icon={<Target size={28} />}
          title="Sin objetivos de bienestar"
          description="Establecé metas de fitness, nutrición o salud mental para hacer seguimiento de tu progreso."
          action={
            <Button variant="primary" className="min-h-[44px]">
              Crear objetivo
            </Button>
          }
        />
      </div>
    );
  }

  // ── Filtered ──
  const filtered =
    filter === "all" ? goals : goals.filter((g) => g.status === filter);

  return (
    <div className="glass-wag">

      {/* Filter tabs (P6) */}
      <div className="wag__tabs">
        {FILTER_TABS.map((f) => {
          const count =
            f === "all"
              ? goals.length
              : goals.filter((g) => g.status === f).length;
          const isActive = filter === f;

          return (
            <button
              key={f}
              className={cn("wag__tab", isActive && "wag__tab--active")}
              onClick={() => setFilter(f)}
              type="button"
            >
              <span className="wag__tab-label">
                {f === "all" ? "Todos" : STATUS_CONFIG[f]?.label ?? f}
              </span>
              <span className="wag__tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Goal cards */}
      <div className="wag__grid">
        {filtered.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}