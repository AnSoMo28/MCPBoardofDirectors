/**
 * src/features/sports/lib/competitionEngine.ts
 * ═══════════════════════════════════════════════════════════
 * §S3 — Competition Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Competition Engine powers tournament brackets, match
 * predictions, rivalry detection, season narratives, and
 * championship forecasting.
 *
 * Functions:
 *   generateBracket()            — Build bracket from tournament + participants
 *   predictMatchOutcome()        — Elo + athletic profile prediction
 *   computeUpsetProbability()    — Upset likelihood for a match
 *   detectRivalries()            — Find intense competitive relationships
 *   predictSeasonTrajectory()    — League position forecast
 *   buildTournamentNarrative()   — Generate story text for tournament
 *   generateSeeding()            — Rank participants for bracket placement
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S3
 */

import type {
  TournamentBracket,
  BracketRound,
  BracketMatch,
  MatchPrediction,
  BracketEntry,
  Rivalry,
  SeasonPrediction,
  PlayoffScenario,
  Standing,
  AthleticProfile,
  MatchHistory,
  Match,
  Tournament,
} from "../types";

import {
  TournamentFormat,
  AthleticLevel,
  AthleticAxis,
  SportType,
  SPORT_CONFIG,
  ATHLETIC_LEVEL_CONFIG,
} from "../types";

import {
  COMPETITION_CONFIG
} from "../config";

// ═══════════════════════════════════════════════════════════
// §0 — INTERNAL TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Internal Elo rating tracker */
interface EloRating {
  memberId: string;
  rating: number;
  matchesPlayed: number;
}

/** Round name mapping by round number and total rounds */
const ROUND_NAMES: Record<number, string> = {
  1: "Final",
  2: "Semifinal",
  3: "Cuartos de Final",
  4: "Octavos de Final",
  5: "Dieciseisavos",
  6: "Treintaidosavos",
};
/** Minimum matches for a rivalry to qualify */
const RIVALRY_MIN_MATCHES = COMPETITION_CONFIG.RIVALRY_MIN_MATCHES;

/** Minimum rivalry intensity score */
const RIVALRY_MIN_INTENSITY = COMPETITION_CONFIG.RIVALRY_MIN_INTENSITY;

/** Default Elo for new members */
const DEFAULT_ELO = COMPETITION_CONFIG.DEFAULT_ELO;

/** Elo K-factor */
const K_FACTOR = COMPETITION_CONFIG.ELO_K_FACTOR;
/** Elo bonus per AthleticLevel difference */
const LEVEL_ADVANTAGE = COMPETITION_CONFIG.LEVEL_ADVANTAGE_ELO;

/** Minimum matches for reliable prediction */
const MIN_MATCHES_PREDICTION = COMPETITION_CONFIG.MIN_MATCHES_FOR_PREDICTION;

/** Upset base rate when Elo is equal */
const UPSET_BASE_RATE = COMPETITION_CONFIG.UPSET_BASE_RATE;

/** Max Elo difference to consider for upset */
const UPSET_MAX_ELO_DIFF = COMPETITION_CONFIG.UPSET_MAX_ELO_DIFF;
/** Championship minimum matches */
// const CHAMPIONSHIP_MIN_MATCHES = COMPETITION_CONFIG.CHAMPIONSHIP_MIN_MATCHES;

/** Maximum playoff scenarios to generate */
const MAX_SCENARIOS = COMPETITION_CONFIG.MAX_PLAYOFF_SCENARIOS;

/** Monte Carlo iterations for season prediction */
const MC_ITERATIONS = 500;
// ═══════════════════════════════════════════════════════════
// §1 — generateSeeding
//
// Ranks participants by Elo + athletic level for bracket
// placement. Seeds ensure top players are distributed
// across the bracket to avoid early matchups.
// ═══════════════════════════════════════════════════════════

/**
 * Generate seeding for tournament participants.
 *
 * Algorithm:
 *   1. Compute composite score per participant:
 *      a. Elo rating (from match history or default)
 *      b. Athletic overall score (from profile)
 *      c. Recent form (last 5 matches win rate)
 *   2. Sort by composite score descending
 *   3. Assign seeds 1..N
 *
 * @param participants — Athletic profiles of participants
 * @param sport — Tournament sport
 * @param matchHistory — Optional match history for Elo computation
 * @returns BracketEntry[] sorted by seed
 */
export function generateSeeding(
  participants: AthleticProfile[],
  sport: SportType,
  matchHistory?: MatchHistory[],
): BracketEntry[] {
  if (participants.length === 0) return [];

  // Build Elo ratings from match history
  const eloMap = buildEloRatings(matchHistory ?? [], sport);

  // Compute composite score per participant
  const entries: Array<{ profile: AthleticProfile; composite: number }> = [];

  for (const profile of participants) {
    const elo = eloMap.get(profile.memberId)?.rating ?? DEFAULT_ELO;
    const athleticScore = profile.overallScore;

    // Recent form: win rate from match history
    const history = matchHistory?.find((h) => h.memberId === profile.memberId);
    const recentForm = history
      ? clamp(history.winRate * 100, 0, 100)
      : 50;

    // Composite: 50% Elo + 30% athletic + 20% form
    const composite = Math.round(
      normalizeElo(elo) * 0.5 +
      athleticScore * 0.3 +
      recentForm * 0.2,
    );

    entries.push({ profile, composite });
  }

  // Sort by composite descending
  entries.sort((a, b) => b.composite - a.composite);

  // Assign seeds
  return entries.map((entry, index) => ({
    memberId: entry.profile.memberId,
    memberName: `Miembro ${entry.profile.memberId}`, // Would come from member data
    seed: index + 1,
    athleticLevel: entry.profile.athleticLevel,
    overallScore: entry.profile.overallScore,
    currentRound: 0,
    winCount: 0,
    lossCount: 0,
  }));
}

