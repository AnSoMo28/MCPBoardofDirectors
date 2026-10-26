// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsCalendar.tsx
// §B4.16 — Sports Calendar V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// Unified 7-day timeline combining reservations, tournaments,
// classes, coaching, leagues. Color-coded by type, conflict
// badges, CR weather overlay, responsive grid.
// Data-driven via props — no mock data.
// Living Protocol: 7/7
//
// VERIFIED TYPES:
//   SportsCalendarItem_Contract → { id, type, title, sport,
//     date, start_time, end_time, location, participants,
//     status, is_conflict, conflict_reason, weather_risk,
//     entity_id }
//   CALENDAR_ITEM_TYPE_CONFIG → { label, color, borderColor, icon }
//   CR_WEATHER_RISK → Record<number, { label, level, color }>
//   CalendarItemType → 5 values (reservation → league)
//   SPORT_CONFIG → { label, icon, color, ... }
//   SportType → enum
//
// CHANGES FROM V1:
//   ✗ cn() ×5 → BEM
//   ✗ Tailwind ×60 → BEM CSS
//   ✗ style={{ borderLeftColor }} → data-type
//   ✗ Button (dead) → removed
//   ✗ className → removed
//   ✓ data-mode, data-type, data-is-today, data-weather,
//     data-has-conflict, data-weather-badge
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsCalendar
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { Cloud, Sun, CloudRain, AlertTriangle } from "lucide-react";
import type { SportsDashboardMode, SportType } from "../types";
import { CALENDAR_ITEM_TYPE_CONFIG, CR_WEATHER_RISK, SPORT_CONFIG } from "../types";
import type { SportsCalendarItem_Contract } from "@/shared/mocks/contracts";
import "./SportsCalendar.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SportsCalendarProps {
  items: SportsCalendarItem_Contract[];
  conflictCount: number;
  dateRange: { from: string; to: string };
  ambientMode?: SportsDashboardMode;
}

interface DayColumn {
  date: string;
  dayName: string;
  dayNum: number;
  monthName: string;
  isToday: boolean;
  weatherRisk: string | null;
  items: SportsCalendarItem_Contract[];
  conflictItems: SportsCalendarItem_Contract[];
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

const DAY_NAMES_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES_ES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function dateToInfo(dateStr: string): {
  dayName: string;
  dayNum: number;
  monthName: string;
  isToday: boolean;
} {
  const parts = dateStr.split("-");
  const dt = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2]),
  );
  return {
    dayName: DAY_NAMES_ES[dt.getDay()],
    dayNum: dt.getDate(),
    monthName: MONTH_NAMES_ES[dt.getMonth() + 1],
    isToday: dateStr === todayISO(),
  };
}

function getWeatherForDate(dateStr: string): string | null {
  const parts = dateStr.split("-");
  const month = parseInt(parts[1]);
  return CR_WEATHER_RISK[month]?.level ?? null;
}

function getWeatherLabel(dateStr: string): string {
  const parts = dateStr.split("-");
  const month = parseInt(parts[1]);
  const risk = CR_WEATHER_RISK[month];
  if (!risk) return "N/A";
  return risk.label;
}

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
}

