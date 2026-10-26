/**
 * GalasCommand — V2 of GalasPanel (F31, Tab 2)
 *
 * NOT a CRUD list. A COMMAND CENTER where:
 * — Galas (premium, HITL) are the hero section
 * — Social events are the supporting calendar
 * — AI interprets each event's formality fit, budget efficiency, timing
 * — Cross-references detect budget concentration and temporal gaps
 * — Status management preserved via contextual actions
 *
 * Two creation callbacks: onCreateGala (HITL) + onCreateEvent (AUTO).
 * Two cancel callbacks: onCancelGala + onCancelEvent.
 *
 * Fields used: ONLY verified on CulturalEvent:
 * id, name, event_type, description, status, date, start_time,
 * end_time, venue, guest_count, budget, formality
 *
 * @module cultural/components/GalasCommand
 */

import { useMemo, useCallback } from 'react';
import {
  Crown,
  Plus,
  Sparkles,
  Users,
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
  XCircle,
} from 'lucide-react';

import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn, formatCurrency } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

import type {
  CulturalEvent,
  FormalityLevel,
  CulturalAnalytics,
} from '../types';
import {
  EVENT_TYPE_CONFIG,
  FORMALITY_CONFIG,
  getStatusConfig,
} from '../types';
import './GalasCommand.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface GalasCommandProps {
  events: CulturalEvent[];
  analytics?: CulturalAnalytics;
  isLoading?: boolean;
  onCreateGala?: () => void;
  onCreateEvent?: () => void;
  onCancelEvent?: (eventId: string, eventName: string) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

const MS_PER_DAY = 86_400_000;

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

function daysUntil(dateStr: string): number {
  try {
    const target = new Date(dateStr + 'T00:00:00').getTime();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target - now.getTime()) / MS_PER_DAY);
  } catch {
    return 0;
  }
}

function statusToDataAttr(status: string): string {
  switch (status) {
    case 'confirmed': return 'confirmed';
    case 'planned': return 'planned';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default: return 'default';
  }
}

// ══════════════════════════════════════════════════════════
//  AI INTERPRETATION
// ══════════════════════════════════════════════════════════

function interpretEvent(
  event: CulturalEvent,
  allEvents: CulturalEvent[],
  _analytics?: CulturalAnalytics,
): string {
  const parts: string[] = [];
  const days = daysUntil(event.date);

  // Timing interpretation
  if (days > 0 && days <= 7) {
    parts.push(`En ${days} día(s) — próximo.`);
  } else if (days > 7 && days <= 30) {
    parts.push(`En ${days} días — ${Math.round(days / 7)} semana(s).`);
  } else if (days > 30) {
    parts.push(`En ${Math.round(days / 30)} mes(es).`);
  } else if (days === 0) {
    parts.push('Hoy.');
  } else if (days < 0) {
    parts.push(`Hace ${Math.abs(days)} días.`);
  }

  // Budget efficiency
  if (event.guest_count > 0 && event.budget > 0) {
    const costPerGuest = Math.round(event.budget / event.guest_count);
    parts.push(`${formatCurrency(costPerGuest)}/invitado.`);

    // Benchmark against all events
    const otherEvents = allEvents.filter(
      (e) => e.guest_count > 0 && e.budget > 0 && e.event_type === event.event_type,
    );
    if (otherEvents.length > 0) {
      const avgCostPerGuest = Math.round(
        otherEvents.reduce((s, e) => s + e.budget / e.guest_count, 0) /
          otherEvents.length,
      );
      const diff = costPerGuest - avgCostPerGuest;
      if (diff > avgCostPerGuest * 0.3) {
        parts.push(`${Math.round((diff / avgCostPerGuest) * 100)}% sobre el promedio del tipo.`);
      } else if (diff < -avgCostPerGuest * 0.3) {
        parts.push(`${Math.round(Math.abs(diff / avgCostPerGuest) * 100)}% bajo el promedio — eficiente.`);
      }
    }
  }

  // Formality fit
  if (event.formality) {
    const formalityCfg = FORMALITY_CONFIG[event.formality as FormalityLevel];
    if (formalityCfg) {
      if (event.event_type === 'gala' && event.formality !== 'black_tie') {
        parts.push(`Gala con formalidad "${formalityCfg.label}" — considerar black-tie.`);
      }
      if (event.event_type !== 'gala' && event.formality === 'black_tie') {
        parts.push('Black-tie para evento no-gala: puede ser overkill.');
      }
    }
  }

  // Status insight
  if (event.status === 'planned') {
    parts.push('Pendiente de aprobación HITL.');
  }

  return parts.join(' ');
}

