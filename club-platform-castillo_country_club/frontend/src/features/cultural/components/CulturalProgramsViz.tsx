/**
 * CulturalProgramsViz — V2 of ProgramsPanel (F31, Tab 3)
 *
 * NOT a CRUD list. An ENROLLMENT INTELLIGENCE system where:
 * — Programs are grouped by season as a heatmap of enrollment health
 * — Each program shows enrollment % with color-coded health
 * — AI interprets each program's efficiency vs category benchmark
 * — Cross-references detect budget waste and seasonal gaps
 * — Status management preserved via contextual actions
 *
 * Fields used: ONLY verified on CulturalProgram:
 * id, name, category, description, status, season,
 * start_date, end_date, current_participants, max_participants,
 * budget, notes
 *
 * @module cultural/components/CulturalProgramsViz
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Music,
  Plus,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
} from 'lucide-react';

import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { showToast } from '@/shared/components/ui/Toast';
import { cn, formatCurrency } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

import type {
  CulturalProgram,
  CulturalCategory,
  ProgramStatus,
  CulturalAnalytics,
} from '../types';
import {
  CATEGORY_CONFIG,
  PROGRAM_STATUS_CONFIG,
  formatEnrollment,
} from '../types';
import './CulturalProgramsViz.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalProgramsVizProps {
  programs: CulturalProgram[];
  analytics?: CulturalAnalytics;
  isLoading?: boolean;
  onCreateProgram?: () => void;
  onStatusChange?: (programId: string, programName: string, newStatus: ProgramStatus) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

type CategoryFilter = 'all' | CulturalCategory;
const STATUS_TRANSITIONS: Record<ProgramStatus, ProgramStatus[]> = {
  draft: ['enrolling', 'cancelled'],
  enrolling: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
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
//  HELPERS
// ══════════════════════════════════════════════════════════

function calcEnrollmentPct(prog: CulturalProgram): number {
  return prog.max_participants > 0
    ? Math.round((prog.current_participants / prog.max_participants) * 100)
    : -1;
}

function enrollmentToLevel(pct: number): string {
  if (pct < 0) return 'none';
  if (pct >= 75) return 'excellent';
  if (pct >= 50) return 'good';
  if (pct >= 25) return 'warning';
  return 'critical';
}

function calcCostPerParticipant(prog: CulturalProgram): number {
  if (prog.current_participants === 0 || prog.budget === 0) return 0;
  return Math.round(prog.budget / prog.current_participants);
}

function formatDateRange(s: string, e: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const startDate = new Date(s + 'T00:00:00').toLocaleDateString('es-CR', opts);
    const endDate = new Date(e + 'T00:00:00').toLocaleDateString('es-CR', opts);
    return `${startDate} – ${endDate}`;
  } catch {
    return `${s} – ${e}`;
  }
}

function calcDurationDays(s: string, e: string): number {
  try {
    const ms = new Date(e + 'T00:00:00').getTime() - new Date(s + 'T00:00:00').getTime();
    return Math.max(0, Math.round(ms / 86_400_000));
  } catch {
    return 0;
  }
}

// ══════════════════════════════════════════════════════════
//  AI INTERPRETATION
// ══════════════════════════════════════════════════════════

function interpretProgram(
  prog: CulturalProgram,
  analytics?: CulturalAnalytics,
): string {
  const pct = calcEnrollmentPct(prog);
  const avgEnroll = analytics?.avg_enrollment_pct ?? 50;
  const costPer = calcCostPerParticipant(prog);

  const parts: string[] = [];

  if (pct >= 0) {
    const diff = pct - avgEnroll;
    if (diff > 20) {
      parts.push(`Inscripción ${pct}% — ${diff}pts sobre el promedio del club.`);
    } else if (diff < -20) {
      parts.push(`Inscripción ${pct}% — ${Math.abs(diff)}pts bajo el promedio. Revisar contenido o targeting.`);
    } else {
      parts.push(`Inscripción ${pct}% — alineada con el promedio (${avgEnroll}%).`);
    }
  }

  if (costPer > 0) {
    parts.push(`Costo/participante: ${formatCurrency(costPer)}.`);
    if (costPer > 50000) {
      parts.push('Alto costo unitario: evaluar si el contenido justifica la inversión.');
    }
  }

  if (prog.status === 'enrolling' && pct >= 0 && pct < 30) {
    parts.push('Inscripciones bajas con periodo activo: considerar promoción o ajuste.');
  }

  return parts.join(' ');
}

function interpretSeason(
  season: string,
  progs: CulturalProgram[],
  _analytics?: CulturalAnalytics,
): string {
  const totalEnrolled = progs.reduce((s, p) => s + p.current_participants, 0);
  const totalCapacity = progs.reduce((s, p) => s + p.max_participants, 0);
  const avgPct = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;
  const totalBudget = progs.reduce((s, p) => s + p.budget, 0);
  const belowThreshold = progs.filter((p) => {
    const pct = calcEnrollmentPct(p);
    return pct >= 0 && pct < 30;
  }).length;

  const parts: string[] = [];
  parts.push(`${progs.length} programa(s) en ${season}.`);

  if (avgPct > 0) {
    parts.push(`Inscripción promedio: ${avgPct}%.`);
  }

  if (belowThreshold > 0) {
    parts.push(`${belowThreshold} bajo 30%: contenido no conecta con el público.`);
  }

  if (totalBudget > 0) {
    const costPer = totalEnrolled > 0 ? Math.round(totalBudget / totalEnrolled) : 0;
    if (costPer > 0) {
      parts.push(`Costo/participante promedio: ${formatCurrency(costPer)}.`);
    }
  }

  return parts.join(' ');
}

function generateHeroSummary(
  programs: CulturalProgram[],
  analytics?: CulturalAnalytics,
): string {
  if (programs.length === 0) return 'Sin programas culturales.';

  const active = programs.filter((p) => p.status === 'active').length;
  const enrolling = programs.filter((p) => p.status === 'enrolling').length;
  const totalParticipants = programs.reduce((s, p) => s + p.current_participants, 0);

  const parts: string[] = [];
  parts.push(`${programs.length} programa(s). ${totalParticipants} participante(s) total.`);

  if (active > 0) parts.push(`${active} activo(s)`);
  if (enrolling > 0) parts.push(`${enrolling} con inscripciones abiertas`);

  if (analytics) {
    if (analytics.programs_below_threshold > 0) {
      parts.push(`${analytics.programs_below_threshold} bajo 30% — requieren atención.`);
    }
  }

  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════
//  CROSS-REFERENCES
// ══════════════════════════════════════════════════════════

interface ProgramCrossRef {
  severity: 'opportunity' | 'warning' | 'insight';
  icon: string;
  text: string;
}

function generateCrossRefs(
  programs: CulturalProgram[],
  analytics?: CulturalAnalytics,
): ProgramCrossRef[] {
  const refs: ProgramCrossRef[] = [];

  // 1. High budget + low enrollment
  const expensive = programs.filter((p) => {
    const pct = calcEnrollmentPct(p);
    return p.budget > 0 && pct >= 0 && pct < 30;
  });
  if (expensive.length > 0) {
    const totalWaste = expensive.reduce((s, p) => s + p.budget, 0);
    refs.push({
      severity: 'warning',
      icon: '💰',
      text: `${expensive.length} programa(s) con alto presupuesto y baja inscripción (<30%). Presupuesto en riesgo: ${formatCurrency(totalWaste)}.`,
    });
  }

  // 2. Category concentration
  const catCounts = new Map<string, number>();
  for (const p of programs) {
    catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1);
  }
  const sortedCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0 && sortedCats[0][1] > programs.length * 0.5) {
    const catCfg = CATEGORY_CONFIG[sortedCats[0][0] as keyof typeof CATEGORY_CONFIG];
    refs.push({
      severity: 'insight',
      icon: catCfg?.emoji ?? '📌',
      text: `${catCfg?.label ?? sortedCats[0][0]} concentra ${sortedCats[0][1]} de ${programs.length} programas (${Math.round(sortedCats[0][1] / programs.length * 100)}%). Riesgo de monocultura.`,
    });
  }

  // 3. Seasonal gaps
  if (analytics && analytics.seasonal_patterns.length > 0) {
    const weakSeasons = analytics.seasonal_patterns.filter((sp) => sp.enrollment_rate < 30);
    if (weakSeasons.length > 0) {
      refs.push({
        severity: 'opportunity',
        icon: '📅',
        text: `${weakSeasons.length} temporada(s) con inscripción bajo 30%: ${weakSeasons.map((w) => w.season).join(', ')}. Replantear oferta.`,
      });
    }
  }

  // 4. No enrolling programs
  const enrollingCount = programs.filter((p) => p.status === 'enrolling').length;
  if (enrollingCount === 0 && programs.length > 0) {
    const draftCount = programs.filter((p) => p.status === 'draft').length;
    if (draftCount > 0) {
      refs.push({
        severity: 'opportunity',
        icon: '🚪',
        text: `Sin inscripciones abiertas. ${draftCount} borrador(es) listo(s) para lanzar.`,
      });
    }
  }

  return refs;
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalProgramsViz({
  programs,
  analytics,
  isLoading = false,
  onCreateProgram,
  onStatusChange,
  className = '',
}: CulturalProgramsVizProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const prefersReduced = useReducedMotion();

  // ── Filter ──
  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return programs;
    return programs.filter((p) => p.category === categoryFilter);
  }, [programs, categoryFilter]);

  // ── Group by season ──
  const grouped = useMemo(() => {
    const map = new Map<string, CulturalProgram[]>();
    for (const prog of filtered) {
      const season = prog.season || 'Sin temporada';
      if (!map.has(season)) map.set(season, []);
      map.get(season)!.push(prog);
    }
    return new Map(
      [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])),
    );
  }, [filtered]);

  // ── Available categories ──
  const availableCategories = useMemo(() => {
    const cats = new Set(programs.map((p) => p.category));
    return Array.from(cats);
  }, [programs]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const active = programs.filter((p) => p.status === 'active').length;
    const enrolling = programs.filter((p) => p.status === 'enrolling').length;
    const totalParticipants = programs.reduce((s, p) => s + p.current_participants, 0);
    const totalBudget = programs.reduce((s, p) => s + p.budget, 0);
    const belowThreshold = analytics?.programs_below_threshold
      ?? programs.filter((p) => {
        const pct = calcEnrollmentPct(p);
        return pct >= 0 && pct < 30;
      }).length;

    return { total: programs.length, active, enrolling, totalParticipants, totalBudget, belowThreshold };
  }, [programs, analytics]);

  // ── Intelligence ──
  const crossRefs = useMemo(() => generateCrossRefs(programs, analytics), [programs, analytics]);
  const heroSummary = useMemo(() => generateHeroSummary(programs, analytics), [programs, analytics]);

  // ── Status change handler ──
  const handleStatusChange = useCallback(
    (id: string, name: string, newStatus: ProgramStatus) => {
      if (onStatusChange) {
        onStatusChange(id, name, newStatus);
        showToast({
          type: 'success',
          message: `Programa '${name}' → ${STATUS_LABELS[newStatus]}`,
        });
      }
    },
    [onStatusChange],
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="cpv">
        <div className="cpv__skeleton-hero" />
        <div className="cpv__skeleton-list">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="cpv__skeleton-card"
              style={{ '--stagger-i': i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('cpv', className)}
      data-prefers-reduced={prefersReduced ? 'true' : undefined}
    >
      {/* ═══════════════════════════════════════ */}
      {/*  HERO: AI Summary + KPIs               */}
      {/* ═══════════════════════════════════════ */}
      <header className="cpv__hero">
        <div className="cpv__hero-top">
          <div className="cpv__hero-header">
            <Music size={18} className="cpv__hero-icon" />
            <h2 className="cpv__title">Programas Culturales</h2>
          </div>
          {onCreateProgram && (
            <Button
              variant="ghost"
              size="sm"
              className="cpv__create-btn"
              onClick={onCreateProgram}
            >
              <Plus size={14} />
              Nuevo
            </Button>
          )}
        </div>

        <p className="cpv__ai-summary">{heroSummary}</p>

        <div className="cpv__kpis">
          <div className="cpv__kpi" style={{ '--stagger-i': 0 } as React.CSSProperties}>
            <span className="cpv__kpi-value" data-color="silver">{kpis.total}</span>
            <span className="cpv__kpi-label">Total</span>
          </div>
          <div className="cpv__kpi" style={{ '--stagger-i': 1 } as React.CSSProperties}>
            <span className="cpv__kpi-value" data-color="emerald">{kpis.active}</span>
            <span className="cpv__kpi-label">Activos</span>
          </div>
          <div className="cpv__kpi" style={{ '--stagger-i': 2 } as React.CSSProperties}>
            <span className="cpv__kpi-value" data-color="teal">{kpis.enrolling}</span>
            <span className="cpv__kpi-label">Inscripciones</span>
          </div>
          <div className="cpv__kpi" style={{ '--stagger-i': 3 } as React.CSSProperties}>
            <span className="cpv__kpi-value" data-color="silver">{kpis.totalParticipants}</span>
            <span className="cpv__kpi-label">Participantes</span>
          </div>
          <div className="cpv__kpi" style={{ '--stagger-i': 4 } as React.CSSProperties}>
            <span className="cpv__kpi-value" data-color="gold">{formatCurrency(kpis.totalBudget)}</span>
            <span className="cpv__kpi-label">Presupuesto</span>
          </div>
          {kpis.belowThreshold > 0 && (
            <div className="cpv__kpi cpv__kpi--alert" style={{ '--stagger-i': 5 } as React.CSSProperties}>
              <span className="cpv__kpi-value" data-color="amber">{kpis.belowThreshold}</span>
              <span className="cpv__kpi-label">Bajo 30%</span>
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════ */}
      {/*  CROSS-REFERENCES                      */}
      {/* ═══════════════════════════════════════ */}
      {crossRefs.length > 0 && (
        <div className="cpv__cross-refs">
          {crossRefs.map((ref, i) => (
            <div
              key={i}
              className="cpv__cross-ref"
              data-severity={ref.severity}
              style={{ '--stagger-i': i } as React.CSSProperties}
            >
              <span className="cpv__cross-ref-icon">{ref.icon}</span>
              <p className="cpv__cross-ref-text">{ref.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  CATEGORY FILTERS                      */}
      {/* ═══════════════════════════════════════ */}
      {programs.length > 0 && (
        <div className="cpv__filters">
          <button
            className={cn(
              'cpv__filter-pill',
              categoryFilter === 'all' && 'cpv__filter-pill--active',
            )}
            onClick={() => setCategoryFilter('all')}
            style={{ '--stagger-i': 0 } as React.CSSProperties}
          >
            Todos ({programs.length})
          </button>
          {availableCategories.map((cat, i) => {
            const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
            const count = programs.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                className={cn(
                  'cpv__filter-pill',
                  categoryFilter === cat && 'cpv__filter-pill--active',
                )}
                onClick={() => setCategoryFilter(cat)}
                style={{ '--stagger-i': i + 1 } as React.CSSProperties}
              >
                {cfg?.emoji ?? '📌'} {cfg?.label ?? cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  PROGRAMS BY SEASON                    */}
      {/* ═══════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Music size={32} />}
          title="Sin programas culturales"
          description="Talleres de arte, clases de música, charlas, ciclos gastronómicos — creá el primer programa."
        />
      ) : (
        <div className="cpv__seasons">
          {Array.from(grouped.entries()).map(([season, progs], seasonIdx) => {
            const seasonInsight = interpretSeason(season, progs, analytics);

            return (
              <section
                key={season}
                className="cpv__season"
                style={{ '--stagger-i': seasonIdx } as React.CSSProperties}
              >
                {/* Season header */}
                <div className="cpv__season-header">
                  <div className="cpv__season-header-left">
                    <CalendarIcon size={14} className="cpv__season-icon" />
                    <h3 className="cpv__season-title">{season}</h3>
                    <Badge variant="sage" className="cpv__season-count">
                      {progs.length}
                    </Badge>
                  </div>
                </div>

                {/* Season AI insight */}
                <div className="cpv__season-insight">
                  <span className="cpv__season-insight-icon">🧠</span>
                  <p className="cpv__season-insight-text">{seasonInsight}</p>
                </div>

                {/* Season enrollment heatmap */}
                <div className="cpv__season-heatmap">
                  {progs.map((prog, progIdx) => {
                    const pct = calcEnrollmentPct(prog);
                    const level = enrollmentToLevel(pct);
                    const catCfg = CATEGORY_CONFIG[
                      prog.category as keyof typeof CATEGORY_CONFIG
                    ];
                    const statusCfg = PROGRAM_STATUS_CONFIG[prog.status];
                    const transitions = STATUS_TRANSITIONS[prog.status] ?? [];
                    const insight = interpretProgram(prog, analytics);

                    return (
                      <div
                        key={prog.id}
                        className="cpv__program"
                        data-level={level}
                        data-status={prog.status}
                        style={{ '--stagger-i': progIdx } as React.CSSProperties}
                      >
                        {/* Row 1: Identity */}
                        <div className="cpv__program-header">
                          <div className="cpv__program-icon" data-category={prog.category}>
                            <span>{catCfg?.emoji ?? '📌'}</span>
                          </div>
                          <div className="cpv__program-identity">
                            <h4 className="cpv__program-name">{prog.name}</h4>
                            <span className="cpv__program-category">
                              {catCfg?.label ?? prog.category}
                            </span>
                          </div>
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
                            className="cpv__program-badge"
                          >
                            {statusCfg.label}
                          </Badge>
                        </div>

                        {/* Row 2: Description */}
                        {prog.description && (
                          <p className="cpv__program-desc">{prog.description}</p>
                        )}

                        {/* Row 3: Metadata */}
                        <div className="cpv__program-meta">
                          <span className="cpv__meta-item">
                            <CalendarIcon size={11} className="cpv__meta-icon" />
                            {formatDateRange(prog.start_date, prog.end_date)}
                            <span className="cpv__meta-duration">
                              ({calcDurationDays(prog.start_date, prog.end_date)}d)
                            </span>
                          </span>
                          <span className="cpv__meta-item">
                            <Users size={11} className="cpv__meta-icon" />
                            {formatEnrollment(prog.current_participants, prog.max_participants)}
                          </span>
                          {prog.budget > 0 && (
                            <span className="cpv__meta-item">
                              <DollarSign size={11} className="cpv__meta-icon" />
                              {formatCurrency(prog.budget)}
                            </span>
                          )}
                        </div>

                        {/* Row 4: Enrollment bar */}
                        {pct >= 0 && (
                          <div className="cpv__enrollment">
                            <div className="cpv__enrollment-track">
                              <div
                                className="cpv__enrollment-fill"
                                data-level={level}
                                style={{ '--bar-width': `${Math.min(100, pct)}%` } as React.CSSProperties}
                              />
                            </div>
                            <span className="cpv__enrollment-pct" data-level={level}>
                              {pct}%
                            </span>
                          </div>
                        )}

                        {/* Row 5: Notes */}
                        {prog.notes && (
                          <p className="cpv__program-notes">📝 {prog.notes}</p>
                        )}

                        {/* Row 6: AI Insight */}
                        <div className="cpv__program-insight">
                          <span className="cpv__program-insight-icon">🧠</span>
                          <p className="cpv__program-insight-text">{insight}</p>
                        </div>

                        {/* Row 7: Status transitions */}
                        {transitions.length > 0 && onStatusChange && (
                          <div className="cpv__program-actions">
                            {transitions.map((nextStatus) => (
                              <button
                                key={nextStatus}
                                className={cn(
                                  'cpv__status-btn',
                                  nextStatus === 'cancelled' && 'cpv__status-btn--danger',
                                )}
                                onClick={() =>
                                  handleStatusChange(prog.id, prog.name, nextStatus)
                                }
                              >
                                → {STATUS_LABELS[nextStatus]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}