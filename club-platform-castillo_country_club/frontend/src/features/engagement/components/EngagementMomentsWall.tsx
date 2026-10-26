// src/features/engagement/components/EngagementMomentsWall.tsx
// ═══════════════════════════════════════════════════════════
// "The Moments Wall" — Critical Relationship Moments Timeline
// Castillo Country Club — Phase 31 "The Voice"
//
// CLEAN REWRITE — zero assumed fields.
// Every field verified against types.ts real definitions:
//   MomentOfTruthType, MOMENT_OF_TRUTH_DISPLAY, MomentOfTruth
//   ACTIVITY_DOMAIN_DISPLAY, ActivityDomain
//
// Predicted moments use MomentOfTruth.predicted boolean.
// No PredictedMoment type needed.
//
// Glass namespace: glass-eng-moments
// Data attributes: data-outcome, data-type, data-impact
// Rules: R34, R35, R38, #62 (type verification)
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import {
  Sparkles,
  Users,
  Crown,
  Award,
  ShieldCheck,
  AlertTriangle,
  PartyPopper,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import type {
  MomentOfTruth,
  MomentOfTruthType,
} from "../types";
import {
  MOMENT_OF_TRUTH_DISPLAY,
  ACTIVITY_DOMAIN_DISPLAY,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui";
import "./EngagementMomentsWall.css";

// ── Icon mapping (MOMENT_OF_TRUTH_DISPLAY.icon is a string) ──

const MOMENT_ICON_COMPONENTS: Record<MomentOfTruthType, LucideIcon> = {
  first_impression: Sparkles,
  social_bonding: Users,
  identity_integration: Crown,
  milestone: Award,
  recovery: ShieldCheck,
  crisis: AlertTriangle,
  celebration: PartyPopper,
};

// ── Impact classification (inlined — not in config.ts) ─────

function classifyMomentImpact(
  impact: number,
): "positive_major" | "positive_minor" | "neutral" | "negative_minor" | "negative_major" {
  const abs = Math.abs(impact);
  if (abs >= 30) return impact > 0 ? "positive_major" : "negative_major";
  if (abs >= 15) return impact > 0 ? "positive_minor" : "negative_minor";
  return "neutral";
}

function getMomentImpactColor(level: string): string {
  const map: Record<string, string> = {
    positive_major: "var(--color-emerald-400)",
    positive_minor: "var(--color-teal-400)",
    neutral: "var(--color-silver-400)",
    negative_minor: "var(--color-amber-400)",
    negative_major: "var(--color-rose-400)",
  };
  return (map as Record<string, string>)[level] ?? "var(--color-silver-400)";
}

// ── Helpers ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${day} ${months[d.getMonth()]}`;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes`;
  return `Hace ${Math.floor(diffDays / 365)} año`;
}

function getImpactSize(impact: number): "sm" | "md" | "lg" | "xl" {
  const abs = Math.abs(impact);
  if (abs >= 40) return "xl";
  if (abs >= 25) return "lg";
  if (abs >= 12) return "md";
  return "sm";
}

function getOutcomeColor(outcome: string): string {
  if (outcome === "positive") return "var(--color-emerald-400)";
  if (outcome === "negative") return "var(--color-rose-400)";
  return "var(--color-silver-400)";
}

function getOutcomeTrendIcon(outcome: string): LucideIcon {
  if (outcome === "positive") return TrendingUp;
  if (outcome === "negative") return TrendingDown;
  return Minus;
}

// ── Component ──────────────────────────────────────────────

interface EngagementMomentsWallProps {
  moments: MomentOfTruth[];
  maxVisible?: number;
  onMomentClick?: (moment: MomentOfTruth) => void;
}

/**
 * "The Moments Wall" — critical relationship moments.
 * The most important moments in a family's relationship
 * with the club, displayed as a vertical timeline.
 * Each moment is sized by its impact magnitude.
 * Predicted moments (moment.predicted === true) render
 * as ghost cards with dashed borders.
 */
export function EngagementMomentsWall({
  moments,
  maxVisible = 6,
  onMomentClick,
}: EngagementMomentsWallProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredMoment, setHoveredMoment] = useState<string | null>(null);

  // Sort by date descending (most recent first)
  const sortedMoments = useMemo(
    () =>
      [...moments].sort(
        (a: MomentOfTruth, b: MomentOfTruth) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [moments],
  );

  // Split by predicted flag
  const actualMoments = useMemo(
    () => sortedMoments.filter((m: MomentOfTruth) => !m.predicted),
    [sortedMoments],
  );

  const predictedList = useMemo(
    () => sortedMoments.filter((m: MomentOfTruth) => m.predicted),
    [sortedMoments],
  );

  // Visible slice
  const visibleMoments = expanded
    ? actualMoments
    : actualMoments.slice(0, maxVisible);
  const hiddenCount = actualMoments.length - maxVisible;

  // Empty state
  if (actualMoments.length === 0 && predictedList.length === 0) {
    return (
      <div data-glass-eng-moments="" className="eng-moments">
        <div className="eng-moments__header">
          <h3 className="eng-moments__title">Momentos de Verdad</h3>
        </div>
        <EmptyState
          title="Sin momentos críticos"
          description="No se han detectado momentos de verdad recientes. El sistema monitorea continuamente."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Ver historial
            </Button>
          }
        />
      </div>
    );
  }

  // Summary stats (from actual only)
  const positiveCount = actualMoments.filter(
    (m: MomentOfTruth) => m.outcome === "positive",
  ).length;
  const negativeCount = actualMoments.filter(
    (m: MomentOfTruth) => m.outcome === "negative",
  ).length;
  const avgImpact =
    actualMoments.length > 0
      ? Math.round(
          actualMoments.reduce(
            (s: number, m: MomentOfTruth) => s + m.impactOnRetention,
            0,
          ) / actualMoments.length,
        )
      : 0;

  return (
    <div
      data-glass-eng-moments=""
      data-outcome={
        positiveCount > negativeCount * 2
          ? "positive"
          : negativeCount > positiveCount * 2
            ? "negative"
            : "mixed"
      }
      className="eng-moments"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="eng-moments__header">
        <h3 className="eng-moments__title">Momentos de Verdad</h3>
        <div className="eng-moments__header-stats">
          <span className="eng-moments__stat eng-moments__stat--positive">
            <TrendingUp size={10} />
            {positiveCount}
          </span>
          <span className="eng-moments__stat eng-moments__stat--negative">
            <TrendingDown size={10} />
            {negativeCount}
          </span>
          {predictedList.length > 0 && (
            <span className="eng-moments__stat eng-moments__stat--predicted">
              {predictedList.length} pred.
            </span>
          )}
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────── */}
      <div
        className="eng-moments__timeline"
        role="list"
        aria-label="Línea de tiempo de momentos de verdad"
      >
        {/* ── Actual Moments ──────────────────────────────────── */}
        {visibleMoments.map((moment: MomentOfTruth, idx: number) => {
          const display = MOMENT_OF_TRUTH_DISPLAY[moment.type];
          const Icon = MOMENT_ICON_COMPONENTS[moment.type] ?? Sparkles;
          const impactSize = getImpactSize(moment.impactOnRetention);
          const impactLevel = classifyMomentImpact(moment.impactOnRetention);
          const impactColor = getMomentImpactColor(impactLevel);
          const outcomeColor = getOutcomeColor(moment.outcome);
          const TrendIcon = getOutcomeTrendIcon(moment.outcome);
          const isHovered = hoveredMoment === moment.id;
          const sentimentBefore =
            typeof moment.sentimentBefore === "number"
              ? moment.sentimentBefore
              : 0;
          const sentimentAfter =
            typeof moment.sentimentAfter === "number"
              ? moment.sentimentAfter
              : 0;
          const sentimentDelta = sentimentAfter - sentimentBefore;

          return (
            <div
              key={moment.id}
              className="eng-moments__item"
              data-outcome={moment.outcome}
              data-type={moment.type}
              data-impact={impactSize}
              style={{ "--stagger-i": idx } as React.CSSProperties}
              role="listitem"
              onMouseEnter={() => setHoveredMoment(moment.id)}
              onMouseLeave={() => setHoveredMoment(null)}
            >
              {/* Timeline connector */}
              <div className="eng-moments__connector">
                <div
                  className="eng-moments__connector-dot"
                  style={{ backgroundColor: outcomeColor }}
                />
                {idx < visibleMoments.length - 1 && (
                  <div className="eng-moments__connector-line" />
                )}
              </div>

              {/* Moment card */}
              <button
                type="button"
                className="eng-moments__card"
                onClick={() => onMomentClick?.(moment)}
                aria-label={`${display.label}: ${moment.familyName}. ${moment.description}`}
              >
                {/* Card header */}
                <div className="eng-moments__card-header">
                  <div
                    className="eng-moments__card-icon"
                    style={{ color: display.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="eng-moments__card-meta">
                    <span
                      className="eng-moments__card-type"
                      style={{
                        color: display.color,
                        backgroundColor: display.bgColor,
                      }}
                    >
                      {display.label}
                    </span>
                    <span className="eng-moments__card-family">
                      {moment.familyName}
                    </span>
                  </div>
                  <div className="eng-moments__card-date">
                    <span className="eng-moments__card-date-absolute">
                      {formatDate(moment.date)}
                    </span>
                    <span className="eng-moments__card-date-relative">
                      {formatRelativeDate(moment.date)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="eng-moments__card-description">
                  {moment.description}
                </p>

                {/* Impact + Sentiment strip */}
                <div className="eng-moments__card-strip">
                  {/* Impact indicator */}
                  <div className="eng-moments__card-impact">
                    <span className="eng-moments__card-impact-label">
                      Impacto
                    </span>
                    <div className="eng-moments__card-impact-bar">
                      <div
                        className="eng-moments__card-impact-fill"
                        style={{
                          width: `${Math.min(100, Math.abs(moment.impactOnRetention))}%`,
                          backgroundColor: impactColor,
                        }}
                      />
                    </div>
                    <span
                      className="eng-moments__card-impact-value"
                      style={{ color: impactColor }}
                    >
                      {moment.impactOnRetention > 0 ? "+" : ""}
                      {moment.impactOnRetention}
                    </span>
                  </div>

                  {/* Sentiment shift */}
                  <div className="eng-moments__card-sentiment">
                    <TrendIcon
                      size={12}
                      style={{ color: outcomeColor }}
                    />
                    <span
                      className="eng-moments__card-sentiment-delta"
                      style={{ color: outcomeColor }}
                    >
                      {sentimentDelta > 0 ? "+" : ""}
                      {sentimentDelta.toFixed(0)}
                    </span>
                    <span className="eng-moments__card-sentiment-label">
                      sentimiento
                    </span>
                  </div>

                  {/* Domain badge */}
                  <span className="eng-moments__card-domain">
                    {ACTIVITY_DOMAIN_DISPLAY[moment.domain]?.label ?? moment.domain}
                  </span>
                </div>

                {/* Expanded details on hover */}
                {isHovered && (
                  <div className="eng-moments__card-expanded">
                    <div className="eng-moments__card-expanded-row">
                      <span>Antes:</span>
                      <span>{sentimentBefore.toFixed(0)}</span>
                    </div>
                    <div className="eng-moments__card-expanded-row">
                      <span>Después:</span>
                      <span>{sentimentAfter.toFixed(0)}</span>
                    </div>
                    <div className="eng-moments__card-expanded-row">
                      <span>Clasificación:</span>
                      <span>{impactLevel.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}

        {/* ── Predicted Moments (ghost cards) ─────────────────── */}
        {predictedList.slice(0, 3).map(
          (moment: MomentOfTruth, idx: number) => {
            const display = MOMENT_OF_TRUTH_DISPLAY[moment.type];
            const Icon = MOMENT_ICON_COMPONENTS[moment.type] ?? CalendarClock;

            return (
              <div
                key={`pred-${moment.id}`}
                className="eng-moments__item eng-moments__item--predicted"
                style={
                  {
                    "--stagger-i": visibleMoments.length + idx,
                  } as React.CSSProperties
                }
                role="listitem"
              >
                <div className="eng-moments__connector eng-moments__connector--predicted">
                  <div className="eng-moments__connector-dot eng-moments__connector-dot--predicted" />
                </div>

                <div className="eng-moments__card eng-moments__card--predicted">
                  <div className="eng-moments__card-header">
                    <div className="eng-moments__card-icon eng-moments__card-icon--predicted">
                      <Icon size={14} />
                    </div>
                    <div className="eng-moments__card-meta">
                      <span className="eng-moments__card-type eng-moments__card-type--predicted">
                        Predicción
                      </span>
                      <span className="eng-moments__card-family">
                        {moment.familyName}
                      </span>
                    </div>
                    <div className="eng-moments__card-date">
                      <span className="eng-moments__card-date-absolute">
                        {formatDate(moment.date)}
                      </span>
                      <span className="eng-moments__card-date-relative">
                        predicho
                      </span>
                    </div>
                  </div>
                  <p className="eng-moments__card-description">
                    {moment.description}
                  </p>
                  <div className="eng-moments__card-strip">
                    <span className="eng-moments__card-domain eng-moments__card-domain--predicted">
                      {display?.label ?? moment.type}
                    </span>
                    <span className="eng-moments__card-confidence">
                      Impacto: {moment.impactOnRetention > 0 ? "+" : ""}
                      {moment.impactOnRetention}
                    </span>
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* ── Expand/Collapse ──────────────────────────────────── */}
      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          className="eng-moments__expand"
          onClick={() => setExpanded(true)}
        >
          <ChevronDown size={14} />
          <span>Ver {hiddenCount} momentos más</span>
        </button>
      )}
      {expanded && actualMoments.length > maxVisible && (
        <button
          type="button"
          className="eng-moments__expand"
          onClick={() => setExpanded(false)}
        >
          <ChevronUp size={14} />
          <span>Contraer</span>
        </button>
      )}

      {/* ── Summary footer ───────────────────────────────────── */}
      <div className="eng-moments__summary">
        <span className="eng-moments__summary-item">
          Promedio impacto: <strong>{avgImpact}</strong>
        </span>
        <span className="eng-moments__summary-item">
          {positiveCount} positivos · {negativeCount} negativos
          {predictedList.length > 0
            ? ` · ${predictedList.length} predichos`
            : ""}
        </span>
      </div>
    </div>
  );
}