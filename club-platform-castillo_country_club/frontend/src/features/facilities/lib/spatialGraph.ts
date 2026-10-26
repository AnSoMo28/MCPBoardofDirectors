// src/features/facilities/lib/spatialGraph.ts
// ═══════════════════════════════════════════════════════════════
// SPATIAL GRAPH ENGINE — "The Living Building"
//
// §F1: buildSpatialGraph
//   The club is not a collection of independent spaces.
//   It's a GRAPH where every space is connected to every other
//   by flows of people, revenue synergy, and logistical dependency.
//
// §F2: computeFacilityPersonality
//   Each space has a personality built from actual usage data,
//   not from how it was designed. The ballroom was designed for
//   galas, but data shows its best use is intimate jazz →
//   its personality is "intimate-formal", not "grand gala".
//
// Pure functions. Zero side effects. Zero API calls.
// Input: backend data. Output: spatial intelligence.
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
  SpatialEdge,
  SpatialCluster,
  SpatialBottleneck,
  SpatialOptimization,
  FacilityPersonality,
  SensorySignature,
  TrendDirection,
} from "../types";

import {
  classifyCrowdLevel,
  deriveSensoryAdjustments,
} from "../types";

import {
  FACILITY_TYPE_CONFIG,
  SPATIAL_STORY_CONFIG,
  type FacilityCategory,
} from "../config";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS — Spatial Layout & Affinities
// ═══════════════════════════════════════════════════════════════

/** SVG zone layout (viewBox 1000×700). Each category has a home. */
const ZONE_LAYOUT: Record<
  FacilityCategory,
  { cx: number; cy: number; r: number }
> = {
  wellness: { cx: 260, cy: 170, r: 110 },
  sport:    { cx: 740, cy: 190, r: 120 },
  social:   { cx: 500, cy: 390, r: 130 },
  service:  { cx: 260, cy: 570, r: 100 },
  admin:    { cx: 740, cy: 550, r: 80 },
};

/**
 * Type affinity matrix — how naturally two facility types flow together.
 * Used as fallback when reservation co-occurrence data is sparse.
 * Score 0-1: how strongly people gravitate from one type to another.
 */
const TYPE_AFFINITY: Record<string, number> = {
  "gym-pool":            0.85,
  "gym-spa":             0.75,
  "gym-tennis_court":    0.60,
  "pool-spa":            0.80,
  "pool-garden":         0.65,
  "restaurant-lounge":   0.90,
  "restaurant-ballroom": 0.85,
  "lounge-ballroom":     0.80,
  "ballroom-garden":     0.70,
  "ballroom-restaurant": 0.85,
  "tennis_court-golf_course": 0.55,
  "tennis_court-pool":   0.60,
  "garden-restaurant":   0.65,
  "playground-kids_area": 0.90,
  "playground-garden":   0.70,
  "parking-restaurant":  0.45,
  "parking-ballroom":    0.45,
  "parking-golf_course": 0.40,
};

/** What each facility type was originally designed for. */
const DESIGNED_PURPOSE: Record<FacilityType, string> = {
  pool:          "Recreación acuática y relax al aire libre",
  gym:           "Entrenamiento físico y acondicionamiento",
  tennis_court:  "Deporte de raqueta competitivo",
  squash_court:  "Deporte de raqueta indoor de alta intensidad",
  golf_course:   "Golf recreativo, social y de competencia",
  restaurant:    "Gastronomía de alta cocina y encuentro social",
  lounge:        "Coctelería de autor y socialización premium",
  ballroom:      "Eventos formales, galas y celebraciones",
  garden:        "Eventos al aire libre, contemplación y naturaleza",
  parking:       "Servicio de infraestructura vehicular",
  playground:    "Recreación infantil supervisada",
  spa:           "Bienestar holístico, terapias y relajación",
  kids_area:     "Actividades infantiles estructuradas y supervisadas",
};

/** Energy baseline per facility type (calm → energetic). */
const ENERGY_BASELINE: Record<FacilityType, number> = {
  pool: 65, gym: 80, tennis_court: 75, squash_court: 70,
  golf_course: 50, restaurant: 55, lounge: 40, ballroom: 60,
  garden: 45, parking: 10, playground: 70, spa: 20, kids_area: 65,
};

