// src/features/facilities/FacilityMap.tsx
// ═══════════════════════════════════════════════════════════
// FACILITY MAP — "El Atlas"
//
// Facility catalog with grid + spatial graph views.
// Consumes spatialGraph positions (Prop #5) for spatial layout.
// Grid view: search, filter, card catalog.
// Spatial view: SVG map with nodes, edges, zones, bottlenecks.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — card entry stagger, SVG edge draw-in
//   ✅ SENSE 2: REACCIÓN — card hover translateY(-2px), node hover scale
//   ✅ SENSE 3: MEMORIA — spatial positions, crowd, health, clusters
//   ✅ SENSE 4: INTENCIÓN — view toggle, Nueva Reserva, clear filters
//   ✅ SENSE 5: SINIESTRÍA — bottleneck pulse, maintenance accent
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — facility + spatial summary
// ═══════════════════════════════════════════════════════════

import {
  useState,
  useMemo,
  useDeferredValue,
  useCallback,
} from "react";
import { useNavigate } from "react-router";

import {
  Search,
  Building2,
  Clock,
  Users,
  MapPin,
  Wrench,
  AlertTriangle,
  Waves,
  Dumbbell,
  Trophy,
  Target,
  Flag,
  UtensilsCrossed,
  Wine,
  Crown,
  Flower2,
  Car,
  Smile,
  Sparkles,
  Baby,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui/Button";

import { FACILITY_TYPE_CONFIG, type FacilityCategory } from "./config";
import { buildSpatialGraph } from "./lib/spatialGraph";

import type {
  Facility,
  FacilityListResponse,
  FacilityType,
  FacilityStatus,
  AmenityUtilizationResponse,
  SpatialGraph,
  FacilitiesDashboardMode,
} from "./types";

import "./FacilityMap.css";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

type ViewMode = "grid" | "spatial";

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Waves, Dumbbell, Trophy, Target, Flag,
  UtensilsCrossed, Wine, Crown, Flower2,
  Car, Smile, Sparkles, Baby,
};

const STATS_CONFIG: ReadonlyArray<{
  id: string;
  label: string;
  count: (facilities: Facility[]) => number;
}> = [
  { id: "operational", label: "Operativas", count: (fs) => fs.filter((f) => f.status === "operational").length },
  { id: "maintenance", label: "Mantenimiento", count: (fs) => fs.filter((f) => f.status === "maintenance").length },
  { id: "closed", label: "Cerradas", count: (fs) => fs.filter((f) => f.status === "closed" || f.status === "renovation").length },
  { id: "total", label: "Total", count: (fs) => fs.length },
];

const AMENITIES_PREVIEW_LIMIT = 3;

const ZONE_LABELS: Record<string, string> = {
  wellness: "Bienestar",
  sport: "Deportes",
  social: "Social",
  service: "Servicios",
  admin: "Operaciones",
};

const STATUS_LABELS: Record<FacilityStatus, string> = {
  operational: "Operativa",
  maintenance: "Mantenimiento",
  closed: "Cerrada",
  reserved: "Reservada",
  renovation: "Renovación",
};

function getTypeOptions() {
  return (Object.keys(FACILITY_TYPE_CONFIG) as FacilityType[]).map((key) => ({
    value: key,
    label: FACILITY_TYPE_CONFIG[key]?.label ?? key,
  }));
}

const TYPE_OPTIONS = getTypeOptions();