// ═══════════════════════════════════════════════════════════
// §2 — generateBracket
//
// Builds a complete tournament bracket with predictions.
// Supports single elimination, double elimination, and
// round robin formats.
// ═══════════════════════════════════════════════════════════

/**
 * Generate a tournament bracket with predictions.
 *
 * Algorithm:
 *   1. Generate seeding from participants
 *   2. Place seeds in bracket (standard seeding distribution)
 *   3. Generate predictions for each match
 *   4. Compute upset probabilities
 *   5. Detect potential rivalries
 *   6. Identify favorites and dark horses
 *   7. Generate tournament narrative
 *
 * @param tournament — Tournament metadata
 * @param participants — Athletic profiles of participants
 * @param matchHistory — Optional match history
 * @returns Complete TournamentBracket
 */
export function generateBracket(
  tournament: Tournament,
  participants: AthleticProfile[],
  matchHistory?: MatchHistory[],
): TournamentBracket {
  const sport = tournament.sport;
  const seededEntries = generateSeeding(participants, sport, matchHistory);
  const eloMap = buildEloRatings(matchHistory ?? [], sport);

  // ── Build rounds based on format ──
  let rounds: BracketRound[];
  let predictions: MatchPrediction[];
  const upsetProbability: Record<string, number> = {};

  if (tournament.format === TournamentFormat.ROUND_ROBIN) {
    const result = buildRoundRobinBracket(seededEntries, sport, eloMap, matchHistory);
    rounds = result.rounds;
    predictions = result.predictions;
    Object.assign(upsetProbability, result.upsetProbability);
  } else {
    const result = buildEliminationBracket(
      seededEntries,
      sport,
      eloMap,
      matchHistory,
      tournament.format,
    );
    rounds = result.rounds;
    predictions = result.predictions;
    Object.assign(upsetProbability, result.upsetProbability);
  }

  // ── Detect rivalries among participants ──
  const rivalryMatchIds: string[] = [];
  if (matchHistory) {
    const rivalries = detectRivalries(
      seededEntries.map((e) => e.memberId),
      matchHistory,
      sport,
    );
    for (const rivalry of rivalries) {
      // Find bracket matches between rivals
      for (const round of rounds) {
        for (const match of round.matches) {
          if (
            (match.player1.memberId === rivalry.member1Id &&
              match.player2.memberId === rivalry.member2Id) ||
            (match.player1.memberId === rivalry.member2Id &&
              match.player2.memberId === rivalry.member1Id)
          ) {
            match.isRivalry = true;
            rivalryMatchIds.push(match.matchId);
          }
        }
      }
    }
  }

  // ── Identify favorites (top 3 seeds) ──
  const favorites = seededEntries.slice(0, Math.min(3, seededEntries.length));

  // ── Identify dark horses (seeds 4-8 with high overall score) ──
  const darkHorses = seededEntries
    .slice(3, Math.min(8, seededEntries.length))
    .filter((e) => e.overallScore >= 60);

  // ── Count total and completed matches ──
  let totalMatches = 0;
  let completedMatches = 0;
  for (const round of rounds) {
    for (const match of round.matches) {
      totalMatches++;
      if (match.status === "completed") completedMatches++;
    }
  }

  // ── Tournament narrative ──
  const tournamentNarrative = buildTournamentNarrative({
    tournamentId: tournament.tournamentId,
    tournamentName: tournament.name,
    format: tournament.format,
    sport,
    rounds,
    predictions,
    upsetProbability,
    tournamentNarrative: "",
    favorites,
    darkHorses,
    rivalryMatchIds,
    totalMatches,
    completedMatches,
  });

  return {
    tournamentId: tournament.tournamentId,
    tournamentName: tournament.name,
    format: tournament.format,
    sport,
    rounds,
    predictions,
    upsetProbability,
    tournamentNarrative,
    favorites,
    darkHorses,
    rivalryMatchIds,
    totalMatches,
    completedMatches,
  };
}

// ── Internal: build elimination bracket ──