/** Formality baseline per facility type (casual → formal). */
const FORMALITY_BASELINE: Record<FacilityType, number> = {
  pool: 25, gym: 20, tennis_court: 40, squash_court: 35,
  golf_course: 55, restaurant: 60, lounge: 50, ballroom: 90,
  garden: 30, parking: 5, playground: 10, spa: 65, kids_area: 10,
};

/** Cluster theme labels by dominant category. */
const CLUSTER_THEMES: Record<FacilityCategory, string> = {
  social:   "Social Hub",
  wellness: "Wellness Zone",
  sport:    "Sports Complex",
  service:  "Service Area",
  admin:    "Operations Center",
};

// ═══════════════════════════════════════════════════════════════
// HELPERS — Pure utility functions
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getTypeAffinity(typeA: string, typeB: string): number {
  return (
    TYPE_AFFINITY[`${typeA}-${typeB}`] ??
    TYPE_AFFINITY[`${typeB}-${typeA}`] ??
    0.2
  );
}

/**
 * Compute deterministic SVG position for a facility.
 * Facilities of the same category are arranged in a circle
 * around their zone center. Sorted by name for stability.
 */
function computePosition(
  facility: Facility,
  allFacilities: Facility[],
): { x: number; y: number } {
  const category = FACILITY_TYPE_CONFIG[facility.facility_type].category;
  const zone = ZONE_LAYOUT[category];

  const sameCategory = allFacilities
    .filter((f) => FACILITY_TYPE_CONFIG[f.facility_type].category === category)
    .sort((a, b) => a.name.localeCompare(b.name));

  const index = sameCategory.findIndex((f) => f.id === facility.id);
  const count = sameCategory.length;

  if (count <= 1) return { x: zone.cx, y: zone.cy };

  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  return {
    x: Math.round(zone.cx + zone.r * Math.cos(angle)),
    y: Math.round(zone.cy + zone.r * Math.sin(angle)),
  };
}

// ═══════════════════════════════════════════════════════════════
// §F2: computeFacilityPersonality
//
// "Each space has a personality built from actual usage data,
//  not from how it was designed."
//
// 6 axes: energy, sociality, formality, exclusivity, versatility, intimacy
// Each 0-100. Computed from real backend data + type config.
// ═══════════════════════════════════════════════════════════════

