/**
 * CulturalLivingCalendar — V2 of CulturalCalendar (F31, Tab 1)
 *
 * NOT a CRUD calendar. It's a LIVING timeline of cultural activity
 * that breathes with intelligence:
 * — Conflicts highlighted in red (from backend CalendarResponse)
 * — KPI strip with density-based coloring
 * — Filter pills with stagger animation
 * — Timeline grouped by date with conflict badges
 * — AI contextual insight from cross_domain_signals
 *
 * Data: receives CalendarResponse from CulturalDashboard (no own fetch).
 * Pattern: Named export, namespace `.cultural-calendar-*`, data-* attributes.
 *
 * @module cultural/components/CulturalLivingCalendar
 */

import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  Crown,
  Image,
  Music,
  Sparkles,
  Users,
  MapPin,
  Clock,
  Tag,
} from 'lucide-react';

import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Badge } from '@/shared/components/ui/Badge';
import { cn, formatCurrency } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

import type {
  CalendarItem,
  CalendarResponse,
  CulturalEventType,
} from '../types';
import {
  EVENT_TYPE_CONFIG,
  getStatusConfig,
  groupCalendarByDate,
} from '../types';
import './CulturalLivingCalendar.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalLivingCalendarProps {
  /** Calendar data from useCulturalDashboard (passthrough from useCulturalData). */
  calendar: CalendarResponse | undefined;
  /** Whether data is loading. */
  isLoading?: boolean;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  FILTERS
// ══════════════════════════════════════════════════════════

type FilterKey = 'all' | 'event' | 'exhibition' | 'program';

const FILTERS: Array<{
  key: FilterKey;
  label: string;
  icon: typeof CalendarIcon;
}> = [
  { key: 'all', label: 'Todos', icon: CalendarIcon },
  { key: 'event', label: 'Eventos', icon: Crown },
  { key: 'exhibition', label: 'Exposiciones', icon: Image },
  { key: 'program', label: 'Programas', icon: Music },
];

/** Visual config per item type — uses data-* attributes, not inline styles. */
const TYPE_DATA: Record<string, { icon: typeof CalendarIcon; emoji: string; colorAttr: string }> = {
  event:      { icon: Crown, emoji: '🎭', colorAttr: 'gold' },
  exhibition: { icon: Image, emoji: '🖼️', colorAttr: 'sage' },
  program:    { icon: Music, emoji: '🎵', colorAttr: 'teal' },
};

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-CR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateStr;
  }
}

function getItemTitle(item: CalendarItem): string {
  return item.title;
}

function getItemSubtitle(item: CalendarItem): string {
  switch (item.type) {
    case 'event': {
      const cfg = EVENT_TYPE_CONFIG[item.event_type as CulturalEventType];
      return cfg?.label ?? item.event_type ?? '';
    }
    case 'exhibition':
      return item.artist
        ? `${item.artist} · ${item.num_pieces} piezas`
        : `${item.num_pieces ?? 0} piezas`;
    case 'program':
      return `${item.enrollment ?? ''}${item.season ? ` · ${item.season}` : ''}`;
    default:
      return '';
  }
}

function getItemTime(item: CalendarItem): string {
  if (item.type === 'event' && item.start_time) {
    return `${item.start_time}${item.end_time ? ` – ${item.end_time}` : ''}`;
  }
  if ((item.type === 'exhibition' || item.type === 'program') && item.end_date) {
    return `hasta ${item.end_date}`;
  }
  return '';
}

