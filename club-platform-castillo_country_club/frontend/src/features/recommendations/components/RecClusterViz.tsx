// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Cluster Visualization v2 (2027 REWRITE)
//
// Replaces: SocialClusters.tsx + RecClusterViz v1
//
// "The Constellation Map" — SVG cluster visualization with radial
// sector layout, cross-cluster opportunity detection, interactive node
// selection. Dual view: Map (SVG) + List (cards).
//
// Layout engine: types positioned in pentagon sectors, clusters at
// varying radii within sector. Edges = shared interests. Diamonds =
// cross-type connection midpoints (opportunity markers).
//
// Glass namespace: .glass-rcl
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Users,
  Dumbbell,
  UserCircle,
  Sparkles,
  TrendingUp,
  Link2,
  Map,
  List,
  Hash,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import {
  ClusterType,
  CLUSTER_TYPE_CONFIG,
  type SocialClustersResponse,
  type SocialCluster,
} from "../types";

import "./RecClusterViz.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

interface LayoutNode {
  id: string;
  name: string;
  size: number;
  cluster_type: ClusterType;
  x: number;
  y: number;
  radius: number;
}

interface LayoutEdge {
  sourceId: string;
  targetId: string;
  strength: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface LayoutOpportunity {
  x: number;
  y: number;
}

interface SectorInfo {
  type: ClusterType;
  labelX: number;
  labelY: number;
}

interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  opportunities: LayoutOpportunity[];
  sectors: SectorInfo[];
}

const SVG_W = 800;
const SVG_H = 560;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const INNER_R = 80;
const OUTER_R = 210;
const LABEL_R = OUTER_R + 32;

const CLUSTER_ICONS: Record<ClusterType, React.ElementType> = {
  [ClusterType.Social]: Users,
  [ClusterType.Activity]: Dumbbell,
  [ClusterType.AgeBased]: UserCircle,
  [ClusterType.Interest]: Sparkles,
  [ClusterType.Engagement]: TrendingUp,
};

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos los tipos" },
  ...Object.values(ClusterType).map((ct) => ({
    value: ct,
    label: CLUSTER_TYPE_CONFIG[ct].label,
  })),
];

const MIN_SIZE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "5", label: "5+" },
  { value: "10", label: "10+" },
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getEngLevel(v: number): "high" | "medium" | "low" {
  if (v >= 70) return "high";
  if (v >= 40) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════════════════
// LAYOUT ENGINE — Radial sector positioning
// ═══════════════════════════════════════════════════════════════════════

function computeLayout(clusters: SocialCluster[]): LayoutResult {
  const types = Object.values(ClusterType);
  const sectorAngle = (2 * Math.PI) / types.length;

  // Group clusters by type
  const groups: Partial<Record<ClusterType, SocialCluster[]>> = {};
  for (const c of clusters) {
    if (!groups[c.cluster_type]) {
      groups[c.cluster_type] = [];
    }
    groups[c.cluster_type]!.push(c);
  }

  // Sector label positions
  const sectors: SectorInfo[] = types.map((type, ti) => {
    const angle = (ti / types.length) * 2 * Math.PI - Math.PI / 2;
    return {
      type,
      labelX: CX + LABEL_R * Math.cos(angle),
      labelY: CY + LABEL_R * Math.sin(angle),
    };
  });

  // Position each cluster within its sector
  const posMap: Record<string, { x: number; y: number; r: number }> = {};

  types.forEach((type, ti) => {
    const group = groups[type] ?? [];
    if (group.length === 0) return;

    const baseAngle = (ti / types.length) * 2 * Math.PI - Math.PI / 2;
    const spread = sectorAngle * 0.5;

    group.forEach((cluster: SocialCluster, ci: number) => {
      const t = group.length > 1 ? ci / (group.length - 1) : 0.5;
      const dist = INNER_R + t * (OUTER_R - INNER_R);
      const angleOffset = (t - 0.5) * spread;
      const angle = baseAngle + angleOffset;

      posMap[cluster.id] = {
        x: CX + dist * Math.cos(angle),
        y: CY + dist * Math.sin(angle),
        r: 14 + Math.sqrt(cluster.size) * 3,
      };
    });
  });

  // Build nodes
  const nodes: LayoutNode[] = clusters.map((c) => {
    const pos = posMap[c.id] ?? { x: CX, y: CY, r: 16 };
    return {
      id: c.id,
      name: c.name,
      size: c.size,
      cluster_type: c.cluster_type,
      x: pos.x,
      y: pos.y,
      radius: pos.r,
    };
  });

  // Build edges (clusters sharing at least 1 interest)
  const edges: LayoutEdge[] = [];
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const shared = clusters[i].shared_interests.filter((int: string) =>
        clusters[j].shared_interests.includes(int),
      );
      if (shared.length > 0) {
        const p1 = posMap[clusters[i].id];
        const p2 = posMap[clusters[j].id];
        if (!p1 || !p2) continue;
        edges.push({
          sourceId: clusters[i].id,
          targetId: clusters[j].id,
          strength: Math.min(shared.length, 3),
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
        });
      }
    }
  }

  // Opportunity markers at cross-type edge midpoints
  const typeMap: Record<string, ClusterType> = {};
  for (const c of clusters) {
    typeMap[c.id] = c.cluster_type;
  }
  const opportunities: LayoutOpportunity[] = edges
    .filter(
      (e) => typeMap[e.sourceId] !== typeMap[e.targetId],
    )
    .map((e) => ({
      x: (e.x1 + e.x2) / 2,
      y: (e.y1 + e.y2) / 2,
    }));

  return { nodes, edges, opportunities, sectors };
}

