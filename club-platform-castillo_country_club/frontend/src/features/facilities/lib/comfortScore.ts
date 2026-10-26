// src/features/facilities/lib/comfortScore.ts
// ═══════════════════════════════════════════════════════════════
// COMFORT INTELLIGENCE ENGINE — "5 Dimensions + The Invisible 6th"
//
// §F5: computeComfortScore / computeAllComfortScores
// PROP 12: computePsychologicalComfort / computeEnhancedComfort
//
// Comfort is NOT "is the temperature OK?" It's 5 simultaneous
// technical dimensions that interact, PLUS a 6th psychological
// dimension that sensors can NEVER measure:
//   What the sensor reads ≠ What the member feels.
//
// The system detects the PERCEPTION GAP and acts on it.
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityType,
  TrendDirection,
  AmenityUtilizationItem,
  AmenityUtilizationResponse,
  ComfortScore,
  ComfortDimension,
  ComfortStatus,
  EnhancedComfortScore,
  PsychologicalComfort,
  PsychologicalDimension,
} from "../types";
import {
  FACILITY_TYPE_CONFIG,
  COMFORT_THRESHOLDS,
} from "../config";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map a raw value to a 0-100 score relative to a target and tolerance.
 * Score is 100 at target, degrades as value moves away from target.
 * Uses quadratic decay for a more natural feel.
 */
function distanceScore(
  value: number,
  target: number,
  maxDeviation: number,
): number {
  if (maxDeviation <= 0) return 50;
  const deviation = Math.abs(value - target);
  const normalized = Math.min(deviation / maxDeviation, 1);
  return Math.round(100 * (1 - normalized * normalized));
}

/**
 * Classify a 0-100 comfort dimension score into status.
 */
function classifyDimensionStatus(score: number): ComfortStatus {
  if (score >= 80) return "optimal";
  if (score >= 60) return "acceptable";
  if (score >= 40) return "suboptimal";
  return "poor";
}

/**
 * Build a recommendation string when a dimension is suboptimal.
 */
function buildRecommendation(
  dimension: string,
  currentValue: number,
  targetValue: number,
  unit: string,
  isAbove: boolean,
): string {
  const diff = Math.abs(Math.round(currentValue - targetValue));
  const direction = isAbove ? "bajar" : "subir";
  return `${dimension}: ${direction} ${diff}${unit} para alcanzar el óptimo de ${targetValue}${unit}.`;
}

/**
 * Detect trend from consecutive comfort scores.
 * Compares the most recent score against the weighted average of previous.
 */
function detectTrend(
  current: number,
  historical: number[],
): TrendDirection {
  if (historical.length === 0) return "stable";

  // Exponential weighted average of historical (more recent = more weight)
  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < historical.length; i++) {
    const weight = Math.exp(-i * 0.3);
    weightedSum += historical[i] * weight;
    weightSum += weight;
  }
  const avg = weightSum > 0 ? weightedSum / weightSum : current;

  const delta = current - avg;
  if (delta > 4) return "improving";
  if (delta < -4) return "declining";
  return "stable";
}

/**
 * Derive intervention urgency from overall comfort score
 * and the worst-performing dimension.
 */
function deriveUrgency(
  overall: number,
  worstDimension: number,
): ComfortScore["intervention_urgency"] {
  if (overall < 35 || worstDimension < 25) return "critical";
  if (overall < 50 || worstDimension < 40) return "high";
  if (overall < 65 || worstDimension < 55) return "medium";
  return "low";
}

/**
 * Build intervention recommendation based on primary deficiency.
 */
function buildInterventionRecommendation(
  dimensions: ComfortScore["dimensions"],
): string {
  const entries = Object.entries(dimensions) as Array<
    [keyof ComfortScore["dimensions"], ComfortDimension]
  >;

  // Find the worst performing dimension
  const sorted = [...entries].sort(
    (a, b) => a[1].value - b[1].value,
  );

  const [worstKey, worstDim] = sorted[0];

  if (worstDim.status === "optimal") {
    return "Todos los indicadores de confort dentro de rango óptimo.";
  }

  const labelMap: Record<string, string> = {
    temperature: "Temperatura",
    lighting: "Iluminación",
    noise: "Ruido",
    air_quality: "Calidad de aire",
    crowding: "Aglomeración",
  };

  const label = labelMap[worstKey] ?? worstKey;

  if (worstDim.status === "poor") {
    return `${label} en estado crítico (${worstDim.value}/100). ${worstDim.recommendation ?? "Intervención inmediata requerida."}`;
  }

  return `${label} necesita atención (${worstDim.value}/100). ${worstDim.recommendation ?? ""}`.trim();
}

