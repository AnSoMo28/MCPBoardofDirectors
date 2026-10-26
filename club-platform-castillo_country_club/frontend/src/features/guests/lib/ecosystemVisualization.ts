// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/ecosystemVisualization.ts
// Phase 34 "The Gateway" — Ecosystem Visualization Engine
// Level 6+ Agency · Production Grade
//
// Transforms pipeline, analytics, and proposal data into a
// spatial ecosystem map for canvas-based star visualization.
//
// Each node represents a meaningful entity:
//   - Stage anchors: pipeline stage cluster centers
//   - QuickWin guests: individuals one step from conversion
//   - Referrer families: influence nodes from top_referrers
//   - Proposal targets: guests targeted by engagement proposals
//
// Connections show relationships:
//   - Pipeline flows: stage-to-stage movement
//   - Referral influence: family → conversion correlation
//
// Pure data → spatial computation. Zero UI dependency.
//
// Depends on: types.ts §9, @/shared/mocks/contracts
// Budget: < 5ms
// ═══════════════════════════════════════════════════════════

import type {
  PipelineEcosystem,
  GuestPipelineStage,
} from "../types";

import type {
  GuestAnalyticsEnhanced,
  GuestEngagementProposalList,
  GuestEngagementProposal,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

/** Node type determines visual treatment and tooltip content. */
export type EcosystemNodeType =
  | "stage_anchor"
  | "guest_quickwin"
  | "guest_referrer"
  | "guest_proposal";

/** Connection type determines visual style. */
export type EcosystemConnectionType = "pipeline_flow" | "referral_influence";

/** Flexible metadata — populated fields depend on node type. */
export interface EcosystemNodeMetadata {
  readonly stageId?: GuestPipelineStage;
  readonly guestId?: string;
  readonly guestName?: string;
  readonly count?: number;
  readonly trend?: "improving" | "stable" | "declining";
  readonly isBottleneck?: boolean;
  readonly severity?: string;
  readonly bottleneckCause?: string;
  readonly actionNeeded?: string;
  readonly estimatedImpact?: number;
  readonly familyId?: string;
  readonly referralCount?: number;
  readonly convertedCount?: number;
  readonly proposalTitle?: string;
  readonly proposalPriority?: string;
  readonly proposalType?: string;
}

/** A positioned node in the ecosystem visualization. */
export interface EcosystemNode {
  readonly id: string;
  readonly label: string;
  readonly type: EcosystemNodeType;
  /** Normalized X position (0-1). */
  readonly nx: number;
  /** Normalized Y position (0-1). */
  readonly ny: number;
  /** Visual radius in pixels (at reference 900×500). */
  readonly radius: number;
  /** Hex color for canvas rendering (not CSS var). */
  readonly color: string;
  /** Base alpha (0-1). */
  readonly alpha: number;
  readonly metadata: EcosystemNodeMetadata;
}

/** A connection between two nodes. */
export interface EcosystemConnection {
  readonly fromId: string;
  readonly toId: string;
  /** Visual strength (0-100). */
  readonly strength: number;
  readonly type: EcosystemConnectionType;
}

/** A pipeline stage cluster for visual grouping. */
export interface EcosystemCluster {
  readonly id: GuestPipelineStage;
  readonly label: string;
  readonly nx: number;
  readonly ny: number;
  readonly count: number;
  readonly color: string;
  readonly isBottleneck: boolean;
  readonly severity?: string;
}

/** Aggregate metadata about the ecosystem. */
export interface EcosystemMetadata {
  readonly totalNodes: number;
  readonly totalGuests: number;
  readonly pipelineHealth: number;
  readonly computedAt: string;
}

/** Complete ecosystem visualization data. */
export interface EcosystemMap {
  readonly nodes: readonly EcosystemNode[];
  readonly connections: readonly EcosystemConnection[];
  readonly clusters: readonly EcosystemCluster[];
  readonly metadata: EcosystemMetadata;
}

// ═══════════════════════════════════════════════════════════
// §2 — INPUT
// ═══════════════════════════════════════════════════════════

export interface EcosystemInput {
  readonly pipeline: PipelineEcosystem | null;
  readonly analytics: GuestAnalyticsEnhanced | null;
  readonly proposals: GuestEngagementProposalList | null;
}

// ═══════════════════════════════════════════════════════════
// §3 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Predefined cluster center positions (normalized 0-1).
 * Creates a left-to-right pipeline wave with dormant below.
 */
const CLUSTER_POSITIONS: Record<GuestPipelineStage, { readonly nx: number; readonly ny: number }> = {
  registered:   { nx: 0.08, ny: 0.45 },
  first_visit:  { nx: 0.24, ny: 0.30 },
  trial_active: { nx: 0.42, ny: 0.48 },
  ready:        { nx: 0.60, ny: 0.30 },
  converted:    { nx: 0.78, ny: 0.45 },
  dormant:      { nx: 0.50, ny: 0.82 },
} as const;

/**
 * Hex colors for canvas rendering.
 * Resolves CSS variables to actual hex values.
 */
const STAGE_HEX_COLORS: Record<GuestPipelineStage, string> = {
  registered:   "#7a7570",
  first_visit:  "#4ecdc4",
  trial_active: "#f5a623",
  ready:        "#2ecc71",
  converted:    "#d4a853",
  dormant:      "#e74c3c",
} as const;

const NODE_TYPE_COLORS: Record<EcosystemNodeType, string> = {
  stage_anchor:    "#ffffff",
  guest_quickwin:  "#d4a853",
  guest_referrer:  "#4ecdc4",
  guest_proposal:  "#ffa726",
} as const;

/** Max individual guest nodes per category. */
const NODE_LIMITS = {
  maxQuickWins: 5,
  maxReferrers: 8,
  maxProposals: 8,
} as const;
/** Golden angle for sunflower spiral positioning. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Spread factor for guest nodes within cluster regions. */
const CLUSTER_SPREAD = 0.06;

/** Pixel radius for stage anchor nodes. */
const STAGE_ANCHOR_RADIUS = 28;

/** Base pixel radius for guest-type nodes. */
const GUEST_BASE_RADIUS = 7;

// ═══════════════════════════════════════════════════════════
// §4 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Position a guest node within its cluster using sunflower spiral. */
function positionInCluster(
  clusterNx: number,
  clusterNy: number,
  index: number,
  total: number,
  spread: number,
): { readonly nx: number; readonly ny: number } {
  const angle = index * GOLDEN_ANGLE;
  const r = Math.sqrt((index + 0.5) / Math.max(total, 1)) * spread;
  return {
    nx: Math.max(0.02, Math.min(0.98, clusterNx + r * Math.cos(angle))),
    ny: Math.max(0.02, Math.min(0.98, clusterNy + r * Math.sin(angle) * 0.65)),
  };
}

/** Map proposal type to target pipeline stage. */
function proposalTargetStage(
  proposalType: GuestEngagementProposal["proposal_type"],
): GuestPipelineStage {
  switch (proposalType) {
    case "trial_invitation":
      return "first_visit";
    case "follow_up_campaign":
      return "trial_active";
    case "conversion_nudge":
      return "ready";
    case "privilege_expansion":
    case "referral_activation":
      return "converted";
    case "event_outreach":
      return "registered";
    default:
      return "ready";
  }
}

/** Numeric priority rank for comparison. */
function priorityRank(priority: string): number {
  switch (priority) {
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

/** Build a unique node ID. */
function nodeId(type: EcosystemNodeType, key: string): string {
  return `${type}_${key}`;
}

// ═══════════════════════════════════════════════════════════
// §5 — CLUSTER GENERATION
// ═══════════════════════════════════════════════════════════

function buildClusters(pipeline: PipelineEcosystem): readonly EcosystemCluster[] {
  return pipeline.stages.map((stage) => {
    const bottleneck = pipeline.bottlenecks.find((b) => b.stageId === stage.id);
    const pos = CLUSTER_POSITIONS[stage.id] ?? { nx: 0.5, ny: 0.5 };

    return {
      id: stage.id,
      label: stage.label,
      nx: pos.nx,
      ny: pos.ny,
      count: stage.count,
      color: STAGE_HEX_COLORS[stage.id] ?? "#7a7570",
      isBottleneck: bottleneck !== undefined,
      severity: bottleneck?.severity,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// §6 — NODE GENERATION
// ═══════════════════════════════════════════════════════════

/** Generate stage anchor nodes (one per pipeline stage). */
function buildStageAnchors(
  clusters: readonly EcosystemCluster[],
): readonly EcosystemNode[] {
  return clusters.map((cluster) => ({
    id: nodeId("stage_anchor", cluster.id),
    label: cluster.label,
    type: "stage_anchor" as const,
    nx: cluster.nx,
    ny: cluster.ny,
    radius: STAGE_ANCHOR_RADIUS,
    color: cluster.color,
    alpha: cluster.isBottleneck ? 0.5 : 0.35,
    metadata: {
      stageId: cluster.id,
      count: cluster.count,
      isBottleneck: cluster.isBottleneck,
      severity: cluster.severity,
    },
  }));
}

/** Generate QuickWin guest nodes. */
function buildQuickWinNodes(
  pipeline: PipelineEcosystem,
  clusters: readonly EcosystemCluster[],
): readonly EcosystemNode[] {
  const readyCluster = clusters.find((c) => c.id === "ready");
  if (!readyCluster) return [];

  const wins = pipeline.quickWins.slice(0, NODE_LIMITS.maxQuickWins);
  const total = wins.length;

  return wins.map((qw, i) => {
    const pos = positionInCluster(
      readyCluster.nx,
      readyCluster.ny,
      i,
      total,
      CLUSTER_SPREAD,
    );

    return {
      id: nodeId("guest_quickwin", qw.guestId as string),
      label: qw.guestName,
      type: "guest_quickwin" as const,
      nx: pos.nx,
      ny: pos.ny,
      radius: GUEST_BASE_RADIUS + 2,
      color: NODE_TYPE_COLORS.guest_quickwin,
      alpha: 0.9,
      metadata: {
        guestId: qw.guestId as string,
        guestName: qw.guestName,
        actionNeeded: qw.actionNeeded,
        estimatedImpact: qw.estimatedImpact,
        stageId: "ready",
      },
    };
  });
}

/** Generate referrer family nodes. */
function buildReferrerNodes(
  analytics: GuestAnalyticsEnhanced,
  clusters: readonly EcosystemCluster[],
): readonly EcosystemNode[] {
  const convertedCluster = clusters.find((c) => c.id === "converted");
  if (!convertedCluster) return [];

  const referrers = analytics.top_referrers.slice(0, NODE_LIMITS.maxReferrers);
  const total = referrers.length;

  return referrers.map((ref, i) => {
    const pos = positionInCluster(
      convertedCluster.nx,
      convertedCluster.ny,
      i,
      total,
      CLUSTER_SPREAD * 1.3,
    );

    const radiusScale = Math.min(1, ref.referral_count / 10);

    return {
      id: nodeId("guest_referrer", ref.family_id),
      label: `Familia ${ref.family_id.slice(-4)}`,
      type: "guest_referrer" as const,
      nx: pos.nx,
      ny: pos.ny,
      radius: GUEST_BASE_RADIUS + radiusScale * 5,
      color: NODE_TYPE_COLORS.guest_referrer,
      alpha: 0.8,
      metadata: {
        familyId: ref.family_id,
        referralCount: ref.referral_count,
        convertedCount: ref.converted_count,
      },
    };
  });
}

/** Generate proposal target nodes (deduplicated by guest, highest priority wins). */
function buildProposalNodes(
  proposals: GuestEngagementProposalList,
  clusters: readonly EcosystemCluster[],
): readonly EcosystemNode[] {
  // Deduplicate: one node per unique guest, keep highest priority proposal
  const guestMap = new Map<string, { proposal: GuestEngagementProposal; guestId: string }>();

  for (const proposal of proposals.proposals) {
    for (const guestId of proposal.target_guest_ids) {
      const existing = guestMap.get(guestId);
      if (!existing || priorityRank(proposal.priority) > priorityRank(existing.proposal.priority)) {
        guestMap.set(guestId, { proposal, guestId });
      }
    }
  }

  const entries = [...guestMap.values()].slice(0, NODE_LIMITS.maxProposals);
  const nodes: EcosystemNode[] = [];

  for (const { proposal, guestId } of entries) {
    const targetStage = proposalTargetStage(proposal.proposal_type);
    const cluster = clusters.find((c) => c.id === targetStage);
    if (!cluster) continue;

    // Position within the target stage cluster
    const indexInCluster = nodes.length;
    const pos = positionInCluster(
      cluster.nx,
      cluster.ny,
      indexInCluster,
      entries.length,
      CLUSTER_SPREAD * 1.1,
    );

    const radiusBoost = proposal.priority === "high" ? 3 : proposal.priority === "medium" ? 1 : 0;

    nodes.push({
      id: nodeId("guest_proposal", guestId),
      label: proposal.title,
      type: "guest_proposal",
      nx: pos.nx,
      ny: pos.ny,
      radius: GUEST_BASE_RADIUS + radiusBoost,
      color: NODE_TYPE_COLORS.guest_proposal,
      alpha: proposal.priority === "high" ? 0.9 : 0.65,
      metadata: {
        guestId,
        proposalTitle: proposal.title,
        proposalPriority: proposal.priority,
        proposalType: proposal.proposal_type,
        stageId: targetStage,
      },
    });
  }

  return nodes;
}

// ═══════════════════════════════════════════════════════════
// §7 — CONNECTION GENERATION
// ═══════════════════════════════════════════════════════════

/** Generate pipeline flow connections between stage anchors. */
function buildFlowConnections(
  pipeline: PipelineEcosystem,
): readonly EcosystemConnection[] {
  return pipeline.flows.map((flow) => ({
    fromId: nodeId("stage_anchor", flow.fromStage),
    toId: nodeId("stage_anchor", flow.toStage),
    strength: Math.min(100, Math.round((flow.count / Math.max(pipeline.totalGuests, 1)) * 100 * 5)),
    type: "pipeline_flow" as const,
  }));
}

/** Generate referral influence connections (referrer → converted anchor). */
function buildReferralConnections(
  analytics: GuestAnalyticsEnhanced,
): readonly EcosystemConnection[] {
  return analytics.top_referrers
    .filter((ref) => ref.converted_count > 0)
    .slice(0, NODE_LIMITS.maxReferrers)
    .map((ref) => ({
      fromId: nodeId("guest_referrer", ref.family_id),
      toId: nodeId("stage_anchor", "converted"),
      strength: Math.min(100, Math.round((ref.converted_count / Math.max(ref.referral_count, 1)) * 100)),
      type: "referral_influence" as const,
    }));
}

// ═══════════════════════════════════════════════════════════
// §8 — MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete ecosystem map from pipeline, analytics, and proposal data.
 * Returns positioned nodes, connections, and clusters for canvas rendering.
 *
 * @param input - Pipeline, analytics, and proposal data (any can be null)
 * @returns EcosystemMap with nodes, connections, clusters, metadata
 */
export function buildEcosystemMap(input: EcosystemInput): EcosystemMap {
  if (!input.pipeline) {
    return {
      nodes: [],
      connections: [],
      clusters: [],
      metadata: {
        totalNodes: 0,
        totalGuests: 0,
        pipelineHealth: 0,
        computedAt: new Date().toISOString(),
      },
    };
  }

  const clusters = buildClusters(input.pipeline);
  const stageAnchors = buildStageAnchors(clusters);
  const quickWinNodes = buildQuickWinNodes(input.pipeline, clusters);
  const referrerNodes = input.analytics
    ? buildReferrerNodes(input.analytics, clusters)
    : [];
  const proposalNodes = input.proposals
    ? buildProposalNodes(input.proposals, clusters)
    : [];

  const allNodes: EcosystemNode[] = [
    ...stageAnchors,
    ...quickWinNodes,
    ...referrerNodes,
    ...proposalNodes,
  ];

  const flowConnections = buildFlowConnections(input.pipeline);
  const referralConnections = input.analytics
    ? buildReferralConnections(input.analytics)
    : [];

  const allConnections: EcosystemConnection[] = [
    ...flowConnections,
    ...referralConnections,
  ];

  return {
    nodes: allNodes,
    connections: allConnections,
    clusters,
    metadata: {
      totalNodes: allNodes.length,
      totalGuests: input.pipeline.totalGuests,
      pipelineHealth: input.pipeline.health,
      computedAt: new Date().toISOString(),
    },
  };
}

/**
 * Safe variant — never throws. Returns empty map on error.
 */
export function buildEcosystemMapSafe(input: EcosystemInput): EcosystemMap {
  try {
    return buildEcosystemMap(input);
  } catch {
    return {
      nodes: [],
      connections: [],
      clusters: [],
      metadata: {
        totalNodes: 0,
        totalGuests: 0,
        pipelineHealth: 0,
        computedAt: new Date().toISOString(),
      },
    };
  }
}