// ═══════════════════════════════════════════════════════════
// src/features/sports/components/BracketView.tsx
// §B3.13 — Bracket View V2 (Tournament Bracket)
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// HTML match cards + SVG connector lines between rounds.
// Upset detection (lower-positioned player wins). Status
// colors via data-attributes. Champion crown. Narrative.
// Living Protocol: 7/7
//
// Aha Moment: "El bracket tiene memoria — cada línea
// cuenta la historia de cómo se llegó a la final."
//
// Changes from V1:
//   ✗ cn() → BEM classes
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color: X }} → data-attributes
//   ✗ MOCK_BRACKET → removed
//   ✗ useReducedMotion → window.matchMedia
//   ✗ className prop → removed
//   ✗ Margin-offset connectors → SVG lines
//   ✓ data-match-status, data-upset, data-mode
//   ✓ Narrative (LP 7)
//   ✓ SVG connector lines between rounds
//   ✓ Upset highlighting
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component BracketView
// ═══════════════════════════════════════════════════════════

import { useMemo, useRef, useEffect, useState } from "react";
import {
  Trophy,
  Clock,
  Swords,
  Crown,
  ChevronRight,
} from "lucide-react";
import type { SportsDashboardMode } from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./BracketView.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  player1: string | null;
  player2: string | null;
  score1: number | null;
  score2: number | null;
  winner: "player1" | "player2" | null;
  status: "completed" | "in_progress" | "pending" | "bye";
  /** Optional seed numbers for upset detection */
  seed1?: number;
  seed2?: number;
}

export interface BracketViewProps {
  tournamentName: string;
  matches: BracketMatch[];
  ambientMode?: SportsDashboardMode;
}

type MatchStatus = BracketMatch["status"];

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const ROUND_LABELS: Record<number, string> = {
  1: "Cuartos de Final",
  2: "Semifinales",
  3: "Final",
  4: "Gran Final",
};

const MAX_DISPLAYED_MATCHES = 64;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function getRoundName(round: number, totalRounds: number): string {
  if (ROUND_LABELS[round]) return ROUND_LABELS[round];
  if (totalRounds === 1) return "Final";
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinales";
  return `Ronda ${round}`;
}

/**
 * Detect if a match is an upset: the lower-seeded (higher number)
 * player defeats the higher-seeded (lower number) player.
 */
function isUpset(match: BracketMatch): boolean {
  if (match.status !== "completed" || !match.winner) return false;
  if (match.seed1 == null || match.seed2 == null) return false;

  if (match.winner === "player1") {
    return match.seed1 > match.seed2;
  }
  return match.seed2 > match.seed1;
}

