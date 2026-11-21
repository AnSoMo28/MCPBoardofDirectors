/**
 * AIEntertainmentDesigner — "AI Entertainment Designer"
 *
 * V2 of EntertainmentFormModal. The operator doesn't fill fields —
 * they describe an INTENTION and the AI designs the complete event.
 *
 * 4 modes:
 * 1. IntentionCapture — "What experience do you want to create?"
 * 2. AIProposal — AI-generated proposal with predictions
 * 3. HumanRefinement — Operator refines, AI shows real-time impact
 * 4. Confirmation — Final summary with risks and action
 *
 * @module cultural/components/AIEntertainmentDesigner
 */

import { useState, useCallback } from 'react';
import type {
  EnrichedProposal,
  ProposalChange,
  ImpactDelta,
  ProposalVariant,
  ProposalRisk,
} from '../lib/proposalEnricher';
import type {
  DesignResult,
} from '../lib/eventDesigner';
import { useEventDesigner } from '../hooks/useEventDesigner';
import './AIEntertainmentDesigner.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface AIEntertainmentDesignerProps {
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Close handler. */
  onClose: () => void;
  /** Callback when operator confirms the proposal. */
  onConfirm: (proposal: EnrichedProposal) => void;
  /** Optional member ID for personalization. */
  memberId?: string;
}

// ══════════════════════════════════════════════════════════
//  GENRE OPTIONS (for selector)
// ══════════════════════════════════════════════════════════
const VIBE_OPTIONS = [
  { value: 'íntimo', label: 'Íntimo' },
  { value: 'social', label: 'Social' },
  { value: 'energético', label: 'Energético' },
  { value: 'contemplativo', label: 'Contemplativo' },
  { value: 'festivo', label: 'Festivo' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'experiencial', label: 'Experiencial' },
  { value: 'sofisticado', label: 'Sofisticado' },
];

// ══════════════════════════════════════════════════════════
//  SEVERITY STYLING
// ══════════════════════════════════════════════════════════

