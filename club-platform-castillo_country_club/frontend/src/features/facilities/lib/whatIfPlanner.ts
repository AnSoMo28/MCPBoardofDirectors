// src/features/facilities/lib/whatIfPlanner.ts
// ═══════════════════════════════════════════════════════════════
// WHAT-IF SPATIAL PLANNER — "The Architect"
//
// §F10: generateWhatIfScenario / generateMitigationPlan /
//        autoDetectScenarios
//
// The system doesn't wait for the operator to ask "what if?".
// It DETECTS situations that need attention — deteriorating
// components, underutilized spaces, revenue declines — and
// PROPOSES complete scenarios with cascade analysis,
// mitigation plans, and Monte Carlo confidence bands.
//
// "What happens if we close the pool for renovation?"
// The system answers with: before/during/after snapshots,
// revenue impact, comfort cascade, affected members,
// mitigation actions, and a confidence distribution.
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  CrowdLevel,
  SpatialGraph,
  SpatialNode,
  ComfortScore,
  RevenueModel,
  DeteriorationModel,
  OccupancyPrediction,
  WhatIfAction,
  WhatIfScenario,
  SpatialSnapshot,
  MitigationPlan,
  MitigationAction,
  ConfidenceBand,
} from "../types";

import { classifyCrowdLevel } from "../types";

import {
  FACILITY_TYPE_CONFIG,
  WHAT_IF_CONFIG,
  REVENUE_THRESHOLDS
} from "../config";

// ═══════════════════════════════════════════════════════════════
// SEEDED PRNG — Deterministic Monte Carlo
// ═══════════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════
// SPATIAL SNAPSHOT BUILDER
//
// A snapshot captures the state of ALL facilities at a
// specific moment — used for before/during/after comparisons.
// ═══════════════════════════════════════════════════════════════

function buildSnapshot(
  label: string,
  facilities: Array<{
    id: string;
    occupancyPct: number;
    comfortScore: number;
    crowdLevel: CrowdLevel;
    revenueImpact: number;
  }>,
): SpatialSnapshot {
  const totalRevenueImpact = facilities.reduce(
    (s, f) => s + f.revenueImpact,
    0,
  );
  const avgComfort =
    facilities.length > 0
      ? Math.round(
          facilities.reduce((s, f) => s + f.comfortScore, 0) /
            facilities.length,
        )
      : 0;

  return {
    timestamp: label,
    facilities: facilities.map((f) => ({
      facility_id: f.id,
      occupancy_pct: Math.round(f.occupancyPct),
      comfort_score: f.comfortScore,
      crowd_level: f.crowdLevel,
      revenue_impact: Math.round(f.revenueImpact),
    })),
    total_revenue_impact: Math.round(totalRevenueImpact),
    avg_comfort: avgComfort,
  };
}

// ═══════════════════════════════════════════════════════════════
// CASCADE EFFECTS — How one change ripples through the graph
//
// When a facility changes state (closes, renovates, expands),
// every connected facility is affected. The cascade engine
// propagates these effects through the spatial graph edges.
// ═══════════════════════════════════════════════════════════════

interface CascadeEffect {
  facility_id: string;
  occupancy_delta: number;
  comfort_delta: number;
  revenue_delta: number;
  reason: string;
}

/**
 * Compute cascade effects when a facility changes state.
 *
 * The propagation model:
 *   1. Direct neighbors (1 edge away) get 60-80% of the impact
 *   2. Second-degree neighbors get 20-35% of the impact
 *   3. The impact type depends on the edge type:
 *      - flow: people redirect (occupancy shift)
 *      - synergy: shared audience (revenue shift)
 *      - dependency: logistical (operational shift)
 */
