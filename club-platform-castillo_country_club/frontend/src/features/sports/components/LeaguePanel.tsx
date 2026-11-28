// ═══════════════════════════════════════════════════════════
// src/features/sports/components/LeaguePanel.tsx
// §B4.11 — League Panel V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// League management with standings tables, team pills,
// status transitions (hover-reveal), format badges.
// Data-driven via props — no mock data.
// Living Protocol: 7/7
//
// VERIFIED TYPES:
//   SPORT_CONFIG → { label, icon, color, ... }
//   LEAGUE_STATUS_CONFIG → { label, color, bgColor }
//   LEAGUE_FORMAT_CONFIG → { label, ... }
//   LEAGUE_STATUS_TRANSITIONS → Record<string, string[]>
//   LeagueStatus, LeagueFormat, SportType → enums
//   EmptyState → @/shared/components/ui/EmptyState
//   LeagueFormModal → props: onClose, onSuccess
//
// CHANGES FROM V1:
//   ✗ cn() ×4 → BEM
//   ✗ Tailwind ×70 → BEM CSS
//   ✗ style={{ color/backgroundColor }} → data-attributes
//   ✗ MOCK_LEAGUES → leagues prop
//   ✗ Button → BEM button
//   ✗ showToast → onStatusChange + onLeagueCreated callbacks
//   ✗ Loader2 (dead) → removed
//   ✗ hovered state (useState + onMouseEnter/Leave) → CSS :hover
//   ✗ EmptyState path → @/shared/components/ui/EmptyState
//   ✓ data-status, data-leader, data-format, data-prefers-reduced
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component LeaguePanel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  Users,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";
import type {
  SportsDashboardMode,
  SportType,
  LeagueStatus,
  LeagueFormat,
} from "../types";
import {
  SPORT_CONFIG,
  LEAGUE_STATUS_CONFIG,
  LEAGUE_FORMAT_CONFIG,
  LEAGUE_STATUS_TRANSITIONS,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { LeagueFormModal } from "./LeagueFormModal";
import "./LeaguePanel.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface LeagueRecord {
  id: string;
  name: string;
  sport: string;
  format: string;
  teams: string[];
  season: string;
  start_date: string;
  end_date: string;
  coordinator_member_id: string;
  max_teams: number;
  current_round: number;
  standings: Record<string, number>;
  status: string;
}

