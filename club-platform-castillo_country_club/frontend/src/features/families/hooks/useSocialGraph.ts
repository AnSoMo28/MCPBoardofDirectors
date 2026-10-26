// ═══════════════════════════════════════════════════════════
// src/features/families/hooks/useSocialGraph.ts
// Phase 34+ Migration — Social Graph Hook
// Level 6+ Agency · Production Grade · 2027 Intelligence
//
// 5-layer orchestration hook for social graph visualization:
//   1. Simulation — force-directed physics layout
//   2. Topology — graph analysis (centrality, bridges, communities)
//   3. Predictions — EWMA decay, network-aware intro, resilience
//   4. Narrative — AI storytelling for nodes and network
//   5. Interaction — hover, click, hit detection, what-if simulation
//
// Components consuming this hook become pure rendering.
//
// PRE-WRITE VERIFICATION:
//   SocialConnection → ../types.ts §5     ✅
//   SocialBond       → ../social-types.ts §3 ✅
//   SocialMatch      → ../social-types.ts §3 ✅
//   MatchReason      → ../social-types.ts §3 ✅
//   MemberTier       → ../types.ts §6     ✅
//   TIER_CONFIG      → ../config.ts §8    ✅
//   SimNode, SimEdge → @/shared/lib/forceSimulation.ts §1 ✅
//   simulationStep, runToCompletion, hitTestNode → forceSimulation §3-5 ✅
//   TopologyGraph, TopoNode, TopoEdge, TopologyAnalysis, Community
//     → ../lib/socialTopology.ts §1 ✅
//   analyzeTopology → ../lib/socialTopology.ts §10 ✅
//   generatePredictions, SocialPredictions
//     → ../lib/socialPredictions.ts §10 ✅
//   generateNodeNarratives, generateNetworkNarrative, nameAllCommunities
//     → ../lib/socialNarrative.ts §8-10 ✅
//   renderSocialGraph, resolveColors, GraphNode, GraphEdge,
//   ResolvedColors, RenderState
//     → ../components/SocialGraphRenderer.ts §1-5 ✅
//
// ANTI-PATTERNS REMOVED:
//   - EnrichedSocialConnection → SocialBond (social-types §3)
//   - SuggestedConnection → SocialMatch (social-types §3)
//   - sug.reason → sug.reasons[0]?.detail
//   - TIER_CONFIG from "../types" → "../config"
//   - useReducedMotion hook (eliminated) → inline matchMedia
//   - conn.connectedTier as keyof typeof TIER_CONFIG → direct access
//   - analysis.communities = nameAllCommunities(...) mutation → derived variable
//   - Hardcoded tier/engagement/memberCount → optional props with defaults
//   - Mutable interfaces → readonly
//   - No § markers → 3 sections
//   - No PRE-WRITE → header block
//
// §13 INTEGRATED:
//   Predictions include EWMA decay (A4), network-aware impact (A5),
//   and resilience scoring (A6) from socialPredictions.ts v2.
// ═══════════════════════════════════════════════════════════

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import type {
  SocialBond,
  SocialMatch,
} from "../social-types";

import type { MemberTier } from "../types";

import { TIER_CONFIG } from "../config";

import {
  simulationStep,
  runToCompletion,
  hitTestNode,
  type SimNode,
  type SimEdge,
} from "@/shared/lib/forceSimulation";

import {
  analyzeTopology,
  type TopologyGraph,
  type TopoNode,
  type TopoEdge,
  type TopologyAnalysis,
} from "../lib/socialTopology";

import {
  generatePredictions,
  type SocialPredictions,
} from "../lib/socialPredictions";

import {
  generateNodeNarratives,
  generateNetworkNarrative,
  nameAllCommunities,
  type NodeNarrativeSet,
  type NetworkNarrative,
} from "../lib/socialNarrative";

