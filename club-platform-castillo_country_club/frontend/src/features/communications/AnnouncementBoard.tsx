// src/features/communications/AnnouncementBoard.tsx
// ═══════════════════════════════════════════════════════════
// AnnouncementBoard V2 — La Inteligencia de Anuncios
// Namespace: glass-comm-announcement
//
// V2 Intelligence:
//   - SVG delivery metrics rings (no recharts)
//   - Reach prediction gauge per card
//   - Audience gap detection (underutilized channels)
//   - Priority-sorted cards (urgent first)
//   - Channel coverage ring
//   - Pure SVG charts (channel bars + hourly area)
//
// Eliminated: framer-motion, recharts, shared UI (Card/Button/Skeleton),
//   CHART_PALETTE, cn, useBreakpoint, useReducedMotion
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  Send, Search, Archive, Clock, Megaphone,
  Users, BarChart3, AlertTriangle,
} from "lucide-react";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { timeAgo, formatNumber } from "@/shared/lib/utils";
import { showToast } from "@/shared/components/ui";
import "./AnnouncementBoard.css";
import { Button } from "@/shared/components/ui/Button";

/* ══════════════════════════════════════════════════════════
   Backend Types (verified from V1 — backend-aligned)
   ══════════════════════════════════════════════════════════ */

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  announcement_type: string;
  status: string;
  channels: string[];
  target_audience: string;
  scheduled_at?: string;
  sent_at?: string;
  created_by: string;
  priority: number;
  requires_acknowledgment: boolean;
  notes?: string;
}

interface AnnouncementListResponse {
  announcements: AnnouncementItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface CommunicationAnalytics {
  period: string;
  total_sent: number;
  total_recipients: number;
  delivery_rate_pct: number;
  avg_recipients_per_send: number;
  best_day_to_send: string;
  best_hour_to_send: string;
  channel_breakdown: Array<{ channel: string; count: number; percentage: number }>;
  type_breakdown: Array<{ type: string; count: number; percentage: number }>;
  status_breakdown: { sent: number; delivered: number; failed: number; cancelled: number };
  daily_volume: Array<{ date: string; count: number }>;
  hourly_distribution: Array<{ hour: string; count: number }>;
}

interface AnalyticsResponse {
  status: string;
  message: string;
  analytics: CommunicationAnalytics;
}

interface StatusUpdateResponse {
  status: string;
  message: string;
  announcement?: AnnouncementItem;
}

/* ══════════════════════════════════════════════════════════
   Config Maps
   ══════════════════════════════════════════════════════════ */

const STATUS_CFG: Record<string, { label: string }> = {
  draft: { label: "Borrador" },
  scheduled: { label: "Programado" },
  sent: { label: "Enviado" },
  cancelled: { label: "Cancelado" },
};

const TYPE_CFG: Record<string, { label: string }> = {
  general: { label: "General" },
  event: { label: "Evento" },
  maintenance: { label: "Mantenimiento" },
  promotion: { label: "Promoción" },
  policy: { label: "Política" },
  seasonal: { label: "Temporada" },
};

const PRIORITY_CFG: Record<number, { label: string }> = {
  1: { label: "Normal" },
  2: { label: "Importante" },
  3: { label: "Urgente" },
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  push: "Push",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_app: "In-App",
};

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Todos los socios",
};

const KNOWN_CHANNELS = ["email", "push", "sms", "whatsapp", "in_app"] as const;

/* ══════════════════════════════════════════════════════════
   SVG Constants
   ══════════════════════════════════════════════════════════ */

const RING_R = 38;
const RING_C = 2 * Math.PI * RING_R;
const CHART_W = 560;
const CHART_H = 170;

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function ringOffset(pct: number): number {
  return RING_C * (1 - Math.min(100, Math.max(0, pct)) / 100);
}

function estimateReachPct(
  channels: string[],
  analytics: CommunicationAnalytics | undefined,
): number {
  if (!analytics || analytics.total_sent === 0) return 0;
  const chPct = channels.reduce((sum, ch) => {
    const found = analytics.channel_breakdown.find((c) => c.channel === ch);
    return sum + (found?.percentage ?? 0);
  }, 0);
  return Math.round(
    Math.min(100, chPct * 1.2) * (analytics.delivery_rate_pct / 100),
  );
}

