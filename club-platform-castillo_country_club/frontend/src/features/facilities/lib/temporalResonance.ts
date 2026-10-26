// src/features/facilities/lib/temporalResonance.ts
// ═══════════════════════════════════════════════════════════════
// TEMPORAL RESONANCE ENGINE — "The Ripple Effect"
//
// §F12: traceEventRipple / computeHiddenCosts /
//        detectResonancePatterns
//
// Every event creates a CASCADE OF HIDDEN EFFECTS across
// facilities and time. A gala on Saturday at the Salón Dorado:
//   21:00 — 45% of attendees flood the Bar (spike)
//   23:00 — Lobby floor gets 3x normal traffic (wear)
//   Sun 08:00 — Pool sees +30% (spillover from gala guests)
//   Mon 07:00 — Gym sees -20% (people recovering)
//   Mon 09:00 — Salón cleaning takes 2x normal
//   Tue — Lobby floor maintenance accelerated by 1 week
//
// The system traces these ripples and calculates HIDDEN COSTS
// that nobody else sees. This transforms event pricing from
// guesswork to science.
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityReservation,
  AmenityUtilizationResponse,
  DeteriorationModel,
  RevenueModel,
  EventRipple,
  RippleEffect,
  HiddenCosts,
  ResonancePattern,
} from "../types";

import {
  FACILITY_TYPE_CONFIG,
  CROSS_DOMAIN_CONFIG,
  type FacilityCategory,
} from "../config";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hoursBetween(dateA: Date, dateB: Date): number {
  return Math.abs(dateA.getTime() - dateB.getTime()) / 3_600_000;
}

// ═══════════════════════════════════════════════════════════════
// RIPPLE PROPAGATION RULES
//
// How does an event in one facility affect others?
// These rules encode the causal chains:
//
//   Source → Target: effect type, magnitude, timing, predictability
//
// Derived from the spatial graph edge correlations +
// domain expertise about club operations.
// ═══════════════════════════════════════════════════════════════

interface RippleRule {
  sourceCategory: FacilityCategory;
  targetCategory: FacilityCategory;
  effectType: RippleEffect["effect_type"];
  /** Magnitude as fraction of source event attendance */
  magnitudeBase: number;
  /** Hours after event when effect peaks */
  delayHours: number;
  /** Duration of effect in hours */
  durationHours: number;
  /** Is this effect predictable from historical data? */
  predictable: boolean;
  /** Description template: {source}, {target}, {attendance} replaced at runtime */
  descriptionTemplate: string;
}