// ═══════════════════════════════════════════════════════════════
// SENSOR DATA SIMULATION
//
// In production, these come from IoT sensors via MCP.
// For now, we simulate realistic values based on:
//   - Facility type (different spaces have different baselines)
//   - Current occupancy (crowding affects temperature, CO2, noise)
//   - Time of day (daylight affects lighting needs)
//   - Capacity utilization
//
// Each function returns a RAW MEASUREMENT (not a score).
// ═══════════════════════════════════════════════════════════════

/**
 * Simulate temperature based on facility type and occupancy.
 * Higher occupancy → more body heat → temperature rises.
 * Outdoor facilities (pool, garden, golf) follow ambient.
 */
function simulateTemperature(
  facilityType: FacilityType,
  occupancyPct: number,
): number {
  const thresholds = COMFORT_THRESHOLDS.TEMPERATURE;
  const baseTemp = thresholds.OPTIMAL; // 21°C

  // Indoor heat gain from occupancy
  // At 0% occupancy: base temp. At 100%: +3°C from body heat.
  const occupancyGain = (occupancyPct / 100) * 3;

  // Type adjustments
  const typeAdjustment: Record<string, number> = {
    gym: 2,           // exercise generates heat
    spa: 1.5,         // warm environment intentional
    pool: -1,         // evaporative cooling near water
    garden: 3,        // outdoor, hotter during day
    golf_course: 3,
    tennis_court: 2,
    parking: 4,       // asphalt heat island
    restaurant: 0.5,  // kitchen heat
    lounge: -0.5,     // climate-controlled
    ballroom: 0.5,
  };

  return Math.round(
    (baseTemp + occupancyGain + (typeAdjustment[facilityType] ?? 0)) * 10,
  ) / 10;
}

/**
 * Simulate lighting based on facility type and time of day.
 * Returns lux level.
 */
function simulateLighting(
  facilityType: FacilityType,
  currentHour: number,
): number {
  // Indoor baseline by type
  const typeBaseline: Record<string, number> = {
    gym: 500,
    restaurant: 300,
    lounge: 150,
    ballroom: 350,
    spa: 120,
    kids_area: 400,
    playground: 600, // outdoor
  };

  const baseline = typeBaseline[facilityType] ?? 300;

  // Outdoor facilities get natural light variation
  const isOutdoor = ["pool", "garden", "golf_course", "tennis_court", "playground", "parking"].includes(facilityType);
  if (isOutdoor) {
    // Natural light: dawn(6) → peak(12) → dusk(18)
    if (currentHour < 6 || currentHour > 19) return 20; // dark
    const midday = 12;
    const distFromMidday = Math.abs(currentHour - midday);
    const naturalMultiplier = Math.max(0.1, 1 - (distFromMidday / 7));
    return Math.round(baseline * naturalMultiplier * 1.5);
  }

  // Indoor: mostly stable, slight dimming at night
  const nightDim = currentHour >= 20 || currentHour < 7 ? 0.7 : 1;
  return Math.round(baseline * nightDim);
}

/**
 * Simulate noise level based on facility type and occupancy.
 * More people = more noise. Some types are inherently louder.
 */
function simulateNoise(
  facilityType: FacilityType,
  occupancyPct: number,
): number {
  const typeBaseline: Record<string, number> = {
    spa: 25,
    garden: 35,
    lounge: 38,
    restaurant: 42,
    golf_course: 30,
    ballroom: 40,
    pool: 50,
    gym: 55,
    tennis_court: 45,
    squash_court: 50,
    kids_area: 55,
    playground: 58,
    parking: 40,
  };

  const baseline = typeBaseline[facilityType] ?? 40;

  // Occupancy contribution: 0% = baseline, 100% = +20dB
  const occupancyContribution = (occupancyPct / 100) * 20;

  return Math.round(baseline + occupancyContribution);
}

/**
 * Simulate CO2 level (air quality proxy).
 * Base outdoor CO2: ~420ppm. Indoor adds ~500ppm at 100% occupancy.
 * Ventilation effectiveness varies by facility type.
 */
function simulateCO2(
  facilityType: FacilityType,
  occupancyPct: number,
): number {
  const outdoorBase = 420;

  // Ventilation effectiveness: higher = better air exchange
  const ventilationRating: Record<string, number> = {
    garden: 1.0,         // fully outdoor
    golf_course: 1.0,
    pool: 0.8,           // semi-outdoor
    tennis_court: 0.9,
    playground: 0.9,
    parking: 0.85,
    gym: 0.6,            // needs strong HVAC
    ballroom: 0.5,       // big space, variable HVAC
    restaurant: 0.55,
    lounge: 0.65,
    spa: 0.6,
    kids_area: 0.7,
    squash_court: 0.4,   // small enclosed room
  };

  const ventEffectiveness = ventilationRating[facilityType] ?? 0.6;

  // CO2 contribution from occupants (500ppm at 100% occupancy)
  const occupantContribution = (occupancyPct / 100) * 500;

  // Effective CO2 = base + (contribution * (1 - ventilation effectiveness))
  const effectiveCO2 =
    outdoorBase + occupantContribution * (1 - ventEffectiveness * 0.8);

  return Math.round(effectiveCO2);
}

