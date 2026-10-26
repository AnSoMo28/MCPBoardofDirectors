// ═══════════════════════════════════════════════════════════
// src/features/families/lib/socialNarrative.ts
// Phase 34+ Migration — Social Narrative System
// Level 6+ Agency · Production Grade
//
// AI storytelling for social networks. Generates human-readable
// narratives from topology analysis, predictions, and graph data.
// Used by: SocialNarrativeOverlay, advisor, MCP tools.
//
// PRE-WRITE VERIFICATION:
//   TopologyGraph, TopoNode, TopoEdge, TopologyAnalysis,
//   Community, CentralityResult, IsolationState, StrengthSample
//     → ./socialTopology.ts ✅
//   SocialPredictions, DecayAlert, OptimalIntroduction, ChurnSocialRisk
//     → ./socialPredictions.ts ✅
//   NARRATIVE_TEMPLATES, CLUSTER_IDENTITIES, NarrativeTone
//     → ../config.ts §30 ✅ (added in config additions)
//
// ANTI-PATTERNS REMOVED:
//   - TopoNode, TopoEdge, CentralityResult, IsolationState imported but
//     unused in signatures → removed (accessed via graph/analysis)
//   - Mutable interfaces → readonly
//   - nameAllCommunities mutates Community objects → returns new objects
//   - nodeEdges.sort() mutates filtered array → [...nodeEdges].sort()
//   - strengthHistory! non-null assertion ×4 → nullish coalescing
//   - t! non-null assertion → optional chaining + filter(Boolean)
//   - toneConfig spreads config blindly → explicit destructuring
//   - No § markers → 7 sections
//   - No JSDoc → all public exports documented
//   - No PRE-WRITE VERIFICATION → header block
//
// §13 DEFERRED (Phase 34.1):
//   A13 — Insight-driven narratives with confidence + pattern detection
//   A14 — Sequential narrative chaining (context → insight → action)
//   A15 — Community naming from activity patterns (not tier fallback)
// ═══════════════════════════════════════════════════════════

import type {
  TopologyGraph,
  TopologyAnalysis,
  Community,
} from "./socialTopology";

import type {
  SocialPredictions,
  ChurnSocialRisk,
  OptimalIntroduction,
} from "./socialPredictions";

import {
  NARRATIVE_TEMPLATES,
  CLUSTER_IDENTITIES,
} from "../config";
import type {
  MemberTier,
  NarrativeTone,
} from "../types";
// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** A single narrative story about a node, edge, or network */
export interface SocialNarrative {
  readonly id: string;
  readonly type: "position" | "connection" | "risk" | "opportunity" | "cluster" | "network";
  readonly tone: NarrativeTone;
  readonly headline: string;
  readonly body: string;
  readonly icon: string;
  readonly color: string;
  readonly bgColor: string;
  readonly priority: number;
  /** IDs of nodes/edges this narrative references */
  readonly sourceIds: readonly string[];
  readonly action?: Readonly<{ label: string; type: string }>;
}

/** Complete narrative set for a single family node */
export interface NodeNarrativeSet {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly position: SocialNarrative;
  readonly connections: readonly SocialNarrative[];
  readonly risks: readonly SocialNarrative[];
  readonly opportunities: readonly SocialNarrative[];
  /** All narratives combined, sorted by priority (highest first) */
  readonly all: readonly SocialNarrative[];
}

/** Network-level narrative — the club's social story */
export interface NetworkNarrative {
  readonly headline: string;
  readonly summary: string;
  readonly stories: readonly SocialNarrative[];
  readonly healthStatement: string;
  readonly topAction: SocialNarrative | null;
}

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

