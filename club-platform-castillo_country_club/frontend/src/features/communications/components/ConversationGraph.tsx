// src/features/communications/components/ConversationGraph.tsx
// ═══════════════════════════════════════════════════════════
// Conversation Graph — The Memory
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a conversation log. Not a message history.
// A GRAPH — the memory of every interaction, rendered
// as a living network where each conversation is a node,
// topics are edges, sentiment is color, and callbacks
// are future commitments floating ahead.
//
// Visualizations:
//   1. Node Cluster — grouped by topic
//   2. Sentiment Coloring — each node colored by sentiment
//   3. Recency Sizing — recent nodes are larger
//   4. Direction Indicators — inbound vs outbound
//   5. Callback Dashes — pending commitments as dashed future nodes
//
// Pure SVG + React. Zero external dependencies.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  ConversationMemoryNode,
  SentimentLevel
} from "../types";
import "./ConversationGraph.css";

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface ConversationGraphProps {
  nodes: ConversationMemoryNode[];
  callbacks?: string[];
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const SENTIMENT_COLORS: Record<SentimentLevel, string> = {
  very_positive: "var(--color-emerald-400)",
  positive: "var(--color-teal-400)",
  neutral: "var(--color-silver-500)",
  negative: "var(--color-amber-400)",
  very_negative: "var(--color-rose-400)",
};

const SENTIMENT_LABELS: Record<SentimentLevel, string> = {
  very_positive: "Muy positivo",
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
  very_negative: "Muy negativo",
};

/** Layout constants. */
const SVG_W = 480;
const SVG_H = 320;
const NODE_BASE_RADIUS = 6;
const NODE_MAX_RADIUS = 14;
const CLUSTER_PAD = 60;
const NODE_SPACING = 32;

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

interface ClusterGroup {
  topic: string;
  nodes: ConversationMemoryNode[];
  centerX: number;
  centerY: number;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  node: ConversationMemoryNode;
  color: string;
  sentiment: SentimentLevel;
}

/** Group nodes by topic. */
function clusterByTopic(
  allNodes: ConversationMemoryNode[],
): ClusterGroup[] {
  const topicMap = new Map<string, ConversationMemoryNode[]>();

  for (const node of allNodes) {
    const topic = node.topic || "general";
    const existing = topicMap.get(topic);
    if (existing) {
      existing.push(node);
    } else {
      topicMap.set(topic, [node]);
    }
  }

  const groups = Array.from(topicMap.entries()).map(
    ([topic, nodes]: [string, ConversationMemoryNode[]]) => ({
      topic,
      nodes: nodes.sort(
        (a: ConversationMemoryNode, b: ConversationMemoryNode) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      centerX: 0,
      centerY: 0,
    }),
  );

  // Arrange clusters in a grid
  const cols = Math.ceil(Math.sqrt(groups.length));
  const colW = (SVG_W - CLUSTER_PAD * 2) / Math.max(cols, 1);
  const rowH = (SVG_H - CLUSTER_PAD * 2) / Math.ceil(groups.length / Math.max(cols, 1));

  groups.forEach((group: ClusterGroup, i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    group.centerX = CLUSTER_PAD + col * colW + colW / 2;
    group.centerY = CLUSTER_PAD + row * rowH + rowH / 2;
  });

  return groups;
}

/** Build positioned graph nodes from clusters. */
function buildGraphNodes(
  clusters: ClusterGroup[],
  now: Date,
): GraphNode[] {
  const result: GraphNode[] = [];

  for (const cluster of clusters) {
    const count = cluster.nodes.length;
    const cols = Math.ceil(Math.sqrt(count));

    cluster.nodes.forEach((node: ConversationMemoryNode, i: number) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const offsetX = (col - (cols - 1) / 2) * NODE_SPACING;
      const offsetY = (row - (Math.ceil(count / cols) - 1) / 2) * NODE_SPACING;

      // Recency: days since this node
      const daysSince = Math.max(
        0,
        (now.getTime() - new Date(node.date).getTime()) / (1000 * 60 * 60 * 24),
      );
      const recencyFactor = Math.max(0.3, 1 - daysSince / 90);
      const radius = NODE_BASE_RADIUS + recencyFactor * (NODE_MAX_RADIUS - NODE_BASE_RADIUS);

      result.push({
        id: node.id,
        x: cluster.centerX + offsetX,
        y: cluster.centerY + offsetY,
        radius,
        node,
        color: SENTIMENT_COLORS[node.sentiment] ?? "var(--color-silver-500)",
        sentiment: node.sentiment,
      });
    });
  }

  return result;
}

/** Build edges between nodes within the same cluster. */
function buildGraphEdges(
  clusters: ClusterGroup[],
  graphNodes: GraphNode[],
): Array<{ x1: number; y1: number; x2: number; y2: number; topic: string }> {
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number; topic: string }> = [];
  const nodeMap = new Map<string, GraphNode>();
  for (const gn of graphNodes) {
    nodeMap.set(gn.id, gn);
  }

  for (const cluster of clusters) {
    for (let i = 0; i < cluster.nodes.length - 1; i++) {
      const from = nodeMap.get(cluster.nodes[i].id);
      const to = nodeMap.get(cluster.nodes[i + 1].id);
      if (from && to) {
        edges.push({
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          topic: cluster.topic,
        });
      }
    }
  }

  return edges;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ConversationGraph({
  nodes,
  callbacks = [],
}: ConversationGraphProps) {

  const now = useMemo(() => new Date(), []);

  // ── Cluster nodes by topic ────────────────────────────
  const clusters = useMemo(
    () => clusterByTopic(nodes),
    [nodes],
  );

  // ── Positioned graph nodes ────────────────────────────
  const graphNodes = useMemo(
    () => buildGraphNodes(clusters, now),
    [clusters, now],
  );

  // ── Edges within clusters ─────────────────────────────
  const edges = useMemo(
    () => buildGraphEdges(clusters, graphNodes),
    [clusters, graphNodes],
  );

  // ── Callback future nodes (positioned at top-right) ───
  const callbackNodes = useMemo(() => {
    if (callbacks.length === 0) return [];
    const startX = SVG_W - 80;
    const startY = 30;
    const spacing = 22;
    return callbacks.slice(0, 5).map((cb: string, i: number) => ({
      label: cb,
      x: startX,
      y: startY + i * spacing,
    }));
  }, [callbacks]);

  // ── Empty state ───────────────────────────────────────
  if (nodes.length === 0) {
    return (
      <div className="glass-comm-graph" data-count="0">
        <div className="graph__header">
          <span className="graph__title">La Memoria</span>
        </div>
        <div className="graph__empty">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="graph__svg"
          >
            <text
              x={SVG_W / 2}
              y={SVG_H / 2}
              className="graph__empty-text"
              textAnchor="middle"
            >
              Sin nodos de conversación
            </text>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-graph"
      data-count={nodes.length}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className="graph__header">
        <span className="graph__title">La Memoria</span>
        <div className="graph__header-meta">
          <span className="graph__node-count">{nodes.length} nodos</span>
          <span className="graph__cluster-count">{clusters.length} temas</span>
        </div>
      </div>

      {/* ── SVG Graph ──────────────────────────────── */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="graph__svg"
        role="img"
        aria-label={`Conversation graph: ${nodes.length} nodes across ${clusters.length} topic clusters`}
      >
        <defs>
          {/* Glow filter for active nodes */}
          <filter id="graph-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Cluster labels */}
        {clusters.map((cluster: ClusterGroup) => {
          // Position label at top of cluster
          const labelY = cluster.centerY -
            Math.ceil(cluster.nodes.length / Math.ceil(Math.sqrt(cluster.nodes.length))) *
            NODE_SPACING / 2 - 12;
          return (
            <text
              key={`label-${cluster.topic}`}
              x={cluster.centerX}
              y={Math.max(12, labelY)}
              className="graph__cluster-label"
              textAnchor="middle"
            >
              {cluster.topic}
            </text>
          );
        })}

        {/* Edges (lines between sequential nodes in same cluster) */}
        {edges.map(
          (
            edge: { x1: number; y1: number; x2: number; y2: number; topic: string },
            i: number,
          ) => (
            <line
              key={`edge-${i}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              className="graph__edge"
            />
          ),
        )}

        {/* Nodes */}
        {graphNodes.map(
          (gn: GraphNode, i: number) => (
            <g
              key={gn.id}
              className="graph__node-group"
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              {/* Glow ring for recent nodes */}
              {gn.radius > NODE_BASE_RADIUS + 2 && (
                <circle
                  cx={gn.x}
                  cy={gn.y}
                  r={gn.radius + 4}
                  className="graph__node-glow"
                  style={{ "--node-color": gn.color } as React.CSSProperties}
                  filter="url(#graph-glow)"
                />
              )}

              {/* Main node */}
              <circle
                cx={gn.x}
                cy={gn.y}
                r={gn.radius}
                className="graph__node"
                style={{ "--node-color": gn.color } as React.CSSProperties}
                data-sentiment={gn.sentiment}
                data-direction={gn.node.direction}
              />

              {/* Direction indicator */}
              <text
                x={gn.x}
                y={gn.y + 1}
                className="graph__node-direction"
                textAnchor="middle"
                dominantBaseline="central"
                data-direction={gn.node.direction}
              >
                {gn.node.direction === "outbound" ? "→" : "←"}
              </text>
            </g>
          ),
        )}

        {/* Callback future nodes */}
        {callbackNodes.map(
          (
            cb: { label: string; x: number; y: number },
            i: number,
          ) => (
            <g
              key={`cb-${i}`}
              className="graph__callback-node"
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              <circle
                cx={cb.x}
                cy={cb.y}
                r={5}
                className="graph__callback-dot"
              />
              <text
                x={cb.x - 10}
                y={cb.y + 1}
                className="graph__callback-label"
                textAnchor="end"
                dominantBaseline="central"
              >
                {cb.label.length > 20 ? cb.label.substring(0, 20) + "…" : cb.label}
              </text>
            </g>
          ),
        )}
      </svg>

      {/* ── Topic Legend ────────────────────────────── */}
      <div className="graph__legend">
        {clusters.map((cluster: ClusterGroup) => (
          <div key={cluster.topic} className="graph__legend-item">
            <span className="graph__legend-count">{cluster.nodes.length}</span>
            <span className="graph__legend-topic">{cluster.topic}</span>
          </div>
        ))}
      </div>

      {/* ── Sentiment Summary ──────────────────────── */}
      <div className="graph__sentiment-summary">
        {(Object.keys(SENTIMENT_LABELS) as SentimentLevel[]).map(
          (level: SentimentLevel) => {
            const count = nodes.filter(
              (n: ConversationMemoryNode) => n.sentiment === level,
            ).length;
            if (count === 0) return null;
            return (
              <div
                key={level}
                className="graph__sentiment-item"
                data-sentiment={level}
              >
                <span className="graph__sentiment-dot" data-sentiment={level} />
                <span className="graph__sentiment-count">{count}</span>
                <span className="graph__sentiment-label">
                  {SENTIMENT_LABELS[level]}
                </span>
              </div>
            );
          },
        )}
      </div>

      {/* ── Summary Strip ──────────────────────────── */}
      <div className="graph__summary">
        <div className="graph__summary-item">
          <span className="graph__summary-value">{nodes.length}</span>
          <span className="graph__summary-label">Nodos</span>
        </div>
        <div className="graph__summary-item">
          <span className="graph__summary-value">{clusters.length}</span>
          <span className="graph__summary-label">Temas</span>
        </div>
        <div className="graph__summary-item">
          <span className="graph__summary-value">
            {nodes.filter((n: ConversationMemoryNode) => n.direction === "outbound").length}
          </span>
          <span className="graph__summary-label">Salientes</span>
        </div>
        <div className="graph__summary-item">
          <span className="graph__summary-value">{callbacks.length}</span>
          <span className="graph__summary-label">Callbacks</span>
        </div>
      </div>
    </div>
  );
}