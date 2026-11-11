// ═══════════════════════════════════════════════════════════
// src/features/sports/components/CoachingPanel.tsx
// §B4.9 — Coaching Panel V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Coaching directory + session management. Coach cards with
// stats, session list with focus areas. Toggle views.
// Data-driven via props — no mock data.
// Living Protocol: 7/7
//
// VERIFIED TYPES:
//   SPORT_CONFIG → { label, icon, color, ... }
//   SKILL_LEVEL_CONFIG → { label, color, icon }
//   SportType → enum
//   SkillLevel → enum
//   EmptyState → @/shared/components/ui/EmptyState
//   CoachingFormModal → props: onClose, onSuccess
//
// CHANGES FROM V1:
//   ✗ cn() ×4 → BEM
//   ✗ Tailwind ×50 → BEM CSS
//   ✗ style={{ color/backgroundColor }} → data-attributes
//   ✗ MOCK_COACHES + MOCK_SESSIONS → coaches + sessions props
//   ✗ Button → BEM button
//   ✗ showToast → onSessionCreated callback
//   ✗ className → removed
//   ✗ Loader2 (dead) → removed
//   ✗ Star (dead) → removed
//   ✗ cn (dead) → removed
//   ✗ EmptyState path → @/shared/components/ui/EmptyState
//   ✓ data-mode, data-sport, data-skill-level, data-active-view, data-stat-type
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component CoachingPanel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  Users,
  CalendarDays,
  Clock,
  MapPin,
  Target,
} from "lucide-react";
import type { SportsDashboardMode, SportType, SkillLevel } from "../types";
import { SPORT_CONFIG, SKILL_LEVEL_CONFIG } from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { CoachingFormModal } from "./CoachingFormModal";
import "./CoachingPanel.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface CoachProfile {
  name: string;
  sports: string[];
  sessionCount: number;
  uniqueMembers: number;
  avgPerMember: number;
  nextSessionDate: string | null;
}

export interface CoachingSession {
  id: string;
  sport: string;
  coach_name: string;
  member_name: string;
  skill_level: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  focus_areas: string[];
  status: string;
}

