// ═══════════════════════════════════════════════════════════
// src/features/families/components/SocialGraphRenderer.ts
// Phase 34+ Migration — Social Graph Canvas Renderer
// Level 6+ Agency · Production Grade
//
// Pure canvas rendering for social graphs.
// No React, no state, no side effects. Receives state, draws pixels.
// Extracted from SocialGraph.tsx for testability and reusability.
//
// PRE-WRITE VERIFICATION:
//   Community  → ../lib/socialTopology.ts §1  ✅
//   MemberTier → ../types.ts §6              ✅
//
// ANTI-PATTERNS REMOVED:
//   - GraphNode.tier: string → MemberTier
//   - Mutable interfaces → readonly (except physics x/y/vx/vy)
//   - nodeMap built 4× in render functions → built once in orchestrator
//   - edges.find() O(N²) per node → pre-computed edgeAdjacency Map
//   - n!.x non-null assertion → proper null check
//   - No § markers → 5 sections
//   - No PRE-WRITE → header block
//
// Architecture:
//   5-layer render pipeline (back-to-front):
//     1. Cluster hulls (convex hull with padding)
//     2. Edges (strength-colored lines)
//     3. Particles (animated along edges)
//     4. Nodes (aura + circle + initials)
//     5. Labels (angle-based positioning)
//
//   All maps (nodeMap, edgeAdjacency) computed ONCE in orchestrator
//   and passed to sub-functions. Zero redundant computation.
// ═══════════════════════════════════════════════════════════

import type { Community } from "../lib/socialTopology";
import type { MemberTier } from "../types";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Resolved CSS custom property colors for canvas rendering */
export interface ResolvedColors {
  readonly gold400: string;
  readonly emerald400: string;
  readonly amber400: string;
  readonly rose400: string;
  readonly silver500: string;
  readonly silver400: string;
  readonly silver300: string;
  readonly silver200: string;
  readonly silver100: string;
  readonly teal400: string;
  readonly teal300: string;
  readonly surface0: string;
  readonly surface1: string;
  readonly surface2: string;
  readonly surface3: string;
  readonly abyss: string;
}

/**
 * A node in the social graph — data + physics + render properties.
 *
 * NOTE: x, y, vx, vy are INTENTIONALLY mutable.
 * The force simulation engine writes directly to these fields
 * during each simulation step. All other properties are readonly.
 */
export interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly tier: MemberTier;
  readonly engagementScore: number;
  readonly memberCount: number;
  /** Physics: x position — MUTABLE (simulation writes here) */
  x: number;
  /** Physics: y position — MUTABLE (simulation writes here) */
  y: number;
  /** Physics: x velocity — MUTABLE (simulation writes here) */
  vx: number;
  /** Physics: y velocity — MUTABLE (simulation writes here) */
  vy: number;
  readonly radius: number;
  readonly color: string;
  readonly isSuggested?: boolean;
  readonly matchScore?: number;
  readonly reason?: string;
  readonly pinned?: boolean;
}

/** An edge between two graph nodes */
export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly strength: number;
  readonly relationship: string;
}

/** Complete render state passed from the hook to the renderer */
export interface RenderState {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly communities: readonly Community[];
  readonly hoveredNodeId: string | null;
  readonly narrativeNodeId: string | null;
  readonly time: number;
  readonly dpr: number;
  readonly colors: ResolvedColors;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

/** Pre-computed edge adjacency — edges grouped by node ID */
type EdgeAdjacency = ReadonlyMap<string, readonly GraphEdge[]>;

/** Internal point type for geometry calculations */
interface Point {
  readonly x: number;
  readonly y: number;
}

// ═══════════════════════════════════════════════════════════
// §2  Token Resolution + Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Resolve CSS custom properties to concrete color values for canvas.
 * getComputedStyle().getPropertyValue() returns the resolved hex
 * value when CSS vars are defined as hex.
 */
export function resolveColors(): ResolvedColors {
  const root = document.documentElement;
  const cs = getComputedStyle(root);

  const get = (name: string, fallback: string): string =>
    cs.getPropertyValue(name).trim() || fallback;

  return {
    gold400: get("--color-gold-400", "#C9A96E"),
    emerald400: get("--color-emerald-400", "#3DAA70"),
    amber400: get("--color-amber-400", "#D4A840"),
    rose400: get("--color-rose-400", "#E85D6E"),
    silver500: get("--color-silver-500", "#5C6978"),
    silver400: get("--color-silver-400", "#8A95A5"),
    silver300: get("--color-silver-300", "#B8C0CC"),
    silver200: get("--color-silver-200", "#D8DCE4"),
    silver100: get("--color-silver-100", "#F0F2F5"),
    teal400: get("--color-teal-400", "#2A9AB5"),
    teal300: get("--color-teal-300", "#52C3D8"),
    surface0: get("--color-surface-0", "#0D1117"),
    surface1: get("--color-surface-1", "#151B24"),
    surface2: get("--color-surface-2", "#1C2230"),
    surface3: get("--color-surface-3", "#242C3A"),
    abyss: get("--color-abyss", "#080B12"),
  };
}

/** Convert hex color (#RRGGBB) to rgba string with custom alpha */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex; // Not a hex color — pass through
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex; // Non-hex — pass through
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Edge strength → color */
function affinityColor(strength: number, c: ResolvedColors): string {
  if (strength >= 0.7) return c.emerald400;
  if (strength >= 0.4) return c.amber400;
  return c.silver500;
}

/** Pre-compute edge adjacency map — edges grouped by node ID */
function buildEdgeAdjacency(
  edges: readonly GraphEdge[],
): EdgeAdjacency {
  const map = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (!map.has(edge.source)) map.set(edge.source, []);
    if (!map.has(edge.target)) map.set(edge.target, []);
    map.get(edge.source)!.push(edge);
    map.get(edge.target)!.push(edge);
  }
  return map;
}

