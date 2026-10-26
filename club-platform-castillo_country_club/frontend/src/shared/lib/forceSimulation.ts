// ═══════════════════════════════════════════════════════════
// src/shared/lib/forceSimulation.ts
// Phase 34+ Migration — Force Simulation Engine
// Level 6+ Agency · Production Grade
//
// Reusable physics engine for graph layouts.
// Pure functions, no canvas dependency, no React.
// Used by: SocialGraph, future Member Network, Event Graph.
//
// PRE-WRITE VERIFICATION:
//   No external imports — self-contained shared library ✅
//
// ANTI-PATTERNS REMOVED:
//   - (item as any)._ringIndex → explicit RingItem.ringIndex
//   - Mutable ForceConfig → readonly
//   - DEFAULT_FORCE_CONFIG not as const → readonly + as const
//   - Undocumented physics mutability → JSDoc on SimNode/SimEdge
//   - radialLayout generic abuse → RingItem concrete interface
//   - No § markers → 5 sections
//   - No PRE-WRITE → header block
//
// Architecture:
//   §1  Types — simulation data structures
//   §2  Force Config — physics parameters
//   §3  Simulation Step — single-frame force calculation
//   §4  Layout Helpers — radial positioning, convergence
//   §5  Hit Testing — point-in-node detection
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/**
 * A node in the force simulation.
 *
 * NOTE: x, y, vx, vy are INTENTIONALLY mutable.
 * The simulation engine writes directly to these fields
 * during each step. This is a deliberate performance choice —
 * creating new objects per frame would cause GC pressure at 60fps.
 */
export interface SimNode {
  readonly id: string;
  /** Position x — MUTABLE (simulation writes here) */
  x: number;
  /** Position y — MUTABLE (simulation writes here) */
  y: number;
  /** Velocity x — MUTABLE (simulation writes here) */
  vx: number;
  /** Velocity y — MUTABLE (simulation writes here) */
  vy: number;
  readonly radius: number;
  /** If true, node stays at its current position */
  readonly pinned?: boolean;
}

/** An edge connecting two simulation nodes */
export interface SimEdge {
  readonly source: string;
  readonly target: string;
  /** 0-1 bond strength — affects ideal distance */
  readonly strength: number;
}

/**
 * Item with explicit ring assignment for radial layout.
 * Replaces the old `(item as any)._ringIndex` pattern.
 */
export interface RingItem {
  readonly id: string;
  /** Which concentric ring this item belongs to (0 = center) */
  readonly ringIndex: number;
}

/** Physics parameters for the force simulation */
export interface ForceConfig {
  readonly repulsion: number;
  readonly minNodeGap: number;
  readonly attraction: number;
  readonly baseEdgeDist: number;
  readonly edgeDistRange: number;
  readonly centerGravity: number;
  readonly damping: number;
  readonly edgePadding: number;
}

// ═══════════════════════════════════════════════════════════
// §2  Force Config
// ═══════════════════════════════════════════════════════════

const DEFAULT_FORCE_CONFIG: ForceConfig = {
  repulsion: 0.02,
  minNodeGap: 40,
  attraction: 0.005,
  baseEdgeDist: 120,
  edgeDistRange: 80,
  centerGravity: 0.001,
  damping: 0.92,
  edgePadding: 10,
} as const;

// ═══════════════════════════════════════════════════════════
// §3  Simulation Step — Single-frame force calculation
// ═══════════════════════════════════════════════════════════

/**
 * Run one step of the force simulation.
 *
 * Forces applied (in order):
 *   1. Repulsion — all node pairs push apart when too close
 *   2. Attraction — connected nodes pull toward ideal distance
 *   3. Center gravity — all nodes gently pulled toward center
 *   4. Velocity integration — apply velocity, damp, clamp to bounds
 *
 * @param nodes - Mutable array of simulation nodes (modified in place)
 * @param edges - Edge definitions (read only)
 * @param width - Canvas width
 * @param height - Canvas height
 * @param alpha - Simulation temperature (1 = hot, 0 = cooled)
 * @param config - Optional physics overrides
 * @returns true if simulation is still active (total movement > 0.5)
 */
