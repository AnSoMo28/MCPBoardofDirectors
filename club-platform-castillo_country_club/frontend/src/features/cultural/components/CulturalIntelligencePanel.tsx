/**
 * CulturalIntelligencePanel — V2 (F31)
 *
 * NOT a data table. A 9-dimension intelligence system that:
 * — Interprets every number with AI-generated context
 * — Cross-references dimensions to surface non-obvious connections
 * — Shows 3 depth levels: summary → visual → insight
 * — Integrates CulturalHealthGauge as hero
 *
 * Each dimension is a "micro-essay" — one sentence tells the operator
 * what they need to know. Expanding reveals the visual breakdown
 * and the AI's interpretation with actionable recommendations.
 *
 * @module cultural/components/CulturalIntelligencePanel
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar as CalendarIcon,
  DollarSign,
  Frame,
  Mic,
  Music,
  TrendingDown,
  TrendingUp,
  Users,
  Building,
  Target,
  ChevronDown,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/Badge';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { cn, formatCurrency } from '@/shared/lib/utils';

import type { CulturalAnalytics } from '../types';
import {
  CATEGORY_CONFIG,
  ENTERTAINMENT_TYPE_CONFIG,
  calculateEngagementScore,
} from '../types';
import { CulturalHealthGauge, type HealthDimension } from './CulturalHealthGauge';
import './CulturalIntelligencePanel.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalIntelligencePanelProps {
  analytics: CulturalAnalytics;
  engagementScore?: number;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  INTERNAL TYPES
// ══════════════════════════════════════════════════════════

interface CrossReference {
  severity: 'opportunity' | 'warning' | 'insight';
  icon: string;
  text: string;
}

interface DimensionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  summary: string;
  level: 'excellent' | 'good' | 'warning' | 'critical';
}

// ══════════════════════════════════════════════════════════
//  AI INSIGHT GENERATORS
// ══════════════════════════════════════════════════════════

function interpretCategories(
  perf: CulturalAnalytics['category_performance'],
): { summary: string; level: DimensionConfig['level']; insight: string } {
  if (perf.length === 0) {
    return { summary: 'Sin datos de categorías', level: 'critical', insight: 'No hay datos suficientes para análisis.' };
  }
  const sorted = [...perf].sort((a, b) => b.engagement_score - a.engagement_score);
  const top = sorted[0];
  const topCfg = CATEGORY_CONFIG[top.category as keyof typeof CATEGORY_CONFIG];
  const topLabel = topCfg?.label ?? top.category;
  const activeCount = perf.filter((p) => p.engagement_score > 30).length;
  Math.round(perf.reduce((s, p) => s + p.engagement_score, 0) / perf.length);

  const summary = `${topLabel} domina con ${top.engagement_score}pts — ${activeCount} categoría(s) activa(s)`;
  const level: DimensionConfig['level'] =
    top.engagement_score >= 70 ? 'excellent' :
    top.engagement_score >= 50 ? 'good' :
    top.engagement_score >= 30 ? 'warning' : 'critical';

  let insight = `${topLabel} lidera con ${top.engagement_score}pts de engagement`;
  if (sorted.length > 1) {
    const diff = top.engagement_score - sorted[1].engagement_score;
    insight += diff > 20
      ? `, ${diff}% sobre la segunda categoría. Dominio claro.`
      : `, solo ${diff}% sobre la segunda. Competencia sana entre categorías.`;
  }
  if (activeCount < 3) {
    insight += ` Solo ${activeCount} categoría(s) activa(s): considerar diversificación.`;
  } else {
    insight += ` ${activeCount} categorías con engagement significativo: buen balance.`;
  }

  return { summary, level, insight };
}

function interpretVenues(
  venues: CulturalAnalytics['venue_utilization'],
): { summary: string; level: DimensionConfig['level']; insight: string } {
  if (venues.length === 0) {
    return { summary: 'Sin datos de venues', level: 'critical', insight: 'No hay datos de utilización de venues.' };
  }
  const sorted = [...venues].sort((a, b) => b.utilization_rate - a.utilization_rate);
  const avg = Math.round(venues.reduce((s, v) => s + v.utilization_rate, 0) / venues.length);
  const top = sorted[0];
  const underused = venues.filter((v) => v.utilization_rate < 25);

  const summary = `Utilización promedio ${avg}%. ${top.venue} lidera al ${top.utilization_rate}%`;
  const level: DimensionConfig['level'] =
    avg >= 60 ? 'excellent' :
    avg >= 40 ? 'good' :
    avg >= 20 ? 'warning' : 'critical';

  let insight = `Utilización promedio de ${avg}% across ${venues.length} venue(s). `;
  insight += `${top.venue} es el más activo al ${top.utilization_rate}%. `;
  if (underused.length > 0) {
    insight += `${underused.length} venue(s) bajo el 25%: ${underused.map((v) => v.venue).join(', ')}. `;
    insight += `Oportunidad: activar con eventos de bajo costo para incrementar engagement.`;
  } else {
    insight += `Todos los venues tienen utilización saludable.`;
  }

  return { summary, level, insight };
}

function interpretEntertainment(
  roi: CulturalAnalytics['entertainment_roi'],
): { summary: string; level: DimensionConfig['level']; insight: string } {
  if (roi.length === 0) {
    return { summary: 'Sin datos de entretenimiento', level: 'warning', insight: 'No hay datos de ROI de entretenimiento.' };
  }
  const totalActs = roi.reduce((s, e) => s + e.total_acts, 0);
  const avgContracted = Math.round(roi.reduce((s, e) => s + e.contracted_rate, 0) / roi.length);
  const totalCost = roi.reduce((s, e) => s + e.avg_cost * e.total_acts, 0);

  const summary = `${totalActs} actos totales. Contratación promedio: ${avgContracted}%`;
  const level: DimensionConfig['level'] =
    avgContracted >= 80 ? 'excellent' :
    avgContracted >= 60 ? 'good' :
    avgContracted >= 40 ? 'warning' : 'critical';

  let insight = `${totalActs} actos de entretenimiento across ${roi.length} tipo(s). `;
  insight += `Tasa de contratación promedio: ${avgContracted}%. `;
  insight += `Inversión total estimada: ${formatCurrency(totalCost)}. `;
  if (avgContracted >= 80) {
    insight += `Excelente tasa: el entretenimiento está bien alineado con la demanda.`;
  } else if (avgContracted < 50) {
    insight += `Tasa baja: muchos actos no se contratan. Revisar selección o reducir portafolio.`;
  }

  return { summary, level, insight };
}

function interpretAttendance(
  analytics: CulturalAnalytics,
): { summary: string; level: DimensionConfig['level']; insight: string } {
  const { attendance_trend: trend, avg_attendance_30d: avg, total_events_30d: total } = analytics;

  const trendLabel = trend === 'up' ? 'Creciente' : trend === 'down' ? 'Decreciente' : 'Estable';
  const summary = `Tendencia ${trendLabel}. Promedio: ${avg.toFixed(0)} personas/evento`;
  const level: DimensionConfig['level'] =
    trend === 'up' ? 'excellent' :
    trend === 'stable' ? 'good' :
    avg > 30 ? 'warning' : 'critical';

  let insight = `Asistencia promedio de ${avg.toFixed(0)} personas en los últimos 30 días (${total} evento(s)). `;
  if (trend === 'up') {
    insight += `Tendencia creciente: el engagement cultural está en ascenso. Mantener el ritmo de programación.`;
  } else if (trend === 'down') {
    insight += `Tendencia decreciente: investigar causas. ¿Contenido no alineado con gustos? ¿Competencia de otros dominios?`;
  } else {
    insight += `Tendencia estable: el engagement se mantiene sin crecimiento ni declive.`;
  }

  return { summary, level, insight };
}

function interpretBudget(
  analytics: CulturalAnalytics,
): { summary: string; level: DimensionConfig['level']; insight: string } {
  const pct = analytics.budget_utilization_pct;
  const status = pct > 90 ? 'Sobre-utilizado' : pct > 70 ? 'En rango óptimo' : pct > 40 ? 'Sub-utilizado' : 'Bajo uso';
  const summary = `${pct.toFixed(1)}% utilizado — ${status}`;
  const level: DimensionConfig['level'] =
    pct >= 60 && pct <= 90 ? 'excellent' :
    pct >= 40 && pct <= 95 ? 'good' :
    pct > 95 ? 'critical' : 'warning';

  let insight = `Budget cultural al ${pct.toFixed(1)}% de utilización. `;
  insight += `Planificado: ${formatCurrency(analytics.total_budget_planned)}. Ejecutado: ${formatCurrency(analytics.total_budget_spent)}. `;
  if (pct > 90) {
    insight += `Presupuesto casi agotado: planificar incremento o reducir gastos los próximo meses.`;
  } else if (pct < 40) {
    insight += `Budget sub-utilizado: hay espacio para más programación cultural sin incrementar presupuesto.`;
  } else {
    insight += `Utilización saludable: el presupuesto se está ejecutando según lo planificado.`;
  }

  return { summary, level, insight };
}

function interpretSeasonal(
  patterns: CulturalAnalytics['seasonal_patterns'],
): { summary: string; level: DimensionConfig['level']; insight: string } {
  if (patterns.length === 0) {
    return { summary: 'Sin datos estacionales', level: 'warning', insight: 'No hay datos de patrones estacionales.' };
  }
  const sorted = [...patterns].sort((a, b) => b.enrollment_rate - a.enrollment_rate);
  const top = sorted[0];
  const avgEnrollment = Math.round(patterns.reduce((s, p) => s + p.enrollment_rate, 0) / patterns.length);

  const summary = `${patterns.length} temporada(s). ${top.season} lidera con ${top.enrollment_rate}% inscripción`;
  const level: DimensionConfig['level'] =
    avgEnrollment >= 70 ? 'excellent' :
    avgEnrollment >= 50 ? 'good' :
    avgEnrollment >= 30 ? 'warning' : 'critical';

  let insight = `${patterns.length} temporadas analizadas. Inscripción promedio: ${avgEnrollment}%. `;
  insight += `${top.season} es la más fuerte (${top.enrollment_rate}% inscripción, ${top.total_participants}/${top.max_participants} participantes). `;
  if (top.top_category) {
    insight += `Categoría dominante en peak: ${top.top_category}. `;
  }
  const weak = patterns.filter((p) => p.enrollment_rate < 30);
  if (weak.length > 0) {
    insight += `${weak.length} temporada(s) bajo 30%: considerar reducir o replantear programación en ${weak.map((w) => w.season).join(', ')}.`;
  }

  return { summary, level, insight };
}

function interpretPrograms(
  analytics: CulturalAnalytics,
): { summary: string; level: DimensionConfig['level']; insight: string } {
  const { total_programs: total, active_programs: active, avg_enrollment_pct: avgEnroll, programs_below_threshold: below } = analytics;
  const summary = `${total} programa(s), ${active} activo(s). Inscripción promedio: ${avgEnroll}%`;
  const level: DimensionConfig['level'] =
    avgEnroll >= 70 && below === 0 ? 'excellent' :
    avgEnroll >= 50 ? 'good' :
    avgEnroll >= 30 ? 'warning' : 'critical';

  let insight = `${total} programas culturales (${active} activos). Inscripción promedio: ${avgEnroll}%. `;
  if (below > 0) {
    insight += `${below} programa(s) bajo el 30% de inscripción: el contenido no está conectando con el público. `;
    insight += `Recomendación: usar taste gap analysis para rediseñar estos programas.`;
  } else {
    insight += `Todos los programas tienen inscripción saludable.`;
  }

  return { summary, level, insight };
}

function interpretExhibitions(
  analytics: CulturalAnalytics,
): { summary: string; level: DimensionConfig['level']; insight: string } {
  const { total_exhibitions: total, active_exhibitions: active, avg_exhibition_duration_days: avgDays, exhibitions_with_reception_pct: recPct } = analytics;
  const summary = `${total} exposición(es), ${active} activa(s). ${recPct}% con recepción`;
  const level: DimensionConfig['level'] =
    recPct >= 70 && active > 0 ? 'excellent' :
    recPct >= 50 ? 'good' :
    recPct >= 30 ? 'warning' : 'critical';

  let insight = `${total} exposiciones (${active} activas). Duración promedio: ${avgDays} días. `;
  insight += `${recPct}% incluyen recepción de apertura. `;
  if (recPct < 50) {
    insight += `Menos de la mitad tienen recepción: las recepciones incrementan asistencia inicial en ~40%. Agregar recepciones.`;
  } else {
    insight += `Buena cobertura de recepciones: el engagement de apertura está siendo aprovechado.`;
  }

  return { summary, level, insight };
}

function interpretCrossDomain(
  signals: string[],
): { summary: string; level: DimensionConfig['level']; insight: string } {
  const count = signals.length;
  const summary = count === 0
    ? 'Sin señales — todo en orden'
    : `${count} señal(es) cross-domain activa(s)`;
  const level: DimensionConfig['level'] =
    count === 0 ? 'excellent' :
    count <= 2 ? 'good' :
    count <= 5 ? 'warning' : 'critical';

  let insight = count === 0
    ? 'No hay señales cross-domain activas. El sistema opera en silos.'
    : `${count} señal(es) detectada(s) entre dominios. `;
  if (count > 0) {
    insight += `Las señales cross-domain indican oportunidades donde la cultura puede amplificar otros dominios del club (fitness, finanzas, social).`;
  }

  return { summary, level, insight };
}

// ══════════════════════════════════════════════════════════
//  HEALTH DIMENSIONS (for CulturalHealthGauge)
// ══════════════════════════════════════════════════════════

function buildHealthDimensions(analytics: CulturalAnalytics): HealthDimension[] {
  const avgVenueUtil = analytics.venue_utilization.length > 0
    ? Math.round(analytics.venue_utilization.reduce((s, v) => s + v.utilization_rate, 0) / analytics.venue_utilization.length)
    : 0;

  const budgetScore =
    analytics.budget_utilization_pct >= 60 && analytics.budget_utilization_pct <= 90
      ? 90
      : analytics.budget_utilization_pct >= 40
        ? 60
        : 30;

  const attendanceScore =
    analytics.attendance_trend === 'up' ? 85 :
    analytics.attendance_trend === 'stable' ? 60 : 30;

  const diversityScore = Math.min(100, analytics.category_performance.filter((c) => c.engagement_score > 30).length * 25);

  const innovationScore = Math.max(20, 100 - analytics.cross_domain_signals.length * 15);

  return [
    { label: 'Engagement', score: calculateEngagementScore(analytics), icon: '🎯' },
    { label: 'Diversidad', score: diversityScore, icon: '🎨' },
    { label: 'Venues', score: avgVenueUtil, icon: '🏛️' },
    { label: 'Budget', score: budgetScore, icon: '💰' },
    { label: 'Asistencia', score: attendanceScore, icon: '👥' },
    { label: 'Innovación', score: innovationScore, icon: '🔬' },
  ];
}

// ══════════════════════════════════════════════════════════
//  CROSS-REFERENCES
// ══════════════════════════════════════════════════════════

function generateCrossReferences(analytics: CulturalAnalytics): CrossReference[] {
  const refs: CrossReference[] = [];

  // 1. Underutilized venues + available budget
  const underused = analytics.venue_utilization.filter((v) => v.utilization_rate < 25);
  if (underused.length > 0 && analytics.budget_utilization_pct < 70) {
    refs.push({
      severity: 'opportunity',
      icon: '🏛️',
      text: `${underused.length} venue(s) subutilizados con ${Math.round(100 - analytics.budget_utilization_pct)}% de budget disponible. Oportunidad: activar con eventos de bajo costo.`,
    });
  }

  // 2. Declining attendance + underperforming programs
  if (analytics.attendance_trend === 'down' && analytics.programs_below_threshold > 0) {
    refs.push({
      severity: 'warning',
      icon: '📉',
      text: `Asistencia decreciente + ${analytics.programs_below_threshold} programa(s) con baja inscripción. Los programas pueden estar afectando el engagement general.`,
    });
  }

  // 3. High concentration + low diversity
  if (analytics.category_performance.length > 0) {
    const sorted = [...analytics.category_performance].sort((a, b) => b.engagement_score - a.engagement_score);
    const top = sorted[0];
    const active = analytics.category_performance.filter((c) => c.engagement_score > 30).length;
    if (top.engagement_score > 70 && active <= 2) {
      refs.push({
        severity: 'insight',
        icon: '🎯',
        text: `Alta concentración: ${top.category} domina con ${top.engagement_score}pts y solo ${active} categoría(s) activa(s). Riesgo de monocultura cultural.`,
      });
    }
  }

  // 4. Exhibitions without receptions
  if (analytics.exhibitions_with_reception_pct < 50 && analytics.total_exhibitions > 2) {
    refs.push({
      severity: 'opportunity',
      icon: '🖼️',
      text: `Solo ${analytics.exhibitions_with_reception_pct}% de exposiciones con recepción. Las recepciones incrementan asistencia inicial ~40%.`,
    });
  }

  // 5. Cross-domain active + growing attendance
  if (analytics.cross_domain_signals.length > 0 && analytics.attendance_trend === 'up') {
    refs.push({
      severity: 'insight',
      icon: '🔗',
      text: `Señales cross-domain activas + asistencia creciente: el engagement cultural se está amplificando a otros dominios del club.`,
    });
  }

  return refs;
}

// ══════════════════════════════════════════════════════════
//  HERO SUMMARY
// ══════════════════════════════════════════════════════════

function generateHeroSummary(analytics: CulturalAnalytics, score: number): string {
  const parts: string[] = [];

  if (score >= 80) {
    parts.push(`Engagement cultural fuerte (${score}/100).`);
  } else if (score >= 60) {
    parts.push(`Engagement cultural moderado (${score}/100).`);
  } else {
    parts.push(`Engagement cultural bajo (${score}/100).`);
  }

  const activeCats = analytics.category_performance.filter((c) => c.engagement_score > 30).length;
  parts.push(`${activeCats} categoría(s) activa(s), ${analytics.total_events_30d} eventos en 30 días.`);

  if (analytics.attendance_trend === 'up') {
    parts.push('Tendencia ascendente.');
  } else if (analytics.attendance_trend === 'down') {
    parts.push('Tendencia descendente — requiere atención.');
  }

  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalIntelligencePanel({
  analytics,
  engagementScore: engagementScoreProp,
  className = '',
}: CulturalIntelligencePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const prefersReduced = useReducedMotion();

  const engagementScore = engagementScoreProp ?? useMemo(
    () => calculateEngagementScore(analytics),
    [analytics, engagementScoreProp],
  );

  const healthDimensions = useMemo(
    () => buildHealthDimensions(analytics),
    [analytics],
  );

  const crossRefs = useMemo(
    () => generateCrossReferences(analytics),
    [analytics],
  );

  const heroSummary = useMemo(
    () => generateHeroSummary(analytics, engagementScore),
    [analytics, engagementScore],
  );

  // ── Compute all 9 dimensions ──
  const dimensions = useMemo((): DimensionConfig[] => {
    const d1 = interpretCategories(analytics.category_performance);
    const d2 = interpretVenues(analytics.venue_utilization);
    const d3 = interpretEntertainment(analytics.entertainment_roi);
    const d4 = interpretAttendance(analytics);
    const d5 = interpretBudget(analytics);
    const d6 = interpretSeasonal(analytics.seasonal_patterns);
    const d7 = interpretPrograms(analytics);
    const d8 = interpretExhibitions(analytics);
    const d9 = interpretCrossDomain(analytics.cross_domain_signals);

    return [
      { id: 'd1', label: 'Rendimiento por Categoría', icon: <Music size={16} className="cip__dim-icon cip__dim-icon--teal" />, summary: d1.summary, level: d1.level },
      { id: 'd2', label: 'Utilización de Venues', icon: <Building size={16} className="cip__dim-icon cip__dim-icon--gold" />, summary: d2.summary, level: d2.level },
      { id: 'd3', label: 'ROI de Entretenimiento', icon: <Mic size={16} className="cip__dim-icon cip__dim-icon--emerald" />, summary: d3.summary, level: d3.level },
      { id: 'd4', label: 'Tendencia de Asistencia', icon: <Users size={16} className="cip__dim-icon cip__dim-icon--teal" />, summary: d4.summary, level: d4.level },
      { id: 'd5', label: 'Análisis Presupuestario', icon: <DollarSign size={16} className="cip__dim-icon cip__dim-icon--gold" />, summary: d5.summary, level: d5.level },
      { id: 'd6', label: 'Patrones Estacionales', icon: <CalendarIcon size={16} className="cip__dim-icon cip__dim-icon--amber" />, summary: d6.summary, level: d6.level },
      { id: 'd7', label: 'Programas Culturales', icon: <Music size={16} className="cip__dim-icon cip__dim-icon--teal" />, summary: d7.summary, level: d7.level },
      { id: 'd8', label: 'Exposiciones', icon: <Frame size={16} className="cip__dim-icon cip__dim-icon--sage" />, summary: d8.summary, level: d8.level },
      { id: 'd9', label: 'Señales Cross-Domain', icon: <AlertTriangle size={16} className="cip__dim-icon cip__dim-icon--amber" />, summary: d9.summary, level: d9.level },
    ];
  }, [analytics]);

  // ── Insight map (for expanded view) ──
  const insights = useMemo(() => ({
    d1: interpretCategories(analytics.category_performance).insight,
    d2: interpretVenues(analytics.venue_utilization).insight,
    d3: interpretEntertainment(analytics.entertainment_roi).insight,
    d4: interpretAttendance(analytics).insight,
    d5: interpretBudget(analytics).insight,
    d6: interpretSeasonal(analytics.seasonal_patterns).insight,
    d7: interpretPrograms(analytics).insight,
    d8: interpretExhibitions(analytics).insight,
    d9: interpretCrossDomain(analytics.cross_domain_signals).insight,
  }), [analytics]);

  const toggleDimension = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className={cn('cip', className)}
      data-prefers-reduced={prefersReduced ? 'true' : undefined}
    >
      {/* ═══════════════════════════════════════ */}
      {/*  HERO: Gauge + Summary                 */}
      {/* ═══════════════════════════════════════ */}
      <header className="cip__hero">
        <div className="cip__hero-gauge">
          <CulturalHealthGauge
            score={engagementScore}
            dimensions={healthDimensions}
            size="md"
          />
        </div>
        <div className="cip__hero-info">
          <div className="cip__hero-header">
            <BarChart3 size={18} className="cip__hero-icon" />
            <h2 className="cip__title">Inteligencia Cultural — 9 Dimensiones</h2>
          </div>
          <p className="cip__hero-summary">{heroSummary}</p>
          <Badge variant="info" className="cip__engagement-badge">
            Engagement: {engagementScore}/100
          </Badge>
        </div>
      </header>

      {/* ═══════════════════════════════════════ */}
      {/*  CROSS-REFERENCES                      */}
      {/* ═══════════════════════════════════════ */}
      {crossRefs.length > 0 && (
        <div className="cip__cross-refs">
          {crossRefs.map((ref, i) => (
            <div
              key={i}
              className="cip__cross-ref"
              data-severity={ref.severity}
              style={{ '--stagger-i': i } as React.CSSProperties}
            >
              <span className="cip__cross-ref-icon" role="img" aria-hidden="true">
                {ref.icon}
              </span>
              <p className="cip__cross-ref-text">{ref.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/*  9 DIMENSIONS                          */}
      {/* ═══════════════════════════════════════ */}
      <div className="cip__dimensions">
        {dimensions.map((dim, i) => {
          const isExpanded = expanded.has(dim.id);
          const visual = renderDimensionVisual(dim.id, analytics);

          return (
            <div
              key={dim.id}
              className="cip__dimension"
              data-level={dim.level}
              data-expanded={isExpanded ? 'true' : undefined}
              style={{ '--stagger-i': i } as React.CSSProperties}
            >
              {/* Header — always visible */}
              <Button
                variant="unstyled"
                className="cip__dimension-header"
                onClick={() => toggleDimension(dim.id)}
                aria-expanded={isExpanded}
              >
                <div className="cip__dimension-header-left">
                  {dim.icon}
                  <span className="cip__dimension-label">{dim.label}</span>
                </div>
                <div className="cip__dimension-header-right">
                  <span className="cip__dimension-summary">{dim.summary}</span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      'cip__dimension-chevron',
                      isExpanded && 'cip__dimension-chevron--open',
                    )}
                  />
                </div>
              </Button>

              {/* Body — expandable */}
              <div className="cip__dimension-body">
                <div className="cip__dimension-body-inner">
                  {/* Visual */}
                  {visual && (
                    <div className="cip__dimension-visual">{visual}</div>
                  )}

                  {/* AI Insight */}
                  <div className="cip__dimension-insight">
                    <span className="cip__dimension-insight-icon">🧠</span>
                    <p className="cip__dimension-insight-text">
                      {insights[dim.id as keyof typeof insights]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  DIMENSION VISUAL RENDERERS
// ══════════════════════════════════════════════════════════

function renderDimensionVisual(
  id: string,
  analytics: CulturalAnalytics,
): React.ReactNode {
  switch (id) {
    case 'd1':
      return <CategoryPerformanceVisual data={analytics.category_performance} />;
    case 'd2':
      return <VenueUtilizationVisual data={analytics.venue_utilization} />;
    case 'd3':
      return <EntertainmentROIVisual data={analytics.entertainment_roi} />;
    case 'd4':
      return <AttendanceVisual analytics={analytics} />;
    case 'd5':
      return <BudgetVisual analytics={analytics} />;
    case 'd6':
      return <SeasonalVisual data={analytics.seasonal_patterns} />;
    case 'd7':
      return <ProgramsVisual analytics={analytics} />;
    case 'd8':
      return <ExhibitionsVisual analytics={analytics} />;
    case 'd9':
      return <CrossDomainVisual data={analytics.cross_domain_signals} />;
    default:
      return null;
  }
}

/** D1: Category Performance bars. */
function CategoryPerformanceVisual({ data }: { data: CulturalAnalytics['category_performance'] }) {
  if (data.length === 0) return <p className="cip__empty">Sin datos</p>;
  const sorted = [...data].sort((a, b) => b.engagement_score - a.engagement_score);

  return (
    <div className="cip__bars">
      {sorted.map((cat, i) => {
        const cfg = CATEGORY_CONFIG[cat.category as keyof typeof CATEGORY_CONFIG];
        const pct = Math.min(100, cat.engagement_score);
        return (
          <div key={cat.category} className="cip__bar-row" style={{ '--stagger-i': i } as React.CSSProperties}>
            <span className="cip__bar-emoji">{cfg?.emoji ?? '📌'}</span>
            <span className="cip__bar-label">{cfg?.label ?? cat.category}</span>
            <div className="cip__bar-track">
              <div className="cip__bar-fill" style={{ '--bar-width': `${pct}%` } as React.CSSProperties} data-level={pct >= 70 ? 'excellent' : pct >= 50 ? 'good' : pct >= 30 ? 'warning' : 'critical'} />
            </div>
            <span className="cip__bar-value">{cat.engagement_score}</span>
            <span className="cip__bar-meta">{cat.event_count} evt</span>
          </div>
        );
      })}
    </div>
  );
}

/** D2: Venue Utilization bars. */
function VenueUtilizationVisual({ data }: { data: CulturalAnalytics['venue_utilization'] }) {
  if (data.length === 0) return <p className="cip__empty">Sin datos</p>;
  const sorted = [...data].sort((a, b) => b.utilization_rate - a.utilization_rate);

  return (
    <div className="cip__bars">
      {sorted.map((v, i) => (
        <div key={v.venue} className="cip__bar-row" style={{ '--stagger-i': i } as React.CSSProperties}>
          <span className="cip__bar-emoji">🏛️</span>
          <span className="cip__bar-label">{v.venue}</span>
          <div className="cip__bar-track">
            <div className="cip__bar-fill" style={{ '--bar-width': `${Math.min(100, v.utilization_rate)}%` } as React.CSSProperties} data-level={v.utilization_rate >= 50 ? 'excellent' : v.utilization_rate >= 25 ? 'good' : 'critical'} />
          </div>
          <span className="cip__bar-value">{v.utilization_rate}%</span>
          <span className="cip__bar-meta">{v.total_bookings} res</span>
        </div>
      ))}
    </div>
  );
}

/** D3: Entertainment ROI grid. */
function EntertainmentROIVisual({ data }: { data: CulturalAnalytics['entertainment_roi'] }) {
  if (data.length === 0) return <p className="cip__empty">Sin datos</p>;

  return (
    <div className="cip__grid">
      {data.map((e, i) => {
        const cfg = ENTERTAINMENT_TYPE_CONFIG[e.entertainment_type as keyof typeof ENTERTAINMENT_TYPE_CONFIG];
        return (
          <div key={e.entertainment_type} className="cip__grid-item" style={{ '--stagger-i': i } as React.CSSProperties}>
            <span className="cip__grid-emoji">{cfg?.emoji ?? '🎵'}</span>
            <span className="cip__grid-label">{cfg?.label ?? e.entertainment_type}</span>
            <span className="cip__grid-stat">{e.total_acts} actos</span>
            <span className="cip__grid-stat" data-level={e.contracted_rate >= 80 ? 'excellent' : e.contracted_rate >= 50 ? 'good' : 'warning'}>{e.contracted_rate}%</span>
            <span className="cip__grid-stat">{formatCurrency(e.avg_cost)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** D4: Attendance trend display. */
function AttendanceVisual({ analytics }: { analytics: CulturalAnalytics }) {
  const trend = analytics.attendance_trend;
  return (
    <div className="cip__trend">
      <div className="cip__trend-icon-wrap" data-trend={trend}>
        {trend === 'up' ? <TrendingUp size={24} className="cip__trend-icon" /> :
         trend === 'down' ? <TrendingDown size={24} className="cip__trend-icon" /> :
         <Target size={24} className="cip__trend-icon" />}
      </div>
      <div className="cip__trend-stats">
        <div className="cip__trend-stat">
          <span className="cip__trend-stat-value">{analytics.avg_attendance_30d.toFixed(0)}</span>
          <span className="cip__trend-stat-label">Promedio 30d</span>
        </div>
        <div className="cip__trend-stat">
          <span className="cip__trend-stat-value">{analytics.total_events_30d}</span>
          <span className="cip__trend-stat-label">Eventos 30d</span>
        </div>
      </div>
    </div>
  );
}

/** D5: Budget bar. */
function BudgetVisual({ analytics }: { analytics: CulturalAnalytics }) {
  const pct = analytics.budget_utilization_pct;
  return (
    <div className="cip__budget">
      <div className="cip__budget-bar-track">
        <div className="cip__budget-bar-fill" style={{ '--bar-width': `${Math.min(100, pct)}%` } as React.CSSProperties} data-level={pct > 90 ? 'critical' : pct > 70 ? 'warning' : 'excellent'} />
      </div>
      <div className="cip__budget-stats">
        <span>Plan: {formatCurrency(analytics.total_budget_planned)}</span>
        <span>Ejec: {formatCurrency(analytics.total_budget_spent)}</span>
        <span data-level={pct > 90 ? 'critical' : pct > 70 ? 'warning' : 'excellent'}>{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

/** D6: Seasonal patterns grid. */
function SeasonalVisual({ data }: { data: CulturalAnalytics['seasonal_patterns'] }) {
  if (data.length === 0) return <p className="cip__empty">Sin datos</p>;

  return (
    <div className="cip__grid cip__grid--2col">
      {data.map((sp, i) => (
        <div key={sp.season} className="cip__season-card" style={{ '--stagger-i': i } as React.CSSProperties}>
          <p className="cip__season-title">{sp.season}</p>
          <div className="cip__season-stats">
            <span>{sp.program_count} prog · {sp.total_participants}/{sp.max_participants} part</span>
            <span data-level={sp.enrollment_rate >= 70 ? 'excellent' : sp.enrollment_rate >= 40 ? 'good' : 'warning'}>Inscripción: {sp.enrollment_rate}%</span>
            <span>{formatCurrency(sp.total_budget)}</span>
            {sp.top_category && <span>Top: {sp.top_category}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** D7: Programs metrics. */
function ProgramsVisual({ analytics }: { analytics: CulturalAnalytics }) {
  return (
    <div className="cip__metric-pair">
      <div className="cip__metric">
        <span className="cip__metric-value">{analytics.total_programs}</span>
        <span className="cip__metric-label">Total</span>
      </div>
      <div className="cip__metric">
        <span className="cip__metric-value">{analytics.active_programs}</span>
        <span className="cip__metric-label">Activos</span>
      </div>
      <div className="cip__metric">
        <span className="cip__metric-value" data-level={analytics.avg_enrollment_pct >= 70 ? 'excellent' : analytics.avg_enrollment_pct >= 40 ? 'good' : 'warning'}>{analytics.avg_enrollment_pct}%</span>
        <span className="cip__metric-label">Inscripción prom</span>
      </div>
      {analytics.programs_below_threshold > 0 && (
        <div className="cip__metric">
          <span className="cip__metric-value" data-level="warning">{analytics.programs_below_threshold}</span>
          <span className="cip__metric-label">Bajo 30%</span>
        </div>
      )}
    </div>
  );
}

/** D8: Exhibitions metrics. */
function ExhibitionsVisual({ analytics }: { analytics: CulturalAnalytics }) {
  return (
    <div className="cip__metric-pair">
      <div className="cip__metric">
        <span className="cip__metric-value">{analytics.total_exhibitions}</span>
        <span className="cip__metric-label">Total</span>
      </div>
      <div className="cip__metric">
        <span className="cip__metric-value">{analytics.active_exhibitions}</span>
        <span className="cip__metric-label">Activas</span>
      </div>
      <div className="cip__metric">
        <span className="cip__metric-value">{analytics.avg_exhibition_duration_days}d</span>
        <span className="cip__metric-label">Duración prom</span>
      </div>
      <div className="cip__metric">
        <span className="cip__metric-value" data-level={analytics.exhibitions_with_reception_pct >= 70 ? 'excellent' : analytics.exhibitions_with_reception_pct >= 40 ? 'good' : 'warning'}>{analytics.exhibitions_with_reception_pct}%</span>
        <span className="cip__metric-label">Con recepción</span>
      </div>
    </div>
  );
}

/** D9: Cross-domain signals list. */
function CrossDomainVisual({ data }: { data: string[] }) {
  if (data.length === 0) return <p className="cip__empty cip__empty--good">Sin señales — todo en orden</p>;

  return (
    <div className="cip__signals">
      {data.map((signal, i) => (
        <div key={i} className="cip__signal" style={{ '--stagger-i': i } as React.CSSProperties}>
          <AlertTriangle size={14} className="cip__signal-icon" />
          <span className="cip__signal-text">{signal}</span>
        </div>
      ))}
    </div>
  );
}