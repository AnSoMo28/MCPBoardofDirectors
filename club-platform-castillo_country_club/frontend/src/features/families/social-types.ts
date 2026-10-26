// ═══════════════════════════════════════════════════════════
// src/features/families/social-types.ts
// Phase 34+ Migration — Families Social Genome Types
// Level 6+ Agency · Production Grade
//
// Multidimensional model of social relationships in the club.
// Replaces the flat "strength: number" model with a BondProfile
// that captures frequency, diversity, recency, asymmetry,
// seasonality, longevity, and trajectory of every connection.
//
// Core domain types   → ./types.ts (SocialConnection base)
// AI intelligence     → ./ai-types.ts
// Config maps         → ./config.ts
//
// PRE-WRITE VERIFICATION:
//   SocialConnection    → imported from ./types.ts (canonical) ✅
//   MemberTier          → imported from ./types.ts ✅
//   SocialContext       → new union literal, 9 values ✅
//   BondProfile         → 7 axes verified against advisor rules ✅
//   SocialBond          → replaces EnrichedSocialConnection ✅
//   IntraFamilyBond     → replaces RelationshipStrand ✅
//   SocialNode          → replaces ConstellationNode (no geometry) ✅
//   SocialMatch         → merges SuggestedConnection + SocialMatchSuggestion ✅
//   All readonly        → verified ✅
//
// ANTI-PATTERNS REMOVED:
//   - SocialConnection defined here (circular dep)  → moved to types.ts
//   - strength: number (flat)                       → BondProfile (7 axes)
//   - ConstellationNode x/y/radius/brightness       → SocialNode (data only)
//   - SuggestedConnection + SocialMatchSuggestion   → SocialMatch (unified)
//   - EnrichedSocialConnection all-optional         → SocialBond (structured)
//   - RelationshipStrand (generic)                  → IntraFamilyBond (typed)
//   - tier: string in suggestions                   → MemberTier (union literal)
//   - Mutable interfaces                            → readonly
//   - No temporal dimension                         → SeasonalityPattern + RecencyLevel
//   - No asymmetry tracking                         → AsymmetryIndex
//   - No influence scoring                          → SocialInfluenceScore
//
// ═══════════════════════════════════════════════════════════

// §0 ─── Imports ──────────────────────────────────────────

import type {
  SocialConnection,
  MemberTier,
} from "./types";

// ═══════════════════════════════════════════════════════════
// §1  UNION LITERALS — Social dimension classifications
// ═══════════════════════════════════════════════════════════

/**
 * The social context in which families interact.
 * Maps 1:1 to activity categories in config.ts.
 */
export type SocialContext =
  | "sport"
  | "gastronomy"
  | "cultural"
  | "wellness"
  | "social"
  | "business"
  | "family"
  | "neighborhood"
  | "professional";

/**
 * Direction of a bond over time.
 * Computed from interaction frequency trends.
 */
export type BondTrajectory =
  | "strengthening"
  | "stable"
  | "weakening"
  | "dormant"
  | "new";

/**
 * Classification of how recently two families interacted.
 */
export type RecencyLevel =
  | "today"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "stale";

/**
 * How frequently two families interact.
 * Computed from activity logs over last 90 days.
 */
export type InteractionFrequency =
  | "very_high"   // >5 interactions/week
  | "high"        // 2-5/week
  | "moderate"    // 1-2/week
  | "low"         // 1-2/month
  | "rare"        // <1/month
  | "none";       // no recorded interactions

/**
 * When the bond is most active. Critical for country clubs
 * where summer vs winter completely changes the social graph.
 */
export type SeasonalityPattern =
  | "year_round"
  | "summer_heavy"
  | "winter_heavy"
  | "event_driven"
  | "declining";

/**
 * Classification of a family's social influence tier.
 */
export type InfluenceTier =
  | "connector"    // Hub: links multiple clusters
  | "influencer"   // High reach within one cluster
  | "participant"  // Active but limited reach
  | "observer"     // Passive, minimal connections
  | "isolated";    // No meaningful connections

/**
 * How symmetric/reciprocal a relationship is.
 */
