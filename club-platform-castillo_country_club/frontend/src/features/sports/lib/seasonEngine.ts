/**
 * src/features/sports/lib/seasonEngine.ts
 * ═══════════════════════════════════════════════════════════
 * §S8 — Season Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Season Engine transforms raw competition data into a
 * living narrative. It determines which "act" of the season
 * we're in, identifies turning points that changed the story,
 * builds chapters with drama scores, predicts the champion,
 * and writes the summary that makes every match feel like
 * it matters.
 *
 * Functions:
 *   buildSeasonNarrative()      — Full narrative from competition data
 *   buildSeasonNarrativeSafe()  — Degraded wrapper, never throws
 *   determineCurrentAct()       — Which act of the season
 *   detectTurningPoints()       — Key dramatic moments
 *   buildSeasonChapters()       — Chapters per act
 *   predictChampion()           — Championship prediction from win rates
 *   buildSeasonMatches()        — Enrich Match → SeasonMatch
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S8
 */

import type {
  SeasonNarrative,
  SeasonChapter,
  TurningPoint,
  SeasonMatch,
  Rivalry,
  ChampionshipContender,
  PlayoffScenario,
  Match
} from "../types";

import {
  SportType,
  SeasonAct,
  SPORT_CONFIG,
} from "../types";

import {
  SPORTS_SEASON_CONFIG,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Act boundary percentages from config */
const ACT_BOUNDARIES = SPORTS_SEASON_CONFIG.ACT_BOUNDARIES;

/** Minimum drama score for turning point detection */
const TURNING_POINT_MIN_DRAMA = SPORTS_SEASON_CONFIG.TURNING_POINT_MIN_DRAMA;

/** Minimum matches for reliable champion prediction */
const CHAMPIONSHIP_MIN_MATCHES = SPORTS_SEASON_CONFIG.CHAMPIONSHIP_MIN_MATCHES;
/** All SeasonAct values in order */
const ACT_ORDER: SeasonAct[] = [
  SeasonAct.OPENING,
  SeasonAct.RIVALRIES_EMERGE,
  SeasonAct.CLIMAX,
  SeasonAct.CHAMPIONSHIP,
  SeasonAct.EPILOGUE,
];

/** Act display labels */
const ACT_LABELS: Record<SeasonAct, string> = {
  [SeasonAct.OPENING]: "La Apertura",
  [SeasonAct.RIVALRIES_EMERGE]: "Las Rivalidades",
  [SeasonAct.CLIMAX]: "El Clímax",
  [SeasonAct.CHAMPIONSHIP]: "La Coronación",
  [SeasonAct.EPILOGUE]: "El Epílogo",
};

/** Act narrative templates */
const ACT_NARRATIVE_TEMPLATES: Record<SeasonAct, string> = {
  [SeasonAct.OPENING]: "La temporada arranca. Los participantes se miden por primera vez y las primeras impresiones definen el tono.",
  [SeasonAct.RIVALRIES_EMERGE]: "Las rivalidades toman forma. Los enfrentamientos repetidos revelan quién tiene la fortaleza mental para competir al más alto nivel.",
  [SeasonAct.CLIMAX]: "Cada partido redefine la tabla. La presión máxima produce los momentos más memorables de la temporada.",
  [SeasonAct.CHAMPIONSHIP]: "La recta final. Todo se decide aquí — los favoritos protegen su posición y los desafiantes dan todo.",
  [SeasonAct.EPILOGUE]: "La temporada se cierra. Se escriben las últimas líneas de esta historia deportiva.",
};
/** Maximum turning points to track */
const MAX_TURNING_POINTS = 10;

/** Maximum chapters to return */
const MAX_CHAPTERS = 5;

// ═══════════════════════════════════════════════════════════
// §1 — buildSeasonNarrative
//
// Constructs a complete SeasonNarrative from match data,
// rivalries, contenders, and playoff scenarios produced
// by §S3 Competition Engine.
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete SeasonNarrative.
 *
 * Algorithm:
 *   1. Build SeasonMatches from raw Matches (enrich with drama + narrative)
 *   2. Determine current act from completion percentage
 *   3. Build chapters per act
 *   4. Detect turning points
 *   5. Predict champion from win rates
 *   6. Generate narrative summary
 *
 * @param seasonId — Season identifier
 * @param sport — Season sport
 * @param matches — Raw match data
 * @param startDate — Season start date
 * @param endDate — Season end date
 * @param rivalries — From §S3 detectRivalries
 * @param championshipContenders — From §S3 generateBracket
 * @param playoffScenarios — From §S3 predictSeasonTrajectory
 * @returns SeasonNarrative
 */
export function buildSeasonNarrative(params: {
  seasonId: string;
  sport: SportType;
  matches: Match[];
  startDate: string;
  endDate: string;
  rivalries?: Rivalry[];
  championshipContenders?: ChampionshipContender[];
  playoffScenarios?: PlayoffScenario[];
}): SeasonNarrative {
  const {
    seasonId,
    sport,
    matches,
    startDate,
    endDate,
    rivalries = [],
    championshipContenders = [],
    playoffScenarios = [],
  } = params;

  // ── Step 1: Build enriched SeasonMatches ──
  const seasonMatches = buildSeasonMatches(matches, rivalries);

  // ── Step 2: Determine completion and current act ──
  const totalMatches = matches.length;
  const completedMatches = matches.filter((m) => m.winnerId != null).length;
  const completionPct = totalMatches > 0
    ? (completedMatches / totalMatches) * 100
    : 0;
  const currentAct = determineCurrentAct(completionPct);

  // ── Step 3: Build chapters ──
  const chapters = buildSeasonChapters(
    seasonMatches,
    startDate,
    endDate,
    currentAct,
  );

  // ── Step 4: Detect turning points ──
  const turningPoints = detectTurningPoints(seasonMatches, startDate);

  // ── Step 5: Predict champion ──
  const predictedChampion = predictChampion(matches);

  // ── Step 6: Narrative summary ──
  const narrativeSummary = generateSeasonSummary({
    sport,
    currentAct,
    completedMatches,
    totalMatches,
    rivalries,
    turningPoints,
    predictedChampion,
  });

  return {
    seasonId,
    sport,
    currentAct,
    chapters,
    rivalries,
    championshipContenders,
    playoffScenarios,
    turningPoints,
    narrativeSummary,
    predictedChampion,
    totalMatches,
    completedMatches,
    startDate,
    endDate,
  };
}

/**
 * Safe wrapper around buildSeasonNarrative.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildSeasonNarrativeSafe(params: {
  seasonId: string;
  sport: SportType;
  matches: Match[];
  startDate: string;
  endDate: string;
  rivalries?: Rivalry[];
  championshipContenders?: ChampionshipContender[];
  playoffScenarios?: PlayoffScenario[];
}): SeasonNarrative {
  try {
    return buildSeasonNarrative({
      ...params,
      matches: params.matches ?? [],
      rivalries: params.rivalries ?? [],
      championshipContenders: params.championshipContenders ?? [],
      playoffScenarios: params.playoffScenarios ?? [],
    });
  } catch {
    return createMinimalNarrative(
      params.seasonId,
      params.sport,
      params.startDate,
      params.endDate,
    );
  }
}

function createMinimalNarrative(
  seasonId: string,
  sport: SportType,
  startDate: string,
  endDate: string,
): SeasonNarrative {
  return {
    seasonId,
    sport,
    currentAct: SeasonAct.OPENING,
    chapters: [],
    rivalries: [],
    championshipContenders: [],
    playoffScenarios: [],
    turningPoints: [],
    narrativeSummary: "Temporada sin datos suficientes para generar narrativa.",
    predictedChampion: null,
    totalMatches: 0,
    completedMatches: 0,
    startDate,
    endDate,
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — determineCurrentAct
//
// Maps completion percentage to the current act of the season.
// ═══════════════════════════════════════════════════════════

/**
 * Determine which act of the season we're in.
 *
 * Uses SPORTS_SEASON_CONFIG.ACT_BOUNDARIES:
 *   opening: 0%, rivalries_emerge: 25%, climax: 55%,
 *   championship: 80%, epilogue: 95%
 *
 * @param completionPct — Percentage of matches completed (0-100)
 * @returns Current SeasonAct
 */
export function determineCurrentAct(completionPct: number): SeasonAct {
  const clamped = clamp(completionPct, 0, 100);

  // Check from latest act to earliest
  if (clamped >= (ACT_BOUNDARIES[SeasonAct.EPILOGUE] ?? 95)) {
    return SeasonAct.EPILOGUE;
  }
  if (clamped >= (ACT_BOUNDARIES[SeasonAct.CHAMPIONSHIP] ?? 80)) {
    return SeasonAct.CHAMPIONSHIP;
  }
  if (clamped >= (ACT_BOUNDARIES[SeasonAct.CLIMAX] ?? 55)) {
    return SeasonAct.CLIMAX;
  }
  if (clamped >= (ACT_BOUNDARIES[SeasonAct.RIVALRIES_EMERGE] ?? 25)) {
    return SeasonAct.RIVALRIES_EMERGE;
  }
  return SeasonAct.OPENING;
}

// ═══════════════════════════════════════════════════════════
// §3 — detectTurningPoints
//
// Identifies key moments that changed the course of the
// season: upsets, lead changes, dominant streaks.
// ═══════════════════════════════════════════════════════════

/**
 * Detect turning points in a season.
 *
 * Algorithm:
 *   1. Sort matches by date
 *   2. For each completed match with dramaScore >= threshold:
 *      a. If upset (lower-seeded player wins) → turning point
 *      b. If rivalry match with high drama → turning point
 *   3. Detect lead changes by tracking cumulative wins
 *   4. Rank turning points by impact
 *
 * @param seasonMatches — Enriched season matches
 * @param seasonStartDate — For computing relative position
 * @returns TurningPoint[] sorted by date
 */
export function detectTurningPoints(
  seasonMatches: SeasonMatch[],
  _seasonStartDate: string,
): TurningPoint[] {
  const completed = seasonMatches
    .filter((m) => m.winnerId != null)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  if (completed.length === 0) return [];

  const turningPoints: TurningPoint[] = [];

  // Track cumulative wins per player
  const winTracker = new Map<string, number>();
  let currentLeader = "";
  let leaderWins = 0;

  for (const match of completed) {
    const winner = match.winnerId!;

    // Update win tracker
    winTracker.set(winner, (winTracker.get(winner) ?? 0) + 1);
    const winnerWins = winTracker.get(winner)!;

    // ── Check for lead change ──
    if (winnerWins > leaderWins && winner !== currentLeader) {
      if (currentLeader !== "") {
        turningPoints.push({
          date: match.date,
          event: "Cambio de líder",
          impact: `${winner} reemplaza a ${currentLeader} en el primer lugar`,
          beforeState: `${currentLeader} lideraba con ${leaderWins} victorias`,
          afterState: `${winner} toma el liderato con ${winnerWins} victorias`,
          matchId: match.matchId,
          memberIds: [winner, currentLeader],
        });
      }
      currentLeader = winner;
      leaderWins = winnerWins;
    }

    // ── Check for high-drama upset ──
    if (match.dramaScore >= TURNING_POINT_MIN_DRAMA && !match.isRivalry) {
      turningPoints.push({
        date: match.date,
        event: "Partido de alto drama",
        impact: `Enfrentamiento con intensidad ${match.dramaScore}/100`,
        beforeState: `Partido ${match.player1Id} vs ${match.player2Id}`,
        afterState: `${winner} se impone en un partido memorable`,
        matchId: match.matchId,
        memberIds: [match.player1Id, match.player2Id],
      });
    }

    // ── Check for rivalry upset ──
    if (match.isRivalry && match.dramaScore >= TURNING_POINT_MIN_DRAMA * 0.7) {
      turningPoints.push({
        date: match.date,
        event: "Victoria en rivalidad",
        impact: `Momento definitorio en la rivalidad`,
        beforeState: `${match.player1Id} vs ${match.player2Id} — rivalidad activa`,
        afterState: `${winner} toma ventaja psicológica`,
        matchId: match.matchId,
        memberIds: [match.player1Id, match.player2Id],
      });
    }
  }

  // Deduplicate by matchId (keep first occurrence per match)
  const seenMatches = new Set<string>();
  const deduped = turningPoints.filter((tp) => {
    if (!tp.matchId) return true;
    if (seenMatches.has(tp.matchId)) return false;
    seenMatches.add(tp.matchId);
    return true;
  });

  // Sort by date and limit
  deduped.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  return deduped.slice(0, MAX_TURNING_POINTS);
}

// ═══════════════════════════════════════════════════════════
// §4 — buildSeasonChapters
//
//# ═══════════════════════════════════════════════════════════
// Creates one chapter per season act with highlights,
// narrative, and drama score.
// ═══════════════════════════════════════════════════════════

/**
 * Build chapters for each act of the season.
 *
 * Algorithm:
 *   1. Compute date ranges per act from ACT_BOUNDARIES
 *   2. Assign matches to acts based on their date
 *   3. For each act with matches:
 *      a. Compute average drama score
 *      b. Identify highlights (top drama matches)
 *      c. Generate chapter narrative
 *
 * @param seasonMatches — Enriched season matches
 * @param startDate — Season start
 * @param endDate — Season end
 * @param currentAct — Farthest act reached
 * @returns SeasonChapter[] in chronological order
 */
export function buildSeasonChapters(
  seasonMatches: SeasonMatch[],
  startDate: string,
  endDate: string,
  currentAct: SeasonAct,
): SeasonChapter[] {
  const startTs = parseDate(startDate);
  const endTs = parseDate(endDate);
  const seasonDuration = endTs - startTs;

  if (seasonDuration <= 0 || seasonMatches.length === 0) return [];

  const chapters: SeasonChapter[] = [];

  // Build chapters for acts up to and including currentAct
  const actsToInclude = ACT_ORDER.filter(
    (act) => ACT_ORDER.indexOf(act) <= ACT_ORDER.indexOf(currentAct),
  );

  for (let i = 0; i < actsToInclude.length; i++) {
    const act = actsToInclude[i];
    const nextAct = actsToInclude[i + 1];

    // Compute date range for this act
    const actStartPct = (ACT_BOUNDARIES[act] ?? 0) / 100;
    const actEndPct = nextAct != null
      ? (ACT_BOUNDARIES[nextAct] ?? 100) / 100
      : 1.0;

    const actStartTs = startTs + seasonDuration * actStartPct;
    const actEndTs = startTs + seasonDuration * actEndPct;

    // Filter matches in this act's date range
    const actMatches = seasonMatches.filter((m) => {
      const matchTs = parseDate(m.date);
      return matchTs >= actStartTs && matchTs < actEndTs;
    });

    // Average drama
    const avgDrama = actMatches.length > 0
      ? Math.round(
          actMatches.reduce((s, m) => s + m.dramaScore, 0) / actMatches.length,
        )
      : 0;

    // Highlights: top 3 drama matches
    const sortedByDrama = [...actMatches].sort(
      (a, b) => b.dramaScore - a.dramaScore,
    );
    const highlights = sortedByDrama
      .slice(0, 3)
      .map((m) => {
        const winner = m.winnerId ?? "?";
        return `${m.player1Id} vs ${m.player2Id} — victoria de ${winner} (drama: ${m.dramaScore})`;
      });

    // Match IDs
    const matchIds = actMatches.map((m) => m.matchId);

    // Chapter narrative
    const narrative = buildChapterNarrative(act, actMatches, avgDrama);

    chapters.push({
      act,
      title: ACT_LABELS[act] ?? act,
      startDate: new Date(actStartTs).toISOString().split("T")[0],
      endDate: new Date(actEndTs).toISOString().split("T")[0],
      highlights,
      matchIds,
      narrative,
      dramaScore: avgDrama,
    });
  }

  return chapters.slice(0, MAX_CHAPTERS);
}

// ═══════════════════════════════════════════════════════════
// §5 — predictChampion
//
// Predicts the champion from match win rates.
// ═══════════════════════════════════════════════════════════

/**
 * Predict the season champion from match results.
 *
 * Algorithm:
 *   1. Count wins per member from completed matches
 *   2. Filter members with >= CHAMPIONSHIP_MIN_MATCHES
 *   3. Compute win rate for each
 *   4. Member with highest win rate is predicted champion
 *   5. Probability based on win rate advantage over #2
 *
 * @param matches — Raw match data
 * @returns { memberId, probability } or null if insufficient data
 */
export function predictChampion(
  matches: Match[],
): { memberId: string; probability: number } | null {
  const completed = matches.filter((m) => m.winnerId != null);
  if (completed.length < CHAMPIONSHIP_MIN_MATCHES) return null;

  // Count wins and total matches per member
  const wins = new Map<string, number>();
  const totals = new Map<string, number>();

  for (const match of completed) {
    const p1 = match.player1Id;
    const p2 = match.player2Id;

    totals.set(p1, (totals.get(p1) ?? 0) + 1);
    totals.set(p2, (totals.get(p2) ?? 0) + 1);

    if (match.winnerId) {
      wins.set(match.winnerId, (wins.get(match.winnerId) ?? 0) + 1);
    }
  }

  // Compute win rates for qualifying members
  const candidates: Array<{ memberId: string; winRate: number; wins: number }> = [];

  for (const [memberId, total] of totals) {
    if (total < 2) continue;
    const memberWins = wins.get(memberId) ?? 0;
    const winRate = memberWins / total;
    candidates.push({ memberId, winRate, wins: memberWins });
  }

  if (candidates.length === 0) return null;

  // Sort by win rate, then by total wins
  candidates.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.wins - a.wins;
  });

  const top = candidates[0];

  // Probability: based on win rate advantage over #2
  let probability: number;
  if (candidates.length >= 2) {
    const second = candidates[1];
    const advantage = top.winRate - second.winRate;
    // 50% base + up to 40% from advantage
    probability = clamp(Math.round(50 + advantage * 200), 50, 95);
  } else {
    probability = Math.round(top.winRate * 100);
  }

  return { memberId: top.memberId, probability };
}

