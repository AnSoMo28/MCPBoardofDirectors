// src/features/facilities/lib/occupancyPrediction.ts
// ═══════════════════════════════════════════════════════════════
// OCCUPANCY PREDICTION ENGINE — "Occupancy as Field Physics"
//
// §F3: predictOccupancy / predictAllOccupancy
//
// Occupancy is not a percentage. It's a gravitational FIELD:
// density, flow, prediction of saturation, congestion emerging,
// and spatial optimization. The system doesn't just report
// how full a space IS — it predicts how full it WILL BE,
// WHY it's changing, and WHERE people will flow next.
//
// Pure functions. Zero side effects. Zero API calls.
// Input: utilization + reservations + reference time.
// Output: field intelligence per facility.
// ═══════════════════════════════════════════════════════════════

import type {
  FacilityType,
  AmenityUtilizationItem,
  AmenityUtilizationResponse,
  FacilityReservation,
  OccupancyPrediction,
  OccupancyFactor,
} from "../types";

import { classifyCrowdLevel } from "../types";

import {
  FACILITY_TYPE_CONFIG,
  OCCUPANCY_THRESHOLDS,
} from "../config";

// ═══════════════════════════════════════════════════════════════
// LOCAL HELPERS — Pure utilities for prediction
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Peak hour parsing ──────────────────────────────────────────

interface HourRange {
  start: number;
  end: number;
}

function parsePeakHours(peakHours: string[]): HourRange[] {
  return peakHours.map((range) => {
    const [startStr, endStr] = range.split("-");
    return {
      start: parseInt(startStr.split(":")[0], 10),
      end: parseInt(endStr.split(":")[0], 10),
    };
  });
}

function determinePeakTime(peakHours: string[]): string {
  if (peakHours.length === 0) return "—";
  const ranges = parsePeakHours(peakHours);
  // Return midpoint of the first peak range
  const first = ranges[0];
  const midHour = Math.round((first.start + first.end) / 2);
  return `${midHour.toString().padStart(2, "0")}:00`;
}

// ── Time-of-day factor ─────────────────────────────────────────
//
// Proximity to peak hours affects occupancy trajectory:
//   - Approaching peak (within 2h before) → moderate positive
//   - During peak → strong positive
//   - Just past peak (within 2h after) → moderate negative
//   - Far from peak → neutral

function computeTimeOfDayFactor(
  peakHours: string[],
  currentHour: number,
): number {
  const ranges = parsePeakHours(peakHours);
  let factor = 0;

  for (const range of ranges) {
    if (currentHour >= range.start && currentHour < range.end) {
      // Currently in peak → strong positive (max +15)
      const progress = (currentHour - range.start) / Math.max(range.end - range.start, 1);
      const peakIntensity = progress < 0.5 ? 15 : 15 * (1 - progress);
      factor = Math.max(factor, peakIntensity);
    } else if (currentHour >= range.start - 2 && currentHour < range.start) {
      // Approaching peak (within 2h before) → moderate positive (up to +10)
      const proximity = 1 - (range.start - currentHour) / 2;
      factor = Math.max(factor, proximity * 10);
    } else if (currentHour >= range.end && currentHour < range.end + 2) {
      // Just past peak (within 2h after) → moderate negative (up to -8)
      const recency = 1 - (currentHour - range.end) / 2;
      factor = Math.min(factor, -recency * 8);
    }
  }

  return Math.round(factor * 10) / 10;
}

// ── Recent trend from time series ──────────────────────────────
//
// Exponential weighted moving average of recent utilization changes.
// More recent data points weighted more heavily.
// Returns: average % change per time unit (positive = rising).