function buildCalendarNarrative(
  totalItems: number,
  conflictCount: number,
  daysWithItems: number,
): string {
  return (
    `Calendario deportivo: ${totalItems} actividad${totalItems !== 1 ? "es" : ""} ` +
    `en ${daysWithItems} día${daysWithItems !== 1 ? "s" : ""}. ` +
    (conflictCount > 0
      ? `${conflictCount} conflicto${conflictCount !== 1 ? "s" : ""} detectado${conflictCount !== 1 ? "s" : ""}.`
      : "Sin conflictos.")
  );
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 CalendarItemCard ────────────────────────────────

function CalendarItemCard({
  item,
}: {
  item: SportsCalendarItem_Contract;
}) {
  const sportCfg = SPORT_CONFIG[item.sport as SportType];

  return (
    <div
      className="spt-cal__item"
      data-type={item.type}
      data-has-conflict={item.is_conflict ? "true" : undefined}
    >
      {/* Header: time + badges */}
      <div className="spt-cal__item-header">
        <span className="spt-cal__item-time" data-type={item.type}>
          {item.start_time}–{item.end_time}
        </span>
        <span className="spt-cal__item-sport-icon">
          {sportCfg?.icon}
        </span>
        {item.is_conflict && (
          <span
            className="spt-cal__item-conflict-icon"
            title={item.conflict_reason ?? "Conflicto"}
          >
            <AlertTriangle className="spt-cal__icon-sm" />
          </span>
        )}
        {item.weather_risk === "high" && (
          <span className="spt-cal__item-weather-icon" data-weather="high" title="Riesgo climático alto">
            <CloudRain className="spt-cal__icon-sm" />
          </span>
        )}
        {item.weather_risk === "medium" && (
          <span className="spt-cal__item-weather-icon" data-weather="medium" title="Riesgo climático medio">
            <Cloud className="spt-cal__icon-sm" />
          </span>
        )}
      </div>

      {/* Title */}
      <p className="spt-cal__item-title">{item.title}</p>

      {/* Location + participants */}
      <div className="spt-cal__item-meta">
        <span className="spt-cal__item-location">{item.location}</span>
        {item.participants != null && item.participants > 0 && (
          <>
            <span className="spt-cal__item-dot">·</span>
            <span>{item.participants} part.</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── §3.2 DayColumnView ───────────────────────────────────

function DayColumnView({ day }: { day: DayColumn }) {
  const weather = getWeatherForDate(day.date);
  const weatherLabel = getWeatherLabel(day.date);

  return (
    <div
      className="spt-cal__day"
      data-is-today={day.isToday ? "true" : undefined}
    >
      {/* Day header */}
      <div className="spt-cal__day-header" data-is-today={day.isToday ? "true" : undefined}>
        <div className="spt-cal__day-header-row">
          <div className="spt-cal__day-header-left">
            <span className="spt-cal__day-name" data-is-today={day.isToday ? "true" : undefined}>
              {day.dayName}
            </span>
            <span className="spt-cal__day-num" data-is-today={day.isToday ? "true" : undefined}>
              {day.dayNum}
            </span>
            <span className="spt-cal__day-month">{day.monthName}</span>
          </div>

          {/* Weather */}
          <div className="spt-cal__day-weather" title={`Riesgo climático: ${weatherLabel} (${weather ?? "N/A"})`} data-weather={weather ?? undefined}>
            {weather === "low" && <Sun className="spt-cal__icon-sm" />}
            {weather === "medium" && <Cloud className="spt-cal__icon-sm" />}
            {weather === "high" && <CloudRain className="spt-cal__icon-sm" />}
          </div>
        </div>

        {/* Item count */}
        {day.items.length > 0 && (
          <div className="spt-cal__day-count">
            <span className="spt-cal__day-count-text">
              {day.items.length} actividad{day.items.length !== 1 ? "es" : ""}
            </span>
            {day.conflictItems.length > 0 && (
              <span className="spt-cal__day-conflict-count">
                · {day.conflictItems.length} conflicto{day.conflictItems.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="spt-cal__day-body">
        {day.items.length > 0 ? (
          day.items.map((item) => (
            <CalendarItemCard key={item.id} item={item} />
          ))
        ) : (
          <div className="spt-cal__day-empty">
            <p className="spt-cal__day-empty-text">Sin actividades</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── §3.3 Filters ─────────────────────────────────────────

function Filters({
  sportFilter,
  typeFilter,
  availableSports,
  onSportChange,
  onTypeChange,
}: {
  sportFilter: string;
  typeFilter: string;
  availableSports: string[];
  onSportChange: (v: string) => void;
  onTypeChange: (v: string) => void;
}) {
  return (
    <div className="spt-cal__filters">
      <select
        className="spt-cal__select"
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
        className="spt-cal__select"
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="all">Todos los tipos</option>
        <option value="reservation">Reservas</option>
        <option value="tournament">Torneos</option>
        <option value="class">Clases</option>
        <option value="coaching">Coaching</option>
        <option value="league">Ligas</option>
      </select>
    </div>
  );
}

// ── §3.4 WeatherLegend ───────────────────────────────────

function WeatherLegend() {
  return (
    <div className="spt-cal__weather-legend">
      <span className="spt-cal__weather-legend-label">Riesgo climático:</span>
      <div className="spt-cal__weather-legend-item">
        <Sun className="spt-cal__icon-sm" />
        <span>Bajo</span>
      </div>
      <div className="spt-cal__weather-legend-item">
        <Cloud className="spt-cal__icon-sm" />
        <span>Medio</span>
      </div>
      <div className="spt-cal__weather-legend-item">
        <CloudRain className="spt-cal__icon-sm" />
        <span>Alto</span>
      </div>
      <span className="spt-cal__weather-legend-note">Patrón estacional CR</span>
    </div>
  );
}

// ── §3.5 TypeLegend ──────────────────────────────────────

function TypeLegend() {
  return (
    <div className="spt-cal__type-legend">
      {Object.entries(CALENDAR_ITEM_TYPE_CONFIG).map(([key, cfg]) => (
        <div key={key} className="spt-cal__type-legend-item">
          <span
            className="spt-cal__type-legend-swatch"
            style={{ backgroundColor: cfg.borderColor }}
          />
          <span>{cfg.label}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsCalendar({
  items,
  conflictCount,
  dateRange,
  ambientMode = "calm",
}: SportsCalendarProps) {
  const [sportFilter, setSportFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ── Build day columns ──
  const dayColumns = useMemo((): DayColumn[] => {
    const days: DayColumn[] = [];
    const start = new Date(dateRange.from + "T00:00:00");
    const end = new Date(dateRange.to + "T00:00:00");

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      const info = dateToInfo(dateStr);

      const dayItems = (items ?? [])
        .filter((item) => item.date === dateStr)
        .filter(
          (item) => sportFilter === "all" || item.sport === sportFilter,
        )
        .filter(
          (item) => typeFilter === "all" || item.type === typeFilter,
        )
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      days.push({
        date: dateStr,
        ...info,
        weatherRisk: getWeatherForDate(dateStr),
        items: dayItems,
        conflictItems: dayItems.filter((i) => i.is_conflict),
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [items, dateRange, sportFilter, typeFilter]);

  // ── Available sports ──
  const availableSports = useMemo(() => {
    const sports = new Set<string>();
    for (const item of items ?? []) {
      sports.add(item.sport);
    }
    return Array.from(sports).sort();
  }, [items]);

  // ── Stats ──
  const totalItems = items?.length ?? 0;
  const daysWithItems = dayColumns.filter((d) => d.items.length > 0).length;

  // ── Narrative (LP 7) ──
  const narrative = useMemo(
    () => buildCalendarNarrative(totalItems, conflictCount, daysWithItems),
    [totalItems, conflictCount, daysWithItems],
  );

  // ── Render ──
  return (
    <section
      className="spt-cal"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-cal__header">
        <div className="spt-cal__header-left">
          <h3 className="spt-cal__title">📅 Calendario Deportivo</h3>
          <span className="spt-cal__header-stat">
            {totalItems} actividades
          </span>
          {conflictCount > 0 && (
            <span className="spt-cal__header-conflict">
              <AlertTriangle className="spt-cal__icon-xs" />
              {conflictCount} conflicto{conflictCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <Filters
          sportFilter={sportFilter}
          typeFilter={typeFilter}
          availableSports={availableSports}
          onSportChange={setSportFilter}
          onTypeChange={setTypeFilter}
        />
      </div>

      {/* ── Weather Legend ── */}
      <WeatherLegend />

      {/* ── Calendar Grid ── */}
      <div className="spt-cal__grid-wrapper">
        <div className="spt-cal__grid">
          {dayColumns.map((day) => (
            <DayColumnView key={day.date} day={day} />
          ))}
        </div>
      </div>

      {/* ── Type Legend + Narrative (LP 7) ── */}
      <div className="spt-cal__footer">
        <TypeLegend />
        <p className="spt-cal__narrative">{narrative}</p>
      </div>
    </section>
  );
}