/** Check if an item's date+venue conflicts with known conflicts. */
function hasConflict(
  item: CalendarItem,
  conflicts: CalendarResponse['conflicts'],
): boolean {
  if (!conflicts || conflicts.length === 0) return false;
  return conflicts.some(
    (c) => c.date === item.date && (!item.venue || c.venue === item.venue),
  );
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalLivingCalendar({
  calendar: response,
  isLoading = false,
  className = '',
}: CulturalLivingCalendarProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const prefersReduced = useReducedMotion();

  const calendarItems = response?.calendar ?? [];
  const summary = response?.summary;
  const conflicts = response?.conflicts ?? [];
  const hasConflicts = response?.has_conflicts ?? false;

  // Filter
  const filtered = useMemo(
    () =>
      filter === 'all'
        ? calendarItems
        : calendarItems.filter((item) => item.type === filter),
    [calendarItems, filter],
  );

  // Group by date
  const grouped = useMemo(() => groupCalendarByDate(filtered), [filtered]);

  // Total items for density
  const totalItems = calendarItems.length;
  const densityLevel =
    totalItems >= 20 ? 'high' : totalItems >= 10 ? 'medium' : totalItems > 0 ? 'low' : 'none';

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="cultural-calendar">
        <div className="cultural-calendar__skeleton-header" />
        <div className="cultural-calendar__skeleton-kpis">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="cultural-calendar__skeleton-kpi"
              style={{ '--stagger-i': i } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="cultural-calendar__skeleton-timeline">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="cultural-calendar__skeleton-card"
              style={{ '--stagger-i': i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error (calendar undefined after loading = error state) ──
  if (!response) {
    return (
      <div className="cultural-calendar">
        <div className="cultural-calendar__error">
          <AlertTriangle size={20} className="cultural-calendar__error-icon" />
          <span>Error cargando el calendario cultural.</span>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (calendarItems.length === 0) {
    return (
      <div className="cultural-calendar">
        <EmptyState
          icon={<CalendarIcon size={32} />}
          title="Sin actividades culturales"
          description="No hay eventos, exposiciones ni programas programados. Creá la primera actividad cultural del club."
        />
      </div>
    );
  }

  return (
    <div
      className={cn('cultural-calendar', className)}
      data-density={densityLevel}
      data-prefers-reduced={prefersReduced ? 'true' : undefined}
    >
      {/* ── KPI Strip ── */}
      {summary && (
        <div className="cultural-calendar__kpis">
          <div className="cultural-calendar__kpi" style={{ '--stagger-i': 0 } as React.CSSProperties}>
            <span className="cultural-calendar__kpi-emoji" role="img" aria-label="Total">📅</span>
            <div className="cultural-calendar__kpi-info">
              <span className="cultural-calendar__kpi-label">Total</span>
              <span className="cultural-calendar__kpi-value" data-color="silver">
                {response.total_items}
              </span>
            </div>
          </div>
          <div className="cultural-calendar__kpi" style={{ '--stagger-i': 1 } as React.CSSProperties}>
            <span className="cultural-calendar__kpi-emoji" role="img" aria-label="Eventos">🎭</span>
            <div className="cultural-calendar__kpi-info">
              <span className="cultural-calendar__kpi-label">Eventos</span>
              <span className="cultural-calendar__kpi-value" data-color="gold">
                {summary.event}
              </span>
            </div>
          </div>
          <div className="cultural-calendar__kpi" style={{ '--stagger-i': 2 } as React.CSSProperties}>
            <span className="cultural-calendar__kpi-emoji" role="img" aria-label="Exposiciones">🖼️</span>
            <div className="cultural-calendar__kpi-info">
              <span className="cultural-calendar__kpi-label">Exposiciones</span>
              <span className="cultural-calendar__kpi-value" data-color="sage">
                {summary.exhibition}
              </span>
            </div>
          </div>
          <div className="cultural-calendar__kpi" style={{ '--stagger-i': 3 } as React.CSSProperties}>
            <span className="cultural-calendar__kpi-emoji" role="img" aria-label="Programas">🎵</span>
            <div className="cultural-calendar__kpi-info">
              <span className="cultural-calendar__kpi-label">Programas</span>
              <span className="cultural-calendar__kpi-value" data-color="teal">
                {summary.program}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Conflict Alert ── */}
      {hasConflicts && conflicts.length > 0 && (
        <div className="cultural-calendar__conflict-alert">
          <AlertTriangle size={16} className="cultural-calendar__conflict-icon" />
          <div className="cultural-calendar__conflict-content">
            <p className="cultural-calendar__conflict-title">
              {conflicts.length} conflicto(s) de programación detectado(s)
            </p>
            {conflicts.map((c, i) => (
              <p key={i} className="cultural-calendar__conflict-detail">
                {c.date} · {c.venue}: {c.items.join(' vs ')}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter Pills ── */}
      <div className="cultural-calendar__filters">
        {FILTERS.map((f, i) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'cultural-calendar__filter-pill',
              filter === f.key && 'cultural-calendar__filter-pill--active',
            )}
            style={{ '--stagger-i': i } as React.CSSProperties}
          >
            <f.icon size={14} className="cultural-calendar__filter-icon" />
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="cultural-calendar__timeline">
        {Object.entries(grouped).map(([date, items], groupIdx) => (
          <div
            key={date}
            className="cultural-calendar__date-group"
            style={{ '--stagger-i': groupIdx } as React.CSSProperties}
          >
            {/* Date header */}
            <div className="cultural-calendar__date-header">
              <div className="cultural-calendar__date-line" />
              <span className="cultural-calendar__date-label">
                {formatDateLabel(date)}
              </span>
              <div className="cultural-calendar__date-line" />
            </div>

            {/* Items */}
            <div className="cultural-calendar__items">
              {items.map((item: any, idx: number) => {
                const typeData = TYPE_DATA[item.type] ?? TYPE_DATA.event;
                const ItemIcon = typeData.icon;
                const isConflict = hasConflict(item, conflicts);
                const statusCfg = getStatusConfig(
                  item.type === 'event'
                    ? 'event'
                    : item.type === 'program'
                      ? 'program'
                      : 'exhibition',
                  item.status,
                );
                const venue =
                  item.type !== 'program'
                    ? (item as { venue?: string }).venue
                    : undefined;

                return (
                  <div
                    key={`${date}-${idx}`}
                    className={cn(
                      'cultural-calendar__card',
                      isConflict && 'cultural-calendar__card--conflict',
                    )}
                    data-type={item.type}
                    style={{ '--stagger-i': idx } as React.CSSProperties}
                  >
                    {/* Left icon */}
                    <div className="cultural-calendar__card-icon-wrap" data-color={typeData.colorAttr}>
                      <ItemIcon size={16} className="cultural-calendar__card-icon" />
                    </div>

                    {/* Content */}
                    <div className="cultural-calendar__card-content">
                      <div className="cultural-calendar__card-header">
                        <h4 className="cultural-calendar__card-title">
                          {getItemTitle(item)}
                        </h4>
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
                          className="cultural-calendar__card-badge"
                        >
                          {statusCfg.label}
                        </Badge>
                        {isConflict && (
                          <span className="cultural-calendar__conflict-badge" title="Conflicto de programación">
                            ⚠
                          </span>
                        )}
                      </div>

                      <p className="cultural-calendar__card-subtitle">
                        {getItemSubtitle(item)}
                      </p>

                      <div className="cultural-calendar__card-meta">
                        {getItemTime(item) && (
                          <span className="cultural-calendar__meta-item">
                            <Clock size={12} className="cultural-calendar__meta-icon" />
                            {getItemTime(item)}
                          </span>
                        )}
                        {venue && (
                          <span className="cultural-calendar__meta-item">
                            <MapPin size={12} className="cultural-calendar__meta-icon" />
                            {venue}
                          </span>
                        )}
                        {item.type === 'event' && item.guest_count != null && item.guest_count > 0 && (
                          <span className="cultural-calendar__meta-item">
                            <Users size={12} className="cultural-calendar__meta-icon" />
                            {item.guest_count} invitados
                          </span>
                        )}
                        {item.type === 'event' && item.budget != null && item.budget > 0 && (
                          <span className="cultural-calendar__meta-item">
                            <Tag size={12} className="cultural-calendar__meta-icon" />
                            {formatCurrency(item.budget)}
                          </span>
                        )}
                        {item.type === 'exhibition' && item.opening_reception && (
                          <Badge variant="gold" className="cultural-calendar__reception-badge">
                            <Sparkles size={10} className="cultural-calendar__reception-icon" />
                            Recepción de apertura
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}