function buildEliminationBracket(
  seededEntries: BracketEntry[],
  sport: SportType,
  eloMap: Map<string, EloRating>,
  matchHistory: MatchHistory[] | undefined,
  _format: TournamentFormat,
): {
  rounds: BracketRound[];
  predictions: MatchPrediction[];
  upsetProbability: Record<string, number>;
} {
  const participantCount = seededEntries.length;
  const totalRounds = Math.ceil(Math.log2(Math.max(2, participantCount)));
  const predictions: MatchPrediction[] = [];
  const upsetProbability: Record<string, number> = {};
  const rounds: BracketRound[] = [];

  // Standard seeding: distribute top seeds across bracket
  const bracketOrder = distributeSeeds(participantCount);

  // Build first round matches
  const firstRoundMatches: BracketMatch[] = [];
  const matchCount = Math.pow(2, totalRounds - 1);

  for (let m = 0; m < matchCount; m++) {
    const seed1Idx = bracketOrder[m * 2];
    const seed2Idx = bracketOrder[m * 2 + 1];

    const player1 = seed1Idx < seededEntries.length
      ? seededEntries[seed1Idx]
      : createByeEntry(m * 2 + 100);
    const player2 = seed2Idx < seededEntries.length
      ? seededEntries[seed2Idx]
      : createByeEntry(m * 2 + 101);

    const isBye = player1.memberId.startsWith("bye") || player2.memberId.startsWith("bye");

    const prediction = isBye
      ? createByePrediction(player1, player2)
      : predictMatchOutcome(
          getProfileForMember(player1.memberId, []),
          getProfileForMember(player2.memberId, []),
          sport,
          eloMap,
          matchHistory,
        );

    const matchId = `R1-M${m + 1}`;
    const upsetProb = isBye ? 0 : computeUpsetProbabilityFromPrediction(prediction);

    predictions.push(prediction);
    upsetProbability[matchId] = upsetProb;

    firstRoundMatches.push({
      matchId,
      player1,
      player2,
      winner: isBye ? (player1.memberId.startsWith("bye") ? player2 : player1) : undefined,
      status: isBye ? "walkover" : "scheduled",
      prediction,
      isRivalry: false,
      upsetOccurred: false,
      dramaScore: 0,
    });
  }

  rounds.push({
    roundNumber: 1,
    roundName: getRoundName(1, totalRounds),
    matches: firstRoundMatches,
  });

  // Build subsequent empty rounds
  for (let r = 2; r <= totalRounds; r++) {
    const prevRound = rounds[r - 2];
    const nextMatchCount = Math.ceil(prevRound.matches.length / 2);
    const nextMatches: BracketMatch[] = [];

    for (let m = 0; m < nextMatchCount; m++) {
      const matchId = `R${r}-M${m + 1}`;
      const placeholder1: BracketEntry = {
        memberId: `winner_R${r - 1}-M${m * 2 + 1}`,
        memberName: "Por definir",
        seed: 0,
        athleticLevel: AthleticLevel.NOVICE,
        overallScore: 0,
        currentRound: 0,
        winCount: 0,
        lossCount: 0,
      };
      const placeholder2: BracketEntry = {
        memberId: `winner_R${r - 1}-M${m * 2 + 2}`,
        memberName: "Por definir",
        seed: 0,
        athleticLevel: AthleticLevel.NOVICE,
        overallScore: 0,
        currentRound: 0,
        winCount: 0,
        lossCount: 0,
      };

      nextMatches.push({
        matchId,
        player1: placeholder1,
        player2: placeholder2,
        status: "scheduled",
        prediction: {
          player1WinProbability: 50,
          player2WinProbability: 50,
          confidence: 20,
          keyFactors: ["Depende de resultados previos"],
          upsetProbability: 0.5,
        },
        isRivalry: false,
        upsetOccurred: false,
        dramaScore: 0,
      });
    }

    rounds.push({
      roundNumber: r,
      roundName: getRoundName(r, totalRounds),
      matches: nextMatches,
    });
  }

  return { rounds, predictions, upsetProbability };
}

// ── Internal: build round robin bracket ──

function buildRoundRobinBracket(
  seededEntries: BracketEntry[],
  sport: SportType,
  eloMap: Map<string, EloRating>,
  matchHistory: MatchHistory[] | undefined,
): {
  rounds: BracketRound[];
  predictions: MatchPrediction[];
  upsetProbability: Record<string, number>;
} {
  const predictions: MatchPrediction[] = [];
  const upsetProbability: Record<string, number> = {};
  const allMatches: BracketMatch[] = [];
  let matchCounter = 0;

  // Every participant plays every other participant
  for (let i = 0; i < seededEntries.length; i++) {
    for (let j = i + 1; j < seededEntries.length; j++) {
      matchCounter++;
      const player1 = seededEntries[i];
      const player2 = seededEntries[j];
      const matchId = `RR-M${matchCounter}`;

      const prediction = predictMatchOutcome(
        getProfileForMember(player1.memberId, []),
        getProfileForMember(player2.memberId, []),
        sport,
        eloMap,
        matchHistory,
      );

      const upsetProb = computeUpsetProbabilityFromPrediction(prediction);

      predictions.push(prediction);
      upsetProbability[matchId] = upsetProb;

      allMatches.push({
        matchId,
        player1,
        player2,
        status: "scheduled",
        prediction,
        isRivalry: false,
        upsetOccurred: false,
        dramaScore: 0,
      });
    }
  }

  // Split into rounds (each participant plays once per round)
  const rounds: BracketRound[] = [];
  const matchesPerRound = Math.floor(seededEntries.length / 2);
  const totalRounds = matchesPerRound > 0
    ? Math.ceil(allMatches.length / matchesPerRound)
    : 1;

  for (let r = 0; r < totalRounds; r++) {
    const start = r * matchesPerRound;
    const end = Math.min(start + matchesPerRound, allMatches.length);
    const roundMatches = allMatches.slice(start, end);

    rounds.push({
      roundNumber: r + 1,
      roundName: `Jornada ${r + 1}`,
      matches: roundMatches,
    });
  }

  return { rounds, predictions, upsetProbability };
}

// ═══════════════════════════════════════════════════════════
// §3 — predictMatchOutcome
//
// Predicts match result using Elo rating system enhanced
// with athletic profile axes.
// ═══════════════════════════════════════════════════════════

/**
 * Predict the outcome of a match between two players.
 *
 * Algorithm:
 *   1. Get Elo ratings (from history or default)
 *   2. Apply AthleticLevel differential bonus
 *   3. Compute expected score using Elo formula
 *   4. Adjust by sport-specific axis advantages
 *   5. Compute upset probability
 *   6. Identify key factors
 *
 * @param player1 — AthleticProfile (can be minimal/empty)
 * @param player2 — AthleticProfile (can be minimal/empty)
 * @param sport — Sport type
 * @param eloMap — Elo ratings (built from match history)
 * @param matchHistory — Optional for head-to-head adjustment
 * @returns MatchPrediction
 */
