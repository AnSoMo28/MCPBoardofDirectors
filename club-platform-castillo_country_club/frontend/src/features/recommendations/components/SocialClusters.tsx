// src/features/recommendations/components/SocialClusters.tsx
// Fase 10, B2 — Visualización de clusters sociales (auto-load)

import { useState } from "react";
import {
  Users,
  Dumbbell,
  UserCircle,
  Sparkles,
  TrendingUp
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterDropdown } from "@/shared/components/ui/FilterDropdown";

import {
  ClusterType,
  CLUSTER_TYPE_CONFIG,
  type SocialClustersResponse,
} from "../types";

// ── Icon resolver ──────────────────────────────────────────

const CLUSTER_ICONS: Record<ClusterType, React.ElementType> = {
  [ClusterType.Social]: Users,
  [ClusterType.Activity]: Dumbbell,
  [ClusterType.AgeBased]: UserCircle,
  [ClusterType.Interest]: Sparkles,
  [ClusterType.Engagement]: TrendingUp,
};

// ── Filter options ─────────────────────────────────────────

const CLUSTER_TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  ...Object.values(ClusterType).map((ct) => ({
    value: ct,
    label: CLUSTER_TYPE_CONFIG[ct].label,
  })),
];

const MIN_SIZE_OPTIONS = [
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "5", label: "5+" },
  { value: "10", label: "10+" },
];

// ── Main Component ─────────────────────────────────────────

export function SocialClusters() {
  const [clusterType, setClusterType] = useState("");
  const [minSize, setMinSize] = useState("2");
  const prefersReduced = useReducedMotion();
  const { isMobile } = useBreakpoint();

  // ── Level 1: Data auto-load ──
  const { data, isLoading } = useMCPQuery<SocialClustersResponse>(
    "proactive_recommendation",
    "identify_social_clusters",
    {
      cluster_type: clusterType || undefined,
      min_size: Number(minSize),
    },
    { staleTime: 60_000 },
  );

  const clusters = data?.clusters ?? [];

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-52 rounded-[var(--radius-lg)]"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (clusters.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <Filters
          clusterType={clusterType}
          minSize={minSize}
          onClusterTypeChange={setClusterType}
          onMinSizeChange={setMinSize}
        />
        <EmptyState
          icon={
            <Users className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Sin clusters encontrados"
          description="No se encontraron clusters sociales con los criterios seleccionados."
        />
      </div>
    );
  }

  // ── Render ──
  return (
    <div
      className="space-y-4"
      role="region"
      aria-label="Clusters sociales del club"
    >
      {/* Filters */}
      <Filters
        clusterType={clusterType}
        minSize={minSize}
        onClusterTypeChange={setClusterType}
        onMinSizeChange={setMinSize}
      />

      {/* Summary */}
      <p className="text-sm text-[var(--color-silver-400)]">
        {data?.total_clusters ?? clusters.length} cluster(es) identificado
        {clusters.length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clusters.map((cluster, index) => {
          const config = CLUSTER_TYPE_CONFIG[cluster.cluster_type];
          const IconComp =
            CLUSTER_ICONS[cluster.cluster_type] ?? Users;
          const engagementPct = Math.min(
            100,
            Math.max(0, cluster.avg_engagement),
          );

          return (
            <Card
              key={cluster.id}
              glowColor={config.glowColor}
              className={`p-5 space-y-3.5 ${
                prefersReduced
                  ? ""
                  : "opacity-0 animate-[fadeUp_0.5s_ease_forwards]"
              }`}
              style={
                prefersReduced
                  ? undefined
                  : { animationDelay: `${index * 80}ms` }
              }
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${config.glowColor} 15%, transparent)`,
                    }}
                  >
                    <IconComp
                      className="w-4.5 h-4.5"
                      style={{ color: config.glowColor }}
                    />
                  </div>
                  <h3 className="font-ui font-semibold text-[var(--color-silver-100)] text-sm truncate">
                    {cluster.name}
                  </h3>
                </div>
                <Badge variant="default" size="sm">
                  {config.label}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-[var(--color-silver-400)] leading-relaxed line-clamp-2">
                {cluster.description}
              </p>

              {/* Size + Engagement */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--color-silver-500)]" />
                  <span className="text-sm font-ui font-semibold text-[var(--color-silver-200)]">
                    {cluster.size}
                  </span>
                  <span className="text-xs text-[var(--color-silver-500)]">
                    {isMobile ? "fam." : "familias"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--color-silver-500)]">
                      Engagement
                    </span>
                    <span className="text-[10px] font-ui font-medium text-[var(--color-silver-300)]">
                      {engagementPct}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--color-silver-600) 30%, transparent)`,
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${engagementPct}%`,
                        backgroundColor: config.glowColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Shared Interests */}
              {cluster.shared_interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cluster.shared_interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-ui
                                 bg-[var(--color-surface-1)] border border-white/[0.06]
                                 text-[var(--color-silver-400)]"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Stagger keyframes */}
      {!prefersReduced && (
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </div>
  );
}

// ── Filters sub-component ──────────────────────────────────

function Filters({
  clusterType,
  minSize,
  onClusterTypeChange,
  onMinSizeChange,
}: {
  clusterType: string;
  minSize: string;
  onClusterTypeChange: (v: string) => void;
  onMinSizeChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Cluster type filter */}
      <FilterDropdown
        label="Tipo de Cluster"
        options={[{ value: "", label: "Todos los tipos" }, ...CLUSTER_TYPE_OPTIONS]}
        value={clusterType}
        onChange={onClusterTypeChange}
      />

      {/* Min size filter */}
      <FilterDropdown
        label="Tamaño Mínimo"
        options={MIN_SIZE_OPTIONS}
        value={minSize}
        onChange={onMinSizeChange}
      />
    </div>
  );
}
