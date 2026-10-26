// ═══════════════════════════════════════════════════════════
// src/features/families/lib/socialTopology.ts
// Phase 34+ Migration — Social Topology Engine
// Level 6+ Agency · Production Grade
//
// Pure algorithm library. No React, no Canvas, no DOM.
// Provides: centrality, bridges, communities, influence,
// isolation, velocity, health score.
//
// PRE-WRITE VERIFICATION:
//   MemberTier         → ../types.ts §6  ✅
//   TOPOLOGY_THRESHOLDS → ../config.ts    ✅ (§28)
//   StrengthSample     → local §1        ✅
//   Adjacency          → local §2        ✅ (exported for reuse)
//
// ANTI-PATTERNS REMOVED:
//   - TopoNode.tier: string → MemberTier (union literal)
//   - Mutable interfaces → readonly
//   - rank mutation post-construction → spread + assign
//   - buildAdjacency called 7× in analyzeTopology → single build, injected
//   - strengthHistory inline type → StrengthSample named type
//   - No § markers → 5 sections
//   - No JSDoc → all public exports documented
// ═══════════════════════════════════════════════════════════

import type { MemberTier } from "../types";
import { TOPOLOGY_THRESHOLDS } from "../config";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** A single strength measurement at a point in time */
export interface StrengthSample {
  readonly date: string;
  readonly value: number;
}

/** Node in the topology graph — minimal data for algorithms */
export interface TopoNode {
  readonly id: string;
  readonly label: string;
  readonly tier: MemberTier;
  readonly engagementScore: number;
  readonly memberCount: number;
}

/** Edge in the topology graph — connection between two families */
export interface TopoEdge {
  readonly source: string;
  readonly target: string;
  readonly strength: number;
  readonly relationship: string;
  readonly sharedActivities?: readonly string[];
  readonly sharedEvents?: number;
  readonly lastInteraction?: string;
  /** Strength history for velocity computation — oldest first */
  readonly strengthHistory?: readonly StrengthSample[];
}

/** Input graph for topology analysis */
export interface TopologyGraph {
  readonly nodes: readonly TopoNode[];
  readonly edges: readonly TopoEdge[];
  readonly centerId: string;
}

/** Pre-computed adjacency structure — build once, reuse across algorithms */
export interface Adjacency {
  readonly neighbors: ReadonlyMap<string, readonly { targetId: string; edge: TopoEdge }[]>;
  readonly nodeMap: ReadonlyMap<string, TopoNode>;
  readonly edgeLookup: ReadonlyMap<string, TopoEdge>;
}

/** Degree centrality result for a single node */
export interface CentralityResult {
  /** 0-1 — normalized centrality */
  readonly score: number;
  /** Rank (1 = most central) */
  readonly rank: number;
  /** Total connections */
  readonly degree: number;
  /** Weighted degree (sum of edge strengths) */
  readonly weightedDegree: number;
}

/** A bridge node connecting otherwise disconnected communities */
export interface Bridge {
  readonly nodeId: string;
  /** Representative node from each connected component */
  readonly connectsCommunities: readonly [string, string];
  /** 0-1 — how critical this bridge is (higher = more critical) */
  readonly criticality: number;
  readonly fragmentationImpact: string;
}

/** Algorithmically detected community (cluster) of families */
export interface Community {
  readonly id: string;
  readonly name: string;
  readonly nodeIds: readonly string[];
  /** 0-1 — how tightly connected the community members are */
  readonly cohesion: number;
  readonly dominantActivity?: string;
  readonly health: "growing" | "stable" | "declining";
  readonly color?: string;
}

/** Isolation state for a single node */
export interface IsolationState {
  readonly nodeId: string;
  /** 0-1 — higher = more isolated */
  readonly score: number;
  readonly activeConnections: number;
  readonly trend: "improving" | "stable" | "worsening";
  readonly daysSinceLastInteraction: number;
}

/** Social velocity — rate of change of a family's social connections */
export interface SocialVelocity {
  readonly nodeId: string;
  /** Strength change in last 30 days */
  readonly delta30d: number;
  /** Strength change in last 90 days */
  readonly delta90d: number;
  readonly trend: "accelerating" | "steady" | "decelerating" | "reversing";
  /** Connections added in last 30 days */
  readonly netNewConnections: number;
}