/** Extract tone-related visual properties from config */
function toneConfig(tone: NarrativeTone): {
  readonly tone: NarrativeTone;
  readonly icon: string;
  readonly color: string;
  readonly bgColor: string;
} {
  const cfg = NARRATIVE_TEMPLATES[tone];
  return {
    tone,
    icon: cfg.icon,
    color: cfg.color,
    bgColor: cfg.bgColor,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/** Safely get velocity from edge strength history */
function edgeVelocity(
  history: ReadonlyArray<{ readonly date: string; readonly value: number }> | undefined,
): number {
  if (!history || history.length < 2) return 0;
  return history[history.length - 1].value - history[0].value;
}

// ═══════════════════════════════════════════════════════════
// §3  Position Story — Where a family sits in the network
// ═══════════════════════════════════════════════════════════

/**
 * Generate a narrative about a family's position in the social graph.
 * Classifies the family as: hub, bridge, isolated, connected, or default.
 *
 * @param nodeId - The family to describe
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 */
export function generatePositionStory(
  nodeId: string,
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
): SocialNarrative {
  const node = graph.nodes.find((n) => n.id === nodeId);
  const centrality = analysis.centralities.get(nodeId);
  const isolation = analysis.isolations.get(nodeId);
  const communities = analysis.communities.filter((c) =>
    c.nodeIds.includes(nodeId),
  );
  const bridges = analysis.bridges.filter((b) => b.nodeId === nodeId);
  const name = node?.label ?? nodeId;

  if (!centrality || !isolation) {
    return {
      id: `pos-${nodeId}`,
      type: "position",
      ...toneConfig("observational"),
      headline: `${name}`,
      body: "Sin datos suficientes para generar narrativa.",
      priority: 0,
      sourceIds: [nodeId],
    };
  }

  // Hub — most central node
  if (centrality.rank === 1 && centrality.degree >= 3) {
    return {
      id: `pos-${nodeId}-hub`,
      type: "position",
      ...toneConfig("celebratory"),
      headline: `${name} — Corazón de la red social`,
      body:
        `La familia ${name} es el nodo más conectado del club con ` +
        `${centrality.degree} conexiones activas y un peso social de ` +
        `${formatPercent(centrality.weightedDegree / Math.max(centrality.degree, 1))}. ` +
        `Su posición central las convierte en el punto de encuentro natural de ` +
        `${communities.length > 1 ? `${communities.length} comunidades distintas` : "la comunidad"}.`,
      priority: 1,
      sourceIds: [nodeId],
      action: { label: "Fortalecer posición", type: "strengthen" },
    };
  }

  // Bridge — connects disconnected communities
  if (bridges.length > 0) {
    const maxCriticality = Math.max(...bridges.map((b) => b.criticality));
    const toneKey: NarrativeTone =
      maxCriticality > 0.6 ? "urgent" : "actionable";

    return {
      id: `pos-${nodeId}-bridge`,
      type: "position",
      ...toneConfig(toneKey),
      headline: `${name} — Puente entre comunidades`,
      body:
        `${name} conecta ${bridges.length} grupo${bridges.length > 1 ? "s" : ""} ` +
        `que de otro modo estarían aislados. ` +
        (maxCriticality > 0.6
          ? "Su partida fragmentaría la red."
          : "Mantener esta conexión activa es clave para la cohesión del club."),
      priority: maxCriticality > 0.6 ? 3 : 2,
      sourceIds: [
        nodeId,
        ...bridges.flatMap((b) => [...b.connectsCommunities]),
      ],
      action: { label: "Proteger puente", type: "protect" },
    };
  }

  // Isolated
  if (isolation.score > 0.7) {
    return {
      id: `pos-${nodeId}-isolated`,
      type: "position",
      ...toneConfig("urgent"),
      headline: `${name} — En riesgo de aislamiento`,
      body:
        `Solo ${isolation.activeConnections} conexión${isolation.activeConnections !== 1 ? "es" : ""} ` +
        `activa${isolation.activeConnections !== 1 ? "s" : ""}. ` +
        (isolation.daysSinceLastInteraction > 30
          ? `${isolation.daysSinceLastInteraction} días sin interacción social. `
          : "") +
        "Sin intervención, esta familia podría perder su vínculo con el club.",
      priority: 3,
      sourceIds: [nodeId],
      action: { label: "Reconectar", type: "reconnect" },
    };
  }

  // Well connected
  if (centrality.degree >= 2) {
    return {
      id: `pos-${nodeId}-connected`,
      type: "position",
      ...toneConfig("observational"),
      headline: `${name} — Bien integrada`,
      body:
        `Con ${centrality.degree} conexiones` +
        (communities.length > 0
          ? ` en ${communities.length} grupo${communities.length > 1 ? "s" : ""}`
          : "") +
        `, ${name} forma parte activa de la red social del club.`,
      priority: 1,
      sourceIds: [nodeId],
    };
  }

  // Default
  return {
    id: `pos-${nodeId}-default`,
    type: "position",
    ...toneConfig("observational"),
    headline: `${name}`,
    body: `Con ${centrality.degree} conexión${centrality.degree !== 1 ? "es" : ""} en la red social.`,
    priority: 1,
    sourceIds: [nodeId],
  };
}

// ═══════════════════════════════════════════════════════════
// §4  Connection Story — Narrative for an edge
// ═══════════════════════════════════════════════════════════

/**
 * Generate a narrative about a specific social bond.
 * Classifies as: strong+growing, decaying, medium, or weak.
 *
 * @param edge - The edge to describe
 * @param graph - The topology graph
 */
export function generateConnectionStory(
  edge: TopologyGraph["edges"][number],
  graph: TopologyGraph,
): SocialNarrative {
  const source = graph.nodes.find((n) => n.id === edge.source);
  const target = graph.nodes.find((n) => n.id === edge.target);
  const sName = source?.label ?? "Familia A";
  const tName = target?.label ?? "Familia B";

  const strength = edge.strength;
  const velocity = edgeVelocity(edge.strengthHistory);
  const lastDays = edge.lastInteraction
    ? daysSince(edge.lastInteraction)
    : 999;

  // Strong and growing
  if (strength > 0.7 && velocity > 0) {
    return {
      id: `conn-${edge.source}-${edge.target}-strong`,
      type: "connection",
      ...toneConfig("celebratory"),
      headline: `${sName} ↔ ${tName}`,
      body:
        "Una de las conexiones más fuertes del club. " +
        (edge.sharedActivities?.length
          ? `Comparten ${edge.sharedActivities.join(", ")}. `
          : "") +
        (velocity > 0.1
          ? "Se ha fortalecido notablemente en los últimos meses."
          : ""),
      priority: 1,
      sourceIds: [edge.source, edge.target],
    };
  }

  // Decaying
  if (velocity < -0.1) {
    return {
      id: `conn-${edge.source}-${edge.target}-decay`,
      type: "connection",
      ...toneConfig("urgent"),
      headline: `${sName} ↔ ${tName} — Se debilita`,
      body:
        `Esta conexión ha perdido ${formatPercent(Math.abs(velocity))} de su fuerza. ` +
        (lastDays > 30
          ? `Última interacción hace ${lastDays} días. `
          : "") +
        "Sin actividad compartida, podría perderse.",
      priority: 3,
      sourceIds: [edge.source, edge.target],
      action: { label: "Activar conexión", type: "activate" },
    };
  }

  // Medium strength
  if (strength > 0.3) {
    return {
      id: `conn-${edge.source}-${edge.target}-medium`,
      type: "connection",
      ...toneConfig("observational"),
      headline: `${sName} ↔ ${tName}`,
      body:
        `${edge.relationship}. ` +
        (edge.sharedActivities?.length
          ? `Actividades: ${edge.sharedActivities.slice(0, 2).join(", ")}. `
          : "") +
        "Potencial de crecimiento.",
      priority: 2,
      sourceIds: [edge.source, edge.target],
    };
  }

  // Weak
  return {
    id: `conn-${edge.source}-${edge.target}-weak`,
    type: "connection",
    ...toneConfig("actionable"),
    headline: `${sName} ↔ ${tName} — Conexión débil`,
    body:
      `Solo ${formatPercent(strength)} de fuerza. ${edge.relationship}. ` +
      (lastDays > 60
        ? `${lastDays} días sin interacción.`
        : "Oportunidad para fortalecer."),
    priority: 2,
    sourceIds: [edge.source, edge.target],
    action: { label: "Sugerir actividad", type: "suggest" },
  };
}

// ═══════════════════════════════════════════════════════════
// §5  Risk Story — Narrative from churn risk assessment
// ═══════════════════════════════════════════════════════════

/**
 * Generate an urgent narrative about a family at social churn risk.
 */
export function generateRiskStory(risk: ChurnSocialRisk): SocialNarrative {
  const topFactor = risk.factors[0]?.factor ?? "factores desconocidos";

  return {
    id: `risk-${risk.familyId}`,
    type: "risk",
    ...toneConfig("urgent"),
    headline: `${risk.familyName} — Riesgo social ${Math.round(risk.riskScore * 100)}%`,
    body:
      `${topFactor}. ` +
      (risk.cascadeImpact.length > 0
        ? `Su alejamiento afectaría a ${risk.cascadeImpact.length} familia${risk.cascadeImpact.length > 1 ? "s" : ""} más. `
        : "") +
      risk.intervention,
    priority: 3,
    sourceIds: [
      risk.familyId,
      ...risk.cascadeImpact.map((c) => c.affectedId),
    ],
    action: { label: risk.intervention, type: "intervene" },
  };
}

// ═══════════════════════════════════════════════════════════
// §6  Opportunity Story — Narrative from optimal introduction
// ═══════════════════════════════════════════════════════════

/**
 * Generate an actionable narrative about a suggested introduction.
 */
export function generateOpportunityStory(
  intro: OptimalIntroduction,
): SocialNarrative {
  return {
    id: `opp-${intro.familyA}-${intro.familyB}`,
    type: "opportunity",
    ...toneConfig("actionable"),
    headline: `Conectar: ${intro.familyAName} ↔ ${intro.familyBName}`,
    body:
      `${intro.reason}. ` +
      (intro.suggestedContext
        ? `Contexto ideal: ${intro.suggestedContext}. `
        : "") +
      (intro.sharedInterests.length
        ? `Intereses compartidos: ${intro.sharedInterests.join(", ")}. `
        : "") +
      `Impacto estimado: ${formatPercent(intro.impactScore)}.`,
    priority: 2,
    sourceIds: [intro.familyA, intro.familyB],
    action: { label: intro.suggestedContext, type: "introduce" },
  };
}

// ═══════════════════════════════════════════════════════════
// §7  Cluster Story — Narrative for a community
// ═══════════════════════════════════════════════════════════

/**
 * Generate a narrative about a detected community (cluster).
 */
export function generateClusterStory(
  community: Community,
  graph: TopologyGraph,
): SocialNarrative {
  const memberNames = community.nodeIds
    .map((id) => graph.nodes.find((n) => n.id === id)?.label)
    .filter((name): name is string => Boolean(name));

  const healthVerb =
    community.health === "growing"
      ? "crece"
      : community.health === "declining"
        ? "se debilita"
        : "está estable";

  const toneKey: NarrativeTone =
    community.health === "declining" ? "urgent" : "observational";

  return {
    id: `cluster-${community.id}`,
    type: "cluster",
    ...toneConfig(toneKey),
    headline: community.name || `Cluster ${community.id}`,
    body:
      `${memberNames.length} familias unidas. Cohesión: ${formatPercent(community.cohesion)}. ` +
      `La comunidad ${healthVerb}.` +
      (community.dominantActivity
        ? ` Actividad dominante: ${community.dominantActivity}.`
        : ""),
    priority: community.health === "declining" ? 3 : 1,
    sourceIds: [...community.nodeIds],
  };
}

// ═══════════════════════════════════════════════════════════
// §8  Community Naming — AI-generated cluster names
// ═══════════════════════════════════════════════════════════

/**
 * Generate a human-readable name for a community.
 * Strategy: match dominant activity to known identities,
 * then infer from member tiers.
 *
 * @phase34.1 A15 — Upgrade to infer from activity patterns + demographics
 */
export function nameCommunity(
  community: Community,
  nodes: readonly TopologyGraph["nodes"][number][],
): string {
  // Match dominant activity to known identities
  if (community.dominantActivity) {
    const identity = CLUSTER_IDENTITIES.find(
      (c) => c.type === community.dominantActivity,
    );
    if (identity) return identity.name;
  }

  // Fallback: infer from member tiers
  const tiers = community.nodeIds
    .map((id) => nodes.find((n) => n.id === id)?.tier)
    .filter((t): t is MemberTier => Boolean(t));

  const tierCounts = new Map<MemberTier, number>();
  for (const t of tiers) {
    tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1);
  }

  const dominantTier = [...tierCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tier]) => tier)[0];

  if (dominantTier === "platino") return "Círculo Platino";
  if (dominantTier === "oro") return "Red Dorada";
  if (dominantTier === "plata") return "Comunidad Activa";

  return `Cluster ${community.id.split("-").pop() ?? community.id}`;
}