/** Get the first edge connected to a node — O(1) via adjacency */
function nodeEdgeStrength(
  nodeId: string,
  adjacency: EdgeAdjacency,
): number {
  return adjacency.get(nodeId)?.[0]?.strength ?? 0.5;
}

// ═══════════════════════════════════════════════════════════
// §3  Convex Hull (Andrew's monotone chain)
// ═══════════════════════════════════════════════════════════

function convexHull(points: readonly Point[]): Point[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 2) return pts;

  const cross = (O: Point, A: Point, B: Point): number =>
    (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);

  const lower: Point[] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0
    ) {
      upper.pop();
    }
    upper.push(pts[i]);
  }

  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function padHull(hull: readonly Point[], padding: number): Point[] {
  if (hull.length === 0) return [];
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;

  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      x: p.x + (dx / dist) * padding,
      y: p.y + (dy / dist) * padding,
    };
  });
}

function drawSmoothHull(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  if (points.length < 3) {
    if (points.length === 2) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 30, 0, Math.PI * 2);
      ctx.closePath();
    }
    return;
  }

  ctx.beginPath();
  const start: Point = {
    x: (points[points.length - 1].x + points[0].x) / 2,
    y: (points[points.length - 1].y + points[0].y) / 2,
  };
  ctx.moveTo(start.x, start.y);

  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const mid: Point = {
      x: (points[i].x + next.x) / 2,
      y: (points[i].y + next.y) / 2,
    };
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════
// §4  Render Functions — 5-layer pipeline (back-to-front)
// ═══════════════════════════════════════════════════════════

type NodeMap = ReadonlyMap<string, GraphNode>;

/** Layer 1: Cluster Community Hulls */
function renderClusterHulls(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  nodeMap: NodeMap,
): void {
  const { communities, colors, time, reducedMotion } = state;
  if (communities.length === 0) return;

  for (const community of communities) {
    if (community.nodeIds.length < 2) continue;

    const memberPositions: Point[] = [];
    for (const id of community.nodeIds) {
      const node = nodeMap.get(id);
      if (node) memberPositions.push({ x: node.x, y: node.y });
    }

    if (memberPositions.length < 2) continue;

    const hull = convexHull(memberPositions);
    const padded = padHull(hull, 30);

    // Color from community (config-assigned or fallback)
    const communityColor = community.color ?? colors.teal400;
    const breathe = reducedMotion ? 0 : Math.sin(time * 0.8) * 0.02;

    drawSmoothHull(ctx, padded);
    ctx.fillStyle = hexToRgba(communityColor, 0.04 + breathe);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(communityColor, 0.15);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Community label at centroid
    const cx =
      memberPositions.reduce((s, p) => s + p.x, 0) / memberPositions.length;
    const cy =
      memberPositions.reduce((s, p) => s + p.y, 0) / memberPositions.length;
    const maxOffset = Math.max(
      ...memberPositions.map((p) => Math.abs(p.y - cy)),
    );

    ctx.font = '10px "DM Sans", sans-serif';
    ctx.fillStyle = hexToRgba(communityColor, 0.5);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(community.name, cx, cy - maxOffset - 20);
  }
}

