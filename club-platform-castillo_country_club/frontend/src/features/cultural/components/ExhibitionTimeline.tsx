/**
 * ExhibitionTimeline — V2 of ExhibitionsPanel (F31, Tab 5)
 *
 * NOT a CRUD gallery. A TIMELINE INTELLIGENCE system where:
 * — Each exhibition is a bar on a Gantt-style horizontal timeline
 * — AI interprets duration, gaps, overlaps, and reception impact
 * — Cross-references detect scheduling gaps and venue conflicts
 * — Status management preserved via contextual actions
 *
 * Fields used: ONLY verified on ArtExhibition:
 * id, title, artist_name, category, description, status,
 * start_date, end_date, venue, num_pieces, opening_reception, notes
 *
 * @module cultural/components/ExhibitionTimeline
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Image,
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Frame,
  Sparkles,
} from 'lucide-react';

import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

import type {
  ArtExhibition,
  ExhibitionStatus,
  CulturalAnalytics,
} from '../types';
import {
  CATEGORY_CONFIG,
  EXHIBITION_STATUS_CONFIG,
} from '../types';
import './ExhibitionTimeline.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface ExhibitionTimelineProps {
  exhibitions: ArtExhibition[];
  analytics?: CulturalAnalytics;
  isLoading?: boolean;
  onCreateExhibition?: () => void;
  onStatusChange?: (exhibitionId: string, title: string, newStatus: ExhibitionStatus) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

type StatusFilter = 'all' | ExhibitionStatus;

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'scheduled', label: 'Programadas' },
  { key: 'setup', label: 'Montaje' },
  { key: 'dismantled', label: 'Desmontadas' },
  { key: 'cancelled', label: 'Canceladas' },
];

const STATUS_TRANSITIONS: Record<ExhibitionStatus, ExhibitionStatus[]> = {
  scheduled: ['setup', 'cancelled'],
  setup: ['active', 'cancelled'],
  active: ['dismantled'],
  dismantled: [],
  cancelled: [],
};

const STATUS_LABELS: Record<ExhibitionStatus, string> = {
  scheduled: 'Programada',
  setup: 'Montaje',
  active: 'Activa',
  dismantled: 'Desmontada',
  cancelled: 'Cancelada',
};

/** Map status to data-status for CSS coloring. */
function statusToDataAttr(status: ExhibitionStatus): string {
  switch (status) {
    case 'active': return 'active';
    case 'setup': return 'setup';
    case 'scheduled': return 'scheduled';
    case 'dismantled': return 'dismantled';
    case 'cancelled': return 'cancelled';
    default: return 'default';
  }
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

const MS_PER_DAY = 86_400_000;

function parseDate(d: string): number {
  return new Date(d + 'T00:00:00').getTime();
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b) - parseDate(a)) / MS_PER_DAY);
}

function formatDateShort(d: string): string {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return d;
  }
}