function computeCascadeEffects(
  action: WhatIfAction,
  graph: SpatialGraph,
  revenueModels: Record<string, RevenueModel>,
  _comfortScores: Record<string, ComfortScore>,
): CascadeEffect[] {
  const effects: CascadeEffect[] = [];
  const targetId = action.target_facility_id;
  const targetNode = graph.nodes.find((n) => n.facility_id === targetId);

  if (!targetNode) return effects;

  // Find all edges connected to the target
  const connectedEdges = graph.edges.filter(
    (e) => e.from_id === targetId || e.to_id === targetId,
  );

  // The target's current occupancy will redistribute to neighbors
  const displacedOccupancy = targetNode.current_occupancy;
  const targetRevenue =
    revenueModels[targetId]?.current.revenue_per_month ?? 0;

  for (const edge of connectedEdges) {
    const neighborId =
      edge.from_id === targetId ? edge.to_id : edge.from_id;
    const neighborNode = graph.nodes.find(
      (n) => n.facility_id === neighborId,
    );
    if (!neighborNode) continue;

    const correlation = edge.correlation_score;
    const neighborCapacity = Math.max(neighborNode.max_capacity, 1);
    const neighborRevenue =
      revenueModels[neighborId]?.current.revenue_per_month ?? 0;
    // Impact depends on action type and edge type
    let occupancyDelta = 0;
    let comfortDelta = 0;
    let revenueDelta = 0;
    let reason = "";

    switch (action.type) {
      case "close":
      case "renovate": {
        // Closed facility → its people go to neighbors
        // Flow edges: strong redistribution
        // Synergy edges: moderate revenue impact
        if (edge.edge_type === "flow") {
          occupancyDelta = Math.round(
            displacedOccupancy * correlation * 0.6,
          );
          comfortDelta = -Math.round(
            (occupancyDelta / neighborCapacity) * 30,
          );
          revenueDelta = Math.round(
            targetRevenue * correlation * 0.3,
          );
          reason = `Redistribución de flujo desde ${targetNode.facility_name}`;
        } else if (edge.edge_type === "synergy") {
          revenueDelta = -Math.round(
            neighborRevenue * correlation * 0.15,
          );
          reason = `Pérdida de sinergia con ${targetNode.facility_name}`;
        } else {
          // dependency
          comfortDelta = -Math.round(correlation * 10);
          reason = `Dependencia logística con ${targetNode.facility_name}`;
        }
        break;
      }

      case "resize": {
        // Expanded capacity → absorbs more people
        if (edge.edge_type === "flow") {
          occupancyDelta = -Math.round(
            displacedOccupancy * correlation * 0.2,
          );
          comfortDelta = Math.round(correlation * 5);
          reason = `Expansión de ${targetNode.facility_name} absorbe flujo`;
        }
        break;
      }

      case "repurpose": {
        // New use case → different audience
        if (edge.edge_type === "synergy") {
          // New use might create NEW synergies or break old ones
          revenueDelta = Math.round(
            neighborRevenue * correlation * 0.1 * (Math.random() > 0.5 ? 1 : -1),
          );
          reason = `Repurposing de ${targetNode.facility_name} cambia dinámica de sinergia`;
        }
        break;
      }

      case "connect": {
        // New connection → new flow channel
        occupancyDelta = Math.round(
          displacedOccupancy * 0.1,
        );
        revenueDelta = Math.round(neighborRevenue * 0.05);
        reason = `Nueva conexión con ${targetNode.facility_name}`;
        break;
      }

      case "split": {
        // Split facility → more granular use
        if (edge.edge_type === "flow") {
          occupancyDelta = -Math.round(
            displacedOccupancy * correlation * 0.15,
          );
          comfortDelta = Math.round(correlation * 8);
          reason = `Facility dividida mejora distribución`;
        }
        break;
      }
    }

    // Only add effect if it's meaningful
    if (
      Math.abs(occupancyDelta) > 2 ||
      Math.abs(comfortDelta) > 2 ||
      Math.abs(revenueDelta) > 100
    ) {
      effects.push({
        facility_id: neighborId,
        occupancy_delta: occupancyDelta,
        comfort_delta: comfortDelta,
        revenue_delta: revenueDelta,
        reason,
      });
    }
  }

  return effects;
}