import {
  renderSocialGraph,
  resolveColors,
  type GraphNode,
  type GraphEdge,
  type ResolvedColors
} from "../components/SocialGraphRenderer";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Tooltip information when hovering over a graph node */
export interface HoverInfo {
  readonly nodeId: string;
  readonly label: string;
  readonly tier: MemberTier;
  readonly x: number;
  readonly y: number;
  readonly relationship?: string;
  readonly strength?: number;
  readonly sharedActivities?: readonly string[];
  readonly sharedEvents?: number;
  readonly lastInteraction?: string;
  readonly aiInsight?: string;
  readonly isSuggested?: boolean;
  readonly matchScore?: number;
  /** Top reason for this suggested connection */
  readonly reason?: string;
}

/** Options for useSocialGraph */
export interface UseSocialGraphOptions {
  readonly familyId: string;
  readonly familyName: string;
  readonly connections: readonly SocialBond[];
  readonly suggestedConnections?: readonly SocialMatch[];
  /** Override center node tier (default: inferred from TIER_CONFIG or "oro") */
  readonly familyTier?: MemberTier;
  /** Override center node engagement score (default: 80) */
  readonly familyEngagement?: number;
  /** Override center node member count (default: 5) */
  readonly familyMemberCount?: number;
  readonly onNodeClick?: (familyId: string) => void;
}

/** Return type for useSocialGraph */
export interface UseSocialGraphReturn {
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly dimensions: Readonly<{ width: number; height: number }>;
  readonly hoverInfo: HoverInfo | null;
  readonly narrativeNode: NodeNarrativeSet | null;
  readonly networkNarrative: NetworkNarrative | null;
  readonly topologyAnalysis: TopologyAnalysis | null;
  readonly predictions: SocialPredictions | null;
  readonly reducedMotion: boolean;
  readonly handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  readonly handleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  readonly handleMouseLeave: () => void;
  readonly closeNarrative: () => void;
  readonly simulateConnection: (
    a: string,
    b: string,
  ) => Readonly<{ healthDelta: number; communityChange: number }> | null;
}

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Detect prefers-reduced-motion inline (replaces eliminated useReducedMotion hook).
 * Listens for changes reactively via MediaQueryList event.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/**
 * Safely look up tier config color. Returns fallback if tier not found.
 */
function tierColor(tier: MemberTier, fallback: string): string {
  return TIER_CONFIG[tier]?.color ?? fallback;
}

/**
 * Build initial graph node positions from social bonds and match suggestions.
 * Positions nodes in a radial layout: center = family, ring 1 = connections,
 * ring 2 = suggested matches.
 */
function buildGraphData(
  familyId: string,
  familyName: string,
  familyTier: MemberTier,
  familyEngagement: number,
  familyMemberCount: number,
  connections: readonly SocialBond[],
  suggested: readonly SocialMatch[],
  width: number,
  height: number,
  colors: ResolvedColors,
): { readonly nodes: GraphNode[]; readonly edges: GraphEdge[] } {
  const centerX = width / 2;
  const centerY = height / 2;

  const filtered = connections.filter(
    (c) => c.connectedFamilyId !== familyId,
  );
  const filteredSug = suggested.filter((s) => s.familyId !== familyId);
  const totalOuter = filtered.length + filteredSug.length;
  const angleStep = (2 * Math.PI) / Math.max(totalOuter, 1);
  const ringRadius = Math.min(width, height) * 0.32;

  // Center node — the subject family
  const nodes: GraphNode[] = [
    {
      id: familyId,
      label: familyName,
      tier: familyTier,
      engagementScore: familyEngagement,
      memberCount: familyMemberCount,
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      radius: 32,
      color: colors.surface3,
      pinned: true,
    },
  ];

  // Ring 1: connected families
  for (let i = 0; i < filtered.length; i++) {
    const conn = filtered[i];
    const angle = angleStep * i - Math.PI / 2;
    const strength = conn.strength;

    nodes.push({
      id: conn.connectedFamilyId,
      label: conn.connectedFamilyName,
      tier: conn.connectedTier,
      engagementScore: conn.connectedEngagement,
      memberCount: 3, // Not available in SocialBond — default
      x: centerX + Math.cos(angle) * ringRadius,
      y: centerY + Math.sin(angle) * ringRadius,
      vx: 0,
      vy: 0,
      radius: 18 + strength * 12,
      color: tierColor(conn.connectedTier, colors.surface2),
    });
  }

  // Ring 2: suggested matches
  for (let i = 0; i < filteredSug.length; i++) {
    const sug = filteredSug[i];
    const angle = angleStep * (filtered.length + i) - Math.PI / 2;
    const outerRing = ringRadius * 1.4;

    nodes.push({
      id: sug.familyId,
      label: sug.familyName,
      tier: sug.tier,
      engagementScore: 0,
      memberCount: 0,
      x: centerX + Math.cos(angle) * outerRing,
      y: centerY + Math.sin(angle) * outerRing,
      vx: 0,
      vy: 0,
      radius: 14,
      color: tierColor(sug.tier, colors.surface2),
      isSuggested: true,
      matchScore: sug.matchScore,
      reason: sug.reasons[0]?.detail,
    });
  }

  // Edges: center → each connected family
  const edges: GraphEdge[] = filtered.map((conn) => ({
    source: familyId,
    target: conn.connectedFamilyId,
    strength: conn.strength,
    relationship: conn.relationship,
  }));

  return { nodes, edges };
}

