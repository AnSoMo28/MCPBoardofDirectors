/**
 * EntertainmentRadar — V2 of EntertainmentPanel (F31, Tab 4)
 *
 * NOT a CRUD list. An intelligence view of entertainment acts:
 * — ROI summary from analytics (aggregate)
 * — Individual acts as efficiency-ranked cards
 * — AI interpretation per act (cost vs type benchmark)
 * — Status management preserved from V1
 *
 * Fields used: ONLY those verified on EntertainmentAct interface.
 * — id, artist_name, entertainment_type, genre, description, status,
 *   duration_minutes, cost, contact_person, contact_phone,
 *   requirements, notes
 *
 * @module cultural/components/EntertainmentRadar
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Mic,
  Plus,
  DollarSign,
  Clock,
  User,
  Phone,
} from 'lucide-react';

import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn, formatCurrency } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

import type {
  EntertainmentAct,
  EntertainmentType,
  PerformanceStatus,
} from '../types';
import {
  ENTERTAINMENT_TYPE_CONFIG,
  PERFORMANCE_STATUS_CONFIG,
} from '../types';
import type { CulturalAnalytics } from '../types';
import './EntertainmentRadar.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface EntertainmentRadarProps {
  /** ROI summary from analytics. */
  roi: CulturalAnalytics['entertainment_roi'];
  /** Individual acts (if available from parent). */
  acts?: EntertainmentAct[];
  /** Loading state. */
  isLoading?: boolean;
  /** Callback to open creation modal. */
  onCreateAct?: () => void;
  /** Status change handler. */
  onStatusChange?: (actId: string, artistName: string, newStatus: PerformanceStatus) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

type TypeFilter = 'all' | EntertainmentType;

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
//  HELPERS
// ══════════════════════════════════════════════════════════

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function statusToDataAttr(status: PerformanceStatus): string {
  switch (status) {
    case 'contracted':
    case 'confirmed':
    case 'in_progress':
      return 'active';
    case 'proposed':
      return 'proposed';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'default';
  }
}