const RIPPLE_RULES: RippleRule[] = [
  // ── Social events → Bar/Lounge overflow ──
  {
    sourceCategory: "social",
    targetCategory: "social",
    effectType: "occupancy_spike",
    magnitudeBase: 0.35,
    delayHours: 2,
    durationHours: 3,
    predictable: true,
    descriptionTemplate:
      "{attendance} asistentes del evento en {source} → ~{magnitude} personas adicionales en {target} (post-evento)",
  },

  // ── Social events → Parking surge ──
  {
    sourceCategory: "social",
    targetCategory: "service",
    effectType: "occupancy_spike",
    magnitudeBase: 0.6,
    delayHours: -0.5,
    durationHours: 5,
    predictable: true,
    descriptionTemplate:
      "Evento en {source} genera ~{magnitude} vehículos adicionales en {target}",
  },

  // ── Social events → Restaurant pre-event ──
  {
    sourceCategory: "social",
    targetCategory: "social",
    effectType: "revenue_impact",
    magnitudeBase: 0.2,
    delayHours: -2,
    durationHours: 2,
    predictable: true,
    descriptionTemplate:
      "Cena pre-evento: ~{magnitude} comensales adicionales en {target} antes del evento en {source}",
  },

  // ── Wellness/Sport → Pool post-activity ──
  {
    sourceCategory: "wellness",
    targetCategory: "wellness",
    effectType: "occupancy_spike",
    magnitudeBase: 0.4,
    delayHours: 1,
    durationHours: 2,
    predictable: true,
    descriptionTemplate:
      "Post-actividad: ~{magnitude} usuarios de {source} migran a {target}",
  },

  // ── Large events → Lobby floor wear ──
  {
    sourceCategory: "social",
    targetCategory: "service",
    effectType: "maintenance_triggered",
    magnitudeBase: 0.15,
    delayHours: 12,
    durationHours: 24,
    predictable: true,
    descriptionTemplate:
      "Tráfico de {attendance} personas acelera desgaste de {target} (zona de tránsito desde {source})",
  },

  // ── Any large event → Next-day facility fatigue ──
  {
    sourceCategory: "social",
    targetCategory: "social",
    effectType: "occupancy_drop",
    magnitudeBase: 0.2,
    delayHours: 12,
    durationHours: 12,
    predictable: true,
    descriptionTemplate:
      "Fatiga post-evento: ~{magnitude} menos personas en {target} el día siguiente al evento en {source}",
  },

  // ── Pool/sport events → Garden spillover ──
  {
    sourceCategory: "sport",
    targetCategory: "social",
    effectType: "occupancy_spike",
    magnitudeBase: 0.25,
    delayHours: 1,
    durationHours: 3,
    predictable: false,
    descriptionTemplate:
      "Después de actividad en {source}, ~{magnitude} personas buscan relax en {target}",
  },

  // ── Large social event → Comfort drop in venue ──
  {
    sourceCategory: "social",
    targetCategory: "social",
    effectType: "comfort_drop",
    magnitudeBase: 0.3,
    delayHours: 1,
    durationHours: 4,
    predictable: true,
    descriptionTemplate:
      "Evento de {attendance} personas reduce confort en {source}: CO2, temperatura y ruido elevados",
  },

  // ── Kids events → Parent restaurant spending ──
  {
    sourceCategory: "service",
    targetCategory: "social",
    effectType: "revenue_impact",
    magnitudeBase: 0.45,
    delayHours: 1,
    durationHours: 2,
    predictable: true,
    descriptionTemplate:
      "Mientras los niños están en {source}, ~{magnitude} padres generan revenue en {target}",
  },

  // ── Golf → Restaurant/Lounge post-game ──
  {
    sourceCategory: "sport",
    targetCategory: "social",
    effectType: "revenue_impact",
    magnitudeBase: 0.65,
    delayHours: 0.5,
    durationHours: 2,
    predictable: true,
    descriptionTemplate:
      "Post-golf: ~{magnitude} jugadores comen/beben en {target}",
  },
];

// ═══════════════════════════════════════════════════════════════
// §F12a: traceEventRipple
//
// "Every event creates a cascade of hidden effects."
//
// Given an event (reservation) and the spatial graph data,
// traces ALL downstream effects across facilities and time,
// up to 7 days ahead.
// ═══════════════════════════════════════════════════════════════

