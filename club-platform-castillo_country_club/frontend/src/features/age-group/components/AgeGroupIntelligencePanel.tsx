// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/AgeGroupIntelligencePanel.tsx
// Phase 34+ Migration — Intelligence Panel
// Level 6+ Agency · Production Grade
//
// "Mission Control" — Command board with family dossiers,
// fit meters, strategic proposal grid, cross-domain signals,
// growth compass, and silent advisor empty state.
//
// Original: cn() + 8 namespaces + 10 inline colors + no ARIA
//   → BEM .ag-intel__* + data-* driven colors + ARIA + CSS cascade
//
// PRE-WRITE VERIFICATION:
//   AgeRecommendationEnhanced → @/shared/mocks/contracts ✅
//   AgeGroupEngagementProposalList → @/shared/mocks/contracts ✅
//   AgeGroupEngagementProposal → @/shared/mocks/contracts ✅
//   AGE_BRACKETS → ../config ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() × 2 → data-primary, data-priority, data-impact, data-effort, data-domain, data-score-level
//   - 8 namespaces → .ag-intel__* unified BEM
//   - 10 inline color styles → CSS data-* cascade (0 inline colors)
//   - className prop → removed
//   - Props → AgeGroupIntelligencePanelProps Readonly
//   - ../types for constants → ../config
//
// COLOR SYSTEM: All severity/domain/score colors driven by
//   data-* attributes → CSS cascade → CSS custom properties.
//   Only --meter-width and --bracket-color use inline var bridge
//   (config-driven, dynamic values).
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  Lightbulb,
  Zap,
  ChevronDown,
  ChevronUp,
  Target,
  Compass,
  Globe,
  Sparkles,
  Check,
} from "lucide-react";

import type {
  AgeRecommendationEnhanced,
  AgeGroupEngagementProposalList,
  AgeGroupEngagementProposal,
} from "@/shared/mocks/contracts";

import { AGE_BRACKETS } from "../config";

import "./AgeGroupIntelligencePanel.css";