// ═══════════════════════════════════════════════════════════════
// §F5: DIMENSION COMPUTERS
//
// Each takes a raw sensor value and returns a ComfortDimension
// with: value (0-100 score), target, unit, status, recommendation.
// ═══════════════════════════════════════════════════════════════

function computeTemperatureDimension(
  rawCelsius: number,
): ComfortDimension {
  const t = COMFORT_THRESHOLDS.TEMPERATURE;
  const score = distanceScore(rawCelsius, t.OPTIMAL, t.TOLERANCE * 5);
  const status = classifyDimensionStatus(score);

  const recommendation =
    status === "suboptimal" || status === "poor"
      ? buildRecommendation(
          "Temperatura",
          rawCelsius,
          t.OPTIMAL,
          "°C",
          rawCelsius > t.OPTIMAL,
        )
      : undefined;

  return {
    value: score,
    target: t.OPTIMAL,
    unit: "°C",
    status,
    recommendation,
    // New fields required by ComfortDimension type
    gap: Math.round((rawCelsius - t.OPTIMAL) * 10) / 10,
    score,
    sensor: `${rawCelsius}°C`,
    perception: status === "optimal" ? "bien" : "mal",
  };
}

function computeLightingDimension(
  rawLux: number,
): ComfortDimension {
  const l = COMFORT_THRESHOLDS.LIGHTING;
  const targetLux = l.NATURAL; // 400 lux as general target
  const maxDeviation = 350;
  const score = distanceScore(rawLux, targetLux, maxDeviation);
  const status = classifyDimensionStatus(score);

  const recommendation =
    status === "suboptimal" || status === "poor"
      ? buildRecommendation(
          "Iluminación",
          rawLux,
          targetLux,
          " lux",
          rawLux > targetLux,
        )
      : undefined;

  return {
    value: score,
    target: targetLux,
    unit: " lux",
    status,
    recommendation,
    gap: Math.round((rawLux - targetLux) * 10) / 10,
    score,
    sensor: `${rawLux} lux`,
    perception: status === "optimal" ? "adecuada" : "insuficiente",
  };
}

function computeNoiseDimension(
  rawDb: number,
  facilityType: FacilityType,
): ComfortDimension {
  const n = COMFORT_THRESHOLDS.NOISE;
  // Target depends on facility purpose
  const quietTypes: FacilityType[] = ["spa", "garden", "golf_course"];
  const socialTypes: FacilityType[] = ["restaurant", "lounge", "ballroom"];
  const activeTypes: FacilityType[] = ["gym", "pool", "playground", "kids_area"];

  let targetDb: number;
  if (quietTypes.includes(facilityType)) {
    targetDb = n.INTIMATE;
  } else if (socialTypes.includes(facilityType)) {
    targetDb = n.CONVERSATIONAL;
  } else if (activeTypes.includes(facilityType)) {
    targetDb = n.SOCIAL;
  } else {
    targetDb = n.CONVERSATIONAL;
  }

  // Noise is only a problem when ABOVE target (not below)
  const deviation = rawDb - targetDb;
  const maxDeviation = 30;
  const score =
    deviation <= 0
      ? clamp(100 + deviation * 0.5, 80, 100) // below target = fine, slight bonus
      : distanceScore(rawDb, targetDb, maxDeviation);

  const status = classifyDimensionStatus(score);

  const recommendation =
    status === "suboptimal" || status === "poor"
      ? `Ruido a ${rawDb}dB excede el óptimo de ${targetDb}dB para ${facilityType}. Considerar reducir volumen o reubicar actividad.`
      : undefined;

  return {
    value: score,
    target: targetDb,
    unit: "dB",
    status,
    recommendation,
    gap: Math.round((rawDb - targetDb) * 10) / 10,
    score,
    sensor: `${rawDb}dB`,
    perception: status === "optimal" ? "silencioso" : "ruidoso",
  };
}

