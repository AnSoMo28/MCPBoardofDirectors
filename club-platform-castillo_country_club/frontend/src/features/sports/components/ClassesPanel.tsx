// ═══════════════════════════════════════════════════════════
// src/features/sports/components/ClassesPanel.tsx
// §B4.7 — Classes Panel V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Fitness class management. Enrollment bars, KPI strip,
// sport + type filters. Data-driven from contract — no mock
// data, no enrichment merge. fill_rate_pct + is_underperforming
// already pre-computed in contract.
// Living Protocol: 7/7
//
// VERIFIED TYPES:
//   ClassEnrollment_Contract → { class_id, name, sport, class_type,
//     enrolled, capacity, fill_rate_pct, is_underperforming,
//     instructor, schedule_day }
//   CLASS_TYPE_CONFIG → { label, icon }
//   SPORT_CONFIG → { label, icon, color }
//   EmptyState → @/shared/components/ui/EmptyState
//   ClassFormModal → props: onClose, onSuccess
//
// CHANGES FROM V1:
//   ✗ cn() → BEM
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color/backgroundColor }} → data-attributes
//   ✗ MOCK_CLASSES (6 items) → classes prop (direct contract)
//   ✗ enrichment merge logic → removed (contract has all fields)
//   ✗ formatTimeRange helper → removed (contract has no schedule_time)
//   ✗ className → removed
//   ✗ Loader2 (dead) → removed
//   ✗ Button → BEM button
//   ✗ showToast → onClassCreated callback
//   ✗ useMCPQuery (dead) → removed
//   ✗ cn (dead) → removed
//   ✗ enrollmentToBarData (dead import, never called) → removed
//   ✗ EmptyState path @/shared/components/layout → @/shared/components/ui
//   ✓ data-fill-level, data-mode, data-level
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component ClassesPanel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { Plus, Dumbbell, Users, Clock } from "lucide-react";
import type { SportsDashboardMode, SportType, ClassType } from "../types";
import { SPORT_CONFIG, CLASS_TYPE_CONFIG } from "../types";
import type { ClassEnrollment_Contract } from "@/shared/mocks/contracts";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ClassFormModal } from "./ClassFormModal";
import "./ClassesPanel.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface ClassesPanelProps {
  classes: ClassEnrollment_Contract[];
  isLoading?: boolean;
  ambientMode?: SportsDashboardMode;
  onClassCreated?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function deriveFillLevel(
  fillRate: number,
): "high" | "good" | "medium" | "low" {
  if (fillRate >= 90) return "high";
  if (fillRate >= 70) return "good";
  if (fillRate >= 40) return "medium";
  return "low";
}

function deriveFillLabel(fillRate: number): string {
  if (fillRate >= 90) return "Casi lleno";
  if (fillRate >= 70) return "Buen ritmo";
  if (fillRate >= 40) return "Aceptable";
  return "Baja inscripción";
}

function deriveKpiLevel(
  value: number,
  threshold: number,
  mode: "above-good" | "below-good",
): "success" | "warning" | "default" | "accent" {
  if (mode === "above-good") {
    return value >= threshold ? "success" : "warning";
  }
  return value > threshold ? "warning" : "success";
}