/**
 * Build a TopologyGraph from SocialBond[] for analysis algorithms.
 * Converts domain types to the algorithm's simpler input format.
 */
function buildTopologyGraph(
  familyId: string,
  familyName: string,
  familyTier: MemberTier,
  familyEngagement: number,
  familyMemberCount: number,
  connections: readonly SocialBond[],
): TopologyGraph {
  const nodes: TopoNode[] = [
    {
      id: familyId,
      label: familyName,
      tier: familyTier,
      engagementScore: familyEngagement,
      memberCount: familyMemberCount,
    },
  ];
  const edges: TopoEdge[] = [];

  for (const conn of connections) {
    if (conn.connectedFamilyId === familyId) continue;

    nodes.push({
      id: conn.connectedFamilyId,
      label: conn.connectedFamilyName,
      tier: conn.connectedTier,
      engagementScore: conn.connectedEngagement,
      memberCount: 3, // Not available in SocialBond
    });

    edges.push({
      source: familyId,
      target: conn.connectedFamilyId,
      strength: conn.strength,
      relationship: conn.relationship,
      sharedActivities: conn.sharedActivities,
      sharedEvents: conn.sharedEvents,
      lastInteraction: conn.lastInteraction,
      // strengthHistory: undefined — not available from SocialBond
      // Algorithms handle this gracefully (check ?? [])
    });
  }

  return { nodes, edges, centerId: familyId };
}

// ═══════════════════════════════════════════════════════════
// §3  Hook
// ═══════════════════════════════════════════════════════════

/**
 * Social graph orchestration hook.
 *
 * 5-layer architecture:
 *   1. Simulation — force-directed layout via forceSimulation
 *   2. Topology — graph analysis via socialTopology
 *   3. Predictions — §13-integrated intelligence via socialPredictions
 *   4. Narrative — AI storytelling via socialNarrative
 *   5. Interaction — hover, click, hit testing, what-if simulation
 *
 * All computation is memoized. Canvas rendering runs in requestAnimationFrame.
 * Components consuming this hook only need to render — zero logic.
 *
 * @example
 * const graph = useSocialGraph({
 *   familyId: family.id,
 *   familyName: family.familyName,
 *   familyTier: family.tier,
 *   connections: bonds,
 *   suggestedConnections: matches,
 * });
 *
 * return (
 *   <div ref={graph.containerRef}>
 *     <canvas ref={graph.canvasRef}
 *       onMouseMove={graph.handleMouseMove}
 *       onClick={graph.handleClick}
 *       onMouseLeave={graph.handleMouseLeave}
 *     />
 *     {graph.hoverInfo && <HoverTooltip info={graph.hoverInfo} />}
 *     {graph.narrativeNode && <NarrativePanel data={graph.narrativeNode} />}
 *   </div>
 * );
 */