/** Influence propagation result from a source node */
export interface InfluenceResult {
  readonly nodeId: string;
  readonly influencedNodes: readonly string[];
  /** Total influence radius (weighted by hops + strength) */
  readonly influenceScore: number;
  readonly paths: readonly Readonly<{
    from: string;
    to: string;
    hops: number;
    cumulativeStrength: number;
  }>[];
}

/** Complete topology analysis output */
export interface TopologyAnalysis {
  readonly centralities: ReadonlyMap<string, CentralityResult>;
  readonly bridges: readonly Bridge[];
  readonly communities: readonly Community[];
  readonly isolations: ReadonlyMap<string, IsolationState>;
  readonly velocities: ReadonlyMap<string, SocialVelocity>;
  readonly influence: InfluenceResult;
  readonly networkHealth: NetworkHealth;
}

/** Overall health of the social network */
export interface NetworkHealth {
  /** 0-100 composite health score */
  readonly score: number;
  /** active edges / possible edges */
  readonly density: number;
  /** Number of disconnected components */
  readonly fragmentation: number;
  readonly avgStrength: number;
  readonly criticalBridges: number;
  readonly isolatedNodes: number;
  readonly trend: "growing" | "stable" | "contracting";
}

// ═══════════════════════════════════════════════════════════
// §2  Adjacency Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Build adjacency structure from a topology graph.
 * Call once and pass to multiple algorithms to avoid rebuilding.
 *
 * @example
 * const adj = buildAdjacency(graph);
 * const centralities = computeCentralities(graph, adj);
 * const bridges = detectBridges(graph, adj);
 */
export function buildAdjacency(graph: TopologyGraph): Adjacency {
  const neighborLists = new Map<string, { targetId: string; edge: TopoEdge }[]>();
  const nodeMap = new Map<string, TopoNode>();
  const edgeLookup = new Map<string, TopoEdge>();

  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }

  for (const edge of graph.edges) {
    edgeLookup.set(`${edge.source}::${edge.target}`, edge);
    edgeLookup.set(`${edge.target}::${edge.source}`, edge);

    if (!neighborLists.has(edge.source)) neighborLists.set(edge.source, []);
    if (!neighborLists.has(edge.target)) neighborLists.set(edge.target, []);
    neighborLists.get(edge.source)!.push({ targetId: edge.target, edge });
    neighborLists.get(edge.target)!.push({ targetId: edge.source, edge });
  }

  return {
    neighbors: neighborLists,
    nodeMap,
    edgeLookup,
  };
}

/** Look up an edge between two nodes (bidirectional) */
export function getEdge(
  adj: Adjacency,
  a: string,
  b: string,
): TopoEdge | undefined {
  return adj.edgeLookup.get(`${a}::${b}`) ?? adj.edgeLookup.get(`${b}::${a}`);
}

// ═══════════════════════════════════════════════════════════
// §3  Degree Centrality
// ═══════════════════════════════════════════════════════════

/**
 * Compute degree centrality for all nodes.
 * Centrality = degree / (n-1), normalized to 0-1.
 *
 * @param graph - The topology graph
 * @param adj - Optional pre-built adjacency (avoids rebuild)
 */
export function computeCentralities(
  graph: TopologyGraph,
  adj?: Adjacency,
): Map<string, CentralityResult> {
  const _adj = adj ?? buildAdjacency(graph);
  const maxDegree = Math.max(graph.nodes.length - 1, 1);

  const unranked: Array<{ nodeId: string; score: number; degree: number; weightedDegree: number }> = [];

  for (const node of graph.nodes) {
    const edges = _adj.neighbors.get(node.id) ?? [];
    const degree = edges.length;
    const weightedDegree = edges.reduce((sum, e) => sum + e.edge.strength, 0);
    const score = degree / maxDegree;

    unranked.push({ nodeId: node.id, score, degree, weightedDegree });
  }

  // Sort by score descending, assign rank
  unranked.sort((a, b) => b.score - a.score);

  const results = new Map<string, CentralityResult>();
  unranked.forEach((entry, i) => {
    results.set(entry.nodeId, {
      score: entry.score,
      rank: i + 1,
      degree: entry.degree,
      weightedDegree: entry.weightedDegree,
    });
  });

  return results;
}

// ═══════════════════════════════════════════════════════════
// §4  Bridge Detection
// ═══════════════════════════════════════════════════════════

/**
 * Detect bridge nodes — nodes whose removal disconnects the graph.
 * Uses component counting: remove node, count resulting components.
 *
 * @param graph - The topology graph
 * @param adj - Optional pre-built adjacency
 * @returns Bridges sorted by criticality (highest first)
 */
