/**
 * CulturalSocialGraph — "The Social"
 *
 * A Canvas-rendered force-directed graph that visualizes the
 * cultural social connections of a member. Each node = a companion,
 * each edge = shared cultural experience.
 *
 * Renders on HTML Canvas (not SVG) for performance with many nodes:
 * — Central node = the member (large, pulsing)
 * — Surrounding nodes = companions (size = affinity)
 * — Edges = shared events (thickness = count, color = relationship type)
 * — Clusters = groups that frequently attend together
 * — Isolation indicator if the member has few connections
 *
 * This answers: "Who does this person SHARE culture with,
 * and how strong are those bonds?"
 *
 * NOTE: Uses HTML Canvas for rendering (requestAnimationFrame loop)
 * because force-directed layouts with 20+ nodes need GPU acceleration.
 * This is the ONE component in the Cultural domain that uses Canvas
 * instead of SVG — all others use SVG.
 *
 * @module cultural/components/CulturalSocialGraph
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';

import type { CulturalSocialGraph } from '../types';
import './CulturalSocialGraph.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalSocialGraphProps {
  /** Social graph from the engine. */
  socialGraph: CulturalSocialGraph;
  /** Canvas width. Default 400. */
  width?: number;
  /** Canvas height. Default 350. */
  height?: number;
  /** Run force simulation. Default true. */
  simulate?: boolean;
  /** Callback when operator clicks a node. */
  onNodeClick?: (memberId: string) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  FORCE SIMULATION TYPES
// ══════════════════════════════════════════════════════════

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  affinity: number;
  isCenter: boolean;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  weight: number;
  color: string;
  relationship: string;
}

// ══════════════════════════════════════════════════════════
//  RELATIONSHIP COLORS
// ══════════════════════════════════════════════════════════

