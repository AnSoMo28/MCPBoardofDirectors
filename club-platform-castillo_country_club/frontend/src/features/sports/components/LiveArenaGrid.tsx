// ═══════════════════════════════════════════════════════════
// src/features/sports/components/LiveArenaGrid.tsx
// §B3.12 — Live Arena Grid V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Each court is a pulsing card responsive to its live status.
// Cards breathe, react to hover, reveal details progressively.
// CSS-animated cards (not Canvas) for rich content + accessibility.
// Living Protocol: 7/7
//
// Aha Moment: "Las canchas viven — cada una tiene su propio pulso."
//
// Changes from V1:
//   ✗ cn() → BEM classes
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color: X }} → data-attributes
//   ✗ animate-ping → CSS @keyframes
//   ✗ Button → native <button>
//   ✗ useReducedMotion → window.matchMedia
//   ✗ Loader2 dead import → removed
//   ✗ className prop → removed
//   ✓ data-venue-status, data-crowd-level
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive, focus-visible
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component LiveArenaGrid
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import {
  MapPin,
  Clock,
  ChevronRight,
  Eye,
} from "lucide-react";
import type {
  CourtUtilization_Contract,
  SportsCalendarItem_Contract,
} from "@/shared/mocks/contracts";
import type {
  SportType,
  SportsDashboardMode,
} from "../types";
import { SPORT_CONFIG } from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./LiveArenaGrid.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface LiveArenaGridProps {
  courtUtilization: CourtUtilization_Contract[];
  calendarItems: SportsCalendarItem_Contract[];
  onQuickBook?: (courtName: string) => void;
  onViewDetail?: (courtName: string) => void;
  ambientMode?: SportsDashboardMode;
}

interface ArenaCardData {
  courtName: string;
  sport: SportType;
  utilizationPct: number;
  peakHours: string[];
  trend: string;
  venueStatus: "available" | "busy" | "occupied" | "inactive";
  currentActivity: string | null;
  endTime: string | null;
  upcomingItems: SportsCalendarItem_Contract[];
}

type VenueStatus = ArenaCardData["venueStatus"];
type CrowdLevel = "low" | "medium" | "high" | "very_high";

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  VenueStatus,
  {
    label: string;
    pulseSpeed: string;
  }
> = {
  available: { label: "Disponible", pulseSpeed: "2.5s" },
  busy:      { label: "Ocupado pronto", pulseSpeed: "1.8s" },
  occupied:  { label: "Ocupado", pulseSpeed: "1.2s" },
  inactive:  { label: "Sin actividad", pulseSpeed: "0s" },
};

const CROWD_THRESHOLDS = { low: 25, medium: 50, high: 75 } as const;