export function detectBridges(
  graph: TopologyGraph,
  adj?: Adjacency,
): readonly Bridge[] {
  const _adj = adj ?? buildAdjacency(graph);
  const bridges: Bridge[] = [];

  for (const node of graph.nodes) {
    if (node.id === graph.centerId) continue;

    const remainingIds = new Set(
      graph.nodes.filter((n) => n.id !== node.id).map((n) => n.id),
    );

    // BFS to count connected components after removing this node
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const start of graph.nodes) {
      if (start.id === node.id || visited.has(start.id)) continue;

      const component: string[] = [];
      const queue = [start.id];
      visited.add(start.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);

        for (const neighbor of _adj.neighbors.get(current) ?? []) {
          if (!visited.has(neighbor.targetId) && remainingIds.has(neighbor.targetId)) {
            visited.add(neighbor.targetId);
            queue.push(neighbor.targetId);
          }
        }
      }

      components.push(component);
    }

    // If removing this node splits the graph, it's a bridge
    if (components.length > 1) {
      const sizes = components.map((c) => c.length).sort((a, b) => b - a);
      const criticality = 1 - sizes[1] / sizes[0];

      bridges.push({
        nodeId: node.id,
        connectsCommunities: [components[0][0], components[1][0]],
        criticality,
        fragmentationImpact:
          `Divide la red en ${components.length} grupos (${sizes.join(", ")} familias)`,
      });
    }
  }

  return [...bridges].sort((a, b) => b.criticality - a.criticality);
}

// ═══════════════════════════════════════════════════════════
// §5  Community Detection (Label Propagation)
// ═══════════════════════════════════════════════════════════

/**
 * Detect communities using weighted label propagation.
 * Deterministic (sorted tie-breaking), no external dependencies.
 *
 * @param graph - The topology graph
 * @param adj - Optional pre-built adjacency
 * @returns Communities sorted by size (largest first)
 */
