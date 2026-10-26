/**
 * VenueIntelligence — F31
 *
 * Venue utilization analysis + optimal venue matching.
 * Shows which venues are overused, underused, and suggests optimal venue
 * for upcoming event types based on historical data.
 *
 * Data: venue_utilization from CulturalAnalytics
 * Pattern: P13 (transform helpers), P9 (defensive rendering)
 */

import { useMemo } from 'react';
import {
  Building,
  MapPin,
  Sparkles,
  Star,
  TrendingDown,
  Users,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/Badge';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { cn, formatCurrency } from '@/shared/lib/utils';

import type { CulturalAnalytics, VenueType } from '../types';
import { VENUE_CONFIG } from '../types';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface VenueIntelligenceProps {
  analytics: CulturalAnalytics;
}

interface VenueRecommendation {
  eventType: string;
  recommendedVenue: string;
  reason: string;
  confidence: number;
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function VenueIntelligence({ analytics }: VenueIntelligenceProps) {
  const prefersReduced = useReducedMotion();
  const venues = analytics.venue_utilization;

  // Venue rankings
  const ranked = useMemo(() => {
    return [...venues].sort((a, b) => b.utilization_rate - a.utilization_rate);
  }, [venues]);

  // Underused venues (< 30%)
  const underused = useMemo(
    () => venues.filter((v) => v.utilization_rate < 30),
    [venues],
  );

  // Top venue
  const topVenue = ranked[0];

  // Average utilization
  const avgUtil = useMemo(() => {
    if (venues.length === 0) return 0;
    return venues.reduce((s, v) => s + v.utilization_rate, 0) / venues.length;
  }, [venues]);

  // Total guests across all venues
  const totalGuests = useMemo(
    () => venues.reduce((s, v) => s + v.total_guests, 0),
    [venues],
  );

  // Generate recommendations based on data patterns
  const recommendations = useMemo((): VenueRecommendation[] => {
    const recs: VenueRecommendation[] = [];

    // Large venue for galas (ballroom, garden)
    const largeVenues = venues.filter(
      (v) => v.venue_type === 'ballroom' || v.venue_type === 'garden',
    );
    if (largeVenues.length > 0) {
      const best = largeVenues.reduce((max, v) =>
        v.avg_guests > max.avg_guests ? v : max,
      );
      recs.push({
        eventType: 'Gala formal',
        recommendedVenue: best.venue,
        reason: `Promedio ${best.avg_guests.toFixed(0)} invitados — mejor capacidad`,
        confidence: 85,
      });
    }

    // Intimate venue for cocktails (lounge)
    const lounge = venues.find((v) => v.venue_type === 'lounge');
    if (lounge) {
      recs.push({
        eventType: 'Cóctel / Mixer',
        recommendedVenue: lounge.venue,
        reason: `${lounge.total_bookings} reservas — venue más usado para eventos sociales`,
        confidence: 80,
      });
    }

    // Garden for exhibitions
    const garden = venues.find((v) => v.venue_type === 'garden');
    if (garden) {
      recs.push({
        eventType: 'Exposición de arte',
        recommendedVenue: garden.venue,
        reason: 'Espacio abierto ideal para esculturas y arte ambiental',
        confidence: 70,
      });
    }

    return recs;
  }, [venues]);

  if (venues.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-surface-3)] bg-[var(--color-surface-1)] p-6 text-center">
        <Building className="mx-auto mb-2 h-8 w-8 text-[var(--color-silver-500)]" />
        <p className="text-xs text-[var(--color-silver-400)]">
          Sin datos de venues. Creá eventos para generar datos de utilización.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Building className="h-5 w-5 text-[var(--color-gold-400)]" />
        <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">
          Inteligencia de Venues
        </h3>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <VenueKPI label="Venues" value={venues.length} color="var(--color-silver-200)" />
        <VenueKPI label="Utilización prom" value={`${avgUtil.toFixed(0)}%`} color={avgUtil >= 50 ? 'var(--color-emerald-400)' : 'var(--color-amber-400)'} />
        <VenueKPI label="Total invitados" value={totalGuests} color="var(--color-teal-400)" />
        <VenueKPI label="Mejor venue" value={topVenue?.venue ?? '—'} color="var(--color-gold-400)" />
      </div>

      {/* ── Venue Rankings ── */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-[var(--color-silver-300)]">
          Ranking de Utilización
        </h4>
        {ranked.map((v, idx) => {
          const venueCfg = VENUE_CONFIG[v.venue_type as VenueType];
          return (
            <div
              key={v.venue}
              className={cn(
                'flex items-center gap-3 rounded-lg border border-[color-mix(in_srgb,var(--color-silver-600)_10%,transparent)] bg-[var(--color-surface-1)] p-3 transition-all',
                !prefersReduced && 'hover:bg-[var(--color-surface-2)]',
              )}
            >
              {/* Rank */}
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-mono)] text-[10px] font-bold',
                  idx === 0
                    ? 'bg-[color-mix(in_srgb,var(--color-gold-400)_15%,transparent)] text-[var(--color-gold-400)]'
                    : 'bg-[var(--color-surface-3)] text-[var(--color-silver-500)]',
                )}
              >
                {idx + 1}
              </span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-semibold text-[var(--color-silver-100)]">
                    {v.venue}
                  </span>
                  {venueCfg && (
                    <span className="text-[10px] text-[var(--color-silver-500)]">
                      {venueCfg.label}
                    </span>
                  )}
                </div>

                {/* Utilization bar */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        v.utilization_rate >= 50
                          ? 'bg-[var(--color-emerald-400)]'
                          : v.utilization_rate >= 25
                          ? 'bg-[var(--color-amber-400)]'
                          : 'bg-[var(--color-rose-400)]',
                      )}
                      style={{ width: `${Math.min(100, v.utilization_rate)}%` }}
                    />
                  </div>
                  <span className="w-10 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-silver-400)]">
                    {v.utilization_rate}%
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] text-[var(--color-silver-500)]">
                <span className="flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  {v.total_bookings} reservas
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" />
                  {v.avg_guests.toFixed(0)} prom
                </span>
                <span>{formatCurrency(v.total_budget)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Underused Alert ── */}
      {underused.length > 0 && (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-amber-400)_15%,transparent)] bg-[var(--color-amber-bg)] px-4 py-3">
          <div className="flex items-start gap-2">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-amber-400)]" />
            <div className="text-xs text-[var(--color-amber-300)]">
              <p className="mb-1 font-semibold">
                {underused.length} venue(s) con baja utilización (&lt;30%)
              </p>
              <p className="text-[var(--color-silver-400)]">
                {underused.map((v) => `${v.venue} (${v.utilization_rate}%)`).join(', ')}.
                Considerar activar estos espacios con programación recurrente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Venue Recommendations ── */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-xs font-medium text-[var(--color-silver-300)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-gold-400)]" />
            Recomendaciones de Venue
          </h4>
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-[color-mix(in_srgb,var(--color-gold-400)_10%,transparent)] bg-[var(--color-surface-0)] p-3"
            >
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-gold-400)]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--color-silver-100)]">
                  {rec.eventType} → {rec.recommendedVenue}
                </p>
                <p className="text-[10px] text-[var(--color-silver-400)]">
                  {rec.reason}
                </p>
              </div>
              <Badge variant="info" className="text-[9px]">
                {rec.confidence}%
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  VENUE KPI
// ══════════════════════════════════════════════════════════

function VenueKPI({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="glass-card px-3 py-2">
      <p className="text-[10px] text-[var(--color-silver-500)]">{label}</p>
      <p
        className="truncate font-[family-name:var(--font-mono)] text-sm font-semibold"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}