function computeAirQualityDimension(
  rawCO2: number,
): ComfortDimension {
  const a = COMFORT_THRESHOLDS.CO2;
  // CO2: lower is better. Target = EXCELLENT (600ppm)
  // Score degrades as CO2 rises above 600
  const score = rawCO2 <= a.EXCELLENT
    ? 100
    : rawCO2 <= a.GOOD
      ? distanceScore(rawCO2, a.EXCELLENT, a.GOOD - a.EXCELLENT + 200)
      : rawCO2 <= a.ACCEPTABLE
        ? distanceScore(rawCO2, a.GOOD, a.ACCEPTABLE - a.GOOD + 200)
        : distanceScore(rawCO2, a.ACCEPTABLE, a.POOR - a.ACCEPTABLE + 300);

  const status = classifyDimensionStatus(score);

  const recommendation =
    status === "suboptimal" || status === "poor"
      ? `CO2 a ${rawCO2}ppm (óptimo: <${a.GOOD}ppm). Abrir ventilación suplementaria o reducir capacidad.`
      : undefined;

  return {
    value: clamp(score, 0, 100),
    target: a.GOOD,
    unit: "ppm",
    status,
    recommendation,
    gap: Math.round((rawCO2 - a.GOOD) * 10) / 10,
    score: clamp(score, 0, 100),
    sensor: `${rawCO2}ppm`,
    perception: status === "optimal" ? "buena" : "mala",
  };
}

function computeCrowdingDimension(
  occupancyPct: number,
): ComfortDimension {
  // Sweet spot: 40-65% occupancy for most spaces
  const sweetSpotMin = 40;
  const sweetSpotMax = 65;
  const sweetSpotCenter = (sweetSpotMin + sweetSpotMax) / 2;

  let score: number;
  if (occupancyPct >= sweetSpotMin && occupancyPct <= sweetSpotMax) {
    // In the sweet spot
    score = 90 + Math.round(10 * (1 - Math.abs(occupancyPct - sweetSpotCenter) / 15));
  } else if (occupancyPct < sweetSpotMin) {
    // Too empty — feels abandoned
    score = distanceScore(occupancyPct, sweetSpotMin, 40);
  } else {
    // Too crowded — uncomfortable
    score = distanceScore(occupancyPct, sweetSpotCenter, 40);
  }

  const status = classifyDimensionStatus(score);

  const recommendation =
    status === "suboptimal" || status === "poor"
      ? occupancyPct > sweetSpotMax
        ? `Ocupación al ${Math.round(occupancyPct)}% excede el sweet spot (${sweetSpotMin}-${sweetSpotMax}%). Redistribuir hacia espacios alternativos.`
        : `Ocupación al ${Math.round(occupancyPct)}% por debajo del sweet spot. Considerar incentivar uso o consolidar actividades.`
      : undefined;

  return {
    value: clamp(score, 0, 100),
    target: sweetSpotCenter,
    unit: "%",
    status,
    recommendation,
    gap: Math.round((occupancyPct - sweetSpotCenter) * 10) / 10,
    score: clamp(score, 0, 100),
    sensor: `${Math.round(occupancyPct)}%`,
    perception: status === "optimal" ? "adecuada" : "no adecuada",
  };
}

// ═══════════════════════════════════════════════════════════════
// §F5: computeComfortScore
//
// "Comfort is NOT 'is the temperature OK?' It's 5 simultaneous
//  technical dimensions that interact."
//
// Weighted average with PER-FACILITY-TYPE weights.
// A gym cares more about temperature and noise.
// A restaurant cares more about lighting and crowding.
// The config defines these weights per type.
// ═══════════════════════════════════════════════════════════════

export function computeComfortScore(
  facility: Facility,
  utilItem: AmenityUtilizationItem | null,
  historicalScores?: number[],
  referenceDate?: Date,
): ComfortScore {
  const now = referenceDate ?? new Date();
  const currentHour = now.getHours();
  const facilityType = facility.facility_type;
  const occupancyPct = utilItem?.utilization_pct ?? 30;

  // ── Simulate sensor readings ──
  const tempRaw = simulateTemperature(facilityType, occupancyPct);
  const lightRaw = simulateLighting(facilityType, currentHour);
  const noiseRaw = simulateNoise(facilityType, occupancyPct);
  const co2Raw = simulateCO2(facilityType, occupancyPct);

  // ── Compute each dimension ──
  const temperature = computeTemperatureDimension(tempRaw);
  const lighting = computeLightingDimension(lightRaw);
  const noise = computeNoiseDimension(noiseRaw, facilityType);
  const air_quality = computeAirQualityDimension(co2Raw);
  const crowding = computeCrowdingDimension(occupancyPct);

  const dimensions = {
    temperature,
    lighting,
    noise,
    air_quality,
    crowding,
  };

  // ── Weighted average using facility-type-specific weights ──
  const typeConfig = FACILITY_TYPE_CONFIG[facilityType];
  const weights = typeConfig?.comfort_weight ?? COMFORT_THRESHOLDS.DEFAULT_WEIGHTS;

  const overall = Math.round(
    temperature.value * weights.temperature +
    lighting.value * weights.lighting +
    noise.value * weights.noise +
    air_quality.value * weights.air_quality +
    crowding.value * weights.crowding,
  );

  // ── Trend detection ──
  const trend = detectTrend(overall, historicalScores ?? []);

  // ── Intervention analysis ──
  const intervention_needed =
    overall < COMFORT_THRESHOLDS.ACCEPTABLE ||
    Object.values(dimensions).some((d) => d.status === "poor");

  const worstDim = Math.min(
    temperature.value,
    lighting.value,
    noise.value,
    air_quality.value,
    crowding.value,
  );

  const intervention_urgency = deriveUrgency(overall, worstDim);
  const intervention_recommendation = buildInterventionRecommendation(dimensions);

  // Determine dominant deficiency (worst-performing dimension key)
  const entries = Object.entries(dimensions) as Array<
    [keyof typeof dimensions, ComfortDimension]
  >;
  const sorted = [...entries].sort((a, b) => a[1].value - b[1].value);
  const [dominantKey, dominantDim] = sorted[0];

  const factors = entries.map(([k, v]) => `${k}: ${v.value}/100 (${v.status})`);

  const score: ComfortScore = {
    facility_id: facility.id,
    overall,
    dimensions,
    trend,
    intervention_needed,
    intervention_urgency,
    intervention_recommendation,
    factors,
    dominant_deficiency: String(dominantKey),
    narrative: `${String(dominantKey)}: ${dominantDim.value}/100 (${dominantDim.status}). ${intervention_recommendation}`,
  };

  return score;
}