function formatDuration(days: number): string {
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}sem`;
  const months = Math.round(days / 30);
  return `${months}mes`;
}

// ══════════════════════════════════════════════════════════
//  GAP DETECTION
// ══════════════════════════════════════════════════════════

interface TimelineGap {
  afterExhibition: string;
  beforeExhibition: string;
  startDate: string;
  endDate: string;
  days: number;
}

function detectGaps(exhibitions: ArtExhibition[]): TimelineGap[] {
  if (exhibitions.length < 2) return [];

  const sorted = [...exhibitions]
    .filter((ex) => ex.status !== 'cancelled')
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const gaps: TimelineGap[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const gapDays = daysBetween(sorted[i - 1].end_date, sorted[i].start_date);
    if (gapDays > 7) {
      gaps.push({
        afterExhibition: sorted[i - 1].title,
        beforeExhibition: sorted[i].title,
        startDate: sorted[i - 1].end_date,
        endDate: sorted[i].start_date,
        days: gapDays,
      });
    }
  }

  return gaps.sort((a, b) => b.days - a.days);
}

// ══════════════════════════════════════════════════════════
//  OVERLAP DETECTION
// ══════════════════════════════════════════════════════════

interface VenueOverlap {
  exhibition1: string;
  exhibition2: string;
  venue: string;
  overlapDays: number;
}

function detectOverlaps(exhibitions: ArtExhibition[]): VenueOverlap[] {
  const overlaps: VenueOverlap[] = [];
  const activeLike = exhibitions.filter(
    (ex) => ex.status !== 'cancelled' && ex.status !== 'dismantled',
  );

  for (let i = 0; i < activeLike.length; i++) {
    for (let j = i + 1; j < activeLike.length; j++) {
      const a = activeLike[i];
      const b = activeLike[j];
      if (a.venue !== b.venue) continue;

      const overlapStart = Math.max(parseDate(a.start_date), parseDate(b.start_date));
      const overlapEnd = Math.min(parseDate(a.end_date), parseDate(b.end_date));

      if (overlapStart < overlapEnd) {
        overlaps.push({
          exhibition1: a.title,
          exhibition2: b.title,
          venue: a.venue,
          overlapDays: Math.round((overlapEnd - overlapStart) / MS_PER_DAY),
        });
      }
    }
  }

  return overlaps;
}

// ══════════════════════════════════════════════════════════
//  ROW ASSIGNMENT (Gantt — greedy interval scheduling)
// ══════════════════════════════════════════════════════════

function assignRows(exhibitions: ArtExhibition[]): number[] {
  const indexed = exhibitions.map((ex, i) => ({ ...ex, idx: i }));
  const sorted = [...indexed].sort((a, b) => a.start_date.localeCompare(b.start_date));

  const rowEnds: number[] = [];
  const rows = new Array(exhibitions.length).fill(0);

  for (const ex of sorted) {
    const exStart = parseDate(ex.start_date);
    let row = 0;
    while (row < rowEnds.length && rowEnds[row] > exStart) {
      row++;
    }
    if (row >= rowEnds.length) {
      rowEnds.push(0);
    }
    rowEnds[row] = parseDate(ex.end_date);
    rows[ex.idx] = row;
  }

  return rows;
}

// ══════════════════════════════════════════════════════════
//  AI INTERPRETATION
// ══════════════════════════════════════════════════════════

function interpretExhibition(
  ex: ArtExhibition,
  analytics?: CulturalAnalytics,
): string {
  const days = daysBetween(ex.start_date, ex.end_date);
  const avgDuration = analytics?.avg_exhibition_duration_days ?? 30;
  const ratio = avgDuration > 0 ? days / avgDuration : 1;

  const parts: string[] = [];

  if (ratio > 1.5) {
    parts.push(`Duración extendida: ${days}d (+${Math.round((ratio - 1) * 100)}% sobre promedio).`);
  } else if (ratio < 0.5) {
    parts.push(`Duración corta: ${days}d (${Math.round((1 - ratio) * 100)}% bajo promedio).`);
  } else {
    parts.push(`${days} días — alineada con el promedio.`);
  }

  if (ex.opening_reception) {
    parts.push('Con recepción: boost ~40% de asistencia inicial.');
  } else {
    parts.push('Sin recepción: considerar agregar para incrementar engagement.');
  }

  return parts.join(' ');
}

function generateTimelineSummary(
  exhibitions: ArtExhibition[],
  analytics?: CulturalAnalytics,
  gaps?: TimelineGap[],
): string {
  if (exhibitions.length === 0) return 'Sin exposiciones para analizar.';

  const active = exhibitions.filter((ex) => ex.status === 'active').length;
  const scheduled = exhibitions.filter((ex) => ex.status === 'scheduled').length;
  exhibitions.filter((ex) => ex.opening_reception).length;

  const parts: string[] = [];
  parts.push(`${exhibitions.length} exposición(es) en timeline.`);

  if (active > 0) parts.push(`${active} activa(s)`);
  if (scheduled > 0) parts.push(`${scheduled} programada(s)`);

  if (analytics) {
    parts.push(`Promedio: ${analytics.avg_exhibition_duration_days}d.`);
    parts.push(`${analytics.exhibitions_with_reception_pct}% con recepción.`);
  }

  if (gaps && gaps.length > 0) {
    parts.push(`Gap máximo: ${gaps[0].days} días.`);
  }

  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════
//  MONTH MARKERS (for timeline axis)
// ══════════════════════════════════════════════════════════

interface MonthMarker {
  label: string;
  position: number; // percentage
}

function generateMonthMarkers(minDate: string, maxDate: string, totalMs: number): MonthMarker[] {
  if (totalMs <= 0) return [];

  const start = new Date(minDate + 'T00:00:00');
  const end = new Date(maxDate + 'T00:00:00');
  const markers: MonthMarker[] = [];

  let current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    const position = ((current.getTime() - start.getTime()) / totalMs) * 100;
    if (position >= 0 && position <= 100) {
      markers.push({
        label: current.toLocaleDateString('es-CR', { month: 'short' }),
        position,
      });
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return markers;
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function ExhibitionTimeline({
  exhibitions,
  analytics,
  isLoading = false,
  onCreateExhibition,
  onStatusChange,
  className = '',
}: ExhibitionTimelineProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const prefersReduced = useReducedMotion();

  // ── Filter ──
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return exhibitions;
    return exhibitions.filter((ex) => ex.status === statusFilter);
  }, [exhibitions, statusFilter]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const active = exhibitions.filter((ex) => ex.status === 'active').length;
    const scheduled = exhibitions.filter((ex) => ex.status === 'scheduled').length;
    const totalPieces = exhibitions.reduce((s, ex) => s + ex.num_pieces, 0);
    const withReception = exhibitions.filter((ex) => ex.opening_reception).length;
    const avgDays = exhibitions.length > 0
      ? Math.round(
          exhibitions.reduce((s, ex) => s + daysBetween(ex.start_date, ex.end_date), 0) /
            exhibitions.length,
        )
      : 0;

    return { total: exhibitions.length, active, scheduled, totalPieces, withReception, avgDays };
  }, [exhibitions]);

  // ── Intelligence ──
  const gaps = useMemo(() => detectGaps(exhibitions), [exhibitions]);
  const overlaps = useMemo(() => detectOverlaps(exhibitions), [exhibitions]);
  const summary = useMemo(
    () => generateTimelineSummary(exhibitions, analytics, gaps),
    [exhibitions, analytics, gaps],
  );

  // ── Timeline calculations ──
  const timeline = useMemo(() => {
    if (filtered.length === 0) return null;

    const dates = filtered.flatMap((ex) => [ex.start_date, ex.end_date]);
    const sorted = [...dates].sort();
    const minDate = sorted[0];
    const maxDate = sorted[sorted.length - 1];
    const totalMs = Math.max(1, parseDate(maxDate) - parseDate(minDate));
    const totalDays = Math.round(totalMs / MS_PER_DAY);
    const rows = assignRows(filtered);
    const maxRow = Math.max(...rows, 0);
    const markers = generateMonthMarkers(minDate, maxDate, totalMs);
    const today = new Date().toISOString().slice(0, 10);
    const todayPosition = (() => {
      const pos = ((parseDate(today) - parseDate(minDate)) / totalMs) * 100;
      return pos >= 0 && pos <= 100 ? pos : null;
    })();

    const bars = filtered.map((ex, i) => {
      const exStart = parseDate(ex.start_date);
      const exEnd = parseDate(ex.end_date);
      const left = ((exStart - parseDate(minDate)) / totalMs) * 100;
      const width = Math.max(1.5, ((exEnd - exStart) / totalMs) * 100);
      const days = daysBetween(ex.start_date, ex.end_date);

      return { ex, left, width, row: rows[i], days };
    });

    return { minDate, maxDate, totalDays, maxRow, markers, todayPosition, bars };
  }, [filtered]);

  // ── Status change handler ──
  const handleStatusChange = useCallback(
    (id: string, title: string, newStatus: ExhibitionStatus) => {
      if (onStatusChange) {
        onStatusChange(id, title, newStatus);
        showToast({
          type: 'success',
          message: `'${title}' → ${STATUS_LABELS[newStatus]}`,
        });
      }
    },
    [onStatusChange],
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="et">
        <div className="et__skeleton-hero" />
        <div className="et__skeleton-timeline" />
        <div className="et__skeleton-list">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="et__skeleton-card"
              style={{ '--stagger-i': i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('et', className)}
      data-prefers-reduced={prefersReduced ? 'true' : undefined}
    >
      {/* ═══════════════════════════════════════ */}
      {/*  HERO: AI Summary + KPIs               */}
      {/* ═══════════════════════════════════════ */}
      <header className="et__hero">
        <div className="et__hero-top">
          <div className="et__hero-header">
            <Image size={18} className="et__hero-icon" />
            <h2 className="et__title">Exhibition Timeline</h2>
          </div>
          {onCreateExhibition && (
            <Button
              variant="ghost"
              size="sm"
              className="et__create-btn"
              onClick={onCreateExhibition}
            >
              <Plus size={14} />
              Nueva
            </Button>
          )}
        </div>

        <p className="et__ai-summary">{summary}</p>

        <div className="et__kpis">
          <div className="et__kpi" style={{ '--stagger-i': 0 } as React.CSSProperties}>
            <span className="et__kpi-value" data-color="sage">{kpis.active}</span>
            <span className="et__kpi-label">Activas</span>
          </div>
          <div className="et__kpi" style={{ '--stagger-i': 1 } as React.CSSProperties}>
            <span className="et__kpi-value" data-color="silver">{kpis.scheduled}</span>
            <span className="et__kpi-label">Programadas</span>
          </div>
          <div className="et__kpi" style={{ '--stagger-i': 2 } as React.CSSProperties}>
            <span className="et__kpi-value" data-color="gold">{kpis.totalPieces}</span>
            <span className="et__kpi-label">Piezas</span>
          </div>
          <div className="et__kpi" style={{ '--stagger-i': 3 } as React.CSSProperties}>
            <span className="et__kpi-value" data-color="teal">{kpis.avgDays}d</span>
            <span className="et__kpi-label">Duración prom</span>
          </div>
          <div className="et__kpi" style={{ '--stagger-i': 4 } as React.CSSProperties}>
            <span className="et__kpi-value" data-color="gold">{kpis.withReception}</span>
            <span className="et__kpi-label">Con recepción</span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════ */}
      {/*  CROSS-REFERENCES                      */}
      {/* ═══════════════════════════════════════ */}
      {(gaps.length > 0 || overlaps.length > 0) && (
        <div className="et__cross-refs">
          {gaps.slice(0, 2).map((gap, i) => (
            <div
              key={`gap-${i}`}
              className="et__cross-ref"
              data-severity="opportunity"
              style={{ '--stagger-i': i } as React.CSSProperties}
            >
              <span className="et__cross-ref-icon">📅</span>
              <p className="et__cross-ref-text">
                Gap de {gap.days} días entre "{gap.afterExhibition}" y "{gap.beforeExhibition}".
                {gap.days > 21
                  ? ' Considerar programar una exposición intermedia.'
                  : ' Oportunidad para montaje o descanso.'}
              </p>
            </div>
          ))}
          {overlaps.map((ov, i) => (
            <div
              key={`overlap-${i}`}
              className="et__cross-ref"
              data-severity="warning"
              style={{ '--stagger-i': gaps.length + i } as React.CSSProperties}
            >
              <span className="et__cross-ref-icon">⚠️</span>
              <p className="et__cross-ref-text">
                Solapamiento en {ov.venue}: "{ov.exhibition1}" y "{ov.exhibition2}" ({ov.overlapDays}d).
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  STATUS FILTERS                        */}
      {/* ═══════════════════════════════════════ */}
      {exhibitions.length > 0 && (
        <div className="et__filters">
          {STATUS_FILTERS.map((f, i) => {
            const count = f.key === 'all'
              ? exhibitions.length
              : exhibitions.filter((ex) => ex.status === f.key).length;
            if (f.key !== 'all' && count === 0) return null;
            return (
              <button
                key={f.key}
                className={cn(
                  'et__filter-pill',
                  statusFilter === f.key && 'et__filter-pill--active',
                )}
                onClick={() => setStatusFilter(f.key)}
                style={{ '--stagger-i': i } as React.CSSProperties}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  GANTT TIMELINE (desktop)              */}
      {/* ═══════════════════════════════════════ */}
      {timeline && (
        <div className="et__gantt-container">
          {/* Month markers */}
          <div className="et__gantt-axis">
            {timeline.markers.map((marker, i) => (
              <span
                key={i}
                className="et__gantt-marker"
                style={{ left: `${marker.position}%` } as React.CSSProperties}
              >
                {marker.label}
              </span>
            ))}
          </div>

          {/* Bars area */}
          <div
            className="et__gantt-bars"
            style={{
              '--gantt-rows': timeline.maxRow + 1,
            } as React.CSSProperties}
          >
            {/* Grid lines */}
            {timeline.markers.map((marker, i) => (
              <div
                key={i}
                className="et__gantt-grid-line"
                style={{ left: `${marker.position}%` } as React.CSSProperties}
              />
            ))}

            {/* Today marker */}
            {timeline.todayPosition !== null && (
              <div
                className="et__gantt-today"
                style={{ left: `${timeline.todayPosition}%` } as React.CSSProperties}
              />
            )}

            {/* Exhibition bars */}
            {timeline.bars.map((bar, i) => {
              const catCfg = CATEGORY_CONFIG[
                bar.ex.category as keyof typeof CATEGORY_CONFIG
              ];
              const statusAttr = statusToDataAttr(bar.ex.status);
              const isHovered = hoveredId === bar.ex.id;

              return (
                <div
                  key={bar.ex.id}
                  className={cn(
                    'et__gantt-bar',
                    isHovered && 'et__gantt-bar--hovered',
                  )}
                  data-status={statusAttr}
                  data-category={bar.ex.category}
                  style={{
                    '--bar-left': `${bar.left}%`,
                    '--bar-width': `${bar.width}%`,
                    '--bar-row': bar.row,
                    '--stagger-i': i,
                  } as React.CSSProperties}
                  onMouseEnter={() => setHoveredId(bar.ex.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  title={`${bar.ex.title} (${bar.days}d)`}
                >
                  <span className="et__gantt-bar-emoji">{catCfg?.emoji ?? '🖼️'}</span>
                  <span className="et__gantt-bar-label">{bar.ex.title}</span>
                  {bar.ex.opening_reception && (
                    <Sparkles size={10} className="et__gantt-bar-reception" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  EXHIBITION CARDS (detail list)        */}
      {/* ═══════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Image size={32} />}
          title="Sin exposiciones"
          description="Galería del club: arte, escultura, fotografía — creá la primera exposición."
        />
      ) : (
        <div className="et__list">
          <span className="et__list-header">
            {filtered.length} exposición(es) — detalle inteligente
          </span>
          {filtered.map((ex, i) => {
            const catCfg = CATEGORY_CONFIG[
              ex.category as keyof typeof CATEGORY_CONFIG
            ];
            const statusCfg = EXHIBITION_STATUS_CONFIG[ex.status];
            const transitions = STATUS_TRANSITIONS[ex.status] ?? [];
            const insight = interpretExhibition(ex, analytics);
            const days = daysBetween(ex.start_date, ex.end_date);
            const statusAttr = statusToDataAttr(ex.status);

            return (
              <div
                key={ex.id}
                className="et__card"
                data-status={statusAttr}
                style={{ '--stagger-i': i } as React.CSSProperties}
              >
                {/* Icon */}
                <div className="et__card-icon" data-category={ex.category}>
                  <span>{catCfg?.emoji ?? '🖼️'}</span>
                </div>

                {/* Content */}
                <div className="et__card-content">
                  <div className="et__card-header">
                    <h4 className="et__card-name">{ex.title}</h4>
                    <Badge
                      variant={
                        statusCfg.variant as
                          | 'success'
                          | 'warning'
                          | 'error'
                          | 'info'
                          | 'neutral'
                          | 'gold'
                          | 'sage'
                      }
                      className="et__card-badge"
                    >
                      {statusCfg.label}
                    </Badge>
                    {ex.opening_reception && (
                      <Badge variant="gold" className="et__card-badge et__card-badge--reception">
                        <Sparkles size={10} className="et__reception-icon" />
                        Recepción
                      </Badge>
                    )}
                  </div>

                  <p className="et__card-artist">
                    {ex.artist_name} · {catCfg?.label ?? ex.category}
                  </p>

                  {ex.description && (
                    <p className="et__card-desc">{ex.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="et__card-meta">
                    <span className="et__meta-item">
                      <CalendarIcon size={11} className="et__meta-icon" />
                      {formatDateShort(ex.start_date)} – {formatDateShort(ex.end_date)}
                      <span className="et__meta-duration">({formatDuration(days)})</span>
                    </span>
                    <span className="et__meta-item">
                      <MapPin size={11} className="et__meta-icon" />
                      {ex.venue}
                    </span>
                    <span className="et__meta-item">
                      <Frame size={11} className="et__meta-icon" />
                      {ex.num_pieces} piezas
                    </span>
                  </div>

                  {ex.notes && (
                    <p className="et__card-notes">📝 {ex.notes}</p>
                  )}

                  {/* AI Insight */}
                  <div className="et__card-insight">
                    <span className="et__card-insight-icon">🧠</span>
                    <p className="et__card-insight-text">{insight}</p>
                  </div>

                  {/* Status transitions */}
                  {transitions.length > 0 && onStatusChange && (
                    <div className="et__card-actions">
                      {transitions.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          className={cn(
                            'et__status-btn',
                            nextStatus === 'cancelled' && 'et__status-btn--danger',
                          )}
                          onClick={() =>
                            handleStatusChange(ex.id, ex.title, nextStatus)
                          }
                        >
                          → {STATUS_LABELS[nextStatus]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}