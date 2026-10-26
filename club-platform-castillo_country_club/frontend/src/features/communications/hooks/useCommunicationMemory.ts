// src/features/communications/hooks/useCommunicationMemory.ts
// ═══════════════════════════════════════════════════════════
// Conversation Memory — The Club Remembers
// Castillo Country Club — Phase 31 "The Voice"
//
// Every interaction the club has with a member is a node
// in a continuous memory graph. Topics are tracked across
// time, commitments are remembered, and the narrative
// arc of the relationship is maintained.
//
// This hook is the persistence layer of communication
// intelligence — it fetches, indexes, and serves the
// conversation memory that makes every new message feel
// like a continuation, not a restart.
//
// Uses communicationIntelligence + narrativeEngine.
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

import type {
  ConversationMemoryNode,
  NarrativeArc,
  HistoryItem,
  SentimentLevel
} from "../types";

import type {
  ContinuityContext,
  NarrativeBriefing,
} from "../lib/narrativeEngine";

import {
  COMMUNICATION_MCP_TOOLS,
  COMMUNICATION_FRESHNESS_TIERS,
} from "../config";

import {
  buildConversationGraph,
  buildNarrativeArc,
} from "../lib/communicationIntelligence";

import {
  buildContinuityContext,
  generateNarrativeBriefing,
  computeNarrativeMomentum,
} from "../lib/narrativeEngine";
// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Topic track — a topic's lifecycle across the conversation.
 * Shows how many times it appeared, its sentiment arc,
 * and when it was last discussed.
 */
export interface TopicTrack {
  topic: string;
  occurrences: number;
  firstMentioned: string;
  lastMentioned: string;
  sentimentArc: SentimentLevel[];
  currentSentiment: SentimentLevel;
  isResolved: boolean;
}

/**
 * Commitment — a promise made during communication.
 * Tracked until resolved or expired.
 */
export interface Commitment {
  id: string;
  text: string;
  dateMade: string;
  sourceNodeId: string;
  chapterTitle: string;
  status: "open" | "overdue" | "resolved";
  daysPending: number;
  urgency: "low" | "medium" | "high";
}

/**
 * Conversation memory state — the full memory graph
 * of a member's communication history.
 */