/**
 * Name all communities in an analysis result.
 * Returns NEW community objects — does not mutate input.
 *
 * @returns New array with communities named
 */
export function nameAllCommunities(
  communities: readonly Community[],
  nodes: readonly TopologyGraph["nodes"][number][],
): readonly Community[] {
  return communities.map((c) => ({
    ...c,
    name: c.name || nameCommunity(c, nodes),
  }));
}

// ═══════════════════════════════════════════════════════════
// §9  Node Narrative Set — All stories for one family
// ═══════════════════════════════════════════════════════════

/**
 * Generate the complete narrative set for a single family.
 * Includes: position story, top connection stories, risk narratives,
 * opportunity narratives, and decay alerts.
 *
 * @param nodeId - The family to narrate
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 * @param predictions - Pre-computed social predictions
 */
export function generateNodeNarratives(
  nodeId: string,
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
  predictions: SocialPredictions,
): NodeNarrativeSet {
  const node = graph.nodes.find((n) => n.id === nodeId);
  const name = node?.label ?? nodeId;

  // Position story
  const position = generatePositionStory(nodeId, graph, analysis);

  // Connection stories — top 3, prioritizing decaying bonds
  const nodeEdges = graph.edges.filter(
    (e) => e.source === nodeId || e.target === nodeId,
  );

  const sortedEdges = [...nodeEdges].sort((a, b) => {
    const aVelocity = edgeVelocity(a.strengthHistory);
    const bVelocity = edgeVelocity(b.strengthHistory);
    // Decaying first, then by strength
    if (aVelocity < -0.1 && bVelocity >= -0.1) return -1;
    if (bVelocity < -0.1 && aVelocity >= -0.1) return 1;
    return b.strength - a.strength;
  });

  const connectionStories = sortedEdges
    .slice(0, 3)
    .map((edge) => generateConnectionStory(edge, graph));

  // Risk narratives
  const nodeRisks = predictions.churnRisks
    .filter(
      (r) =>
        r.familyId === nodeId ||
        r.cascadeImpact.some((c) => c.affectedId === nodeId),
    )
    .map((r) => generateRiskStory(r));

  // Opportunity narratives
  const nodeOpps = predictions.optimalIntroductions
    .filter((o) => o.familyA === nodeId || o.familyB === nodeId)
    .map((o) => generateOpportunityStory(o));

  // Decay alerts → risk narratives
  const decayRisks: SocialNarrative[] = predictions.decayAlerts
    .filter((d) => d.sourceId === nodeId || d.targetId === nodeId)
    .map((d) => {
      const otherName =
        d.sourceId === nodeId ? d.targetName : d.sourceName;
      const toneKey: NarrativeTone =
        d.severity === "critical" ? "urgent" : "actionable";

      return {
        id: `decay-${d.edgeId}`,
        type: "risk" as const,
        ...toneConfig(toneKey),
        headline: `Conexión con ${otherName} — ${d.severity === "critical" ? "crítica" : "en riesgo"}`,
        body:
          `Fuerza actual: ${formatPercent(d.currentStrength)}. ` +
          (d.daysToCritical < 30
            ? `Podría caer por debajo del mínimo en ${d.daysToCritical} días.`
            : "Tendencia descendente."),
        priority: d.severity === "critical" ? 3 : 2,
        sourceIds: [d.sourceId, d.targetId],
        action: { label: "Activar conexión", type: "activate" },
      } satisfies SocialNarrative;
    });

  const all = [
    position,
    ...connectionStories,
    ...nodeRisks,
    ...decayRisks,
    ...nodeOpps,
  ].sort((a, b) => b.priority - a.priority);

  return {
    nodeId,
    nodeName: name,
    position,
    connections: connectionStories,
    risks: [...nodeRisks, ...decayRisks],
    opportunities: nodeOpps,
    all,
  };
}

