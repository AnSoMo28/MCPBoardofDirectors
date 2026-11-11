/**
 * AIGalaArchitect — "AI Gala Architect"
 *
 * V2 of GalaFormModal. The most complex AI Creation Modal.
 * A gala is not "an event" — it's an INTERVENTION in the social
 * fabric of the club. It involves:
 * — Dining + entertainment + social dynamics fusion
 * — Pricing tier optimization
 * — AI-driven seating that maximizes social bonding
 * — Full sensory orchestration (lighting transitions, acoustic shifts)
 * — RSVP prediction from social graph
 * — Moments of Truth identification
 * — Cross-domain impact (dining revenue, communication triggers)
 *
 * 4 modes:
 * 1. IntentionCapture — "What kind of gala? What's the goal?"
 * 2. AIProposal — Full gala design with all intelligence
 * 3. HumanRefinement — Operator refines, AI shows real-time impact
 * 4. Confirmation — Final gala blueprint
 *
 * @module cultural/components/AIGalaArchitect
 */

import { useState, useCallback } from 'react';

import type {
  EnrichedProposal,
  ProposalChange,
  ImpactDelta
} from '../lib/proposalEnricher';
import type { DesignResult } from '../lib/eventDesigner';
import { useEventDesigner } from '../hooks/useEventDesigner';
import './AIGalaArchitect.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface AIGalaArchitectProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proposal: EnrichedProposal) => void;
  memberId?: string;
}

// ══════════════════════════════════════════════════════════
//  GALA CONCEPT SUGGESTIONS
// ══════════════════════════════════════════════════════════

const GALA_CONCEPTS = [
  'Gala de fin de año — elegante, celebración del año, social bonding',
  'Noche temática — experiencia inmersiva con dining + entertainment',
  'Gala de premiación — reconocer logros de socios, formal',
  'Gala benéfica — causa social, networking premium',
  'Aniversario del club — celebración histórica, tradición + innovación',
  'Gala de temporada — primavera/verano/otoño/invierno, estacional',
];

const PRICING_TIERS = [
  { id: 'premium', label: 'Premium', multiplier: 2.0, color: '#fbbf24' },
  { id: 'standard', label: 'Standard', multiplier: 1.0, color: '#60a5fa' },
  { id: 'access', label: 'Acceso', multiplier: 0.6, color: '#4ade80' },
];

// ══════════════════════════════════════════════════════════
//  RISK STYLING
// ══════════════════════════════════════════════════════════