export function traceEventRipple(
  reservation: FacilityReservation,
  facilities: Facility[],
  _allReservations: FacilityReservation[],
  _utilization: AmenityUtilizationResponse | null,
): EventRipple {
  const sourceFacility = facilities.find(
    (f) => f.id === reservation.facility_id,
  );
  if (!sourceFacility) {
    return buildEmptyRipple(reservation);
  }

  const sourceCategory =
    FACILITY_TYPE_CONFIG[sourceFacility.facility_type].category;
  const attendance = reservation.guest_count;
  const eventDate = new Date(`${reservation.date}T${reservation.start_time ?? "19:00"}`);
  const maxDurationHours = CROSS_DOMAIN_CONFIG.RIPPLE_MAX_DURATION_HOURS;
  const minMagnitude = CROSS_DOMAIN_CONFIG.RIPPLE_MIN_MAGNITUDE;

  const effects: RippleEffect[] = [];

  // ── Apply each ripple rule ──
  for (const rule of RIPPLE_RULES) {
    if (rule.sourceCategory !== sourceCategory) continue;

    // Find target facilities in the matching category
    const targetFacilities = facilities.filter((f) => {
      const cat = FACILITY_TYPE_CONFIG[f.facility_type].category;
      return cat === rule.targetCategory && f.id !== reservation.facility_id;
    });

    for (const target of targetFacilities) {
      // Compute magnitude
      const rawMagnitude = Math.round(attendance * rule.magnitudeBase);
      const magnitudePct = clamp(
        Math.round((rawMagnitude / Math.max(target.capacity, 1)) * 100),
        0,
        100,
      );

      // Skip negligible effects
      if (magnitudePct < minMagnitude && rule.effectType !== "maintenance_triggered") {
        continue;
      }

      // Compute timestamp
      const effectTime = new Date(eventDate);
      effectTime.setHours(effectTime.getHours() + rule.delayHours);

      // Skip effects beyond max duration
      if (hoursBetween(effectTime, eventDate) > maxDurationHours) {
        continue;
      }

      // Build description
      const description = rule.descriptionTemplate
        .replace("{source}", sourceFacility.name)
        .replace("{target}", target.name)
        .replace("{attendance}", String(attendance))
        .replace("{magnitude}", String(rawMagnitude));

      effects.push({
        timestamp: effectTime.toISOString(),
        facility_id: target.id,
        effect_type: rule.effectType,
        magnitude: rule.effectType === "maintenance_triggered"
          ? Math.round(rule.magnitudeBase * 100)
          : magnitudePct,
        description,
        is_predictable: rule.predictable,
      });
    }
  }

  // ── Sort effects by timestamp ──
  effects.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // ── Compute aggregate stats ──
  const uniqueFacilities = new Set(effects.map((e) => e.facility_id));
  const totalDuration =
    effects.length >= 2
      ? hoursBetween(
          new Date(effects[effects.length - 1].timestamp),
          new Date(effects[0].timestamp),
        )
      : 0;

  // Cascade severity: sum of all magnitudes weighted by type
  const severityWeights: Record<string, number> = {
    occupancy_spike: 1,
    occupancy_drop: 0.8,
    comfort_drop: 1.5,
    maintenance_triggered: 2,
    revenue_impact: 0.5,
    flow_redirect: 0.7,
  };
  const cascadeSeverity = clamp(
    Math.round(
      effects.reduce(
        (s, e) =>
          s + e.magnitude * (severityWeights[e.effect_type] ?? 1),
        0,
      ) / Math.max(effects.length, 1),
    ),
    0,
    100,
  );

  return {
    source_event: {
      event_id: reservation.id,
      event_name: reservation.purpose,
      facility_id: reservation.facility_id,
      date: reservation.date,
      attendance,
    },
    effects,
    total_duration_hours: Math.round(totalDuration),
    total_affected_facilities: uniqueFacilities.size,
    cascade_severity: cascadeSeverity,
  };
}