const RELATIONSHIP_COLORS: Record<string, string> = {
  frequent_companion: '#4ade80',
  occasional:         '#60a5fa',
  acquaintance:       '#6b7280',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalSocialGraph({
  socialGraph,
  width = 400,
  height = 350,
  simulate = true,
  onNodeClick,
  className = '',
}: CulturalSocialGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build nodes and edges from social graph
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const cx = width / 2;
    const cy = height / 2;

    // Center node (the member)
    const centerNode: GraphNode = {
      id: socialGraph.memberId,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: 14,
      color: '#a78bfa',
      label: 'Yo',
      affinity: 100,
      isCenter: true,
    };

    // Companion nodes
    const companionNodes: GraphNode[] = socialGraph.connections.map((conn: { affinityScore: number; memberId: string; relationship: string | number; }, idx: number) => {
      const angle = (idx / socialGraph.connections.length) * Math.PI * 2 - Math.PI / 2;
      const distance = 60 + (100 - conn.affinityScore) * 0.8;

      return {
        id: conn.memberId,
        x: cx + Math.cos(angle) * distance,
        y: cy + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        radius: 4 + (conn.affinityScore / 100) * 8,
        color: RELATIONSHIP_COLORS[conn.relationship] ?? '#6b7280',
        label: conn.memberId.substring(0, 8),
        affinity: conn.affinityScore,
        isCenter: false,
      };
    });

    const allNodes = [centerNode, ...companionNodes];

    // Edges from center to each companion
    const edges: GraphEdge[] = socialGraph.connections.map((conn: { memberId: string; sharedEvents: any; relationship: string | number; }) => {
      const targetNode = companionNodes.find((n) => n.id === conn.memberId)!;
      return {
        source: centerNode,
        target: targetNode,
        weight: conn.sharedEvents,
        color: RELATIONSHIP_COLORS[conn.relationship] ?? '#6b7280',
        relationship: conn.relationship,
      };
    });

    return { nodes: allNodes, edges };
  }, [socialGraph, width, height]);

  // Initialize refs
  useEffect(() => {
    nodesRef.current = initialNodes.map((n) => ({ ...n }));
    edgesRef.current = initialEdges.map((e) => ({ ...e }));
  }, [initialNodes, initialEdges]);

  // Canvas rendering + force simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = ctx; // stable non-null reference for closures

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    function tick() {
      if (!running) return;

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      if (simulate) {
        // Simple force simulation
        applyForces(nodes, edges, width, height);
      }

      // Clear
      g.clearRect(0, 0, width, height);

      // Draw edges
      for (const edge of edges) {
        const thickness = 0.5 + edge.weight * 0.8;
        g.beginPath();
        g.moveTo(edge.source.x, edge.source.y);
        g.lineTo(edge.target.x, edge.target.y);
        g.strokeStyle = edge.color;
        g.globalAlpha = 0.25;
        g.lineWidth = thickness;
        g.stroke();
        g.globalAlpha = 1;
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = hoveredNode === node.id;

        // Glow
        if (node.isCenter || isHovered) {
          g.beginPath();
          g.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          const gradient = g.createRadialGradient(
            node.x, node.y, node.radius,
            node.x, node.y, node.radius + 6,
          );
          gradient.addColorStop(0, node.color + '40');
          gradient.addColorStop(1, node.color + '00');
          g.fillStyle = gradient;
          g.fill();
        }

        // Body
        g.beginPath();
        g.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        g.fillStyle = node.color + (node.isCenter ? '50' : '30');
        g.fill();
        g.strokeStyle = node.color;
        g.lineWidth = isHovered ? 2 : 1;
        g.globalAlpha = isHovered ? 1 : 0.7;
        g.stroke();
        g.globalAlpha = 1;

        // Label
        g.font = `${node.isCenter ? '600 10px' : '9px'} 'DM Mono', monospace`;
        g.fillStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.5)';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(node.label, node.x, node.y + node.radius + 12);

        // Affinity label (on hover)
        if (isHovered && !node.isCenter) {
          g.font = '600 8px "DM Mono", monospace';
          g.fillStyle = node.color;
          g.fillText(
            `affinity ${node.affinity}`,
            node.x,
            node.y - node.radius - 8,
          );
        }
      }

      animationRef.current = requestAnimationFrame(tick);
    }

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, simulate, hoveredNode]);

  // Mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const nodes = nodesRef.current;
      let found: string | null = null;

      for (const node of nodes) {
        const dx = x - node.x;
        const dy = y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < node.radius + 6) {
          found = node.id;
          break;
        }
      }

      setHoveredNode(found);
    },
    [],
  );

  const handleClick = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      if (hoveredNode && !hoveredNode.startsWith('Yo')) {
        onNodeClick?.(hoveredNode);
      }
    },
    [hoveredNode, onNodeClick],
  );

  return (
    <div className={`cultural-social-graph ${className}`}>
      {/* Header */}
      <header className="cultural-social-graph__header">
        <h3 className="cultural-social-graph__title">Grafo Social Cultural</h3>
        <div className="cultural-social-graph__stats">
          <span className="cultural-social-graph__stat">
            {socialGraph.networkSize} conexión{socialGraph.networkSize !== 1 ? 'es' : ''}
          </span>
          <span className="cultural-social-graph__stat">
            Affinity avg: {socialGraph.avgAffinity}
          </span>
          {socialGraph.isolationRisk > 40 && (
            <span className="cultural-social-graph__stat cultural-social-graph__stat--risk">
              Riesgo aislamiento: {socialGraph.isolationRisk}
            </span>
          )}
        </div>
      </header>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="cultural-social-graph__canvas"
        style={{ width, height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={handleClick}
      />

      {/* Legend */}
      <div className="cultural-social-graph__legend">
        {Object.entries(RELATIONSHIP_COLORS).map(([rel, color]) => (
          <span key={rel} className="cultural-social-graph__legend-item">
            <span
              className="cultural-social-graph__legend-dot"
              style={{ background: color }}
            />
            <span className="cultural-social-graph__legend-label">
              {rel === 'frequent_companion' ? 'Frecuente'
                : rel === 'occasional' ? 'Ocasional'
                : 'Conocido'}
            </span>
          </span>
        ))}
      </div>

      {/* Footer */}
      <footer className="cultural-social-graph__footer">
        <span>Tamaño nodo = afinidad</span>
        <span>Grosor conexión = eventos compartidos</span>
        <span>Social influence: {socialGraph.socialInfluenceScore}</span>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  FORCE SIMULATION (simple — no external library)
// ══════════════════════════════════════════════════════════

/**
 * Simple force-directed layout. No d3 needed.
 * Applies 3 forces per tick:
 * 1. Center gravity (pulls all nodes toward center)
 * 2. Edge spring (connected nodes attract)
 * 3. Node repulsion (all nodes repel each other)
 */
function applyForces(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const centerGravity = 0.01;
  const springStrength = 0.005;
  const repulsionStrength = 500;
  const damping = 0.85;
  const minDistance = 30;

  // Reset forces
  for (const node of nodes) {
    if (node.isCenter) {
      node.x = cx;
      node.y = cy;
      node.vx = 0;
      node.vy = 0;
      continue;
    }

    // Center gravity
    node.vx += (cx - node.x) * centerGravity;
    node.vy += (cy - node.y) * centerGravity;
  }

  // Spring forces (edges)
  for (const edge of edges) {
    const dx = edge.target.x - edge.source.x;
    const dy = edge.target.y - edge.source.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const idealDist = 80 + (100 - edge.weight * 10);
    const force = (dist - idealDist) * springStrength;

    if (!edge.target.isCenter) {
      edge.target.vx -= (dx / dist) * force;
      edge.target.vy -= (dy / dist) * force;
    }
  }

  // Repulsion forces (all pairs)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(minDistance, Math.sqrt(dx * dx + dy * dy));
      const force = repulsionStrength / (dist * dist);

      if (!a.isCenter) {
        a.vx -= (dx / dist) * force;
        a.vy -= (dy / dist) * force;
      }
      if (!b.isCenter) {
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force;
      }
    }
  }

  // Apply velocities with damping
  for (const node of nodes) {
    if (node.isCenter) continue;

    node.vx *= damping;
    node.vy *= damping;
    node.x += node.vx;
    node.y += node.vy;

    // Keep within bounds
    const margin = 30;
    node.x = Math.max(margin, Math.min(width - margin, node.x));
    node.y = Math.max(margin, Math.min(height - margin, node.y));
  }
}