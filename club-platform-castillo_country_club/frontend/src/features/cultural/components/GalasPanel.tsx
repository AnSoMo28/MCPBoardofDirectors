/**
 * GalasPanel — F31, Tab 2
 *
 * Two sections:
 *  1. Galas Formales (premium, HITL) — organize_formal_gala
 *  2. Eventos Sociales Regulares (AUTO) — manage_social_events
 *
 * Data: manage_social_events list (AUTO, staleTime 120s)
 * Pattern: P1 (auto-load), P15 (Button swap), #14 EmptyState, #15 showToast
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Crown,
  Loader2,
  Plus,
  Sparkles,
  Users,
  XCircle,
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
} from 'lucide-react';

import { useMCPQuery, useMCPMutation } from '@/shared/hooks/useMCPQuery';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn, formatCurrency } from '@/shared/lib/utils';

import type { CulturalEvent, FormalityLevel } from '../types';
import {
  EVENT_TYPE_CONFIG,
  FORMALITY_CONFIG,
  getStatusConfig,
} from '../types';
import GalaFormModal from './GalaFormModal';
import SocialEventFormModal from './SocialEventFormModal';
import './GalasPanel.css';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface SocialEventsResponse {
  status: string;
  message: string;
  events: CulturalEvent[];
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function GalasPanel() {
  const [showGalaModal, setShowGalaModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  useReducedMotion();

  // Auto-load social events list (includes galas)
  const { data, isLoading, isError, refetch } = useMCPQuery(
    'cultural_social',
    'manage_social_events',
    { action: 'list' },
    { staleTime: 120_000 },
  );

  // Cancel mutation
  const cancelMutation = useMCPMutation(
    'cultural_social',
    'manage_social_events',
  );

  const events = useMemo(() => {
    const resp = data as SocialEventsResponse | undefined;
    return resp?.events ?? [];
  }, [data]);

  // Split: galas vs regular social events
  const galas = useMemo(
    () => events.filter((e) => e.event_type === 'gala'),
    [events],
  );
  const socialEvents = useMemo(
    () => events.filter((e) => e.event_type !== 'gala'),
    [events],
  );

  const handleCancel = useCallback(
    async (eventId: string, eventName: string) => {
      try {
        await cancelMutation.mutateAsync({
          action: 'cancel',
          event_id: eventId,
        });
        showToast({ type: 'success', message: `Evento '${eventName}' cancelado` });
        refetch();
      } catch {
        showToast({ type: 'error', message: 'Error cancelando el evento' });
      }
    },
    [cancelMutation, refetch],
  );

  const handleGalaCreated = useCallback(() => {
    setShowGalaModal(false);
    showToast({
      type: 'success',
      message: 'Gala enviada a aprobación — aparecerá en la cola del administrador',
    });
    refetch();
  }, [refetch]);

  const handleEventCreated = useCallback(() => {
    setShowEventModal(false);
    showToast({ type: 'success', message: 'Evento social creado exitosamente' });
    refetch();
  }, [refetch]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="galas-panel flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-gold-400)]" />
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-rose-400)]">
        Error cargando eventos. Intentá de nuevo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Action Bar ── */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="sage"
          size="sm"
          className="min-h-[44px] gap-2 border border-[color-mix(in_srgb,var(--color-gold-400)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-gold-400)_12%,transparent)] text-[var(--color-gold-400)] hover:bg-[color-mix(in_srgb,var(--color-gold-400)_20%,transparent)]"
          onClick={() => setShowGalaModal(true)}
        >
          <Crown className="h-4 w-4" />
          Organizar Gala
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] gap-2 text-[var(--color-silver-300)]"
          onClick={() => setShowEventModal(true)}
        >
          <Plus className="h-4 w-4" />
          Crear Evento Social
        </Button>
      </div>

      {/* ── Section 1: Galas ── */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-silver-200)]">
          <Crown className="h-4 w-4 text-[var(--color-gold-400)]" />
          Galas Formales
          <Badge variant="sage" className="text-[10px]">
            {galas.length}
          </Badge>
        </h3>

        {galas.length === 0 ? (
          <EmptyState
            icon={<Crown className="h-8 w-8" />}
            title="Sin galas programadas"
            description="Las galas son el evento insignia del club. Organizá la próxima gala formal."
          />
        ) : (
          <div className="space-y-2">
            {galas.map((gala) => (
              <EventCard
                key={gala.id}
                event={gala}
                isPremium
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Social Events ── */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-silver-200)]">
          <Sparkles className="h-4 w-4 text-[var(--color-terracotta-400)]" />
          Eventos Sociales
          <Badge variant="sage" className="text-[10px]">
            {socialEvents.length}
          </Badge>
        </h3>

        {socialEvents.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title="Sin eventos sociales"
            description="Cenas temáticas, mixers, cócteles, brunchs — creá el primer evento social."
          />
        ) : (
          <div className="space-y-2">
            {socialEvents.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Modals ── */}
      {showGalaModal && (
        <GalaFormModal
          onClose={() => setShowGalaModal(false)}
          onSuccess={handleGalaCreated}
        />
      )}
      {showEventModal && (
        <SocialEventFormModal
          onClose={() => setShowEventModal(false)}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  EVENT CARD
// ══════════════════════════════════════════════════════════

function EventCard({
  event,
  isPremium = false,
  onCancel,
}: {
  event: CulturalEvent;
  isPremium?: boolean;
  onCancel: (id: string, name: string) => void;
}) {
  const prefersReduced = useReducedMotion();
  const statusCfg = getStatusConfig('event', event.status);
  const typeCfg = EVENT_TYPE_CONFIG[event.event_type];
  const formalityCfg = FORMALITY_CONFIG[event.formality as FormalityLevel];

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return d;
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-lg border p-4 transition-all sm:flex-row sm:items-start',
        isPremium
          ? 'border-[color-mix(in_srgb,var(--color-gold-400)_15%,transparent)] bg-[var(--color-surface-1)]'
          : 'border-[color-mix(in_srgb,var(--color-silver-600)_10%,transparent)] bg-[var(--color-surface-1)]',
        !prefersReduced && 'hover:bg-[var(--color-surface-2)]',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          isPremium
            ? 'bg-[color-mix(in_srgb,var(--color-gold-400)_12%,transparent)]'
            : 'bg-[color-mix(in_srgb,var(--color-terracotta-400)_12%,transparent)]',
        )}
      >
        <span className="text-lg">{typeCfg?.emoji ?? '🎭'}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-[var(--color-silver-100)]">
            {event.name}
          </h4>
          <Badge variant={statusCfg.variant} className="text-[10px]">
            {statusCfg.label}
          </Badge>
          {formalityCfg && (
            <Badge variant={formalityCfg.badge} className="text-[10px]">
              {formalityCfg.label}
            </Badge>
          )}
          {event.status === 'planned' && (
            <Badge variant="warning" className="text-[10px]">
              Pendiente aprobación
            </Badge>
          )}
        </div>

        <p className="mb-2 line-clamp-2 text-xs text-[var(--color-silver-400)]">
          {event.description}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-silver-500)]">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDate(event.date)} · {event.start_time}–{event.end_time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {event.venue}
          </span>
          {event.guest_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.guest_count} invitados
            </span>
          )}
          {event.budget > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(event.budget)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {event.status !== 'cancelled' && event.status !== 'completed' && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[36px] gap-1 text-[var(--color-rose-400)] hover:text-[var(--color-rose-300)]"
            onClick={() => onCancel(event.id, event.name)}
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