function buildClassesNarrative(
  total: number,
  totalEnrolled: number,
  avgFill: number,
  underperforming: number,
): string {
  return (
    `Panel de clases: ${total} clase${total !== 1 ? "s" : ""} activa${total !== 1 ? "s" : ""}, ` +
    `${totalEnrolled} inscrito${total !== 1 ? "s" : ""} totales. ` +
    `Fill rate promedio: ${avgFill.toFixed(0)}%. ` +
    `${underperforming} clase${underperforming !== 1 ? "s" : ""} con baja inscripción.`
  );
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 StatsGrid ───────────────────────────────────────

function StatsGrid({
  total,
  totalEnrolled,
  avgFill,
  underperforming,
}: {
  total: number;
  totalEnrolled: number;
  avgFill: number;
  underperforming: number;
}) {
  const items = [
    { label: "Clases Activas", value: total, level: "default" as const, icon: Dumbbell },
    { label: "Total Inscritos", value: totalEnrolled, level: "accent" as const, icon: Users },
    {
      label: "Fill Rate Prom.",
      value: `${avgFill.toFixed(0)}%`,
      level: deriveKpiLevel(avgFill, 70, "above-good"),
      icon: Dumbbell,
    },
    {
      label: "Baja Insc.",
      value: underperforming,
      level: deriveKpiLevel(underperforming, 0, "below-good"),
      icon: Dumbbell,
    },
  ];

  return (
    <div className="spt-classes__stats">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="spt-classes__stat-card" data-level={item.level}>
            <div className="spt-classes__stat-header">
              <Icon className="spt-classes__stat-icon" data-level={item.level} />
              <span className="spt-classes__stat-label">{item.label}</span>
            </div>
            <p className="spt-classes__stat-value" data-level={item.level}>
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── §3.2 Filters ─────────────────────────────────────────

function Filters({
  sportFilter,
  typeFilter,
  availableSports,
  resultCount,
  onSportChange,
  onTypeChange,
}: {
  sportFilter: string;
  typeFilter: string;
  availableSports: SportType[];
  resultCount: number;
  onSportChange: (v: string) => void;
  onTypeChange: (v: string) => void;
}) {
  return (
    <div className="spt-classes__filters">
      <select
        className="spt-classes__select"
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
        className="spt-classes__select"
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="all">Todos los tipos</option>
        {Object.entries(CLASS_TYPE_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>
            {cfg.label}
          </option>
        ))}
      </select>

      <span className="spt-classes__filter-count">
        {resultCount} clase{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── §3.3 ClassCard ───────────────────────────────────────

function ClassCard({
  cls,
  index,
}: {
  cls: ClassEnrollment_Contract;
  index: number;
}) {
  const sportCfg = SPORT_CONFIG[cls.sport as SportType];
  const typeCfg = CLASS_TYPE_CONFIG[cls.class_type as ClassType];
  const fillLevel = deriveFillLevel(cls.fill_rate_pct);
  const fillLabel = deriveFillLabel(cls.fill_rate_pct);

  return (
    <div
      className="spt-classes__card"
      data-fill-level={fillLevel}
      data-underperforming={cls.is_underperforming ? "true" : undefined}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      {/* Header */}
      <div className="spt-classes__card-header">
        <div className="spt-classes__card-title-area">
          <span className="spt-classes__card-sport-icon">
            {sportCfg?.icon ?? "🧘"}
          </span>
          <div className="spt-classes__card-title-text">
            <h4 className="spt-classes__card-name">{cls.name}</h4>
            <span className="spt-classes__card-type">
              {typeCfg?.label ?? cls.class_type}
            </span>
          </div>
        </div>

        {fillLevel === "high" && (
          <span className="spt-classes__card-full-badge">
            🔥 Lleno
          </span>
        )}
      </div>

      {/* Info */}
      <div className="spt-classes__card-info">
        <span className="spt-classes__card-info-item">
          <Users className="spt-classes__card-info-icon" />
          <span className="spt-classes__card-info-text">{cls.instructor}</span>
        </span>
        <span className="spt-classes__card-info-item">
          <Clock className="spt-classes__card-info-icon" />
          <span className="spt-classes__card-info-text">{cls.schedule_day}</span>
        </span>
      </div>

      {/* Enrollment bar */}
      <div className="spt-classes__card-enrollment">
        <div className="spt-classes__card-enrollment-header">
          <span className="spt-classes__card-enrollment-count">
            {cls.enrolled}/{cls.capacity} inscritos
          </span>
          <div className="spt-classes__card-enrollment-right">
            <span className="spt-classes__card-fill-label" data-fill-level={fillLevel}>
              {fillLabel}
            </span>
            <span className="spt-classes__card-fill-pct" data-fill-level={fillLevel}>
              {cls.fill_rate_pct.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="spt-classes__card-bar-track">
          <div
            className="spt-classes__card-bar-fill"
            data-fill-level={fillLevel}
            style={{ width: `${Math.min(100, cls.fill_rate_pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── §3.4 ShimmerSkeleton ─────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div className="spt-classes__skeleton" role="status" aria-label="Cargando clases">
      <div className="spt-classes__skeleton-block spt-classes__skeleton-block--stats" />
      <div className="spt-classes__skeleton-grid">
        <div className="spt-classes__skeleton-block spt-classes__skeleton-block--card" />
        <div className="spt-classes__skeleton-block spt-classes__skeleton-block--card" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function ClassesPanel({
  classes,
  isLoading = false,
  ambientMode = "calm",
  onClassCreated,
}: ClassesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // ── Stats ──
  const stats = useMemo(() => {
    const total = classes.length;
    const totalEnrolled = classes.reduce((s, c) => s + c.enrolled, 0);
    const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);
    const avgFill = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;
    const underperforming = classes.filter((c) => c.is_underperforming).length;
    return { total, totalEnrolled, avgFill, underperforming };
  }, [classes]);

  // ── Available sports ──
  const availableSports = useMemo(() => {
    const sports = new Set<string>();
    for (const c of classes) {
      sports.add(c.sport);
    }
    return Array.from(sports).sort() as SportType[];
  }, [classes]);

  // ── Filter ──
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (sportFilter !== "all" && c.sport !== sportFilter) return false;
      if (typeFilter !== "all" && c.class_type !== typeFilter) return false;
      return true;
    });
  }, [classes, sportFilter, typeFilter]);

  // ── Narrative (LP 7) ──
  const narrative = useMemo(
    () => buildClassesNarrative(stats.total, stats.totalEnrolled, stats.avgFill, stats.underperforming),
    [stats.total, stats.totalEnrolled, stats.avgFill, stats.underperforming],
  );

  // ── Handlers ──
  const handleFormClose = useCallback(() => setShowForm(false), []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    onClassCreated?.();
  }, [onClassCreated]);

  // ── Degraded: loading ──
  if (isLoading) {
    return (
      <section
        className="spt-classes"
        data-mode={ambientMode}
        role="region"
        aria-label="Cargando clases"
      >
        <div className="spt-classes__header">
          <h3 className="spt-classes__title">🧘 Clases de Fitness</h3>
        </div>
        <ShimmerSkeleton />
      </section>
    );
  }

  // ── Degraded: empty ──
  if (classes.length === 0) {
    return (
      <section
        className="spt-classes"
        data-mode={ambientMode}
        role="region"
        aria-label="Sin clases"
      >
        <div className="spt-classes__header">
          <h3 className="spt-classes__title">🧘 Clases de Fitness</h3>
        </div>
        <EmptyState
          icon={<Dumbbell className="w-6 h-6" />}
          title="Sin clases registradas"
          description="Aún no hay clases de fitness en el sistema."
          compact
        />
      </section>
    );
  }

  // ── Render ──
  return (
    <section
      className="spt-classes"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-classes__header">
        <h3 className="spt-classes__title">🧘 Clases de Fitness</h3>
        <Button
          variant="unstyled"
          type="button"
          className="spt-classes__new-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus className="spt-classes__new-btn-icon" />
          Nueva Clase
        </Button>
      </div>

      {/* ── KPI Strip ── */}
      <StatsGrid
        total={stats.total}
        totalEnrolled={stats.totalEnrolled}
        avgFill={stats.avgFill}
        underperforming={stats.underperforming}
      />

      {/* ── Filters ── */}
      <Filters
        sportFilter={sportFilter}
        typeFilter={typeFilter}
        availableSports={availableSports}
        resultCount={filteredClasses.length}
        onSportChange={setSportFilter}
        onTypeChange={setTypeFilter}
      />

      {/* ── Class Cards ── */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="w-6 h-6" />}
          title="Sin clases"
          description="No hay clases con los filtros seleccionados."
          compact
        />
      ) : (
        <div className="spt-classes__grid">
          {filteredClasses.map((cls, i) => (
            <ClassCard key={cls.class_id} cls={cls} index={i} />
          ))}
        </div>
      )}

      {/* ── Footer: Narrative (LP 7) ── */}
      <div className="spt-classes__footer">
        <p className="spt-classes__narrative">{narrative}</p>
      </div>

      {/* ── Modal ── */}
      {showForm && (
        <ClassFormModal
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </section>
  );
}