// ═══════════════════════════════════════════════════════════
// §10  Network Narrative — Overall club story
// ═══════════════════════════════════════════════════════════

/**
 * Generate the network-level narrative — the club's social story.
 * Combines health statement, bridge alerts, top risks,
 * top opportunities, and community stories.
 *
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 * @param predictions - Pre-computed social predictions
 */
export function generateNetworkNarrative(
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
  predictions: SocialPredictions,
): NetworkNarrative {
  const health = analysis.networkHealth;
  const stories: SocialNarrative[] = [];

  // Health statement
  const healthStatement =
    health.score >= 80
      ? "La red social del club es fuerte y cohesiva."
      : health.score >= 60
        ? "La red social es funcional pero tiene áreas de mejora."
        : health.score >= 40
          ? "La red social muestra signos de fragmentación."
          : "La red social requiere atención inmediata.";

  // Network contraction alert
  if (health.trend === "contracting") {
    stories.push({
      id: "net-contracting",
      type: "network",
      ...toneConfig("urgent"),
      headline: "La red social se contrae",
      body:
        `${health.isolatedNodes} familias aisladas. ` +
        `${health.criticalBridges} puentes críticos. ` +
        "La tendencia es de pérdida de conexiones.",
      priority: 3,
      sourceIds: [],
      action: { label: "Plan de reconexión", type: "reconnect-plan" },
    });
  }

  // Bridge stories (top 2)
  for (const bridge of analysis.bridges.slice(0, 2)) {
    const node = graph.nodes.find((n) => n.id === bridge.nodeId);
    if (!node) continue;

    const toneKey: NarrativeTone =
      bridge.criticality > 0.6 ? "urgent" : "actionable";

    stories.push({
      id: `net-bridge-${bridge.nodeId}`,
      type: "network",
      ...toneConfig(toneKey),
      headline: `Puente crítico: ${node.label}`,
      body: bridge.fragmentationImpact,
      priority: bridge.criticality > 0.6 ? 3 : 2,
      sourceIds: [bridge.nodeId],
      action: { label: "Proteger puente", type: "protect" },
    });
  }

  // Top risk
  if (predictions.churnRisks.length > 0) {
    stories.push(generateRiskStory(predictions.churnRisks[0]));
  }

  // Top opportunity
  if (predictions.optimalIntroductions.length > 0) {
    stories.push(
      generateOpportunityStory(predictions.optimalIntroductions[0]),
    );
  }

  // Community stories (top 2)
  for (const community of analysis.communities.slice(0, 2)) {
    stories.push(generateClusterStory(community, graph));
  }

  const sorted = [...stories].sort((a, b) => b.priority - a.priority);

  return {
    headline:
      health.score >= 70
        ? `Red social activa — ${health.score}/100`
        : health.score >= 40
          ? `Red social con oportunidades — ${health.score}/100`
          : `Red social requiere atención — ${health.score}/100`,
    summary:
      `${graph.nodes.length} familias, ${graph.edges.length} conexiones, ` +
      `${analysis.communities.length} comunidades. ${healthStatement}`,
    stories: sorted,
    healthStatement,
    topAction: sorted.find((s) => s.action) ?? null,
  };
}