function generateHeroSummary(
  galas: CulturalEvent[],
  socialEvents: CulturalEvent[],
  _analytics?: CulturalAnalytics,
): string {
  const total = galas.length + socialEvents.length;
  if (total === 0) return 'Sin eventos. La programación social está vacía.';

  const parts: string[] = [];
  parts.push(`${total} evento(s) total.`);

  if (galas.length > 0) {
    const upcomingGala = galas
      .filter((g) => daysUntil(g.date) > 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (upcomingGala) {
      const d = daysUntil(upcomingGala.date);
      parts.push(`Próxima gala: "${upcomingGala.name}" en ${d} día(s).`);
    } else {
      parts.push(`${galas.length} gala(s) registrada(s), ninguna próxima.`);
    }
  }

  if (socialEvents.length > 0) {
    const upcoming = socialEvents.filter((e) => daysUntil(e.date) > 0).length;
    parts.push(`${upcoming} evento(s) social(es) próximo(s).`);
  }

  const totalBudget = [...galas, ...socialEvents].reduce((s, e) => s + e.budget, 0);
  if (totalBudget > 0) {
    parts.push(`Inversión total: ${formatCurrency(totalBudget)}.`);
  }

  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════
//  CROSS-REFERENCES
// ══════════════════════════════════════════════════════════

interface GalasCrossRef {
  severity: 'opportunity' | 'warning' | 'insight';
  icon: string;
  text: string;
}

function generateCrossRefs(
  galas: CulturalEvent[],
  socialEvents: CulturalEvent[],
): GalasCrossRef[] {
  const refs: GalasCrossRef[] = [];
  const all = [...galas, ...socialEvents];

  // 1. Budget concentration in galas
  const totalBudget = all.reduce((s, e) => s + e.budget, 0);
  const galaBudget = galas.reduce((s, e) => s + e.budget, 0);
  if (totalBudget > 0 && galaBudget > totalBudget * 0.7 && galas.length < all.length) {
    refs.push({
      severity: 'warning',
      icon: '👑',
      text: `${Math.round((galaBudget / totalBudget) * 100)}% del presupuesto concentrado en galas. Considerar diversificar hacia eventos sociales.`,
    });
  }

  // 2. No upcoming galas
  const upcomingGalas = galas.filter((g) => daysUntil(g.date) > 0);
  if (galas.length > 0 && upcomingGalas.length === 0) {
    refs.push({
      severity: 'opportunity',
      icon: '📅',
      text: 'Sin galas próximas. Programar la próxima gala para mantener el engagement premium.',
    });
  }

  // 3. Temporal gaps
  const allSorted = [...all]
    .filter((e) => e.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));
  if (allSorted.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < allSorted.length; i++) {
      const gap = Math.round(
        (new Date(allSorted[i].date).getTime() - new Date(allSorted[i - 1].date).getTime()) /
          MS_PER_DAY,
      );
      gaps.push(gap);
    }
    const maxGap = Math.max(...gaps);
    if (maxGap > 30) {
      refs.push({
        severity: 'opportunity',
        icon: '📆',
        text: `Gap de ${maxGap} días entre eventos. Considerar programar actividad intermedia.`,
      });
    }
  }

  // 4. High guest count events without gala formality
  const bigSocial = socialEvents.filter((e) => e.guest_count > 100 && e.formality !== 'black_tie');
  if (bigSocial.length > 0) {
    refs.push({
      severity: 'insight',
      icon: '👥',
      text: `${bigSocial.length} evento(s) social(es) con +100 invitados. Podrían ser candidatos para upgrade a gala.`,
    });
  }

  return refs;
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function GalasCommand({
  events,
  analytics,
  isLoading = false,
  onCreateGala,
  onCreateEvent,
  onCancelEvent,
  className = '',
}: GalasCommandProps) {
  const prefersReduced = useReducedMotion();

  // ── Split galas vs social events ──
  const galas = useMemo(
    () => events.filter((e) => e.event_type === 'gala'),
    [events],
  );

  const socialEvents = useMemo(
    () => events.filter((e) => e.event_type !== 'gala'),
    [events],
  );

  // ── Intelligence ──
  const heroSummary = useMemo(
    () => generateHeroSummary(galas, socialEvents, analytics),
    [galas, socialEvents, analytics],
  );

  const crossRefs = useMemo(
    () => generateCrossRefs(galas, socialEvents),
    [galas, socialEvents],
  );

  // ── KPIs ──
  const kpis = useMemo(() => {
    const allEvents = [...galas, ...socialEvents];
    const totalBudget = allEvents.reduce((s, e) => s + e.budget, 0);
    const totalGuests = allEvents.reduce((s, e) => s + e.guest_count, 0);
    const upcoming = allEvents.filter((e) => daysUntil(e.date) > 0 && e.status !== 'cancelled').length;
    const pendingApproval = galas.filter((g) => g.status === 'planned').length;

    return {
      total: allEvents.length,
      galas: galas.length,
      social: socialEvents.length,
      totalBudget,
      totalGuests,
      upcoming,
      pendingApproval,
    };
  }, [galas, socialEvents]);

  // ── Cancel handler ──
  const handleCancel = useCallback(
    (eventId: string, eventName: string) => {
      if (onCancelEvent) {
        onCancelEvent(eventId, eventName);
        showToast({ type: 'success', message: `Evento '${eventName}' cancelado` });
      }
    },
    [onCancelEvent],
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="gc">
        <div className="gc__skeleton-hero" />
        <div className="gc__skeleton-section">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={i}
              className="gc__skeleton-card"
              style={{ '--stagger-i': i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('gc', className)}
      data-prefers-reduced={prefersReduced ? 'true' : undefined}
    >
      {/* ═══════════════════════════════════════ */}
      {/*  HERO: AI Summary + KPIs + Actions     */}
      {/* ═══════════════════════════════════════ */}
      <header className="gc__hero">
        <div className="gc__hero-top">
          <div className="gc__hero-header">
            <Crown size={18} className="gc__hero-icon" />
            <h2 className="gc__title">Galas & Eventos Sociales</h2>
          </div>
          <div className="gc__hero-actions">
            {onCreateGala && (
              <Button
                variant="ghost"
                size="sm"
                className="gc__create-btn gc__create-btn--gold"
                onClick={onCreateGala}
              >
                <Crown size={14} />
                Organizar Gala
              </Button>
            )}
            {onCreateEvent && (
              <Button
                variant="ghost"
                size="sm"
                className="gc__create-btn"
                onClick={onCreateEvent}
              >
                <Plus size={14} />
                Evento Social
              </Button>
            )}
          </div>
        </div>

        <p className="gc__ai-summary">{heroSummary}</p>

        <div className="gc__kpis">
          <div className="gc__kpi" style={{ '--stagger-i': 0 } as React.CSSProperties}>
            <span className="gc__kpi-value" data-color="gold">{kpis.galas}</span>
            <span className="gc__kpi-label">Galas</span>
          </div>
          <div className="gc__kpi" style={{ '--stagger-i': 1 } as React.CSSProperties}>
            <span className="gc__kpi-value" data-color="terracotta">{kpis.social}</span>
            <span className="gc__kpi-label">Sociales</span>
          </div>
          <div className="gc__kpi" style={{ '--stagger-i': 2 } as React.CSSProperties}>
            <span className="gc__kpi-value" data-color="silver">{kpis.upcoming}</span>
            <span className="gc__kpi-label">Próximos</span>
          </div>
          <div className="gc__kpi" style={{ '--stagger-i': 3 } as React.CSSProperties}>
            <span className="gc__kpi-value" data-color="gold">{formatCurrency(kpis.totalBudget)}</span>
            <span className="gc__kpi-label">Inversión</span>
          </div>
          <div className="gc__kpi" style={{ '--stagger-i': 4 } as React.CSSProperties}>
            <span className="gc__kpi-value" data-color="silver">{kpis.totalGuests}</span>
            <span className="gc__kpi-label">Invitados</span>
          </div>
          {kpis.pendingApproval > 0 && (
            <div className="gc__kpi gc__kpi--alert" style={{ '--stagger-i': 5 } as React.CSSProperties}>
              <span className="gc__kpi-value" data-color="amber">{kpis.pendingApproval}</span>
              <span className="gc__kpi-label">Pendientes</span>
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════ */}
      {/*  CROSS-REFERENCES                      */}
      {/* ═══════════════════════════════════════ */}
      {crossRefs.length > 0 && (
        <div className="gc__cross-refs">
          {crossRefs.map((ref, i) => (
            <div
              key={i}
              className="gc__cross-ref"
              data-severity={ref.severity}
              style={{ '--stagger-i': i } as React.CSSProperties}
            >
              <span className="gc__cross-ref-icon">{ref.icon}</span>
              <p className="gc__cross-ref-text">{ref.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  SECTION 1: GALAS FORMALES             */}
      {/* ═══════════════════════════════════════ */}
      <section className="gc__section">
        <div className="gc__section-header">
          <Crown size={14} className="gc__section-icon gc__section-icon--gold" />
          <h3 className="gc__section-title">Galas Formales</h3>
          <Badge variant="gold" className="gc__section-count">
            {galas.length}
          </Badge>
        </div>

        {galas.length === 0 ? (
          <EmptyState
            icon={<Crown size={32} />}
            title="Sin galas programadas"
            description="Las galas son el evento insignia del club. Organizá la próxima gala formal."
            action={
              onCreateGala ? (
                <Button variant="ghost" size="sm" className="gc__empty-btn" onClick={onCreateGala}>
                  <Crown size={14} />
                  Organizar Gala
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="gc__events-list">
            {galas.map((gala, i) => (
              <EventCard
                key={gala.id}
                event={gala}
                allEvents={events}
                analytics={analytics}
                isPremium
                index={i}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════ */}
      {/*  SECTION 2: EVENTOS SOCIALES           */}
      {/* ═══════════════════════════════════════ */}
      <section className="gc__section">
        <div className="gc__section-header">
          <Sparkles size={14} className="gc__section-icon gc__section-icon--terracotta" />
          <h3 className="gc__section-title">Eventos Sociales</h3>
          <Badge variant="sage" className="gc__section-count">
            {socialEvents.length}
          </Badge>
        </div>

        {socialEvents.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={32} />}
            title="Sin eventos sociales"
            description="Cenas temáticas, mixers, cócteles, brunchs — creá el primer evento social."
            action={
              onCreateEvent ? (
                <Button variant="ghost" size="sm" className="gc__empty-btn" onClick={onCreateEvent}>
                  <Plus size={14} />
                  Crear Evento
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="gc__events-list">
            {socialEvents.map((evt, i) => (
              <EventCard
                key={evt.id}
                event={evt}
                allEvents={events}
                analytics={analytics}
                index={i}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  EVENT CARD (sub-component)
// ══════════════════════════════════════════════════════════

function EventCard({
  event,
  allEvents,
  analytics,
  isPremium = false,
  index = 0,
  onCancel,
}: {
  event: CulturalEvent;
  allEvents: CulturalEvent[];
  analytics?: CulturalAnalytics;
  isPremium?: boolean;
  index?: number;
  onCancel: (id: string, name: string) => void;
}) {
  const statusCfg = getStatusConfig('event', event.status);
  const typeCfg = EVENT_TYPE_CONFIG[event.event_type];
  const formalityCfg = FORMALITY_CONFIG[event.formality as FormalityLevel];
  const insight = interpretEvent(event, allEvents, analytics);
  const statusAttr = statusToDataAttr(event.status);
  const days = daysUntil(event.date);

  return (
    <div
      className={cn('gc__card', isPremium && 'gc__card--premium')}
      data-status={statusAttr}
      data-formality={event.formality}
      style={{ '--stagger-i': index } as React.CSSProperties}
    >
      {/* Icon */}
      <div className="gc__card-icon" data-premium={isPremium ? 'true' : undefined}>
        <span>{typeCfg?.emoji ?? '🎭'}</span>
      </div>

      {/* Content */}
      <div className="gc__card-content">
        <div className="gc__card-header">
          <h4 className="gc__card-name">{event.name}</h4>
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
            className="gc__card-badge"
          >
            {statusCfg.label}
          </Badge>
          {formalityCfg && (
            <Badge
              variant={
                formalityCfg.badge as
                  | 'success'
                  | 'warning'
                  | 'error'
                  | 'info'
                  | 'neutral'
                  | 'gold'
                  | 'sage'
              }
              className="gc__card-badge"
            >
              {formalityCfg.label}
            </Badge>
          )}
          {event.status === 'planned' && (
            <Badge variant="warning" className="gc__card-badge">
              Pendiente
            </Badge>
          )}
        </div>

        {event.description && (
          <p className="gc__card-desc">{event.description}</p>
        )}

        {/* Metadata */}
        <div className="gc__card-meta">
          <span className="gc__meta-item">
            <CalendarIcon size={11} className="gc__meta-icon" />
            {formatDateShort(event.date)} · {event.start_time}–{event.end_time}
            {days > 0 && days <= 30 && (
              <span className="gc__meta-countdown">({days}d)</span>
            )}
          </span>
          <span className="gc__meta-item">
            <MapPin size={11} className="gc__meta-icon" />
            {event.venue}
          </span>
          {event.guest_count > 0 && (
            <span className="gc__meta-item">
              <Users size={11} className="gc__meta-icon" />
              {event.guest_count} invitados
            </span>
          )}
          {event.budget > 0 && (
            <span className="gc__meta-item">
              <DollarSign size={11} className="gc__meta-icon" />
              {formatCurrency(event.budget)}
            </span>
          )}
        </div>

        {/* AI Insight */}
        <div className="gc__card-insight">
          <span className="gc__card-insight-icon">🧠</span>
          <p className="gc__card-insight-text">{insight}</p>
        </div>

        {/* Cancel action */}
        {event.status !== 'cancelled' && event.status !== 'completed' && onCancel && (
          <div className="gc__card-actions">
            <button
              className="gc__cancel-btn"
              onClick={() => onCancel(event.id, event.name)}
            >
              <XCircle size={12} />
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}