export function simulationStep(
  nodes: SimNode[],
  edges: readonly SimEdge[],
  width: number,
  height: number,
  alpha: number,
  config: Partial<ForceConfig> = {},
): boolean {
  const cfg: ForceConfig = { ...DEFAULT_FORCE_CONFIG, ...config };
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let totalMovement = 0;

  // Force 1: Repulsion between all node pairs (O(n²) — acceptable for <100 nodes)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = a.radius + b.radius + cfg.minNodeGap;

      if (dist < minDist) {
        const force = (minDist - dist) * cfg.repulsion * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.pinned) {
          a.vx -= fx;
          a.vy -= fy;
        }
        if (!b.pinned) {
          b.vx += fx;
          b.vy += fy;
        }
      }
    }
  }

  // Force 2: Attraction along edges
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const idealDist =
      cfg.baseEdgeDist + (1 - edge.strength) * cfg.edgeDistRange;
    const force = (dist - idealDist) * cfg.attraction * alpha;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    if (!source.pinned) {
      source.vx += fx;
      source.vy += fy;
    }
    if (!target.pinned) {
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  // Force 3: Center gravity
  for (const node of nodes) {
    if (node.pinned) continue;
    const dx = width / 2 - node.x;
    const dy = height / 2 - node.y;
    node.vx += dx * cfg.centerGravity * alpha;
    node.vy += dy * cfg.centerGravity * alpha;
  }

  // Force 4: Velocity integration + bounds clamping
  for (const node of nodes) {
    if (node.pinned) {
      node.vx = 0;
      node.vy = 0;
      continue;
    }

    node.vx *= cfg.damping;
    node.vy *= cfg.damping;
    node.x += node.vx;
    node.y += node.vy;

    const pad = node.radius + cfg.edgePadding;
    node.x = Math.max(pad, Math.min(width - pad, node.x));
    node.y = Math.max(pad, Math.min(height - pad, node.y));

    totalMovement += Math.abs(node.vx) + Math.abs(node.vy);
  }

  return totalMovement > 0.5;
}

// ═══════════════════════════════════════════════════════════
// §4  Layout Helpers — Radial positioning, convergence
// ═══════════════════════════════════════════════════════════

/**
 * Position items in concentric rings around a center point.
 *
 * @param items - Items with explicit ring assignments
 * @param centerId - ID of the center item (ring 0)
 * @param width - Canvas width
 * @param height - Canvas height
 * @param ringRadii - Radius for each ring index (ringRadii[0] ignored, center is at 0,0)
 * @returns Map of item ID → { x, y } position
 *
 * @example
 * const positions = radialLayout(
 *   [
 *     { id: "a", ringIndex: 0 },
 *     { id: "b", ringIndex: 1 },
 *     { id: "c", ringIndex: 1 },
 *     { id: "d", ringIndex: 2 },
 *   ],
 *   "a", 600, 400, [0, 120, 200]
 * );
 */
export function radialLayout(
  items: readonly RingItem[],
  centerId: string,
  width: number,
  height: number,
  ringRadii: readonly number[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cx = width / 2;
  const cy = height / 2;

  // Center node at canvas center
  positions.set(centerId, { x: cx, y: cy });

  // Group items by ring index (skip center)
  const rings = new Map<number, RingItem[]>();
  for (const item of items) {
    if (item.id === centerId) continue;
    const ringIdx = item.ringIndex;
    if (!rings.has(ringIdx)) rings.set(ringIdx, []);
    rings.get(ringIdx)!.push(item);
  }

  // Position items evenly around each ring
  for (const [ringIdx, ringItems] of rings) {
    const radius = ringRadii[ringIdx] ?? ringRadii[ringRadii.length - 1] ?? 120;
    const angleStep = (2 * Math.PI) / Math.max(ringItems.length, 1);

    ringItems.forEach((item, i) => {
      const angle = angleStep * i - Math.PI / 2;
      positions.set(item.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });
  }

  return positions;
}

/**
 * Run the simulation to completion synchronously.
 * Used for `prefers-reduced-motion: reduce` and SSR layout.
 *
 * @param nodes - Mutable simulation nodes (modified in place)
 * @param edges - Edge definitions
 * @param width - Canvas width
 * @param height - Canvas height
 * @param maxSteps - Maximum simulation steps before forced stop
 * @param config - Optional physics overrides
 */
export function runToCompletion(
  nodes: SimNode[],
  edges: readonly SimEdge[],
  width: number,
  height: number,
  maxSteps = 200,
  config?: Partial<ForceConfig>,
): void {
  for (let i = 0; i < maxSteps; i++) {
    const alpha = 1 - i / maxSteps;
    const active = simulationStep(
      nodes,
      edges,
      width,
      height,
      alpha,
      config,
    );
    if (!active) break;
  }
}

// ═══════════════════════════════════════════════════════════
// §5  Hit Testing — Point-in-node detection
// ═══════════════════════════════════════════════════════════

/**
 * Find the node under a point (e.g., mouse position).
 * Returns the first matching node or null.
 *
 * @param nodes - Nodes to test against
 * @param px - Point x coordinate
 * @param py - Point y coordinate
 * @param padding - Extra hit area around node radius
 */
export function hitTestNode<T extends SimNode>(
  nodes: readonly T[],
  px: number,
  py: number,
  padding = 4,
): T | null {
  for (const node of nodes) {
    const dx = px - node.x;
    const dy = py - node.y;
    if (Math.sqrt(dx * dx + dy * dy) <= node.radius + padding) {
      return node;
    }
  }
  return null;
}