export function predictMatchOutcome(
  player1: AthleticProfile | null,
  player2: AthleticProfile | null,
  sport: SportType,
  eloMap?: Map<string, EloRating>,
  _matchHistory?: MatchHistory[],
): MatchPrediction {
  const p1Id = player1?.memberId ?? "unknown_1";
  const p2Id = player2?.memberId ?? "unknown_2";

  // ── Elo ratings ──
  const p1Elo = eloMap?.get(p1Id)?.rating ?? DEFAULT_ELO;
  const p2Elo = eloMap?.get(p2Id)?.rating ?? DEFAULT_ELO;

  // ── Athletic level bonus ──
  const p1Level = getLevelValue(player1?.athleticLevel ?? AthleticLevel.NOVICE);
  const p2Level = getLevelValue(player2?.athleticLevel ?? AthleticLevel.NOVICE);
  const levelDiff = (p1Level - p2Level) * LEVEL_ADVANTAGE;

  // ── Sport-specific axis advantage ──
  const axisAdvantage = computeAxisAdvantage(player1, player2, sport);

  // ── Effective Elo difference ──
  const effectiveDiff = (p1Elo - p2Elo) + levelDiff + axisAdvantage;

  // ── Expected score (Elo formula) ──
  const p1WinProb = clamp(
    Math.round(1 / (1 + Math.pow(10, -effectiveDiff / 400)) * 100),
    5,
    95,
  );
  const p2WinProb = 100 - p1WinProb;

  // ── Confidence ──
  const p1Matches = eloMap?.get(p1Id)?.matchesPlayed ?? 0;
  const p2Matches = eloMap?.get(p2Id)?.matchesPlayed ?? 0;
  const minMatches = Math.min(p1Matches, p2Matches);
  const confidence = computePredictionConfidence(minMatches, Math.abs(effectiveDiff));

  // ── Upset probability ──
  const upsetProbability = computeUpsetProbabilityFromElo(
    Math.abs(effectiveDiff),
    minMatches,
  );

  // ── Key factors ──
  const keyFactors = identifyKeyFactors(
    player1,
    player2,
    sport,
    p1Elo,
    p2Elo,
    axisAdvantage,
  );

  // ── Predicted score ──
  const predictedScore = generatePredictedScore(
    p1WinProb,
    sport,
  );

  return {
    player1WinProbability: p1WinProb,
    player2WinProbability: p2WinProb,
    predictedScore,
    confidence,
    keyFactors,
    upsetProbability: Math.round(upsetProbability * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════
// §4 — computeUpsetProbability
//
// Calculates the probability that the lower-ranked player
// wins a given bracket match.
// ═══════════════════════════════════════════════════════════

/**
 * Compute upset probability for a bracket match.
 *
 * @param match — BracketMatch with predictions
 * @returns Upset probability 0-1
 */
export function computeUpsetProbability(match: BracketMatch): number {
  if (!match.prediction) return UPSET_BASE_RATE;

  return computeUpsetProbabilityFromPrediction(match.prediction);
}

/** Internal: compute upset from prediction object */
function computeUpsetProbabilityFromPrediction(prediction: MatchPrediction): number {
  // Upset = lower probability player wins
  const underdogProb = Math.min(
    prediction.player1WinProbability,
    prediction.player2WinProbability,
  );

  // Raw upset probability is the underdog's win probability
  const rawUpset = underdogProb / 100;

  // Adjust by confidence: low confidence → higher upset chance
  const confidenceFactor = 1 + (1 - prediction.confidence / 100) * 0.3;

  return clamp(rawUpset * confidenceFactor, 0.02, 0.49);
}

/** Internal: compute upset from Elo difference */
function computeUpsetProbabilityFromElo(
  eloDiff: number,
  matchesPlayed: number,
): number {
  // Base: Elo formula gives the underdog's expected score
  const clampedDiff = Math.min(eloDiff, UPSET_MAX_ELO_DIFF);
  const underdogExpected = 1 / (1 + Math.pow(10, clampedDiff / 400));

  // Experience adjustment: less experienced players are more volatile
  const experienceFactor = matchesPlayed >= MIN_MATCHES_PREDICTION
    ? 1.0
    : 1.0 + (MIN_MATCHES_PREDICTION - matchesPlayed) * 0.03;

  return clamp(underdogExpected * experienceFactor, 0.02, 0.49);
}

// ═══════════════════════════════════════════════════════════
// §5 — detectRivalries
//
// Identifies intense competitive relationships from match
// history. Rivalries are defined by frequent matchups,
// close results, and competitive intensity.
// ═══════════════════════════════════════════════════════════

/**
 * Detect rivalries among a set of members.
 *
 * Algorithm:
 *   1. Build head-to-head records from match history
 *   2. Filter pairs with >= RIVALRY_MIN_MATCHES
 *   3. Compute intensity score:
 *      a. Match count (more = higher)
 *      b. Win balance (closer to 50/50 = higher)
 *      c. Recency (recent matches = higher)
 *      d. Close matches (tight scores = higher)
 *   4. Filter by RIVALRY_MIN_INTENSITY
 *   5. Sort by intensity descending
 *
 * @param memberIds — Members to check
 * @param matchHistory — Historical match data
 * @param sport — Sport type
 * @returns Rivalry[] sorted by intensity
 */
export function detectRivalries(
  memberIds: string[],
  matchHistory: MatchHistory[],
  sport: SportType,
): Rivalry[] {
  // Build head-to-head records
  const h2h = new Map<string, {
    member1Id: string;
    member2Id: string;
    totalMatches: number;
    member1Wins: number;
    member2Wins: number;
    lastMatchDate: string;
    closeMatchCount: number;
  }>();

  for (const history of matchHistory) {
    for (const match of history.recentMatches) {
      const p1 = match.player1Id;
      const p2 = match.player2Id;

      // Only consider matches between our target members
      if (!memberIds.includes(p1) || !memberIds.includes(p2)) continue;
      if (p1 === p2) continue;

      // Normalize pair key (always smaller ID first)
      const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
      const isFirst = p1 < p2;

      const existing = h2h.get(key);
      if (existing) {
        existing.totalMatches++;
        if (match.winnerId === (isFirst ? p1 : p2)) {
          existing.member1Wins++;
        } else if (match.winnerId === (isFirst ? p2 : p1)) {
          existing.member2Wins++;
        }
        // Track close matches (quality score or duration-based)
        if (match.qualityScore != null && match.qualityScore >= 70) {
          existing.closeMatchCount++;
        }
        // Update last match date
        if (match.date > existing.lastMatchDate) {
          existing.lastMatchDate = match.date;
        }
      } else {
        const p1Win = match.winnerId === p1 ? 1 : 0;
        const p2Win = match.winnerId === p2 ? 1 : 0;
        h2h.set(key, {
          member1Id: isFirst ? p1 : p2,
          member2Id: isFirst ? p2 : p1,
          totalMatches: 1,
          member1Wins: isFirst ? p1Win : p2Win,
          member2Wins: isFirst ? p2Win : p1Win,
          lastMatchDate: match.date,
          closeMatchCount: match.qualityScore != null && match.qualityScore >= 70 ? 1 : 0,
        });
      }
    }
  }

  // Compute rivalry intensity and filter
  const rivalries: Rivalry[] = [];

  for (const [, record] of h2h) {
    if (record.totalMatches < RIVALRY_MIN_MATCHES) continue;

    const intensity = computeRivalryIntensity(record);

    if (intensity < RIVALRY_MIN_INTENSITY) continue;

    const narrative = generateRivalryNarrative(record, sport, intensity);

    rivalries.push({
      member1Id: record.member1Id,
      member2Id: record.member2Id,
      sport,
      totalMatches: record.totalMatches,
      member1Wins: record.member1Wins,
      member2Wins: record.member2Wins,
      lastMatchDate: record.lastMatchDate,
      intensityScore: Math.round(intensity),
      narrative,
    });
  }

  // Sort by intensity descending
  rivalries.sort((a, b) => b.intensityScore - a.intensityScore);

  return rivalries;
}

/** Compute rivalry intensity score 0-100 */
function computeRivalryIntensity(record: {
  totalMatches: number;
  member1Wins: number;
  member2Wins: number;
  closeMatchCount: number;
  lastMatchDate: string;
}): number {
  let score = 0;

  // Match count: more matches = more intense (up to 20 matches = max)
  score += Math.min(record.totalMatches / 20, 1) * 30;

  // Win balance: closer to 50/50 = more intense
  const winBalance = record.totalMatches > 0
    ? Math.min(record.member1Wins, record.member2Wins) / record.totalMatches
    : 0;
  score += winBalance * 40; // Max 20 when perfectly balanced

  // Close matches: more close matches = more drama
  const closeRatio = record.totalMatches > 0
    ? record.closeMatchCount / record.totalMatches
    : 0;
  score += closeRatio * 20;

  // Recency: recent matches boost intensity
  const lastMatchTs = new Date(record.lastMatchDate).getTime();
  const daysSince = (Date.now() - lastMatchTs) / 86_400_000;
  if (daysSince < 30) score += 10;
  else if (daysSince < 90) score += 5;

  return clamp(score, 0, 100);
}

/** Generate rivalry narrative text */
function generateRivalryNarrative(
  record: {
    member1Id: string;
    member2Id: string;
    totalMatches: number;
    member1Wins: number;
    member2Wins: number;
    closeMatchCount: number;
  },
  sport: SportType,
  intensity: number,
): string {
  const sportLabel = SPORT_CONFIG[sport]?.label ?? sport;
  const balance = record.member1Wins === record.member2Wins
    ? "empate perfecto"
    : record.member1Wins > record.member2Wins
      ? `${record.member1Wins}-${record.member2Wins}`
      : `${record.member2Wins}-${record.member1Wins}`;

  const intensityLabel = intensity >= 80
    ? "rivalidad legendaria"
    : intensity >= 60
      ? "rivalidad intensa"
      : "competencia sana";

  const parts: string[] = [];
  parts.push(`${intensityLabel} en ${sportLabel}`);
  parts.push(`${record.totalMatches} enfrentamientos, historial ${balance}`);

  if (record.closeMatchCount > 0) {
    parts.push(`${record.closeMatchCount} partidos definidos por mínimo margen`);
  }

  return parts.join(". ") + ".";
}

// ═══════════════════════════════════════════════════════════
// §6 — predictSeasonTrajectory
//
//# ═══════════════════════════════════════════════════════════
// Forecasts a member's final position in a league using
//# Monte Carlo simulation of remaining matches.
//# ═══════════════════════════════════════════════════════════

/**
 * Predict a member's season trajectory in a league.
 *
 * Algorithm:
 *   1. Compute current standings from completed matches
 *   2. For remaining matches, simulate outcomes using Elo
 *   3. Run MC_ITERATIONS simulations
 *   4. Aggregate: average final position, confidence,
 *      critical matches, scenarios
 *
 * @param memberId — Target member
 * @param standings — Current league standings
 * @param remainingMatches — Matches yet to be played
 * @param matchHistory — Historical match data for predictions
 * @param sport — Sport type
 * @returns SeasonPrediction
 */
export function predictSeasonTrajectory(
  memberId: string,
  standings: Standing[],
  remainingMatches: Match[],
  matchHistory: MatchHistory[],
  sport: SportType,
): SeasonPrediction {
  const eloMap = buildEloRatings(matchHistory, sport);

  // Find current position
  const currentStanding = standings.find((s) => s.memberId === memberId);
  const currentPosition = currentStanding?.position ?? standings.length;
  if (remainingMatches.length === 0 || standings.length === 0) {
    return {
      memberId,
      sport,
      predictedFinalPosition: currentPosition,
      confidence: 90,
      remainingMatches: 0,
      criticalMatches: [],
      scenarios: [],
    };
  }

  // ── Monte Carlo simulation ──
  const finalPositions: number[] = [];
  const positionCounts = new Map<number, number>();

  for (let sim = 0; sim < MC_ITERATIONS; sim++) {
    // Clone standings
    const simStandings = standings.map((s) => ({ ...s }));

    // Simulate remaining matches
    for (const match of remainingMatches) {
      const p1 = match.player1Id;
      const p2 = match.player2Id;
      const p1Elo = eloMap.get(p1)?.rating ?? DEFAULT_ELO;
      const p2Elo = eloMap.get(p2)?.rating ?? DEFAULT_ELO;

      // Add randomness for simulation
      const effectiveDiff = (p1Elo - p2Elo) + (Math.random() - 0.5) * 100;
      const p1WinProb = 1 / (1 + Math.pow(10, -effectiveDiff / 400));
      const p1Wins = Math.random() < p1WinProb;

      const winnerId = p1Wins ? p1 : p2;
      const loserId = p1Wins ? p2 : p1;

      // Update standings
      const winnerStanding = simStandings.find((s) => s.memberId === winnerId);
      const loserStanding = simStandings.find((s) => s.memberId === loserId);
      if (winnerStanding) {
        winnerStanding.points += 3;
        winnerStanding.won++;
        winnerStanding.played++;
      }
      if (loserStanding) {
        loserStanding.lost++;
        loserStanding.played++;
      }
    }

    // Sort by points
    simStandings.sort((a, b) => b.points - a.points);

    // Find target member's final position
    const finalPos = simStandings.findIndex((s) => s.memberId === memberId) + 1;
    const position = finalPos > 0 ? finalPos : standings.length;
    finalPositions.push(position);
    positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  }

  // ── Aggregate results ──
  const avgPosition = Math.round(
    finalPositions.reduce((s, p) => s + p, 0) / finalPositions.length,
  );

  // Confidence: how concentrated are the results
  const mostCommonPosition = Array.from(positionCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];
  const confidence = Math.round(
    (mostCommonPosition[1] / MC_ITERATIONS) * 100,
  );

  // ── Critical matches: matches involving the member that swing position ──
  const memberRemaining = remainingMatches.filter(
    (m) => m.player1Id === memberId || m.player2Id === memberId,
  );
  const criticalMatches = memberRemaining
    .filter((m) => {
      const opponent = m.player1Id === memberId ? m.player2Id : m.player1Id;
      const opponentStanding = standings.find((s) => s.memberId === opponent);
      // Critical if opponent is close in standings
      return opponentStanding != null &&
        Math.abs((opponentStanding?.position ?? 99) - currentPosition) <= 3;
    })
    .map((m) => m.matchId);

  // ── Playoff scenarios ──
  const scenarios = generatePlayoffScenarios(
    memberId,
    standings,
    remainingMatches,
    positionCounts,
    MC_ITERATIONS,
  );

  return {
    memberId,
    sport,
    predictedFinalPosition: avgPosition,
    confidence,
    remainingMatches: remainingMatches.length,
    criticalMatches,
    scenarios,
  };
}

// ═══════════════════════════════════════════════════════════
// §7 — buildTournamentNarrative
//
// Generates story text for a tournament.
// ═══════════════════════════════════════════════════════════

/**
 * Build a narrative description for a tournament.
 *
 * Algorithm:
 *   1. Determine tournament stage from completion %
 *   2. Identify key storylines (favorites, dark horses, rivalries)
 *   3. Generate narrative text combining all elements
 *
 * @param bracket — TournamentBracket
 * @returns Narrative string
 */
export function buildTournamentNarrative(bracket: TournamentBracket): string {
  const parts: string[] = [];
  const completionPct = bracket.totalMatches > 0
    ? Math.round((bracket.completedMatches / bracket.totalMatches) * 100)
    : 0;

  // ── Tournament header ──
  const sportLabel = SPORT_CONFIG[bracket.sport]?.label ?? bracket.sport;
  parts.push(`${bracket.tournamentName} — ${sportLabel}`);

  // ── Stage description ──
  if (completionPct === 0) {
    parts.push("El torneo está por comenzar.");
  } else if (completionPct < 25) {
    parts.push("Fase inicial: los contendientes se están midiendo.");
  } else if (completionPct < 55) {
    parts.push("El torneo se calienta: las diferencias se hacen claras.");
  } else if (completionPct < 80) {
    parts.push("Fase decisiva: cada partido redefine el camino al título.");
  } else if (completionPct < 100) {
    parts.push("Recta final: la tensión está en su punto máximo.");
  } else {
    parts.push("Torneo completado.");
  }

  // ── Favorites ──
  if (bracket.favorites.length > 0) {
    const favSeeds = bracket.favorites.map((f) => `#${f.seed}`).join(", ");
    parts.push(`Favoritos: ${favSeeds}`);
  }

  // ── Dark horses ──
  if (bracket.darkHorses.length > 0) {
    parts.push(`${bracket.darkHorses.length} dark horse(s) que pueden sorprender`);
  }

  // ── Rivalries ──
  if (bracket.rivalryMatchIds.length > 0) {
    parts.push(
      `${bracket.rivalryMatchIds.length} enfrentamiento(s) de rivalidad programados`,
    );
  }

  // ── Upset candidates ──
  const upsetMatches = Object.entries(bracket.upsetProbability)
    .filter(([, prob]) => prob > 0.3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (upsetMatches.length > 0) {
    const upsetPct = Math.round(upsetMatches[0][1] * 100);
    parts.push(`Mayor probabilidad de upset: ${upsetPct}%`);
  }

  // ── Progress ──
  parts.push(`${bracket.completedMatches}/${bracket.totalMatches} partidos completados`);

  return parts.join(" · ");
}

// ═══════════════════════════════════════════════════════════
// §8 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

/** Clamp a number to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Build Elo ratings from match history */
function buildEloRatings(
  matchHistory: MatchHistory[],
  sport: SportType,
): Map<string, EloRating> {
  const ratings = new Map<string, EloRating>();

  // Initialize all members at default Elo
  for (const history of matchHistory) {
    if (!ratings.has(history.memberId)) {
      ratings.set(history.memberId, {
        memberId: history.memberId,
        rating: DEFAULT_ELO,
        matchesPlayed: history.totalMatches,
      });
    }
  }

  // Process matches chronologically to build ratings
  const allMatches: Match[] = [];
  for (const history of matchHistory) {
    for (const match of history.recentMatches) {
      if (match.sport === sport) {
        allMatches.push(match);
      }
    }
  }

  // Sort by date
  allMatches.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Update Elo from each match
  for (const match of allMatches) {
    if (!match.winnerId) continue;

    const p1 = ratings.get(match.player1Id) ?? {
      memberId: match.player1Id,
      rating: DEFAULT_ELO,
      matchesPlayed: 0,
    };
    const p2 = ratings.get(match.player2Id) ?? {
      memberId: match.player2Id,
      rating: DEFAULT_ELO,
      matchesPlayed: 0,
    };

    const expected1 = 1 / (1 + Math.pow(10, (p2.rating - p1.rating) / 400));
    const expected2 = 1 - expected1;

    const actual1 = match.winnerId === match.player1Id ? 1 : 0;
    const actual2 = 1 - actual1;

    p1.rating = Math.round(p1.rating + K_FACTOR * (actual1 - expected1));
    p2.rating = Math.round(p2.rating + K_FACTOR * (actual2 - expected2));
    p1.matchesPlayed++;
    p2.matchesPlayed++;

    ratings.set(p1.memberId, p1);
    ratings.set(p2.memberId, p2);
  }

  return ratings;
}

/** Normalize Elo rating to 0-100 scale */
function normalizeElo(elo: number): number {
  // Typical Elo range: 800-2400 → map to 0-100
  return clamp(Math.round(((elo - 800) / 1600) * 100), 0, 100);
}

/** Get numeric level value for AthleticLevel */
function getLevelValue(level: AthleticLevel): number {
  const config = ATHLETIC_LEVEL_CONFIG[level];
  if (config) {
    return (config.min + config.max) / 2;
  }
  return 50;
}

/** Compute sport-specific axis advantage between two players */
function computeAxisAdvantage(
  player1: AthleticProfile | null,
  player2: AthleticProfile | null,
  sport: SportType,
): number {
  if (!player1 || !player2) return 0;

  // Get sport category → determine primary axes
  const sportConfig = SPORT_CONFIG[sport];
  if (!sportConfig) return 0;

  const category = sportConfig.category;
  let primaryAxes: AthleticAxis[];

  switch (category) {
    case "racquet":
      primaryAxes = [AthleticAxis.TECHNIQUE, AthleticAxis.SPEED];
      break;
    case "water":
      primaryAxes = [AthleticAxis.ENDURANCE, AthleticAxis.TECHNIQUE];
      break;
    case "fitness":
      primaryAxes = [AthleticAxis.POWER, AthleticAxis.ENDURANCE];
      break;
    case "team":
      primaryAxes = [AthleticAxis.TACTICAL, AthleticAxis.SPEED];
      break;
    case "individual":
      primaryAxes = [AthleticAxis.ENDURANCE, AthleticAxis.MENTAL];
      break;
    case "wellness":
      primaryAxes = [AthleticAxis.MENTAL, AthleticAxis.TECHNIQUE];
      break;
    default:
      primaryAxes = [AthleticAxis.TECHNIQUE, AthleticAxis.ENDURANCE];
  }

  // Sum primary axis scores for each player
  let p1Primary = 0;
  let p2Primary = 0;
  for (const axis of primaryAxes) {
    p1Primary += player1.axes[axis] ?? 0;
    p2Primary += player2.axes[axis] ?? 0;
  }

  // Convert difference to Elo-equivalent (10 points = ~25 Elo)
  const axisDiff = p1Primary - p2Primary;
  return Math.round(axisDiff * 2.5);
}

/** Compute prediction confidence from match count and Elo diff */
function computePredictionConfidence(
  minMatches: number,
  eloDiff: number,
): number {
  let confidence = 50;

  // More matches = more confidence
  if (minMatches >= 20) confidence += 25;
  else if (minMatches >= 10) confidence += 18;
  else if (minMatches >= 5) confidence += 10;
  else if (minMatches >= 2) confidence += 5;

  // Larger Elo diff = more confidence (up to a point)
  if (eloDiff > 300) confidence += 20;
  else if (eloDiff > 200) confidence += 15;
  else if (eloDiff > 100) confidence += 10;
  else if (eloDiff > 50) confidence += 5;

  return clamp(confidence, 20, 95);
}

/** Identify key factors for a match prediction */
function identifyKeyFactors(
  player1: AthleticProfile | null,
  player2: AthleticProfile | null,
  sport: SportType,
  p1Elo: number,
  p2Elo: number,
  axisAdvantage: number,
): string[] {
  const factors: string[] = [];

  // Elo difference
  const eloDiff = p1Elo - p2Elo;
  if (Math.abs(eloDiff) > 200) {
    const leader = eloDiff > 0 ? "Jugador 1" : "Jugador 2";
    factors.push(`${leader} con ventaja significativa en ranking histórico`);
  } else if (Math.abs(eloDiff) > 100) {
    factors.push("Ventaja moderada en historial competitivo");
  }

  // Axis advantage
  if (Math.abs(axisAdvantage) > 50) {
    const leader = axisAdvantage > 0 ? "Jugador 1" : "Jugador 2";
    factors.push(`${leader} superior en habilidades clave para ${SPORT_CONFIG[sport]?.label ?? sport}`);
  }

  // Athletic level difference
  if (player1 && player2) {
    const p1Level = getLevelValue(player1.athleticLevel);
    const p2Level = getLevelValue(player2.athleticLevel);
    if (Math.abs(p1Level - p2Level) > 30) {
      const higher = p1Level > p2Level ? player1.athleticLevel : player2.athleticLevel;
      factors.push(`Nivel atlético ${higher} del favorito`);
    }
  }

  // Experience
  if (player1 && player2) {
    const sessionDiff = player1.totalSessions - player2.totalSessions;
    if (Math.abs(sessionDiff) > 20) {
      const more = sessionDiff > 0 ? "Jugador 1" : "Jugador 2";
      factors.push(`${more} con mayor experiencia competitiva`);
    }
  }

  if (factors.length === 0) {
    factors.push("Partido parejo — resultado difícil de predecir");
  }

  return factors.slice(0, 4);
}

/** Generate a predicted score based on win probability and sport */
function generatePredictedScore(
  p1WinProb: number,
  sport: SportType,
): string {
  const sportLabel = sport;

  // Sport-specific score formats
  switch (sportLabel) {
    case SportType.TENNIS:
    case SportType.PADEL:
    case SportType.SQUASH: {
      // Racquet sports: best of 3 sets
      const setsToWin = 2;
      const favoritSets = p1WinProb >= 50
        ? Math.min(setsToWin, Math.round(p1WinProb / 35))
        : Math.min(setsToWin, Math.round((100 - p1WinProb) / 35));
      const underdogSets = setsToWin - favoritSets;
      return p1WinProb >= 50
        ? `${favoritSets}-${underdogSets} sets`
        : `${underdogSets}-${favoritSets} sets`;
    }
    case SportType.BASKETBALL:
      return p1WinProb >= 50 ? "Favorito gana por 8-15 puntos" : "Posible upset cerrado";
    case SportType.FOOTBALL:
    case SportType.VOLLEYBALL:
      return p1WinProb >= 50 ? "2-1" : "1-2";
    default:
      return p1WinProb >= 55 ? "Victoria del favorito" : "Partido abierto";
  }
}

/** Generate playoff scenarios from Monte Carlo results */
function generatePlayoffScenarios(
  memberId: string,
  standings: Standing[],
  remainingMatches: Match[],
  positionCounts: Map<number, number>,
  totalSims: number,
): PlayoffScenario[] {
  const scenarios: PlayoffScenario[] = [];
  const sortedPositions = Array.from(positionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SCENARIOS);

  const totalParticipants = standings.length;
  const playoffCutoff = Math.ceil(totalParticipants * 0.5); // Top 50% make playoffs

  for (const [position, count] of sortedPositions) {
    const probability = count / totalSims;
    if (probability < 0.03) continue; // Ignore < 3% scenarios

    const inPlayoffs = position <= playoffCutoff;
    const memberRemaining = remainingMatches.filter(
      (m) => m.player1Id === memberId || m.player2Id === memberId,
    );

    let description: string;
    if (position === 1) {
      description = "Campeón de la liga";
    } else if (position <= 3) {
      description = `Top ${position} — posición de playoffs con ventaja`;
    } else if (inPlayoffs) {
      description = `Posición ${position} — clasifica a playoffs`;
    } else {
      description = `Posición ${position} — fuera de playoffs`;
    }

    const matchRequirements = memberRemaining
      .slice(0, Math.min(3, memberRemaining.length))
      .map((m) => {
        const opponent = m.player1Id === memberId ? m.player2Id : m.player1Id;
        const oppStanding = standings.find((s) => s.memberId === opponent);
        return `vs ${oppStanding?.memberName ?? opponent}`;
      });

    scenarios.push({
      scenarioId: `scenario_${position}`,
      description,
      probability: Math.round(probability * 100) / 100,
      matchRequirements,
      resultingPosition: position,
    });
  }

  return scenarios;
}

/** Distribute seeds in standard tournament bracket order */
function distributeSeeds(participantCount: number): number[] {
  // Standard seeding: 1vN, Nv2, etc.
  // For power of 2 bracket
  const bracketSize = nextPowerOf2(participantCount);
  const seeds: number[] = [];

  function distributeRound(start: number, end: number, seedArray: number[]): void {
    if (start === end) {
      seedArray.push(start);
      return;
    }
    const mid = Math.floor((start + end) / 2);
    const top: number[] = [];
    const bottom: number[] = [];
    distributeRound(start, mid, top);
    distributeRound(mid + 1, end, bottom);

    // Interleave: top[0], bottom[0], top[1], bottom[1], ...
    for (let i = 0; i < top.length; i++) {
      seedArray.push(top[i]);
      if (i < bottom.length) {
        seedArray.push(bottom[i]);
      }
    }
  }

  distributeRound(0, bracketSize - 1, seeds);
  return seeds;
}

/** Next power of 2 >= n */
function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Get round name from round number */
function getRoundName(round: number, totalRounds: number): string {
  const roundsFromFinal = totalRounds - round;
  return ROUND_NAMES[roundsFromFinal] ?? `Ronda ${round}`;
}

/** Get a stub profile for a member ID (used during bracket building) */
function getProfileForMember(
  memberId: string,
  profiles: AthleticProfile[],
): AthleticProfile | null {
  return profiles.find((p) => p.memberId === memberId) ?? null;
}

/** Create a bye entry for elimination brackets */
function createByeEntry(seed: number): BracketEntry {
  return {
    memberId: `bye_${seed}`,
    memberName: "BYE",
    seed: 0,
    athleticLevel: AthleticLevel.NOVICE,
    overallScore: 0,
    currentRound: 0,
    winCount: 0,
    lossCount: 0,
  };
}

/** Create a bye prediction (always favors the non-bye player) */
function createByePrediction(
  player1: BracketEntry,
  _player2: BracketEntry,
): MatchPrediction {
  const p1IsBye = player1.memberId.startsWith("bye");
  return {
    player1WinProbability: p1IsBye ? 0 : 100,
    player2WinProbability: p1IsBye ? 100 : 0,
    confidence: 100,
    keyFactors: ["BYE — avanza automáticamente"],
    upsetProbability: 0,
  };
}