/* ── §0  Constants ────────────────────────────────────────── */

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const PRIORITY_ORDINAL: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const IMPACT_LABELS: Record<string, string> = {
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

const EFFORT_LABELS: Record<string, string> = {
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

const DOMAIN_LABELS: Record<string, string> = {
  families: "Familias",
  events: "Eventos",
  wellness: "Bienestar",
  age_group: "Grupos",
};

/* ── §1  Local Types ──────────────────────────────────────── */

interface AgeGroupIntelligencePanelProps {
  /** Family-level recommendations with children detail */
  readonly recommendations: AgeRecommendationEnhanced[];
  /** Strategic proposals from engagement advisor */
  readonly proposals: AgeGroupEngagementProposalList | null;
}

/* ── §2  Helpers ──────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function matchBracket(
  targetGroup: string,
): (typeof AGE_BRACKETS)[number] | null {
  const normalized = targetGroup.toLowerCase().trim();
  return (
    AGE_BRACKETS.find((b) => {
      const labelNorm = b.label.toLowerCase().trim();
      return (
        normalized === labelNorm ||
        normalized === b.id ||
        labelNorm.includes(normalized) ||
        normalized.includes(labelNorm.split(" ")[0])
      );
    }) ?? null
  );
}

function getMatchScoreLevel(score: number): string {
  if (score >= 90) return "perfect";
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function getMatchScoreLabel(score: number): string | null {
  if (score >= 90) return "Perfect Fit";
  if (score < 40) return "Considerar alternativas";
  return null;
}

function getDomainInfo(domain: string): {
  key: string;
  label: string;
} {
  const normalized = domain.toLowerCase().trim();
  for (const [key, label] of Object.entries(DOMAIN_LABELS)) {
    if (normalized.includes(key) || key.includes(normalized))
      return { key, label };
  }
  return { key: "other", label: domain };
}

function timeAgoLocal(iso: string): string {
  const diffMin = Math.round(
    (Date.now() - new Date(iso).getTime()) / 60_000,
  );
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

/* ── §3  Silent Advisor — Empty State (P10) ───────────────── */

function SilentAdvisor({
  generatedAt,
}: {
  readonly generatedAt?: string;
}) {
  return (
    <div
      className="ag-intel__dormant"
      role="status"
      aria-label="El advisor está analizando patrones — sin recomendaciones disponibles"
      data-testid="ag-intel-dormant"
    >
      <div className="ag-intel__dormant-orb" aria-hidden="true">
        <Lightbulb size={28} />
      </div>
      <div className="ag-intel__dormant-scan" aria-hidden="true" />
      <h4 className="ag-intel__dormant-title">
        Calibrando sensores
      </h4>
      <p className="ag-intel__dormant-desc">
        El advisor está analizando los patrones del club — las
        recomendaciones aparecerán cuando haya insights disponibles
      </p>
      {generatedAt && (
        <span className="ag-intel__dormant-time">
          Último análisis: {timeAgoLocal(generatedAt)}
        </span>
      )}
    </div>
  );
}

/* ── §4  Fit Meter (P3) ──────────────────────────────────── */

function FitMeter({
  score,
  staggerIndex,
}: {
  readonly score: number;
  readonly staggerIndex: number;
}) {
  const level = getMatchScoreLevel(score);
  const label = getMatchScoreLabel(score);

  return (
    <div
      className="ag-intel__fit"
      data-score-level={level}
      style={
        {
          "--meter-width": `${Math.min(100, score)}%`,
          "--stagger-i": staggerIndex,
        } as CSSProperties
      }
    >
      <div className="ag-intel__fit-track">
        <div className="ag-intel__fit-fill" />
      </div>
      <div className="ag-intel__fit-info">
        <span className="ag-intel__fit-score">{score}</span>
        {score >= 90 && label && (
          <span className="ag-intel__fit-badge" data-badge="perfect">
            <Sparkles size={9} aria-hidden="true" />
            {label}
          </span>
        )}
        {score < 40 && label && (
          <span className="ag-intel__fit-badge" data-badge="warn">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── §5  Family Dossier (P2) ─────────────────────────────── */

function FamilyDossier({
  rec,
  index,
}: {
  readonly rec: AgeRecommendationEnhanced;
  readonly index: number;
}) {
  const priorityLabel = PRIORITY_LABELS[rec.priority] ?? "Baja";

  return (
    <div
      className="ag-intel__dossier"
      role="listitem"
      aria-label={`Recomendación para ${rec.family_name}: prioridad ${priorityLabel}, confianza ${rec.confidence}%`}
      data-priority={rec.priority}
      style={{ "--stagger-i": index } as CSSProperties}
    >
      {/* § Header */}
      <div className="ag-intel__dossier-header">
        <div className="ag-intel__avatar" aria-hidden="true">
          {getInitials(rec.family_name)}
        </div>
        <div className="ag-intel__dossier-info">
          <span className="ag-intel__dossier-name">
            {rec.family_name}
          </span>
          <span className="ag-intel__dossier-meta">
            {rec.children.length} hijo
            {rec.children.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="ag-intel__dossier-badges">
          <span className="ag-intel__badge ag-intel__badge--priority">
            {priorityLabel}
          </span>
          <span className="ag-intel__badge ag-intel__badge--confidence">
            {rec.confidence}%
          </span>
        </div>
      </div>

      {/* § Children */}
      <div className="ag-intel__dossier-children">
        {rec.children.map((child, ci) => {
          const currentSet = new Set(
            child.current_activities ?? [],
          );
          const newActivities =
            child.recommended_activities.filter(
              (a) => !currentSet.has(a.activity),
            );
          const overlap =
            child.recommended_activities.filter((a) =>
              currentSet.has(a.activity),
            );

          return (
            <div
              key={child.name}
              className="ag-intel__child"
              style={{ "--child-i": ci } as CSSProperties}
            >
              {/* Child header */}
              <div className="ag-intel__child-header">
                <span className="ag-intel__child-name">
                  {child.name}
                </span>
                <span className="ag-intel__child-age">
                  {child.age} años · {child.age_group}
                </span>
              </div>

              {/* Current activities */}
              {child.current_activities &&
                child.current_activities.length > 0 && (
                  <div className="ag-intel__child-section">
                    <span className="ag-intel__section-label">
                      Actual
                    </span>
                    <div className="ag-intel__tags">
                      {child.current_activities.map((act) => (
                        <span
                          key={act}
                          className="ag-intel__tag"
                          data-tag-type="current"
                        >
                          <Check
                            size={9}
                            aria-hidden="true"
                          />
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Overlap bridge */}
              {overlap.length > 0 && (
                <div className="ag-intel__bridge">
                  <span
                    className="ag-intel__bridge-line"
                    aria-hidden="true"
                  />
                  <span className="ag-intel__bridge-label">
                    {overlap.length} coincidente
                    {overlap.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* Recommended activities with fit meters */}
              <div className="ag-intel__child-section">
                <span className="ag-intel__section-label">
                  {newActivities.length > 0
                    ? "Recomendado"
                    : "Validado"}
                </span>
                {newActivities.map((act, ai) => (
                  <div
                    key={act.activity}
                    className="ag-intel__activity"
                  >
                    <div className="ag-intel__activity-header">
                      <span className="ag-intel__activity-name">
                        {act.activity}
                      </span>
                      {act.category && (
                        <span className="ag-intel__activity-cat">
                          {act.category}
                        </span>
                      )}
                    </div>
                    <FitMeter
                      score={act.match_score}
                      staggerIndex={ai}
                    />
                    {act.reason && (
                      <p className="ag-intel__activity-reason">
                        {act.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Developmental focus (P5) */}
              {child.developmental_focus &&
                child.developmental_focus.length > 0 && (
                  <div className="ag-intel__devfocus">
                    <Compass
                      size={11}
                      className="ag-intel__devfocus-icon"
                      aria-hidden="true"
                    />
                    {child.developmental_focus.map(
                      (focus, fi) => (
                        <span
                          key={focus}
                          className="ag-intel__devtag"
                          data-primary={
                            fi === 0 || undefined
                          }
                        >
                          {focus}
                        </span>
                      ),
                    )}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* § Footer: Cross-sell + Sibling */}
      {(rec.cross_sell_opportunities.length > 0 ||
        rec.sibling_benefits.length > 0) && (
        <div className="ag-intel__dossier-footer">
          {rec.cross_sell_opportunities.map((opp) => (
            <span
              key={opp}
              className="ag-intel__dossier-opp"
            >
              {opp}
            </span>
          ))}
          {rec.sibling_benefits.map((ben) => (
            <span
              key={ben}
              className="ag-intel__dossier-benefit"
            >
              {ben}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── §6  Proposal Card (P4) ──────────────────────────────── */

function ProposalCard({
  prop,
  index,
}: {
  readonly prop: AgeGroupEngagementProposal;
  readonly index: number;
}) {
  const priorityLabel = PRIORITY_LABELS[prop.priority] ?? "Baja";
  const impactLabel = IMPACT_LABELS[prop.impact] ?? prop.impact;
  const effortLabel = EFFORT_LABELS[prop.effort] ?? prop.effort;

  const bracket = matchBracket(prop.target_age_group);
  const actionDomain = getDomainInfo(
    prop.suggested_action?.domain ?? "",
  );

  const isQuickWin =
    (PRIORITY_ORDINAL[prop.impact] ?? 1) >= 3 &&
    (PRIORITY_ORDINAL[prop.effort] ?? 1) <= 1;
  const isStrategic =
    (prop.cross_domain_signals?.length ?? 0) >= 3;

  return (
    <div
      className="ag-intel__proposal"
      role="listitem"
      aria-label={`Propuesta: ${prop.title}, prioridad ${priorityLabel}`}
      data-priority={prop.priority}
      data-impact={prop.impact}
      data-effort={prop.effort}
      data-quick-win={isQuickWin || undefined}
      data-strategic={isStrategic || undefined}
      style={{ "--stagger-i": index } as CSSProperties}
    >
      {/* § Header */}
      <div className="ag-intel__proposal-header">
        <div className="ag-intel__proposal-title-block">
          <h4 className="ag-intel__proposal-title">
            {prop.title}
          </h4>
          <div className="ag-intel__proposal-badges">
            <span className="ag-intel__badge ag-intel__badge--priority">
              {priorityLabel}
            </span>
            {isQuickWin && (
              <span className="ag-intel__badge ag-intel__badge--qw">
                Quick Win
              </span>
            )}
            {isStrategic && (
              <span className="ag-intel__badge ag-intel__badge--strategic">
                <Globe size={10} aria-hidden="true" />
                Estratégica
              </span>
            )}
          </div>
        </div>
      </div>

      {/* § Description */}
      <p className="ag-intel__proposal-desc">
        {prop.description}
      </p>

      {/* § Strategic Grid (P4) */}
      <div
        className="ag-intel__proposal-grid"
        role="list"
        aria-label="Métricas estratégicas"
      >
        <div className="ag-intel__metric" role="listitem">
          <span className="ag-intel__metric-label">
            Impacto
          </span>
          <span className="ag-intel__metric-value ag-intel__metric-value--impact">
            {impactLabel}
          </span>
        </div>
        <div className="ag-intel__metric" role="listitem">
          <span className="ag-intel__metric-label">
            Esfuerzo
          </span>
          <span className="ag-intel__metric-value ag-intel__metric-value--effort">
            {effortLabel}
          </span>
        </div>
        <div className="ag-intel__metric" role="listitem">
          <span className="ag-intel__metric-label">
            Confianza
          </span>
          <span className="ag-intel__metric-value">
            {prop.confidence}%
          </span>
        </div>
        <div className="ag-intel__metric" role="listitem">
          <span className="ag-intel__metric-label">
            Revenue est.
          </span>
          <span className="ag-intel__metric-value ag-intel__metric-value--mono">
            ₡{(prop.estimated_revenue / 1000).toFixed(0)}K
          </span>
        </div>
      </div>

      {/* § Target + Meta Row (P7) */}
      <div className="ag-intel__proposal-meta">
        {bracket && (
          <span
            className="ag-intel__proposal-bracket"
            style={
              {
                "--bracket-color": bracket.color,
              } as CSSProperties
            }
          >
            <Target size={11} aria-hidden="true" />
            {bracket.label}
          </span>
        )}
        {!bracket && prop.target_age_group && (
          <span className="ag-intel__proposal-bracket ag-intel__proposal-bracket--text">
            <Target size={11} aria-hidden="true" />
            {prop.target_age_group}
          </span>
        )}
        {prop.target_family_ids &&
          prop.target_family_ids.length > 0 && (
            <span className="ag-intel__proposal-families">
              {prop.target_family_ids.length} familia
              {prop.target_family_ids.length > 1 ? "s" : ""}
            </span>
          )}
        <span className="ag-intel__proposal-impact-text">
          {prop.expected_impact}
        </span>
      </div>

      {/* § Cross-Domain Signals (P6) */}
      {prop.cross_domain_signals &&
        prop.cross_domain_signals.length > 0 && (
          <div
            className="ag-intel__proposal-signals"
            role="list"
            aria-label="Señales cross-domain"
          >
            {prop.cross_domain_signals.map((sig) => {
              const domain = getDomainInfo(sig);
              return (
                <span
                  key={sig}
                  className="ag-intel__signal"
                  role="listitem"
                  data-domain={domain.key}
                >
                  <Globe size={9} aria-hidden="true" />
                  {domain.label}
                </span>
              );
            })}
          </div>
        )}

      {/* § Action Chip */}
      {prop.suggested_action && (
        <div className="ag-intel__proposal-action">
          <span
            className="ag-intel__action-chip"
            data-domain={actionDomain.key}
          >
            {prop.suggested_action.action} ·{" "}
            {actionDomain.label}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── §7  Main Component ──────────────────────────────────── */

/**
 * AgeGroupIntelligencePanel — "Mission Control"
 *
 * The brain of the age-group feature. Renders family dossiers
 * with fit meters, strategic proposal grid with cross-domain
 * signals, and a silent advisor empty state. Proposals sorted
 * by priority → impact → confidence.
 */
export function AgeGroupIntelligencePanel({
  recommendations,
  proposals,
}: AgeGroupIntelligencePanelProps) {
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [showAllProps, setShowAllProps] = useState(false);

  /* ── Sort proposals: priority → impact → confidence ── */
  const sortedProposals = useMemo(() => {
    if (!proposals) return [];
    return [...proposals.proposals].sort((a, b) => {
      const priA = PRIORITY_ORDINAL[a.priority] ?? 1;
      const priB = PRIORITY_ORDINAL[b.priority] ?? 1;
      if (priB !== priA) return priB - priA;
      const impA = PRIORITY_ORDINAL[a.impact] ?? 1;
      const impB = PRIORITY_ORDINAL[b.impact] ?? 1;
      if (impB !== impA) return impB - impA;
      return b.confidence - a.confidence;
    });
  }, [proposals]);

  const visibleRecs = showAllRecs
    ? recommendations
    : recommendations.slice(0, 5);
  const visibleProps = showAllProps
    ? sortedProposals
    : sortedProposals.slice(0, 5);

  /* ── Empty ── */
  const isEmpty =
    recommendations.length === 0 &&
    (!proposals || proposals.total === 0);

  if (isEmpty) {
    return <SilentAdvisor generatedAt={proposals?.generated_at} />;
  }

  /* ── Avg confidence ── */
  const avgConfidence =
    recommendations.length > 0
      ? Math.round(
          recommendations.reduce((s, r) => s + r.confidence, 0) /
            recommendations.length,
        )
      : 0;

  return (
    <div
      className="ag-intel"
      role="region"
      aria-label="Centro de inteligencia etaria"
      data-testid="ag-intel"
    >
      {/* § Recommendations Section (P1 + P2) */}
      {recommendations.length > 0 && (
        <section
          className="ag-intel__section"
          aria-label="Recomendaciones familiares"
          data-testid="ag-intel-dossiers"
        >
          <div className="ag-intel__status-bar">
            <div className="ag-intel__status-left">
              <Lightbulb
                size={14}
                className="ag-intel__status-icon"
                aria-hidden="true"
              />
              <h3 className="ag-intel__section-title">
                Recomendaciones
              </h3>
            </div>
            <div className="ag-intel__status-right">
              <span className="ag-intel__stat">
                {recommendations.length}
              </span>
              <span className="ag-intel__stat ag-intel__stat--muted">
                Conf. avg: {avgConfidence}%
              </span>
            </div>
          </div>

          <div
            className="ag-intel__list"
            role="list"
            aria-label="Dossiers familiares"
          >
            {visibleRecs.map((rec, idx) => (
              <FamilyDossier
                key={rec.family_id}
                rec={rec}
                index={idx}
              />
            ))}
          </div>

          {recommendations.length > 5 && (
            <button
              className="ag-intel__toggle"
              onClick={() => setShowAllRecs(!showAllRecs)}
              type="button"
              aria-expanded={showAllRecs}
              aria-label={
                showAllRecs
                  ? "Mostrar menos recomendaciones"
                  : `Mostrar ${recommendations.length - 5} recomendaciones más`
              }
            >
              {showAllRecs ? (
                <>
                  <ChevronUp size={13} aria-hidden="true" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown size={13} aria-hidden="true" />
                  Ver {recommendations.length - 5} más
                </>
              )}
            </button>
          )}
        </section>
      )}

      {/* § Proposals Section (P1 + P4) */}
      {proposals && sortedProposals.length > 0 && (
        <section
          className="ag-intel__section"
          aria-label="Propuestas estratégicas"
          data-testid="ag-intel-proposals"
        >
          <div
            className="ag-intel__status-bar"
            data-has-urgent={
              (proposals.high_priority_count > 0) || undefined
            }
          >
            <div className="ag-intel__status-left">
              <Zap
                size={14}
                className="ag-intel__status-icon"
                aria-hidden="true"
              />
              <h3 className="ag-intel__section-title">
                Propuestas
              </h3>
              {proposals.high_priority_count > 0 && (
                <span
                  className="ag-intel__pulse-dot"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="ag-intel__status-right">
              <span className="ag-intel__stat">
                {proposals.total}
              </span>
              {proposals.high_priority_count > 0 && (
                <span className="ag-intel__stat ag-intel__stat--danger">
                  {proposals.high_priority_count} alta
                </span>
              )}
              {proposals.cross_domain_count > 0 && (
                <span className="ag-intel__stat ag-intel__stat--gold">
                  {proposals.cross_domain_count} cruzadas
                </span>
              )}
            </div>
          </div>

          <div
            className="ag-intel__list"
            role="list"
            aria-label="Propuestas estratégicas"
          >
            {visibleProps.map((prop, idx) => (
              <ProposalCard
                key={prop.proposal_id}
                prop={prop}
                index={idx}
              />
            ))}
          </div>

          {sortedProposals.length > 5 && (
            <button
              className="ag-intel__toggle"
              onClick={() => setShowAllProps(!showAllProps)}
              type="button"
              aria-expanded={showAllProps}
              aria-label={
                showAllProps
                  ? "Mostrar menos propuestas"
                  : `Mostrar ${sortedProposals.length - 5} propuestas más`
              }
            >
              {showAllProps ? (
                <>
                  <ChevronUp size={13} aria-hidden="true" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown size={13} aria-hidden="true" />
                  Ver {sortedProposals.length - 5} más
                </>
              )}
            </button>
          )}
        </section>
      )}

      {/* § Meta Footer */}
      {proposals?.generated_at && (
        <footer
          className="ag-intel__meta"
          data-testid="ag-intel-meta"
        >
          <span className="ag-intel__meta-time">
            Generado {timeAgoLocal(proposals.generated_at)}
          </span>
        </footer>
      )}
    </div>
  );
}