// ═══════════════════════════════════════════════════════════════
// PROP 12: PSYCHOLOGICAL COMFORT — The Invisible 6th Dimension
//
// "The sensors say 21°C, 400 lux, 42dB — perfect.
//  But the member feels claustrophobic in a room with
//  3m ceilings, dark walls, and tight seating."
//
// Psychological comfort CANNOT be measured by sensors.
// It's inferred from facility characteristics:
//   - Physical attributes (ceiling height, wall color, layout)
//   - Amenity richness (options available to the member)
//   - Prestige signals (price point, exclusivity markers)
//   - Historical satisfaction data
//
// The PERCEPTION GAP between technical and psychological
// comfort is the most valuable signal in the system.
// ═══════════════════════════════════════════════════════════════

/**
 * Perceived space: does the facility feel large or cramped?
 * Inferred from: capacity, amenity count, facility type.
 * A 200-capacity ballroom with no dividers feels vast.
 * A 40-capacity meeting room with heavy furniture feels tight.
 */
function computePerceivedSpace(
  facility: Facility,
  occupancyPct: number,
): PsychologicalDimension {
  const typeConfig = FACILITY_TYPE_CONFIG[facility.facility_type];
  const areaSqm = typeConfig.default_area_sqm;
  const capacity = facility.capacity;

  // Space per person: sqm / effective occupancy
  const effectiveOccupancy = Math.max(1, (occupancyPct / 100) * capacity);
  const sqmPerPerson = areaSqm / effectiveOccupancy;

  // Thresholds for "feels spacious"
  const spaciousThreshold = 8;   // > 8 sqm/person = very spacious
  const tightThreshold = 3;      // < 3 sqm/person = cramped

  let value: number;
  if (sqmPerPerson >= spaciousThreshold) {
    value = clamp(80 + (sqmPerPerson - spaciousThreshold) * 2, 80, 100);
  } else if (sqmPerPerson >= tightThreshold) {
    value = clamp(40 + ((sqmPerPerson - tightThreshold) / (spaciousThreshold - tightThreshold)) * 40, 40, 80);
  } else {
    value = clamp(15 + (sqmPerPerson / tightThreshold) * 25, 15, 40);
  }

  const factors: string[] = [];
  const improvements: string[] = [];

  if (areaSqm > 1000) {
    factors.push(`${areaSqm.toLocaleString()}m² de espacio`);
  } else {
    factors.push(`${areaSqm}m² — espacio limitado`);
  }

  if (occupancyPct > 70) {
    factors.push(`Ocupación alta (${Math.round(occupancyPct)}%) reduce percepción espacial`);
    improvements.push("Reducir capacidad operativa en 15% para mejorar percepción");
  }

  if (sqmPerPerson < tightThreshold) {
    improvements.push("Agregar espejos en paredes laterales → +15% espacio percibido");
    improvements.push("Reducir mobiliario pesado → +20% espacio percibido");
  }

  return {
    value: Math.round(value),
    factors,
    improvement: improvements.join(". ") || "Espacio percibido dentro de rango óptimo.",
  };
}

/**
 * Aesthetic warmth: does the space feel inviting or cold?
 * Inferred from: facility type, amenity richness, sensory signature.
 */
