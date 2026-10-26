/**
 * CulturalCalendar — F31, Tab 1
 *
 * Unified timeline of ALL cultural activity: events, exhibitions, programs.
 * Features:
 *  - KPI strip (totals by type)
 *  - Filter pills (Todos | Eventos | Exposiciones | Programas)
 *  - Timeline grouped by date with conflict badges
 *  - AI contextual insight from cross_domain_signals
 *
 * Data: get_cultural_calendar (AUTO, staleTime 120s)
 * Pattern: P1 (auto-load), P9 (defensive rendering)
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

import { useMCPQuery } from '@/shared/hooks/useMCPQuery';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Badge } from '@/shared/components/ui/Badge';
import { cn, formatCurrency } from '@/shared/lib/utils';

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

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

type FilterKey = 'all' | 'event' | 'exhibition' | 'program';

const FILTERS: { key: FilterKey; label: string; icon: typeof CalendarIcon }[] = [
  { key: 'all',         label: 'Todos',         icon: CalendarIcon },
  { key: 'event',       label: 'Eventos',       icon: Crown },
  { key: 'exhibition',  label: 'Exposiciones',   icon: Image },
  { key: 'program',     label: 'Programas',      icon: Music },
];

const TYPE_VISUAL: Record<string, { icon: typeof CalendarIcon; color: string; emoji: string }> = {
  event:       { icon: Crown,  color: 'var(--color-gold-400)',      emoji: '🎭' },
  exhibition:  { icon: Image,  color: 'var(--color-sage-400)',      emoji: '🖼️' },
  program:     { icon: Music,  color: 'var(--color-teal-400)',      emoji: '🎵' },
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
      return cfg?.label ?? item.event_type;
    }
    case 'exhibition':
      return item.artist ? `${item.artist} · ${item.num_pieces} piezas` : `${item.num_pieces} piezas`;
    case 'program':
      return `${item.enrollment ?? ''} ${item.season ? `· ${item.season}` : ''}`;
    default:
      return '';
  }
}

function getItemTime(item: CalendarItem): string {
  if (item.type === 'event' && item.start_time) {
    return `${item.start_time}${item.end_time ? ` – ${item.end_time}` : ''}`;
  }
  if (item.type === 'exhibition' || item.type === 'program') {
    return item.end_date ? `hasta ${item.end_date}` : '';
  }
  return '';
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function CulturalCalendar() {
  const [filter, setFilter] = useState<FilterKey>('all');
  useReducedMotion();

  const { data, isLoading, isError } = useMCPQuery(
    'cultural_social',
    'get_cultural_calendar',
    undefined,
    { staleTime: 120_000 },
  );

  const response = data as CalendarResponse | undefined;
  const calendar = response?.calendar ?? [];
  const summary = response?.summary;
  const conflicts = response?.conflicts ?? [];
  const hasConflicts = response?.has_conflicts ?? false;

  // Filter
  const filtered = useMemo(
    () => (filter === 'all' ? calendar : calendar.filter((item) => item.type === filter)),
    [calendar, filter],
  );

  // Group by date
  const grouped = useMemo(() => groupCalendarByDate(filtered), [filtered]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <CalendarIcon className="h-8 w-8 animate-pulse text-[var(--color-gold-400)]" />
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-rose-400)]">
        Error cargando el calendario cultural. Intentá de nuevo.
      </div>
    );
  }

  // ── Empty ──
  if (calendar.length === 0) {
    return (
      <EmptyState
        icon={<CalendarIcon className="w-8 h-8" />}
        title="Sin actividades culturales"
        description="No hay eventos, exposiciones ni programas programados. Creá la primera actividad cultural del club."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ── KPI Strip ── */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPICard label="Total" value={response?.total_items ?? 0} emoji="📅" color="var(--color-silver-200)" />
          <KPICard label="Eventos" value={summary.event} emoji="🎭" color="var(--color-gold-400)" />
          <KPICard label="Exposiciones" value={summary.exhibition} emoji="🖼️" color="var(--color-sage-400)" />
          <KPICard label="Programas" value={summary.program} emoji="🎵" color="var(--color-teal-400)" />
        </div>
      )}

      {/* ── Conflict Alert ── */}
      {hasConflicts && conflicts.length > 0 && (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-amber-400)_20%,transparent)] bg-[var(--color-amber-bg)] px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-amber-400)]" />
            <div className="text-xs text-[var(--color-amber-300)]">
              <p className="mb-1 font-semibold">
                {conflicts.length} conflicto(s) de programación detectado(s)
              </p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-[var(--color-silver-400)]">
                  {c.date} · {c.venue}: {c.items.join(' vs ')}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Pills ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]',
              filter === f.key
                ? 'bg-[color-mix(in_srgb,var(--color-gold-400)_15%,transparent)] text-[var(--color-gold-400)] border border-[color-mix(in_srgb,var(--color-gold-400)_30%,transparent)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-silver-400)] border border-transparent hover:text-[var(--color-silver-200)]',
            )}
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            {/* Date header */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-silver-600)_20%,transparent)]" />
              <span className="shrink-0 text-xs font-medium text-[var(--color-silver-400)]">
                {formatDateLabel(date)}
              </span>
              <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-silver-600)_20%,transparent)]" />
            </div>

            {/* Items */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <TimelineCard key={`${date}-${idx}`} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

function KPICard({
  label,
  value,
  emoji,
  color,
}: {
  label: string;
  value: number;
  emoji: string;
  color: string;
}) {
  return (
    <div className="glass-card flex items-center gap-3 p-3">
      <span className="text-xl" role="img" aria-label={label}>{emoji}</span>
      <div>
        <p className="text-[10px] text-[var(--color-silver-500)]">{label}</p>
        <p className="font-[family-name:var(--font-mono)] text-lg font-semibold" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function TimelineCard({ item }: { item: CalendarItem }) {
  const prefersReduced = useReducedMotion();
  const visual = TYPE_VISUAL[item.type] ?? TYPE_VISUAL.event;
  const ItemIcon = visual.icon;

  // Status config (all types have status)
  const statusCfg = getStatusConfig(
    item.type === 'event' ? 'event' : item.type === 'program' ? 'program' : 'exhibition',
    item.status,
  );

  // Venue type-specific info
  const venue = item.type !== 'program' ? (item as { venue?: string }).venue : '';

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-[color-mix(in_srgb,var(--color-silver-600)_10%,transparent)] bg-[var(--color-surface-1)] p-3 transition-all',
        !prefersReduced && 'hover:border-[color-mix(in_srgb,var(--color-silver-600)_25%,transparent)] hover:bg-[var(--color-surface-2)]',
      )}
    >
      {/* Left icon */}
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${visual.color} 12%, transparent)` }}
      >
        <ItemIcon className="h-4 w-4" style={{ color: visual.color }} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-[var(--color-silver-100)]">
            {getItemTitle(item)}
          </h4>
          <Badge variant={statusCfg.variant as "success" | "warning" | "error" | "info" | "neutral" | "gold" | "sage"} className="text-[10px]">
            {statusCfg.label}
          </Badge>
        </div>

        <p className="text-xs text-[var(--color-silver-400)]">
          {getItemSubtitle(item)}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-silver-500)]">
          {getItemTime(item) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getItemTime(item)}
            </span>
          )}
          {venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {venue}
            </span>
          )}
          {item.type === 'event' && item.guest_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {item.guest_count} invitados
            </span>
          )}
          {item.type === 'event' && item.budget > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {formatCurrency(item.budget)}
            </span>
          )}
          {item.type === 'exhibition' && item.opening_reception && (
            <Badge variant="gold" className="text-[9px]">
              <Sparkles className="mr-1 h-2.5 w-2.5" />
              Recepción de apertura
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