export interface LeaguePanelProps {
  leagues: LeagueRecord[];
  isLoading?: boolean;
  ambientMode?: SportsDashboardMode;
  onStatusChange?: (id: string, newStatus: string) => void;
  onLeagueCreated?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function buildLeagueNarrative(
  total: number,
  active: number,
  totalTeams: number,
): string {
  return (
    `Ligas deportivas: ${total} liga${total !== 1 ? "s" : ""} ` +
    `(${active} activa${active !== 1 ? "s" : ""}), ` +
    `${totalTeams} equipo${totalTeams !== 1 ? "s" : ""} en total.`
  );
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 StandingsTable ──────────────────────────────────

function StandingsTable({
  standings,
  teams,
}: {
  standings: Record<string, number>;
  teams: string[];
}) {
  const sorted = [...teams].sort(
    (a, b) => (standings[b] ?? 0) - (standings[a] ?? 0),
  );
  const maxPts = Math.max(...Object.values(standings), 1);

  return (
    <div className="spt-league__standings">
      <table className="spt-league__table">
        <thead>
          <tr>
            <th className="spt-league__th spt-league__th--rank">#</th>
            <th className="spt-league__th spt-league__th--team">Equipo</th>
            <th className="spt-league__th spt-league__th--pts">Pts</th>
            <th className="spt-league__th spt-league__th--bar">Barra</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, idx) => {
            const pts = standings[team] ?? 0;
            const barPct = (pts / maxPts) * 100;
            const isLeader = idx === 0 && pts > 0;

            return (
              <tr
                key={team}
                className="spt-league__tr"
                data-leader={isLeader ? "true" : undefined}
              >
                <td className="spt-league__td spt-league__td--rank">
                  {isLeader ? (
                    <span className="spt-league__leader-icon">🥇</span>
                  ) : (
                    <span className="spt-league__rank-num">{idx + 1}</span>
                  )}
                </td>
                <td className="spt-league__td spt-league__td--team">
                  {team}
                </td>
                <td
                  className="spt-league__td spt-league__td--pts"
                  data-leader={isLeader ? "true" : undefined}
                >
                  {pts}
                </td>
                <td className="spt-league__td spt-league__td--bar">
                  <div className="spt-league__bar-track">
                    <div
                      className="spt-league__bar-fill"
                      data-leader={isLeader ? "true" : undefined}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── §3.2 LeagueCard ──────────────────────────────────────

function LeagueCard({
  league,
  index,
  onStatusChange,
}: {
  league: LeagueRecord;
  index: number;
  onStatusChange?: (id: string, newStatus: string) => void;
}) {
  const [showStandings, setShowStandings] = useState(false);

  const statusCfg =
    LEAGUE_STATUS_CONFIG[league.status as LeagueStatus] ??
    LEAGUE_STATUS_CONFIG.proposed;
  const formatCfg =
    LEAGUE_FORMAT_CONFIG[league.format as LeagueFormat] ??
    LEAGUE_FORMAT_CONFIG.round_robin;
  const sportCfg = SPORT_CONFIG[league.sport as SportType];

  const validTransitions =
    LEAGUE_STATUS_TRANSITIONS[league.status] ?? [];

  const hasStandings =
    league.teams.length > 0 &&
    Object.keys(league.standings).length > 0;

  return (
    <div
      className="spt-league__card"
      data-status={league.status}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      {/* ── Card Header ── */}
      <div className="spt-league__card-header">
        <div className="spt-league__card-title-area">
          <span className="spt-league__card-sport-icon">
            {sportCfg?.icon ?? "⚽"}
          </span>
          <div className="spt-league__card-title-text">
            <h4 className="spt-league__card-name">{league.name}</h4>
            <div className="spt-league__card-meta">
              <span className="spt-league__card-format" data-format={league.format}>
                {formatCfg.label}
              </span>
              <span className="spt-league__card-dot">·</span>
              <span className="spt-league__card-season">{league.season}</span>
            </div>
          </div>
        </div>

        <span
          className="spt-league__status-badge"
          data-status={league.status}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* ── Info Grid ── */}
      <div className="spt-league__card-info">
        <span className="spt-league__card-info-item">
          <CalendarDays className="spt-league__card-info-icon" />
          <span>{league.start_date} → {league.end_date}</span>
        </span>
        <span className="spt-league__card-info-item">
          <Users className="spt-league__card-info-icon" />
          <span>{league.teams.length}/{league.max_teams} equipos</span>
        </span>
        {league.current_round > 0 && (
          <span className="spt-league__card-info-item">
            <Award className="spt-league__card-info-icon" />
            <span>Ronda {league.current_round}</span>
          </span>
        )}
      </div>

      {/* ── Team Pills ── */}
      <div className="spt-league__team-pills">
        {league.teams.map((team) => (
          <span key={team} className="spt-league__team-pill">
            {team}
            {league.standings[team] != null && (
              <span className="spt-league__team-pts">
                {league.standings[team]}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* ── Standings Toggle ── */}
      {hasStandings && (
        <Button
          variant="unstyled"
          type="button"
          className="spt-league__standings-toggle"
          onClick={() => setShowStandings(!showStandings)}
          aria-expanded={showStandings}
        >
          {showStandings ? (
            <>
              <ChevronUp className="spt-league__standings-toggle-icon" />
              Ocultar tabla
            </>
          ) : (
            <>
              <ChevronDown className="spt-league__standings-toggle-icon" />
              Ver tabla de posiciones
            </>
          )}
        </Button>
      )}

      {showStandings && hasStandings && (
        <StandingsTable
          standings={league.standings}
          teams={league.teams}
        />
      )}

      {/* ── Status Transitions (CSS hover-reveal) ── */}
      {validTransitions.length > 0 && (
        <div className="spt-league__transitions">
          <span className="spt-league__transitions-label">
            Transición:
          </span>
          {validTransitions.map((newStatus) => {
            const targetCfg =
              LEAGUE_STATUS_CONFIG[newStatus as LeagueStatus];
            if (!targetCfg) return null;
            return (
              <Button
                variant="unstyled"
                key={newStatus}
                type="button"
                className="spt-league__transition-btn"
                data-target-status={newStatus}
                onClick={() => onStatusChange?.(league.id, newStatus)}
              >
                {targetCfg.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── §3.3 ShimmerSkeleton ─────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div className="spt-league__skeleton" role="status" aria-label="Cargando ligas">
      <div className="spt-league__skeleton-grid">
        <div className="spt-league__skeleton-block spt-league__skeleton-block--card" />
        <div className="spt-league__skeleton-block spt-league__skeleton-block--card" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function LeaguePanel({
  leagues,
  isLoading = false,
  ambientMode = "calm",
  onStatusChange,
  onLeagueCreated,
}: LeaguePanelProps) {
  const [showForm, setShowForm] = useState(false);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = leagues.length;
    const active = leagues.filter((l) => l.status === "active").length;
    const totalTeams = leagues.reduce((s, l) => s + l.teams.length, 0);
    return { total, active, totalTeams };
  }, [leagues]);

  // ── Narrative (LP 7) ──
  const narrative = useMemo(
    () => buildLeagueNarrative(stats.total, stats.active, stats.totalTeams),
    [stats.total, stats.active, stats.totalTeams],
  );

  // ── Handlers ──
  const handleFormClose = useCallback(() => setShowForm(false), []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    onLeagueCreated?.();
  }, [onLeagueCreated]);

  // ── Degraded: loading ──
  if (isLoading) {
    return (
      <section
        className="spt-league"
        data-mode={ambientMode}
        role="region"
        aria-label="Cargando ligas"
      >
        <div className="spt-league__header">
          <h3 className="spt-league__title">⚽ Ligas Deportivas</h3>
        </div>
        <ShimmerSkeleton />
      </section>
    );
  }

  // ── Degraded: empty ──
  if (leagues.length === 0) {
    return (
      <section
        className="spt-league"
        data-mode={ambientMode}
        role="region"
        aria-label="Sin ligas"
      >
        <div className="spt-league__header">
          <h3 className="spt-league__title">⚽ Ligas Deportivas</h3>
        </div>
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Sin ligas activas"
          description="Creá una liga deportiva para fomentar la competencia regular entre socios."
          compact
        />
      </section>
    );
  }

  // ── Render ──
  return (
    <section
      className="spt-league"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-league__header">
        <h3 className="spt-league__title">⚽ Ligas Deportivas</h3>
        <Button
          variant="unstyled"
          type="button"
          className="spt-league__new-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus className="spt-league__new-btn-icon" />
          Nueva Liga
        </Button>
      </div>

      {/* ── League Cards ── */}
      <div className="spt-league__grid">
        {leagues.map((league, i) => (
          <LeagueCard
            key={league.id}
            league={league}
            index={i}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* ── Footer: Narrative (LP 7) ── */}
      <div className="spt-league__footer">
        <p className="spt-league__narrative">{narrative}</p>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <LeagueFormModal
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </section>
  );
}