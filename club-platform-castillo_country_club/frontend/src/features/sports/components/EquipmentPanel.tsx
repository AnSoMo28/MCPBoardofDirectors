// ═══════════════════════════════════════════════════════════
// src/features/sports/components/EquipmentPanel.tsx
// §B4.6 — Equipment Panel V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Equipment inventory with lifecycle intelligence. Urgency
// groups, condition distribution, availability bars.
// Data-driven via props — no mock data inline.
// Living Protocol: 7/7
//
// VERIFIED TYPES:
//   EquipmentLifecycle_Contract → { equipment_id, name, sport, condition,
//     urgency_score, needs_attention, days_since_maintenance, recommended_action }
//   EQUIPMENT_CONDITION_CONFIG → { label, color, urgencyBase } per EquipmentCondition
//   SPORT_CONFIG → { label, icon, color, ... }
//   EmptyState → @/shared/components/ui/EmptyState
//
// CHANGES FROM V1:
//   ✗ cn() → BEM
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color/backgroundColor/borderLeftColor }} → data-attributes
//   ✗ MOCK_EQUIPMENT → equipment prop
//   ✗ className → removed
//   ✗ Loader2 (dead) → removed
//   ✗ useMCPQuery (dead) → removed
//   ✗ equipmentUrgencyGroups (dead) → removed
//   ✗ EmptyState path @/shared/components/layout → @/shared/components/ui
//   ✓ data-condition, data-action, data-avail-level, data-attention, data-level
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component EquipmentPanel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Package,
  Wrench,
  MapPin,
  ArrowDown,
} from "lucide-react";
import type {
  SportsDashboardMode,
  EquipmentCondition,
  SportType,
} from "../types";
import {
  SPORT_CONFIG,
  EQUIPMENT_CONDITION_CONFIG,
} from "../types";
import type { EquipmentLifecycle_Contract } from "@/shared/mocks/contracts";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./EquipmentPanel.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Equipment inventory record — provided by parent.
 * Includes full inventory data not available in the
 * EquipmentLifecycle_Contract (which only has urgency overlay).
 */
export interface EquipmentRecord {
  id: string;
  name: string;
  sport: string;
  location: string;
  condition: string;
  total_quantity: number;
  available_quantity: number;
  brand: string | null;
  notes: string | null;
  last_maintenance: string | null;
}