const RISK_STYLES: Record<string, { color: string; bg: string }> = {
  high:   { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  medium: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)' },
  low:    { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)' },
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function AIGalaArchitect({
  isOpen,
  onClose,
  onConfirm,
  memberId,
}: AIGalaArchitectProps) {
  const designer = useEventDesigner('gala', memberId);

  const [intentionText, setIntentionText] = useState('');
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [lastImpactDelta, setLastImpactDelta] = useState<ImpactDelta | null>(null);

  // ── Handlers ──

  const handleSetIntention = useCallback(() => {
    if (!intentionText.trim()) return;
    const conceptSuffix = selectedConcept
      ? ` [concepto: ${selectedConcept}]`
      : '';
    designer.setIntention(intentionText + conceptSuffix);
  }, [intentionText, selectedConcept, designer.setIntention]);

  const handleGenerate = useCallback(() => {
    designer.generate();
  }, [designer.generate]);

  const handleRefine = useCallback(
    (change: ProposalChange) => {
      const delta = designer.refine(change);
      if (delta) setLastImpactDelta(delta);
    },
    [designer.refine],
  );

  const handleConfirm = useCallback(() => {
    designer.confirm();
    if (designer.design) {
      onConfirm(designer.design.enriched);
    }
  }, [designer.confirm, designer.design, onConfirm]);

  const handleReset = useCallback(() => {
    designer.reset();
    setIntentionText('');
    setSelectedConcept(null);
    setLastImpactDelta(null);
  }, [designer.reset]);

  if (!isOpen) return null;

  return (
    <div className="ai-gala-architect">
      <div className="ai-gala-architect__backdrop" onClick={onClose} />

      <div className="ai-gala-architect__modal">
        {/* ── Header ── */}
        <header className="ai-gala-architect__header">
          <div className="ai-gala-architect__header-left">
            <h2 className="ai-gala-architect__title">AI Gala Architect</h2>
            <span className="ai-gala-architect__phase-badge">
              {phaseLabel(designer.phase)}
            </span>
          </div>
          <Button
            variant="unstyled"
            className="ai-gala-architect__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </Button>
        </header>

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 1: INTENTION CAPTURE             */}
        {/* ═══════════════════════════════════════ */}
        {(designer.phase === 'idle' || designer.phase === 'intention') && (
          <section className="ai-gala-architect__section">
            <div className="ai-gala-architect__intention-header">
              <h3>¿Qué gala querés crear?</h3>
              <p className="ai-gala-architect__hint">
                Una gala no es un evento — es una intervención en la red social
                del club. Describí el IMPACTO que querés generar.
              </p>
            </div>

            {/* Concept suggestions */}
            <div className="ai-gala-architect__concepts">
              <span className="ai-gala-architect__concepts-label">
                Conceptos:
              </span>
              <div className="ai-gala-architect__concepts-grid">
                {GALA_CONCEPTS.map((concept) => (
                  <Button
                    variant="unstyled"
                    key={concept}
                    className={`ai-gala-architect__concept-chip ${
                      selectedConcept === concept
                        ? 'ai-gala-architect__concept-chip--selected'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedConcept(
                        selectedConcept === concept ? null : concept,
                      );
                      if (!intentionText.trim()) {
                        setIntentionText(concept);
                      }
                    }}
                  >
                    {concept}
                  </Button>
                ))}
              </div>
            </div>

            {/* Free-text */}
            <textarea
              className="ai-gala-architect__textarea"
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="Ej: Quiero una gala elegante de fin de año que conecte los 3 clusters de socios que rara vez interactúan..."
              rows={4}
            />

            {/* Detected preview */}
            {designer.intent && (
              <div className="ai-gala-architect__detected">
                <span className="ai-gala-architect__detected-label">
                  Detectado:
                </span>
                <span className="ai-gala-architect__detected-value">
                  {designer.intent.genre.replace(/_/g, ' ')}
                </span>
                <span className="ai-gala-architect__detected-value">
                  {designer.intent.formality}
                </span>
                {designer.intent.vibes.length > 0 && (
                  <span className="ai-gala-architect__detected-value">
                    {designer.intent.vibes.join(', ')}
                  </span>
                )}
                <span className="ai-gala-architect__confidence">
                  Confianza: {(designer.intent.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="ai-gala-architect__actions">
              <Button
                variant="unstyled"
                className="ai-gala-architect__btn ai-gala-architect__btn--secondary"
                onClick={handleSetIntention}
                disabled={!intentionText.trim()}
              >
                Capturar intención
              </Button>
              <Button
                variant="unstyled"
                className="ai-gala-architect__btn ai-gala-architect__btn--primary"
                onClick={handleGenerate}
                disabled={!designer.intent}
              >
                Armar gala con AI →
              </Button>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 2/3: AI PROPOSAL + REFINEMENT    */}
        {/* ═══════════════════════════════════════ */}
        {designer.phase === 'refining' && designer.design && (
          <GalaRefinementView
            design={designer.design}
            lastImpactDelta={lastImpactDelta}
            readyToExecute={designer.readyToExecute}
            blockers={designer.blockers}
            onRefine={handleRefine}
            onRegenerate={handleGenerate}
            onConfirm={handleConfirm}
            onReset={handleReset}
          />
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 4: CONFIRMATION                  */}
        {/* ═══════════════════════════════════════ */}
        {designer.phase === 'confirmed' && designer.design && (
          <section className="ai-gala-architect__section">
            <div className="ai-gala-architect__confirmed">
              <span className="ai-gala-architect__confirmed-icon">✦</span>
              <h3>Gala diseñada exitosamente</h3>
              <p>{designer.design.proposal.title}</p>
              <div className="ai-gala-architect__confirmed-stats">
                <span>
                  {designer.design.proposal.expected_impact.attendance_estimate}{' '}
                  invitados estimados
                </span>
                <span>
                  Revenue:{' '}
                  {designer.design.proposal.expected_impact.revenue_potential_crc.toLocaleString()}{' '}
                  CRC
                </span>
                <span>
                  Venue:{' '}
                  {designer.design.proposal.venue_recommendation ?? 'Por definir'}
                </span>
              </div>
            </div>
            <div className="ai-gala-architect__actions">
              <Button
                variant="unstyled"
                className="ai-gala-architect__btn ai-gala-architect__btn--primary"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  GALA REFINEMENT VIEW (sub-component)
// ══════════════════════════════════════════════════════════

interface GalaRefinementViewProps {
  design: DesignResult;
  lastImpactDelta: ImpactDelta | null;
  readyToExecute: boolean;
  blockers: string[];
  onRefine: (change: ProposalChange) => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onReset: () => void;
}

function GalaRefinementView({
  design,
  lastImpactDelta,
  readyToExecute,
  blockers,
  onRefine,
  onRegenerate,
  onConfirm,
  onReset,
}: GalaRefinementViewProps) {
  const { proposal, enriched, risks } = design;

  return (
    <section className="ai-gala-architect__section">
      {/* AI Commentary */}
      <div className="ai-gala-architect__ai-says">
        <span className="ai-gala-architect__ai-icon">🧠</span>
        <p className="ai-gala-architect__ai-text">
          {generateGalaCommentary(design)}
        </p>
      </div>

      {/* Concept card */}
      <div className="ai-gala-architect__proposal">
        <h3 className="ai-gala-architect__proposal-title">
          {proposal.title}
        </h3>
        <p className="ai-gala-architect__proposal-desc">
          {proposal.description}
        </p>

        {/* Venue + Capacity */}
        <div className="ai-gala-architect__field-row">
          <div className="ai-gala-architect__field">
            <span className="ai-gala-architect__field-label">Venue</span>
            <span className="ai-gala-architect__field-value">
              {proposal.venue_recommendation ?? 'Por definir'}
            </span>
            {enriched.venueMatch && (
              <span className="ai-gala-architect__field-score">
                Match: {enriched.venueMatch.matchScore}%
              </span>
            )}
          </div>
          <div className="ai-gala-architect__field">
            <span className="ai-gala-architect__field-label">Timeline</span>
            <span className="ai-gala-architect__field-value">
              {proposal.timeline}
            </span>
          </div>
        </div>

        {/* Predictions — hero section */}
        <div className="ai-gala-architect__predictions-hero">
          <div className="ai-gala-architect__prediction-card">
            <span className="ai-gala-architect__prediction-number">
              {proposal.expected_impact.attendance_estimate}
            </span>
            <span className="ai-gala-architect__prediction-label">
              Invitados estimados
            </span>
          </div>
          <div className="ai-gala-architect__prediction-card">
            <span className="ai-gala-architect__prediction-number">
              {enriched.resonancePrediction}
            </span>
            <span className="ai-gala-architect__prediction-label">
              Resonancia /100
            </span>
          </div>
          <div className="ai-gala-architect__prediction-card">
            <span className="ai-gala-architect__prediction-number">
              {(proposal.expected_impact.revenue_potential_crc / 1000).toFixed(0)}k
            </span>
            <span className="ai-gala-architect__prediction-label">
              Revenue CRC
            </span>
          </div>
          <div className="ai-gala-architect__prediction-card">
            <span className="ai-gala-architect__prediction-number">
              {enriched.tasteMatchScore}%
            </span>
            <span className="ai-gala-architect__prediction-label">
              Taste Match
            </span>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="ai-gala-architect__tiers">
          <span className="ai-gala-architect__section-label">
            Pricing tiers sugeridos
          </span>
          <div className="ai-gala-architect__tiers-grid">
            {PRICING_TIERS.map((tier) => {
              const basePrice = Math.round(
                (proposal.expected_impact.revenue_potential_crc /
                  Math.max(
                    1,
                    proposal.expected_impact.attendance_estimate,
                  )) *
                  tier.multiplier,
              );
              return (
                <div
                  key={tier.id}
                  className="ai-gala-architect__tier"
                  style={{ borderColor: tier.color }}
                >
                  <span
                    className="ai-gala-architect__tier-label"
                    style={{ color: tier.color }}
                  >
                    {tier.label}
                  </span>
                  <span className="ai-gala-architect__tier-price">
                    {basePrice.toLocaleString()} CRC
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sensory orchestration */}
        {enriched.sensoryProfile && (
          <div className="ai-gala-architect__sensory">
            <span className="ai-gala-architect__section-label">
              Orquestación sensorial
            </span>
            <div className="ai-gala-architect__sensory-grid">
              <SensoryCard
                icon="🔅"
                label="Luz"
                value={`${enriched.sensoryProfile.lighting.mood} · ${enriched.sensoryProfile.lighting.baseLevel}%`}
              />
              <SensoryCard
                icon="🔊"
                label="Acústica"
                value={`${enriched.sensoryProfile.acoustics.reverberation} · ambient ${enriched.sensoryProfile.acoustics.ambientNoise}`}
              />
              <SensoryCard
                icon="🌡"
                label="Temperatura"
                value={`${enriched.sensoryProfile.temperature.base}°C · ${enriched.sensoryProfile.temperature.ventilation}`}
              />
              <SensoryCard
                icon="🌸"
                label="Aroma"
                value={enriched.sensoryProfile.aroma}
              />
              <SensoryCard
                icon="📐"
                label="Layout"
                value={`${enriched.sensoryProfile.layout.flowPattern} · max ${enriched.sensoryProfile.layout.maxCapacity}`}
              />
              {enriched.sensoryProfile.layout.stagePresence && (
                <SensoryCard
                  icon="🎭"
                  label="Escenario"
                  value="Con stage"
                />
              )}
            </div>
          </div>
        )}

        {/* Social dynamics */}
        {proposal.cross_domain.member_segments.length > 0 && (
          <div className="ai-gala-architect__social">
            <span className="ai-gala-architect__section-label">
              Dinámica social
            </span>
            <div className="ai-gala-architect__social-items">
              {proposal.cross_domain.member_segments.map((segment: string, idx: number) => (
                <span key={idx} className="ai-gala-architect__social-tag">
                  {segment}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cross-domain impact */}
        <div className="ai-gala-architect__cross-domain">
          <span className="ai-gala-architect__section-label">
            Impacto cross-domain
          </span>
          <div className="ai-gala-architect__cross-domain-grid">
            {proposal.cross_domain.communication_messages.length > 0 && (
              <div className="ai-gala-architect__cross-domain-item">
                <span className="ai-gala-architect__cross-domain-icon">
                  📨
                </span>
                <span className="ai-gala-architect__cross-domain-value">
                  {proposal.cross_domain.communication_messages[0]}
                </span>
              </div>
            )}
            {proposal.cross_domain.finance_budget_estimate > 0 && (
              <div className="ai-gala-architect__cross-domain-item">
                <span className="ai-gala-architect__cross-domain-icon">
                  💰
                </span>
                <span className="ai-gala-architect__cross-domain-value">
                  Budget:{' '}
                  {proposal.cross_domain.finance_budget_estimate.toLocaleString()}{' '}
                  CRC
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action steps */}
        {proposal.action_steps.length > 0 && (
          <div className="ai-gala-architect__steps">
            <span className="ai-gala-architect__section-label">
              Plan de ejecución
            </span>
            <ol className="ai-gala-architect__steps-list">
              {proposal.action_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Refinement */}
      <div className="ai-gala-architect__refinement">
        <span className="ai-gala-architect__section-label">
          Refinar gala
        </span>
        <div className="ai-gala-architect__refine-actions">
          <Button
            variant="unstyled"
            className="ai-gala-architect__btn ai-gala-architect__btn--ghost"
            onClick={() =>
              onRefine({
                field: 'capacity',
                previousValue:
                  proposal.expected_impact.attendance_estimate,
                newValue: Math.round(
                  proposal.expected_impact.attendance_estimate * 0.7,
                ),
              })
            }
          >
            Gala íntima (-30% invitados)
          </Button>
          <Button
            variant="unstyled"
            className="ai-gala-architect__btn ai-gala-architect__btn--ghost"
            onClick={() =>
              onRefine({
                field: 'capacity',
                previousValue:
                  proposal.expected_impact.attendance_estimate,
                newValue: Math.round(
                  proposal.expected_impact.attendance_estimate * 1.4,
                ),
              })
            }
          >
            Gala grande (+40% invitados)
          </Button>
          <Button
            variant="unstyled"
            className="ai-gala-architect__btn ai-gala-architect__btn--ghost"
            onClick={() =>
              onRefine({
                field: 'budget',
                previousValue:
                  proposal.cross_domain.finance_budget_estimate,
                newValue: Math.round(
                  proposal.cross_domain.finance_budget_estimate * 1.5,
                ),
              })
            }
          >
            Aumentar budget 50%
          </Button>
        </div>
      </div>

      {/* Impact delta */}
      {lastImpactDelta && (
        <div
          className="ai-gala-architect__impact-delta"
          style={{
            borderColor: lastImpactDelta.recommended
              ? '#4ade80'
              : '#ef4444',
          }}
        >
          <span className="ai-gala-architect__impact-label">
            Impacto del cambio
          </span>
          <p className="ai-gala-architect__impact-commentary">
            {lastImpactDelta.commentary}
          </p>
          <div className="ai-gala-architect__impact-deltas">
            {lastImpactDelta.attendanceDelta !== 0 && (
              <span>
                Invitados: {lastImpactDelta.attendanceDelta > 0 ? '+' : ''}
                {lastImpactDelta.attendanceDelta}
              </span>
            )}
            {lastImpactDelta.resonanceDelta !== 0 && (
              <span>
                Resonancia: {lastImpactDelta.resonanceDelta > 0 ? '+' : ''}
                {lastImpactDelta.resonanceDelta}
              </span>
            )}
            {lastImpactDelta.revenueDelta !== 0 && (
              <span>
                Revenue: {lastImpactDelta.revenueDelta > 0 ? '+' : ''}
                {lastImpactDelta.revenueDelta.toLocaleString()} CRC
              </span>
            )}
            {lastImpactDelta.venueMatchDelta !== 0 && (
              <span>
                Venue: {lastImpactDelta.venueMatchDelta > 0 ? '+' : ''}
                {lastImpactDelta.venueMatchDelta}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="ai-gala-architect__risks">
          <span className="ai-gala-architect__section-label">
            Riesgos
          </span>
          <div className="ai-gala-architect__risks-list">
            {risks.map((risk, idx) => {
              const style = RISK_STYLES[risk.severity] ?? RISK_STYLES.low;
              return (
                <div
                  key={idx}
                  className="ai-gala-architect__risk"
                  style={{
                    background: style.bg,
                    borderColor: style.color,
                  }}
                >
                  <div className="ai-gala-architect__risk-header">
                    <span
                      className="ai-gala-architect__risk-severity"
                      style={{ color: style.color }}
                    >
                      {risk.severity.toUpperCase()}
                    </span>
                    <span className="ai-gala-architect__risk-type">
                      {risk.type}
                    </span>
                  </div>
                  <p className="ai-gala-architect__risk-desc">
                    {risk.description}
                  </p>
                  <p className="ai-gala-architect__risk-mitigation">
                    → {risk.mitigation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warnings + Recommendations */}
      {enriched.warnings.length > 0 && (
        <div className="ai-gala-architect__warnings">
          {enriched.warnings.map((w, idx) => (
            <div key={idx} className="ai-gala-architect__warning">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {enriched.recommendations.length > 0 && (
        <div className="ai-gala-architect__recommendations">
          {enriched.recommendations.map((r, idx) => (
            <div key={idx} className="ai-gala-architect__recommendation">
              💡 {r}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="ai-gala-architect__actions">
        <Button
          variant="unstyled"
          className="ai-gala-architect__btn ai-gala-architect__btn--ghost"
          onClick={onReset}
        >
          Empezar de nuevo
        </Button>
        <Button
          variant="unstyled"
          className="ai-gala-architect__btn ai-gala-architect__btn--secondary"
          onClick={onRegenerate}
        >
          Regenerar
        </Button>
        <Button
          variant="unstyled"
          className="ai-gala-architect__btn ai-gala-architect__btn--primary"
          onClick={onConfirm}
          disabled={!readyToExecute}
        >
          {readyToExecute
            ? '✦ Armar así'
            : `Bloqueado: ${blockers[0] ?? 'riesgos pendientes'}`}
        </Button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

/** Sensory card — single sensory dimension. */
function SensoryCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="ai-gala-architect__sensory-card">
      <span className="ai-gala-architect__sensory-icon">{icon}</span>
      <div className="ai-gala-architect__sensory-info">
        <span className="ai-gala-architect__sensory-label">{label}</span>
        <span className="ai-gala-architect__sensory-value">{value}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'idle':
      return 'Listo para diseñar';
    case 'intention':
      return 'Intención capturada';
    case 'designing':
      return 'Armando gala...';
    case 'refining':
      return 'Refinamiento';
    case 'confirmed':
      return 'Confirmado';
    default:
      return phase;
  }
}

function generateGalaCommentary(design: DesignResult): string {
  const parts: string[] = [];
  const { enriched, proposal } = design;

  // Venue
  if (enriched.venueMatch) {
    const v = enriched.venueMatch;
    if (v.matchScore >= 80) {
      parts.push(
        `"${v.venueName}" es ideal para esta gala (${v.matchScore}% match). Su personalidad favorece la experiencia diseñada.`,
      );
    } else if (v.matchScore >= 60) {
      parts.push(
        `"${v.venueName}" es aceptable (${v.matchScore}%) pero hay opciones con mejor alineación.`,
      );
    } else {
      parts.push(
        `El venue "${v.venueName}" tiene match bajo (${v.matchScore}%). ${v.reasoning}`,
      );
    }
  }

  // Attendance + Revenue
  const attendance =
    proposal.expected_impact.attendance_estimate;
  const revenue =
    proposal.expected_impact.revenue_potential_crc;
  parts.push(
    `Gala para ${attendance} invitados con revenue estimado de ${revenue.toLocaleString()} CRC.`,
  );

  // Resonance
  const resonance = enriched.resonancePrediction;
  if (resonance >= 70) {
    parts.push(
      `Alta resonancia predicted (${resonance}/100) — esta gala tiene potencial de ser un milestone para varios socios.`,
    );
  } else if (resonance >= 50) {
    parts.push(
      `Resonancia moderada (${resonance}/100). Considerar elementos experienciales más impactantes.`,
    );
  } else {
    parts.push(
      `Resonancia baja (${resonance}/100). El concepto puede no estar conectando — considerar replantear.`,
    );
  }

  // Taste match
  const taste = enriched.tasteMatchScore;
  if (taste < 50) {
    parts.push(
      `Taste match bajo (${taste}%) — el concepto puede no resonar con el público objetivo.`,
    );
  }

  // Cross-domain
  if (proposal.cross_domain.finance_budget_estimate > 0) {
    parts.push(
      `Budget estimado: ${proposal.cross_domain.finance_budget_estimate.toLocaleString()} CRC.`,
    );
  }

  return parts.join(' ');
}