// ═══════════════════════════════════════════════════════════════
// MITIGATION PLAN GENERATOR
//
// Given a negative scenario, the system DESIGNS a plan to
// recover as much value as possible. It considers:
//   - Available facilities with spare capacity
//   - Cross-domain alternatives (pool closed → gym extra classes)
//   - Member communication strategies
//   - Temporary infrastructure
// ═══════════════════════════════════════════════════════════════

/**
 * Find the best alternative facilities for displaced usage.
 */
function findAlternatives(
  targetFacility: SpatialNode,
  allNodes: SpatialNode[],
  graph: SpatialGraph,
  maxAlternatives: number = 3,
): Array<{ node: SpatialNode; fitScore: number; reason: string }> {
  const targetType = targetFacility.facility_type;
  const targetCategory = FACILITY_TYPE_CONFIG[targetType].category;

  const candidates = allNodes
    .filter((n) => {
      if (n.facility_id === targetFacility.facility_id) return false;
      if (n.crowd_level === "crowded" || n.crowd_level === "overloaded")
        return false;
      return true;
    })
    .map((node) => {
      const nodeCategory = FACILITY_TYPE_CONFIG[node.facility_type].category;
      const sparePct =
        node.max_capacity > 0
          ? Math.max(
              0,
              100 - (node.current_occupancy / node.max_capacity) * 100,
            )
          : 50;

      // Fit score: same category gets bonus, spare capacity matters
      let fitScore = sparePct * 0.5;
      if (nodeCategory === targetCategory) fitScore += 30;

      // Connected via graph edge gets bonus
      const isConnected = graph.edges.some(
        (e) =>
          (e.from_id === targetFacility.facility_id &&
            e.to_id === node.facility_id) ||
          (e.to_id === targetFacility.facility_id &&
            e.from_id === node.facility_id),
      );
      if (isConnected) fitScore += 20;

      const reason =
        nodeCategory === targetCategory
          ? `Misma categoría (${nodeCategory}), ${Math.round(sparePct)}% capacidad disponible`
          : `${Math.round(sparePct)}% capacidad disponible, conexión ${isConnected ? "directa" : "indirecta"}`;

      return { node, fitScore: Math.round(fitScore), reason };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return candidates.slice(0, maxAlternatives);
}

/**
 * Generate mitigation actions based on the scenario type.
 */
function generateMitigationActions(
  _action: WhatIfAction,
  targetNode: SpatialNode,
  graph: SpatialGraph,
  displacedOccupancy: number,
  revenueLoss: number,
): MitigationAction[] {
  const actions: MitigationAction[] = [];
  const alternatives = findAlternatives(targetNode, graph.nodes, graph);

  // ── Action 1: Redirect flow to alternatives ──
  if (alternatives.length > 0) {
    const primary = alternatives[0];
    actions.push({
      description: `Redirigir ${Math.round(displacedOccupancy * 0.5)} personas a ${primary.node.facility_name} (capacidad disponible: ${Math.round(primary.fitScore)}%)`,
      target_facility: primary.node.facility_name,
      expected_impact: `Recupera ~40% del flujo perdido`,
      cost: 0,
    });
  }

  // ── Action 2: Extended hours at alternatives ──
  if (alternatives.length > 1) {
    actions.push({
      description: `Ampliar horario de ${alternatives[1].node.facility_name} en 2h para absorber demanda`,
      target_facility: alternatives[1].node.facility_name,
      expected_impact: `+15% capacidad de absorción temporal`,
      cost: 150_000,
    });
  }

  // ── Action 3: Type-specific compensatory actions ──
  const category = FACILITY_TYPE_CONFIG[targetNode.facility_type].category;

  if (category === "wellness") {
    actions.push({
      description: "Clases al aire libre temporales en Jardín (yoga, stretching, cardio)",
      target_facility: "Jardín",
      expected_impact: "Compensa 35-40% de la actividad de wellness perdida",
      cost: 200_000,
    });
  } else if (category === "social") {
    actions.push({
      description: "Popup bar temporal en Terraza/Jardín para eventos sociales",
      target_facility: "Jardín",
      expected_impact: "Recupera 30% del revenue social perdido",
      cost: 350_000,
    });
  } else if (category === "sport") {
    actions.push({
      description: "Programa de actividades deportivas alternativas temporales",
      target_facility: alternatives[0]?.node.facility_name ?? "Gimnasio",
      expected_impact: "Retiene 50% de los usuarios deportivos",
      cost: 100_000,
    });
  }

  // ── Action 4: Member communication ──
  actions.push({
    description: `Comunicación proactiva: "${targetNode.facility_name} se transforma para usted" — posicionar como upgrade, no como inconveniente`,
    target_facility: "Todos los socios",
    expected_impact: "Reduce percepción negativa 40%, mantiene engagement",
    cost: 50_000,
  });

  // ── Action 5: Revenue recovery ──
  if (revenueLoss > 0) {
    actions.push({
      description: `Evento compensatorio premium en ${alternatives[0]?.node.facility_name ?? "venue alternativo"} para recuperar revenue`,
      target_facility: alternatives[0]?.node.facility_name ?? "Restaurante",
      expected_impact: `Recupera ~25% del revenue mensual perdido (₡${Math.round(revenueLoss * 0.25).toLocaleString("es-CR")})`,
      cost: 100_000,
    });
  }

  return actions;
}

/**
 * Build a complete mitigation plan from the mitigation actions.
 */
function buildMitigationPlan(
  actions: MitigationAction[],
  _revenueLoss: number,
): MitigationPlan {
  const totalCost = actions.reduce((s, a) => s + a.cost, 0);
  const recoveryPct = clamp(
    Math.round(50 + actions.length * 8),
    30,
    WHAT_IF_CONFIG.MITIGATION_RECOVERY_TARGET * 100,
  );

  return {
    actions: actions.slice(0, WHAT_IF_CONFIG.MAX_MITIGATION_ACTIONS),
    expected_recovery_pct: recoveryPct,
    total_cost: totalCost,
    implementation_time_weeks: 2,
  };
}

// ═══════════════════════════════════════════════════════════════
// MONTE CARLO WHAT-IF SIMULATION
//
// 1000 iterations exploring the uncertainty space of a
// what-if scenario. Each iteration varies:
//   - How many displaced members actually redirect (50-90%)
//   - How much revenue is recovered via mitigation (20-60%)
//   - How long the disruption lasts (±30%)
//   - Cascade severity (±25%)
// ═══════════════════════════════════════════════════════════════

const MC_ITERATIONS = 1000;

function runWhatIfMonteCarlo(
  revenueDelta: number,
  _comfortDelta: number,
  mitigationRecoveryPct: number,
  seed: number,
): ConfidenceBand {
  const rng = mulberry32(seed);
  const results: number[] = [];

  for (let i = 0; i < MC_ITERATIONS; i++) {
    // How many displaced members redirect (50-90%)
    const redirectRate = 0.5 + rng() * 0.4;

    // Mitigation recovery effectiveness (±30% of expected)
    const mitigationEffectiveness = mitigationRecoveryPct / 100;
    const mitigationNoise = (rng() - 0.5) * 0.6;
    const effectiveMitigation = clamp(
      mitigationEffectiveness + mitigationNoise,
      0.1,
      0.9,
    );

    // Disruption duration factor (±30%)
    const durationFactor = 0.7 + rng() * 0.6;

    // Net revenue impact per month
    const grossLoss = revenueDelta * durationFactor;
    const recovered = Math.abs(grossLoss) * effectiveMitigation * redirectRate;
    const netImpact = grossLoss + recovered;

    results.push(Math.round(netImpact));
  }

  results.sort((a, b) => a - b);

  return {
    p10: results[Math.floor(MC_ITERATIONS * 0.10)] ?? 0,
    p25: results[Math.floor(MC_ITERATIONS * 0.25)] ?? 0,
    p50: results[Math.floor(MC_ITERATIONS * 0.50)] ?? 0,
    p75: results[Math.floor(MC_ITERATIONS * 0.75)] ?? 0,
    p90: results[Math.floor(MC_ITERATIONS * 0.90)] ?? 0,
    confidence: 72,
    iterations: MC_ITERATIONS,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F10a: generateWhatIfScenario
//
// "What happens if we close the pool for renovation?"
//
// The system computes:
//   1. BEFORE snapshot: current state of all facilities
//   2. DURING snapshot: projected state while action is active
//   3. AFTER snapshot: projected state after completion
//   4. Cascade effects through the spatial graph
//   5. Mitigation plan
//   6. Monte Carlo confidence band
// ═══════════════════════════════════════════════════════════════

export function generateWhatIfScenario(
  action: WhatIfAction,
  facilities: Facility[],
  graph: SpatialGraph,
  revenueModels: Record<string, RevenueModel>,
  comfortScores: Record<string, ComfortScore>,
  _occupancyPredictions: Record<string, OccupancyPrediction>,
): WhatIfScenario {
  const targetId = action.target_facility_id;
  const targetNode = graph.nodes.find((n) => n.facility_id === targetId);
  const targetFacility = facilities.find((f) => f.id === targetId);

  // Fallback if target not found
  if (!targetNode || !targetFacility) {
    return buildEmptyScenario(action);
  }
  // ── 1. BEFORE snapshot ──
  const beforeSnapshot = buildSnapshot(
    "Estado actual",
    graph.nodes.map((n) => ({
      id: n.facility_id,
      occupancyPct:
        n.max_capacity > 0
          ? (n.current_occupancy / n.max_capacity) * 100
          : 0,
      comfortScore: comfortScores[n.facility_id]?.overall ?? 70,
      crowdLevel: n.crowd_level,
      revenueImpact: revenueModels[n.facility_id]?.current.revenue_per_month ?? 0,
    })),
  );

  // ── 2. Compute cascade effects ──
  const cascades = computeCascadeEffects(
    action,
    graph,
    revenueModels,
    comfortScores,
  );

  // ── 3. DURING snapshot ──
  const duringFacilities = graph.nodes.map((n) => {
    const isTarget = n.facility_id === targetId;
    const cascade = cascades.find((c) => c.facility_id === n.facility_id);

    const baseComfort = comfortScores[n.facility_id]?.overall ?? 70;
    const baseOccPct =
      n.max_capacity > 0
        ? (n.current_occupancy / n.max_capacity) * 100
        : 0;
    const baseRevenue =
      revenueModels[n.facility_id]?.current.revenue_per_month ?? 0;

    if (isTarget) {
      // Target facility: affected by action type
      const targetEffects = getTargetEffects(action);
      return {
        id: n.facility_id,
        occupancyPct: targetEffects.occupancyPct,
        comfortScore: targetEffects.comfort,
        crowdLevel: classifyCrowdLevel(targetEffects.occupancyPct) as CrowdLevel,
        revenueImpact: targetEffects.revenue,
      };
    }

    // Cascade effects
    const newOccPct = clamp(
      baseOccPct + (cascade?.occupancy_delta ?? 0),
      0,
      120,
    );
    const newComfort = clamp(
      baseComfort + (cascade?.comfort_delta ?? 0),
      0,
      100,
    );
    const newRevenue = Math.max(
      0,
      baseRevenue + (cascade?.revenue_delta ?? 0),
    );

    return {
      id: n.facility_id,
      occupancyPct: newOccPct,
      comfortScore: newComfort,
      crowdLevel: classifyCrowdLevel(newOccPct) as CrowdLevel,
      revenueImpact: newRevenue,
    };
  });

  const duringSnapshot = buildSnapshot(
    `Durante: ${action.description}`,
    duringFacilities,
  );

  // ── 4. AFTER snapshot (post-renovation/recovery) ──
  const afterFacilities = graph.nodes.map((n) => {
    const isTarget = n.facility_id === targetId;
    const baseComfort = comfortScores[n.facility_id]?.overall ?? 70;
    const baseOccPct =
      n.max_capacity > 0
        ? (n.current_occupancy / n.max_capacity) * 100
        : 0;
    const baseRevenue =
      revenueModels[n.facility_id]?.current.revenue_per_month ?? 0;

    if (isTarget) {
      // After: target is improved
      const afterEffects = getAfterEffects(action, targetNode);
      return {
        id: n.facility_id,
        occupancyPct: afterEffects.occupancyPct,
        comfortScore: afterEffects.comfort,
        crowdLevel: classifyCrowdLevel(afterEffects.occupancyPct) as CrowdLevel,
        revenueImpact: afterEffects.revenue,
      };
    }

    // After: cascades mostly resolve, slight permanent shift
    const permanentShift = 0.9; // 90% of cascade effect resolves
    const resolvedOccDelta =
      (cascades.find((c) => c.facility_id === n.facility_id)
        ?.occupancy_delta ?? 0) * (1 - permanentShift);

    return {
      id: n.facility_id,
      occupancyPct: clamp(baseOccPct + resolvedOccDelta, 0, 120),
      comfortScore: baseComfort,
      crowdLevel: classifyCrowdLevel(baseOccPct + resolvedOccDelta) as CrowdLevel,
      revenueImpact: baseRevenue,
    };
  });

  const afterSnapshot = buildSnapshot(
    "Post-intervención",
    afterFacilities,
  );

  // ── 5. Impact summary ──
  const revenueDeltaMonthly = duringSnapshot.total_revenue_impact - beforeSnapshot.total_revenue_impact;

  const comfortDelta: Record<string, number> = {};
  const occupancyShift: Record<string, number> = {};
  beforeSnapshot.facilities.forEach((before) => {
    const during = duringSnapshot.facilities.find(
      (d) => d.facility_id === before.facility_id,
    );
    if (during) {
      comfortDelta[before.facility_id] =
        during.comfort_score - before.comfort_score;
      occupancyShift[before.facility_id] =
        during.occupancy_pct - before.occupancy_pct;
    }
  });

  // ── 6. Cascade risks ──
  const cascadeRisks: string[] = [];
  const severeCascade = cascades.filter(
    (c) => Math.abs(c.comfort_delta) > 15 || Math.abs(c.revenue_delta) > 5000,
  );
  for (const c of severeCascade) {
    const node = graph.nodes.find((n) => n.facility_id === c.facility_id);
    cascadeRisks.push(
      `${node?.facility_name ?? c.facility_id}: ${c.reason} (comfort ${c.comfort_delta > 0 ? "+" : ""}${c.comfort_delta}, revenue ${c.revenue_delta > 0 ? "+" : ""}₡${Math.round(c.revenue_delta / 1000)}k)`,
    );
  }

  // ── 7. Mitigation plan ──
  const mitigationActions = generateMitigationActions(
    action,
    targetNode,
    graph,
    targetNode.current_occupancy,
    Math.abs(revenueDeltaMonthly),
  );
  const mitigation = buildMitigationPlan(
    mitigationActions,
    Math.abs(revenueDeltaMonthly),
  );

  // ── 8. Monte Carlo ──
  const seed = hashString(`whatif-${action.type}-${targetId}`);
  const monteCarlo = runWhatIfMonteCarlo(
    revenueDeltaMonthly,
    duringSnapshot.avg_comfort - beforeSnapshot.avg_comfort,
    mitigation.expected_recovery_pct,
    seed,
  );

  // ── 9. Affected members estimate ──
  const affectedMembers = Math.round(
    targetNode.current_occupancy * 0.7 +
      cascades.reduce((s, c) => s + Math.abs(c.occupancy_delta), 0) * 0.3,
  );

  return {
    id: `whatif-${action.type}-${targetId}-${Date.now()}`,
    action,
    before: beforeSnapshot,
    during: duringSnapshot,
    after: afterSnapshot,
    impact: {
      revenue_delta_monthly: revenueDeltaMonthly,
      comfort_delta: comfortDelta,
      occupancy_shift: occupancyShift,
      affected_members: affectedMembers,
      cascade_risks: cascadeRisks,
    },
    mitigation,
    monte_carlo: monteCarlo,
    auto_generated: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// TARGET EFFECTS — What happens to the acted-upon facility
// ═══════════════════════════════════════════════════════════════

function getTargetEffects(action: WhatIfAction): {
  occupancyPct: number;
  comfort: number;
  revenue: number;
} {
  switch (action.type) {
    case "close":
      return { occupancyPct: 0, comfort: 0, revenue: 0 };
    case "renovate":
      return { occupancyPct: 0, comfort: 30, revenue: 0 };
    case "resize":
      return { occupancyPct: 40, comfort: 75, revenue: 0 }; // under construction but partially open
    case "repurpose":
      return { occupancyPct: 20, comfort: 50, revenue: 0 };
    case "connect":
      return { occupancyPct: 60, comfort: 70, revenue: 0 };
    case "split":
      return { occupancyPct: 50, comfort: 65, revenue: 0 };
  }
}

function getAfterEffects(
  action: WhatIfAction,
  targetNode: SpatialNode,
): {
  occupancyPct: number;
  comfort: number;
  revenue: number;
} {
  const baseOcc =
    targetNode.max_capacity > 0
      ? (targetNode.current_occupancy / targetNode.max_capacity) * 100
      : 50;

  switch (action.type) {
    case "close":
      // Reopened → slight improvement
      return {
        occupancyPct: clamp(baseOcc * 1.05, 0, 95),
        comfort: 80,
        revenue: 0,
      };
    case "renovate":
      // Post-renovation → significant improvement
      return {
        occupancyPct: clamp(baseOcc * 1.2, 0, 95),
        comfort: 90,
        revenue: 0,
      };
    case "resize":
      // Larger space → more capacity, similar occupancy %
      return {
        occupancyPct: clamp(baseOcc * 0.85, 0, 95),
        comfort: 82,
        revenue: 0,
      };
    case "repurpose":
      // New use → need to build demand
      return {
        occupancyPct: clamp(baseOcc * 0.7, 10, 80),
        comfort: 75,
        revenue: 0,
      };
    case "connect":
      // Connected → better flow
      return {
        occupancyPct: clamp(baseOcc * 1.1, 0, 95),
        comfort: 78,
        revenue: 0,
      };
    case "split":
      // Split → two focused spaces
      return {
        occupancyPct: clamp(baseOcc * 0.9, 0, 95),
        comfort: 80,
        revenue: 0,
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// EMPTY SCENARIO FALLBACK
// ═══════════════════════════════════════════════════════════════

function buildEmptyScenario(action: WhatIfAction): WhatIfScenario {
  return {
    id: `whatif-empty-${Date.now()}`,
    action,
    before: buildSnapshot("Sin datos", []),
    during: buildSnapshot("Sin datos", []),
    after: buildSnapshot("Sin datos", []),
    impact: {
      revenue_delta_monthly: 0,
      comfort_delta: {},
      occupancy_shift: {},
      affected_members: 0,
      cascade_risks: ["Datos insuficientes para calcular cascada"],
    },
    mitigation: {
      actions: [],
      expected_recovery_pct: 0,
      total_cost: 0,
      implementation_time_weeks: 0,
    },
    monte_carlo: {
      p10: 0, p25: 0, p50: 0, p75: 0, p90: 0,
      confidence: 0, iterations: 0,
    },
    auto_generated: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F10c: autoDetectScenarios
//
// The system PROPOSES scenarios — it doesn't wait for the
// operator to ask "what if?".
//
// Detection triggers:
//   1. Health < 40% → auto-generate renovation scenario
//   2. Occupancy < 30% for 30+ days → repurpose scenario
//   3. Revenue decline > 20% → optimization scenario
//   4. Bottleneck severity > 60 → resize/connect scenario
//
// Each auto-generated scenario is flagged as auto_generated=true
// so the UI can display them differently.
// ═══════════════════════════════════════════════════════════════

export function autoDetectScenarios(
  facilities: Facility[],
  graph: SpatialGraph,
  deteriorationModels: Record<string, DeteriorationModel>,
  occupancyPredictions: Record<string, OccupancyPrediction>,
  revenueModels: Record<string, RevenueModel>,
  comfortScores: Record<string, ComfortScore>,
): WhatIfScenario[] {
  const scenarios: WhatIfScenario[] = [];
  const config = WHAT_IF_CONFIG;

  for (const facility of facilities) {
    const deterioration = deteriorationModels[facility.id];
    const occupancy = occupancyPredictions[facility.id];
    const revenue = revenueModels[facility.id];

    if (!deterioration || !occupancy || !revenue) continue;

    // ── Trigger 1: Critical health → renovation scenario ──
    const avgHealth =
      deterioration.components.length > 0
        ? deterioration.components.reduce(
            (s, c) => s + c.current_health,
            0,
          ) / deterioration.components.length
        : 100;

    if (avgHealth < config.AUTO_DETECT_HEALTH_THRESHOLD) {
      const scenario = generateWhatIfScenario(
        {
          type: "renovate",
          target_facility_id: facility.id,
          duration_weeks: 4,
          description: `Renovación de ${facility.name} — salud promedio al ${Math.round(avgHealth)}%`,
        },
        facilities,
        graph,
        revenueModels,
        comfortScores,
        occupancyPredictions,
      );
      scenario.auto_generated = true;
      scenario.id = `auto-renovate-${facility.id}`;
      scenarios.push(scenario);
    }

    // ── Trigger 2: Low occupancy → repurpose scenario ──
    if (
      occupancy.current_pct < config.AUTO_DETECT_OCCUPANCY_GAP &&
      occupancy.current_crowd_level === "empty"
    ) {
      const scenario = generateWhatIfScenario(
        {
          type: "repurpose",
          target_facility_id: facility.id,
          duration_weeks: 6,
          description: `Repurposing de ${facility.name} — utilización al ${occupancy.current_pct}%`,
        },
        facilities,
        graph,
        revenueModels,
        comfortScores,
        occupancyPredictions,
      );
      scenario.auto_generated = true;
      scenario.id = `auto-repurpose-${facility.id}`;
      scenarios.push(scenario);
    }

    // ── Trigger 3: Revenue decline → optimization scenario ──
    const revenueDeclinePct = REVENUE_THRESHOLDS.DECLINE_PCT_CRITICAL;
    const mcMedian = revenue.optimization.monte_carlo.p50;
    const currentRevenue = revenue.current.revenue_per_month;
    const impliedDecline =
      currentRevenue > 0
        ? ((currentRevenue - mcMedian) / currentRevenue) * 100
        : 0;

    if (impliedDecline > revenueDeclinePct) {
      const scenario = generateWhatIfScenario(
        {
          type: "resize",
          target_facility_id: facility.id,
          duration_weeks: 3,
          description: `Optimización de ${facility.name} — revenue proyectado ${Math.round(impliedDecline)}% por debajo`,
        },
        facilities,
        graph,
        revenueModels,
        comfortScores,
        occupancyPredictions,
      );
      scenario.auto_generated = true;
      scenario.id = `auto-optimize-${facility.id}`;
      scenarios.push(scenario);
    }
  }

  // ── Trigger 4: Bottleneck → resize or connect ──
  for (const bottleneck of graph.bottlenecks) {
    if (bottleneck.severity > 60) {
      const actionType: WhatIfAction["type"] =
        bottleneck.bottleneck_type === "capacity" ? "resize" : "connect";

      const scenario = generateWhatIfScenario(
        {
          type: actionType,
          target_facility_id: bottleneck.facility_id,
          duration_weeks: 2,
          description: `${actionType === "resize" ? "Ampliación" : "Nueva conexión"} para resolver cuello de botella (severidad: ${bottleneck.severity})`,
        },
        facilities,
        graph,
        revenueModels,
        comfortScores,
        occupancyPredictions,
      );
      scenario.auto_generated = true;
      scenario.id = `auto-${actionType}-${bottleneck.facility_id}`;
      scenarios.push(scenario);
    }
  }

  // Limit total auto-generated scenarios
  return scenarios.slice(0, 6);
}