function computeAestheticWarmth(
  facility: Facility,
): PsychologicalDimension {
  // Warm materials and design by facility type
  const warmthBaseline: Record<FacilityType, number> = {
    spa: 85,
    lounge: 80,
    restaurant: 75,
    ballroom: 70,
    garden: 65,
    kids_area: 60,
    pool: 55,
    gym: 45,
    tennis_court: 40,
    squash_court: 35,
    golf_course: 60,
    playground: 50,
    parking: 15,
  };

  // Amenity richness adds warmth (more amenities = more considered design)
  const amenityBoost = Math.min(15, facility.amenities.length * 2);

  const value = clamp(
    (warmthBaseline[facility.facility_type] ?? 50) + amenityBoost,
    0,
    100,
  );

  const factors: string[] = [];
  const improvements: string[] = [];

  if (facility.amenities.length > 5) {
    factors.push(`${facility.amenities.length} amenidades → diseño considerado`);
  } else if (facility.amenities.length < 3) {
    factors.push(`Solo ${facility.amenities.length} amenidades → espacio básico`);
    improvements.push("Agregar elementos cálidos: plantas, arte, textiles");
  }

  if (value < 50) {
    improvements.push("Materiales naturales (madera, piedra) → +20% calidez percibida");
    improvements.push("Iluminación warm (2700K-3000K) → +15% acogimiento");
  }

  return {
    value: Math.round(value),
    factors,
    improvement: improvements.join(". ") || "Calidez estética dentro de rango óptimo.",
  };
}

/**
 * Sense of control: does the member have choices and agency?
 * Inferred from: amenity richness, operating hours span, facility type.
 * Members who feel in control feel more comfortable.
 */
function computeSenseOfControl(
  facility: Facility,
): PsychologicalDimension {
  // Base control by facility type
  const controlBaseline: Record<FacilityType, number> = {
    garden: 75,       // open space, free movement
    golf_course: 70,  // self-paced
    pool: 65,         // multiple areas
    gym: 70,          // choose your workout
    lounge: 60,       // choose seating, drinks
    restaurant: 45,   // fixed menu, fixed seating
    ballroom: 30,     // assigned seating, fixed program
    spa: 40,          // choose treatment, but bounded
    tennis_court: 65, // self-directed play
    squash_court: 60,
    playground: 55,   // children choose, parents supervise
    kids_area: 45,    // structured but with options
    parking: 20,      // minimal agency
  };

  // Operating hours span: longer hours = more control over WHEN to visit
  const openHour = parseInt(facility.opening_time?.split(":")[0] ?? "8", 10);
  const closeHour = parseInt(facility.closing_time?.split(":")[0] ?? "22", 10);
  const hoursSpan = closeHour - openHour;
  const hoursBoost = clamp((hoursSpan - 10) * 1.5, -5, 10);

  // Amenity richness: more options = more control
  const amenityBoost = Math.min(10, facility.amenities.length * 1.5);

  const value = clamp(
    (controlBaseline[facility.facility_type] ?? 50) + hoursBoost + amenityBoost,
    0,
    100,
  );

  const factors: string[] = [];
  const improvements: string[] = [];

  if (hoursSpan >= 14) {
    factors.push(`${hoursSpan}h de operación → alta flexibilidad temporal`);
  } else {
    factors.push(`${hoursSpan}h de operación → ventana limitada`);
    improvements.push("Extender horario en 2h → +10% percepción de control");
  }

  if (value < 50) {
    improvements.push("Agregar opciones de personalización (temperatura, asientos, música)");
    improvements.push("Ofrecer self-service donde sea posible");
  }

  return {
    value: Math.round(value),
    factors,
    improvement: improvements.join(". ") || "Percepción de control dentro de rango óptimo.",
  };
}

/**
 * Social density feel: independent of actual occupancy %.
 * A space with 50% occupancy can feel lonely (golf course)
 * or overwhelming (squash court gallery).
 * Depends on facility's intended social density.
 */
