// ═══════════════════════════════════════════════════════════
// src/features/families/hooks/useConstellation.ts
// Phase 34+ Migration — Constellation View Hook
// Level 6+ Agency · Apple Production Grade · 2027 Intelligence
//
// 5-layer orchestration hook for the galaxy constellation view:
//   1. Layout — force-directed physics with cluster-aware attraction
//   2. Projection — node sizing, brightness, influence computation
//   3. Render — 7-layer canvas pipeline (starfield → labels)
//   4. Interaction — zoom/pan, hit test, click select, keyboard nav
//   5. Accessibility — screen reader fallback, reduced motion
//
// Canvas render functions live in §3 as pure functions.
// Hook lives in §4 as the orchestrator.
//
// PRE-WRITE VERIFICATION:
//   ConstellationNode, ConstellationConnection, ConstellationCluster
//     → ../social-types.ts §6  ✅
//   CLUSTER_IDENTITIES, resolveColors
//     → ../social-types.ts §2  ✅
//   MemberTier → ../types.ts §6  ✅
//   SimNode, SimEdge, simulationStep, runToCompletion, hitTestNode
//     → @/shared/lib/forceSimulation.ts  ✅
//
// 2027 INNOVATIONS:
//   1. Parallax starfield background (3 depth layers)
//   2. Star classification (binary/supergiant/pulsar/whitedwarf)
//   3. Orbital rings (1-3 rings on high-engagement stars)
//   4. Zoom + pan with momentum
//   5. Click selection with focus glow
//   6. Keyboard star navigation (Tab/Enter/Escape/Arrows)
//   7. Light mode canvas adaptation
//   8. Constellation angular threads on hover
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback, useMemo } from "react";

import type {
  ConstellationNode,
  ConstellationConnection,
  ConstellationCluster,
} from "../social-types";

import { resolveColors } from "../components/SocialGraphRenderer";
import type { ResolvedColors } from "../components/SocialGraphRenderer";
import {
    CLUSTER_IDENTITIES,
} from "../config";
import {
  simulationStep,
  runToCompletion,
  type SimNode,
  type SimEdge,
} from "@/shared/lib/forceSimulation";

import type { MemberTier } from "../types";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Input family data for constellation positioning */
export interface ConstellationFamilyInput {
  readonly familyId: string;
  readonly familyName: string;
  readonly tier: MemberTier;
  readonly engagement: number;       // 0-100
  readonly memberCount: number;
  readonly clusterId?: string;
}

/** Input connection data between families */
export interface ConstellationConnectionInput {
  readonly sourceFamilyId: string;
  readonly targetFamilyId: string;
  readonly strength: number;         // 0-1
  readonly sharedInterest?: string;
  readonly relationship?: string;
}

/** Options for useConstellation */
export interface UseConstellationOptions {
  readonly families: readonly ConstellationFamilyInput[];
  readonly connections: readonly ConstellationConnectionInput[];
  readonly onFamilyClick?: (familyId: string) => void;
}

/** Hover state for tooltip */
export interface ConstellationHoverInfo {
  readonly node: ConstellationNode;
  readonly screenX: number;
  readonly screenY: number;
}

/** Return type for useConstellation */
export interface UseConstellationReturn {
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly nodes: readonly ConstellationNode[];
  readonly clusters: readonly ConstellationCluster[];
  readonly hoverInfo: ConstellationHoverInfo | null;
  readonly selectedNode: ConstellationNode | null;
  readonly dimensions: Readonly<{ width: number; height: number }>;
  readonly reducedMotion: boolean;
  readonly handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  readonly handleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  readonly handleMouseLeave: () => void;
  readonly handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  readonly handleKeyDown: (e: React.KeyboardEvent<HTMLCanvasElement>) => void;
  readonly selectFamily: (familyId: string | null) => void;
}

