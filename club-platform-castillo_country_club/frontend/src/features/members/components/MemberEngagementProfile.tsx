/**
 * MemberEngagementProfile — Activity Intelligence Portrait
 * Phase 30 — Block 4.6: How They Engage
 *
 * Heatmap cells glow with activity intensity.
 * Domain bars show trend context.
 * Streaks pulse with flame energy.
 * Venues ranked by affinity.
 *
 * The engagement profile doesn't just count activities —
 * it reveals PATTERNS, RHYTHMS, and PREFERENCES.
 */

import { useMemo } from "react";
import {
  Flame,
  MapPin,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useMemberActivitySummary } from "../hooks/useMember360MCP";
import type { MemberTemperature, EngagementDNAChannel, ActivityDomain } from "../types";
import {
  getDomainLabel,
  getDomainIcon,
  getDomainColor,
} from "../types";

import "./MemberEngagementProfile.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MemberEngagementProfileProps {
  memberId: string;
  temperature?: MemberTemperature;
  dna?: EngagementDNAChannel[];
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOURS = [7, 9, 11, 14, 16, 18, 20];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getHeatColor(count: number, max: number): string {
  if (count === 0) return "var(--color-surface-3)";
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25)
    return "color-mix(in srgb, var(--color-teal-400) 20%, transparent)";
  if (ratio <= 0.5)
    return "color-mix(in srgb, var(--color-teal-400) 40%, transparent)";
  if (ratio <= 0.75)
    return "color-mix(in srgb, var(--color-teal-400) 65%, transparent)";
  return "color-mix(in srgb, var(--color-teal-400) 90%, transparent)";
}