export function useSocialGraph({
  familyId,
  familyName,
  connections,
  suggestedConnections = [],
  familyTier = "oro",
  familyEngagement = 80,
  familyMemberCount = 5,
  onNodeClick,
}: UseSocialGraphOptions): UseSocialGraphReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animFrameRef = useRef<number>(0);
  const alphaRef = useRef(1);
  const timeRef = useRef(0);
  const hoveredNodeRef = useRef<string | null>(null);
  const colorsRef = useRef<ResolvedColors>(resolveColors());

  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [narrativeNodeId, setNarrativeNodeId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  /* ── Layer 2: Topology Analysis ── */
  const topoGraph = useMemo(
    () =>
      buildTopologyGraph(
        familyId,
        familyName,
        familyTier,
        familyEngagement,
        familyMemberCount,
        connections,
      ),
    [
      familyId,
      familyName,
      familyTier,
      familyEngagement,
      familyMemberCount,
      connections,
    ],
  );

  const topologyAnalysis = useMemo(() => {
    if (topoGraph.nodes.length < 2) return null;
    const analysis = analyzeTopology(topoGraph);
    // Name communities — returns NEW array, does not mutate
    const namedCommunities = nameAllCommunities(
      analysis.communities,
      topoGraph.nodes,
    );
    return { ...analysis, communities: namedCommunities };
  }, [topoGraph]);

  /* ── Layer 3: Predictions (§13 A4/A5/A6 integrated) ── */
  const predictions = useMemo(() => {
    if (!topologyAnalysis) return null;
    return generatePredictions(topoGraph, topologyAnalysis);
  }, [topoGraph, topologyAnalysis]);

  /* ── Layer 4: Narratives ── */
  const networkNarrative = useMemo(() => {
    if (!topologyAnalysis || !predictions) return null;
    return generateNetworkNarrative(topoGraph, topologyAnalysis, predictions);
  }, [topoGraph, topologyAnalysis, predictions]);

  const narrativeNode = useMemo(() => {
    if (!narrativeNodeId || !topologyAnalysis || !predictions) return null;
    return generateNodeNarratives(
      narrativeNodeId,
      topoGraph,
      topologyAnalysis,
      predictions,
    );
  }, [narrativeNodeId, topoGraph, topologyAnalysis, predictions]);

  /* ── Initialize graph nodes + edges ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = Math.max(480, Math.min(600, w * 0.65));
    setDimensions({ width: w, height: h });

    colorsRef.current = resolveColors();

    const { nodes, edges } = buildGraphData(
      familyId,
      familyName,
      familyTier,
      familyEngagement,
      familyMemberCount,
      connections,
      suggestedConnections,
      w,
      h,
      colorsRef.current,
    );
    nodesRef.current = nodes;
    edgesRef.current = edges;
    alphaRef.current = 1;
    timeRef.current = 0;
  }, [
    familyId,
    familyName,
    familyTier,
    familyEngagement,
    familyMemberCount,
    connections,
    suggestedConnections,
  ]);

  /* ── Theme observer ── */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      colorsRef.current = resolveColors();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  /* ── Resize observer ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = Math.max(480, Math.min(600, w * 0.65));
        setDimensions({ width: w, height: h });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* ── Layer 1: Animation loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    let running = true;

    // Build render state once per frame set
    const communities = topologyAnalysis?.communities ?? [];

    if (reducedMotion) {
      // Reduced motion: run simulation to completion synchronously, render once
      const simNodes: SimNode[] = nodesRef.current;
      const simEdges: SimEdge[] = edgesRef.current;
      runToCompletion(
        simNodes,
        simEdges,
        dimensions.width,
        dimensions.height,
      );

      renderSocialGraph(ctx, {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        communities,
        hoveredNodeId: null,
        narrativeNodeId: null,
        time: 0,
        dpr,
        colors: colorsRef.current,
        reducedMotion: true,
        width: dimensions.width,
        height: dimensions.height,
      });
      return;
    }

    // Normal motion: requestAnimationFrame loop
    const frame = () => {
      if (!running) return;

      // Simulation phase: cool down alpha each frame
      if (alphaRef.current > 0.01) {
        const active = simulationStep(
          nodesRef.current as SimNode[],
          edgesRef.current as SimEdge[],
          dimensions.width,
          dimensions.height,
          alphaRef.current,
        );
        alphaRef.current *= 0.995;
        if (!active) alphaRef.current = 0;
      }

      timeRef.current += 0.016;

      renderSocialGraph(ctx, {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        communities,
        hoveredNodeId: hoveredNodeRef.current,
        narrativeNodeId,
        time: timeRef.current,
        dpr,
        colors: colorsRef.current,
        reducedMotion: false,
        width: dimensions.width,
        height: dimensions.height,
      });

      animFrameRef.current = requestAnimationFrame(frame);
    };

    animFrameRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [dimensions, reducedMotion, topologyAnalysis, narrativeNodeId]);

  /* ── Layer 5: Hit detection ── */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const found = hitTestNode(
        nodesRef.current as SimNode[],
        mx,
        my,
      );
      const foundId = found?.id ?? null;

      hoveredNodeRef.current = foundId;
      canvas.style.cursor = foundId ? "pointer" : "crosshair";

      if (foundId && found) {
        const graphNode = found as unknown as GraphNode;
        const conn = connections.find(
          (c) => c.connectedFamilyId === foundId,
        );
        const sug = suggestedConnections.find(
          (s) => s.familyId === foundId,
        );

        setHoverInfo({
          nodeId: foundId,
          label: graphNode.label,
          tier: graphNode.tier,
          x: found.x,
          y: found.y,
          relationship: conn?.relationship,
          strength: conn?.strength,
          sharedActivities: conn?.sharedActivities,
          sharedEvents: conn?.sharedEvents,
          lastInteraction: conn?.lastInteraction,
          aiInsight: conn?.aiInsight,
          isSuggested: !!sug,
          matchScore: sug?.matchScore,
          reason: sug?.reasons[0]?.detail,
        });
      } else {
        setHoverInfo(null);
      }
    },
    [connections, suggestedConnections],
  );

  /* ── Click handler ── */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const found = hitTestNode(
        nodesRef.current as SimNode[],
        mx,
        my,
      );

      if (found) {
        setNarrativeNodeId(found.id);
      } else {
        setNarrativeNodeId(null);
        if (onNodeClick && hoveredNodeRef.current) {
          onNodeClick(hoveredNodeRef.current);
        }
      }
    },
    [onNodeClick],
  );

  const handleMouseLeave = useCallback(() => {
    hoveredNodeRef.current = null;
    setHoverInfo(null);
  }, []);

  const closeNarrative = useCallback(() => {
    setNarrativeNodeId(null);
  }, []);

  /* ── What-If: simulate adding a connection ── */
  const simulateConnection = useCallback(
    (a: string, b: string) => {
      if (!topologyAnalysis) return null;

      const virtualGraph: TopologyGraph = {
        ...topoGraph,
        edges: [
          ...topoGraph.edges,
          {
            source: a,
            target: b,
            strength: 0.3,
            relationship: "Nueva conexión",
          },
        ],
      };

      const afterAnalysis = analyzeTopology(virtualGraph);
      return {
        healthDelta:
          afterAnalysis.networkHealth.score -
          topologyAnalysis.networkHealth.score,
        communityChange:
          afterAnalysis.communities.length -
          topologyAnalysis.communities.length,
      };
    },
    [topoGraph, topologyAnalysis],
  );

  return {
    canvasRef,
    containerRef,
    dimensions,
    hoverInfo,
    narrativeNode,
    networkNarrative,
    topologyAnalysis,
    predictions,
    reducedMotion,
    handleMouseMove,
    handleClick,
    handleMouseLeave,
    closeNarrative,
    simulateConnection,
  };
}