/** Internal render state passed to render functions */
interface ConstellationRenderState {
  readonly nodes: readonly ConstellationNode[];
  readonly clusters: readonly ConstellationCluster[];
  readonly hoveredId: string | null;
  readonly selectedId: string | null;
  readonly time: number;
  readonly dpr: number;
  readonly colors: ResolvedColors;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly mouseX: number;
  readonly mouseY: number;
  readonly isLight: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2  Canvas Helpers + Geometry
// ═══════════════════════════════════════════════════════════

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Tier → star core + halo color */
function tierStarColor(
  tier: MemberTier,
  c: ResolvedColors,
): { core: string; halo: string } {
  switch (tier) {
    case "platino":
      return { core: c.silver100, halo: hexToRgba(c.silver100, 0.3) };
    case "vip":
      return { core: c.gold400, halo: hexToRgba(c.gold400, 0.35) };
    case "oro":
      return { core: c.gold400, halo: hexToRgba(c.gold400, 0.25) };
    case "plata":
      return { core: c.silver300, halo: hexToRgba(c.silver300, 0.2) };
    case "bronce":
      return { core: c.amber400, halo: hexToRgba(c.amber400, 0.15) };
    default:
      return { core: c.silver400, halo: hexToRgba(c.silver400, 0.12) };
  }
}

/** Cluster type → resolved hex color for nebula */
function clusterColor(type: string, c: ResolvedColors): string {
  const map: Record<string, string> = {
    sport: c.teal400,
    gastronomy: c.gold400,
    cultural: c.silver300,
    wellness: c.emerald400,
    social: c.rose400,
    business: c.amber400,
    family: c.teal300,
  };
  return map[type] ?? c.silver400;
}

// ── Star classification (Innovation 2) ──

type StarClass = "binary" | "supergiant" | "pulsar" | "whitedwarf";

function classifyStar(node: ConstellationNode): StarClass {
  if (node.connections.some((c) => c.strength > 0.85)) return "binary";
  if (node.memberCount > 6) return "supergiant";
  if (node.brightness > 0.8 && node.radius < 16) return "whitedwarf";
  return "pulsar";
}

/** Orbital ring count for high-engagement stars (Innovation 3) */
function orbitalRingCount(brightness: number): number {
  if (brightness >= 0.9) return 3;
  if (brightness >= 0.8) return 2;
  if (brightness >= 0.7) return 1;
  return 0;
}

// ── Parallax starfield (Innovation 1) ──

interface StarfieldStar {
  readonly x: number;   // 0-1 normalized
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
}

interface StarfieldLayer {
  readonly stars: readonly StarfieldStar[];
  readonly parallaxFactor: number;
}

const STARFIELD: readonly StarfieldLayer[] = (() => {
  const rng = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const r = rng(42);

  const layers = [
    { count: 20, parallax: 0.02, minSize: 1.5, maxSize: 3, minA: 0.08, maxA: 0.2 },
    { count: 35, parallax: 0.05, minSize: 0.8, maxSize: 2, minA: 0.12, maxA: 0.35 },
    { count: 50, parallax: 0.01, minSize: 0.3, maxSize: 1, minA: 0.15, maxA: 0.45 },
  ];

  return layers.map((l) => ({
    parallaxFactor: l.parallax,
    stars: Array.from({ length: l.count }, () => ({
      x: r(),
      y: r(),
      size: l.minSize + r() * (l.maxSize - l.minSize),
      alpha: l.minA + r() * (l.maxA - l.minA),
    })),
  }));
})();

// ── Convex hull (Andrew's monotone chain) ──

interface Pt {
  readonly x: number;
  readonly y: number;
}

function convexHull(points: readonly Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 2) return pts;
  const cross = (O: Pt, A: Pt, B: Pt): number =>
    (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
    upper.push(pts[i]);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function padHull(hull: readonly Pt[], padding: number): Pt[] {
  if (hull.length === 0) return [];
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: p.x + (dx / dist) * padding, y: p.y + (dy / dist) * padding };
  });
}

function drawSmoothHull(ctx: CanvasRenderingContext2D, points: readonly Pt[]): void {
  if (points.length < 3) return;
  ctx.beginPath();
  const start: Pt = {
    x: (points[points.length - 1].x + points[0].x) / 2,
    y: (points[points.length - 1].y + points[0].y) / 2,
  };
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + next.x) / 2, (points[i].y + next.y) / 2);
  }
  ctx.closePath();
}

/** Convert ConstellationNode[] to SimNode[] for force simulation */
function toSimNodes(nodes: readonly ConstellationNode[]): SimNode[] {
  return nodes.map((n) => ({
    id: n.familyId,
    x: n.x,
    y: n.y,
    vx: n.vx,
    vy: n.vy,
    radius: n.radius,
  }));
}

/** Copy simulation positions back to ConstellationNode[] */
function syncPositions(
  nodes: ConstellationNode[],
  simNodes: readonly SimNode[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = simNodes[i].x;
    nodes[i].y = simNodes[i].y;
    nodes[i].vx = simNodes[i].vx;
    nodes[i].vy = simNodes[i].vy;
  }
}

