/**
 * src/features/sports/lib/arenaIntelligence.ts
 * ═══════════════════════════════════════════════════════════
 * §S2 — Arena Intelligence Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Arena Intelligence Engine provides real-time venue
 * monitoring, demand forecasting, weather-aware booking
 * optimization, and usage heatmapping.
 *
 * Functions:
 *   buildArenaStatus()            — Full per-venue status
 *   buildArenaStatusSafe()        — Degraded wrapper, never throws
 *   buildAllArenaStatuses()       — Batch for all venues
 *   forecastDemand()              — 24h demand prediction
 *   findOptimalBookingWindows()   — AI booking suggestions
 *   computeWeatherImpact()        — Weather impact on outdoor venues
 *   buildUsageHeatmap()           — Temporal usage density grid
 *
 * All functions are pure. No side effects. No mutations.
 *
 * Tier 1: Works with existing MCP data (analytics + calendar).
 * Tier 2: Enhanced when get_venue_live_status becomes available.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S2
 */

import type {
  ArenaStatus,
  DemandForecastPoint,
  BookingWindow,
  WeatherImpact,
  ActiveSession,
  HeatmapCell,
  BookingPreferences,
  Venue,
  SportSession,
  SportReservation,
  TrendDirection,
} from "../types";

import {
  VenueLiveStatus,
  CrowdLevel,
  SportType,
  CR_WEATHER_RISK,
  SPORT_CONFIG,
} from "../types";

