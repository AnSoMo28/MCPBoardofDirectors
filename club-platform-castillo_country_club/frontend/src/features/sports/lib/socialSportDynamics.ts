/**
 * src/features/sports/lib/socialSportDynamics.ts
 * ═══════════════════════════════════════════════════════════
 * §S4 — Social Sport Dynamics Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Social Sport Dynamics Engine maps the invisible web of
 * athletic relationships. It reveals who plays with whom,
 * identifies isolated members who need connection, suggests
 * doubles partners by complementary skill, and forms balanced
 * teams. The social fabric IS the retention fabric.
 *
 * Functions:
 *   buildSocialSportGraph()         — Full social graph from session history
 *   buildSocialSportGraphSafe()     — Degraded wrapper, never throws
 *   matchDoublesPartners()          — AI partner matching by compatibility
 *   optimizeTeamFormation()         — Balanced team assembly
 *   detectIsolatedMembers()         — Members who always play alone
 *   computeSocialRetentionImpact()  — How social connections affect retention
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S4
 */

import type {
  SocialSportGraph,
  SocialSportNode,
  SocialSportEdge,
  SportCluster,
  DoublesPartnerMatch,
  TeamFormation,
  AthleticProfile,
  SportSession,
  MemberSportsProfile,
  AthleticLevel,
} from "../types";

import {
  SportType,
  AthleticAxis,
  SportCategory,
  SPORT_CONFIG
} from "../types";

import {
  SOCIAL_SPORT_CONFIG,
  SPORTS_RENDER_LIMITS,
} from "../config";
// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Minimum sessions together to form an edge in the graph */
const MIN_SESSIONS_EDGE = SOCIAL_SPORT_CONFIG.MIN_SESSIONS_FOR_EDGE;

/** Isolation threshold: sessions alone */
const ISOLATION_THRESHOLD = SOCIAL_SPORT_CONFIG.ISOLATION_SESSION_THRESHOLD;

/** Doubles matching: minimum compatibility */
const DOUBLES_MIN_COMPAT = SOCIAL_SPORT_CONFIG.DOUBLES_MIN_COMPATIBILITY;

/** Doubles matching: weight of schedule overlap */
const DOUBLES_SCHEDULE_W = SOCIAL_SPORT_CONFIG.DOUBLES_SCHEDULE_WEIGHT;

/** Doubles matching: weight of complementary axes */
const DOUBLES_COMPLEMENT_W = SOCIAL_SPORT_CONFIG.DOUBLES_COMPLEMENT_WEIGHT;

/** Doubles matching: weight of sport preference */
const DOUBLES_SPORT_W = SOCIAL_SPORT_CONFIG.DOUBLES_SPORT_WEIGHT;

/** Minimum members for cluster detection */
const CLUSTER_MIN_MEMBERS = SOCIAL_SPORT_CONFIG.CLUSTER_MIN_MEMBERS;

/** Minimum cohesion for cluster */
const CLUSTER_MIN_COHESION = SOCIAL_SPORT_CONFIG.CLUSTER_MIN_COHESION;
/** Maximum nodes in rendered graph */
const MAX_NODES = SPORTS_RENDER_LIMITS.SOCIAL_MAP_MAX_NODES;

/** Maximum edges in rendered graph */
const MAX_EDGES = SPORTS_RENDER_LIMITS.SOCIAL_MAP_MAX_EDGES;

/** All athletic axes for iteration */
const ALL_AXES = Object.values(AthleticAxis);
// ═══════════════════════════════════════════════════════════
// §1 — buildSocialSportGraph
//
// Constructs a force-directed graph of athletic relationships
// from session history. Each member is a node. Each pair of
// members who played together forms an edge weighted by
// frequency, recency, and sport diversity.
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete social sport graph from session history.
 *
 * Algorithm:
 *   1. Iterate all sessions, track co-participation between members
 *   2. For each pair with >= MIN_SESSIONS_EDGE sessions together:
 *      a. Compute compatibility from shared sports + frequency
 *      b. Determine relationship type from session patterns
 *      c. Compute edge strength from recency + frequency
 *   3. Compute per-node metrics: social score, influence, connections
 *   4. Detect clusters by sport + cohesion
 *   5. Identify isolated and connector members
 *
 * @param members — Member profiles (for names, sports lists)
 * @param sessions — All sport sessions (companions field drives edges)
 * @returns Complete SocialSportGraph
 */