export function computeFacilityPersonality(
  facility: Facility,
  allReservations: FacilityReservation[],
  utilItem: AmenityUtilizationItem | null,
): FacilityPersonality {
  const typeConfig = FACILITY_TYPE_CONFIG[facility.facility_type];

  // Filter reservations belonging to this facility
  const facilityRes = allReservations.filter(
    (r) => r.facility_id === facility.id,
  );

  const utilPct = utilItem?.utilization_pct ?? 50;

  // ── Energy: type baseline + activity modifier ──
  const energyModifier = utilPct > 70 ? 10 : utilPct < 30 ? -10 : 0;
  const energy = clamp(
    (ENERGY_BASELINE[facility.facility_type] ?? 50) + energyModifier,
    0,
    100,
  );

  // ── Sociality: avg guest count relative to capacity ──
  const avgGuests =
    facilityRes.length > 0
      ? facilityRes.reduce((s, r) => s + r.guest_count, 0) /
        facilityRes.length
      : facility.capacity * 0.4;
  const sociality = clamp(
    Math.round((avgGuests / Math.max(facility.capacity, 1)) * 100),
    0,
    100,
  );

  // ── Formality: rate positioning + type baseline ──
  // Club average rate proxy: 25000 (adjustable)
  const clubAvgRate = 25_000;
  const rateFactor = clamp(
    ((facility.base_rate - clubAvgRate) / Math.max(clubAvgRate, 1)) * 30,
    -20,
    30,
  );
  const formality = clamp(
    Math.round((FORMALITY_BASELINE[facility.facility_type] ?? 50) + rateFactor),
    0,
    100,
  );

  // ── Exclusivity: inverse utilization + rate boost ──
  const rateBoost = facility.base_rate > clubAvgRate ? 15 : 0;
  const exclusivity = clamp(
    Math.round(100 - utilPct + rateBoost),
    0,
    100,
  );

  // ── Versatility: variety of reservation purposes ──
  const uniquePurposes = new Set(facilityRes.map((r) => r.purpose)).size;
  const versatility = clamp(Math.round(uniquePurposes * 18), 0, 100);

  // ── Intimacy: inverse of capacity (smaller = cozier) ──
  const maxClubCapacity = 150;
  const intimacy = clamp(
    Math.round(100 - (facility.capacity / maxClubCapacity) * 100),
    0,
    100,
  );

  // ── Best genres: top 3 reservation purposes ──
  const purposeCounts = new Map<string, number>();
  facilityRes.forEach((r) => {
    purposeCounts.set(r.purpose, (purposeCounts.get(r.purpose) ?? 0) + 1);
  });
  const best_genres = [...purposeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p]) => p);
  if (best_genres.length === 0) {
    best_genres.push(DESIGNED_PURPOSE[facility.facility_type]);
  }

  // ── Optimal capacity: sweet spot at ~65% of max ──
  const optimal_capacity = Math.round(facility.capacity * 0.65);

  // ── Optimal time of day from peak hours ──
  const peakStart = typeConfig.peak_hours[0]?.split("-")[0] ?? "10:00";
  const startHour = parseInt(peakStart, 10);
  const optimal_time_of_day: FacilityPersonality["optimal_time_of_day"] =
    startHour < 10
      ? "morning"
      : startHour < 14
        ? "afternoon"
        : startHour < 19
          ? "evening"
          : "night";

  // ── Sensory signature: from type defaults + event context ──
  const sensoryAdj = deriveSensoryAdjustments(
    facility.facility_type,
    best_genres[0] ?? "",
  );
  const sensory_signature: SensorySignature = {
    lighting: sensoryAdj.lighting ?? {
      type: "warm",
      intensity: 60,
      color_temp_k: 3000,
    },
    acoustics: sensoryAdj.acoustics ?? {
      type: "conversational",
      target_db: 45,
      absorption_rating: 50,
    },
    temperature: sensoryAdj.temperature ?? {
      target_celsius: 21,
      humidity_pct: 50,
      airflow: "gentle",
    },
    aroma: sensoryAdj.aroma ?? {
      category: "neutral",
      intensity: 30,
    },
    texture: sensoryAdj.texture ?? {
      primary: "natural",
      comfort_rating: 60,
    },
  };

  // ── Trend from utilization data ──
  const trend: TrendDirection = utilItem?.trend ?? "stable";

  // ── Designed vs actual use (the gap tells the story) ──
  const designed_for = DESIGNED_PURPOSE[facility.facility_type];
  const actual_primary_use = best_genres[0] ?? designed_for;

  const overall_score = Math.round(
    (energy + sociality + formality + exclusivity + versatility + intimacy) / 6,
  );
  const vitality_trend = trend;
  const versatility_index = versatility;
  const comfort_contribution = Math.round(
    (sensory_signature.lighting.intensity +
      sensory_signature.acoustics.absorption_rating +
      sensory_signature.temperature.humidity_pct +
      sensory_signature.aroma.intensity +
      sensory_signature.texture.comfort_rating) /
      5,
  );
  const efficiency_rating = clamp(
    Math.round((utilPct + Math.min(100, (facility.capacity / Math.max(optimal_capacity, 1)) * 100)) / 2),
    0,
    100,
  );
  const popularity_score = clamp(
    Math.round((sociality + utilPct) / 2),
    0,
    100,
  );
  const activity_level = energy;
  const personality_type =
    energy >= 70 && formality >= 60
      ? "dynamic_formal"
      : energy >= 70
        ? "dynamic"
        : intimacy >= 70
          ? "intimate"
          : exclusivity >= 70
            ? "exclusive"
            : versatility >= 70
              ? "versatile"
              : "balanced";

  return {
    facility_id: facility.id,
    facility_name: facility.name,
    overall_score,
    vitality_trend,
    versatility_index,
    comfort_contribution,
    efficiency_rating,
    popularity_score,
    activity_level,
    personality_type,
    energy,
    sociality,
    formality,
    exclusivity,
    versatility,
    intimacy,
    best_genres,
    optimal_capacity,
    optimal_time_of_day,
    sensory_signature,
    trend,
    designed_for,
    actual_primary_use,
  };
}