function buildEmptyRipple(
  reservation: FacilityReservation,
): EventRipple {
  return {
    source_event: {
      event_id: reservation.id,
      event_name: reservation.purpose,
      facility_id: reservation.facility_id,
      date: reservation.date,
      attendance: reservation.guest_count,
    },
    effects: [],
    total_duration_hours: 0,
    total_affected_facilities: 0,
    cascade_severity: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F12b: computeHiddenCosts
//
// "The true cost of an event is NOT just the venue rental.
//  It's the entire chain of downstream effects."
//
// Computes:
//   - Extra maintenance from wear acceleration
//   - Extra energy from extended HVAC/lighting
//   - Wear acceleration (days of extra aging)
//   - Opportunity cost (facilities couldn't be used)
//   - Total hidden cost vs event revenue (ratio)
// ═══════════════════════════════════════════════════════════════

export function computeHiddenCosts(
  ripple: EventRipple,
  revenueModels: Record<string, RevenueModel>,
  deteriorationModels: Record<string, DeteriorationModel>,
): HiddenCosts {
  let maintenanceExtra = 0;
  let energyExtra = 0;
  let wearAccelerationDays = 0;
  let opportunityCost = 0;
  const breakdown: string[] = [];

  for (const effect of ripple.effects) {
    const revenue = revenueModels[effect.facility_id];
    const deterioration = deteriorationModels[effect.facility_id];

    switch (effect.effect_type) {
      case "maintenance_triggered": {
        // Maintenance triggered by event wear
        const baseMaintCost =
          deterioration?.maintenance_budget_needed ?? 500_000;
        const effectFraction = effect.magnitude / 100;
        const cost = Math.round(baseMaintCost * effectFraction * 0.1);
        maintenanceExtra += cost;
        wearAccelerationDays += Math.round(effect.magnitude * 0.1);
        breakdown.push(
          `Mantenimiento extra por desgaste: ₡${(cost / 1000).toFixed(0)}k (${effect.description.slice(0, 60)})`,
        );
        break;
      }

      case "occupancy_spike": {
        // Spike → extra energy, cleaning, staffing
        const hourlyOperatingCost = 50_000; // CRC/hour baseline
        const durationHours = 3; // average spike duration
        const energyCost = Math.round(
          hourlyOperatingCost * durationHours * (effect.magnitude / 100),
        );
        energyExtra += energyCost;
        breakdown.push(
          `Energía/operaciones extra por pico: ₡${(energyCost / 1000).toFixed(0)}k`,
        );
        break;
      }

      case "occupancy_drop": {
        // Drop → opportunity cost (empty facility that could earn)
        if (revenue) {
          const dailyRevenue = revenue.current.revenue_per_month / 30;
          const dropFraction = effect.magnitude / 100;
          const lostRevenue = Math.round(dailyRevenue * dropFraction);
          opportunityCost += lostRevenue;
          breakdown.push(
            `Revenue perdido por baja ocupación: ₡${(lostRevenue / 1000).toFixed(0)}k`,
          );
        }
        break;
      }

      case "comfort_drop": {
        // Comfort drop → potential member complaint, future revenue risk
        if (effect.magnitude > 20) {
          const riskCost = Math.round(effect.magnitude * 5_000);
          opportunityCost += riskCost;
          breakdown.push(
            `Risco reputacional por caída de confort (-${effect.magnitude}pts): ₡${(riskCost / 1000).toFixed(0)}k estimado`,
          );
        }
        break;
      }

      case "revenue_impact": {
        // Revenue impact is tracked separately (positive effects)
        // Here we capture the operational cost of serving the extra demand
        if (revenue && effect.magnitude > 0) {
          const operationalCost = Math.round(
            (revenue.current.revenue_per_event * effect.magnitude) / 100 * 0.15,
          );
          energyExtra += operationalCost;
        }
        break;
      }

      case "flow_redirect": {
        // Flow redirect → minimal cost, mostly informational
        break;
      }
    }
  }

  const totalHidden = maintenanceExtra + energyExtra + opportunityCost;

  // Ratio to event revenue
  const sourceRevenue =
    revenueModels[ripple.source_event.facility_id]?.current.revenue_per_event ?? 0;
  const ratioToRevenue =
    sourceRevenue > 0
      ? Math.round((totalHidden / sourceRevenue) * 100) / 100
      : 0;

  return {
    maintenance_extra: maintenanceExtra,
    energy_extra: energyExtra,
    wear_acceleration_days: wearAccelerationDays,
    opportunity_cost: opportunityCost,
    total_hidden: totalHidden,
    ratio_to_revenue: ratioToRevenue,
    breakdown,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F12c: detectResonancePatterns
//
// "The system watches ripples over time and learns which
//  events create which patterns — so it can PREDICT the
//  next ripple before it happens."
//
// Groups historical ripples by trigger type and finds
// recurring causal chains that can be predicted.
// ═══════════════════════════════════════════════════════════════

export function detectResonancePatterns(
  ripples: EventRipple[],
): ResonancePattern[] {
  if (ripples.length < CROSS_DOMAIN_CONFIG.PATTERN_MIN_OBSERVATIONS) {
    return [];
  }

  const patterns: ResonancePattern[] = [];

  // ── Group ripples by source facility + similar attendance ──
  const groups = new Map<string, EventRipple[]>();

  for (const ripple of ripples) {
    // Bucket attendance into ranges: small (<30), medium (30-80), large (80+)
    const attendance = ripple.source_event.attendance;
    const sizeBucket =
      attendance < 30 ? "small" : attendance < 80 ? "medium" : "large";

    const key = `${ripple.source_event.facility_id}:${sizeBucket}`;
    const list = groups.get(key) ?? [];
    list.push(ripple);
    groups.set(key, list);
  }

  // ── Analyze each group for recurring patterns ──
  groups.forEach((groupRipples, key) => {
    if (
      groupRipples.length <
      CROSS_DOMAIN_CONFIG.PATTERN_MIN_OBSERVATIONS
    )
      return;

    // Find common effects across all ripples in this group
    const effectCounts = new Map<
      string,
      { count: number; avgMagnitude: number; descriptions: string[] }
    >();

    for (const ripple of groupRipples) {
      for (const effect of ripple.effects) {
        const effectKey = `${effect.facility_id}:${effect.effect_type}`;
        const entry = effectCounts.get(effectKey) ?? {
          count: 0,
          avgMagnitude: 0,
          descriptions: [],
        };
        entry.count++;
        entry.avgMagnitude += effect.magnitude;
        if (!entry.descriptions.includes(effect.description)) {
          entry.descriptions.push(effect.description);
        }
        effectCounts.set(effectKey, entry);
      }
    }

    // Effects that appear in > 50% of the group are "predictable patterns"
    const threshold = Math.ceil(groupRipples.length * 0.5);

    effectCounts.forEach((data, effectKey) => {
      if (data.count < threshold) return;

      const [facilityId, effectType] = effectKey.split(":");
      const avgMagnitude = Math.round(data.avgMagnitude / data.count);
      const avgAttendance = Math.round(
        groupRipples.reduce(
          (s, r) => s + r.source_event.attendance,
          0,
        ) / groupRipples.length,
      );

      // Build a representative ripple for this pattern
      // Compute average hidden costs
      const avgCascadeSeverity = Math.round(
        groupRipples.reduce((s, r) => s + r.cascade_severity, 0) /
          groupRipples.length,
      );

      const [sourceFacilityId, sizeBucket] = key.split(":");
      patterns.push({
        id: `resonance-${sourceFacilityId}-${sizeBucket}-${effectType}-${facilityId}`,
        trigger: `Evento ${sizeBucket === "small" ? "pequeño" : sizeBucket === "medium" ? "mediano" : "grande"} (~${avgAttendance} personas) en facility ${sourceFacilityId}`,
        typical_ripple: {
          source_event: {
            event_id: "pattern",
            event_name: `Evento ${sizeBucket}`,
            facility_id: sourceFacilityId,
            date: "recurring",
            attendance: avgAttendance,
          },
          effects: [
            {
              timestamp: "recurring",
              facility_id: facilityId,
              effect_type: effectType as RippleEffect["effect_type"],
              magnitude: avgMagnitude,
              description: data.descriptions[0] ?? "Efecto recurrente",
              is_predictable: true,
            },
          ],
          total_duration_hours: Math.round(
            groupRipples.reduce((s, r) => s + r.total_duration_hours, 0) /
              groupRipples.length,
          ),
          total_affected_facilities: Math.round(
            groupRipples.reduce(
              (s, r) => s + r.total_affected_facilities,
              0,
            ) / groupRipples.length,
          ),
          cascade_severity: avgCascadeSeverity,
        },
        hidden_cost_avg: avgCascadeSeverity * 15_000, // rough estimate
        times_observed: data.count,
        prediction_confidence: clamp(
          Math.round(
            CROSS_DOMAIN_CONFIG.PATTERN_CONFIDENCE_THRESHOLD * 100 +
              (data.count - CROSS_DOMAIN_CONFIG.PATTERN_MIN_OBSERVATIONS) * 5,
          ),
          60,
          95,
        ),
      });
    });
  });

  // Sort by observation count (more observed = more reliable)
  return patterns.sort((a, b) => b.times_observed - a.times_observed);
}

// ═══════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Trace ripples for all reservations and aggregate.
 * Returns the most significant ripples sorted by cascade severity.
 */
export function traceAllEventRipples(
  reservations: FacilityReservation[],
  facilities: Facility[],
  utilization: AmenityUtilizationResponse | null,
  maxRipples?: number,
): EventRipple[] {
  const limit = maxRipples ?? 20;

  // Only completed/confirmed reservations
  const eligible = reservations.filter(
    (r) => r.status === "completed" || r.status === "confirmed",
  );

  const ripples = eligible.map((r) =>
    traceEventRipple(r, facilities, reservations, utilization),
  );

  // Sort by cascade severity (most impactful first)
  ripples.sort((a, b) => b.cascade_severity - a.cascade_severity);

  return ripples.slice(0, limit);
}

/**
 * Compute hidden costs for multiple ripples and aggregate.
 */
export function computePortfolioHiddenCosts(
  ripples: EventRipple[],
  revenueModels: Record<string, RevenueModel>,
  deteriorationModels: Record<string, DeteriorationModel>,
): {
  total_hidden: number;
  avg_ratio_to_revenue: number;
  worst_ripple: EventRipple | null;
  breakdown_summary: string[];
} {
  if (ripples.length === 0) {
    return {
      total_hidden: 0,
      avg_ratio_to_revenue: 0,
      worst_ripple: null,
      breakdown_summary: [],
    };
  }

  let totalHidden = 0;
  let totalRatio = 0;
  let worstRipple: EventRipple | null = null;
  let worstCost = 0;
  const allBreakdowns: string[] = [];

  for (const ripple of ripples) {
    const costs = computeHiddenCosts(
      ripple,
      revenueModels,
      deteriorationModels,
    );
    totalHidden += costs.total_hidden;
    totalRatio += costs.ratio_to_revenue;

    if (costs.total_hidden > worstCost) {
      worstCost = costs.total_hidden;
      worstRipple = ripple;
    }

    allBreakdowns.push(...costs.breakdown);
  }

  // Aggregate breakdown by category
  const breakdownSummary: string[] = [];
  const maintenanceTotal = ripples.reduce((s, r) => {
    const c = computeHiddenCosts(r, revenueModels, deteriorationModels);
    return s + c.maintenance_extra;
  }, 0);
  const energyTotal = ripples.reduce((s, r) => {
    const c = computeHiddenCosts(r, revenueModels, deteriorationModels);
    return s + c.energy_extra;
  }, 0);
  const opportunityTotal = ripples.reduce((s, r) => {
    const c = computeHiddenCosts(r, revenueModels, deteriorationModels);
    return s + c.opportunity_cost;
  }, 0);

  if (maintenanceTotal > 0) {
    breakdownSummary.push(
      `Mantenimiento extra acumulado: ₡${(maintenanceTotal / 1_000_000).toFixed(1)}M`,
    );
  }
  if (energyTotal > 0) {
    breakdownSummary.push(
      `Costos operacionales extra: ₡${(energyTotal / 1_000_000).toFixed(1)}M`,
    );
  }
  if (opportunityTotal > 0) {
    breakdownSummary.push(
      `Costo de oportunidad: ₡${(opportunityTotal / 1_000_000).toFixed(1)}M`,
    );
  }

  return {
    total_hidden: totalHidden,
    avg_ratio_to_revenue: Math.round((totalRatio / ripples.length) * 100) / 100,
    worst_ripple: worstRipple,
    breakdown_summary: breakdownSummary,
  };
}