/** Layer 2: Edges (strength-colored lines) */
function renderEdges(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  nodeMap: NodeMap,
): void {
  const { edges, hoveredNodeId, narrativeNodeId, colors } = state;

  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    const isHighlighted =
      hoveredNodeId === edge.source ||
      hoveredNodeId === edge.target ||
      narrativeNodeId === edge.source ||
      narrativeNodeId === edge.target;

    const color = affinityColor(edge.strength, colors);
    const alpha = isHighlighted ? 0.6 : 0.12 + edge.strength * 0.15;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = hexToRgba(color, alpha);
    ctx.lineWidth = 1 + edge.strength * 2;
    ctx.stroke();

    // Relationship label on highlight
    if (isHighlighted && edge.relationship) {
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillStyle = hexToRgba(colors.silver300, 0.7);
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(edge.relationship, midX, midY - 6);
    }
  }
}

/** Layer 3: Living Particles (animated along edges) */
function renderParticles(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  nodeMap: NodeMap,
): void {
  if (state.reducedMotion) return;

  const { edges, time, colors } = state;

  for (const edge of edges) {
    if (edge.strength < 0.15) continue;

    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    const speed = 0.12 + edge.strength * 0.18;
    const count = edge.strength > 0.5 ? 3 : 2;
    const color = affinityColor(edge.strength, colors);

    for (let i = 0; i < count; i++) {
      const offset = i / count;
      const pos = ((time * speed + offset) % 1 + 1) % 1;

      const x = source.x + (target.x - source.x) * pos;
      const y = source.y + (target.y - source.y) * pos;

      // Fade at endpoints
      const fade = Math.min(pos, 1 - pos) * 4;
      const alpha = Math.min(1, fade) * 0.5;

      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.fill();
    }
  }
}