function computeRecentTrend(
  timeSeries: Array<{ date: string; utilization: number }>,
): number {
  if (timeSeries.length < 2) return 0;

  // Sort descending by date
  const sorted = [...timeSeries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Use up to 7 most recent entries
  const recent = sorted.slice(0, Math.min(7, sorted.length));
  if (recent.length < 2) return 0;

  const halfLife = OCCUPANCY_THRESHOLDS.PREDICTION.DECAY_HALF_LIFE_HOURS;
  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < recent.length - 1; i++) {
    const change = recent[i].utilization - recent[i + 1].utilization;
    const weight = Math.exp(-i / Math.max(halfLife, 1));
    weightedSum += change * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

// ── Reservation factor ─────────────────────────────────────────
//
// Upcoming confirmed reservations boost predicted occupancy.
// Computed separately for 1h, 3h, and full-day windows.

function computeReservationFactors(
  reservations: FacilityReservation[],
  facilityId: string,
  capacity: number,
  currentHour: number,
  todayStr: string,
): { in1h: number; in3h: number; peakToday: number } {
  const safeCapacity = Math.max(capacity, 1);

  const todayReservations = reservations.filter(
    (r) =>
      r.facility_id === facilityId &&
      r.date === todayStr &&
      r.status === "confirmed",
  );

  if (todayReservations.length === 0) {
    return { in1h: 0, in3h: 0, peakToday: 0 };
  }

  const guestsIn1h = todayReservations
    .filter((r) => {
      const startH = parseInt(r.start_time.split(":")[0], 10);
      return startH >= currentHour && startH < currentHour + 1;
    })
    .reduce((s, r) => s + r.guest_count, 0);

  const guestsIn3h = todayReservations
    .filter((r) => {
      const startH = parseInt(r.start_time.split(":")[0], 10);
      return startH >= currentHour && startH < currentHour + 3;
    })
    .reduce((s, r) => s + r.guest_count, 0);

  const guestsPeakToday = todayReservations.reduce(
    (s, r) => s + r.guest_count,
    0,
  );

  return {
    in1h: clamp((guestsIn1h / safeCapacity) * 100, 0, 25),
    in3h: clamp((guestsIn3h / safeCapacity) * 100, 0, 25),
    peakToday: clamp((guestsPeakToday / safeCapacity) * 100, 0, 40),
  };
}

// ── Seasonal factor ────────────────────────────────────────────
//
// Costa Rica climate impact on facility demand:
//   Dry season (Dec-Apr): outdoor boost (pool, garden, golf)
//   Rainy season (May-Nov): indoor boost (spa, gym, indoor sports)

function computeSeasonalFactor(facilityType: string, currentMonth: number): number {
  const config = FACILITY_TYPE_CONFIG[facilityType as FacilityType];
  if (!config) return 0;

  // CR dry season: Dec(11), Jan(0), Feb(1), Mar(2), Apr(3)
  const isDrySeason = currentMonth >= 11 || currentMonth <= 3;
  const poolBoost = OCCUPANCY_THRESHOLDS.PREDICTION.SUMMER_POOL_BOOST_PCT;

  switch (config.seasonal_factor) {
    case "summer_boost":
      return isDrySeason ? poolBoost : 0;
    case "winter_boost":
      return !isDrySeason ? 15 : 0;
    default:
      return 0;
  }
}

// ── Congestion risk ────────────────────────────────────────────
//
// Probability (0-100) that this facility will hit capacity.
// Based on current occupancy + trajectory + reservation load.

function computeCongestionRisk(
  currentPct: number,
  predicted1h: number,
  predicted3h: number,
  capacity: number,
): number {
  if (capacity <= 0) return 0;
  const maxPredicted = Math.max(predicted1h, predicted3h);

  // Base risk from current occupancy
  let risk = 0;
  if (currentPct >= 95) risk += 60;
  else if (currentPct >= 80) risk += 35;
  else if (currentPct >= 60) risk += 15;

  // Trajectory risk: rising toward capacity
  const trajectoryRisk = clamp(
    ((maxPredicted - currentPct) / Math.max(100 - currentPct, 1)) * 40,
    0,
    40,
  );
  risk += trajectoryRisk;

  return clamp(Math.round(risk), 0, 100);
}

// ── Flow direction ─────────────────────────────────────────────
//
// 2D vector representing the general direction of people flow.
// Used by OccupancyField to render flow arrows on the SVG map.
//
// The vector encodes:
//   - MAGNITUDE: how strongly people are moving (0-1)
//   - DIRECTION: based on time-of-day patterns
//     Morning (6-12): wellness/sport inbound → upper area
//     Afternoon (12-17): social/lateral → center/right
//     Evening (17-21): dining/events → center
//     Night (21-6): outbound → dispersal

function computeFlowDirection(
  currentPct: number,
  predicted1h: number,
  currentHour: number,
): { x: number; y: number } {
  const delta = predicted1h - currentPct;
  const magnitude = Math.min(Math.abs(delta) / 25, 1);

  if (magnitude < 0.1) return { x: 0, y: 0 };

  // Base direction by time of day
  let baseX = 0;
  let baseY = 0;

  if (currentHour >= 6 && currentHour < 12) {
    // Morning: flow toward wellness/sport zone (upper area)
    baseX = 0.3;
    baseY = -0.95;
  } else if (currentHour >= 12 && currentHour < 17) {
    // Afternoon: lateral flow toward social zone (center/right)
    baseX = 0.85;
    baseY = 0.15;
  } else if (currentHour >= 17 && currentHour < 21) {
    // Evening: flow toward dining/events (center)
    baseX = -0.25;
    baseY = 0.7;
  } else {
    // Night: dispersal from social zone (outbound)
    baseX = -0.6;
    baseY = -0.5;
  }

  // Reverse direction if occupancy is falling
  if (delta < 0) {
    baseX = -baseX;
    baseY = -baseY;
  }

  return {
    x: Math.round(baseX * magnitude * 100) / 100,
    y: Math.round(baseY * magnitude * 100) / 100,
  };
}

// ── Factor list builder ────────────────────────────────────────

function buildFactors(
  timeFactor: number,
  reservationFactors: { in1h: number; in3h: number; peakToday: number },
  seasonalFactor: number,
  forecastDelta: number,
): OccupancyFactor[] {
  const factors: OccupancyFactor[] = [];

  if (Math.abs(timeFactor) > 1) {
    factors.push({
      name: "Horario del día",
      impact: Math.round(timeFactor),
      direction: timeFactor > 0 ? "up" : "down",
      confidence: 85,
    });
  }

  if (reservationFactors.in3h > 1) {
    factors.push({
      name: "Reservas próximas",
      impact: Math.round(reservationFactors.in3h),
      direction: "up",
      confidence: 90,
    });
  }

  if (Math.abs(seasonalFactor) > 1) {
    factors.push({
      name: "Factor estacional",
      impact: Math.round(seasonalFactor),
      direction: seasonalFactor > 0 ? "up" : "down",
      confidence: 75,
    });
  }

  if (Math.abs(forecastDelta) > 1) {
    factors.push({
      name: "Pronóstico del sistema",
      impact: Math.round(forecastDelta),
      direction: forecastDelta > 0 ? "up" : "down",
      confidence: 70,
    });
  }

  // Sort by absolute impact descending
  factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return factors;
}

// ── Confidence computation ─────────────────────────────────────
//
// Prediction confidence based on data availability and stability.
// Never 100% — the future is inherently uncertain.

function computeConfidence(
  timeSeriesLength: number,
  hasForecast: boolean,
  trendDirection: string,
): number {
  let confidence = 50;

  // Historical data depth
  confidence += Math.min(20, timeSeriesLength * 2);

  // Backend forecast available
  if (hasForecast) confidence += 10;

  // Stable trends are more predictable
  if (trendDirection === "stable") confidence += 10;
  else if (trendDirection === "improving") confidence += 5;

  // Cap at 95 — never certain about the future
  return clamp(Math.round(confidence), 40, 95);
}

// ═══════════════════════════════════════════════════════════════
// §F3a: predictOccupancy
//
// "The system doesn't just report how full a space IS —
//  it predicts how full it WILL BE, WHY it's changing,
//  and WHERE people will flow next."
//
// Computes: current state, 1h/3h predictions, peak prediction,
// congestion risk, flow direction, and causal factors.
// ═══════════════════════════════════════════════════════════════

export function predictOccupancy(
  utilItem: AmenityUtilizationItem,
  reservations: FacilityReservation[],
  referenceDate?: Date,
): OccupancyPrediction {
  const now = referenceDate ?? new Date();
  const currentHour = now.getHours();
  const currentMonth = now.getMonth();
  const todayStr = now.toISOString().split("T")[0];

  const facilityId = utilItem.facility_id;
  const currentPct = utilItem.utilization_pct;
  const capacity = Math.max(utilItem.capacity, 1);
  const crowdLevel = classifyCrowdLevel(currentPct);
  const peakHours = utilItem.peak_hours ?? [];

  // ── Compute individual factors ──
  const timeFactor = computeTimeOfDayFactor(peakHours, currentHour);
  const recentTrend = computeRecentTrend(utilItem.time_series ?? []);
  const resFactors = computeReservationFactors(
    reservations,
    facilityId,
    capacity,
    currentHour,
    todayStr,
  );
  const seasonalFactor = computeSeasonalFactor(utilItem.facility_type, currentMonth);
  const forecastDelta = (utilItem.forecast_pct ?? 0) - currentPct;

  // ── Combine factors into predictions ──
  // Each prediction window weights factors differently:
  //   - 1h: short-term, dominated by recent trend + time-of-day + immediate reservations
  //   - 3h: medium-term, includes forecast and seasonal adjustments
  //   - peak: full-day view, includes all reservations and seasonal

  const predicted1h = clamp(
    currentPct
      + recentTrend * 1
      + timeFactor * 0.3
      + resFactors.in1h * 0.5,
    0,
    120,
  );

  const predicted3h = clamp(
    currentPct
      + recentTrend * 3
      + timeFactor * 0.5
      + resFactors.in3h * 0.4
      + forecastDelta * 0.2
      + seasonalFactor * 0.1,
    0,
    120,
  );

  const predictedPeak = clamp(
    Math.max(
      currentPct,
      predicted1h,
      predicted3h,
      currentPct + resFactors.peakToday * 0.6 + seasonalFactor * 0.2,
    ),
    0,
    120,
  );

  // ── Derived intelligence ──
  const peakTime = determinePeakTime(peakHours);
  const congestionRisk = computeCongestionRisk(
    currentPct,
    predicted1h,
    predicted3h,
    capacity,
  );
  const flowDirection = computeFlowDirection(
    currentPct,
    predicted1h,
    currentHour,
  );
  const factors = buildFactors(
    timeFactor,
    resFactors,
    seasonalFactor,
    forecastDelta,
  );
  const confidence = computeConfidence(
    (utilItem.time_series ?? []).length,
    (utilItem.forecast_pct ?? 0) > 0,
    utilItem.trend,
  );

  return {
    facility_id: facilityId,
    name: utilItem.name ?? "",
    current_pct: Math.round(currentPct),
    trend: utilItem.trend ?? "stable",
    current_crowd_level: crowdLevel,
    predicted_1h: Math.round(predicted1h),
    predicted_3h: Math.round(predicted3h),
    predicted_peak: Math.round(predictedPeak),
    peak_time: peakTime,
    confidence,
    flow_direction: flowDirection,
    congestion_risk: congestionRisk,
    factors,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F3b: predictAllOccupancy
//
// Batch prediction for all facilities.
// Handles missing utilization data gracefully — facilities
// without data get a default prediction with low confidence.
// Returns a record keyed by facility_id for O(1) lookups.
// ═══════════════════════════════════════════════════════════════

export function predictAllOccupancy(
  utilization: AmenityUtilizationResponse | null,
  reservations: FacilityReservation[],
  referenceDate?: Date,
): Record<string, OccupancyPrediction> {
  const result: Record<string, OccupancyPrediction> = {};

  if (!utilization) return result;

  for (const utilItem of utilization.facilities) {
    result[utilItem.facility_id] = predictOccupancy(
      utilItem,
      reservations,
      referenceDate,
    );
  }

  return result;
}