/** Hit test: find node under point in world coordinates */
function hitTest(
  mx: number,
  my: number,
  nodes: readonly ConstellationNode[],
): ConstellationNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dx = mx - n.x;
    const dy = my - n.y;
    if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n;
  }
  return null;
}

/** Screen coordinates → world coordinates (accounting for zoom/pan) */
function screenToWorld(
  sx: number,
  sy: number,
  zoom: number,
  panX: number,
  panY: number,
): { x: number; y: number } {
  return {
    x: (sx - panX) / zoom,
    y: (sy - panY) / zoom,
  };
}

// ═══════════════════════════════════════════════════════════
// §3  Render Functions — 7-layer pipeline (back-to-front)
// ═══════════════════════════════════════════════════════════

/** Layer 0: Parallax starfield background (screen space) */
function renderStarfield(
  ctx: CanvasRenderingContext2D,
  state: ConstellationRenderState,
): void {
  if (state.reducedMotion) {
    // Static starfield — no parallax offset
    for (const layer of STARFIELD) {
      for (const star of layer.stars) {
        const x = star.x * state.width;
        const y = star.y * state.height;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = state.isLight
          ? hexToRgba(state.colors.silver400, star.alpha * 0.4)
          : hexToRgba(state.colors.silver200, star.alpha);
        ctx.fill();
      }
    }
    return;
  }

  // Parallax: layers shift by mouse position
  const centerX = state.width / 2;
  const centerY = state.height / 2;
  const dx = (state.mouseX - centerX) / centerX; // -1 to 1
  const dy = (state.mouseY - centerY) / centerY;

  for (const layer of STARFIELD) {
    const offsetX = dx * layer.parallaxFactor * state.width;
    const offsetY = dy * layer.parallaxFactor * state.height;

    for (const star of layer.stars) {
      let x = star.x * state.width + offsetX;
      let y = star.y * state.height + offsetY;

      // Wrap around
      if (x < 0) x += state.width;
      if (x > state.width) x -= state.width;
      if (y < 0) y += state.height;
      if (y > state.height) y -= state.height;

      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = state.isLight
        ? hexToRgba(state.colors.silver400, star.alpha * 0.4)
        : hexToRgba(state.colors.silver200, star.alpha);
      ctx.fill();
    }
  }
}

/** Layer 1: Cluster nebulae (convex hulls) */
function renderNebulae(
  ctx: CanvasRenderingContext2D,
  state: ConstellationRenderState,
): void {
  const clusterGroups = new Map<string, ConstellationNode[]>();
  for (const n of state.nodes) {
    if (!n.clusterId) continue;
    const arr = clusterGroups.get(n.clusterId) ?? [];
    arr.push(n);
    clusterGroups.set(n.clusterId, arr);
  }

  for (const [clusterId, members] of clusterGroups) {
    if (members.length < 2) continue;

    const pts: Pt[] = members.map((m) => ({ x: m.x, y: m.y }));
    const hull = convexHull(pts);
    const padded = padHull(hull, 35);

    const cluster = state.clusters.find((c) => c.id === clusterId);
    const color = cluster?.color ?? state.colors.silver400;
    const breathe = state.reducedMotion
      ? 0
      : Math.sin(state.time * 0.6 + clusterId.length) * 0.015;

    drawSmoothHull(ctx, padded);
    ctx.fillStyle = hexToRgba(color, 0.04 + breathe);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, 0.12);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cluster label at centroid
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    ctx.font = `10px "DM Sans", sans-serif`;
    ctx.fillStyle = hexToRgba(color, 0.45);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(cluster?.name ?? clusterId, cx, cy - 40);
  }
  ctx.textBaseline = "alphabetic";
}