interface AudienceGap {
  channel: string;
  issue: string;
  severity: "low" | "medium";
}

function detectAudienceGaps(analytics: CommunicationAnalytics): AudienceGap[] {
  const gaps: AudienceGap[] = [];
  const bd = analytics.channel_breakdown;
  if (bd.length === 0) return gaps;

  const avg = bd.reduce((s, c) => s + c.count, 0) / bd.length;
  const active: Record<string, boolean> = {};
  bd.forEach((c) => {
    active[c.channel] = true;
    if (c.count < avg * 0.3) {
      gaps.push({
        channel: c.channel,
        issue: `Baja actividad: ${c.count} envíos`,
        severity: "medium",
      });
    }
  });
  KNOWN_CHANNELS.forEach((ch) => {
    if (!active[ch]) {
      gaps.push({ channel: ch, issue: "Canal sin uso detectado", severity: "low" });
    }
  });
  return gaps;
}

function buildAreaPaths(
  data: Array<{ hour: string; count: number }>,
): { line: string; area: string } {
  if (data.length < 2) return { line: "", area: "" };
  const max = Math.max(...data.map((d) => d.count), 1);
  const pad = { t: 10, b: 25 };
  const h = CHART_H - pad.t - pad.b;
  const pts = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * CHART_W,
    y: pad.t + h - (d.count / max) * h,
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L${last.x.toFixed(1)},${pad.t + h} L${first.x.toFixed(1)},${pad.t + h} Z`;
  return { line, area };
}

function sortAnnouncements(items: AnnouncementItem[]): AnnouncementItem[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const da = a.sent_at ?? a.scheduled_at ?? "";
    const db = b.sent_at ?? b.scheduled_at ?? "";
    return db > da ? 1 : db < da ? -1 : 0;
  });
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export function AnnouncementBoard() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>("current_month");

  /* ── Queries ── */
  const announcementsQ = useMCPQuery<AnnouncementListResponse>(
    "communication",
    "list_announcements",
    {
      page,
      page_size: 12,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { announcement_type: typeFilter } : {}),
      ...(search ? { search } : {}),
    },
    { staleTime: 60_000 },
  );

  const analyticsQ = useMCPQuery<AnalyticsResponse>(
    "communication",
    "get_communication_analytics",
    { period: analyticsPeriod },
    { staleTime: 120_000 },
  );

  /* ── Mutations ── */
  const publishMut = useMCPMutation<
    StatusUpdateResponse,
    { announcement_id: string; action: string }
  >("communication", "update_announcement_status", {
    onSuccess: (data: StatusUpdateResponse) => {
      showToast({ type: "success", message: data.message ?? "Anuncio publicado" });
      announcementsQ.refetch();
    },
    onError: (err: unknown) =>
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al publicar",
      }),
  });

  const archiveMut = useMCPMutation<
    StatusUpdateResponse,
    { announcement_id: string; action: string }
  >("communication", "update_announcement_status", {
    onSuccess: (data: StatusUpdateResponse) => {
      showToast({ type: "success", message: data.message ?? "Anuncio archivado" });
      announcementsQ.refetch();
    },
    onError: (err: unknown) =>
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al archivar",
      }),
  });

  /* ── Derived ── */
  const analytics = analyticsQ.data?.analytics;
  const totalPages = announcementsQ.data?.total_pages ?? 1;
  const totalCount = announcementsQ.data?.total ?? 0;
  const items = announcementsQ.data?.announcements ?? [];
  const sorted = useMemo(() => sortAnnouncements(items), [items]);

  const gaps = useMemo(
    () => (analytics ? detectAudienceGaps(analytics) : []),
    [analytics],
  );

  const channelCoverage = useMemo(() => {
    if (!analytics || analytics.channel_breakdown.length === 0) return 0;
    return Math.round(
      (analytics.channel_breakdown.length / KNOWN_CHANNELS.length) * 100,
    );
  }, [analytics]);

  const statusOpts = Object.entries(STATUS_CFG);
  const typeOpts = Object.entries(TYPE_CFG);

  return (
    <div className="glass-comm-announcement">
      <div className="glass-comm-announcement__container">
        {/* ── Header ── */}
        <header>
          <h1 className="glass-comm-announcement__page-title">
            Tablón de Comunicaciones
          </h1>
          <p className="glass-comm-announcement__page-subtitle">
            {totalCount} anuncios · Inteligencia de rendimiento
          </p>
        </header>

        {/* ── Analytics Loading ── */}
        {analyticsQ.isLoading && !analytics && (
          <section className="glass-comm-announcement__section">
            <div className="glass-comm-announcement__ring-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-comm-announcement__skeleton glass-comm-announcement__skeleton--ring"
                  style={{ "--stagger-i": i } as CSSProperties}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Analytics Error ── */}
        {analyticsQ.isError && !analytics && (
          <section className="glass-comm-announcement__section">
            <div className="glass-comm-announcement__error">
              <BarChart3 size={24} className="glass-comm-announcement__error-icon" />
              <p className="glass-comm-announcement__error-desc">
                No se pudieron cargar los analytics.
              </p>
              <Button
                variant="unstyled"
                className="glass-comm-announcement__btn"
                onClick={() => analyticsQ.refetch()}
              >
                Reintentar
              </Button>
            </div>
          </section>
        )}

        {/* ── Analytics Dashboard ── */}
        {analytics && analytics.total_sent > 0 && (
          <section className="glass-comm-announcement__section">
            <div className="glass-comm-announcement__section-header-row">
              <div>
                <h2 className="glass-comm-announcement__section-title">
                  Rendimiento de Comunicaciones
                </h2>
                <p className="glass-comm-announcement__section-subtitle">
                  Métricas determinísticas basadas en datos reales de envíos
                </p>
              </div>
              <select
                value={analyticsPeriod}
                onChange={(e) => setAnalyticsPeriod(e.target.value)}
                className="glass-comm-announcement__select"
                aria-label="Periodo de analytics"
              >
                <option value="current_month">Este mes</option>
                <option value="current_quarter">Este trimestre</option>
                <option value="last_30_days">Últimos 30 días</option>
                <option value="last_90_days">Últimos 90 días</option>
                <option value="ytd">Año en curso</option>
              </select>
            </div>

            {/* Ring KPIs */}
            <div className="glass-comm-announcement__ring-grid">
              {/* Delivery Rate */}
              <div
                className="glass-comm-announcement__ring-card"
                style={{ "--stagger-i": 0 } as CSSProperties}
              >
                <svg
                  className="glass-comm-announcement__ring-svg"
                  viewBox="0 0 100 100"
                  role="img"
                  aria-label={`Tasa de éxito: ${Math.round(analytics.delivery_rate_pct)}%`}
                >
                  <circle
                    className="glass-comm-announcement__ring-track"
                    cx="50" cy="50" r={RING_R}
                  />
                  <circle
                    className="glass-comm-announcement__ring-fill"
                    data-ring="emerald"
                    cx="50" cy="50" r={RING_R}
                    style={{
                      "--ring-target": ringOffset(analytics.delivery_rate_pct),
                      "--stagger-i": 0,
                    } as CSSProperties}
                  />
                  <text
                    className="glass-comm-announcement__ring-text"
                    x="50" y="50"
                  >
                    {Math.round(analytics.delivery_rate_pct)}%
                  </text>
                </svg>
                <div className="glass-comm-announcement__ring-info">
                  <span className="glass-comm-announcement__ring-label">
                    Tasa de Éxito
                  </span>
                  <span
                    className="glass-comm-announcement__ring-value"
                    data-ring="emerald"
                  >
                    {formatNumber(
                      analytics.status_breakdown.sent +
                        analytics.status_breakdown.delivered,
                    )}{" "}
                    exitosos
                  </span>
                </div>
              </div>

              {/* Channel Coverage */}
              <div
                className="glass-comm-announcement__ring-card"
                style={{ "--stagger-i": 1 } as CSSProperties}
              >
                <svg
                  className="glass-comm-announcement__ring-svg"
                  viewBox="0 0 100 100"
                  role="img"
                  aria-label={`Cobertura: ${analytics.channel_breakdown.length} de ${KNOWN_CHANNELS.length} canales`}
                >
                  <circle
                    className="glass-comm-announcement__ring-track"
                    cx="50" cy="50" r={RING_R}
                  />
                  <circle
                    className="glass-comm-announcement__ring-fill"
                    data-ring="teal"
                    cx="50" cy="50" r={RING_R}
                    style={{
                      "--ring-target": ringOffset(channelCoverage),
                      "--stagger-i": 1,
                    } as CSSProperties}
                  />
                  <text
                    className="glass-comm-announcement__ring-text"
                    x="50" y="50"
                  >
                    {analytics.channel_breakdown.length}/{KNOWN_CHANNELS.length}
                  </text>
                </svg>
                <div className="glass-comm-announcement__ring-info">
                  <span className="glass-comm-announcement__ring-label">
                    Cobertura de Canales
                  </span>
                  <span
                    className="glass-comm-announcement__ring-value"
                    data-ring="teal"
                  >
                    {analytics.channel_breakdown.length} activos
                  </span>
                </div>
              </div>

              {/* Best Time */}
              <div
                className="glass-comm-announcement__ring-card"
                style={{ "--stagger-i": 2 } as CSSProperties}
              >
                <div
                  className="glass-comm-announcement__text-icon"
                  data-ring="gold"
                >
                  <Clock size={24} />
                </div>
                <div className="glass-comm-announcement__ring-info">
                  <span className="glass-comm-announcement__ring-label">
                    Mejor Momento
                  </span>
                  <span
                    className="glass-comm-announcement__ring-value"
                    data-ring="gold"
                  >
                    {analytics.best_day_to_send}
                  </span>
                  <span className="glass-comm-announcement__ring-sub">
                    {analytics.best_hour_to_send}
                  </span>
                </div>
              </div>

              {/* Total Reach */}
              <div
                className="glass-comm-announcement__ring-card"
                style={{ "--stagger-i": 3 } as CSSProperties}
              >
                <div
                  className="glass-comm-announcement__text-icon"
                  data-ring="sage"
                >
                  <Users size={24} />
                </div>
                <div className="glass-comm-announcement__ring-info">
                  <span className="glass-comm-announcement__ring-label">
                    Alcance Total
                  </span>
                  <span
                    className="glass-comm-announcement__ring-value"
                    data-ring="sage"
                  >
                    {formatNumber(analytics.total_recipients)}
                  </span>
                  <span className="glass-comm-announcement__ring-sub">
                    {formatNumber(analytics.avg_recipients_per_send)} prom/envío
                  </span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="glass-comm-announcement__charts">
              {/* Channel Distribution */}
              <div
                className="glass-comm-announcement__chart-panel"
                style={{ "--stagger-i": 4 } as CSSProperties}
              >
                <h3 className="glass-comm-announcement__chart-title">
                  Envíos por Canal
                </h3>
                {(() => {
                  const bd = analytics.channel_breakdown;
                  const maxCount = Math.max(...bd.map((x) => x.count), 1);
                  const svgH = bd.length * 32 + 20;
                  return (
                    <svg
                      className="glass-comm-announcement__chart-svg"
                      viewBox={`0 0 ${CHART_W} ${svgH}`}
                      style={{ height: svgH }}
                      role="img"
                      aria-label="Distribución por canal"
                    >
                      {bd.map((c, i) => {
                        const barW = (c.count / maxCount) * (CHART_W - 150);
                        const y = i * 32 + 10;
                        return (
                          <g key={c.channel}>
                            <text
                              x="0"
                              y={y + 16}
                              className="glass-comm-announcement__axis-label"
                            >
                              {CHANNEL_LABEL[c.channel] ?? c.channel}
                            </text>
                            <rect
                              x="80"
                              y={y + 4}
                              width={barW}
                              height="20"
                              rx="4"
                              className="glass-comm-announcement__bar-rect"
                              fill={`var(--gca-${
                                c.channel === "email"
                                  ? "teal"
                                  : c.channel === "push"
                                    ? "gold"
                                    : c.channel === "sms"
                                      ? "emerald"
                                      : c.channel === "whatsapp"
                                        ? "sage"
                                        : "muted"
                              })`}
                              style={{ "--stagger-i": i } as CSSProperties}
                            />
                            <text
                              x={80 + barW + 8}
                              y={y + 16}
                              className="glass-comm-announcement__axis-value"
                            >
                              {c.count} ({c.percentage}%)
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Hourly Activity */}
              <div
                className="glass-comm-announcement__chart-panel"
                style={{ "--stagger-i": 5 } as CSSProperties}
              >
                <h3 className="glass-comm-announcement__chart-title">
                  Actividad por Hora
                </h3>
                {(() => {
                  const paths = buildAreaPaths(analytics.hourly_distribution);
                  const gridYs = [0.25, 0.5, 0.75];
                  const pad = { t: 10, b: 25 };
                  const h = CHART_H - pad.t - pad.b;
                  return (
                    <svg
                      className="glass-comm-announcement__chart-svg"
                      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                      role="img"
                      aria-label="Actividad por hora del día"
                    >
                      <defs>
                        <linearGradient id="gca-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--gca-teal)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--gca-teal)" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {gridYs.map((pct) => (
                        <line
                          key={pct}
                          x1="0"
                          y1={pad.t + h * (1 - pct)}
                          x2={CHART_W}
                          y2={pad.t + h * (1 - pct)}
                          className="glass-comm-announcement__grid-line"
                        />
                      ))}
                      <path
                        d={paths.area}
                        fill="url(#gca-grad)"
                        className="glass-comm-announcement__area-fill"
                      />
                      <path
                        d={paths.line}
                        fill="none"
                        stroke="var(--gca-teal)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="glass-comm-announcement__area-line"
                      />
                      {analytics.hourly_distribution.map((d, i) => {
                        const len = analytics.hourly_distribution.length;
                        if (i % 3 !== 0 && i !== len - 1) return null;
                        const x = (i / Math.max(len - 1, 1)) * CHART_W;
                        return (
                          <text
                            key={d.hour}
                            x={x}
                            y={CHART_H - 5}
                            textAnchor="middle"
                            className="glass-comm-announcement__axis-label"
                          >
                            {d.hour}
                          </text>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Type Breakdown */}
            {analytics.type_breakdown.length > 0 && (
              <div
                className="glass-comm-announcement__chart-panel"
                style={{ "--stagger-i": 6 } as CSSProperties}
              >
                <h3 className="glass-comm-announcement__chart-title">
                  Por Tipo de Comunicación
                </h3>
                <div className="glass-comm-announcement__type-breakdown">
                  {analytics.type_breakdown.map((t, i) => {
                    const cfg = (TYPE_CFG[t.type] as { label: string } | undefined) ?? {
                      label: t.type,
                    };
                    const colors: Record<string, string> = {
                      general: "var(--color-silver-200)",
                      event: "var(--gca-gold)",
                      maintenance: "var(--gca-amber)",
                      promotion: "var(--gca-emerald)",
                      policy: "var(--gca-teal)",
                      seasonal: "var(--gca-terracotta)",
                    };
                    return (
                      <div
                        key={t.type}
                        className="glass-comm-announcement__type-row"
                        style={{ "--stagger-i": i } as CSSProperties}
                      >
                        <span className="glass-comm-announcement__type-label">
                          {cfg.label}
                        </span>
                        <div className="glass-comm-announcement__type-bar-track">
                          <div
                            className="glass-comm-announcement__type-bar-fill"
                            style={{
                              width: `${t.percentage}%`,
                              backgroundColor:
                                colors[t.type] ?? "var(--gca-muted)",
                              "--stagger-i": i,
                            } as CSSProperties}
                          />
                        </div>
                        <span className="glass-comm-announcement__type-count">
                          {t.count}
                        </span>
                        <span className="glass-comm-announcement__type-pct">
                          {t.percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audience Intelligence */}
            {gaps.length > 0 && (
              <div
                className="glass-comm-announcement__intelligence-panel"
                style={{ "--stagger-i": 7 } as CSSProperties}
              >
                <div className="glass-comm-announcement__intelligence-header">
                  <AlertTriangle
                    size={16}
                    className="glass-comm-announcement__intelligence-icon"
                  />
                  <span className="glass-comm-announcement__intelligence-title">
                    Inteligencia de Audiencia
                  </span>
                </div>
                <div className="glass-comm-announcement__intelligence-gaps">
                  {gaps.map((gap, i) => (
                    <div
                      key={gap.channel}
                      className="glass-comm-announcement__intelligence-gap"
                      data-severity={gap.severity}
                      style={{ "--stagger-i": i } as CSSProperties}
                    >
                      <span className="glass-comm-announcement__gap-channel">
                        {CHANNEL_LABEL[gap.channel] ?? gap.channel}
                      </span>
                      <span className="glass-comm-announcement__gap-issue">
                        {gap.issue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Divider ── */}
        <div className="glass-comm-announcement__divider" />

        {/* ── Announcement Error ── */}
        {announcementsQ.isError && (
          <div className="glass-comm-announcement__error">
            <Megaphone
              size={32}
              className="glass-comm-announcement__error-icon"
            />
            <h3 className="glass-comm-announcement__error-title">
              Error al cargar anuncios
            </h3>
            <p className="glass-comm-announcement__error-desc">
              No pudimos obtener el listado de anuncios. Intentá de nuevo.
            </p>
            <Button
              variant="unstyled"
              className="glass-comm-announcement__btn"
              onClick={() => announcementsQ.refetch()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* ── Filters + Grid ── */}
        {!announcementsQ.isError && (
          <>
            {/* Filters */}
            <div className="glass-comm-announcement__filters">
              <div className="glass-comm-announcement__search">
                <Search
                  size={16}
                  className="glass-comm-announcement__search-icon"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar anuncios…"
                  className="glass-comm-announcement__search-input"
                  aria-label="Buscar anuncios"
                />
              </div>
              <div className="glass-comm-announcement__filter-selects">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="glass-comm-announcement__select"
                  aria-label="Filtrar por estado"
                >
                  <option value="">Todos los estados</option>
                  {statusOpts.map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="glass-comm-announcement__select glass-comm-announcement__select--hide-mobile"
                  aria-label="Filtrar por tipo"
                >
                  <option value="">Todos los tipos</option>
                  {typeOpts.map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading */}
            {announcementsQ.isLoading && !announcementsQ.data && (
              <div className="glass-comm-announcement__grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-comm-announcement__skeleton glass-comm-announcement__skeleton--card"
                    style={{ "--stagger-i": i } as CSSProperties}
                  />
                ))}
              </div>
            )}

            {/* Empty */}
            {!announcementsQ.isLoading && sorted.length === 0 && (
              <div className="glass-comm-announcement__empty">
                <Megaphone
                  size={32}
                  className="glass-comm-announcement__empty-icon"
                />
                <h3 className="glass-comm-announcement__empty-title">
                  Sin anuncios
                </h3>
                <p className="glass-comm-announcement__empty-desc">
                  No se encontraron anuncios para los filtros seleccionados.
                </p>
              </div>
            )}

            {/* Grid */}
            {sorted.length > 0 && (
              <>
                <div className="glass-comm-announcement__grid">
                  {sorted.map((ann, i) => {
                    const stCfg =
                      (STATUS_CFG[ann.status] as { label: string } | undefined) ??
                      STATUS_CFG.draft;
                    const typeCfg =
                      (TYPE_CFG[ann.announcement_type] as
                        | { label: string }
                        | undefined) ?? TYPE_CFG.general;
                    const priCfg =
                      (PRIORITY_CFG[ann.priority] as
                        | { label: string }
                        | undefined) ?? PRIORITY_CFG[1];
                    const audienceLabel =
                      (AUDIENCE_LABEL[ann.target_audience] as string | undefined) ??
                      ann.target_audience;
                    const reachPct = estimateReachPct(ann.channels, analytics);

                    return (
                      <article
                        key={ann.id}
                        className="glass-comm-announcement__card"
                        data-priority={
                          ann.priority === 3
                            ? "urgent"
                            : ann.priority === 2
                              ? "high"
                              : "normal"
                        }
                        style={{ "--stagger-i": i } as CSSProperties}
                      >
                        {/* Badges */}
                        <div className="glass-comm-announcement__badges">
                          <span
                            className="glass-comm-announcement__badge glass-comm-announcement__badge--status"
                            data-status={ann.status}
                          >
                            {stCfg.label}
                          </span>
                          <span
                            className="glass-comm-announcement__badge glass-comm-announcement__badge--type"
                            data-type={ann.announcement_type}
                          >
                            {typeCfg.label}
                          </span>
                          {ann.priority > 1 && (
                            <span
                              className="glass-comm-announcement__badge glass-comm-announcement__badge--priority"
                              data-priority={
                                ann.priority === 3 ? "urgent" : "high"
                              }
                            >
                              {priCfg.label}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="glass-comm-announcement__card-title">
                          {ann.title}
                        </h4>

                        {/* Body */}
                        <p className="glass-comm-announcement__card-body">
                          {ann.body}
                        </p>

                        {/* Channels */}
                        <div className="glass-comm-announcement__channels">
                          {ann.channels.map((ch) => (
                            <span
                              key={ch}
                              className="glass-comm-announcement__channel-tag"
                              data-channel={ch}
                            >
                              {CHANNEL_LABEL[ch] ?? ch}
                            </span>
                          ))}
                        </div>

                        {/* Reach Prediction */}
                        {reachPct > 0 && (
                          <div className="glass-comm-announcement__reach">
                            <span className="glass-comm-announcement__reach-label">
                              Alcance estimado
                            </span>
                            <div className="glass-comm-announcement__reach-track">
                              <div
                                className="glass-comm-announcement__reach-fill"
                                data-score={
                                  reachPct >= 70
                                    ? "high"
                                    : reachPct >= 40
                                      ? "medium"
                                      : "low"
                                }
                                style={
                                  { width: `${reachPct}%` } as CSSProperties
                                }
                              />
                            </div>
                            <span className="glass-comm-announcement__reach-value">
                              {reachPct}%
                            </span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="glass-comm-announcement__card-footer">
                          <div className="glass-comm-announcement__card-footer-left">
                            <span>{audienceLabel}</span>
                            {ann.requires_acknowledgment && (
                              <span className="glass-comm-announcement__ack-label">
                                Requiere ACK
                              </span>
                            )}
                          </div>
                          <span className="glass-comm-announcement__card-time">
                            <Clock size={12} />
                            {ann.sent_at ? timeAgo(ann.sent_at) : "Sin enviar"}
                          </span>
                        </div>

                        {/* Scheduled */}
                        {ann.status === "scheduled" && ann.scheduled_at && (
                          <div className="glass-comm-announcement__scheduled">
                            <Clock size={12} />
                            Programado:{" "}
                            {new Date(ann.scheduled_at).toLocaleDateString(
                              "es-CR",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {ann.status === "draft" && (
                          <div className="glass-comm-announcement__card-actions">
                            <Button
                              variant="unstyled"
                              className="glass-comm-announcement__btn glass-comm-announcement__btn--primary glass-comm-announcement__btn--flex"
                              onClick={() =>
                                publishMut.mutate({
                                  announcement_id: ann.id,
                                  action: "publish",
                                })
                              }
                              disabled={publishMut.isPending}
                            >
                              <Send size={14} />
                              Publicar
                            </Button>
                            <Button
                              variant="unstyled"
                              className="glass-comm-announcement__btn"
                              onClick={() =>
                                archiveMut.mutate({
                                  announcement_id: ann.id,
                                  action: "archive",
                                })
                              }
                              disabled={archiveMut.isPending}
                            >
                              <Archive size={14} />
                              Archivar
                            </Button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="glass-comm-announcement__pagination">
                    <p className="glass-comm-announcement__pagination-info">
                      Página {page} de {totalPages}
                    </p>
                    <div className="glass-comm-announcement__pagination-controls">
                      <Button
                        variant="unstyled"
                        className="glass-comm-announcement__btn"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="unstyled"
                        className="glass-comm-announcement__btn"
                        onClick={() =>
                          setPage(Math.min(totalPages, page + 1))
                        }
                        disabled={page === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}