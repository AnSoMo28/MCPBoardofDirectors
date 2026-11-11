// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsDecisionStage.tsx
// §B3.4 — Sports Decision Stage
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// 5-mode view system replacing generic DetailTabs.
// StageNav (selector) + StageContent (lazy renderer).
// Only the active stage mounts — no off-screen rendering.
// Living Protocol: 7/7
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsDecisionStage
// ═══════════════════════════════════════════════════════════

import {
  Target,
  TrendingUp,
  Trophy,
  Users,
  BarChart3,
} from "lucide-react";
import type {
  SportsDashboardMode,
  SportsDecisionStageMode,
} from "../types";
import { showToast } from "@/shared/components/ui/Toast";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import type {
  SportsAnalytics_Contract,
  SportsCalendarItem_Contract,
} from "@/shared/mocks/contracts";

import { LiveArenaGrid } from "./LiveArenaGrid";
import { CourtHeatmap } from "./CourtHeatmap";
import { SportsCalendar } from "./SportsCalendar";
import { CourtBookingPanel } from "./CourtBookingPanel";
import { TournamentPanel } from "./TournamentPanel";
import { BracketView } from "./BracketView";
import { LeaguePanel } from "./LeaguePanel";
import { ClassesPanel } from "./ClassesPanel";
import { CoachingPanel } from "./CoachingPanel";
import { EquipmentPanel } from "./EquipmentPanel";
import { SportsIntelligencePanel } from "./SportsIntelligencePanel";
import { SkillProgression } from "./SkillProgression";

import "./SportsDecisionStage.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SportsDecisionStageProps {
  stageMode: SportsDecisionStageMode;
  ambientMode: SportsDashboardMode;
  byMode: Record<SportsDecisionStageMode, number>;
  analytics: SportsAnalytics_Contract | null;
  calendar: SportsCalendarItem_Contract[] | null;
  onStageChange: (mode: SportsDecisionStageMode) => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const STAGE_ITEMS: Array<{
  id: SportsDecisionStageMode;
  label: string;
  icon: typeof Target;
  description: string;
}> = [
  { id: "arena", label: "La Arena", icon: Target, description: "Vistas en vivo, canchas" },
  { id: "trajectory", label: "La Trayectoria", icon: TrendingUp, description: "Progresión, coaching" },
  { id: "competition", label: "La Competencia", icon: Trophy, description: "Torneos, brackets" },
  { id: "team", label: "El Equipo", icon: Users, description: "Social, parejas" },
  { id: "business", label: "El Negocio", icon: BarChart3, description: "Revenue, clases" },
];

const DEFAULT_TOURNAMENT_METRICS = {
  total_tournaments: 0,
  by_status: {},
  avg_participation_rate: 0,
  total_revenue: 0,
  upcoming_count: 0,
  in_progress_count: 0,
  completed_count: 0,
  avg_entry_fee: 0,
};

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function futureDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════
// §4 — STAGE NAV (Living Protocol 2: Reacción + 4: Intención)
// ═══════════════════════════════════════════════════════════

function StageNav({
  active,
  byMode,
  onChange,
}: {
  active: SportsDecisionStageMode;
  byMode: Record<SportsDecisionStageMode, number>;
  onChange: (mode: SportsDecisionStageMode) => void;
}) {
  return (
    <nav
      className="spt-stage__nav"
      role="tablist"
      aria-label="Modos de vista deportiva"
    >
      {STAGE_ITEMS.map((item) => {
        const count = byMode[item.id];
        return (
          <Button
            variant="unstyled"
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`spt-stage-panel-${item.id}`}
            className="spt-stage__tab"
            data-active={active === item.id}
            onClick={() => onChange(item.id)}
            title={item.description}
          >
            <item.icon className="spt-stage__tab-icon" />
            <span className="spt-stage__tab-label">{item.label}</span>
            {count > 0 && (
              <span className="spt-stage__tab-count">{count}</span>
            )}
          </Button>
        );
      })}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — STAGE CONTENT RENDERERS
// ═══════════════════════════════════════════════════════════

function ArenaContent({
  analytics,
  calendar,
}: {
  analytics: SportsAnalytics_Contract | null;
  calendar: SportsCalendarItem_Contract[];
}) {
  const conflictCount = calendar.filter((c) => c.is_conflict).length;

  return (
    <div className="spt-stage__panel-content">
      <LiveArenaGrid
        courtUtilization={analytics?.court_utilization ?? []}
        calendarItems={calendar}
        onQuickBook={(courtName: string) =>
          showToast({ type: "info", message: `Reserva rápida — ${courtName}...` })
        }
      />
      <CourtHeatmap courtUtilization={analytics?.court_utilization ?? []} />
      <SportsCalendar
        items={calendar}
        conflictCount={conflictCount}
        dateRange={{ from: todayISO(), to: futureDateISO(7) }}
      />
      <CourtBookingPanel courtUtilization={analytics?.court_utilization ?? []} reservations={[]} />
    </div>
  );
}

function TrajectoryContent() {
  return (
    <div className="spt-stage__panel-content">
      <SkillProgression profile={null} />
      <CoachingPanel coaches={[]} sessions={[]} />
    </div>
  );
}

function CompetitionContent({
  analytics,
}: {
  analytics: SportsAnalytics_Contract | null;
}) {
  return (
    <div className="spt-stage__panel-content">
      <TournamentPanel
        tournamentMetrics={analytics?.tournament_metrics ?? DEFAULT_TOURNAMENT_METRICS}
        tournaments={[]}
      />
      <BracketView tournamentName="Copa Castillo Tennis 2026" matches={[]} />
      <LeaguePanel leagues={[]} />
    </div>
  );
}

function TeamContent() {
  return (
    <div className="spt-stage__panel-content">
      <EmptyState
        icon={<Users className="w-6 h-6" />}
        title="El Equipo"
        description="Próximamente: grafo social de deportes, formación de equipos y parejas de dobles."
      />
    </div>
  );
}

function BusinessContent({
  analytics,
}: {
  analytics: SportsAnalytics_Contract | null;
}) {
  return (
    <div className="spt-stage__panel-content">
      <ClassesPanel classes={analytics?.class_enrollment ?? []} />
      <EquipmentPanel equipment={[]} equipmentHealth={analytics?.equipment_health ?? []} />
      <SportsIntelligencePanel analytics={analytics} />
    </div>
  );
}

function renderStageContent(
  mode: SportsDecisionStageMode,
  analytics: SportsAnalytics_Contract | null,
  calendar: SportsCalendarItem_Contract[],
) {
  switch (mode) {
    case "arena":
      return <ArenaContent analytics={analytics} calendar={calendar} />;
    case "trajectory":
      return <TrajectoryContent />;
    case "competition":
      return <CompetitionContent analytics={analytics} />;
    case "team":
      return <TeamContent />;
    case "business":
      return <BusinessContent analytics={analytics} />;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// §6 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsDecisionStage({
  stageMode,
  ambientMode,
  byMode,
  analytics,
  calendar,
  onStageChange,
}: SportsDecisionStageProps) {
  return (
    <div
      className="spt-stage"
      data-mode={ambientMode}
    >
      <StageNav
        active={stageMode}
        byMode={byMode}
        onChange={onStageChange}
      />
      <div
        className="spt-stage__panel"
        id={`spt-stage-panel-${stageMode}`}
        role="tabpanel"
        aria-label={`Vista: ${STAGE_ITEMS.find((s) => s.id === stageMode)?.label ?? stageMode}`}
      >
        {renderStageContent(stageMode, analytics, calendar ?? [])}
      </div>
    </div>
  );
}