export interface CoachingPanelProps {
  coaches: CoachProfile[];
  sessions: CoachingSession[];
  isLoading?: boolean;
  ambientMode?: SportsDashboardMode;
  onSessionCreated?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function buildCoachingNarrative(
  coachCount: number,
  totalSessions: number,
  uniqueMembers: number,
): string {
  return (
    `Coaching deportivo: ${coachCount} coach${coachCount !== 1 ? "es" : ""} ` +
    `con ${totalSessions} sesiones totales. ` +
    `${uniqueMembers} socio${uniqueMembers !== 1 ? "s" : ""} únic${uniqueMembers !== 1 ? "os" : "o"} en coaching.`
  );
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 QuickStats ──────────────────────────────────────

function QuickStats({
  coachCount,
  totalSessions,
  uniqueMembers,
}: {
  coachCount: number;
  totalSessions: number;
  uniqueMembers: number;
}) {
  return (
    <div className="spt-coach__quick-stats">
      <span className="spt-coach__quick-stat">
        👨‍🏫 <strong>{coachCount}</strong> coaches
      </span>
      <span className="spt-coach__quick-stat">
        📋 <strong>{totalSessions}</strong> sesiones totales
      </span>
      <span className="spt-coach__quick-stat">
        👤 <strong>{uniqueMembers}</strong> socios únicos
      </span>
    </div>
  );
}

// ── §3.2 ViewToggle ──────────────────────────────────────

function ViewToggle({
  activeView,
  onViewChange,
}: {
  activeView: "coaches" | "sessions";
  onViewChange: (view: "coaches" | "sessions") => void;
}) {
  return (
    <div className="spt-coach__toggle" role="tablist" aria-label="Vista de coaching">
      {(["coaches", "sessions"] as const).map((view) => (
        <Button
          variant="unstyled"
          key={view}
          type="button"
          role="tab"
          aria-selected={activeView === view}
          className="spt-coach__toggle-btn"
          data-active={activeView === view}
          onClick={() => onViewChange(view)}
        >
          {view === "coaches" ? "👨‍🏫 Coaches" : "📋 Sesiones"}
        </Button>
      ))}
    </div>
  );
}

// ── §3.3 CoachCard ───────────────────────────────────────

function CoachCard({
  coach,
  index,
}: {
  coach: CoachProfile;
  index: number;
}) {
  const primarySport = coach.sports[0] as SportType;
  return (
    <div
      className="spt-coach__coach-card"
      data-sport={primarySport}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      {/* Avatar + Name */}
      <div className="spt-coach__coach-header">
        <div className="spt-coach__coach-avatar" data-sport={primarySport}>
          {getInitials(coach.name)}
        </div>
        <div className="spt-coach__coach-name-area">
          <h4 className="spt-coach__coach-name">{coach.name}</h4>
          <div className="spt-coach__coach-sports">
            {coach.sports.map((s) => {
              const cfg = SPORT_CONFIG[s as SportType];
              return (
                <span key={s} className="spt-coach__coach-sport-tag">
                  {cfg?.icon} {cfg?.label ?? s}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="spt-coach__coach-stats">
        <div className="spt-coach__coach-stat">
          <p className="spt-coach__coach-stat-value" data-stat-type="sessions">
            {coach.sessionCount}
          </p>
          <p className="spt-coach__coach-stat-label">sesiones</p>
        </div>
        <div className="spt-coach__coach-stat">
          <p className="spt-coach__coach-stat-value" data-stat-type="members">
            {coach.uniqueMembers}
          </p>
          <p className="spt-coach__coach-stat-label">socios</p>
        </div>
        <div className="spt-coach__coach-stat">
          <p className="spt-coach__coach-stat-value" data-stat-type="avg">
            {coach.avgPerMember}
          </p>
          <p className="spt-coach__coach-stat-label">prom/socio</p>
        </div>
      </div>

      {/* Next session */}
      {coach.nextSessionDate && (
        <div className="spt-coach__coach-next">
          <CalendarDays className="spt-coach__coach-next-icon" />
          <span>Próxima sesión: {coach.nextSessionDate}</span>
        </div>
      )}
    </div>
  );
}

// ── §3.4 SessionCard ─────────────────────────────────────

function SessionCard({
  session,
  index,
}: {
  session: CoachingSession;
  index: number;
}) {
  const sportCfg = SPORT_CONFIG[session.sport as SportType];
  const skillCfg = SKILL_LEVEL_CONFIG[session.skill_level as SkillLevel];

  return (
    <div
      className="spt-coach__session-card"
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      {/* Sport icon */}
      <div className="spt-coach__session-icon" data-sport={session.sport}>
        <span>{sportCfg?.icon ?? "🎾"}</span>
      </div>

      {/* Body */}
      <div className="spt-coach__session-body">
        {/* Coach → Member */}
        <div className="spt-coach__session-pair">
          <span className="spt-coach__session-coach">{session.coach_name}</span>
          <span className="spt-coach__session-arrow">→</span>
          <span className="spt-coach__session-member">{session.member_name}</span>
        </div>

        {/* Meta */}
        <div className="spt-coach__session-meta">
          <span className="spt-coach__session-meta-item">
            <CalendarDays className="spt-coach__session-meta-icon" />
            {session.date}
          </span>
          <span className="spt-coach__session-meta-item">
            <Clock className="spt-coach__session-meta-icon" />
            {session.start_time}–{session.end_time}
          </span>
          <span className="spt-coach__session-meta-item">
            <MapPin className="spt-coach__session-meta-icon" />
            {session.location}
          </span>
        </div>

        {/* Badges: skill level + focus areas */}
        <div className="spt-coach__session-badges">
          <span
            className="spt-coach__session-skill-badge"
            data-skill-level={session.skill_level}
          >
            {skillCfg?.label ?? session.skill_level}
          </span>
          {session.focus_areas.map((area) => (
            <span key={area} className="spt-coach__session-focus-tag">
              <Target className="spt-coach__session-focus-icon" />
              {area}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── §3.5 ShimmerSkeleton ─────────────────────────────────

function ShimmerSkeleton() {
  return (
    <div className="spt-coach__skeleton" role="status" aria-label="Cargando coaching">
      <div className="spt-coach__skeleton-block spt-coach__skeleton-block--stats" />
      <div className="spt-coach__skeleton-grid">
        <div className="spt-coach__skeleton-block spt-coach__skeleton-block--card" />
        <div className="spt-coach__skeleton-block spt-coach__skeleton-block--card" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function CoachingPanel({
  coaches,
  sessions,
  isLoading = false,
  ambientMode = "calm",
  onSessionCreated,
}: CoachingPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [activeView, setActiveView] = useState<"coaches" | "sessions">("coaches");

  // ── Stats ──
  const totalSessions = useMemo(
    () => coaches.reduce((s, c) => s + c.sessionCount, 0),
    [coaches],
  );

  const uniqueMembers = useMemo(() => {
    const members = new Set(sessions.map((s) => s.member_name));
    return members.size;
  }, [sessions]);

  // ── Narrative (LP 7) ──
  const narrative = useMemo(
    () => buildCoachingNarrative(coaches.length, totalSessions, uniqueMembers),
    [coaches.length, totalSessions, uniqueMembers],
  );

  // ── Handlers ──
  const handleFormClose = useCallback(() => setShowForm(false), []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    onSessionCreated?.();
  }, [onSessionCreated]);

  // ── Degraded: loading ──
  if (isLoading) {
    return (
      <section
        className="spt-coach"
        data-mode={ambientMode}
        role="region"
        aria-label="Cargando coaching"
      >
        <div className="spt-coach__header">
          <h3 className="spt-coach__title">🎾 Coaching Deportivo</h3>
        </div>
        <ShimmerSkeleton />
      </section>
    );
  }

  // ── Degraded: empty ──
  if (coaches.length === 0 && sessions.length === 0) {
    return (
      <section
        className="spt-coach"
        data-mode={ambientMode}
        role="region"
        aria-label="Sin coaching"
      >
        <div className="spt-coach__header">
          <h3 className="spt-coach__title">🎾 Coaching Deportivo</h3>
        </div>
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Sin coaching registrado"
          description="Aún no hay coaches ni sesiones en el sistema."
          compact
        />
      </section>
    );
  }

  // ── Render ──
  return (
    <section
      className="spt-coach"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-coach__header">
        <h3 className="spt-coach__title">🎾 Coaching Deportivo</h3>
        <Button
          variant="unstyled"
          type="button"
          className="spt-coach__new-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus className="spt-coach__new-btn-icon" />
          Nueva Sesión
        </Button>
      </div>

      {/* ── Quick Stats ── */}
      <QuickStats
        coachCount={coaches.length}
        totalSessions={totalSessions}
        uniqueMembers={uniqueMembers}
      />

      {/* ── View Toggle ── */}
      <ViewToggle activeView={activeView} onViewChange={setActiveView} />

      {/* ── Content ── */}
      {activeView === "coaches" ? (
        coaches.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Sin coaches"
            description="No hay coaches registrados."
            compact
          />
        ) : (
          <div className="spt-coach__coach-grid">
            {coaches.map((coach, i) => (
              <CoachCard key={coach.name} coach={coach} index={i} />
            ))}
          </div>
        )
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-6 h-6" />}
          title="Sin sesiones"
          description="No hay sesiones de coaching programadas."
          compact
        />
      ) : (
        <div className="spt-coach__session-list">
          {sessions.map((session, i) => (
            <SessionCard key={session.id} session={session} index={i} />
          ))}
        </div>
      )}

      {/* ── Footer: Narrative (LP 7) ── */}
      <div className="spt-coach__footer">
        <p className="spt-coach__narrative">{narrative}</p>
      </div>

      {/* ── Modal ── */}
      {showForm && (
        <CoachingFormModal
          onClose={handleFormClose}
          onSuccess={handleFormSuccess} coaches={[]}        />
      )}
    </section>
  );
}