const RISK_SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  high:   { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  medium: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)' },
  low:    { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)' },
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function AIEntertainmentDesigner({
  isOpen,
  onClose,
  onConfirm,
  memberId,
}: AIEntertainmentDesignerProps) {
  // ── Event designer hook ──
  const designer = useEventDesigner('entertainment', memberId);

  // ── Local UI state ──
  const [intentionText, setIntentionText] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [lastImpactDelta, setLastImpactDelta] = useState<ImpactDelta | null>(null);

  // ── Handlers ──

  const handleSetIntention = useCallback(() => {
    if (!intentionText.trim()) return;

    // Append selected vibes to intention text for better parsing
    const vibeSuffix = selectedVibes.length > 0
      ? ` [vibes: ${selectedVibes.join(', ')}]`
      : '';

    designer.setIntention(intentionText + vibeSuffix);
  }, [intentionText, selectedVibes, designer.setIntention]);

  const handleGenerate = useCallback(() => {
    designer.generate();
  }, [designer.generate]);

  const handleRefine = useCallback((change: ProposalChange) => {
    const delta = designer.refine(change);
    if (delta) {
      setLastImpactDelta(delta);
    }
  }, [designer.refine]);

  const handleConfirm = useCallback(() => {
    designer.confirm();
    if (designer.design) {
      onConfirm(designer.design.enriched);
    }
  }, [designer.confirm, designer.design, onConfirm]);

  const handleReset = useCallback(() => {
    designer.reset();
    setIntentionText('');
    setSelectedVibes([]);
    setLastImpactDelta(null);
  }, [designer.reset]);

  const toggleVibe = useCallback((vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe)
        ? prev.filter((v) => v !== vibe)
        : [...prev, vibe],
    );
  }, []);

  if (!isOpen) return null;

  return (
    <div className="ai-entertainment-designer">
      <div className="ai-entertainment-designer__backdrop" onClick={onClose} />

      <div className="ai-entertainment-designer__modal">
        {/* Header */}
        <header className="ai-entertainment-designer__header">
          <div className="ai-entertainment-designer__header-left">
            <h2 className="ai-entertainment-designer__title">
              AI Entertainment Designer
            </h2>
            <span className="ai-entertainment-designer__phase-badge">
              {designer.phase === 'idle' && 'Listo para diseñar'}
              {designer.phase === 'intention' && 'Intención capturada'}
              {designer.phase === 'designing' && 'Diseñando...'}
              {designer.phase === 'refining' && 'Refinamiento'}
              {designer.phase === 'confirmed' && 'Confirmado'}
            </span>
          </div>
          <Button
            variant="unstyled"
            className="ai-entertainment-designer__close"
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
          <section className="ai-entertainment-designer__section">
            <div className="ai-entertainment-designer__intention-header">
              <h3>¿Qué experiencia querés crear?</h3>
              <p className="ai-entertainment-designer__hint">
                Describí la intención, no los datos. El AI se encarga del diseño.
              </p>
            </div>

            {/* Free-text intention */}
            <textarea
              className="ai-entertainment-designer__textarea"
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="Ej: Un evening de jazz íntimo para socios que buscan experiencias contemplativas..."
              rows={4}
            />

            {/* Genre hint (auto-detected, but operator can see) */}
            {designer.intent && (
              <div className="ai-entertainment-designer__detected">
                <span className="ai-entertainment-designer__detected-label">
                  Detectado:
                </span>
                <span className="ai-entertainment-designer__detected-value">
                  {designer.intent.genre.replace(/_/g, ' ')}
                </span>
                <span className="ai-entertainment-designer__detected-value">
                  {designer.intent.formality}
                </span>
                <span className="ai-entertainment-designer__confidence">
                  Confianza: {(designer.intent.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Vibe selector */}
            <div className="ai-entertainment-designer__vibes">
              <span className="ai-entertainment-designer__vibes-label">
                Vibe:
              </span>
              <div className="ai-entertainment-designer__vibes-grid">
                {VIBE_OPTIONS.map((vibe) => (
                  <Button
                    variant="unstyled"
                    key={vibe.value}
                    className={`ai-entertainment-designer__vibe-chip ${
                      selectedVibes.includes(vibe.value)
                        ? 'ai-entertainment-designer__vibe-chip--selected'
                        : ''
                    }`}
                    onClick={() => toggleVibe(vibe.value)}
                  >
                    {vibe.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="ai-entertainment-designer__actions">
              <Button
                variant="unstyled"
                className="ai-entertainment-designer__btn ai-entertainment-designer__btn--secondary"
                onClick={handleSetIntention}
                disabled={!intentionText.trim()}
              >
                Capturar intención
              </Button>
              <Button
                variant="unstyled"
                className="ai-entertainment-designer__btn ai-entertainment-designer__btn--primary"
                onClick={handleGenerate}
                disabled={!designer.intent}
              >
                Diseñar con AI →
              </Button>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 2/3: AI PROPOSAL + REFINEMENT    */}
        {/* ═══════════════════════════════════════ */}
        {designer.phase === 'refining' && designer.design && (
          <section className="ai-entertainment-designer__section">
            {/* AI Commentary */}
            <div className="ai-entertainment-designer__ai-says">
              <span className="ai-entertainment-designer__ai-icon">🧠</span>
              <p className="ai-entertainment-designer__ai-text">
                {generateAICommentary(designer.design)}
              </p>
            </div>

            {/* Proposal card */}
            <div className="ai-entertainment-designer__proposal">
              <h3 className="ai-entertainment-designer__proposal-title">
                {designer.design.proposal.title}
              </h3>

              <p className="ai-entertainment-designer__proposal-desc">
                {designer.design.proposal.description}
              </p>

              {/* Venue */}
              <div className="ai-entertainment-designer__field">
                <span className="ai-entertainment-designer__field-label">
                  Venue
                </span>
                <span className="ai-entertainment-designer__field-value">
                  {designer.design.proposal.venue_recommendation ?? 'Por definir'}
                </span>
                {designer.design.enriched.venueMatch && (
                  <span className="ai-entertainment-designer__field-score">
                    Match: {designer.design.enriched.venueMatch.matchScore}%
                  </span>
                )}
              </div>

              {/* Predictions */}
              <div className="ai-entertainment-designer__predictions">
                <PredictionBar
                  label="Asistencia"
                  value={designer.design.proposal.expected_impact.attendance_estimate}
                  max={100}
                  suffix=" personas"
                />
                <PredictionBar
                  label="Resonancia"
                  value={designer.design.enriched.resonancePrediction}
                  max={100}
                  suffix="/100"
                />
                <PredictionBar
                  label="Taste Match"
                  value={designer.design.enriched.tasteMatchScore}
                  max={100}
                  suffix="%"
                />
                <PredictionBar
                  label="Revenue estimado"
                  value={Math.min(
                    100,
                    Math.round(
                      designer.design.proposal.expected_impact.revenue_potential_crc / 1000,
                    ),
                  )}
                  max={100}
                  suffix={`k CRC`}
                />
              </div>

              {/* Sensory profile */}
              {designer.design.enriched.sensoryProfile && (
                <div className="ai-entertainment-designer__sensory">
                  <span className="ai-entertainment-designer__section-label">
                    Perfil Sensorial
                  </span>
                  <div className="ai-entertainment-designer__sensory-grid">
                    <span>
                      🔅 {designer.design.enriched.sensoryProfile.lighting.mood}
                    </span>
                    <span>
                      🔊 {designer.design.enriched.sensoryProfile.acoustics.reverberation}
                    </span>
                    <span>
                      🌡 {designer.design.enriched.sensoryProfile.temperature.base}°C
                    </span>
                    <span>
                      🌸 {designer.design.enriched.sensoryProfile.aroma}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Refinement controls */}
            <div className="ai-entertainment-designer__refinement">
              <span className="ai-entertainment-designer__section-label">
                Refinar propuesta
              </span>
              <div className="ai-entertainment-designer__refine-actions">
                <Button
                  variant="unstyled"
                  className="ai-entertainment-designer__btn ai-entertainment-designer__btn--ghost"
                  onClick={() =>
                    handleRefine({
                      field: 'capacity',
                      previousValue: designer.design?.proposal.expected_impact.attendance_estimate,
                      newValue: Math.round(
                        (designer.design?.proposal.expected_impact.attendance_estimate ?? 30) * 0.8,
                      ),
                    })
                  }
                >
                  Reducir capacidad 20%
                </Button>
                <Button
                  variant="unstyled"
                  className="ai-entertainment-designer__btn ai-entertainment-designer__btn--ghost"
                  onClick={() =>
                    handleRefine({
                      field: 'capacity',
                      previousValue: designer.design?.proposal.expected_impact.attendance_estimate,
                      newValue: Math.round(
                        (designer.design?.proposal.expected_impact.attendance_estimate ?? 30) * 1.3,
                      ),
                    })
                  }
                >
                  Ampliar capacidad 30%
                </Button>
              </div>
            </div>

            {/* Impact delta (if refinement was made) */}
            {lastImpactDelta && (
              <div
                className="ai-entertainment-designer__impact-delta"
                style={{
                  borderColor: lastImpactDelta.recommended
                    ? '#4ade80'
                    : '#ef4444',
                }}
              >
                <span className="ai-entertainment-designer__impact-label">
                  Impacto del cambio
                </span>
                <p className="ai-entertainment-designer__impact-commentary">
                  {lastImpactDelta.commentary}
                </p>
                <div className="ai-entertainment-designer__impact-deltas">
                  {lastImpactDelta.attendanceDelta !== 0 && (
                    <span>
                      Asistencia: {lastImpactDelta.attendanceDelta > 0 ? '+' : ''}
                      {lastImpactDelta.attendanceDelta}
                    </span>
                  )}
                  {lastImpactDelta.resonanceDelta !== 0 && (
                    <span>
                      Resonancia: {lastImpactDelta.resonanceDelta > 0 ? '+' : ''}
                      {lastImpactDelta.resonanceDelta}
                    </span>
                  )}
                  {lastImpactDelta.venueMatchDelta !== 0 && (
                    <span>
                      Venue match: {lastImpactDelta.venueMatchDelta > 0 ? '+' : ''}
                      {lastImpactDelta.venueMatchDelta}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Variants */}
            {designer.design.variants.length > 0 && (
              <div className="ai-entertainment-designer__variants">
                <span className="ai-entertainment-designer__section-label">
                  Variantes
                </span>
                <div className="ai-entertainment-designer__variants-grid">
                  {designer.design.variants.map((variant) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      onSelect={() => {
                        const idx = designer.design?.variants.indexOf(variant);
                        if (idx !== undefined && idx >= 0) {
                          designer.selectVariant(idx);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {designer.design.risks.length > 0 && (
              <div className="ai-entertainment-designer__risks">
                <span className="ai-entertainment-designer__section-label">
                  Riesgos identificados
                </span>
                <div className="ai-entertainment-designer__risks-list">
                  {designer.design.risks.map((risk, idx) => (
                    <RiskBadge key={idx} risk={risk} />
                  ))}
                </div>
              </div>
            )}

            {/* Warnings from enrichment */}
            {designer.design.enriched.warnings.length > 0 && (
              <div className="ai-entertainment-designer__warnings">
                {designer.design.enriched.warnings.map((warning, idx) => (
                  <div key={idx} className="ai-entertainment-designer__warning">
                    ⚠ {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {designer.design.enriched.recommendations.length > 0 && (
              <div className="ai-entertainment-designer__recommendations">
                {designer.design.enriched.recommendations.map((rec, idx) => (
                  <div key={idx} className="ai-entertainment-designer__recommendation">
                    💡 {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="ai-entertainment-designer__actions">
              <Button
                variant="unstyled"
                className="ai-entertainment-designer__btn ai-entertainment-designer__btn--ghost"
                onClick={handleReset}
              >
                Empezar de nuevo
              </Button>
              <Button
                variant="unstyled"
                className="ai-entertainment-designer__btn ai-entertainment-designer__btn--secondary"
                onClick={handleGenerate}
              >
                Regenerar
              </Button>
              <Button
                variant="unstyled"
                className="ai-entertainment-designer__btn ai-entertainment-designer__btn--primary"
                onClick={handleConfirm}
                disabled={!designer.readyToExecute}
              >
                {designer.readyToExecute
                  ? '✅ Diseñar así'
                  : `Bloqueado: ${designer.blockers[0] ?? 'riesgos pendientes'}`}
              </Button>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 4: CONFIRMATION                  */}
        {/* ═══════════════════════════════════════ */}
        {designer.phase === 'confirmed' && designer.design && (
          <section className="ai-entertainment-designer__section">
            <div className="ai-entertainment-designer__confirmed">
              <span className="ai-entertainment-designer__confirmed-icon">
                ✅
              </span>
              <h3>Evento diseñado exitosamente</h3>
              <p>{designer.design.proposal.title}</p>
              <p className="ai-entertainment-designer__confirmed-detail">
                {designer.design.proposal.expected_impact.attendance_estimate}{' '}
                asistentes estimados ·{' '}
                {designer.design.proposal.venue_recommendation ?? 'Venue por definir'}
              </p>
            </div>

            <div className="ai-entertainment-designer__actions">
              <Button
                variant="unstyled"
                className="ai-entertainment-designer__btn ai-entertainment-designer__btn--primary"
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
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

/** Prediction bar — horizontal bar with label and value. */
function PredictionBar({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="ai-entertainment-designer__prediction">
      <div className="ai-entertainment-designer__prediction-header">
        <span className="ai-entertainment-designer__prediction-label">
          {label}
        </span>
        <span className="ai-entertainment-designer__prediction-value">
          {value}{suffix}
        </span>
      </div>
      <div className="ai-entertainment-designer__prediction-bar">
        <div
          className="ai-entertainment-designer__prediction-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Variant card — shows a single proposal variant. */
function VariantCard({
  variant,
  onSelect,
}: {
  variant: ProposalVariant;
  onSelect: () => void;
}) {
  return (
    <div className="ai-entertainment-designer__variant">
      <div className="ai-entertainment-designer__variant-header">
        <span className="ai-entertainment-designer__variant-emoji">
          {variant.emoji}
        </span>
        <span className="ai-entertainment-designer__variant-label">
          {variant.label}
        </span>
      </div>

      <div className="ai-entertainment-designer__variant-changes">
        {variant.changes.map((change, idx) => (
          <span key={idx} className="ai-entertainment-designer__variant-change">
            {change}
          </span>
        ))}
      </div>

      <div className="ai-entertainment-designer__variant-predictions">
        <span>Asistencia: {variant.predicted.attendance}</span>
        <span>Resonancia: {variant.predicted.resonance}</span>
        <span>Revenue: {variant.predicted.revenue.toLocaleString()}</span>
      </div>

      <Button
        variant="unstyled"
        className="ai-entertainment-designer__btn ai-entertainment-designer__btn--ghost ai-entertainment-designer__btn--sm"
        onClick={onSelect}
      >
        Seleccionar variante
      </Button>
    </div>
  );
}

/** Risk badge — shows a single risk with severity coloring. */
function RiskBadge({ risk }: { risk: ProposalRisk }) {
  const style = RISK_SEVERITY_STYLES[risk.severity] ?? RISK_SEVERITY_STYLES.low;

  return (
    <div
      className="ai-entertainment-designer__risk"
      style={{ background: style.bg, borderColor: style.color }}
    >
      <div className="ai-entertainment-designer__risk-header">
        <span
          className="ai-entertainment-designer__risk-severity"
          style={{ color: style.color }}
        >
          {risk.severity.toUpperCase()}
        </span>
        <span className="ai-entertainment-designer__risk-type">
          {risk.type}
        </span>
      </div>
      <p className="ai-entertainment-designer__risk-desc">
        {risk.description}
      </p>
      <p className="ai-entertainment-designer__risk-mitigation">
        → {risk.mitigation}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  AI COMMENTARY GENERATOR
// ══════════════════════════════════════════════════════════

/** Generates AI commentary text from a design result. */
function generateAICommentary(design: DesignResult): string {
  const parts: string[] = [];

  // Venue commentary
  if (design.enriched.venueMatch) {
    const venue = design.enriched.venueMatch;
    if (venue.matchScore >= 80) {
      parts.push(
        `El venue "${venue.venueName}" es un excelente match (${venue.matchScore}%) para este tipo de experiencia.`,
      );
    } else if (venue.matchScore >= 60) {
      parts.push(
        `El venue "${venue.venueName}" es aceptable (${venue.matchScore}%) pero hay opciones mejores.`,
      );
    } else {
      parts.push(
        `El venue "${venue.venueName}" tiene match bajo (${venue.matchScore}%). ${venue.reasoning}`,
      );
    }
  }

  // Resonance commentary
  const resonance = design.enriched.resonancePrediction;
  if (resonance >= 70) {
    parts.push(`Resonancia predicted alta (${resonance}/100) — este evento tiene potencial de ser memorable.`);
  } else if (resonance >= 50) {
    parts.push(`Resonancia moderada (${resonance}/100). Considerar elementos experienciales para subirla.`);
  } else {
    parts.push(`Resonancia baja (${resonance}/100). El formato puede no estar conectando con el público.`);
  }

  // Taste match commentary
  const taste = design.enriched.tasteMatchScore;
  if (taste >= 70) {
    parts.push(`Match de gusto fuerte (${taste}%) — el público objetivo va a resonar con este evento.`);
  } else if (taste < 50) {
    parts.push(`Match de gusto bajo (${taste}%) — considerar ajustar el concepto.`);
  }

  return parts.join(' ');
}