import {
  ARENA_CONFIG,
  WEATHER_CONFIG,
  classifyCrowdLevel,
  classifyVenueStatus,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Default hourly rate per sport in CRC — used for revenue estimation */
const DEFAULT_HOURLY_RATE_CRC: Record<string, number> = {
  [SportType.TENNIS]: 15_000,
  [SportType.GOLF]: 25_000,
  [SportType.SWIMMING]: 8_000,
  [SportType.FITNESS]: 5_000,
  [SportType.BASKETBALL]: 12_000,
  [SportType.VOLLEYBALL]: 10_000,
  [SportType.FOOTBALL]: 15_000,
  [SportType.SQUASH]: 12_000,
  [SportType.PADEL]: 12_000,
  [SportType.YOGA]: 8_000,
  [SportType.PILATES]: 8_000,
};
/** Minimum data points for a reliable demand forecast */
const MIN_DATA_POINTS = ARENA_CONFIG.FORECAST_MIN_DATA_POINTS;

/** Forecast hours ahead */
const FORECAST_HOURS = ARENA_CONFIG.FORECAST_HOURS;

/** Confidence thresholds based on data point count per slot */
const CONFIDENCE_TIERS = [
  { minPoints: 10, confidence: 90 },
  { minPoints: 5,  confidence: 75 },
  { minPoints: 2,  confidence: 55 },
  { minPoints: 1,  confidence: 35 },
] as const;

/** Default confidence when no data exists for a slot */
const DEFAULT_CONFIDENCE = 15;

/** Hours of the day */
const HOURS_IN_DAY = 24;

/** Days of the week */
const DAYS_IN_WEEK = 7;

/** MS in one hour */
const MS_PER_HOUR = 3_600_000;

/** MS in one day */
const MS_PER_DAY = 86_400_000;

/** Default satisfaction when no session data has satisfaction scores */
const DEFAULT_SATISFACTION = 50;

/** Booking window: weights for quality score calculation */
const BOOKING_WEIGHTS = {
  availability: 0.40,
  weather: 0.30,
  preference: 0.20,
  balance: 0.10,
} as const;

// ═══════════════════════════════════════════════════════════
// §1 — buildArenaStatus
//
// Computes comprehensive per-venue status from session,
// reservation, and optional weather data.
// ═══════════════════════════════════════════════════════════

/**
 * Build complete ArenaStatus for a single venue.
 *
 * Algorithm:
 *   1. Determine current live status from real-time data or inference
 *   2. Find active sessions (currently in progress)
 *   3. Find next upcoming reservation
 *   4. Compute 24h demand forecast from historical patterns
 *   5. Find optimal booking windows from forecast
 *   6. Compute weather impact if outdoor
 *   7. Compute 7-day utilization + trend
 *   8. Estimate revenue per hour
 *   9. Compute satisfaction average
 *
 * @param venue — Target venue
 * @param sessions — All sessions (engine filters by venueId)
 * @param reservations — All reservations (engine filters by venueId)
 * @param options.realOccupancy — Real-time occupancy 0-100 (from Tier 2 MCP)
 * @param options.weatherFactor — Weather multiplier 0-1 for outdoor demand
 */
export function buildArenaStatus(
  venue: Venue,
  sessions: SportSession[],
  reservations: SportReservation[],
  options?: {
    realOccupancy?: number;
    weatherFactor?: number;
  },
): ArenaStatus {
  const now = Date.now();
  const venueSessions = sessions.filter((s) => s.venueId === venue.venueId);
  const venueReservations = reservations.filter(
    (r) => r.venueId === venue.venueId,
  );

  // ── 1. Current live status ──
  const activeSessions = getActiveSessions(venueSessions, now);
  const isUnderMaintenance = venue.status === VenueLiveStatus.MAINTENANCE;
  const hasActiveReservations = venueReservations.some(
    (r) => parseDate(`${r.date}T${r.startTime}`) > now && r.status === "confirmed",
  );

  // Use real occupancy if available, otherwise infer from active sessions
  const currentOccupancy = options?.realOccupancy != null
    ? clamp(options.realOccupancy, 0, 100)
    : venue.capacity > 0
      ? clamp(Math.round((activeSessions.length / venue.capacity) * 100), 0, 100)
      : 0;

  const currentStatus = classifyVenueStatus(
    currentOccupancy,
    isUnderMaintenance,
    hasActiveReservations,
  );
  const currentCrowdLevel = classifyCrowdLevel(currentOccupancy);

  // ── 2. Next reservation ──
  const nextReservation = getNextReservation(venueReservations, now);

  // ── 3. Minutes until available ──
  let minutesUntilAvailable: number | null = null;
  if (activeSessions.length > 0) {
    const latestEnd = activeSessions.reduce(
      (latest, s) => {
        const end = parseDate(s.estimatedEndTime);
        return end > latest ? end : latest;
      },
      0,
    );
    minutesUntilAvailable = Math.max(
      0,
      Math.round((latestEnd - now) / 60_000),
    );
  } else if (nextReservation) {
    const nextStart = parseDate(`${nextReservation.date}T${nextReservation.startTime}`);
    if (nextStart > now) {
      minutesUntilAvailable = 0; // Available now, next reservation is later
    }
  }

  // ── 4. Demand forecast ──
  const demandForecast = forecastDemand(
    venue.venueId,
    venueSessions,
    {
      hours: FORECAST_HOURS,
      weatherFactor: options?.weatherFactor,
      isOutdoor: venue.isOutdoor,
    },
  );

  // ── 5. Optimal booking windows ──
  const optimalBookingWindows = findOptimalBookingWindows(
    demandForecast,
    venue.isOutdoor,
  );

  // ── 6. Weather impact ──
  const weatherImpact = venue.isOutdoor
    ? computeWeatherImpactFromForecast(demandForecast, venue.venueId, venue.sport)
    : null;

  // ── 7. 7-day utilization + trend ──
  const utilization7d = computePeriodUtilization(venueSessions, venue.capacity, 7);
  const utilizationTrend = computeUtilizationTrend(venueSessions, venue.capacity);

  // ── 8. Revenue per hour ──
  const revenuePerHour = computeRevenuePerHour(venueSessions, venue.sport);

  // ── 9. Satisfaction average ──
  const satisfactionAvg = computeAverageSatisfaction(venueSessions);

  return {
    venueId: venue.venueId,
    venueName: venue.venueName,
    sport: venue.sport,
    currentStatus,
    currentOccupancy,
    currentCrowdLevel,
    activeSessions,
    nextReservation,
    minutesUntilAvailable,
    demandForecast,
    optimalBookingWindows,
    weatherImpact,
    utilization7d,
    utilizationTrend,
    revenuePerHour,
    satisfactionAvg,
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — buildArenaStatusSafe (DEGRADED WRAPPER)
// ═══════════════════════════════════════════════════════════

/**
 * Safe wrapper around buildArenaStatus.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildArenaStatusSafe(
  venue: Venue,
  sessions: SportSession[],
  reservations: SportReservation[],
  options?: {
    realOccupancy?: number;
    weatherFactor?: number;
  },
): ArenaStatus {
  try {
    return buildArenaStatus(
      venue,
      sessions ?? [],
      reservations ?? [],
      options,
    );
  } catch {
    return createMinimalArenaStatus(venue);
  }
}

/**
 * Build ArenaStatus for all venues in batch.
 */
export function buildAllArenaStatuses(
  venues: Venue[],
  sessions: SportSession[],
  reservations: SportReservation[],
  options?: {
    realOccupancies?: Record<string, number>;
    weatherFactor?: number;
  },
): Record<string, ArenaStatus> {
  const result: Record<string, ArenaStatus> = {};
  for (const venue of venues) {
    result[venue.venueId] = buildArenaStatusSafe(
      venue,
      sessions,
      reservations,
      {
        realOccupancy: options?.realOccupancies?.[venue.venueId],
        weatherFactor: options?.weatherFactor,
      },
    );
  }
  return result;
}

function createMinimalArenaStatus(venue: Venue): ArenaStatus {
  return {
    venueId: venue.venueId,
    venueName: venue.venueName,
    sport: venue.sport,
    currentStatus: VenueLiveStatus.IDLE,
    currentOccupancy: 0,
    currentCrowdLevel: CrowdLevel.LOW,
    activeSessions: [],
    nextReservation: null,
    minutesUntilAvailable: null,
    demandForecast: [],
    optimalBookingWindows: [],
    weatherImpact: null,
    utilization7d: 0,
    utilizationTrend: "stable" as TrendDirection,
    revenuePerHour: 0,
    satisfactionAvg: 0,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — forecastDemand
//
// Predicts hourly demand for the next N hours using
// historical session patterns with recency weighting.
// ═══════════════════════════════════════════════════════════

/**
 * Forecast demand for a venue over the next N hours.
 *
 * Algorithm:
 *   1. Group historical sessions by (dayOfWeek, hour) → demand pattern
 *   2. Weight recent sessions (last 30 days) 2× vs older
 *   3. For each forecast hour, look up pattern for that (day, hour)
 *   4. Normalize to 0-100 (relative to busiest slot)
 *   5. Apply weather factor for outdoor venues
 *   6. Confidence based on data point count per slot
 *
 * @param venueId — Target venue
 * @param sessions — Historical sessions for this venue
 * @param options.hours — Hours ahead to forecast (default 24)
 * @param options.weatherFactor — Outdoor weather multiplier 0-1
 * @param options.isOutdoor — Whether venue is outdoor
 */
export function forecastDemand(
  venueId: string,
  sessions: SportSession[],
  options?: {
    hours?: number;
    weatherFactor?: number;
    isOutdoor?: boolean;
  },
): DemandForecastPoint[] {
  const hours = options?.hours ?? FORECAST_HOURS;
  const venueSessions = sessions.filter((s) => s.venueId === venueId);

  // Insufficient data → flat neutral forecast
  if (venueSessions.length < MIN_DATA_POINTS) {
    return generateFlatForecast(hours, venueSessions.length);
  }

  // ── Build demand pattern ──
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * MS_PER_DAY;

  // Recent pattern (last 30 days) — weighted more heavily
  const recentPattern = new Map<string, number>();
  // Older pattern
  const olderPattern = new Map<string, number>();

  for (const session of venueSessions) {
    const ts = parseDate(session.startTime);
    if (ts <= 0) continue;

    const date = new Date(ts);
    const key = `${date.getDay()}-${date.getHours()}`;

    if (ts >= thirtyDaysAgo) {
      recentPattern.set(key, (recentPattern.get(key) ?? 0) + 2);
    } else {
      olderPattern.set(key, (olderPattern.get(key) ?? 0) + 1);
    }
  }

  // Merge patterns: recent × 2 + older × 1
  const mergedPattern = new Map<string, number>();
  const allKeys = new Set([...recentPattern.keys(), ...olderPattern.keys()]);
  for (const key of allKeys) {
    mergedPattern.set(
      key,
      (recentPattern.get(key) ?? 0) + (olderPattern.get(key) ?? 0),
    );
  }

  // Find max for normalization
  let maxCount = 0;
  for (const count of mergedPattern.values()) {
    if (count > maxCount) maxCount = count;
  }
  if (maxCount === 0) maxCount = 1;

  // ── Generate forecast ──
  const forecast: DemandForecastPoint[] = [];
  const isOutdoor = options?.isOutdoor ?? false;
  const weatherFactor = options?.weatherFactor;

  for (let h = 0; h < hours; h++) {
    const futureTime = new Date(now + h * MS_PER_HOUR);
    const dayOfWeek = futureTime.getDay();
    const hour = futureTime.getHours();
    const key = `${dayOfWeek}-${hour}`;

    const rawDemand = mergedPattern.get(key) ?? 0;
    const normalizedDemand = Math.round((rawDemand / maxCount) * 100);

    // Confidence from data points
    const confidence = computeSlotConfidence(rawDemand);

    // Weather adjustment for outdoor venues
    let adjustedDemand = normalizedDemand;
    if (isOutdoor && weatherFactor != null) {
      adjustedDemand = Math.round(normalizedDemand * weatherFactor);
    }

    forecast.push({
      hour: `${String(hour).padStart(2, "0")}:00`,
      predictedDemand: clamp(adjustedDemand, 0, 100),
      confidence,
      weatherFactor: isOutdoor ? (weatherFactor ?? 1.0) : undefined,
    });
  }

  return forecast;
}

/** Flat forecast for insufficient data */
function generateFlatForecast(
  hours: number,
  dataPoints: number,
): DemandForecastPoint[] {
  const baseDemand = 40;
  const confidence = dataPoints > 0 ? 25 : DEFAULT_CONFIDENCE;
  const forecast: DemandForecastPoint[] = [];

  for (let h = 0; h < hours; h++) {
    const futureTime = new Date(Date.now() + h * MS_PER_HOUR);
    const hour = futureTime.getHours();

    // Slight variation: mornings and evenings slightly busier
    let adjustment = 0;
    if (hour >= 6 && hour <= 9) adjustment = 10;
    else if (hour >= 17 && hour <= 20) adjustment = 15;
    else if (hour >= 12 && hour <= 14) adjustment = 5;
    else if (hour >= 22 || hour <= 5) adjustment = -15;

    forecast.push({
      hour: `${String(hour).padStart(2, "0")}:00`,
      predictedDemand: clamp(baseDemand + adjustment, 0, 100),
      confidence,
    });
  }

  return forecast;
}

/** Compute confidence from data point count for a time slot */
function computeSlotConfidence(dataPoints: number): number {
  for (const tier of CONFIDENCE_TIERS) {
    if (dataPoints >= tier.minPoints) return tier.confidence;
  }
  return DEFAULT_CONFIDENCE;
}

// ═══════════════════════════════════════════════════════════
// §4 — findOptimalBookingWindows
//
// Analyzes demand forecast to find the best times to book.
// ═══════════════════════════════════════════════════════════

/**
 * Find optimal booking windows from demand forecast.
 *
 * Algorithm:
 *   1. Slide a window of `durationHours` across the forecast
 *   2. For each window position, compute quality score:
 *      a. Availability: (100 - avg demand) × 0.40
 *      b. Weather: weather factor × 100 × 0.30 (outdoor only)
 *      c. Preference: +20 if in preferred hours
 *      d. Balance: +10 if in balanced hours (8am-8pm)
 *   3. Return top N windows sorted by quality
 *
 * @param demandForecast — From forecastDemand()
 * @param isOutdoor — Whether venue is outdoor
 * @param preferences — Optional member booking preferences
 * @param durationHours — Slot duration in hours (default 1)
 */
export function findOptimalBookingWindows(
  demandForecast: DemandForecastPoint[],
  isOutdoor: boolean,
  preferences?: BookingPreferences,
  durationHours: number = 1,
): BookingWindow[] {
  if (demandForecast.length < durationHours) return [];

  const windows: BookingWindow[] = [];
  const preferredTimes = new Set(preferences?.preferredTimes ?? []);

  for (let i = 0; i <= demandForecast.length - durationHours; i++) {
    const slice = demandForecast.slice(i, i + durationHours);

    // Average demand in this window
    const avgDemand = slice.reduce((s, p) => s + p.predictedDemand, 0) / slice.length;

    // Availability score: lower demand = higher quality
    const availabilityScore = 100 - avgDemand;

    // Weather score
    let weatherScore = 100;
    if (isOutdoor) {
      const avgWeatherFactor = slice.reduce(
        (s, p) => s + (p.weatherFactor ?? 1.0),
        0,
      ) / slice.length;
      weatherScore = Math.round(avgWeatherFactor * 100);
    }

    // Preference score: check if start hour matches preferred times
    let preferenceScore = 50; // neutral
    if (preferredTimes.size > 0) {
      const startHour = slice[0].hour;
      preferenceScore = preferredTimes.has(startHour) ? 100 : 20;
    }

    // Balance score: penalize very early (before 6am) or very late (after 10pm)
    const startHourNum = parseInt(slice[0].hour.split(":")[0], 10);
    let balanceScore = 80;
    if (startHourNum >= 8 && startHourNum <= 20) balanceScore = 100;
    else if (startHourNum >= 6 && startHourNum <= 22) balanceScore = 70;
    else balanceScore = 30;

    // Composite quality score
    const qualityScore = Math.round(
      availabilityScore * BOOKING_WEIGHTS.availability +
      weatherScore * BOOKING_WEIGHTS.weather +
      preferenceScore * BOOKING_WEIGHTS.preference +
      balanceScore * BOOKING_WEIGHTS.balance,
    );

    // Confidence from forecast points
    slice.reduce((s, p) => s + p.confidence, 0) / slice.length;

    // Generate reason
    const reason = generateBookingReason(
      avgDemand,
      weatherScore,
      isOutdoor,
      startHourNum,
    );

    const endHourNum = startHourNum + durationHours;

    windows.push({
      startTime: slice[0].hour,
      endTime: `${String(endHourNum % HOURS_IN_DAY).padStart(2, "0")}:00`,
      qualityScore: clamp(qualityScore, 0, 100),
      reason,
    });
  }

  // Sort by quality descending, return top 5
  windows.sort((a, b) => b.qualityScore - a.qualityScore);
  return windows.slice(0, 5);
}

function generateBookingReason(
  avgDemand: number,
  weatherScore: number,
  isOutdoor: boolean,
  hour: number,
): string {
  const parts: string[] = [];

  if (avgDemand < 30) {
    parts.push("Baja demanda esperada");
  } else if (avgDemand < 60) {
    parts.push("Demanda moderada");
  }

  if (isOutdoor && weatherScore >= 80) {
    parts.push("excelente clima");
  } else if (isOutdoor && weatherScore >= 50) {
    parts.push("clima aceptable");
  }

  if (hour >= 6 && hour <= 9) {
    parts.push("horario matutino ideal");
  } else if (hour >= 17 && hour <= 19) {
    parts.push("horario vespertino");
  }

  return parts.length > 0
    ? parts.join(" · ").replace(/^./, (c) => c.toUpperCase())
    : "Horario disponible";
}

// ═══════════════════════════════════════════════════════════
// §5 — computeWeatherImpact
//
// Analyzes weather conditions impact on outdoor venues.
// ═══════════════════════════════════════════════════════════

/**
 * Compute weather impact on outdoor venues.
 *
 * Algorithm:
 *   1. Filter outdoor-only venues (isOutdoor && !isIndoor)
 *   2. Get base risk from CR_WEATHER_RISK by current month
 *   3. Adjust severity if specific weather data is available
 *   4. Identify affected sports (all outdoor sports at these venues)
 *   5. Generate recommendation + reschedule suggestion
 *
 * @param venues — All venues
 * @param month — Month 1-12 (default: current month)
 * @param weatherData — Optional specific weather conditions
 * @returns WeatherImpact or null if no outdoor venues
 */
export function computeWeatherImpact(
  venues: Venue[],
  month?: number,
  weatherData?: {
    condition: string;
    temperature?: number;
    windSpeed?: number;
  },
): WeatherImpact | null {
  const outdoorVenues = venues.filter((v) => v.isOutdoor && !v.isIndoor);
  if (outdoorVenues.length === 0) return null;

  const currentMonth = month ?? new Date().getMonth() + 1;
  const monthRisk = CR_WEATHER_RISK[currentMonth];

  // Base severity from CR weather calendar
  let severity: number;
  let condition: string;

  if (weatherData) {
    // Use specific weather data
    condition = weatherData.condition;
    severity = computeWeatherSeverity(
      weatherData.condition,
      weatherData.temperature,
      weatherData.windSpeed,
    );
  } else {
    // Derive from month risk
    condition = monthRisk?.label ?? "Desconocido";
    severity = monthRisk?.level === "high"
      ? 70
      : monthRisk?.level === "medium"
        ? 40
        : 10;
  }

  // Affected sports
  const affectedSports = [...new Set(outdoorVenues.map((v) => v.sport))];

  // Recommendation
  const recommendation = generateWeatherRecommendation(
    condition,
    severity,
    affectedSports,
  );

  // Reschedule suggestion
  let optimalReschedule: string | undefined;
  if (severity > 50) {
    const indoorAlternatives = venues.filter((v) => v.isIndoor && !v.isOutdoor);
    if (indoorAlternatives.length > 0) {
      const indoorSports = indoorAlternatives.map(
        (v) => SPORT_CONFIG[v.sport]?.label ?? v.sport,
      );
      optimalReschedule = `Considerar alternativas indoor: ${indoorSports.join(", ")}`;
    }
  }

  return {
    condition,
    severity: clamp(severity, 0, 100),
    affectedSports,
    recommendation,
    optimalReschedule,
  };
}

function computeWeatherSeverity(
  condition: string,
  temperature?: number,
  windSpeed?: number,
): number {
  // Base severity from condition
  const normalizedCondition = condition.toLowerCase().replace(/\s+/g, "_");
  const impactMultiplier = WEATHER_CONFIG.IMPACT_MULTIPLIERS[normalizedCondition] ?? 0.8;
  let severity = Math.round((1 - impactMultiplier) * 100);

  // Temperature adjustment
  if (temperature != null) {
    if (temperature > WEATHER_CONFIG.TEMP_HOT_THRESHOLD) {
      severity = Math.min(100, severity + 20);
    } else if (temperature < WEATHER_CONFIG.TEMP_COLD_THRESHOLD) {
      severity = Math.min(100, severity + 10);
    }
  }

  // Wind adjustment
  if (windSpeed != null && windSpeed > WEATHER_CONFIG.WIND_MAX_ACCEPTABLE) {
    severity = Math.min(100, severity + 15);
  }

  return clamp(severity, 0, 100);
}

function generateWeatherRecommendation(
  condition: string,
  severity: number,
  affectedSports: SportType[],
): string {
  if (severity < 20) {
    return "Condiciones excelentes para actividades al aire libre";
  }
  if (severity < 40) {
    return "Condiciones aceptables. Mantener monitoreo meteorológico";
  }
  if (severity < 60) {
    const sportLabels = affectedSports
      .slice(0, 3)
      .map((s) => SPORT_CONFIG[s]?.label ?? s);
    return `Condiciones moderadas. ${sportLabels.join(", ")} pueden verse afectados`;
  }
  if (severity < 80) {
    return `Condiciones adversas (${condition}). Recomendar alternativas indoor o reprogramar`;
  }
  return `Condiciones peligrosas (${condition}). Suspender actividades outdoor inmediatamente`;
}

function computeWeatherImpactFromForecast(
  forecast: DemandForecastPoint[],
  _venueId: string,
  sport: SportType,
): WeatherImpact | null {
  if (forecast.length === 0) return null;

  const avgWeatherFactor = forecast.reduce(
    (s, p) => s + (p.weatherFactor ?? 1.0),
    0,
  ) / forecast.length;

  if (avgWeatherFactor >= 0.95) return null; // No significant impact

  const severity = Math.round((1 - avgWeatherFactor) * 100);
  const month = new Date().getMonth() + 1;
  const monthRisk = CR_WEATHER_RISK[month];
  const condition = monthRisk?.label ?? "Variable";

  return {
    condition,
    severity: clamp(severity, 0, 100),
    affectedSports: [sport],
    recommendation: generateWeatherRecommendation(condition, severity, [sport]),
    optimalReschedule: severity > 50
      ? "Buscar horario con mejor pronóstico o alternativa indoor"
      : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
// §6 — buildUsageHeatmap
//
// Generates a 7×24 grid of usage density for a venue.
// ═══════════════════════════════════════════════════════════

/**
 * Build usage heatmap for a venue.
 *
 * Algorithm:
 *   1. Filter sessions for venue and time period
 *   2. Group by (dayOfWeek, hour) → count
 *   3. Normalize to 0-100 (relative to busiest cell)
 *   4. Return flat array of 168 cells
 *
 * @param venueId — Target venue
 * @param sessions — Historical sessions
 * @param period — "week" (last 7 days) or "month" (last 30 days)
 */
export function buildUsageHeatmap(
  venueId: string,
  sessions: SportSession[],
  period: "week" | "month" = "week",
): HeatmapCell[] {
  const now = Date.now();
  const periodMs = period === "week" ? 7 * MS_PER_DAY : 30 * MS_PER_DAY;

  const venueSessions = sessions.filter((s) => {
    if (s.venueId !== venueId) return false;
    const ts = parseDate(s.startTime);
    return ts > 0 && now - ts <= periodMs;
  });

  // Count sessions per (day, hour)
  const counts = new Map<string, number>();
  for (const session of venueSessions) {
    const date = new Date(parseDate(session.startTime));
    const key = `${date.getDay()}-${date.getHours()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Find max for normalization
  let maxCount = 0;
  for (const count of counts.values()) {
    if (count > maxCount) maxCount = count;
  }
  if (maxCount === 0) maxCount = 1;

  // Generate all 168 cells
  const cells: HeatmapCell[] = [];
  const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    for (let hour = 0; hour < HOURS_IN_DAY; hour++) {
      const key = `${day}-${hour}`;
      const count = counts.get(key) ?? 0;
      const value = Math.round((count / maxCount) * 100);

      cells.push({
        day,
        hour,
        value,
        label: `${dayLabels[day]} ${String(hour).padStart(2, "0")}:00 — ${count} sesión(es)`,
      });
    }
  }

  return cells;
}

// ═══════════════════════════════════════════════════════════
// §7 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

/** Clamp a number to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Parse date string to timestamp (ms). Returns 0 on invalid. */
function parseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

/** Get active sessions (currently in progress) */
function getActiveSessions(
  sessions: SportSession[],
  now: number,
): ActiveSession[] {
  return sessions
    .filter((s) => {
      const start = parseDate(s.startTime);
      const end = parseDate(s.endTime) || start + s.durationMinutes * 60_000;
      return start > 0 && start <= now && end > now;
    })
    .map((s) => {
      const start = parseDate(s.startTime);
      const end = parseDate(s.endTime) || start + s.durationMinutes * 60_000;
      return {
        sessionId: s.sessionId,
        memberId: s.memberId,
        memberName: s.memberName,
        sport: s.sport,
        startTime: s.startTime,
        minutesElapsed: Math.round((now - start) / 60_000),
        estimatedEndTime: s.endTime ?? new Date(end).toISOString(),
        companionCount: s.companions?.length ?? 0,
      };
    });
}

/** Get next upcoming confirmed reservation */
function getNextReservation(
  reservations: SportReservation[],
  now: number,
): SportReservation | null {
  const upcoming = reservations
    .filter((r) => {
      const start = parseDate(`${r.date}T${r.startTime}`);
      return start > now && r.status === "confirmed";
    })
    .sort(
      (a, b) =>
        parseDate(`${a.date}T${a.startTime}`) -
        parseDate(`${b.date}T${b.startTime}`),
    );

  return upcoming.length > 0 ? upcoming[0] : null;
}

/** Compute average utilization over N days for a venue */
function computePeriodUtilization(
  sessions: SportSession[],
  capacity: number,
  days: number,
): number {
  if (capacity <= 0 || sessions.length === 0) return 0;

  const now = Date.now();
  const periodStart = now - days * MS_PER_DAY;

  const periodSessions = sessions.filter((s) => {
    const ts = parseDate(s.startTime);
    return ts > periodStart && ts <= now;
  });

  if (periodSessions.length === 0) return 0;

  // Unique hours with at least one session
  const activeHours = new Set<string>();
  for (const s of periodSessions) {
    const date = new Date(parseDate(s.startTime));
    activeHours.add(`${date.getDay()}-${date.getHours()}`);
  }

  // Total possible hours in the period (days × 16 active hours: 6am-10pm)
  const ACTIVE_HOURS_PER_DAY = 16;
  const totalPossibleSlots = days * ACTIVE_HOURS_PER_DAY;

  return clamp(
    Math.round((activeHours.size / Math.max(1, totalPossibleSlots)) * 100),
    0,
    100,
  );
}

/** Compute utilization trend: this week vs last week */
function computeUtilizationTrend(
  sessions: SportSession[],
  capacity: number,
): TrendDirection {
  if (capacity <= 0 || sessions.length === 0) {
    return "stable" as TrendDirection;
  }

  const now = Date.now();
  const thisWeekStart = now - 7 * MS_PER_DAY;
  const lastWeekStart = now - 14 * MS_PER_DAY;

  const thisWeekSessions = sessions.filter((s) => {
    const ts = parseDate(s.startTime);
    return ts > thisWeekStart && ts <= now;
  });

  const lastWeekSessions = sessions.filter((s) => {
    const ts = parseDate(s.startTime);
    return ts > lastWeekStart && ts <= thisWeekStart;
  });

  if (lastWeekSessions.length === 0) {
    return thisWeekSessions.length > 0
      ? ("improving" as TrendDirection)
      : ("stable" as TrendDirection);
  }

  const thisWeekUtil = thisWeekSessions.length / Math.max(1, capacity);
  const lastWeekUtil = lastWeekSessions.length / Math.max(1, capacity);

  if (thisWeekUtil > lastWeekUtil * 1.05) return "improving" as TrendDirection;
  if (thisWeekUtil < lastWeekUtil * 0.95) return "declining" as TrendDirection;
  return "stable" as TrendDirection;
}

/** Estimate revenue per hour from historical sessions */
function computeRevenuePerHour(
  sessions: SportSession[],
  sport: SportType,
): number {
  const hourlyRate = DEFAULT_HOURLY_RATE_CRC[sport] ?? 10_000;

  if (sessions.length === 0) return 0;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * MS_PER_DAY;

  const recentSessions = sessions.filter((s) => {
    const ts = parseDate(s.startTime);
    return ts > thirtyDaysAgo && ts <= now;
  });

  if (recentSessions.length === 0) return 0;

  const totalRevenue = recentSessions.reduce(
    (sum, s) => sum + (s.durationMinutes / 60) * hourlyRate,
    0,
  );

  // Average revenue per active hour
  const activeHours = new Set<string>();
  for (const s of recentSessions) {
    const date = new Date(parseDate(s.startTime));
    activeHours.add(`${date.toISOString().split("T")[0]}-${date.getHours()}`);
  }

  return activeHours.size > 0
    ? Math.round(totalRevenue / activeHours.size)
    : 0;
}

/** Compute average satisfaction from sessions with satisfaction data */
function computeAverageSatisfaction(sessions: SportSession[]): number {
  const withSatisfaction = sessions.filter(
    (s) => s.satisfaction != null && s.satisfaction > 0,
  );

  if (withSatisfaction.length === 0) return DEFAULT_SATISFACTION;

  const total = withSatisfaction.reduce((s, ses) => s + ses.satisfaction!, 0);
  return Math.round(total / withSatisfaction.length);
}