/**
 * ExhibitionsPanel — F31, Tab 5
 *
 * Art exhibitions gallery management.
 * Full CRUD — all actions are AUTO (no approval needed).
 * Features: status management, date range display, opening reception badges.
 *
 * Data: manage_art_exhibitions (AUTO, staleTime 120s)
 * Pattern: P1 (auto-load), P9 (defensive), #14 EmptyState, #15 showToast
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Frame,
  Image,
  Loader2,
  MapPin,
  Plus,
  Sparkles
} from 'lucide-react';

import { useMCPQuery, useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn } from '@/shared/lib/utils';

import type {
  ArtExhibition,
  ExhibitionStatus,
} from '../types';
import {
  CATEGORY_CONFIG,
  EXHIBITION_STATUS_CONFIG
} from '../types';
import ExhibitionFormModal from './ExhibitionFormModal';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface ExhibitionsResponse {
  status: string;
  message: string;
  exhibitions: ArtExhibition[];
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

type StatusFilter = 'all' | ExhibitionStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',         label: 'Todas' },
  { key: 'active',      label: 'Activas' },
  { key: 'scheduled',   label: 'Programadas' },
  { key: 'setup',       label: 'En Montaje' },
  { key: 'dismantled',  label: 'Desmontadas' },
  { key: 'cancelled',   label: 'Canceladas' },
];

const STATUS_TRANSITIONS: Record<ExhibitionStatus, ExhibitionStatus[]> = {
  scheduled:  ['setup', 'cancelled'],
  setup:      ['active', 'cancelled'],
  active:     ['dismantled'],
  dismantled: [],
  cancelled:  [],
};

const STATUS_LABELS: Record<ExhibitionStatus, string> = {
  scheduled: 'Programada',
  setup: 'Montaje',
  active: 'Activa',
  dismantled: 'Desmontada',
  cancelled: 'Cancelada',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function ExhibitionsPanel() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showModal, setShowModal] = useState(false);
  useReducedMotion();

  const { data, isLoading, isError, refetch } = useMCPQuery(
    'cultural_social',
    'manage_art_exhibitions',
    { action: 'list' },
    { staleTime: 120_000 },
  );

  const statusMutation = useMCPMutation('cultural_social', 'manage_art_exhibitions');

  const exhibitions = useMemo(() => {
    const resp = data as ExhibitionsResponse | undefined;
    return resp?.exhibitions ?? [];
  }, [data]);

  // Filter
  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? exhibitions
        : exhibitions.filter((ex) => ex.status === statusFilter),
    [exhibitions, statusFilter],
  );

  // KPIs
  const kpis = useMemo(() => {
    const active = exhibitions.filter((ex) => ex.status === 'active').length;
    const scheduled = exhibitions.filter((ex) => ex.status === 'scheduled').length;
    const totalPieces = exhibitions.reduce((s, ex) => s + ex.num_pieces, 0);
    const withReception = exhibitions.filter((ex) => ex.opening_reception).length;
    return { total: exhibitions.length, active, scheduled, totalPieces, withReception };
  }, [exhibitions]);

  const handleStatusChange = useCallback(
    async (exId: string, title: string, newStatus: ExhibitionStatus) => {
      try {
        await statusMutation.mutateAsync({
          action: 'update_status',
          exhibition_id: exId,
          new_status: newStatus,
        });
        showToast({
          type: 'success',
          message: `'${title}' → ${STATUS_LABELS[newStatus]}`,
        });
        refetch();
      } catch {
        showToast({ type: 'error', message: 'Error actualizando la exposición' });
      }
    },
    [statusMutation, refetch],
  );

  const handleCreated = useCallback(() => {
    setShowModal(false);
    showToast({ type: 'success', message: 'Exposición creada exitosamente' });
    refetch();
  }, [refetch]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-sage-400)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-rose-400)]">
        Error cargando exposiciones. Intentá de nuevo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Strip + Action ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-xs text-[var(--color-silver-400)]">
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-sage-400)]">
              {kpis.active}
            </strong>{' '}
            activas
          </span>
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
              {kpis.scheduled}
            </strong>{' '}
            programadas
          </span>
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
              {kpis.totalPieces}
            </strong>{' '}
            piezas
          </span>
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-gold-400)]">
              {kpis.withReception}
            </strong>{' '}
            con recepción
          </span>
        </div>

        <Button
          variant="sage"
          size="sm"
          className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-sage-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-sage-400)_12%,transparent)] text-[var(--color-sage-400)] hover:bg-[color-mix(in_srgb,var(--color-sage-400)_20%,transparent)]"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
          Nueva Exposición
        </Button>
      </div>

      {/* ── Status Filters ── */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            variant="unstyled"
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]',
              statusFilter === f.key
                ? 'bg-[color-mix(in_srgb,var(--color-sage-400)_15%,transparent)] text-[var(--color-sage-400)] border border-[color-mix(in_srgb,var(--color-sage-400)_30%,transparent)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-silver-400)] border border-transparent hover:text-[var(--color-silver-200)]',
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* ── Exhibitions ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Image className="h-8 w-8" />}
          title="Sin exposiciones"
          description="Galería del club: arte, escultura, fotografía — creá la primera exposición."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((ex) => (
            <ExhibitionCard
              key={ex.id}
              exhibition={ex}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <ExhibitionFormModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  EXHIBITION CARD
// ══════════════════════════════════════════════════════════

function ExhibitionCard({
  exhibition,
  onStatusChange,
}: {
  exhibition: ArtExhibition;
  onStatusChange: (id: string, title: string, status: ExhibitionStatus) => void;
}) {
  const prefersReduced = useReducedMotion();
  const catCfg = CATEGORY_CONFIG[exhibition.category] ?? {
    emoji: '🖼️', color: 'var(--color-sage-400)', label: exhibition.category,
  };
  const statusCfg = EXHIBITION_STATUS_CONFIG[exhibition.status];
  const transitions = STATUS_TRANSITIONS[exhibition.status] ?? [];

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const calcDuration = () => {
    try {
      const s = new Date(exhibition.start_date + 'T00:00:00');
      const e = new Date(exhibition.end_date + 'T00:00:00');
      const days = Math.round((e.getTime() - s.getTime()) / 86_400_000);
      return days > 0 ? `${days} días` : '';
    } catch {
      return '';
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-lg border border-[color-mix(in_srgb,var(--color-silver-600)_10%,transparent)] bg-[var(--color-surface-1)] p-4 transition-all sm:flex-row sm:items-start',
        !prefersReduced && 'hover:bg-[var(--color-surface-2)]',
      )}
    >
      {/* Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${catCfg.color} 12%, transparent)` }}
      >
        <span className="text-lg">{catCfg.emoji}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-[var(--color-silver-100)]">
            {exhibition.title}
          </h4>
          <Badge variant={statusCfg.variant} className="text-[10px]">
            {statusCfg.label}
          </Badge>
          {exhibition.opening_reception && (
            <Badge variant="gold" className="text-[10px]">
              <Sparkles className="mr-1 h-2.5 w-2.5" />
              Recepción
            </Badge>
          )}
        </div>

        <p className="mb-0.5 text-xs text-[var(--color-silver-300)]">
          {exhibition.artist_name} · {catCfg.label}
        </p>

        {exhibition.description && (
          <p className="mb-2 line-clamp-2 text-xs text-[var(--color-silver-400)]">
            {exhibition.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-silver-500)]">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDate(exhibition.start_date)} – {formatDate(exhibition.end_date)}
            {calcDuration() && <span className="text-[var(--color-silver-600)]">({calcDuration()})</span>}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {exhibition.venue}
          </span>
          <span className="flex items-center gap-1">
            <Frame className="h-3 w-3" />
            {exhibition.num_pieces} piezas
          </span>
        </div>

        {exhibition.notes && (
          <p className="mt-2 text-[10px] italic text-[var(--color-silver-500)]">
            📝 {exhibition.notes}
          </p>
        )}
      </div>

      {/* Status transitions */}
      {transitions.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {transitions.map((nextStatus) => (
            <Button
              key={nextStatus}
              variant="ghost"
              size="sm"
              className={cn(
                'min-h-[32px] gap-1 text-[10px]',
                nextStatus === 'cancelled'
                  ? 'text-[var(--color-rose-400)] hover:text-[var(--color-rose-300)]'
                  : 'text-[var(--color-sage-400)] hover:text-[var(--color-sage-300)]',
              )}
              onClick={() => onStatusChange(exhibition.id, exhibition.title, nextStatus)}
            >
              → {STATUS_LABELS[nextStatus]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
