// src/features/facilities/lib/spatialStorytelling.ts
// ═══════════════════════════════════════════════════════════════
// SPATIAL STORYTELLING ENGINE — "The River of Life"
//
// §F9: buildTemporalGraphSequence / detectFlowPatterns /
//       predictNextFrame / generateSpatialNarrative
//
// The spatial graph is NOT a snapshot. It's a RIVER.
// At 8am the gym ignites, the pool sleeps, the café stirs.
// At noon the restaurant becomes a supernova, the gym fades.
// At 8pm the bar lights up, everything else dims.
//
// The system records this temporal flow and GENERATES a
// sequence of graph frames that animate like a living organism
// breathing through the day, week, and season.
//
// Each frame contains: the full spatial graph state,
// the dominant flow pattern, the club's energy level,
// and a NARRATIVE sentence that describes what's happening.
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityType,
  FacilityReservation,
  AmenityUtilizationItem,
  AmenityUtilizationResponse,
  FacilityHealthResponse,
  SpatialGraph,
  SpatialNode,
  TemporalGraphFrame,
  FlowPattern,
  CrowdLevel,
} from "../types";

import { classifyCrowdLevel } from "../types";

import {
  FACILITY_TYPE_CONFIG,
  SPATIAL_STORY_CONFIG
} from "../config";

import { buildSpatialGraph } from "./spatialGraph";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════
// TEMPORAL OCCUPANCY PROFILES
//
// Each facility type has a characteristic daily rhythm.
// These are CURVES that map hour (0-23) → relative activity
// level (0-1). Not absolute occupancy — relative intensity.
//
// A gym at 6am might be at 0.8 relative intensity (morning
// rush), while a lounge at 6am is at 0.05 (closed/dead).
//
// The curves are smooth, biologically plausible shapes
// derived from the peak_hours config + typical club patterns.
// ═══════════════════════════════════════════════════════════════

/**
 * Compute relative activity level (0-1) for a facility type
 * at a given hour of the day.
 *
 * Uses a mixture of Gaussian bumps centered on peak hours,
 * with a baseline for always-active spaces.
 */
function getActivityLevel(
  facilityType: FacilityType,
  hour: number,
): number {
  const config = FACILITY_TYPE_CONFIG[facilityType];
  const peakHours = config.peak_hours;

  if (peakHours.length === 0) return 0.15;

  let maxLevel = 0;

  for (const range of peakHours) {
    const [startStr, endStr] = range.split("-");
    const startHour = parseInt(startStr.split(":")[0], 10);
    const endHour = parseInt(endStr.split(":")[0], 10);
    const midHour = (startHour + endHour) / 2;
    const spread = Math.max((endHour - startHour) / 2, 1.5);

    // Gaussian bump centered at midHour
    const dist = Math.min(
      Math.abs(hour - midHour),
      24 - Math.abs(hour - midHour), // wrap around midnight
    );
    const level = Math.exp(-(dist * dist) / (2 * spread * spread));
    maxLevel = Math.max(maxLevel, level);
  }

  // Floor: even outside peak hours, some facilities have baseline activity
  const baselines: Partial<Record<FacilityType, number>> = {
    gym: 0.12,
    pool: 0.08,
    restaurant: 0.10,
    lounge: 0.05,
    parking: 0.15,
    garden: 0.05,
  };
  const baseline = baselines[facilityType] ?? 0.05;

  return Math.max(baseline, maxLevel);
}

/**
 * Adjust activity level by day of week.
 * Weekends shift patterns: social venues peak later,
 * wellness venues peak earlier, kids areas spike.
 */