export interface EquipmentPanelProps {
  equipment: EquipmentRecord[];
  equipmentHealth: EquipmentLifecycle_Contract[];
  isLoading?: boolean;
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function deriveAvailabilityLevel(
  pct: number,
): "high" | "medium" | "low" | "critical" {
  if (pct >= 75) return "high";
  if (pct >= 50) return "medium";
  if (pct >= 25) return "low";
  return "critical";
}

function deriveUrgencyAction(
  action: string,
): "replace_urgent" | "replace_soon" | "maintain" | "ok" {
  if (action === "replace_urgent") return "replace_urgent";
  if (action === "replace_soon") return "replace_soon";
  if (action === "maintain") return "maintain";
  return "ok";
}

function buildEquipmentNarrative(
  totalItems: number,
  availableItems: number,
  needsAttentionCount: number,
  conditionDist: Record<string, number>,
): string {
  const condSummary = Object.entries(conditionDist)
    .sort(([, a], [, b]) => b - a)
    .map(([cond, count]) => {
      const cfg = EQUIPMENT_CONDITION_CONFIG[cond as EquipmentCondition];
      return `${count} ${cfg?.label ?? cond}`;
    })
    .join(", ");

  return (
    `Equipamiento: ${totalItems} items totales, ${availableItems} disponibles. ` +
    `${needsAttentionCount} requiere${needsAttentionCount !== 1 ? "n" : ""} atención. ` +
    `Distribución: ${condSummary}.`
  );
}

const ACTION_LABELS: Record<string, string> = {
  replace_urgent: "Reemplazo urgente",
  replace_soon: "Reemplazo pronto",
  maintain: "Mantenimiento",
};

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 StatsGrid ───────────────────────────────────────

function StatsGrid({
  totalItems,
  availableItems,
  needsAttention,
  categoryCount,
}: {
  totalItems: number;
  availableItems: number;
  needsAttention: number;
  categoryCount: number;
}) {
  const items = [
    { label: "Items Totales", value: totalItems, level: "default" as const },
    { label: "Disponibles", value: availableItems, level: "success" as const },
    {
      label: "Requieren Atención",
      value: needsAttention,
      level: (needsAttention > 0 ? "warning" : "success") as "warning" | "success",
    },
    { label: "Categorías", value: categoryCount, level: "accent" as const },
  ];

  return (
    <div className="spt-equip__stats">
      {items.map((item) => (
        <div
          key={item.label}
          className="spt-equip__stat-card"
          data-level={item.level}
        >
          <p className="spt-equip__stat-label">{item.label}</p>
          <p className="spt-equip__stat-value" data-level={item.level}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── §3.2 ConditionDistribution ───────────────────────────

function ConditionDistribution({
  dist,
}: {
  dist: Record<string, number>;
}) {
  return (
    <div className="spt-equip__cond-dist">
      <span className="spt-equip__cond-dist-label">Condición:</span>
      {Object.entries(dist)
        .sort(([, a], [, b]) => b - a)
        .map(([cond, count]) => {
          const cfg = EQUIPMENT_CONDITION_CONFIG[cond as EquipmentCondition];
          return (
            <span key={cond} className="spt-equip__cond-item">
              <span
                className="spt-equip__cond-dot"
                data-condition={cond}
              />
              <span className="spt-equip__cond-text">
                {cfg?.label ?? cond}: {count}
              </span>
            </span>
          );
        })}
    </div>
  );
}

// ── §3.3 Filters ─────────────────────────────────────────

function Filters({
  sportFilter,
  conditionFilter,
  sortBy,
  availableSports,
  resultCount,
  onSportChange,
  onConditionChange,
  onSortToggle,
}: {
  sportFilter: string;
  conditionFilter: string;
  sortBy: "urgency" | "name";
  availableSports: SportType[];
  resultCount: number;
  onSportChange: (v: string) => void;
  onConditionChange: (v: string) => void;
  onSortToggle: () => void;
}) {
  return (
    <div className="spt-equip__filters">
      <select
        className="spt-equip__select"
        value={sportFilter}
        onChange={(e) => onSportChange(e.target.value)}
      >
        <option value="all">Todos los deportes</option>
        {availableSports.map((s) => {
          const cfg = SPORT_CONFIG[s];
          return (
            <option key={s} value={s}>
              {cfg?.icon} {cfg?.label ?? s}
            </option>
          );
        })}
      </select>

      <select
        className="spt-equip__select"
        value={conditionFilter}
        onChange={(e) => onConditionChange(e.target.value)}
      >
        <option value="all">Todas las condiciones</option>
        {Object.entries(EQUIPMENT_CONDITION_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>
            {cfg.label}
          </option>
        ))}
      </select>

      <Button
        variant="unstyled"
        type="button"
        className="spt-equip__sort-btn"
        data-sort={sortBy}
        onClick={onSortToggle}
      >
        <ArrowDown className="spt-equip__sort-icon" />
        {sortBy === "urgency" ? "Por urgencia" : "Por nombre"}
      </Button>

      <span className="spt-equip__filter-count">
        {resultCount} item{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── §3.4 EquipmentCard ───────────────────────────────────

function EquipmentCard({
  item,
  urgencyData,
  index,
}: {
  item: EquipmentRecord;
  urgencyData?: EquipmentLifecycle_Contract;
  index: number;
}) {
  const sportCfg = SPORT_CONFIG[item.sport as SportType];
  const condCfg =
    EQUIPMENT_CONDITION_CONFIG[item.condition as EquipmentCondition];
  const urgency = urgencyData?.urgency_score ?? condCfg?.urgencyBase ?? 0;
  const action = deriveUrgencyAction(urgencyData?.recommended_action ?? "ok");
  const needsAttention = urgency >= 35;

  const availPct =
    item.total_quantity > 0
      ? (item.available_quantity / item.total_quantity) * 100
      : 0;
  const availLevel = deriveAvailabilityLevel(availPct);

  return (
    <div
      className="spt-equip__card"
      data-condition={item.condition}
      data-attention={needsAttention ? "true" : undefined}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <div className="spt-equip__card-icon" data-condition={item.condition}>
        <span>{sportCfg?.icon ?? "📦"}</span>
      </div>

      <div className="spt-equip__card-body">
        <div className="spt-equip__card-title-row">
          <h5 className="spt-equip__card-name">{item.name}</h5>
          {item.brand && (
            <span className="spt-equip__card-brand">{item.brand}</span>
          )}
        </div>

        <div className="spt-equip__card-meta">
          <span className="spt-equip__card-meta-item">
            <MapPin className="spt-equip__card-meta-icon" />
            {item.location}
          </span>
          <span className="spt-equip__card-meta-item">
            📊 {item.available_quantity}/{item.total_quantity} disponibles
          </span>
          {urgencyData?.days_since_maintenance !== null &&
            urgencyData?.days_since_maintenance !== undefined && (
              <span className="spt-equip__card-meta-item">
                🔧 {urgencyData.days_since_maintenance}d sin mantención
              </span>
            )}
        </div>

        {/* Availability bar */}
        <div className="spt-equip__card-avail-track">
          <div
            className="spt-equip__card-avail-fill"
            data-avail-level={availLevel}
            style={{ width: `${Math.min(100, availPct)}%` }}
          />
        </div>

        {/* Condition + Action badges */}
        <div className="spt-equip__card-badges">
          <span
            className="spt-equip__card-condition-badge"
            data-condition={item.condition}
          >
            {condCfg?.label ?? item.condition}
          </span>

          {action !== "ok" && (
            <span
              className="spt-equip__card-action-badge"
              data-action={action}
            >
              <Wrench className="spt-equip__card-action-icon" />
              {ACTION_LABELS[action] ?? action}
            </span>
          )}

          <span className="spt-equip__card-urgency">
            urgencia: {urgency.toFixed(0)}
          </span>
        </div>

        {item.notes && (
          <p className="spt-equip__card-notes">{item.notes}</p>
        )}
      </div>
    </div>
  );
}

// ── §3.5 ShimmerSkeleton ─────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div className="spt-equip__skeleton" role="status" aria-label="Cargando equipamiento">
      <div className="spt-equip__skeleton-block spt-equip__skeleton-block--stat" />
      <div className="spt-equip__skeleton-block spt-equip__skeleton-block--card" />
      <div className="spt-equip__skeleton-block spt-equip__skeleton-block--card" />
      <div className="spt-equip__skeleton-block spt-equip__skeleton-block--card" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function EquipmentPanel({
  equipment,
  equipmentHealth,
  isLoading = false,
  ambientMode = "calm",
}: EquipmentPanelProps) {
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"urgency" | "name">("urgency");

  // ── Urgency map ──
  const urgencyMap = useMemo(() => {
    const map = new Map<string, EquipmentLifecycle_Contract>();
    for (const item of equipmentHealth) {
      map.set(item.equipment_id, item);
    }
    return map;
  }, [equipmentHealth]);

  // ── Condition distribution ──
  const conditionDist = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const e of equipment) {
      dist[e.condition] = (dist[e.condition] || 0) + 1;
    }
    return dist;
  }, [equipment]);

  // ── Stats ──
  const totalItems = useMemo(
    () => equipment.reduce((s, e) => s + e.total_quantity, 0),
    [equipment],
  );
  const availableItems = useMemo(
    () => equipment.reduce((s, e) => s + e.available_quantity, 0),
    [equipment],
  );
  const needsAttentionCount = useMemo(() => {
    return equipment.filter((e) => {
      const urgency =
        urgencyMap.get(e.id)?.urgency_score ??
        EQUIPMENT_CONDITION_CONFIG[e.condition as EquipmentCondition]
          ?.urgencyBase ??
        0;
      return urgency >= 35;
    }).length;
  }, [equipment, urgencyMap]);

  // ── Available sports ──
  const availableSports = useMemo(() => {
    const sports = new Set<string>();
    for (const e of equipment) {
      sports.add(e.sport);
    }
    return Array.from(sports).sort() as SportType[];
  }, [equipment]);

  // ── Filter + sort ──
  const filteredEquipment = useMemo(() => {
    let filtered = equipment.filter((e) => {
      if (sportFilter !== "all" && e.sport !== sportFilter) return false;
      if (conditionFilter !== "all" && e.condition !== conditionFilter)
        return false;
      return true;
    });

    if (sortBy === "urgency") {
      filtered = [...filtered].sort((a, b) => {
        const aU =
          urgencyMap.get(a.id)?.urgency_score ??
          EQUIPMENT_CONDITION_CONFIG[a.condition as EquipmentCondition]
            ?.urgencyBase ??
          0;
        const bU =
          urgencyMap.get(b.id)?.urgency_score ??
          EQUIPMENT_CONDITION_CONFIG[b.condition as EquipmentCondition]
            ?.urgencyBase ??
          0;
        return bU - aU;
      });
    } else {
      filtered = [...filtered].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    return filtered;
  }, [equipment, sportFilter, conditionFilter, sortBy, urgencyMap]);

  // ── Narrative (LP 7) ──
  const narrative = useMemo(
    () =>
      buildEquipmentNarrative(
        totalItems,
        availableItems,
        needsAttentionCount,
        conditionDist,
      ),
    [totalItems, availableItems, needsAttentionCount, conditionDist],
  );

  // ── Handlers ──
  const handleSortToggle = useCallback(
    () => setSortBy((prev) => (prev === "urgency" ? "name" : "urgency")),
    [],
  );

  // ── Degraded: loading ──
  if (isLoading) {
    return (
      <section
        className="spt-equip"
        data-mode={ambientMode}
        role="region"
        aria-label="Cargando equipamiento"
      >
        <h3 className="spt-equip__title">📦 Equipamiento Deportivo</h3>
        <ShimmerSkeleton />
      </section>
    );
  }

  // ── Degraded: empty ──
  if (equipment.length === 0) {
    return (
      <section
        className="spt-equip"
        data-mode={ambientMode}
        role="region"
        aria-label="Sin equipamiento"
      >
        <h3 className="spt-equip__title">📦 Equipamiento Deportivo</h3>
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="Sin equipamiento registrado"
          description="Aún no hay items de equipamiento en el sistema."
          compact
        />
      </section>
    );
  }

  // ── Render ──
  return (
    <section
      className="spt-equip"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <h3 className="spt-equip__title">📦 Equipamiento Deportivo</h3>

      {/* ── Stats ── */}
      <StatsGrid
        totalItems={totalItems}
        availableItems={availableItems}
        needsAttention={needsAttentionCount}
        categoryCount={Object.keys(conditionDist).length}
      />

      {/* ── Condition Distribution ── */}
      <ConditionDistribution dist={conditionDist} />

      {/* ── Filters ── */}
      <Filters
        sportFilter={sportFilter}
        conditionFilter={conditionFilter}
        sortBy={sortBy}
        availableSports={availableSports}
        resultCount={filteredEquipment.length}
        onSportChange={setSportFilter}
        onConditionChange={setConditionFilter}
        onSortToggle={handleSortToggle}
      />

      {/* ── Equipment List ── */}
      {filteredEquipment.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="Sin equipamiento"
          description="No hay items con los filtros seleccionados."
          compact
        />
      ) : (
        <div className="spt-equip__list">
          {filteredEquipment.map((item, i) => (
            <EquipmentCard
              key={item.id}
              item={item}
              urgencyData={urgencyMap.get(item.id)}
              index={i}
            />
          ))}
        </div>
      )}

      {/* ── Footer: Narrative (LP 7) ── */}
      <div className="spt-equip__footer">
        <p className="spt-equip__narrative">{narrative}</p>
      </div>
    </section>
  );
}