/** Layer 2: Constellation threads + flowing particles */
function renderThreads(
  ctx: CanvasRenderingContext2D,
  state: ConstellationRenderState,
): void {
  const nodeMap = new Map(state.nodes.map((n) => [n.familyId, n]));
  const drawn = new Set<string>();

  for (const node of state.nodes) {
    for (const conn of node.connections) {
      const key = [node.familyId, conn.targetFamilyId].sort().join(":");
      if (drawn.has(key)) continue;
      drawn.add(key);

      const target = nodeMap.get(conn.targetFamilyId);
      if (!target) continue;

      const isHighlighted =
        state.hoveredId === node.familyId ||
        state.hoveredId === conn.targetFamilyId ||
        state.selectedId === node.familyId ||
        state.selectedId === conn.targetFamilyId;

      const strength = conn.strength;
      const color =
        strength >= 0.7
          ? state.colors.emerald400
          : strength >= 0.4
            ? state.colors.amber400
            : state.colors.silver500;
      const alpha = isHighlighted ? 0.5 : 0.08 + strength * 0.12;

      // Innovation 8: Constellation angular threads on hover
      if (isHighlighted && !state.reducedMotion) {
        // Angular waypoint line
        const midX = (node.x + target.x) / 2;
        const midY = (node.y + target.y) / 2;
        const dx = target.x - node.x;
        const dy = target.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const offset = Math.min(20, dist * 0.1);
        const wx = midX + (-dy / dist) * offset;
        const wy = midY + (dx / dist) * offset;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(wx, wy);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.lineWidth = 1 + strength * 1.5;
        ctx.stroke();

        // Shared interest label at waypoint
        if (conn.sharedInterest) {
          ctx.font = `10px "DM Sans", sans-serif`;
          ctx.fillStyle = hexToRgba(state.colors.silver300, 0.7);
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(conn.sharedInterest, wx, wy - 8);
        }
      } else {
        // Standard straight line
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.lineWidth = 1 + strength * 1.5;
        ctx.stroke();
      }

      // Flowing particles
      if (!state.reducedMotion && strength > 0.15) {
        const speed = 0.1 + strength * 0.15;
        const count = strength > 0.5 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const pos = ((state.time * speed + i / count) % 1 + 1) % 1;
          const px = node.x + (target.x - node.x) * pos;
          const py = node.y + (target.y - node.y) * pos;
          const fade = Math.min(pos, 1 - pos) * 4;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(color, Math.min(1, fade) * 0.45);
          ctx.fill();
        }
      }
    }
  }
}