function dayOfWeekAdjustment(
  facilityType: FacilityType,
  dayOfWeek: number, // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number,
): number {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (!isWeekend) return 1.0;

  const category = FACILITY_TYPE_CONFIG[facilityType].category;

  // Weekend adjustments by category
  if (category === "social") {
    // Social venues: later start, stronger evening
    if (hour >= 11 && hour < 15) return 1.3; // brunch crowd
    if (hour >= 18 && hour < 23) return 1.4; // dinner/entertainment
    return 0.9;
  }

  if (category === "wellness") {
    // Wellness: earlier start (leisure mornings)
    if (hour >= 7 && hour < 12) return 1.3;
    if (hour >= 14 && hour < 17) return 1.2;
    return 0.85;
  }

  if (category === "sport") {
    // Sports: stronger morning, lighter evening
    if (hour >= 7 && hour < 13) return 1.4;
    return 0.9;
  }

  if (facilityType === "kids_area" || facilityType === "playground") {
    // Kids: massive spike during weekend daylight
    if (hour >= 9 && hour < 17) return 1.8;
    return 0.3;
  }

  return 1.0;
}

/**
 * Seasonal adjustment based on facility type and month.
 * Costa Rica: dry season (Dec-Apr) boosts outdoor, rainy (May-Nov) boosts indoor.
 */
function seasonalAdjustment(
  facilityType: FacilityType,
  month: number,
): number {
  const config = FACILITY_TYPE_CONFIG[facilityType];
  const isDrySeason = month >= 11 || month <= 3;

  switch (config.seasonal_factor) {
    case "summer_boost":
      return isDrySeason ? 1.25 : 0.85;
    case "winter_boost":
      return !isDrySeason ? 1.2 : 0.9;
    default:
      return 1.0;
  }
}

/**
 * Compute synthetic occupancy for a facility at a specific
 * hour, day, and season — when real-time data is unavailable
 * or we need to project into the future.
 *
 * Combines: base activity curve × day-of-week × seasonal × noise.
 */
function synthesizeOccupancy(
  facilityType: FacilityType,
  _capacity: number,
  hour: number,
  dayOfWeek: number,
  month: number,
  noiseFactor: number,
): number {
  const activity = getActivityLevel(facilityType, hour);
  const dowAdj = dayOfWeekAdjustment(facilityType, dayOfWeek, hour);
  const seasonAdj = seasonalAdjustment(facilityType, month);

  const rawPct = activity * dowAdj * seasonAdj * 100;
  const noisyPct = rawPct + noiseFactor * 5; // ±5% noise

  return clamp(Math.round(noisyPct), 0, 120);
}

// ═══════════════════════════════════════════════════════════════
// ENERGY LEVEL — How "alive" is the club?
//
// A single 0-100 number representing the aggregate vitality
// of all spaces combined. Used by the dashboard to render
// the ambient canvas intensity.
//
//   0-15:  Dormant — the club sleeps
//   16-35: Quiet — early morning or late night calm
//   36-60: Active — normal daytime operation
//   61-80: Vibrant — evening peak, events in full swing
//   81-100: Peak — Saturday night gala, everything alive
// ═══════════════════════════════════════════════════════════════