function getHeatGlow(count: number, max: number): string {
  if (count === 0) return "none";
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.5) return "none";
  const opacity = ratio > 0.75 ? 0.35 : 0.2;
  return `0 0 6px color-mix(in srgb, var(--color-teal-400) ${opacity * 100}%, transparent)`;
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function KPIBox({
  label,
  value,
  sublabel,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: typeof Activity;
  color: string;
}) {
  return (
    <div className="glass-m360-engagement__kpi">
      <div className="glass-m360-engagement__kpi-header">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="glass-m360-engagement__kpi-label">
          {label}
        </span>
      </div>
      <p className="glass-m360-engagement__kpi-value">{value}</p>
      {sublabel && (
        <p className="glass-m360-engagement__kpi-sub">{sublabel}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberEngagementProfile({ memberId, dna, className }: MemberEngagementProfileProps) {
  const reduced = useReducedMotion();
  const { data, isLoading, isError } = useMemberActivitySummary(memberId);

  const heatGrid = useMemo(() => {
    if (!data?.activity_heatmap)
      return { map: new Map<string, number>(), max: 0 };
    const map = new Map<string, number>();
    let max = 0;
    data.activity_heatmap.forEach((cell) => {
      map.set(`${cell.weekday}-${cell.hour}`, cell.count);
      if (cell.count > max) max = cell.count;
    });
    return { map, max };
  }, [data?.activity_heatmap]);

  // Peak hours detection
  const peakHours = useMemo(() => {
    if (!data?.activity_heatmap) return [];
    const hourTotals = new Map<number, number>();
    data.activity_heatmap.forEach((cell) => {
      hourTotals.set(
        cell.hour,
        (hourTotals.get(cell.hour) ?? 0) + cell.count,
      );
    });
    const sorted = [...hourTotals.entries()].sort(
      (a, b) => b[1] - a[1],
    );
    return sorted.slice(0, 3).map(([hour]) => hour);
  }, [data?.activity_heatmap]);

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-m360-engagement space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-[18px]" />
      </div>
    );
  }

  if (isError || !data) {
    return <SectionError title="Error cargando actividad" />;
  }

  const totalByDomain = data.by_domain.reduce(
    (sum, d) => sum + d.count,
    0,
  );

  return (
    <div
      className={cn("glass-m360-engagement", className)}
      data-streak-active={data.activity_streak_current > 0}
    >
      {/* ── KPI Row ── */}
      <div className="glass-m360-engagement__kpis">
        <KPIBox
          label="Actividades"
          value={data.total_activities}
          sublabel={`${data.period_days} días`}
          icon={Activity}
          color="var(--color-teal-400)"
        />
        <KPIBox
          label="Dominios"
          value={data.by_domain.length}
          icon={Zap}
          color="var(--color-gold-400)"
        />
        <KPIBox
          label="Racha"
          value={`${data.activity_streak_current}d`}
          icon={Flame}
          color={
            data.activity_streak_current > 7
              ? "var(--color-emerald-400)"
              : "var(--color-amber-400)"
          }
        />
        <KPIBox
          label="Racha máx"
          value={`${data.activity_streak_longest}d`}
          icon={Flame}
          color="var(--color-silver-300)"
        />
      </div>

      {/* ── Activity Heatmap ── */}
      <div className="glass-m360-engagement__heatmap">
        <h3 className="glass-m360-engagement__section-title">
          <BarChart3 className="w-4 h-4 text-[var(--color-silver-400)]" />
          Mapa de Actividad
          {peakHours.length > 0 && (
            <span className="glass-m360-engagement__peak-hours">
              Pico: {peakHours.map((h) => `${h}:00`).join(", ")}
            </span>
          )}
        </h3>

        <div className="glass-m360-engagement__heat-grid">
          {/* Hour labels */}
          <div className="glass-m360-engagement__heat-row">
            <div className="glass-m360-engagement__heat-corner" />
            {HOURS.map((h) => (
              <div
                key={h}
                className={cn(
                  "glass-m360-engagement__heat-hour-label",
                  peakHours.includes(h) &&
                    "glass-m360-engagement__heat-hour-label--peak",
                )}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="glass-m360-engagement__heat-row"
            >
              <span className="glass-m360-engagement__heat-day-label">
                {day}
              </span>
              {HOURS.map((hour) => {
                const key = `${day}-${hour}`;
                const count = heatGrid.map.get(key) ?? 0;
                const bg = getHeatColor(count, heatGrid.max);
                const glow = getHeatGlow(count, heatGrid.max);
                const isHot = count > heatGrid.max * 0.5;

                return (
                  <div
                    key={hour}
                    className={cn(
                      "glass-m360-engagement__heat-cell",
                      isHot &&
                        "glass-m360-engagement__heat-cell--hot",
                      !reduced &&
                        "glass-m360-engagement__heat-cell--interactive",
                    )}
                    style={{
                      background: bg,
                      boxShadow: reduced ? "none" : glow,
                    }}
                    title={`${day} ${hour}:00 — ${count} actividad${count !== 1 ? "es" : ""}`}
                  >
                    {count > 0 && (
                      <span className="glass-m360-engagement__heat-count">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Heat legend */}
        <div className="glass-m360-engagement__heat-legend">
          <span className="glass-m360-engagement__heat-legend-label">
            Menos
          </span>
          {[0, 1, 3, 5].map((level) => (
            <div
              key={level}
              className="glass-m360-engagement__heat-legend-swatch"
              style={{
                background: getHeatColor(
                  level,
                  heatGrid.max || 5,
                ),
              }}
            />
          ))}
          <span className="glass-m360-engagement__heat-legend-label">
            Más
          </span>
        </div>
      </div>

      {/* ── Domain Distribution ── */}
      <div className="glass-m360-engagement__domains">
        <h3 className="glass-m360-engagement__section-title">
          Distribución por Dominio
        </h3>
        <div className="glass-m360-engagement__domain-list">
          {data.by_domain
            .sort((a, b) => b.count - a.count)
            .map((domain, i) => {
              const domainKey = domain.domain as ActivityDomain;
              const color = getDomainColor(domainKey);
              const pct =
                totalByDomain > 0
                  ? (domain.count / totalByDomain) * 100
                  : 0;
              const trendIcon =
                domain.trend === "improving"
                  ? "↑"
                  : domain.trend === "declining"
                    ? "↓"
                    : "→";
              const trendColor =
                domain.trend === "improving"
                  ? "var(--color-emerald-400)"
                  : domain.trend === "declining"
                    ? "var(--color-rose-400)"
                    : "var(--color-silver-500)";

              return (
                <div
                  key={domain.domain}
                  className="glass-m360-engagement__domain-row"
                  style={
                    {
                      "--stagger-i": i,
                      "--domain-color": color,
                    } as React.CSSProperties
                  }
                >
                  <span className="glass-m360-engagement__domain-icon">
                    {getDomainIcon(domainKey)}
                  </span>
                  <span className="glass-m360-engagement__domain-label">
                    {getDomainLabel(domainKey)}
                  </span>
                  <div className="glass-m360-engagement__domain-bar-track">
                    <div
                      className={cn(
                        "glass-m360-engagement__domain-bar-fill",
                        !reduced &&
                          "glass-m360-engagement__domain-bar-fill--animated",
                      )}
                      style={{
                        width: `${Math.max(2, pct)}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span className="glass-m360-engagement__domain-count">
                    {domain.count}
                  </span>
                  <span
                    className="glass-m360-engagement__domain-trend"
                    style={{ color: trendColor }}
                  >
                    {trendIcon}
                  </span>
                  {domain.last_activity && (
                    <span className="glass-m360-engagement__domain-date">
                      {new Date(
                        domain.last_activity,
                      ).toLocaleDateString("es-CR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Favorite Venues ── */}
      {data.favorite_venues && data.favorite_venues.length > 0 && (
        <div className="glass-m360-engagement__venues">
          <h3 className="glass-m360-engagement__section-title">
            <MapPin className="w-4 h-4 text-[var(--color-silver-400)]" />
            Venues Favoritos
          </h3>
          <div className="glass-m360-engagement__venue-grid">
            {data.favorite_venues.map((v, idx) => (
              <div
                key={v.venue}
                className={cn(
                  "glass-m360-engagement__venue",
                  idx === 0 &&
                    "glass-m360-engagement__venue--top",
                )}
                style={
                  { "--stagger-i": idx } as React.CSSProperties
                }
              >
                <span
                  className="glass-m360-engagement__venue-rank"
                  data-top={idx === 0}
                >
                  {idx + 1}
                </span>
                <div className="glass-m360-engagement__venue-info">
                  <p className="glass-m360-engagement__venue-name">
                    {v.venue}
                  </p>
                  <p className="glass-m360-engagement__venue-visits">
                    {v.visits} visita{v.visits !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── Recency Decay ── */}
      {dna && dna.length > 0 && (
        <div className="glass-m360-engagement__recency">
          <h3 className="glass-m360-engagement__section-title">
            Recency Decay
          </h3>
          <div className="glass-m360-engagement__recency-list">
            {dna
              .sort((a, b) => b.recencyScore - a.recencyScore)
              .map((channel, i) => {
                const domain = channel.domain as ActivityDomain;
                const color = getDomainColor(domain);
                return (
                  <div
                    key={channel.domain}
                    className="glass-m360-engagement__recency-row"
                    style={
                      {
                        "--stagger-i": i,
                      } as React.CSSProperties
                    }
                  >
                    <span className="glass-m360-engagement__recency-icon">
                      {getDomainIcon(domain)}
                    </span>
                    <span className="glass-m360-engagement__recency-label">
                      {getDomainLabel(domain)}
                    </span>
                    <div className="glass-m360-engagement__recency-bar-track">
                      <div
                        className="glass-m360-engagement__recency-bar-fill"
                        style={{
                          width: `${Math.round(channel.recencyScore * 100)}%`,
                          background: color,
                          opacity: channel.recencyScore < 0.3 ? 0.4 : 1,
                        }}
                      />
                    </div>
                    <span className="glass-m360-engagement__recency-score">
                      {Math.round(channel.recencyScore * 100)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}