// ═══════════════════════════════════════════════════════════════════════
// CLUSTER MAP — SVG visualization
// ═══════════════════════════════════════════════════════════════════════

function ClusterMap({
  layout,
  selectedId,
  onNodeClick,
}: {
  layout: LayoutResult;
  selectedId: string | null;
  onNodeClick: (id: string) => void;
}) {
  return (
    <div className="rcl-map-wrap">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="rcl-svg"
        role="img"
        aria-label="Mapa de clusters sociales"
      >
        <defs>
          <pattern
            id="rcl-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              className="rcl-grid-line"
            />
          </pattern>
        </defs>

        <rect
          width={SVG_W}
          height={SVG_H}
          fill="url(#rcl-grid)"
          className="rcl-svg-bg"
          onClick={() => onNodeClick("")}
        />

        {/* Sector labels */}
        {layout.sectors.map((s) => (
          <text
            key={s.type}
            x={s.labelX}
            y={s.labelY}
            className="rcl-sector-label"
            data-cluster-type={s.type}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {CLUSTER_TYPE_CONFIG[s.type].label}
          </text>
        ))}

        {/* Edges */}
        {layout.edges.map((e, i) => (
          <line
            key={`e-${i}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            className="rcl-edge"
            data-strength={e.strength}
          />
        ))}

        {/* Opportunity markers */}
        {layout.opportunities.map((o, i) => (
          <g
            key={`o-${i}`}
            transform={`translate(${o.x},${o.y})`}
            className="rcl-opp"
          >
            <rect
              x="-5"
              y="-5"
              width="10"
              height="10"
              rx="2"
              transform="rotate(45)"
              className="rcl-opp-shape"
            />
          </g>
        ))}

        {/* Nodes */}
        {layout.nodes.map((node) => (
          <g
            key={node.id}
            transform={`translate(${node.x},${node.y})`}
            className="rcl-node"
            data-cluster-type={node.cluster_type}
            data-selected={
              selectedId === node.id ? "" : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick(node.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNodeClick(node.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <circle r={node.radius} className="rcl-node-circle" />
            <text
              className="rcl-node-count"
              textAnchor="middle"
              dy="4"
            >
              {node.size}
            </text>
            <text
              className="rcl-node-name"
              textAnchor="middle"
              y={node.radius + 14}
            >
              {node.name.length > 18
                ? node.name.slice(0, 16) + "…"
                : node.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLUSTER CARD — List view
// ═══════════════════════════════════════════════════════════════════════

function ClusterCard({
  cluster,
  isSelected,
  onSelect,
}: {
  cluster: SocialCluster;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const engagement = Math.min(
    100,
    Math.max(0, cluster.avg_engagement),
  );
  const level = getEngLevel(engagement);
  const connections = cluster.connections?.length ?? 0;
  const IconComp = CLUSTER_ICONS[cluster.cluster_type] ?? Users;

  return (
    <div
      className="rcl-card"
      data-cluster-type={cluster.cluster_type}
      data-engagement-level={level}
      data-selected={isSelected ? "" : undefined}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="rcl-card-header">
        <div
          className="rcl-card-icon"
          data-cluster-type={cluster.cluster_type}
        >
          <IconComp size={14} aria-hidden="true" />
        </div>
        <div className="rcl-card-title-area">
          <h4 className="rcl-card-name">{cluster.name}</h4>
          <span
            className="rcl-card-type"
            data-cluster-type={cluster.cluster_type}
          >
            {CLUSTER_TYPE_CONFIG[cluster.cluster_type].label}
          </span>
        </div>
      </div>

      <p className="rcl-card-desc">{cluster.description}</p>

      <div className="rcl-card-stats">
        <span className="rcl-card-stat">
          <Users size={11} aria-hidden="true" />
          <strong>{cluster.size}</strong> familias
        </span>
        {connections > 0 && (
          <span className="rcl-card-stat">
            <Link2 size={11} aria-hidden="true" />
            <strong>{connections}</strong> conex.
          </span>
        )}
      </div>

      <div
        className="rcl-engagement"
        data-engagement-level={level}
      >
        <div className="rcl-eng-header">
          <span className="rcl-eng-label">Engagement</span>
          <span className="rcl-eng-pct">{engagement}%</span>
        </div>
        <div className="rcl-eng-track">
          <div
            className="rcl-eng-fill"
            style={
              { "--eng-pct": `${engagement}%` } as React.CSSProperties
            }
          />
        </div>
      </div>

      {cluster.shared_interests.length > 0 && (
        <div className="rcl-interests">
          {cluster.shared_interests.map((interest) => (
            <span key={interest} className="rcl-tag">
              <Hash size={8} aria-hidden="true" />
              {interest}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLUSTER DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════

function ClusterDetailPanel({
  cluster,
}: {
  cluster: SocialCluster;
}) {
  const engagement = Math.min(
    100,
    Math.max(0, cluster.avg_engagement),
  );
  const level = getEngLevel(engagement);
  const connections = cluster.connections?.length ?? 0;
  const IconComp = CLUSTER_ICONS[cluster.cluster_type] ?? Users;

  return (
    <div
      className="rcl-detail"
      data-cluster-type={cluster.cluster_type}
    >
      <div className="rcl-detail-header">
        <div
          className="rcl-detail-icon"
          data-cluster-type={cluster.cluster_type}
        >
          <IconComp size={18} aria-hidden="true" />
        </div>
        <div>
          <h3 className="rcl-detail-name">{cluster.name}</h3>
          <span
            className="rcl-detail-type"
            data-cluster-type={cluster.cluster_type}
          >
            {CLUSTER_TYPE_CONFIG[cluster.cluster_type].label}
          </span>
        </div>
      </div>

      <p className="rcl-detail-desc">{cluster.description}</p>

      <div className="rcl-detail-metrics">
        <div className="rcl-dm-cell">
          <span className="rcl-dm-label">Familias</span>
          <span className="rcl-dm-val">{cluster.size}</span>
        </div>
        <div className="rcl-dm-cell">
          <span className="rcl-dm-label">Conexiones</span>
          <span className="rcl-dm-val">{connections}</span>
        </div>
        <div className="rcl-dm-cell">
          <span className="rcl-dm-label">Engagement</span>
          <span
            className="rcl-dm-val"
            data-engagement-level={level}
          >
            {engagement}%
          </span>
        </div>
        <div className="rcl-dm-cell">
          <span className="rcl-dm-label">Intereses</span>
          <span className="rcl-dm-val">
            {cluster.shared_interests.length}
          </span>
        </div>
      </div>

      <div
        className="rcl-engagement rcl-engagement--full"
        data-engagement-level={level}
      >
        <div className="rcl-eng-header">
          <span className="rcl-eng-label">
            Nivel de Engagement
          </span>
          <span className="rcl-eng-pct">{engagement}%</span>
        </div>
        <div className="rcl-eng-track">
          <div
            className="rcl-eng-fill"
            style={
              { "--eng-pct": `${engagement}%` } as React.CSSProperties
            }
          />
        </div>
      </div>

      {cluster.shared_interests.length > 0 && (
        <div className="rcl-interests">
          {cluster.shared_interests.map((interest) => (
            <span key={interest} className="rcl-tag">
              <Hash size={8} aria-hidden="true" />
              {interest}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════════════

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
    <div className="rcl-filters">
      <select
        className="rcl-select"
        value={clusterType}
        onChange={(e) => onClusterTypeChange(e.target.value)}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="rcl-select"
        value={minSize}
        onChange={(e) => onMinSizeChange(e.target.value)}
      >
        {MIN_SIZE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            Tamaño mínimo: {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function SocialClusters() {
  const [clusterType, setClusterType] = useState("");
  const [minSize, setMinSize] = useState("2");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useReducedMotion();

  // ── Auto-load query ───────────────────────────────────────────────
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

  // ── SVG layout (only when map view) ───────────────────────────────
  const layout = useMemo(
    () =>
      viewMode === "map" && clusters.length > 0
        ? computeLayout(clusters)
        : null,
    [clusters, viewMode],
  );

  // ── Selected cluster ──────────────────────────────────────────────
  const selectedCluster = useMemo(
    () =>
      clusters.find((c) => c.id === selectedId) ?? null,
    [clusters, selectedId],
  );

  // ── Summary stats ─────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (clusters.length === 0) return null;
    const totalFamilies = clusters.reduce(
      (s, c) => s + c.size,
      0,
    );
    const avgEng = Math.round(
      clusters.reduce((s, c) => s + c.avg_engagement, 0) /
        clusters.length,
    );
    const totalOpps = layout?.opportunities.length ?? 0;
    return { totalFamilies, avgEng, totalOpps };
  }, [clusters, layout]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleNodeClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-rcl">
        <div className="rcl-loading">
          <div className="rcl-skeleton rcl-skeleton--filters" />
          <div className="rcl-skeleton rcl-skeleton--map" />
        </div>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────
  if (clusters.length === 0) {
    return (
      <div className="glass-rcl">
        <Filters
          clusterType={clusterType}
          minSize={minSize}
          onClusterTypeChange={setClusterType}
          onMinSizeChange={setMinSize}
        />
        <div className="rcl-empty-wrap">
          <EmptyState
            icon={
              <Users
                size={32}
                className="rcl-empty-icon"
              />
            }
            title="Sin clusters encontrados"
            description="No se encontraron clusters sociales con los criterios seleccionados."
          />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      className="glass-rcl"
      role="region"
      aria-label="Clusters sociales del club"
    >
      {/* Toolbar: filters + view toggle */}
      <div className="rcl-toolbar">
        <Filters
          clusterType={clusterType}
          minSize={minSize}
          onClusterTypeChange={setClusterType}
          onMinSizeChange={setMinSize}
        />
        <div
          className="rcl-view-toggle"
          role="radiogroup"
          aria-label="Vista"
        >
          <Button
            variant="unstyled"
            className="rcl-view-pill"
            data-active={
              viewMode === "map" ? "" : undefined
            }
            onClick={() => setViewMode("map")}
            role="radio"
            aria-checked={viewMode === "map"}
          >
            <Map size={13} aria-hidden="true" />
            Mapa
          </Button>
          <Button
            variant="unstyled"
            className="rcl-view-pill"
            data-active={
              viewMode === "list" ? "" : undefined
            }
            onClick={() => setViewMode("list")}
            role="radio"
            aria-checked={viewMode === "list"}
          >
            <List size={13} aria-hidden="true" />
            Lista
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="rcl-summary">
          <span className="rcl-summary-total">
            {data?.total_clusters ?? clusters.length} cluster
            {clusters.length !== 1 ? "es" : ""} identificado
            {clusters.length !== 1 ? "s" : ""}
          </span>
          <div className="rcl-summary-stats">
            <span className="rcl-summary-stat">
              <Users size={11} aria-hidden="true" />
              {summary.totalFamilies} familias
            </span>
            <span
              className="rcl-summary-stat"
              data-engagement-level={getEngLevel(
                summary.avgEng,
              )}
            >
              <TrendingUp size={11} aria-hidden="true" />
              {summary.avgEng}% engagement
            </span>
            {summary.totalOpps > 0 && (
              <span className="rcl-summary-stat rcl-summary-stat--opp">
                <Sparkles size={11} aria-hidden="true" />
                {summary.totalOpps} oportunidad
                {summary.totalOpps !== 1 ? "es" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* MAP VIEW */}
      {viewMode === "map" && layout && (
        <ClusterMap
          layout={layout}
          selectedId={selectedId}
          onNodeClick={handleNodeClick}
        />
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="rcl-grid">
          {clusters.map((cluster) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              isSelected={selectedId === cluster.id}
              onSelect={() => handleNodeClick(cluster.id)}
            />
          ))}
        </div>
      )}

      {/* Detail panel (both views) */}
      {selectedCluster && (
        <ClusterDetailPanel cluster={selectedCluster} />
      )}
    </div>
  );
}