export type SymmetryClassification =
  | "symmetric"    // Both sides engage equally
  | "slight"       // Slight imbalance (<20%)
  | "moderate"     // Noticeable imbalance (20-50%)
  | "heavy";       // Strongly one-sided (>50%)

/**
 * Type of reason for a social match suggestion.
 */
export type MatchReasonType =
  | "shared_interest"
  | "demographic"
  | "activity_overlap"
  | "social_graph"
  | "lifecycle_stage"
  | "geographic"
  | "tier_alignment";

/**
 * How a social cluster is characterized.
 */
export type ClusterType =
  | "sport"
  | "gastronomy"
  | "cultural"
  | "wellness"
  | "social"
  | "business"
  | "family";

// ═══════════════════════════════════════════════════════════
// §2  BOND PROFILE — The multidimensional relationship model
// ═══════════════════════════════════════════════════════════

/**
 * Asymmetry index — measures reciprocity of a relationship.
 *
 * In a country club, Family A might invite Family B frequently
 * but Family B rarely reciprocates. This asymmetry is critical
 * for understanding the true health of a social bond.
 */
export interface AsymmetryIndex {
  /** 0 = perfectly symmetric, 1 = fully one-directional */
  readonly value: number;
  readonly classification: SymmetryClassification;
  /** Which side initiates more interactions */
  readonly dominantSide: "a" | "b" | "balanced";
}

/**
 * BondProfile — the complete DNA of a social relationship.
 *
 * Replaces the flat `strength: number` with 7 axes of analysis.
 * Each axis is independently computable by the intelligence engine.
 *
 * @example
 * // A summer-heavy sport friendship that's strengthening
 * profile.frequency    = "high"
 * profile.diversity    = 0.3  (mostly sport)
 * profile.recency      = "this_week"
 * profile.asymmetry    = { value: 0.1, classification: "symmetric" }
 * profile.seasonality  = "summer_heavy"
 * profile.longevity    = 36   (months)
 * profile.trajectory   = "strengthening"
 */
export interface BondProfile {
  readonly frequency: InteractionFrequency;
  /** 0-1: how many different social contexts they share */
  readonly diversity: number;
  readonly recency: RecencyLevel;
  readonly asymmetry: AsymmetryIndex;
  readonly seasonality: SeasonalityPattern;
  /** Months since first recorded interaction */
  readonly longevity: number;
  readonly trajectory: BondTrajectory;
}

// ═══════════════════════════════════════════════════════════
// §3  INTER-FAMILY BONDS — Connections between families
// ═══════════════════════════════════════════════════════════

/**
 * A rich social bond between two families.
 * Extends the base SocialConnection (from types.ts) with
 * the multidimensional BondProfile and additional intelligence.
 *
 * Replaces: EnrichedSocialConnection
 */
export interface SocialBond extends SocialConnection {
  readonly profile: BondProfile;
  readonly sharedActivities: readonly string[];
  readonly sharedEvents: number;
  readonly lastInteraction: string;
  readonly connectedTier: MemberTier;
  readonly connectedEngagement: number;
  readonly aiInsight?: string;
  /** Dominant context of this relationship */
  readonly dominantContext: SocialContext;
  /**
   * Shared history: how this bond was formed.
   * e.g. "Se conocieron en el torneo de pádel 2023"
   */
  readonly originStory?: string;
}

/**
 * AI-generated match suggestion — which families should connect.
 * Merges the old SuggestedConnection + SocialMatchSuggestion
 * into a single, richer type.
 *
 * Replaces: SuggestedConnection, SocialMatchSuggestion
 */
export interface SocialMatch {
  readonly familyId: string;
  readonly familyName: string;
  readonly tier: MemberTier;
  /** 0-1 match score */
  readonly matchScore: number;
  readonly reasons: readonly MatchReason[];
  readonly suggestedActivity: string;
  readonly suggestedContext: SocialContext;
  readonly commonInterests: readonly string[];
  readonly sharedDemographics: readonly string[];
  /**
   * Which existing connection could facilitate this intro.
   * e.g. "Los Rodríguez conocen a ambas familias"
   */
  readonly bridgeFamilyId?: string;
  readonly bridgeFamilyName?: string;
}