function buildBracketNarrative(
  tournamentName: string,
  totalMatches: number,
  completedCount: number,
  inProgressCount: number,
  champion: string | null,
  upsetCount: number,
  totalRounds: number,
): string {
  const progressPct =
    totalMatches > 0 ? Math.round((completedCount / totalMatches) * 100) : 0;

  const main = `${tournamentName}: ${completedCount}/${totalMatches} partidos (${progressPct}%).`;

  const inProgressPart =
    inProgressCount > 0
      ? ` ${inProgressCount} en curso.`
      : "";

  const championPart = champion
    ? ` 🏆 Campeón: ${champion}.`
    : totalRounds > 0
      ? ` Ronda actual: ${getRoundName(completedCount > 0 ? Math.ceil(completedCount / 2) + 1 : 1, totalRounds)}.`
      : "";

  const upsetPart =
    upsetCount > 0
      ? ` ${upsetCount} sorpresa${upsetCount > 1 ? "s" : ""} en el bracket.`
      : "";

  return `${main}${inProgressPart}${championPart}${upsetPart}`;
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 MatchNode ───────────────────────────────────────

function MatchNode({ match, index, ambientMode }: {
  match: BracketMatch;
  index: number;
  reducedMotion: boolean;
  ambientMode: SportsDashboardMode;
}) {
  const upset = isUpset(match);
  const completed = match.status === "completed";
  const inProgress = match.status === "in_progress";
  const pending = match.status === "pending";
  const bye = match.status === "bye";

  return (
    <div
      className="spt-bracket__node"
      data-match-status={match.status}
      data-upset={upset}
      data-mode={ambientMode}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      {/* ── Player 1 ── */}
      <div
        className="spt-bracket__player"
        data-winner={match.winner === "player1"}
      >
        <span
          className="spt-bracket__player-name"
          data-winner={match.winner === "player1"}
          data-empty={!match.player1}
        >
          {match.seed1 != null && (
            <span className="spt-bracket__seed">[{match.seed1}]</span>
          )}
          {match.player1 ?? "Por definir"}
        </span>
        {match.score1 != null && (
          <span
            className="spt-bracket__score"
            data-winner={match.winner === "player1"}
          >
            {match.score1}
          </span>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="spt-bracket__divider" />

      {/* ── Player 2 ── */}
      <div
        className="spt-bracket__player"
        data-winner={match.winner === "player2"}
      >
        <span
          className="spt-bracket__player-name"
          data-winner={match.winner === "player2"}
          data-empty={!match.player2}
        >
          {match.seed2 != null && (
            <span className="spt-bracket__seed">[{match.seed2}]</span>
          )}
          {match.player2 ?? "Por definir"}
        </span>
        {match.score2 != null && (
          <span
            className="spt-bracket__score"
            data-winner={match.winner === "player2"}
          >
            {match.score2}
          </span>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="spt-bracket__status" data-match-status={match.status}>
        {inProgress && (
          <span className="spt-bracket__status-pulse" data-match-status="in_progress" />
        )}
        {completed && <Trophy className="spt-bracket__status-icon" />}
        {pending && <Clock className="spt-bracket__status-icon" />}
        {upset && <Swords className="spt-bracket__status-icon spt-bracket__status-icon--upset" />}
        <span className="spt-bracket__status-label">
          {completed
            ? upset
              ? "¡Sorpresa!"
              : "Completado"
            : inProgress
              ? "En curso"
              : bye
                ? "Bye"
                : "Pendiente"}
        </span>
      </div>
    </div>
  );
}

// ── §4.2 ChampionCard ────────────────────────────────────

function ChampionCard({
  champion,
  ambientMode,
}: {
  champion: string;
  ambientMode: SportsDashboardMode;
}) {
  return (
    <div className="spt-bracket__champion" data-mode={ambientMode}>
      <Crown className="spt-bracket__champion-icon" />
      <span className="spt-bracket__champion-name">{champion}</span>
    </div>
  );
}

// ── §4.3 ProgressBar ─────────────────────────────────────

function BracketProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="spt-bracket__progress">
      <div className="spt-bracket__progress-header">
        <span className="spt-bracket__progress-label">Progreso del torneo</span>
        <span className="spt-bracket__progress-value">{pct}%</span>
      </div>
      <div className="spt-bracket__progress-track">
        <div
          className="spt-bracket__progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function BracketView({
  tournamentName,
  matches,
  ambientMode = "calm",
}: BracketViewProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const gridRef = useRef<HTMLDivElement>(null);
  const [connectors, setConnectors] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number; status: MatchStatus }>
  >([]);

  // ── §5.1 — Group matches by round ─────────────────────
  const rounds = useMemo(() => {
    const grouped = new Map<number, BracketMatch[]>();
    const limited = matches.slice(0, MAX_DISPLAYED_MATCHES);

    for (const match of limited) {
      const existing = grouped.get(match.round) ?? [];
      existing.push(match);
      grouped.set(match.round, existing);
    }

    for (const [, roundMatches] of grouped) {
      roundMatches.sort((a, b) => a.position - b.position);
    }

    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const totalRounds = rounds.length;
  const completedCount = useMemo(
    () => matches.filter((m) => m.status === "completed").length,
    [matches],
  );
  const inProgressCount = useMemo(
    () => matches.filter((m) => m.status === "in_progress").length,
    [matches],
  );
  const upsetCount = useMemo(
    () => matches.filter(isUpset).length,
    [matches],
  );

  // ── §5.2 — Champion detection ─────────────────────────
  const finalMatch = useMemo(
    () => matches.find((m) => m.round === totalRounds),
    [matches, totalRounds],
  );
  const champion = useMemo(() => {
    if (!finalMatch) return null;
    return finalMatch.winner === "player1"
      ? finalMatch.player1
      : finalMatch.winner === "player2"
        ? finalMatch.player2
        : null;
  }, [finalMatch]);

  // ── §5.3 — Narrative ──────────────────────────────────
  const narrative = useMemo(
    () =>
      buildBracketNarrative(
        tournamentName,
        matches.length,
        completedCount,
        inProgressCount,
        champion,
        upsetCount,
        totalRounds,
      ),
    [tournamentName, matches.length, completedCount, inProgressCount, champion, upsetCount, totalRounds],
  );

  // ── §5.4 — SVG connector lines ────────────────────────
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || rounds.length < 2) {
      setConnectors([]);
      return;
    }

    const gridRect = grid.getBoundingClientRect();
    const newConnectors: typeof connectors = [];

    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const currentCol = grid.querySelector(`[data-round="${rounds[ri][0]}"]`);
      const nextCol = grid.querySelector(`[data-round="${rounds[ri + 1][0]}"]`);
      if (!currentCol || !nextCol) continue;

      const currentNodes = currentCol.querySelectorAll(".spt-bracket__node");
      const nextNodes = nextCol.querySelectorAll(".spt-bracket__node");

      for (let ni = 0; ni < currentNodes.length; ni += 2) {
        const node1 = currentNodes[ni] as HTMLElement;
        const node2 = currentNodes[ni + 1] as HTMLElement;
        const target = nextNodes[Math.floor(ni / 2)] as HTMLElement;
        if (!node1 || !target) continue;

        const n1Rect = node1.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();

        const x1 = n1Rect.right - gridRect.left;
        const y1 = n1Rect.top + n1Rect.height / 2 - gridRect.top;
        const x2 = tRect.left - gridRect.left;
        const y2 = tRect.top + tRect.height / 2 - gridRect.top;

        // Determine connector status from the target match
        const targetMatch = rounds[ri + 1]?.[1]?.[Math.floor(ni / 2)];
        const status: MatchStatus = targetMatch?.status ?? "pending";

        newConnectors.push({ x1, y1, x2, y2, status });

        // Second connector from node2 (if exists)
        if (node2) {
          const n2Rect = node2.getBoundingClientRect();
          const y2mid = n2Rect.top + n2Rect.height / 2 - gridRect.top;
          newConnectors.push({
            x1: n2Rect.right - gridRect.left,
            y1: y2mid,
            x2: tRect.left - gridRect.left,
            y2,
            status,
          });
        }
      }
    }

    setConnectors(newConnectors);
  }, [rounds]);

  // ── §5.5 — Degraded ──────────────────────────────────
  if (matches.length === 0) {
    return (
      <section
        className="spt-bracket"
        data-mode={ambientMode}
        role="region"
        aria-label="Bracket del torneo"
      >
        <EmptyState
          icon={<Trophy className="w-5 h-5" />}
          title="Sin bracket generado"
          description="Cuando un torneo esté activo y tenga participantes asignados, el bracket se generará automáticamente mostrando el árbol de eliminación."
          compact
        />
      </section>
    );
  }

  // ── §5.6 — Render ─────────────────────────────────────
  return (
    <section
      className="spt-bracket"
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-bracket__header">
        <div className="spt-bracket__header-left">
          <Trophy className="spt-bracket__header-icon" />
          <div className="spt-bracket__header-text">
            <h3 className="spt-bracket__title">Bracket — {tournamentName}</h3>
            <p className="spt-bracket__subtitle">
              {completedCount}/{matches.length} partidos completados
              {upsetCount > 0 && (
                <span className="spt-bracket__upset-count">
                  · {upsetCount} sorpresa{upsetCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        {champion && <ChampionCard champion={champion} ambientMode={ambientMode} />}
      </div>

      {/* ── Bracket grid with SVG connectors ── */}
      <div className="spt-bracket__scroll">
        <div className="spt-bracket__grid" ref={gridRef}>
          {/* SVG connector layer */}
          <svg className="spt-bracket__connectors" aria-hidden="true">
            {connectors.map((c, i) => {
              const midX = (c.x1 + c.x2) / 2;
              const path = `M ${c.x1} ${c.y1} H ${midX} V ${c.y2} H ${c.x2}`;
              return (
                <path
                  key={`conn-${i}`}
                  className="spt-bracket__connector-line"
                  d={path}
                  data-match-status={c.status}
                />
              );
            })}
          </svg>

          {/* Round columns */}
          {rounds.map(([roundNum, roundMatches], roundIdx) => (
            <div
              key={roundNum}
              className="spt-bracket__round"
              data-round={roundNum}
              style={{ "--round-i": roundIdx } as React.CSSProperties}
            >
              {/* Round label */}
              <div className="spt-bracket__round-label">
                <span className="spt-bracket__round-name">
                  {getRoundName(roundNum, totalRounds)}
                </span>
                <span className="spt-bracket__round-count">
                  {roundMatches.filter((m) => m.status === "completed").length}/
                  {roundMatches.length}
                </span>
              </div>

              {/* Match nodes */}
              <div className="spt-bracket__round-matches">
                {roundMatches.map((match, mIdx) => (
                  <MatchNode
                    key={match.id}
                    match={match}
                    index={roundIdx * 4 + mIdx}
                    reducedMotion={rm}
                    ambientMode={ambientMode}
                  />
                ))}
              </div>

              {/* Round arrow */}
              {roundIdx < rounds.length - 1 && (
                <ChevronRight className="spt-bracket__round-arrow" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <BracketProgress completed={completedCount} total={matches.length} />

      {/* ── Footer: Narrative ── */}
      <div className="spt-bracket__footer">
        <p className="spt-bracket__narrative">{narrative}</p>
      </div>
    </section>
  );
}