/** Layer 4: Nodes (aura + circle + initials) */
function renderNodes(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  _nodeMap: NodeMap,
  edgeAdj: EdgeAdjacency,
): void {
  const {
    hoveredNodeId,
    narrativeNodeId,
    time,
    colors,
    reducedMotion,
    nodes,
  } = state;
  const centerNode = nodes[0];

  for (const node of nodes) {
    const isHovered = hoveredNodeId === node.id;
    const isNarrative = narrativeNodeId === node.id;
    const isCenter = node === centerNode;
    const isActive = isHovered || isNarrative;

    // Aura
    if (isCenter) {
      const breathe = reducedMotion ? 0.5 : Math.sin(time * 1.0) * 0.5 + 0.5;
      const auraRadius = node.radius + 20 + breathe * 14;
      const gradient = ctx.createRadialGradient(
        node.x,
        node.y,
        node.radius * 0.2,
        node.x,
        node.y,
        auraRadius,
      );
      gradient.addColorStop(
        0,
        hexToRgba(colors.gold400, 0.3 + breathe * 0.4),
      );
      gradient.addColorStop(
        0.35,
        hexToRgba(colors.gold400, (0.3 + breathe * 0.4) * 0.3),
      );
      gradient.addColorStop(1, hexToRgba(colors.gold400, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, auraRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    } else if (!node.isSuggested) {
      const edgeColor = affinityColor(
        nodeEdgeStrength(node.id, edgeAdj),
        colors,
      );
      const auraRadius = node.radius + 12;
      const gradient = ctx.createRadialGradient(
        node.x,
        node.y,
        node.radius * 0.4,
        node.x,
        node.y,
        auraRadius,
      );
      gradient.addColorStop(0, hexToRgba(edgeColor, isActive ? 0.2 : 0.1));
      gradient.addColorStop(1, hexToRgba(edgeColor, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, auraRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Shadow for active/center
    if (isActive || isCenter) {
      ctx.shadowColor = hexToRgba(colors.abyss, 0.3);
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
    }

    // Node circle
    const drawRadius = isActive ? node.radius + 3 : node.radius;
    ctx.beginPath();
    ctx.arc(node.x, node.y, drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = isCenter ? colors.surface3 : colors.surface2;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Border
    if (isCenter) {
      ctx.strokeStyle = colors.gold400;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (node.isSuggested) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = hexToRgba(colors.teal400, 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const edgeColor = affinityColor(
        nodeEdgeStrength(node.id, edgeAdj),
        colors,
      );
      ctx.strokeStyle = hexToRgba(edgeColor, isActive ? 0.9 : 0.6);
      ctx.lineWidth = isActive ? 2 : 1.5;
      ctx.stroke();
    }

    // Active ring
    if (isActive && !isCenter) {
      ctx.strokeStyle = hexToRgba(colors.gold400, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Initials
    const initials = node.label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");

    ctx.font = `bold ${isCenter ? 14 : 11}px "DM Mono", monospace`;
    ctx.fillStyle = isCenter ? colors.gold400 : colors.silver200;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, node.x, node.y);
  }
}

/** Layer 5: Labels (angle-based positioning) */
function renderLabels(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  _nodeMap: NodeMap,
  _edgeAdj: EdgeAdjacency,
): void {
  const {
    hoveredNodeId,
    narrativeNodeId,
    colors,
    height,
    width,
    nodes,
  } = state;
  const centerNode = nodes[0];

  for (const node of nodes) {
    const isCenter = node === centerNode;
    const isActive =
      hoveredNodeId === node.id || narrativeNodeId === node.id;

    // Truncate label to fit max width
    const maxW = 110;
    let label = node.label;
    ctx.font = '11px "DM Sans", sans-serif';
    if (ctx.measureText(label).width > maxW) {
      while (
        ctx.measureText(label + "\u2026").width > maxW &&
        label.length > 3
      ) {
        label = label.slice(0, -1);
      }
      label += "\u2026";
    }

    if (isCenter) {
      ctx.fillStyle = hexToRgba(colors.gold400, 0.8);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, node.x, node.y + node.radius + 14);
    } else {
      const angleFromCenter = Math.atan2(
        node.y - height / 2,
        node.x - width / 2,
      );
      const gap = node.radius + 14;
      let lx: number;
      let ly: number;
      let align: CanvasTextAlign;
      let baseline: CanvasTextBaseline;

      if (Math.abs(angleFromCenter) < Math.PI / 4) {
        lx = node.x + gap;
        ly = node.y;
        align = "left";
        baseline = "middle";
      } else if (
        angleFromCenter >= Math.PI / 4 &&
        angleFromCenter < (3 * Math.PI) / 4
      ) {
        lx = node.x;
        ly = node.y + gap;
        align = "center";
        baseline = "top";
      } else if (
        angleFromCenter <= -Math.PI / 4 &&
        angleFromCenter > -(3 * Math.PI) / 4
      ) {
        lx = node.x;
        ly = node.y - gap;
        align = "center";
        baseline = "bottom";
      } else {
        lx = node.x - gap;
        ly = node.y;
        align = "right";
        baseline = "middle";
      }

      ctx.fillStyle = isActive
        ? hexToRgba(colors.silver200, 0.9)
        : hexToRgba(colors.silver400, 0.6);
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(label, lx, ly);

      if (node.isSuggested) {
        ctx.font = '9px "DM Sans", sans-serif';
        ctx.fillStyle = hexToRgba(colors.teal400, 0.5);
        const subLy =
          baseline === "top"
            ? ly + 12
            : baseline === "bottom"
              ? ly - 11
              : ly + 12;
        ctx.fillText("sugerido", lx, subLy);
      }
    }
  }

  ctx.textBaseline = "alphabetic";
}

// ═══════════════════════════════════════════════════════════
// §5  Main Render — Orchestrator
// ═══════════════════════════════════════════════════════════

/**
 * Render the complete social graph on a canvas context.
 *
 * 5-layer pipeline (back-to-front):
 *   1. Cluster hulls — convex hull with community coloring
 *   2. Edges — strength-colored lines with labels on hover
 *   3. Particles — animated dots flowing along edges
 *   4. Nodes — aura + circle + initials
 *   5. Labels — angle-based positioning with truncation
 *
 * Computes nodeMap and edgeAdjacency ONCE and passes to all layers.
 * Zero redundant computation across layers.
 *
 * @param ctx - Canvas 2D rendering context
 * @param state - Complete render state from the hook
 */
export function renderSocialGraph(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
): void {
  ctx.save();
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.clearRect(0, 0, state.width, state.height);

  // Build lookup structures ONCE for all layers
  const nodeMap: NodeMap = new Map(
    state.nodes.map((n) => [n.id, n]),
  );
  const edgeAdj = buildEdgeAdjacency(state.edges);

  // Layer 1 → 5: back-to-front
  renderClusterHulls(ctx, state, nodeMap);
  renderEdges(ctx, state, nodeMap);
  renderParticles(ctx, state, nodeMap);
  renderNodes(ctx, state, nodeMap, edgeAdj);
  renderLabels(ctx, state, nodeMap, edgeAdj);

  ctx.restore();
}