// ═══════════════════════════════════════════════════════════════
// EDGE COMPUTATION — How spaces connect
// ═══════════════════════════════════════════════════════════════

/**
 * Flow edges from reservation co-occurrence.
 * "The 91% of families that reserve the Gym also reserve
 *  the Pool within ±2 days."
 */
function computeCoOccurrenceEdges(
  _facilities: Facility[],
  reservations: FacilityReservation[],
  utilization: AmenityUtilizationResponse | null,
): SpatialEdge[] {
  if (reservations.length < 5) return [];

  // Group by family
  const byFamily = new Map<string, FacilityReservation[]>();
  reservations.forEach((r) => {
    const list = byFamily.get(r.family_id) ?? [];
    list.push(r);
    byFamily.set(r.family_id, list);
  });

  // Count co-occurrences per facility pair (canonical key)
  const coCounts = new Map<string, number>();
  const facilityCounts = new Map<string, number>();

  byFamily.forEach((familyRes) => {
    // Unique facilities used by this family
    const usedFacilities = new Set(familyRes.map((r) => r.facility_id));
    usedFacilities.forEach((fid) => {
      facilityCounts.set(fid, (facilityCounts.get(fid) ?? 0) + 1);
    });

    // Pairs within ±2 day window
    for (let i = 0; i < familyRes.length; i++) {
      for (let j = i + 1; j < familyRes.length; j++) {
        const a = familyRes[i];
        const b = familyRes[j];
        if (a.facility_id === b.facility_id) continue;

        const dayDiff = Math.abs(
          (new Date(a.date).getTime() - new Date(b.date).getTime()) / 86_400_000,
        );
        if (dayDiff > 2) continue;

        const key = [a.facility_id, b.facility_id].sort().join("|");
        coCounts.set(key, (coCounts.get(key) ?? 0) + 1);
      }
    }
  });

  // Convert to edges with correlation scores
  const minCorrelation = SPATIAL_STORY_CONFIG.FLOW_MIN_CORRELATION;
  const edges: SpatialEdge[] = [];

  coCounts.forEach((count, key) => {
    const [idA, idB] = key.split("|");
    const countA = facilityCounts.get(idA) ?? 1;
    const countB = facilityCounts.get(idB) ?? 1;
    const correlation = count / Math.sqrt(countA * countB);

    if (correlation >= minCorrelation) {
      // Direction: flow from lower → higher utilization
      const utilA =
        utilization?.facilities.find((f) => f.facility_id === idA)
          ?.utilization_pct ?? 50;
      const utilB =
        utilization?.facilities.find((f) => f.facility_id === idB)
          ?.utilization_pct ?? 50;

      edges.push({
        from_id: utilA <= utilB ? idA : idB,
        to_id: utilA <= utilB ? idB : idA,
        correlation_score: Math.round(correlation * 100) / 100,
        edge_type: "flow",
        avg_transfer_time_min: 15,
        transfer_volume: count,
      });
    }
  });

  return edges;
}

/**
 * Synergy edges from facility type affinity.
 * "Restaurants and Lounges naturally feed each other."
 * Used as baseline when co-occurrence data is sparse.
 */
function computeSynergyEdges(facilities: Facility[]): SpatialEdge[] {
  const edges: SpatialEdge[] = [];
  const minAffinity = 0.5;

  for (let i = 0; i < facilities.length; i++) {
    for (let j = i + 1; j < facilities.length; j++) {
      const a = facilities[i];
      const b = facilities[j];
      const affinity = getTypeAffinity(a.facility_type, b.facility_type);

      if (affinity >= minAffinity) {
        edges.push({
          from_id: a.id,
          to_id: b.id,
          correlation_score: Math.round(affinity * 100) / 100,
          edge_type: "synergy",
          avg_transfer_time_min: 10,
          transfer_volume: 0,
        });
      }
    }
  }

  return edges;
}