function computeSocialDensityFeel(
  facility: Facility,
  occupancyPct: number,
): PsychologicalDimension {
  // Ideal occupancy band per type (where it "feels right")
  const idealBands: Record<FacilityType, { min: number; max: number }> = {
    spa: { min: 15, max: 40 },
    lounge: { min: 30, max: 60 },
    restaurant: { min: 45, max: 75 },
    ballroom: { min: 50, max: 80 },
    garden: { min: 20, max: 50 },
    gym: { min: 30, max: 65 },
    pool: { min: 25, max: 55 },
    tennis_court: { min: 40, max: 70 },
    squash_court: { min: 50, max: 80 },
    golf_course: { min: 15, max: 45 },
    playground: { min: 30, max: 60 },
    kids_area: { min: 35, max: 65 },
    parking: { min: 20, max: 70 },
  };

  const band = idealBands[facility.facility_type] ?? { min: 30, max: 65 };
  const bandCenter = (band.min + band.max) / 2;

  let value: number;
  if (occupancyPct >= band.min && occupancyPct <= band.max) {
    // In the ideal band
    value = 80 + Math.round(20 * (1 - Math.abs(occupancyPct - bandCenter) / ((band.max - band.min) / 2)));
  } else if (occupancyPct < band.min) {
    // Too empty: feels lonely/abandoned
    const loneliness = (band.min - occupancyPct) / band.min;
    value = clamp(60 - loneliness * 40, 20, 60);
  } else {
    // Too crowded: feels overwhelming
    const overwhelm = (occupancyPct - band.max) / (100 - band.max);
    value = clamp(60 - overwhelm * 35, 25, 60);
  }

  const factors: string[] = [];
  const improvements: string[] = [];

  if (occupancyPct < band.min) {
    factors.push(`Ocupación ${Math.round(occupancyPct)}% por debajo del ideal (${band.min}-${band.max}%) → sensación de vacío`);
    improvements.push("Consolidar actividades en una zona para crear densidad social");
  } else if (occupancyPct > band.max) {
    factors.push(`Ocupación ${Math.round(occupancyPct)}% por encima del ideal → sensación de agobio`);
    improvements.push("Abrir zonas complementarias para dispersar densidad");
  } else {
    factors.push(`Densidad social ideal: ${Math.round(occupancyPct)}% (ideal: ${band.min}-${band.max}%)`);
  }

  return {
    value: Math.round(value),
    factors,
    improvement: improvements.join(". ") || "Densidad social percibida dentro de rango óptimo.",
  };
}

/**
 * Prestige perception: does the space feel exclusive and premium?
 * Inferred from: base rate, exclusivity signals, facility type.
 * Higher price → higher prestige expectation → harder to satisfy.
 */
function computePrestigePerception(
  facility: Facility,
): PsychologicalDimension {
  // Prestige baseline by type
  const prestigeBaseline: Record<FacilityType, number> = {
    ballroom: 80,
    lounge: 75,
    spa: 78,
    restaurant: 70,
    golf_course: 65,
    tennis_court: 55,
    pool: 50,
    gym: 45,
    garden: 50,
    squash_court: 45,
    playground: 30,
    kids_area: 30,
    parking: 10,
  };

  // Rate positioning: higher rate = higher prestige expectation
  // If rate is high but amenities are few → perception drops
  const clubAvgRate = 25_000;
  const rateRatio = facility.base_rate / Math.max(clubAvgRate, 1);

  let value = prestigeBaseline[facility.facility_type] ?? 50;

  // Rate boost for premium pricing
  if (rateRatio > 1.5) {
    value += 10;
  } else if (rateRatio < 0.5) {
    value -= 10;
  }

  // Amenity richness either validates or undermines prestige
  if (rateRatio > 1.2 && facility.amenities.length < 3) {
    value -= 15; // premium price but basic offering → prestige gap
  } else if (facility.amenities.length > 6) {
    value += 8; // rich amenities → validates prestige
  }

  const factors: string[] = [];
  const improvements: string[] = [];

  if (rateRatio > 1.3) {
    factors.push(`Tarifa premium (${Math.round(rateRatio * 100)}% del promedio) → expectativa alta`);
  }

  if (value < 50) {
    improvements.push("Señalización premium: materiales, iluminación, uniformes");
    improvements.push("Agregar servicio diferenciador (toallas premium, amenidades de marca)");
  }

  return {
    value: clamp(Math.round(value), 0, 100),
    factors,
    improvement: improvements.join(". ") || "Percepción de prestigio dentro de rango óptimo.",
  };
}

// ═══════════════════════════════════════════════════════════════
// PROP 12: computePsychologicalComfort
//
// "What the sensor reads ≠ What the member feels."
//
// 5 psychological dimensions computed from facility attributes,
// NOT from sensor data. The system infers how a space FEELS
// based on its physical properties and the member's expectations.
// ═══════════════════════════════════════════════════════════════

export function computePsychologicalComfort(
  facility: Facility,
  occupancyPct: number,
): PsychologicalComfort {
  return {
    perceived_space: computePerceivedSpace(facility, occupancyPct),
    aesthetic_warmth: computeAestheticWarmth(facility),
    sense_of_control: computeSenseOfControl(facility),
    social_density_feel: computeSocialDensityFeel(facility, occupancyPct),
    prestige_perception: computePrestigePerception(facility),
  };
}

// ═══════════════════════════════════════════════════════════════
// PROP 12: computeEnhancedComfort
//
// Merges technical (§F5) + psychological (Prop 12) into a
// single EnhancedComfortScore. The OVERALL score is a blend:
//   50% technical (sensor-based)
//   50% psychological (perception-based)
//
// The PERCEPTION GAP tells the story:
//   "Sensors say 92/100. Members feel 68/100. Gap: 24 points.
//    Root cause: 3m ceilings + dark walls + tight seating."
// ═══════════════════════════════════════════════════════════════