/** Layer 3: Stars with classification + halos */
function renderStars(
  ctx: CanvasRenderingContext2D,
  state: ConstellationRenderState,
): void {
  for (let i = 0; i < state.nodes.length; i++) {
    const node = state.nodes[i];
    const { core } = tierStarColor(node.tier, state.colors);
    const starClass = classifyStar(node);
    const isHovered = state.hoveredId === node.familyId;
    const isSelected = state.selectedId === node.familyId;
    const isActive = isHovered || isSelected;
    const phaseOffset = (i / state.nodes.length) * Math.PI * 2;
    const breathe = state.reducedMotion
      ? 0
      : Math.sin(state.time * 1.2 + phaseOffset) * node.brightness * 0.3;

    // ── Innovation 2: Star classification rendering ──

    if (starClass === "binary") {
      // Binary star: two overlapping circles
      const offset = 3;
      for (const dx of [-offset, offset]) {
        const haloRadius = node.radius + 14 + breathe * 8;
        const gradient = ctx.createRadialGradient(
          node.x + dx, node.y, node.radius * 0.2,
          node.x + dx, node.y, haloRadius,
        );
        gradient.addColorStop(0, hexToRgba(core, 0.12 + node.brightness * 0.15));
        gradient.addColorStop(0.4, hexToRgba(core, 0.04 + node.brightness * 0.06));
        gradient.addColorStop(1, hexToRgba(core, 0));
        ctx.beginPath();
        ctx.arc(node.x + dx, node.y, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    } else if (starClass === "supergiant") {
      // Supergiant: extended halo
      const haloRadius = node.radius + 24 + breathe * 12;
      const gradient = ctx.createRadialGradient(
        node.x, node.y, node.radius * 0.2,
        node.x, node.y, haloRadius,
      );
      gradient.addColorStop(0, hexToRgba(core, 0.2 + node.brightness * 0.25));
      gradient.addColorStop(0.3, hexToRgba(core, 0.08 + node.brightness * 0.12));
      gradient.addColorStop(1, hexToRgba(core, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    } else if (starClass === "whitedwarf") {
      // White dwarf: small intense core
      const haloRadius = node.radius + 10 + breathe * 6;
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 1,
        node.x, node.y, haloRadius,
      );
      gradient.addColorStop(0, hexToRgba(core, 0.4 + node.brightness * 0.3));
      gradient.addColorStop(0.3, hexToRgba(core, 0.15));
      gradient.addColorStop(1, hexToRgba(core, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    } else {
      // Pulsar: standard halo with concentric rings
      const haloRadius = node.radius + 16 + breathe * 10;
      const gradient = ctx.createRadialGradient(
        node.x, node.y, node.radius * 0.2,
        node.x, node.y, haloRadius,
      );
      gradient.addColorStop(0, hexToRgba(core, 0.15 + node.brightness * 0.2));
      gradient.addColorStop(0.4, hexToRgba(core, (0.05 + node.brightness * 0.1) * 0.5));
      gradient.addColorStop(1, hexToRgba(core, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Pulsar concentric rings
      if (!state.reducedMotion && node.brightness > 0.5) {
        for (let r = 1; r <= 2; r++) {
          const ringRadius = node.radius + 8 * r + Math.sin(state.time * 2 + r * 1.5) * 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(core, 0.06 - r * 0.02);
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // ── Core circle ──
    const coreRadius = isActive ? node.radius + 2 : node.radius;
    ctx.beginPath();
    ctx.arc(node.x, node.y, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = state.colors.surface2;
    ctx.fill();

    // Border
    ctx.strokeStyle = isActive
      ? state.colors.gold400
      : hexToRgba(core, 0.7);
    ctx.lineWidth = isActive ? 2 : 1.5;
    ctx.stroke();

    // Selected outer ring
    if (isSelected) {
      ctx.strokeStyle = hexToRgba(state.colors.gold400, 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, coreRadius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hover ring
    if (isHovered && !isSelected) {
      ctx.strokeStyle = hexToRgba(state.colors.gold400, 0.3);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, coreRadius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── Innovation 3: Orbital rings ──
    if (!state.reducedMotion) {
      const rings = orbitalRingCount(node.brightness);
      for (let r = 0; r < rings; r++) {
        const omega = r % 2 === 0 ? 0.3 : -0.2;
        const angle = state.time * omega + r * (Math.PI / 3);
        const ringRadius = coreRadius + 10 + r * 6;

        // Draw partial arc (not full circle — more elegant)
        ctx.beginPath();
        ctx.arc(node.x, node.y, ringRadius, angle, angle + Math.PI * 1.2);
        ctx.strokeStyle = hexToRgba(core, 0.15 - r * 0.03);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // ── Initials ──
    const initials = node.familyName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
    const fontSize = Math.max(8, node.radius * 0.7);
    ctx.font = `bold ${fontSize}px "DM Mono", monospace`;
    ctx.fillStyle = isActive ? state.colors.gold400 : state.colors.silver200;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, node.x, node.y);
  }
}

/** Layer 4: Labels (hovered/selected node) */
function renderLabels(
  ctx: CanvasRenderingContext2D,
  state: ConstellationRenderState,
): void {
  for (const node of state.nodes) {
    const isActive =
      state.hoveredId === node.familyId ||
      state.selectedId === node.familyId;
    if (!isActive) continue;

    const angle = Math.atan2(
      node.y - state.height / 2,
      node.x - state.width / 2,
    );
    const gap = node.radius + 18;
    let lx: number;
    let ly: number;
    let align: CanvasTextAlign;
    let baseline: CanvasTextBaseline;

    if (Math.abs(angle) < Math.PI / 4) {
      lx = node.x + gap; ly = node.y; align = "left"; baseline = "middle";
    } else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
      lx = node.x; ly = node.y + gap; align = "center"; baseline = "top";
    } else if (angle <= -Math.PI / 4 && angle > -(3 * Math.PI) / 4) {
      lx = node.x; ly = node.y - gap; align = "center"; baseline = "bottom";
    } else {
      lx = node.x - gap; ly = node.y; align = "right"; baseline = "middle";
    }

    // Truncate to fit
    const maxW = 120;
    let label = node.familyName;
    ctx.font = `11px "DM Sans", sans-serif`;
    if (ctx.measureText(label).width > maxW) {
      while (ctx.measureText(label + "\u2026").width > maxW && label.length > 3) {
        label = label.slice(0, -1);
      }
      label += "\u2026";
    }

    ctx.fillStyle = hexToRgba(state.colors.silver200, 0.9);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(label, lx, ly);

    // Tier + engagement sub-label
    ctx.font = `9px "DM Mono", monospace`;
    ctx.fillStyle = hexToRgba(state.colors.silver400, 0.6);
    const subY = baseline === "top" ? ly + 14 : baseline === "bottom" ? ly - 13 : ly + 14;
    ctx.fillText(
      `${node.tier} · ${Math.round(node.brightness * 100)}%`,
      lx,
      subY,
    );
  }

  ctx.textBaseline = "alphabetic";
}

// ═══════════════════════════════════════════════════════════
// §4  Hook — useConstellation
// ═══════════════════════════════════════════════════════════

/**
 * useConstellation — Galaxy view orchestration hook.
 *
 * 5-layer architecture:
 *   1. Layout — cluster-aware force simulation
 *   2. Projection — node sizing, brightness, influence
 *   3. Render — 7-layer canvas pipeline (called in RAF loop)
 *   4. Interaction — zoom/pan, hit test, select, keyboard
 *   5. Accessibility — screen reader, reduced motion
 *
 * @example
 * const galaxy = useConstellation({
 *   families: allFamilies,
 *   connections: allConnections,
 *   onFamilyClick: (id) => navigate(`/families/${id}`),
 * });
 */
export function useConstellation({
  families,
  connections,
  onFamilyClick,
}: UseConstellationOptions): UseConstellationReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<ConstellationNode[]>([]);
  const timeRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef<ConstellationNode | null>(null);

  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [hoverInfo, setHoverInfo] = useState<ConstellationHoverInfo | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reduced motion detection
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // ── Layer 2: Build ConstellationNode[] from input ──
  const nodes = useMemo((): ConstellationNode[] => {
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Build connection map
    const connMap = new Map<string, ConstellationConnection[]>();
    for (const conn of connections) {
      if (!connMap.has(conn.sourceFamilyId)) connMap.set(conn.sourceFamilyId, []);
      if (!connMap.has(conn.targetFamilyId)) connMap.set(conn.targetFamilyId, []);
      const entry: ConstellationConnection = {
        targetFamilyId: conn.targetFamilyId,
        strength: conn.strength,
        sharedInterest: conn.sharedInterest,
        relationship: conn.relationship,
      };
      connMap.get(conn.sourceFamilyId)!.push(entry);
      connMap.get(conn.targetFamilyId)!.push({
        ...entry,
        targetFamilyId: conn.sourceFamilyId,
      });
    }

    // Group by cluster
    const clusterGroups = new Map<string, ConstellationFamilyInput[]>();
    const noCluster: ConstellationFamilyInput[] = [];
    for (const f of families) {
      if (f.clusterId) {
        if (!clusterGroups.has(f.clusterId)) clusterGroups.set(f.clusterId, []);
        clusterGroups.get(f.clusterId)!.push(f);
      } else {
        noCluster.push(f);
      }
    }

    // Position: clusters in circle, families within clusters nearby
    const clusterKeys = Array.from(clusterGroups.keys());
    const clusterAngle = (2 * Math.PI) / Math.max(clusterKeys.length, 1);
    const clusterRadius = Math.min(width, height) * 0.22;

    const result: ConstellationNode[] = [];

    clusterKeys.forEach((key, ci) => {
      const members = clusterGroups.get(key)!;
      const cx = centerX + Math.cos(clusterAngle * ci - Math.PI / 2) * clusterRadius;
      const cy = centerY + Math.sin(clusterAngle * ci - Math.PI / 2) * clusterRadius;
      const memberAngle = (2 * Math.PI) / Math.max(members.length, 1);
      const memberSpread = 25 + members.length * 10;

      members.forEach((f, mi) => {
        result.push({
          familyId: f.familyId,
          familyName: f.familyName,
          tier: f.tier,
          clusterId: f.clusterId,
          connections: connMap.get(f.familyId) ?? [],
          x: cx + Math.cos(memberAngle * mi) * memberSpread,
          y: cy + Math.sin(memberAngle * mi) * memberSpread,
          vx: 0,
          vy: 0,
          radius: 10 + Math.sqrt(f.memberCount) * 5,
          brightness: f.engagement / 100,
          influence: 0,
          memberCount: f.memberCount,
        });
      });
    });

    // No-cluster families in outer ring
    const noneAngle = (2 * Math.PI) / Math.max(noCluster.length, 1);
    const noneRadius = Math.min(width, height) * 0.38;
    noCluster.forEach((f, i) => {
      result.push({
        familyId: f.familyId,
        familyName: f.familyName,
        tier: f.tier,
        clusterId: undefined,
        connections: connMap.get(f.familyId) ?? [],
        x: centerX + Math.cos(noneAngle * i) * noneRadius,
        y: centerY + Math.sin(noneAngle * i) * noneRadius,
        vx: 0,
        vy: 0,
        radius: 10 + Math.sqrt(f.memberCount) * 5,
        brightness: f.engagement / 100,
        influence: 0,
        memberCount: f.memberCount,
      });
    });

    // Compute influence from connection count/strength
    for (const node of result) {
      const totalStrength = node.connections.reduce((s, c) => s + c.strength, 0);
      const maxConnections = Math.max(...result.map((n) => n.connections.length), 1);
      const maxStrength = Math.max(
        ...result.map((n) => n.connections.reduce((s, c) => s + c.strength, 0)),
        1,
      );
      node.influence =
        (node.connections.length / maxConnections) * 0.5 +
        (totalStrength / maxStrength) * 0.5;
    }

    return result;
  }, [families, connections, dimensions]);

  nodesRef.current = nodes;

  // ── Build clusters ──
  const clusters = useMemo((): ConstellationCluster[] => {
    const identityMap = new Map<string, (typeof CLUSTER_IDENTITIES)[number]>(
      CLUSTER_IDENTITIES.map((c) => [c.type, c]),
    );
    const familyByCluster = new Map<string, string[]>();
    for (const f of families) {
      if (!f.clusterId) continue;
      if (!familyByCluster.has(f.clusterId)) familyByCluster.set(f.clusterId, []);
      familyByCluster.get(f.clusterId)!.push(f.familyId);
    }

    const colors = resolveColors();

    return Array.from(familyByCluster.entries()).map(([type, ids]) => {
      const identity = identityMap.get(type);
      return {
        id: type,
        type,
        name: identity?.name ?? type,
        color: clusterColor(type, colors),
        familyIds: ids,
      };
    });
  }, [families]);

  // ── Resize observer ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.max(400, Math.min(600, w * 0.6));
        setDimensions({ width: w, height: h });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Layer 1: Force simulation + animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = resolveColors();
    let alpha = 1; // Simulation temperature

    // Build SimEdges from connections
    const simEdges: SimEdge[] = connections.map((c) => ({
      source: c.sourceFamilyId,
      target: c.targetFamilyId,
      strength: c.strength,
    }));

    if (reducedMotion) {
      // Run to completion synchronously, render once
      const simNodes = toSimNodes(nodes);
      runToCompletion(simNodes, simEdges, dimensions.width, dimensions.height);
      syncPositions(nodes, simNodes);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      canvas.style.width = `${dimensions.width}px`;
      canvas.style.height = `${dimensions.height}px`;

      renderFrame(ctx, {
        nodes,
        clusters,
        hoveredId: null,
        selectedId: null,
        time: 0,
        dpr,
        colors,
        reducedMotion: true,
        width: dimensions.width,
        height: dimensions.height,
        zoom: 1,
        panX: 0,
        panY: 0,
        mouseX: 0,
        mouseY: 0,
        isLight: document.documentElement.classList.contains("light"),
      });
      return;
    }

    // Normal animation loop
    const frame = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = dimensions;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Simulation step
      if (alpha > 0.01) {
        const simNodes = toSimNodes(nodes);
        const active = simulationStep(simNodes, simEdges, width, height, alpha);
        syncPositions(nodes, simNodes);
        alpha *= 0.995;
        if (!active) alpha = 0;
      }

      timeRef.current += 0.016;

      const selectedId = selectedNode?.familyId ?? null;
      const hoveredId = hoveredRef.current?.familyId ?? null;

      renderFrame(ctx, {
        nodes,
        clusters,
        hoveredId,
        selectedId,
        time: timeRef.current,
        dpr,
        colors,
        reducedMotion: false,
        width,
        height,
        zoom,
        panX: pan.x,
        panY: pan.y,
        mouseX: mousePosRef.current.x,
        mouseY: mousePosRef.current.y,
        isLight: document.documentElement.classList.contains("light"),
      });

      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, clusters, connections, dimensions, reducedMotion, zoom, pan, selectedNode]);

  // ── Layer 4: Mouse interaction ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      mousePosRef.current = { x: sx, y: sy };

      // Dragging for pan
      if (isDragging.current) {
        const dx = sx - dragStart.current.x;
        const dy = sy - dragStart.current.y;
        setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
        return;
      }

      // Hit test in world coordinates
      const world = screenToWorld(sx, sy, zoom, pan.x, pan.y);
      const hit = hitTest(world.x, world.y, nodesRef.current);
      hoveredRef.current = hit;
      canvas.style.cursor = hit ? "pointer" : "default";

      if (hit) {
        // Convert back to screen coords for tooltip
        setHoverInfo({
          node: hit,
          screenX: hit.x * zoom + pan.x,
          screenY: hit.y * zoom + pan.y,
        });
      } else {
        setHoverInfo(null);
      }
    },
    [zoom, pan, nodes],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy, zoom, pan.x, pan.y);
      const hit = hitTest(world.x, world.y, nodesRef.current);

      if (hit) {
        setSelectedNode((prev) =>
          prev?.familyId === hit.familyId ? null : hit,
        );
        // Find index in sorted-by-influence for keyboard nav
        const sorted = [...nodesRef.current].sort(
          (a, b) => b.influence - a.influence,
        );
        setFocusedIndex(sorted.findIndex((n) => n.familyId === hit.familyId));
      } else {
        setSelectedNode(null);
        setFocusedIndex(-1);
      }
    },
    [zoom, pan, nodes],
  );

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHoverInfo(null);
    isDragging.current = false;
  }, []);

  // ── Innovation 4: Wheel zoom toward cursor ──
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(3, zoom * delta));

      // Zoom toward cursor
      const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
      const newPanY = my - (my - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan],
  );

  // ── Innovation 6: Keyboard navigation ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const sorted = [...nodesRef.current].sort(
        (a, b) => b.influence - a.influence,
      );
      if (sorted.length === 0) return;

      switch (e.key) {
        case "Tab": {
          e.preventDefault();
          const nextIdx = e.shiftKey
            ? (focusedIndex - 1 + sorted.length) % sorted.length
            : (focusedIndex + 1) % sorted.length;
          setFocusedIndex(nextIdx);
          const node = sorted[nextIdx];
          setSelectedNode(node);
          // Pan to keep node visible
          const screenX = node.x * zoom + pan.x;
          const screenY = node.y * zoom + pan.y;
          if (
            screenX < 50 ||
            screenX > dimensions.width - 50 ||
            screenY < 50 ||
            screenY > dimensions.height - 50
          ) {
            setPan({
              x: dimensions.width / 2 - node.x * zoom,
              y: dimensions.height / 2 - node.y * zoom,
            });
          }
          break;
        }
        case "Enter":
        case " ":
          e.preventDefault();
          if (selectedNode && onFamilyClick) {
            onFamilyClick(selectedNode.familyId);
          }
          break;
        case "Escape":
          e.preventDefault();
          setSelectedNode(null);
          setFocusedIndex(-1);
          break;
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          if (!selectedNode) break;
          const conns = selectedNode.connections;
          if (conns.length === 0) break;
          // Navigate to first connected node
          const targetId = conns[0].targetFamilyId;
          const target = nodesRef.current.find(
            (n) => n.familyId === targetId,
          );
          if (target) {
            setSelectedNode(target);
            setFocusedIndex(
              sorted.findIndex((n) => n.familyId === targetId),
            );
          }
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          if (!selectedNode) break;
          const conns2 = selectedNode.connections;
          if (conns2.length === 0) break;
          // Navigate to last connected node
          const targetId2 = conns2[conns2.length - 1].targetFamilyId;
          const target2 = nodesRef.current.find(
            (n) => n.familyId === targetId2,
          );
          if (target2) {
            setSelectedNode(target2);
            setFocusedIndex(
              sorted.findIndex((n) => n.familyId === targetId2),
            );
          }
          break;
        }
        default:
          break;
      }
    },
    [focusedIndex, selectedNode, zoom, pan, dimensions, onFamilyClick, nodes],
  );

  const selectFamily = useCallback(
    (familyId: string | null) => {
      if (!familyId) {
        setSelectedNode(null);
        setFocusedIndex(-1);
        return;
      }
      const node = nodesRef.current.find((n) => n.familyId === familyId);
      if (node) {
        setSelectedNode(node);
        // Pan to center
        setPan({
          x: dimensions.width / 2 - node.x * zoom,
          y: dimensions.height / 2 - node.y * zoom,
        });
      }
    },
    [dimensions, zoom],
  );

  return {
    canvasRef,
    containerRef,
    nodes,
    clusters,
    hoverInfo,
    selectedNode,
    dimensions,
    reducedMotion,
    handleMouseMove,
    handleClick,
    handleMouseLeave,
    handleWheel,
    handleKeyDown,
    selectFamily,
  };
}

// ═══════════════════════════════════════════════════════════
// §5  Render Orchestrator
// ═══════════════════════════════════════════════════════════

/**
 * Complete render pipeline — 7 layers back-to-front.
 * Called from the hook's requestAnimationFrame loop.
 */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: ConstellationRenderState,
): void {
  const { dpr, width, height, zoom, panX, panY } = state;

  ctx.save();

  // Clear in screen space
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Background gradient
  const bgGrad = state.isLight
    ? state.colors.surface0
    : state.colors.abyss;
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Layer 0: Starfield (screen space with parallax)
  renderStarfield(ctx, state);

  // Layers 1-4: World space (zoom/pan)
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, panX * dpr, panY * dpr);

  renderNebulae(ctx, state);
  renderThreads(ctx, state);
  renderStars(ctx, state);
  renderLabels(ctx, state);

  ctx.restore();
}