export interface ConversationMemoryState {
  nodes: ConversationMemoryNode[];
  arc: NarrativeArc | null;
  continuityContext: ContinuityContext | null;
  briefing: NarrativeBriefing | null;
  topicTracks: TopicTrack[];
  commitments: Commitment[];
  momentumScore: number;
  totalInteractions: number;
  timeSpanDays: number;
  isLoading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS — Topic & Commitment extraction
// ═══════════════════════════════════════════════════════════

/**
 * Extract topic tracks from conversation nodes.
 * Groups nodes by topic, tracks sentiment arc,
 * determines resolution status.
 */
function extractTopicTracks(
  nodes: ConversationMemoryNode[],
): TopicTrack[] {
  if (nodes.length === 0) return [];

  const topicGroups: Record<string, ConversationMemoryNode[]> = {};
  for (const node of nodes) {
    if (!topicGroups[node.topic]) topicGroups[node.topic] = [];
    topicGroups[node.topic].push(node);
  }

  const tracks: TopicTrack[] = [];

  for (const [topic, group] of Object.entries(topicGroups)) {
    const sorted = [...group].sort(
      (a: ConversationMemoryNode, b: ConversationMemoryNode) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const sentimentArc: SentimentLevel[] = sorted.map(
      (n: ConversationMemoryNode) => n.sentiment,
    );

    // Resolved if last node in topic has resolved outcome
    const lastNode = sorted[sorted.length - 1];
    const isResolved = lastNode?.outcome === "resolved";

    tracks.push({
      topic,
      occurrences: group.length,
      firstMentioned: sorted[0]?.date ?? "",
      lastMentioned: lastNode?.date ?? "",
      sentimentArc,
      currentSentiment: lastNode?.sentiment ?? "neutral",
      isResolved,
    });
  }

  // Sort: unresolved first, then by occurrences descending
  tracks.sort(
    (a: TopicTrack, b: TopicTrack) => {
      if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
      return b.occurrences - a.occurrences;
    },
  );

  return tracks;
}

/**
 * Extract commitments from conversation nodes and narrative chapters.
 * Looks for pending nodes with commitments and open callbacks.
 */
function extractCommitments(
  nodes: ConversationMemoryNode[],
  arc: NarrativeArc | null,
): Commitment[] {
  const commitments: Commitment[] = [];
  const now = Date.now();

  // From nodes with explicit commitments
  for (const node of nodes) {
    if (node.commitment && node.outcome === "pending") {
      const dateMs = new Date(node.date).getTime();
      const daysPending = Math.floor((now - dateMs) / (1000 * 60 * 60 * 24));

      const urgency: Commitment["urgency"] =
        daysPending > 14 ? "high" : daysPending > 7 ? "medium" : "low";

      const status: Commitment["status"] =
        node.callback_date && new Date(node.callback_date).getTime() < now
          ? "overdue"
          : "open";

      commitments.push({
        id: `commit-${node.id}`,
        text: node.commitment,
        dateMade: node.date,
        sourceNodeId: node.id,
        chapterTitle: node.topic,
        status,
        daysPending,
        urgency,
      });
    }
  }

  // From arc open callbacks (if not already captured)
  if (arc) {
    for (let i = 0; i < arc.open_callbacks.length; i++) {
      const callback = arc.open_callbacks[i];
      const alreadyCaptured = commitments.some(
        (c: Commitment) => c.text === callback,
      );
      if (!alreadyCaptured) {
        commitments.push({
          id: `callback-${i}`,
          text: callback,
          dateMade: arc.chapters[arc.chapters.length - 1]?.date ?? "",
          sourceNodeId: "",
          chapterTitle: arc.chapters[arc.chapters.length - 1]?.title ?? "",
          status: "open",
          daysPending: 0,
          urgency: "low",
        });
      }
    }
  }

  // Sort: overdue first, then high urgency, then daysPending descending
  commitments.sort(
    (a: Commitment, b: Commitment) => {
      if (a.status !== b.status) return a.status === "overdue" ? -1 : 1;
      const urgencyOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      const urgDiff =
        (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
      if (urgDiff !== 0) return urgDiff;
      return b.daysPending - a.daysPending;
    },
  );

  return commitments;
}

/**
 * Compute the time span of the conversation history in days.
 */
function computeTimeSpan(nodes: ConversationMemoryNode[]): number {
  if (nodes.length < 2) return 0;

  const sorted = [...nodes].sort(
    (a: ConversationMemoryNode, b: ConversationMemoryNode) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const first = new Date(sorted[0].date).getTime();
  const last = new Date(sorted[sorted.length - 1].date).getTime();

  return Math.floor((last - first) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Conversation Memory hook.
 *
 * Builds and serves the complete conversation memory graph
 * for a member. Provides:
 * - Memory nodes (each interaction recorded)
 * - Narrative arc (story structure)
 * - Continuity context (bridge to next message)
 * - Narrative briefing (staff-facing summary)
 * - Topic tracks (topic lifecycle)
 * - Commitments (open promises)
 * - Momentum score (relationship strength)
 *
 * @param memberId The member whose memory to retrieve.
 *   When undefined, returns empty state.
 */
export function useCommunicationMemory(memberId?: string) {
  // ── Data fetching ──────────────────────────────────────

  const historyQuery = useMCPQuery(
    memberId
      ? COMMUNICATION_MCP_TOOLS.GET_MEMBER_COMMUNICATION_HISTORY
      : COMMUNICATION_MCP_TOOLS.GET_COMMUNICATION_HISTORY,
    memberId ?? "",
    {
      staleTime: COMMUNICATION_FRESHNESS_TIERS.warm.maxAge,
      enabled: !!memberId,
    },
  );

  // ── Raw data extraction ────────────────────────────────

  const history: HistoryItem[] = useMemo(() => {
    const raw = historyQuery.data as
      | { history?: HistoryItem[] }
      | undefined;
    return raw?.history ?? [];
  }, [historyQuery.data]);

  // ── Graph construction ─────────────────────────────────

  const nodes: ConversationMemoryNode[] = useMemo(() => {
    if (!memberId || history.length === 0) return [];
    return buildConversationGraph(memberId, history);
  }, [memberId, history]);

  // ── Narrative arc ──────────────────────────────────────

  const arc: NarrativeArc | null = useMemo(() => {
    if (!memberId || nodes.length === 0) return null;
    return buildNarrativeArc(memberId, nodes);
  }, [memberId, nodes]);

  // ── Continuity context ─────────────────────────────────

  const continuityContext: ContinuityContext | null = useMemo(() => {
    if (!arc) return null;
    return buildContinuityContext(arc, nodes);
  }, [arc, nodes]);

  // ── Narrative briefing ─────────────────────────────────

  const briefing: NarrativeBriefing | null = useMemo(() => {
    if (!memberId || !arc) return null;

    // Compute silence days from last node
    const lastNode = nodes.length > 0
      ? [...nodes].sort(
          (a: ConversationMemoryNode, b: ConversationMemoryNode) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0]
      : null;

    const silenceDays = lastNode
      ? Math.floor(
          (Date.now() - new Date(lastNode.date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;

    return generateNarrativeBriefing(arc, nodes, silenceDays);
  }, [memberId, arc, nodes]);

  // ── Topic tracks ───────────────────────────────────────

  const topicTracks: TopicTrack[] = useMemo(
    () => extractTopicTracks(nodes),
    [nodes],
  );

  // ── Commitments ────────────────────────────────────────

  const commitments: Commitment[] = useMemo(
    () => extractCommitments(nodes, arc),
    [nodes, arc],
  );

  // ── Momentum ───────────────────────────────────────────

  const momentumScore: number = useMemo(
    () => (arc ? computeNarrativeMomentum(arc) : 0),
    [arc],
  );

  // ── Statistics ─────────────────────────────────────────

  const totalInteractions = nodes.length;

  const timeSpanDays = useMemo(
    () => computeTimeSpan(nodes),
    [nodes],
  );

  // ── Force refresh ──────────────────────────────────────

  const refresh = useCallback(() => {
    historyQuery.refetch();
  }, [historyQuery.refetch]);

  // ── Loading / error ────────────────────────────────────

  const isLoading = historyQuery.isLoading;

  const error = historyQuery.error?.message ?? null;

  // ── Assemble state ─────────────────────────────────────

  return useMemo<ConversationMemoryState>(
    () => ({
      nodes,
      arc,
      continuityContext,
      briefing,
      topicTracks,
      commitments,
      momentumScore,
      totalInteractions,
      timeSpanDays,
      isLoading,
      error,
    }),
    [
      nodes,
      arc,
      continuityContext,
      briefing,
      topicTracks,
      commitments,
      momentumScore,
      totalInteractions,
      timeSpanDays,
      isLoading,
      error,
      refresh,
    ],
  );
}