export function computeEnhancedComfort(
  facility: Facility,
  utilItem: AmenityUtilizationItem | null,
  historicalScores?: number[],
  referenceDate?: Date,
): EnhancedComfortScore {
  const technical = computeComfortScore(
    facility,
    utilItem,
    historicalScores,
    referenceDate,
  );

  const occupancyPct = utilItem?.utilization_pct ?? 30;
  const psychological = computePsychologicalComfort(facility, occupancyPct);

  // ── Psychological aggregate (simple average of 5 dimensions) ──
  const psychValues = [
    psychological.perceived_space.value,
    psychological.aesthetic_warmth.value,
    psychological.sense_of_control.value,
    psychological.social_density_feel.value,
    psychological.prestige_perception.value,
  ];
  const psychOverall = Math.round(
    psychValues.reduce((s, v) => s + v, 0) / psychValues.length,
  );

  // ── Enhanced overall: 50% technical + 50% psychological ──
  const enhancedOverall = Math.round(
    technical.overall * 0.5 + psychOverall * 0.5,
  );

  // ── Perception gap: the KEY signal ──
  const perceptionGap = Math.abs(technical.overall - psychOverall);

  // ── Gap description: explain WHY there's a gap ──
  let perceptionGapDescription: string;
  if (perceptionGap < 10) {
    perceptionGapDescription =
      "Alineación fuerte entre lo que miden los sensores y lo que sienten los miembros.";
  } else if (perceptionGap < 20) {
    const higher =
      technical.overall > psychOverall ? "técnico" : "percepción";
    perceptionGapDescription =
      `Brecha moderada: score ${higher} es ${perceptionGap}pts más alto. Revisar atributos psicológicos del espacio.`;
  } else {
    const techHigher = technical.overall > psychOverall;
    if (techHigher) {
      // Sensors say fine, members don't feel it
      [...psychValues].sort((a, b) => a - b)[0];
      perceptionGapDescription =
        `ALERTA: Sensores indican ${technical.overall}/100 pero los miembros perciben ${psychOverall}/100. ` +
        `Brecha de ${perceptionGap}pts. El espacio técnicamente cumple pero no SE SIENTE bien. ` +
        `Dimensión más débil: ${getWeakestPsychLabel(psychological)}.`;
    } else {
      perceptionGapDescription =
        `Inusual: percepción (${psychOverall}) supera score técnico (${technical.overall}) en ${perceptionGap}pts. ` +
        `El espacio tiene un "encanto" que los sensores no capturan. Capitalizar esta ventaja.`;
    }
  }

  return {
    ...technical,
    technical_overall: technical.overall,
    overall: enhancedOverall,
    psychological,
    perception_gap: perceptionGap,
    perception_gap_description: perceptionGapDescription,
  };
}

/**
 * Find and label the weakest psychological dimension.
 */
function getWeakestPsychLabel(psych: PsychologicalComfort): string {
  const entries: Array<{ key: string; value: number }> = [
    { key: "espacio percibido", value: psych.perceived_space.value },
    { key: "calidez estética", value: psych.aesthetic_warmth.value },
    { key: "control percibido", value: psych.sense_of_control.value },
    { key: "densidad social", value: psych.social_density_feel.value },
    { key: "prestigio percibido", value: psych.prestige_perception.value },
  ];

  const weakest = entries.sort((a, b) => a.value - b.value)[0];
  return `${weakest.key} (${weakest.value}/100)`;
}

// ═══════════════════════════════════════════════════════════════
// §F5b: computeAllComfortScores
//
// Batch computation for all facilities.
// Returns a record keyed by facility_id for O(1) lookups.
// ═══════════════════════════════════════════════════════════════

export function computeAllComfortScores(
  facilities: Facility[],
  utilization: AmenityUtilizationResponse | null,
  historicalByFacility?: Record<string, number[]>,
  referenceDate?: Date,
): Record<string, ComfortScore> {
  const result: Record<string, ComfortScore> = {};

  for (const facility of facilities) {
    const utilItem =
      utilization?.facilities.find((u) => u.facility_id === facility.id) ??
      null;

    result[facility.id] = computeComfortScore(
      facility,
      utilItem,
      historicalByFacility?.[facility.id],
      referenceDate,
    );
  }

  return result;
}

/**
 * Batch computation for enhanced comfort (technical + psychological).
 */
export function computeAllEnhancedComfortScores(
  facilities: Facility[],
  utilization: AmenityUtilizationResponse | null,
  historicalByFacility?: Record<string, number[]>,
  referenceDate?: Date,
): Record<string, EnhancedComfortScore> {
  const result: Record<string, EnhancedComfortScore> = {};

  for (const facility of facilities) {
    const utilItem =
      utilization?.facilities.find((u) => u.facility_id === facility.id) ??
      null;

    result[facility.id] = computeEnhancedComfort(
      facility,
      utilItem,
      historicalByFacility?.[facility.id],
      referenceDate,
    );
  }

  return result;
}