function interpretAct(
  act: EntertainmentAct,
  roi: CulturalAnalytics['entertainment_roi'],
): string {
  const typeRoi = roi.find(
    (r) => r.entertainment_type === act.entertainment_type,
  );

  if (!typeRoi) {
    return `${act.artist_name} — sin datos de benchmark para este tipo.`;
  }

  const costPerMin = act.duration_minutes > 0
    ? act.cost / act.duration_minutes
    : act.cost;
  const avgCostPerMin = typeRoi.avg_cost > 0
    ? typeRoi.avg_cost / Math.max(1, typeRoi.total_acts)
    : 0;
  const costRatio = avgCostPerMin > 0 ? costPerMin / avgCostPerMin : 1;

  const parts: string[] = [];

  if (costRatio < 0.7) {
    parts.push(`Costo eficiente — ${Math.round((1 - costRatio) * 100)}% bajo el promedio del tipo.`);
  } else if (costRatio > 1.3) {
    parts.push(`Costo elevado — ${Math.round((costRatio - 1) * 100)}% sobre el promedio del tipo.`);
  } else {
    parts.push(`Costo alineado con el promedio del tipo.`);
  }

  if (typeRoi.contracted_rate >= 80) {
    parts.push(`Tipo con alta tasa de contratación (${typeRoi.contracted_rate}%).`);
  } else if (typeRoi.contracted_rate < 50) {
    parts.push(`Tipo con baja contratación (${typeRoi.contracted_rate}%) — revisar selección.`);
  }

  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function EntertainmentRadar({
  roi,
  acts = [],
  isLoading = false,
  onCreateAct,
  onStatusChange,
  className = '',
}: EntertainmentRadarProps) {
  const prefersReduced = useReducedMotion();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // ── Available types from acts ──
  const availableTypes = useMemo(() => {
    const types = new Set(acts.map((a) => a.entertainment_type));
    return Array.from(types);
  }, [acts]);

  // ── Filter ──
  const filtered = useMemo(() => {
    if (typeFilter === 'all') return acts;
    return acts.filter((a) => a.entertainment_type === typeFilter);
  }, [acts, typeFilter]);

  // ── Sort by cost efficiency (lowest cost/min first) ──
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aCpm = a.duration_minutes > 0 ? a.cost / a.duration_minutes : a.cost;
      const bCpm = b.duration_minutes > 0 ? b.cost / b.duration_minutes : b.cost;
      return aCpm - bCpm;
    });
  }, [filtered]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const totalActs = acts.length;
    const activeActs = acts.filter((a) =>
      ['contracted', 'confirmed', 'in_progress'].includes(a.status),
    ).length;
    const proposedActs = acts.filter((a) => a.status === 'proposed').length;
    const totalCost = acts.reduce((s, a) => s + a.cost, 0);
    const avgCost = totalActs > 0 ? Math.round(totalCost / totalActs) : 0;

    return { totalActs, activeActs, proposedActs, totalCost, avgCost };
  }, [acts]);

  // ── ROI summary ──
  const roiSummary = useMemo(() => {
    if (roi.length === 0) return null;
    const totalActs = roi.reduce((s, r) => s + r.total_acts, 0);
    const avgContracted = Math.round(
      roi.reduce((s, r) => s + r.contracted_rate, 0) / roi.length,
    );
    return { totalActs, avgContracted };
  }, [roi]);

  // ── AI hero summary ──
  const heroSummary = useMemo(() => {
    if (acts.length === 0 && roi.length === 0) {
      return 'Sin datos de entretenimiento para analizar.';
    }

    const parts: string[] = [];

    if (roiSummary) {
      parts.push(`${roiSummary.totalActs} actos across ${roi.length} tipo(s).`);
      parts.push(`Contratación promedio: ${roiSummary.avgContracted}%.`);
    }

    if (kpis.activeActs > 0) {
      parts.push(`${kpis.activeActs} activo(s), ${kpis.proposedActs} propuesto(s).`);
    }

    if (kpis.avgCost > 0) {
      parts.push(`Costo promedio: ${formatCurrency(kpis.avgCost)}.`);
    }

    return parts.join(' ');
  }, [acts, roi, roiSummary, kpis]);

  // ── Status change handler ──
  const handleStatusChange = useCallback(
    (actId: string, artistName: string, newStatus: PerformanceStatus) => {
      if (onStatusChange) {
        onStatusChange(actId, artistName, newStatus);
        showToast({
          type: 'success',
          message: `'${artistName}' → ${STATUS_LABELS[newStatus]}`,
        });
      }
    },
    [onStatusChange],
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="er">
        <div className="er__skeleton-hero" />
        <div className="er__skeleton-list">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="er__skeleton-card"
              style={{ '--stagger-i': i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('er', className)}
      data-prefers-reduced={prefersReduced ? 'true' : undefined}
    >
      {/* ═══════════════════════════════════════ */}
      {/*  HERO: AI Summary + KPIs               */}
      {/* ═══════════════════════════════════════ */}
      <header className="er__hero">
        <div className="er__hero-top">
          <div className="er__hero-header">
            <Mic size={18} className="er__hero-icon" />
            <h2 className="er__title">Entertainment Intelligence</h2>
          </div>
          {onCreateAct && (
            <Button
              variant="ghost"
              size="sm"
              className="er__create-btn"
              onClick={onCreateAct}
            >
              <Plus size={14} />
              Contratar
            </Button>
          )}
        </div>

        <p className="er__ai-summary">{heroSummary}</p>

        <div className="er__kpis">
          <div className="er__kpi" style={{ '--stagger-i': 0 } as React.CSSProperties}>
            <span className="er__kpi-value" data-color="silver">{kpis.totalActs}</span>
            <span className="er__kpi-label">Total</span>
          </div>
          <div className="er__kpi" style={{ '--stagger-i': 1 } as React.CSSProperties}>
            <span className="er__kpi-value" data-color="emerald">{kpis.activeActs}</span>
            <span className="er__kpi-label">Activos</span>
          </div>
          <div className="er__kpi" style={{ '--stagger-i': 2 } as React.CSSProperties}>
            <span className="er__kpi-value" data-color="amber">{kpis.proposedActs}</span>
            <span className="er__kpi-label">Propuestos</span>
          </div>
          <div className="er__kpi" style={{ '--stagger-i': 3 } as React.CSSProperties}>
            <span className="er__kpi-value" data-color="gold">{formatCurrency(kpis.totalCost)}</span>
            <span className="er__kpi-label">Inversión total</span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════ */}
      {/*  ROI STRIP (from analytics)            */}
      {/* ═══════════════════════════════════════ */}
      {roi.length > 0 && (
        <div className="er__roi-strip">
          {roi.map((r, i) => {
            const cfg = ENTERTAINMENT_TYPE_CONFIG[
              r.entertainment_type as keyof typeof ENTERTAINMENT_TYPE_CONFIG
            ];
            return (
              <div
                key={r.entertainment_type}
                className="er__roi-item"
                style={{ '--stagger-i': i } as React.CSSProperties}
              >
                <span className="er__roi-emoji">{cfg?.emoji ?? '🎵'}</span>
                <div className="er__roi-info">
                  <span className="er__roi-label">
                    {cfg?.label ?? r.entertainment_type}
                  </span>
                  <span className="er__roi-stats">
                    {r.total_acts} actos · {r.contracted_rate}% contratados ·{' '}
                    {formatCurrency(r.avg_cost)} prom
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  TYPE FILTERS                          */}
      {/* ═══════════════════════════════════════ */}
      {availableTypes.length > 1 && (
        <div className="er__filters">
          <Button
            variant="unstyled"
            className={cn(
              'er__filter-pill',
              typeFilter === 'all' && 'er__filter-pill--active',
            )}
            onClick={() => setTypeFilter('all')}
            style={{ '--stagger-i': 0 } as React.CSSProperties}
          >
            Todos ({acts.length})
          </Button>
          {availableTypes.map((type, i) => {
            const cfg = ENTERTAINMENT_TYPE_CONFIG[
              type as keyof typeof ENTERTAINMENT_TYPE_CONFIG
            ];
            const count = acts.filter((a) => a.entertainment_type === type).length;
            return (
              <Button
                variant="unstyled"
                key={type}
                className={cn(
                  'er__filter-pill',
                  typeFilter === type && 'er__filter-pill--active',
                )}
                onClick={() => setTypeFilter(type)}
                style={{ '--stagger-i': i + 1 } as React.CSSProperties}
              >
                {cfg?.emoji ?? '🎵'} {cfg?.label ?? type} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  ACT CARDS (intelligence-ranked)       */}
      {/* ═══════════════════════════════════════ */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Mic size={32} />}
          title="Sin actos de entretenimiento"
          description="Bandas, DJs, comediantes, performers — registrá el primer artista."
        />
      ) : (
        <div className="er__list">
          <span className="er__list-header">
            {sorted.length} acto(s) — ordenados por eficiencia de costo
          </span>
          {sorted.map((act, i) => {
            const typeCfg = ENTERTAINMENT_TYPE_CONFIG[
              act.entertainment_type as keyof typeof ENTERTAINMENT_TYPE_CONFIG
            ];
            const statusCfg = PERFORMANCE_STATUS_CONFIG[act.status];
            const transitions = STATUS_TRANSITIONS[act.status] ?? [];
            const insight = interpretAct(act, roi);
            const statusAttr = statusToDataAttr(act.status);
            const costPerMin =
              act.duration_minutes > 0
                ? Math.round(act.cost / act.duration_minutes)
                : act.cost;

            return (
              <div
                key={act.id}
                className="er__card"
                data-status={statusAttr}
                style={{ '--stagger-i': i } as React.CSSProperties}
              >
                {/* Icon */}
                <div className="er__card-icon" data-status={statusAttr}>
                  <span>{typeCfg?.emoji ?? '🎵'}</span>
                </div>

                {/* Content */}
                <div className="er__card-content">
                  <div className="er__card-header">
                    <h4 className="er__card-name">{act.artist_name}</h4>
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
                      className="er__card-badge"
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>

                  <p className="er__card-type">
                    {typeCfg?.label ?? act.entertainment_type}
                    {act.genre ? ` · ${act.genre}` : ''}
                  </p>

                  {act.description && (
                    <p className="er__card-desc">{act.description}</p>
                  )}

                  {/* Metadata row */}
                  <div className="er__card-meta">
                    <span className="er__meta-item">
                      <Clock size={11} className="er__meta-icon" />
                      {formatDuration(act.duration_minutes)}
                    </span>
                    <span className="er__meta-item">
                      <DollarSign size={11} className="er__meta-icon" />
                      {formatCurrency(act.cost)}
                    </span>
                    <span className="er__meta-item er__meta-item--muted">
                      {formatCurrency(costPerMin)}/min
                    </span>
                    {act.contact_person && (
                      <span className="er__meta-item">
                        <User size={11} className="er__meta-icon" />
                        {act.contact_person}
                      </span>
                    )}
                    {act.contact_phone && (
                      <span className="er__meta-item">
                        <Phone size={11} className="er__meta-icon" />
                        {act.contact_phone}
                      </span>
                    )}
                  </div>

                  {/* Requirements */}
                  {act.requirements && act.requirements.length > 0 && (
                    <div className="er__card-requirements">
                      {act.requirements.map((req, ri) => (
                        <span key={ri} className="er__req-tag">
                          {req}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {act.notes && (
                    <p className="er__card-notes">📝 {act.notes}</p>
                  )}

                  {/* AI Insight */}
                  <div className="er__card-insight">
                    <span className="er__card-insight-icon">🧠</span>
                    <p className="er__card-insight-text">{insight}</p>
                  </div>

                  {/* Status transitions */}
                  {transitions.length > 0 && onStatusChange && (
                    <div className="er__card-actions">
                      {transitions.map((nextStatus) => (
                        <Button
                          variant="unstyled"
                          key={nextStatus}
                          className={cn(
                            'er__status-btn',
                            nextStatus === 'cancelled' && 'er__status-btn--danger',
                          )}
                          onClick={() =>
                            handleStatusChange(
                              act.id,
                              act.artist_name,
                              nextStatus,
                            )
                          }
                        >
                          → {STATUS_LABELS[nextStatus]}
                        </Button>
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