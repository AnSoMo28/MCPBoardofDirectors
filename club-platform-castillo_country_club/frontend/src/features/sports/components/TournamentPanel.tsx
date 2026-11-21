// ═══════════════════════════════════════════════════════════
// src/features/sports/components/TournamentPanel.tsx
// §B4.13 — Tournament Panel V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Tournament management with KPI strip, sport/status filters,
// tournament cards with participation bars and hover-reveal
// status transitions. Data-driven via props — no mock data.
// Living Protocol: 7/7
//
// VERIFIED TYPES:
//   TournamentMetrics_Contract → { total_tournaments, by_status,
//     avg_participation_rate, total_revenue, upcoming_count,
//     in_progress_count, completed_count, avg_entry_fee }
//   TournamentStatus → 7 values (draft → cancelled)
//   TournamentFormat → 4 values (single_elimination → groups_then_knockout)
//   TOURNAMENT_STATUS_CONFIG → { label, color, bgColor, icon }
//   TOURNAMENT_FORMAT_CONFIG → { label, description, icon }
//   TOURNAMENT_STATUS_TRANSITIONS → Record<string, string[]>
//   SPORT_CONFIG → { label, icon, color, ... }
//   SportType → enum (11 values)
//   EmptyState → @/shared/components/ui/EmptyState
//   TournamentFormModal → props: onClose, onSuccess
//
// CHANGES FROM V1:
//   ✗ cn() ×6 → BEM
//   ✗ Tailwind ×75 → BEM CSS
//   ✗ style={{ color/backgroundColor }} → data-attributes
//   ✗ mockTournaments (6 items) → tournaments prop
//   ✗ useMCPQuery (dead, enabled:false) → removed
//   ✗ Button → BEM button
//   ✗ showToast → onStatusChange + onTournamentCreated callbacks
//   ✗ Loader2 (dead) → removed
//   ✗ ChevronRight (odd KPI icon) → Zap
//   ✗ hovered state (useState + onMouse) → CSS :hover
//   ✗ className → removed
//   ✗ EmptyState path → @/shared/components/ui/EmptyState
//   ✓ data-status, data-fill-level, data-kpi-type, data-terminal, data-mode
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component TournamentPanel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  Trophy,
  Users,
  CalendarDays,
  DollarSign,
  Zap,
} from "lucide-react";
import type {
  SportsDashboardMode,
  SportType,
  TournamentStatus,
  TournamentFormat,
} from "../types";
import {
  SPORT_CONFIG,
  TOURNAMENT_STATUS_CONFIG,
  TOURNAMENT_FORMAT_CONFIG,
  TOURNAMENT_STATUS_TRANSITIONS,
} from "../types";
import type { TournamentMetrics_Contract } from "@/shared/mocks/contracts";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { TournamentFormModal } from "./TournamentFormModal";
import "./TournamentPanel.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface TournamentRecord {
  id: string;
  name: string;
  sport: string;
  format: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  venue: string;
  entry_fee: number;
  prizes: string[];
  status: string;
  rules: string | null;
}