// ═══════════════════════════════════════════════════════════
// §6 — buildSeasonMatches
//
// Enriches raw Match data into SeasonMatch with drama
// scores, rivalry flags, and micro-narratives.
// ═══════════════════════════════════════════════════════════

/**
 * Build enriched SeasonMatch array from raw matches.
 *
 * For each match:
 *   - Check if it's a rivalry match (from rivalries list)
 *   - Compute drama score from closeness + rivalry + timing
 *   - Generate micro-narrative
 *
 * @param matches — Raw match data
 * @param rivalries — Known rivalries
 * @returns SeasonMatch[]
 */
export function buildSeasonMatches(
  matches: Match[],
  rivalries: Rivalry[],
): SeasonMatch[] {
  const rivalrySet = new Set<string>();
  for (const r of rivalries) {
    const key1 = `${r.member1Id}-${r.member2Id}`;
    const key2 = `${r.member2Id}-${r.member1Id}`;
    rivalrySet.add(key1);
    rivalrySet.add(key2);
  }

  return matches.map((match) => {
    const isRivalry =
      rivalrySet.has(`${match.player1Id}-${match.player2Id}`) ||
      rivalrySet.has(`${match.player2Id}-${match.player1Id}`);

    const dramaScore = computeDramaScore(match, isRivalry, matches);
    const narrative = generateMatchNarrative(match, isRivalry, dramaScore);

    return {
      matchId: match.matchId,
      round: match.score ?? "—",
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      winnerId: match.winnerId,
      score: match.score,
      date: match.date,
      isRivalry,
      dramaScore,
      narrative,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// §7 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

// ── Drama score ──

function computeDramaScore(
  match: Match,
  isRivalry: boolean,
  allMatches: Match[],
): number {
  let score = 30; // base

  // Match quality from entity
  if (match.qualityScore != null) {
    score = Math.round(match.qualityScore);
  }

  // Rivalry bonus
  if (isRivalry) {
    score = Math.min(100, score + 20);
  }

  // Close score bonus (if score available and contains numbers)
  if (match.score) {
    const numbers = match.score.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const values = numbers.map(Number);
      const diff = Math.abs(values[0] - values[1]);
      if (diff <= 1) score = Math.min(100, score + 15);
      else if (diff <= 3) score = Math.min(100, score + 8);
    }
  }

  // Late-season bonus (higher stakes)
  const matchDate = parseDate(match.date);
  const allDates = allMatches.map((m) => parseDate(m.date)).filter((t) => t > 0);
  if (allDates.length > 1) {
    const earliest = Math.min(...allDates);
    const latest = Math.max(...allDates);
    const span = latest - earliest;
    if (span > 0) {
      const position = (matchDate - earliest) / span;
      // Later matches get up to 10 bonus points
      score = Math.min(100, score + Math.round(position * 10));
    }
  }

  return clamp(score, 0, 100);
}

// ── Match narrative ──

function generateMatchNarrative(
  match: Match,
  isRivalry: boolean,
  dramaScore: number,
): string {
  const completed = match.winnerId != null;

  if (!completed) {
    return `${match.player1Id} vs ${match.player2Id} — pendiente.`;
  }

  const parts: string[] = [];

  if (isRivalry) {
    parts.push(`En la rivalidad entre ${match.player1Id} y ${match.player2Id}`);
    parts.push(`${match.winnerId} se impone`);
  } else if (dramaScore >= 80) {
    parts.push(`Partido épico: ${match.player1Id} vs ${match.player2Id}`);
    parts.push(`${match.winnerId} vence en un enfrentamiento memorable`);
  } else if (dramaScore >= 60) {
    parts.push(`${match.winnerId} se lleva la victoria contra ${match.player2Id === match.winnerId ? match.player1Id : match.player2Id}`);
  } else {
    parts.push(`Victoria de ${match.winnerId}`);
  }

  if (match.score) {
    parts.push(`(${match.score})`);
  }

  return parts.join(", ") + ".";
}

// ── Chapter narrative ──

function buildChapterNarrative(
  act: SeasonAct,
  matches: SeasonMatch[],
  avgDrama: number,
): string {
  const template = ACT_NARRATIVE_TEMPLATES[act] ?? "";

  if (matches.length === 0) {
    return `${template} Sin partidos registrados en esta fase.`;
  }

  const completed = matches.filter((m) => m.winnerId != null);
  const rivalryMatches = matches.filter((m) => m.isRivalry);

  const parts: string[] = [template];

  parts.push(`${matches.length} partidos disputados`);

  if (completed.length > 0) {
    const dramaLabel = avgDrama >= 70 ? "altísima" : avgDrama >= 50 ? "notable" : "moderada";
    parts.push(`intensidad ${dramaLabel} (drama promedio: ${avgDrama}/100)`);
  }

  if (rivalryMatches.length > 0) {
    parts.push(`${rivalryMatches.length} enfrentamiento(s) de rivalidad`);
  }

  // Top performer
  const winCounts = new Map<string, number>();
  for (const m of completed) {
    if (m.winnerId) {
      winCounts.set(m.winnerId, (winCounts.get(m.winnerId) ?? 0) + 1);
    }
  }
  let topPerformer = "";
  let topWins = 0;
  for (const [member, wins] of winCounts) {
    if (wins > topWins) {
      topWins = wins;
      topPerformer = member;
    }
  }
  if (topPerformer && topWins >= 2) {
    parts.push(`${topPerformer} domina con ${topWins} victorias`);
  }

  return parts.join(". ") + ".";
}

// ── Season summary ──

function generateSeasonSummary(params: {
  sport: SportType;
  currentAct: SeasonAct;
  completedMatches: number;
  totalMatches: number;
  rivalries: Rivalry[];
  turningPoints: TurningPoint[];
  predictedChampion: { memberId: string; probability: number } | null;
}): string {
  const {
    sport,
    currentAct,
    completedMatches,
    totalMatches,
    rivalries,
    turningPoints,
    predictedChampion,
  } = params;

  const sportLabel = SPORT_CONFIG[sport]?.label ?? sport;
  const parts: string[] = [];

  parts.push(`${sportLabel} — ${ACT_LABELS[currentAct]}`);
  parts.push(`${completedMatches}/${totalMatches} partidos completados`);

  if (rivalries.length > 0) {
    const topRivalry = rivalries.sort(
      (a, b) => b.intensityScore - a.intensityScore,
    )[0];
    parts.push(
      `Rivalidad principal: ${topRivalry.member1Id} vs ${topRivalry.member2Id} (intensidad ${topRivalry.intensityScore})`,
    );
  }

  if (turningPoints.length > 0) {
    parts.push(`${turningPoints.length} momento(s) definitorio(s)`);
  }

  if (predictedChampion) {
    parts.push(
      `Favorito al título: ${predictedChampion.memberId} (${predictedChampion.probability}%)`,
    );
  }

  return parts.join(" · ");
}