const STATUS_OPTIONS: Array<{ value: FacilityStatus; label: string }> = [
  { value: "operational", label: "Operativa" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "closed", label: "Cerrada" },
  { value: "reserved", label: "Reservada" },
  { value: "renovation", label: "Renovación" },
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs.toLocaleString("es-CR")}`;
}

function truncateName(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "\u2026";
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  facilities: Facility[],
  spatialGraph: SpatialGraph,
  viewMode: ViewMode,
): string {
  if (facilities.length === 0) {
    return "Sin instalaciones registradas.";
  }

  const operational = facilities.filter((f) => f.status === "operational").length;
  const maintenance = facilities.filter((f) => f.status === "maintenance").length;
  const clusters = spatialGraph.clusters.length;
  const bottlenecks = spatialGraph.bottlenecks.length;

  const parts: string[] = [];
  parts.push(`${facilities.length} instalaciones.`);
  parts.push(`${operational} operativa${operational !== 1 ? "s" : ""}.`);

  if (maintenance > 0) {
    parts.push(`${maintenance} en mantenimiento.`);
  }

  if (viewMode === "spatial") {
    parts.push(`${spatialGraph.edges.length} conexiones.`);
    if (clusters > 0) {
      parts.push(`${clusters} zona${clusters > 1 ? "s" : ""} detectada${clusters > 1 ? "s" : ""}.`);
    }
    if (bottlenecks > 0) {
      parts.push(`${bottlenecks} cuello${bottlenecks > 1 ? "s" : ""} de botella.`);
    }
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function StatCard({ label, value, statId }: { label: string; value: number; statId: string }) {
  return (
    <div className="fac-map__stat" data-stat-id={statId}>
      <p className="fac-map__stat-label">{label}</p>
      <p className="fac-map__stat-value" data-stat-id={statId}>{value}</p>
    </div>
  );
}

/** Grid view card. */
function FacilityCard({
  facility,
  index,
  prefersReduced,
  onNavigate,
}: {
  facility: Facility;
  index: number;
  prefersReduced: boolean;
  onNavigate: (id: string) => void;
}) {
  const config = FACILITY_TYPE_CONFIG[facility.facility_type];
  const category = config?.category as FacilityCategory | undefined;
  const TypeIcon = TYPE_ICON_MAP[config?.icon ?? ""] ?? Building2;

  const hasAmenities = facility.amenities && facility.amenities.length > 0;
  const amenitiesList = hasAmenities ? facility.amenities! : [];
  const previewAmenities = amenitiesList.slice(0, AMENITIES_PREVIEW_LIMIT);
  const overflowCount = amenitiesList.length - AMENITIES_PREVIEW_LIMIT;

  return (
    <article
      className="fac-map__card"
      data-status={facility.status}
      data-type={facility.facility_type}
      data-category={category}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
      onClick={() => onNavigate(facility.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(facility.id);
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`${facility.name} — ${config?.label ?? facility.facility_type}`}
    >
      {/* Header */}
      <div className="fac-map__card-head">
        <div className="fac-map__card-head-left">
          <div className="fac-map__card-icon" data-category={category}>
            <TypeIcon className="fac-map__card-icon-svg" />
          </div>
          <div className="fac-map__card-head-text">
            <h4 className="fac-map__card-name">{facility.name}</h4>
            <span className="fac-map__card-type">{config?.label ?? facility.facility_type}</span>
          </div>
        </div>

        <span className="fac-map__card-badge" data-status={facility.status}>
          <span className="fac-map__card-badge-dot" data-status={facility.status} />
          {STATUS_LABELS[facility.status as FacilityStatus] ?? facility.status}
        </span>
      </div>

      {/* Info */}
      <div className="fac-map__card-info">
        <span className="fac-map__card-info-item">
          <Clock className="fac-map__card-info-icon" />
          {facility.opening_time} — {facility.closing_time}
        </span>
        <span className="fac-map__card-info-item">
          <Users className="fac-map__card-info-icon" />
          Cap. {facility.capacity}
        </span>
        {facility.location && (
          <span className="fac-map__card-info-item fac-map__card-info-item--full">
            <MapPin className="fac-map__card-info-icon" />
            {facility.location}
          </span>
        )}
      </div>

      {/* Rate */}
      {facility.base_rate > 0 && (
        <div className="fac-map__card-rate">
          <span className="fac-map__card-rate-label">Tarifa base</span>
          <span className="fac-map__card-rate-value">{formatCRC(facility.base_rate)}</span>
        </div>
      )}

      {/* Maintenance alert */}
      {facility.status === "maintenance" && facility.notes && (
        <div className="fac-map__card-alert" role="alert">
          <Wrench className="fac-map__card-alert-icon" />
          <p className="fac-map__card-alert-text">{facility.notes}</p>
        </div>
      )}

      {/* Amenities */}
      {previewAmenities.length > 0 && (
        <div className="fac-map__card-amenities">
          {previewAmenities.map((a) => (
            <span key={a} className="fac-map__card-amenity">{a}</span>
          ))}
          {overflowCount > 0 && (
            <span className="fac-map__card-amenity-more">+{overflowCount}</span>
          )}
        </div>
      )}
    </article>
  );
}

/** Spatial SVG view — Prop #5. */
function SpatialView({ graph, onNavigate }: {
  graph: SpatialGraph;
  prefersReduced: boolean;
  onNavigate: (id: string) => void;
}) {
  // Position lookup
  const positionMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of graph.nodes) {
      map.set(node.facility_id, node.position);
    }
    return map;
  }, [graph.nodes]);

  // Compute zone backgrounds from node positions
  const zones = useMemo(() => {
    const catNodes = new Map<string, { x: number; y: number }[]>();
    for (const node of graph.nodes) {
      const cat = FACILITY_TYPE_CONFIG[node.facility_type].category;
      const list = catNodes.get(cat) ?? [];
      list.push(node.position);
      catNodes.set(cat, list);
    }

    return [...catNodes.entries()].map(([category, positions]) => {
      const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
      const maxDist = Math.max(
        60,
        ...positions.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)),
      );
      return {
        category,
        cx: Math.round(cx),
        cy: Math.round(cy),
        r: Math.round(maxDist + 40),
      };
    });
  }, [graph.nodes]);

  // Limit edges to top N for readability
  const visibleEdges = useMemo(
    () =>
      [...graph.edges]
        .sort((a, b) => b.correlation_score - a.correlation_score)
        .slice(0, 20),
    [graph.edges],
  );

  // Bottleneck IDs for quick lookup
  const bottleneckIds = useMemo(
    () => new Set(graph.bottlenecks.map((b) => b.facility_id)),
    [graph.bottlenecks],
  );

  if (graph.nodes.length === 0) return null;

  return (
    <div className="fac-map__spatial-wrap">
      <svg
        className="fac-map__spatial-svg"
        viewBox="0 0 1000 700"
        role="img"
        aria-label="Mapa espacial de instalaciones"
      >
        {/* Zone backgrounds */}
        {zones.map((z) => (
          <g key={z.category}>
            <circle
              className="fac-map__spatial-zone"
              data-category={z.category}
              cx={z.cx}
              cy={z.cy}
              r={z.r}
            />
            <text
              className="fac-map__spatial-zone-label"
              x={z.cx}
              y={z.cy - z.r + 18}
            >
              {ZONE_LABELS[z.category] ?? z.category}
            </text>
          </g>
        ))}

        {/* Edges */}
        {visibleEdges.map((edge, i) => {
          const from = positionMap.get(edge.from_id);
          const to = positionMap.get(edge.to_id);
          if (!from || !to) return null;
          return (
            <line
              key={`edge-${i}`}
              className="fac-map__spatial-edge"
              data-edge-type={edge.edge_type}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            />
          );
        })}

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const cat = FACILITY_TYPE_CONFIG[node.facility_type].category;
          const radius = Math.max(14, Math.min(26, 10 + node.max_capacity / 8));
          const isBottleneck = bottleneckIds.has(node.facility_id);
          const truncName = truncateName(node.facility_name, 14);

          return (
            <g
              key={node.facility_id}
              className="fac-map__spatial-node"
              data-category={cat}
              data-crowd={node.crowd_level}
              data-bottleneck={isBottleneck ? "true" : undefined}
              transform={`translate(${node.position.x},${node.position.y})`}
              onClick={() => onNavigate(node.facility_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onNavigate(node.facility_id);
              }}
              role="button"
              tabIndex={0}
            >
              <title>{`${node.facility_name} — Cap. ${node.max_capacity} — ${node.crowd_level}`}</title>

              {/* Bottleneck pulse ring */}
              {isBottleneck && (
                <circle
                  className="fac-map__spatial-node-bottleneck"
                  r={radius + 6}
                />
              )}

              {/* Main circle */}
              <circle
                className="fac-map__spatial-node-circle"
                r={radius}
              />

              {/* Label */}
              <text className="fac-map__spatial-node-label" y={radius + 14}>
                {truncName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="fac-map__grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="fac-map__skeleton-card" />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function FacilityMap({
  ambientMode = "calm",
}: {
  ambientMode?: FacilitiesDashboardMode;
}) {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  // ── State ──
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FacilityType | "">("");
  const [statusFilter, setStatusFilter] = useState<FacilityStatus | "">("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const deferredSearch = useDeferredValue(search);

  // ── Data ──
  const { data, isLoading, isError, error } = useMCPQuery<FacilityListResponse>(
    "facility_management",
    "manage_facilities",
    {

      action: "list",

    },
  );

  const { data: utilizationData } = useMCPQuery<AmenityUtilizationResponse>(
    "facility_management",
    "get_amenity_utilization",
    {},
  );

  const facilities = useMemo(() => {
    const all = data?.facilities ?? [];
    const q = deferredSearch.trim().toLowerCase();
    return all.filter((f) => {
      if (q && !(f.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, deferredSearch]);

  // ── Spatial graph (Prop #5) ──
  const spatialGraph = useMemo(
    () => buildSpatialGraph(facilities, [], utilizationData ?? null, null),
    [facilities, utilizationData],
  );

  // ── Stats ──
  const stats = useMemo(
    () =>
      STATS_CONFIG.map((s) => ({
        id: s.id,
        label: s.label,
        value: s.count(facilities),
      })),
    [facilities],
  );

  // ── Narrative ──
  const narrative = buildNarrative(facilities, spatialGraph, viewMode);

  // ── Handlers ──
  const handleNavigate = useCallback(
    (id: string) => navigate(`/admin/facilities/${id}`),
    [navigate],
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
  }, []);

  const hasActiveFilters = !!deferredSearch || !!typeFilter || !!statusFilter;

  // ── Render ──
  return (
    <PageContainer
      title="Instalaciones"
      subtitle={`${facilities.length} instalaciones registradas`}
    >
      <div
        className="fac-map"
        data-mode={ambientMode}
        data-prefers-reduced={prefersReduced ? "true" : undefined}
      >
        {/* Stats */}
        <div className="fac-map__stats-row">
          {stats.map((s) => (
            <StatCard key={s.id} label={s.label} value={s.value} statId={s.id} />
          ))}
        </div>

        {/* Narrative (Sense 7) */}
        <p className="fac-map__narrative">{narrative}</p>

        {/* Search + Filters + View toggle */}
        <div className="fac-map__toolbar">
          <div className="fac-map__filters">
            <div className="fac-map__search-wrap">
              <Search className="fac-map__search-icon" />
              <input
                type="text"
                className="fac-map__search-input"
                placeholder="Buscar instalaci\u00f3n..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar instalaciones"
              />
            </div>

            <select
              className="fac-map__select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FacilityType | "")}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              className="fac-map__select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FacilityStatus | "")}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="fac-map__toggle" role="group" aria-label="Vista">
            {(["grid", "spatial"] as const).map((mode) => (
              <Button
                variant="unstyled"
                key={mode}
                type="button"
                className="fac-map__toggle-btn"
                data-active={viewMode === mode ? "true" : undefined}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
              >
                {mode === "grid" ? "Cat\u00e1logo" : "Mapa"}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <MapSkeleton />
        ) : isError ? (
          <div className="fac-map__error" role="alert">
            <AlertTriangle className="fac-map__error-icon" />
            <p className="fac-map__error-title">Error al cargar instalaciones</p>
            <p className="fac-map__error-desc">
              {(error as Error)?.message ?? "Intent\u00e1 de nuevo m\u00e1s tarde."}
            </p>
          </div>
        ) : facilities.length === 0 ? (
          <div className="fac-map__empty-wrap">
            <EmptyState
              icon={<Building2 size={40} strokeWidth={1.5} />}
              title="Sin instalaciones"
              description={
                hasActiveFilters
                  ? "No se encontraron instalaciones con los filtros aplicados."
                  : "No hay instalaciones registradas."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : viewMode === "grid" ? (
          <div className="fac-map__grid">
            {facilities.map((facility, index) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                index={index}
                prefersReduced={prefersReduced}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        ) : (
          <SpatialView
            graph={spatialGraph}
            prefersReduced={prefersReduced}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </PageContainer>
  );
}
