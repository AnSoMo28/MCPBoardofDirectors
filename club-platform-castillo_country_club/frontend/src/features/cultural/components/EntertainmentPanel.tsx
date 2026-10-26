/**
 * EntertainmentPanel — F31, Tab 4
 *
 * Entertainment acts directory with KPIs, type filters, and status management.
 * HITL for hiring new artists, AUTO for list/status updates.
 *
 * Data: manage_entertainment_acts list (AUTO, staleTime 120s)
 * Pattern: P1 (auto-load), P9 (defensive), #14 EmptyState, #15 showToast
 */

import { useCallback, useMemo, useState } from 'react';
import {
  DollarSign,
  Loader2,
  Mic,
  Phone,
  Plus,
  User
} from 'lucide-react';

import { useMCPQuery, useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn, formatCurrency } from '@/shared/lib/utils';

import type {
  EntertainmentAct,
  EntertainmentType,
  PerformanceStatus,
} from '../types';
import {
  ENTERTAINMENT_TYPE_CONFIG,
  PERFORMANCE_STATUS_CONFIG,
} from '../types';
import EntertainmentFormModal from './EntertainmentFormModal';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface ActsResponse {
  status: string;
  message: string;
  acts: EntertainmentAct[];
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

type TypeFilter = 'all' | EntertainmentType;

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all',                  label: 'Todos' },
  { key: 'live_band',            label: 'Bandas' },
  { key: 'dj',                   label: 'DJs' },
  { key: 'comedian',             label: 'Comediantes' },
  { key: 'speaker',              label: 'Oradores' },
  { key: 'cultural_performance', label: 'Performance Cultural' },
  { key: 'dance_performance',    label: 'Danza' },
  { key: 'magician',             label: 'Magos' },
];