export function detectCommunities(
  graph: TopologyGraph,
  adj?: Adjacency,
): readonly Community[] {
  const _adj = adj ?? buildAdjacency(graph);
  const maxIterations = 20;

  // Initialize: each node has its own label
  const labels = new Map<string, string>();
  for (const node of graph.nodes) {
    labels.set(node.id, node.id);
  }

  // Iterate until convergence
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Process in deterministic order
    const sorted = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));

    for (const node of sorted) {
      const neighborLabels = new Map<string, number>();

      for (const neighbor of _adj.neighbors.get(node.id) ?? []) {
        const neighborLabel = labels.get(neighbor.targetId)!;
        const weight = neighbor.edge.strength;
        neighborLabels.set(
          neighborLabel,
          (neighborLabels.get(neighborLabel) ?? 0) + weight,
        );
      }

      if (neighborLabels.size === 0) continue;

      // Pick label with highest total weight (deterministic tie-break)
      let bestLabel = labels.get(node.id)!;
      let bestWeight = -1;

      for (const [label, weight] of neighborLabels) {
        if (
          weight > bestWeight ||
          (weight === bestWeight && label.localeCompare(bestLabel) < 0)
        ) {
          bestLabel = label;
          bestWeight = weight;
        }
      }

      if (bestLabel !== labels.get(node.id)) {
        labels.set(node.id, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Group nodes by label
  const groups = new Map<string, string[]>();
  for (const [nodeId, label] of labels) {
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(nodeId);
  }

  // Build community objects
  let communityIdx = 0;
  const communities: Community[] = [];

  for (const [, nodeIds] of groups) {
    const nodeIdSet = new Set(nodeIds);

    // Internal edges
    const internalEdges = graph.edges.filter(
      (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target),
    );

    // Cohesion: internal edges / possible edges
    const possibleEdges = (nodeIds.length * (nodeIds.length - 1)) / 2;
    const cohesion = possibleEdges > 0 ? internalEdges.length / possibleEdges : 0;

    // Dominant activity from shared activities in internal edges
    const activityCounts = new Map<string, number>();
    for (const edge of internalEdges) {
      for (const activity of edge.sharedActivities ?? []) {
        activityCounts.set(activity, (activityCounts.get(activity) ?? 0) + 1);
      }
    }
    const dominantActivity = [...activityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([a]) => a)[0];

    // Health from strength trend
    const avgDelta =
      internalEdges.reduce((sum, e) => {
        const history = e.strengthHistory ?? [];
        if (history.length < 2) return sum;
        return sum + (history[history.length - 1].value - history[0].value);
      }, 0) / Math.max(internalEdges.length, 1);

    const health: Community["health"] =
      avgDelta > 0.05 ? "growing" : avgDelta < -0.05 ? "declining" : "stable";

    communities.push({
      id: `community-${communityIdx++}`,
      name: "", // Named post-detection by socialNarrative.nameAllCommunities
      nodeIds,
      cohesion,
      dominantActivity,
      health,
    });
  }

  return [...communities].sort((a, b) => b.nodeIds.length - a.nodeIds.length);
}

// ═══════════════════════════════════════════════════════════
// §6  Isolation Score
// ═══════════════════════════════════════════════════════════

/**
 * Compute isolation score for all nodes.
 * Combines connectivity (active connections / possible) with
 * recency (days since last interaction).
 *
 * @param graph - The topology graph
 * @param centralities - Pre-computed centrality results
 * @param adj - Optional pre-built adjacency
 */
export function computeIsolation(
  graph: TopologyGraph,
  _centralities: ReadonlyMap<string, CentralityResult>,
  adj?: Adjacency,
): Map<string, IsolationState> {
  const _adj = adj ?? buildAdjacency(graph);
  const results = new Map<string, IsolationState>();
  const now = new Date();

  for (const node of graph.nodes) {
    const edges = _adj.neighbors.get(node.id) ?? [];
    const activeConnections = edges.filter(
      (e) => e.edge.strength > TOPOLOGY_THRESHOLDS.edgeAtRisk,
    ).length;

    // Days since last interaction across all connections
    let daysSinceLastInteraction = 999;
    for (const { edge } of edges) {
      if (edge.lastInteraction) {
        const days = Math.floor(
          (now.getTime() - new Date(edge.lastInteraction).getTime()) / 86_400_000,
        );
        daysSinceLastInteraction = Math.min(daysSinceLastInteraction, days);
      }
    }

    // Isolation score: inverse of weighted connectivity
    const maxPossible = graph.nodes.length - 1;
    const connectivity = activeConnections / Math.max(maxPossible, 1);
    const recentActivity = Math.max(0, 1 - daysSinceLastInteraction / 90);
    const score = 1 - (connectivity * 0.6 + recentActivity * 0.4);

    // Trend: compare recent vs total connections
    const recentEdges = edges.filter((e) => {
      if (!e.edge.lastInteraction) return false;
      const days = Math.floor(
        (now.getTime() - new Date(e.edge.lastInteraction).getTime()) / 86_400_000,
      );
      return days <= 30;
    });

    const trend: IsolationState["trend"] =
      recentEdges.length > edges.length * 0.3
        ? "improving"
        : recentEdges.length < edges.length * 0.1
          ? "worsening"
          : "stable";

    results.set(node.id, {
      nodeId: node.id,
      score: Math.max(0, Math.min(1, score)),
      activeConnections,
      trend,
      daysSinceLastInteraction,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// §7  Social Velocity
// ═══════════════════════════════════════════════════════════

/**
 * Compute social velocity for all nodes — rate of change
 * of social connections over 30d and 90d windows.
 *
 * @param graph - The topology graph
 * @param adj - Optional pre-built adjacency
 */
export function computeVelocity(
  graph: TopologyGraph,
  adj?: Adjacency,
): Map<string, SocialVelocity> {
  const _adj = adj ?? buildAdjacency(graph);
  const results = new Map<string, SocialVelocity>();
  const now = new Date();

  for (const node of graph.nodes) {
    const edges = _adj.neighbors.get(node.id) ?? [];

    let delta30d = 0;
    let delta90d = 0;
    let netNew = 0;

    for (const { edge } of edges) {
      const history = edge.strengthHistory ?? [];
      if (history.length < 2) continue;

      const current = history[history.length - 1].value;
      const oldest = history[0].value;

      // Find value at ~30d ago
      const val30d =
        history.find((h) => {
          const days = Math.floor(
            (now.getTime() - new Date(h.date).getTime()) / 86_400_000,
          );
          return days >= 25 && days <= 35;
        })?.value ?? oldest;

      // Find value at ~90d ago
      const val90d =
        history.find((h) => {
          const days = Math.floor(
            (now.getTime() - new Date(h.date).getTime()) / 86_400_000,
          );
          return days >= 85 && days <= 95;
        })?.value ?? oldest;

      delta30d += current - val30d;
      delta90d += current - val90d;
    }

    // Net new connections (edges that appeared in last 30 days)
    for (const edge of graph.edges) {
      if (edge.source !== node.id && edge.target !== node.id) continue;
      const history = edge.strengthHistory ?? [];
      if (history.length > 0 && history[0].value === 0) {
        const firstNonZero = history.find((h) => h.value > 0);
        if (firstNonZero) {
          const days = Math.floor(
            (now.getTime() - new Date(firstNonZero.date).getTime()) / 86_400_000,
          );
          if (days <= 30) netNew++;
        }
      }
    }

    // Trend detection
    let trend: SocialVelocity["trend"] = "steady";
    if (delta30d > 0.1 && delta30d > delta90d * 0.4) trend = "accelerating";
    else if (delta30d < -0.1 && delta30d < delta90d * 0.4) trend = "decelerating";
    else if (delta30d > 0.05) trend = "steady";
    else if (delta30d < -0.05) trend = "reversing";

    results.set(node.id, {
      nodeId: node.id,
      delta30d,
      delta90d,
      trend,
      netNewConnections: netNew,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// §8  Influence Propagation
// ═══════════════════════════════════════════════════════════

/**
 * Compute influence propagation from a source node.
 * Uses weighted BFS — influence decays by edge strength per hop.
 * Maximum hops defined by TOPOLOGY_THRESHOLDS.maxInfluenceHops.
 *
 * @param graph - The topology graph
 * @param sourceId - The node to propagate from
 * @param adj - Optional pre-built adjacency
 */
export function computeInfluence(
  graph: TopologyGraph,
  sourceId: string,
  adj?: Adjacency,
): InfluenceResult {
  const _adj = adj ?? buildAdjacency(graph);
  const maxHops = TOPOLOGY_THRESHOLDS.maxInfluenceHops;

  const visited = new Map<
    string,
    { hops: number; cumulativeStrength: number; path: string[] }
  >();
  const queue: Array<{
    nodeId: string;
    hops: number;
    cumulative: number;
    path: string[];
  }> = [
    { nodeId: sourceId, hops: 0, cumulative: 1, path: [sourceId] },
  ];
  visited.set(sourceId, { hops: 0, cumulativeStrength: 1, path: [sourceId] });

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.hops >= maxHops) continue;

    for (const neighbor of _adj.neighbors.get(current.nodeId) ?? []) {
      const nextCumulative = current.cumulative * neighbor.edge.strength;
      const existing = visited.get(neighbor.targetId);

      if (!existing || nextCumulative > existing.cumulativeStrength) {
        const newPath = [...current.path, neighbor.targetId];
        visited.set(neighbor.targetId, {
          hops: current.hops + 1,
          cumulativeStrength: nextCumulative,
          path: newPath,
        });
        queue.push({
          nodeId: neighbor.targetId,
          hops: current.hops + 1,
          cumulative: nextCumulative,
          path: newPath,
        });
      }
    }
  }

// §8  Influence Propagation — LÍNEAS AFECTADAS

  // Build results (exclude source, threshold: 0.05 meaningful influence)
  const influencedNodes: string[] = [];
  const paths: Array<{
    from: string;
    to: string;
    hops: number;
    cumulativeStrength: number;
  }> = [];

  for (const [nodeId, info] of visited) {
    if (nodeId === sourceId) continue;
    if (info.cumulativeStrength > 0.05) {
      influencedNodes.push(nodeId);
      paths.push({
        from: sourceId,
        to: nodeId,
        hops: info.hops,
        cumulativeStrength: info.cumulativeStrength,
      });
    }
  }

  const influenceScore = paths.reduce(
    (sum, p) => sum + p.cumulativeStrength,
    0,
  );

  return {
    nodeId: sourceId,
    influencedNodes,
    influenceScore,
    paths: [...paths].sort(
      (a, b) => b.cumulativeStrength - a.cumulativeStrength,
    ),
  };
}

// ═══════════════════════════════════════════════════════════
// §9  Network Health
// ═══════════════════════════════════════════════════════════

/**
 * Compute overall network health from graph structure.
 * Combines density, strength, fragmentation, isolation, and bridges
 * into a single 0-100 score.
 *
 * @param graph - The topology graph
 * @param centralities - Pre-computed centralities
 * @param bridges - Pre-detected bridges
 * @param isolations - Pre-computed isolation states
 * @param adj - Optional pre-built adjacency
 */
export function computeNetworkHealth(
  graph: TopologyGraph,
  _centralities: ReadonlyMap<string, CentralityResult>,
  bridges: readonly Bridge[],
  isolations: ReadonlyMap<string, IsolationState>,
  adj?: Adjacency,
): NetworkHealth {
  const _adj = adj ?? buildAdjacency(graph);
  const n = graph.nodes.length;
  const possibleEdges = (n * (n - 1)) / 2;
  const density = possibleEdges > 0 ? graph.edges.length / possibleEdges : 0;
  const avgStrength =
    graph.edges.length > 0
      ? graph.edges.reduce((sum, e) => sum + e.strength, 0) / graph.edges.length
      : 0;

  // Count disconnected components via BFS
  const visited = new Set<string>();
  let fragmentation = 0;

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;
    fragmentation++;
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of _adj.neighbors.get(current) ?? []) {
        if (!visited.has(neighbor.targetId)) {
          visited.add(neighbor.targetId);
          queue.push(neighbor.targetId);
        }
      }
    }
  }

  const criticalBridges = bridges.filter(
    (b) => b.criticality > TOPOLOGY_THRESHOLDS.bridgeCritical,
  ).length;

  const isolatedNodes = [...isolations.values()].filter(
    (i) => i.score > TOPOLOGY_THRESHOLDS.isolationHigh,
  ).length;

  // Composite score (0-100)
  const densityScore = Math.min(density * 10, 1) * 25;
  const strengthScore = avgStrength * 25;
  const fragmentScore = (1 - Math.min(fragmentation / n, 1)) * 25;
  const isolationPenalty = (isolatedNodes / Math.max(n, 1)) * 25;
  const bridgePenalty = Math.min(criticalBridges * 3, 15);

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        densityScore + strengthScore + fragmentScore - isolationPenalty - bridgePenalty,
      ),
    ),
  );

  // Trend from edge strength history
  const growingEdges = graph.edges.filter((e) => {
    const h = e.strengthHistory ?? [];
    return h.length >= 2 && h[h.length - 1].value > h[0].value;
  }).length;

  const decliningEdges = graph.edges.filter((e) => {
    const h = e.strengthHistory ?? [];
    return h.length >= 2 && h[h.length - 1].value < h[0].value;
  }).length;

  const trend: NetworkHealth["trend"] =
    growingEdges > decliningEdges * 1.3
      ? "growing"
      : decliningEdges > growingEdges * 1.3
        ? "contracting"
        : "stable";

  return {
    score,
    density,
    fragmentation,
    avgStrength,
    criticalBridges,
    isolatedNodes,
    trend,
  };
}

// ═══════════════════════════════════════════════════════════
// §10  Full Analysis — Orchestrate all algorithms
// ═══════════════════════════════════════════════════════════

/**
 * Run complete topology analysis on a social graph.
 * Single entry point for hooks, MCP tools, and components.
 *
 * Builds adjacency ONCE and passes it to all sub-algorithms
 * to avoid redundant computation.
 *
 * @param graph - The topology graph to analyze
 * @returns Complete analysis with centrality, bridges, communities,
 *          isolation, velocity, influence, and network health
 *
 * @example
 * const graph = buildTopologyGraph(familyId, name, connections);
 * const analysis = analyzeTopology(graph);
 * console.log(analysis.networkHealth.score); // 0-100
 * console.log(analysis.communities.length);  // number of clusters
 * console.log(analysis.bridges[0]?.nodeId);  // most critical bridge
 */
export function analyzeTopology(graph: TopologyGraph): TopologyAnalysis {
  // Build adjacency once — reuse across all algorithms
  const adj = buildAdjacency(graph);

  const centralities = computeCentralities(graph, adj);
  const bridges = detectBridges(graph, adj);
  const communities = detectCommunities(graph, adj);
  const isolations = computeIsolation(graph, centralities, adj);
  const velocities = computeVelocity(graph, adj);
  const influence = computeInfluence(graph, graph.centerId, adj);
  const networkHealth = computeNetworkHealth(
    graph,
    centralities,
    bridges,
    isolations,
    adj,
  );

  return {
    centralities,
    bridges,
    communities,
    isolations,
    velocities,
    influence,
    networkHealth,
  };
}