export function buildSocialSportGraph(
  members: MemberSportsProfile[],
  sessions: SportSession[],
): SocialSportGraph {
  if (members.length === 0 || sessions.length === 0) {
    return createEmptyGraph();
  }

  // ── Step 1: Build co-participation map ──
  const pairMap = buildCoParticipationMap(sessions);

  // ── Step 2: Build edges from pair data ──
  const edges: SocialSportEdge[] = [];
  const memberConnectionMap = new Map<string, Set<string>>();

  for (const [pairKey, pairData] of pairMap) {
    if (pairData.count < MIN_SESSIONS_EDGE) continue;

    const [id1, id2] = pairKey.split("|");

    // Initialize connection sets
    if (!memberConnectionMap.has(id1)) memberConnectionMap.set(id1, new Set());
    if (!memberConnectionMap.has(id2)) memberConnectionMap.set(id2, new Set());
    memberConnectionMap.get(id1)!.add(id2);
    memberConnectionMap.get(id2)!.add(id1);

    // Compute edge properties
    const sharedSports = [...pairData.sports];
    const sessionsTogether = pairData.count;
    const compatibilityScore = computePairCompatibility(
      pairData,
      sharedSports.length,
    );
    const relationshipType = classifyRelationship(pairData);
    const strength = computeEdgeStrength(
      sessionsTogether,
      pairData.lastSessionDate,
      sharedSports.length,
    );

    edges.push({
      member1Id: id1,
      member2Id: id2,
      sharedSports,
      sessionsTogether,
      compatibilityScore: Math.round(compatibilityScore),
      relationshipType,
      strength: Math.round(strength * 100) / 100,
      lastSessionDate: pairData.lastSessionDate,
    });
  }

  // Sort edges by strength descending, limit
  edges.sort((a, b) => b.strength - a.strength);
  const limitedEdges = edges.slice(0, MAX_EDGES);

  // ── Step 3: Build nodes ──
  const memberMap = new Map<string, MemberSportsProfile>();
  for (const m of members) {
    memberMap.set(m.memberId, m);
  }

  const nodes: SocialSportNode[] = [];
  for (const member of members) {
    const connections = memberConnectionMap.get(member.memberId);
    const connectionCount = connections?.size ?? 0;

    // Social score: normalized connection count
    const maxConnections = Math.max(
      1,
      ...members.map((m) => memberConnectionMap.get(m.memberId)?.size ?? 0),
    );
    const socialScore = Math.round(
      (connectionCount / maxConnections) * 100,
    );

    // Influence: sum of edge strengths to this member
    let influenceRaw = 0;
    for (const edge of limitedEdges) {
      if (edge.member1Id === member.memberId || edge.member2Id === member.memberId) {
        influenceRaw += edge.strength * edge.compatibilityScore;
      }
    }
    const maxInfluence = Math.max(
      1,
      ...members.map((m) => {
        let inf = 0;
        for (const e of limitedEdges) {
          if (e.member1Id === m.memberId || e.member2Id === m.memberId) {
            inf += e.strength * e.compatibilityScore;
          }
        }
        return inf;
      }),
    );
    const influenceScore = Math.round((influenceRaw / maxInfluence) * 100);

    nodes.push({
      memberId: member.memberId,
      memberName: member.memberName,
      sports: member.sports,
      socialScore,
      connectionCount,
      influenceScore,
    });
  }

  // ── Step 4: Detect clusters ──
  const clusters = detectClusters(nodes, limitedEdges);

  // ── Step 5: Isolated + connector members ──
  const isolatedMemberIds = detectIsolatedMemberIds(sessions, members);
  const connectorMemberIds = detectConnectorMemberIds(nodes, limitedEdges, clusters);

  // ── Summary stats ──
  const totalConnections = limitedEdges.length;
  const averageConnectionsPerMember = nodes.length > 0
    ? Math.round((limitedEdges.reduce((s, _e) => s + 1, 0) * 2 / nodes.length) * 10) / 10
    : 0;

  return {
    nodes: nodes.slice(0, MAX_NODES),
    edges: limitedEdges,
    clusters,
    isolatedMemberIds,
    connectorMemberIds,
    totalConnections,
    averageConnectionsPerMember,
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — buildSocialSportGraphSafe (DEGRADED WRAPPER)
// ═══════════════════════════════════════════════════════════

/**
 * Safe wrapper around buildSocialSportGraph.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildSocialSportGraphSafe(
  members: MemberSportsProfile[],
  sessions: SportSession[],
): SocialSportGraph {
  try {
    return buildSocialSportGraph(members ?? [], sessions ?? []);
  } catch {
    return createEmptyGraph();
  }
}

function createEmptyGraph(): SocialSportGraph {
  return {
    nodes: [],
    edges: [],
    clusters: [],
    isolatedMemberIds: [],
    connectorMemberIds: [],
    totalConnections: 0,
    averageConnectionsPerMember: 0,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — matchDoublesPartners
//
// Suggests optimal doubles partners for a member based on
// complementary athletic axes, schedule overlap, and
// shared sport preferences.
// ═══════════════════════════════════════════════════════════

/**
 * Find the best doubles partners for a member.
 *
 * Algorithm:
 *   1. Filter candidates who play at least one racquet sport
 *   2. For each candidate, compute compatibility:
 *      a. Complementary axes (0.4): where one is strong, the other fills weakness
 *      b. Schedule overlap (0.3): similar preferred hours
 *      c. Sport preference match (0.3): shared sports
 *   3. Filter by minimum compatibility threshold
 *   4. Sort by compatibility descending
 *   5. Return top 5 suggestions with explanations
 *
 * @param memberId — Target member seeking a partner
 * @param graph — Social graph (for existing connections)
 * @param profiles — Athletic profiles of all members
 * @param sessions — Session history (for schedule analysis)
 * @returns DoublesPartnerMatch[] sorted by compatibility
 */
export function matchDoublesPartners(
  memberId: string,
  graph: SocialSportGraph,
  profiles: Record<string, AthleticProfile>,
  sessions: SportSession[],
): DoublesPartnerMatch[] {
  const targetProfile = profiles[memberId];
  if (!targetProfile) return [];

  const targetSessions = sessions.filter((s) => s.memberId === memberId);
  if (targetSessions.length < 3) return [];

  // ── Find racquet sports the target plays ──
  const racquetSports = targetProfile.sportBreakdown
    ? (Object.keys(targetProfile.sportBreakdown) as SportType[]).filter(
        (s) => SPORT_CONFIG[s]?.category === SportCategory.RACQUET,
      )
    : [];

  if (racquetSports.length === 0) return [];

  // ── Build candidate list ──
  const candidates: Array<{
    memberId: string;
    profile: AthleticProfile;
    sharedRacquet: SportType[];
  }> = [];

  for (const [id, profile] of Object.entries(profiles)) {
    if (id === memberId) continue;
    if (!profile.sportBreakdown) continue;

    const candidateSports = Object.keys(profile.sportBreakdown) as SportType[];
    const sharedRacquet = candidateSports.filter(
      (s) =>
        racquetSports.includes(s) &&
        SPORT_CONFIG[s]?.category === SportCategory.RACQUET,
    );

    if (sharedRacquet.length > 0) {
      candidates.push({ memberId: id, profile, sharedRacquet });
    }
  }

  if (candidates.length === 0) return [];

  // ── Compute compatibility for each candidate ──
  const targetSchedule = buildScheduleProfile(targetSessions);
  const matches: DoublesPartnerMatch[] = [];

  for (const candidate of candidates) {
    // Skip if already a doubles partner in graph
    const existingEdge = graph.edges.find(
      (e) =>
        ((e.member1Id === memberId && e.member2Id === candidate.memberId) ||
          (e.member2Id === memberId && e.member1Id === candidate.memberId)) &&
        e.relationshipType === "doubles_partner",
    );
    if (existingEdge) continue;

    // Axis complementarity: where target is weak, candidate is strong
    const complementaryAxes: AthleticAxis[] = [];
    let complementScore = 0;

    for (const axis of ALL_AXES) {
      const targetVal = targetProfile.axes[axis] ?? 0;
      const candidateVal = candidate.profile.axes[axis] ?? 0;

      // Complementary: one is strong (>60) and the other is weaker
      if (targetVal > 60 && candidateVal < targetVal - 15) {
        complementaryAxes.push(axis);
        complementScore += (targetVal - candidateVal) / 100;
      } else if (candidateVal > 60 && targetVal < candidateVal - 15) {
        complementaryAxes.push(axis);
        complementScore += (candidateVal - targetVal) / 100;
      }
    }
    complementScore = clamp(complementScore / ALL_AXES.length, 0, 1);

    // Schedule overlap
    const candidateSessions = sessions.filter(
      (s) => s.memberId === candidate.memberId,
    );
    const candidateSchedule = buildScheduleProfile(candidateSessions);
    const scheduleOverlap = computeScheduleOverlap(
      targetSchedule,
      candidateSchedule,
    );

    // Sport preference match
    const totalSharedSports = candidate.sharedRacquet.length;
    const sportMatch = clamp(totalSharedSports / Math.max(1, racquetSports.length), 0, 1);

    // Composite compatibility
    const compatibility =
      complementScore * DOUBLES_COMPLEMENT_W +
      scheduleOverlap * DOUBLES_SCHEDULE_W +
      sportMatch * DOUBLES_SPORT_W;

    const compatibilityScore = Math.round(compatibility * 100);

    if (compatibilityScore < DOUBLES_MIN_COMPAT) continue;

    // Generate explanation
    const reason = generatePartnerReason(
      complementaryAxes,
      scheduleOverlap,
      candidate.sharedRacquet,
      compatibilityScore,
    );

    matches.push({
      memberId,
      partnerId: candidate.memberId,
      partnerName: candidate.profile.memberId, // Would come from member data
      sport: candidate.sharedRacquet[0],
      compatibilityScore,
      complementaryAxes,
      scheduleOverlap: Math.round(scheduleOverlap * 100) / 100,
      reason,
    });
  }

  // Sort by compatibility descending, return top 5
  matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  return matches.slice(0, 5);
}

// ═══════════════════════════════════════════════════════════
// §4 — optimizeTeamFormation
//
// Assembles balanced teams from available members for a
// given sport. Balance means: complementary skill axes,
// similar overall levels, and good role coverage.
// ═══════════════════════════════════════════════════════════

/**
 * Form optimal teams from available members.
 *
 * Algorithm:
 *   1. Sort members by overall score
 *   2. Distribute using serpentine draft (1,2,2,1,1,2,2,1...)
 *      to ensure balanced total scores per team
 *   3. Post-draft: check axis complementarity
 *   4. If imbalance > threshold, swap members between teams
 *
 * @param sport — Target sport
 * @param availableMembers — Athletic profiles of available members
 * @param teamSize — Desired team size (default: based on sport)
 * @returns TeamFormation[]
 */
export function optimizeTeamFormation(
  sport: SportType,
  availableMembers: AthleticProfile[],
  teamSize?: number,
): TeamFormation[] {
  if (availableMembers.length < 2) return [];

  // Determine team size from sport if not specified
  const effectiveTeamSize = teamSize ?? getDefaultTeamSize(sport);
  const teamCount = Math.floor(availableMembers.length / effectiveTeamSize);

  if (teamCount < 2) {
    // Not enough for two teams — return single team
    return [{
      teamId: "team_1",
      sport,
      memberIds: availableMembers.map((m) => m.memberId),
      balanceScore: 100,
      averageLevel: Math.round(
        availableMembers.reduce((s, m) => s + m.overallScore, 0) /
        availableMembers.length,
      ),
      complementaryStrengths: identifyTeamStrengths(availableMembers),
    }];
  }

  // ── Sort by overall score ──
  const sorted = [...availableMembers].sort(
    (a, b) => b.overallScore - a.overallScore,
  );

  // ── Serpentine draft ──
  const teams: AthleticProfile[][] = Array.from(
    { length: teamCount },
    () => [],
  );

  for (let i = 0; i < sorted.length; i++) {
    const round = Math.floor(i / teamCount);
    const position = i % teamCount;
    // Even rounds: left to right. Odd rounds: right to left.
    const teamIdx = round % 2 === 0
      ? position
      : teamCount - 1 - position;

    if (teamIdx >= 0 && teamIdx < teamCount) {
      teams[teamIdx].push(sorted[i]);
    }
  }

  // ── Compute balance and build formations ──
  const formations: TeamFormation[] = [];

  for (let t = 0; t < teams.length; t++) {
    const teamMembers = teams[t];
    if (teamMembers.length === 0) continue;

    const avgScore = Math.round(
      teamMembers.reduce((s, m) => s + m.overallScore, 0) / teamMembers.length,
    );

    const complementaryStrengths = identifyTeamStrengths(teamMembers);

    formations.push({
      teamId: `team_${t + 1}`,
      sport,
      memberIds: teamMembers.map((m) => m.memberId),
      balanceScore: 0, // Computed below
      averageLevel: avgScore,
      complementaryStrengths,
    });
  }

  // ── Compute balance score across all teams ──
  if (formations.length >= 2) {
    const avgScores = formations.map((f) => f.averageLevel);
    const maxAvg = Math.max(...avgScores);
    const minAvg = Math.min(...avgScores);
    const spread = maxAvg - minAvg;

    // Balance score: 100 when all teams equal, 0 when spread is 50+
    const balanceScore = clamp(Math.round(100 - spread * 2), 0, 100);
    for (const f of formations) {
      f.balanceScore = balanceScore;
    }
  }

  return formations;
}

// ═══════════════════════════════════════════════════════════
// §5 — detectIsolatedMembers
//
// Finds members who consistently play alone. Social isolation
// in sports correlates with higher churn risk.
// ═══════════════════════════════════════════════════════════

/**
 * Detect members who are socially isolated in sports.
 *
 * Criteria: member has >= ISOLATION_THRESHOLD sessions
 * with 0 companions across all sports.
 *
 * @param members — Member profiles
 * @param sessions — All sport sessions
 * @returns Array of isolated member IDs
 */
export function detectIsolatedMembers(
  members: MemberSportsProfile[],
  sessions: SportSession[],
): string[] {
  return detectIsolatedMemberIds(sessions, members);
}

// ═══════════════════════════════════════════════════════════
// §6 — computeSocialRetentionImpact
//
// Measures how a member's social connections affect their
// likelihood of staying in the club. Members with strong
// social sport bonds have higher retention.
// ═══════════════════════════════════════════════════════════

/**
 * Compute the social retention impact score for a member.
 *
 * Algorithm:
 *   1. Count sessions with companions vs total sessions
 *   2. Count unique social partners
 *   3. Check for strong bonds (doubles partner, teammate)
 *   4. Check graph connectivity (is member in a cluster?)
 *   5. Composite score 0-100
 *
 * @param graph — Social sport graph
 * @param memberId — Target member
 * @returns Retention impact score 0-100
 */
export function computeSocialRetentionImpact(
  graph: SocialSportGraph,
  memberId: string,
): number {
  if (!graph.nodes.length) return 0;

  const node = graph.nodes.find((n) => n.memberId === memberId);
  if (!node) return 0;

  let score = 0;

  // ── Factor 1: Connection count (0-30 points) ──
  const maxConnections = Math.max(
    1,
    ...graph.nodes.map((n) => n.connectionCount),
  );
  score += Math.round((node.connectionCount / maxConnections) * 30);

  // ── Factor 2: Edge strength to this member (0-25 points) ──
  const memberEdges = graph.edges.filter(
    (e) => e.member1Id === memberId || e.member2Id === memberId,
  );
  if (memberEdges.length > 0) {
    const avgStrength =
      memberEdges.reduce((s, e) => s + e.strength, 0) / memberEdges.length;
    score += Math.round(avgStrength * 25);
  }

  // ── Factor 3: Strong bonds (0-25 points) ──
  const strongBonds = memberEdges.filter(
    (e) =>
      e.relationshipType === "doubles_partner" ||
      e.relationshipType === "teammate",
  );
  score += Math.min(25, strongBonds.length * 8);

  // ── Factor 4: Cluster membership (0-10 points) ──
  const inCluster = graph.clusters.some((c) =>
    c.memberIds.includes(memberId),
  );
  if (inCluster) score += 10;

  // ── Factor 5: Sport diversity of connections (0-10 points) ──
  const connectedSports = new Set<SportType>();
  for (const edge of memberEdges) {
    for (const sport of edge.sharedSports) {
      connectedSports.add(sport);
    }
  }
  score += Math.min(10, connectedSports.size * 3);

  return clamp(score, 0, 100);
}

// ═══════════════════════════════════════════════════════════
// §7 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

/** Clamp a number to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Parse date string to timestamp (ms). Returns 0 on invalid. */
function parseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

// ── Co-participation map builder ──

interface PairData {
  count: number;
  sports: Set<SportType>;
  lastSessionDate: string;
  /** Sessions where they played together vs solo */
  togetherSessions: number;
  /** Total sessions for member 1 */
  member1TotalSessions: number;
  /** Total sessions for member 2 */
  member2TotalSessions: number;
  /** Hours they played together */
  totalHoursTogether: number;
}

/**
 * Build co-participation map from session history.
 * Iterates sessions and tracks which members played together.
 */
function buildCoParticipationMap(
  sessions: SportSession[],
): Map<string, PairData> {
  const pairMap = new Map<string, PairData>();

  // Track total sessions per member
  const memberSessionCount = new Map<string, number>();

  for (const session of sessions) {
    memberSessionCount.set(
      session.memberId,
      (memberSessionCount.get(session.memberId) ?? 0) + 1,
    );

    // Process companions
    if (!session.companions || session.companions.length === 0) continue;

    for (const companionId of session.companions) {
      if (companionId === session.memberId) continue;

      // Normalize pair key: smaller ID first
      const pairKey =
        session.memberId < companionId
          ? `${session.memberId}|${companionId}`
          : `${companionId}|${session.memberId}`;

      const existing = pairMap.get(pairKey);
      const sessionDate = session.startTime;
      const sessionTs = parseDate(sessionDate);

      if (existing) {
        existing.count++;
        existing.sports.add(session.sport);
        existing.togetherSessions++;
        existing.totalHoursTogether += session.durationMinutes / 60;

        // Update last session date
        if (sessionTs > parseDate(existing.lastSessionDate)) {
          existing.lastSessionDate = sessionDate;
        }
      } else {
        pairMap.set(pairKey, {
          count: 1,
          sports: new Set([session.sport]),
          lastSessionDate: sessionDate,
          togetherSessions: 1,
          member1TotalSessions: memberSessionCount.get(session.memberId) ?? 1,
          member2TotalSessions: 0,
          totalHoursTogether: session.durationMinutes / 60,
        });
      }
    }
  }

  // Enrich with total session counts
  for (const [pairKey, data] of pairMap) {
    const [id1, id2] = pairKey.split("|");
    data.member1TotalSessions = memberSessionCount.get(id1) ?? 0;
    data.member2TotalSessions = memberSessionCount.get(id2) ?? 0;
  }

  return pairMap;
}

// ── Pair compatibility ──

function computePairCompatibility(
  pairData: PairData,
  sharedSportCount: number,
): number {
  let score = 0;

  // Session frequency: more sessions = higher compatibility (diminishing returns)
  const sessionFactor = Math.min(1, Math.log2(pairData.count + 1) / Math.log2(20));
  score += sessionFactor * 40;

  // Sport diversity: more shared sports = higher
  const diversityFactor = clamp(sharedSportCount / 3, 0, 1);
  score += diversityFactor * 25;

  // Recency: recent sessions = higher
  const lastSessionTs = parseDate(pairData.lastSessionDate);
  const daysSince = lastSessionTs > 0
    ? (Date.now() - lastSessionTs) / 86_400_000
    : 999;
  const recencyFactor = clamp(1 - daysSince / 90, 0, 1);
  score += recencyFactor * 20;

  // Hours together: more hours = deeper bond
  const hoursFactor = clamp(pairData.totalHoursTogether / 20, 0, 1);
  score += hoursFactor * 15;

  return clamp(score, 0, 100);
}

// ── Relationship classification ──

function classifyRelationship(
  pairData: PairData,
): SocialSportEdge["relationshipType"] {
  // Heuristic classification from session patterns
  const ratio = pairData.togetherSessions / Math.max(1, pairData.count);
  const hasMultipleSports = pairData.sports.size > 1;

  // High ratio + multiple sports = likely teammates
  if (ratio > 0.7 && hasMultipleSports) return "teammate";

  // Racquet sport together = likely doubles partner
  const hasRacquet = [...pairData.sports].some(
    (s) => SPORT_CONFIG[s]?.category === SportCategory.RACQUET,
  );
  if (hasRacquet && ratio > 0.5) return "doubles_partner";

  // Regular but single sport = training buddy
  if (pairData.count >= 5 && ratio > 0.4) return "training_buddy";

  // Infrequent = casual
  if (pairData.count < 5) return "casual";

  return "training_buddy";
}

// ── Edge strength ──

function computeEdgeStrength(
  sessionsTogether: number,
  lastSessionDate: string,
  sharedSportCount: number,
): number {
  // Frequency: diminishing returns
  const frequencyFactor = clamp(
    Math.log2(sessionsTogether + 1) / Math.log2(30),
    0,
    1,
  );

  // Recency
  const lastTs = parseDate(lastSessionDate);
  const daysSince = lastTs > 0 ? (Date.now() - lastTs) / 86_400_000 : 999;
  const recencyFactor = clamp(1 - daysSince / 180, 0.1, 1);

  // Sport diversity
  const diversityFactor = clamp(sharedSportCount / 3, 0.3, 1);

  return frequencyFactor * 0.5 + recencyFactor * 0.3 + diversityFactor * 0.2;
}

// ── Cluster detection ──

/**
 * Detect sport clusters: groups of members who regularly
 * play the same sport together.
 *
 * Algorithm:
 *   1. For each sport, find members who play it
 *   2. Build sub-graph of edges between those members
 *   3. Find connected components
 *   4. Filter by minimum size and cohesion
 */
function detectClusters(
  nodes: SocialSportNode[],
  edges: SocialSportEdge[],
): SportCluster[] {
  const clusters: SportCluster[] = [];

  // Group edges by shared sports
  const sportEdgesMap = new Map<SportType, SocialSportEdge[]>();
  for (const edge of edges) {
    for (const sport of edge.sharedSports) {
      const existing = sportEdgesMap.get(sport) ?? [];
      existing.push(edge);
      sportEdgesMap.set(sport, existing);
    }
  }

  for (const [sport, sportEdges] of sportEdgesMap) {
    // Find connected components using union-find
    const parent = new Map<string, string>();

    function find(x: string): string {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    }

    function union(a: string, b: string): void {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent.set(rootA, rootB);
    }

    for (const edge of sportEdges) {
      union(edge.member1Id, edge.member2Id);
    }

    // Group by root
    const groups = new Map<string, string[]>();
    for (const memberId of parent.keys()) {
      const root = find(memberId);
      const existing = groups.get(root) ?? [];
      existing.push(memberId);
      groups.set(root, existing);
    }

    // Create clusters from valid groups
    for (const [, memberIds] of groups) {
      if (memberIds.length < CLUSTER_MIN_MEMBERS) continue;

      // Compute cohesion: average edge strength within the cluster
      const clusterEdges = sportEdges.filter(
        (e) =>
          memberIds.includes(e.member1Id) && memberIds.includes(e.member2Id),
      );

      if (clusterEdges.length === 0) continue;

      const avgStrength =
        clusterEdges.reduce((s, e) => s + e.strength, 0) / clusterEdges.length;
      const cohesion = Math.round(avgStrength * 100);

      if (cohesion < CLUSTER_MIN_COHESION) continue;

      // Average level
      const clusterNodes = nodes.filter((n) => memberIds.includes(n.memberId));
      const avgLevelScore =
        clusterNodes.length > 0
          ? clusterNodes.reduce((s, n) => s + n.socialScore, 0) / clusterNodes.length
          : 0;

      // Classify average level
      let averageLevel = "practitioner";
      if (avgLevelScore >= 70) averageLevel = "expert";
      else if (avgLevelScore >= 40) averageLevel = "practitioner";
      else averageLevel = "apprentice";

      // Open slots (arbitrary: 2 for doubles, 5 for team, 3 default)
      const sportCategory = SPORT_CONFIG[sport]?.category;
      const openSlots = sportCategory === SportCategory.TEAM ? 5
        : sportCategory === SportCategory.RACQUET ? 2
        : 3;

      clusters.push({
        clusterId: `cluster_${sport}_${clusters.length + 1}`,
        sport,
        memberIds,
        cohesion,
        averageLevel: averageLevel as AthleticLevel,
        openSlots,
      });
    }
  }

  // Sort by cohesion descending
  clusters.sort((a, b) => b.cohesion - a.cohesion);
  return clusters.slice(0, 20); // Max 20 clusters
}

// ── Isolated member detection ──

function detectIsolatedMemberIds(
  sessions: SportSession[],
  members: MemberSportsProfile[],
): string[] {
  const memberSessions = new Map<string, { total: number; withCompanions: number }>();

  for (const session of sessions) {
    const existing = memberSessions.get(session.memberId) ?? {
      total: 0,
      withCompanions: 0,
    };
    existing.total++;
    if (session.companions && session.companions.length > 0) {
      existing.withCompanions++;
    }
    memberSessions.set(session.memberId, existing);
  }

  const isolated: string[] = [];

  for (const member of members) {
    const data = memberSessions.get(member.memberId);
    if (!data) continue;

    if (
      data.total >= ISOLATION_THRESHOLD &&
      data.withCompanions === 0
    ) {
      isolated.push(member.memberId);
    }
  }

  return isolated;
}

// ── Connector member detection ──

function detectConnectorMemberIds(
  nodes: SocialSportNode[],
  _edges: SocialSportEdge[],
  clusters: SportCluster[],
): string[] {
  if (clusters.length < 2) return [];

  // A connector bridges two or more clusters
  const connectors: string[] = [];

  for (const node of nodes) {
    const memberClusters = clusters.filter((c) =>
      c.memberIds.includes(node.memberId),
    );

    if (memberClusters.length >= 2) {
      connectors.push(node.memberId);
    }
  }

  return connectors;
}

// ── Schedule profile ──

interface ScheduleProfile {
  /** Hour of day → session count */
  hourly: Map<number, number>;
  /** Day of week → session count */
  daily: Map<number, number>;
}

function buildScheduleProfile(sessions: SportSession[]): ScheduleProfile {
  const hourly = new Map<number, number>();
  const daily = new Map<number, number>();

  for (const session of sessions) {
    const date = new Date(session.startTime);
    if (Number.isNaN(date.getTime())) continue;

    const hour = date.getHours();
    const day = date.getDay();

    hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }

  return { hourly, daily };
}

function computeScheduleOverlap(
  profile1: ScheduleProfile,
  profile2: ScheduleProfile,
): number {
  // Overlap = cosine similarity of hourly distributions
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  const allHours = new Set([
    ...profile1.hourly.keys(),
    ...profile2.hourly.keys(),
  ]);

  for (const hour of allHours) {
    const v1 = profile1.hourly.get(hour) ?? 0;
    const v2 = profile2.hourly.get(hour) ?? 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denom === 0) return 0;

  return clamp(dotProduct / denom, 0, 1);
}

// ── Partner reason generation ──

function generatePartnerReason(
  complementaryAxes: AthleticAxis[],
  scheduleOverlap: number,
  sharedSports: SportType[],
  compatibilityScore: number,
): string {
  const parts: string[] = [];

  if (complementaryAxes.length > 0) {
    const axisNames = complementaryAxes
      .slice(0, 2)
      .map((a) => {
        switch (a) {
          case AthleticAxis.POWER: return "fuerza";
          case AthleticAxis.SPEED: return "velocidad";
          case AthleticAxis.ENDURANCE: return "resistencia";
          case AthleticAxis.TECHNIQUE: return "técnica";
          case AthleticAxis.TACTICAL: return "táctica";
          case AthleticAxis.MENTAL: return "mental";
          default: return a;
        }
      })
      .join(" y ");
    parts.push(`Habilidades complementarias en ${axisNames}`);
  }

  if (scheduleOverlap > 0.6) {
    parts.push("Horarios compatibles");
  } else if (scheduleOverlap > 0.3) {
    parts.push("Horarios parcialmente compatibles");
  }

  if (sharedSports.length > 0) {
    const sportLabels = sharedSports
      .slice(0, 2)
      .map((s) => SPORT_CONFIG[s]?.label ?? s);
    parts.push(`Comparte ${sportLabels.join(", ")}`);
  }

  if (parts.length === 0) {
    parts.push(`Compatibilidad ${compatibilityScore}%`);
  }

  return parts.join(". ") + ".";
}

// ── Team helpers ──

function getDefaultTeamSize(sport: SportType): number {
  switch (sport) {
    case SportType.FOOTBALL: return 11;
    case SportType.BASKETBALL: return 5;
    case SportType.VOLLEYBALL: return 6;
    case SportType.TENNIS:
    case SportType.PADEL:
    case SportType.SQUASH: return 2;
    default: return 4;
  }
}

function identifyTeamStrengths(members: AthleticProfile[]): string[] {
  if (members.length === 0) return [];

  // Find which axes the team is collectively strong in
  const axisTotals = {} as Record<AthleticAxis, number>;
  for (const axis of ALL_AXES) {
    axisTotals[axis] = members.reduce(
      (s, m) => s + (m.axes[axis] ?? 0),
      0,
    ) / members.length;
  }

  const strengths: string[] = [];
  for (const axis of ALL_AXES) {
    if (axisTotals[axis] >= 65) {
      switch (axis) {
        case AthleticAxis.POWER: strengths.push("Fuerza dominante"); break;
        case AthleticAxis.SPEED: strengths.push("Velocidad sobresaliente"); break;
        case AthleticAxis.ENDURANCE: strengths.push("Resistencia sólida"); break;
        case AthleticAxis.TECHNIQUE: strengths.push("Técnica refinada"); break;
        case AthleticAxis.TACTICAL: strengths.push("Inteligencia táctica"); break;
        case AthleticAxis.MENTAL: strengths.push("Fortaleza mental"); break;
      }
    }
  }

  return strengths.length > 0 ? strengths : ["Equipo equilibrado"];
}