function computeEnergyLevel(nodes: SpatialNode[]): number {
  if (nodes.length === 0) return 0;

  // Weighted average: larger facilities contribute more
  let totalWeight = 0;
  let weightedSum = 0;

  for (const node of nodes) {
    const weight = node.max_capacity;
    const crowdFactor: Record<CrowdLevel, number> = {
      empty: 5,
      quiet: 20,
      normal: 50,
      busy: 70,
      crowded: 85,
      overloaded: 95,
    };
    const nodeEnergy = crowdFactor[node.crowd_level] ?? 30;
    weightedSum += nodeEnergy * weight;
    totalWeight += weight;
  }

  return totalWeight > 0
    ? clamp(Math.round(weightedSum / totalWeight), 0, 100)
    : 0;
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE GENERATION — The club tells its own story
//
// Each frame gets a human-readable sentence that captures
// the ESSENCE of what's happening right now.
//
// "The morning wellness rush is in full swing — the gym
//  pulses at 85% while the pool slowly awakens."
//
// "Evening descends on the club. The restaurant blazes
//  at 90% as the bar ignites with pre-dinner cocktails."
// ═══════════════════════════════════════════════════════════════

interface NarrativeContext {
  hour: number;
  dayOfWeek: number;
  dominantFacility: SpatialNode | null;
  dormantFacilities: SpatialNode[];
  energyLevel: number;
  dominantFlow: FlowPattern | null;
}

function buildTimeOfDayLabel(hour: number): string {
  if (hour >= 5 && hour < 8) return "El amanecer despierta el club";
  if (hour >= 8 && hour < 11) return "La mañana cobra ritmo";
  if (hour >= 11 && hour < 14) return "El mediodía concentra la actividad";
  if (hour >= 14 && hour < 17) return "La tarde se expande";
  if (hour >= 17 && hour < 20) return "El atardecer transforma el club";
  if (hour >= 20 && hour < 23) return "La noche cobra vida";
  return "El club descansa en silencio";
}

function buildDominantDescription(node: SpatialNode): string {
  const pct =
    node.max_capacity > 0
      ? Math.round((node.current_occupancy / node.max_capacity) * 100)
      : 0;

  const intensity =
    pct >= 80
      ? "arde"
      : pct >= 60
        ? "late con fuerza"
        : pct >= 40
          ? "se activa"
          : "despierta";

  return `${node.facility_name} ${intensity} al ${pct}%`;
}

function buildDormantDescription(nodes: SpatialNode[]): string {
  if (nodes.length === 0) return "";
  if (nodes.length === 1) return `${nodes[0].facility_name} descansa`;
  if (nodes.length === 2)
    return `${nodes[0].facility_name} y ${nodes[1].facility_name} descansan`;
  return `${nodes.length} espacios en reposo`;
}

function buildFlowDescription(flow: FlowPattern | null): string {
  if (!flow || flow.volume < SPATIAL_STORY_CONFIG.FLOW_MIN_VOLUME) return "";

  const fromNames = flow.from_facilities.slice(0, 2).join(" y ");
  const toNames = flow.to_facilities.slice(0, 2).join(" y ");

  return `El flujo principal migra de ${fromNames} hacia ${toNames}`;
}

function generateNarrative(context: NarrativeContext): string {
  const parts: string[] = [];

  // Opening: time-of-day atmosphere
  parts.push(buildTimeOfDayLabel(context.hour));

  // Dominant facility
  if (context.dominantFacility) {
    parts.push(buildDominantDescription(context.dominantFacility));
  }

  // Energy descriptor
  const energy = context.energyLevel;
  if (energy >= 80) {
    parts.push("El club vibra con energía máxima");
  } else if (energy >= 60) {
    parts.push("La actividad fluye con intensidad");
  } else if (energy >= 35) {
    parts.push("El ritmo es moderado");
  } else if (energy >= 15) {
    parts.push("El ambiente es de calma expectante");
  }

  // Flow direction
  const flowDesc = buildFlowDescription(context.dominantFlow);
  if (flowDesc) {
    parts.push(flowDesc);
  }

  // Dormant spaces (only mention if club is active)
  if (energy >= 40 && context.dormantFacilities.length > 0) {
    parts.push(buildDormantDescription(context.dormantFacilities));
  }

  return parts.join(". ") + ".";
}

// ═══════════════════════════════════════════════════════════════
// TEMPORAL FRAME BUILDER
//
// Builds a single TemporalGraphFrame for a specific moment.
// Uses real occupancy data when available, synthetic when not.
// ═══════════════════════════════════════════════════════════════

interface FrameInput {
  facilities: Facility[];
  reservations: FacilityReservation[];
  utilization: AmenityUtilizationResponse | null;
  health: FacilityHealthResponse | null;
  hour: number;
  dayOfWeek: number;
  month: number;
  /** When true, override utilization with synthetic data for this hour. */
  useSynthetic: boolean;
}

function buildFrame(input: FrameInput): TemporalGraphFrame {
  const {
    facilities,
    reservations,
    utilization,
    health,
    hour,
    dayOfWeek,
    month,
    useSynthetic,
  } = input;

  // Seeded deterministic noise per facility per hour
  const noiseRng = mulberry32(hour * 100 + dayOfWeek);

  // Build modified utilization that reflects the temporal moment
  let temporalUtilization: AmenityUtilizationResponse | null = utilization;

  if (useSynthetic || !utilization) {
    // Generate synthetic utilization for this time slot
    const syntheticItems: AmenityUtilizationItem[] = facilities.map((f) => {
      const noise = (noiseRng() - 0.5) * 2; // -1 to +1
      const occPct = synthesizeOccupancy(
        f.facility_type,
        f.capacity,
        hour,
        dayOfWeek,
        month,
        noise,
      );
      const config = FACILITY_TYPE_CONFIG[f.facility_type];

      return {
        facility_id: f.id,
        facility_name: f.name,
        name: f.name,
        facility_type: f.facility_type,
        status: f.status,
        current_occupancy: Math.round((occPct / 100) * f.capacity),
        capacity: f.capacity,
        utilization_pct: occPct,
        peak_hours: config.peak_hours,
        trend: "stable",
        forecast_pct: occPct,
        time_series: [],
        base_rate: f.base_rate,
        estimated_monthly_revenue: Math.round(f.base_rate * 4),
      };
    });

    temporalUtilization = {
      overall_utilization_pct:
        syntheticItems.reduce((s, i) => s + i.utilization_pct, 0) /
        Math.max(syntheticItems.length, 1),
      facilities: syntheticItems,
      total_capacity: facilities.reduce((s, f) => s + f.capacity, 0),
      total_occupancy: syntheticItems.reduce(
        (s, i) => s + i.current_occupancy,
        0,
      ),
      peak_facility:
        [...syntheticItems].sort(
          (a, b) => b.utilization_pct - a.utilization_pct,
        )[0]?.facility_name ?? "",
      lowest_facility:
        [...syntheticItems].sort(
          (a, b) => a.utilization_pct - b.utilization_pct,
        )[0]?.facility_name ?? "",
      generated_at: new Date().toISOString(),
    };
  }

  // Build spatial graph for this moment
  const graph = buildSpatialGraph(
    facilities,
    reservations,
    temporalUtilization,
    health,
  );

  // Compute energy level
  const energyLevel = computeEnergyLevel(graph.nodes);

  // Find dominant and dormant facilities
  const sortedByOccupancy = [...graph.nodes].sort(
    (a, b) => {
      const aPct = a.max_capacity > 0 ? a.current_occupancy / a.max_capacity : 0;
      const bPct = b.max_capacity > 0 ? b.current_occupancy / b.max_capacity : 0;
      return bPct - aPct;
    },
  );

  const dominantFacility = sortedByOccupancy[0] ?? null;
  const dormantFacilities = sortedByOccupancy.filter(
    (n) => n.crowd_level === "empty" || n.crowd_level === "quiet",
  );

  // Find dominant flow pattern
  const dominantFlow = detectDominantFlow(graph, hour);

  // Generate narrative
  const narrative = generateNarrative({
    hour,
    dayOfWeek,
    dominantFacility,
    dormantFacilities,
    energyLevel,
    dominantFlow,
  });

  // Timestamp for this frame
  const timestamp = `${hour.toString().padStart(2, "0")}:00`;

  return {
    timestamp,
    graph,
    dominant_flow: dominantFlow,
    energy_level: energyLevel,
    narrative,
  };
}

// ═══════════════════════════════════════════════════════════════
// FLOW PATTERN DETECTION
//
// Analyzes the current graph state to detect WHERE people
// are flowing FROM and TO. Flow patterns are named
// descriptively for the narrative.
// ═══════════════════════════════════════════════════════════════

/** Simple PRNG for deterministic noise. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Named flow patterns for common temporal transitions. */
const FLOW_PATTERN_NAMES: Array<{
  fromTypes: FacilityType[];
  toTypes: FacilityType[];
  hourRange: [number, number];
  name: string;
}> = [
  {
    fromTypes: ["gym", "tennis_court", "squash_court"],
    toTypes: ["pool", "spa"],
    hourRange: [8, 12],
    name: "Post-workout refresh",
  },
  {
    fromTypes: ["gym", "pool"],
    toTypes: ["restaurant"],
    hourRange: [11, 14],
    name: "Almuerzo post-actividad",
  },
  {
    fromTypes: ["restaurant"],
    toTypes: ["lounge"],
    hourRange: [14, 17],
    name: "Post-lunch socialización",
  },
  {
    fromTypes: ["golf_course", "tennis_court"],
    toTypes: ["restaurant", "lounge"],
    hourRange: [12, 16],
    name: "Post-deporte social",
  },
  {
    fromTypes: ["pool", "garden"],
    toTypes: ["restaurant", "lounge"],
    hourRange: [17, 20],
    name: "Atardecer: del relax al dinner",
  },
  {
    fromTypes: ["restaurant"],
    toTypes: ["lounge", "ballroom"],
    hourRange: [20, 23],
    name: "After-dinner nightlife",
  },
  {
    fromTypes: ["gym", "spa"],
    toTypes: ["pool", "garden"],
    hourRange: [15, 18],
    name: "Tarde wellness",
  },
  {
    fromTypes: ["playground", "kids_area"],
    toTypes: ["restaurant", "pool"],
    hourRange: [11, 14],
    name: "Familias: juegos → almuerzo",
  },
];

/**
 * Detect the dominant flow pattern at the current hour
 * by matching graph edges against known temporal patterns.
 */
function detectDominantFlow(
  graph: SpatialGraph,
  hour: number,
): FlowPattern | null {
  // Find flow edges with meaningful volume
  const flowEdges = graph.edges.filter(
    (e) =>
      e.edge_type === "flow" &&
      e.correlation_score >= SPATIAL_STORY_CONFIG.FLOW_MIN_CORRELATION,
  );

  if (flowEdges.length === 0) {
    // Fallback: match known patterns by hour and facility types
    return matchKnownPattern(graph.nodes, hour);
  }

  // Find the strongest flow edge
  const strongest = [...flowEdges].sort(
    (a, b) => b.correlation_score - a.correlation_score,
  )[0];

  if (!strongest) return null;

  const fromNode = graph.nodes.find(
    (n) => n.facility_id === strongest.from_id,
  );
  const toNode = graph.nodes.find((n) => n.facility_id === strongest.to_id);

  if (!fromNode || !toNode) return null;

  return {
    id: `flow-${strongest.from_id}-${strongest.to_id}`,
    name: `${fromNode.facility_name} → ${toNode.facility_name}`,
    from_facilities: [fromNode.facility_name],
    to_facilities: [toNode.facility_name],
    trigger: `hour ${hour}`,
    volume: strongest.transfer_volume,
    confidence: Math.round(strongest.correlation_score * 100),
  };
}

/**
 * Match a known temporal pattern based on current facility
 * states and hour of day. Used as fallback when no real
 * flow data is available.
 */
function matchKnownPattern(
  nodes: SpatialNode[],
  hour: number,
): FlowPattern | null {
  // Find which facility types are currently most active
  const activeTypes = nodes
    .filter((n) => n.crowd_level === "busy" || n.crowd_level === "crowded")
    .map((n) => n.facility_type);

  // Match against known patterns
  for (const pattern of FLOW_PATTERN_NAMES) {
    if (hour < pattern.hourRange[0] || hour > pattern.hourRange[1]) continue;

    const fromMatch = pattern.fromTypes.some((t) => activeTypes.includes(t));
    const toMatch = pattern.toTypes.some((t) => {
      // Target types might not be active yet — that's the prediction
      const node = nodes.find((n) => n.facility_type === t);
      return node && node.crowd_level !== "overloaded";
    });

    if (fromMatch && toMatch) {
      const fromNames = pattern.fromTypes
        .map((t) => nodes.find((n) => n.facility_type === t)?.facility_name)
        .filter(Boolean) as string[];
      const toNames = pattern.toTypes
        .map((t) => nodes.find((n) => n.facility_type === t)?.facility_name)
        .filter(Boolean) as string[];

      return {
        id: `known-${pattern.name.replace(/\s+/g, "-").toLowerCase()}`,
        name: pattern.name,
        from_facilities: fromNames.slice(0, 3),
        to_facilities: toNames.slice(0, 3),
        trigger: `${pattern.hourRange[0]}:00-${pattern.hourRange[1]}:00`,
        volume: 0,
        confidence: 72,
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// §F9a: buildTemporalGraphSequence
//
// "The club is not a collection of snapshots.
//  It's a RIVER that flows through the day."
//
// Generates a sequence of TemporalGraphFrames — one per
// time slot — that together form the daily animation.
// The SpatialGraphView component plays these frames like
// a film, showing how the club breathes.
// ═══════════════════════════════════════════════════════════════

export type TemporalResolution = typeof SPATIAL_STORY_CONFIG.RESOLUTIONS[number];

export function buildTemporalGraphSequence(
  facilities: Facility[],
  reservations: FacilityReservation[],
  utilization: AmenityUtilizationResponse | null,
  health: FacilityHealthResponse | null,
  resolution: TemporalResolution = "hourly",
  referenceDate?: Date,
): TemporalGraphFrame[] {
  const now = referenceDate ?? new Date();
  const dayOfWeek = now.getDay();
  const month = now.getMonth();
  const currentHour = now.getHours();

  // Determine hours to generate based on resolution
  const hours: number[] = [];
  const step =
    resolution === "hourly"
      ? 1
      : resolution === "3h_blocks"
        ? 3
        : 24;

  for (let h = 0; h < 24; h += step) {
    hours.push(h);
  }

  // Build a frame for each time slot
  const frames: TemporalGraphFrame[] = hours.map((hour) => {
    // Use real data for the current hour, synthetic for others
    const isCurrentHour =
      Math.abs(hour - currentHour) < step && !utilization;

    return buildFrame({
      facilities,
      reservations,
      utilization: isCurrentHour ? utilization : null,
      health,
      hour,
      dayOfWeek,
      month,
      useSynthetic: !isCurrentHour,
    });
  });

  return frames;
}

// ═══════════════════════════════════════════════════════════════
// §F9b: detectFlowPatterns
//
// "The system watches the river and learns its currents."
//
// Analyzes the full temporal sequence to find RECURRING
// flow patterns — things that happen every day at the same
// time. These patterns become predictions.
// ═══════════════════════════════════════════════════════════════

export function detectFlowPatterns(
  frames: TemporalGraphFrame[],
): FlowPattern[] {
  const patterns: FlowPattern[] = [];

  // Group frames by dominant flow pattern name
  const patternCounts = new Map<
    string,
    { pattern: FlowPattern; count: number; hours: number[] }
  >();

  for (const frame of frames) {
    if (!frame.dominant_flow) continue;

    const name = frame.dominant_flow.name;
    const existing = patternCounts.get(name);

    if (existing) {
      existing.count++;
      const hour = parseInt(frame.timestamp.split(":")[0], 10);
      existing.hours.push(hour);
    } else {
      const hour = parseInt(frame.timestamp.split(":")[0], 10);
      patternCounts.set(name, {
        pattern: { ...frame.dominant_flow },
        count: 1,
        hours: [hour],
      });
    }
  }

  // A pattern is "recurring" if it appears in at least 2 frames
  const minFrames = 2;

  patternCounts.forEach((data) => {
    if (data.count >= minFrames) {
      const avgConfidence = Math.round(
        data.pattern.confidence * (data.count / frames.length) * 2,
      );

      patterns.push({
        ...data.pattern,
        confidence: clamp(avgConfidence, 40, 95),
        trigger: `${Math.min(...data.hours)}:00-${Math.max(...data.hours) + 1}:00`,
      });
    }
  });

  // Sort by confidence descending
  return patterns.sort((a, b) => b.confidence - a.confidence);
}

// ═══════════════════════════════════════════════════════════════
// §F9c: predictNextFrame
//
// "Given where the river IS, predict where it will BE."
//
// Uses weighted moving average of recent frames plus
// known flow patterns to predict the next time slot.
// ═══════════════════════════════════════════════════════════════

export function predictNextFrame(
  currentFrame: TemporalGraphFrame,
  recentFrames: TemporalGraphFrame[],
  patterns: FlowPattern[],
): TemporalGraphFrame {
  // Parse current hour
  const currentHour = parseInt(
    currentFrame.timestamp.split(":")[0],
    10,
  );
  const nextHour = (currentHour + 1) % 24;

  // Predict energy level using exponential moving average
  const recentEnergyLevels = recentFrames.map((f) => f.energy_level);
  let predictedEnergy = currentFrame.energy_level;

  if (recentEnergyLevels.length >= 2) {
    const halfLife = 2;
    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < recentEnergyLevels.length; i++) {
      const weight = Math.exp(-i / halfLife);
      weightedSum += recentEnergyLevels[i] * weight;
      weightSum += weight;
    }

    const ema = weightSum > 0 ? weightedSum / weightSum : predictedEnergy;
    const momentum = predictedEnergy - ema;
    predictedEnergy = clamp(
      Math.round(predictedEnergy + momentum * 0.3),
      0,
      100,
    );
  }

  // Adjust based on known patterns
  const matchingPattern = patterns.find((p) => {
    const [startStr, endStr] = p.trigger.split("-");
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    return nextHour >= start && nextHour <= end;
  });

  if (matchingPattern) {
    // Pattern detected → energy shift likely
    const isFlowingToward =
      matchingPattern.to_facilities.length > 0;
    if (isFlowingToward) {
      predictedEnergy = clamp(predictedEnergy + 5, 0, 100);
    }
  }

  // Build predicted nodes: shift crowd levels based on patterns
  const predictedNodes: SpatialNode[] = currentFrame.graph.nodes.map(
    (node) => {
      const isFlowSource =
        matchingPattern?.from_facilities.includes(
          node.facility_name,
        ) ?? false;
      const isFlowTarget =
        matchingPattern?.to_facilities.includes(
          node.facility_name,
        ) ?? false;

      let occupancyShift = 0;
      if (isFlowSource) occupancyShift = -8;
      if (isFlowTarget) occupancyShift = 12;

      const newOccupancyPct = clamp(
        node.max_capacity > 0
          ? ((node.current_occupancy + occupancyShift) /
              node.max_capacity) *
              100
          : 0,
        0,
        120,
      );

      return {
        ...node,
        current_occupancy: clamp(
          node.current_occupancy + occupancyShift,
          0,
          node.max_capacity * 1.2,
        ),
        crowd_level: classifyCrowdLevel(newOccupancyPct),
      };
    },
  );

  // Predicted graph is the current graph with shifted nodes
  const predictedGraph: SpatialGraph = {
    ...currentFrame.graph,
    nodes: predictedNodes,
  };

  // Narrative for the predicted frame
  const narrative = generateNarrative({
    hour: nextHour,
    dayOfWeek: new Date().getDay(),
    dominantFacility:
      [...predictedNodes].sort((a, b) => {
        const aPct =
          a.max_capacity > 0
            ? a.current_occupancy / a.max_capacity
            : 0;
        const bPct =
          b.max_capacity > 0
            ? b.current_occupancy / b.max_capacity
            : 0;
        return bPct - aPct;
      })[0] ?? null,
    dormantFacilities: predictedNodes.filter(
      (n) =>
        n.crowd_level === "empty" || n.crowd_level === "quiet",
    ),
    energyLevel: predictedEnergy,
    dominantFlow: matchingPattern ?? null,
  });

  return {
    timestamp: `${nextHour.toString().padStart(2, "0")}:00`,
    graph: predictedGraph,
    dominant_flow: matchingPattern ?? null,
    energy_level: predictedEnergy,
    narrative: `[PREDICCIÓN] ${narrative}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// BONUS: Weekly Rhythm
//
// Generates a 7-day × 24-hour heatmap of energy levels.
// Used by the SpatialStoryView to show weekly patterns
// at a glance — the "heartbeat" of the club.
// ═══════════════════════════════════════════════════════════════

export interface WeeklyRhythm {
  data: number[][];       // [dayOfWeek][hour] → energy level 0-100
  peakMoment: { day: number; hour: number; energy: number };
  quietestMoment: { day: number; hour: number; energy: number };
  weekdayAvgEnergy: number;
  weekendAvgEnergy: number;
  narrative: string;
}

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function computeWeeklyRhythm(
  facilities: Facility[],
): WeeklyRhythm {
  const data: number[][] = [];

  let peakEnergy = 0;
  let peakDay = 0;
  let peakHour = 0;
  let quietEnergy = 100;
  let quietDay = 0;
  let quietHour = 0;

  for (let day = 0; day < 7; day++) {
    const dayData: number[] = [];
    const month = new Date().getMonth();

    for (let hour = 0; hour < 24; hour++) {
      // Aggregate activity across all facilities
      let totalActivity = 0;
      let count = 0;

      for (const f of facilities) {
        const activity = getActivityLevel(f.facility_type, hour);
        const dowAdj = dayOfWeekAdjustment(f.facility_type, day, hour);
        const seasonAdj = seasonalAdjustment(f.facility_type, month);
        totalActivity += activity * dowAdj * seasonAdj;
        count++;
      }

      const avgActivity =
        count > 0 ? (totalActivity / count) * 100 : 0;
      const energy = clamp(Math.round(avgActivity), 0, 100);
      dayData.push(energy);

      if (energy > peakEnergy) {
        peakEnergy = energy;
        peakDay = day;
        peakHour = hour;
      }
      if (energy < quietEnergy) {
        quietEnergy = energy;
        quietDay = day;
        quietHour = hour;
      }
    }

    data.push(dayData);
  }

  // Weekday vs weekend averages
  let weekdaySum = 0;
  let weekdayCount = 0;
  let weekendSum = 0;
  let weekendCount = 0;

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const value = data[day][hour];
      if (day === 0 || day === 6) {
        weekendSum += value;
        weekendCount++;
      } else {
        weekdaySum += value;
        weekdayCount++;
      }
    }
  }

  const weekdayAvg =
    weekdayCount > 0 ? Math.round(weekdaySum / weekdayCount) : 0;
  const weekendAvg =
    weekendCount > 0 ? Math.round(weekendSum / weekendCount) : 0;

  // Narrative
  const peakDayName = DAY_NAMES[peakDay] ?? "—";
  const quietDayName = DAY_NAMES[quietDay] ?? "—";
  const weekendHigher = weekendAvg > weekdayAvg;

  const narrative = `El club tiene su pico de energía los ${peakDayName.toLowerCase()}s a las ${peakHour}:00 (${peakEnergy}/100). Su momento más tranquilo es el ${quietDayName.toLowerCase()} a las ${quietHour}:00 (${quietEnergy}/100). ${
    weekendHigher
      ? `Los fines de semana son ${Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100)}% más activos que los días laborales.`
      : `Los días laborales mantienen un ritmo ${Math.round(((weekdayAvg - weekendAvg) / weekendAvg) * 100)}% más alto que los fines de semana.`
  }`;

  return {
    data,
    peakMoment: { day: peakDay, hour: peakHour, energy: peakEnergy },
    quietestMoment: { day: quietDay, hour: quietHour, energy: quietEnergy },
    weekdayAvgEnergy: weekdayAvg,
    weekendAvgEnergy: weekendAvg,
    narrative,
  };
}