/**
 * Merge flow + synergy edges. Flow edges take priority
 * when both exist for the same pair.
 */
function mergeEdges(
  flowEdges: SpatialEdge[],
  synergyEdges: SpatialEdge[],
): SpatialEdge[] {
  const merged = new Map<string, SpatialEdge>();

  flowEdges.forEach((e) => {
    const key = [e.from_id, e.to_id].sort().join("|");
    merged.set(key, e);
  });

  synergyEdges.forEach((e) => {
    const key = [e.from_id, e.to_id].sort().join("|");
    if (!merged.has(key)) {
      merged.set(key, e);
    }
  });

  return [...merged.values()];
}

// ═══════════════════════════════════════════════════════════════
// GRAPH ANALYSIS — Clusters, Bottlenecks, Optimizations
// ═══════════════════════════════════════════════════════════════

/**
 * Detect connected components (clusters) via BFS.
 * Only considers edges above the strong correlation threshold.
 */
function detectClusters(
  nodes: SpatialNode[],
  edges: SpatialEdge[],
): SpatialCluster[] {
  const threshold = SPATIAL_STORY_CONFIG.FLOW_STRONG_CORRELATION;

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((n) => adjacency.set(n.facility_id, new Set()));
  edges.forEach((e) => {
    if (e.correlation_score >= threshold) {
      adjacency.get(e.from_id)?.add(e.to_id);
      adjacency.get(e.to_id)?.add(e.from_id);
    }
  });

  // BFS to find connected components
  const visited = new Set<string>();
  const clusters: SpatialCluster[] = [];

  nodes.forEach((node) => {
    if (visited.has(node.facility_id)) return;

    const component: string[] = [];
    const queue = [node.facility_id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      adjacency.get(current)?.forEach((neighbor) => {
        if (!visited.has(neighbor)) queue.push(neighbor);
      });
    }

    // Only clusters with 2+ facilities
    if (component.length >= 2) {
      const clusterNodes = nodes.filter((n) =>
        component.includes(n.facility_id),
      );

      // Determine dominant category
      const categoryCount = new Map<FacilityCategory, number>();
      clusterNodes.forEach((n) => {
        const cat = FACILITY_TYPE_CONFIG[n.facility_type].category;
        categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
      });
      const dominant = [...categoryCount.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0][0];

      // Average utilization across cluster
      const avgUtil =
        clusterNodes.reduce((s, n) => {
          const pct =
            n.max_capacity > 0
              ? (n.current_occupancy / n.max_capacity) * 100
              : 0;
          return s + pct;
        }, 0) / Math.max(clusterNodes.length, 1);

      clusters.push({
        cluster_id: `cluster-${clusters.length}`,
        id: `cluster-${clusters.length}`,
        facility_ids: component,
        theme: CLUSTER_THEMES[dominant] ?? "Mixed Zone",
        avg_utilization: Math.round(avgUtil),
        cross_sell_potential: Math.round(component.length * 15),
      });
    }
  });

  return clusters;
}

/**
 * Find facilities acting as bottlenecks — high incoming flow
 * + overloaded + degraded health = systemic risk.
 */