const STATUS_TRANSITIONS: Record<PerformanceStatus, PerformanceStatus[]> = {
  proposed:    ['contracted', 'cancelled'],
  contracted:  ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

const STATUS_LABELS: Record<PerformanceStatus, string> = {
  proposed: 'Propuesto',
  contracted: 'Contratado',
  confirmed: 'Confirmado',
  in_progress: 'En Curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function EntertainmentPanel() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [showModal, setShowModal] = useState(false);
  useReducedMotion();

  const { data, isLoading, isError, refetch } = useMCPQuery(
    'cultural_social',
    'manage_entertainment_acts',
    { action: 'list' },
    { staleTime: 120_000 },
  );

  const statusMutation = useMCPMutation('cultural_social', 'manage_entertainment_acts');

  const acts = useMemo(() => {
    const resp = data as ActsResponse | undefined;
    return resp?.acts ?? [];
  }, [data]);

  // Filter
  const filtered = useMemo(
    () =>
      typeFilter === 'all'
        ? acts
        : acts.filter((a) => a.entertainment_type === typeFilter),
    [acts, typeFilter],
  );

  // KPIs
  const kpis = useMemo(() => {
    const contracted = acts.filter(
      (a) => ['contracted', 'confirmed', 'in_progress'].includes(a.status),
    ).length;
    const negotiating = acts.filter((a) => a.status === 'proposed').length;
    const totalCost = acts.reduce((s, a) => s + a.cost, 0);
    const avgCost = acts.length > 0 ? totalCost / acts.length : 0;
    return { total: acts.length, contracted, negotiating, totalCost, avgCost };
  }, [acts]);

  const handleStatusChange = useCallback(
    async (actId: string, artistName: string, newStatus: PerformanceStatus) => {
      try {
        await statusMutation.mutateAsync({
          action: 'update_status',
          act_id: actId,
          new_status: newStatus,
        });
        showToast({
          type: 'success',
          message: `'${artistName}' → ${STATUS_LABELS[newStatus]}`,
        });
        refetch();
      } catch {
        showToast({ type: 'error', message: 'Error actualizando el estado' });
      }
    },
    [statusMutation, refetch],
  );

  const handleCreated = useCallback(() => {
    setShowModal(false);
    showToast({
      type: 'success',
      message: 'Artista registrado — enviado a aprobación del administrador',
    });
    refetch();
  }, [refetch]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-emerald-400)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-rose-400)]">
        Error cargando entretenimiento. Intentá de nuevo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Strip + Action ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <EntKPI label="Total" value={kpis.total} color="var(--color-silver-200)" />
          <EntKPI label="Contratados" value={kpis.contracted} color="var(--color-emerald-400)" />
          <EntKPI label="Negociando" value={kpis.negotiating} color="var(--color-amber-400)" />
          <EntKPI label="Costo total" value={formatCurrency(kpis.totalCost)} color="var(--color-gold-400)" isCurrency />
        </div>

        <Button
          variant="sage"
          size="sm"
          className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-emerald-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-emerald-400)_12%,transparent)] text-[var(--color-emerald-400)] hover:bg-[color-mix(in_srgb,var(--color-emerald-400)_20%,transparent)]"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
          Contratar Artista
        </Button>
      </div>

      {/* ── Type Filters ── */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]',
              typeFilter === f.key
                ? 'bg-[color-mix(in_srgb,var(--color-emerald-400)_15%,transparent)] text-[var(--color-emerald-400)] border border-[color-mix(in_srgb,var(--color-emerald-400)_30%,transparent)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-silver-400)] border border-transparent hover:text-[var(--color-silver-200)]',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Acts ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Mic className="w-8 h-8" />}
          title="Sin actos de entretenimiento"
          description="Bandas, DJs, comediantes, performers — registrá el primer artista o acto de entretenimiento."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((act) => (
            <ActCard
              key={act.id}
              act={act}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <EntertainmentFormModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

function EntKPI({
  label,
  value,
  color,
  isCurrency = false,
}: {
  label: string;
  value: string | number;
  color: string;
  isCurrency?: boolean;
}) {
  return (
    <div className="glass-card px-3 py-2">
      <p className="text-[10px] text-[var(--color-silver-500)]">{label}</p>
      <p
        className={cn(
          'font-semibold',
          isCurrency ? 'text-sm' : 'font-[family-name:var(--font-mono)] text-lg',
        )}
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

function ActCard({
  act,
  onStatusChange,
}: {
  act: EntertainmentAct;
  onStatusChange: (id: string, name: string, status: PerformanceStatus) => void;
}) {
  const prefersReduced = useReducedMotion();
  const typeCfg = ENTERTAINMENT_TYPE_CONFIG[act.entertainment_type] ?? {
    emoji: '🎵', color: 'var(--color-silver-400)', label: act.entertainment_type,
  };
  const statusCfg = PERFORMANCE_STATUS_CONFIG[act.status];
  const transitions = STATUS_TRANSITIONS[act.status] ?? [];

  const formatDuration = (min: number) => {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
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
        style={{ background: `color-mix(in srgb, ${typeCfg.color} 12%, transparent)` }}
      >
        <span className="text-lg">{typeCfg.emoji}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-[var(--color-silver-100)]">
            {act.artist_name}
          </h4>
          <Badge variant={statusCfg.variant as "success" | "warning" | "error" | "info" | "neutral" | "gold" | "sage"} className="text-[10px]">
            {statusCfg.label}
          </Badge>
        </div>

        <p className="mb-0.5 text-xs text-[var(--color-silver-300)]">
          {typeCfg.label} · {act.genre || 'Sin género'}
        </p>

        {act.description && (
          <p className="mb-2 line-clamp-2 text-xs text-[var(--color-silver-400)]">
            {act.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-silver-500)]">
          <span className="font-[family-name:var(--font-mono)]">
            {formatDuration(act.duration_minutes)}
          </span>
          <span className="flex items-center gap-1 font-[family-name:var(--font-mono)]">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(act.cost)}
          </span>
          {act.contact_person && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {act.contact_person}
            </span>
          )}
          {act.contact_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {act.contact_phone}
            </span>
          )}
        </div>

        {/* Requirements */}
        {act.requirements && act.requirements.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {act.requirements.map((req, i) => (
              <span
                key={i}
                className="rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-[10px] text-[var(--color-silver-400)]"
              >
                {req}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {act.notes && (
          <p className="mt-2 text-[10px] italic text-[var(--color-silver-500)]">
            📝 {act.notes}
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
                  : 'text-[var(--color-emerald-400)] hover:text-[var(--color-emerald-300)]',
              )}
              onClick={() => onStatusChange(act.id, act.artist_name, nextStatus)}
            >
              → {STATUS_LABELS[nextStatus]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