/**
 * Individual reason for a social match.
 * Each reason has a type, weight, and human-readable detail.
 */
export interface MatchReason {
  readonly type: MatchReasonType;
  /** 0-1 weight of this reason in the overall match score */
  readonly weight: number;
  readonly detail: string;
}

// ═══════════════════════════════════════════════════════════
// §4  INTRA-FAMILY BONDS — DNA within a family
// ═══════════════════════════════════════════════════════════

/**
 * Bond between two members of the SAME family.
 * The "relationship DNA" that defines family dynamics.
 *
 * Replaces: RelationshipStrand
 *
 * Key difference from SocialBond:
 *   - SocialBond = between Family A ↔ Family B
 *   - IntraFamilyBond = between Member A ↔ Member B (same family)
 */
export interface IntraFamilyBond {
  readonly memberA: string;
  readonly memberB: string;
  readonly profile: BondProfile;
  /** Number of activities done together */
  readonly sharedActivities: number;
  /** Number of events attended together */
  readonly sharedEvents: number;
  readonly lastSharedActivity: string;
  readonly dominantContext: SocialContext;
  /**
   * Relationship label — AI-inferred or member-provided.
   * e.g. "Padre e hijo", "Mejores amigas", "Compañeros de pádel"
   */
  readonly relationshipLabel?: string;
}

// ═══════════════════════════════════════════════════════════
// §5  SOCIAL GRAPH — Network-level types
// ═══════════════════════════════════════════════════════════

/**
 * A family's node in the social graph.
 * DATA ONLY — no rendering geometry.
 *
 * Coordinates (x, y), radius, brightness are computed by the
 * visualization component based on the data in this type.
 *
 * Replaces: ConstellationNode (which mixed data with geometry)
 */
export interface SocialNode {
  readonly familyId: string;
  readonly familyName: string;
  readonly tier: MemberTier;
  readonly clusterId?: string;
  readonly influenceScore: SocialInfluenceScore;
  readonly connections: readonly Readonly<{
    targetFamilyId: string;
    /** 0-1 bond strength (computed from BondProfile) */
    strength: number;
    readonly sharedInterest: SocialContext;
    readonly trajectory: BondTrajectory;
  }>[];
}

/**
 * A cluster of families that share a common social context.
 * e.g. "The Sport Cluster", "The Gastronomy Circle"
 */
export interface SocialCluster {
  readonly id: string;
  readonly name: string;
  readonly type: ClusterType;
  readonly familyIds: readonly string[];
  readonly commonContext: SocialContext;
  readonly metrics: ClusterMetrics;
}

/**
 * Computed metrics for a social cluster.
 */
export interface ClusterMetrics {
  readonly size: number;
  readonly avgBondStrength: number;
  /** 0-1: how tightly connected the cluster members are */
  readonly cohesion: number;
  /** How many families outside the cluster are influenced */
  readonly influenceReach: number;
  readonly dominantContext: SocialContext;
  readonly strongestBond: Readonly<{
    familyA: string;
    familyB: string;
    strength: number;
  }>;
  readonly weakestBond: Readonly<{
    familyA: string;
    familyB: string;
    strength: number;
  }>;
}

/**
 * Global metrics of the entire social graph.
 * Used by the intelligence panel for club-level insights.
 */
export interface SocialGraphMetrics {
  readonly totalConnections: number;
  readonly avgBondStrength: number;
  readonly isolatedNodeCount: number;
  /** Nodes that connect otherwise separate clusters */
  readonly bridgeNodeCount: number;
  readonly communityCount: number;
  /** 0-1: overall connectedness of the club */
  readonly globalCohesion: number;
  /** The most connected family in the graph */
  readonly hubFamilyId: string;
  readonly hubFamilyName: string;
  readonly computedAt: string;
}

// ═══════════════════════════════════════════════════════════
// §6  INTELLIGENCE — Influence and cross-family activity
// ═══════════════════════════════════════════════════════════