function findBottlenecks(
  nodes: SpatialNode[],
  edges: SpatialEdge[],
): SpatialBottleneck[] {
  const bottlenecks: SpatialBottleneck[] = [];

  // Count incoming edges per node
  const incoming = new Map<string, number>();
  nodes.forEach((n) => incoming.set(n.facility_id, 0));
  edges.forEach((e) => {
    incoming.set(e.to_id, (incoming.get(e.to_id) ?? 0) + 1);
  });

  nodes.forEach((node) => {
    const inCount = incoming.get(node.facility_id) ?? 0;
    const isOverloaded =
      node.crowd_level === "crowded" || node.crowd_level === "overloaded";
    const isHighFlow = inCount >= 3;
    const isLowHealth = node.health < 50;

    if (isOverloaded && isHighFlow) {
      // Find affected facilities (neighbors)
      const affected = edges
        .filter(
          (e) =>
            e.from_id === node.facility_id || e.to_id === node.facility_id,
        )
        .flatMap((e) => [e.from_id, e.to_id])
        .filter((id) => id !== node.facility_id);

      const severity = clamp(
        (isLowHealth ? 40 : 0) + inCount * 10 + (node.crowd_level === "overloaded" ? 30 : 15),
        0,
        100,
      );

      bottlenecks.push({
        facility_id: node.facility_id,
        bottleneck_type: isLowHealth ? "maintenance" : "capacity",
        severity,
        affected_facilities: [...new Set(affected)],
        recommendation: isLowHealth
          ? `${node.facility_name} necesita mantenimiento urgente. Su degradación afecta ${affected.length} espacio(s) conectado(s).`
          : `${node.facility_name} está saturado. Redistribuir flujo hacia espacios alternativos.`,
      });
    }
  });

  return bottlenecks.sort((a, b) => b.severity - a.severity);
}

/**
 * Generate spatial optimization suggestions.
 * The system PROPOSES changes — it doesn't just report problems.
 */
function generateOptimizations(
  nodes: SpatialNode[],
  edges: SpatialEdge[],
  utilization: AmenityUtilizationResponse | null,
): SpatialOptimization[] {
  const optimizations: SpatialOptimization[] = [];

  nodes.forEach((node) => {
    const utilItem = utilization?.facilities.find(
      (f) => f.facility_id === node.facility_id,
    );
    const utilPct = utilItem?.utilization_pct ?? 50;

    // ── Underutilized → Repurpose ──
    if (utilPct < 30 && node.max_capacity > 30) {
      optimizations.push({
        id: `opt-repurpose-${node.facility_id}`,
        type: "repurpose",
        description: `${node.facility_name} tiene utilización del ${utilPct}%. Considerar redefinir su uso para atraer actividad.`,
        affected_facilities: [node.facility_id],
        expected_impact: {
          utilization_change: 25,
          revenue_change: 15,
          comfort_change: 5,
        },
        confidence: 70,
        implementation_cost: 5_000,
        roi_months: 6,
      });
    }

    // ── Overcrowded → Relocate to alternative ──
    if (utilPct > 85) {
      const connectedIds = edges
        .filter(
          (e) =>
            e.from_id === node.facility_id || e.to_id === node.facility_id,
        )
        .map((e) =>
          e.from_id === node.facility_id ? e.to_id : e.from_id,
        );

      const alternative = connectedIds.find((altId) => {
        const altUtil =
          utilization?.facilities.find((f) => f.facility_id === altId)
            ?.utilization_pct ?? 50;
        return altUtil < 55;
      });

      if (alternative) {
        const altNode = nodes.find((n) => n.facility_id === alternative);
        optimizations.push({
          id: `opt-relocate-${node.facility_id}`,
          type: "relocate",
          description: `${node.facility_name} al ${utilPct}%. Redistribuir hacia ${altNode?.facility_name ?? "espacio alternativo"}.`,
          affected_facilities: [node.facility_id, alternative],
          expected_impact: {
            utilization_change: -20,
            revenue_change: 5,
            comfort_change: 20,
          },
          confidence: 75,
          implementation_cost: 0,
          roi_months: 1,
        });
      }
    }
  });

  // ── High affinity but no flow → Connect ──
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const affinity = getTypeAffinity(a.facility_type, b.facility_type);
      const hasEdge = edges.some(
        (e) =>
          (e.from_id === a.facility_id && e.to_id === b.facility_id) ||
          (e.from_id === b.facility_id && e.to_id === a.facility_id),
      );

      if (affinity > 0.7 && !hasEdge) {
        optimizations.push({
          id: `opt-connect-${a.facility_id}-${b.facility_id}`,
          type: "connect",
          description: `Alta afinidad entre ${a.facility_name} y ${b.facility_name} (${Math.round(affinity * 100)}%) pero sin flujo detectado. Crear señalización o paso directo.`,
          affected_facilities: [a.facility_id, b.facility_id],
          expected_impact: {
            utilization_change: 10,
            revenue_change: 8,
            comfort_change: 5,
          },
          confidence: 65,
          implementation_cost: 2_000,
          roi_months: 4,
        });
      }
    }
  }

  // ── Large facility with low versatility → Split ──
  nodes.forEach((node) => {
    const utilItem = utilization?.facilities.find(
      (f) => f.facility_id === node.facility_id,
    );
    const utilPct = utilItem?.utilization_pct ?? 50;
    const isLarge = node.max_capacity > 100;
    const isVersatile = node.personality.versatility > 60;

    if (isLarge && utilPct < 45 && isVersatile) {
      optimizations.push({
        id: `opt-split-${node.facility_id}`,
        type: "split",
        description: `${node.facility_name} (${node.max_capacity} cap) tiene alta versatilidad pero baja utilización. Dividir en 2 zones permitiría usos simultáneos.`,
        affected_facilities: [node.facility_id],
        expected_impact: {
          utilization_change: 20,
          revenue_change: 25,
          comfort_change: 10,
        },
        confidence: 60,
        implementation_cost: 15_000,
        roi_months: 8,
      });
    }
  });

  // Sort by confidence × impact, take top 8
  return optimizations
    .sort(
      (a, b) =>
        b.confidence *
          (b.expected_impact.utilization_change +
            b.expected_impact.revenue_change) -
        a.confidence *
          (a.expected_impact.utilization_change +
            a.expected_impact.revenue_change),
    )
    .slice(0, 8);
}

