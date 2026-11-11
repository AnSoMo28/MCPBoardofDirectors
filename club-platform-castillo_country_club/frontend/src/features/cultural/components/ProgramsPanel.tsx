/**
 * ProgramsPanel — F31, Tab 3
 *
 * Cultural programs grouped by season with category filters.
 * Programs have lifecycle: draft → enrolling → active → completed.
 * HITL for create, AUTO for list/status updates.
 *
 * Data: manage_cultural_program list (AUTO, staleTime 120s)
 * Pattern: P1 (auto-load), P9 (defensive rendering), #14 EmptyState, #15 showToast
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Loader2,
  Music,
  Plus,
  Users,
} from 'lucide-react';

import { useMCPQuery, useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn, formatCurrency } from '@/shared/lib/utils';

import type {
  CulturalProgram,
  CulturalCategory,
  ProgramStatus,
} from '../types';
import {
  CATEGORY_CONFIG,
  PROGRAM_STATUS_CONFIG,
  formatEnrollment,
} from '../types';
import ProgramFormModal from './ProgramFormModal';
import './ProgramsPanel.css';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface ProgramsResponse {
  status: string;
  message: string;
  programs: CulturalProgram[];
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

type CategoryFilter = 'all' | CulturalCategory;

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all',          label: 'Todos' },
  { key: 'music',        label: 'Música' },
  { key: 'visual_arts',  label: 'Arte' },
  { key: 'theater',      label: 'Teatro' },
  { key: 'dance',        label: 'Danza' },
  { key: 'literature',   label: 'Literatura' },
  { key: 'gastronomy',   label: 'Gastronomía' },
  { key: 'heritage',     label: 'Patrimonio' },
];

const STATUS_TRANSITIONS: Record<ProgramStatus, ProgramStatus[]> = {
  draft:     ['enrolling', 'cancelled'],
  enrolling: ['active', 'cancelled'],
  active:    ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: 'Borrador',
  enrolling: 'Inscripciones abiertas',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function ProgramsPanel() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showModal, setShowModal] = useState(false);
  useReducedMotion();

  const { data, isLoading, isError, refetch } = useMCPQuery(
    'cultural_social',
    'manage_cultural_program',
    { action: 'list' },
    { staleTime: 120_000 },
  );

  const statusMutation = useMCPMutation('cultural_social', 'manage_cultural_program');

  const programs = useMemo(() => {
    const resp = data as ProgramsResponse | undefined;
    return resp?.programs ?? [];
  }, [data]);

  // Filter by category
  const filtered = useMemo(
    () =>
      categoryFilter === 'all'
        ? programs
        : programs.filter((p) => p.category === categoryFilter),
    [programs, categoryFilter],
  );

  // Group by season
  const grouped = useMemo(() => {
    const map = new Map<string, CulturalProgram[]>();
    for (const prog of filtered) {
      const season = prog.season || 'Sin temporada';
      if (!map.has(season)) map.set(season, []);
      map.get(season)!.push(prog);
    }
    // Sort seasons desc
    return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  }, [filtered]);

  // KPIs
  const kpis = useMemo(() => {
    const active = programs.filter((p) => p.status === 'active').length;
    const enrolling = programs.filter((p) => p.status === 'enrolling').length;
    const totalParticipants = programs.reduce((s, p) => s + p.current_participants, 0);
    const totalBudget = programs.reduce((s, p) => s + p.budget, 0);
    return { active, enrolling, totalParticipants, totalBudget };
  }, [programs]);

  const handleStatusChange = useCallback(
    async (programId: string, programName: string, newStatus: ProgramStatus) => {
      try {
        await statusMutation.mutateAsync({
          action: 'update_status',
          program_id: programId,
          new_status: newStatus,
        });
        showToast({
          type: 'success',
          message: `Programa '${programName}' → ${STATUS_LABELS[newStatus]}`,
        });
        refetch();
      } catch {
        showToast({ type: 'error', message: 'Error actualizando el programa' });
      }
    },
    [statusMutation, refetch],
  );

  const handleCreated = useCallback(() => {
    setShowModal(false);
    showToast({
      type: 'success',
      message: 'Programa enviado a aprobación — aparecerá en la cola del administrador',
    });
    refetch();
  }, [refetch]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="programs-panel flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-teal-400)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-rose-400)]">
        Error cargando programas. Intentá de nuevo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Action Bar + KPIs ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-xs text-[var(--color-silver-400)]">
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
              {kpis.active}
            </strong>{' '}
            activos
          </span>
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-teal-400)]">
              {kpis.enrolling}
            </strong>{' '}
            inscripciones
          </span>
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
              {kpis.totalParticipants}
            </strong>{' '}
            participantes
          </span>
          <span>
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-gold-400)]">
              {formatCurrency(kpis.totalBudget)}
            </strong>{' '}
            presupuesto
          </span>
        </div>

        <Button
          variant="sage"
          size="sm"
          className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-teal-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-teal-400)_12%,transparent)] text-[var(--color-teal-400)] hover:bg-[color-mix(in_srgb,var(--color-teal-400)_20%,transparent)]"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
          Nuevo Programa
        </Button>
      </div>

      {/* ── Category Filters ── */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <Button
            variant="unstyled"
            key={f.key}
            onClick={() => setCategoryFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]',
              categoryFilter === f.key
                ? 'bg-[color-mix(in_srgb,var(--color-teal-400)_15%,transparent)] text-[var(--color-teal-400)] border border-[color-mix(in_srgb,var(--color-teal-400)_30%,transparent)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-silver-400)] border border-transparent hover:text-[var(--color-silver-200)]',
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* ── Programs grouped by season ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Music className="h-8 w-8" />}
          title="Sin programas culturales"
          description="Talleres de arte, clases de música, charlas, ciclos gastronómicos — creá el primer programa cultural."
        />
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([season, progs]) => (
            <section key={season}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-silver-200)]">
                <CalendarIcon className="h-4 w-4 text-[var(--color-teal-400)]" />
                {season}
                <Badge variant="sage" className="text-[10px]">
                  {progs.length}
                </Badge>
              </h3>

              <div className="space-y-2">
                {progs.map((prog) => (
                  <ProgramCard
                    key={prog.id}
                    program={prog}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <ProgramFormModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PROGRAM CARD
// ══════════════════════════════════════════════════════════

function ProgramCard({
  program,
  onStatusChange,
}: {
  program: CulturalProgram;
  onStatusChange: (id: string, name: string, status: ProgramStatus) => void;
}) {
  const prefersReduced = useReducedMotion();
  const catCfg = CATEGORY_CONFIG[program.category] ?? { emoji: '📌', color: 'var(--color-silver-400)', label: program.category };
  const statusCfg = PROGRAM_STATUS_CONFIG[program.status];

  const transitions = STATUS_TRANSITIONS[program.status] ?? [];
  const enrollmentPct =
    program.max_participants > 0
      ? Math.round((program.current_participants / program.max_participants) * 100)
      : -1;

  const formatDateRange = (s: string, e: string) => {
    try {
      const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      const startDate = new Date(s + 'T00:00:00').toLocaleDateString('es-CR', fmt);
      const endDate = new Date(e + 'T00:00:00').toLocaleDateString('es-CR', fmt);
      return `${startDate} – ${endDate}`;
    } catch {
      return `${s} – ${e}`;
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
            {program.name}
          </h4>
          <Badge variant={statusCfg.variant} className="text-[10px]">
            {statusCfg.label}
          </Badge>
        </div>

        <p className="mb-2 line-clamp-2 text-xs text-[var(--color-silver-400)]">
          {program.description}
        </p>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-silver-500)]">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDateRange(program.start_date, program.end_date)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatEnrollment(program.current_participants, program.max_participants)}
          </span>
          {program.budget > 0 && (
            <span className="font-[family-name:var(--font-mono)]">
              {formatCurrency(program.budget)}
            </span>
          )}
        </div>

        {/* Enrollment bar */}
        {enrollmentPct >= 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  enrollmentPct >= 75
                    ? 'bg-[var(--color-emerald-400)]'
                    : enrollmentPct >= 40
                    ? 'bg-[var(--color-teal-400)]'
                    : 'bg-[var(--color-amber-400)]',
                )}
                style={{ width: `${Math.min(100, enrollmentPct)}%` }}
              />
            </div>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-silver-400)]">
              {enrollmentPct}%
            </span>
          </div>
        )}

        {/* Notes */}
        {program.notes && (
          <p className="mt-2 text-[10px] italic text-[var(--color-silver-500)]">
            📝 {program.notes}
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
                  : 'text-[var(--color-teal-400)] hover:text-[var(--color-teal-300)]',
              )}
              onClick={() => onStatusChange(program.id, program.name, nextStatus)}
            >
              → {STATUS_LABELS[nextStatus]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