/**
 * Social influence score — how much a family shapes the social graph.
 *
 * Connectors: link multiple clusters (high betweenness centrality)
 * Influencers: opinion leaders within a cluster (high degree centrality)
 * Participants: active but localized
 * Observers: passive engagement
 * Isolated: no meaningful social connections
 *
 * Critical for: fm_referral_ready signal in Advisor Engine
 */
export interface SocialInfluenceScore {
  /** 0-1 composite influence */
  readonly value: number;
  /** How many distinct families this family influences */
  readonly reach: number;
  readonly tier: InfluenceTier;
  /** Top connected family IDs by influence weight */
  readonly topConnections: readonly string[];
  /**
   * Which clusters this family bridges.
   * If non-empty, this family is a "bridge node" — critical
   * for cross-cluster information flow.
   */
  readonly bridgedClusters: readonly string[];
}

/**
 * A shared activity between two or more families.
 * Tracks cross-family interactions that strengthen bonds.
 */
export interface CrossFamilyActivity {
  readonly id: string;
  readonly familyIds: readonly string[];
  readonly activity: string;
  readonly date: string;
  readonly context: SocialContext;
  /** Estimated impact on engagement for participating families */
  readonly engagementImpact: number;
  /** How many families participated */
  readonly participantCount: number;
}

// ═══════════════════════════════════════════════════════════
// §7  PREDICTION — Where are social bonds going
// ═══════════════════════════════════════════════════════════

/**
 * Prediction of bond decay or growth.
 * Used by the social intelligence panel to surface at-risk
 * relationships and growth opportunities.
 */
export interface BondPrediction {
  readonly familyA: string;
  readonly familyB: string;
  readonly currentStrength: number;
  /** Predicted strength in `horizonDays` days */
  readonly predictedStrength: number;
  readonly horizonDays: number;
  /** 0-1 confidence in this prediction */
  readonly confidence: number;
  /** Why this prediction was made */
  readonly factors: readonly string[];
  /** Suggested intervention to prevent decay */
  readonly intervention?: string;
}

/**
 * Topology analysis result — structural insights about the social graph.
 * Computed by the social intelligence engine.
 */
export interface SocialTopologyInsight {
  readonly type:
    | "bridge_at_risk"       // A bridge node is losing connections
    | "cluster_fragmenting"  // A cluster is losing cohesion
    | "isolated_growth"      // A new family with no connections
    | "influence_shift"      // A connector's influence is declining
    | "new_bridge_forming"   // Two clusters becoming connected
    | "cluster_merging";     // Two clusters consolidating
  readonly severity: "info" | "low" | "medium" | "high" | "critical";
  readonly title: string;
  readonly description: string;
  readonly affectedFamilies: readonly string[];
  readonly suggestedAction: string;
  readonly detectedAt: string;
}
// ═══════════════════════════════════════════════════════════
// §6  Canvas-Annotated Projection Types
//
// These types EXTEND domain types with rendering geometry.
// Produced by hooks, consumed by canvas components.
// NEVER stored in state, NEVER sent to API.
//
// ConstellationNode: SocialNode + canvas geometry
// ConstellationConnection: simplified bond for constellation
// ConstellationCluster: group identity for nebula rendering
// ═══════════════════════════════════════════════════════════

/** Connection between two constellation nodes */
export interface ConstellationConnection {
  readonly targetFamilyId: string;
  readonly strength: number;           // 0-1
  readonly sharedInterest?: string;
  readonly relationship?: string;
}

/**
 * Canvas-ready projection of a family in the galaxy view.
 * x, y, vx, vy are MUTABLE — force simulation writes directly.
 */
export interface ConstellationNode {
  readonly familyId: string;
  readonly familyName: string;
  readonly tier: MemberTier;
  readonly clusterId?: string;
  readonly connections: readonly ConstellationConnection[];
  readonly radius: number;
  readonly brightness: number;
  readonly memberCount: number;
  /** Influence score — MUTABLE (computed after layout) */
  influence: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Cluster identity for nebula rendering */
// social-types.ts §6
export interface ConstellationCluster {
  readonly id: string;
  readonly type: string;           // already string, this is fine
  readonly name: string;
  readonly color: string;
  readonly familyIds: readonly string[];
}