// ═══════════════════════════════════════════════════════════════
// §F1: buildSpatialGraph
//
// "The club is not a collection of independent spaces.
//  It's a living graph where every space is connected
//  to every other by flows of people, synergy of use,
//  and logistical dependency."
//
// Orchestrates: nodes → edges → clusters → bottlenecks → optimizations
// ═══════════════════════════════════════════════════════════════

export function buildSpatialGraph(
  facilities: Facility[],
  reservations: FacilityReservation[],
  utilization: AmenityUtilizationResponse | null,
  health: FacilityHealthResponse | null,
): SpatialGraph {
  // ── 1. Build nodes: each facility becomes a living node ──
  const nodes: SpatialNode[] = facilities.map((f) => {
    const utilItem =
      utilization?.facilities.find((u) => u.facility_id === f.id) ?? null;
    const personality = computeFacilityPersonality(
      f,
      reservations,
      utilItem,
    );

    // Health: try to match by facility name in health factors
    const healthFactor = health?.factors.find(
      (hf) =>
        hf.name.toLowerCase().includes(f.name.toLowerCase()) ||
        f.name.toLowerCase().includes(hf.name.toLowerCase()),
    );
    const healthScore = healthFactor?.score ?? 75;

    const currentOccupancy = utilItem?.current_occupancy ?? 0;
    const utilPct = utilItem?.utilization_pct ?? 0;
    const crowdLevel = classifyCrowdLevel(utilPct);

    return {
      facility_id: f.id,
      facility_name: f.name,
      facility_type: f.facility_type,
      area_sqm: FACILITY_TYPE_CONFIG[f.facility_type].default_area_sqm,
      max_capacity: f.capacity,
      position: computePosition(f, facilities),
      personality,
      health: healthScore,
      current_occupancy: currentOccupancy,
      comfort_score: healthScore, // proxy until comfort engine runs
      crowd_level: crowdLevel,
    };
  });

  // ── 2. Build edges: flow from data + synergy from type affinity ──
  const flowEdges = computeCoOccurrenceEdges(
    facilities,
    reservations,
    utilization,
  );
  const synergyEdges = computeSynergyEdges(facilities);
  const edges = mergeEdges(flowEdges, synergyEdges);

  // ── 3. Detect clusters: connected components ──
  const clusters = detectClusters(nodes, edges);

  // ── 4. Find bottlenecks: overloaded + high-flow ──
  const bottlenecks = findBottlenecks(nodes, edges);

  // ── 5. Generate optimizations: the system PROPOSES ──
  const optimization_opportunities = generateOptimizations(
    nodes,
    edges,
    utilization,
  );

  return {
    nodes,
    edges,
    clusters,
    bottlenecks,
    optimization_opportunities,
  };
}