export interface TournamentPanelProps {
  tournamentMetrics: TournamentMetrics_Contract;
  tournaments: TournamentRecord[];
  isLoading?: boolean;
  ambientMode?: SportsDashboardMode;
  onStatusChange?: (id: string, newStatus: string) => void;
  onTournamentCreated?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function formatCurrencyCRC(value: number): string {
  if (value >= 1_000_000) return `₡${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₡${(value / 1_000).toFixed(0)}K`;
  return `₡${value}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function deriveFillLevel(pct: number): "high" | "medium" | "low" {
  if (pct >= 80) return "high";
  if (pct >= 50) return "medium";
  return "low";
}

function buildTournamentNarrative(
  total: number,
  inProgress: number,
  upcoming: number,
  totalRevenue: number,
  avgParticipation: number,
): string {
  return (
    `Torneos deportivos: ${total} torneo${total !== 1 ? "s" : ""} ` +
    `(${inProgress} en curso, ${upcoming} próximo${upcoming !== 1 ? "s" : ""}). ` +
    `Revenue total: ${formatCurrencyCRC(totalRevenue)}. ` +
    `Participación promedio: ${avgParticipation}%.`
  );
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 StatsGrid ───────────────────────────────────────

function StatsGrid({ metrics }: { metrics: TournamentMetrics_Contract }) {
  const items = [
    {
      label: "Total",
      value: metrics.total_tournaments,
      kpiType: "total" as const,
      icon: Trophy,
    },
    {
      label: "En Curso",
      value: metrics.in_progress_count,
      kpiType: "in-progress" as const,
      icon: Zap,
    },
    {
      label: "Próximos",
      value: metrics.upcoming_count,
      kpiType: "upcoming" as const,
      icon: CalendarDays,
    },
    {
      label: "Completados",
      value: metrics.completed_count,
      kpiType: "completed" as const,
      icon: Trophy,
    },
  ];

  return (
    <div className="spt-trn__stats">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="spt-trn__stat-card"
            data-kpi-type={item.kpiType}
          >
            <div className="spt-trn__stat-header">
              <Icon className="spt-trn__stat-icon" data-kpi-type={item.kpiType} />
              <span className="spt-trn__stat-label">{item.label}</span>
            </div>
            <p className="spt-trn__stat-value" data-kpi-type={item.kpiType}>
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── §3.2 QuickStats ──────────────────────────────────────

function QuickStats({ metrics }: { metrics: TournamentMetrics_Contract }) {
  return (
    <div className="spt-trn__quick-stats">
      <span className="spt-trn__quick-stat">
        💰 Revenue:{" "}
        <strong data-rate-level="revenue">
          {formatCurrencyCRC(metrics.total_revenue)}
        </strong>
      </span>
      <span className="spt-trn__quick-stat">
        📊 Participación promedio:{" "}
        <strong data-rate-level={metrics.avg_participation_rate >= 70 ? "good" : "warning"}>
          {metrics.avg_participation_rate}%
        </strong>
      </span>
      <span className="spt-trn__quick-stat">
        🏷️ Inscripción promedio:{" "}
        <strong>{formatCurrencyCRC(metrics.avg_entry_fee)}</strong>
      </span>
    </div>
  );
}

// ── §3.3 Filters ─────────────────────────────────────────

function Filters({
  sportFilter,
  statusFilter,
  availableSports,
  resultCount,
  onSportChange,
  onStatusChange,
}: {
  sportFilter: string;
  statusFilter: string;
  availableSports: string[];
  resultCount: number;
  onSportChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}) {
  return (
    <div className="spt-trn__filters">
      <select
        className="spt-trn__select"
        value={sportFilter}
        onChange={(e) => onSportChange(e.target.value)}
      >
        <option value="all">Todos los deportes</option>
        {availableSports.map((s) => {
          const cfg = SPORT_CONFIG[s as SportType];
          return (
            <option key={s} value={s}>
              {cfg?.icon} {cfg?.label ?? s}
            </option>
          );
        })}
      </select>

      <select
        className="spt-trn__select"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="all">Todos los estados</option>
        {Object.entries(TOURNAMENT_STATUS_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>
            {cfg.icon} {cfg.label}
          </option>
        ))}
      </select>

      <span className="spt-trn__filter-count">
        {resultCount} torneo{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── §3.4 TournamentCard ──────────────────────────────────

function TournamentCard({
  tournament,
  index,
  onStatusChange,
}: {
  tournament: TournamentRecord;
  index: number;
  onStatusChange?: (id: string, newStatus: string) => void;
}) {
  const statusCfg =
    TOURNAMENT_STATUS_CONFIG[tournament.status as TournamentStatus] ??
    TOURNAMENT_STATUS_CONFIG.draft;
  const formatCfg =
    TOURNAMENT_FORMAT_CONFIG[tournament.format as TournamentFormat] ??
    TOURNAMENT_FORMAT_CONFIG.single_elimination;
  const sportCfg = SPORT_CONFIG[tournament.sport as SportType];

  const validTransitions =
    TOURNAMENT_STATUS_TRANSITIONS[tournament.status] ?? [];

  const participationPct =
    tournament.max_participants > 0
      ? (tournament.current_participants / tournament.max_participants) * 100
      : 0;
  const fillLevel = deriveFillLevel(participationPct);

  const daysToDeadline = daysUntil(tournament.registration_deadline);
  const showDeadlineAlert =
    daysToDeadline > 0 &&
    daysToDeadline <= 7 &&
    tournament.status === "registration_open";

  return (
    <div
      className="spt-trn__card"
      data-status={tournament.status}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      {/* ── Header ── */}
      <div className="spt-trn__card-header">
        <div className="spt-trn__card-title-area">
          <span className="spt-trn__card-sport-icon">
            {sportCfg?.icon ?? "🏆"}
          </span>
          <div className="spt-trn__card-title-text">
            <h4 className="spt-trn__card-name">{tournament.name}</h4>
            <div className="spt-trn__card-meta">
              <span className="spt-trn__card-sport-label">
                {sportCfg?.label ?? tournament.sport}
              </span>
              <span className="spt-trn__card-dot">·</span>
              <span className="spt-trn__card-format-label">
                {formatCfg.label}
              </span>
            </div>
          </div>
        </div>

        <span className="spt-trn__status-badge" data-status={tournament.status}>
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>

      {/* ── Info Grid ── */}
      <div className="spt-trn__card-info">
        <span className="spt-trn__card-info-item">
          <CalendarDays className="spt-trn__card-info-icon" />
          <span>
            {tournament.start_date} → {tournament.end_date}
          </span>
        </span>
        <span className="spt-trn__card-info-item">
          <Users className="spt-trn__card-info-icon" />
          <span>
            {tournament.current_participants}/{tournament.max_participants} inscritos
          </span>
        </span>
        {tournament.entry_fee > 0 && (
          <span className="spt-trn__card-info-item">
            <DollarSign className="spt-trn__card-info-icon" />
            <span>Inscripción: {formatCurrencyCRC(tournament.entry_fee)}</span>
          </span>
        )}
        <span className="spt-trn__card-info-item">
          <span className="spt-trn__card-info-venue">📍</span>
          <span className="spt-trn__card-info-venue-text">{tournament.venue}</span>
        </span>
      </div>

      {/* ── Participation Bar (LP 5: Siniestría) ── */}
      <div className="spt-trn__card-participation">
        <div className="spt-trn__card-participation-header">
          <span className="spt-trn__card-participation-label">
            Inscripciones
          </span>
          <span
            className="spt-trn__card-participation-pct"
            data-fill-level={fillLevel}
          >
            {participationPct.toFixed(0)}%
          </span>
        </div>
        <div className="spt-trn__card-bar-track">
          <div
            className="spt-trn__card-bar-fill"
            data-fill-level={fillLevel}
            style={{ width: `${Math.min(100, participationPct)}%` }}
          />
        </div>
      </div>

      {/* ── Prizes ── */}
      {tournament.prizes.length > 0 && (
        <div className="spt-trn__card-prizes">
          <Trophy className="spt-trn__card-prizes-icon" />
          <span>{tournament.prizes.join(" · ")}</span>
        </div>
      )}

      {/* ── Deadline Alert ── */}
      {showDeadlineAlert && (
        <div className="spt-trn__card-deadline-alert">
          ⏳ Cierre de inscripciones en {daysToDeadline} día
          {daysToDeadline !== 1 ? "s" : ""}
        </div>
      )}

      {/* ── Status Transitions (CSS hover-reveal) ── */}
      {validTransitions.length > 0 && (
        <div className="spt-trn__card-transitions">
          <span className="spt-trn__card-transitions-label">
            Transición:
          </span>
          {validTransitions.map((newStatus) => {
            const targetCfg =
              TOURNAMENT_STATUS_CONFIG[newStatus as TournamentStatus];
            if (!targetCfg) return null;
            return (
              <Button
                variant="unstyled"
                key={newStatus}
                type="button"
                className="spt-trn__card-transition-btn"
                data-terminal={newStatus === "cancelled" ? "true" : undefined}
                onClick={() => onStatusChange?.(tournament.id, newStatus)}
              >
                {targetCfg.icon} {targetCfg.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── §3.5 ShimmerSkeleton ─────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div className="spt-trn__skeleton" role="status" aria-label="Cargando torneos">
      <div className="spt-trn__skeleton-block spt-trn__skeleton-block--stats" />
      <div className="spt-trn__skeleton-block spt-trn__skeleton-block--quick" />
      <div className="spt-trn__skeleton-grid">
        <div className="spt-trn__skeleton-block spt-trn__skeleton-block--card" />
        <div className="spt-trn__skeleton-block spt-trn__skeleton-block--card" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function TournamentPanel({
  tournamentMetrics,
  tournaments,
  isLoading = false,
  ambientMode = "calm",
  onStatusChange,
  onTournamentCreated,
}: TournamentPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [sportFilter, setSportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Available sports ──
  const availableSports = useMemo(() => {
    const sports = new Set(tournaments.map((t) => t.sport));
    return Array.from(sports).sort();
  }, [tournaments]);

  // ── Filtered tournaments ──
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (sportFilter !== "all" && t.sport !== sportFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tournaments, sportFilter, statusFilter]);

  // ── Narrative (LP 7) ──
  const narrative = useMemo(
    () =>
      buildTournamentNarrative(
        tournamentMetrics.total_tournaments,
        tournamentMetrics.in_progress_count,
        tournamentMetrics.upcoming_count,
        tournamentMetrics.total_revenue,
        tournamentMetrics.avg_participation_rate,
      ),
    [tournamentMetrics],
  );

  // ── Handlers ──
  const handleFormClose = useCallback(() => setShowForm(false), []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    onTournamentCreated?.();
  }, [onTournamentCreated]);

  // ── Degraded: loading ──
  if (isLoading) {
    return (
      <section
        className="spt-trn"
        data-mode={ambientMode}
        role="region"
        aria-label="Cargando torneos"
      >
        <div className="spt-trn__header">
          <h3 className="spt-trn__title">🏆 Torneos Deportivos</h3>
        </div>
        <ShimmerSkeleton />
      </section>
    );
  }

  // ── Degraded: empty ──
  if (tournaments.length === 0) {
    return (
      <section
        className="spt-trn"
        data-mode={ambientMode}
        role="region"
        aria-label="Sin torneos"
      >
        <div className="spt-trn__header">
          <h3 className="spt-trn__title">🏆 Torneos Deportivos</h3>
        </div>
        <EmptyState
          icon={<Trophy className="w-6 h-6" />}
          title="Sin torneos"
          description="No hay torneos registrados. Creá uno nuevo para fomentar la competencia."
          compact
        />
      </section>
    );
  }

  // ── Render ──
  return (
    <section
      className="spt-trn"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-trn__header">
        <h3 className="spt-trn__title">🏆 Torneos Deportivos</h3>
        <Button
          variant="unstyled"
          type="button"
          className="spt-trn__new-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus className="spt-trn__new-btn-icon" />
          Nuevo Torneo
        </Button>
      </div>

      {/* ── KPI Strip ── */}
      <StatsGrid metrics={tournamentMetrics} />

      {/* ── Quick Stats ── */}
      <QuickStats metrics={tournamentMetrics} />

      {/* ── Filters ── */}
      <Filters
        sportFilter={sportFilter}
        statusFilter={statusFilter}
        availableSports={availableSports}
        resultCount={filteredTournaments.length}
        onSportChange={setSportFilter}
        onStatusChange={setStatusFilter}
      />

      {/* ── Tournament Cards ── */}
      {filteredTournaments.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-6 h-6" />}
          title="Sin torneos"
          description="No hay torneos con los filtros seleccionados."
          compact
        />
      ) : (
        <div className="spt-trn__grid">
          {filteredTournaments.map((t, i) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              index={i}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}

      {/* ── Footer: Narrative (LP 7) ── */}
      <div className="spt-trn__footer">
        <p className="spt-trn__narrative">{narrative}</p>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <TournamentFormModal
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </section>
  );
}