function deriveCrowdLevel(pct: number): CrowdLevel {
  if (pct >= CROWD_THRESHOLDS.high) return "very_high";
  if (pct >= CROWD_THRESHOLDS.medium) return "high";
  if (pct >= CROWD_THRESHOLDS.low) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function currentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function buildArenaNarrative(
  stats: { total: number; available: number; busy: number; occupied: number; inactive: number },
  cards: ArenaCardData[],
): string {
  const parts: string[] = [];

  if (stats.available > 0) {
    const nextAvail = cards.find((c) => c.venueStatus === "available");
    const namePart = nextAvail ? ` — ${nextAvail.courtName} lista para reserva` : "";
    parts.push(`${stats.available} cancha${stats.available > 1 ? "s" : ""} disponible${stats.available > 1 ? "s" : ""}${namePart}`);
  }

  if (stats.occupied > 0) {
    parts.push(`${stats.occupied} en uso`);
  }

  if (stats.busy > 0) {
    parts.push(`${stats.busy} por ocuparse`);
  }

  if (stats.inactive > 0) {
    parts.push(`${stats.inactive} sin actividad hoy`);
  }

  const peakC = cards.find((c) => c.utilizationPct >= 75);
  const peakPart = peakC
    ? ` Peak: ${peakC.courtName} (${Math.round(peakC.utilizationPct)}% utilización).`
    : "";

  return `${parts.join(" · ")}.${peakPart}`;
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 PulseIndicator ──────────────────────────────────

function PulseIndicator({
  status,
  reducedMotion,
  size = 8,
}: {
  status: VenueStatus;
  reducedMotion: boolean;
  size?: number;
}) {
  const config = STATUS_CONFIG[status];
  const shouldAnimate = !reducedMotion && status !== "inactive";

  return (
    <span
      className="spt-arena__pulse"
      data-venue-status={status}
      style={{
        width: size * 2,
        height: size * 2,
        "--pulse-speed": config.pulseSpeed,
      } as React.CSSProperties}
    >
      {shouldAnimate && (
        <span className="spt-arena__pulse-ring" data-venue-status={status} />
      )}
      <span
        className="spt-arena__pulse-dot"
        data-venue-status={status}
        style={{ width: size, height: size }}
      />
    </span>
  );
}

// ── §4.2 UtilizationBar ──────────────────────────────────

function UtilizationBar({
  pct,
  ambientMode,
}: {
  pct: number;
  ambientMode: SportsDashboardMode;
}) {
  const crowd = deriveCrowdLevel(pct);

  return (
    <div className="spt-arena__util" data-mode={ambientMode}>
      <div className="spt-arena__util-header">
        <span className="spt-arena__util-label">Utilización</span>
        <span
          className="spt-arena__util-value"
          data-crowd-level={crowd}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div className="spt-arena__util-track">
        <div
          className="spt-arena__util-fill"
          data-crowd-level={crowd}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ── §4.3 CourtCard ───────────────────────────────────────

function CourtCard({
  data,
  index,
  reducedMotion,
  ambientMode,
  onQuickBook,
  onViewDetail,
}: {
  data: ArenaCardData;
  index: number;
  reducedMotion: boolean;
  ambientMode: SportsDashboardMode;
  onQuickBook?: (courtName: string) => void;
  onViewDetail?: (courtName: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const config = STATUS_CONFIG[data.venueStatus];
  const sportConfig = SPORT_CONFIG[data.sport];
  const isAvailable = data.venueStatus === "available";

  return (
    <article
      className="spt-arena__card"
      data-venue-status={data.venueStatus}
      data-mode={ambientMode}
      style={{ "--stagger-i": index } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${data.courtName}: ${config.label}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isAvailable) onQuickBook?.(data.courtName);
          else onViewDetail?.(data.courtName);
        }
      }}
    >
      {/* ── Status accent bar ── */}
      <div className="spt-arena__card-accent" data-venue-status={data.venueStatus} />

      {/* ── Header ── */}
      <div className="spt-arena__card-header">
        <div className="spt-arena__card-info">
          <span className="spt-arena__card-icon">{sportConfig?.icon ?? "🏟️"}</span>
          <div className="spt-arena__card-text">
            <p className="spt-arena__card-name">{data.courtName}</p>
            <p className="spt-arena__card-sport">{sportConfig?.label ?? data.sport}</p>
          </div>
        </div>
        <PulseIndicator
          status={data.venueStatus}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* ── Status label ── */}
      <p className="spt-arena__card-status" data-venue-status={data.venueStatus}>
        {config.label}
      </p>

      {/* ── Current activity ── */}
      {(data.venueStatus === "occupied" || data.venueStatus === "busy") &&
        data.currentActivity && (
          <div className="spt-arena__card-activity">
            <p className="spt-arena__card-activity-text">{data.currentActivity}</p>
            {data.endTime && (
              <div className="spt-arena__card-activity-time">
                <Clock className="spt-arena__card-clock-icon" />
                <span>Termina a las {data.endTime}</span>
              </div>
            )}
          </div>
        )}

      {/* ── Utilization bar ── */}
      <UtilizationBar pct={data.utilizationPct} ambientMode={ambientMode} />

      {/* ── Upcoming (hover reveal) ── */}
      <div className="spt-arena__card-upcoming" data-visible={hovered}>
        {data.upcomingItems.length > 0 ? (
          <>
            <p className="spt-arena__card-upcoming-label">Próximas reservas</p>
            {data.upcomingItems.slice(0, 3).map((item) => (
              <div key={item.id} className="spt-arena__card-upcoming-item">
                <span
                  className="spt-arena__card-upcoming-dot"
                  data-type={item.type}
                />
                <span className="spt-arena__card-upcoming-time">
                  {item.start_time}–{item.end_time}
                </span>
                <span className="spt-arena__card-upcoming-title">
                  {item.title}
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className="spt-arena__card-upcoming-empty">Sin reservas próximas</p>
        )}
      </div>

      {/* ── Action (hover reveal) ── */}
      <div className="spt-arena__card-actions" data-visible={hovered}>
        {isAvailable ? (
          <Button
            variant="unstyled"
            type="button"
            className="spt-arena__card-action spt-arena__card-action--book"
            onClick={(e) => {
              e.stopPropagation();
              onQuickBook?.(data.courtName);
            }}
          >
            Reservar ahora
            <ChevronRight className="spt-arena__card-action-icon" />
          </Button>
        ) : (
          <Button
            variant="unstyled"
            type="button"
            className="spt-arena__card-action spt-arena__card-action--view"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail?.(data.courtName);
            }}
          >
            <Eye className="spt-arena__card-action-icon" />
            Ver detalle
          </Button>
        )}
      </div>
    </article>
  );
}

// ── §4.4 ArenaSummary ────────────────────────────────────

function ArenaSummary({
  stats,
  reducedMotion,
}: {
  stats: { total: number; available: number; busy: number; occupied: number };
  reducedMotion: boolean;
}) {
  return (
    <div className="spt-arena__summary">
      <div className="spt-arena__summary-item">
        <PulseIndicator status="available" reducedMotion={reducedMotion} size={6} />
        <span className="spt-arena__summary-text">
          {stats.available} disponible{stats.available !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="spt-arena__summary-item">
        <PulseIndicator status="busy" reducedMotion={reducedMotion} size={6} />
        <span className="spt-arena__summary-text">
          {stats.busy} por ocuparse
        </span>
      </div>
      <div className="spt-arena__summary-item">
        <PulseIndicator status="occupied" reducedMotion={reducedMotion} size={6} />
        <span className="spt-arena__summary-text">
          {stats.occupied} ocupado{stats.occupied !== 1 ? "s" : ""}
        </span>
      </div>
      <span className="spt-arena__summary-total">
        {stats.total} espacios monitoreados
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function LiveArenaGrid({
  courtUtilization,
  calendarItems,
  onQuickBook,
  onViewDetail,
  ambientMode = "calm",
}: LiveArenaGridProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  // ── §5.1 — Build arena data ───────────────────────────
  const arenaData = useMemo((): ArenaCardData[] => {
    const today = todayISO();
    const now = currentHHMM();
    const nowMin = timeToMinutes(now);

    const todayItems = (calendarItems ?? []).filter(
      (item) => item.date === today,
    );

    return (courtUtilization ?? []).map((court) => {
      const courtItems = todayItems
        .filter((item) => item.location === court.court_name)
        .sort(
          (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
        );

      const currentItems = courtItems.filter((item) => {
        const s = timeToMinutes(item.start_time);
        const e = timeToMinutes(item.end_time);
        return nowMin >= s && nowMin < e;
      });

      const upcomingItems = courtItems.filter(
        (item) => timeToMinutes(item.start_time) > nowMin,
      );

      const busySoonItems = courtItems.filter((item) => {
        const s = timeToMinutes(item.start_time);
        return s > nowMin && s <= nowMin + 30;
      });

      let venueStatus: VenueStatus;
      let currentActivity: string | null = null;
      let endTime: string | null = null;

      if (currentItems.length > 0) {
        venueStatus = "occupied";
        currentActivity = currentItems[0].title;
        endTime = currentItems[0].end_time;
      } else if (busySoonItems.length > 0) {
        venueStatus = "busy";
        currentActivity = `A las ${busySoonItems[0].start_time}: ${busySoonItems[0].title}`;
        endTime = busySoonItems[0].end_time;
      } else if (courtItems.length > 0) {
        venueStatus = "available";
      } else {
        venueStatus = "inactive";
      }

      return {
        courtName: court.court_name,
        sport: court.sport as SportType,
        utilizationPct: court.utilization_pct,
        peakHours: court.peak_hours,
        trend: court.trend,
        venueStatus,
        currentActivity,
        endTime,
        upcomingItems,
      };
    });
  }, [courtUtilization, calendarItems]);

  // ── §5.2 — Stats ──────────────────────────────────────
  const stats = useMemo(() => {
    const total = arenaData.length;
    const available = arenaData.filter((a) => a.venueStatus === "available").length;
    const occupied = arenaData.filter((a) => a.venueStatus === "occupied").length;
    const busy = arenaData.filter((a) => a.venueStatus === "busy").length;
    const inactive = arenaData.filter((a) => a.venueStatus === "inactive").length;
    return { total, available, occupied, busy, inactive };
  }, [arenaData]);

  // ── §5.3 — Narrative ──────────────────────────────────
  const narrative = useMemo(
    () => buildArenaNarrative(stats, arenaData),
    [stats, arenaData],
  );

  // ── §5.4 — Degraded ──────────────────────────────────
  if (arenaData.length === 0) {
    return (
      <section
        className="spt-arena"
        data-mode={ambientMode}
        role="region"
        aria-label="Arena en vivo"
      >
        <EmptyState
          icon={<MapPin className="w-5 h-5" />}
          title="Sin canchas monitoreadas"
          description="Cuando haya canchas con reservas activas, aparecerán aquí como un radar en vivo mostrando disponibilidad, utilización y estado actual."
          compact
        />
      </section>
    );
  }

  // ── §5.5 — Render ─────────────────────────────────────
  return (
    <section
      className="spt-arena"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="region"
      aria-label={narrative}
    >
      {/* ── Summary ── */}
      <ArenaSummary stats={stats} reducedMotion={rm} />

      {/* ── Grid ── */}
      <div className="spt-arena__grid" role="list">
        {arenaData.map((data, i) => (
          <div key={data.courtName} role="listitem">
            <CourtCard
              data={data}
              index={i}
              reducedMotion={rm}
              ambientMode={ambientMode}
              onQuickBook={onQuickBook}
              onViewDetail={onViewDetail}
            />
          </div>
        ))}
      </div>

      {/* ── Narrative ── */}
      <div className="spt-arena__footer">
        <p className="spt-arena__narrative">{narrative}</p>
      </div>
    </section>
  );
}